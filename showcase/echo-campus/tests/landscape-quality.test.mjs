import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createLandscapeGrove } from "../src/scenes/EventGarden.js";
import { createLandscapeSite } from "../src/runtime/LandscapeSite.js";
import { createContextLandscape } from "../src/runtime/ContextLandscape.js";

function plane(name, minX, maxX, minZ, maxZ, y = 0) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    minX,y,minZ, maxX,y,minZ, maxX,y,maxZ,
    minX,y,minZ, maxX,y,maxZ, minX,y,maxZ,
  ], 3));
  const material = new THREE.MeshStandardMaterial(); material.name = name;
  return new THREE.Mesh(geometry, material);
}

test("balanced and mobile distant groves cut geometry while preserving full tree silhouettes", () => {
  const points = [{ x: 0, y: 0, z: 0, scale: 1 }, { x: 10, y: 3, z: 0, scale: 2 }];
  const results = Object.fromEntries(["cinema", "balanced", "low"].map(quality => [quality, createLandscapeGrove(points, { quality })]));
  try {
    const cinema = results.cinema.root.userData.landscapeGrove;
    const full = new THREE.Box3().setFromObject(results.cinema.root).getSize(new THREE.Vector3());
    for (const quality of ["balanced", "low"]) {
      const result = results[quality], stats = result.root.userData.landscapeGrove;
      assert.equal(stats.trees, points.length);
      assert.equal(stats.calls, 3, "Density tiers must not add material or per-tree calls");
      assert.ok(stats.triangles < cinema.triangles * (quality === "low" ? .30 : .50), `${quality}: measured triangles ${stats.triangles}`);
      const size = new THREE.Box3().setFromObject(result.root).getSize(new THREE.Vector3());
      for (const axis of ["x", "y", "z"]) {
        assert.ok(size[axis] >= full[axis] * .85 && size[axis] <= full[axis] * 1.2, `${quality} retains ${axis} silhouette`);
      }
      result.root.traverse(object => { if (object.isMesh) assert.equal(object.castShadow, false, "Distant leaf detail never enters the shadow pass"); });
    }
    console.log("landscape density tiers", JSON.stringify(Object.fromEntries(Object.entries(results).map(([quality, result]) => [quality, result.root.userData.landscapeGrove]))));
  } finally { Object.values(results).forEach(result => result.dispose()); }
});

test("lower site density keeps planting on both ground and elevated lawns", () => {
  const root = new THREE.Group();
  root.add(plane("Grass", -110, -20, -70, 70), plane("Grass2", 20, 110, -70, 70, 18));
  const config = {
    bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
    framingBounds: { minX: -70, maxX: 70, minZ: -20, maxZ: 40 },
  };
  for (const quality of ["low", "balanced", "cinema"]) {
    const result = createLandscapeSite(root, config, { quality });
    try {
      const { points, trees, triangles } = result.diagnostics;
      assert.ok(trees <= ({ low: 24, balanced: 40, cinema: 95 })[quality]);
      assert.ok(points.some(point => point.x < -20 && point.y < 1), "Keep real ground lawns");
      assert.ok(points.some(point => point.x > 20 && point.y > 18), "Keep real elevated lawns");
      assert.ok(points.some(point => point.z < -20) && points.some(point => point.z > 20), "Keep the depth of the landscape");
      assert.ok(triangles < ({ low: 40000, balanced: 110000, cinema: 530000 })[quality]);
      console.log("landscape site tier", quality, JSON.stringify({ trees, triangles }));
    } finally { result.dispose(); }
  }
});

test("context quality budgets retain distributed groves and enforce actual geometry limits", () => {
  const root = new THREE.Group(); root.add(plane("[Color A04]2", -120, 120, -120, 120));
  const config = { framingBounds: { minX: -10, maxX: 10, minY: -2, maxY: 20, minZ: -10, maxZ: 10 } };
  for (const quality of ["low", "balanced", "cinema"]) {
    const result = createContextLandscape(root, config, { quality });
    try {
      const stats = result.diagnostics;
      assert.ok(stats.trees <= ({ low: 28, balanced: 42, cinema: 88 })[quality]);
      assert.ok(stats.triangles <= stats.triangleBudget);
      assert.ok(stats.clusters >= 9, "Reduced density must retain several distributed groups");
      for (const axis of ["x", "z"]) assert.ok(stats.points.some(point => point[axis] < -25) && stats.points.some(point => point[axis] > 25), `Keep both sides of ${axis}`);
      console.log("context landscape tier", quality, JSON.stringify({ trees: stats.trees, clusters: stats.clusters, triangles: stats.triangles }));
    } finally { result.dispose(); }
  }
});
