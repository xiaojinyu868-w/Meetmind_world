import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import {
  BoothSystem,
  boothInteractionRadius,
  boothSlotsForEnvironment,
  buildFallbackBooths,
  fallbackBoothAnchor,
} from "../src/runtime/BoothSystem.js";
import { DEFAULT_CHARACTER_COLLIDER } from "../src/runtime/CharacterCapsule.js";
import { VILLAGE_MARKET_LAYOUT } from "../src/runtime/VillageMarketEnvironment.js";


const VILLAGE_MARKET_ASSET_ID = "environment.village-market.v1";


test("village market assigns one separated slot to each of the six people", () => {
  const slots = boothSlotsForEnvironment(VILLAGE_MARKET_ASSET_ID);
  assert.equal(slots.length, 6);

  for (let left = 0; left < slots.length; left += 1) {
    for (let right = left + 1; right < slots.length; right += 1) {
      const distance = Math.hypot(
        slots[left].x - slots[right].x,
        slots[left].z - slots[right].z,
      );
      assert.ok(
        distance > slots[left].blockerRadius + slots[right].blockerRadius,
        `${slots[left].sourceNode} overlaps ${slots[right].sourceNode}`,
      );
    }
  }
});


test("fallback booth records and character anchors use the same village slots", () => {
  const people = Array.from({ length: 6 }, (_, index) => ({
    id: `person-${index + 1}`,
    name: `Person ${index + 1}`,
  }));
  const booths = buildFallbackBooths(people, VILLAGE_MARKET_ASSET_ID);

  assert.equal(booths.length, people.length);
  booths.forEach((booth, index) => {
    const anchor = fallbackBoothAnchor(index, VILLAGE_MARKET_ASSET_ID);
    const { x, z, yaw, person_offset: forward, person_lateral: lateral } = booth.position;
    assert.ok(Math.abs(anchor.x - (
      x + Math.sin(yaw) * forward + Math.cos(yaw) * lateral
    )) < 1e-9);
    assert.ok(Math.abs(anchor.z - (
      z + Math.cos(yaw) * forward - Math.sin(yaw) * lateral
    )) < 1e-9);
    assert.ok(booth.position.person_offset >= 1.2);
    assert.ok(booth.position.blocker_radius >= 1.4);
  });
});


test("every village booth remains reachable outside its collision boundary", () => {
  const slots = boothSlotsForEnvironment(VILLAGE_MARKET_ASSET_ID);

  for (const slot of slots) {
    const collisionBoundary = slot.blockerRadius + DEFAULT_CHARACTER_COLLIDER.radius;
    const interactionRadius = boothInteractionRadius(
      slot.blockerRadius,
      DEFAULT_CHARACTER_COLLIDER.radius,
    );
    assert.ok(
      interactionRadius > collisionBoundary,
      `${slot.sourceNode} interaction ends inside its collision boundary`,
    );
  }
});


test("village booth instances omit character boards and the brown counter", async () => {
  const system = new BoothSystem({
    scene: new THREE.Scene(),
    assetStore: {},
    assetCatalog: {},
    resolveMediaUrl: (ref) => ref,
    templateAssetId: null,
    showDisplayBoard: false,
  });
  await system.prepare();
  system.sync(buildFallbackBooths(
    [{ id: "person-1", name: "Person 1" }],
    VILLAGE_MARKET_ASSET_ID,
  ));

  const record = [...system.booths.values()][0];
  assert.ok(record);
  assert.equal(record.root.getObjectByName("MESH_FallbackCounter"), undefined);
  assert.equal(record.root.getObjectByName("MESH_BackdropBoard"), undefined);
  assert.equal(record.root.getObjectByName("MESH_NamePlate"), undefined);
  assert.equal(system.readablePanelCount, 0);
  system.update(1);
  record.root.updateMatrixWorld(true);
  const pickProxy = record.root.getObjectByName("BOOTH_PickProxy");
  assert.ok(pickProxy);
  assert.equal(pickProxy.material.opacity, 0);
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(record.position.x, 3, record.position.z),
    new THREE.Vector3(0, -1, 0),
  );
  assert.ok(raycaster.intersectObject(record.root, true).some(({ object }) => object === pickProxy));
});


test("visible fallback templates retain their display board assets", async () => {
  const system = new BoothSystem({
    scene: new THREE.Scene(),
    assetStore: {},
    assetCatalog: {},
    resolveMediaUrl: (ref) => ref,
    templateAssetId: null,
    showDisplayBoard: true,
  });
  await system.prepare();

  assert.ok(system.template.getObjectByName("MESH_BackdropBoard"));
  assert.ok(system.template.getObjectByName("MESH_NamePlate"));
  assert.ok(system.template.getObjectByName("MESH_Backdrop"));
});


test("village people clear the source environment meshes", async () => {
  globalThis.self ??= globalThis;
  globalThis.ProgressEvent ??= class ProgressEvent {
    constructor(type, init = {}) {
      this.type = type;
      Object.assign(this, init);
    }
  };
  globalThis.createImageBitmap ??= async () => ({ width: 1, height: 1, close() {} });

  const modelBytes = await fs.readFile(new URL(
    "../public/models/echo_world_village_market.glb",
    import.meta.url,
  ));
  const modelBuffer = modelBytes.buffer.slice(
    modelBytes.byteOffset,
    modelBytes.byteOffset + modelBytes.byteLength,
  );
  const gltf = await new Promise((resolve, reject) => {
    new GLTFLoader().parse(modelBuffer, "", resolve, reject);
  });
  gltf.scene.position.set(
    VILLAGE_MARKET_LAYOUT.visualOffset.x,
    VILLAGE_MARKET_LAYOUT.visualOffset.y,
    VILLAGE_MARKET_LAYOUT.visualOffset.z,
  );
  gltf.scene.updateMatrixWorld(true);

  const environmentMeshes = [];
  gltf.scene.traverse((node) => {
    if (!node.isMesh) return;
    const box = new THREE.Box3().setFromObject(node);
    const size = box.getSize(new THREE.Vector3());
    if (size.x <= 5 && size.y <= 5 && size.z <= 5) {
      environmentMeshes.push({ name: node.name, box });
    }
  });

  const slots = boothSlotsForEnvironment(VILLAGE_MARKET_ASSET_ID);

  slots.forEach((slot, index) => {
    const person = fallbackBoothAnchor(index, VILLAGE_MARKET_ASSET_ID);
    const personHits = environmentMeshes.filter(({ box }) => {
      if (box.max.y < 0 || box.min.y > DEFAULT_CHARACTER_COLLIDER.standingHeight) return false;
      const dx = Math.max(box.min.x - person.x, 0, person.x - box.max.x);
      const dz = Math.max(box.min.z - person.z, 0, person.z - box.max.z);
      return Math.hypot(dx, dz) < DEFAULT_CHARACTER_COLLIDER.radius;
    });
    assert.deepEqual(
      personHits.map(({ name }) => name),
      [],
      `${slot.sourceNode} person intersects environment geometry`,
    );

  });
});
