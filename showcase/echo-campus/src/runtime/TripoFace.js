/**
 * The painted face of a Tripo character (sprint ten · A face).
 *
 * A Tripo body has no face rig — 41 biped bones, no blend shapes — and its eyes and mouth are painted into a 1024²
 * atlas cut into dozens of islands (one face spreads over several). So the face is found where it is whole — a
 * picture of the head seen straight from the front — and it is moved there too:
 *
 *   detectFace   head vertices (skin weight on Head) → the bind frame from the skeleton (toes ahead of the feet:
 *                checked, not trusted) → projectFront (the head's front surface rasterized into a 320² picture in
 *                face-plane coordinates, atlas colour per pixel) → classifySkin → findFeatures (a level, symmetric
 *                pair of non-skin blobs = the eyes, each refined column by column; a centred blob below = the
 *                mouth) → buildRig (profiles, lid and mouth colours, the picture with a "may change" mask).
 *                Nothing convincing → hasFace = false and the character stays exactly as it was.
 *   faceWarp     per face-plane point: where to read the front picture and what to paint over it — the upper lid
 *                carries the painted lash down over a flat lid, the lower lid rises (a smile's arcs), the jaw drops
 *                the lower lip and opens a gap (inside, tongue, teeth when the painting has none), the corners pull
 *                in for oh/ou and out for ih/ee. FACE_FRAGMENT is the same math in the material (installFace): no
 *                vertex moves, so nothing can tear. This copy renders previews and runs in the tests.
 *   createFaceDriver  the rhythm: blinks 2–6 s apart (doubles), the pose's expression curves, the visemes.
 *
 * Pure except installFace (which takes THREE): tests/tripo-face.test.mjs runs the rest on synthetic heads.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = (a) => Math.hypot(a[0], a[1], a[2]);
const normalize = (a) => { const l = length(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export const FACE_VERSION = 1;
/** Profile samples across each eye / the mouth (a 64 × 3 texture). */
export const PROFILE_SAMPLES = 64;
/** Where a blink meets, as a fraction of the eye's height from its lower edge: anime lids close low, in a ∪. */
export const CLOSE_AT = 0.32;
export const VISEMES = Object.freeze(["aa", "ih", "ou", "ee", "oh"]);
export const EXPRESSIONS = Object.freeze(["happy", "surprised", "blink", "blinkLeft", "blinkRight", "relaxed"]);

/* ---------- the head in bind space ---------- */

/** Vertices whose skin weight on `headJoints` sums to at least `minWeight` (skinIndex / skinWeight: 4 per vertex). */
export function headVertices({ skinIndex, skinWeight, count, stride = 4 }, headJoints, minWeight = 0.5) {
  const joints = new Set(headJoints);
  const mask = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    let w = 0;
    for (let k = 0; k < stride; k++) if (joints.has(skinIndex[i * stride + k])) w += skinWeight[i * stride + k];
    if (w >= minWeight) mask[i] = 1;
  }
  return mask;
}

/**
 * The body's axes in bind space from joint positions (name → [x, y, z]): up = +y (Tripo stands its models on y = 0,
 * 1 m tall; the hips → head line leans 3–8° on the test models, so it only overrules +y when it disagrees by > 35°);
 * forward square to up and to the left–right line of the limbs, its sign from feet → toes (or `hint` without toes).
 * Tripo exports its models facing +x; this confirms it per model.
 */
export function bindFrame(joints, { hint = [1, 0, 0] } = {}) {
  const J = (n) => joints[n] || null;
  const reject = (v, axis) => sub(v, scale(axis, dot(v, axis)));
  let up = [0, 1, 0];
  if (J("Hip") && J("Head")) { const spine = normalize(sub(J("Head"), J("Hip"))); if (dot(spine, up) < Math.cos(35 * Math.PI / 180)) up = spine; }
  let toes = [0, 0, 0], lateral = [0, 0, 0];
  for (const s of ["L_", "R_"]) if (J(s + "Foot") && J(s + "ToeBase")) toes = add(toes, sub(J(s + "ToeBase"), J(s + "Foot")));
  for (const n of ["Upperarm", "Forearm", "Thigh", "Calf", "Foot"]) if (J("L_" + n) && J("R_" + n)) lateral = add(lateral, sub(J("L_" + n), J("R_" + n)));
  toes = reject(toes, up); lateral = reject(lateral, up);
  const hasToes = length(toes) > 1e-5, hasLateral = length(lateral) > 1e-5;
  let forward, source;
  if (hasLateral) {
    forward = normalize(cross(normalize(lateral), up));
    const sign = hasToes ? toes : reject(hint, up);
    if (dot(forward, sign) < 0) forward = scale(forward, -1);
    source = hasToes ? "limbs+toes" : "limbs+hint";
  } else if (hasToes) { forward = normalize(toes); source = "toes"; }
  else { forward = normalize(reject(hint, up)); source = "hint"; }
  const left = normalize(cross(up, forward));
  return { up, forward, left, source, agreesWithHint: dot(forward, hint) > 0.7 };
}

const edge = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);

/**
 * The head's front surface as a picture: `size` × `size` pixels over a square box around the head in face-plane
 * coordinates. Pixel (x, y) covers u ∈ box.u0 + [x, x + 1] · px, v ∈ box.v1 − [y + 1, y] · px (px = span / size).
 * `sample(s, t, out)` writes the atlas colour (0–255 RGB) at a UV into `out`. Per pixel: colour (alpha 255 where the
 * head covers it), depth (toward the viewer; −Infinity where empty) and facing (the surface normal · forward).
 * Triangles facing away are skipped and the atlas is read once per visible pixel (≈ 20 ms for 320² in node).
 */
export function projectFront(options) { return runSteps(projectFrontSteps(options)); }
const runSteps = (steps) => { let s = steps.next(); while (!s.done) s = steps.next(); return s.value; };
/** projectFront in two slices: the rasterization, then the atlas reads. */
function* projectFrontSteps({ positions, uvs, normals = null, indices, mask, frame, origin, sample, size = 320, margin = 0.04 }) {
  const count = positions.length / 3;
  const pu = new Float32Array(count), pv = new Float32Array(count), pd = new Float32Array(count), pf = new Float32Array(count).fill(1);
  const { left, up, forward } = frame;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < count; i++) {
    if (!mask[i]) continue;
    const x = positions[i * 3] - origin[0], y = positions[i * 3 + 1] - origin[1], z = positions[i * 3 + 2] - origin[2];
    const u = x * left[0] + y * left[1] + z * left[2], v = x * up[0] + y * up[1] + z * up[2];
    pu[i] = u; pv[i] = v; pd[i] = x * forward[0] + y * forward[1] + z * forward[2];
    if (normals) pf[i] = normals[i * 3] * forward[0] + normals[i * 3 + 1] * forward[1] + normals[i * 3 + 2] * forward[2];
    if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
  }
  if (!(u1 > u0 && v1 > v0)) return null;
  const span = Math.max(u1 - u0, v1 - v0) * (1 + 2 * margin);
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const box = { u0: cu - span / 2, v1: cv + span / 2, span, size };
  const k = size / span, n = size * size;
  const depth = new Float32Array(n).fill(-Infinity), tri = new Int32Array(n).fill(-1), wA = new Float32Array(n), wB = new Float32Array(n);
  let triangles = 0;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];
    if (!mask[a] || !mask[b] || !mask[c]) continue;
    if (normals && pf[a] + pf[b] + pf[c] < -0.45) continue;   // the back of the head
    const ax = (pu[a] - box.u0) * k, ay = (box.v1 - pv[a]) * k;
    const bx = (pu[b] - box.u0) * k, by = (box.v1 - pv[b]) * k;
    const cx = (pu[c] - box.u0) * k, cy = (box.v1 - pv[c]) * k;
    const area = edge(ax, ay, bx, by, cx, cy);
    if (Math.abs(area) < 1e-9) continue;
    triangles++;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
    // Edge functions inlined as a·x + b·y + c (the loop runs cold, once per model).
    const inv = 1 / area;
    const ea = (cx - bx) * inv, eb = -(cy - by) * inv, ec = ((cy - by) * bx - (cx - bx) * by) * inv;   // wa = eb·px + ea·py + ec
    const fa = (ax - cx) * inv, fb = -(ay - cy) * inv, fc = ((ay - cy) * cx - (ax - cx) * cy) * inv;   // wb = fb·px + fa·py + fc
    const da = pd[a], db = pd[b], dc = pd[c];
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        const wa = eb * px + ea * py + ec, wb = fb * px + fa * py + fc, wc = 1 - wa - wb;
        if (wa < -1e-4 || wb < -1e-4 || wc < -1e-4) continue;
        const i = y * size + x;
        const d = wa * da + wb * db + wc * dc;
        if (d <= depth[i]) continue;
        depth[i] = d; tri[i] = t; wA[i] = wa; wB[i] = wb;
      }
    }
  }
  const color = new Uint8ClampedArray(n * 4), facing = normals ? new Float32Array(n) : null;
  const rgb = [0, 0, 0];
  const atlas = sample.atlas || null;   // atlasSampler's pixels: read inline, else through the callback
  const aw = atlas?.width || 0, ah = atlas?.height || 0, ad = atlas?.data || null;
  for (let i = 0; i < n; i++) {
    const t = tri[i];
    if (t < 0) continue;
    const a = indices[t], b = indices[t + 1], c = indices[t + 2], wa = wA[i], wb = wB[i], wc = 1 - wa - wb;
    const s = wa * uvs[a * 2] + wb * uvs[b * 2] + wc * uvs[c * 2], tt = wa * uvs[a * 2 + 1] + wb * uvs[b * 2 + 1] + wc * uvs[c * 2 + 1];
    if (ad) {
      let x = s * aw - 0.5, y = tt * ah - 0.5;
      if (x < 0) x = 0; else if (x > aw - 1) x = aw - 1;
      if (y < 0) y = 0; else if (y > ah - 1) y = ah - 1;
      const x0 = x | 0, y0 = y | 0, x1 = x0 + 1 < aw ? x0 + 1 : x0, y1 = y0 + 1 < ah ? y0 + 1 : y0, fx = x - x0, fy = y - y0;
      const i00 = (y0 * aw + x0) * 4, i10 = (y0 * aw + x1) * 4, i01 = (y1 * aw + x0) * 4, i11 = (y1 * aw + x1) * 4;
      for (let k = 0; k < 3; k++) {
        const top = ad[i00 + k] + (ad[i10 + k] - ad[i00 + k]) * fx, bottom = ad[i01 + k] + (ad[i11 + k] - ad[i01 + k]) * fx;
        color[i * 4 + k] = top + (bottom - top) * fy;
      }
    } else {
      sample(s, tt, rgb);
      color[i * 4] = rgb[0]; color[i * 4 + 1] = rgb[1]; color[i * 4 + 2] = rgb[2];
    }
    color[i * 4 + 3] = 255;
    if (facing) facing[i] = wa * pf[a] + wb * pf[b] + wc * pf[c];
  }
  return { size, box, head: { u0, u1, v0, v1 }, color, depth, facing, triangles, frame, origin };
}

