import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { profileCameraPreset } from "../src/runtime/ProfileFraming.js";

test("profile fits in the exposed viewport for all attendee headings", () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 2.3]) {
    const person = new THREE.Vector3(32, 7, -18);
    const preset = profileCameraPreset({ position: person, yaw, aspect: 1.6, panelFraction: 0.31 });
    const camera = new THREE.PerspectiveCamera(preset.fov, 1.6, 0.05, 100);
    camera.position.fromArray(preset.position);camera.lookAt(...preset.target);camera.updateMatrixWorld();
    const center = person.clone().add(new THREE.Vector3(0, 1.03, 0)).project(camera);
    assert.ok(Math.abs(center.x + 0.31) < 1e-8, "subject must stay left of the side panel regardless of yaw");
    for (const y of [0, 1.9]) assert.ok(Math.abs(person.clone().add(new THREE.Vector3(0, y, 0)).project(camera).y) < 0.9);
  }
});
