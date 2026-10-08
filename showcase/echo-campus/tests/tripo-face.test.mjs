// Tripo 角色的脸（src/runtime/TripoFace.js）：在合成的头上测朝向、头部顶点、正面投影、皮肤分类、眼睛/嘴的识别、
// 识别不到时 hasFace=false、画面形变只落在五官区域、眨眼节律与表情曲线。纯逻辑，不需要 three。
// 运行：node --test tests/tripo-face.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  headVertices, bindFrame, projectFront, atlasSampler, classifySkin, findFeatures, buildRig, detectFace, detectFaceSliced,
  renderFace, faceWarp, mouthShape, createBlinker, createFaceDriver, toLab, PROFILE_SAMPLES, PROFILE_ROWS, FACE_FRAGMENT_PARS,
} from "../src/runtime/TripoFace.js";

function seededRandom(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const HEAD = 24, NECK = 22;
const SKIN = [250, 226, 196], HAIR = [70, 52, 40], LASH = [34, 26, 30], IRIS = [120, 84, 60], WHITE = [252, 250, 246], LIP = [168, 72, 70];
const R = 0.09, C = [0.005, 0.9, 0];   // head sphere: centre (bind space, Tripo's 1 m body facing +x), radius

/**
 * A head like Tripo's: a UV sphere skinned to Head (plus a neck ring on another joint), facing +x, its front
 * half mapped to the left half of a 512² atlas by a planar projection and the back to the right half (hair).
 * `paint(z, y)` returns the colour of the face at bind-space (z, y) — the painted features.
 */
function syntheticHead(paint, { rings = 56, segments = 72, joints: jointOverride = null } = {}) {
  const positions = [], normals = [], uvs = [], skinIndex = [], skinWeight = [], indices = [];
  for (let r = 0; r <= rings; r++) {
    const phi = Math.PI * r / rings;
    for (let s = 0; s <= segments; s++) {
      const theta = 2 * Math.PI * s / segments;
      const nx = Math.sin(phi) * Math.cos(theta), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(theta);
      positions.push(C[0] + R * nx, C[1] + R * ny, C[2] + R * nz); normals.push(nx, ny, nz);
      const front = nx >= 0;
      uvs.push((front ? 0.25 : 0.75) + (-nz) * 0.24, 0.5 - ny * 0.48);
      skinIndex.push(HEAD, 0, 0, 0); skinWeight.push(1, 0, 0, 0);
    }
  }
  for (let r = 0; r < rings; r++) for (let s = 0; s < segments; s++) {
    const a = r * (segments + 1) + s, b = a + segments + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  // A neck ring on another joint: never part of the head.
  const base = positions.length / 3;
  for (let s = 0; s < 24; s++) { const t = 2 * Math.PI * s / 24; positions.push(C[0] + 0.04 * Math.cos(t), 0.78, 0.04 * Math.sin(t)); normals.push(Math.cos(t), 0, Math.sin(t)); uvs.push(0.9, 0.95); skinIndex.push(NECK, 0, 0, 0); skinWeight.push(1, 0, 0, 0); }
  for (let s = 0; s < 22; s++) indices.push(base + s, base + s + 1, base + s + 2);
  const W = 512, atlas = new Uint8ClampedArray(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const s = (x + 0.5) / W, t = (y + 0.5) / W;
    const i = (y * W + x) * 4;
    let rgb = HAIR;
    if (s < 0.5) {
      const nz = -(s - 0.25) / 0.24, ny = (0.5 - t) / 0.48;
      rgb = paint(C[2] + R * nz, C[1] + R * ny) || SKIN;
    }
    atlas[i] = rgb[0]; atlas[i + 1] = rgb[1]; atlas[i + 2] = rgb[2]; atlas[i + 3] = 255;
  }
  const joints = jointOverride || {
    Head: [0.008, 0.81, 0], Hip: [0, 0.5, 0], NeckTwist01: [0.008, 0.75, 0],
    L_Foot: [0, 0.04, -0.04], L_ToeBase: [0.03, 0.01, -0.04], R_Foot: [0, 0.04, 0.04], R_ToeBase: [0.03, 0.01, 0.04],
    L_Upperarm: [0, 0.77, -0.09], R_Upperarm: [0, 0.77, 0.09], L_Thigh: [0, 0.48, -0.05], R_Thigh: [0, 0.48, 0.05],
  };
  return {
    positions: new Float32Array(positions), normals: new Float32Array(normals), uvs: new Float32Array(uvs), indices: new Uint32Array(indices),
    skinIndex: new Float32Array(skinIndex), skinWeight: new Float32Array(skinWeight), count: positions.length / 3,
    joints, headJoint: HEAD, atlas: { data: atlas, width: W, height: W },
  };
}

// The painted face, in bind-space (z, y) around the head's centre. Her right eye is at +z (Tripo faces +x: +z is her right).
const EYE_Y = C[1] + 0.014, EYE_Z = 0.033, MOUTH_Y = C[1] - 0.036;
const inEllipse = (z, y, cz, cy, rz, ry) => ((z - cz) / rz) ** 2 + ((y - cy) / ry) ** 2 <= 1;
function eye(z, y, cz) {
  if (!inEllipse(z, y, cz, EYE_Y, 0.014, 0.008)) return null;
  if (y > EYE_Y + 0.0045) return LASH;                                   // the upper lash
  if (inEllipse(z, y, cz + 0.002, EYE_Y + 0.001, 0.0022, 0.0022)) return WHITE;   // catch-light
  if (inEllipse(z, y, cz, EYE_Y - 0.0005, 0.006, 0.0065)) return IRIS;
  return WHITE;
}
const hairline = (z, y) => (y > C[1] + 0.05 || Math.abs(z) > 0.072 ? HAIR : null);
const FACE = (z, y) => hairline(z, y) || eye(z, y, EYE_Z) || eye(z, y, -EYE_Z) || (inEllipse(z, y, 0, MOUTH_Y, 0.016, 0.0022) ? LIP : null);

test("朝向：由四肢左右线与脚尖确定 forward（Tripo 导出朝 +x），up 取 +y；没有脚尖用 hint", () => {
  const f = bindFrame({ Hip: [0, 0.5, 0], Head: [0.05, 0.81, 0], L_Foot: [0, 0.04, -0.04], L_ToeBase: [0.03, 0.01, -0.04], R_Foot: [0, 0.04, 0.04], R_ToeBase: [0.03, 0.01, 0.04], L_Upperarm: [0, 0.77, -0.09], R_Upperarm: [0, 0.77, 0.09] });
  assert.deepEqual(f.up, [0, 1, 0], "脊柱倾 9° 仍取 +y");
  assert.ok(f.forward[0] > 0.99, `forward ${f.forward}`);
  assert.ok(f.left[2] < -0.99, "她的左手在 -z");
  assert.equal(f.source, "limbs+toes");
  const back = bindFrame({ L_Foot: [0, 0, -0.04], L_ToeBase: [-0.03, 0, -0.04], R_Foot: [0, 0, 0.04], R_ToeBase: [-0.03, 0, 0.04], L_Upperarm: [0, 0.77, -0.09], R_Upperarm: [0, 0.77, 0.09] });
  assert.ok(back.forward[0] < -0.99, "脚尖朝 -x 就是朝 -x");
  const hinted = bindFrame({ L_Upperarm: [0, 0.77, 0.09], R_Upperarm: [0, 0.77, -0.09] }, { hint: [0, 0, 1] });
  assert.equal(hinted.source, "limbs+hint");
  assert.ok(Math.abs(hinted.forward[0]) > 0.99, "左右线在 z 上，forward 在 x 轴上（符号由 hint 定）");
});

test("头部顶点：Head 骨权重 ≥ 0.5 才算，脖子不算", () => {
  const h = syntheticHead(FACE);
  const mask = headVertices(h, [HEAD]);
  let head = 0; for (const v of mask) head += v;
  assert.equal(head, h.count - 24);
  const half = headVertices({ skinIndex: new Float32Array([HEAD, NECK, 0, 0, HEAD, NECK, 0, 0]), skinWeight: new Float32Array([0.6, 0.4, 0, 0, 0.3, 0.7, 0, 0]), count: 2 }, [HEAD]);
  assert.deepEqual([...half], [1, 0]);
});

test("正面投影 + 皮肤：画出正脸，脸颊是皮肤、眼睛和嘴不是", () => {
  const h = syntheticHead(FACE);
  const frame = bindFrame(h.joints);
  const front = projectFront({ ...h, mask: headVertices(h, [HEAD]), frame, origin: h.joints.Head, sample: atlasSampler(h.atlas), size: 256 });
  // Face-plane coordinates: u along her left (−z here), v up.
  const px = (z, y) => { const u = -(z - h.joints.Head[2]), v = y - h.joints.Head[1]; const x = Math.floor((u - front.box.u0) / front.box.span * front.size), yy = Math.floor((front.box.v1 - v) / front.box.span * front.size); return yy * front.size + x; };
  const at = (z, y) => { const i = px(z, y); return [...front.color.slice(i * 4, i * 4 + 4)]; };
  assert.equal(at(0, C[1])[3], 255, "头的正面有覆盖");
  const cheek = at(0.045, C[1] - 0.02), pupil = at(EYE_Z, EYE_Y - 0.002);
  assert.ok(Math.abs(cheek[0] - SKIN[0]) < 6 && Math.abs(cheek[2] - SKIN[2]) < 6, `脸颊 ${cheek}`);
  assert.ok(Math.abs(pupil[0] - IRIS[0]) < 30, `右眼（+z 在画面左边）${pupil}`);
  const skin = classifySkin(front);
  const lab = toLab(...SKIN), d = Math.hypot(skin.lab[0] - lab[0], skin.lab[1] - lab[1], skin.lab[2] - lab[2]);
  assert.ok(d < 3, `肤色 ΔE ${d.toFixed(2)}`);
  assert.equal(skin.mask[px(0.045, C[1] - 0.02)], 1);
  assert.equal(skin.mask[px(EYE_Z, EYE_Y - 0.002)], 0);
  assert.equal(skin.mask[px(0, MOUTH_Y)], 0);
});

test("识别：一对对称的眼睛 + 下方居中的嘴 → hasFace；位置落在画的地方", () => {
  const h = syntheticHead(FACE);
  const r = detectFace(h, { size: 256 });
  assert.equal(r.hasFace, true, r.reason);
  assert.ok(r.confidence.eyes > 0.6 && r.confidence.mouth > 0.5, JSON.stringify(r.confidence));
  const [right, left] = r.rig.eyes;   // image-left = her right eye (+z)
  const uOf = (z) => -(z - h.joints.Head[2]);   // left = -z
  assert.ok(Math.abs(right.cu - uOf(EYE_Z)) < 0.004, `右眼 u ${right.cu}`);
  assert.ok(Math.abs(left.cu - uOf(-EYE_Z)) < 0.004, `左眼 u ${left.cu}`);
  for (const e of r.rig.eyes) {
    assert.ok(Math.abs(e.cv - (EYE_Y - h.joints.Head[1])) < 0.004, `眼高 ${e.cv}`);
    assert.ok(Math.abs(e.hw - 0.014) < 0.004, `眼半宽 ${e.hw}`);
  }
  assert.ok(Math.abs(r.rig.mouth.cu) < 0.004, `嘴居中 ${r.rig.mouth.cu}`);
  assert.ok(Math.abs(r.rig.mouth.cv - (MOUTH_Y - h.joints.Head[1])) < 0.004, `嘴高 ${r.rig.mouth.cv}`);
  assert.equal(r.rig.profile.length, PROFILE_SAMPLES * PROFILE_ROWS.count * 4);
  // The eye point sits between the eyes on the face's surface (bind space).
  assert.ok(Math.abs(r.rig.eyePoint[1] - EYE_Y) < 0.004 && r.rig.eyePoint[0] > C[0] + R * 0.8, `eyePoint ${r.rig.eyePoint}`);
});

test("识别：眉毛在眼睛上方时仍选眼睛；刘海压住一只眼的睫毛也能找到，那只眼的上沿照另一只镜像", () => {
  const brow = (z, y) => (Math.abs(y - (EYE_Y + 0.02)) < 0.0018 && Math.abs(Math.abs(z) - EYE_Z) < 0.013 ? LASH : null);
  const withBrows = detectFace(syntheticHead((z, y) => hairline(z, y) || brow(z, y) || FACE(z, y)), { size: 256 });
  assert.equal(withBrows.hasFace, true, withBrows.reason);
  for (const e of withBrows.rig.eyes) assert.ok(Math.abs(e.cv - (EYE_Y - 0.81)) < 0.004, `选中的是眼睛不是眉毛（${e.cv.toFixed(4)}）`);
  // Mara's case: a lighter lock of bangs lies right on her right eye's lash, all the way up to the hairline.
  const BANGS = [138, 112, 90];
  const bangs = (z, y) => (z > EYE_Z - 0.016 && z < EYE_Z + 0.02 && y > EYE_Y + 0.0072 && y < C[1] + 0.06 ? BANGS : null);
  const withBangs = detectFace(syntheticHead((z, y) => hairline(z, y) || bangs(z, y) || FACE(z, y)), { size: 256 });
  assert.equal(withBangs.hasFace, true, withBangs.reason);
  const [right, left] = withBangs.rig.eyes;
  assert.ok(Math.abs(right.hh - left.hh) / left.hh < 0.3, `被刘海压住的眼睛高度 ${right.hh.toFixed(4)} ≈ 另一只 ${left.hh.toFixed(4)}`);
  assert.ok(withBangs.features.eyes.some((e) => e.mirrored), "上沿来自镜像");
});

test("识别不到就 hasFace=false：没有五官、只有一只眼、没有嘴、全是头发、贴图坏了", () => {
  const cases = {
    plain: (z, y) => hairline(z, y),
    oneEye: (z, y) => hairline(z, y) || eye(z, y, EYE_Z) || (inEllipse(z, y, 0, MOUTH_Y, 0.016, 0.0022) ? LIP : null),
    noMouth: (z, y) => hairline(z, y) || eye(z, y, EYE_Z) || eye(z, y, -EYE_Z),
    allHair: () => HAIR,
  };
  for (const [name, paint] of Object.entries(cases)) {
    const r = detectFace(syntheticHead(paint), { size: 256 });
    assert.equal(r.hasFace, false, `${name} 不该有脸（${r.reason}）`);
    assert.equal(r.rig, null);
  }
  const h = syntheticHead(FACE);
  assert.equal(detectFace({ ...h, atlas: null }).reason, "no-atlas", "贴图解不出来（self 3D 出过坏 JPEG）");
  assert.equal(detectFace({ ...h, headJoint: -1 }).reason, "no-head-joint");
  assert.equal(detectFace({ ...h, skinWeight: new Float32Array(h.count * 4) }).reason, "no-head");
});

test("形变：中性不改一个像素；闭眼后眼里没有眼白和虹膜；aa 张嘴；五官区域以外永远不变", () => {
  const h = syntheticHead(FACE);
  const r = detectFace(h, { size: 256 });
  assert.equal(r.hasFace, true, r.reason);
  const rig = r.rig, S = rig.size;
  const neutral = renderFace(rig, {});
  for (let i = 0; i < S * S; i++) for (let c = 0; c < 3; c++) assert.ok(Math.abs(neutral.data[i * 4 + c] - r.front.color[i * 4 + c]) <= 1, "中性 = 原图");
  const box = (e, k = 1) => { const px = rig.box.span / S; return { x0: Math.floor((e.cu - e.hw * k - rig.box.u0) / px), x1: Math.ceil((e.cu + e.hw * k - rig.box.u0) / px), y0: Math.floor((rig.box.v1 - e.cv - (e.hh ?? e.hw) * k) / px), y1: Math.ceil((rig.box.v1 - e.cv + (e.hh ?? e.hw) * k) / px) }; };
  const count = (img, b, test) => { let n = 0; for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { const i = (y * S + x) * 4; if (test(img.data[i], img.data[i + 1], img.data[i + 2])) n++; } return n; };
  const white = (r0, g, b) => g > 240 && b > 232;   // WHITE, never SKIN (226, 196)
  const dark = (r0, g, b) => r0 + g + b < 360;
  const closed = renderFace(rig, { blinkRight: 1, blinkLeft: 1 });
  for (const e of rig.eyes) {
    const b = box(e);
    assert.ok(count(neutral, b, white) > 20, "睁眼时有眼白");
    assert.equal(count(closed, b, white), 0, "闭眼后没有眼白");
    assert.ok(count(closed, b, dark) < count(neutral, b, dark) * 0.5, `闭眼后深色只剩一条线（${count(closed, b, dark)} / ${count(neutral, b, dark)}）`);
    assert.ok(count(closed, b, dark) > 4, "但那条线在");
  }
  const aa = renderFace(rig, mouthShape({ aa: 1 }));
  const mb = box({ ...rig.mouth, hh: rig.mouth.hw * 0.9 });
  assert.ok(count(aa, mb, dark) > count(neutral, mb, dark) * 2 + 20, `aa 张开（${count(aa, mb, dark)} vs ${count(neutral, mb, dark)}）`);
  // Outside the region the shader looks at, every state leaves the picture alone.
  const px = rig.box.span / S, reg = rig.region;
  for (const img of [closed, aa, renderFace(rig, { happy: 1, smile: 0.6, surprised: 1 })]) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = rig.box.u0 + (x + 0.5) * px, v = rig.box.v1 - (y + 0.5) * px;
      if (u >= reg.u0 && u <= reg.u1 && v >= reg.v0 && v <= reg.v1) continue;
      const i = (y * S + x) * 4;
      assert.ok(Math.abs(img.data[i] - neutral.data[i]) <= 1 && Math.abs(img.data[i + 2] - neutral.data[i + 2]) <= 1, `区域外 (${x},${y}) 变了`);
    }
  }
  // The warp never reads from outside the picture and never moves anything by more than ~a mouth width.
  const st = { over: [0, 0, 0, 0] };
  for (let k = 0; k < 400; k++) {
    const u = reg.u0 + (reg.u1 - reg.u0) * ((k * 37) % 100) / 100, v = reg.v0 + (reg.v1 - reg.v0) * ((k * 53) % 100) / 100;
    faceWarp(rig, { ...mouthShape({ aa: 1, oh: 0.5 }), blinkRight: 0.7, blinkLeft: 0.7, happy: 0.5, surprised: 0.5, smile: 0.5 }, u, v, px, st);
    assert.ok(Math.hypot(st.su - u, st.sv - v) < rig.mouth.hw * 1.2, "位移有界");
  }
});