/** Bilinear sampler over RGBA pixels (glTF UVs: t = 0 is the top row). */
export function atlasSampler({ data, width, height }) {
  return Object.assign((s, t, out) => {
    const x = clamp(s * width - 0.5, 0, width - 1), y = clamp(t * height - 0.5, 0, height - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
    const fx = x - x0, fy = y - y0;
    const i00 = (y0 * width + x0) * 4, i10 = (y0 * width + x1) * 4, i01 = (y1 * width + x0) * 4, i11 = (y1 * width + x1) * 4;
    for (let c = 0; c < 3; c++) {
      const top = data[i00 + c] + (data[i10 + c] - data[i00 + c]) * fx, bottom = data[i01 + c] + (data[i11 + c] - data[i01 + c]) * fx;
      out[c] = top + (bottom - top) * fy;
    }
    return out;
  }, { atlas: { data, width, height } });   // projectFront reads `.atlas` inline (same maths)
}

/* ---------- colour ---------- */

const srgbToLinear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const LINEAR = new Float32Array(256).map((_, i) => srgbToLinear(i));
// The Lab cube root from a 4097-entry table over [0, 1.1] (linear between entries, error < 1e-5): the pass converts
// ~100k pixels and Math.cbrt was most of the skin stage's 40 ms on a cold page.
const CBRT_N = 4096, CBRT_MAX = 1.1;
const CBRT = new Float32Array(CBRT_N + 1).map((_, i) => { const t = i / CBRT_N * CBRT_MAX; return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; });
const labF = (t) => { const x = clamp(t, 0, CBRT_MAX) / CBRT_MAX * CBRT_N, i = x | 0; return i >= CBRT_N ? CBRT[CBRT_N] : CBRT[i] + (CBRT[i + 1] - CBRT[i]) * (x - i); };
/** sRGB 0–255 → CIE L*a*b* (D65). */
export function toLab(r, g, b, out = [0, 0, 0]) {
  const R = LINEAR[clamp(r | 0, 0, 255)], G = LINEAR[clamp(g | 0, 0, 255)], B = LINEAR[clamp(b | 0, 0, 255)];
  const x = labF((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), y = labF(0.2126 * R + 0.7152 * G + 0.0722 * B), z = labF((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  out[0] = 116 * y - 16; out[1] = 500 * (x - y); out[2] = 200 * (y - z);
  return out;
}
const dist3 = (a, b, c) => Math.sqrt(a * a + b * b + c * c);
/** sRGB 0–255 → linear 0–1 (what a material's colour uniforms take). */
export const linearRGB = (rgb) => rgb.map((c) => LINEAR[clamp(Math.round(c), 0, 255)]);

/** L*a*b* of every covered pixel of a front picture, computed once (toLab inlined: this loop runs cold, once per model). */
function labOf(front) {
  if (front.lab) return front.lab;
  const n = front.size * front.size, L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  const c = front.color, scale = CBRT_N / CBRT_MAX;
  for (let i = 0; i < n; i++) {
    if (c[i * 4 + 3] < 128) continue;
    const R = LINEAR[c[i * 4]], G = LINEAR[c[i * 4 + 1]], Bl = LINEAR[c[i * 4 + 2]];
    let tx = (0.4124 * R + 0.3576 * G + 0.1805 * Bl) / 0.95047 * scale, ty = (0.2126 * R + 0.7152 * G + 0.0722 * Bl) * scale, tz = (0.0193 * R + 0.1192 * G + 0.9505 * Bl) / 1.08883 * scale;
    if (tx > CBRT_N - 1) tx = CBRT_N - 1; if (ty > CBRT_N - 1) ty = CBRT_N - 1; if (tz > CBRT_N - 1) tz = CBRT_N - 1;
    const ix = tx | 0, iy = ty | 0, iz = tz | 0;
    const fx = CBRT[ix] + (CBRT[ix + 1] - CBRT[ix]) * (tx - ix), fy = CBRT[iy] + (CBRT[iy + 1] - CBRT[iy]) * (ty - iy), fz = CBRT[iz] + (CBRT[iz + 1] - CBRT[iz]) * (tz - iz);
    L[i] = 116 * fy - 16; A[i] = 500 * (fx - fy); B[i] = 200 * (fy - fz);
  }
  front.lab = { L, A, B };
  return front.lab;
}

/**
 * The skin tone and which pixels are skin. The tone is the mode of the middle of the face (cheeks, nose, chin — hair
 * frames the face, so the middle's mode is skin on every model tried), refined twice by the mean of what lies within
 * ΔE 12 of it. A pixel is skin within ΔE `threshold` of the tone (painted blush and the baked shading stay inside).
 */
export function classifySkin(front, { threshold = 16, minFacing = 0.35 } = {}) {
  if (!front) return null;
  const { size, color, facing, head, box } = front;
  const n = size * size;
  const { L, A, B } = labOf(front);
  const px = (u) => (u - box.u0) / box.span * size, py = (v) => (box.v1 - v) / box.span * size;
  const hx0 = px(head.u0), hx1 = px(head.u1), hy0 = py(head.v1), hy1 = py(head.v0);
  const x0 = Math.max(0, Math.round(hx0 + (hx1 - hx0) * 0.3)), x1 = Math.min(size, Math.round(hx0 + (hx1 - hx0) * 0.7));
  const y0 = Math.max(0, Math.round(hy0 + (hy1 - hy0) * 0.5)), y1 = Math.min(size, Math.round(hy0 + (hy1 - hy0) * 0.85));
  const bins = new Uint32Array(4096);
  let candidates = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * size + x;
    if (color[i * 4 + 3] < 128 || (facing && facing[i] < minFacing)) continue;
    bins[(color[i * 4] >> 4) << 8 | (color[i * 4 + 1] >> 4) << 4 | (color[i * 4 + 2] >> 4)]++; candidates++;
  }
  if (candidates < 50) return null;
  let best = 0;
  for (let b = 1; b < bins.length; b++) if (bins[b] > bins[best]) best = b;
  let tone = [((best >> 8) & 15) * 16 + 8, ((best >> 4) & 15) * 16 + 8, (best & 15) * 16 + 8];
  const ref = [0, 0, 0];
  for (let pass = 0; pass < 2; pass++) {
    toLab(tone[0], tone[1], tone[2], ref);
    let r = 0, g = 0, b = 0, m = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = y * size + x;
      if (color[i * 4 + 3] < 128) continue;
      if (dist3(L[i] - ref[0], A[i] - ref[1], B[i] - ref[2]) > 12) continue;
      r += color[i * 4]; g += color[i * 4 + 1]; b += color[i * 4 + 2]; m++;
    }
    if (m) tone = [r / m, g / m, b / m];
  }
  toLab(tone[0], tone[1], tone[2], ref);
  const mask = new Uint8Array(n), distance = new Float32Array(n).fill(999);
  let inBox = 0;
  for (let i = 0; i < n; i++) {
    if (color[i * 4 + 3] < 128) continue;
    const d = dist3(L[i] - ref[0], A[i] - ref[1], B[i] - ref[2]);
    distance[i] = d;
    if (d < threshold && (!facing || facing[i] > 0)) mask[i] = 1;
  }
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (mask[y * size + x]) inBox++;
  return { tone: tone.map((c) => Math.round(c)), lab: [...ref], mask, distance, threshold, share: inBox / candidates };
}

/* ---------- blobs ---------- */

let STACK = new Int32Array(0);
/**
 * Connected components (8-neighbour) of `mask` (non-zero = in). Returns `labels` (0 = none, k = component k) and per
 * component: area, bounding box, centroid. `box` ({ x0, x1, y0, y1 }) limits where components may start — pass it
 * when the mask is empty outside it.
 */
export function components(mask, size, box = null) {
  const labels = new Int32Array(size * size);
  const list = [];
  if (STACK.length < size * size) STACK = new Int32Array(size * size);
  const stack = STACK;
  const bx0 = box ? Math.max(0, box.x0) : 0, bx1 = box ? Math.min(size - 1, box.x1) : size - 1;
  const by0 = box ? Math.max(0, box.y0) : 0, by1 = box ? Math.min(size - 1, box.y1) : size - 1;
  for (let scanY = by0; scanY <= by1; scanY++) for (let scanX = bx0; scanX <= bx1; scanX++) {
    const start = scanY * size + scanX;
    if (!mask[start] || labels[start]) continue;
    const id = list.length + 1;
    let top = 0; stack[top++] = start; labels[start] = id;
    let area = 0, sx = 0, sy = 0, x0 = size, x1 = -1, y0 = size, y1 = -1;
    while (top) {
      const i = stack[--top];
      const x = i % size, y = (i - x) / size;
      area++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= size) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= size || (!dx && !dy)) continue;
          const j = yy * size + xx;
          if (mask[j] && !labels[j]) { labels[j] = id; stack[top++] = j; }
        }
      }
    }
    list.push({ id, area, x0, x1, y0, y1, cx: sx / area, cy: sy / area, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return { labels, list };
}

/** The face's skin: the largest skin blob across the head's middle, and per row / column its extent (holes filled). */
function faceRegion(front, skin) {
  const { size } = front, n = size * size;
  const blobs = components(skin.mask, size);
  const midX = size / 2;
  let blob = null;
  for (const c of blobs.list) if (c.x0 <= midX && c.x1 >= midX && c.area > (blob?.area || 0)) blob = c;
  if (!blob || blob.area < n * 0.02) return null;
  const rowL = new Int32Array(size).fill(size), rowR = new Int32Array(size).fill(-1), colT = new Int32Array(size).fill(size), colB = new Int32Array(size).fill(-1);
  for (let i = 0; i < n; i++) {
    if (blobs.labels[i] !== blob.id) continue;
    const x = i % size, y = (i - x) / size;
    if (x < rowL[y]) rowL[y] = x; if (x > rowR[y]) rowR[y] = x; if (y < colT[x]) colT[x] = y; if (y > colB[x]) colB[x] = y;
  }
  return { blob, rowL, rowR, colT, colB };
}

/**
 * Three ways to cut eye candidates out of the face, because hair touches eyes differently on every model:
 * "holes" (non-skin enclosed by face skin in its row and its column), "open" (enclosed in its row, skin below — bangs
 * resting on the lash break the column test), "dark" (darker than skin by ΔL* 45 — lash and pupil, never the white).
 */
function eyeCandidates(front, skin, region) {
  const { size, color } = front, n = size * size;
  const { L } = labOf(front);
  const { blob, rowL, rowR, colT, colB } = region;
  const holes = new Uint8Array(n), open = new Uint8Array(n), dark = new Uint8Array(n);
  const darkL = skin.lab[0] - 45;
  for (let y = blob.y0; y <= blob.y1; y++) for (let x = Math.max(0, rowL[y]); x <= Math.min(size - 1, rowR[y]); x++) {
    const i = y * size + x;
    if (color[i * 4 + 3] < 128 || skin.mask[i] || y > colB[x]) continue;
    open[i] = 1;
    if (y >= colT[x]) holes[i] = 1;
    if (L[i] < darkL) dark[i] = 1;
  }
  return [["holes", holes], ["open", open], ["dark", dark]].map(([name, mask]) => ({ name, ...components(mask, size, blob) }));
}

/** Bright, low-chroma pixels (sclera, catch-lights) around a blob: eyes have them, brows and hair locks do not. */
function whitesNear(front, skin, b) {
  const { size, color } = front, { L, A, B } = labOf(front);
  const mx = Math.round(b.w * 0.3), my = Math.round(b.h * 0.3);
  let white = 0, all = 0;
  for (let y = Math.max(0, b.y0 - my); y <= Math.min(size - 1, b.y1 + my); y++) for (let x = Math.max(0, b.x0 - mx); x <= Math.min(size - 1, b.x1 + mx); x++) {
    const i = y * size + x;
    if (color[i * 4 + 3] < 128) continue;
    all++;
    if (L[i] > Math.min(92, skin.lab[0] + 1) && A[i] * A[i] + B[i] * B[i] < 196) white++;
  }
  return all ? white / all : 0;
}

/** The best level, alike, spaced pair of blobs straddling the face's middle in its upper half. */
function pickEyePair(front, skin, region, sets) {
  const { blob: face, rowL, rowR } = region;
  const faceW = face.w, faceH = face.h;
  const pairs = [];
  for (const set of sets) {
    const blobs = set.list.filter((c) => c.area >= Math.max(6, faceW * faceH * 0.0012) && c.h >= 2 && c.w >= 3);
    for (let a = 0; a < blobs.length; a++) for (let b = a + 1; b < blobs.length; b++) {
      const [l, r] = blobs[a].cx < blobs[b].cx ? [blobs[a], blobs[b]] : [blobs[b], blobs[a]];
      const spacing = r.cx - l.cx;
      if (spacing < faceW * 0.18 || spacing > faceW * 0.62) continue;
      if (l.x1 >= r.x0) continue;
      const level = Math.abs(l.cy - r.cy) / spacing;
      if (level > 0.12) continue;
      const ratio = Math.max(l.area, r.area) / Math.min(l.area, r.area);
      if (ratio > 2.6) continue;
      const cy = (l.cy + r.cy) / 2, cx = (l.cx + r.cx) / 2;
      const rel = (cy - face.y0) / faceH;
      if (rel < 0.08 || rel > 0.55) continue;
      const row = clamp(Math.round(cy), 0, rowL.length - 1), rowWidth = rowR[row] - rowL[row];
      if (rowWidth <= 0) continue;
      const off = Math.abs(cx - (rowL[row] + rowR[row]) / 2) / rowWidth;
      if (off > 0.12) continue;
      const whites = Math.min(1, (whitesNear(front, skin, l) + whitesNear(front, skin, r)) / 2 / 0.06);
      const size = Math.min(1, (l.area + r.area) / (faceW * faceH * 0.02));
      const score = (1 - level / 0.12) * 0.2 + (1 - (ratio - 1) / 1.6) * 0.2 + (1 - off / 0.12) * 0.2 + size * 0.2 + whites * 0.2;
      pairs.push({ l, r, set, score, spacing, cx, cy, level, ratio, off, whites });
    }
  }
  if (!pairs.length) return null;
  const top = Math.max(...pairs.map((p) => p.score));
  // Brows over eyes make two good pairs: take the lowest of the near-best (eyes sit under brows, never over).
  return pairs.filter((p) => p.score >= top - 0.12).sort((a, b) => b.cy - a.cy)[0];
}

/** y = c0 + c1·t + c2·t² through (t, y) by least squares; null when degenerate. */
function fitQuadratic(ts, ys) {
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, y0 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < ts.length; i++) { const t = ts[i], t2 = t * t; s0++; s1 += t; s2 += t2; s3 += t2 * t; s4 += t2 * t2; y0 += ys[i]; y1 += ys[i] * t; y2 += ys[i] * t2; }
  const m = [[s0, s1, s2], [s1, s2, s3], [s2, s3, s4]], v = [y0, y1, y2];
  const det3 = (a) => a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const d = det3(m);
  if (Math.abs(d) < 1e-9) return null;
  const col = (k) => m.map((row, i) => row.map((x, j) => (j === k ? v[i] : x)));
  const c = [det3(col(0)) / d, det3(col(1)) / d, det3(col(2)) / d];
  return (t) => c[0] + c[1] * t + c[2] * t * t;
}

