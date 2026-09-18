import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { planContextLandscape, createContextLandscape } from "../src/runtime/ContextLandscape.js";

function face(name, points) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  const material = new THREE.MeshStandardMaterial({ color: 0x999999 });
  material.name = name;
  return new THREE.Mesh(geometry, material);
}

function fixture() {
  const root = new THREE.Group();
  // Verified bare site triangles surround a 20 m building frame.
  root.add(face("[Color A04]2", [[-120, 0, -120], [120, 0, -120], [120, 0, 120], [-120, 0, -120], [120, 0, 120], [-120, 0, 120]]));
  // A road strip has its own authored material and must remain empty of trees.
  root.add(face("[Color_005]", [[34, 0, -120], [50, 0, -120], [50, 0, 120], [34, 0, -120], [50, 0, 120], [34, 0, 120]]));
  return root;
}

const config = { framingBounds: { minX: -10, maxX: 10, minY: -2, maxY: 20, minZ: -10, maxZ: 10 } };

test("context anchors stay on verified zero-ground and outside source road", () => {
  const result = planContextLandscape(fixture(), config, { quality: "high" });
  assert.ok(result.points.length > 0);
  assert.ok(result.points.length <= 88);
  assert.ok(result.diagnostics.groundTriangles === 2);
  assert.ok(result.diagnostics.roadWaterTriangles > 0);
  for (const point of result.points) {
    assert.ok(Math.abs(point.y - .008) < 1e-5);
    assert.ok(point.x < 31 || point.x > 53, `tree crown overlaps road at ${point.x}`);
  }
  for (let i = 0; i < result.points.length; i++) for (let j = i + 1; j < result.points.length; j++) {
    assert.ok(Math.hypot(result.points[i].x - result.points[j].x, result.points[i].z - result.points[j].z) > 2);
  }
});

test("empty or uncalibrated source returns a truthful no-op", () => {
  const result = planContextLandscape(new THREE.Group(), config);
  assert.deepEqual(result.points, []);
  assert.ok(result.diagnostics.warnings.length > 0);
});

test("grove remains under 500k triangles and owns disposal", () => {
  const result = createContextLandscape(fixture(), config, { quality: "low" });
  assert.ok(result.diagnostics.trees <= 50);
  assert.ok(result.diagnostics.triangles < 500000);
  assert.ok(result.root.children.length > 0);
  result.dispose();
  result.dispose();
  assert.equal(result.root.children.length, 0);
});
