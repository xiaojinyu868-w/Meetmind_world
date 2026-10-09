// Event-day scale: changes instead of snapshots, targeted inbox pings, catch-up,
// cacheable assets, the open event mode for plain NFC, per-session limits, partner
// members on the map, coalesced writes, rolling backups and crowd rotation.
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import { WebSocket } from "ws";
import { createEventServer } from "../server/index.mjs";
import { EventStore } from "../server/store.mjs";
import { partnerMember, startPartnerFeed } from "../server/partner-feed.mjs";
import { applyChanges, findPerson } from "../src/shared/changes.mjs";
import { visibleSocialAttendees, ROTATE_MS } from "../src/scenes/SocialEnsemble.js";

const EVENT = { demoMode: false, demoContent: false, openJoin: true, taps: "open" };
const isError = (status, code) => error => error.status === status && (!code || error.code === code);

async function fixture(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "echo-scale-"));
  const app = createEventServer({ dataFile: join(dir, "event.json"), distDir: join(dir, "dist"), log: () => {}, ...options });
  const base = "http://127.0.0.1:" + (await app.listen(0)).port;
  const sockets = [];
  t.after(async () => { for (const ws of sockets) ws.terminate(); await app.close(); rmSync(dir, { recursive: true, force: true }); });
  async function request(path, { body, token, headers = {}, method } = {}) {
    const response = await fetch(base + path, {
      method: method || (body ? "POST" : "GET"),
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json().catch(() => null), headers: response.headers };
  }
  async function connect(token = "") {
    const ws = new WebSocket(base.replace("http:", "ws:") + "/api/live", { origin: "http://localhost:5189" });
    sockets.push(ws);
    const queue = [], waiters = [];
    ws.on("message", raw => { const message = JSON.parse(raw.toString()); const waiter = waiters.shift(); if (waiter) waiter(message); else queue.push(message); });
    await once(ws, "open");
    if (token) ws.send(JSON.stringify({ type: "auth", token }));
    const next = (ms = 1500) => queue.length ? Promise.resolve(queue.shift()) : new Promise((resolve, reject) => {
      const waiter = message => { clearTimeout(timer); resolve(message); };
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error("no message")); }, ms);
      waiters.push(waiter);
    });
    return { ws, next, queue };
  }
  return { app, dir, base, request, connect };
}

test("changes within the broadcast window go out as one message whose entries rebuild the snapshot", async t => {
  const { app, request, connect } = await fixture(t, { broadcastMs: 250 });
  const live = await connect();
  const { type, ...first } = await live.next();
  assert.equal(type, "snapshot");
  let view = first;
  await sleep(300);
  for (let i = 0; i < 4; i++) assert.equal((await request("/api/join", { body: { consent: true, name: "来宾" + i } })).status, 201);
  const messages = [];
  for (;;) { try { messages.push(await live.next(600)); } catch { break; } }
  assert.ok(messages.length <= 2, `4 joins in ${messages.length} message(s)`);
  for (const message of messages) {
    assert.equal(message.type, "changes");
    const result = applyChanges(view, message.entries);
    assert.equal(result.gap, false);
    view = result.snapshot;
  }
  assert.deepEqual(view, JSON.parse(app.store.snapshotJson()), "applied changes equal the authoritative snapshot");
});

test("only the two people of an invitation hear about it, and it never reaches the public changes", async t => {
  const { request, connect } = await fixture(t, { eventConfig: EVENT });
  const a = (await request("/api/join", { body: { consent: true, name: "甲" } })).data;
  const b = (await request("/api/join", { body: { consent: true, name: "乙" } })).data;
  const c = (await request("/api/join", { body: { consent: true, name: "丙" } })).data;
  const [la, lb, lc] = [await connect(a.token), await connect(b.token), await connect(c.token)];
  for (const live of [la, lb, lc]) assert.equal((await live.next()).type, "snapshot");
  await sleep(50);
  const invite = await request("/api/encounters", { token: a.token, body: { peerId: b.attendee.id, note: "你好" } });
  assert.equal(invite.status, 201);
  for (const live of [la, lb]) {
    const changes = await live.next();
    assert.equal(changes.type, "changes");
    assert.deepEqual(changes.entries.at(-1).ops, [], "a pending invitation has no public operation");
    assert.equal(JSON.stringify(changes).includes("你好"), false);
    assert.equal((await live.next()).type, "me");
  }
  assert.equal((await lc.next()).type, "changes");
  await assert.rejects(lc.next(300), /no message/, "a bystander gets no inbox ping");
  const confirmed = await request(`/api/encounters/${invite.data.encounter.id}/confirm`, { token: b.token, method: "POST", body: {} });
  assert.equal(confirmed.status, 200);
  const changes = await lc.next();
  assert.equal(changes.entries.at(-1).ops[0].type, "connection", "a confirmed connection is public");
});

