import * as THREE from "three";
import { currentUser, people, relationships } from "./data/demoPeople.js";
import { AssetCatalog } from "./runtime/AssetCatalog.js";
import { AssetStore } from "./runtime/AssetStore.js";
import { BoothSystem, buildFallbackBooths } from "./runtime/BoothSystem.js";
import { CAFE_LAYOUT, tableById } from "./runtime/CafeLayout.js";
import { CharacterSystem } from "./runtime/CharacterSystem.js";
import { LiveWorld } from "./runtime/LiveWorld.js";
import { NpcAgentSystem } from "./runtime/NpcAgentSystem.js";
import {
  CHARACTER_VARIANT_OPTIONS,
  characterAssetId,
  characterVariantFromLocation,
  navigateToCharacterVariant,
} from "./runtime/CharacterVariants.js";
import {
  SCENE_VARIANT_OPTIONS,
  navigateToSceneVariant,
  sceneVariantById,
  sceneVariantFromLocation,
} from "./runtime/SceneVariants.js";
import { adaptSnapshot, normalizeEvent } from "./runtime/SnapshotAdapter.js";
import { slideStepAroundBlockers } from "./runtime/WalkSlide.js";
import { CAFE_WORLD, HALL_LAYOUT, worldFromLocation } from "./runtime/WorldSwitch.js";
import {
  adaptMaterialToProfile,
  adaptSceneMaterials,
  installVisualProfile,
} from "./runtime/VisualProfiles.js";
import { loadWorldSpec, publicUrl } from "./runtime/WorldSpec.js";
import { createCafeShell } from "./ui/CafeShell.js";
import { mountIntegrations, resolveMediaUrl } from "./bootstrap/integrations.js";
import "./cafe.css";


const WORLD_SPEC_URL = publicUrl("data/world-spec.json");
const activeSceneVariant = sceneVariantFromLocation();
const activeCharacterVariant = characterVariantFromLocation();
const canonicalUrl = new URL(window.location.href);
let replaceCanonicalUrl = false;
if (
  canonicalUrl.searchParams.has("scene") &&
  canonicalUrl.searchParams.get("scene") !== activeSceneVariant.id
) {
  canonicalUrl.searchParams.set("scene", activeSceneVariant.id);
  replaceCanonicalUrl = true;
}
if (
  canonicalUrl.searchParams.has("character") &&
  canonicalUrl.searchParams.get("character") !== activeCharacterVariant.id
) {
  canonicalUrl.searchParams.set("character", activeCharacterVariant.id);
  replaceCanonicalUrl = true;
}
if (replaceCanonicalUrl) {
  window.history.replaceState(window.history.state, "", canonicalUrl);
}

// 两级世界：展位大厅（hall，默认）/ 咖啡厅（cafe），?world= URL 参数 + 刷新切换
const activeWorld = worldFromLocation();
const isHallWorld = activeWorld.id === "hall";
// 大厅暂只用 v1 视觉配置（专属 profile 后续）；环境资产/布局/出生点按世界选择
const activeVisualProfile = isHallWorld
  ? sceneVariantById("v1").visualProfile
  : activeSceneVariant.visualProfile;
const environmentAssetId = isHallWorld
  ? HALL_LAYOUT.environmentAssetId
  : activeSceneVariant.environmentAssetId;
const worldBounds = isHallWorld ? HALL_LAYOUT.bounds : CAFE_LAYOUT.bounds;
const worldPlayerSpawn = isHallWorld ? HALL_LAYOUT.playerSpawn : CAFE_LAYOUT.playerSpawn;
const worldTitle = isHallWorld ? activeWorld.title : activeSceneVariant.title;
document.body.dataset.world = activeWorld.id;

const MOVE_SPEED = 2.7;
const PLAYER_FOOT_OFFSET = 0.018;
const SEATED_SCALE_Y = 0.82;
const SEATED_ROOT_Y = 0.025;
const MODEL_FORWARD = new THREE.Vector3(0, 0, 1);
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const TABLE_BLOCKERS = Object.freeze([
  { x: 0, z: 0, radius: 1.27 },
  { x: -3.65, z: -1.55, radius: 0.72 },
  { x: -3.65, z: 1.55, radius: 0.72 },
  { x: 3.28, z: -1.35, radius: 0.94 },
  { x: 3.28, z: 1.65, radius: 0.94 },
]);
const NPC_ENTRY_SPAWNS = Object.freeze([
  { x: -2.55, z: 4.05, yaw: Math.PI },
  { x: -1.75, z: 4.25, yaw: Math.PI },
  { x: -0.95, z: 4.02, yaw: Math.PI },
  { x: 0.95, z: 4.02, yaw: Math.PI },
  { x: 1.75, z: 4.25, yaw: Math.PI },
  { x: 2.55, z: 4.05, yaw: Math.PI },
]);
const LIVE_WALK_SPEED = 1.5;
const LIVE_BUBBLE_DURATION = 4;

// 运行时注入（window.__ECHOWORLD_OPTIONS__）：api / onPersonSelected / live / snapshotPollMs
const runtimeOptions = globalThis.__ECHOWORLD_OPTIONS__ ?? {};
// 注入的 api 必须覆盖录入流程三方法，否则回退内置 MockApi 适配层（避免集成模块挂载抛错导致白屏）
const injectedApi = runtimeOptions.api ?? null;
const usableApi =
  injectedApi &&
  ["ingest", "pipelineStream", "confirm"].every((method) => typeof injectedApi[method] === "function")
    ? injectedApi
    : null;
if (injectedApi && !usableApi) {
  console.warn("[EchoWorld] 注入的 api 缺少 ingest/pipelineStream/confirm，回退为内置 MockApi 适配层");
}
// 统一集成：资料包面板 / 检索条 / 相遇录入流程 + 各模块共享的统一 api 适配层
const integrations = mountIntegrations({
  api: usableApi,
  onPersonSelectedHook: (personId) => selectPersonInWorld(personId),
  onPackagesChangedHook: (packages) => fillPackageNames(packages),
  onToastHook: (message) => pushLiveToast(message),
  presenceProvider: (personId) => worldAgentState(personId),
});
const api = integrations.api;
// 点击世界中的小人：保留现有侧栏行为，资料包面板浮于其上（外部可用 onPersonSelected 覆盖）
const onPersonSelected =
  typeof runtimeOptions.onPersonSelected === "function"
    ? runtimeOptions.onPersonSelected
    : (personId) => {
        if (personId) integrations.panel.openPerson(personId);
      };
