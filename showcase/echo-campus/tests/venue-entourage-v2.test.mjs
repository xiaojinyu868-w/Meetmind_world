import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { entourageFingerprint, validatedEntourageIndices, prepareVenueEntourage } from "../src/runtime/VenueEntourage.js";

function fixture(name = "Shared architecture") {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0,1,0,.2,1,0,0,2,0,10,0,10,12,0,10,10,0,12], 3));
  geometry.setIndex([0,1,2,3,4,5]);
  const material = new THREE.MeshBasicMaterial(); material.name = name;
  const mesh = new THREE.Mesh(geometry, material);
  const group = { materialName: name, expectedVertexCount: 6, expectedTriangleCount: 2, padMeters: .02, triangleIndices: [0], boxes: [{ node: 1, category: "human", min: [0,1,0], max: [.2,2,0] }] };
  group.positionFingerprint = entourageFingerprint(geometry.attributes.position, "position");
  group.indexFingerprint = entourageFingerprint(geometry.index, "index");
  return { geometry, material, mesh, group };
}

test("v2 matches exact decoded content rather than geometry counts alone", () => {
  const a = fixture();
  assert.equal(validatedEntourageIndices(a.geometry, a.group).length, 3);
  a.geometry.attributes.position.setX(0, .01);
  assert.throws(() => validatedEntourageIndices(a.geometry, a.group), /fingerprint mismatch/);
  a.geometry.dispose(); a.material.dispose();
});

test("index fingerprints normalize storage width", () => {
  const a = new THREE.Uint16BufferAttribute([0,1,2,3], 1), b = new THREE.Uint32BufferAttribute([0,1,2,3], 1);
  assert.equal(entourageFingerprint(a, "index"), entourageFingerprint(b, "index"));
});

test("verified full foliage ranges require fingerprints and leave source index unchanged", () => {
  const a = fixture("fernleaf"), group = { ...a.group, category: "foliage", triangleIndices: [], triangleRanges: [[0,2]], boxes: [{ min: [0,0,0], max: [12,2,12] }] };
  assert.equal(validatedEntourageIndices(a.geometry, group).length, 0);
  assert.equal(a.geometry.index.count, 6);
  assert.throws(() => validatedEntourageIndices(a.geometry, { ...group, positionFingerprint: null }), /requires/);
  assert.throws(() => validatedEntourageIndices(a.geometry, { ...group, triangleRanges: [[0,3]] }), /range/);
  a.geometry.dispose(); a.material.dispose();
});

test("multiple audited groups switch and restore together, including towers", async () => {
  const a = fixture("People and facade"), b = fixture("fernleaf"), root = new THREE.Group(); root.add(a.mesh, b.mesh);
  const group = { ...b.group, category: "foliage", triangleIndices: [], triangleRanges: [[0,2]], boxes: [{ min: [0,0,0], max: [12,2,12] }] };
  let url;
  const metadata = { schema: "echo-campus.venue-entourage.v2", venueId: "venue-ab-towers", groups: [a.group, group] };
  const handle = await prepareVenueEntourage(root, { venueId: metadata.venueId, fetchImpl: async u => { url = u; return { ok: true, json: async () => metadata }; } });
  assert.ok(url.endsWith("towers-entourage.json")); assert.equal(handle.diagnostics.error, null);
  assert.equal(handle.diagnostics.removedTriangles, 3); assert.equal(handle.diagnostics.figures, 1);
  handle.setEvent(true); assert.equal(a.mesh.geometry.index.count, 3); assert.equal(b.mesh.geometry.index.count, 0);
  assert.equal(a.mesh.geometry.attributes.position, a.geometry.attributes.position);
  handle.setEvent(false); assert.equal(a.mesh.geometry, a.geometry); assert.equal(b.mesh.geometry, b.geometry);
  handle.setEvent(true); handle.dispose(); assert.equal(a.mesh.geometry, a.geometry); assert.equal(b.mesh.geometry, b.geometry);
  handle.setEvent(true); assert.equal(a.mesh.geometry, a.geometry);
  for (const f of [a,b]) { f.geometry.dispose(); f.material.dispose(); }
});

test("one mismatched group rejects all changes atomically", async () => {
  const a = fixture("People"), b = fixture("Foliage"), root = new THREE.Group(); root.add(a.mesh,b.mesh);
  const metadata = { schema: "echo-campus.venue-entourage.v2", venueId: "venue-ab-canopy", groups: [a.group, { ...b.group, indexFingerprint: "00000000" }] };
  const handle = await prepareVenueEntourage(root, { venueId: metadata.venueId, fetchImpl: async () => ({ ok: true, json: async () => metadata }) });
  assert.match(handle.diagnostics.error, /fingerprint mismatch/); assert.equal(handle.diagnostics.removedTriangles, 0);
  handle.setEvent(true); assert.equal(a.mesh.geometry, a.geometry); assert.equal(b.mesh.geometry, b.geometry);
  handle.dispose(); for (const f of [a,b]) { f.geometry.dispose(); f.material.dispose(); }
});

test("C remains unchanged when no source entourage is verified", async () => {
  const a = fixture(), root = new THREE.Group(); root.add(a.mesh);
  const handle = await prepareVenueEntourage(root, { venueId: "venue-c", fetchImpl: async () => { throw new Error("should not fetch"); } });
  handle.setEvent(true); assert.equal(handle.diagnostics.error, null); assert.equal(a.mesh.geometry, a.geometry);
  handle.dispose(); a.geometry.dispose(); a.material.dispose();
});
