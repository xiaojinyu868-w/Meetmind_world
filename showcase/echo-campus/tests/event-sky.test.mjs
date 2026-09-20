import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createEventLook, eventLightFrame, eventSkyMapping, skySourceV } from "../src/runtime/EventLook.js";

test("street-level sky contains the cloud bank rather than the orange source horizon", () => {
  const mapping = eventSkyMapping(new THREE.Vector3(-38, 14, 28));
  assert.equal(skySourceV(0, mapping), 0);
  assert.equal(skySourceV(1, mapping), .6);
  assert.equal(skySourceV(2, mapping), .72);
  assert.ok(mapping.sourceLimit < mapping.sourceSunV - .1, "The flat illustration solar disc is excluded");
  const left = skySourceV(1 - 1e-5, mapping), right = skySourceV(1 + 1e-5, mapping);
  assert.ok(Math.abs(left - right) < .00002, "Cloud sampling is continuous through the horizon");
  const samples = Array.from({length: 201}, (_, i) => skySourceV(i / 100, mapping));
  assert.ok(samples.every((value, index) => !index || value >= samples[index - 1]));
});

test("painted warm glow and the directional light align in Three equirectangular coordinates", () => {
  for (const direction of [new THREE.Vector3(-38, 14, -44), new THREE.Vector3(8, 3, -10)]) {
    const mapping = eventSkyMapping(direction);
    const elevation = (1 - mapping.sunHemisphereV) * Math.PI / 2;
    const longitude = (mapping.sourceSunU - .5) * Math.PI * 2;
    const painted = new THREE.Vector3(Math.cos(elevation) * Math.cos(longitude), Math.sin(elevation), Math.cos(elevation) * Math.sin(longitude));
    painted.applyAxisAngle(new THREE.Vector3(0, 1, 0), mapping.rotation);
    assert.ok(painted.distanceTo(direction.clone().normalize()) < 1e-12);
  }
});

test("sky and reflected environment use identical alignment and restore source rotations", async () => {
  const scene = new THREE.Scene(), modelRoot = new THREE.Group(), sun = new THREE.DirectionalLight();
  const config = { bounds: { minX: 59, maxX: 101, minZ: 202, maxZ: 212.5 }, groundY: 6.2991 };
  const originalBackground = new THREE.Euler(.1, .2, .3), originalEnvironment = new THREE.Euler(.3, .4, .5);
  scene.backgroundRotation.copy(originalBackground); scene.environmentRotation.copy(originalEnvironment);
  const frame = eventLightFrame(config), expected = eventSkyMapping(frame.sunPosition.clone().sub(frame.center));
  let receivedMapping = null;
  const look = await createEventLook({ scene, modelRoot, config, sun, loadTexture: async () => new THREE.Texture(), prepareSkyTexture: (_texture, _quality, mapping) => { receivedMapping = mapping; return new THREE.Texture(); } });
  assert.equal(receivedMapping.rotation, expected.rotation);
  look.setEnabled(true);
  assert.equal(scene.backgroundRotation.y, expected.rotation);
  assert.equal(scene.environmentRotation.y, expected.rotation);
  look.setEnabled(false);
  assert.ok(scene.backgroundRotation.equals(originalBackground));
  assert.ok(scene.environmentRotation.equals(originalEnvironment));
  look.dispose();
});
