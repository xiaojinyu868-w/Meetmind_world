// A partner app (the 呆猫 mini program) signs its users in: its server asks for
// a ticket, the map page it opens claims it, and the same user is the same
// attendee on every device. Check-ins, met-in-the-app connections and the export.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createEventServer } from "../server/index.mjs";
import { validateEventConfig } from "../server/event-config.mjs";
import { EventStore } from "../server/store.mjs";

const PARTNER_TOKEN = "dm-test-token-0123456789abcdefghijklmnop";
const EVENT = { demoMode: false, demoContent: false, openJoin: true, taps: "open" };

async function fixture(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "echo-partner-"));
  let clock = Date.parse("2026-10-24T09:00:00+08:00");
  const app = createEventServer({
    dataFile: join(dir, "event.json"), distDir: join(dir, "dist"), log: () => {}, now: () => clock,
    eventConfig: EVENT, partnerApi: { token: PARTNER_TOKEN, source: "daimao", label: "呆猫" },
    publicUrl: "https://capture.meetmind.online/echo-campus/", ...options,
  });
  const base = "http://127.0.0.1:" + (await app.listen(0)).port;
  const sockets = [];
  t.after(async () => { for (const ws of sockets) ws.terminate(); await app.close(); rmSync(dir, { recursive: true, force: true }); });
  async function request(path, { body, token, method } = {}) {
    const response = await fetch(base + path, {
      method: method || (body ? "POST" : "GET"),
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json().catch(() => null) };
  }
  const partner = (path, body) => request("/api/partner/" + path, { body, token: PARTNER_TOKEN, method: body ? "POST" : "GET" });
  async function watch() {
    const ws = new WebSocket(base.replace("http:", "ws:") + "/api/live", { origin: "http://localhost:5189" });
    sockets.push(ws);
    const messages = [];
    ws.on("message", raw => messages.push(JSON.parse(raw.toString())));
    await once(ws, "open");
    return messages;
  }
  return { app, request, partner, watch, advance: ms => { clock += ms; } };
}

const user = (uid, extra = {}) => ({ uid, nickname: "小李", avatarUrl: "https://cdn.daimao.example/a/" + uid + ".png", role: "创业者", consent: true, ...extra });
const waitFor = async (check, ms = 1500) => { const until = Date.now() + ms; while (!check()) { if (Date.now() > until) throw new Error("timed out"); await new Promise(r => setTimeout(r, 20)); } };

test("partner endpoints need the partner token, and do not exist without one", async t => {
  const { request, partner } = await fixture(t);
  assert.equal((await request("/api/partner/tickets", { body: user("u1") })).status, 401);
  assert.equal((await request("/api/partner/tickets", { body: user("u1"), token: "x".repeat(48) })).data.error.code, "PARTNER_AUTH_REQUIRED");
  const ping = await partner("ping");
  assert.equal(ping.status, 200);
  assert.equal(ping.data.mapUrl, "https://capture.meetmind.online/echo-campus/");
  const off = await fixture(t, { partnerApi: null });
  assert.equal((await off.request("/api/partner/tickets", { body: user("u1"), token: PARTNER_TOKEN })).status, 404);
  assert.throws(() => createEventServer({ partnerApi: { token: "short", source: "daimao" }, dataFile: null }), /32/);
});

