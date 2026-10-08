import * as THREE from "three";
import { COURT_LIGHT, fillPosition } from "../runtime/CourtLook.js";

// Event dressing for the guest court, built from the calibrated activity
// bounds only: warm stone paving under the guests, an inlaid 相遇之庭 emblem,
// a festoon canopy over the court and two banners facing the guests.
// Purely visual (no colliders, no picking). While the event view is shown the
// court's light and film (CourtLook) are laid over EventLook.

const SERIF = '"Songti SC","STSong","Noto Serif SC","Source Han Serif SC","SimSun",serif';
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function canvas(width, height = width) {
  const element = document.createElement("canvas");
  element.width = width; element.height = height;
  return [element, element.getContext("2d")];
}

// One 4.8 m tile of large-format 1.2 × 0.6 m stone in running bond.
const PAVING_TILE = 4.8;

function pavingTexture() {
  const [element, g] = canvas(1024);
  g.fillStyle = "#a8957c"; g.fillRect(0, 0, 1024, 1024);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rows = 8, cols = 4, h = 1024 / rows, w = 1024 / cols;
  for (let r = 0; r < rows; r++) {
    for (let k = -1; k <= cols; k++) {
      const x = k * w + (r % 2) * w / 2, y = r * h, tone = 0.92 + rnd() * 0.1, warm = rnd() * 10;
      const base = [226 * tone + warm, 207 * tone + warm * 0.6, 178 * tone];
      const gradient = g.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, `rgb(${base.map(v => Math.min(255, v + 4) | 0)})`);
      gradient.addColorStop(1, `rgb(${base.map(v => Math.max(0, v - 5) | 0)})`);
      g.fillStyle = gradient;
      g.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);
    }
  }
  for (let i = 0; i < 12000; i++) {
    g.fillStyle = rnd() > 0.5 ? "rgba(255,250,240,0.045)" : "rgba(90,74,58,0.04)";
    g.fillRect(rnd() * 1024, rnd() * 1024, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const texture = new THREE.CanvasTexture(element);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Rounded-rectangle falloff so the paving melts into the surveyed floor.
function edgeFade(feather = 0.16) {
  const size = 256, [element, g] = canvas(size), image = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1), v = y / (size - 1);
    const edge = Math.min(u, 1 - u, v, 1 - v);
    const value = Math.round(255 * smooth(0, feather, edge));
    const i = (y * size + x) * 4;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value; image.data[i + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  return new THREE.CanvasTexture(element);
}

// Bold enough to read from the guest camera, which sees the floor at ~16°:
// a bronze lettering band, heavy rings and the two-circle mark.
function emblemTexture(event = {}) {
  const S = 2048, c = S / 2, TAU = Math.PI * 2, [element, g] = canvas(S);
  const ink = "rgba(96,64,34,0.95)", band = "rgba(116,80,44,0.62)", cream = "rgba(255,245,228,0.96)";
  g.clearRect(0, 0, S, S);
  const wash = g.createRadialGradient(c, c, 80, c, c, 790);
  wash.addColorStop(0, "rgba(255,228,190,0.34)"); wash.addColorStop(1, "rgba(255,228,190,0.08)");
  g.fillStyle = wash; g.beginPath(); g.arc(c, c, 790, 0, TAU); g.fill();
  g.fillStyle = band; g.beginPath(); g.arc(c, c, 1012, 0, TAU); g.arc(c, c, 792, 0, TAU, true); g.fill();
  const ring = (r, width, style) => { g.strokeStyle = style; g.lineWidth = width; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); };
  ring(1010, 24, ink); ring(792, 16, ink); ring(690, 7, "rgba(96,64,34,0.6)");
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * TAU, long = i % 4 === 0, r0 = long ? 700 : 735;
    g.strokeStyle = ink; g.lineWidth = long ? 12 : 7;
    g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * 784, c + Math.sin(a) * 784); g.stroke();
  }
  const name = event.name || "相遇之庭", brand = event.brand || "ECHO CAMPUS", subtitle = event.subtitle || "碰一下，就在这里相遇";
  const glyphs = [...`${name} · ${brand} · ${subtitle} · `];
  const wide = glyph => /[\u3000-\u9fff\uff00-\uffef]/.test(glyph);
  const fontFor = (glyph, size) => (wide(glyph) ? `600 ${size}px ${SERIF}` : `700 ${Math.round(size * 0.74)}px ${SERIF}`);
  const measure = size => glyphs.map(glyph => { g.font = fontFor(glyph, size); return g.measureText(glyph).width; });
  const textRadius = 902, room = TAU * textRadius;
  let size = 136, widths = measure(size), total = widths.reduce((sum, w) => sum + w, 0);
  if (total > room * 0.9) { size = Math.floor(size * room * 0.9 / total); widths = measure(size); total = widths.reduce((sum, w) => sum + w, 0); }
  const track = (room - total) / glyphs.length;
  g.fillStyle = cream; g.textAlign = "center"; g.textBaseline = "middle";
  let along = 0;
  glyphs.forEach((glyph, i) => {
    const a = (along + widths[i] / 2) / textRadius - Math.PI / 2;
    along += widths[i] + track;
    g.save(); g.translate(c + Math.cos(a) * textRadius, c + Math.sin(a) * textRadius); g.rotate(a + Math.PI / 2);
    g.font = fontFor(glyph, size); g.fillText(glyph, 0, 0); g.restore();
  });
  // Two circles meeting: the court's mark.
  const d = 170, r = 300, half = Math.acos(d / r);
  for (const dx of [-d, d]) { g.fillStyle = "rgba(255,236,206,0.22)"; g.beginPath(); g.arc(c + dx, c, r, 0, TAU); g.fill(); }
  g.fillStyle = "rgba(206,98,58,0.62)";
  g.beginPath(); g.arc(c - d, c, r, -half, half); g.arc(c + d, c, r, Math.PI - half, Math.PI + half); g.fill();
  g.lineWidth = 26; g.strokeStyle = ink;
  for (const dx of [-d, d]) { g.beginPath(); g.arc(c + dx, c, r, 0, TAU); g.stroke(); }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function bannerTexture(event = {}, accent = "#d2643c") {
  const [element, g] = canvas(256, 832);
  const background = g.createLinearGradient(0, 0, 0, 832);
  background.addColorStop(0, "#22312a"); background.addColorStop(1, "#16201b");
  g.fillStyle = background; g.fillRect(0, 0, 256, 832);
  g.fillStyle = accent; g.fillRect(0, 0, 256, 14); g.fillRect(0, 818, 256, 14);
  g.strokeStyle = "rgba(255,207,143,0.55)"; g.lineWidth = 3; g.strokeRect(18, 30, 220, 772);
  g.fillStyle = "#f6f1e6"; g.textAlign = "center"; g.textBaseline = "middle";
  const name = [...(event.name || "相遇之庭")].slice(0, 6);
  const step = Math.min(132, 520 / name.length);
  name.forEach((glyph, i) => { g.font = `500 ${Math.round(step * 0.82)}px ${SERIF}`; g.fillText(glyph, 128, 120 + i * step + step / 2); });
  g.fillStyle = "#ffcf8f"; g.font = '600 22px "Segoe UI",sans-serif';
  g.save(); g.translate(128, 720); g.fillText(event.brand || "ECHO CAMPUS", 0, 0); g.restore();
  g.font = `400 24px ${SERIF}`; g.fillStyle = "rgba(246,241,230,0.75)";
  g.fillText("碰一下 · 相遇", 128, 768);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function glowTexture() {
  const [element, g] = canvas(64);
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)"); gradient.addColorStop(0.25, "rgba(255,230,190,0.55)"); gradient.addColorStop(1, "rgba(255,200,140,0)");
  g.fillStyle = gradient; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(element);
}