test("分段识别：结果与一次做完相同", async () => {
  const h = syntheticHead(FACE);
  const once = detectFace(h, { size: 200 });
  const stages = [];
  const sliced = await detectFaceSliced(h, { size: 200, pause: async (s) => { stages.push(s); } });
  assert.deepEqual(stages, ["project", "skin", "features"]);
  assert.equal(sliced.hasFace, once.hasFace);
  assert.deepEqual([...sliced.rig.profile], [...once.rig.profile]);
});

test("眨眼：2–6 s 一次，20 s 内 ≥ 3 次，偶尔双眨，每次约 0.13 s 且 30 fps 能拍到闭合", () => {
  const random = seededRandom(7);
  const b = createBlinker(random);
  const dt = 1 / 30;
  let closedFrames = 0, starts = [], was = 0;
  for (let t = 0; t < 20; t += dt) { const w = b.update(dt); if (w > 0.95) closedFrames++; if (w > 0 && was === 0) starts.push(t); was = w; }
  assert.ok(b.state.count >= 3, `20 s 眨了 ${b.state.count} 次`);
  assert.ok(closedFrames >= b.state.count, "每次眨眼至少有一帧是闭上的");
  const gaps = starts.slice(1).map((t, i) => t - starts[i]);
  for (const g of gaps) assert.ok((g > 0.25 && g < 0.5) || (g >= 1.9 && g <= 6.3), `间隔 ${g.toFixed(2)}`);
  assert.ok(b.state.duration > 0.1 && b.state.duration < 0.16, `时长 ${b.state.duration}`);
  const long = createBlinker(seededRandom(3));
  for (let t = 0; t < 180; t += dt) long.update(dt);
  assert.ok(long.state.doubles >= 1, `3 分钟里有双眨（${long.state.doubles}）`);
});

