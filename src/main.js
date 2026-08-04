import * as THREE from "three";
import { currentUser, people, relationships } from "./data/demoPeople.js";
import { personSignals } from "./data/demoSignals.js";
import { AssetCatalog } from "./runtime/AssetCatalog.js";
import { AssetStore } from "./runtime/AssetStore.js";
import { BoothSystem, buildFallbackBooths, fallbackBoothAnchor } from "./runtime/BoothSystem.js";
import { CAFE_LAYOUT, tableById } from "./runtime/CafeLayout.js";
import { CharacterExpressionSystem } from "./runtime/CharacterExpressionSystem.js";
import { CharacterSystem } from "./runtime/CharacterSystem.js";
import { colliderShellFor } from "./runtime/ColliderRegistry.js";
import { HeartSignalSystem } from "./runtime/HeartSignalSystem.js";
import { FALLBACK_SNAPSHOT, LiveWorld } from "./runtime/LiveWorld.js";
import { NpcAgentSystem } from "./runtime/NpcAgentSystem.js";
import { PersonSignalStore } from "./runtime/PersonSignalStore.js";
import { RelationshipFieldSystem } from "./runtime/RelationshipFieldSystem.js";
import { WorldBroadcastSystem } from "./runtime/WorldBroadcastSystem.js";
import { WorldModuleRegistry } from "./runtime/WorldModuleRegistry.js";
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
import { API_MODE } from "./runtime/mock/MockApi.js";
import { slideStepAroundBlockers } from "./runtime/WalkSlide.js";
import {
  CAFE_WORLD,
  FIELD_WORLD,
  HALL_LAYOUT,
  fieldPersonFromLocation,
  navigateToField,
  navigateToWorld,
  worldFromLocation,
} from "./runtime/WorldSwitch.js";
import {
  adaptMaterialToProfile,
  adaptSceneMaterials,
  installVisualProfile,
} from "./runtime/VisualProfiles.js";
import { loadWorldSpec, publicUrl } from "./runtime/WorldSpec.js";
import { createCafeShell } from "./ui/CafeShell.js";
import { mountSceneInteraction } from "./ui/SceneInteraction.js";
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
const isCafeWorld = activeWorld.id === "cafe";
const isFieldWorld = activeWorld.id === "field";
const fieldTargetPersonId = fieldPersonFromLocation() ?? people[0].id;
const fieldTargetPerson = people.find((person) => person.id === fieldTargetPersonId) ?? people[0];
const invitedPersonId = new URLSearchParams(window.location.search).get("invite");
// 大厅暂只用 v1 视觉配置（专属 profile 后续）；环境资产/布局/出生点按世界选择
const activeVisualProfile = isHallWorld || isFieldWorld
  ? sceneVariantById("v1").visualProfile
  : activeSceneVariant.visualProfile;
const environmentAssetId = isHallWorld
  ? HALL_LAYOUT.environmentAssetId
  : isFieldWorld
    ? FIELD_WORLD.environmentAssetId
    : activeSceneVariant.environmentAssetId;
// 静态碰撞壳（边界 + 静态圆）统一从注册表取数；大厅动态摊位圆由 BoothSystem 注入
const worldShell = colliderShellFor(environmentAssetId);
const worldBounds = worldShell.bounds;
const worldPlayerSpawn = isHallWorld
  ? HALL_LAYOUT.playerSpawn
  : isFieldWorld
    ? FIELD_WORLD.playerSpawn
    : CAFE_LAYOUT.playerSpawn;
const worldTitle = isCafeWorld ? activeSceneVariant.title : activeWorld.title;
document.body.dataset.world = activeWorld.id;

const MOVE_SPEED = 2.7;
const PLAYER_FOOT_OFFSET = 0.018;
const SEATED_SCALE_Y = 0.82;
const SEATED_ROOT_Y = 0.025;
const MODEL_FORWARD = new THREE.Vector3(0, 0, 1);
const WORLD_UP = new THREE.Vector3(0, 1, 0);
// 咖啡厅 NPC 出生的最后兜底（优先用 LiveWorld.FALLBACK_SNAPSHOT 的生活化座位/站位，
// 避免快照到达前所有人在门口站成一排）
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
const HALL_GLANCE_DURATION = 0.9;
const HALL_GLANCE_ANGLE = Math.PI / 12; // 主理人回眸幅度 15°
const NPC_COLLIDER_RADIUS = 0.35; // 玩家 ↔ NPC 软碰撞圆半径

// 快照新人（confirm 第 7 人+）缺调色板时，按 id 哈希从六人调色板确定性取一个
const FALLBACK_PALETTES = Object.freeze(people.map((person) => person.palette));

function hashString(value) {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return hash;
}

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
  groupParticipants: [currentUser, ...people],
  groupPresenceProvider: () => readGroupPresence(),
  onGroupPresenceHook: (participants, viewerId) => applyGroupPresence(participants, viewerId),
});
const api = integrations.api;
// 点击世界中的小人：保留现有侧栏行为，资料包面板浮于其上（外部可用 onPersonSelected 覆盖）
const onPersonSelected =
  typeof runtimeOptions.onPersonSelected === "function"
    ? runtimeOptions.onPersonSelected
    : (personId) => {
        if (personId) integrations.panel.openPerson(personId);
      };
const liveEnabled = runtimeOptions.live !== false && !isFieldWorld;
// 用户发起的圆桌会议由真实后端承载（IF-6）：仅 ?api=live 且 live 快照开启时；
// 其余（静态 mock / 注入 api）保持本地轮播台词的演示行为
const meetingBackendLive = liveEnabled && API_MODE === "live" &&
  typeof api.startMeeting === "function" && typeof api.postMeetingMessage === "function";
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
if (isHallWorld) {
  // 集市民谣氛围，待视觉 profile 正式化：亮蓝天背景 + 轻雾远景（在 current profile 基础上覆盖）
  scene.background = new THREE.Color("#7ec8e3");
  scene.fog = new THREE.Fog("#a8d8ec", 16, 42);
}

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
const movementForward = new THREE.Vector3();
const movementRight = new THREE.Vector3();
const currentHeading = new THREE.Vector3(0, 0, -1);
const desiredCameraPosition = new THREE.Vector3();
const desiredLookTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3(0, 0.85, 0);
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
const expressionSystem = new CharacterExpressionSystem();
const heartSignalSystem = new HeartSignalSystem();
const personSignalStore = new PersonSignalStore(personSignals);
heartSignalSystem.setVisible(false);