test("a ticket opens the map; the first visit picks a look, later visits on any device are the same guest", async t => {
  const { request, partner, app } = await fixture(t);
  const issued = await partner("tickets", user("dm_7f3a9c"));
  assert.equal(issued.status, 200);
  assert.equal(issued.data.status, "new");
  assert.equal(issued.data.attendee, null);
  assert.equal(issued.data.expiresIn, 1800);
  const link = new URL(issued.data.url);
  assert.equal(link.origin + link.pathname, "https://capture.meetmind.online/echo-campus/");
  assert.equal(link.searchParams.get("from"), "daimao");
  assert.equal(link.searchParams.get("ticket"), issued.data.ticket);

  const pending = await request("/api/partner/claim", { body: { ticket: issued.data.ticket } });
  assert.equal(pending.status, 200);
  assert.deepEqual(pending.data, { pending: true, profile: { name: "小李", avatarUrl: "https://cdn.daimao.example/a/dm_7f3a9c.png" } });
  assert.equal(app.store.state.attendees.length, 0, "nothing on the map until the guest enters");

  const joined = await request("/api/join", { body: { ticket: issued.data.ticket, consent: true, persona: "baizao" } });
  assert.equal(joined.status, 201);
  assert.equal(joined.data.attendee.name, "小李");
  assert.equal(joined.data.attendee.persona, "baizao");
  assert.equal(joined.data.attendee.avatarUrl, "https://cdn.daimao.example/a/dm_7f3a9c.png");
  assert.equal(joined.data.attendee.role, "创业者");
  const me = await request("/api/me", { token: joined.data.token });
  assert.equal(me.data.profile.boundTo, "daimao");
  assert.equal(me.data.profile.personaPending, false);

  const snapshot = (await request("/api/event")).data;
  assert.equal(snapshot.attendees.length, 1);
  assert.ok(!JSON.stringify(snapshot).includes("dm_7f3a9c\""), "the partner user id never reaches the public snapshot");
  assert.ok(!("partner" in snapshot.attendees[0]));

  // Another phone, a new ticket: the same attendee, a new session.
  const again = await partner("tickets", user("dm_7f3a9c"));
  assert.equal(again.data.status, "returning");
  assert.equal(again.data.attendee.serial, joined.data.attendee.serial);
  const claimed = await request("/api/partner/claim", { body: { ticket: again.data.ticket } });
  assert.equal(claimed.data.attendee.id, joined.data.attendee.id);
  assert.equal(claimed.data.personaPending, false);
  assert.notEqual(claimed.data.token, joined.data.token);
  assert.equal((await request("/api/me", { token: claimed.data.token })).data.attendee.id, joined.data.attendee.id);
  // Reopening the same link inside the window, already signed in: the same session.
  const reopened = await request("/api/partner/claim", { body: { ticket: again.data.ticket }, token: claimed.data.token });
  assert.equal(reopened.data.token, claimed.data.token);
  assert.equal(app.store.state.attendees.length, 1);
});

test("a check-in puts the guest on the big screen at once, with a look to confirm later", async t => {
  const { request, partner, watch, advance } = await fixture(t);
  const screen = await watch();
  await waitFor(() => screen.length >= 1);
  const issued = await partner("tickets", user("u-checkin", { checkin: true }));
  assert.equal(issued.data.status, "checked-in");
  assert.equal(issued.data.attendee.personaPending, true);
  assert.equal(issued.data.attendee.onsite, true);
  await waitFor(() => screen.some(m => m.type === "changes"));
  const op = screen.find(m => m.type === "changes").entries[0].ops[0];
  assert.equal(op.type, "attendee");
  assert.equal(op.attendee.name, "小李");
  assert.ok(op.attendee.onsiteAt, "the big screen knows the moment of arrival");
  assert.equal(op.attendee.avatarUrl, "https://cdn.daimao.example/a/u-checkin.png");

  const claimed = await request("/api/partner/claim", { body: { ticket: issued.data.ticket } });
  assert.equal(claimed.data.personaPending, true);
  assert.equal(claimed.data.attendee.persona, issued.data.attendee.persona);
  const chosen = await request("/api/persona", { body: { persona: "zhusha" }, token: claimed.data.token });
  assert.equal(chosen.status, 200);
  assert.equal(chosen.data.attendee.persona, "zhusha");
  assert.equal(chosen.data.attendee.name, "小李", "a partner nickname survives a change of look");
  assert.equal((await request("/api/me", { token: claimed.data.token })).data.profile.personaPending, false);
  assert.equal((await request("/api/persona", { body: { persona: "nobody" }, token: claimed.data.token })).status, 400);

  // A second check-in is not a second arrival.
  advance(60000);
  const before = (await request("/api/event")).data.version;
  const second = await partner("tickets", user("u-checkin", { checkin: true }));
  assert.equal(second.data.status, "returning");
  assert.equal((await request("/api/event")).data.version, before);
});

