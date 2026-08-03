import * as THREE from "three";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  MessageCircle,
  RotateCcw,
  Sparkles,
  X,
  createIcons,
} from "lucide";
import { normalizeFieldAsset } from "../../runtime/SceneAppEntry.js";
import "./field.css";


const ICONS = {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  MessageCircle,
  RotateCcw,
  Sparkles,
  X,
};
const MOVE_SPEED = 3.1;
const INTERACTION_RADIUS = 1.65;
const DIAGNOSTIC_INTERVAL = 20;


function icon(name) {
  return `<i data-lucide="${name}"></i>`;
}


function disposeObject(root) {
  root?.traverse((object) => {
    object.geometry?.dispose();
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
    else object.material?.dispose();
  });
}


function makePlayer(accent) {
  const root = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.78 });
  const light = new THREE.MeshStandardMaterial({ color: "#f4ead2", roughness: 0.88 });
  const dark = new THREE.MeshStandardMaterial({ color: "#263b38", roughness: 0.82 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.34), coat);
  body.position.y = 0.78;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), light);
  head.position.y = 1.34;
  const legs = [-0.14, 0.14].map((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.16), dark);
    leg.position.set(x, 0.25, 0);
    return leg;
  });
  root.add(body, head, ...legs);
  root.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return root;
}


function makeFieldEntity(entity, accent, index) {
  const root = new THREE.Group();
  root.position.set(entity.position.x, 0, entity.position.z);
  root.userData.fieldEntity = entity;
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: index % 2 === 0 ? "#f0c36a" : accent,
    emissive: index % 2 === 0 ? "#4a3211" : "#102c2a",
    emissiveIntensity: 0.18,
    roughness: 0.58,
    metalness: 0.04,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: "#25463e", roughness: 0.86 });
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: "#fff2bd",
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
  });
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, 0.22, 7), darkMaterial);
  pedestal.position.y = 0.11;
  const marker = entity.type === "thread"
    ? new THREE.Mesh(new THREE.TorusKnotGeometry(0.34, 0.1, 48, 7, 2, 3), baseMaterial)
    : new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), baseMaterial);
  marker.position.y = 0.9;
  marker.castShadow = true;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.84, 36), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  root.add(pedestal, marker, ring);
  root.userData.marker = marker;
  return root;
}


function addLandscape(scene, field, bounds) {
  const { parameters } = field.scene;
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: parameters.ground,
    roughness: 0.98,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(bounds * 2.4, bounds * 2.4), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const pathMaterial = new THREE.MeshStandardMaterial({
    color: parameters.warmth > 0.62 ? "#e2cc9b" : "#bdc4b2",
    roughness: 0.94,
  });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, bounds * 2), pathMaterial);
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.008;
  scene.add(path);

  const stoneMaterial = new THREE.MeshStandardMaterial({ color: "#65766b", roughness: 0.96 });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: parameters.warmth > 0.62 ? "#53765e" : "#456d68",
    roughness: 0.9,
  });
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#705a42", roughness: 1 });
  const columns = Math.max(8, Math.round(8 + parameters.openness * 6));
  for (let index = 0; index < columns; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const z = -bounds + 2.2 + row * ((bounds * 1.65) / Math.ceil(columns / 2));
    const x = side * (3.6 + (index % 3) * 0.62);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.25, 6), trunkMaterial);
    trunk.position.set(x, 0.62, z);
    trunk.castShadow = true;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68 + (index % 2) * 0.13, 0), leafMaterial);
    crown.position.set(x, 1.55, z);
    crown.rotation.y = index * 0.63;
    crown.castShadow = true;
    scene.add(trunk, crown);
  }

  for (let index = 0; index < 7; index += 1) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 + (index % 3) * 0.08, 0), stoneMaterial);
    const side = index % 2 === 0 ? -1 : 1;
    stone.position.set(side * (2.0 + (index % 3) * 0.55), 0.18, 3.3 - index * 1.45);
    stone.scale.y = 0.62;
    stone.rotation.set(index * 0.2, index * 0.7, 0);
    stone.castShadow = true;
    scene.add(stone);
  }
}


/**
 * 挂载关系场域运行时。它只消费 echo-field.v1，不负责由图片、音频或视频生成场域。
 */