const packageNames = new Map();
const liveTargets = new Map();
const liveMeetingOverrides = new Map();
const groupPresenceOverrides = new Map();
const liveBubbles = new Map();
const liveFacing = new THREE.Vector3();
let liveMeetingSeatIndices = [];
let liveMeetingId = null;
let liveWorld = null;
let liveWorldTick = null;
let boothSystem = null;
let relationshipFieldSystem = null;
let relationshipField = null;
let worldBroadcastSystem = null;
let worldModuleRegistry = null;
let playerSeatedAt = null;
let pendingSceneInviteId = people.some((person) => person.id === invitedPersonId)
  ? invitedPersonId
  : null;
let nearbyHotspotId = null;
let sceneHotspots = [];
const hallGlances = new Map();
const dynamicPeople = new Map();
const pendingAgentSpawns = new Set();
const hoverNdc = new THREE.Vector2();
let hoverClientX = 0;
let hoverClientY = 0;
let hoverActive = false;
let hoverBooth = null;

const appShell = createCafeShell({
  root: document.querySelector("#ui-root"),
  currentUser,
  people,
  relationships,
  sceneVariants: SCENE_VARIANT_OPTIONS,
  activeSceneVariant,
  characterVariants: CHARACTER_VARIANT_OPTIONS,
  activeCharacterVariant,
  signalStore: personSignalStore,
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
  onMeetingMessage: (text) => api.postMeetingMessage(text),
  meetingLive: meetingBackendLive,
  resolveMediaUrl,
  world: activeWorld.id,
  fieldPerson: isFieldWorld ? fieldTargetPerson : null,
  onExpressionChange: (personId, expression, metadata) => {
    void setCharacterExpression(personId, expression, metadata);
  },
  onProfileChange: updateRuntimeProfile,
});

const sceneInteraction = mountSceneInteraction({
  onAction: handleSceneInteraction,
});

const unsubscribePersonSignals = personSignalStore.subscribe((snapshot, metadata) => {
  if (snapshot) heartSignalSystem.setSignal(snapshot.personId, snapshot);
  else if (metadata.removed) heartSignalSystem.unregister(metadata.personId);
  canvas.dataset.lastSignalUpdate = metadata.personId;
  canvas.dataset.signalUpdateSource = metadata.source;
});

canvas.dataset.ready = "false";
canvas.dataset.appView = experienceMode;
canvas.dataset.roundtableReserved = "true";
canvas.dataset.characterVariant = activeCharacterVariant.id;
canvas.dataset.world = activeWorld.id;
canvas.dataset.expressionVariant = activeCharacterVariant.id;

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

// 大厅展位 hover 的跟随鼠标小标签（仅桌面指针；移动端无 pointermove hover 不受影响）
const hoverTooltip = document.createElement("div");
hoverTooltip.style.cssText =
  "position:fixed;z-index:35;display:none;pointer-events:none;padding:6px 10px;border-radius:10px;" +
  "border:1px solid rgba(255,255,255,.5);background:rgba(20,54,47,.82);color:#fffdf4;" +
  "font-size:10px;font-weight:700;letter-spacing:.05em;backdrop-filter:blur(10px);" +
  "transform:translate(14px,-130%);white-space:nowrap;";
document.body.append(hoverTooltip);


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
  expressionSystem.register(playerEntity, currentUser.id, activeCharacterVariant.id);

  const visiblePeople = isFieldWorld ? [fieldTargetPerson] : people;
  npcSystem = new NpcAgentSystem({
    people: visiblePeople,
    onConversation: (event) => appShell.showNpcConversation(event),
    onStateChange: (state) => appShell.updateAgentState(state),
  });

  const fieldCompanion = relationshipField?.scene?.companion ?? { x: 0, z: -1.1, yaw: 0 };
  // 出生即"生活化"：快照到达前 NPC 也不能在门口站成一排——
  // 集市直接站在各自展位前（与 buildFallbackBooths 同序），咖啡厅落在兜底快照的座位/站位上
  const fallbackSnapshotSpawn = new Map(
    FALLBACK_SNAPSHOT.agents.map((agent) => [agent.id, agent.position]),
  );
  const npcSpawnFor = (person, index) => {
    if (isHallWorld) return fallbackBoothAnchor(index);
    if (isFieldWorld) return fieldCompanion;
    return fallbackSnapshotSpawn.get(person.id) ?? NPC_ENTRY_SPAWNS[index];
  };
  for (let index = 0; index < visiblePeople.length; index += 1) {
    setProgress(0.76 + index * 0.03, `正在载入 ${visiblePeople[index].name} 的人物模型`);
    const entity = await characterSystem.spawn(
      characterSpec(
        visiblePeople[index],
        `agent-${visiblePeople[index].id}`,
        npcSpawnFor(visiblePeople[index], index),
      ),
    );
    expressionSystem.register(entity, visiblePeople[index].id, activeCharacterVariant.id);
    heartSignalSystem.register(
      entity,
      visiblePeople[index].id,
      personSignalStore.getSnapshot(visiblePeople[index].id),
    );
    npcSystem.register(visiblePeople[index], entity);
  }
  // live 模式下本地随机调度关闭：座位分配与对话全部由世界快照驱动
  if (!liveEnabled && !isFieldWorld) npcSystem.initializeCafe();

  playerMarker = makeGroundMarker("#f2c55f", 0.32, 0.42, 0.42);
  playerMarker.name = "PLAYER_GroundMarker";
  selectionMarker = makeGroundMarker("#d36f59", 0.36, 0.48, 0.72);
  selectionMarker.name = "SELECTION_GroundMarker";
  selectionMarker.visible = false;
  updatePlayerMarker();
}


async function configureWorld(root) {
  environmentRoot = root;
  if (!isFieldWorld) adaptSceneMaterials(root, activeVisualProfile);
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

  // 地面节点按 GROUND 前缀识别（咖啡厅 GROUND_CafeFloor / 大厅地坪 / 集市街道
  // GROUND_MarketStreet+GROUND_Grass_* / 占位场地通用）；收集全部 GROUND 节点
  // （街道有草地+石板路多块地面，只取第一个会导致出生点落在采集范围外）；
  // 一个都没有时退化为以整个环境做地面射线目标，保证人物可站立可走
  const groundRoots = [];
  const cafeFloor = root.getObjectByName("GROUND_CafeFloor");
  if (cafeFloor) groundRoots.push(cafeFloor);
  root.traverse((object) => {
    if (object.name.startsWith("GROUND") && !groundRoots.includes(object)) {
      groundRoots.push(object);
    }
  });
  if (groundRoots.length === 0) {
    console.warn(`[EchoWorld] ${worldTitle}资产缺少 GROUND 地面节点，以整个环境作为地面射线目标`);
    groundRoots.push(root);
  }
  for (const groundRoot of groundRoots) {
    groundRoot.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = false;
      object.receiveShadow = true;
      groundMeshes.push(object);
    });
    if (groundRoot.isMesh) groundMeshes.push(groundRoot);
  }
  const uniqueGroundMeshes = [...new Set(groundMeshes)];
  groundMeshes.length = 0;
  groundMeshes.push(...uniqueGroundMeshes);

  if (isCafeWorld) validateRuntimeAnchors(root);
  await spawnCharacters();
  rebuildSceneHotspots();
  worldBroadcastSystem = new WorldBroadcastSystem({ scene, api, world: activeWorld.id });
  worldBroadcastSystem.mount();
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
  tickBadge.style.display = mode === "cafe" && !isFieldWorld ? "flex" : "none";
  heartSignalSystem.setVisible(mode === "cafe" && !isFieldWorld);
  if (mode === "cafe") canvas.focus({ preventScroll: true });
}


