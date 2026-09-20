/**
 * Build event-only venue assets without touching the three delivered sources.
 * Run from showcase/echo-campus. Optional ECHO_GLTF_TOOLS points at node_modules
 * containing @gltf-transform/{core,extensions,functions}, draco3dgltf and meshoptimizer.
 * The source decoder is deliberately the exact decoder served to the browser.
 */
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { validatedEntourageIndices, entourageFingerprint } from "../src/runtime/VenueEntourage.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL_ROOT = process.env.ECHO_GLTF_TOOLS || "/root/.npm/_npx/a6797f7ff67bb1f2/node_modules";
const require = createRequire(import.meta.url);
const tool = relative => import(pathToFileURL(path.join(TOOL_ROOT, relative)).href);
const { NodeIO } = await tool("@gltf-transform/core/dist/index.js");
const { ALL_EXTENSIONS } = await tool("@gltf-transform/extensions/dist/index.js");
const { weldPrimitive, simplifyPrimitive, compactPrimitive, prune, draco, getBounds } = await tool("@gltf-transform/functions/dist/index.js");
const { MeshoptSimplifier } = await tool("meshoptimizer/index.js");
const draco3d = require(path.join(TOOL_ROOT, "draco3dgltf"));
await MeshoptSimplifier.ready;

const decoderPath = path.join(ROOT, "public/draco/draco_wasm_wrapper.js");
const wasm = await fs.readFile(path.join(ROOT, "public/draco/draco_decoder.wasm"));
const decoderSource = await fs.readFile(decoderPath, "utf8");
const mod = { exports: {} };
const sandbox = { module: mod, exports: mod.exports, require, __dirname: path.dirname(decoderPath), __filename: decoderPath, process, console, Buffer, TextDecoder, TextEncoder, WebAssembly, setTimeout, clearTimeout };
vm.runInNewContext(decoderSource, sandbox, { filename: decoderPath });
const decoder = await mod.exports({ wasmBinary: wasm });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "draco3d.decoder": decoder,
  "draco3d.encoder": await draco3d.createEncoderModule(),
});
const SHA = data => createHash("sha256").update(data).digest("hex");
const VENUES = [
  { id: "venue-ab-canopy", manifest: "canopy-entourage.json" },
  { id: "venue-ab-towers", manifest: "towers-entourage.json" },
  { id: "venue-c", manifest: null },
];
const selected = process.argv.slice(2);
const settings = { ratio: 0.55, error: 0.0001, lockBorder: true, chunkMeters: 96, minChunkTriangles: 32000, compressionMethod: "edgebreaker", encodeSpeed: 3, decodeSpeed: 5, quantizePosition: 18, quantizeNormal: 10, quantizeTexcoord: 12 };

