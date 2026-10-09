import test from "node:test";
import assert from "node:assert/strict";
import { planTags, toCsv, NTAG213_URL_LIMIT } from "../scripts/nfc-tags.mjs";
import { EventStore } from "../server/store.mjs";

test("the encoding list: spares rounded up, every link resolves to what was printed, and fits an NTAG213", () => {
  const { rows, longest } = planTags({ wristbands: { investor: 10, founder: 3 }, checkpoints: ["future"], gates: ["south"], spare: 0.15 });
  assert.equal(rows.filter(row => row.kind === "手环").length, 12 + 4);
  assert.equal(rows.filter(row => row.spare && row.kind === "手环").length, 3);
  assert.equal(new Set(rows.filter(row => row.kind === "手环").map(row => row.number)).size, 16, "wristband numbers are unique");
  assert.ok(longest <= NTAG213_URL_LIMIT);
  const store = new EventStore({ eventConfig: { demoMode: false, demoContent: false, openJoin: true, taps: "open" } });
  for (const row of rows) {
    const url = new URL(row.url);
    assert.equal(url.origin + url.pathname, "https://capture.meetmind.online/echo-campus/");
    const tag = store.tap("", { tag: url.searchParams.get("tag") }).tag;
    assert.equal(tag.kind, { 手环: "wristband", 打卡点立牌: "checkpoint", 入口立牌: "entry" }[row.kind]);
    assert.equal(url.searchParams.get("entry") === "nfc", row.kind !== "打卡点立牌");
  }
  assert.ok(toCsv(rows).startsWith("\ufeff编号,物料"), "opens in Excel with Chinese headers");
});

test("misspelt categories, unknown stands and links too long for the chip stop the list", () => {
  assert.throws(() => planTags({ wristbands: { investr: 10 } }), /没有类别 investr/);
  assert.throws(() => planTags({ checkpoints: ["boooth"] }), /没有打卡点 boooth/);
  assert.throws(() => planTags({ wristbands: { investor: 0 } }), /正整数/);
  assert.throws(() => planTags({ gates: ["South Gate"] }), /入口名/);
  assert.throws(() => planTags({ wristbands: { investor: 1 }, base: "http://capture.meetmind.online/echo-campus/" }), /https/);
  assert.throws(() => planTags({ wristbands: { investor: 1 }, base: "https://" + "x".repeat(100) + ".example/echo-campus/" }), /NTAG213 放不下/);
});
