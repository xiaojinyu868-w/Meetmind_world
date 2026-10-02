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
  const framed = { x0: 560, x1: 680, y0: 250, y1: 700 };
  const clear = chooseLabels(entries, { selfId: "self", selectedId: "sel", budget: 4, width: 1000, clear: [framed] }).map(e => e.id);
  assert.equal(clear.includes("near"), false, "no tag is drawn over a framed guest's body");
  assert.ok(clear.includes("far"), "tags elsewhere still fill the budget");
});

test("festoon poles stay on the court's edges, clear of furniture", async () => {
  const { planFestoon } = await import("../src/scenes/CourtDressing.js");
  const bounds = { minX: 155, maxX: 188, minZ: 78, maxZ: 94 };
  const colliders = [{ x: 167.4, z: 77.4, r: 0.6 }];
  const plan = planFestoon(bounds, colliders);
  assert.equal(plan.poles.length, plan.north.length + 2);
  for (const pole of plan.north) assert.ok(pole.z < bounds.minZ, "back row sits behind the court");
  for (const pole of plan.corners) assert.ok(pole.z > bounds.maxZ && (pole.x < bounds.minX + 2 || pole.x > bounds.maxX - 2), "front anchors sit at the outer corners");
  for (const pole of plan.poles) for (const c of colliders) assert.ok(Math.hypot(pole.x - c.x, pole.z - c.z) > c.r + 0.45, "pole nudged off a planter");
  const ends = plan.strands.flat();
  for (const pole of plan.poles) assert.ok(ends.includes(pole), "every pole carries a strand");
  assert.deepEqual(planFestoon(bounds, colliders), plan, "deterministic");
});

test("close-up textures exist for every persona and match the manifest", async () => {
  const { createHash } = await import("node:crypto");
  const manifest = JSON.parse(readFileSync(new URL("../public/assets/personas/hd/manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.schema, "echo-persona-hd.v1");
  for (const persona of PERSONAS) {
    const entry = manifest.personas[persona.id];
    assert.ok(entry?.color && entry?.normal, persona.id + " has color and normal");
    for (const item of Object.values(entry)) {
      const bytes = readFileSync(new URL(`../public/assets/personas/hd/${item.file}`, import.meta.url));
      assert.equal(bytes.length, item.bytes, item.file);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, item.file + " hash");
      assert.ok(bytes.length < 600 * 1024, item.file + " stays phone-sized");
    }
  }
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

test("the social floor never stacks two guests and agrees across devices", async () => {
  const { planSocialFloor, socialSlotFor } = await import("../src/runtime/SocialFloor.js");
  const { planEventGarden } = await import("../src/scenes/EventGarden.js");
  const { demoSocialPose } = await import("../src/scenes/SocialEnsemble.js");
  const manifest = JSON.parse(readFileSync(new URL("../public/scenes/venue/venue-campus.json", import.meta.url), "utf8"));
  const garden = planEventGarden(manifest, { venueId: "venue-campus", quality: "high" });
  const colliders = garden.items.map(p => ({ x: p.x, z: p.z, r: p.r }));
  const reserved = DEMO_SOCIAL_PAIRS.flat().map(id => demoSocialPose(id, "venue-campus", 0));
  const make = () => planSocialFloor({ bounds: manifest.bounds, focus: manifest.spawn, colliders, reserved });
  const plan = make();
  assert.deepEqual(make(), plan, "deterministic: every device computes the same slots");
  assert.ok(plan.slots.length >= 40, `capacity ${plan.slots.length}`);
  const b = manifest.bounds;
  for (const s of plan.slots) {
    assert.ok(s.x > b.minX && s.x < b.maxX && s.z > b.minZ && s.z < b.maxZ);
    for (const c of colliders) assert.ok(Math.hypot(s.x - c.x, s.z - c.z) >= c.r + 0.34, "clear of garden furniture");
    for (const r of reserved) assert.ok(Math.hypot(s.x - r.x, s.z - r.z) >= 1.1, "clear of the talking demo pairs");
  }
  const seeds = seedAttendees().filter(p => !DEMO_SOCIAL_PAIRS.flat().includes(p.id));
  const guests = Array.from({ length: 30 }, (_, i) => ({ id: "g" + i, serial: 16 + i, source: "demo-join" }));
  const placed = [];
  for (const person of [...seeds, ...guests]) {
    const slot = socialSlotFor(plan, person, placed);
    assert.ok(slot, person.id + " gets a slot");
    placed.push(slot);
  }
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) assert.ok(Math.hypot(placed[i].x - placed[j].x, placed[i].z - placed[j].z) >= 0.95, "no two avatars overlap");
  const first = socialSlotFor(plan, guests[0], []);
  const spawn = manifest.spawn;
  assert.ok(Math.hypot(first.x - spawn.x, first.z - spawn.z) < 4, "the first real guest stands at the heart of the court");
  assert.equal(socialSlotFor({ slots: [{ x: 0, y: 0, z: 0 }] }, guests[1], [{ x: 0, z: 0 }]), null, "a full floor returns no slot instead of stacking");
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
