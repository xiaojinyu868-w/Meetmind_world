import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCharacterContactShadowResources, updateCharacterContactShadow } from "../src/scenes/CharacterContactShadow.js";

test("contact shadows share a soft borderless gradient and are not interactive geometry", () => {
  const resources = createCharacterContactShadowResources(), a = resources.create(1.68), b = resources.create(1.78);
  assert.equal(a.geometry, b.geometry); assert.equal(a.material, b.material);
  assert.equal(a.geometry.index.count / 3, 2);
  assert.equal(a.material.depthWrite, false); assert.equal(a.material.allowOverride, false);
  assert.ok(a.material.opacity <= .3);
  const { width, height, data } = resources.texture.image, alpha = (x, y) => data[(y * width + x) * 4 + 3];
  for (let i = 0; i < width; i++) { assert.equal(alpha(i, 0), 0); assert.equal(alpha(i, height - 1), 0); }
  assert.ok(alpha(32, 32) > alpha(40, 32) && alpha(40, 32) > alpha(48, 32) && alpha(48, 32) > alpha(56, 32));
  assert.equal(a.castShadow, false); assert.equal(a.receiveShadow, false);
  const hits = []; a.raycast(new THREE.Raycaster(), hits); assert.deepEqual(hits, []);
  resources.dispose();
});

test("contact stays above event paving during arrival scale and releases shared resources once", () => {
  const resources = createCharacterContactShadowResources(), root = new THREE.Group(), shadow = resources.create();
  root.position.set(70, 6.2991, 205); root.add(shadow);
  for (const scale of [.02, .3, 1]) {
    root.scale.setScalar(scale); updateCharacterContactShadow(shadow, root); root.updateMatrixWorld(true);
    const position = shadow.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(position.y - 6.2991 - .024) < 1e-7);
    assert.equal(position.x, 70); assert.equal(position.z, 205);
  }
  let released = 0;
  for (const resource of [resources.geometry, resources.material, resources.texture]) resource.addEventListener("dispose", () => released++);
  resources.dispose(); resources.dispose(); assert.equal(released, 3);
  assert.throws(() => resources.create(), /released/);
});
