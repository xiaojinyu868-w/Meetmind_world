import test from "node:test";
import assert from "node:assert/strict";
import { FACE_SUPPORT, createBabble, createBodyFace, seededRandom } from "../src/runtime/CharacterFace.js";
import { createFaceDriver } from "../src/runtime/TripoFace.js";
import { PERSONA_IDS } from "../src/shared/personas.mjs";

const DT = 1 / 60;
const total = mouth => Object.values(mouth).reduce((sum, value) => sum + value, 0);

function fakeMaterial(props = {}) {
  return { map: "map-1k", normalMap: "normal-1k", roughnessMap: null, roughness: 0.8, onBeforeCompile: null, customProgramCacheKey: null, disposed: false, ...props,
    clone() { const { clone, dispose, ...rest } = this; return fakeMaterial(rest); }, dispose() { this.disposed = true; } };
}
function fakeFace(support) {
  const gpu = { sets: [], set(w) { this.sets.push({ ...w }); }, dispose() {} };
  return { gpu, face: { status: "ready", support, rig: {}, textures: {}, kit: { installFace: () => gpu, createFaceDriver } } };
}

test("能力表：只登记真实存在的形象，眼睛 / 嘴是布尔，皮肤阈值在 16–30", () => {
  assert.ok(Object.keys(FACE_SUPPORT).length >= 8);
  for (const [id, support] of Object.entries(FACE_SUPPORT)) {
    assert.ok(PERSONA_IDS.includes(id), id);
    assert.equal(typeof support.eyes, "boolean");
    assert.equal(typeof support.mouth, "boolean");
    assert.ok(support.eyes || support.mouth, id);
    if (support.skin !== undefined) assert.ok(support.skin >= 16 && support.skin <= 30, id);
  }
});

test("无声说话：每秒约 4 个音节、成串之间换气，停下 0.4 s 内合上嘴", () => {
  const babble = createBabble(seededRandom(4));
  let peaks = 0, rising = false, last = 0, silent = 0, longestSilence = 0, loudest = 0;
  for (let i = 0; i < 6 / DT; i++) {
    const now = total(babble.update(DT, true));
    if (now > last + 1e-4) rising = true;
    else if (rising && now < last - 1e-4) { if (last > 0.25) peaks++; rising = false; }
    silent = now < 0.03 ? silent + DT : 0;
    longestSilence = Math.max(longestSilence, silent);
    loudest = Math.max(loudest, now); last = now;
  }
  assert.ok(peaks >= 14 && peaks <= 32, `${peaks} syllables in 6 s`);
  assert.ok(longestSilence >= 0.18, `a breath between runs (${longestSilence.toFixed(2)} s)`);
  assert.ok(loudest > 0.5 && loudest < 1.6);
  for (let i = 0; i < 0.4 / DT; i++) last = total(babble.update(DT, false));
  assert.ok(last < 0.01);
});

test("同一位来客在每块屏幕上眨眼节奏一样", () => {
  const a = seededRandom(7919 * 3 + 13), b = seededRandom(7919 * 3 + 13), c = seededRandom(7919 * 4 + 13);
  const sa = Array.from({ length: 8 }, a), sb = Array.from({ length: 8 }, b), sc = Array.from({ length: 8 }, c);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every(value => value >= 0 && value < 1));
});

test("只开口型的形象：眨眼、笑眼、惊讶始终为 0，说话和笑时嘴照常动", () => {
  const mesh = { material: fakeMaterial() };
  const body = createBodyFace({ mesh, random: seededRandom(2) });
  const { gpu, face } = fakeFace({ eyes: false, mouth: true });
  assert.equal(body.install(face), true);
  for (let i = 0; i < 12 / DT; i++) body.update(DT, { pose: i < 4 / DT ? "laugh" : "wave", talking: i > 6 / DT });
  assert.ok(gpu.sets.every(w => w.blinkLeft === 0 && w.blinkRight === 0 && w.happy === 0 && w.surprised === 0));
  assert.ok(gpu.sets.some(w => w.open > 0.3), "the mouth opens");
  assert.ok(gpu.sets.some(w => w.smile > 0.1), "a smile still reaches the mouth corners");
});

test("双全的形象 12 s 里至少眨 2 次；不说话时嘴是合上的", () => {
  const body = createBodyFace({ mesh: { material: fakeMaterial() }, random: seededRandom(9) });
  const { gpu, face } = fakeFace({ eyes: true, mouth: true });
  body.install(face);
  let blinks = 0, shut = false;
  for (let i = 0; i < 12 / DT; i++) {
    body.update(DT, { pose: "stand", talking: false });
    const closed = gpu.sets.at(-1).blinkLeft > 0.85;
    if (closed && !shut) blinks++;
    shut = closed;
  }
  assert.ok(blinks >= 2, `${blinks} blinks`);
  assert.ok(gpu.sets.every(w => w.open < 0.01));
});

test("每人一份材质：保留原材质的着色器，高清贴图换到共享材质上时跟着换，释放时还原", () => {
  const hook = () => {}, key = () => "rim";
  const source = fakeMaterial({ onBeforeCompile: hook, customProgramCacheKey: key });
  const mesh = { material: source };
  const body = createBodyFace({ mesh, random: seededRandom(1) });
  assert.equal(body.install({ status: "none" }), false);
  assert.equal(mesh.material, source);
  body.install(fakeFace({ eyes: true, mouth: true }).face);
  const own = mesh.material;
  assert.notEqual(own, source);
  assert.equal(own.onBeforeCompile, hook);
  assert.equal(own.customProgramCacheKey, key);
  Object.assign(source, { map: "map-2k", normalMap: "normal-2k", roughnessMap: "rough-1k", roughness: 1 });
  body.update(DT);
  assert.equal(own.map, "map-2k");
  assert.equal(own.normalMap, "normal-2k");
  assert.equal(own.roughnessMap, "rough-1k");
  assert.equal(own.needsUpdate, true);
  body.dispose();
  assert.equal(mesh.material, source);
  assert.equal(own.disposed, true);
});

test("QA 定格：force 的权重盖过节律，null 后恢复", () => {
  const body = createBodyFace({ mesh: { material: fakeMaterial() }, random: seededRandom(3) });
  const { gpu, face } = fakeFace({ eyes: true, mouth: false });
  body.install(face);
  body.force({ blinkLeft: 1, blinkRight: 1, open: 1 });
  body.update(DT);
  assert.equal(gpu.sets.at(-1).blinkLeft, 1);
  assert.equal(gpu.sets.at(-1).open, 0, "mouth stays shut where it is not supported");
  body.force(null);
  body.update(DT);
  assert.ok(gpu.sets.at(-1).blinkLeft < 1);
});
