import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { CampfireEntrance } from "../src/runtime/CampfireEntrance.js";
import { VILLAGE_CAMPFIRE_LAYOUT } from "../src/runtime/CampfireLayout.js";
import { colliderShellFor } from "../src/runtime/ColliderRegistry.js";


const ASSET_URL = new URL("../public/props/c3525-fire2.glb", import.meta.url);
const CATALOG_URL = new URL("../public/data/asset-catalog.json", import.meta.url);


async function parseFire2() {
  globalThis.self ??= globalThis;
  globalThis.ProgressEvent ??= class ProgressEvent {
    constructor(type, init = {}) {
      this.type = type;
      Object.assign(this, init);
    }
  };
  globalThis.createImageBitmap ??= async () => ({ width: 1, height: 1, close() {} });
  const bytes = await fs.readFile(ASSET_URL);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(buffer, "", resolve, reject);
  });
}


test("C3525 Fire2 is a centered, grounded, scale-controlled campfire module", async () => {
  const gltf = await parseFire2();
  const rootNode = gltf.scene.getObjectByName("ROOT_Campfire");
  const mesh = rootNode?.getObjectByProperty("isMesh", true);
  assert.ok(rootNode);
  assert.ok(mesh?.isMesh);

  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(center.x) < 0.002);
  assert.ok(Math.abs(center.z) < 0.002);
  assert.ok(Math.abs(bounds.min.y) < 0.002);
  assert.ok(Math.abs(size.x - VILLAGE_CAMPFIRE_LAYOUT.dimensions.width) < 0.01);
  assert.ok(Math.abs(size.y - VILLAGE_CAMPFIRE_LAYOUT.dimensions.height) < 0.01);
  assert.ok(Math.abs(size.z - VILLAGE_CAMPFIRE_LAYOUT.dimensions.depth) < 0.01);
});


test("campfire entrance mounts at the same point as its hotspot and blocker", async () => {
  const gltf = await parseFire2();
  const entrance = new CampfireEntrance({
    assetStore: { loadScene: async () => gltf.scene },
    assetCatalog: {
      resolve(assetId, kind) {
        assert.equal(assetId, VILLAGE_CAMPFIRE_LAYOUT.assetId);
        assert.equal(kind, "environment-module");
        return { resolvedUrl: "memory://campfire" };
      },
    },
  });
  const prop = await entrance.load();
  prop.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(prop);
  const center = bounds.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(center.x - VILLAGE_CAMPFIRE_LAYOUT.position.x) < 0.002);
  assert.ok(Math.abs(center.z - VILLAGE_CAMPFIRE_LAYOUT.position.z) < 0.002);
  assert.ok(Math.abs(bounds.min.y - VILLAGE_CAMPFIRE_LAYOUT.position.y) < 0.002);
  assert.equal(prop.userData.interaction, "group-play");
  assert.ok(prop.getObjectByName("LIGHT_VillageCampfire"));

  const shell = colliderShellFor(VILLAGE_CAMPFIRE_LAYOUT.environmentAssetId);
  const blocker = shell.staticCircles.find((circle) => circle.id === "campfire-c3525");
  assert.ok(blocker);
  assert.equal(blocker.x, VILLAGE_CAMPFIRE_LAYOUT.position.x);
  assert.equal(blocker.z, VILLAGE_CAMPFIRE_LAYOUT.position.z);
  assert.equal(blocker.r, VILLAGE_CAMPFIRE_LAYOUT.blockerRadius);
  assert.ok(blocker.r < VILLAGE_CAMPFIRE_LAYOUT.interactionRadius);
  entrance.dispose();
});


test("asset catalog whitelists the standalone Fire2 module", async () => {
  const catalog = JSON.parse(await fs.readFile(CATALOG_URL, "utf8"));
  const record = catalog.assets.find((asset) => asset.asset_id === VILLAGE_CAMPFIRE_LAYOUT.assetId);
  assert.deepEqual(
    {
      kind: record?.kind,
      url: record?.url,
      root_node: record?.root_node,
    },
    {
      kind: "environment-module",
      url: "props/c3525-fire2.glb",
      root_node: "ROOT_Campfire",
    },
  );
});
