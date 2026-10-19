// A guest's first minute on a phone: no ghosting blur over the nearest guests, recommended people first, and a card
// that leads with why to meet and a greeting one tap away.
import test from "node:test";
import assert from "node:assert/strict";
import { COURT_SHOTS, COURT_SHOTS_PORTRAIT } from "../src/runtime/CourtLook.js";
import { chooseLabels } from "../src/runtime/WorldLabels.js";
import { INTENTS, dockView, intentView, personView, shortReason } from "../src/ui/CourtViews.js";
import { topicsIn } from "../src/shared/topics.mjs";

test("on a portrait phone walking is sharp and a close-up only softens the edges, without the haze", () => {
  assert.equal(COURT_SHOTS_PORTRAIT.walk.tilt, 0);
  assert.ok(COURT_SHOTS_PORTRAIT.close.tilt <= COURT_SHOTS.close.tilt / 2);
  assert.ok(COURT_SHOTS_PORTRAIT.close.lift < COURT_SHOTS.close.lift / 2);
  for (const shot of Object.values(COURT_SHOTS_PORTRAIT)) assert.ok(shot.band >= 0.24, "a wider sharp band");
});

test("people recommended to the guest get their name tags before nearer strangers", () => {
  const at = (id, distance, x) => ({ id, distance, onScreen: true, x, y: 300, width: 80 });
  const placed = chooseLabels([at("near", 3, 100), at("far-pick", 20, 300), at("mid", 8, 200)], { budget: 2, width: 390, priority: new Set(["far-pick"]) });
  assert.deepEqual(placed.map(e => e.id), ["far-pick", "near"]);
});

test("the card leads with why to meet and a greeting that is one tap away", () => {
  const html = personView({
    person: { id: "p1", name: "顾言", role: "天使投资人", organization: "梧桐资本", serial: 12, offer: "融资", need: "AI 硬件" },
    me: { id: "me", need: "融资" }, categoryLabel: "投资人", reasons: ["TA 是投资人"],
  });
  assert.ok(html.includes("TA 是投资人") && html.indexOf("TA 是投资人") < html.indexOf("打招呼"), "the reason comes first");
  assert.ok(html.indexOf("打招呼") < html.indexOf("<dt>提供</dt>"), "the greeting is above the details");
  assert.ok(!html.includes("还没写"), "empty fields are left out, not announced");
  assert.match(html, /name="preset" value="你好，想认识你" checked/);
  assert.ok(!html.includes('data-action="compose"'), "no extra step before writing");
});

test("the dock puts recommended people first with their reason, and every intent maps to a known topic", () => {
  const html = dockView({ picks: [{ attendee: { id: "a", name: "顾言", role: "天使投资人" }, reasons: ["TA 是投资人"] }], others: [{ id: "b", name: "林序", role: "AI 产品创始人" }] });
  assert.ok(html.indexOf("顾言") < html.indexOf("林序"));
  assert.match(html, /is-pick[\s\S]*<small>投资人<\/small>/, "the reason as a short tag");
  assert.equal(shortReason("TA 能提供你在找的：融资、市场渠道"), "能帮你 · 融资");
  assert.equal(shortReason("TA 是平台伙伴，手上有资源"), "平台伙伴");
  assert.match(html, /data-action="matches"/);
  for (const [, topic] of INTENTS) assert.ok(topicsIn(topic).has(topic), topic);
  assert.equal((intentView().match(/name="intent"/g) || []).length, INTENTS.length);
});