function triangles(primitive) { return (primitive.getIndices()?.getCount() || primitive.getAttribute("POSITION").getCount()) / 3; }
function primitives(document) { return document.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives().map(primitive => ({ mesh, primitive }))); }
function summary(document) {
  const list = primitives(document);
  const scenes = document.getRoot().listScenes();
  return {
    triangles: list.reduce((n, x) => n + triangles(x.primitive), 0),
    vertices: list.reduce((n, x) => n + x.primitive.getAttribute("POSITION").getCount(), 0),
    primitiveCount: list.length,
    materialNames: [...new Set(list.map(x => x.primitive.getMaterial()?.getName() || "unnamed"))].sort(),
    bounds: scenes.map(scene => getBounds(scene)),
  };
}
function makeGeometry(primitive) {
  return new THREE.BufferGeometry()
    .setAttribute("position", new THREE.BufferAttribute(primitive.getAttribute("POSITION").getArray(), 3))
    .setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray(), 1));
}
function filterEntourage(document, metadata, sourceHash) {
  if (!metadata) return { manifest: null, validatedGroups: [], removedTriangles: 0 };
  if (metadata.modelSha256 && metadata.modelSha256 !== sourceHash) throw new Error("Source SHA-256 no longer matches audited entourage manifest");
  const list = primitives(document), changes = [], seen = new Set();
  for (const group of metadata.groups || [metadata]) {
    const matches = list.filter(({ primitive: p }) => p.getMaterial()?.getName() === group.materialName && p.getAttribute("POSITION").getCount() === group.expectedVertexCount && p.getIndices()?.getCount() === group.expectedTriangleCount * 3);
    if (matches.length !== 1 || seen.has(matches[0].primitive)) throw new Error(`Non-unique audited primitive: ${group.materialName}`);
    const { mesh, primitive } = matches[0], geometry = makeGeometry(primitive);
    const kept = validatedEntourageIndices(geometry, group);
    const proof = { materialName: group.materialName, category: group.category || "human", positionFingerprint: entourageFingerprint(geometry.attributes.position, "position"), indexFingerprint: entourageFingerprint(geometry.index, "index"), inputTriangles: triangles(primitive), removedTriangles: (geometry.index.count - kept.length) / 3, outputTriangles: kept.length / 3, verifiedBoxes: group.boxes.length };
    changes.push({ mesh, primitive, kept, proof }); seen.add(primitive);
  }
  // Validate every group before mutating even one index buffer.
  for (const { mesh, primitive, kept } of changes) {
    if (!kept.length) { mesh.removePrimitive(primitive); primitive.dispose(); }
    else { primitive.setIndices(primitive.getIndices().clone().setArray(kept)); compactPrimitive(primitive); }
  }
  return { validatedGroups: changes.map(c => c.proof), removedTriangles: changes.reduce((n, c) => n + c.proof.removedTriangles, 0) };
}
function boundsError(before, after) {
  let maximum = 0;
  for (let s = 0; s < before.length; s++) for (const edge of ["min", "max"]) for (let axis = 0; axis < 3; axis++) maximum = Math.max(maximum, Math.abs(before[s][edge][axis] - after[s][edge][axis]));
  return maximum;
}
function removeDegenerateFaces(document) {
  let removed = 0;
  for (const { primitive } of primitives(document)) {
    const pos = primitive.getAttribute("POSITION").getArray(), old = primitive.getIndices()?.getArray();
    if (!old) continue;
    const kept = [];
    for (let i = 0; i < old.length; i += 3) {
      const a = old[i] * 3, b = old[i + 1] * 3, c = old[i + 2] * 3;
      const ux = pos[b]-pos[a], uy=pos[b+1]-pos[a+1], uz=pos[b+2]-pos[a+2];
      const vx = pos[c]-pos[a], vy=pos[c+1]-pos[a+1], vz=pos[c+2]-pos[a+2];
      const areaSq = (uy*vz-uz*vy)**2 + (uz*vx-ux*vz)**2 + (ux*vy-uy*vx)**2;
      if (areaSq === 0) removed++;
      else kept.push(old[i], old[i+1], old[i+2]);
    }
    if (kept.length !== old.length) primitive.setIndices(primitive.getIndices().clone().setArray(new Uint32Array(kept)));
  }
  return removed;
}
function splitSpatial(document) {
  const audit = [];
  for (const { mesh, primitive } of [...primitives(document)]) {
    const count = triangles(primitive);
    if (count < settings.minChunkTriangles || primitive.listTargets().length) continue;
    const positions = primitive.getAttribute("POSITION").getArray(), indices = primitive.getIndices()?.getArray();
    if (!indices) continue;
    const cells = new Map();
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      const x = (positions[a] + positions[b] + positions[c]) / 3, z = (positions[a + 2] + positions[b + 2] + positions[c + 2]) / 3;
      const key = `${Math.floor(x / settings.chunkMeters)},${Math.floor(z / settings.chunkMeters)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(indices[i], indices[i + 1], indices[i + 2]);
    }
    if (cells.size < 2 || cells.size > 36) continue;
    for (const [cell, selectedIndices] of cells) {
      const chunk = primitive.clone().setName(`${primitive.getName() || mesh.getName() || "architecture"} cell ${cell}`);
      chunk.setIndices(primitive.getIndices().clone().setArray(new Uint32Array(selectedIndices)));
      compactPrimitive(chunk); mesh.addPrimitive(chunk);
    }
    const materialName = primitive.getMaterial()?.getName() || null;
    mesh.removePrimitive(primitive); primitive.dispose();
    audit.push({ materialName, inputTriangles: count, cells: cells.size, trianglesPreserved: [...cells.values()].reduce((n, a) => n + a.length / 3, 0) });
  }
  return audit;
}

for (const venue of VENUES.filter(v => !selected.length || selected.includes(v.id))) {
  const started = Date.now();
  const sourcePath = path.join(ROOT, "public/scenes/venue", `${venue.id}.glb`);
  const outputPath = path.join(ROOT, "public/scenes/venue", `${venue.id}-event.glb`);
  const input = await fs.readFile(sourcePath), sourceHash = SHA(input);
  console.log(`${venue.id}: decoding source with deployed browser decoder`);
  const doc = await io.readBinary(input), before = summary(doc);
  const metadata = venue.manifest ? JSON.parse(await fs.readFile(path.join(ROOT, "public/assets/premium", venue.manifest), "utf8")) : null;
  const entourage = filterEntourage(doc, metadata, sourceHash), filtered = summary(doc);
  console.log(`${venue.id}: filtered ${entourage.removedTriangles} audited entourage triangles`);
  const primitiveAudit = [];
  for (const { primitive } of primitives(doc)) {
    const n = triangles(primitive), materialName = primitive.getMaterial()?.getName();
    if (n >= 256) {
      weldPrimitive(primitive);
      simplifyPrimitive(primitive, { simplifier: MeshoptSimplifier, ratio: settings.ratio, error: settings.error, lockBorder: settings.lockBorder });
    }
    primitiveAudit.push({ materialName, before: n, after: triangles(primitive) });
  }
  const simplified = summary(doc);
  const missingMaterials = filtered.materialNames.filter(n => !simplified.materialNames.includes(n));
  if (missingMaterials.length) throw new Error(`Simplification lost building materials: ${missingMaterials}`);
  const simplificationBoundsDelta = boundsError(filtered.bounds, simplified.bounds);
  if (simplificationBoundsDelta > 0.05) throw new Error(`Bounds changed ${simplificationBoundsDelta} m`);
  const chunks = splitSpatial(doc), partitioned = summary(doc);
  if (partitioned.triangles !== simplified.triangles) throw new Error("Spatial partition changed triangle count");
  const zeroAreaFacesRemoved = removeDegenerateFaces(doc);
  await doc.transform(prune({ keepAttributes: true, keepLeaves: true, keepExtras: true }), draco({ method: settings.compressionMethod, encodeSpeed: settings.encodeSpeed, decodeSpeed: settings.decodeSpeed, quantizePosition: settings.quantizePosition, quantizeNormal: settings.quantizeNormal, quantizeTexcoord: settings.quantizeTexcoord, quantizationVolume: "scene" }));
  const exportReady = summary(doc);
  const output = await io.writeBinary(doc);
  const verified = summary(await io.readBinary(output));
  const missingExportMaterials = filtered.materialNames.filter(name => !verified.materialNames.includes(name));
  if (missingExportMaterials.length) throw new Error(`Export lost retained building materials: ${missingExportMaterials}`);
  console.log(JSON.stringify({ before: before.triangles, filtered: filtered.triangles, simplified: simplified.triangles, partitioned: partitioned.triangles, zeroAreaFacesRemoved, exportReady: exportReady.triangles, verified: verified.triangles }));
  if (verified.triangles !== exportReady.triangles) throw new Error("Export changed triangle count");
  const compressionBoundsDelta = boundsError(partitioned.bounds, verified.bounds);
  if (compressionBoundsDelta > 0.01) throw new Error(`Compression moved bounds ${compressionBoundsDelta} m`);
  const audit = { schema: "echo-campus.event-venue-audit.v1", venueId: venue.id, builtAt: new Date().toISOString(), source: { file: `${venue.id}.glb`, bytes: input.length, sha256: sourceHash }, output: { file: `${venue.id}-event.glb`, bytes: output.length, sha256: SHA(output) }, decoder: { wrapperSha256: SHA(decoderSource), wasmSha256: SHA(wasm), source: "public/draco (the deployed THREE decoder)" }, settings, entourage, before, filtered, simplified, partitioned, zeroAreaFacesRemoved, verified, primitiveAudit, chunks, simplificationBoundsDelta, compressionBoundsDelta, totalBoundsDelta: boundsError(before.bounds, verified.bounds), elapsedMs: Date.now() - started, notes: ["Original GLBs unchanged.", "Only audited entourage triangles removed. All remaining material groups, including M08 and M09, retained.", "Simplification is bounded by meshoptimizer error and topology; target ratio is not a guaranteed reduction.", "Spatial cells share the original local coordinate frame; no model or anchor transforms are changed.", "Runtime must skip original entourage manifests for this prefiltered asset."] };
  await fs.writeFile(outputPath, output);
  await fs.writeFile(outputPath.replace(/\.glb$/, ".audit.json"), JSON.stringify(audit, null, 2) + "\n");
  if (SHA(await fs.readFile(sourcePath)) !== sourceHash) throw new Error("Source changed during build");
  console.log(JSON.stringify({ venueId: venue.id, sourceTriangles: before.triangles, filteredTriangles: filtered.triangles, outputTriangles: verified.triangles, sourceBytes: input.length, outputBytes: output.length, sourcePrimitives: before.primitiveCount, outputPrimitives: verified.primitiveCount, boundsDeltaMeters: audit.totalBoundsDelta, elapsedMs: audit.elapsedMs }));
}

