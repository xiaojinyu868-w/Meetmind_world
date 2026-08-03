import assert from "node:assert/strict";
import test from "node:test";

import {
  fieldEntryFromPackage,
  normalizeFieldAsset,
  normalizeSceneAppEntry,
} from "./SceneAppEntry.js";


const field = {
  schema: "echo-field.v1",
  status: "ready",
  generated: true,
  regenerable: true,
  generated_from: ["facts/person_1/enc_1/note.md"],
  model: "upstream-field.v1",
  created_at: "2026-08-04T00:00:00+08:00",
  scene: {
    title: "共同记忆的庭院",
    summary: "关系的空间表达。",
    parameters: { sky: "#89afa5", ground: "#b9a878", accent: "#315d83", fog: "#d7dfd2", openness: 0.7, warmth: 0.6 },
    entities: [{ id: "memory", type: "memory", label: "第一次相遇", detail: "借过一支笔。", position: { x: 1, z: -2 } }],
  },
};


test("normalizes a generated field asset without inventing source data", () => {
  const result = normalizeFieldAsset(field);
  assert.equal(result.scene.entities[0].detail, "借过一支笔。");
  assert.deepEqual(result.generatedFrom, ["facts/person_1/enc_1/note.md"]);
  assert.deepEqual(normalizeFieldAsset(result), result);
  assert.equal(normalizeFieldAsset({ ...field, generated: false }), null);
});


test("builds a field app entry from a ready package", () => {
  const entry = fieldEntryFromPackage({ person_id: "person_1", field });
  assert.equal(entry.appId, "relationship-field");
  assert.equal(entry.target.personId, "person_1");
  assert.deepEqual(entry.capabilities, ["walk", "interact"]);
  assert.equal(entry.field.schema, "echo-field.v1");
});


test("rejects malformed scene app manifests", () => {
  assert.equal(normalizeSceneAppEntry({ schema: "bad" }), null);
  assert.equal(fieldEntryFromPackage({ person_id: "person_1" }), null);
});
