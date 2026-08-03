import assert from "node:assert/strict";
import test from "node:test";

import { adaptSnapshot } from "./SnapshotAdapter.js";


const CHARACTER_ASSET = {
  schema_version: "character-asset.v1",
  character_id: "char_demo_01",
  revision: 1,
  glb_url: "/assets/characters/char_demo_01/1/model.glb",
  content_hash: "b".repeat(64),
  runtime: {
    scale_meters: 1.65,
    ground_offset: 0,
    forward_axis: "+Z",
    animations: {},
  },
  qa: { status: "passed" },
};


test("passes a validated CharacterAsset from snapshot into render data", () => {
  const snapshot = adaptSnapshot({
    schema: "echo-snapshot.v1",
    tick: 8,
    agents: [{
      id: "person-new",
      position: { x: 1, z: 2, yaw: 0 },
      state: "at-booth",
      avatar: { palette: {}, character_asset: CHARACTER_ASSET },
    }],
    modules: [],
    events: [],
  });
  assert.equal(snapshot.agents[0].characterAsset.character_id, "char_demo_01");
  assert.equal(snapshot.agents[0].characterAsset.revision, 1);
});


test("drops an invalid CharacterAsset without dropping the agent", () => {
  const snapshot = adaptSnapshot({
    schema: "echo-snapshot.v1",
    tick: 9,
    agents: [{
      id: "person-new",
      position: { x: 1, z: 2, yaw: 0 },
      state: "walking",
      avatar: { palette: {}, character_asset: { ...CHARACTER_ASSET, qa: { status: "failed" } } },
    }],
    modules: [],
    events: [],
  });
  assert.equal(snapshot.agents.length, 1);
  assert.equal(snapshot.agents[0].characterAsset, null);
});