const liveEnabled = runtimeOptions.live !== false;
const snapshotPollMs =
  Number.isFinite(runtimeOptions.snapshotPollMs) && runtimeOptions.snapshotPollMs >= 250
    ? runtimeOptions.snapshotPollMs
    : (isHallWorld ? HALL_LAYOUT.snapshotPollMs : CAFE_WORLD.snapshotPollMs);

const canvas = document.querySelector("#world");
const loading = document.querySelector("#loading");
const loadingBar = document.querySelector("#loading-bar");
const loadingProgress = document.querySelector("#loading-progress");
const loadingCopy = document.querySelector("#loading-copy");
const playerLabel = document.querySelector("#player-label");
const touchStick = document.querySelector("#touch-stick");
const touchKnob = document.querySelector("#touch-knob");
const fatalError = document.querySelector("#fatal-error");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(48, 1, 0.06, 80);
camera.position.set(6.7, 4.6, 8.2);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
installVisualProfile(scene, renderer, activeVisualProfile);

const timer = new THREE.Timer();
timer.connect(document);
const raycaster = new THREE.Raycaster();
const groundRaycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const rayDown = new THREE.Vector3(0, -1, 0);
const pointerNdc = new THREE.Vector2();
const pointerStart = new THREE.Vector2();
const pressedKeys = new Set();
const moveInput = new THREE.Vector2();
const touchInput = new THREE.Vector2();
const moveDirection = new THREE.Vector3();
const cameraForward = new THREE.Vector3();
const cameraRight = new THREE.Vector3();
const currentHeading = new THREE.Vector3(0, 0, -1);
const desiredCameraPosition = new THREE.Vector3();
const desiredLookTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3(0, 0.85, 0);
const followRight = new THREE.Vector3();
const projected = new THREE.Vector3();
const candidatePosition = new THREE.Vector3();
const slidePosition = new THREE.Vector3();
const targetQuaternion = new THREE.Quaternion();
const cinematicTarget = new THREE.Vector3(0, 0.72, -0.35);
const groundMeshes = [];

let worldReady = false;
let worldSpec = null;
let environmentRoot = null;
let characterSystem = null;
let npcSystem = null;
let playerEntity = null;
let player = null;
let playerGroundY = 0;
let playerMarker = null;
let selectionMarker = null;
let selectedPersonId = null;
let experienceMode = "intro";
let meetingMode = false;
let roundtableNearby = false;
let elapsed = 0;
let diagnosticFrame = 0;

const packageNames = new Map();
const liveTargets = new Map();
const liveMeetingOverrides = new Map();
const liveBubbles = new Map();
const liveFacing = new THREE.Vector3();
let liveMeetingSeatIndices = [];
let liveWorld = null;
let liveWorldTick = null;
let boothSystem = null;

const appShell = createCafeShell({
  root: document.querySelector("#ui-root"),
  currentUser,
  people,
  relationships,
  sceneVariants: SCENE_VARIANT_OPTIONS,
  activeSceneVariant,
  characterVariants: CHARACTER_VARIANT_OPTIONS,
  activeCharacterVariant,
  onViewChange: setExperienceMode,
  onSceneVariantChange: (variantId) => {
    if (variantId !== activeSceneVariant.id) navigateToSceneVariant(variantId);
  },
  onCharacterVariantChange: (variantId) => {
    if (variantId !== activeCharacterVariant.id) navigateToCharacterVariant(variantId);
  },
  onLocatePerson: (person) => selectWorldPerson(person.id),
  onMeetingStart: startMeeting,
  onMeetingEnd: endMeeting,
  resolveMediaUrl,
});

canvas.dataset.ready = "false";
canvas.dataset.appView = experienceMode;
canvas.dataset.roundtableReserved = "true";
canvas.dataset.characterVariant = activeCharacterVariant.id;
canvas.dataset.world = activeWorld.id;

// Live overlay：气泡复用 CafeShell 的 world-speech-layer 与气泡样式，Toast/tick 为轻量内联样式
const speechLayer = document.querySelector("#world-speech-layer");

const toastStack = document.createElement("div");
toastStack.style.cssText =
  "position:fixed;top:88px;right:18px;z-index:60;display:flex;flex-direction:column;" +
  "gap:8px;align-items:flex-end;pointer-events:none;";
document.body.append(toastStack);

const tickBadge = document.createElement("div");
tickBadge.style.cssText =
  "position:fixed;right:18px;bottom:18px;z-index:60;display:none;align-items:center;gap:7px;" +
  "padding:7px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.4);" +
  "background:rgba(20,54,47,.72);backdrop-filter:blur(14px);color:#fffdf4;" +
  "font-size:10px;font-weight:700;letter-spacing:.08em;";
document.body.append(tickBadge);


function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}


function setProgress(value, label = null) {
  const percent = Math.round(THREE.MathUtils.clamp(value, 0, 1) * 100);
  loadingBar.style.width = `${percent}%`;
  loadingProgress.textContent = `${percent}%`;
  if (label) loadingCopy.textContent = label;
}


function surfaceHeightAt(x, z) {
  rayOrigin.set(x, 12, z);
  groundRaycaster.set(rayOrigin, rayDown);
  const hits = groundRaycaster.intersectObjects(groundMeshes, false);
  return hits.length > 0 ? hits[0].point.y : null;
}


function makeGroundMarker(color, innerRadius, outerRadius, opacity) {
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(innerRadius, outerRadius, 30),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  marker.rotation.x = -Math.PI * 0.5;
  marker.renderOrder = 4;
  scene.add(marker);
  return marker;
}


function characterSpec(person, instanceId, spawn, idleBob = 0.005) {
  return {
    instance_id: instanceId,
    person_id: person.id,
    asset_id: characterAssetId(activeCharacterVariant, person.id),
    fallback_asset_id: activeCharacterVariant.fallbackAssetId,
    texture_filter: activeCharacterVariant.textureFilter,
    lock_texture_colors: true,
    profile: {
      person_id: person.id,
      display_name: person.displayName ?? person.name,
      relation: person.relation,
      palette: person.palette,
    },
    palette: person.palette,
    spawn: { ...spawn, scale: 1, ground_offset: 0 },
    behavior: { idle_bob: idleBob },
    interaction: { kind: "person-agent", radius: 1.7, voice_enabled: true },
  };
}


