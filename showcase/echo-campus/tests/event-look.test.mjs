import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createEventLook, eventLightFrame, eventMaterialProfile } from "../src/runtime/EventLook.js";

function fixture() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe2e7df); scene.environment = new THREE.Texture();
  scene.fog = new THREE.Fog(0xe2e7df, 400, 1500); scene.environmentIntensity = .36;
  scene.backgroundRotation.set(.1, .2, .3); scene.environmentRotation.set(.3, .2, .1);
  const sun = new THREE.DirectionalLight(0xffecd1, 3.3), hemi = new THREE.HemisphereLight(0xdaeaff, 0xb0a184, 1.1), fill = new THREE.DirectionalLight(0xd5e7f4, .75);
  sun.position.set(-36, 53, 32); sun.target.position.set(100, 0, 100);
  sun.shadow.normalBias = .2; sun.shadow.bias = -.001;
  Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 15, far: 900 });
  hemi.position.set(0, 40, 0); fill.position.set(35, 18, -38);
  scene.add(sun, sun.target, hemi, fill);
  const modelRoot = new THREE.Group(); scene.add(modelRoot);
  const glass = new THREE.MeshStandardMaterial({ color: 0x526e73, map: new THREE.Texture() }); glass.name = "[Translucent_Glass_Safety]";
  const billboard = new THREE.MeshStandardMaterial({ color: "green" }); billboard.name = "Cutout+Tree greener";
  const unaffected = new THREE.MeshStandardMaterial({ color: "blue" }); unaffected.name = "user blue sculpture";
  const meshes = [glass, glass, billboard, unaffected].map(m => { const o = new THREE.Mesh(new THREE.BoxGeometry(), m); modelRoot.add(o); return o; });
  const config = { bounds: { minX: 59, maxX: 101, minZ: 202, maxZ: 212.5 }, groundY: 6.2991 };
  const renderer = { toneMappingExposure: 1.03 };
  return { scene, sun, hemi, fill, modelRoot, config, renderer, glass, billboard, unaffected, meshes };
}

test("event material profiles are explicit names and never hide arbitrary vegetation", () => {
  assert.equal(eventMaterialProfile({ name: "Cutout+Tree greener" }), "billboard");
  assert.equal(eventMaterialProfile({ name: "[Translucent_Glass_Safety]" }), "glass");
  assert.equal(eventMaterialProfile({ name: "[Color H01]1" }), "glass");
  assert.equal(eventMaterialProfile({ name: "Source material 0" }), "glass");
  assert.equal(eventMaterialProfile({ name: "tree geometry" }), null);
  assert.equal(eventMaterialProfile({ name: "blue sculpture" }), null);
});

test("activity shadow framing uses calibrated ground and activity extent", () => {
  const { config } = fixture(), frame = eventLightFrame(config);
  assert.deepEqual(frame.center.toArray(), [80, 7.4991, 207.25]);
  assert.ok(frame.span >= 20 && frame.span < 35);
  assert.ok(frame.sunPosition.y > frame.center.y);
  assert.ok(frame.near > 0 && frame.far > frame.sunPosition.distanceTo(frame.center));
  assert.throws(() => eventLightFrame({ bounds: { minX: 1, maxX: 0, minZ: 0, maxZ: 1 } }), /calibrated/);
});

