import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { DEMO_EVENT, SEED_PERSONAS, seedAttendees, seedConnections, demoBadges } from "./seed.mjs";
import { assignPersona, defaultDisplayName, personaById } from "../src/shared/personas.mjs";
import { topicsIn } from "../src/shared/topics.mjs";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TAP_WINDOW_MS = 10 * 60 * 1000;
const HEX = /^#[0-9a-fA-F]{6}$/;
const CONTACT_VISIBILITY = new Set(["hidden", "connections", "public"]);
// Public snapshot never carries the tap registry: tag ids are not credentials,
// but listing every wristband id would make forging unsigned demo taps trivial.
const PRIVATE_EVENT_FIELDS = new Set(["tags"]);

function inferCategory(attendee) {
  const text = `${attendee?.role || ""} ${attendee?.offer || ""} ${attendee?.need || ""}`.toLowerCase();
  if (/投资|融资|资本|基金/.test(text)) return "investor";
  if (/媒体|内容|传播/.test(text)) return "media";
  if (/平台|云计算|硬件|nfc|物联网/.test(text)) return "platform";
  if (/活动|社群|主理|主办|志愿/.test(text)) return "organizer";
  if (/创始|创业|开发者|工程师|设计师/.test(text)) return "founder";
  return "guest";
}
export const hashSecret = value => createHash("sha256").update(value).digest("hex");

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function fail(status, code, message) { throw new HttpError(status, code, message); }

// Matching fields and contacts use NFKC (full-width letters fold to ASCII);
// display text keeps Chinese punctuation with NFC.
function cleanText(value, field, min, max, form = "NFKC") {
  if (typeof value !== "string") fail(400, "INVALID_INPUT", field + "需要填写文字");
  const text = value.normalize(form).trim().replace(/\s+/g, " ");
  if (text.length < min || text.length > max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
    fail(400, "INVALID_INPUT", field + "格式不正确（" + min + "–" + max + " 字）");
  }
  return text;
}
function publicConnection(c) {
  const { id, fromId, toId, status, createdAt, confirmedAt, synthetic } = c;
  return { id, fromId, toId, attendeeIds: [fromId, toId], status, createdAt, confirmedAt, synthetic: !!synthetic };
}
function common(a, b) { return [...a].filter(tag => b.has(tag)); }