function actorAt(entity, x, z, yaw, rootY = null) {
  const groundY = surfaceHeightAt(x, z);
  if (groundY === null) throw new Error(`人物坐标超出咖啡厅地面：${x}, ${z}`);
  const y = rootY ?? groundY;
  entity.root.position.set(x, y, z);
  entity.root.rotation.set(0, yaw, 0);
  entity.baseY = y;
}


function validateRuntimeAnchors(root) {
  const seats = [
    ...CAFE_LAYOUT.roundtable.seats,
    ...CAFE_LAYOUT.npcTables.flatMap((table) => table.seats),
  ];
  let maxError = 0;
  let missing = 0;
  for (const item of seats) {
    const node = root.getObjectByName(item.nodeName);
    if (!node) {
      missing += 1;
      continue;
    }
    node.getWorldPosition(projected);
    maxError = Math.max(maxError, Math.hypot(projected.x - item.x, projected.z - item.z));
  }
  canvas.dataset.seatAnchors = `${seats.length - missing}/${seats.length}`;
  canvas.dataset.seatAnchorError = maxError.toFixed(4);
  if (missing > 0 || maxError > 0.08) {
    console.warn("Cafe seat anchor contract mismatch", { missing, maxError });
  }
}


async function spawnCharacters() {
  setProgress(0.73, "正在唤醒你的关系 Agent");
  playerEntity = await characterSystem.spawn(
    characterSpec(currentUser, "self-player", worldPlayerSpawn, 0),
  );
  player = playerEntity.root;
  playerGroundY = player.position.y;
  currentHeading.copy(MODEL_FORWARD).applyQuaternion(player.quaternion).setY(0).normalize();

  npcSystem = new NpcAgentSystem({
    people,
    onConversation: (event) => appShell.showNpcConversation(event),
    onStateChange: (state) => appShell.updateAgentState(state),
  });

  const npcEntrySpawns = isHallWorld ? HALL_LAYOUT.npcEntrySpawns : NPC_ENTRY_SPAWNS;
  for (let index = 0; index < people.length; index += 1) {
    setProgress(0.76 + index * 0.03, `正在载入 ${people[index].name} 的人物模型`);
    const entity = await characterSystem.spawn(
      characterSpec(
        people[index],
        `agent-${people[index].id}`,
        npcEntrySpawns[index],
      ),
    );
    npcSystem.register(people[index], entity);
  }
  // live 模式下本地随机调度关闭：座位分配与对话全部由世界快照驱动
  if (!liveEnabled) npcSystem.initializeCafe();

  playerMarker = makeGroundMarker("#f2c55f", 0.32, 0.42, 0.42);
  playerMarker.name = "PLAYER_GroundMarker";
  selectionMarker = makeGroundMarker("#d36f59", 0.36, 0.48, 0.72);
  selectionMarker.name = "SELECTION_GroundMarker";
  selectionMarker.visible = false;
  updatePlayerMarker();
}


async function configureWorld(root) {
  environmentRoot = root;
  adaptSceneMaterials(root, activeVisualProfile);
  scene.add(root);
  root.updateMatrixWorld(true);

  root.traverse((object) => {
    if (!object.isMesh) return;
    const isFloor = object.name.startsWith("GROUND");
    object.castShadow = !isFloor;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      material.envMapIntensity = 0.38;
    });
  });

  // 地面节点按 GROUND 前缀识别（咖啡厅 GROUND_CafeFloor / 大厅地坪 / 占位场地通用）；
  // 命名不符时退化为以整个环境做地面射线目标，保证人物可站立可走
  let groundRoot = root.getObjectByName("GROUND_CafeFloor") ?? null;
  if (!groundRoot) {
    root.traverse((object) => {
      if (!groundRoot && object.name.startsWith("GROUND")) groundRoot = object;
    });
  }
  if (!groundRoot) {
    console.warn(`[EchoWorld] ${worldTitle}资产缺少 GROUND 地面节点，以整个环境作为地面射线目标`);
    groundRoot = root;
  }
  groundRoot.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.receiveShadow = true;
    groundMeshes.push(object);
  });
  if (groundRoot.isMesh) groundMeshes.push(groundRoot);
  const uniqueGroundMeshes = [...new Set(groundMeshes)];
  groundMeshes.length = 0;
  groundMeshes.push(...uniqueGroundMeshes);

  if (!isHallWorld) validateRuntimeAnchors(root);
  await spawnCharacters();
  worldReady = true;
  canvas.dataset.ready = "true";
  canvas.dataset.characterCount = String(characterSystem.entities.length);
  canvas.dataset.npcCount = String(npcSystem.agents.size);
  canvas.dataset.environment = environmentAssetId;
  canvas.dataset.sceneVariant = activeSceneVariant.id;
  setProgress(1, `${worldTitle} 已准备好`);
  appShell.setWorldReady(true);
  startLiveWorld();
  requestAnimationFrame(() => loading.classList.add("is-hidden"));
}


function setExperienceMode(mode) {
  experienceMode = mode;
  canvas.dataset.appView = mode;
  pressedKeys.clear();
  touchInput.set(0, 0);
  touchKnob.style.transform = "translate(0, 0)";
  if (playerMarker) playerMarker.visible = mode === "cafe" && !meetingMode;
  if (mode !== "cafe") playerLabel.style.opacity = "0";
  tickBadge.style.display = mode === "cafe" && !isHallWorld ? "flex" : "none";
  if (mode === "cafe") canvas.focus({ preventScroll: true });
}


function selectWorldPerson(personId) {
  const person = people.find((candidate) => candidate.id === personId) ?? null;
  selectedPersonId = person?.id ?? null;
  appShell.selectWorldPerson(selectedPersonId);
  canvas.dataset.selectedPerson = selectedPersonId ?? "";
  onPersonSelected(selectedPersonId);
  if (!selectionMarker) return person;
  selectionMarker.visible = Boolean(person);
  updateSelectionMarker();
  return person;
}


