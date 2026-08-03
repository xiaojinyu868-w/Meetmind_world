import assert from "node:assert/strict";
import test from "node:test";

import {
  markMorningSeen,
  morningStorageKey,
  normalizeWorldBroadcast,
  shouldShowMorning,
} from "./WorldBroadcast.js";


const raw = {
  schema: "echo-broadcast.v1",
  ticker: [{ id: "evt_1", type: "agent-talk", text: "小满和阿宁聊了起来", occurred_at: "2026-08-04T01:00:00Z", tick: 8 }],
  morning: {
    date: "2026-08-04",
    period: "2026-08-03",
    title: "早上好，来看看昨日世界",
    summary: "昨日新增 1 次相遇，世界发生 2 件值得留意的事。",
    items: ["新相遇已进入世界：阿宁"],
    new_encounters: 1,
    world_events: 2,
  },
};


test("normalizes server-authored ticker and morning report", () => {
  const result = normalizeWorldBroadcast(raw);
  assert.equal(result.ticker[0].text, "小满和阿宁聊了起来");
  assert.equal(result.morning.newEncounters, 1);
  assert.equal(result.morning.worldEvents, 2);
  assert.equal(normalizeWorldBroadcast({ ...raw, schema: "bad" }), null);
});


test("marks a morning report once per world and date", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const report = normalizeWorldBroadcast(raw).morning;
  assert.equal(shouldShowMorning(report, "cafe", storage), true);
  assert.equal(markMorningSeen(report, "cafe", storage), true);
  assert.equal(shouldShowMorning(report, "cafe", storage), false);
  assert.equal(shouldShowMorning(report, "hall", storage), true);
  assert.equal(morningStorageKey("cafe", report.date), "echoworld:morning:cafe:2026-08-04");
});
