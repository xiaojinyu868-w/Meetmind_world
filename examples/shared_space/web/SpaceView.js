import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const COLORS = { ink: "#33484a", cream: "#f0e8d9", wood: "#b98b5d", sage: "#819387", blue: "#367f94", coral: "#c55546" };
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const snap = (value) => Math.round(value * 20) / 20;

function canvasTexture(draw, width = 256, height = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function grainTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#c6a77f"; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      ctx.strokeStyle = `rgba(80,49,23,${0.025 + (i % 5) * 0.012})`;
      ctx.lineWidth = i % 7 === 0 ? 2 : 0.6;
      ctx.beginPath();
      const y = i * h / 140;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + Math.sin(i) * 7, w * 0.6, y - Math.sin(i * 0.8) * 5, w, y + 2);
      ctx.stroke();
    }
  });
}

function textSprite(text, color = COLORS.ink, width = 1.1) {
  const short = String(text).length <= 4;
  const texWidth = short ? 192 : 512;
  const texHeight = short ? 96 : 120;
  const texture = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = "rgba(255,253,247,.94)";
    ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, 22); ctx.fill();
    ctx.strokeStyle = "rgba(64,78,66,.17)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = color; ctx.font = '600 45px system-ui, "Noto Sans CJK SC", sans-serif';
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(text).slice(0, 28), w / 2, h / 2, w - 24);
  }, texWidth, texHeight);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, toneMapped: false }));
  sprite.scale.set(width, width * texHeight / texWidth, 1);
  sprite.renderOrder = 20;
  sprite.userData.ownedTexture = texture;
  return sprite;
}

// Each furniture is merged by material. Its object root and meshes survive state updates.
function builder(parent, materials) {
  const batches = new Map();
  function add(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
    geometry.applyMatrix4(matrix);
    const unindexed = geometry.index ? geometry.toNonIndexed() : geometry;
    if (unindexed !== geometry) geometry.dispose();
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(unindexed);
  }
  return {
    box(size, position, material = "wood", radius = 0.025, rotation = [0, 0, 0]) {
      add(new RoundedBoxGeometry(...size, 1, Math.min(radius, ...size.map((v) => v / 3))), material, position, rotation);
    },
    cylinder(top, bottom, height, position, material = "wood", rotation = [0, 0, 0]) {
      add(new THREE.CylinderGeometry(top, bottom, height, 12), material, position, rotation);
    },
    sphere(scale, position, material = "leaf", rotation = [0, 0, 0]) {
      add(new THREE.SphereGeometry(1, 10, 6), material, position, rotation, scale);
    },
    rod(from, to, radius, material = "metal") {
      const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), direction = b.clone().sub(a);
      const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 8);
      geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
      add(geometry, material, a.add(b).multiplyScalar(0.5).toArray());
    },
    finish() {
      for (const [key, parts] of batches) {
        const merged = mergeGeometries(parts, false);
        parts.forEach((part) => part.dispose());
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, materials[key] || materials.wood);
        mesh.name = `surface-${key}`; mesh.castShadow = true; mesh.receiveShadow = true;
        parent.add(mesh);
      }
    },
  };
}

function plant(kit, x, y, z, scale = 1) {
  kit.cylinder(0.13 * scale, 0.09 * scale, 0.21 * scale, [x, y + 0.105 * scale, z], "clay");
  kit.cylinder(0.12 * scale, 0.12 * scale, 0.015, [x, y + 0.208 * scale, z], "soil");
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const end = [x + Math.cos(a) * 0.13 * scale, y + (0.42 + i % 2 * 0.1) * scale, z + Math.sin(a) * 0.13 * scale];
    kit.rod([x, y + 0.2 * scale, z], end, 0.007 * scale, "leaf");
    kit.sphere([0.07 * scale, 0.15 * scale, 0.035 * scale], end, "leaf", [0, a, -0.5]);
  }
}

