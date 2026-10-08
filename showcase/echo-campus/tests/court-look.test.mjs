import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { COURT_LOOK, COURT_LIGHT, COURT_SHOTS, addCourtFinish, backlightAzimuth, fillPosition, sunDirection } from "../src/runtime/CourtLook.js";
import { eventLightFrame } from "../src/runtime/EventLook.js";
import { validateManifest } from "../src/runtime/SceneManifest.js";
import { stampDate } from "../src/ui/TapeStamp.js";

const fakeComposer = () => ({ passes: [], addPass(pass) { this.passes.push(pass); } });
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("sun direction and backlight follow azimuth from +z toward +x", () => {
  const d = sunDirection(135, 30);
  close(d.y, 0.5); close(d.x, Math.sin(THREE.MathUtils.degToRad(135)) * Math.cos(Math.PI / 6)); close(d.z, -d.x);
  close(d.length(), 1);
  // The arrival camera looks north (-z); the sun goes ahead of it, 45° to the right.
  close(backlightAzimuth({ x: 171.34, z: 108.5 }, { x: 171.34, z: 86.5 }), 135);
  close(backlightAzimuth({ x: 0, z: 0 }, { x: 0, z: -10 }, -45), 225);
});

test("the campus venue is backlit from its arrival camera", () => {
  // Through the same validation the runtime loads it with.
  const manifest = validateManifest(JSON.parse(readFileSync(new URL("../public/scenes/venue/venue-campus.json", import.meta.url), "utf8")));
  assert.deepEqual(manifest.eventLook.sun, { azimuth: 135, elevation: COURT_LIGHT.sun.elevation });
  const frame = eventLightFrame(manifest), offset = frame.sunPosition.clone().sub(frame.center).normalize();
  close(THREE.MathUtils.radToDeg(Math.asin(offset.y)), 30, 1e-4);
  close(THREE.MathUtils.radToDeg(Math.atan2(offset.x, offset.z)), 135, 1e-4);
});

test("manifest validation keeps a sane sun and rejects the rest", () => {
  const raw = JSON.parse(readFileSync(new URL("../public/scenes/venue/venue-campus.json", import.meta.url), "utf8"));
  const without = { ...raw }; delete without.eventLook;
  assert.equal("eventLook" in validateManifest(without), false);
  for (const sun of [{ azimuth: 135, elevation: 0 }, { azimuth: 135, elevation: 95 }, { azimuth: "east", elevation: 30 }, [135, 30]]) {
    assert.throws(() => validateManifest({ ...raw, eventLook: { sun } }), /太阳/);
  }
});

test("a venue without a sun keeps the original low sun ahead-left", () => {
  const frame = eventLightFrame({ bounds: { minX: 0, maxX: 20, minZ: 0, maxZ: 20 } });
  const offset = frame.sunPosition.clone().sub(frame.center).normalize(), expected = new THREE.Vector3(-38, 14, 28).normalize();
  close(offset.distanceTo(expected), 0);
  for (const sun of [{ azimuth: 90, elevation: 0 }, { azimuth: "east", elevation: 30 }]) {
    const fallback = eventLightFrame({ bounds: { minX: 0, maxX: 20, minZ: 0, maxZ: 20 }, eventLook: { sun } });
    close(fallback.sunPosition.clone().sub(fallback.center).normalize().distanceTo(expected), 0);
  }
});

test("the fill comes from the camera's side, opposite the sun", () => {
  const center = new THREE.Vector3(170, 1, 86), sun = sunDirection(135, 30).multiplyScalar(80);
  const toFill = fillPosition(center, sun).sub(center).normalize();
  close(THREE.MathUtils.radToDeg(Math.asin(toFill.y)), COURT_LIGHT.fill.elevation, 1e-4);
  assert.ok(toFill.x * sun.x < 0 && toFill.z * sun.z < 0, "mirrored across the vertical");
});

test("neutral is the identity film; day lifts shadows toward plum and keeps colour", () => {
  assert.deepEqual({ ...COURT_LOOK.neutral.finish }, { uSat: 1, uVibrance: 0, uContrast: 1, uWarm: 0, uVignette: 0, uGrain: 0, uLift: 0 });
  assert.equal(COURT_LOOK.neutral.bloom.strength, 0);
  const day = COURT_LOOK.day.finish;
  assert.ok(day.uLift > 0 && day.uSat >= 1 && day.uVignette > 0 && day.uGrain > 0);
  assert.ok(COURT_LOOK.day.bloom.threshold > 1, "only lights and glints bloom, never sunlit paving");
});

test("finishing chain: phones skip the bloom; the look starts neutral", () => {
  const phone = fakeComposer(), phoneLook = addCourtFinish(phone, { quality: "low", fxaa: true });
  assert.equal(phone.passes.length, 2);
  assert.equal(phoneLook.bloom, null);
  assert.equal(phoneLook.uniforms.uFxaa.value, 1);
  const desk = fakeComposer(), look = addCourtFinish(desk, { quality: "balanced" });
  assert.equal(desk.passes.length, 4);
  assert.equal(look.passes, 4);
  assert.equal(look.name, "neutral");
  assert.equal(look.bloom.enabled, false);
  assert.equal(look.uniforms.uSat.value, 1);
  assert.equal(look.uniforms.uLift.value, 0);
  look.dispose(); phoneLook.dispose();
});

test("look presets and shots ease the film without leaking into neutral", () => {
  const look = addCourtFinish(fakeComposer(), { quality: "balanced" }), u = look.uniforms;
  assert.equal(look.use("day"), "day");
  for (const [key, value] of Object.entries(COURT_LOOK.day.finish)) close(u[key].value, value);
  assert.equal(look.bloom.enabled, true);
  close(look.bloom.threshold, COURT_LOOK.day.bloom.threshold);
  close(u.uTilt.value, COURT_SHOTS.walk.tilt);

  look.setShot("close", { focus: 0.83 });
  for (let i = 0; i < 300; i++) look.update(1 / 30, i / 30);
  close(u.uTilt.value, COURT_SHOTS.close.tilt, 1e-3);
  close(u.uFocus.value, 0.83, 1e-3);
  close(u.uLift.value, COURT_LOOK.day.finish.uLift + COURT_SHOTS.close.lift, 1e-3);

  look.setShot("stage", { instant: true });
  close(u.uTilt.value, COURT_SHOTS.stage.tilt);
  close(u.uLift.value, COURT_LOOK.day.finish.uLift);
  assert.equal(look.shot, "stage");

  assert.equal(look.use("neutral"), "neutral");
  look.setShot("close", { instant: true });
  assert.equal(u.uTilt.value, 0);
  assert.equal(u.uLift.value, 0);
  assert.equal(look.bloom.enabled, false);
  assert.equal(look.use("no-such-look"), "neutral");
  look.dispose();
});

test("finish keeps its texel and aspect in step with the drawing buffer", () => {
  const look = addCourtFinish(fakeComposer(), { quality: "low", fxaa: true });
  look.resize(390, 844, 2);
  close(look.uniforms.uAspect.value, 390 / 844);
  close(look.uniforms.uTexel.value.x, 1 / 780); close(look.uniforms.uTexel.value.y, 1 / 1688);
  look.dispose();
});

test("tape stamp prints the moment like a tape deck", () => {
  assert.equal(stampDate(new Date(2026, 9, 8, 17, 42)), "PM 5:42  OCT. 08 2026");
  assert.equal(stampDate(new Date(2026, 4, 1, 0, 5)), "AM 12:05  MAY 01 2026");
  assert.equal(stampDate(new Date(2026, 11, 31, 12, 0)), "PM 12:00  DEC. 31 2026");
});
