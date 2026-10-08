import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventStore } from "../server/store.mjs";
import { createEventServer } from "../server/index.mjs";
import { readEventConfig, validateEventConfig } from "../server/event-config.mjs";
import { PERSONAS, PERSONA_IDS, assignPersona, defaultDisplayName } from "../src/shared/personas.mjs";
import { TOPIC_NAMES, topicsIn, splitChips } from "../src/shared/topics.mjs";

const isError = (status, code) => error => error.status === status && (!code || error.code === code);
const sign = (secret, tag, ts, nonce) => createHmac("sha256", secret).update(`${tag}.${ts}.${nonce}`).digest("hex");

test("persona roster is complete, unique and spreads arrivals across every look", () => {
  assert.equal(new Set(PERSONA_IDS).size, PERSONAS.length);
  for (const persona of PERSONAS) {
    assert.match(persona.color, /^#[0-9a-f]{6}$/);
    assert.ok(persona.codename.length >= 2 && persona.signature && persona.trait && persona.line);
  }
  const store = new EventStore();
  const before = store.personaUsage();
  const joined = Array.from({ length: PERSONAS.length }, () => store.join({ consent: true }).attendee.persona);
  const after = store.personaUsage();
  const minBefore = Math.min(...PERSONA_IDS.map(id => before.get(id) || 0));
  assert.ok(PERSONA_IDS.every(id => (after.get(id) || 0) >= minBefore + 1), "a full round of arrivals touches every persona");
  assert.equal(new Set(joined).size >= PERSONAS.length - 3, true);
  assert.equal(assignPersona(["zhusha"], new Map(), "x"), "zhusha");
  assert.equal(defaultDisplayName("zhusha", 7), "朱砂·007");
});

test("requested persona is honored, validated and drives the default name until a nickname is chosen", () => {
  const store = new EventStore();
  assert.throws(() => store.join({ consent: true, persona: "dragon" }), isError(400, "INVALID_INPUT"));
  const claim = store.join({ consent: true, persona: "shanhu" });
  assert.equal(claim.attendee.persona, "shanhu");
  assert.equal(claim.attendee.avatarColor, PERSONAS.find(p => p.id === "shanhu").color);
  assert.equal(claim.attendee.name, defaultDisplayName("shanhu", claim.attendee.serial));
  const switched = store.join({ consent: true, persona: "mochuan" }, claim.token);
  assert.equal(switched.attendee.name, defaultDisplayName("mochuan", claim.attendee.serial));
  const named = store.join({ consent: true, name: "阿岚" }, claim.token);
  assert.equal(named.attendee.name, "阿岚");
  assert.equal(named.attendee.persona, "mochuan", "persona persists when omitted");
  assert.equal(store.me(claim.token).profile.customName, true);
});

test("contact shared with connections stays private until the encounter is confirmed", () => {
  const store = new EventStore();
  const a = store.join({ consent: true, contact: "wx_alice", contactVisibility: "connections" });
  const b = store.join({ consent: true, contact: "wx_bob", contactVisibility: "connections" });
  const c = store.join({ consent: true });
  assert.equal(a.attendee.sharesContact, true);
  assert.equal(JSON.stringify(store.snapshot()).includes("wx_alice"), false);
  const request = store.requestEncounter(a.token, { peerId: b.attendee.id, note: "想聊聊你的 Agent 项目" });
  const pendingForB = store.me(b.token).encounters[0];
  assert.equal(pendingForB.note, "想聊聊你的 Agent 项目");
  assert.equal(pendingForB.peer.id, a.attendee.id);
  assert.equal(pendingForB.peerContact, undefined, "nothing is revealed before both agree");
  store.confirmEncounter(b.token, request.encounter.id);
  assert.equal(store.me(a.token).encounters[0].peerContact, "wx_bob");
  assert.equal(store.me(b.token).encounters[0].peerContact, "wx_alice");
  assert.equal(store.me(c.token).encounters.length, 0);
  assert.equal(JSON.stringify(store.snapshot()).includes("wx_"), false);
  assert.equal(store.me(a.token).profile.contact, "wx_alice", "owner can read back their own contact");
  const hidden = store.join({ consent: true, contact: "wx_hidden", contactVisibility: "hidden" });
  const req2 = store.requestEncounter(a.token, { peerId: hidden.attendee.id });
  store.confirmEncounter(hidden.token, req2.encounter.id);
  assert.equal(store.me(a.token).encounters.find(e => e.id === req2.encounter.id).peerContact, undefined);
  assert.throws(() => store.join({ consent: true, contactVisibility: "everyone" }), isError(400));
  assert.throws(() => store.requestEncounter(a.token, { peerId: c.attendee.id, note: "x".repeat(61) }), isError(400));
});

test("declined requests disappear for the recipient, stay quiet for the sender and can still become a yes", () => {
  const store = new EventStore();
  const a = store.join({ consent: true }), b = store.join({ consent: true });
  const request = store.requestEncounter(a.token, { peerId: b.attendee.id });
  assert.throws(() => store.declineEncounter(a.token, request.encounter.id), isError(403));
  store.declineEncounter(b.token, request.encounter.id);
  assert.equal(store.me(b.token).encounters.length, 0);
  assert.equal(store.me(a.token).encounters[0].status, "pending");
  assert.equal(store.requestEncounter(a.token, { peerId: b.attendee.id }).idempotent, true, "no repeat nagging");
  const change = store.requestEncounter(b.token, { peerId: a.attendee.id });
  assert.equal(change.encounter.status, "confirmed");
  assert.throws(() => store.declineEncounter(b.token, request.encounter.id), isError(409));
});

test("invisible mode removes a guest from the public world, matches and public connections", () => {
  const store = new EventStore();
  const a = store.join({ consent: true, offer: "品牌设计", need: "融资" });
  const b = store.join({ consent: true, offer: "融资", need: "品牌设计" });
  const request = store.requestEncounter(a.token, { peerId: b.attendee.id });
  store.confirmEncounter(b.token, request.encounter.id);
  assert.ok(store.snapshot().connections.some(c => c.id === request.encounter.id));
  store.join({ consent: true, offer: "融资", need: "品牌设计", listed: false }, b.token);
  const snapshot = store.snapshot();
  assert.equal(snapshot.attendees.some(p => p.id === b.attendee.id), false);
  assert.equal(snapshot.connections.some(c => c.id === request.encounter.id), false);
  assert.equal(store.matches(a.token).matches.some(m => m.attendee.id === b.attendee.id), false);
  assert.throws(() => store.requestEncounter(store.join({ consent: true }).token, { peerId: b.attendee.id }), isError(404));
  assert.equal(store.me(b.token).profile.listed, false);
  assert.throws(() => store.join({ consent: true, listed: "no" }, b.token), isError(400));
});

test("leaving deletes the guest, their sessions, encounters and checkins", () => {
  const store = new EventStore();
  const a = store.join({ consent: true }), b = store.join({ consent: true });
  store.requestEncounter(a.token, { peerId: b.attendee.id });
  store.checkin(a.token, "welcome");
  store.leave(a.token);
  assert.equal(store.snapshot().attendees.some(p => p.id === a.attendee.id), false);
  assert.equal(store.me(b.token).encounters.length, 0);
  assert.equal(store.state.checkins.some(c => c.attendeeId === a.attendee.id), false);
  assert.throws(() => store.me(a.token), isError(401));
});

test("unsigned demo taps resolve wristbands and checkpoints, and live events require signatures", () => {
  const store = new EventStore();
  const anonymous = store.tap("", { tag: "WB-investor-0042" });
  assert.deepEqual(anonymous.tag, { id: "WB-investor-0042", kind: "wristband", category: "investor" });
  assert.equal(anonymous.verified, false);
  assert.throws(() => store.tap("", { tag: "WB-astronaut-1" }), isError(404, "TAG_NOT_FOUND"));
  assert.throws(() => store.tap("", { tag: "<x>" }), isError(400));
  const guest = store.join({ consent: true });
  const wristband = store.tap(guest.token, { tag: "WB-founder-7" });
  assert.equal(wristband.attendee.category, "founder");
  assert.equal(wristband.attendee.wristbandColor, "#4f82bd");
  const first = store.tap(guest.token, { tag: "CP-future" });
  const repeat = store.tap(guest.token, { tag: "CP-future" });
  assert.equal(first.checkin.checkin.points, 20);
  assert.equal(repeat.checkin.idempotent, true);
  assert.equal(store.tap("", { tag: "GATE-north" }).tag.kind, "entry");
  store.state.event.demoMode = false;
  assert.throws(() => store.tap("", { tag: "CP-future" }), isError(403, "TAP_SIGNATURE_REQUIRED"));
});

test("signed taps verify HMAC, time window and single-use nonce", () => {
  let now = 1_800_000_000_000;
  const store = new EventStore({ now: () => now });
  store.state.event.demoMode = false;
  const secret = "partner-shared-secret";
  const ts = Math.floor(now / 1000), tag = "CP-welcome", nonce = "n0nce-0001";
  const ok = store.tap("", { tag, ts, nonce, sig: sign(secret, tag, ts, nonce) }, { secret });
  assert.equal(ok.verified, true);
  assert.throws(() => store.tap("", { tag, ts, nonce, sig: sign(secret, tag, ts, nonce) }, { secret }), isError(409, "TAP_REPLAYED"));
  assert.throws(() => store.tap("", { tag, ts, nonce: "n0nce-0002", sig: sign("wrong", tag, ts, "n0nce-0002") }, { secret }), isError(401, "TAP_SIGNATURE_INVALID"));
  assert.throws(() => store.tap("", { tag: "CP-future", ts, nonce: "n0nce-0003", sig: sign(secret, tag, ts, "n0nce-0003") }, { secret }), isError(401), "signature binds the tag");
  now += 11 * 60 * 1000;
  assert.throws(() => store.tap("", { tag, ts, nonce: "n0nce-0004", sig: sign(secret, tag, ts, "n0nce-0004") }, { secret }), isError(401, "TAP_EXPIRED"));
});

test("partner event profile overrides branding, roster and points while keeping the tag registry private", t => {
  const dir = mkdtempSync(join(tmpdir(), "echo-profile-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "event.json");
  writeFileSync(file, JSON.stringify({
    name: "江苏投资人之夜", subtitle: "碰一下，认识同路人", theme: { accent: "#1677FF" }, personas: ["zhusha", "songshi"],
    checkpoints: [{ id: "stage", label: "主舞台", partner: "主办方", description: "在主舞台碰一下", points: 30 }],
    tags: { "ALIPAY-STAGE-01": { kind: "checkpoint", checkpoint: "stage" } },
  }));
  const config = readEventConfig(file);
  const store = new EventStore({ eventConfig: config });
  const snapshot = store.snapshot();
  assert.equal(snapshot.event.name, "江苏投资人之夜");
  assert.equal(snapshot.event.theme.accent, "#1677ff");
  assert.equal(snapshot.event.theme.ink, "#3a2e28", "unspecified theme keys keep defaults");
  assert.deepEqual(snapshot.event.personas, ["zhusha", "songshi"]);
  assert.equal("tags" in snapshot.event, false);
  assert.equal(JSON.stringify(snapshot).includes("ALIPAY-STAGE-01"), false);
  const guest = store.join({ consent: true });
  assert.ok(["zhusha", "songshi"].includes(guest.attendee.persona));
  assert.throws(() => store.join({ consent: true, persona: "baizao" }), isError(400));
  const tap = store.tap(guest.token, { tag: "ALIPAY-STAGE-01" });
  assert.equal(tap.checkin.checkin.points, 30);
  for (const bad of [{ theme: { accent: "blue" } }, { personas: ["nobody"] }, { categories: [{ id: "vip", label: "VIP", wristbandColor: "#000000" }] }, { tags: { "a b": { kind: "entry" } } }, { name: "" }]) {
    assert.throws(() => validateEventConfig(bad), /活动配置无效/);
  }
});

test("existing demo stores migrate to personas, arrival numbers and explicit contact visibility", t => {
  const dir = mkdtempSync(join(tmpdir(), "echo-migrate-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "event.json");
  const legacy = new EventStore({ file });
  for (const attendee of legacy.state.attendees) { delete attendee.persona; delete attendee.serial; delete attendee.contactVisibility; delete attendee.listed; delete attendee.customName; }
  legacy.state.attendees.push({ id: "guest-legacy", name: "访客ABC123", role: "来宾", offer: "", need: "", organization: "", bio: "", contact: "x@y.z", publicContact: true, category: "guest", wristbandColor: "#778879", avatarColor: "#778879", consent: true, synthetic: true, source: "demo-join", joinedAt: new Date().toISOString() });
  delete legacy.state.nextSerial;
  legacy.persist();
  const store = new EventStore({ file });
  const migrated = store.state.attendees.find(a => a.id === "guest-legacy");
  assert.ok(PERSONA_IDS.includes(migrated.persona));
  assert.equal(migrated.serial, 16);
  assert.equal(migrated.contactVisibility, "public");
  assert.equal(migrated.name, defaultDisplayName(migrated.persona, 16), "auto guest names adopt the persona naming");
  assert.equal(store.state.attendees.find(a => a.id === "seed-06").persona, "songshi");
  assert.equal(store.state.nextSerial, 17);
  assert.equal(store.join({ consent: true }).attendee.serial, 17);
});

test("stores holding the old default colours adopt the paper theme; chosen colours stay", t => {
  const dir = mkdtempSync(join(tmpdir(), "echo-theme-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "event.json");
  const legacy = new EventStore({ file });
  legacy.state.event.theme = { ink: "#1c2621", paper: "#f6f1e6", accent: "#1677ff", glow: "#ffcf8f", sage: "#4a6a5b" };
  legacy.persist();
  const theme = new EventStore({ file }).snapshot().event.theme;
  assert.deepEqual(theme, { ink: "#3a2e28", paper: "#fbf6ee", accent: "#1677ff", glow: "#ffcf8f", sage: "#2f5d62" });
  const custom = new EventStore({ file });
  custom.state.event.theme = { ...custom.state.event.theme, ink: "#102030" };
  custom.persist();
  assert.equal(new EventStore({ file }).snapshot().event.theme.ink, "#102030");
});

test("shared topic vocabulary powers chips and matching with the same names", () => {
  for (const name of TOPIC_NAMES) assert.ok(topicsIn(name).has(name), name + " chip must match its own topic");
  assert.deepEqual(splitChips("品牌设计、种子用户, 融资 / 出海"), ["品牌设计", "种子用户", "融资", "出海"]);
});

test("trusted proxy keys rate limits by the forwarded client address", async t => {
  const dir = mkdtempSync(join(tmpdir(), "echo-proxy-"));
  const app = createEventServer({ dataFile: join(dir, "event.json"), distDir: join(dir, "dist"), trustProxy: true, rateLimit: { read: 50, write: 50, join: 1, windowMs: 60000 } });
  const address = await app.listen(0);
  t.after(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }); });
  const claim = ip => fetch(`http://127.0.0.1:${address.port}/api/join`, { method: "POST", headers: { "Content-Type": "application/json", "X-Real-IP": ip }, body: JSON.stringify({ consent: true }) });
  assert.equal((await claim("10.0.0.1")).status, 201);
  assert.equal((await claim("10.0.0.2")).status, 201, "a different phone behind the proxy has its own budget");
  assert.equal((await claim("10.0.0.1")).status, 429);
  const tap = await fetch(`http://127.0.0.1:${address.port}/api/tap`, { method: "POST", headers: { "Content-Type": "application/json", "X-Real-IP": "10.0.0.3" }, body: JSON.stringify({ tag: "CP-welcome" }) });
  assert.equal(tap.status, 200);
  assert.equal((await tap.json()).tag.checkpoint, "welcome");
});
