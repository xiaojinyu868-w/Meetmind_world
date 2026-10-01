// node scripts/personas/optimize-personas.mjs <blenderOutDir> public/assets/personas [normalDir]
// Drops rest-pose scale channels, restores Tripo's real normal map (the FBX
// retarget export points the normal slot at a color copy), then quantizes and
// meshopt-compresses geometry and animation (~1.58 MB -> ~0.65 MB per persona).
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, resample, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { existsSync, readdirSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";

const [inDir, outDir, normalDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const report = [];
for (const file of readdirSync(inDir).filter(f => f.endsWith(".glb"))) {
  const document = await io.read(join(inDir, file));
  const root = document.getRoot();
  let removed = 0, worst = 0;
  for (const animation of root.listAnimations()) {
    for (const channel of animation.listChannels()) {
      if (channel.getTargetPath() !== "scale") continue;
      const node = channel.getTargetNode(), rest = node.getScale(), values = channel.getSampler().getOutput().getArray();
      let delta = 0;
      for (let i = 0; i < values.length; i += 3) for (let k = 0; k < 3; k++) delta = Math.max(delta, Math.abs(values[i + k] - rest[k]));
      if (delta < 1e-4) { channel.dispose(); removed++; worst = Math.max(worst, delta); }
    }
  }
  // Recent Tripo FBX retargets point the normal slot at a copy of the color
  // texture; restore the rig GLB's real NormalGL map (same mesh and UVs).
  let normalFixed = false;
  const normalFile = normalDir && join(normalDir, basename(file, ".glb") + "-512.jpg");
  if (normalFile && existsSync(normalFile)) {
    for (const material of root.listMaterials()) {
      const texture = material.getNormalTexture();
      if (!texture) continue;
      const fixed = document.createTexture(basename(file, ".glb") + "-normal").setImage(readFileSync(normalFile)).setMimeType("image/jpeg");
      material.setNormalTexture(fixed);
      normalFixed = true;
    }
  }
  await document.transform(dedup(), resample({ tolerance: 1e-4 }), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const target = join(outDir, file);
  await io.write(target, document);
  const bytes = statSync(target).size;
  report.push({ file, before: statSync(join(inDir, file)).size, after: bytes, normalFixed, removedScaleChannels: removed, maxRestScaleDelta: worst, sha256: createHash("sha256").update(readFileSync(target)).digest("hex"), clips: root.listAnimations().map(a => a.getName()) });
  console.log(file, statSync(join(inDir, file)).size, "->", bytes, "scale channels removed", removed);
}
console.log(JSON.stringify(report));