export class EventStore {
  constructor({ file = null, now = () => Date.now(), onChange = () => {}, eventConfig = {}, maxAttendees = 1200 } = {}) {
    this.file = file;
    this.now = now;
    this.onChange = onChange;
    this.maxAttendees = maxAttendees;
    this.tapNonces = new Map();
    if (file && existsSync(file)) {
      this.state = JSON.parse(readFileSync(file, "utf8"));
      if (this.state.schema !== "echo-campus-store.v1") throw new Error("Unsupported demo store schema");
      this.state.checkins ||= [];
      this.state.event = this.composeEvent(this.state.event, eventConfig);
      if (this.migrate() || !this.state.event.activityMode) this.persist();
    } else {
      const date = new Date(now()).toISOString();
      this.state = {
        schema: "echo-campus-store.v1", version: 1, event: this.composeEvent({}, eventConfig),
        attendees: seedAttendees(date), encounters: seedConnections(date), sessions: [], checkins: [],
        badges: demoBadges().map(b => ({ badgeId: b.badgeId, activationHash: hashSecret(b.activationCode), attendeeId: null })),
        nextSerial: 16,
      };
      this.persist();
    }
  }
  composeEvent(persisted = {}, config = {}) {
    // Deployment config wins over persisted demo fields; persisted runtime
    // fields (e.g. a disabled demoMode) win over the built-in defaults.
    const event = { ...DEMO_EVENT, ...persisted, ...config };
    event.activityMode ||= "checkpoints-v1";
    event.categories = config.categories || persisted.categories || DEMO_EVENT.categories;
    event.checkpoints = config.checkpoints || persisted.checkpoints || DEMO_EVENT.checkpoints;
    event.personas = config.personas || DEMO_EVENT.personas;
    event.theme = { ...DEMO_EVENT.theme, ...(persisted.theme || {}), ...(config.theme || {}) };
    return event;
  }
  migrate() {
    let migrated = false;
    const categoryIds = new Set(this.categories().map(item => item.id));
    const usage = this.personaUsage();
    let serial = Number.isSafeInteger(this.state.nextSerial) ? this.state.nextSerial : 1;
    const ordered = [...this.state.attendees].sort((a, b) => String(a.joinedAt).localeCompare(String(b.joinedAt)) || a.id.localeCompare(b.id));
    for (const attendee of ordered) {
      if (!attendee.category || !categoryIds.has(attendee.category) || attendee.category === "guest") { const inferred = inferCategory(attendee); if (attendee.category !== inferred && categoryIds.has(inferred)) { attendee.category = inferred; migrated = true; } }
      if (!attendee.wristbandColor || attendee.wristbandColor === "#778879") { const wristband = this.category(attendee.category).wristbandColor; if (attendee.wristbandColor !== wristband) { attendee.wristbandColor = wristband; migrated = true; } }
      if (attendee.organization === undefined) { attendee.organization = ""; migrated = true; }
      if (attendee.bio === undefined) { attendee.bio = ""; migrated = true; }
      if (!personaById(attendee.persona)) {
        attendee.persona = SEED_PERSONAS[attendee.id] || assignPersona(this.state.event.personas, usage, attendee.id);
        usage.set(attendee.persona, (usage.get(attendee.persona) || 0) + 1);
        migrated = true;
      }
      if (!Number.isSafeInteger(attendee.serial)) {
        const seed = /^seed-(\d+)$/.exec(attendee.id);
        attendee.serial = seed ? Number(seed[1]) : Math.max(serial, 16);
        if (!seed) serial = attendee.serial + 1;
        migrated = true;
      }
      if (!CONTACT_VISIBILITY.has(attendee.contactVisibility)) { attendee.contactVisibility = attendee.publicContact === true ? "public" : "hidden"; migrated = true; }
      attendee.publicContact = attendee.contactVisibility === "public";
      if (typeof attendee.listed !== "boolean") { attendee.listed = true; migrated = true; }
      if (typeof attendee.customName !== "boolean") { attendee.customName = attendee.source === "curated-demo" || !/^访客[0-9A-F]{6}$/.test(attendee.name || ""); migrated = true; }
      if (!attendee.customName) { const name = defaultDisplayName(attendee.persona, attendee.serial); if (attendee.name !== name) { attendee.name = name; migrated = true; } }
    }
    const highest = Math.max(15, ...this.state.attendees.map(a => a.serial || 0));
    if (!(this.state.nextSerial > highest)) { this.state.nextSerial = highest + 1; migrated = true; }
    return migrated;
  }
  categories() { return this.state.event.categories || DEMO_EVENT.categories; }
  category(id) { const list = this.categories(); return list.find(item => item.id === id) || list.find(item => item.id === "guest") || list.at(-1); }
  checkpoints() { return this.state.event.checkpoints || DEMO_EVENT.checkpoints; }
  personaUsage() {
    const usage = new Map();
    for (const attendee of this.state.attendees) if (attendee.persona) usage.set(attendee.persona, (usage.get(attendee.persona) || 0) + 1);
    return usage;
  }
  publicEvent() {
    return Object.fromEntries(Object.entries(this.state.event).filter(([key]) => !PRIVATE_EVENT_FIELDS.has(key)));
  }
  publicAttendee(a) {
    const { id, name, role, offer, need, organization, contact, bio, contactVisibility, category: categoryId, wristbandColor, avatarColor, persona, serial, position, synthetic, source, joinedAt } = a;
    const visibility = CONTACT_VISIBILITY.has(contactVisibility) ? contactVisibility : (a.publicContact ? "public" : "hidden");
    return {
      id, name, role, offer, need, organization, bio, avatarColor, persona, serial,
      ...(visibility === "public" && contact ? { contact } : {}),
      publicContact: visibility === "public", sharesContact: visibility !== "hidden" && !!contact,
      category: categoryId || "guest",
      wristbandColor: wristbandColor || this.category(categoryId).wristbandColor,
      position, synthetic, source, joinedAt,
    };
  }
  profile(body, existing = null) {
    if (!body || typeof body !== "object" || Array.isArray(body)) fail(400, "INVALID_INPUT", "请提交有效资料");
    if (body.consent !== true) fail(400, "CONSENT_REQUIRED", "请确认在本活动公开展示这些资料");
    const categoryIds = new Set(this.categories().map(item => item.id));
    const categoryId = body.category ?? existing?.category ?? "guest";
    if (typeof categoryId !== "string" || !categoryIds.has(categoryId)) fail(400, "INVALID_INPUT", "参会类别不正确");
    let persona = existing?.persona || null;
    if (body.persona !== undefined && body.persona !== null && body.persona !== "") {
      if (typeof body.persona !== "string" || !this.state.event.personas.includes(body.persona)) fail(400, "INVALID_INPUT", "这个分身形象未在本活动开放");
      persona = body.persona;
    }
    const avatarColor = body.avatarColor || existing?.avatarColor || personaById(persona)?.color || "#758b79";
    if (typeof avatarColor !== "string" || !HEX.test(avatarColor)) fail(400, "INVALID_INPUT", "分身颜色格式不正确");
    let contactVisibility = body.publicContact === true ? "public" : "hidden";
    if (body.contactVisibility !== undefined) {
      if (!CONTACT_VISIBILITY.has(body.contactVisibility)) fail(400, "INVALID_INPUT", "联系方式可见范围不正确");
      contactVisibility = body.contactVisibility;
    }
    if (body.listed !== undefined && typeof body.listed !== "boolean") fail(400, "INVALID_INPUT", "可见状态需要布尔值");
    const optional = (value, field, max, form) => value === undefined || value === null ? "" : cleanText(value, field, 0, max, form);
    return {
      name: optional(body.name, "昵称", 24, "NFC"),
      role: optional(body.role, "角色", 60, "NFC") || "来宾",
      offer: optional(body.offer, "我能提供", 160),
      need: optional(body.need, "我在寻找", 160),
      organization: optional(body.organization, "机构", 80, "NFC"),
      contact: optional(body.contact, "联系入口", 120),
      bio: optional(body.bio, "一句话介绍", 160, "NFC"),
      contactVisibility, publicContact: contactVisibility === "public",
      listed: body.listed ?? existing?.listed ?? true,
      category: categoryId,
      wristbandColor: this.category(categoryId).wristbandColor,
      avatarColor: avatarColor.toLowerCase(),
      persona,
      consent: true,
    };
  }
  persist() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    const temp = this.file + "." + process.pid + ".tmp";
    writeFileSync(temp, JSON.stringify(this.state), { mode: 0o600 });
    renameSync(temp, this.file);
  }
  changed() {
    this.state.version += 1;
    this.persist();
    this.onChange(this.snapshot());
  }
  listedIds() { return new Set(this.state.attendees.filter(a => a.consent && a.listed !== false).map(a => a.id)); }
  activitySnapshot() {
    const uniqueByCheckpoint = checkpointId => new Set(this.state.checkins.filter(item => item.checkpointId === checkpointId).map(item => item.attendeeId)).size;
    const totalPoints = this.state.checkins.reduce((sum, item) => sum + item.points, 0);
    return {
      checkpoints: this.checkpoints().map(item => ({ ...item, attendees: uniqueByCheckpoint(item.id) })),
      checkedInAttendees: new Set(this.state.checkins.map(item => item.attendeeId)).size,
      totalCheckins: this.state.checkins.length,
      totalPoints,
    };
  }
  meActivity(attendeeId) {
    const items = this.state.checkins.filter(item => item.attendeeId === attendeeId);
    return {
      points: items.reduce((sum, item) => sum + item.points, 0),
      checkins: items.map(item => ({ checkpointId: item.checkpointId, points: item.points, checkedInAt: item.createdAt })),
    };
  }
  checkin(token, checkpointId) {
    const attendee = this.authenticate(token);
    const checkpoint = this.checkpoints().find(item => item.id === checkpointId);
    if (!checkpoint) fail(404, "CHECKPOINT_NOT_FOUND", "这个打卡点尚未开放");
    const existing = this.state.checkins.find(item => item.attendeeId === attendee.id && item.checkpointId === checkpoint.id);
    if (existing) return { checkin: { checkpointId: existing.checkpointId, points: existing.points, checkedInAt: existing.createdAt }, activity: this.meActivity(attendee.id), snapshot: this.snapshot(), idempotent: true };
    const item = { id: "checkin-" + randomUUID(), attendeeId: attendee.id, checkpointId: checkpoint.id, points: checkpoint.points, createdAt: new Date(this.now()).toISOString() };
    this.state.checkins.push(item);
    this.changed();
    return { checkin: { checkpointId: item.checkpointId, points: item.points, checkedInAt: item.createdAt }, activity: this.meActivity(attendee.id), snapshot: this.snapshot(), idempotent: false };
  }
  snapshot() {
    const listed = this.listedIds();
    return {
      event: this.publicEvent(),
      version: this.state.version,
      attendees: this.state.attendees.filter(a => listed.has(a.id)).map(a => this.publicAttendee(a)),
      connections: this.state.encounters.filter(c => c.status === "confirmed" && listed.has(c.fromId) && listed.has(c.toId)).map(publicConnection),
      activity: this.activitySnapshot(),
    };
  }
  authenticate(token, required = true) {
    if (typeof token !== "string" || token.length > 200 || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
      if (required) fail(401, "AUTH_REQUIRED", "请先在此设备领取你的演示分身");
      return null;
    }
    const hash = hashSecret(token);
    const session = this.state.sessions.find(s => s.tokenHash === hash && s.expiresAt > this.now());
    if (!session) {
      if (required) fail(401, "SESSION_EXPIRED", "入场会话已过期，请重新入场");
      return null;
    }
    return this.state.attendees.find(a => a.id === session.attendeeId) || null;
  }
  join(body, existingToken) {
    const existing = this.authenticate(existingToken, false);
    const fields = this.profile(body, existing);
    const attendeeId = existing?.id || "guest-" + randomUUID();
    const badgeId = body.badgeId === undefined || body.badgeId === "" ? null : cleanText(body.badgeId, "入场卡", 1, 64);
    let badge = null;
    if (badgeId) {
      badge = this.state.badges.find(b => b.badgeId === badgeId);
      if (!badge) fail(404, "BADGE_NOT_FOUND", "这张入场卡不属于本演示活动");
      if (badge.attendeeId && badge.attendeeId !== existing?.id) fail(409, "BADGE_ALREADY_CLAIMED", "这张入场卡已领取，请使用原设备");
      if (!badge.attendeeId) {
        const code = typeof body.activationCode === "string" && body.activationCode.length <= 100 ? body.activationCode : "";
        const actual = Buffer.from(hashSecret(code), "hex");
        const expected = Buffer.from(badge.activationHash, "hex");
        if (!timingSafeEqual(actual, expected)) fail(403, "ACTIVATION_REQUIRED", "领取此卡需要活动方提供的激活凭据");
      }
    }
    if (existing) {
      if (badge?.attendeeId === null && this.state.badges.some(b => b.attendeeId === existing.id)) {
        fail(409, "ALREADY_HAS_BADGE", "你的分身已经绑定一张入场卡");
      }
      const customName = !!fields.name;
      Object.assign(existing, fields, { customName, name: fields.name || defaultDisplayName(fields.persona, existing.serial) });
      if (badge && !badge.attendeeId) badge.attendeeId = existing.id;
      this.changed();
      return { token: existingToken, attendee: this.publicAttendee(existing), snapshot: this.snapshot(), resumed: true };
    }
    if (!badgeId && !this.state.event.demoMode) fail(403, "BADGE_REQUIRED", "本活动需要入场卡");
    if (this.state.attendees.length >= this.maxAttendees) fail(409, "EVENT_CAPACITY", "活动已达到人数上限");
    const token = randomBytes(32).toString("base64url");
    const count = this.state.attendees.length;
    const serial = this.state.nextSerial || count + 1;
    this.state.nextSerial = serial + 1;
    const persona = fields.persona || assignPersona(this.state.event.personas, this.personaUsage(), attendeeId);
    const attendee = {
      id: attendeeId, ...fields, persona, serial,
      avatarColor: body.avatarColor ? fields.avatarColor : (personaById(persona)?.color || fields.avatarColor),
      customName: !!fields.name, name: fields.name || defaultDisplayName(persona, serial),
      position: { x: -3.5 + (count % 5) * 1.8, z: 10 + Math.floor((count - 15) / 5) % 3 * 1.8 },
      synthetic: true, source: badgeId ? "demo-badge" : "demo-join",
      joinedAt: new Date(this.now()).toISOString(),
    };
    this.state.attendees.push(attendee);
    this.state.sessions = this.state.sessions.filter(s => s.expiresAt > this.now());
    this.state.sessions.push({ tokenHash: hashSecret(token), attendeeId: attendee.id, createdAt: this.now(), expiresAt: this.now() + TTL_MS });
    if (badge) badge.attendeeId = attendee.id;
    this.changed();
    return { token, attendee: this.publicAttendee(attendee), snapshot: this.snapshot(), resumed: false };
  }
  me(token) {
    const attendee = this.authenticate(token);
    const byId = new Map(this.state.attendees.map(a => [a.id, a]));
    return {
      attendee: this.publicAttendee(attendee),
      profile: { contact: attendee.contact || "", contactVisibility: attendee.contactVisibility || "hidden", listed: attendee.listed !== false, customName: !!attendee.customName },
      version: this.state.version,
      activity: this.meActivity(attendee.id),
      encounters: this.state.encounters.filter(c => (c.fromId === attendee.id || c.toId === attendee.id) && !(c.status === "declined" && c.toId === attendee.id)).map(c => {
        const outgoing = c.fromId === attendee.id;
        const peer = byId.get(outgoing ? c.toId : c.fromId);
        // A declined request stays quietly "pending" for its sender.
        const status = c.status === "declined" ? "pending" : c.status;
        const reveal = status === "confirmed" && peer && peer.contact && ["connections", "public"].includes(peer.contactVisibility);
        return {
          ...publicConnection({ ...c, status }),
          direction: outgoing ? "outgoing" : "incoming",
          canConfirm: status === "pending" && c.toId === attendee.id,
          ...(c.note ? { note: c.note } : {}),
          ...(peer ? { peer: this.publicAttendee(peer) } : {}),
          ...(reveal ? { peerContact: peer.contact } : {}),
        };
      }),
    };
  }
  requestEncounter(token, body) {
    const self = this.authenticate(token);
    const peerId = cleanText(body?.peerId, "对方分身", 1, 80);
    if (peerId === self.id) fail(400, "SELF_ENCOUNTER", "请选择另一位参会者");
    const peer = this.state.attendees.find(a => a.id === peerId && a.consent && a.listed !== false);
    if (!peer) fail(404, "ATTENDEE_NOT_FOUND", "对方分身暂不可见");
    const note = body?.note === undefined || body?.note === null ? "" : cleanText(body.note, "招呼", 0, 60, "NFC");
    const existing = this.state.encounters.find(c =>
      (c.fromId === self.id && c.toId === peer.id) || (c.fromId === peer.id && c.toId === self.id));
    if (existing?.status === "declined" && existing.toId === self.id) {
      // The person who set a request aside now reaches out: that is a yes.
      existing.status = "confirmed";
      existing.confirmedAt = new Date(this.now()).toISOString();
      this.changed();
      return { encounter: publicConnection(existing), idempotent: false, version: this.state.version };
    }
    if (existing) return { encounter: publicConnection({ ...existing, status: existing.status === "declined" ? "pending" : existing.status }), idempotent: true, version: this.state.version };
    const encounter = {
      id: "enc-" + randomUUID(), fromId: self.id, toId: peer.id,
      status: "pending", createdAt: new Date(this.now()).toISOString(), confirmedAt: null, synthetic: true,
      ...(note ? { note } : {}),
    };
    this.state.encounters.push(encounter);
    this.changed();
    return { encounter: publicConnection(encounter), idempotent: false, version: this.state.version };
  }
  confirmEncounter(token, id) {
    const self = this.authenticate(token);
    const encounter = this.state.encounters.find(c => c.id === id);
    if (!encounter) fail(404, "ENCOUNTER_NOT_FOUND", "这次相遇不存在");
    if (encounter.toId !== self.id) fail(403, "PEER_CONFIRMATION_REQUIRED", "需要由收到请求的另一方确认");
    if (encounter.status === "confirmed") return { encounter: publicConnection(encounter), idempotent: true, version: this.state.version };
    encounter.status = "confirmed";
    encounter.confirmedAt = new Date(this.now()).toISOString();
    this.changed();
    return { encounter: publicConnection(encounter), idempotent: false, version: this.state.version };
  }
  declineEncounter(token, id) {
    const self = this.authenticate(token);
    const encounter = this.state.encounters.find(c => c.id === id);
    if (!encounter) fail(404, "ENCOUNTER_NOT_FOUND", "这次相遇不存在");
    if (encounter.toId !== self.id) fail(403, "PEER_CONFIRMATION_REQUIRED", "只有收到请求的一方可以处理");
    if (encounter.status === "confirmed") fail(409, "ALREADY_CONFIRMED", "这次相遇已经确认");
    if (encounter.status !== "declined") { encounter.status = "declined"; this.changed(); }
    return { declined: true, version: this.state.version };
  }
  leave(token) {
    const self = this.authenticate(token);
    if (self.source === "curated-demo") fail(403, "DEMO_PERSON", "演示人物不能删除");
    this.state.attendees = this.state.attendees.filter(a => a.id !== self.id);
    this.state.sessions = this.state.sessions.filter(s => s.attendeeId !== self.id);
    this.state.encounters = this.state.encounters.filter(c => c.fromId !== self.id && c.toId !== self.id);
    this.state.checkins = this.state.checkins.filter(c => c.attendeeId !== self.id);
    for (const badge of this.state.badges) if (badge.attendeeId === self.id) badge.attendeeId = null;
    this.changed();
    return { left: true, version: this.state.version };
  }
  resolveTag(tag) {
    const registered = this.state.event.tags?.[tag];
    if (registered) return registered;
    const checkpoint = /^CP-([a-z0-9-]+)$/i.exec(tag);
    if (checkpoint && this.checkpoints().some(item => item.id === checkpoint[1].toLowerCase())) return { kind: "checkpoint", checkpoint: checkpoint[1].toLowerCase() };
    const wristband = /^WB-([a-z0-9]+)(?:-[A-Za-z0-9_-]+)?$/i.exec(tag);
    if (wristband && this.categories().some(item => item.id === wristband[1].toLowerCase())) return { kind: "wristband", category: wristband[1].toLowerCase() };
    if (/^(?:GATE|ENTRY)(?:-[A-Za-z0-9_-]+)?$/i.test(tag)) return { kind: "entry" };
    return null;
  }
  /** NFC / Alipay tap adapter. With a shared secret every tap must carry
   * HMAC-SHA256(secret, tag.ts.nonce) within ten minutes and a fresh nonce;
   * without one, only demoMode accepts unsigned taps (verified:false). */
  tap(token, body, { secret = "" } = {}) {
    if (!body || typeof body !== "object") fail(400, "INVALID_TAP", "触碰数据无效");
    const tag = cleanText(body.tag, "标签", 2, 64);
    if (!/^[A-Za-z0-9_-]+$/.test(tag)) fail(400, "INVALID_TAP", "标签格式不正确");
    let verified = false;
    if (secret) {
      const ts = Number(body.ts), nonce = typeof body.nonce === "string" ? body.nonce : "", sig = typeof body.sig === "string" ? body.sig.toLowerCase() : "";
      if (!Number.isSafeInteger(ts) || Math.abs(this.now() - ts * 1000) > TAP_WINDOW_MS) fail(401, "TAP_EXPIRED", "这次触碰已过期，请再碰一下");
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(sig)) fail(401, "TAP_SIGNATURE_INVALID", "触碰签名无效");
      const expected = createHmac("sha256", secret).update(`${tag}.${ts}.${nonce}`).digest();
      if (!timingSafeEqual(expected, Buffer.from(sig, "hex"))) fail(401, "TAP_SIGNATURE_INVALID", "触碰签名无效");
      const moment = this.now();
      for (const [key, until] of this.tapNonces) if (until <= moment) this.tapNonces.delete(key);
      if (this.tapNonces.has(nonce)) fail(409, "TAP_REPLAYED", "这次触碰已经使用过，请再碰一下");
      this.tapNonces.set(nonce, moment + TAP_WINDOW_MS * 2);
      verified = true;
    } else if (!this.state.event.demoMode) fail(403, "TAP_SIGNATURE_REQUIRED", "本活动需要已签名的触碰");
    const resolved = this.resolveTag(tag);
    if (!resolved) fail(404, "TAG_NOT_FOUND", "没有识别这枚标签");
    const result = { tag: { id: tag, ...resolved }, verified };
    const attendee = this.authenticate(token, false);
    if (attendee && resolved.kind === "wristband" && attendee.category === "guest" && this.categories().some(item => item.id === resolved.category)) {
      attendee.category = resolved.category;
      attendee.wristbandColor = this.category(resolved.category).wristbandColor;
      this.changed();
      result.attendee = this.publicAttendee(attendee);
    }
    if (attendee && resolved.kind === "checkpoint") result.checkin = this.checkin(token, resolved.checkpoint);
    return result;
  }
  matches(token) {
    const self = this.authenticate(token);
    const offers = topicsIn(self.offer), needs = topicsIn(self.need);
    const matches = this.state.attendees.filter(a => a.id !== self.id && a.consent && a.listed !== false).map(peer => {
      const helpsYou = common(needs, topicsIn(peer.offer));
      const youHelp = common(offers, topicsIn(peer.need));
      const evidence = [
        ...helpsYou.map(topic => ({ direction: "they-help-you", topic, yourField: "need", yourText: self.need, peerField: "offer", peerText: peer.offer })),
        ...youHelp.map(topic => ({ direction: "you-help-them", topic, yourField: "offer", yourText: self.offer, peerField: "need", peerText: peer.need })),
      ];
      const score = helpsYou.length * 3 + youHelp.length * 2 + (helpsYou.length && youHelp.length ? 2 : 0);
      return {
        attendee: this.publicAttendee(peer), score, evidence,
        reasons: [
          ...(helpsYou.length ? ["TA 可提供你在寻找的 " + helpsYou.join("、")] : []),
          ...(youHelp.length ? ["你可提供 TA 在寻找的 " + youHelp.join("、")] : []),
        ],
      };
    }).filter(m => m.score > 0).sort((a,b) => b.score - a.score || a.attendee.id.localeCompare(b.attendee.id)).slice(0, 3);
    return {
      algorithm: "authorized-tags-v1",
      explanation: "根据双方主动公开的供给与需求进行固定词表匹配。分数表示主题重合，不代表合作概率；当前未使用大模型或读取私人资料。",
      version: this.state.version,
      matches,
    };
  }
}