function books(kit, x, y, z, count = 5) {
  for (let i = 0; i < count; i++) {
    const h = 0.2 + (i % 3) * 0.025;
    kit.box([0.045, h, 0.16], [x + i * 0.05, y + h / 2, z], ["bookBlue", "clay", "paper"][i % 3], 0.005);
  }
}

function furniture(object, materials) {
  const root = new THREE.Group(); root.name = `furniture-${object.id}`; root.userData.objectId = object.id;
  const kit = builder(root, materials);
  const w = number(object.width, 1), d = number(object.depth, 0.7), h = number(object.height, 0.75);
  if (object.kind === "sofa") {
    kit.box([w - 0.09, h * 0.25, d - 0.06], [0, h * 0.28, 0], "fabric", 0.07);
    kit.box([w, h * 0.69, 0.18], [0, h * 0.59, -d / 2 + 0.09], "fabric", 0.085);
    for (const side of [-1, 1]) kit.box([0.18, h * 0.54, d], [side * (w / 2 - 0.09), h * 0.45, 0], "fabric", 0.07);
    for (let i = 0; i < 2; i++) kit.box([(w - 0.43) / 2, h * 0.18, d - 0.23], [(i - 0.5) * (w - 0.39) / 2, h * 0.48, 0.07], "cushion", 0.06);
    for (const side of [-1, 1]) {
      kit.box([0.32, 0.29, 0.13], [side * w * 0.27, h * 0.68, -d * 0.18], side < 0 ? "clay" : "paper", 0.07, [-0.15, 0, side * 0.16]);
      for (const front of [-1, 1]) kit.cylinder(0.035, 0.045, h * 0.17, [side * (w / 2 - 0.16), h * 0.085, front * (d / 2 - 0.13)], "wood");
    }
    kit.box([0.28, 0.018, d * 0.7], [w * 0.25, h * 0.58, 0.04], "throw", 0.012);
  } else if (object.kind === "shelf") {
    for (const side of [-1, 1]) kit.box([0.055, h, d], [side * (w / 2 - 0.0275), h / 2, 0]);
    kit.box([w, h, 0.035], [0, h / 2, -d / 2 + 0.018], "woodDark", 0.008);
    for (let level = 0; level < 4; level++) {
      const y = 0.07 + level * (h - 0.12) / 3;
      kit.box([w, 0.045, d], [0, y, 0]);
      if (level < 3) books(kit, -w * 0.38 + (level % 2) * w * 0.25, y + 0.03, -0.015, Math.max(3, Math.min(7, Math.floor(w * 5))));
    }
    plant(kit, w * 0.30, h, 0, 0.7);
    // The retained paper bridge belongs to the shelf, matching the domain source.
    kit.box([0.32, 0.012, 0.12], [-w * 0.20, h + 0.10, 0.04], "paper", 0.004);
    for (const side of [-1, 1]) kit.box([0.012, 0.11, 0.12], [-w * 0.20 + side * 0.14, h + 0.055, 0.04], "paper", 0.004, [0, 0, side * -0.14]);
  } else {
    const isDesk = object.kind === "desk";
    kit.box([w, 0.075, d], [0, h - 0.0375, 0], "wood", 0.035);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      kit.rod([sx * (w / 2 - 0.09), 0.025, sz * (d / 2 - 0.09)], [sx * (w / 2 - 0.13), h - 0.075, sz * (d / 2 - 0.13)], 0.035, isDesk ? "metal" : "woodDark");
    }
    if (isDesk) {
      kit.box([w * 0.4, 0.026, d * 0.35], [-w * 0.14, h + 0.015, -d * 0.11], "metal", 0.015);
      kit.box([w * 0.4, 0.29, 0.026], [-w * 0.14, h + 0.165, -d * 0.26], "metal", 0.015, [-0.13, 0, 0]);
      kit.box([w * 0.35, 0.235, 0.009], [-w * 0.14, h + 0.165, -d * 0.24], "screen", 0.008, [-0.13, 0, 0]);
      kit.box([0.21, 0.014, 0.27], [w * 0.28, h + 0.016, d * 0.02], "paper", 0.004, [0, 0.13, 0]);
      kit.rod([w * 0.33, h + 0.03, d * 0.1], [w * 0.23, h + 0.03, -0.02], 0.006, "bookBlue");
      // Chair remains within the item's declared footprint.
      kit.box([0.4, 0.07, 0.32], [0, h * 0.59, d * 0.2], "cushion", 0.035);
      kit.box([0.4, 0.23, 0.06], [0, h * 0.68, d * 0.39], "wood", 0.035, [-0.1, 0, 0]);
      for (const side of [-1, 1]) kit.rod([side * 0.14, 0.02, d * 0.36], [side * 0.14, h * 0.62, d * 0.21], 0.02, "metal");
      plant(kit, -w * 0.37, h, -d * 0.29, 0.45);
    } else {
      kit.box([0.27, 0.04, 0.22], [-w * 0.23, h + 0.024, 0.05], "bookBlue", 0.009);
      kit.box([0.245, 0.022, 0.20], [-w * 0.23, h + 0.052, 0.05], "paper", 0.004);
      kit.cylinder(0.055, 0.045, 0.10, [w * 0.24, h + 0.05, d * 0.12], "clay");
    }
  }
  kit.finish();
  root.userData.baseSize = [w, h, d];
  root.userData.kind = object.kind;
  const line = footprint(w, d, COLORS.blue);
  line.name = "object-footprint"; line.visible = false; root.add(line); root.userData.outline = line;
  return root;
}

