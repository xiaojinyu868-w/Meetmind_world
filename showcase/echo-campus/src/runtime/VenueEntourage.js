import * as THREE from "three";

const MANIFESTS = Object.freeze({ "venue-ab-canopy": "canopy-entourage.json", "venue-ab-towers": "towers-entourage.json" });

// Non-cryptographic identity guard for already audited decoded geometry.
// Normalize index width to uint32 so uint16/uint32 loaders produce the same hash.
export function entourageFingerprint(attribute, kind) {
  const bytes = new Uint8Array(4), view = new DataView(bytes.buffer);
  let hash = 2166136261;
  for (let i = 0; i < attribute.count; i++) {
    for (let k = 0; k < (kind === "position" ? 3 : 1); k++) {
      const value = k === 0 ? attribute.getX(i) : k === 1 ? attribute.getY(i) : attribute.getZ(i);
      if (kind === "position") view.setFloat32(0, value, true);
      else view.setUint32(0, value, true);
      for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Validate source-instance evidence before removing any face. */
export function validatedEntourageIndices(geometry, metadata) {
  const position = geometry?.attributes?.position, index = geometry?.index;
  if (!position || !index || position.count !== metadata.expectedVertexCount || index.count !== metadata.expectedTriangleCount * 3) {
    throw new Error("Entourage metadata does not match this decoded model");
  }
  const triangles = metadata.triangleIndices || [], ranges = metadata.triangleRanges || [];
  const boxes = metadata.boxes, pad = metadata.padMeters;
  if (!Array.isArray(triangles) || !Array.isArray(ranges) || !(triangles.length || ranges.length) ||
      !Array.isArray(boxes) || !boxes.length || !Number.isFinite(pad) || pad < 0 || pad > .02 ||
      boxes.some(box => !Array.isArray(box.min) || !Array.isArray(box.max) || box.min.length !== 3 || box.max.length !== 3 ||
        box.min.some((v, k) => !Number.isFinite(v) || !Number.isFinite(box.max[k]) || v > box.max[k]))) {
    throw new Error("Invalid entourage metadata");
  }
  const hasFingerprints = typeof metadata.positionFingerprint === "string" && typeof metadata.indexFingerprint === "string";
  if (ranges.length && !hasFingerprints) throw new Error("Whole-group removal requires decoded geometry fingerprints");
  if (hasFingerprints && (entourageFingerprint(position, "position") !== metadata.positionFingerprint ||
      entourageFingerprint(index, "index") !== metadata.indexFingerprint)) throw new Error("Entourage decoded geometry fingerprint mismatch");
  const excluded = new Set();
  const add = face => {
    if (!Number.isInteger(face) || face < 0 || face >= metadata.expectedTriangleCount || excluded.has(face)) throw new Error("Invalid entourage triangle index");
    const inside = boxes.some(box => [0, 1, 2].every(corner => {
      const v = index.getX(face * 3 + corner);
      return position.getX(v) >= box.min[0] - pad && position.getX(v) <= box.max[0] + pad &&
        position.getY(v) >= box.min[1] - pad && position.getY(v) <= box.max[1] + pad &&
        position.getZ(v) >= box.min[2] - pad && position.getZ(v) <= box.max[2] + pad;
    }));
    if (!inside) throw new Error("Entourage triangle escaped verified source-instance bounds");
    excluded.add(face);
  };
  for (const face of triangles) add(face);
  for (const range of ranges) {
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger) || range[0] < 0 || range[1] <= 0 || range[0] + range[1] > metadata.expectedTriangleCount) throw new Error("Invalid entourage triangle range");
    for (let face = range[0]; face < range[0] + range[1]; face++) add(face);
  }
  const kept = new index.array.constructor(index.count - excluded.size * 3);
  let write = 0;
  for (let face = 0; face < metadata.expectedTriangleCount; face++) if (!excluded.has(face)) {
    kept[write++] = index.getX(face * 3); kept[write++] = index.getX(face * 3 + 1); kept[write++] = index.getX(face * 3 + 2);
  }
  return kept;
}

/** Event-only index filtering of visually verified source entourage.
 * Every group must validate topology, decoded positions/indices and bounds
 * before any group is applied. Failure preserves all source geometry.
 */
export async function prepareVenueEntourage(modelRoot, { venueId, baseUrl = import.meta.env?.BASE_URL || "./", fetchImpl = fetch } = {}) {
  const diagnostics = { venueId, removedTriangles: 0, figures: 0, groups: 0, categories: {}, elapsedMs: 0, applied: false, error: null };
  const changes = [];
  let event = false, disposed = false;
  const result = {
    diagnostics,
    setEvent(enabled) {
      if (disposed) return;
      event = !!enabled;
      for (const c of changes) c.mesh.geometry = event ? c.eventGeometry : c.sourceGeometry;
      diagnostics.applied = event && changes.length > 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const c of changes) { c.mesh.geometry = c.sourceGeometry; c.eventGeometry.dispose(); }
      changes.length = 0; diagnostics.applied = false;
    },
  };
  if (!MANIFESTS[venueId]) return result;
  const started = performance.now();
  try {
    const response = await fetchImpl(baseUrl.replace(/\/?$/, "/") + "assets/premium/" + MANIFESTS[venueId]);
    if (!response.ok) throw new Error(`Entourage metadata HTTP ${response.status}`);
    const metadata = await response.json();
    if (!["echo-campus.venue-entourage.v1", "echo-campus.venue-entourage.v2"].includes(metadata.schema) || metadata.venueId !== venueId) throw new Error("Unexpected entourage metadata");
    const groups = metadata.schema.endsWith("v2") ? metadata.groups : [metadata];
    if (!Array.isArray(groups) || !groups.length) throw new Error("Empty entourage groups");
    const used = new Set(), figures = new Set();
    for (const group of groups) {
      if (metadata.schema.endsWith("v2") && (!group.positionFingerprint || !group.indexFingerprint)) throw new Error("Missing entourage geometry fingerprints");
      const meshes = [];
      modelRoot.traverse(o => {
        if (o.isMesh && (Array.isArray(o.material) ? o.material : [o.material]).some(m => m?.name === group.materialName) &&
            o.geometry?.attributes?.position?.count === group.expectedVertexCount && o.geometry?.index?.count === group.expectedTriangleCount * 3) meshes.push(o);
      });
      if (meshes.length !== 1 || used.has(meshes[0])) throw new Error("Could not uniquely match source entourage geometry");
      const mesh = meshes[0], sourceGeometry = mesh.geometry, kept = validatedEntourageIndices(sourceGeometry, group);
      used.add(mesh);
      const eventGeometry = new THREE.BufferGeometry();
      eventGeometry.name = sourceGeometry.name + " · event without source entourage";
      for (const [name, attribute] of Object.entries(sourceGeometry.attributes)) eventGeometry.setAttribute(name, attribute);
      eventGeometry.setIndex(new THREE.BufferAttribute(kept, 1));
      eventGeometry.boundingBox = sourceGeometry.boundingBox?.clone() || null; eventGeometry.boundingSphere = sourceGeometry.boundingSphere?.clone() || null;
      eventGeometry.userData = { ...sourceGeometry.userData, sourceEntourageFiltered: true };
      changes.push({ mesh, sourceGeometry, eventGeometry });
      const removed = (sourceGeometry.index.count - kept.length) / 3;
      diagnostics.removedTriangles += removed;
      if (group.category) diagnostics.categories[group.category] = (diagnostics.categories[group.category] || 0) + removed;
      for (const box of group.boxes) if ((!group.category || group.category === "human") && (!box.category || box.category === "human")) figures.add(box.node ?? figures.size);
    }
    diagnostics.figures = figures.size; diagnostics.groups = changes.length; result.setEvent(event);
  } catch (error) {
    for (const c of changes) c.eventGeometry.dispose();
    changes.length = 0;
    diagnostics.removedTriangles = 0; diagnostics.figures = 0; diagnostics.groups = 0; diagnostics.categories = {};
    diagnostics.error = error.message;
  }
  diagnostics.elapsedMs = Math.round((performance.now() - started) * 10) / 10;
  return result;
}