function updateSelectionMarker() {
  if (!selectionMarker || !selectedPersonId || !npcSystem) return;
  const entity = npcSystem.getEntity(selectedPersonId);
  if (!entity) {
    selectionMarker.visible = false;
    return;
  }
  selectionMarker.position.set(
    entity.root.position.x,
    Math.max(0.015, entity.root.position.y + 0.012),
    entity.root.position.z,
  );
  selectionMarker.material.opacity = 0.58 + Math.sin(elapsed * 4.2) * 0.12;
}


function startMeeting(personIds) {
  if (!worldReady || meetingMode) return [];
  let accepted = [];
  if (liveEnabled) {
    // live 模式：不走 NpcAgentSystem 本地调度，改为快照驱动层上的会议覆盖目标
    accepted = [...new Set(personIds)]
      .filter((personId) => npcSystem.getEntity(personId))
      .slice(0, 5);
    accepted.forEach((personId, index) => {
      const seat = CAFE_LAYOUT.roundtable.seats[index + 1];
      liveMeetingOverrides.set(personId, {
        x: seat.x,
        z: seat.z,
        yaw: seat.yaw,
        state: "in-meeting",
        seat: {
          tableId: CAFE_LAYOUT.roundtable.id,
          tableLabel: CAFE_LAYOUT.roundtable.label,
          seatIndex: index + 1,
        },
      });
      appShell.updateAgentState({
        personId,
        status: "joining-meeting",
        tableId: CAFE_LAYOUT.roundtable.id,
        tableLabel: CAFE_LAYOUT.roundtable.label,
        seatIndex: index + 1,
        meeting: true,
      });
    });
  } else {
    accepted = npcSystem.startMeeting(personIds);
  }
  if (accepted.length === 0) return [];
  liveMeetingSeatIndices = [0, ...accepted.map((_, index) => index + 1)];
  meetingMode = true;
  const playerSeat = CAFE_LAYOUT.roundtable.seats[0];
  actorAt(playerEntity, playerSeat.x, playerSeat.z, playerSeat.yaw, SEATED_ROOT_Y);
  player.scale.set(1, SEATED_SCALE_Y, 1);
  playerMarker.visible = false;
  playerEntity.spec.behavior.idle_bob = 0.003;
  currentHeading.set(Math.sin(playerSeat.yaw), 0, Math.cos(playerSeat.yaw));
  pressedKeys.clear();
  touchInput.set(0, 0);
  canvas.dataset.meetingActive = "true";
  canvas.dataset.meetingInvited = accepted.join(",");
  return accepted;
}


function endMeeting() {
  if (!worldReady) return;
  meetingMode = false;
  player.scale.set(1, 1, 1);
  playerMarker.visible = experienceMode === "cafe";
  playerEntity.spec.behavior.idle_bob = 0;
  actorAt(playerEntity, 0, 3.12, Math.PI);
  playerGroundY = playerEntity.baseY;
  updatePlayerMarker();
  currentHeading.set(0, 0, -1);
  if (liveEnabled) {
    liveMeetingOverrides.clear();
  } else {
    npcSystem.endMeeting();
  }
  liveMeetingSeatIndices = [];
  canvas.dataset.meetingActive = "false";
  canvas.dataset.meetingInvited = "";
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function nameOf(personId) {
  if (typeof personId !== "string" || personId === "") return "神秘访客";
  return packageNames.get(personId) ?? people.find((person) => person.id === personId)?.name ?? personId;
}


function fillPackageNames(packages) {
  packageNames.clear();
  for (const pkg of Array.isArray(packages) ? packages : []) {
    const id = pkg?.person_id ?? pkg?.id;
    const name = pkg?.name ?? pkg?.identity?.name ?? pkg?.display_name ?? pkg?.displayName;
    if (typeof id === "string" && typeof name === "string") packageNames.set(id, name);
  }
}


// 在 3D 世界中选中/定位人物；不在世界中（如刚确认的新人）返回 false 且不影响当前选中
function selectPersonInWorld(personId) {
  if (typeof personId !== "string" || personId === "") return false;
  if (!people.some((person) => person.id === personId)) return false;
  selectWorldPerson(personId);
  return true;
}


function pushLiveToast(message) {
  if (isHallWorld) return; // 大厅模式：Toast 静默
  const toast = document.createElement("div");
  toast.style.cssText =
    "max-width:min(320px,calc(100vw - 36px));padding:9px 14px;border-radius:14px;" +
    "border:1px solid rgba(255,255,255,.38);background:rgba(21,58,50,.86);color:#fffdf4;" +
    "box-shadow:0 10px 26px rgba(18,45,39,.2);backdrop-filter:blur(14px);" +
    "font-size:10px;font-weight:600;letter-spacing:.04em;line-height:1.5;" +
    "opacity:0;transform:translateY(-6px);transition:opacity .24s ease,transform .24s ease;";
  toast.textContent = message;
  toastStack.append(toast);
  while (toastStack.children.length > 4) toastStack.firstElementChild.remove();
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });
  window.setTimeout(() => {
    toast.style.opacity = "0";
    window.setTimeout(() => toast.remove(), 280);
  }, 3600);
}


const TICK_SOURCE_STYLE = {
  live: { color: "#7fe0a8", label: "实时快照" },
  mock: { color: "#f2c55f", label: "本地 mock" },
  fallback: { color: "#d36f59", label: "内置兜底" },
};

function setTickBadge(tick, source) {
  if (isHallWorld) return; // 大厅模式：tick 徽标静默
  const style = TICK_SOURCE_STYLE[source] ?? { color: "#9fb4ad", label: "离线" };
  tickBadge.innerHTML =
    `<span style="width:7px;height:7px;border-radius:50%;background:${style.color}"></span>` +
    `<span>世界时刻 #${tick ?? "—"} · ${style.label}</span>`;
}