function footprint(width, depth, color) {
  const points = [[-width / 2, 0.025, -depth / 2], [width / 2, 0.025, -depth / 2], [width / 2, 0.025, depth / 2], [-width / 2, 0.025, depth / 2], [-width / 2, 0.025, -depth / 2]];
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p))), new THREE.LineBasicMaterial({ color, depthTest: false }));
  line.renderOrder = 12;
  return line;
}

/** Independent, persistent Three.js projection of the shared-space state. */
export class SpaceView {
  constructor(container, { onSelect, onMove } = {}) {
    if (!container) throw new Error("SpaceView requires a container");
    this.container = container; this.onSelect = onSelect; this.onMove = onMove;
    this.objects = new Map(); this.labels = new Map(); this.regions = new Map();
    this.selectedId = null; this.mode = "3d"; this.state = null; this.disposed = false; this.dirty = true;
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2(); this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color("#f1ece3");
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia?.("(pointer: coarse)").matches ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.canvas = this.renderer.domElement;
    Object.assign(this.canvas.style, { display: "block", width: "100%", height: "100%", touchAction: "none", outline: "none" });
    this.canvas.tabIndex = 0; this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("aria-label", "共享空间三维视图。点击选择家具，选中后拖动摆放；空白处拖动调整视角。精确移动可使用旁边的坐标控件。");
    container.appendChild(this.canvas);
    this.perspective = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    this.orthographic = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 80);
    this.camera = this.perspective;
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.09;
    this.controls.minPolarAngle = 0.12; this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minDistance = 4; this.controls.maxDistance = 24;
    this.controls.enablePan = false;
    this._controlChange = () => { this.dirty = true; };
    this.controls.addEventListener("change", this._controlChange);
    const wood = grainTexture(); wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    this.materials = {};
    const roles = { wood: ["#ffffff", 0.65], woodDark: ["#887051", 0.8], cream: ["#eee9df", 0.9], wall: ["#e3e6da", 0.95], fabric: ["#809287", 0.95], cushion: ["#a3b2a0", 0.96], throw: ["#ddc19b", 0.95], metal: ["#3b4947", 0.5], screen: ["#5b8990", 0.3], clay: ["#bb765e", 0.82], paper: ["#efe9d5", 0.92], bookBlue: ["#637f91", 0.85], leaf: ["#526e45", 0.9], soil: ["#584537", 1], rug: ["#ded7c4", 1] };
    for (const [key, [color, roughness]] of Object.entries(roles)) this.materials[key] = new THREE.MeshStandardMaterial({ color, roughness, map: key === "wood" ? wood : null, metalness: key === "metal" ? 0.4 : 0 });
    this.woodTexture = wood;
    this.scene.add(new THREE.HemisphereLight("#fff8e6", "#8e9d8d", 2.1));
    this.sun = new THREE.DirectionalLight("#ffe3b2", 3.4); this.sun.position.set(1, 8, 6); this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 22 });
    this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.022;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.environment = new THREE.Group(); this.scene.add(this.environment);
    this._down = (event) => this._pointerDown(event); this._move = (event) => this._pointerMove(event); this._up = (event) => this._pointerUp(event); this._cancel = (event) => this._pointerUp(event, true);
    this.canvas.addEventListener("pointerdown", this._down, true);
    this.canvas.addEventListener("pointermove", this._move);
    this.canvas.addEventListener("pointerup", this._up, true);
    this.canvas.addEventListener("pointercancel", this._cancel, true);
    this.canvas.addEventListener("lostpointercapture", this._cancel, true);
    this._blur = () => { if (this.drag) this._pointerUp({ pointerId: this.drag.pointerId }, true); };
    window.addEventListener("blur", this._blur);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    this._animate = () => {
      if (this.disposed) return;
      this.frame = requestAnimationFrame(this._animate);
      this.controls.update();
      if (this.dirty) { this.renderer.render(this.scene, this.camera); this.dirty = false; }
    };
    this.resize(); this._animate();
  }

  _buildRoom(room) {
    this._release(this.environment); this.environment = new THREE.Group(); this.scene.add(this.environment);
    this.walls = new THREE.Group(); this.environment.add(this.walls);
    const w = number(room.width, 6), d = number(room.depth, 5), h = number(room.height, 2.8);
    const kit = builder(this.environment, this.materials);
    kit.box([w + 0.12, 0.13, d + 0.12], [w / 2, -0.09, d / 2], "woodDark", 0.04);
    for (let row = 0; row < Math.ceil(d / 0.35); row++) {
      const rowDepth = Math.min(0.345, d - row * 0.35);
      if (rowDepth <= 0) continue;
      kit.box([w - 0.008, 0.025, rowDepth], [w / 2, -0.007, row * 0.35 + rowDepth / 2], "wood", 0.004);
    }
    kit.finish();
    const wall = builder(this.walls, this.materials);
    const door = room.door || { x: w / 2, width: 1.2 };
    const doorLeft = Math.max(0, door.x - door.width / 2), doorRight = Math.min(w, door.x + door.width / 2);
    if (doorLeft > 0) wall.box([doorLeft, h, 0.12], [doorLeft / 2, h / 2, -0.045], "cream", 0.014);
    if (w > doorRight) wall.box([w - doorRight, h, 0.12], [(w + doorRight) / 2, h / 2, -0.045], "cream", 0.014);
    wall.box([door.width, 0.65, 0.12], [door.x, h - 0.325, -0.045], "cream", 0.014);
    for (const x of [doorLeft - 0.035, doorRight + 0.035]) wall.box([0.075, h - 0.63, 0.17], [x, (h - 0.63) / 2, -0.015], "wood", 0.01);
    wall.box([door.width + 0.14, 0.08, 0.17], [door.x, h - 0.65, -0.015], "wood", 0.01);
    // Window opening: the cutaway wall is built around the opening, never a solid painted box.
    const start = d * 0.30, end = d * 0.78;
    wall.box([0.12, 0.82, d], [-0.045, 0.41, d / 2], "wall", 0.012);
    wall.box([0.12, 0.35, d], [-0.045, h - 0.175, d / 2], "wall", 0.012);
    wall.box([0.12, h, start], [-0.045, h / 2, start / 2], "wall", 0.012);
    wall.box([0.12, h, d - end], [-0.045, h / 2, (d + end) / 2], "wall", 0.012);
    for (const z of [start, (start + end) / 2, end]) wall.box([0.10, h - 1.17, 0.055], [0, (h + 0.47) / 2, z], "cream", 0.009);
    wall.box([0.24, 0.08, end - start + 0.15], [0.025, 0.83, (start + end) / 2], "cream", 0.01);
    wall.box([0.07, 0.055, end - start], [0, 1.65, (start + end) / 2], "cream", 0.007);
    wall.finish();
    this.walls.visible = this.mode === "3d";
    // Context labels do not introduce untracked furniture into the editable plan.
    for (let x = 0; x <= w; x++) {
      const label = textSprite(`${x} m`, "#626a5d", 0.52); label.position.set(x, 0.04, d + 0.3); this.environment.add(label);
    }
    for (let z = 1; z <= d; z++) {
      const label = textSprite(`${z} m`, "#626a5d", 0.52); label.position.set(w + 0.3, 0.04, z); this.environment.add(label);
    }
    const roomLine = footprint(w, d, "#b3afa0"); roomLine.position.set(w / 2, 0, d / 2); this.environment.add(roomLine);
    this.sun.target.position.set(w / 2, 0, d / 2);
    this.controls.target.set(w / 2, this.mode === "2d" ? 0 : 0.45, d / 2);
    this.perspective.position.set(w / 2 + 7.4, 8.0, d / 2 + 9.2);
    this.orthographic.position.set(w / 2, 16, d / 2); this.orthographic.up.set(0, 0, -1); this.orthographic.lookAt(w / 2, 0, d / 2);
    this.controls.update(); this.resize();
  }

  apply(state) {
    if (this.disposed || !state) return;
    this.state = state;
    const room = state.room || { width: 6, depth: 5, height: 2.8 };
    const roomKey = JSON.stringify(room);
    if (roomKey !== this.roomKey) { this.roomKey = roomKey; this._buildRoom(room); }
    const objectIds = new Set((state.objects || []).map((object) => object.id));
    for (const [id, root] of this.objects) if (!objectIds.has(id)) {
      this._release(root); this.objects.delete(id); this._release(this.labels.get(id)); this.labels.delete(id);
      if (this.selectedId === id) this.selectedId = null;
    }
    this.conflictIds = new Set((state.violations || []).flatMap((item) => item.object_ids || []));
    for (const object of state.objects || []) {
      let root = this.objects.get(object.id);
      if (root && root.userData.kind !== object.kind) { this._release(root); root = null; }
      if (!root) { root = furniture(object, this.materials); this.scene.add(root); this.objects.set(object.id, root); }
      const [w, h, d] = root.userData.baseSize;
      root.scale.set(number(object.width, w) / w, number(object.height, h) / h, number(object.depth, d) / d);
      if (this.drag?.id !== object.id) {
        root.position.set(number(object.x, 0), 0, number(object.z, 0)); root.rotation.y = number(object.rotation, 0) * Math.PI / 180;
      }
      const labelText = `${this.conflictIds.has(object.id) ? "! " : ""}${object.label || object.kind}`;
      let label = this.labels.get(object.id);
      if (!label || label.userData.text !== labelText) {
        this._release(label); label = textSprite(labelText, this.conflictIds.has(object.id) ? COLORS.coral : COLORS.ink, 1.05);
        label.userData.text = labelText; this.labels.set(object.id, label); this.scene.add(label);
      }
      label.position.set(root.position.x, number(object.height, 0.8) + 0.15, root.position.z);
    }
    const specs = [];
    if (room.door) specs.push({ id: "door-clearance", label: "入口 · 保持通畅", zone: room.door, color: "#b98852" });
    for (const requirement of state.requirements || []) if (requirement.enabled && requirement.zone) specs.push({ id: requirement.id, label: requirement.label, zone: requirement.zone, color: "#4e9691" });
    const wanted = new Set(specs.map((spec) => spec.id));
    for (const [id, region] of this.regions) if (!wanted.has(id)) { this._release(region); this.regions.delete(id); }
    for (const spec of specs) {
      let region = this.regions.get(spec.id); const signature = JSON.stringify(spec);
      if (!region || region.userData.signature !== signature) {
        this._release(region); region = new THREE.Group(); region.userData.signature = signature;
        const zone = spec.zone;
        const fill = new THREE.Mesh(new THREE.PlaneGeometry(zone.width, zone.depth), new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
        fill.rotation.x = -Math.PI / 2; fill.position.y = 0.025; region.add(fill);
        const border = footprint(zone.width, zone.depth, spec.color); border.position.y = 0.012; region.add(border);
        const label = textSprite(spec.label, spec.color, Math.min(1.45, Math.max(0.9, zone.width))); label.position.set(0, 0.08, -zone.depth / 2 + 0.13); region.add(label);
        region.position.set(zone.x, 0, zone.z); this.scene.add(region); this.regions.set(spec.id, region);
      }
    }
    this._refreshSelection(); this.renderer.shadowMap.needsUpdate = true; this.dirty = true;
  }

  select(id) {
    this.selectedId = this.objects.has(id) ? id : null;
    this._refreshSelection(); this.dirty = true;
  }

  _refreshSelection() {
    for (const [id, root] of this.objects) {
      const conflict = this.conflictIds?.has(id), selected = id === this.selectedId;
      root.userData.outline.visible = selected || conflict || this.mode === "2d";
      root.userData.outline.material.color.set(conflict ? COLORS.coral : selected ? COLORS.blue : "#a09c8d");
      this.labels.get(id).visible = this.mode === "2d" || selected || conflict;
    }
    this.canvas.style.cursor = this.drag ? "grabbing" : "grab";
  }

  setMode(mode) {
    if (!["3d", "2d"].includes(mode) || mode === this.mode || this.disposed) return;
    if (this.drag) this._pointerUp({ pointerId: this.drag.pointerId }, true);
    this.mode = mode;
    const room = this.state?.room || { width: 6, depth: 5 };
    this.camera = mode === "2d" ? this.orthographic : this.perspective;
    this.controls.object = this.camera; this.controls.enableRotate = mode === "3d";
    this.controls.target.set(room.width / 2, mode === "2d" ? 0 : 0.45, room.depth / 2);
    if (mode === "2d") { this.camera.position.set(room.width / 2, 16, room.depth / 2); this.camera.up.set(0, 0, -1); this.camera.lookAt(this.controls.target); }
    this.controls.minZoom = 0.6; this.controls.maxZoom = 3;
    if (this.walls) this.walls.visible = mode === "3d";
    this.canvas.setAttribute("aria-label", mode === "2d" ? "共享空间顶视平面图。点击家具选择，拖动改变实际位置。" : "共享空间三维视图。点击选择家具，选中后拖动摆放；空白处拖动调整视角。");
    this._refreshSelection(); this.controls.update(); this.resize(); this.renderer.shadowMap.needsUpdate = true; this.dirty = true;
  }

  _ray(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster;
  }

  _pick(event) {
    const hits = this._ray(event).intersectObjects([...this.objects.values()], true);
    for (const hit of hits) {
      if (!hit.object.isMesh) continue;
      let root = hit.object;
      while (root && !root.userData.objectId) root = root.parent;
      if (root) return root;
    }
    return null;
  }

  _pointerDown(event) {
    if (event.button !== 0 || this.drag || !this.state) return;
    const root = this._pick(event);
    if (!root) return;
    const id = root.userData.objectId, alreadySelected = this.selectedId === id;
    this.select(id); this.onSelect?.(id);
    if (this.mode !== "2d" && !alreadySelected) return;
    const point = new THREE.Vector3();
    if (!this._ray(event).ray.intersectPlane(this.floorPlane, point)) return;
    this.drag = { id, pointerId: event.pointerId, point, start: root.position.clone(), x: event.clientX, y: event.clientY, moved: false };
    this.controls.enabled = false;
    this.canvas.setPointerCapture(event.pointerId); this.canvas.style.cursor = "grabbing";
    event.preventDefault(); event.stopPropagation();
  }

  _pointerMove(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - this.drag.x, event.clientY - this.drag.y) < 5 && !this.drag.moved) return;
    const point = new THREE.Vector3(); if (!this._ray(event).ray.intersectPlane(this.floorPlane, point)) return;
    this.drag.moved = true;
    const root = this.objects.get(this.drag.id); if (!root) return;
    const room = this.state.room;
    root.position.x = snap(THREE.MathUtils.clamp(this.drag.start.x + point.x - this.drag.point.x, 0, room.width));
    root.position.z = snap(THREE.MathUtils.clamp(this.drag.start.z + point.z - this.drag.point.z, 0, room.depth));
    const label = this.labels.get(this.drag.id); if (label) { label.position.x = root.position.x; label.position.z = root.position.z; }
    this.renderer.shadowMap.needsUpdate = true; this.dirty = true; event.preventDefault();
  }

  _pointerUp(event, cancelled = false) {
    const drag = this.drag; if (!drag || event.pointerId !== drag.pointerId) return;
    this.drag = null; this.controls.enabled = true;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.canvas.style.cursor = "grab";
    const root = this.objects.get(drag.id); if (!root) return;
    if (cancelled) { root.position.copy(drag.start); this.apply(this.state); return; }
    if (drag.moved) {
      const command = { object_id: drag.id, x: root.position.x, z: root.position.z, rotation: Math.round(THREE.MathUtils.radToDeg(root.rotation.y)) };
      try {
        const result = this.onMove?.(command);
        if (result?.catch) result.catch(() => { if (!this.disposed) this.apply(this.state); });
      } catch (error) { this.apply(this.state); throw error; }
    }
    this.dirty = true;
  }

  resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight || 480);
    this.renderer.setSize(width, height, false);
    this.perspective.aspect = width / height;
    this.perspective.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(38) / 2) * Math.max(1, height / width)));
    this.perspective.updateProjectionMatrix();
    const room = this.state?.room || { width: 6, depth: 5 };
    const halfHeight = Math.max((room.depth + 1.3) / 2, (room.width + 1.3) / (2 * width / height));
    Object.assign(this.orthographic, { left: -halfHeight * width / height, right: halfHeight * width / height, top: halfHeight, bottom: -halfHeight });
    this.orthographic.updateProjectionMatrix(); this.dirty = true;
  }

  diagnostics() {
    const info = this.renderer.info;
    return { object_scales: Object.fromEntries([...this.objects].map(([id, root]) => [id, root.scale.toArray()])), mode: this.mode, objects: this.objects.size, selected_id: this.selectedId, object_uuids: Object.fromEntries([...this.objects].map(([id, root]) => [id, root.uuid])), mesh_uuids: Object.fromEntries([...this.objects].map(([id, root]) => [id, root.children.filter((child) => child.isMesh).map((child) => child.uuid)])), draw_calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures, dpr: this.renderer.getPixelRatio(), shadows: { lights: 1, map: 1024 }, viewport: { width: this.canvas.clientWidth, height: this.canvas.clientHeight }, dragging: this.drag?.id || null };
  }

  _release(root) {
    if (!root) return;
    root.removeFromParent();
    const shared = new Set(Object.values(this.materials || {}));
    root.traverse((child) => {
      child.geometry?.dispose();
      for (const material of Array.isArray(child.material) ? child.material : child.material ? [child.material] : []) {
        if (!shared.has(material)) { material.map?.dispose(); material.dispose(); }
      }
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; cancelAnimationFrame(this.frame); this.resizeObserver.disconnect();
    this.canvas.removeEventListener("pointerdown", this._down, true); this.canvas.removeEventListener("pointermove", this._move);
    this.canvas.removeEventListener("pointerup", this._up, true); this.canvas.removeEventListener("pointercancel", this._cancel, true);
    this.canvas.removeEventListener("lostpointercapture", this._cancel, true);
    window.removeEventListener("blur", this._blur);
    this.controls.removeEventListener("change", this._controlChange); this.controls.dispose();
    this._release(this.scene); Object.values(this.materials).forEach((material) => material.dispose()); this.woodTexture.dispose();
    this.sun.shadow.map?.dispose(); this.renderer.dispose(); this.canvas.remove();
    this.objects.clear(); this.labels.clear(); this.regions.clear();
  }
}