test("a poller catches up on the versions it missed, and starts over when they are gone", async t => {
  const { app, request } = await fixture(t);
  const before = (await request("/api/event")).data.version;
  await request("/api/join", { body: { consent: true } });
  await request("/api/join", { body: { consent: true } });
  const caught = (await request("/api/changes?since=" + before)).data;
  assert.equal(caught.version, before + 2);
  assert.deepEqual(caught.entries.map(entry => entry.v), [before + 1, before + 2]);
  assert.deepEqual((await request("/api/changes?since=" + (before + 2))).data.entries, []);
  assert.equal((await request("/api/changes?since=99999")).data.reset, true);
  assert.equal((await request("/api/changes?since=oops")).data.reset, true);
  const restarted = new EventStore({ file: app.store.file });
  assert.equal(restarted.changesSince(before).reset, true, "history does not survive a restart; the phone reloads");
});

test("static files carry validators: a reopened page costs 304s, hashed and versioned assets are cached for good", async t => {
  const { dir, base } = await fixture(t);
  mkdirSync(join(dir, "dist", "assets", "personas"), { recursive: true });
  writeFileSync(join(dir, "dist", "index.html"), "<!doctype html><title>Echo</title>");
  writeFileSync(join(dir, "dist", "assets", "index-9WJLFhY_.js"), "console.log(1)");
  writeFileSync(join(dir, "dist", "assets", "personas", "xiaoman.glb"), "glTF");
  writeFileSync(join(dir, "dist", "assets", "plain.webp"), "webp");
  const page = await fetch(base + "/");
  assert.equal(page.headers.get("cache-control"), "no-cache");
  const etag = page.headers.get("etag");
  assert.ok(etag);
  assert.equal((await fetch(base + "/", { headers: { "If-None-Match": etag } })).status, 304);
  assert.equal((await fetch(base + "/assets/index-9WJLFhY_.js")).headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal((await fetch(base + "/assets/personas/xiaoman.glb?v=20261002")).headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal((await fetch(base + "/assets/plain.webp")).headers.get("cache-control"), "public, max-age=3600");
  const modified = (await fetch(base + "/assets/plain.webp")).headers.get("last-modified");
  assert.equal((await fetch(base + "/assets/plain.webp", { headers: { "If-Modified-Since": modified } })).status, 304);
  const ranged = await fetch(base + "/assets/plain.webp", { headers: { "If-None-Match": "*", Range: "bytes=0-1" } });
  assert.equal(ranged.status, 206, "a range request is answered, not short-circuited");
});

test("the open event mode: no demo people, entry without cards, plain NFC accepted unsigned, stamps only by touch", () => {
  const secret = "s3cret-for-alipay";
  const store = new EventStore({ eventConfig: { ...EVENT, checkpoints: [
    { id: "welcome", label: "入场", partner: "主办方", description: "到了", points: 10, manual: true },
    { id: "booth", label: "展位", partner: "伙伴", description: "看看", points: 20 },
  ] } });
  assert.equal(store.snapshot().attendees.length, 0);
  assert.equal(store.snapshot().connections.length, 0);
  assert.equal(store.state.badges.length, 0);
  const guest = store.join({ consent: true });
  assert.equal(guest.attendee.serial, 16);
  assert.throws(() => store.checkin(guest.token, "booth"), isError(403, "CHECKIN_NEEDS_TAP"));
  assert.equal(store.checkin(guest.token, "welcome").checkin.points, 10, "a manual checkpoint still has its button");
  const unsigned = store.tap(guest.token, { tag: "CP-booth" }, { secret });
  assert.equal(unsigned.verified, false);
  assert.equal(unsigned.checkin.checkin.points, 20);
  const ts = Math.floor(Date.now() / 1000), nonce = "nonce-0001";
  const signed = store.tap("", { tag: "GATE-south", ts, nonce, sig: createHmac("sha256", secret).update(`GATE-south.${ts}.${nonce}`).digest("hex") }, { secret });
  assert.equal(signed.verified, true);
  assert.throws(() => store.tap("", { tag: "GATE-south", ts, nonce: "nonce-0002", sig: "0".repeat(64) }, { secret }), isError(401), "a signature, once given, is checked");
  assert.throws(() => store.tap("", { tag: "CP-unknown" }), isError(404, "TAG_NOT_FOUND"));
  const friend = new EventStore({ eventConfig: { ...EVENT, checkpoints: [{ id: "connection", label: "相遇确认", partner: "主办方", description: "互相确认", points: 25 }] } });
  const x = friend.join({ consent: true }), y = friend.join({ consent: true });
  assert.throws(() => friend.checkin(x.token, "connection"), isError(403, "CHECKIN_NEEDS_TAP"));
  const asked = friend.requestEncounter(x.token, { peerId: y.attendee.id });
  friend.confirmEncounter(y.token, asked.encounter.id);
  friend.confirmEncounter(y.token, asked.encounter.id);
  assert.deepEqual([friend.me(x.token).activity.points, friend.me(y.token).activity.points], [25, 25], "confirming stamps both, once");
  const strict = new EventStore({ eventConfig: { demoMode: false, demoContent: false } });
  assert.throws(() => strict.join({ consent: true }), isError(403, "BADGE_REQUIRED"), "without openJoin a real event still needs cards");
  assert.throws(() => strict.tap("", { tag: "GATE-south" }), isError(403, "TAP_SIGNATURE_REQUIRED"));
});

test("a signed-in phone has its own allowance; anonymous phones behind one address share a larger one", async t => {
  const { request } = await fixture(t, { rateLimit: { read: 3, write: 10, join: 10, ipFactor: 2, windowMs: 60000 } });
  const a = (await request("/api/join", { body: { consent: true } })).data;
  const b = (await request("/api/join", { body: { consent: true } })).data;
  for (let i = 0; i < 3; i++) assert.equal((await request("/api/me", { token: a.token })).status, 200);
  assert.equal((await request("/api/me", { token: a.token })).status, 429);
  assert.equal((await request("/api/me", { token: b.token })).status, 200, "the next phone on the same Wi-Fi is not blocked");
  const anonymous = [];
  for (let i = 0; i < 7; i++) anonymous.push((await request("/api/event")).status);
  assert.deepEqual(anonymous, [200, 200, 200, 200, 200, 200, 429], "anonymous reads: read × ipFactor per address");
});

test("partner members: cleaned, paged, kept on failure, shown on the map but never invited", async t => {
  const store = new EventStore({ eventConfig: EVENT });
  const context = { source: "daimao", label: "呆猫小镇", categories: new Set(store.categories().map(item => item.id)), personas: store.state.event.personas, colorOf: id => store.category(id).wristbandColor };
  assert.equal(partnerMember({ id: "a1", nickname: "小李" }, context), null, "no consent, not shown");
  assert.equal(partnerMember({ id: "../x", nickname: "小李", consent: true }, context), null);
  assert.equal(partnerMember({ id: "a1", nickname: "  ", consent: true }, context), null);
  const member = partnerMember({ id: "a1", nickname: "小李<script>", bio: "长".repeat(400), category: "astronaut", avatar: "#C96F4A", consent: true, active: true, phone: "13800000000" }, context);
  assert.equal(member.id, "daimao-a1");
  assert.equal(member.name, "小李script");
  assert.equal([...member.bio].length, 160);
  assert.equal(member.category, "guest");
  assert.equal(member.avatarColor, "#c96f4a");
  assert.equal(member.remote, true);
  assert.equal(JSON.stringify(member).includes("13800000000"), false, "fields outside the contract never pass");
  assert.equal(partnerMember({ id: "a1", nickname: "小李", consent: true }, context).persona, member.persona, "the persona follows the id");

  let calls = 0, fail = false;
  const pages = { "": { members: [{ id: "a1", nickname: "小李", consent: true, active: true }, { id: "a2", nickname: "小王", consent: true }], nextCursor: "p2" }, p2: { members: [{ id: "a3", nickname: "小张", consent: true }, { id: "a1", nickname: "重复", consent: true }], nextCursor: null } };
  const fetchImpl = async url => {
    calls++;
    if (fail) throw new Error("network down");
    assert.equal(new URL(url).searchParams.get("cursor") ?? "", Object.keys(pages)[calls % 2 === 1 ? 0 : 1]);
    return { ok: true, json: async () => pages[new URL(url).searchParams.get("cursor") ?? ""] };
  };
  const feed = startPartnerFeed({ store, url: "https://daimao.example/api/members", token: "t", label: "呆猫小镇", source: "daimao", intervalMs: 60000, fetchImpl });
  t.after(() => feed.stop());
  await feed.refresh();
  assert.deepEqual(store.snapshot().remote.members.map(item => item.id), ["daimao-a1", "daimao-a2", "daimao-a3"]);
  assert.equal(feed.status.ok, true);
  const version = store.state.version;
  calls = 0;
  await feed.refresh();
  assert.equal(store.state.version, version, "an unchanged list makes no new version");
  fail = true;
  await feed.refresh();
  assert.equal(feed.status.ok, false);
  assert.equal(store.snapshot().remote.members.length, 3, "a failed read keeps the last list");
  const guest = store.join({ consent: true });
  assert.throws(() => store.requestEncounter(guest.token, { peerId: "daimao-a1" }), isError(404, "ATTENDEE_NOT_FOUND"));
  assert.equal(findPerson(store.snapshot(), "daimao-a2").name, "小王");
  assert.equal(store.snapshot().attendees.some(item => item.remote), false, "partner members are not counted as present");
});

test("coalesced writes reach the disk on close, and rolling backups keep only the newest copies", async t => {
  const dir = mkdtempSync(join(tmpdir(), "echo-persist-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "event.json"), backups = join(dir, "backups");
  const app = createEventServer({ dataFile: file, distDir: join(dir, "dist"), persistDelayMs: 10000, backup: { dir: backups, intervalMs: 40, keep: 2 }, log: () => {} });
  const claim = app.store.join({ consent: true, name: "落盘" });
  assert.equal(readFileSync(file, "utf8").includes(claim.attendee.id), false, "the write is still pending");
  await sleep(200);
  assert.ok(readFileSync(file, "utf8").includes(claim.attendee.id), "a backup flushes first");
  const copies = readdirSync(backups);
  assert.ok(copies.length >= 1 && copies.length <= 2, `${copies.length} copies kept`);
  app.store.join({ consent: true, name: "关机前" });
  await app.close();
  assert.ok(readFileSync(file, "utf8").includes("关机前"), "close writes the last change");
  assert.ok(existsSync(join(backups, copies.at(-1))) || readdirSync(backups).length <= 2);
});

test("a crowd beyond the budget takes turns: newcomers first, the same batch on every screen, partner members after guests", () => {
  const now = 50 * ROTATE_MS + 1000;
  const guests = Array.from({ length: 80 }, (_, i) => ({ id: `guest-${i}`, source: "demo-join", serial: 16 + i, joinedAt: new Date(now - (i === 79 ? 60000 : 3600000)).toISOString() }));
  const remote = Array.from({ length: 40 }, (_, i) => ({ id: `daimao-${i}`, source: "daimao", remote: true, active: i < 5 }));
  const everyone = [...guests, ...remote];
  const screen = visibleSocialAttendees(everyone, { maxRendered: 50, now });
  const phone = visibleSocialAttendees(everyone, { maxRendered: 30, now });
  assert.equal(screen.length, 50);
  assert.ok(screen.some(p => p.id === "guest-79"), "the newcomer is shown");
  assert.ok(screen.every(p => !p.remote), "80 guests fill 50 places before any partner member");
  assert.ok(phone.every(p => screen.includes(p)), "a phone shows part of the big screen's batch");
  assert.deepEqual(visibleSocialAttendees(everyone, { maxRendered: 50, now: now + 60000 }), screen, "the batch holds within its turn");
  const later = visibleSocialAttendees(everyone, { maxRendered: 50, now: now + ROTATE_MS });
  assert.notDeepEqual(later.map(p => p.id), screen.map(p => p.id), "the next turn brings others");
  const few = visibleSocialAttendees([...guests.slice(0, 10), ...remote], { maxRendered: 30, now });
  assert.equal(few.filter(p => !p.remote).length, 10);
  assert.deepEqual(few.filter(p => p.remote).slice(0, 5).map(p => p.active), [true, true, true, true, true], "active partner members first");
});
