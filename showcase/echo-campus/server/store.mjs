import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { DEMO_EVENT, seedAttendees, seedConnections, demoBadges } from "./seed.mjs";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const HEX = /^#[0-9a-fA-F]{6}$/;
export const hashSecret = value => createHash("sha256").update(value).digest("hex");

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function fail(status, code, message) { throw new HttpError(status, code, message); }

function cleanText(value, field, min, max) {
  if (typeof value !== "string") fail(400, "INVALID_INPUT", field + "需要填写文字");
  const text = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (text.length < min || text.length > max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
    fail(400, "INVALID_INPUT", field + "格式不正确（" + min + "–" + max + " 字）");
  }
  return text;
}
function profile(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) fail(400, "INVALID_INPUT", "请提交有效资料");
  if (body.consent !== true) fail(400, "CONSENT_REQUIRED", "请确认在本活动公开展示这些资料");
  const avatarColor = body.avatarColor || "#758b79";
  if (typeof avatarColor !== "string" || !HEX.test(avatarColor)) fail(400, "INVALID_INPUT", "分身颜色格式不正确");
  return {
    name: cleanText(body.name, "昵称", 1, 24),
    role: cleanText(body.role, "角色", 1, 60),
    offer: cleanText(body.offer, "我能提供", 1, 160),
    need: cleanText(body.need, "我在寻找", 1, 160),
    avatarColor: avatarColor.toLowerCase(),
    consent: true,
  };
}
function publicAttendee(a) {
  const { id, name, role, offer, need, avatarColor, position, synthetic, source, joinedAt } = a;
  return { id, name, role, offer, need, avatarColor, position, synthetic, source, joinedAt };
}
function publicConnection(c) {
  const { id, fromId, toId, status, createdAt, confirmedAt, synthetic } = c;
  return { id, fromId, toId, attendeeIds: [fromId, toId], status, createdAt, confirmedAt, synthetic: !!synthetic };
}

const TOPICS = [
  ["Agent", ["agent", "智能体"]],
  ["AI 产品", ["ai 产品", "ai产品", "ai 工程", "人工智能"]],
  ["品牌设计", ["品牌设计", "品牌故事", "视觉叙事"]],
  ["空间设计", ["空间设计", "建筑可视化"]],
  ["实时 3D", ["实时 3d", "实时3d", "3d"]],
  ["数字人", ["数字人", "数字分身"]],
  ["活动", ["线下活动", "活动策划", "活动"]],
  ["社群", ["社群", "社区"]],
  ["产品验证", ["产品验证", "用户访谈"]],
  ["种子用户", ["种子用户"]],
  ["融资", ["融资", "投资"]],
  ["创业团队", ["创业团队", "创业"]],
  ["全栈开发", ["全栈开发", "快速原型"]],
  ["产品设计", ["产品设计", "交互原型"]],
  ["云计算", ["云计算", "工程部署"]],
  ["技术共创", ["技术共创"]],
  ["教育", ["教育"]],
  ["数字艺术", ["数字艺术"]],
  ["NFC", ["nfc", "物联网"]],
  ["内容传播", ["内容传播", "内容"]],
];
function topics(text) {
  const lower = text.toLowerCase();
  return new Set(TOPICS.filter(([,aliases]) => aliases.some(a => lower.includes(a))).map(([name]) => name));
}
function common(a, b) { return [...a].filter(tag => b.has(tag)); }

