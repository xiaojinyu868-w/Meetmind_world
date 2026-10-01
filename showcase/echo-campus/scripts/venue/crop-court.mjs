// node scripts/venue/crop-court.mjs public/scenes/venue/venue-campus.glb public/scenes/venue/venue-campus-court.glb 171.34 86 90
// Keeps triangles whose world-space centroid lies within an XZ radius of the
// courtyard; everything else (far towers, interior furniture) is removed.
// Writes the .glb and its precompressed .gz sibling served to phone guests.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, dedup, meshopt, compactPrimitive } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { statSync, writeFileSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const [input, output, cxArg, czArg, radiusArg] = process.argv.slice(2);
const cx = Number(cxArg), cz = Number(czArg), radius = Number(radiusArg);
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(input);
const root = doc.getRoot();
let before = 0, after = 0;
const r2 = radius * radius;
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const m = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION"), idx = prim.getIndices();
    if (!pos || !idx) continue;
    const p = [0, 0, 0], world = i => { pos.getElement(i, p); return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; };
    const source = idx.getArray(), kept = [];
    for (let t = 0; t < source.length; t += 3) {
      const a = world(source[t]), b = world(source[t + 1]), c = world(source[t + 2]);
      const x = (a[0] + b[0] + c[0]) / 3 - cx, z = (a[1] + b[1] + c[1]) / 3 - cz;
      if (x * x + z * z <= r2) kept.push(source[t], source[t + 1], source[t + 2]);
    }
    before += source.length / 3; after += kept.length / 3;
    if (!kept.length) { prim.dispose(); continue; }
    const ArrayType = source.constructor;
    idx.setArray(new ArrayType(kept));
    compactPrimitive(prim);
  }
  if (!mesh.listPrimitives().length) { node.setMesh(null); mesh.dispose(); }
}
await doc.transform(prune(), dedup(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
await io.write(output, doc);
const bytes = statSync(output).size, gz = gzipSync(readFileSync(output), { level: 9 });
writeFileSync(output + ".gz", gz);
console.log(JSON.stringify({ trianglesBefore: before, trianglesAfter: after, bytes, gzipBytes: gz.length }));