/** A robust profile: raw where the column is trustworthy and near the fit, the fit elsewhere. */
function robustProfile(cols, key, okKey, halfW, cx, tolerance) {
  let use = cols.filter((c) => c[okKey]);
  if (use.length < 5) use = cols;
  let fit = fitQuadratic(use.map((c) => (c.x - cx) / halfW), use.map((c) => c[key]));
  if (fit) {
    const kept = use.filter((c) => Math.abs(c[key] - fit((c.x - cx) / halfW)) <= tolerance);
    if (kept.length >= 5 && kept.length < use.length) fit = fitQuadratic(kept.map((c) => (c.x - cx) / halfW), kept.map((c) => c[key])) || fit;
  }
  return cols.map((c) => {
    if (!fit) return c[key];
    const f = fit((c.x - cx) / halfW);
    return c[okKey] && Math.abs(c[key] - f) <= tolerance ? c[key] : f;
  });
}

/**
 * One eye, column by column inside a window around its seed: per column the run of non-skin pixels that holds the
 * seed; its top is trusted where skin sits right above it (bangs or a brow merged into the lash are not), the rest
 * comes from a quadratic through the trusted columns. Also: the lash's thickness (the darkest run from the top), the
 * lid colours (skin just above / below), the depth.
 */
function refineEye(front, skin, seed, labels, spacing) {
  const { size, color, depth } = front, { L } = labOf(front);
  const halfW = Math.max(seed.w * 0.62, spacing * 0.34), halfH = Math.max(seed.h * 0.75, spacing * 0.3);
  const wx0 = clamp(Math.round(seed.cx - halfW), 0, size - 1), wx1 = clamp(Math.round(seed.cx + halfW), 0, size - 1);
  const wy0 = clamp(Math.round(seed.cy - halfH), 0, size - 1), wy1 = clamp(Math.round(seed.cy + halfH), 0, size - 1);
  const isEye = (i) => color[i * 4 + 3] >= 128 && !skin.mask[i];
  const cols = [];
  for (let x = wx0; x <= wx1; x++) {
    let best = null, y = wy0;
    while (y <= wy1) {
      if (!isEye(y * size + x)) { y++; continue; }
      const top = y; let hasSeed = false;
      while (y <= wy1 && isEye(y * size + x)) { if (labels[y * size + x] === seed.id) hasSeed = true; y++; }
      const bottom = y - 1;
      const score = hasSeed ? -1 : Math.max(0, top - seed.cy, seed.cy - bottom);
      if (!best || score < best.score) best = { top, bottom, score, hasSeed };
    }
    // A run without seed pixels is an eye corner (white) only if it stays inside the window: one climbing to the
    // window's top edge is hair beside the lash.
    if (!best || (!best.hasSeed && (best.score > Math.max(2, seed.h * 0.5) || best.top <= wy0))) continue;
    cols.push({
      x, top: best.top, bottom: best.bottom, hasSeed: best.hasSeed,
      topOk: best.top > wy0 && skin.mask[(best.top - 1) * size + x] === 1,
      bottomOk: best.bottom < wy1 && skin.mask[(best.bottom + 1) * size + x] === 1,
    });
  }
  // The contiguous columns around the seed's middle (a stray lock of hair at the window's edge is not the eye).
  const mid = cols.findIndex((c) => c.x >= Math.round(seed.cx));
  if (mid < 0) return null;
  let a = mid, b = mid;
  while (a > 0 && cols[a - 1].x >= cols[a].x - 2) a--;
  while (b < cols.length - 1 && cols[b + 1].x <= cols[b].x + 2) b++;
  const run = cols.slice(a, b + 1);
  if (run.length < 4) return null;
  const heights = run.map((c) => c.bottom - c.top + 1).sort((p, q) => p - q);
  const median = heights[heights.length >> 1];
  const cx = (run[0].x + run[run.length - 1].x) / 2, hw = Math.max(1, (run[run.length - 1].x - run[0].x) / 2);
  const tol = Math.max(1.5, median * 0.15);
  const tops = robustProfile(run, "top", "topOk", hw, cx, tol), bottoms = robustProfile(run, "bottom", "bottomOk", hw, cx, tol);
  for (let i = 0; i < run.length; i++) if (bottoms[i] < tops[i] + 1) bottoms[i] = tops[i] + 1;
  // The lash: the dark run at the top of the middle columns (its first pixels may be anti-aliased toward the skin).
  const values = [];
  for (let i = 0; i < run.length; i++) for (let y = Math.round(tops[i]); y <= Math.round(bottoms[i]); y++) { const j = y * size + run[i].x; if (isEye(j)) values.push(L[j]); }
  values.sort((p, q) => p - q);
  const darkL = values.length ? Math.max(values[Math.floor(values.length * 0.35)] + 6, (values[0] + skin.lab[0]) / 2) : skin.lab[0] - 40;
  // Off the middle, so the dark run below the top is lash over the white, not lash + iris.
  const lashes = [];
  for (let i = 0; i < run.length; i++) {
    const off = Math.abs(run[i].x - cx) / hw;
    if (off < 0.35 || off > 0.75) continue;
    const t = Math.round(tops[i]), b = Math.round(bottoms[i]), H = b - t + 1;
    let y = t, skipped = 0;
    while (y <= b && L[y * size + run[i].x] > darkL && skipped < 2) { y++; skipped++; }
    let end = y;
    while (end <= b && end - t < H * 0.6 && L[end * size + run[i].x] <= darkL) end++;
    lashes.push((end - t) / H);
  }
  lashes.sort((p, q) => p - q);
  const lash = clamp(lashes.length ? lashes[lashes.length >> 1] : 0.25, 0.12, 0.45);
  // The lids' skin, per column: the first three skin pixels within 7 px above the top / below the bottom (lash spikes
  // and bangs skipped), gaps from the nearest known column, then a Gaussian over ±8 columns and 15 % of the eye's
  // median — the paint must meet the real skin at its edges (a flat colour showed as a pale oval) without streaks.
  // (The two pixels next to the outline are skipped: they blend lash or white into the skin and read lighter or darker.)
  const outside = (sign, edge) => {
    const raw = run.map((c, i) => {
      const from = sign < 0 ? Math.floor(edge[i]) - 3 : Math.ceil(edge[i]) + 3;
      let r = 0, g = 0, bl = 0, m = 0;
      for (let s = 0; s < 8 && m < 4; s++) {
        const y = from + sign * s; if (y < 0 || y >= size) break;
        const j = y * size + c.x;
        if (!skin.mask[j] || skin.distance[j] > 11) continue;
        r += color[j * 4]; g += color[j * 4 + 1]; bl += color[j * 4 + 2]; m++;
      }
      return m ? [r / m, g / m, bl / m] : null;
    });
    const known = raw.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    if (!known.length) return run.map(() => [...skin.tone]);
    const med = (k) => known.map((i) => raw[i][k]).sort((p, q) => p - q)[known.length >> 1];
    const median = [med(0), med(1), med(2)];
    const filled = raw.map((c, i) => { if (c) return c; let n = known[0]; for (const k of known) if (Math.abs(k - i) < Math.abs(n - i)) n = k; return raw[n]; });
    return filled.map((_, i) => {
      const acc = [0, 0, 0]; let w = 0;
      for (let k = Math.max(0, i - 8); k <= Math.min(filled.length - 1, i + 8); k++) { const g = Math.exp(-((k - i) ** 2) / 32); acc[0] += filled[k][0] * g; acc[1] += filled[k][1] * g; acc[2] += filled[k][2] * g; w += g; }
      return acc.map((v, c) => (v / w) * 0.85 + median[c] * 0.15);
    });
  };
  // A painted lower lash often sits a skin pixel or three under the eye: it must be covered too when the eye shuts.
  const cover = bottoms.map((b, i) => {
    let y = Math.ceil(b) + 1, end = b, gap = 0;
    const limit = b + median * 0.45;
    while (y <= limit && y < size && gap <= 3) {
      const j = y * size + run[i].x;
      if (color[j * 4 + 3] >= 128 && !skin.mask[j]) { end = y; gap = 0; } else gap++;
      y++;
    }
    return end;
  });
  const above = outside(-1, tops), below = outside(1, cover);
  const meanOf = (list) => list.reduce((a, c) => [a[0] + c[0] / list.length, a[1] + c[1] / list.length, a[2] + c[2] / list.length], [0, 0, 0]);
  const lidUp = meanOf(above), lidDown = meanOf(below);
  // The lid geometry is the painted outline smoothed over ±5 columns (lash spikes would make the drawn line jagged);
  // the raw outline stays for how far the paint must reach.
  const smoothRun = (arr) => arr.map((_, i) => { let s = 0, m = 0; for (let k = Math.max(0, i - 5); k <= Math.min(arr.length - 1, i + 5); k++) { s += arr[k]; m++; } return s / m; });
  const smoothTops = smoothRun(tops), smoothBottoms = smoothRun(bottoms);
  // The ink of a drawn lid line: the darkest eighth of the eye.
  const inks = [];
  for (let i = 0; i < run.length; i++) for (let y = Math.round(tops[i]); y <= Math.round(bottoms[i]); y++) { const j = y * size + run[i].x; if (isEye(j)) inks.push(j); }
  inks.sort((p, q) => L[p] - L[q]);
  const inkN = Math.max(1, Math.floor(inks.length / 8)), ink = [0, 0, 0];
  for (let k = 0; k < inkN; k++) { const j = inks[k]; ink[0] += color[j * 4] / inkN; ink[1] += color[j * 4 + 1] / inkN; ink[2] += color[j * 4 + 2] / inkN; }
  let dsum = 0, dn = 0;
  for (let i = 0; i < run.length; i++) for (let y = Math.round(tops[i]); y <= Math.round(bottoms[i]); y++) { const d = depth[y * size + run[i].x]; if (Number.isFinite(d)) { dsum += d; dn++; } }
  return {
    x0: run[0].x, x1: run[run.length - 1].x, cx, cy: (Math.min(...tops) + Math.max(...bottoms)) / 2,
    columns: run.map((c) => c.x), tops, bottoms, trusted: run.filter((c) => c.topOk).length / run.length,
    smoothTops, smoothBottoms, cover, height: median, lash, above, below, lidUp, lidDown, ink, depth: dn ? dsum / dn : 0, window: { x0: wx0, x1: wx1, y0: wy0, y1: wy1 },
  };
}