test("表情：laugh 眼睛眯成弧并张嘴笑、look 先惊讶再微笑、viseme/blink 叠加", () => {
  const d = createFaceDriver({ random: seededRandom(1), blinker: { state: { count: 0, weight: 0, nextIn: 9 }, update: () => 0 } });
  const step = (s) => { let w; for (let t = 0; t < s; t += 1 / 60) w = d.update(1 / 60); return { ...w }; };
  d.setPose("laugh");
  const early = step(0.6);
  assert.ok(early.happy > 0.9, `笑 ${early.happy}`);
  let opens = 0; for (let i = 0; i < 60; i++) { const w = d.update(1 / 60); if (w.open > 0.3) opens++; }
  assert.ok(opens > 5 && opens < 60, `"哈"一开一合（${opens}/60）`);
  d.setPose("stand");
  assert.ok(step(2.5).happy < 0.05, "笑完回到平静");
  d.setPose("look");
  const flicker = step(0.2);
  assert.ok(flicker.surprised > 0.3, `回头那一下惊讶 ${flicker.surprised}`);
  const settle = step(1.5);
  assert.ok(settle.surprised < 0.05 && settle.happy > 0.25, JSON.stringify(settle));
  d.setPose("stand"); step(3);
  d.setViseme("aa", 1);
  assert.ok(step(0.02).open > 0.95, "aa 张到底");
  d.setViseme("aa", 0); d.setViseme("ee", 1);
  const ee = step(0.02);
  assert.ok(ee.wide > 0.8 && ee.open > 0.45 && ee.open < 0.8, JSON.stringify(ee));   // ee opens 0.4, eased out to 0.64
  d.setViseme("ee", 0); d.setViseme("aa", 0.3);
  assert.ok(Math.abs(step(0.02).open - 0.51) < 0.02, "说话常见的 0.3 显出张嘴（0.51）");
  d.setViseme("aa", 0);
  d.setViseme("ee", 0);
  d.setExpression("blink", 1);
  const shut = step(0.02);
  assert.equal(shut.blinkLeft, 1); assert.equal(shut.blinkRight, 1);
  d.setExpression("blink", 0); d.setExpression("blinkLeft", 1);
  const wink = step(0.02);
  assert.equal(wink.blinkLeft, 1); assert.equal(wink.blinkRight, 0);
});