function showLiveTalk(personId, text, duration = LIVE_BUBBLE_DURATION) {
  if (!speechLayer || isHallWorld) return; // 大厅模式：气泡静默
  let entry = liveBubbles.get(personId);
  if (!entry) {
    const element = document.createElement("div");
    element.className = "world-speech-bubble";
    element.dataset.liveSpeech = personId;
    speechLayer.append(element);
    entry = { element, timer: 0, active: false };
    liveBubbles.set(personId, entry);
  }
  entry.element.innerHTML = `<span>${escapeHtml(nameOf(personId))}</span><p>${escapeHtml(text)}</p>`;
  entry.element.classList.add("is-visible");
  entry.active = true;
  window.clearTimeout(entry.timer);
  entry.timer = window.setTimeout(() => {
    entry.element.classList.remove("is-visible");
    entry.active = false;
  }, duration * 1000);
}


function updateLiveBubbles() {
  for (const [personId, entry] of liveBubbles) {
    if (!entry.active) continue;
    const entity = npcSystem?.getEntity(personId);
    if (!entity) {
      entry.element.style.visibility = "hidden";
      continue;
    }
    projected.copy(entity.root.position);
    projected.y += 1.55 * entity.root.scale.y;
    projected.project(camera);
    const visible =
      experienceMode === "cafe" &&
      projected.z > -1 && projected.z < 1 &&
      Math.abs(projected.x) < 1.15 &&
      Math.abs(projected.y) < 1.15;
    entry.element.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
    entry.element.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
    entry.element.style.visibility = visible ? "visible" : "hidden";
  }
}


function applyLiveSnapshot(rawSnapshot) {
  const adapted = adaptSnapshot(rawSnapshot, {
    people,
    reservedRoundtableSeats: meetingMode ? liveMeetingSeatIndices : [],
  });
  liveWorldTick = adapted.tick;
  setTickBadge(adapted.tick, liveWorld?.source);
  canvas.dataset.liveSource = liveWorld?.source ?? "unknown";
  canvas.dataset.worldTick = String(adapted.tick);

  if (isHallWorld && boothSystem) {
    // 展位增量同步：快照有 booth 用快照；mock 快照缺 booth 时用内置 6 人演示展位
    const boothModules = adapted.modules.filter((module) => module.type === "booth");
    const booths =
      boothModules.length > 0
        ? boothModules
        : (liveWorld?.source === "live" ? [] : buildFallbackBooths(people));
    canvas.dataset.boothCount = String(boothSystem.sync(booths));
  }

  for (const agent of adapted.agents) {
    if (agent.id === currentUser.id || liveMeetingOverrides.has(agent.id)) continue;
    const entity = npcSystem?.getEntity(agent.id);
    if (!entity) continue;
    if (isHallWorld) {
      // 大厅：人物站位 = 展位锚点（快照 position 即锚点；本地 fallback 用 BoothSystem 锚点）
      const anchor = boothSystem?.personAnchorFor(agent.id) ?? agent.position;
      if (anchor) {
        liveTargets.set(agent.id, {
          x: anchor.x,
          z: anchor.z,
          yaw: anchor.yaw ?? 0,
          state: "at-booth",
          seat: null,
        });
      }
    } else if (agent.position) {
      liveTargets.set(agent.id, {
        x: agent.seat?.x ?? agent.position.x,
        z: agent.seat?.z ?? agent.position.z,
        yaw: agent.seat?.yaw ?? agent.position.yaw,
        state: agent.state,
        seat: agent.seat,
      });
    }
    entity.root.userData.agentState = agent.state;
    appShell.updateAgentState({
      personId: agent.id,
      status: agent.state === "talking" ? "seated" : agent.state,
      tableId: agent.seat?.tableId ?? null,
      tableLabel: agent.seat?.tableLabel ?? (isHallWorld ? "集市大厅展位" : "咖啡厅大厅"),
      seatIndex: agent.seat?.seatIndex ?? null,
      meeting: agent.state === "in-meeting",
    });
  }
}


function handleLiveEvent(rawEvent) {
  // LiveWorld 发出的是快照里的原始事件，这里统一归一化（snake_case → camelCase）
  const event = normalizeEvent(rawEvent);
  if (!event) return;
  if (event.type === "agent-talk") {
    if (!event.agentId || !event.text) return;
    showLiveTalk(event.agentId, event.text);
    pushLiveToast(`${nameOf(event.agentId)} 和 ${nameOf(event.toAgentId)} 聊了起来`);
    return;
  }
  if (event.type === "meeting-started") {
    const names = event.participants.map(nameOf).join("、");
    pushLiveToast(names ? `圆桌会议开始：${names}` : "圆桌会议开始了");
    return;
  }
  if (event.type === "meeting-ended") {
    pushLiveToast("圆桌会议结束，大家回到各自的座位");
  }
}


function updateLiveAgents(delta) {
  if (!npcSystem) return;
  for (const personId of new Set([...liveTargets.keys(), ...liveMeetingOverrides.keys()])) {
    const target = liveMeetingOverrides.get(personId) ?? liveTargets.get(personId);
    const entity = npcSystem.getEntity(personId);
    if (!target || !entity) continue;
    const root = entity.root;
    if (target.state === "at-booth") {
      // 大厅展位站位：直接吸附展位锚点，不做插值走动（仍平滑转身/起身）
      root.position.x = target.x;
      root.position.z = target.z;
      liveFacing.set(Math.sin(target.yaw), 0, Math.cos(target.yaw));
      targetQuaternion.setFromUnitVectors(MODEL_FORWARD, liveFacing);
      root.quaternion.slerp(targetQuaternion, 1 - Math.exp(-10 * delta));
      root.scale.y += (1 - root.scale.y) * (1 - Math.exp(-7 * delta));
      entity.baseY = 0;
      continue;
    }
    const dx = target.x - root.position.x;
    const dz = target.z - root.position.z;
    const distance = Math.hypot(dx, dz);
    const moving = distance > 0.05;
    const seated = !moving && target.state !== "walking";

    if (moving) {
      // 匀速逼近快照目标：轮询节拍之间保持连续走动，而不是脉冲式追赶
      const stepLength = Math.min(distance, LIVE_WALK_SPEED * delta);
      // 轻量避障：下一步进入桌面圆形阻挡时沿切线滑动，缓解快照直线路径穿模；
      // yaw 跟随实际（滑动后的）移动方向
      const [stepX, stepZ] = slideStepAroundBlockers(
        root.position.x,
        root.position.z,
        (dx / distance) * stepLength,
        (dz / distance) * stepLength,
        TABLE_BLOCKERS,
        { targetX: target.x, targetZ: target.z },
      );
      root.position.x += stepX;
      root.position.z += stepZ;
      const actualStep = Math.hypot(stepX, stepZ);
      if (actualStep > 1e-5) {
        liveFacing.set(stepX / actualStep, 0, stepZ / actualStep);
      } else {
        liveFacing.set(Math.sin(target.yaw), 0, Math.cos(target.yaw));
      }
    } else {
      root.position.x = target.x;
      root.position.z = target.z;
      liveFacing.set(Math.sin(target.yaw), 0, Math.cos(target.yaw));
    }
    targetQuaternion.setFromUnitVectors(MODEL_FORWARD, liveFacing);
    root.quaternion.slerp(targetQuaternion, 1 - Math.exp(-10 * delta));

    const targetScaleY = seated ? SEATED_SCALE_Y : 1;
    root.scale.y += (targetScaleY - root.scale.y) * (1 - Math.exp(-7 * delta));
    entity.baseY = seated ? SEATED_ROOT_Y : 0;
  }
}