test("pre-registered online, checked in at the venue: the arrival moment is the check-in", async t => {
  const { request, partner, advance } = await fixture(t);
  const first = await partner("tickets", user("u-early"));
  const joined = await request("/api/join", { body: { ticket: first.data.ticket, consent: true, persona: "qingliu" } });
  assert.equal(joined.data.attendee.onsiteAt, undefined);
  advance(3 * 24 * 3600 * 1000);
  const venue = await partner("tickets", user("u-early", { checkin: true }));
  assert.equal(venue.data.status, "checked-in");
  const person = (await request("/api/event")).data.attendees.find(p => p.id === joined.data.attendee.id);
  assert.equal(person.onsiteAt, new Date(Date.parse("2026-10-27T09:00:00+08:00")).toISOString());
  assert.equal(person.persona, "qingliu", "a look already chosen stays");
  assert.equal(venue.data.attendee.personaPending, false);
});

test("nickname and photo follow the partner; what the guest wrote on the map stays", async t => {
  const { request, partner } = await fixture(t);
  const first = await partner("tickets", user("u-sync", { bio: "" }));
  const joined = await request("/api/join", { body: { ticket: first.data.ticket, consent: true } });
  assert.ok(joined.data.attendee.persona, "a look is assigned when none was picked");
  const edited = await request("/api/join", { body: { consent: true, name: "小李", role: "独立开发者", need: "找增长合伙人", bio: "做了三年独立开发" }, token: joined.data.token });
  assert.equal(edited.status, 200);
  await partner("tickets", user("u-sync", { nickname: "李同学", avatarUrl: "https://cdn.daimao.example/new.png", role: "投资人", need: "看项目", bio: "新的介绍" }));
  const person = (await request("/api/event")).data.attendees[0];
  assert.equal(person.name, "李同学");
  assert.equal(person.avatarUrl, "https://cdn.daimao.example/new.png");
  assert.equal(person.role, "独立开发者");
  assert.equal(person.need, "找增长合伙人");
  assert.equal(person.bio, "做了三年独立开发");
});

test("partner input is cleaned, consent and a usable uid are required", async t => {
  const { partner, request } = await fixture(t);
  assert.equal((await partner("tickets", { uid: "u1", nickname: "x" })).data.error.code, "CONSENT_REQUIRED");
  assert.equal((await partner("tickets", { uid: "13800000000 ", consent: true })).status, 200, "a trimmed id is fine");
  assert.equal((await partner("tickets", { uid: "has space", consent: true })).data.error.code, "INVALID_UID");
  assert.equal((await partner("tickets", { uid: "a".repeat(65), consent: true })).data.error.code, "INVALID_UID");
  const odd = await partner("tickets", { uid: 42, nickname: "<b>小\u0007李</b>同学的超长昵称一二三四五六七八九十一二三四五六", avatarUrl: "http://insecure.example/a.png", category: "nope", consent: true, checkin: true });
  assert.equal(odd.status, 200);
  const person = (await request("/api/event")).data.attendees[0];
  assert.equal(person.name, [..."b小李/b同学的超长昵称一二三四五六七八九十一二三四五六"].slice(0, 24).join(""));
  assert.equal(person.avatarUrl, undefined, "only https photos are shown");
  assert.equal(person.category, "guest");
  const bad = await request("/api/partner/claim", { body: { ticket: "nope" } });
  assert.equal(bad.data.error.code, "INVALID_TICKET");
});

test("a ticket expires after 30 minutes", async t => {
  const { request, partner, advance } = await fixture(t);
  const issued = await partner("tickets", user("u-late"));
  advance(30 * 60 * 1000 + 1);
  const late = await request("/api/partner/claim", { body: { ticket: issued.data.ticket } });
  assert.equal(late.status, 410);
  assert.equal(late.data.error.code, "TICKET_EXPIRED");
  assert.equal((await request("/api/join", { body: { ticket: issued.data.ticket, consent: true } })).status, 410);
});

test("a guest who came in by a plain link keeps that avatar when the partner signs them in", async t => {
  const { request, partner } = await fixture(t);
  const plain = await request("/api/join", { body: { consent: true, persona: "shanhu" } });
  const issued = await partner("tickets", user("u-merge"));
  const claimed = await request("/api/partner/claim", { body: { ticket: issued.data.ticket }, token: plain.data.token });
  assert.equal(claimed.data.attendee.id, plain.data.attendee.id);
  assert.equal(claimed.data.attendee.name, "小李");
  assert.equal(claimed.data.attendee.persona, "shanhu");
  assert.equal(claimed.data.token, plain.data.token);
  const later = await partner("tickets", user("u-merge"));
  assert.equal(later.data.status, "returning");
});

