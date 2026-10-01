import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { chooseLabels } from "../src/runtime/WorldLabels.js";
import { loadVenueAsset, COURT_VARIANT } from "../src/runtime/VenueAsset.js";
import { visibleSocialAttendees, DEMO_SOCIAL_PAIRS } from "../src/scenes/SocialEnsemble.js";
import { profileCameraPreset } from "../src/runtime/ProfileFraming.js";
import { seedAttendees } from "../server/seed.mjs";
import { PERSONAS } from "../src/shared/personas.mjs";
import { personaAssetDefinition } from "../src/scenes/PremiumCharacters.js";
import { readFileSync, existsSync } from "node:fs";

test("floating names keep self and selection, then the nearest guests without collisions", () => {
  const at = (id, x, y, distance, onScreen = true) => ({ id, x, y, distance, onScreen, width: 80 });
  const entries = [at("far", 500, 300, 30), at("self", 200, 200, 25), at("near", 600, 400, 4), at("clash", 610, 405, 5), at("off", 0, 0, 2, false), at("sel", 900, 100, 60), at("beyond", 300, 500, 80)];
  const chosen = chooseLabels(entries, { selfId: "self", selectedId: "sel", budget: 4, width: 1000 }).map(e => e.id);
  assert.deepEqual(chosen.slice(0, 2), ["self", "sel"], "pinned labels first, even beyond the distance cutoff");
  assert.ok(chosen.includes("near"));
  assert.equal(chosen.includes("clash"), false, "an overlapping tag is skipped");
  assert.equal(chosen.includes("off"), false);
  assert.equal(chosen.includes("beyond"), false);
  assert.ok(chosen.length <= 4);
});

test("phone guests get the courtyard crop, with a full-campus fallback", async () => {
  const baseUrl = "http://x/echo-campus/";
  const manifest = { url: baseUrl + "scenes/venue/venue-campus.glb", anchors: {} };
  const calls = [];
  const light = await loadVenueAsset({ id: "venue-campus", manifest, view: "event", baseUrl, light: true, importer: async input => { calls.push(input.url); return {}; } });
  assert.equal(light.venueAsset.light, true);
  assert.ok(calls[0].includes("venue-campus-court.glb"));
  let fallbacks = 0; calls.length = 0;
  const fallback = await loadVenueAsset({ id: "venue-campus", manifest, view: "event", baseUrl, light: true, onFallback: () => fallbacks++, importer: async input => { calls.push(input.url); if (input.url.includes("court")) throw new Error("404"); return {}; } });
  assert.equal(fallbacks, 1);
  assert.equal(fallback.venueAsset.url, manifest.url);
  calls.length = 0;
  await loadVenueAsset({ id: "venue-campus", manifest, view: "source", baseUrl, light: true, importer: async input => { calls.push(input.url); return {}; } });
  assert.deepEqual(calls, [manifest.url], "source inspection always uses the complete model");
  assert.ok(COURT_VARIANT.radius >= 60);
  const file = new URL("../public/scenes/venue/venue-campus-court.glb", import.meta.url);
  if (existsSync(file)) assert.equal(readFileSync(file).readUInt32LE(0), 0x46546c67, "court variant is a binary glTF");
});

test("ambient demo guests fill an empty courtyard but always yield to real arrivals", () => {
  const seeds = seedAttendees();
  const quiet = visibleSocialAttendees(seeds, { ambientCurated: 6 });
  assert.equal(quiet.length, DEMO_SOCIAL_PAIRS.flat().length + 6);
  const crowd = Array.from({ length: 40 }, (_, i) => ({ id: "guest-" + i, source: "demo-join" }));
  const busy = visibleSocialAttendees([...seeds, ...crowd], { ambientCurated: 6, maxRendered: 36 });
  assert.equal(busy.length, 36);
  assert.equal(busy.filter(p => p.source === "curated-demo").length, 0);
  assert.equal(new Set(seeds.map(s => s.persona)).size >= 10, true, "the demo crowd shows most of the roster");
});

test("phone sheet framing lifts the subject into the visible strip above the sheet", () => {
  const position = new THREE.Vector3(10, 0, 5);
  const project = (preset, aspect) => {
    const camera = new THREE.PerspectiveCamera(preset.fov, aspect, .05, 100);
    camera.position.fromArray(preset.position); camera.lookAt(new THREE.Vector3(...preset.target)); camera.updateMatrixWorld();
    return new THREE.Vector3(position.x, position.y + 1.45, position.z).project(camera);
  };
  const desktop = profileCameraPreset({ position, aspect: 16 / 9 });
  const phone = profileCameraPreset({ position, aspect: 390 / 844, sheetFraction: 0.62 });
  assert.ok(Math.abs(project(desktop, 16 / 9).y) < 0.45);
  const face = project(phone, 390 / 844);
  assert.ok(face.y > 0.5 && face.y < 1, `face sits above the sheet (ndc y ${face.y.toFixed(2)})`);
});

test("every persona has a model and portraits shipped with the build", () => {
  for (const persona of PERSONAS) {
    const definition = personaAssetDefinition(persona.id);
    assert.ok(definition.path.startsWith(`assets/personas/${persona.id}.glb`));
    const model = new URL(`../public/assets/personas/${persona.id}.glb`, import.meta.url);
    assert.ok(existsSync(model), persona.id + " model");
    const bytes = readFileSync(model);
    assert.equal(bytes.readUInt32LE(0), 0x46546c67);
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString("utf8"));
    assert.deepEqual(json.animations.map(a => a.name).sort(), ["Social-Agree", "Social-Clap", "Social-Greet_02", "Social-Standing_Relax"]);
    assert.equal(json.skins.length, 1);
    for (const kind of ["bust", "full"]) assert.ok(existsSync(new URL(`../public/assets/personas/portraits/${persona.id}-${kind}.webp`, import.meta.url)), `${persona.id} ${kind} portrait`);
  }
});