/**
 * Bangs lying on most of one eye leave its top untrusted (the column runs climb into the hair): rebuild that top from
 * the other eye's height profile, mirrored and scaled to this eye's width, measured up from this eye's own bottom
 * (the skin under an eye is never covered). Faces are near-symmetric; hair rarely is.
 */
function mirrorWeakTop(eyes) {
  const [a, b] = eyes;
  const strong = a.trusted >= b.trusted ? a : b, weak = strong === a ? b : a;
  if (!(weak.trusted < 0.5 && strong.trusted >= 0.7)) return;
  const heightAt = (e, X) => {
    const x = e.cx + X * (e.x1 - e.x0) / 2;
    let k = 0; for (let i = 1; i < e.columns.length; i++) if (Math.abs(e.columns[i] - x) < Math.abs(e.columns[k] - x)) k = i;
    return e.bottoms[k] - e.tops[k];
  };
  const scale = (weak.x1 - weak.x0) / Math.max(1, strong.x1 - strong.x0);
  weak.columns.forEach((x, i) => {
    const X = ((x - weak.cx) / Math.max(1, (weak.x1 - weak.x0) / 2));
    const top = weak.bottoms[i] - heightAt(strong, -X) * scale;
    weak.tops[i] = top; weak.smoothTops[i] = top;
  });
  const smoothed = weak.smoothTops.map((_, i, arr) => { let s = 0, m = 0; for (let k = Math.max(0, i - 5); k <= Math.min(arr.length - 1, i + 5); k++) { s += arr[k]; m++; } return s / m; });
  weak.smoothTops.splice(0, smoothed.length, ...smoothed);
  weak.cy = (Math.min(...weak.tops) + Math.max(...weak.bottoms)) / 2;
  // The skin above it is under the hair too: its upper lid takes the other eye's colour.
  weak.above = weak.columns.map(() => [...strong.lidUp]); weak.lidUp = [...strong.lidUp];
  weak.mirrored = true;
}

/**
 * The mouth: in the window below the eyes (0.45–1.45 spacings down, ±0.75 across) and on the face's front (no deeper
 * than the eyes by a tenth of the head's width — the neck under the chin is shaded like a mouth but sits back),
 * pixels unlike skin (darker, redder, teeth-white) or darker than their 7 × 7 neighbourhood (a thin painted line);
 * the best centred, wide, low blob, merged with the blobs on the same line.
 */
function findMouth(front, skin, region, pair, eyeDepth) {
  const { size, color, depth, head } = front, n = size * size;
  const { L, A, B } = labOf(front);
  const { spacing, cx: midX, cy: eyeY } = pair;
  const x0 = Math.max(0, Math.round(midX - spacing * 0.75)), x1 = Math.min(size - 1, Math.round(midX + spacing * 0.75));
  const y0 = Math.max(0, Math.round(eyeY + spacing * 0.45)), y1 = Math.min(size - 1, region.blob.y1, Math.round(eyeY + spacing * 1.45));
  const minDepth = eyeDepth - 0.1 * (head.u1 - head.u0);
  // Local mean L* by an integral image over the window (± 3 px).
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  if (W < 4 || H < 4) return null;
  const integral = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let x = 0; x < W; x++) { const i = (y0 + y) * size + x0 + x; row += color[i * 4 + 3] >= 128 ? L[i] : skin.lab[0]; integral[(y + 1) * (W + 1) + x + 1] = integral[y * (W + 1) + x + 1] + row; }
  }
  const localMean = (x, y) => {
    const ax = Math.max(0, x - 3), bx = Math.min(W, x + 4), ay = Math.max(0, y - 3), by = Math.min(H, y + 4);
    return (integral[by * (W + 1) + bx] - integral[ay * (W + 1) + bx] - integral[by * (W + 1) + ax] + integral[ay * (W + 1) + ax]) / ((bx - ax) * (by - ay));
  };
  const mask = new Uint8Array(n);
  for (let y = y0; y <= y1; y++) for (let x = Math.max(x0, region.rowL[y]); x <= Math.min(x1, region.rowR[y]); x++) {
    const i = y * size + x;
    if (color[i * 4 + 3] < 128 || !(depth[i] >= minDepth)) continue;
    const darker = skin.lab[0] - L[i], redder = A[i] - skin.lab[1];
    if (skin.distance[i] > 20 || darker > 14 || redder > 10 || (darker > 7 && redder > 5) || L[i] < localMean(x - x0, y - y0) - 6) mask[i] = 1;
  }
  const { labels, list } = components(mask, size, { x0, x1, y0, y1 });
  let best = null;
  for (const c of list) {
    if (c.area < 4) continue;
    const off = Math.abs(c.cx - midX) / spacing, drop = (c.cy - eyeY) / spacing, width = c.w / spacing;
    if (off > 0.3 || width < 0.12 || width > 1.1 || c.h > c.w * 1.2) continue;
    const score = (1 - off / 0.3) * 0.35 + Math.min(1, width / 0.45) * 0.4 + clamp((drop - 0.45) / 0.5, 0, 1) * 0.25;
    if (!best || score > best.score) best = { ...c, score, off, drop, width };
  }
  if (!best) return null;
  // The same line: a painted smile is often dark only at its corners (Mara's middle is within ΔE 6 of skin), so every
  // blob whose middle sits within ±12 % of a spacing of the best one's, inside ±0.55 spacings of the face's middle.
  const band = Math.max(2, spacing * 0.12);
  const members = list.filter((c) => c.area >= 3 && Math.abs(c.cy - best.cy) <= band && c.x0 >= midX - spacing * 0.55 && c.x1 <= midX + spacing * 0.55 && c.h <= best.h * 1.6 + 2);
  const ids = new Set(members.map((c) => c.id));
  const mx0 = Math.min(...members.map((c) => c.x0)), mx1 = Math.max(...members.map((c) => c.x1));
  const columns = [], tops = [], bottoms = [];
  let dsum = 0, dn = 0;
  const pixels = [];
  for (let x = mx0; x <= mx1; x++) {
    let t = -1, b = -1;
    for (let y = y0; y <= y1; y++) {
      const i = y * size + x;
      if (!ids.has(labels[i])) continue;
      if (t < 0) t = y; b = y;
      pixels.push(i);
      if (Number.isFinite(depth[i])) { dsum += depth[i]; dn++; }
    }
    if (t >= 0) { columns.push(x); tops.push(t); bottoms.push(b); }
  }
  // Between the members the line is faint: follow its darkest pixel near the line joining the neighbours.
  for (let k = 0; k + 1 < columns.length; k++) {
    const xa = columns[k], xb = columns[k + 1];
    if (xb - xa < 2) continue;
    const add = [];
    for (let x = xa + 1; x < xb; x++) {
      const t = (x - xa) / (xb - xa);
      const mid = ((tops[k] + bottoms[k]) / 2) * (1 - t) + ((tops[k + 1] + bottoms[k + 1]) / 2) * t;
      let bestY = Math.round(mid), bestL = Infinity;
      for (let y = Math.round(mid) - 3; y <= Math.round(mid) + 4; y++) { if (y < y0 || y > y1) continue; const i = y * size + x; if (color[i * 4 + 3] >= 128 && L[i] < bestL) { bestL = L[i]; bestY = y; } }
      add.push([x, bestY]);
    }
    columns.splice(k + 1, 0, ...add.map((a) => a[0])); tops.splice(k + 1, 0, ...add.map((a) => a[1])); bottoms.splice(k + 1, 0, ...add.map((a) => a[1]));
    k += add.length;
  }
  best.score = (1 - best.off / 0.3) * 0.35 + Math.min(1, (mx1 - mx0 + 1) / spacing / 0.45) * 0.4 + clamp((best.drop - 0.45) / 0.5, 0, 1) * 0.25;
  // The lips are smooth curves: a column whose faint lower lip went undetected (self-f: 6 of 45) takes the fit.
  const heights = columns.map((_, k) => bottoms[k] - tops[k]).sort((p, q) => p - q);
  const tall = heights[Math.floor(heights.length * 0.75)] || 0;
  const cxm = (mx0 + mx1) / 2, hwm = Math.max(1, (mx1 - mx0) / 2);
  const outline = (ys, tol) => {
    const ts = columns.map((x) => (x - cxm) / hwm);
    let fit = fitQuadratic(ts, ys);
    if (!fit) return ys;
    const keep = ts.map((t, k) => Math.abs(ys[k] - fit(t)) <= tol);
    const kt = ts.filter((_, k) => keep[k]), ky = ys.filter((_, k) => keep[k]);
    if (kt.length >= 5) fit = fitQuadratic(kt, ky) || fit;
    return ys.map((y, k) => (Math.abs(y - fit(ts[k])) <= tol ? y : fit(ts[k])));
  };
  if (columns.length >= 5) {
    const tol = Math.max(1.5, tall * 0.3);
    const t2 = outline(tops, tol), b2 = outline(bottoms, tol);
    for (let k = 0; k < columns.length; k++) { tops[k] = t2[k]; bottoms[k] = Math.max(t2[k], b2[k]); }
  }
  // Painted teeth: between the lips, lighter and less yellow than the skin (self-f's are ΔE 4–6 from it).
  let white = 0, all = 0;
  for (let k = 0; k < columns.length; k++) for (let y = Math.round(tops[k]); y <= Math.round(bottoms[k]); y++) {
    const i = y * size + columns[k];
    all++;
    if (L[i] > skin.lab[0] + 1.5 && B[i] < skin.lab[2] - 2 && A[i] * A[i] + B[i] * B[i] < skin.lab[1] * skin.lab[1] + skin.lab[2] * skin.lab[2]) white++;
  }
  // The inside colour: the darkest quarter of the mouth.
  pixels.sort((p, q) => L[p] - L[q]);
  const dark = [0, 0, 0], take = Math.max(1, Math.floor(pixels.length / 4));
  for (let k = 0; k < take; k++) { const i = pixels[k]; dark[0] += color[i * 4]; dark[1] += color[i * 4 + 1]; dark[2] += color[i * 4 + 2]; }
  return {
    score: best.score, x0: mx0, x1: mx1, cx: (mx0 + mx1) / 2, cy: (Math.min(...tops) + Math.max(...bottoms)) / 2,
    columns, tops, bottoms, teeth: all ? white / all > 0.12 : false, whiteShare: all ? white / all : 0,
    dark: dark.map((c) => c / take), depth: dn ? dsum / dn : 0, labels, ids, window: { x0, x1, y0, y1 },
  };
}

/**
 * Where the eyes and the mouth are on a front picture (`projectFront`) with its skin (`classifySkin`).
 *   eyes  = the best pair over three candidate cuts: level (|Δy| ≤ 12 % of their spacing), alike (area ≤ 2.6×),
 *           spaced 18–62 % of the face width, straddling its middle, in its upper 55 %, white nearby; the lowest of
 *           the near-best (brows sit above eyes); each refined column by column (refineEye);
 *   mouth = below the eyes by 0.45–1.55 spacings, centred (≤ 30 % of a spacing off), unlike skin (findMouth).
 * Pixel units. `hasFace` needs both, with `confidence` over the thresholds.
 */
export function findFeatures(front, skin, { minEyeConfidence = 0.5, minMouthConfidence = 0.35 } = {}) {
  const fail = (reason, extra = {}) => ({ hasFace: false, reason, eyes: null, mouth: null, confidence: { eyes: 0, mouth: 0 }, ...extra });
  if (!front) return fail("no-head");
  if (!skin) return fail("no-skin");
  const ms = {};
  let t = now();
  const lap = (k) => { const n2 = now(); ms[k] = +(n2 - t).toFixed(2); t = n2; };
  const region = faceRegion(front, skin); lap("region");
  if (!region) return fail("no-face-skin", { ms });
  const sets = eyeCandidates(front, skin, region); lap("candidates");
  const pair = pickEyePair(front, skin, region, sets); lap("pair");
  if (!pair || pair.score < minEyeConfidence) return fail("no-eyes", { region, pair, ms });
  const eyes = [refineEye(front, skin, pair.l, pair.set.labels, pair.spacing), refineEye(front, skin, pair.r, pair.set.labels, pair.spacing)]; lap("eyes");
  if (!eyes[0] || !eyes[1]) return fail("eye-shape", { region, pair, ms });
  mirrorWeakTop(eyes);
  const mouth = findMouth(front, skin, region, pair, Math.min(eyes[0].depth, eyes[1].depth)); lap("mouth");
  const confidence = { eyes: pair.score, mouth: mouth?.score || 0 };
  if (!mouth || mouth.score < minMouthConfidence) return fail(mouth ? "weak-mouth" : "no-mouth", { region, pair, eyes, mouth, confidence, ms });
  return { hasFace: true, reason: "ok", region, pair, eyes, mouth, confidence, spacing: pair.spacing, cut: pair.set.name, ms };
}

