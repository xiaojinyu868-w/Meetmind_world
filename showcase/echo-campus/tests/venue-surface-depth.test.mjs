import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { applyVenueSurfaceDepth } from "../src/runtime/VenueSurfaceDepth.js";
import { loadVenueAsset } from "../src/runtime/VenueAsset.js";
import { disposeObjectResources } from "../src/runtime/SceneImporter.js";

function mesh(root, sourceVenue, material, geometry = new THREE.PlaneGeometry(2, 2)) {
  const object = new THREE.Mesh(geometry, material);
  object.userData.sourceVenue = sourceVenue;
  root.add(object);
  return object;
}
function named(name) { return new THREE.MeshStandardMaterial({ name }); }

test("depth bias matches both exact source and material names, without source inheritance", () => {
  const root = new THREE.Group();
  root.userData.sourceVenue = "venue-c-commercial-20230518";
  const stone = named("石材幕墙");
  const concrete = named("beton3");
  const c = mesh(root, "venue-c-commercial-20230518", stone);
  const t6 = mesh(root, "venue-ab-canopy", concrete);
  const wrongSource = mesh(root, "venue-ab-hub", stone);
  const missingSource = mesh(root, undefined, stone);
  const wrongCase = mesh(root, "venue-ab-canopy", named("Beton3"));
  const prefix = mesh(root, "venue-c-commercial-20230518", named("石材幕墙.001"));
  const crossSource = mesh(root, "venue-c-commercial-20230518", concrete);
  const unchanged = [wrongSource, missingSource, wrongCase, prefix, crossSource].map(object => object.material);
  const correction = applyVenueSurfaceDepth(root);
  assert.equal(correction.matchedMeshes, 2);
  assert.equal(correction.clonedMaterials, 2);
  assert.deepEqual(correction.rules, { "commercial-stone": 1, "canopy-concrete-base": 1 });
  assert.deepEqual([c.material.polygonOffset, c.material.polygonOffsetFactor, c.material.polygonOffsetUnits], [true, -1, -4]);
  assert.deepEqual([t6.material.polygonOffset, t6.material.polygonOffsetFactor, t6.material.polygonOffsetUnits], [true, 1, 4]);
  assert.deepEqual([wrongSource, missingSource, wrongCase, prefix, crossSource].map(object => object.material), unchanged);
  assert.equal(stone.polygonOffset, false);
  assert.equal(concrete.polygonOffset, false);
  correction.dispose();
  disposeObjectResources(root);
});

test("shared materials are cloned once per rule and material arrays remain intact", () => {
  const root = new THREE.Group();
  const stone = named("石材幕墙"), other = named("glass");
  const originalArray = [stone, other, stone];
  const a = mesh(root, "venue-c-commercial-20230518", originalArray);
  const b = mesh(root, "venue-c-commercial-20230518", stone);
  const unaffected = mesh(root, "venue-ab-hub", originalArray);
  let cloneCalls = 0;
  const clone = stone.clone.bind(stone);
  stone.clone = () => { cloneCalls++; return clone(); };
  const correction = applyVenueSurfaceDepth(root);
  assert.equal(cloneCalls, 1);
  assert.equal(correction.clonedMaterials, 1);
  assert.notEqual(a.material, originalArray);
  assert.equal(a.material[0], a.material[2]);
  assert.equal(a.material[0], b.material);
  assert.equal(a.material[1], other);
  assert.equal(unaffected.material, originalArray);
  assert.deepEqual(originalArray, [stone, other, stone]);
  correction.dispose();
  assert.equal(a.material, originalArray);
  assert.equal(b.material, stone);
  assert.equal(unaffected.material, originalArray);
  disposeObjectResources(root);
});

test("render adjustment preserves geometry, maps, color, visibility, and depth testing", () => {
  const root = new THREE.Group();
  const map = new THREE.Texture(), normalMap = new THREE.Texture();
  const original = new THREE.MeshStandardMaterial({
    name: "石材幕墙", map, normalMap, color: 0xcda87a, roughness: 0.62,
    metalness: 0.12, depthTest: true, depthWrite: true, side: THREE.DoubleSide,
  });
  const object = mesh(root, "venue-c-commercial-20230518", original);
  const geometry = object.geometry, position = geometry.getAttribute("position"), values = position.array.slice();
  object.visible = false;
  const correction = applyVenueSurfaceDepth(root);
  assert.equal(object.geometry, geometry);
  assert.equal(object.geometry.getAttribute("position"), position);
  assert.deepEqual(position.array, values);
  assert.equal(object.visible, false);
  assert.equal(object.material.map, map);
  assert.equal(object.material.normalMap, normalMap);
  for (const key of ["depthTest", "depthWrite", "side", "roughness", "metalness", "opacity", "transparent"]) assert.equal(object.material[key], original[key]);
  assert.ok(object.material.color.equals(original.color));
  correction.dispose();
  disposeObjectResources(root);
});

test("dispose restores originals first, releases only clones, and is idempotent", () => {
  const root = new THREE.Group(), original = named("beton3");
  const object = mesh(root, "venue-ab-canopy", original);
  const texture = new THREE.Texture(); original.map = texture;
  let originalDisposals = 0, textureDisposals = 0, geometryDisposals = 0, cloneDisposals = 0;
  original.addEventListener("dispose", () => originalDisposals++);
  texture.addEventListener("dispose", () => textureDisposals++);
  object.geometry.addEventListener("dispose", () => geometryDisposals++);
  const correction = applyVenueSurfaceDepth(root);
  object.material.addEventListener("dispose", () => {
    assert.equal(object.material, original);
    cloneDisposals++;
  });
  correction.dispose(); correction.dispose();
  assert.deepEqual([cloneDisposals, originalDisposals, textureDisposals, geometryDisposals], [1, 0, 0, 0]);
  disposeObjectResources(root);
  assert.deepEqual([cloneDisposals, originalDisposals, textureDisposals, geometryDisposals], [1, 1, 1, 1]);
});

test("campus importer wraps cleanup and exposes diagnostics in source and event views", async () => {
  for (const view of ["event", "source"]) {
    const root = new THREE.Group(), original = named("石材幕墙");
    const object = mesh(root, "venue-c-commercial-20230518", original);
    const calls = [];
    let imported;
    original.addEventListener("dispose", () => calls.push("original"));
    const result = await loadVenueAsset({
      id: "venue-campus", view, manifest: { url: "campus.glb" }, baseUrl: "https://example.test/",
      importer: async () => (imported = { root, dispose(marker) {
        assert.equal(this, imported);
        assert.equal(marker, "release");
        assert.equal(object.material, original);
        calls.push("importer");
        disposeObjectResources(root);
      } }),
    });
    assert.equal(result, imported);
    assert.equal(result.surfaceDepth.matchedMeshes, 1);
    object.material.addEventListener("dispose", () => calls.push("clone"));
    result.dispose("release"); result.dispose("release"); result.surfaceDepth.dispose();
    assert.deepEqual(calls, ["clone", "importer", "original"]);
  }
});

test("non-campus imports do not apply campus corrections", async () => {
  const root = new THREE.Group(), original = named("石材幕墙");
  const object = mesh(root, "venue-c-commercial-20230518", original);
  const dispose = () => {};
  const result = await loadVenueAsset({ id: "venue-c", view: "source", manifest: {}, importer: async () => ({ root, dispose }) });
  assert.equal(result.dispose, dispose);
  assert.equal(result.surfaceDepth, undefined);
  assert.equal(object.material, original);
  disposeObjectResources(root);
});