test("met in the partner app: a confirmed connection on the map, once", async t => {
  const { request, partner } = await fixture(t);
  await partner("tickets", user("a1", { checkin: true }));
  await partner("tickets", user("b2", { nickname: "小王", checkin: true }));
  assert.equal((await partner("connections", { uidA: "a1", uidB: "zz" })).data.error.code, "MEMBER_NOT_ON_MAP");
  assert.equal((await partner("connections", { uidA: "a1", uidB: "a1" })).data.error.code, "SELF_ENCOUNTER");
  const made = await partner("connections", { uidA: "a1", uidB: "b2" });
  assert.equal(made.status, 201);
  assert.equal(made.data.connection.status, "confirmed");
  assert.equal((await partner("connections", { uidA: "b2", uidB: "a1" })).status, 200);
  const snapshot = (await request("/api/event")).data;
  assert.equal(snapshot.connections.length, 1);
});

test("the export gives the partner its users' looks, arrivals and connections, without contacts", async t => {
  const { request, partner } = await fixture(t);
  const a = await partner("tickets", user("a1", { checkin: true }));
  const claimed = await request("/api/partner/claim", { body: { ticket: a.data.ticket } });
  await request("/api/join", { body: { consent: true, name: "小李", contact: "wx-secret-id", contactVisibility: "connections" }, token: claimed.data.token });
  await partner("tickets", user("b2", { nickname: "小王", checkin: true }));
  await partner("connections", { uidA: "a1", uidB: "b2" });
  await request("/api/join", { body: { consent: true, persona: "qingci" } });
  const exported = await partner("export");
  assert.equal(exported.status, 200);
  assert.equal(exported.data.members.length, 2);
  assert.equal(exported.data.otherAttendees, 1);
  const first = exported.data.members.find(m => m.uid === "a1");
  assert.equal(first.connections.length, 1);
  assert.equal(first.connections[0].uid, "b2");
  assert.equal(first.connections[0].via, "daimao");
  assert.ok(first.onsiteAt);
  assert.ok(first.personaName);
  assert.ok(!JSON.stringify(exported.data).includes("wx-secret-id"), "contacts never leave the map");
  assert.equal((await request("/api/partner/export", { token: claimed.data.token })).status, 401, "a guest session is not the partner");
});

test("the partner's users are kept on our side only: sent, updated, removed", async t => {
  const { app, partner, request } = await fixture(t);
  const sent = await partner("members", { members: [
    user("dm_m1", { realName: "李明", phone: "138 0013 8000", wechat: "liming_dev", tags: ["AI", "AI", "出海"], registeredAt: "2026-10-20T12:00:00+08:00", checkedInAt: 1792900800, extra: { city: "南京" } }),
    user("dm_m2", { nickname: "小王" }),
  ] });
  assert.equal(sent.status, 200);
  assert.deepEqual(sent.data, { received: 2, created: 2, updated: 0, unchanged: 0, deleted: 0 });
  const m1 = app.store.memberIndex.get("daimao:dm_m1");
  assert.equal(m1.phone, "13800138000");
  assert.deepEqual(m1.tags, ["AI", "出海"]);
  assert.equal(m1.registeredAt, "2026-10-20T04:00:00.000Z");
  assert.equal(m1.checkedInAt, new Date(1792900800 * 1000).toISOString(), "a timestamp in seconds is understood");
  assert.deepEqual(m1.extra, { city: "南京" });
  const open = await request("/api/event");
  assert.equal(open.data.attendees.length, 0, "nobody is put on the map");
  assert.ok(!/dm_m1|13800138000|李明|liming_dev/.test(JSON.stringify(open.data)), "nothing of it is public");

  const again = await partner("members", { members: [{ uid: "dm_m1", consent: true, nickname: "李明明", wechat: "" }, user("dm_m2", { nickname: "小王" })] });
  assert.deepEqual(again.data, { received: 2, created: 0, updated: 1, unchanged: 1, deleted: 0 });
  assert.equal(m1.nickname, "李明明");
  assert.equal(m1.phone, "13800138000", "a field left out keeps its value");
  assert.equal(m1.wechat, "", "an empty one clears it");

  assert.equal((await partner("members", { members: [{ uid: "dm_m2", deleted: true }] })).data.deleted, 1);
  assert.deepEqual(app.store.state.partnerMembers.daimao.map(m => m.uid), ["dm_m1"]);
  app.store.flush();
  assert.equal(JSON.parse(readFileSync(app.store.file, "utf8")).partnerMembers.daimao[0].phone, "13800138000");
  assert.equal(new EventStore({ file: app.store.file, eventConfig: EVENT }).memberIndex.get("daimao:dm_m1").realName, "李明", "and it survives a restart");
});

