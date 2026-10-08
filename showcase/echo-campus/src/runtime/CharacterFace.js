import { Color, DataTexture, LinearFilter, LinearMipmapLinearFilter, Matrix4, NoColorSpace, RGBAFormat, SRGBColorSpace, Vector3, Vector4 } from "three";

// TripoFace (≈ 45 kB) loads with the first face looked for, after the court is on screen.
let kit = null;
const loadKit = () => (kit ||= import("./TripoFace.js"));
// What TripoFace's installFace / createFaceTextures take from three, by name: passing the whole namespace would
// pull every three export into the bundle.
const THREE = Object.freeze({ Color, DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RGBAFormat, SRGBColorSpace, Vector3, Vector4 });

/**
 * Which personas get which part of the painted face. Each was looked at closed, half, smiling and talking
 * (docs/EXPERIENCE-DESIGN.md §6.1): bangs over the eyes and heavy frames break the lids, so those keep still eyes
 * and only talk. `skin` is the colour tolerance their detection needs. A persona not listed keeps a still face.
 */
export const FACE_SUPPORT = Object.freeze({
  shanhu: Object.freeze({ eyes: true, mouth: true }),
  qingpao: Object.freeze({ eyes: true, mouth: true }),
  shuangye: Object.freeze({ eyes: true, mouth: true }),
  zheshi: Object.freeze({ eyes: true, mouth: true }),
  baizao: Object.freeze({ eyes: true, mouth: true }),
  qingci: Object.freeze({ eyes: true, mouth: true }),
  shazhou: Object.freeze({ eyes: true, mouth: true }),
  qingliu: Object.freeze({ eyes: true, mouth: true, skin: 20 }),
  zhusha: Object.freeze({ eyes: false, mouth: true }),
  xiaoman: Object.freeze({ eyes: false, mouth: true }),
  mochuan: Object.freeze({ eyes: false, mouth: true, skin: 24 }),
});

/** Bind-space arrays, joint bind positions and atlas pixels of a Tripo body, as TripoFace.detectFace takes them. */
export function faceInput(mesh, headBone, atlas) {
  const g = mesh.geometry;
  const flat = (attr, n) => {
    if (!attr) return null;
    if (!attr.isInterleavedBufferAttribute && !attr.normalized && attr.itemSize === n && attr.array instanceof Float32Array) return attr.array;
    const out = new Float32Array(attr.count * n), get = [attr.getX, attr.getY, attr.getZ, attr.getW];
    for (let i = 0; i < attr.count; i++) for (let k = 0; k < n; k++) out[i * n + k] = get[k].call(attr, i);
    return out;
  };
  const count = g.attributes.position.count;
  const indices = g.index ? g.index.array : Uint32Array.from({ length: count }, (_, i) => i);
  // Through the bind-time matrix: an attached SkinnedMesh rewrites bindMatrixInverse every frame.
  const joints = {}, m = new Matrix4(), toGeometry = mesh.bindMatrix.clone().invert(), p = new Vector3();
  mesh.skeleton.bones.forEach((bone, i) => { m.copy(mesh.skeleton.boneInverses[i]).invert(); joints[bone.name] = p.setFromMatrixPosition(m).applyMatrix4(toGeometry).toArray(); });
  return {
    positions: flat(g.attributes.position, 3), uvs: flat(g.attributes.uv, 2), normals: flat(g.attributes.normal, 3), indices,
    skinIndex: flat(g.attributes.skinIndex, 4), skinWeight: flat(g.attributes.skinWeight, 4), count,
    joints, headJoint: mesh.skeleton.bones.indexOf(headBone), atlas,
  };
}

/**
 * RGBA pixels of a colour map (glTF images are not flipped: row 0 is v = 0), read at most `max` px wide — the face
 * picture is 320², and a 2K close-up map would cost a phone four times the read. Null when unreadable.
 */
export function atlasPixels(texture, max = 1024) {
  const image = texture?.image, iw = image?.width, ih = image?.height;
  if (!iw || !ih || typeof document === "undefined") return null;
  const k = Math.min(1, max / Math.max(iw, ih)), w = Math.round(iw * k), h = Math.round(ih * k);
  try {
    const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, w, h);
    return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
  } catch { return null; }
}

