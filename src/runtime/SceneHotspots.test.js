import assert from "node:assert/strict";
import test from "node:test";

import {
  nearestSceneHotspot,
  normalizeSceneHotspot,
  normalizeSceneHotspots,
} from "./SceneHotspots.js";


const validModule = {
  id: "roundtable-six",
  type: "roundtable",
  position: { x: 0, z: 0 },
  interaction: {
    label: "中央六人圆桌",
    radius: 2.72,
    primary: { key: "E", action: "context-menu", label: "坐下" },
    secondary: { key: "F", action: "meeting", label: "发起圆桌" },
  },
};


test("normalizes a versioned scene hotspot", () => {
  assert.deepEqual(normalizeSceneHotspot(validModule), {
    id: "roundtable-six",
    type: "roundtable",
    personId: null,
    x: 0,
    z: 0,
    radius: 2.72,
    label: "中央六人圆桌",
    primary: { key: "E", action: "context-menu", label: "坐下" },
    secondary: { key: "F", action: "meeting", label: "发起圆桌" },
  });
});


test("rejects malformed and unsupported hotspot commands", () => {
  assert.equal(normalizeSceneHotspot({ ...validModule, interaction: null }), null);
  assert.equal(normalizeSceneHotspot({
    ...validModule,
    interaction: {
      ...validModule.interaction,
      primary: { key: "E", action: "delete-world", label: "删除" },
    },
  }), null);
  assert.deepEqual(normalizeSceneHotspots([null, validModule]).map((item) => item.id), ["roundtable-six"]);
});


test("selects only the nearest in-range hotspot", () => {
  const second = normalizeSceneHotspot({
    ...validModule,
    id: "table-two",
    position: { x: 3, z: 0 },
    interaction: { ...validModule.interaction, label: "双人桌", radius: 1.5 },
  });
  const first = normalizeSceneHotspot(validModule);
  assert.equal(nearestSceneHotspot([first, second], { x: 2.4, z: 0 }).id, "table-two");
  assert.equal(nearestSceneHotspot([first, second], { x: 8, z: 8 }), null);
  assert.equal(nearestSceneHotspot([first], { x: 0, z: 2.72 }).id, "roundtable-six");
});
