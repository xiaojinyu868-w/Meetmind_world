import * as THREE from "three";
import { createLandscapeGrove } from "../scenes/EventGarden.js";

// Verified source material names, not a guess based on the current paint color.
const BARE_GROUND = new Set(["[Color A04]2"]);
const ROAD_OR_WATER = new Set(["[Color_005]", "[Color M05]", "[Water Sparkling]", "[Color A04]"]);
const CELL = 20;
const TAU = Math.PI * 2;

function hash(x, z, salt = 0) {
  let n = Math.imul(x ^ salt, 374761393) + Math.imul(z, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function heightAt(face, x, z) {
  const [a, b, c] = face.vertices;
  const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  if (Math.abs(d) < .00001) return null;
  const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d;
  const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d;
  if (u < -.00001 || v < -.00001 || u + v > 1.00001) return null;
  return u * a.y + v * b.y + (1 - u - v) * c.y;
}

function segmentDistanceSquared(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2;
}

function touches(face, x, z, radius) {
  if (heightAt(face, x, z) !== null) return true;
  return face.vertices.some((a, i) => segmentDistanceSquared(x, z, a, face.vertices[(i + 1) % 3]) <= radius * radius);
}

function indexFaces(faces, extent) {
  const cells = new Map();
  for (const face of faces) {
    const minX = Math.floor(Math.max(extent.minX, face.minX) / CELL), maxX = Math.floor(Math.min(extent.maxX, face.maxX) / CELL);
    const minZ = Math.floor(Math.max(extent.minZ, face.minZ) / CELL), maxZ = Math.floor(Math.min(extent.maxZ, face.maxZ) / CELL);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      const key = `${x},${z}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(face);
    }
  }
  return (x, z, radius = 0) => {
    const set = new Set();
    for (let i = Math.floor((x - radius) / CELL); i <= Math.floor((x + radius) / CELL); i++) {
      for (let j = Math.floor((z - radius) / CELL); j <= Math.floor((z + radius) / CELL); j++) {
        for (const face of cells.get(`${i},${j}`) || []) set.add(face);
      }
    }
    return set;
  };
}

/** Pure deterministic plan from the final source geometry in world coordinates.
 * Only the near-zero bare site surface is eligible. Road/water top triangles,
 * all other overhead surfaces, source edges and the complete building frame
 * are subtracted, including a full crown-sized clearance from their edges.
 */
export function planContextLandscape(modelRoot, config = {}, { quality = "high" } = {}) {
  const frame = config.framingBounds;
  const diagnostics = { trees: 0, clusters: 0, groundTriangles: 0, roadWaterTriangles: 0, obstructionTriangles: 0, candidatePoints: 0, points: [], warnings: [] };
  if (!frame || ![frame.minX, frame.maxX, frame.minZ, frame.maxZ].every(Number.isFinite)) {
    diagnostics.warnings.push("No calibrated building frame; context planting skipped.");
    return { points: [], diagnostics };
  }
  const reach = 125;
  const extent = { minX: frame.minX - reach, maxX: frame.maxX + reach, minZ: frame.minZ - reach, maxZ: frame.maxZ + reach };
  const ground = [], excluded = [];
  modelRoot.updateWorldMatrix(true, true);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3(), normal = new THREE.Vector3();
  modelRoot.traverse(object => {
    if (!object.isMesh || object.isSkinnedMesh || !object.geometry?.attributes?.position) return;
    const geometry = object.geometry, position = geometry.attributes.position, index = geometry.index;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const groups = Array.isArray(object.material)
      ? (geometry.groups.length ? geometry.groups : object.material.map((_, materialIndex) => ({ start: 0, count: index?.count ?? position.count, materialIndex })))
      : [{ start: 0, count: index?.count ?? position.count, materialIndex: 0 }];
    for (const group of groups) {
      const name = materials[group.materialIndex]?.name || "";
      const isGround = BARE_GROUND.has(name), isRoadWater = ROAD_OR_WATER.has(name);
      for (let i = group.start, end = Math.min(group.start + group.count, index?.count ?? position.count); i + 2 < end; i += 3) {
        a.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(object.matrixWorld);
        b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1).applyMatrix4(object.matrixWorld);
        c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2).applyMatrix4(object.matrixWorld);
        const minY = Math.min(a.y, b.y, c.y), maxY = Math.max(a.y, b.y, c.y);
        if (maxY < -.05 || (isGround && (minY < -.05 || maxY > .25))) continue;
        const minX = Math.min(a.x, b.x, c.x), maxX = Math.max(a.x, b.x, c.x), minZ = Math.min(a.z, b.z, c.z), maxZ = Math.max(a.z, b.z, c.z);
        if (maxX < extent.minX || minX > extent.maxX || maxZ < extent.minZ || minZ > extent.maxZ) continue;
        // The frame is an exclusion, so fully internal faces need no indexing.
        if (minX > frame.minX && maxX < frame.maxX && minZ > frame.minZ && maxZ < frame.maxZ) continue;
        normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
        const length = normal.length();
        if (length < .025 || Math.abs(normal.y) / length < (isGround ? .985 : .12)) continue;
        const face = { vertices: [a.clone(), b.clone(), c.clone()], minX, maxX, minZ, maxZ, minY, maxY, name };
        if (isGround) ground.push(face);
        else {
          excluded.push(face);
          if (isRoadWater) diagnostics.roadWaterTriangles++;
          else diagnostics.obstructionTriangles++;
        }
      }
    }
  });
  diagnostics.groundTriangles = ground.length;
  if (!ground.length) {
    diagnostics.warnings.push("No verified bare-ground material near y=0; context planting skipped.");
    return { points: [], diagnostics };
  }
  const groundAt = indexFaces(ground, extent), obstaclesAt = indexFaces(excluded, extent);
  const sampleGround = (x, z) => {
    let y = null;
    for (const face of groundAt(x, z)) { const value = heightAt(face, x, z); if (value !== null && (y === null || value > y)) y = value; }
    return y;
  };
  const candidates = [], gap = 9;
  for (let ix = Math.ceil(extent.minX / gap); ix <= Math.floor(extent.maxX / gap); ix++) {
    for (let iz = Math.ceil(extent.minZ / gap); iz <= Math.floor(extent.maxZ / gap); iz++) {
      const x = ix * gap + (hash(ix, iz, 81) - .5) * gap * .58, z = iz * gap + (hash(ix, iz, 123) - .5) * gap * .58;
      const scale = 1.85 + hash(ix, iz, 935) * .72, radius = scale * 1.95 + .7;
      if (x + radius > frame.minX - 3 && x - radius < frame.maxX + 3 && z + radius > frame.minZ - 3 && z - radius < frame.maxZ + 3) continue;
      const y = sampleGround(x, z);
      if (y === null) continue;
      // Continuous circle/triangle exclusion protects road edges, not just
      // the trunk's center; foliage cannot overhang an authored road/water.
      if ([...obstaclesAt(x, z, radius)].some(face => touches(face, x, z, radius))) continue;
      let supported = true;
      for (let j = 0; j < 12; j++) {
        const yy = sampleGround(x + Math.cos(j * TAU / 12) * radius, z + Math.sin(j * TAU / 12) * radius);
        if (yy === null || Math.abs(yy - y) > .08) { supported = false; break; }
      }
      if (!supported) continue;
      candidates.push({ x, y: y + .008, z, scale, yaw: hash(ix, iz, 335) * TAU, radius, rank: hash(ix, iz, 528) });
    }
  }
  candidates.sort((a, b) => a.rank - b.rank);
  diagnostics.candidatePoints = candidates.length;
  const centers = [];
  for (const point of candidates) {
    if (centers.every(center => Math.hypot(center.x - point.x, center.z - point.z) > 46)) centers.push(point);
    if (centers.length >= 13) break;
  }
  const points = [], used = new Set(), maxTrees = quality === "low" ? 50 : 88;
  // Round-robin grows several compact groves rather than exhausting the
  // earliest source triangle and forming one arbitrary wall of vegetation.
  const groups = centers.map(center => candidates.filter(p => Math.hypot(center.x - p.x, center.z - p.z) < 28).sort((a, b) => Math.hypot(center.x - a.x, center.z - a.z) - Math.hypot(center.x - b.x, center.z - b.z)));
  for (let ring = 0; ring < 10 && points.length < maxTrees; ring++) {
    for (let cluster = 0; cluster < groups.length && points.length < maxTrees; cluster++) {
      for (const point of groups[cluster]) {
        if (used.has(point)) continue;
        used.add(point);
        if (points.some(p => Math.hypot(p.x - point.x, p.z - point.z) < (p.radius + point.radius) * .77)) continue;
        const { rank, ...anchor } = point;
        points.push({ ...anchor, cluster, source: "[Color A04]2" });
        break;
      }
    }
  }
  diagnostics.trees = points.length;
  diagnostics.clusters = new Set(points.map(point => point.cluster)).size;
  diagnostics.points = points;
  return { points, diagnostics };
}

/** Returned vertices/anchors are world-space, matching LandscapeSite. Add the
 * root beside modelRoot in the same identity scene-space event container.
 * All source resources remain untouched; this layer owns its grove only.
 */
export function createContextLandscape(modelRoot, config = {}, { quality = "high" } = {}) {
  const started = performance.now();
  const { points, diagnostics } = planContextLandscape(modelRoot, config, { quality });
  let grove = createLandscapeGrove(points, { quality });
  // Enforce the contract against actual instanced triangle counts, not a
  // hand-maintained estimate, even if the shared tree kit grows later.
  while (grove.root.userData.landscapeGrove.triangles >= 500000 && points.length > 0) {
    const count = Math.max(0, Math.floor(points.length * 490000 / grove.root.userData.landscapeGrove.triangles));
    grove.dispose(); points.length = count; grove = createLandscapeGrove(points, { quality });
  }
  grove.root.name = "Context park on verified bare site ground";
  diagnostics.trees = points.length;
  diagnostics.clusters = new Set(points.map(point => point.cluster)).size;
  diagnostics.triangles = grove.root.userData.landscapeGrove.triangles;
  diagnostics.calls = grove.root.userData.landscapeGrove.calls;
  diagnostics.elapsedMs = Math.round((performance.now() - started) * 10) / 10;
  let disposed = false;
  return { root: grove.root, diagnostics, dispose() { if (disposed) return; disposed = true; grove.root.removeFromParent(); grove.dispose(); } };
}