function selectWorldPerson(personId) {
  const person = personLikeFor(personId);
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


async function startMeeting(personIds, topic = null) {
  if (!worldReady || meetingMode) return [];
  leavePlayerSeat();
  let accepted = [];
  if (meetingBackendLive) {
    // 真实会议（IF-6）：后端入座圆桌 + 按 tick 产出 LLM 会议对话；
    // 409（已有会议/参与者在会上）抛错，由 CafeShell 把 detail 提示给用户
    const requested = [...new Set(personIds)]
      .filter((personId) => npcSystem.getEntity(personId))
      .slice(0, 5);
    const meeting = await api.startMeeting(requested, topic);
    accepted = Array.isArray(meeting.participants) && meeting.participants.length
      ? meeting.participants
      : requested;
    liveMeetingId = meeting.meeting_id ?? null;
    // 不做本地座位覆盖：与会者由快照驱动入座圆桌（服务端已Teleport到圆桌锚点）；
    // 只为玩家保留 0 号座位，防止快照适配把 NPC 排进玩家的位置
    for (const personId of accepted) {
      appShell.updateAgentState({
        personId,
        status: "joining-meeting",
        tableId: CAFE_LAYOUT.roundtable.id,
        tableLabel: CAFE_LAYOUT.roundtable.label,
        meeting: true,
      });
    }
  } else if (liveEnabled) {
    // live 快照但未接真实后端（静态演示）：本地覆盖目标，台词走本地轮播
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
  liveMeetingSeatIndices = meetingBackendLive
    ? [0]
    : [0, ...accepted.map((_, index) => index + 1)];
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
  await recordWorldEvent(
    "meeting-started",
    `你邀请${accepted.map(nameOf).join("、")}在中央圆桌坐下`,
    accepted,
    { table_id: CAFE_LAYOUT.roundtable.id },
  );
  return accepted;
}


// 会议本地状态的统一拆除（玩家离席/后端散场共用）：人物起身、覆盖与标志复位
function teardownMeetingLocalState() {
  meetingMode = false;
  player.scale.set(1, 1, 1);
  playerMarker.visible = experienceMode === "cafe";
  playerEntity.spec.behavior.idle_bob = 0;
  actorAt(playerEntity, 0, 3.12, Math.PI);
  playerGroundY = playerEntity.baseY;
  updatePlayerMarker();
  currentHeading.set(0, 0, -1);
  liveMeetingOverrides.clear();
  liveMeetingSeatIndices = [];
  liveMeetingId = null;
  canvas.dataset.meetingActive = "false";
  canvas.dataset.meetingInvited = "";
}


// 后端会议自然散场（meeting-ended 事件到达）：本地离席，会议 sheet 定格为"会议结束"
function finishLiveMeeting() {
  if (!meetingMode) return;
  teardownMeetingLocalState();
  appShell.meetingEnded();
}


async function endMeeting() {
  if (!worldReady) return;
  const participants = canvas.dataset.meetingInvited
    ? canvas.dataset.meetingInvited.split(",").filter(Boolean)
    : [];
  teardownMeetingLocalState();
  if (meetingBackendLive) {
    // 真实会议（IF-6）：发起人提前散场——后端立即发 meeting-end，
    // meeting-ended 事件随快照回流并进今日播报；本地先离席
    if (typeof api.endMeeting === "function") {
      try {
        await api.endMeeting();
      } catch (error) {
        console.warn("[EchoWorld] 结束会议未送达（会议可能已散场）", error);
      }
    }
    return;
  }
  if (!liveEnabled) {
    npcSystem.endMeeting();
  }
  await recordWorldEvent(
    "meeting-ended",
    participants.length
      ? `你与${participants.map(nameOf).join("、")}结束了圆桌交流`
      : "中央圆桌交流结束",
    participants,
    { table_id: CAFE_LAYOUT.roundtable.id },
  );
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


// 交互收敛（INTERACTION-DESIGN §6）：热点只带 primaryAction（E）/ secondaryAction（F），
// 按下即发生并留痕；不再下发三键并列的 actions 菜单
function rebuildSceneHotspots() {
  if (isFieldWorld) {
    sceneHotspots = (relationshipFieldSystem?.hotspots ?? []).map((hotspot) => {
      const icon = hotspot.kind === "memory"
        ? "book-open"
        : hotspot.kind === "thread"
          ? "message-circle"
          : hotspot.kind === "echo"
            ? "landmark"
            : "sparkles";
      return {
        ...hotspot,
        icon,
        primaryAction: { id: "touch-field", label: hotspot.prompt, icon },
      };
    });
    return;
  }

  if (isHallWorld) {
    const cafeModule = worldModuleRegistry?.byId("venue.cafe.v1");
    sceneHotspots = [{
      id: "hall-cafe-door",
      kind: "venue",
      x: 0,
      z: -9.15,
      radius: cafeModule?.interaction?.radius ?? 1.9,
      eyebrow: "市集街上的室内空间",
      title: cafeModule?.label ?? "Echo Cafe",
      prompt: cafeModule?.interaction?.verb ?? "进入咖啡厅",
      icon: "door-open",
      primaryAction: { id: "enter-cafe", label: "进入", icon: "door-open" },
    }];
    for (const record of boothSystem?.booths.values() ?? []) {
      sceneHotspots.push({
        id: `booth-${record.personId}`,
        kind: "booth",
        x: record.position.x,
        z: record.position.z,
        radius: 2.15,
        personId: record.personId,
        eyebrow: "人 ↔ 共同课题 ↔ 人",
        title: `${record.displayName ?? nameOf(record.personId)}的摊位`,
        prompt: `${record.displayName ?? nameOf(record.personId)}的摊位`,
        icon: "store",
        primaryAction: { id: "chat-person", label: "聊聊", icon: "message-circle" },
        secondaryAction: { id: "enter-field", label: "场域", icon: "sparkles" },
      });
    }
    return;
  }

  const tableHotspots = CAFE_LAYOUT.npcTables.map((table) => {
    const seatedHere = playerSeatedAt === table.id;
    return {
      id: `cafe-table-${table.id}`,
      kind: "table",
      tableId: table.id,
      x: table.center.x,
      z: table.center.z,
      radius: table.capacity === 2 ? 1.9 : 2.05,
      eyebrow: "两个人之间的直接交流",
      title: table.label,
      prompt: seatedHere ? `你在${table.label}` : `在${table.label}坐下`,
      icon: "coffee",
      primaryAction: seatedHere
        ? { id: "leave-seat", label: "起身", icon: "door-open" }
        : { id: "sit-at-table", label: "坐下", icon: "coffee" },
      secondaryAction: seatedHere
        ? { id: "invite-table", label: "邀请熟人", icon: "users" }
        : null,
    };
  });
  sceneHotspots = [
    {
      id: "cafe-roundtable",
      kind: "roundtable",
      x: CAFE_LAYOUT.roundtable.center.x,
      z: CAFE_LAYOUT.roundtable.center.z,
      radius: CAFE_LAYOUT.roundtable.interactionRadius,
      eyebrow: "中央六人圆桌",
      title: pendingSceneInviteId ? `带${nameOf(pendingSceneInviteId)}入座` : "发起一次圆桌会议",
      prompt: pendingSceneInviteId ? `带${nameOf(pendingSceneInviteId)}加入圆桌` : "发起圆桌会议",
      icon: "users",
      primaryAction: { id: "open-meeting", label: "发起会议", icon: "users" },
    },
    {
      id: "cafe-bar",
      kind: "bar",
      x: 1.65,
      z: 3.15,
      radius: 1.8,
      eyebrow: "Echo Cafe 吧台",
      title: "吧台",
      prompt: "在吧台喝一杯",
      icon: "coffee",
      primaryAction: { id: "order-coffee", label: "喝一杯", icon: "coffee" },
      secondaryAction: { id: "invite-coffee", label: "邀请熟人", icon: "users" },
    },
    {
      id: "cafe-broadcast",
      kind: "broadcast",
      x: 1.2,
      z: -3.65,
      radius: 1.65,
      eyebrow: "世界事件不是背景动画",
      title: "今日播报屏",
      prompt: "查看今日世界事件",
      icon: "message-circle",
      primaryAction: { id: "read-brief", label: "看播报", icon: "message-circle" },
    },
    ...tableHotspots,
  ];
}


function nearestSceneHotspot() {
  if (!worldReady || experienceMode !== "cafe" || meetingMode || !player) return null;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const hotspot of sceneHotspots) {
    const distance = Math.hypot(player.position.x - hotspot.x, player.position.z - hotspot.z);
    if (distance <= hotspot.radius && distance < nearestDistance) {
      nearest = hotspot;
      nearestDistance = distance;
    }
  }
  return nearest;
}


function updateSceneInteraction() {
  const hotspot = appShell.isMeetingSheetOpen || meetingMode ? null : nearestSceneHotspot();
  if ((hotspot?.id ?? null) !== nearbyHotspotId) {
    nearbyHotspotId = hotspot?.id ?? null;
    canvas.dataset.nearbyHotspot = nearbyHotspotId ?? "";
  }
  sceneInteraction.setNearby(hotspot);
}


async function recordWorldEvent(type, summary, personIds = [], payload = {}) {
  try {
    const event = await api.recordWorldInteraction({
      type,
      summary,
      person_ids: personIds,
      source: "scene-interaction",
      payload,
    });
    canvas.dataset.lastWorldEvent = event.event_id ?? type;
    await worldBroadcastSystem?.refresh();
    return event;
  } catch (error) {
    console.warn("[EchoWorld] 世界事件写入失败", error);
    return null;
  }
}


function inviteActions() {
  return people.map((person) => ({
    actionId: `invite-person:${person.id}`,
    label: person.name,
    description: `${person.relation} · ${person.tags.slice(0, 2).join(" · ")}`,
    icon: "users",
  }));
}


function sitPlayerAt(tableId) {
  const table = tableById(tableId);
  if (!table || meetingMode) return false;
  const occupied = new Set(
    people
      .map((person) => worldAgentState(person.id))
      .filter((state) => state?.tableId === tableId)
      .map((state) => state.seatIndex),
  );
  const seatIndex = table.seats.findIndex((_, index) => !occupied.has(index));
  if (seatIndex < 0) return false; // 桌子坐满：保持站立，由调用方给出提示
  const seat = table.seats[seatIndex];
  actorAt(playerEntity, seat.x, seat.z, seat.yaw, SEATED_ROOT_Y);
  player.scale.set(1, SEATED_SCALE_Y, 1);
  playerEntity.spec.behavior.idle_bob = 0.003;
  playerGroundY = playerEntity.baseY;
  playerMarker.visible = false;
  currentHeading.set(Math.sin(seat.yaw), 0, Math.cos(seat.yaw));
  playerSeatedAt = tableId;
  canvas.dataset.playerSeatedAt = tableId;
  rebuildSceneHotspots();
  return true;
}


function leavePlayerSeat() {
  if (!playerSeatedAt) return false;
  const x = player.position.x;
  const z = player.position.z;
  const yaw = Math.atan2(currentHeading.x, currentHeading.z);
  actorAt(playerEntity, x, z, yaw);
  playerGroundY = playerEntity.baseY;
  player.scale.set(1, 1, 1);
  playerEntity.spec.behavior.idle_bob = 0;
  playerMarker.visible = experienceMode === "cafe";
  playerSeatedAt = null;
  canvas.dataset.playerSeatedAt = "";
  rebuildSceneHotspots();
  return true;
}


async function handleSceneInteraction(hotspot, actionId) {
  if (actionId === "enter-cafe") {
    navigateToWorld("cafe");
    return { close: true };
  }
  if (actionId === "chat-person") {
    // 点按看资料、E 直接开聊：资料包面板定位到「和 TA 聊聊」
    void integrations.panel.openPerson(hotspot.personId, { focusChat: true });
    return { close: true };
  }
  if (actionId === "enter-field") {
    void recordWorldEvent("field-entered", `你从${nameOf(hotspot.personId)}的摊位走进关系场域`, [hotspot.personId]);
    navigateToField(hotspot.personId);
    return { close: true };
  }
  if (actionId === "order-coffee") {
    void setCharacterExpression(currentUser.id, "happy", { source: "scene-interaction" });
    await recordWorldEvent("coffee-shared", "你在吧台点了一杯今日手冲", []);
    return {
      toast: {
        eyebrow: "吧台",
        title: "一杯今日手冲",
        detail: "这个安静的停顿已留在今日播报里。",
        icon: "coffee",
      },
    };
  }
  if (actionId === "invite-coffee" || actionId === "invite-table") {
    return {
      picker: {
        eyebrow: hotspot.title,
        title: "邀请谁过来？",
        people: inviteActions(),
      },
    };
  }
  if (actionId.startsWith("invite-person:")) {
    const personId = actionId.slice("invite-person:".length);
    pendingSceneInviteId = personId;
    await recordWorldEvent("invitation-sent", `你邀请${nameOf(personId)}在咖啡厅坐下`, [personId]);
    rebuildSceneHotspots();
    return {
      toast: {
        eyebrow: "邀请已送达",
        title: `${nameOf(personId)}会在圆桌等你`,
        detail: "走到中央圆桌，按 E 就能把这次邀请变成一场会议。",
        icon: "users",
      },
    };
  }
  if (actionId === "sit-at-table") {
    if (!sitPlayerAt(hotspot.tableId)) {
      return {
        toast: {
          eyebrow: hotspot.title,
          title: "这张桌子已经坐满了",
          detail: "换一张还有空位的桌子，或去中央圆桌发起会议。",
          icon: "coffee",
        },
      };
    }
    // 氛围动作去按钮化：坐下即点单（表情 + 事件 + toast，无菜单项）
    void setCharacterExpression(currentUser.id, "happy", { source: "scene-interaction" });
    void recordWorldEvent("coffee-shared", `你在${hotspot.title}坐下，点了一杯饮品`, []);
    return {
      toast: {
        eyebrow: hotspot.title,
        title: "你在桌边坐下了",
        detail: "E 起身 · F 邀请熟人过来坐。",
        icon: "coffee",
      },
    };
  }
  if (actionId === "leave-seat") {
    leavePlayerSeat();
    return { close: true };
  }
  if (actionId === "open-meeting") {
    leavePlayerSeat();
    sceneInteraction.close();  // UI 仲裁：会议 sheet 打开前先收掉场景层
    appShell.openMeeting(pendingSceneInviteId ? [pendingSceneInviteId] : []);
    return { close: true };
  }
  if (actionId === "read-brief") {
    const brief = await api.getWorldBrief();
    return {
      toast: {
        eyebrow: `${brief.event_count} 条近期世界事件`,
        title: brief.headline,
        detail: brief.summary,
        icon: "message-circle",
        duration: 8,
      },
    };
  }
  if (actionId === "touch-field") {
    const personId = hotspot.personId;
    await recordWorldEvent(
      hotspot.eventType,
      `你在与${nameOf(personId)}的场域触发了「${hotspot.title}」`,
      [personId],
      { field_entity: hotspot.id },
    );
    return {
      toast: {
        eyebrow: relationshipField?.scene?.title ?? "关系场域",
        title: hotspot.title,
        detail: hotspot.detail,
        icon: hotspot.icon,
        duration: 6,
      },
    };
  }
  return null;
}


// 在 3D 世界中选中/定位人物；不在世界中（如刚确认的新人）返回 false 且不影响当前选中
function selectPersonInWorld(personId) {
  if (typeof personId !== "string" || personId === "") return false;
  if (!personLikeFor(personId)) return false;
  selectWorldPerson(personId);
  return true;
}


function pushLiveToast(message, { level = "info" } = {}) {
  // 大厅模式：Toast 轻量化，仅 meeting 级别提示（agent-talk 串门防噪）
  if (isHallWorld && level !== "meeting") return;
  // 手机视口把主操作与 3D 视线留给用户，普通闲聊由今日播报承接。
  if (window.innerWidth <= 760 && level !== "meeting") return;
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
  const style = TICK_SOURCE_STYLE[source] ?? { color: "#9fb4ad", label: "离线" };
  const momentLabel = isHallWorld ? "集市时刻" : "世界时刻";
  tickBadge.innerHTML =
    `<span style="width:7px;height:7px;border-radius:50%;background:${style.color}"></span>` +
    `<span>${momentLabel} #${tick ?? "—"} · ${style.label}</span>`;
}


function showLiveTalk(personId, text, duration = LIVE_BUBBLE_DURATION) {
  if (!speechLayer) return;
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


// 大厅展位 hover：展位整体高亮（emissive + 地环 + 名牌放大）+ 姓名小标签跟随鼠标
function updateHallHover() {
  if (!boothSystem) return;
  let booth = null;
  if (hoverActive && experienceMode === "cafe" && !meetingMode) {
    raycaster.setFromCamera(hoverNdc, camera);
    const pickTargets = [
      ...boothSystem.pickRoots,
      ...characterSystem.entities.map((entity) => entity.root),
    ];
    const hits = raycaster.intersectObjects(pickTargets, true);
    const root = hits.length > 0 ? personRootFromHit(hits[0].object) : null;
    const personId = root?.userData.personId;
    if (personId && personId !== currentUser.id) {
      booth = boothSystem.boothForPerson(personId);
    }
  }
  if (booth !== hoverBooth) {
    if (hoverBooth) boothSystem.setHighlighted(hoverBooth, false);
    hoverBooth = booth;
    if (hoverBooth) boothSystem.setHighlighted(hoverBooth, true);
    canvas.style.cursor = hoverBooth ? "pointer" : "";
  }
  if (hoverBooth) {
    hoverTooltip.textContent = `${hoverBooth.displayName ?? "展位"} · 查看资料包`;
    hoverTooltip.style.left = `${hoverClientX}px`;
    hoverTooltip.style.top = `${hoverClientY}px`;
    hoverTooltip.style.display = "block";
  } else {
    hoverTooltip.style.display = "none";
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
    canvas.dataset.boothReadablePanelCount = String(boothSystem.readablePanelCount);
    rebuildSceneHotspots();
  }

  for (const agent of adapted.agents) {
    if (agent.id === currentUser.id || liveMeetingOverrides.has(agent.id)) continue;
    const entity = npcSystem?.getEntity(agent.id);
    if (!entity) {
      // 新面孔（confirm 新人等）：异步现场生成实体，后续快照接管站位与状态
      void ensureAgentEntity(agent);
      continue;
    }
    if (isHallWorld) {
      if (agent.state === "walking" && agent.position) {
        // 串门途中：按快照位置插值行走（WalkSlide 绕开展位）
        liveTargets.set(agent.id, {
          x: agent.position.x,
          z: agent.position.z,
          yaw: agent.position.yaw,
          state: "walking",
          seat: null,
        });
      } else {
        // 到位：吸附展位站位锚点（快照 position 即锚点；本地 fallback 用 BoothSystem 锚点）
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

  syncDynamicAgents(adapted.agents);
}


function handleLiveEvent(rawEvent) {
  // LiveWorld 发出的是快照里的原始事件，这里统一归一化（snake_case → camelCase）
  const event = normalizeEvent(rawEvent);
  if (!event) return;
  if (event.type === "agent-talk") {
    if (!event.agentId || !event.text) return;
    // 本会台词（agent-talk 带 meeting_id）进会议线程；世界气泡照常展示
    if (meetingMode && liveMeetingId && event.meetingId === liveMeetingId) {
      appShell.ingestMeetingMessage({ personId: event.agentId, text: event.text });
    }
    showLiveTalk(event.agentId, event.text);
    pushLiveToast(`${nameOf(event.agentId)} 和 ${nameOf(event.toAgentId)} 聊了起来`);
    return;
  }
  if (event.type === "meeting-started") {
    const names = event.participants.map(nameOf).join("、");
    pushLiveToast(names ? `圆桌会议开始：${names}` : "圆桌会议开始了", { level: "meeting" });
    return;
  }
  if (event.type === "meeting-ended") {
    if (liveMeetingId && event.meetingId === liveMeetingId) {
      finishLiveMeeting();  // 自己发起的会议散场：玩家离席，线程定格"会议结束"
    }
    pushLiveToast("圆桌会议结束，大家回到各自的座位", { level: "meeting" });
  }
}


// 主理人回眸状态（按 personId 错相，hash 分散首次回眸时刻）
function hallGlanceFor(personId) {
  let glance = hallGlances.get(personId);
  if (!glance) {
    let hash = 0;
    for (const char of personId) hash = (hash * 31 + char.charCodeAt(0)) % 997;
    glance = {
      nextAt: elapsed + 2 + (hash / 997) * 8,
      until: 0,
      side: 1,
    };
    hallGlances.set(personId, glance);
  }
  return glance;
}


function updateLiveAgents(delta) {
  if (!npcSystem) return;
  for (const personId of new Set([
    ...liveTargets.keys(),
    ...groupPresenceOverrides.keys(),
    ...liveMeetingOverrides.keys(),
  ])) {
    const target = liveMeetingOverrides.get(personId)
      ?? groupPresenceOverrides.get(personId)
      ?? liveTargets.get(personId);
    const entity = npcSystem.getEntity(personId);
    if (!target || !entity) continue;
    const root = entity.root;
    if (target.state === "at-booth") {
      // 大厅展位站位：直接吸附展位锚点，不做插值走动；主理人微动作——
      // 加重呼吸起伏（±0.01）+ 错相回眸 + 玩家走近（<2.5m）转身面向玩家
      root.position.x = target.x;
      root.position.z = target.z;
      entity.spec.behavior.idle_bob = 0.01;
      let facingYaw = target.yaw;
      const playerDistance = player
        ? Math.hypot(player.position.x - target.x, player.position.z - target.z)
        : Infinity;
      if (playerDistance < 2.5) {
        facingYaw = Math.atan2(player.position.x - target.x, player.position.z - target.z);
      } else {
        const glance = hallGlanceFor(personId);
        if (elapsed >= glance.nextAt) {
          glance.until = elapsed + HALL_GLANCE_DURATION;
          glance.side = Math.random() < 0.5 ? -1 : 1;
          glance.nextAt = elapsed + 6 + Math.random() * 4;
        }
        if (elapsed < glance.until) {
          const progress = 1 - (glance.until - elapsed) / HALL_GLANCE_DURATION;
          facingYaw += glance.side * HALL_GLANCE_ANGLE * Math.sin(progress * Math.PI);
        }
      }
      liveFacing.set(Math.sin(facingYaw), 0, Math.cos(facingYaw));
      targetQuaternion.setFromUnitVectors(MODEL_FORWARD, liveFacing);
      root.quaternion.slerp(targetQuaternion, 1 - Math.exp(-10 * delta));
      root.scale.y += (1 - root.scale.y) * (1 - Math.exp(-7 * delta));
      entity.baseY = 0;
      continue;
    }
    entity.spec.behavior.idle_bob = 0.005;
    const dx = target.x - root.position.x;
    const dz = target.z - root.position.z;
    const distance = Math.hypot(dx, dz);
    const moving = distance > 0.05;
    const seated = !moving && target.state !== "walking";

    if (moving) {
      // 匀速逼近快照目标：轮询节拍之间保持连续走动，而不是脉冲式追赶
      const stepLength = Math.min(distance, LIVE_WALK_SPEED * delta);
      // 轻量避障：下一步进入静态壳/摊位圆时沿切线滑动，缓解快照直线路径穿模；
      // yaw 跟随实际（滑动后的）移动方向。
      // 注意：此处不加入其他 NPC 圆——NPC↔NPC 分离解算权威在后端，前端只做静态壳保险
      const [stepX, stepZ] = slideStepAroundBlockers(
        root.position.x,
        root.position.z,
        (dx / distance) * stepLength,
        (dz / distance) * stepLength,
        currentBlockers(),
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


// demoPeople 或快照动态生成的人
function personLikeFor(personId) {
  return people.find((person) => person.id === personId) ?? dynamicPeople.get(personId) ?? null;
}


// 快照里的新面孔：用 CharacterSystem 克隆/换色现场生成实体，注册进既有驱动链路
async function ensureAgentEntity(agent) {
  if (!characterSystem || !npcSystem) return;
  if (pendingAgentSpawns.has(agent.id) || npcSystem.getEntity(agent.id)) return;
  pendingAgentSpawns.add(agent.id);
  try {
    const palette =
      agent.palette ?? FALLBACK_PALETTES[hashString(agent.id) % FALLBACK_PALETTES.length];
    const name = nameOf(agent.id);
    const personLike = {
      id: agent.id,
      name,
      displayName: name,
      relation: "刚搬进世界的新朋友",
      palette,
      conversation: { replies: ["（TA 还在整理自己的故事。）"] },
    };
    dynamicPeople.set(agent.id, personLike);
    const spawn = agent.position
      ? { x: agent.position.x, z: agent.position.z, yaw: agent.position.yaw ?? 0 }
      : worldPlayerSpawn;
    const entity = await characterSystem.spawn(
      characterSpec(personLike, `agent-${agent.id}`, spawn, 0.005),
    );
    npcSystem.register(personLike, entity);
    canvas.dataset.npcCount = String(npcSystem.agents.size);
    canvas.dataset.characterCount = String(characterSystem.entities.length);
  } catch (error) {
    dynamicPeople.delete(agent.id);
    console.warn(`[EchoWorld] 新人 ${agent.id} 的实体生成失败`, error);
  } finally {
    pendingAgentSpawns.delete(agent.id);
  }
}


// 快照中消失的动态生成实体：despawn 回收（原始 6 人不在 dynamicPeople 中，永不回收）
function syncDynamicAgents(agents) {
  if (dynamicPeople.size === 0) return;
  const presentIds = new Set(agents.map((agent) => agent.id));
  for (const personId of [...dynamicPeople.keys()]) {
    if (presentIds.has(personId) || pendingAgentSpawns.has(personId)) continue;
    const entity = npcSystem?.getEntity(personId);
    if (entity) characterSystem?.despawn(entity);
    npcSystem?.agents.delete(personId);
    liveTargets.delete(personId);
    hallGlances.delete(personId);
    dynamicPeople.delete(personId);
    canvas.dataset.npcCount = String(npcSystem?.agents.size ?? 0);
  }
}


function worldAgentState(personId) {
  if (liveEnabled) {
    const override = liveMeetingOverrides.get(personId);
    const target = override ?? groupPresenceOverrides.get(personId) ?? liveTargets.get(personId);
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


function readGroupPresence() {
  if (!player) return null;
  const heading = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
  return {
    x: player.position.x,
    z: player.position.z,
    yaw: Math.atan2(heading.x, heading.z),
  };
}


function applyGroupPresence(participants, viewerId) {
  groupPresenceOverrides.clear();
  for (const participant of Array.isArray(participants) ? participants : []) {
    if (participant.person_id === viewerId || participant.person_id === currentUser.id) continue;
    const position = participant.presence;
    if (!position || !npcSystem?.getEntity(participant.person_id)) continue;
    groupPresenceOverrides.set(participant.person_id, {
      x: position.x,
      z: position.z,
      yaw: position.yaw ?? 0,
      state: "walking",
      seat: null,
    });
  }
  canvas.dataset.groupParticipantCount = String(participants?.length ?? 0);
  canvas.dataset.groupRemoteCount = String(groupPresenceOverrides.size);
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
  // 静态壳来自 ColliderRegistry；大厅摊位圆为动态锚点，由 BoothSystem 快照同步后注入。
  // 注意：不含 NPC 圆——NPC↔NPC 分离解算权威在后端，前端只保静态壳与玩家软碰撞，防双权威打架
  return isHallWorld
    ? [...worldShell.staticCircles, ...(boothSystem?.blockers ?? [])]
    : worldShell.staticCircles;
}


// 当前世界 NPC 实体的动态碰撞圆（含动态生成的新人；玩家自身不在 npcSystem 中，天然排除）
function npcColliders() {
  if (!npcSystem) return [];
  const circles = [];
  for (const agent of npcSystem.agents.values()) {
    const position = agent.entity.root.position;
    circles.push({ x: position.x, z: position.z, r: NPC_COLLIDER_RADIUS });
  }
  return circles;
}


function isWalkable(position) {
  if (
    position.x < worldBounds.minX ||
    position.x > worldBounds.maxX ||
    position.z < worldBounds.minZ ||
    position.z > worldBounds.maxZ
  ) return false;
  return !currentBlockers().some(
    (blocker) => Math.hypot(position.x - blocker.x, position.z - blocker.z) < (blocker.r ?? blocker.radius),
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
  if (meetingMode || playerSeatedAt || sceneInteraction.isOpen || appShell.isMeetingSheetOpen) return;
  const input = readMovementInput();
  const moving = input.lengthSq() > 0.0025;

  if (moving) {
    movementForward.copy(currentHeading).setY(0).normalize();
    movementRight.crossVectors(movementForward, WORLD_UP).normalize();
    moveDirection
      .copy(movementForward)
      .multiplyScalar(input.y)
      .addScaledVector(movementRight, input.x)
      .normalize();
    candidatePosition.copy(player.position).addScaledVector(moveDirection, MOVE_SPEED * delta);

    // 玩家 ↔ NPC 软碰撞：NPC 实体作动态圆（r=0.35，含新人实体），目标位置进圆则沿切线滑动。
    // NPC↔NPC 分离权威在后端，这里只保玩家不穿人；圆位置随帧更新
    const npcCircles = npcColliders();
    if (npcCircles.length > 0) {
      const [npcStepX, npcStepZ] = slideStepAroundBlockers(
        player.position.x,
        player.position.z,
        candidatePosition.x - player.position.x,
        candidatePosition.z - player.position.z,
        npcCircles,
      );
      candidatePosition.set(player.position.x + npcStepX, 0, player.position.z + npcStepZ);
    }

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
  desiredCameraPosition
    .copy(player.position)
    .addScaledVector(currentHeading, -3.75)
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
  // 旧的 #roundtable-prompt 悬浮入口已退役（由场景热点 cafe-roundtable 的
  // E/F 情境菜单完全取代，修复双重提示/面板重叠）；这里只维护 dataset 标志位，
  // 供诊断与验收脚本读取
  if (!isCafeWorld) {
    // 集市与关系场域没有圆桌会议
    if (roundtableNearby) {
      roundtableNearby = false;
      canvas.dataset.roundtableNearby = "false";
    }
    return;
  }
  const distance = Math.hypot(
    player.position.x - CAFE_LAYOUT.roundtable.center.x,
    player.position.z - CAFE_LAYOUT.roundtable.center.z,
  );
  roundtableNearby = experienceMode === "cafe" && !meetingMode
    && !appShell.isMeetingSheetOpen
    && distance <= CAFE_LAYOUT.roundtable.interactionRadius;
  canvas.dataset.roundtableNearby = String(roundtableNearby);
}


function refreshDiagnostics() {
  const states = people.map((person) => worldAgentState(person.id)).filter(Boolean);
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
  canvas.dataset.expressions = [currentUser, ...people]
    .map((person) => `${person.id}:${expressionSystem.getExpression(person.id) ?? "unregistered"}`)
    .join("|");
  const heartSignals = heartSignalSystem.getDiagnostics();
  canvas.dataset.heartSignalCount = String(heartSignals.length);
  canvas.dataset.heartSignals = heartSignals
    .map((signal) => {
      const score = Number.isFinite(signal.heart.heartScore)
        ? Math.round(signal.heart.heartScore)
        : "na";
      return `${signal.personId}:${score}:${signal.animation.beatBpm.toFixed(1)}`;
    })
    .join("|");
  canvas.dataset.renderCalls = String(renderer.info.render.calls);
  canvas.dataset.triangles = String(renderer.info.render.triangles);
  canvas.dataset.centerPixel = sampleCenterPixel().join(",");
  canvas.dataset.sceneHotspotCount = String(sceneHotspots.length);
  canvas.dataset.fieldEntityCount = String(relationshipFieldSystem?.hotspots.length ?? 0);
  canvas.dataset.worldModuleCount = String(worldModuleRegistry?.modules.length ?? 0);
}


function animate(timestamp) {
  timer.update(timestamp);
  const delta = Math.min(timer.getDelta(), 0.05);
  elapsed += delta;

  if (worldReady) {
    characterSystem.update(delta, elapsed);
    boothSystem?.update(delta);
    relationshipFieldSystem?.update(elapsed);
    if (liveEnabled) updateLiveAgents(delta);
    else npcSystem.update(delta, elapsed);
    heartSignalSystem.update(elapsed);
    if (experienceMode === "cafe") {
      updatePlayer(delta);
      if (meetingMode) updateMeetingCamera(delta);
      else updateFollowCamera(delta);
      updatePlayerLabel();
      updateRoundtablePrompt();
      updateSceneInteraction();
    } else {
      updateCinematicCamera(delta);
    }
    updateSelectionMarker();
    updateSpeechPositions();
    updateLiveBubbles();
    if (isHallWorld) updateHallHover();
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

// 大厅展位 hover：指针位置跟踪（射线在每帧 animate 中做，避免 pointermove 高频触发）
canvas.addEventListener("pointermove", (event) => {
  if (!isHallWorld) return;
  const bounds = canvas.getBoundingClientRect();
  hoverNdc.set(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
  );
  hoverClientX = event.clientX;
  hoverClientY = event.clientY;
  hoverActive = true;
});
canvas.addEventListener("pointerleave", () => {
  hoverActive = false;
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
  if (experienceMode === "cafe" && sceneInteraction.handleKey(event)) {
    event.preventDefault();
    return;
  }
  if (event.code === "Escape" && !event.repeat && !event.target.closest?.("input, textarea")) {
    // UI 仲裁：ESC 一次只关最顶层一层（场景选人条 → 会议 sheet → 起身）；
    // 资料包面板有自己的 ESC 处理（PackagePanel 内），这里不重复关
    if (integrations.panel?.isOpen) return;
    if (sceneInteraction.isOpen) {
      sceneInteraction.close();
      event.preventDefault();
      return;
    }
    if (appShell.isMeetingSheetOpen) {
      void appShell.requestCloseMeeting();
      event.preventDefault();
      return;
    }
  }
  if (event.code === "Escape" && playerSeatedAt && !event.target.closest?.("input, textarea")) {
    leavePlayerSeat();
    event.preventDefault();
    return;
  }
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
window.addEventListener("beforeunload", () => {
  appShell.destroy();
  sceneInteraction.destroy();
  relationshipFieldSystem?.dispose();
  worldBroadcastSystem?.dispose();
  unsubscribePersonSignals();
  heartSignalSystem.dispose();
  expressionSystem.dispose();
}, { once: true });
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
  worldModuleRegistry = await WorldModuleRegistry.load();
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
      templateAssetId: HALL_LAYOUT.boothTemplateAssetId,
    });
    await boothSystem.prepare();
  }
  let environment = null;
  if (isFieldWorld) {
    setProgress(0.12, `正在生成你与${fieldTargetPerson.name}的关系场域`);
    relationshipField = await api.getField(fieldTargetPerson.id);
    relationshipFieldSystem = new RelationshipFieldSystem({ scene, field: relationshipField });
    relationshipFieldSystem.applyAtmosphere(scene);
    environment = relationshipFieldSystem.root;
    canvas.dataset.fieldPerson = fieldTargetPerson.id;
    canvas.dataset.fieldSchema = relationshipField.schema;
    canvas.dataset.fieldGenerated = String(relationshipField.generated);
  } else {
    try {
      const environmentAsset = assetCatalog.resolve(environmentAssetId, "environment");
      setProgress(0.12, `正在搭建${worldTitle}`);
      environment = await assetStore.loadScene(environmentAsset.resolvedUrl);
    } catch (error) {
      console.warn(`[EchoWorld] 环境资产 ${environmentAssetId} 未就绪，使用简易占位场地`, error);
      environment = buildFallbackEnvironment();
    }
  }
  setProgress(0.68);
  await configureWorld(environment);
}


async function setCharacterExpression(personId, expression, metadata = {}) {
  const applied = await expressionSystem.setExpression(personId, expression);
  canvas.dataset.lastExpression = `${personId}:${expression}:${applied ? "applied" : "fallback"}`;
  canvas.dataset.expressionSource = metadata.source ?? "programmatic";
  return applied;
}


function updateRuntimeProfile(personId, updatedProfile) {
  const person = people.find((candidate) => candidate.id === personId);
  if (!person) return false;
  Object.assign(person, updatedProfile);
  const entity = npcSystem?.getEntity(personId);
  if (entity) {
    entity.profile = {
      ...entity.profile,
      display_name: person.name,
      relation: person.relation,
      role: person.role,
      city: person.city,
      bio: person.bio,
      tags: [...person.tags],
    };
    entity.root.userData.profile = entity.profile;
  }
  canvas.dataset.lastProfileUpdate = personId;
  return true;
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
  get expressions() {
    return Object.fromEntries(
      [currentUser, ...people].map((person) => [
        person.id,
        expressionSystem.getExpression(person.id),
      ]),
    );
  },
  get personSignals() {
    return Object.fromEntries(
      personSignalStore.list().map((snapshot) => [snapshot.personId, snapshot]),
    );
  },
  get heartSignals() { return heartSignalSystem.getDiagnostics(); },
  get agentStates() {
    return people.map((person) => npcSystem?.getState(person.id)).filter(Boolean);
  },
  get appView() { return experienceMode; },
  get meetingActive() { return meetingMode; },
  get liveSource() { return liveWorld?.source ?? null; },
  get worldTick() { return liveWorldTick; },
  get world() { return activeWorld.id; },
  get boothSystem() { return boothSystem; },
  get relationshipField() { return relationshipField; },
  get sceneHotspots() { return [...sceneHotspots]; },
  get nearbyHotspot() { return nearbySceneHotspot; },
  get worldBrief() { return worldBroadcastSystem?.brief ?? null; },
  get integrations() { return integrations; },
  getAgentState: (personId) => worldAgentState(personId),
  selectPerson: selectWorldPerson,
  setExpression: setCharacterExpression,
  ingestPersonSignal: (event) => personSignalStore.ingestEvent(event),
  setPersonSignal: (snapshot) => personSignalStore.upsert(snapshot),
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