/* ---------- the rig: everything the material needs, in face-plane units ---------- */

const INSIDE = [96, 34, 40], TONGUE = [206, 108, 110], TEETH = [250, 247, 242];

/** How much wider than the painted eye its window is (the lids' coverage fades in the extra). */
export const EYE_MARGIN = 1.1;
/** Rows of the profile texture (PROFILE_SAMPLES wide). */
export const PROFILE_ROWS = Object.freeze({ eye0: 0, eye1: 1, mouth: 2, above0: 3, above1: 4, below0: 5, below1: 6, count: 7 });

/**
 * From pixels to face-plane units: eye and mouth centres and half sizes; the 64-sample profiles (a 64 × 7 RGBA
 * texture — shapes of her right eye, her left eye and the mouth, then the skin above / below each eye per column,
 * sRGB); linear colours; the front picture whose alpha says where the face may change (skin and the features,
 * never hair); the region the shader looks at; the eye point in bind space.
 */
export function buildRig(front, skin, features) {
  const { size, box, frame, origin } = front;
  const px = box.span / size;
  const uOf = (x) => box.u0 + x * px, vOf = (y) => box.v1 - y * px;   // pixel edges
  const N = PROFILE_SAMPLES;
  const profile = new Uint8Array(N * PROFILE_ROWS.count * 4);
  const enc = (y) => Math.round(clamp((y + 1) / 2, 0, 1) * 255);
  const lerpAt = (xs, ys, x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let i = 0; while (i < xs.length - 2 && xs[i + 1] < x) i++;
    const t = (x - xs[i]) / Math.max(1e-6, xs[i + 1] - xs[i]);
    return ys[i] + (ys[i + 1] - ys[i]) * t;
  };
  const nearest = (xs, x) => { let k = 0; for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[k] - x)) k = i; return k; };
  const eyes = features.eyes.map((e, row) => {
    const top = Math.min(...e.tops), bottom = Math.max(...e.cover) + 1;
    const cu = uOf((e.x0 + e.x1 + 1) / 2), cv = (vOf(top) + vOf(bottom)) / 2;
    // The window is EYE_MARGIN wider than the painted eye so the lids still cover its very corners where their
    // coverage fades out.
    const halfPx = (e.x1 - e.x0 + 1) / 2 * EYE_MARGIN;
    const hw = halfPx * px, hh = (vOf(top) - vOf(bottom)) / 2 * 1.04;
    for (let k = 0; k < N; k++) {
      const X = -1 + 2 * (k + 0.5) / N;
      const x = (e.x0 + e.x1 + 1) / 2 + X * halfPx - 0.5;   // column index (pixel centre)
      // Shape row: smoothed top / bottom (the lids' geometry), raw top / bottom (how far the paint reaches).
      const o = (row * N + k) * 4;
      profile[o] = enc((vOf(lerpAt(e.columns, e.smoothTops, x)) - cv) / hh); profile[o + 1] = enc((vOf(lerpAt(e.columns, e.smoothBottoms, x) + 1) - cv) / hh);
      profile[o + 2] = enc((vOf(lerpAt(e.columns, e.tops, x)) - cv) / hh); profile[o + 3] = enc((vOf(lerpAt(e.columns, e.cover, x) + 1) - cv) / hh);
      // Colour rows: the lids' skin per column (sRGB); the upper one carries the lash thickness in alpha.
      const j = nearest(e.columns, x);
      const up = ((PROFILE_ROWS.above0 + row) * N + k) * 4, down = ((PROFILE_ROWS.below0 + row) * N + k) * 4;
      profile[up] = Math.round(e.above[j][0]); profile[up + 1] = Math.round(e.above[j][1]); profile[up + 2] = Math.round(e.above[j][2]); profile[up + 3] = Math.round(e.lash * 255);
      profile[down] = Math.round(e.below[j][0]); profile[down + 1] = Math.round(e.below[j][1]); profile[down + 2] = Math.round(e.below[j][2]); profile[down + 3] = 255;
    }
    return { cu, cv, hw, hh, lash: e.lash, depth: e.depth, ink: linearRGB(e.ink), inkSRGB: e.ink.map(Math.round), lidUpSRGB: e.lidUp.map(Math.round), lidDownSRGB: e.lidDown.map(Math.round), trusted: e.trusted };
  });
  const m = features.mouth;
  const mTop = Math.min(...m.tops), mBottom = Math.max(...m.bottoms) + 1;
  const mouth = { cu: uOf((m.x0 + m.x1 + 1) / 2), cv: (vOf(mTop) + vOf(mBottom)) / 2, hw: (m.x1 - m.x0 + 1) / 2 * px, depth: m.depth, teeth: m.teeth };
  for (let k = 0; k < N; k++) {
    const X = -1 + 2 * (k + 0.5) / N;
    const x = (m.x0 + m.x1 + 1) / 2 + X * (m.x1 - m.x0 + 1) / 2 - 0.5;
    const inside = x >= m.x0 - 0.5 && x <= m.x1 + 0.5;
    const t = lerpAt(m.columns, m.tops, x), b = lerpAt(m.columns, m.bottoms, x) + 1;
    const yt = (vOf(t) - mouth.cv) / mouth.hw, yb = (vOf(b) - mouth.cv) / mouth.hw;
    const o = (PROFILE_ROWS.mouth * N + k) * 4;
    profile[o] = enc(yt); profile[o + 1] = enc(yb); profile[o + 2] = enc((yt + yb) / 2); profile[o + 3] = inside ? 255 : 0;
  }
  // The inside of the mouth leans on the painting's darkest mouth colour, kept dark and warm; its rim darker still.
  const inside = INSIDE.map((c, i) => c * 0.6 + Math.min(m.dark[i], 150) * 0.4);
  mouth.inside = linearRGB(inside); mouth.tongue = linearRGB(TONGUE); mouth.teethColor = linearRGB(TEETH);
  mouth.line = linearRGB(inside.map((c) => c * 0.55)); mouth.insideSRGB = inside.map(Math.round);
  // May change (the picture's alpha): skin inside the face's rows, and the features dilated 2 px; hair and clothes
  // never. The texture's bilinear filter gives the edge its one-texel softness.
  const image = new Uint8ClampedArray(front.color);
  for (let i = 3; i < image.length; i += 4) image[i] = 0;
  const { region } = features;
  for (let y = region.blob.y0; y <= region.blob.y1; y++) for (let x = Math.max(0, region.rowL[y]); x <= Math.min(size - 1, region.rowR[y]); x++) { const i = y * size + x; if (skin.mask[i]) image[i * 4 + 3] = 255; }
  const mark = (x, y, allow = null) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < size && yy < size && front.color[(yy * size + xx) * 4 + 3] >= 128 && (!allow || allow(xx, yy))) image[(yy * size + xx) * 4 + 3] = 255; } };
  // Around an eye the dilation spreads into skin or down the eye's own columns, never up into hair resting on the lash.
  for (const e of features.eyes) {
    const from = e.columns[0] - 2, tops = new Float32Array(e.columns.length + 4);
    for (let xx = from; xx < from + tops.length; xx++) { let k = 0; for (let i = 1; i < e.columns.length; i++) if (Math.abs(e.columns[i] - xx) < Math.abs(e.columns[k] - xx)) k = i; tops[xx - from] = e.tops[k]; }
    const allow = (xx, yy) => skin.mask[yy * size + xx] === 1 || yy >= Math.floor(tops[clamp(xx - from, 0, tops.length - 1)]);
    e.columns.forEach((x, i) => { for (let y = Math.floor(e.tops[i]); y <= Math.ceil(e.cover[i]); y++) mark(x, y, allow); });
  }
  const mw = m.window;
  for (let y = mw.y0; y <= mw.y1; y++) for (let x = mw.x0; x <= mw.x1; x++) if (m.ids.has(m.labels[y * size + x])) mark(x, y);
  m.columns.forEach((x, k) => { for (let y = Math.floor(m.tops[k]); y <= Math.ceil(m.bottoms[k]); y++) mark(x, y); });
  // What the shader looks at: the eye windows (surprise reaches 2.8 half-heights up) and the mouth window.
  const region2 = { u0: Infinity, u1: -Infinity, v0: Infinity, v1: -Infinity };
  const grow = (a, b, c, d) => { region2.u0 = Math.min(region2.u0, a); region2.u1 = Math.max(region2.u1, b); region2.v0 = Math.min(region2.v0, c); region2.v1 = Math.max(region2.v1, d); };
  for (const e of eyes) grow(e.cu - e.hw, e.cu + e.hw, e.cv - 1.8 * e.hh, e.cv + 2.8 * e.hh);
  grow(mouth.cu - 2.2 * mouth.hw, mouth.cu + 2.2 * mouth.hw, mouth.cv - 2.6 * mouth.hw, mouth.cv + 1.0 * mouth.hw);
  const minDepth = Math.min(eyes[0].depth, eyes[1].depth, mouth.depth) - 0.35 * (front.head.u1 - front.head.u0);
  const toBind = (u, v, d) => add(add(add(origin, scale(frame.left, u)), scale(frame.up, v)), scale(frame.forward, d));
  const eyePoint = toBind((eyes[0].cu + eyes[1].cu) / 2, (eyes[0].cv + eyes[1].cv) / 2, (eyes[0].depth + eyes[1].depth) / 2);
  return {
    version: FACE_VERSION, size, box, frame, origin, eyes, mouth, profile, image, region: region2, minDepth, eyePoint,
    skin: skin.tone,
  };
}

/* ---------- the warp (the shader's twin) ---------- */

/**
 * Face weights → per face-plane point (u, v): where to read the front picture (su, sv), what to paint over it
 * (over = [r, g, b, a], linear) and how much of all this replaces the original (infl).
 * `fpx` = one screen pixel in face-plane units (the shader's fwidth), for the anti-aliased edges.
 * W = { blinkRight, blinkLeft, happy, surprised, open, round, wide, smile }.
 */
export function faceWarp(rig, W, u, v, fpx, out = {}) {
  out.su = u; out.sv = v; out.infl = 0;
  out.over = out.over || [0, 0, 0, 0]; out.over[3] = 0;
  const r = rig.region;
  if (u < r.u0 || u > r.u1 || v < r.v0 || v > r.v1) return out;
  warpEye(rig, rig.eyes[0], 0, W.blinkRight || 0, W, u, v, fpx, out);
  warpEye(rig, rig.eyes[1], 1, W.blinkLeft || 0, W, u, v, fpx, out);
  warpMouth(rig, W, u, v, fpx, out);
  return out;
}

/** The profile texture as the GPU reads it: linear between texel centres, clamped at the edges; 0..1. */
function profileAt(rig, row, s) {
  const N = PROFILE_SAMPLES, x = clamp(s * N - 0.5, 0, N - 1), i = Math.floor(x), j = Math.min(N - 1, i + 1), t = x - i;
  const p = rig.profile, a = (row * N + i) * 4, b = (row * N + j) * 4;
  return [0, 1, 2, 3].map((c) => (p[a + c] + (p[b + c] - p[a + c]) * t) / 255);
}
/** A colour row of the profile (sRGB bytes) → linear, the way the shader decodes it. */
const profileColor = (rig, row, s) => profileAt(rig, row, s).slice(0, 3).map((c) => srgbToLinear(c * 255));