/**
 * Festoon canopy: a row of poles along the far (north) edge and two anchors
 * at the near corners, outside the guest camera's frame, so no pole stands
 * between the camera and the crowd. Strands run along the back row; the
 * outer back poles fan to their own side's anchor and the inner ones to
 * both, crossing over the middle of the crowd. Poles are nudged clear of
 * garden props. Pure.
 */
export function planFestoon(bounds, colliders = [], { spacing = 8.5, offset = 0.6, front = 2.2, inset = 1.2 } = {}) {
  const span = bounds.maxX - bounds.minX, count = Math.max(2, Math.round(span / spacing));
  const step = span / count, clear = (x, z) => colliders.every(c => Math.hypot(x - c.x, z - c.z) > (c.r ?? 0) + 0.45);
  const settle = (x, z) => { for (const dx of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4]) if (clear(x + dx, z)) return { x: x + dx, z }; return { x, z }; };
  const north = Array.from({ length: count }, (_, i) => settle(bounds.minX + step * (i + 0.5), bounds.minZ - offset));
  const corners = [settle(bounds.minX + inset, bounds.maxZ + front), settle(bounds.maxX - inset, bounds.maxZ + front)];
  const strands = [];
  for (let i = 0; i + 1 < count; i++) strands.push([north[i], north[i + 1]]);
  north.forEach((pole, i) => {
    if (i < count - 1) strands.push([pole, corners[0]]);
    if (i > 0) strands.push([pole, corners[1]]);
  });
  return { poles: [...north, ...corners], north, corners, strands };
}

