import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { eventShadowTuning } from "../src/runtime/EventShadowTuning.js";
import { createEventLook } from "../src/runtime/EventLook.js";

const campus = JSON.parse(await readFile(new URL("../public/scenes/venue/venue-campus.json", import.meta.url), "utf8"));
const distant = { wide: true, span: 417.6, mapSize: 1024, near: .5, far: 2505.6, sunDirection: { x: -38, y: 14, z: 28 } };
const close = { bias: -.00006, normalBias: .025, radius: 3 };
function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`); }

test("wide campus uses bounded light-space depth offsets without displacing reversed roof normals", () => {
  assert.deepEqual(eventShadowTuning(), close);
  const result = eventShadowTuning(distant);
  assert.ok(result.bias < 0);
  assert.equal(result.normalBias, 0);
  assert.ok(result.depthBiasMeters < 3.1);
  assert.ok(result.radius <= 1);
  assert.ok(result.worldTexel > .8 && result.worldTexel < .82);
});

test("shadow resolution and coverage change offsets in world units while depth range only changes normalization", () => {
  const base = eventShadowTuning(distant);
  const twiceResolution = eventShadowTuning({ ...distant, mapSize: 2048 });
  const halfCoverage = eventShadowTuning({ ...distant, span: distant.span / 2 });
  assert.equal(twiceResolution.normalBias, 0);
  near(twiceResolution.depthBiasMeters - .02, (base.depthBiasMeters - .02) / 2);
  assert.deepEqual(twiceResolution, halfCoverage);
  const deeper = { ...distant, far: distant.near + (distant.far - distant.near) * 4 };
  const changed = eventShadowTuning(deeper);
  near(-base.bias * (distant.far - distant.near), -changed.bias * (deeper.far - deeper.near));
  assert.equal(changed.normalBias, 0);
  // Rescaling a direction vector does not change the lighting angle.
  assert.deepEqual(eventShadowTuning({ ...distant, sunDirection: { x: -76, y: 28, z: 56 } }), base);
});

test("grazing sun compensation stays bounded and invalid frames do not produce NaN uniforms", () => {
  const lowSun = eventShadowTuning({ ...distant, sunDirection: { x: 10, y: .001, z: 0 } });
  assert.ok(lowSun.depthBiasMeters <= lowSun.worldTexel * 4.4 + .020001);
  for (const patch of [{ span: 0 }, { mapSize: 0 }, { far: .5 }, { near: NaN }, { sunDirection: { x: 0, y: 0, z: 1 } }]) {
    assert.throws(() => eventShadowTuning({ ...distant, ...patch }));
  }
});

test("event look switches wide and close tuning repeatedly and restores the source-view shadows", async () => {
  const scene = new THREE.Scene(), modelRoot = new THREE.Group(), sun = new THREE.DirectionalLight();
  scene.background = new THREE.Color(0xddeeff);
  scene.add(modelRoot, sun, sun.target);
  sun.shadow.mapSize.set(1024, 1024);
  const original = { bias: -.001, normalBias: .2, radius: 1.2, intensity: .7 };
  Object.assign(sun.shadow, original);
  const sourceCamera = { ...Object.fromEntries(["left", "right", "top", "bottom", "near", "far", "zoom"].map(key => [key, sun.shadow.camera[key]])) };
  const look = await createEventLook({ scene, modelRoot, sun, config: campus, skyUrl: null });
  const camera = new THREE.PerspectiveCamera(), target = new THREE.Vector3();
  const move = id => { camera.position.fromArray(campus.cameras[id].position); target.fromArray(campus.cameras[id].target); look.update(1 / 60, camera, target); };
  try {
    look.setEnabled(true);
    for (const id of ["hero", "arrival", "commercial", "arrival", "aerial"]) {
      move(id);
      const wide = id !== "arrival";
      if (wide) {
        assert.equal(look.diagnostics.shadowTuning.wide, true);
        assert.ok(sun.shadow.radius <= 1);
        assert.equal(sun.shadow.normalBias, 0);
        assert.ok(-sun.shadow.bias * (sun.shadow.camera.far - sun.shadow.camera.near) < 3.1);
      } else {
        for (const [key, value] of Object.entries(close)) assert.equal(sun.shadow[key], value);
      }
    }
    look.setEnabled(false);
    for (const [key, value] of Object.entries(original)) assert.equal(sun.shadow[key], value);
    for (const [key, value] of Object.entries(sourceCamera)) assert.equal(sun.shadow.camera[key], value);
    look.setEnabled(true); move("arrival");
    for (const [key, value] of Object.entries(close)) assert.equal(sun.shadow[key], value);
  } finally { look.dispose(); }
});