/**
 * One eye. Lids are painted, not pulled: the upper lid comes down from the top of the eye to Pu, the lower lid rises
 * to Pl, in the lids' skin (a vertical gradient between the two lid colours) and reaching a pixel and a half past the
 * painted outline; a drawn line (the eye's darkest ink, half the painted lash thick, tapered to the corners) rides the
 * upper lid's edge. A blink meets at CLOSE_AT (a ∪ through the corners). `happy` raises the lower lid to the top and
 * draws the smile's arc along it (^ ^); a blink during a smile closes onto that arc.
 */
function warpEye(rig, e, row, blink, W, u, v, fpx, out) {
  const qx = (u - e.cu) / e.hw, qy = (v - e.cv) / e.hh;
  if (Math.abs(qx) >= 1 || qy < -1.8 || qy > 2.8) return;
  const happy = W.happy || 0, surprise = W.surprised || 0;
  const hx = 1 - smoothstep(0.75, 1, Math.abs(qx));
  const ys = qy - surprise * 0.2 * Math.sin(clamp(qy / 2.6, -1, 1) * Math.PI) * hx;
  if (surprise > 0.001) out.infl = Math.max(out.infl, hx);
  out.sv = e.cv + ys * e.hh;
  if (blink < 0.001 && happy < 0.001) return;
  const s = qx * 0.5 + 0.5;
  const pr = profileAt(rig, row, s);
  // At the corner tips the painted eye is a pixel tall: clamp the height instead of skipping them (white slivers).
  const top = pr[0] * 2 - 1, bot = pr[1] * 2 - 1, H = Math.max(top - bot, 0.02);
  const f = (ys - bot) / H;
  const aa = Math.max(1e-4, fpx / (H * e.hh) * 0.75);   // a pixel, in f
  // Past the painted outline by 1.5 texels of the front picture (or 3 screen pixels when those are bigger).
  const pad = Math.max(3 * aa, 1.5 * (rig.box.span / rig.size) / (H * e.hh));
  const fTop = Math.max(1, (pr[2] * 2 - 1 - bot) / H) + pad, fBot = Math.min(0, (pr[3] * 2 - 1 - bot) / H) - pad * 1.2;
  if (f < fBot - 2 * aa || f > fTop + 2 * aa) return;
  const cov = 1 - smoothstep(0.93, 1, Math.abs(qx));   // the painted eye ends at 1 / EYE_MARGIN
  const up = profileAt(rig, PROFILE_ROWS.above0 + row, s);
  const lash = clamp(up[3], 0.12, 0.45);
  const taper = Math.sqrt(Math.max(0, 1 - qx ** 4));
  const T = Math.max(lash * 0.55 * taper, aa * 1.5);
  const closeAt = CLOSE_AT + happy * (1 - T - CLOSE_AT);
  const Pu = 1 - blink * (1 - closeAt);
  // A smiling lower lid bulges up in the middle (∩); fully smiling it is flat against the arc.
  const Pl = Math.min(Math.max(closeAt * blink * blink, happy * (1 - T) * (1 - 0.45 * qx * qx * (1 - happy))), Pu);
  out.infl = Math.max(out.infl, cov);
  const above = up.slice(0, 3).map((c) => srgbToLinear(c * 255)), below = profileColor(rig, PROFILE_ROWS.below0 + row, s);
  const g = clamp(f, 0, 1);
  const c = [below[0] + (above[0] - below[0]) * g, below[1] + (above[1] - below[1]) * g, below[2] + (above[2] - below[2]) * g];
  const upper = blink > 0.001 ? smoothstep(Pu - aa, Pu + aa, f) * (1 - smoothstep(fTop - aa, fTop + aa, f)) : 0;
  const lower = Pl > 0.002 ? (1 - smoothstep(Pl - aa, Pl + aa, f)) * smoothstep(fBot - aa, fBot + aa, f) : 0;
  let a = Math.max(upper, lower);
  // The upper lid's line; with a smile the arc along the top fades in as the lower lid gets there.
  const lid = blink > 0.001 ? smoothstep(Pu - T - aa, Pu - T + aa, f) * (1 - smoothstep(Pu - aa, Pu + aa, f)) : 0;
  const arc = smoothstep(0.55, 0.95, happy) * smoothstep(1 - T - aa, 1 - T + aa, f) * (1 - smoothstep(1 - aa, 1 + aa, f));
  let line = Math.max(lid, arc);
  if (Pl > 0.05 && Pl < Pu - T) {
    // The raised lower lid's own faint line (painted smiles have one), half as thick.
    line = Math.max(line, smoothstep(Pl - aa, Pl + aa, f) * (1 - smoothstep(Pl + T * 0.5 - aa, Pl + T * 0.5 + aa, f)) * 0.5 * smoothstep(0.05, 0.25, Pl));
  }
  for (let k = 0; k < 3; k++) c[k] += (e.ink[k] - c[k]) * line;
  a = Math.max(a, line);
  if (a > 0) { out.over[0] = c[0]; out.over[1] = c[1]; out.over[2] = c[2]; out.over[3] = a * cov; }
}

function warpMouth(rig, W, u, v, fpx, out) {
  const open = W.open || 0, round = W.round || 0, wide = W.wide || 0, smile = W.smile || 0;
  if (open < 0.001 && smile < 0.001) return;
  const m = rig.mouth;
  const qx = (u - m.cu) / m.hw, qy = (v - m.cv) / m.hw;
  if (Math.abs(qx) > 2.2 || qy > 1.0 || qy < -2.6) return;
  // The corners' pull stays on the lips: out to 2.2 half-widths it reached the jawline and dragged hair and neck in.
  // A 0.9 → 1.5 fade stays monotone while sx < 1.4 (oh: 1.24, ou: 1.21).
  const hf = 1 - smoothstep(0.9, 1.5, Math.abs(qx)), vf = 1 - smoothstep(0.55, 1.1, Math.abs(qy + 0.3));
  const sx = 1 + open * (0.42 * round - 0.2 * wide);
  const xs = qx * (1 + (sx - 1) * hf * vf);
  const pr = profileAt(rig, PROFILE_ROWS.mouth, clamp(xs * 0.5 + 0.5, 0, 1));
  const split = pr[2] * 2 - 1, cov = pr[3];
  const gw = 0.95 * (1 - 0.38 * round) + 0.12 * wide;
  const gx = xs / gw;
  // 0.7 half-widths at a full aa: at 0.55 real speech (open ≈ 0.5) read as a thin crescent at 85 mm / 1.5 m.
  const G = open * (0.7 + 0.25 * round - 0.35 * wide);
  const g = Math.abs(gx) < 1 ? G * (1 - gx * gx) ** 0.6 * cov : 0;
  out.infl = Math.max(out.infl, hf * vf);
  const aa = Math.max(1e-4, fpx / m.hw * 0.75);
  let ys = qy, inside = 0, rim = 0, t = 0;
  if (g > 0 && qy < split) {
    inside = smoothstep(split - g - aa, split - g + aa, qy) * (1 - smoothstep(split - aa, split + aa, qy));
    if (qy < split - g) ys = qy + g * clamp(1 - (split - g - qy) / 1.2, 0, 1);
    t = clamp((split - qy) / Math.max(g, 1e-4), 0, 1);
    // A drawn rim just inside the gap: the lips' line, crisp even where the painted one is faint.
    const w = Math.max(aa * 1.4, 0.05);
    rim = Math.max(1 - smoothstep(0, w, split - qy), 1 - smoothstep(0, w, qy - (split - g))) * smoothstep(0.02, 0.08, g);
  }
  const corner = smoothstep(0.25, 1.0, Math.abs(xs)) * (1 - smoothstep(1.2, 2.0, Math.abs(xs)));
  ys -= smile * 0.14 * corner * (1 - smoothstep(0.3, 1.1, Math.abs(qy - split)));
  out.su = m.cu + xs * m.hw; out.sv = m.cv + ys * m.hw;
  if (inside > 0) {
    const c = [...m.inside];
    const tongue = smoothstep(0.5, 0.85, t) * (1 - smoothstep(0.55, 0.95, Math.abs(gx))) * 0.8;
    const teeth = (m.teeth ? 0 : 1) * (1 - smoothstep(0.14, 0.24, t)) * smoothstep(0.25, 0.4, G) * (1 - smoothstep(0.6, 0.9, Math.abs(gx)));
    for (let k = 0; k < 3; k++) { c[k] += (m.tongue[k] - c[k]) * tongue; c[k] += (m.teethColor[k] - c[k]) * teeth; c[k] += (m.line[k] - c[k]) * rim * 0.85; }
    out.over[0] = c[0]; out.over[1] = c[1]; out.over[2] = c[2]; out.over[3] = inside;
  }
}

/** Bilinear read of the rig's picture at face-plane (u, v), linear RGB + alpha 0..1. */
function readRig(rig, u, v, out) {
  const { size, box, image } = rig;
  const x = clamp((u - box.u0) / box.span * size - 0.5, 0, size - 1), y = clamp((box.v1 - v) / box.span * size - 0.5, 0, size - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(size - 1, x0 + 1), y1 = Math.min(size - 1, y0 + 1), fx = x - x0, fy = y - y0;
  for (let c = 0; c < 4; c++) {
    const at = (xx, yy) => (c < 3 ? LINEAR[image[(yy * size + xx) * 4 + c]] : image[(yy * size + xx) * 4 + c] / 255);
    const top = at(x0, y0) + (at(x1, y0) - at(x0, y0)) * fx, bottom = at(x0, y1) + (at(x1, y1) - at(x0, y1)) * fx;
    out[c] = top + (bottom - top) * fy;
  }
  return out;
}

/**
 * The front picture with the face moved by weights W (sRGB RGBA, `scale` × the rig's size) — what the material does,
 * seen head-on. Previews and tests.
 */
export function renderFace(rig, W, { scale: s = 1 } = {}) {
  const S = Math.round(rig.size * s), out = new Uint8ClampedArray(S * S * 4);
  const px = rig.box.span / S, st = { over: [0, 0, 0, 0] }, a = [0, 0, 0, 0], b = [0, 0, 0, 0];
  const enc = (c) => { c = clamp(c, 0, 1); return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255); };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = rig.box.u0 + (x + 0.5) * px, v = rig.box.v1 - (y + 0.5) * px;
    faceWarp(rig, W, u, v, px, st);
    readRig(rig, u, v, a);
    let col = [a[0], a[1], a[2]];
    if (st.infl > 0) {
      readRig(rig, st.su, st.sv, b);
      let c = [a[0] + (b[0] - a[0]) * b[3], a[1] + (b[1] - a[1]) * b[3], a[2] + (b[2] - a[2]) * b[3]];   // never bring in what may not change
      if (st.over[3] > 0) c = c.map((q, k) => q + (st.over[k] - q) * st.over[3]);
      const w = clamp(st.infl, 0, 1) * a[3];
      col = col.map((q, k) => q + (c[k] - q) * w);
    }
    const i = (y * S + x) * 4;
    out[i] = enc(col[0]); out[i + 1] = enc(col[1]); out[i + 2] = enc(col[2]); out[i + 3] = 255;
  }
  return { data: out, width: S, height: S };
}

/* ---------- the whole pass ---------- */

/**
 * The pass in four stages (project · skin · features · rig), yielding between them so a caller can spread it over
 * idle callbacks: cold (before the JIT has seen it) the whole pass is ≈ 90 ms in one go, warm ≈ 20 ms; sliced, no
 * stage is over ≈ 25 ms cold. Returns the result object detectFace documents.
 */