// EventLook profiles of the surveyed ground, which carries a slope-scaled
// polygon offset against a coplanar duplicate layer.
const GROUND_PROFILES = new Set(["site", "site-dark"]);

export function createCourtDressing({ bounds, groundY = 0, event = {}, theme = {}, colliders = [], quality = "balanced", sun = null, hemi = null, fill = null, renderer = null, scene = null, reversedDepth = false, replaces = [], look = null } = {}) {
  const root = new THREE.Group();
  root.name = "Court dressing · 相遇之庭";
  const resources = [];
  const keep = item => { resources.push(item); return item; };
  const noPick = object => { object.raycast = () => {}; object.userData.noCollision = true; return object; };
  const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minZ + bounds.maxZ) / 2;
  // three r185 reverses the sorted render lists for reversed-depth cameras,
  // which also reverses renderOrder.
  const drawOrder = order => (reversedDepth ? -order : order);
  // The ground's polygon offset pulls it ~2 px of depth slope toward a guest
  // camera at 16°, which buries anything a few cm above it. So the ground
  // draws first, then the court floor paints over it unconditionally and
  // writes its true depth; guests, shadows and rings then test against that.
  // r185 also maps every depthFunc through ReversedDepthFuncs, including
  // AlwaysDepth -> NeverDepth, so "always" has to be requested as Never there.
  const alwaysDepth = reversedDepth ? THREE.NeverDepth : THREE.AlwaysDepth;
  const floorPass = { transparent: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, depthFunc: alwaysDepth, depthWrite: true };

  // Warm paving that fades into the surveyed floor beyond the court. The near
  // edge stops short of the raised entrance slab ~5 m south of the court.
  const pave = { x0: bounds.minX - 6, x1: bounds.maxX + 6, z0: bounds.minZ - 4, z1: bounds.maxZ + 4.5 };
  const width = pave.x1 - pave.x0, depth = pave.z1 - pave.z0;
  const paving = keep(pavingTexture());
  paving.repeat.set(width / PAVING_TILE, depth / PAVING_TILE);
  const pavingMaterial = keep(new THREE.MeshStandardMaterial({ map: paving, alphaMap: keep(edgeFade()), roughness: 0.82, metalness: 0, ...floorPass }));
  const floor = noPick(new THREE.Mesh(keep(new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2)), pavingMaterial));
  floor.name = "court paving"; floor.position.set((pave.x0 + pave.x1) / 2, groundY + 0.014, (pave.z0 + pave.z1) / 2);
  floor.receiveShadow = true; floor.renderOrder = drawOrder(-20);
  root.add(floor);

  // The inlaid emblem at the heart of the court.
  let emblemMap = keep(emblemTexture(event));
  const emblemMaterial = keep(new THREE.MeshStandardMaterial({ map: emblemMap, roughness: 0.45, metalness: 0.35, emissive: new THREE.Color(0xffcf8f), emissiveMap: emblemMap, emissiveIntensity: 0.22, ...floorPass }));
  const radius = Math.min(4.2, (bounds.maxZ - bounds.minZ) * 0.3);
  const emblem = noPick(new THREE.Mesh(keep(new THREE.CircleGeometry(radius, 96).rotateX(-Math.PI / 2)), emblemMaterial));
  emblem.name = "相遇之庭 floor emblem"; emblem.position.set(cx, groundY + 0.018, cz); emblem.receiveShadow = true; emblem.renderOrder = drawOrder(-19);
  root.add(emblem);

  // Festoon canopy strung from the back row to the two front anchors.
  const festoon = planFestoon(bounds, colliders);
  const backHeight = 5.1, frontHeight = 4.6, sag = 0.8;
  const heightOf = pole => (festoon.corners.includes(pole) ? frontHeight : backHeight);
  const poleMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x3a3631, roughness: 0.45, metalness: 0.55 }));
  const poleGeometry = keep(new THREE.CylinderGeometry(0.032, 0.048, 1, 8).translate(0, 0.5, 0));
  const poles = noPick(new THREE.InstancedMesh(poleGeometry, poleMaterial, festoon.poles.length));
  const matrix = new THREE.Matrix4();
  festoon.poles.forEach((p, i) => poles.setMatrixAt(i, matrix.makeScale(1, heightOf(p), 1).setPosition(p.x, groundY, p.z)));
  poles.castShadow = quality !== "low"; poles.name = "festoon poles";
  root.add(poles);
  const wirePoints = [], bulbs = [];
  for (const [a, b] of festoon.strands) {
    const start = new THREE.Vector3(a.x, groundY + heightOf(a) - 0.05, a.z), end = new THREE.Vector3(b.x, groundY + heightOf(b) - 0.05, b.z);
    const length = start.distanceTo(end), count = Math.max(6, Math.round(length / 0.85));
    const at = t => start.clone().lerp(end, t).add(new THREE.Vector3(0, -4 * sag * Math.min(1, length / 16) * t * (1 - t), 0));
    for (let i = 0; i < 24; i++) wirePoints.push(at(i / 24), at((i + 1) / 24));
    for (let i = 1; i < count; i++) bulbs.push(at(i / count).add(new THREE.Vector3(0, -0.06, 0)));
  }
  const wire = noPick(new THREE.LineSegments(keep(new THREE.BufferGeometry().setFromPoints(wirePoints)), keep(new THREE.LineBasicMaterial({ color: 0x2a2724, transparent: true, opacity: 0.6 }))));
  wire.name = "festoon wire"; root.add(wire);
  const bulbMesh = noPick(new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.05, 10, 8)), keep(new THREE.MeshBasicMaterial({ color: 0xffe2b4, toneMapped: false })), bulbs.length));
  bulbs.forEach((p, i) => bulbMesh.setMatrixAt(i, matrix.makeTranslation(p.x, p.y, p.z)));
  bulbMesh.name = "festoon bulbs"; root.add(bulbMesh);
  const glowGeometry = keep(new THREE.BufferGeometry().setFromPoints(bulbs));
  const glowMaterial = keep(new THREE.PointsMaterial({ map: keep(glowTexture()), color: 0xffc777, size: 0.62, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  const glow = noPick(new THREE.Points(glowGeometry, glowMaterial));
  glow.name = "festoon glow"; glow.renderOrder = drawOrder(5); root.add(glow);

  // Banners hung on the two back poles nearest the axis, facing the guests.
  let bannerMap = keep(bannerTexture(event, theme.accent));
  const bannerMaterial = keep(new THREE.MeshStandardMaterial({ map: bannerMap, roughness: 0.82, side: THREE.DoubleSide }));
  const bannerGeometry = keep(new THREE.PlaneGeometry(0.95, 3.1));
  const flagPoles = [...festoon.north].sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx)).slice(0, 2);
  for (const pole of flagPoles) {
    const cloth = noPick(new THREE.Mesh(bannerGeometry, bannerMaterial));
    cloth.name = "court banner";
    cloth.position.set(pole.x + Math.sign(cx - pole.x || 1) * 0.52, groundY + 2.95, pole.z + 0.06);
    cloth.castShadow = quality !== "low";
    root.add(cloth);
  }

  // Grade layered over EventLook: warmer key, warmer bounce, a little less
  // flat fill and exposure, so the court reads as late-afternoon light.
  let graded = null, floorState = null;
  function setEnabled(on) {
    if (on && !graded && sun && hemi) {
      graded = { sun: [sun.color.clone(), sun.intensity, sun.shadow.intensity], hemi: [hemi.color.clone(), hemi.groundColor.clone(), hemi.intensity], fill: fill ? [fill.color.clone(), fill.intensity, fill.position.clone(), fill.target.position.clone()] : null, exposure: renderer?.toneMappingExposure, environment: scene?.environmentIntensity };
      sun.color.set(COURT_LIGHT.sun.color); sun.intensity = COURT_LIGHT.sun.intensity; sun.shadow.intensity = COURT_LIGHT.sun.shadowIntensity;
      hemi.color.set(COURT_LIGHT.sky.sky); hemi.groundColor.set(COURT_LIGHT.sky.ground); hemi.intensity = COURT_LIGHT.sky.intensity;
      if (fill) {
        fill.color.set(COURT_LIGHT.fill.color); fill.intensity = COURT_LIGHT.fill.intensity;
        // The fill's target is not in the scene graph: its matrix is updated by hand.
        const center = sun.target.position;
        fill.position.copy(fillPosition(center, sun.position.clone().sub(center)));
        fill.target.position.copy(center); fill.target.updateMatrixWorld();
      }
      if (renderer) renderer.toneMappingExposure = COURT_LIGHT.exposure;
      if (scene) scene.environmentIntensity = COURT_LIGHT.environment;
    } else if (!on && graded) {
      sun.color.copy(graded.sun[0]); sun.intensity = graded.sun[1]; sun.shadow.intensity = graded.sun[2];
      hemi.color.copy(graded.hemi[0]); hemi.groundColor.copy(graded.hemi[1]); hemi.intensity = graded.hemi[2];
      if (fill && graded.fill) {
        fill.color.copy(graded.fill[0]); fill.intensity = graded.fill[1];
        fill.position.copy(graded.fill[2]); fill.target.position.copy(graded.fill[3]); fill.target.updateMatrixWorld();
      }
      if (renderer && graded.exposure !== undefined) renderer.toneMappingExposure = graded.exposure;
      if (scene && graded.environment !== undefined) scene.environmentIntensity = graded.environment;
      graded = null;
    }
    if (on && !floorState) {
      floorState = { ground: [], replaced: replaces.map(object => [object, object.visible]) };
      scene?.traverse(object => {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (object.isMesh && materials.some(m => GROUND_PROFILES.has(m?.userData?.eventProfile))) {
          floorState.ground.push([object, object.renderOrder]);
          object.renderOrder = drawOrder(-30);
        }
      });
      for (const object of replaces) object.visible = false;
    } else if (!on && floorState) {
      for (const [object, order] of floorState.ground) object.renderOrder = order;
      for (const [object, visible] of floorState.replaced) object.visible = visible;
      floorState = null;
    }
    look?.use(on ? "day" : "neutral");
    root.visible = !!on;
  }

  let lastEvent = `${event.name}|${event.brand}|${event.subtitle}`;
  function setEvent(next = {}) {
    const key = `${next.name}|${next.brand}|${next.subtitle}`;
    if (key === lastEvent) return;
    lastEvent = key;
    const emblemNext = emblemTexture(next), bannerNext = bannerTexture(next, next.theme?.accent || theme.accent);
    emblemMaterial.map = emblemMaterial.emissiveMap = emblemNext; bannerMaterial.map = bannerNext;
    emblemMaterial.needsUpdate = bannerMaterial.needsUpdate = true;
    emblemMap.dispose(); bannerMap.dispose();
    emblemMap = keep(emblemNext); bannerMap = keep(bannerNext);
  }

  return {
    root, festoon, diagnostics: { bulbs: bulbs.length, poles: festoon.poles.length, paving: [width, depth] },
    setEnabled, setEvent,
    update(dt, time) { glowMaterial.opacity = 0.5 + Math.sin(time * 1.3) * 0.05 + Math.sin(time * 3.1) * 0.02; },
    dispose() {
      setEnabled(false);
      root.removeFromParent();
      for (const item of resources) item.dispose?.();
      poles.dispose(); bulbMesh.dispose();
    },
  };
}