function worldAgentState(personId) {
  if (liveEnabled) {
    const override = liveMeetingOverrides.get(personId);
    const target = override ?? liveTargets.get(personId);
    if (target) {
      const table = target.seat ? tableById(target.seat.tableId) : null;
      return {
        personId,
        status: override ? "in-meeting" : target.state,
        tableId: target.seat?.tableId ?? null,
        tableLabel: table?.label ?? "咖啡厅",
        seatIndex: target.seat?.seatIndex ?? null,
        meeting: target.state === "in-meeting" || Boolean(override),
      };
    }
  }
  return npcSystem.getState(personId);
}


function startLiveWorld() {
  if (!liveEnabled || liveWorld) return;
  liveWorld = new LiveWorld({
    snapshotUrl: isHallWorld ? HALL_LAYOUT.snapshotUrl : CAFE_WORLD.snapshotUrl,
    intervalMs: snapshotPollMs,
    mockUrl: publicUrl("data/mock/snapshot.demo.json"),
  });
  liveWorld.onSnapshot(applyLiveSnapshot);
  liveWorld.onEvent(handleLiveEvent);
  liveWorld.start();
  if (!isHallWorld && activeSceneVariant.id !== "v1") {
    // 座位锚点/碰撞按 v1 原始咖啡厅标定：美术变体下活的世界仍按 v1 布局运转（提示一次，不改 URL）
    pushLiveToast("活的世界目前基于原始咖啡厅布局");
  }
}


function readMovementInput() {
  moveInput.set(0, 0);
  if (pressedKeys.has("KeyA")) moveInput.x -= 1;
  if (pressedKeys.has("KeyD")) moveInput.x += 1;
  if (pressedKeys.has("KeyW")) moveInput.y += 1;
  if (pressedKeys.has("KeyS")) moveInput.y -= 1;
  moveInput.add(touchInput);
  if (moveInput.lengthSq() > 1) moveInput.normalize();
  return moveInput;
}


function currentBlockers() {
  // 大厅的碰撞阻挡由展位锚点提供（BoothSystem 同步后填充），咖啡厅用桌位圆形阻挡
  return isHallWorld ? (boothSystem?.blockers ?? []) : TABLE_BLOCKERS;
}


function isWalkable(position) {
  if (
    position.x < worldBounds.minX ||
    position.x > worldBounds.maxX ||
    position.z < worldBounds.minZ ||
    position.z > worldBounds.maxZ
  ) return false;
  return !currentBlockers().some(
    (blocker) => Math.hypot(position.x - blocker.x, position.z - blocker.z) < blocker.radius,
  );
}


function commitCandidatePosition(nextPosition) {
  const nextGroundY = surfaceHeightAt(nextPosition.x, nextPosition.z);
  if (nextGroundY === null) return false;
  player.position.x = nextPosition.x;
  player.position.z = nextPosition.z;
  playerGroundY = nextGroundY;
  playerEntity.baseY = playerGroundY;
  return true;
}


function updatePlayer(delta) {
  if (meetingMode) return;
  const input = readMovementInput();
  const moving = input.lengthSq() > 0.0025;

  if (moving) {
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    if (cameraForward.lengthSq() < 0.0001) cameraForward.copy(currentHeading);
    cameraForward.normalize();
    cameraRight.crossVectors(cameraForward, WORLD_UP).normalize();
    moveDirection
      .copy(cameraForward)
      .multiplyScalar(input.y)
      .addScaledVector(cameraRight, input.x)
      .normalize();
    candidatePosition.copy(player.position).addScaledVector(moveDirection, MOVE_SPEED * delta);

    if (isWalkable(candidatePosition)) {
      commitCandidatePosition(candidatePosition);
    } else {
      slidePosition.set(candidatePosition.x, player.position.y, player.position.z);
      if (isWalkable(slidePosition)) commitCandidatePosition(slidePosition);
      else {
        slidePosition.set(player.position.x, player.position.y, candidatePosition.z);
        if (isWalkable(slidePosition)) commitCandidatePosition(slidePosition);
      }
    }

    targetQuaternion.setFromUnitVectors(MODEL_FORWARD, moveDirection);
    player.quaternion.slerp(targetQuaternion, 1 - Math.exp(-14 * delta));
    currentHeading.lerp(moveDirection, 1 - Math.exp(-9 * delta)).normalize();
  }

  const bob = moving
    ? Math.abs(Math.sin(elapsed * 9.2)) * 0.028
    : Math.sin(elapsed * 2.1) * 0.004;
  player.position.y = playerGroundY + PLAYER_FOOT_OFFSET + bob;
  updatePlayerMarker();
}


function updatePlayerMarker() {
  if (!playerMarker || !player) return;
  playerMarker.position.set(player.position.x, playerGroundY + 0.013, player.position.z);
  playerMarker.material.opacity = 0.36 + Math.sin(elapsed * 4) * 0.05;
}