function* faceStages(input, { size = 320, skinThreshold = 16 } = {}) {
  const result = { hasFace: false, reason: "", confidence: { eyes: 0, mouth: 0 }, rig: null, features: null, front: null, ms: {}, detail: {} };
  // Each stage's own time: the clock restarts after every yield, so the waits between stages are not counted.
  let t = now();
  const lap = (k) => { const n2 = now(); result.ms[k] = +((result.ms[k] || 0) + n2 - t).toFixed(1); t = n2; };
  const resume = () => { t = now(); };
  const start = now();
  try {
    if (!input?.atlas?.data || !(input.headJoint >= 0)) { result.reason = input?.atlas?.data ? "no-head-joint" : "no-atlas"; return result; }
    const mask = headVertices(input, [input.headJoint], 0.5);
    let heads = 0; for (let i = 0; i < mask.length; i++) heads += mask[i];
    if (heads < 200) { result.reason = "no-head"; return result; }
    const frame = bindFrame(input.joints || {});
    const origin = input.joints?.Head || [0, 0, 0];
    lap("mask");
    const front = projectFront({ positions: input.positions, uvs: input.uvs, normals: input.normals, indices: input.indices, mask, frame, origin, sample: atlasSampler(input.atlas), size });
    lap("project");
    result.front = front; result.frame = frame;
    yield "project"; resume();
    // A face painted with strong blush needs a wider skin tolerance (`skinThreshold`, ΔE) for its eyes to stand out.
    const skin = classifySkin(front, { threshold: skinThreshold });
    lap("skin");
    result.skin = skin;
    yield "skin"; resume();
    const features = findFeatures(front, skin);
    lap("detect");
    result.features = features; result.detail = features.ms || {};
    result.reason = features.reason; result.confidence = features.confidence;
    if (features.hasFace) {
      yield "features"; resume();
      result.rig = buildRig(front, skin, features); result.hasFace = true;
      lap("rig");
    }
  } catch (error) {
    result.hasFace = false; result.rig = null; result.reason = `error: ${error?.message || error}`;
  }
  result.ms.total = +Object.values(result.ms).reduce((a, b) => a + b, 0).toFixed(1);
  result.ms.wall = +(now() - start).toFixed(1);
  return result;
}

/**
 * One model: { positions, uvs, normals, indices, skinIndex, skinWeight, count, joints: name → [x, y, z] (bind),
 * headJoint (index), atlas: { data, width, height } (RGBA) } → { hasFace, reason, confidence, rig, features, ms }.
 */
export function detectFace(input, options) {
  const stages = faceStages(input, options);
  let step = stages.next();
  while (!step.done) step = stages.next();
  return step.value;
}

/** The same pass, awaiting `pause()` between stages (the character passes an idle callback). */
export async function detectFaceSliced(input, { pause = () => new Promise((r) => setTimeout(r, 0)), ...options } = {}) {
  const stages = faceStages(input, options);
  let step = stages.next();
  while (!step.done) { await pause(step.value); step = stages.next(); }
  return step.value;
}

/* ---------- the rhythm ---------- */

/** Visemes → the mouth: how open, how round (oh/ou pull the corners in), how wide (ih/ee push them out). */
export function mouthShape(v = {}) {
  const aa = v.aa || 0, ih = v.ih || 0, ou = v.ou || 0, ee = v.ee || 0, oh = v.oh || 0;
  const total = aa + ih + ou + ee + oh;
  if (total < 1e-4) return { open: 0, round: 0, wide: 0 };
  return {
    open: clamp(aa + 0.8 * oh + 0.5 * ou + 0.35 * ih + 0.4 * ee, 0, 1),
    round: clamp((0.7 * oh + ou) / total, 0, 1),
    wide: clamp((ih + 0.9 * ee) / total, 0, 1),
  };
}

/** Attack / hold / release, 0..1 (cosine ends); null once over. */
function envelope(t, { rise = 0.2, hold = 1.0, fall = 0.6 } = {}) {
  if (t < 0) return 0;
  if (t < rise) return 0.5 - 0.5 * Math.cos(Math.PI * t / rise);
  if (t < rise + hold) return 1;
  const f = (t - rise - hold) / fall;
  return f < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * f) : null;
}

/**
 * Blinks 2–6 s apart, about one in six a double (the second 0.2 s after the first opens), each ≈ 0.13 s: shut in
 * 0.035 s, held 0.03 s (so a 30 fps frame can see it closed), open in 0.065 s. `update(dt)` → lid weight 0..1.
 */
export function createBlinker(random = Math.random, { min = 2, max = 6, doubleChance = 0.18, close = 0.035, hold = 0.03, open = 0.065, first = null } = {}) {
  let until = first ?? (min + random() * (max - min)), t = -1, pendingDouble = false;
  const total = close + hold + open;
  const state = { count: 0, doubles: 0, weight: 0, nextIn: until, duration: total };
  return {
    state,
    update(dt) {
      dt = clamp(dt, 0, 0.1);
      if (t < 0) {
        until -= dt;
        if (until <= 0) {
          t = 0; state.count++;
          const wasDouble = pendingDouble;
          pendingDouble = !pendingDouble && random() < doubleChance;
          if (wasDouble) state.doubles++;
          until = pendingDouble ? 0.2 : min + random() * (max - min);
        }
      }
      if (t >= 0) {
        t += dt;
        state.weight = t < close ? smoothstep(0, close, t) : t < close + hold ? 1 : t < total ? 1 - smoothstep(close + hold, total, t) : 0;
        if (t >= total) { t = -1; state.weight = 0; }
      } else state.weight = 0;
      state.nextIn = until;
      return state.weight;
    },
  };
}

/**
 * How a pose shows on the face (targets; attack 0.25 s, release 0.7 s). `burst` flickers once on entering the pose
 * (the look-back's surprise), `laugh` runs the "ha"s: eyes into arcs and the mouth opening ~3 times a second.
 */
export const POSE_FACE = Object.freeze({
  stand: {},
  walk: {},
  look: { happy: 0.35, burst: { name: "surprised", peak: 0.6, rise: 0.1, hold: 0.3, fall: 0.6 } },
  laugh: { happy: 1.0, laugh: { rise: 0.15, hold: 2.6, fall: 0.8 } },
  wave: { happy: 0.6, burst: { name: "surprised", peak: 0.3, rise: 0.1, hold: 0.25, fall: 0.6 } },
  sea: { relaxed: 0.5 },
  lean: { relaxed: 0.35 },
  sit: { relaxed: 0.3 },
});

/**
 * The face's state per frame. setPose(name) from the character, setViseme(name, w) from lipSync, setExpression(name,
 * w) from anyone (held until changed; combined with the pose's own by max). `update(dt)` → the shader's weights.
 */
export function createFaceDriver({ random = Math.random, blinker = null } = {}) {
  const blinks = blinker || createBlinker(random);
  const channels = { happy: { value: 0, to: 0 }, surprised: { value: 0, to: 0 }, relaxed: { value: 0, to: 0 } };
  const held = { happy: 0, surprised: 0, blink: 0, blinkLeft: 0, blinkRight: 0, relaxed: 0 };
  const visemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  let pose = null, burst = null, laugh = null;
  const out = { blinkRight: 0, blinkLeft: 0, happy: 0, surprised: 0, open: 0, round: 0, wide: 0, smile: 0 };
  function setPose(name) {
    if (name === pose) return;
    pose = name;
    const spec = POSE_FACE[name] || POSE_FACE.stand;
    for (const k of Object.keys(channels)) channels[k].to = spec[k] || 0;
    burst = spec.burst ? { ...spec.burst, t: 0 } : null;
    laugh = spec.laugh ? { ...spec.laugh, t: 0 } : null;
  }
  setPose("stand");
  return {
    out, blinker: blinks,
    get pose() { return pose; },
    setPose,
    setViseme(name, weight) { if (name in visemes) visemes[name] = clamp(Number(weight) || 0, 0, 1); },
    setExpression(name, weight) { if (name in held) held[name] = clamp(Number(weight) || 0, 0, 1); },
    visemes: () => ({ ...visemes }),
    update(dt) {
      dt = clamp(dt, 0, 0.1);
      for (const c of Object.values(channels)) { const tau = c.to > c.value ? 0.25 : 0.7; c.value += (c.to - c.value) * Math.min(1, dt * 3 / tau); }
      let flicker = 0;
      if (burst) { burst.t += dt; const e = envelope(burst.t, burst); if (e === null) burst = null; else flicker = e * burst.peak; }
      let ha = 0;
      if (laugh) { laugh.t += dt; const e = envelope(laugh.t, laugh); if (e === null) laugh = null; else ha = e * (0.22 + 0.2 * Math.max(0, Math.sin(laugh.t * Math.PI * 2 * 3.1))); }
      const lid = blinks.update(dt);
      const surprised = Math.max(flicker, channels.surprised.value, held.surprised);
      const happy = Math.max(channels.happy.value, held.happy) * (1 - 0.8 * surprised);
      const relaxed = Math.max(channels.relaxed.value, held.relaxed);
      const both = Math.max(lid, held.blink, relaxed * 0.35) * (1 - 0.7 * surprised);
      out.blinkRight = Math.max(both, held.blinkRight);
      out.blinkLeft = Math.max(both, held.blinkLeft);
      out.happy = happy; out.surprised = surprised;
      const m = mouthShape(visemes);
      // Real TTS speech keeps lipSync's level around 0.3–0.5, which left a 2–3 px gap at 85 mm / 1.5 m: ease the
      // visemes out (0.3 → 0.51, 0.5 → 0.75, 1 stays 1) so ordinary speech reads as an opening mouth.
      const spoken = 1 - (1 - m.open) * (1 - m.open);
      const o = Math.max(spoken, ha, surprised * 0.3);
      out.open = o;
      out.round = spoken >= Math.max(ha, surprised * 0.3) ? m.round : surprised * 0.3 > ha ? 0.8 : 0;
      out.wide = spoken >= Math.max(ha, surprised * 0.3) ? m.wide : 0;
      out.smile = happy * 0.6;
      return out;
    },
  };
}

/* ---------- the material ---------- */

const GLSL_FLOAT = (x) => (Number.isInteger(x) ? `${x}.0` : String(x));

