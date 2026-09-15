import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createEventServer } from "../server/index.mjs";
import { EventStore } from "../server/store.mjs";

const ALICE = { name: "测试甲", role: "AI 产品创始人", offer: "AI 产品研发、实时 3D", need: "品牌设计、用户访谈", avatarColor: "#778879", consent: true };
const BOB = { name: "测试乙", role: "设计师", offer: "品牌设计、用户访谈", need: "AI 产品、实时 3D", avatarColor: "#b98878", consent: true };
function isError(status, code) {
  return error => error.status === status && (!code || error.code === code);
}
async function fixture(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "echo-campus-test-"));
  const app = createEventServer({ dataFile: join(dir, "event.json"), distDir: join(dir, "dist"), ...options });
  const address = await app.listen(0);
  const base = "http://127.0.0.1:" + address.port;
  const sockets = [];
  t.after(async () => {
    for (const ws of sockets) ws.terminate();
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
  async function request(path, { body, token, headers = {}, method } = {}) {
    const response = await fetch(base + path, {
      method: method || (body ? "POST" : "GET"),
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    return { status: response.status, data };
  }
  async function connect() {
    const ws = new WebSocket(base.replace("http:", "ws:") + "/api/live", { origin: "http://localhost:5189" });
    sockets.push(ws);
    const queue = [];
    const waiters = [];
    ws.on("message", raw => {
      const message = JSON.parse(raw.toString());
      const waiter = waiters.shift();
      if (waiter) waiter(message); else queue.push(message);
    });
    await once(ws, "open");
    return { ws, next: () => queue.length ? Promise.resolve(queue.shift()) : new Promise(resolve => waiters.push(resolve)) };
  }
  return { app, base, request, connect, dir };
}

test("sanitized event snapshot contains synthetic disclosures and no ownership or secrets", () => {
  const store = new EventStore();
  const claim = store.join({ ...ALICE, badgeId: "demo-visitor-01", activationCode: "ECHO-DEMO-01" });
  const snapshot = store.snapshot();
  assert.equal(snapshot.attendees.length, 16);
  assert.equal(snapshot.event.demoMode, true);
  assert.equal(snapshot.attendees.every(a => a.synthetic), true);
  const encoded = JSON.stringify(snapshot);
  for (const secret of [claim.token, "badgeId", "activationCode", "tokenHash", "activationHash", "sessions", "consent"]) assert.equal(encoded.includes(secret), false, secret);
  assert.equal(snapshot.connections.every(c => c.status === "confirmed"), true);
  assert.equal(store.me(claim.token).attendee.id, claim.attendee.id);
});

test("badge activation, claim ownership and authenticated resume prevent identity takeover", () => {
  const store = new EventStore();
  assert.throws(() => store.join({ ...ALICE, badgeId: "demo-visitor-01" }), isError(403, "ACTIVATION_REQUIRED"));
  assert.throws(() => store.join({ ...ALICE, badgeId: "unregistered" }), isError(404, "BADGE_NOT_FOUND"));
  const owner = store.join({ ...ALICE, badgeId: "demo-visitor-01", activationCode: "ECHO-DEMO-01" });
  assert.throws(() => store.join({ ...BOB, badgeId: "demo-visitor-01", activationCode: "ECHO-DEMO-01" }), isError(409, "BADGE_ALREADY_CLAIMED"));
  const stranger = store.join(BOB);
  assert.throws(() => store.join({ ...BOB, badgeId: "demo-visitor-01", activationCode: "ECHO-DEMO-01" }, stranger.token), isError(409));
  const resumed = store.join({ ...ALICE, name: "测试甲更新", badgeId: "demo-visitor-01" }, owner.token);
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.token, owner.token);
  assert.equal(resumed.attendee.id, owner.attendee.id);
  assert.equal(resumed.attendee.name, "测试甲更新");
  assert.equal(store.snapshot().attendees.length, 17);
  assert.throws(() => store.join({ ...ALICE, badgeId: "demo-visitor-02", activationCode: "ECHO-DEMO-02" }, owner.token), isError(409, "ALREADY_HAS_BADGE"));
});

test("encounters require recipient confirmation, remain private while pending, and are idempotent", () => {
  const store = new EventStore();
  const a = store.join(ALICE), b = store.join(BOB), c = store.join({ ...ALICE, name: "无关第三方" });
  const originalCount = store.snapshot().connections.length;
  assert.throws(() => store.requestEncounter("", { peerId: b.attendee.id }), isError(401));
  assert.throws(() => store.requestEncounter(a.token, { peerId: a.attendee.id }), isError(400, "SELF_ENCOUNTER"));
  const requested = store.requestEncounter(a.token, { peerId: b.attendee.id });
  const id = requested.encounter.id;
  assert.equal(requested.encounter.status, "pending");
  assert.equal(store.snapshot().connections.length, originalCount);
  assert.equal(store.me(a.token).encounters[0].canConfirm, false);
  assert.equal(store.me(b.token).encounters[0].canConfirm, true);
  assert.equal(store.me(c.token).encounters.length, 0);
  assert.throws(() => store.confirmEncounter(a.token, id), isError(403));
  assert.throws(() => store.confirmEncounter(c.token, id), isError(403));
  const repeated = store.requestEncounter(a.token, { peerId: b.attendee.id });
  const reverse = store.requestEncounter(b.token, { peerId: a.attendee.id });
  assert.equal(repeated.encounter.id, id);
  assert.equal(reverse.encounter.status, "pending");
  assert.equal(reverse.idempotent, true);
  assert.equal(store.state.version, requested.version);
  const confirmed = store.confirmEncounter(b.token, id);
  assert.equal(confirmed.encounter.status, "confirmed");
  assert.equal(store.snapshot().connections.length, originalCount + 1);
  assert.equal(store.confirmEncounter(b.token, id).version, confirmed.version);
  assert.equal(store.requestEncounter(a.token, { peerId: b.attendee.id }).encounter.status, "confirmed");
});

test("public offer/need matching is deterministic, bidirectional, and cites its actual inputs", () => {
  const store = new EventStore();
  const a = store.join(ALICE), b = store.join(BOB);
  const first = store.matches(a.token), second = store.matches(a.token);
  assert.deepEqual(first, second);
  assert.equal(first.algorithm, "authorized-tags-v1");
  assert.ok(first.explanation.includes("未使用大模型"));
  assert.ok(first.matches.length <= 3);
  const match = first.matches.find(m => m.attendee.id === b.attendee.id);
  assert.ok(match);
  assert.ok(match.evidence.some(e => e.direction === "they-help-you" && e.yourText === ALICE.need && e.peerText === BOB.offer));
  assert.ok(match.evidence.some(e => e.direction === "you-help-them" && e.yourText === ALICE.offer && e.peerText === BOB.need));
  assert.ok(first.matches.every(m => m.attendee.id !== a.attendee.id));
  assert.throws(() => store.matches("made-up-token"), isError(401));
});

test("HTTP two-participant flow and WebSocket reconnect reflect monotonic authoritative state", async t => {
  const { request, connect } = await fixture(t);
  const firstSocket = await connect();
  const initial = await firstSocket.next();
  assert.equal(initial.type, "snapshot");
  const a = await request("/api/join", { body: ALICE });
  assert.equal(a.status, 201);
  const afterA = await firstSocket.next();
  assert.ok(afterA.version > initial.version);
  assert.ok(afterA.attendees.some(p => p.id === a.data.attendee.id));
  const b = await request("/api/join", { body: BOB });
  assert.equal(b.status, 201);
  const afterB = await firstSocket.next();
  assert.ok(afterB.version > afterA.version);
  const pending = await request("/api/encounters", { token: a.data.token, body: { peerId: b.data.attendee.id } });
  assert.equal(pending.status, 201);
  const afterPending = await firstSocket.next();
  assert.ok(afterPending.version > afterB.version);
  assert.equal(afterPending.connections.some(c => c.id === pending.data.encounter.id), false);
  const inbox = await request("/api/me", { token: b.data.token });
  assert.equal(inbox.data.encounters[0].canConfirm, true);
  const denied = await request("/api/encounters/" + pending.data.encounter.id + "/confirm", { token: a.data.token, method: "POST" });
  assert.equal(denied.status, 403);
  const confirmed = await request("/api/encounters/" + pending.data.encounter.id + "/confirm", { token: b.data.token, method: "POST" });
  assert.equal(confirmed.status, 200);
  const afterConfirmed = await firstSocket.next();
  assert.ok(afterConfirmed.connections.some(c => c.id === pending.data.encounter.id));
  firstSocket.ws.close();
  await once(firstSocket.ws, "close");
  const reconnected = await connect();
  const fresh = await reconnected.next();
  assert.equal(fresh.version, afterConfirmed.version);
  assert.deepEqual(fresh.connections, afterConfirmed.connections);
  const publicRead = await request("/api/event");
  assert.equal(publicRead.data.version, fresh.version);
  assert.equal(JSON.stringify(fresh).includes(a.data.token), false);
  assert.equal(JSON.stringify(fresh).includes(b.data.token), false);
  const restored = await request("/api/me", { token: a.data.token });
  assert.equal(restored.data.attendee.id, a.data.attendee.id);
  const closure = once(reconnected.ws, "close");
  reconnected.ws.send("unauthorized-mutation");
  assert.equal((await closure)[0], 1008);
});

test("disk persistence preserves identity/confirmed relations and stores only token hashes", async t => {
  const { app, dir, request } = await fixture(t);
  const a = await request("/api/join", { body: { ...ALICE, badgeId: "demo-visitor-03", activationCode: "ECHO-DEMO-03" } });
  const b = await request("/api/join", { body: BOB });
  const pending = app.store.requestEncounter(a.data.token, { peerId: b.data.attendee.id });
  app.store.confirmEncounter(b.data.token, pending.encounter.id);
  const file = join(dir, "event.json");
  const serialized = readFileSync(file, "utf8");
  assert.equal(serialized.includes(a.data.token), false);
  assert.equal(serialized.includes(b.data.token), false);
  assert.equal(serialized.includes("ECHO-DEMO-03"), false);
  const restored = new EventStore({ file });
  assert.equal(restored.me(a.data.token).attendee.id, a.data.attendee.id);
  assert.equal(restored.me(b.data.token).encounters[0].status, "confirmed");
  assert.equal(restored.state.version, app.store.state.version);
  assert.throws(() => restored.join({ ...ALICE, badgeId: "demo-visitor-03", activationCode: "ECHO-DEMO-03" }), isError(409));
});

test("validation, explicit consent, session expiry and disabled free join reject invalid operations", () => {
  let now = 1000000;
  const store = new EventStore({ now: () => now });
  assert.throws(() => store.join({ ...ALICE, consent: false }), isError(400, "CONSENT_REQUIRED"));
  assert.throws(() => store.join({ ...ALICE, name: "<img onerror=x>" }), isError(400));
  assert.throws(() => store.join({ ...ALICE, need: "x".repeat(161) }), isError(400));
  assert.throws(() => store.join({ ...ALICE, avatarColor: "url(evil)" }), isError(400));
  const person = store.join(ALICE);
  now += 8 * 24 * 60 * 60 * 1000;
  assert.throws(() => store.me(person.token), isError(401, "SESSION_EXPIRED"));
  store.state.event.demoMode = false;
  assert.throws(() => store.join(BOB), isError(403, "BADGE_REQUIRED"));
});

test("HTTP enforces origin, JSON/body limits, rate limiting and static data isolation", async t => {
  const { request, base, dir } = await fixture(t, {
    rateLimit: { read: 20, write: 10, join: 3, windowMs: 60000 },
  });
  const originRejected = await request("/api/join", { body: ALICE, headers: { Origin: "https://untrusted.invalid" } });
  assert.equal(originRejected.status, 403);
  const consentRejected = await request("/api/join", { body: { ...ALICE, consent: false } });
  assert.equal(consentRejected.status, 400);
  const tooLarge = await request("/api/join", { body: { ...ALICE, extra: "x".repeat(9000) } });
  assert.equal(tooLarge.status, 413);
  const joined = await request("/api/join", { body: ALICE });
  assert.equal(joined.status, 201);
  const limited = await request("/api/join", { body: BOB });
  assert.equal(limited.status, 429);
  const notJson = await request("/api/encounters", { token: joined.data.token, method: "POST", headers: { "Content-Type": "text/plain" } });
  assert.equal(notJson.status, 415);
  assert.equal((await request("/api/me")).status, 401);
  const forbiddenSocket = new WebSocket(base.replace("http:", "ws:") + "/api/live", { origin: "https://untrusted.invalid" });
  forbiddenSocket.on("error", () => {});
  const rejected = await new Promise(resolve => forbiddenSocket.once("unexpected-response", (_req, res) => { resolve(res.statusCode); res.resume(); forbiddenSocket.terminate(); }));
  assert.equal(rejected, 403);
  mkdirSync(join(dir, "dist"));
  writeFileSync(join(dir, "dist", "index.html"), "<!doctype html><title>Echo Campus</title>");
  writeFileSync(join(dir, "dist", "film.mp4"), Buffer.from("0123456789"));
  assert.equal((await fetch(base + "/")).status, 200);
  assert.equal((await fetch(base + "/server/data/event.json")).status, 404);
  assert.equal((await fetch(base + "/.env")).status, 404);
  const range = await fetch(base + "/film.mp4", { headers: { Range: "bytes=2-5" } });
  assert.equal(range.status, 206);
  assert.equal(await range.text(), "2345");
  assert.equal(range.headers.get("Content-Range"), "bytes 2-5/10");
});
