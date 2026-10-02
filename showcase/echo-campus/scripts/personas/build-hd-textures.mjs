// node scripts/personas/build-hd-textures.mjs <sourceDir> [outDir]
// Close-up texture set per persona. The crowd GLBs carry 1K color + 512
// normal and a flat roughness; when the camera frames one persona (arrival,
// person card) the runtime swaps in 2K color, 1K normal and 1K roughness.
// Sources are the untouched 4K images of each rig GLB (same mesh and UVs as
// the crowd GLB): <id>-color.jpg, <id>-normal.png, <id>-orm.jpg. The two
// legacy hosts have no rig task; their 2K/1K images come from the premium GLBs.
import sharp from "sharp";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PERSONAS } from "../../src/shared/personas.mjs";

const [sourceDir, outDir = "public/assets/personas/hd"] = process.argv.slice(2);
if (!sourceDir) throw new Error("usage: build-hd-textures.mjs <sourceDir> [outDir]");
const LEGACY = Object.freeze({ qingliu: "public/assets/premium/host-female.glb", shazhou: "public/assets/premium/host-male.glb" });
mkdirSync(outDir, { recursive: true });

function glbImage(file, prefix) {
  const data = readFileSync(file);
  const jsonLength = data.readUInt32LE(12);
  const doc = JSON.parse(data.subarray(20, 20 + jsonLength).toString("utf8"));
  const image = (doc.images || []).find(item => (item.name || "").startsWith(prefix));
  if (!image) return null;
  const view = doc.bufferViews[image.bufferView], start = 20 + jsonLength + 8 + (view.byteOffset || 0);
  return data.subarray(start, start + view.byteLength);
}

function source(id, kind) {
  for (const ext of ["jpg", "png"]) {
    const file = join(sourceDir, `${id}-${kind}.${ext}`);
    if (existsSync(file)) return readFileSync(file);
  }
  if (LEGACY[id] && kind !== "orm") return glbImage(LEGACY[id], kind === "color" ? "Color_" : "NormalGL_");
  return null;
}

const manifest = { schema: "echo-persona-hd.v1", personas: {} };
for (const persona of PERSONAS) {
  const color = source(persona.id, "color"), normal = source(persona.id, "normal"), orm = source(persona.id, "orm");
  if (!color || !normal) throw new Error(`${persona.id}: missing color or normal source`);
  const outputs = {
    color: await sharp(color).resize(2048, 2048, { kernel: "lanczos3" }).webp({ quality: 86, effort: 5, smartSubsample: true }).toBuffer(),
    // 4:4:4 keeps the X/Y channels of the tangent-space normal independent.
    normal: await sharp(normal).removeAlpha().resize(1024, 1024, { kernel: "lanczos3" }).jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true }).toBuffer(),
  };
  // Tripo's ORM carries a flat white occlusion; its green roughness is real.
  // Remapped to 0.45–1.0 so warm key light never turns a jacket into a mirror.
  if (orm) outputs.roughness = await sharp(orm).extractChannel(1).linear(0.55, 115).resize(1024, 1024, { kernel: "lanczos3" }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const entry = {};
  for (const [kind, buffer] of Object.entries(outputs)) {
    const file = `${persona.id}-${kind}.${kind === "color" ? "webp" : "jpg"}`;
    writeFileSync(join(outDir, file), buffer);
    entry[kind] = { file, bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") };
  }
  manifest.personas[persona.id] = entry;
  console.log(persona.id, Object.entries(entry).map(([kind, value]) => `${kind} ${Math.round(value.bytes / 1024)}KB`).join(" · "));
}
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