export const FACE_VERTEX_PARS = `
uniform vec3 uFaceOrigin; uniform vec3 uFaceLeft; uniform vec3 uFaceUp; uniform vec3 uFaceFwd;
varying vec3 vFaceP; varying float vFaceN;
`;
/** After begin_vertex: the bind-space position (before skinning) in face-plane coordinates. */
export const FACE_VERTEX = `
{
  vec3 fp = position - uFaceOrigin;
  vFaceP = vec3( dot( fp, uFaceLeft ), dot( fp, uFaceUp ), dot( fp, uFaceFwd ) );
  vFaceN = dot( normal, uFaceFwd );
}
`;
export const FACE_FRAGMENT_PARS = `
uniform sampler2D uFaceTex; uniform sampler2D uFaceProfile;
uniform vec4 uFaceBox; uniform vec4 uFaceRegion; uniform float uFaceMinD;
uniform vec4 uEye0; uniform vec4 uEye1; uniform vec3 uEyeInk0; uniform vec3 uEyeInk1;
uniform vec4 uMouth; uniform vec3 uMouthInside; uniform vec3 uMouthTongue; uniform vec3 uMouthTeeth; uniform vec3 uMouthLine;
uniform vec4 uFaceW; uniform vec4 uMouthW;
varying vec3 vFaceP; varying float vFaceN;
#define FACE_ROWS ${GLSL_FLOAT(PROFILE_ROWS.count)}
vec2 faceTexUV( vec2 p ) { return vec2( ( p.x - uFaceBox.x ) / uFaceBox.z, ( uFaceBox.y - p.y ) / uFaceBox.z ); }
vec4 faceProfile( float s, float row ) { return texture2D( uFaceProfile, vec2( s, ( row + 0.5 ) / FACE_ROWS ) ); }
vec3 faceLinear( vec3 c ) { return mix( c / 12.92, pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) ), step( vec3( 0.04045 ), c ) ); }
void faceEye( vec4 e, float row, float blink, vec3 ink, vec2 p, float fpx, inout vec2 src, inout vec4 over, inout float infl ) {
  vec2 q = ( p - e.xy ) / e.zw;
  if ( abs( q.x ) >= 1.0 || q.y < -1.8 || q.y > 2.8 ) return;
  float happy = uFaceW.z, surprise = uFaceW.w;
  float hx = 1.0 - smoothstep( 0.75, 1.0, abs( q.x ) );
  float ys = q.y - surprise * 0.2 * sin( clamp( q.y / 2.6, -1.0, 1.0 ) * 3.14159265 ) * hx;
  if ( surprise > 0.001 ) infl = max( infl, hx );
  src.y = e.y + ys * e.w;
  if ( blink < 0.001 && happy < 0.001 ) return;
  float s = q.x * 0.5 + 0.5;
  vec4 pr = faceProfile( s, row );
  float top = pr.r * 2.0 - 1.0, bot = pr.g * 2.0 - 1.0, H = max( top - bot, 0.02 );
  float f = ( ys - bot ) / H;
  float aa = max( 1e-4, fpx / ( H * e.w ) * 0.75 );
  float pad = max( 3.0 * aa, 1.5 * uFaceBox.z * uFaceBox.w / ( H * e.w ) );
  float fTop = max( 1.0, ( pr.b * 2.0 - 1.0 - bot ) / H ) + pad, fBot = min( 0.0, ( pr.a * 2.0 - 1.0 - bot ) / H ) - pad * 1.2;
  if ( f < fBot - 2.0 * aa || f > fTop + 2.0 * aa ) return;
  float cov = 1.0 - smoothstep( 0.93, 1.0, abs( q.x ) );
  vec4 up = faceProfile( s, ${GLSL_FLOAT(PROFILE_ROWS.above0)} + row );
  vec4 dn = faceProfile( s, ${GLSL_FLOAT(PROFILE_ROWS.below0)} + row );
  float lash = clamp( up.a, 0.12, 0.45 );
  float q2 = q.x * q.x;
  float taper = sqrt( max( 0.0, 1.0 - q2 * q2 ) );
  float T = max( lash * 0.55 * taper, aa * 1.5 );
  float closeAt = ${GLSL_FLOAT(CLOSE_AT)} + happy * ( 1.0 - T - ${GLSL_FLOAT(CLOSE_AT)} );
  float Pu = 1.0 - blink * ( 1.0 - closeAt );
  float Pl = min( max( closeAt * blink * blink, happy * ( 1.0 - T ) * ( 1.0 - 0.45 * q2 * ( 1.0 - happy ) ) ), Pu );
  infl = max( infl, cov );
  vec3 c = mix( faceLinear( dn.rgb ), faceLinear( up.rgb ), clamp( f, 0.0, 1.0 ) );
  float upper = blink > 0.001 ? smoothstep( Pu - aa, Pu + aa, f ) * ( 1.0 - smoothstep( fTop - aa, fTop + aa, f ) ) : 0.0;
  float lower = Pl > 0.002 ? ( 1.0 - smoothstep( Pl - aa, Pl + aa, f ) ) * smoothstep( fBot - aa, fBot + aa, f ) : 0.0;
  float a = max( upper, lower );
  float lid = blink > 0.001 ? smoothstep( Pu - T - aa, Pu - T + aa, f ) * ( 1.0 - smoothstep( Pu - aa, Pu + aa, f ) ) : 0.0;
  float arc = smoothstep( 0.55, 0.95, happy ) * smoothstep( 1.0 - T - aa, 1.0 - T + aa, f ) * ( 1.0 - smoothstep( 1.0 - aa, 1.0 + aa, f ) );
  float line = max( lid, arc );
  if ( Pl > 0.05 && Pl < Pu - T ) line = max( line, smoothstep( Pl - aa, Pl + aa, f ) * ( 1.0 - smoothstep( Pl + T * 0.5 - aa, Pl + T * 0.5 + aa, f ) ) * 0.5 * smoothstep( 0.05, 0.25, Pl ) );
  c = mix( c, ink, line );
  a = max( a, line );
  if ( a > 0.0 ) over = vec4( c, a * cov );
}
void faceMouth( vec2 p, float fpx, inout vec2 src, inout vec4 over, inout float infl ) {
  float open = uMouthW.x, round = uMouthW.y, wide = uMouthW.z, smile = uMouthW.w;
  if ( open < 0.001 && smile < 0.001 ) return;
  vec2 q = ( p - uMouth.xy ) / uMouth.z;
  if ( abs( q.x ) > 2.2 || q.y > 1.0 || q.y < -2.6 ) return;
  float hf = 1.0 - smoothstep( 0.9, 1.5, abs( q.x ) ), vf = 1.0 - smoothstep( 0.55, 1.1, abs( q.y + 0.3 ) );
  float sx = 1.0 + open * ( 0.42 * round - 0.2 * wide );
  float xs = q.x * ( 1.0 + ( sx - 1.0 ) * hf * vf );
  vec4 pr = faceProfile( clamp( xs * 0.5 + 0.5, 0.0, 1.0 ), ${GLSL_FLOAT(PROFILE_ROWS.mouth)} );
  float split = pr.b * 2.0 - 1.0, cov = pr.a;
  float gw = 0.95 * ( 1.0 - 0.38 * round ) + 0.12 * wide;
  float gx = xs / gw;
  float G = open * ( 0.7 + 0.25 * round - 0.35 * wide );
  float g = abs( gx ) < 1.0 ? G * pow( max( 1.0 - gx * gx, 0.0 ), 0.6 ) * cov : 0.0;
  infl = max( infl, hf * vf );
  float aa = max( 1e-4, fpx / uMouth.z * 0.75 );
  float ys = q.y, inside = 0.0, rim = 0.0, t = 0.0;
  if ( g > 0.0 && q.y < split ) {
    inside = smoothstep( split - g - aa, split - g + aa, q.y ) * ( 1.0 - smoothstep( split - aa, split + aa, q.y ) );
    if ( q.y < split - g ) ys = q.y + g * clamp( 1.0 - ( split - g - q.y ) / 1.2, 0.0, 1.0 );
    t = clamp( ( split - q.y ) / max( g, 1e-4 ), 0.0, 1.0 );
    float w = max( aa * 1.4, 0.05 );
    rim = max( 1.0 - smoothstep( 0.0, w, split - q.y ), 1.0 - smoothstep( 0.0, w, q.y - ( split - g ) ) ) * smoothstep( 0.02, 0.08, g );
  }
  float corner = smoothstep( 0.25, 1.0, abs( xs ) ) * ( 1.0 - smoothstep( 1.2, 2.0, abs( xs ) ) );
  ys -= smile * 0.14 * corner * ( 1.0 - smoothstep( 0.3, 1.1, abs( q.y - split ) ) );
  src = vec2( uMouth.x + xs * uMouth.z, uMouth.y + ys * uMouth.z );
  if ( inside > 0.0 ) {
    float tongue = smoothstep( 0.5, 0.85, t ) * ( 1.0 - smoothstep( 0.55, 0.95, abs( gx ) ) ) * 0.8;
    float teeth = ( 1.0 - uMouth.w ) * ( 1.0 - smoothstep( 0.14, 0.24, t ) ) * smoothstep( 0.25, 0.4, G ) * ( 1.0 - smoothstep( 0.6, 0.9, abs( gx ) ) );
    vec3 c = mix( mix( uMouthInside, uMouthTongue, tongue ), uMouthTeeth, teeth );
    c = mix( c, uMouthLine, rim * 0.85 );
    over = vec4( c, inside );
  }
}
vec3 faceColor( vec3 base ) {
  float fpx = max( length( fwidth( vFaceP.xy ) ), 1e-6 );
  vec2 p = vFaceP.xy;
  if ( p.x < uFaceRegion.x || p.x > uFaceRegion.y || p.y < uFaceRegion.z || p.y > uFaceRegion.w || vFaceN < 0.15 || vFaceP.z < uFaceMinD ) return base;
  vec2 src = p; float infl = 0.0; vec4 over = vec4( 0.0 );
  faceEye( uEye0, ${GLSL_FLOAT(PROFILE_ROWS.eye0)}, uFaceW.x, uEyeInk0, p, fpx, src, over, infl );
  faceEye( uEye1, ${GLSL_FLOAT(PROFILE_ROWS.eye1)}, uFaceW.y, uEyeInk1, p, fpx, src, over, infl );
  faceMouth( p, fpx, src, over, infl );
  if ( infl <= 0.0 ) return base;
  float may = texture2D( uFaceTex, faceTexUV( p ) ).a;
  vec4 moved = texture2D( uFaceTex, faceTexUV( src ) );
  // Never bring in what may not change (hair, clothes, background): where the read lands there, keep the original.
  vec3 col = mix( mix( base, moved.rgb, moved.a ), over.rgb, over.a );
  return mix( base, col, clamp( infl, 0.0, 1.0 ) * may );
}
`;
/** After map_fragment: the atlas colour through the face (the material's colour is white on a Tripo body). */
export const FACE_FRAGMENT = `
#ifdef USE_MAP
  diffuseColor.rgb = diffuse * faceColor( sampledDiffuseColor.rgb );
#endif
`;

/** The rig's front picture and profile as textures; one pair can serve every body cloned from the same model. */
export function createFaceTextures(THREE, rig) {
  const picture = new THREE.DataTexture(rig.image, rig.size, rig.size, THREE.RGBAFormat);
  picture.colorSpace = THREE.SRGBColorSpace; picture.magFilter = THREE.LinearFilter; picture.minFilter = THREE.LinearMipmapLinearFilter;
  picture.generateMipmaps = true; picture.flipY = false; picture.needsUpdate = true;
  const profile = new THREE.DataTexture(rig.profile, PROFILE_SAMPLES, PROFILE_ROWS.count, THREE.RGBAFormat);
  profile.colorSpace = THREE.NoColorSpace; profile.magFilter = profile.minFilter = THREE.LinearFilter; profile.generateMipmaps = false; profile.flipY = false; profile.needsUpdate = true;
  return { picture, profile, dispose() { picture.dispose(); profile.dispose(); } };
}

/**
 * Put a rig into a material (MeshToonMaterial or MeshStandardMaterial with a map): the front picture and the
 * profile become textures (or `textures` from createFaceTextures, shared and left for their owner to dispose), the
 * shader chunks go in after whatever onBeforeCompile the material already had. Returns { uniforms, set(weights), dispose() }.
 */
export function installFace(THREE, material, rig, { textures = null } = {}) {
  const own = textures ? null : createFaceTextures(THREE, rig);
  const { picture, profile } = textures || own;
  const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const c3 = (a) => new THREE.Color(a[0], a[1], a[2]);
  const [er, el] = rig.eyes, m = rig.mouth;
  const uniforms = {
    uFaceOrigin: { value: v3(rig.origin) }, uFaceLeft: { value: v3(rig.frame.left) }, uFaceUp: { value: v3(rig.frame.up) }, uFaceFwd: { value: v3(rig.frame.forward) },
    uFaceTex: { value: picture }, uFaceProfile: { value: profile },
    uFaceBox: { value: new THREE.Vector4(rig.box.u0, rig.box.v1, rig.box.span, 1 / rig.size) },
    uFaceRegion: { value: new THREE.Vector4(rig.region.u0, rig.region.u1, rig.region.v0, rig.region.v1) },
    uFaceMinD: { value: rig.minDepth },
    uEye0: { value: new THREE.Vector4(er.cu, er.cv, er.hw, er.hh) }, uEye1: { value: new THREE.Vector4(el.cu, el.cv, el.hw, el.hh) },
    uEyeInk0: { value: c3(er.ink) }, uEyeInk1: { value: c3(el.ink) },
    uMouth: { value: new THREE.Vector4(m.cu, m.cv, m.hw, m.teeth ? 1 : 0) },
    uMouthInside: { value: c3(m.inside) }, uMouthTongue: { value: c3(m.tongue) }, uMouthTeeth: { value: c3(m.teethColor) }, uMouthLine: { value: c3(m.line) },
    uFaceW: { value: new THREE.Vector4() }, uMouthW: { value: new THREE.Vector4() },
  };
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = function (shader, renderer) {
    if (previous) previous.call(this, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = FACE_VERTEX_PARS + shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n${FACE_VERTEX}`);
    shader.fragmentShader = FACE_FRAGMENT_PARS + shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>\n${FACE_FRAGMENT}`);
  };
  const key = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : null;
  material.customProgramCacheKey = () => `${key ? key() : ""}|tripo-face-${FACE_VERSION}`;
  material.needsUpdate = true;
  return {
    uniforms,
    set(w) {
      uniforms.uFaceW.value.set(w.blinkRight || 0, w.blinkLeft || 0, w.happy || 0, w.surprised || 0);
      uniforms.uMouthW.value.set(w.open || 0, w.round || 0, w.wide || 0, w.smile || 0);
    },
    dispose() { own?.dispose(); },
  };
}

export { clamp, dot, cross, normalize, smoothstep };