export class EventStore {
  constructor({ file = null, now = () => Date.now(), onChange = () => {} } = {}) {
    this.file = file;
    this.now = now;
    this.onChange = onChange;
    if (file && existsSync(file)) {
      this.state = JSON.parse(readFileSync(file, "utf8"));
      if (this.state.schema !== "echo-campus-store.v1") throw new Error("Unsupported demo store schema");
    } else {
      const date = new Date(now()).toISOString();
      this.state = {
        schema: "echo-campus-store.v1", version: 1, event: { ...DEMO_EVENT },
        attendees: seedAttendees(date), encounters: seedConnections(date), sessions: [],
        badges: demoBadges().map(b => ({ badgeId: b.badgeId, activationHash: hashSecret(b.activationCode), attendeeId: null })),
      };
      this.persist();
    }
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
  snapshot() {
    return {
      event: { ...this.state.event },
      version: this.state.version,
      attendees: this.state.attendees.filter(a => a.consent).map(publicAttendee),
      connections: this.state.encounters.filter(c => c.status === "confirmed").map(publicConnection),
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
    const fields = profile(body);
    const existing = this.authenticate(existingToken, false);
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
      Object.assign(existing, fields);
      if (badge && !badge.attendeeId) badge.attendeeId = existing.id;
      this.changed();
      return { token: existingToken, attendee: publicAttendee(existing), snapshot: this.snapshot(), resumed: true };
    }
    if (!badgeId && !this.state.event.demoMode) fail(403, "BADGE_REQUIRED", "本活动需要入场卡");
    if (this.state.attendees.length >= 500) fail(409, "EVENT_CAPACITY", "演示活动已达到人数上限");
    const token = randomBytes(32).toString("base64url");
    const count = this.state.attendees.length;
    const attendee = {
      id: "guest-" + randomUUID(), ...fields,
      position: { x: -3.5 + (count % 5) * 1.8, z: 10 + Math.floor((count - 15) / 5) % 3 * 1.8 },
      synthetic: true, source: badgeId ? "demo-badge" : "demo-join",
      joinedAt: new Date(this.now()).toISOString(),
    };
    this.state.attendees.push(attendee);
    this.state.sessions = this.state.sessions.filter(s => s.expiresAt > this.now());
    this.state.sessions.push({ tokenHash: hashSecret(token), attendeeId: attendee.id, createdAt: this.now(), expiresAt: this.now() + TTL_MS });
    if (badge) badge.attendeeId = attendee.id;
    this.changed();
    return { token, attendee: publicAttendee(attendee), snapshot: this.snapshot(), resumed: false };
  }
  me(token) {
    const attendee = this.authenticate(token);
    return {
      attendee: publicAttendee(attendee),
      version: this.state.version,
      encounters: this.state.encounters.filter(c => c.fromId === attendee.id || c.toId === attendee.id).map(c => ({
        ...publicConnection(c),
        direction: c.fromId === attendee.id ? "outgoing" : "incoming",
        canConfirm: c.status === "pending" && c.toId === attendee.id,
      })),
    };
  }
  requestEncounter(token, body) {
    const self = this.authenticate(token);
    const peerId = cleanText(body?.peerId, "对方分身", 1, 80);
    if (peerId === self.id) fail(400, "SELF_ENCOUNTER", "请选择另一位参会者");
    const peer = this.state.attendees.find(a => a.id === peerId && a.consent);
    if (!peer) fail(404, "ATTENDEE_NOT_FOUND", "对方分身暂不可见");
    const existing = this.state.encounters.find(c =>
      (c.fromId === self.id && c.toId === peer.id) || (c.fromId === peer.id && c.toId === self.id));
    if (existing) return { encounter: publicConnection(existing), idempotent: true, version: this.state.version };
    const encounter = {
      id: "enc-" + randomUUID(), fromId: self.id, toId: peer.id,
      status: "pending", createdAt: new Date(this.now()).toISOString(), confirmedAt: null, synthetic: true,
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
  matches(token) {
    const self = this.authenticate(token);
    const offers = topics(self.offer), needs = topics(self.need);
    const matches = this.state.attendees.filter(a => a.id !== self.id && a.consent).map(peer => {
      const helpsYou = common(needs, topics(peer.offer));
      const youHelp = common(offers, topics(peer.need));
      const evidence = [
        ...helpsYou.map(topic => ({ direction: "they-help-you", topic, yourField: "need", yourText: self.need, peerField: "offer", peerText: peer.offer })),
        ...youHelp.map(topic => ({ direction: "you-help-them", topic, yourField: "offer", yourText: self.offer, peerField: "need", peerText: peer.need })),
      ];
      const score = helpsYou.length * 3 + youHelp.length * 2 + (helpsYou.length && youHelp.length ? 2 : 0);
      return {
        attendee: publicAttendee(peer), score, evidence,
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