test("everyone who comes in by a ticket is kept on our side too", async t => {
  const { app, partner } = await fixture(t);
  await partner("tickets", user("dm_t1", { organization: "呆猫" }));
  const member = app.store.memberIndex.get("daimao:dm_t1");
  assert.equal(member.nickname, "小李");
  assert.equal(member.organization, "呆猫");
  await partner("members", { members: [{ uid: "dm_t1", consent: true, phone: "13900139000" }] });
  assert.equal(member.phone, "13900139000");
  assert.equal(member.organization, "呆猫", "a push adds to what the ticket brought");
  assert.equal(app.store.state.partnerMembers.daimao.length, 1);
});

test("member pushes need consent and a usable uid; a bad entry rejects the whole batch", async t => {
  const { app, partner, request } = await fixture(t);
  const noConsent = await partner("members", { members: [user("dm_a"), { uid: "dm_b", nickname: "x" }] });
  assert.equal(noConsent.status, 400);
  assert.equal(noConsent.data.error.code, "CONSENT_REQUIRED");
  assert.match(noConsent.data.error.message, /members\[1\]/);
  assert.equal(app.store.memberIndex.size, 0, "nothing of a rejected batch is kept");
  assert.equal((await partner("members", { members: [user("has space")] })).data.error.code, "INVALID_UID");
  assert.equal((await partner("members", { members: [] })).data.error.code, "INVALID_INPUT");
  assert.equal((await partner("members", { members: Array.from({ length: 201 }, (_, i) => user("dm_" + i)) })).data.error.code, "TOO_MANY_MEMBERS");
  assert.equal((await partner("members", { members: [user("dm_x", { extra: { blob: "x".repeat(5000) } })] })).data.error.code, "INVALID_INPUT");
  const full = await partner("members", { members: Array.from({ length: 200 }, (_, i) => user("dm_" + i, { bio: "一".repeat(160), extra: { note: "x".repeat(2000) } })) });
  assert.equal(full.status, 200, "a full batch fits in one request");
  assert.equal(full.data.created, 200);
  await partner("members", { members: [user("dm_odd", { phone: "call me", registeredAt: "soon", avatarUrl: "http://x.example/a.png", tags: "AI", nickname: "<b>小李</b>" })] });
  const odd = app.store.memberIndex.get("daimao:dm_odd");
  assert.deepEqual([odd.phone, odd.registeredAt, odd.avatarUrl, odd.tags, odd.nickname], ["", "", "", [], "b小李/b"]);
  assert.equal((await request("/api/partner/members", { body: { members: [user("dm_y")] } })).status, 401, "only the partner may push");
});

test("a partner's burst of sign-ins has its own allowance, not a phone's", async t => {
  const { partner, request } = await fixture(t, { rateLimit: { read: 50, write: 2, join: 2, partner: 100, windowMs: 60000 } });
  for (let i = 0; i < 20; i++) assert.equal((await partner("tickets", user("burst" + i, { checkin: true }))).status, 200);
  const plain = await request("/api/join", { body: { consent: true } });
  assert.equal(plain.status, 201);
});

test("the event profile may show a partner's code on the big screen", () => {
  assert.equal(validateEventConfig({ entry: { label: "碰一下挂件", hint: "或微信扫码", qrImage: "assets/event/daimao-code.png" } }).entry.qrImage, "assets/event/daimao-code.png");
  assert.equal(validateEventConfig({ entry: { qrImage: "https://cdn.daimao.example/code.png" } }).entry.qrImage, "https://cdn.daimao.example/code.png");
  for (const qrImage of ["http://x.example/a.png", "../secret.png", "a.exe", "javascript:alert(1)"]) assert.throws(() => validateEventConfig({ entry: { qrImage } }), /qrImage/);
});