test("口型形状：aa 张、oh/ou 圆、ih/ee 宽，全零闭嘴", () => {
  assert.deepEqual(mouthShape({}), { open: 0, round: 0, wide: 0 });
  const aa = mouthShape({ aa: 1 }), oh = mouthShape({ oh: 1 }), ou = mouthShape({ ou: 1 }), ee = mouthShape({ ee: 1 }), ih = mouthShape({ ih: 1 });
  assert.equal(aa.open, 1); assert.equal(aa.round, 0); assert.equal(aa.wide, 0);
  assert.ok(oh.round > 0.6 && ou.round > 0.9 && ou.open < oh.open);
  assert.ok(ee.wide > 0.8 && ih.wide > 0.9);
  assert.ok(FACE_FRAGMENT_PARS.includes(`#define FACE_ROWS ${PROFILE_ROWS.count}.0`), "着色器与 profile 行数一致");
});

test("性能：合成头 320² 的整套识别在 node 里 < 150 ms（热身后）", () => {
  const h = syntheticHead(FACE);
  detectFace(h);
  const t = performance.now();
  const r = detectFace(h);
  const ms = performance.now() - t;
  assert.equal(r.hasFace, true, r.reason);
  assert.ok(ms < 150, `${ms.toFixed(1)} ms`);
});

test("buildRig 的可变区域：头发永远不在里面", () => {
  const h = syntheticHead(FACE);
  const r = detectFace(h, { size: 256 });
  const { image, size } = r.rig;
  let hairMay = 0, hair = 0;
  for (let i = 0; i < size * size; i++) {
    if (r.front.color[i * 4 + 3] < 128) continue;
    const isHair = Math.abs(r.front.color[i * 4] - HAIR[0]) < 6 && Math.abs(r.front.color[i * 4 + 2] - HAIR[2]) < 6;
    if (!isHair) continue;
    hair++;
    if (image[i * 4 + 3] > 0) hairMay++;
  }
  assert.ok(hair > 1000);
  assert.ok(hairMay / hair < 0.02, `头发被标成可变 ${(hairMay / hair * 100).toFixed(1)}%`);
  assert.ok(findFeatures(r.front, classifySkin(r.front)).hasFace);
  assert.ok(buildRig(r.front, classifySkin(r.front), findFeatures(r.front, classifySkin(r.front))).eyes.length === 2);
});