test("source event source restores original object identities, geometry, lights, fog and camera", async () => {
  const f = fixture();
  const { scene, renderer, sun, hemi, fill, meshes, glass, billboard } = f;
  const original = { background: scene.background, environment: scene.environment, fog: scene.fog, environmentIntensity: scene.environmentIntensity, exposure: renderer.toneMappingExposure, sunColor: sun.color.clone(), sunPosition: sun.position.clone(), sunTarget: sun.target.position.clone(), sunIntensity: sun.intensity, hemiColor: hemi.color.clone(), hemiGround: hemi.groundColor.clone(), fillPosition: fill.position.clone(), shadow: sun.shadow.camera.clone(), backgroundRotation: scene.backgroundRotation.clone(), environmentRotation: scene.environmentRotation.clone(), geometry: meshes[0].geometry, materialColor: glass.color.clone() };
  const look = await createEventLook({ ...f, skyUrl: null });
  assert.equal(scene.background, original.background);
  assert.equal(meshes[0].material, glass);
  assert.equal(look.diagnostics.enabled, false);
  look.setEnabled(true);
  assert.notEqual(meshes[0].material, glass);
  assert.equal(meshes[0].material, meshes[1].material);
  assert.equal(meshes[0].material.map, glass.map);
  assert.equal(meshes[0].geometry, original.geometry);
  assert.equal(meshes[2].visible, false);
  assert.equal(meshes[3].material, f.unaffected);
  assert.equal(glass.color.equals(original.materialColor), true);
  assert.equal(look.diagnostics.hiddenBillboards, 1);
  assert.equal(sun.target.position.y, 7.4991);
  look.setEnabled(true);
  look.setEnabled(false);
  assert.equal(meshes[0].material, glass); assert.equal(meshes[2].material, billboard); assert.equal(meshes[2].visible, true);
  assert.equal(scene.background, original.background); assert.equal(scene.environment, original.environment); assert.equal(scene.fog, original.fog);
  assert.equal(scene.environmentIntensity, original.environmentIntensity); assert.equal(renderer.toneMappingExposure, original.exposure);
  assert.ok(sun.color.equals(original.sunColor)); assert.ok(sun.position.equals(original.sunPosition)); assert.ok(sun.target.position.equals(original.sunTarget)); assert.equal(sun.intensity, original.sunIntensity);
  assert.ok(hemi.color.equals(original.hemiColor)); assert.ok(hemi.groundColor.equals(original.hemiGround)); assert.ok(fill.position.equals(original.fillPosition));
  assert.ok(scene.backgroundRotation.equals(original.backgroundRotation)); assert.ok(scene.environmentRotation.equals(original.environmentRotation));
  for (const key of ["left", "right", "top", "bottom", "near", "far"]) assert.equal(sun.shadow.camera[key], original.shadow[key]);
  look.dispose();
});

test("mixed-material mesh hides only the exact billboard group and preserves prior hidden visibility", async () => {
  const f = fixture(), mixed = new THREE.Mesh(new THREE.BoxGeometry(), [f.billboard, f.glass]); f.modelRoot.add(mixed);
  f.meshes[2].visible = false;
  const look = await createEventLook({ ...f, skyUrl: null });
  look.setEnabled(true);
  assert.equal(mixed.visible, true); assert.equal(mixed.material[0].visible, false); assert.equal(mixed.material[1].visible, true);
  look.setEnabled(false);
  assert.equal(mixed.material[0], f.billboard); assert.equal(f.meshes[2].visible, false);
  look.dispose();
});

test("sky load failure is nonfatal and original textures survive disposal", async () => {
  const f = fixture(); let sourceDisposals = 0, cloneDisposals = 0;
  for (const item of [f.glass, f.glass.map, f.billboard, f.meshes[0].geometry, f.scene.environment]) item.addEventListener("dispose", () => sourceDisposals++);
  const look = await createEventLook({ ...f, loadTexture: async () => { throw new Error("offline"); } });
  assert.equal(look.diagnostics.warnings.length, 1);
  look.setEnabled(true);
  f.meshes[0].material.addEventListener("dispose", () => cloneDisposals++);
  look.dispose(); look.dispose();
  assert.equal(f.meshes[0].material, f.glass); assert.equal(sourceDisposals, 0); assert.equal(cloneDisposals, 1);
  assert.equal(look.setEnabled(true), false);
});

test("successful sky/PMREM resources are owned once, source env restored before disposal", async () => {
  const f = fixture(), originalEnv = f.scene.environment;
  const loaded = new THREE.Texture(), sky = new THREE.Texture(), envTexture = new THREE.Texture();
  let loadedDisposals = 0, skyDisposals = 0, envDisposals = 0;
  loaded.addEventListener("dispose", () => loadedDisposals++); sky.addEventListener("dispose", () => skyDisposals++);
  const look = await createEventLook({ ...f, baseUrl: "/echo-campus/", loadTexture: async url => { assert.equal(url, "/echo-campus/assets/premium/garden-sky.webp"); return loaded; }, prepareSkyTexture: () => sky, createEnvironment: () => ({ texture: envTexture, dispose() { envDisposals++; } }) });
  assert.equal(loadedDisposals, 1); assert.equal(look.diagnostics.sky, "generated-sky-and-reflections");
  look.setEnabled(true); assert.equal(f.scene.background, sky); assert.equal(f.scene.environment, envTexture);
  look.dispose(); look.dispose();
  assert.equal(f.scene.environment, originalEnv); assert.equal(skyDisposals, 1); assert.equal(envDisposals, 1);
});