function updateFollowCamera(delta) {
  followRight.crossVectors(currentHeading, WORLD_UP).normalize();
  desiredCameraPosition
    .copy(player.position)
    .addScaledVector(currentHeading, -3.75)
    .addScaledVector(followRight, 0.52)
    .addScaledVector(WORLD_UP, 2.35);
  desiredLookTarget
    .copy(player.position)
    .addScaledVector(WORLD_UP, 0.78)
    .addScaledVector(currentHeading, 0.58);
  camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-6.2 * delta));
  lookTarget.lerp(desiredLookTarget, 1 - Math.exp(-8.5 * delta));
  camera.lookAt(lookTarget);
}


function updateMeetingCamera(delta) {
  desiredCameraPosition.set(4.75, 4.05, 5.25);
  desiredLookTarget.set(0, 0.66, 0);
  camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-4.6 * delta));
  lookTarget.lerp(desiredLookTarget, 1 - Math.exp(-6 * delta));
  camera.lookAt(lookTarget);
}


function updateCinematicCamera(delta) {
  const orbit = elapsed * 0.065;
  desiredCameraPosition.set(
    6.45 + Math.sin(orbit) * 0.45,
    4.55 + Math.sin(orbit * 0.8) * 0.12,
    8.0 + Math.cos(orbit) * 0.34,
  );
  camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-2.7 * delta));
  lookTarget.lerp(cinematicTarget, 1 - Math.exp(-4 * delta));
  camera.lookAt(lookTarget);
}


function updatePlayerLabel() {
  if (experienceMode !== "cafe" || meetingMode) {
    playerLabel.style.opacity = "0";
    return;
  }
  projected.copy(player.position);
  projected.y += 1.78;
  projected.project(camera);
  const visible = projected.z > -1 && projected.z < 1;
  playerLabel.style.opacity = visible ? "1" : "0";
  playerLabel.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
  playerLabel.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
}


function updateSpeechPositions() {
  for (const personId of appShell.speechPersonIds) {
    const entity = npcSystem?.getEntity(personId);
    if (!entity) continue;
    projected.copy(entity.root.position);
    projected.y += 1.55 * entity.root.scale.y;
    projected.project(camera);
    const visible =
      experienceMode === "cafe" &&
      projected.z > -1 && projected.z < 1 &&
      Math.abs(projected.x) < 1.15 &&
      Math.abs(projected.y) < 1.15;
    appShell.positionSpeech(
      personId,
      (projected.x * 0.5 + 0.5) * window.innerWidth,
      (-projected.y * 0.5 + 0.5) * window.innerHeight,
      visible,
    );
  }
}


function updateRoundtablePrompt() {
  if (isHallWorld) {
    // 大厅没有圆桌会议
    if (roundtableNearby) {
      roundtableNearby = false;
      appShell.setRoundtableNearby(false);
      canvas.dataset.roundtableNearby = "false";
    }
    return;
  }
  const distance = Math.hypot(
    player.position.x - CAFE_LAYOUT.roundtable.center.x,
    player.position.z - CAFE_LAYOUT.roundtable.center.z,
  );
  roundtableNearby = experienceMode === "cafe" && !meetingMode && distance <= CAFE_LAYOUT.roundtable.interactionRadius;
  appShell.setRoundtableNearby(roundtableNearby);
  canvas.dataset.roundtableNearby = String(roundtableNearby);
}


function refreshDiagnostics() {
  const states = people.map((person) => worldAgentState(person.id));
  const centralCount = states.filter((state) => state?.meeting).length;
  canvas.dataset.playerPosition = [player.position.x, player.position.y, player.position.z]
    .map((value) => value.toFixed(4))
    .join(",");
  canvas.dataset.cameraPosition = [camera.position.x, camera.position.y, camera.position.z]
    .map((value) => value.toFixed(4))
    .join(",");
  canvas.dataset.npcAssignments = states
    .map((state) => `${state.personId}:${state.tableId}:${state.status}`)
    .join("|");
  canvas.dataset.centralNpcCount = String(centralCount);
  canvas.dataset.meetingCount = String(meetingMode ? centralCount + 1 : 0);
  canvas.dataset.speechCount = String(appShell.speechPersonIds.length);
  canvas.dataset.renderCalls = String(renderer.info.render.calls);
  canvas.dataset.triangles = String(renderer.info.render.triangles);
  canvas.dataset.centerPixel = sampleCenterPixel().join(",");
}


function animate(timestamp) {
  timer.update(timestamp);
  const delta = Math.min(timer.getDelta(), 0.05);
  elapsed += delta;

  if (worldReady) {
    characterSystem.update(delta, elapsed);
    boothSystem?.update(delta);
    if (liveEnabled) updateLiveAgents(delta);
    else npcSystem.update(delta, elapsed);
    if (experienceMode === "cafe") {
      updatePlayer(delta);
      if (meetingMode) updateMeetingCamera(delta);
      else updateFollowCamera(delta);
      updatePlayerLabel();
      updateRoundtablePrompt();
    } else {
      updateCinematicCamera(delta);
    }
    updateSelectionMarker();
    updateSpeechPositions();
    updateLiveBubbles();
  }

  renderer.render(scene, camera);
  if (worldReady && diagnosticFrame++ % 15 === 0) refreshDiagnostics();
  requestAnimationFrame(animate);
}


function sampleCenterPixel() {
  const gl = renderer.getContext();
  const pixel = new Uint8Array(4);
  gl.readPixels(
    Math.floor(renderer.domElement.width * 0.5),
    Math.floor(renderer.domElement.height * 0.5),
    1,
    1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixel,
  );
  return Array.from(pixel);
}


function showFatalError(error) {
  console.error(error);
  canvas.dataset.ready = "false";
  canvas.dataset.fatal = String(error.message || error);
  loading.classList.add("is-hidden");
  fatalError.textContent = `场景载入失败：${error.message || error}`;
  fatalError.classList.add("is-visible");
}


function personRootFromHit(object) {
  let node = object;
  while (node && node !== scene) {
    if (node.userData?.personId) return node;
    node = node.parent;
  }
  return null;
}


canvas.addEventListener("pointerdown", (event) => {
  pointerStart.set(event.clientX, event.clientY);
});

