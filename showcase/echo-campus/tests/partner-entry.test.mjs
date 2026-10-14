// The map opened from the partner app: the ticket signs the guest in (or asks
// for a look first), a check-in makes them fresh on the big screen again, and
// the screen greets them with their own picture.
import test from "node:test";
import assert from "node:assert/strict";
import { EventClient } from "../src/runtime/EventClient.js";
import { visibleSocialAttendees } from "../src/scenes/SocialEnsemble.js";
import { arrivalView, avatar, stageView, stageWelcomeView } from "../src/ui/CourtViews.js";
import { personaById } from "../src/shared/personas.mjs";

function storageWith() {
  const values = new Map();
  return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
}
const timers = () => ({ setTimeout: () => 0, clearTimeout: () => {} });
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

test("a pending ticket keeps no session; a signed-in one is stored and refreshes the guest", async () => {
  const storage = storageWith();
  const calls = [];
  let answer = { pending: true, profile: { name: "小李", avatarUrl: "" } };
  const client = new EventClient({ storage, WebSocketImpl: null, timers: timers(), fetchImpl: async (url, options) => {
    calls.push([url.pathname, options.method || "GET", options.body || ""]);
    if (url.pathname.endsWith("/partner/claim")) return response(200, answer);
    if (url.pathname.endsWith("/persona")) return response(200, { attendee: { id: "g1", persona: "zhusha" }, version: 5 });
    return response(200, { attendee: { id: "g1", persona: "zhusha" }, encounters: [], version: 5, profile: { personaPending: false } });
  } });
  const pending = await client.claimTicket("t".repeat(32));
  assert.equal(pending.pending, true);
  assert.equal(client.token, "");
  assert.equal(storage.getItem("echo-campus-token"), null);
  assert.deepEqual(JSON.parse(calls[0][2]), { ticket: "t".repeat(32) });

  answer = { token: "s".repeat(43), attendee: { id: "g1", persona: "baizao" }, personaPending: true, resumed: true };
  const signed = await client.claimTicket("t".repeat(32));
  assert.equal(signed.personaPending, true);
  assert.equal(client.token, "s".repeat(43));
  assert.equal(storage.getItem("echo-campus-token"), "s".repeat(43));
  assert.equal(client.me.attendee.persona, "zhusha", "the guest view is refreshed after signing in");

  await client.choosePersona("zhusha");
  assert.deepEqual(calls.at(-2).slice(0, 2), ["/api/persona", "POST"]);
  assert.deepEqual(JSON.parse(calls.at(-2)[2]), { persona: "zhusha" });
  client.dispose();
});

test("a guest who registered days ago comes first again when checking in at the venue", () => {
  const now = Date.parse("2026-10-24T10:00:00+08:00");
  const people = Array.from({ length: 12 }, (_, i) => ({ id: "g" + i, persona: "qingliu", joinedAt: "2026-10-20T10:00:00+08:00" }));
  people[7].onsiteAt = "2026-10-24T09:59:00+08:00";
  for (const later of [0, 60000, 110000]) {
    const shown = visibleSocialAttendees(people, { maxRendered: 3, now: now + later });
    assert.equal(shown.length, 3);
    assert.ok(shown.some(p => p.id === "g7"), "the fresh check-in is in every batch of its first minutes");
  }
  const turns = Array.from({ length: 24 }, (_, i) => visibleSocialAttendees(people.map(p => ({ ...p, onsiteAt: undefined })), { maxRendered: 3, now: now + i * 600000 }));
  assert.ok(turns.some(batch => !batch.some(p => p.id === "g7")), "without the check-in g7 only takes turns");
});

test("the partner picture shows only where asked, only over https, with the persona as fallback", () => {
  const person = { name: "小李", persona: "baizao", avatarUrl: "https://cdn.daimao.example/a.png" };
  assert.ok(!avatar(person).includes("cdn.daimao.example"), "lists keep the persona look by default");
  const photo = avatar(person, { photo: true });
  assert.ok(photo.includes('src="https://cdn.daimao.example/a.png"'));
  assert.ok(photo.includes("data-fallback=") && photo.includes("baizao-bust.webp"));
  assert.ok(photo.includes('referrerpolicy="no-referrer"'));
  assert.ok(!avatar({ ...person, avatarUrl: "javascript:alert(1)" }, { photo: true }).includes("javascript:"));
  assert.ok(!avatar({ ...person, avatarUrl: "http://x.example/a.png" }, { photo: true }).includes("x.example"));
});

test("the arrival greets the partner account, and a guest already placed sees their own number", () => {
  const persona = personaById("baizao");
  const fresh = arrivalView({ event: { name: "相遇之庭" }, persona, nextSerial: 21, greeting: "小李" });
  assert.ok(fresh.includes("小李，欢迎你"));
  assert.ok(fresh.includes("即将成为第 021 位来客"));
  assert.ok(fresh.includes("小程序里的昵称和头像"));
  const placed = arrivalView({ event: {}, persona, nextSerial: 40, greeting: "小李", serial: 17 });
  assert.ok(placed.includes("第 017 位来客") && !placed.includes("即将成为"));
  const plain = arrivalView({ event: {}, persona, nextSerial: 3 });
  assert.ok(plain.includes("不采集照片"));
});

test("the big screen welcomes a newcomer by name and can show the partner's code", () => {
  const welcome = stageWelcomeView({ name: "小<李>", persona: "zhusha", serial: 21, onsiteAt: "2026-10-24T10:00:00+08:00", avatarUrl: "https://cdn.daimao.example/a.png" });
  assert.ok(welcome.includes("欢迎，小&lt;李&gt;"));
  assert.ok(welcome.includes("刚刚到场 · 第 021 位来客"));
  assert.ok(welcome.includes("今天是「朱砂」"));
  assert.ok(welcome.includes("zhusha-full.webp"));
  assert.ok(!welcome.includes("is-long"), "a short nickname keeps the large size");
  assert.ok(stageWelcomeView({ name: "联调测试·小王的分身", persona: "zhusha", serial: 1 }).includes("court-welcome-card is-long"));
  assert.ok(stageWelcomeView({ name: "一二三四五六七八九十一二三", persona: "zhusha", serial: 1 }).includes("is-longer"));
  const screen = stageView({ event: { entry: { label: "碰一下挂件", hint: "或微信扫码", qrImage: "assets/event/daimao-code.png" } }, attendees: [], connections: [], arrivals: [], meets: [] });
  assert.ok(screen.includes('class="court-stage-code" src="http://localhost/assets/event/daimao-code.png"'));
  assert.ok(!screen.includes("data-stage-qr"));
  assert.ok(stageView({ event: {}, attendees: [], connections: [], arrivals: [], meets: [] }).includes("data-stage-qr"));
});