/** A repeatable 0..1 stream, so a guest blinks on the same rhythm on every screen. */
export function seededRandom(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const VOWELS = Object.freeze([["aa", 0.34], ["oh", 0.22], ["ee", 0.18], ["ih", 0.16], ["ou", 0.1]]);

/**
 * A talking mouth without a voice: syllables 0.16–0.26 s long, 3–7 to a run, a breath of 0.25–0.6 s between runs,
 * each with its own vowel and loudness. update(dt, talking) → { aa, ih, ou, ee, oh }; silence closes it softly.
 */
export function createBabble(random = Math.random) {
  const out = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  let t = 0, length = 0, vowel = "aa", loud = 0, run = 0, rest = 0;
  const pick = () => { let r = random(); for (const [name, share] of VOWELS) { r -= share; if (r <= 0) return name; } return "aa"; };
  function next() {
    if (run <= 0) run = 3 + Math.floor(random() * 5);
    run--; t = 0; length = 0.16 + random() * 0.1; vowel = pick(); loud = 0.45 + random() * 0.45;
  }
  return {
    out,
    update(dt, talking) {
      dt = Math.min(Math.max(Number(dt) || 0, 0), 0.1);
      const close = 1 - Math.exp(-dt * 16);
      if (!talking) { for (const k in out) out[k] += (0 - out[k]) * close; run = 0; length = 0; rest = 0; return out; }
      if (rest > 0) { rest -= dt; for (const k in out) out[k] += (0 - out[k]) * close; return out; }
      if (t >= length) {
        // The first syllable comes at once; a breath only between runs.
        if (length > 0 && run <= 0) { rest = 0.25 + random() * 0.35; length = 0; return out; }
        next();
      }
      t += dt;
      const level = loud * Math.pow(Math.sin(Math.PI * Math.min(1, t / length)), 0.7);
      for (const k in out) out[k] += ((k === vowel ? level : k === "aa" && vowel !== "aa" ? level * 0.35 : 0) - out[k]) * Math.min(1, dt * 30);
      return out;
    },
  };
}

const idle = () => new Promise(resolve => (typeof requestIdleCallback === "function" ? requestIdleCallback(() => resolve(), { timeout: 600 }) : setTimeout(resolve, 30)));

/**
 * Finds a model's face once, between frames. Resolves { status: "ready" | "none", reason, rig, textures, support, ms }.
 * `compile(material, mesh)` may precompile the face program off the frame before the first body wears it.
 */
export async function detectModelFace({ mesh, headBone, map, support, compile = null }) {
  if (!support) return { status: "none", reason: "not-listed" };
  if (!mesh?.isSkinnedMesh || !headBone || !map) return { status: "none", reason: "no-rig" };
  const face = await loadKit();
  await idle();
  const t0 = performance.now();
  const atlas = atlasPixels(map);
  if (!atlas) return { status: "none", reason: "no-atlas" };
  const input = faceInput(mesh, headBone, atlas);
  const read = performance.now() - t0;
  const result = await face.detectFaceSliced(input, { pause: idle, skinThreshold: support.skin || 16 });
  if (!result.hasFace) return { status: "none", reason: result.reason, confidence: result.confidence };
  const textures = face.createFaceTextures(THREE, result.rig);
  if (compile) {
    const probe = mesh.material.clone();
    probe.onBeforeCompile = mesh.material.onBeforeCompile; probe.customProgramCacheKey = mesh.material.customProgramCacheKey;
    face.installFace(THREE, probe, result.rig, { textures });
    try { await compile(probe, mesh); } catch { /* compiled on first use instead */ }
    probe.dispose();
  }
  return { status: "ready", reason: "ok", kit: face, rig: result.rig, textures, support, confidence: result.confidence, ms: { read: +read.toFixed(1), ...result.ms } };
}

/**
 * One body's face: a material of its own (the blink is per body) that keeps the shared material's maps — the
 * close-up textures arrive there — and the rhythm: blinks, the pose's expression, a talking mouth.
 * update(dt, { pose, talking }) once a frame; nothing changes until `face` is ready.
 */
export function createBodyFace({ mesh, random = Math.random }) {
  const babble = createBabble(random);
  let gpu = null, material = null, source = null, support = null, driver = null, forced = null;
  const weights = { blinkRight: 0, blinkLeft: 0, happy: 0, surprised: 0, open: 0, round: 0, wide: 0, smile: 0 };
  function install(face) {
    if (gpu || face?.status !== "ready" || !mesh) return false;
    source = mesh.material;
    material = source.clone();
    material.onBeforeCompile = source.onBeforeCompile; material.customProgramCacheKey = source.customProgramCacheKey;
    gpu = face.kit.installFace(THREE, material, face.rig, { textures: face.textures });
    driver = face.kit.createFaceDriver({ random });
    support = face.support;
    mesh.material = material;
    return true;
  }
  function follow() {
    if (material.map !== source.map || material.normalMap !== source.normalMap) Object.assign(material, { map: source.map, normalMap: source.normalMap });
    if (material.roughnessMap !== source.roughnessMap) Object.assign(material, { roughnessMap: source.roughnessMap, roughness: source.roughness, needsUpdate: true });
  }
  return {
    install,
    get installed() { return Boolean(gpu); },
    get weights() { return weights; },
    get driver() { return driver; },
    /** QA: hold these weights (blinkLeft … smile) instead of the rhythm; null lets it run again. */
    force(next = null) { forced = next ? { blinkRight: 0, blinkLeft: 0, happy: 0, surprised: 0, open: 0, round: 0, wide: 0, smile: 0, ...next } : null; },
    update(dt, { pose = "stand", talking = false } = {}) {
      if (!gpu) return;
      follow();
      driver.setPose(pose);
      const mouth = babble.update(dt, talking && support.mouth);
      for (const k in mouth) driver.setViseme(k, mouth[k]);
      Object.assign(weights, driver.update(dt), forced || {});
      if (!support.eyes) Object.assign(weights, { blinkRight: 0, blinkLeft: 0, happy: 0, surprised: 0 });
      if (!support.mouth) Object.assign(weights, { open: 0, round: 0, wide: 0, smile: 0 });
      gpu.set(weights);
    },
    dispose() {
      if (!gpu) return;
      if (mesh.material === material) mesh.material = source;
      material.dispose(); gpu.dispose(); gpu = null;
    },
  };
}