canvas.addEventListener("pointerup", (event) => {
  if (!worldReady || experienceMode !== "cafe" || meetingMode) return;
  if (pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 8) return;
  const bounds = canvas.getBoundingClientRect();
  pointerNdc.set(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointerNdc, camera);
  const pickTargets = characterSystem.entities.map((entity) => entity.root);
  if (boothSystem) pickTargets.push(...boothSystem.pickRoots);
  const hits = raycaster.intersectObjects(pickTargets, true);
  const root = hits.length > 0 ? personRootFromHit(hits[0].object) : null;
  const personId = root?.userData.personId;
  if (isHallWorld) {
    // 大厅：点击展位或其人 → 资料包面板；新人不在世界实体中时直接开面板
    if (personId && personId !== currentUser.id) {
      if (!selectPersonInWorld(personId)) integrations.panel.openPerson(personId);
    }
    return;
  }
  selectWorldPerson(personId && personId !== currentUser.id ? personId : null);
});


window.addEventListener("keydown", (event) => {
  if (
    experienceMode === "cafe" &&
    !meetingMode &&
    ["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code) &&
    !event.target.closest?.("input, textarea")
  ) {
    pressedKeys.add(event.code);
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => pressedKeys.delete(event.code));
window.addEventListener("blur", () => {
  pressedKeys.clear();
  touchInput.set(0, 0);
  touchKnob.style.transform = "translate(0, 0)";
});


function updateTouchStick(event) {
  if (experienceMode !== "cafe" || meetingMode) return;
  const bounds = touchStick.getBoundingClientRect();
  const centerX = bounds.left + bounds.width * 0.5;
  const centerY = bounds.top + bounds.height * 0.5;
  const radius = 30;
  const offset = new THREE.Vector2(event.clientX - centerX, event.clientY - centerY);
  if (offset.length() > radius) offset.setLength(radius);
  touchKnob.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
  touchInput.set(offset.x / radius, -offset.y / radius);
}

touchStick.addEventListener("pointerdown", (event) => {
  touchStick.setPointerCapture(event.pointerId);
  updateTouchStick(event);
});
touchStick.addEventListener("pointermove", (event) => {
  if (touchStick.hasPointerCapture(event.pointerId)) updateTouchStick(event);
});
for (const eventName of ["pointerup", "pointercancel"]) {
  touchStick.addEventListener(eventName, (event) => {
    if (eventName === "pointerup" && touchStick.hasPointerCapture(event.pointerId)) {
      touchStick.releasePointerCapture(event.pointerId);
    }
    touchInput.set(0, 0);
    touchKnob.style.transform = "translate(0, 0)";
  });
}

window.addEventListener("resize", resizeRenderer);
resizeRenderer();

const assetStore = new AssetStore();

// 环境 GLB 未到货时的简易占位场地：地坪（GROUND 前缀命名供碰撞射线识别）+ 四周边界提示
function buildFallbackEnvironment() {
  const group = new THREE.Group();
  group.name = "ENV_Fallback";
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(
      worldBounds.maxX - worldBounds.minX + 2,
      worldBounds.maxZ - worldBounds.minZ + 2,
    ),
    new THREE.MeshStandardMaterial({ color: "#b9a98a", roughness: 0.95 }),
  );
  floor.name = "GROUND_FallbackFloor";
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.set(
    (worldBounds.minX + worldBounds.maxX) / 2,
    0,
    (worldBounds.minZ + worldBounds.maxZ) / 2,
  );
  group.add(floor);
  return group;
}

async function boot() {
  setProgress(0.04, `正在读取${worldTitle}`);
  // 人名映射只拉一次：气泡与 Toast 优先使用资料包里的名字（与 integrations 共享 getPackages 缓存）
  api.getPackages().then(fillPackageNames).catch((error) => {
    console.warn("[EchoWorld] api.getPackages() 失败，气泡人名回退为本地数据", error);
  });
  worldSpec = await loadWorldSpec(assetStore, WORLD_SPEC_URL);
  const assetCatalog = await AssetCatalog.load(
    assetStore,
    publicUrl(worldSpec.asset_catalog_url),
  );
  characterSystem = new CharacterSystem({
    scene,
    assetStore,
    assetCatalog,
    resolveSurfaceY: surfaceHeightAt,
    materialAdapter: (material) => adaptMaterialToProfile(
      material,
      activeVisualProfile,
    ),
  });
  if (isHallWorld) {
    setProgress(0.1, "正在准备展位模板");
    boothSystem = new BoothSystem({
      scene,
      assetStore,
      assetCatalog,
      resolveMediaUrl,
    });
    await boothSystem.prepare();
  }
  let environment = null;
  try {
    const environmentAsset = assetCatalog.resolve(environmentAssetId, "environment");
    setProgress(0.12, `正在搭建${worldTitle}`);
    environment = await assetStore.loadScene(environmentAsset.resolvedUrl);
  } catch (error) {
    console.warn(`[EchoWorld] 环境资产 ${environmentAssetId} 未就绪，使用简易占位场地`, error);
    environment = buildFallbackEnvironment();
  }
  setProgress(0.68);
  await configureWorld(environment);
}

boot().catch(showFatalError);


window.__echoWorld = {
  get ready() { return worldReady; },
  get player() { return player; },
  get renderer() { return renderer; },
  get camera() { return camera; },
  get worldSpec() { return worldSpec; },
  get sceneVariant() { return activeSceneVariant; },
  get characterVariant() { return activeCharacterVariant; },
  get characters() { return characterSystem?.entities ?? []; },
  get agentStates() {
    return people.map((person) => npcSystem?.getState(person.id)).filter(Boolean);
  },
  get appView() { return experienceMode; },
  get meetingActive() { return meetingMode; },
  get liveSource() { return liveWorld?.source ?? null; },
  get worldTick() { return liveWorldTick; },
  get world() { return activeWorld.id; },
  get boothSystem() { return boothSystem; },
  get integrations() { return integrations; },
  getAgentState: (personId) => worldAgentState(personId),
  selectPerson: selectWorldPerson,
  startMeeting,
  endMeeting,
  sampleCenterPixel,
  teleportPlayer(x, z) {
    if (!worldReady) return false;
    candidatePosition.set(x, 0, z);
    if (!isWalkable(candidatePosition)) return false;
    const moved = commitCandidatePosition(candidatePosition);
    if (moved) updatePlayerMarker();
    return moved;
  },
};

requestAnimationFrame(animate);
