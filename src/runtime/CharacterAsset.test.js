import assert from "node:assert/strict";
import test from "node:test";

import {
  CHARACTER_ASSET_SCHEMA,
  characterAssetKey,
  characterAssetUrl,
  normalizeCharacterAsset,
} from "./CharacterAsset.js";


function fixture(overrides = {}) {
  return {
    schema_version: CHARACTER_ASSET_SCHEMA,
    character_id: "char_demo_01",
    revision: 2,
    glb_url: "/assets/characters/char_demo_01/2/model.glb",
    content_hash: "a".repeat(64),
    runtime: {
      scale_meters: 1.65,
      ground_offset: 0,
      forward_axis: "+Z",
      animations: {},
    },
    qa: { status: "passed" },
    ...overrides,
  };
}


test("normalizes a QA-passed immutable CharacterAsset", () => {
  const asset = normalizeCharacterAsset(fixture({
    runtime: { ...fixture().runtime, animations: { idle: "Idle" } },
  }));
  assert.equal(asset.schema_version, CHARACTER_ASSET_SCHEMA);
  assert.equal(asset.revision, 2);
  assert.equal(characterAssetKey(asset), `char_demo_01@2:${"a".repeat(64)}`);
  assert.equal(characterAssetUrl(asset), "/assets/characters/char_demo_01/2/model.glb");
  assert.deepEqual(asset.runtime.animations, { idle: "Idle" });
  assert.ok(Object.isFrozen(asset));
});


test("rejects unsafe or unverified asset deliveries", () => {
  assert.equal(normalizeCharacterAsset(fixture({ glb_url: "javascript:alert(1)" })), null);
  assert.equal(normalizeCharacterAsset(fixture({ glb_url: "../private/model.glb" })), null);
  assert.equal(normalizeCharacterAsset(fixture({ qa: { status: "pending" } })), null);
  assert.equal(normalizeCharacterAsset(fixture({ content_hash: "not-a-hash" })), null);
  assert.equal(
    normalizeCharacterAsset(fixture({
      runtime: { ...fixture().runtime, animations: { idle: "s3://private/idle.glb" } },
    })),
    null,
  );
  assert.equal(
    normalizeCharacterAsset(fixture({
      runtime: { ...fixture().runtime, scale_meters: "1.65" },
    })),
    null,
  );
  assert.equal(
    normalizeCharacterAsset(fixture({ runtime: { ...fixture().runtime, forward_axis: "-Y" } })),
    null,
  );
});