export function mountFieldExperience(container = document.body, { onClose = null } = {}) {
  const root = document.createElement("section");
  root.id = "field-experience";
  root.className = "field-experience";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("aria-label", "关系场域");
  root.innerHTML = `
    <canvas class="field-canvas" tabindex="0" aria-label="可行走的关系场域"></canvas>
    <header class="field-header">
      <button class="field-icon-button" type="button" data-field-close title="返回世界" aria-label="返回世界">${icon("arrow-left")}</button>
      <div class="field-heading">
        <span data-field-owner>关系场域</span>
        <strong data-field-title></strong>
      </div>
      <span class="field-generated">${icon("sparkles")}生成物 · 可重算</span>
    </header>
    <div class="field-summary" data-field-summary></div>
    <button class="field-nearby" type="button" data-field-interact hidden>
      <kbd>F</kbd><span data-field-nearby-label></span>
    </button>
    <aside class="field-detail" data-field-detail aria-hidden="true">
      <span class="field-detail-eyebrow">关系节点</span>
      <strong data-field-detail-label></strong>
      <p data-field-detail-copy></p>
      <button class="field-icon-button field-detail-close" type="button" data-field-detail-close title="关闭" aria-label="关闭关系节点">${icon("x")}</button>
    </aside>
    <div class="field-move-pad" aria-label="移动控制">
      <button type="button" data-field-move="forward" title="向前" aria-label="向前">${icon("arrow-up")}</button>
      <button type="button" data-field-move="left" title="向左" aria-label="向左">${icon("arrow-left")}</button>
      <button type="button" data-field-move="back" title="向后" aria-label="向后">${icon("arrow-down")}</button>
      <button type="button" data-field-move="right" title="向右" aria-label="向右">${icon("arrow-right")}</button>
    </div>
    <button class="field-action" type="button" data-field-interact title="查看关系节点" aria-label="查看关系节点" disabled>${icon("message-circle")}</button>
    <button class="field-reset" type="button" data-field-reset title="回到入口" aria-label="回到入口">${icon("rotate-ccw")}</button>`;
  container.append(root);

  createIcons({ icons: ICONS, root, attrs: { "stroke-width": 1.8 } });
  root.querySelectorAll("svg[data-lucide]").forEach((svg) => svg.removeAttribute("data-lucide"));

  const canvas = root.querySelector(".field-canvas");
  const ownerLabel = root.querySelector("[data-field-owner]");
  const titleLabel = root.querySelector("[data-field-title]");
  const summaryLabel = root.querySelector("[data-field-summary]");
  const nearbyButton = root.querySelector(".field-nearby");
  const nearbyLabel = root.querySelector("[data-field-nearby-label]");
  const actionButton = root.querySelector(".field-action");
  const detail = root.querySelector("[data-field-detail]");
  const detailLabel = root.querySelector("[data-field-detail-label]");
  const detailCopy = root.querySelector("[data-field-detail-copy]");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const camera = new THREE.PerspectiveCamera(47, 1, 0.08, 70);
  const timer = new THREE.Timer();
  timer.connect(document);
  const pressed = new Set();
  const heldDirections = new Set();
  const move = new THREE.Vector2();
  const cameraTarget = new THREE.Vector3();
  let scene = null;
  let player = null;
  let field = null;
  let spawn = null;
  let bounds = 9;
  let entityRoots = [];
  let nearest = null;
  let open = false;
  let frame = 0;
  let raf = 0;

  function resize() {
    if (!open) return;
    const width = Math.max(root.clientWidth, 1);
    const height = Math.max(root.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updateDiagnostics() {
    const gl = renderer.getContext();
    const pixel = new Uint8Array(4);
    const x = Math.max(0, Math.floor(gl.drawingBufferWidth / 2));
    const y = Math.max(0, Math.floor(gl.drawingBufferHeight / 2));
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    canvas.dataset.ready = "true";
    canvas.dataset.fieldSchema = field?.schema ?? "";
    canvas.dataset.entityCount = String(entityRoots.length);
    canvas.dataset.triangles = String(renderer.info.render.triangles);
    canvas.dataset.centerPixel = Array.from(pixel).join(",");
    canvas.dataset.playerX = player.position.x.toFixed(2);
    canvas.dataset.playerZ = player.position.z.toFixed(2);
  }

  function updateNearest() {
    let candidate = null;
    let distance = Infinity;
    for (const rootObject of entityRoots) {
      const current = Math.hypot(
        rootObject.position.x - player.position.x,
        rootObject.position.z - player.position.z,
      );
      if (current < distance) {
        candidate = rootObject.userData.fieldEntity;
        distance = current;
      }
    }
    const next = distance <= INTERACTION_RADIUS ? candidate : null;
    if (nearest?.id === next?.id) return;
    nearest = next;
    nearbyButton.hidden = !nearest;
    actionButton.disabled = !nearest;
    nearbyLabel.textContent = nearest ? `查看「${nearest.label}」` : "";
    canvas.dataset.nearbyEntity = nearest?.id ?? "";
  }

  function interact() {
    if (!nearest) return;
    detailLabel.textContent = nearest.label;
    detailCopy.textContent = nearest.detail;
    detail.setAttribute("aria-hidden", "false");
  }

  function closeDetail() {
    detail.setAttribute("aria-hidden", "true");
  }

  function resetPlayer() {
    if (!player || !spawn) return;
    player.position.set(spawn.x, 0, spawn.z);
    player.rotation.y = spawn.yaw;
    closeDetail();
    updateNearest();
  }

  function applyMovement(delta) {
    move.set(0, 0);
    if (pressed.has("KeyA") || heldDirections.has("left")) move.x -= 1;
    if (pressed.has("KeyD") || heldDirections.has("right")) move.x += 1;
    if (pressed.has("KeyW") || heldDirections.has("forward")) move.y -= 1;
    if (pressed.has("KeyS") || heldDirections.has("back")) move.y += 1;
    if (move.lengthSq() === 0) return;
    move.normalize().multiplyScalar(MOVE_SPEED * delta);
    player.position.x = THREE.MathUtils.clamp(player.position.x + move.x, -bounds, bounds);
    player.position.z = THREE.MathUtils.clamp(player.position.z + move.y, -bounds, bounds);
    player.rotation.y = Math.atan2(move.x, move.y);
  }

  function animate(timestamp) {
    if (!open) return;
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.05);
    applyMovement(delta);
    updateNearest();
    entityRoots.forEach((rootObject, index) => {
      const marker = rootObject.userData.marker;
      if (marker) {
        marker.rotation.y += delta * (0.35 + index * 0.04);
        marker.position.y = 0.9 + Math.sin(timer.getElapsed() * 1.2 + index) * 0.045;
      }
    });
    cameraTarget.set(player.position.x, 0.72, player.position.z);
    camera.position.x += (player.position.x + 5.7 - camera.position.x) * (1 - Math.exp(-4.5 * delta));
    camera.position.y += (4.8 - camera.position.y) * (1 - Math.exp(-4.5 * delta));
    camera.position.z += (player.position.z + 6.5 - camera.position.z) * (1 - Math.exp(-4.5 * delta));
    camera.lookAt(cameraTarget);
    renderer.render(scene, camera);
    frame += 1;
    if (frame % DIAGNOSTIC_INTERVAL === 1) updateDiagnostics();
    raf = requestAnimationFrame(animate);
  }

  function build(rawField) {
    disposeObject(scene);
    field = normalizeFieldAsset(rawField);
    if (!field) return false;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(field.scene.parameters.sky);
    bounds = 8.5 + field.scene.parameters.openness * 4;
    scene.fog = new THREE.Fog(field.scene.parameters.fog, bounds * 0.9, bounds * 2.35);
    addLandscape(scene, field, bounds);

    const hemisphere = new THREE.HemisphereLight("#f8f2d7", "#3e5048", 2.25);
    const sun = new THREE.DirectionalLight("#fff2ce", 2.8);
    sun.position.set(-5, 9, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    scene.add(hemisphere, sun);

    spawn = field.scene.spawn;
    player = makePlayer(field.scene.parameters.accent);
    player.position.set(spawn.x, 0, spawn.z);
    player.rotation.y = spawn.yaw;
    scene.add(player);
    entityRoots = field.scene.entities.map((entity, index) => {
      const entityRoot = makeFieldEntity(entity, field.scene.parameters.accent, index);
      scene.add(entityRoot);
      return entityRoot;
    });
    camera.position.set(spawn.x + 5.7, 4.8, spawn.z + 6.5);
    camera.lookAt(spawn.x, 0.72, spawn.z);
    nearest = null;
    closeDetail();
    updateNearest();
    return true;
  }

  function openField({ field: rawField, name = "TA" } = {}) {
    if (!build(rawField)) return false;
    ownerLabel.textContent = `我与 ${name}`;
    titleLabel.textContent = field.scene.title;
    summaryLabel.textContent = field.scene.summary;
    open = true;
    root.setAttribute("aria-hidden", "false");
    document.body.dataset.fieldExperience = "open";
    canvas.dataset.ready = "false";
    frame = 0;
    resize();
    timer.reset();
    cancelAnimationFrame(raf);
    animate();
    canvas.focus({ preventScroll: true });
    return true;
  }

  function close() {
    if (!open) return;
    open = false;
    cancelAnimationFrame(raf);
    pressed.clear();
    heldDirections.clear();
    root.setAttribute("aria-hidden", "true");
    delete document.body.dataset.fieldExperience;
    onClose?.();
  }

  function onKeyDown(event) {
    if (!open) return;
    if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      pressed.add(event.code);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === "Escape") {
      if (detail.getAttribute("aria-hidden") === "false") closeDetail();
      else close();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if ((event.code === "KeyF" || event.key === "Enter") && nearest) {
      interact();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function onKeyUp(event) {
    if (!open) return;
    pressed.delete(event.code);
    if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) event.stopPropagation();
  }

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-field-close]")) close();
    else if (event.target.closest("[data-field-detail-close]")) closeDetail();
    else if (event.target.closest("[data-field-interact]")) interact();
    else if (event.target.closest("[data-field-reset]")) resetPlayer();
    const moveButton = event.target.closest("[data-field-move]");
    if (moveButton && player) {
      const direction = moveButton.dataset.fieldMove;
      heldDirections.add(direction);
      applyMovement(0.14);
      heldDirections.delete(direction);
      updateNearest();
    }
  });
  root.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-field-move]");
    if (!button) return;
    heldDirections.add(button.dataset.fieldMove);
    button.setPointerCapture?.(event.pointerId);
  });
  for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
    root.addEventListener(eventName, (event) => {
      const button = event.target.closest("[data-field-move]");
      if (button) heldDirections.delete(button.dataset.fieldMove);
    });
  }
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", resize);

  return {
    open: openField,
    close,
    destroy() {
      close();
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", resize);
      disposeObject(scene);
      timer.dispose();
      renderer.dispose();
      root.remove();
    },
    get isOpen() {
      return open;
    },
  };
}
