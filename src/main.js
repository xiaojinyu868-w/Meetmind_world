import * as THREE from "three";
import { currentUser, people, relationships } from "./data/demoPeople.js";
import { personSignals } from "./data/demoSignals.js";
import { AssetCatalog } from "./runtime/AssetCatalog.js";
import { AssetStore } from "./runtime/AssetStore.js";
import {
  BoothSystem,
  boothInteractionRadius,
  buildFallbackBooths,
} from "./runtime/BoothSystem.js";
import { CAFE_LAYOUT, tableById } from "./runtime/CafeLayout.js";
import { CampfireEntrance } from "./runtime/CampfireEntrance.js";
import { VILLAGE_CAMPFIRE_LAYOUT } from "./runtime/CampfireLayout.js";
import {
  CAFE_SCENE_VARIANTS,
  cafeSceneVariantFromLocation,
  navigateToCafeSceneVariant,
} from "./runtime/CafeVariants.js";
import { CharacterExpressionSystem } from "./runtime/CharacterExpressionSystem.js";
import { CHARACTER_ACTIONS, CharacterSystem } from "./runtime/CharacterSystem.js";
import {
  DEFAULT_CHARACTER_COLLIDER,
  capsuleFitsAt,
  capsulePenetrationAt,
} from "./runtime/CharacterCapsule.js";
import { colliderShellFor } from "./runtime/ColliderRegistry.js";
import { createEntrySpawnScatter } from "./runtime/EntrySpawnScatter.js";
import { HeartSignalSystem } from "./runtime/HeartSignalSystem.js";
import { createHubBlockoutEnvironment } from "./runtime/HubBlockout.js";
import { FALLBACK_SNAPSHOT, LiveWorld } from "./runtime/LiveWorld.js";
import { NpcAgentSystem } from "./runtime/NpcAgentSystem.js";
import { PersonSignalStore } from "./runtime/PersonSignalStore.js";
import { RelationshipFieldSystem } from "./runtime/RelationshipFieldSystem.js";
import { tryLoadFieldSplatWorld, snapObjectToFieldGround } from "./runtime/FieldSplatWorld.js";
import { RoomClient } from "./runtime/CafeRoomClient.js";
import {
  createVillageMarketEnvironment,
  VILLAGE_MARKET_LAYOUT,
} from "./runtime/VillageMarketEnvironment.js";
import { WorldBroadcastSystem } from "./runtime/WorldBroadcastSystem.js";
import { WorldModuleRegistry } from "./runtime/WorldModuleRegistry.js";
import { WorldAudioSystem } from "./runtime/WorldAudioSystem.js";
import {
  CHARACTER_VARIANT_OPTIONS,
  characterAssetId,
  characterVariantFromLocation,
  navigateToCharacterVariant,
} from "./runtime/CharacterVariants.js";
import {
  SCENE_VARIANT_OPTIONS,
  navigateToSceneVariant,
  sceneVariantFromLocation,
} from "./runtime/SceneVariants.js";
import { adaptSnapshot, normalizeEvent } from "./runtime/SnapshotAdapter.js";
import { useLiveMode } from "./runtime/mock/MockApi.js";
import { slideCapsuleStepAroundBlockers } from "./runtime/WalkSlide.js";
import { CameraRelativeMovement } from "./runtime/CameraRelativeMovement.js";
import { Input } from "./runtime/Input.js";
import { ThirdPersonCamera } from "./runtime/ThirdPersonCamera.js";
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
import { mountRoomPanel } from "./ui/group/RoomPanel.js";
import { mountIntegrations, resolveMediaUrl } from "./bootstrap/integrations.js";
import "./cafe.css";


const WORLD_SPEC_URL = publicUrl("data/world-spec.json");
const activeWorld = worldFromLocation();
const isHallWorld = activeWorld.id === "hall";
const isCafeWorld = activeWorld.id === "cafe";
const isFieldWorld = activeWorld.id === "field";
const activeSceneVariant = isHallWorld
  ? sceneVariantFromLocation()
  : isCafeWorld
    ? cafeSceneVariantFromLocation()
    : null;
const activeCharacterVariant = characterVariantFromLocation();
const canonicalUrl = new URL(window.location.href);
let replaceCanonicalUrl = false;
if ((isHallWorld || isCafeWorld) &&
  canonicalUrl.searchParams.has("scene") &&
  canonicalUrl.searchParams.get("scene") !== activeSceneVariant.id
) {
  canonicalUrl.searchParams.set("scene", activeSceneVariant.id);
  replaceCanonicalUrl = true;
} else if (isFieldWorld && canonicalUrl.searchParams.has("scene")) {
  canonicalUrl.searchParams.delete("scene");
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

const fieldTargetPersonId = fieldPersonFromLocation() ?? people[0].id;
const fieldTargetPerson = people.find((person) => person.id === fieldTargetPersonId) ?? people[0];
const invitedPersonId = new URLSearchParams(window.location.search).get("invite");
// 大屏只读视角（TBD-H1 已决：大屏只读）：?role=screen 或 ?groupScreen=1，
// 无本地玩家、镜头绕场环视，远端成员由 v1 房间事件流驱动
const screenUrlParams = new URLSearchParams(window.location.search);
const screenMode =
  screenUrlParams.get("role") === "screen" || screenUrlParams.get("groupScreen") === "1";
const screenRoomId = screenUrlParams.get("room");
// 大厅视觉由场景版本驱动（original=hub-town 黄昏夜集 / v1=村落集市）；场域沿用中性配置
const activeVisualProfile = isHallWorld
  ? activeSceneVariant.visualProfile
  : isFieldWorld
    ? "current"
    : activeSceneVariant.visualProfile;
const environmentAssetId = isHallWorld
  ? activeSceneVariant.environmentAssetId
  : isFieldWorld
    ? FIELD_WORLD.environmentAssetId
    : activeSceneVariant.environmentAssetId;
const isVillageMarket = environmentAssetId === VILLAGE_CAMPFIRE_LAYOUT.environmentAssetId;
const hallCafeDoor = environmentAssetId === "environment.village-market.v1"
  ? VILLAGE_MARKET_LAYOUT.cafeDoor
  : Object.freeze({ x: -4.1, z: 0.6 });
// 静态碰撞壳（边界 + 静态圆）统一从注册表取数；大厅动态摊位圆由 BoothSystem 注入
const worldShell = colliderShellFor(environmentAssetId);
const worldBounds = worldShell.bounds;
const worldTitle = isHallWorld
  ? activeSceneVariant.title
  : isCafeWorld
    ? activeSceneVariant.title
    : activeWorld.title;
const cinematicProfile = isHallWorld ? activeSceneVariant.cinematic : null;
document.body.dataset.world = activeWorld.id;

const PLAYER_MOVE_SPEED_MULTIPLIER = 1.2;
const MOVE_SPEED = 2.7 * PLAYER_MOVE_SPEED_MULTIPLIER;
const SHOW_CHARACTER_BOARDS = environmentAssetId !== "environment.village-market.v1";
const SHOW_WORLD_BROADCAST_BOARD = false;
const PLAYER_FOOT_OFFSET = 0.018;
const PLAYER_SEAT_ARRIVAL_DISTANCE = 0.06;
const LIVE_SEAT_APPROACH_DISTANCE = 0.72;
const LIVE_SEAT_ARRIVAL_DISTANCE = 0.08;
const LIVE_SEAT_EXIT_DISTANCE = 0.24;
const MODEL_FORWARD = new THREE.Vector3(0, 0, 1);
const LIVE_WALK_SPEED = 1.5;
const LIVE_BUBBLE_DURATION = 4;
const HALL_GLANCE_DURATION = 0.9;
const HALL_GLANCE_ANGLE = Math.PI / 12; // 主理人回眸幅度 15°

// 快照新人（confirm 第 7 人+）缺调色板时，按 id 哈希从六人调色板确定性取一个
const FALLBACK_PALETTES = Object.freeze(people.map((person) => person.palette));

function hashString(value) {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return hash;
}

// 运行时注入（window.__ECHOWORLD_OPTIONS__）：api / onPersonSelected / live / snapshotPollMs
const runtimeOptions = globalThis.__ECHOWORLD_OPTIONS__ ?? {};
let worldAudio = null;
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
// v1 现场房间（ROADMAP 2.H.3 升级，docs/MVP2-BACKEND.md）：WS 有序事件流 + cursor
// 重放 + 降级轮询；远端位置复用 v0 的 groupPresenceOverrides 渲染通道。
// 后端无 v1（/api/v1/scenes/modules 不可达）时面板自动隐藏，v0 GroupPlay 不受影响
const roomPanel = mountRoomPanel(document.body, {
  baseUrl: `${import.meta.env.BASE_URL}api/v1`,
  currentUser,
  screenMode,
  screenRoomId,
  getLocalPresence: () => readGroupPresence(),
  onRemotePresence: (participants, viewerId) => applyRoomPresence(participants, viewerId),
  onToast: (message) => pushLiveToast(message),
});
void roomPanel; // 句柄保留给诊断/未来场景交互层接线
// 点击世界中的小人：保留现有侧栏行为，资料包面板浮于其上（外部可用 onPersonSelected 覆盖）
const onPersonSelected =
  typeof runtimeOptions.onPersonSelected === "function"
    ? runtimeOptions.onPersonSelected
    : (personId) => {
        if (personId) integrations.panel.openPerson(personId);
      };
const liveEnabled = runtimeOptions.live !== false && !isFieldWorld;
// 用户发起的圆桌会议由真实后端承载（IF-6）：live 快照开启且后端可达（auto 探测/live）
// 且有 IF-6 方法时；其余（纯静态 mock / 注入 api）保持本地轮播台词的演示行为。
// 后端探测是异步的：先按 false 初始化，boot() 探测完成后回填并通知 appShell。
let meetingBackendLive = false;
// 咖啡厅 v1 实时房间（PersonAgent 自主交互线）：仅咖啡厅世界且未强制 mock 时启用；
// 连接失败自动回退 v0 快照世界（startRoomWorld 内处理）
const roomEnabled =
  isCafeWorld && new URLSearchParams(window.location.search).get("api") !== "mock";
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

const input = new Input(canvas);
const cameraController = new ThirdPersonCamera({
  canvas,
  fov: 48,
  aspect: 1,
  near: 0.06,
  far: cinematicProfile?.far ?? 80,
  distance: 4.8,
  pitch: 0.42,
});
const camera = cameraController.camera;
camera.position.set(6.7, 4.6, 8.2);
worldAudio = new WorldAudioSystem({
  camera,
  worldId: activeWorld.id,
  resolveUrl: publicUrl,
  onStateChange: (state) => {
    canvas.dataset.audioZone = state.zone;
    canvas.dataset.audioState = state.activeAmbient ?? (state.freeRoam ? "waiting" : "silent");
    canvas.dataset.audioUnlocked = String(state.unlocked);
    canvas.dataset.audioEffect = state.lastEffect ?? "";
    canvas.dataset.audioClickCount = String(state.effectPlayCounts.click);
    canvas.dataset.audioNotificationCount = String(state.effectPlayCounts.notification);
  },
});
void worldAudio.preload();
// Cafe bounds are walls. Outdoor worlds get a wider shell so the camera can
// orbit naturally at the edge of their walkable terrain.
const cameraBounds = isCafeWorld
  ? Object.freeze({
      ...worldBounds,
      openings: Object.freeze([
        Object.freeze({ side: "maxZ", min: -1.65, max: 1.65 }),
      ]),
    })
  : Object.freeze({
      minX: worldBounds.minX - cameraController.maxDistance,
      maxX: worldBounds.maxX + cameraController.maxDistance,
      minZ: worldBounds.minZ - cameraController.maxDistance,
      maxZ: worldBounds.maxZ + cameraController.maxDistance,
    });

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
let pointerStartedLocked = false;
const moveInput = new THREE.Vector2();
const touchInput = new THREE.Vector2();
const moveDirection = new THREE.Vector3();
const currentHeading = new THREE.Vector3(0, 0, -1);
const playerMovement = new CameraRelativeMovement({ speed: MOVE_SPEED });
const desiredCameraPosition = new THREE.Vector3();
const desiredLookTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3(0, 0.85, 0);
const projected = new THREE.Vector3();
const candidatePosition = new THREE.Vector3();
const targetQuaternion = new THREE.Quaternion();
const cinematicBasePosition = new THREE.Vector3(...(cinematicProfile?.position ?? [6.45, 4.55, 8]));
const cinematicTarget = new THREE.Vector3(...(cinematicProfile?.target ?? [0, 0.72, -0.35]));
const cinematicOrbit = cinematicProfile?.orbit ?? [0.45, 0.12, 0.34];
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
const useDemoSignals = new URLSearchParams(window.location.search).get("api") === "mock";
const personSignalStore = new PersonSignalStore(useDemoSignals ? personSignals : []);
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
let roomClient = null;
let lastRoomMoveAt = 0;
let lastRoomPosition = null;
let liveWorldTick = null;
let boothSystem = null;
let relationshipFieldSystem = null;
let relationshipField = null;
let fieldSplatWorld = null;
let worldBroadcastSystem = null;
let worldModuleRegistry = null;
let campfireEntrance = null;
let playerSeatedAt = null;
let playerSeatTarget = null;
let pendingSceneInviteId = people.some((person) => person.id === invitedPersonId)
  ? invitedPersonId
  : null;
let roomMeetingId = null;
let roomInvitationId = null;
let nearbyHotspotId = null;
let sceneHotspots = [];
const hallGlances = new Map();
const dynamicPeople = new Map();
const pendingAgentSpawns = new Set();
const pendingEntrySpawns = new Map();
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
  sceneVariants: isHallWorld
    ? SCENE_VARIANT_OPTIONS
    : isCafeWorld
      ? CAFE_SCENE_VARIANTS
      : [],
  activeSceneVariant,
  characterVariants: CHARACTER_VARIANT_OPTIONS,
  activeCharacterVariant,
  signalStore: personSignalStore,
  onViewChange: setExperienceMode,
  onSceneVariantChange: (variantId) => {
    if (variantId === activeSceneVariant?.id) return;
    if (isHallWorld) navigateToSceneVariant(variantId);
    else if (isCafeWorld) navigateToCafeSceneVariant(variantId);
  },
  onCharacterVariantChange: (variantId) => {
    if (variantId !== activeCharacterVariant.id) navigateToCharacterVariant(variantId);
  },
  onLocatePerson: (person) => selectWorldPerson(person.id),
  onMeetingStart: startMeeting,
  onMeetingEnd: endMeeting,
  onNotification: () => worldAudio?.playNotification(),
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

async function hydratePersonSignal(personId) {
  try {
    const snapshot = await api.getPersonSignal(personId);
    if (snapshot) personSignalStore.upsert(snapshot, { source: "k3-rest" });
  } catch (error) {
    console.warn(`[EchoWorld] ${personId} 的生理聚合暂不可用`, error);
  }
}

if (!useDemoSignals) {
  for (const person of people) void hydratePersonSignal(person.id);
}

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


function entryScatterCenter() {
  const center = {
    x: (worldBounds.minX + worldBounds.maxX) * 0.5,
    z: (worldBounds.minZ + worldBounds.maxZ) * 0.5,
  };
  if (isCafeWorld) center.z = 2.35;
  return center;
}


function currentCharacterOccupancy() {
  const occupied = (characterSystem?.entities ?? []).map((entity) => ({
    x: entity.root.position.x,
    z: entity.root.position.z,
    radius: entity.collider?.radius ?? DEFAULT_CHARACTER_COLLIDER.radius,
  }));
  for (const spawn of pendingEntrySpawns.values()) {
    occupied.push({
      x: spawn.x,
      z: spawn.z,
      radius: DEFAULT_CHARACTER_COLLIDER.radius,
    });
  }
  return occupied;
}


function allocateEntrySpawns(count, occupied = []) {
  return createEntrySpawnScatter({
    count,
    bounds: worldBounds,
    blockers: currentBlockers(),
    occupied,
    surfaceHeightAt,
    center: entryScatterCenter(),
    characterRadius: DEFAULT_CHARACTER_COLLIDER.radius,
    clearance: 0.12,
    minSeparation: 0.76,
    maxRadius: isCafeWorld ? 2.35 : (isFieldWorld ? 1.8 : 3),
  });
}


function characterSpec(person, instanceId, spawn, idleBob = 0.005) {
  const avatar = person.avatar && typeof person.avatar === "object" ? person.avatar : {};
  return {
    instance_id: instanceId,
    person_id: person.id,
    asset_id: characterAssetId(activeCharacterVariant, person.id),
    fallback_asset_id: activeCharacterVariant.fallbackAssetId,
    asset_url: avatar.model_ref ? resolveMediaUrl(avatar.model_ref) : null,
    texture_url: avatar.texture_ref ? resolveMediaUrl(avatar.texture_ref) : null,
    expression_refs: Object.fromEntries(
      Object.entries(avatar.expression_refs ?? {}).map(([state, ref]) => [
        state,
        resolveMediaUrl(ref),
      ]),
    ),
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


function actorAt(entity, x, z, yaw) {
  const groundY = surfaceHeightAt(x, z);
  if (groundY === null) throw new Error(`人物坐标超出咖啡厅地面：${x}, ${z}`);
  entity.root.position.set(x, groundY, z);
  entity.root.rotation.set(0, yaw, 0);
  entity.baseY = groundY;
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
  const visiblePeople = isFieldWorld ? [fieldTargetPerson] : people;
  const entrySpawns = isFieldWorld
    ? [
        // splat 场域：出生点落在高程图实测的可行走面上（无 splat 时用契约出生点）
        fieldSplatWorld?.spawnHint ?? FIELD_WORLD.playerSpawn,
        relationshipField?.scene?.companion ?? { x: 0, z: -1.1, yaw: 0 },
      ]
    : allocateEntrySpawns(visiblePeople.length + 1);
  playerEntity = await characterSystem.spawn(
    characterSpec(currentUser, "self-player", entrySpawns[0], 0),
  );
  player = playerEntity.root;
  playerGroundY = player.position.y;
  currentHeading.copy(MODEL_FORWARD).applyQuaternion(player.quaternion).setY(0).normalize();
  syncPlayerHeading(currentHeading);
  expressionSystem.register(playerEntity, currentUser.id, activeCharacterVariant.id);

  npcSystem = new NpcAgentSystem({
    people: visiblePeople,
    resolveMovement: ({ agent, entity, stepX, stepZ, targetX, targetZ }) =>
      resolveCharacterMovement(entity, stepX, stepZ, {
        targetX,
        targetZ,
        approachRadius: LIVE_SEAT_APPROACH_DISTANCE,
        targetApproach: true,
        targetBlockerId: agent.tableId,
      }),
    onConversation: (event) => {
      appShell.showNpcConversation(event);
      characterSystem.playAction(event.speakerId, CHARACTER_ACTIONS.TALK, {
        durationMs: event.duration * 1000,
      });
    },
    onStateChange: (state) => {
      appShell.updateAgentState(state);
      characterSystem.setState(npcSystem?.getEntity(state.personId), state.status, {
        seated: state.status === "seated" || state.status === "in-meeting",
      });
    },
  });

  for (let index = 0; index < visiblePeople.length; index += 1) {
    setProgress(0.76 + index * 0.03, `正在载入 ${visiblePeople[index].name} 的人物模型`);
    const entity = await characterSystem.spawn(
      characterSpec(
        visiblePeople[index],
        `agent-${visiblePeople[index].id}`,
        entrySpawns[index + 1],
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
  canvas.dataset.entrySpawnPositions = entrySpawns
    .map((spawn) => `${spawn.x.toFixed(3)},${spawn.z.toFixed(3)}`)
    .join("|");
  updatePlayerMarker();
}


async function configureWorld(root) {
  environmentRoot = root;
  if (!isFieldWorld) adaptSceneMaterials(root, activeVisualProfile);
  scene.add(root);
  root.updateMatrixWorld(true);

  root.traverse((object) => {
    if (!object.isMesh) return;
    if (object.name.startsWith("SPLAT_")) return; // Spark splat 自着色，不参与阴影/envMap
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
  worldBroadcastSystem = new WorldBroadcastSystem({
    scene,
    api,
    world: activeWorld.id,
    showBoard: SHOW_WORLD_BROADCAST_BOARD,
  });
  worldBroadcastSystem.mount();
  canvas.dataset.broadcastBoardVisible = String(Boolean(worldBroadcastSystem.mesh));
  worldReady = true;
  syncControlAvailability();
  canvas.dataset.ready = "true";
  canvas.dataset.characterCount = String(characterSystem.entities.length);
  canvas.dataset.npcCount = String(npcSystem.agents.size);
  canvas.dataset.environment = environmentAssetId;
  canvas.dataset.sceneVariant = activeSceneVariant?.id ?? "field";
  canvas.dataset.campfireMounted = String(Boolean(campfireEntrance?.root));
  canvas.dataset.campfirePosition = `${VILLAGE_CAMPFIRE_LAYOUT.position.x.toFixed(2)},${VILLAGE_CAMPFIRE_LAYOUT.position.z.toFixed(2)}`;
  canvas.dataset.campfireSize = campfireEntrance?.size
    ? [campfireEntrance.size.x, campfireEntrance.size.y, campfireEntrance.size.z]
      .map((value) => value.toFixed(3))
      .join(",")
    : "";
  setProgress(1, `${worldTitle} 已准备好`);
  appShell.setWorldReady(true);
  startLiveWorld();
  // 咖啡厅 v1 实时房间（PersonAgent 自主线）：启用时接管世界驱动，失败自动回退 v0
  void startRoomWorld();
  if (screenMode) {
    // 大屏只读：跳过标题页直接进场，隐藏本地玩家与触屏控件（远端成员由 v1 事件流驱动）
    appShell.setView("cafe");
    if (player) player.visible = false;
    if (playerMarker) playerMarker.visible = false;
    document.body.classList.add("screen-mode");
    canvas.dataset.screenMode = "true";
  }
  requestAnimationFrame(() => loading.classList.add("is-hidden"));
}


function setExperienceMode(mode) {
  experienceMode = mode;
  canvas.dataset.appView = mode;
  resetPlayerInput();
  if (mode !== "cafe") characterSystem?.setActivity(playerEntity);
  if (playerMarker) playerMarker.visible = mode === "cafe" && !meetingMode;
  if (mode !== "cafe") playerLabel.style.opacity = "0";
  tickBadge.style.display = mode === "cafe" && !isFieldWorld ? "flex" : "none";
  heartSignalSystem.setVisible(mode === "cafe" && !isFieldWorld);
  if (mode === "cafe") {
    canvas.focus({ preventScroll: true });
    if (player) {
      cameraController.snapTo(player.position, {
        groundHeightAt: surfaceHeightAt,
        blockers: currentBlockers(),
        bounds: cameraBounds,
      });
    }
  }
  syncControlAvailability();
}


function resetPlayerInput() {
  input.reset();
  touchInput.set(0, 0);
  touchKnob.style.transform = "translate(0, 0)";
}


function syncPlayerHeading(direction) {
  currentHeading.copy(direction).setY(0);
  if (currentHeading.lengthSq() < 1e-6) currentHeading.set(0, 0, -1);
  currentHeading.normalize();
  playerMovement.reset(currentHeading);
  cameraController.setYawFromHeading(currentHeading);
}


function hasBlockingWorldUi() {
  const integrationIsOpen = (surface) => {
    const openState = surface?.isOpen;
    return typeof openState === "function"
      ? Boolean(openState.call(surface))
      : Boolean(openState);
  };
  return Boolean(
    sceneInteraction?.isOpen ||
    appShell?.isMeetingSheetOpen ||
    integrationIsOpen(integrations.panel) ||
    integrationIsOpen(integrations.flow) ||
    integrationIsOpen(integrations.onboardingFlow) ||
    integrationIsOpen(integrations.groupPlay),
  );
}


function syncControlAvailability() {
  const uiBlocked = hasBlockingWorldUi();
  worldAudio?.setFreeRoamActive(experienceMode === "cafe" && !uiBlocked);
  const freeCamera = (
    worldReady &&
    experienceMode === "cafe" &&
    !meetingMode &&
    !playerSeatedAt &&
    !playerSeatTarget &&
    !uiBlocked
  );
  input.setPointerLockEnabled(freeCamera);
  cameraController.setEnabled(freeCamera);
}


function selectWorldPerson(personId) {
  const person = personLikeFor(personId);
  selectedPersonId = person?.id ?? null;
  appShell.selectWorldPerson(selectedPersonId);
  canvas.dataset.selectedPerson = selectedPersonId ?? "";
  onPersonSelected(selectedPersonId);
  syncControlAvailability();
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


function seatedAnimationComplete(entity) {
  const animation = entity?.animation;
  return !animation || (
    animation.posture === "seated" &&
    animation.currentRole !== CHARACTER_ACTIONS.SIT_DOWN
  );
}


function meetingActorsReady(personIds) {
  if (
    playerSeatTarget ||
    playerSeatedAt !== CAFE_LAYOUT.roundtable.id ||
    !seatedAnimationComplete(playerEntity)
  ) return false;

  return personIds.every((personId) => {
    const entity = npcSystem.getEntity(personId);
    if (!entity || !seatedAnimationComplete(entity)) return false;
    if (liveEnabled) {
      const target = liveMeetingOverrides.get(personId);
      return Boolean(
        target &&
        entity.root.userData.characterSeatKey === liveSeatKey(target),
      );
    }
    const state = npcSystem.getState(personId);
    return state?.status === "in-meeting" && state.tableId === CAFE_LAYOUT.roundtable.id;
  });
}


function waitForMeetingActors(personIds, timeoutMs = 15000) {
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (!meetingMode) {
        reject(new Error("Meeting was cancelled before everyone was seated"));
        return;
      }
      if (meetingActorsReady(personIds)) {
        resolve();
        return;
      }
      if (performance.now() - startedAt >= timeoutMs) {
        reject(new Error("Timed out while waiting for meeting participants to sit"));
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}


async function startMeeting(personIds, topic = null) {
  if (!worldReady || meetingMode) return [];
  leavePlayerSeat();
  let accepted = [];
  if (roomClient) {
    // v1 实时房间（咖啡厅 PersonAgent 线）：会议走房间命令，PersonAgent 自主应邀入座
    accepted = [...new Set(personIds)]
      .filter((personId) => roomClient.snapshot?.members?.some((m) => m.member_id === personId))
      .slice(0, 5);
    if (!accepted.length) return [];
    const invitationId = `invite-${Date.now()}`;
    roomInvitationId = invitationId;
    const seatPositions = CAFE_LAYOUT.roundtable.seats;
    await roomClient.move(seatPositions[0].x, seatPositions[0].z);
    await roomClient.send("meeting.invite", {
      hotspot_id: "roundtable", invitation_id: invitationId,
      participant_ids: accepted, topic: topic ?? "最近有什么新变化？",
    });
    roomMeetingId = `meeting-${Date.now()}`;
    await roomClient.send("meeting.start", {
      invitation_id: invitationId, meeting_id: roomMeetingId,
    });
  } else if (meetingBackendLive) {
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
  beginPlayerSeatApproach(CAFE_LAYOUT.roundtable.id, playerSeat);
  canvas.dataset.meetingActive = "true";
  canvas.dataset.meetingReady = "false";
  canvas.dataset.meetingInvited = accepted.join(",");
  await recordWorldEvent(
    "meeting-started",
    `你邀请${accepted.map(nameOf).join("、")}在中央圆桌坐下`,
    accepted,
    { table_id: CAFE_LAYOUT.roundtable.id },
  );
  try {
    await waitForMeetingActors(accepted);
  } catch (error) {
    if (meetingMode) await endMeeting();
    throw error;
  }
  canvas.dataset.meetingReady = "true";
  return accepted;
}


// 会议本地状态的统一拆除（玩家离席/后端散场共用）：人物起身、覆盖与标志复位
function teardownMeetingLocalState() {
  meetingMode = false;
  if (roomClient && roomMeetingId) {
    // 同步拆除函数里不等待：散场命令后台发出，失败仅告警
    void roomClient.send("meeting.end", { meeting_id: roomMeetingId }).catch((error) => {
      console.warn("[EchoWorld] v1 meeting end failed", error);
    });
    roomMeetingId = null;
    roomInvitationId = null;
  }
  playerSeatTarget = null;
  playerSeatedAt = null;
  canvas.dataset.playerSeatTarget = "";
  canvas.dataset.playerSeatedAt = "";
  player.scale.set(1, 1, 1);
  playerMarker.visible = experienceMode === "cafe";
  playerEntity.spec.behavior.idle_bob = 0;
  actorAt(playerEntity, 0, 3.12, Math.PI);
  characterSystem.setActivity(playerEntity);
  playerGroundY = playerEntity.baseY;
  updatePlayerMarker();
  syncPlayerHeading(new THREE.Vector3(0, 0, -1));
  cameraController.snapTo(player.position, {
    groundHeightAt: surfaceHeightAt,
    blockers: currentBlockers(),
    bounds: cameraBounds,
  });
  syncControlAvailability();
  if (liveEnabled) {
    liveMeetingOverrides.clear();
  } else {
    npcSystem.endMeeting();
  }
  liveMeetingSeatIndices = [];
  liveMeetingId = null;
  canvas.dataset.meetingActive = "false";
  canvas.dataset.meetingReady = "false";
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


async function sendMeetingMessage(personId, text) {
  if (!roomClient) {
    // v0 后端会议：玩家发言注入下一轮会议 prompt（回复经快照事件流回显）
    if (meetingBackendLive) {
      await api.postMeetingMessage(text);
      return null;
    }
    const person = people.find((item) => item.id === personId);
    const replies = person?.conversation?.replies ?? [];
    if (!replies.length) return null;
    return { personId, text: replies[hashString(text) % replies.length] };
  }
  const response = await roomClient.message(personId, text);
  const event = [...(response.events ?? [])].reverse().find((item) => item.type === "person.message-created");
  if (!event) return null;
  return {
    personId: event.payload?.speaker_id ?? personId,
    text: event.payload?.text ?? "",
  };
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
    sceneHotspots = (relationshipFieldSystem?.hotspots ?? []).map((hotspot) => ({
      ...hotspot,
      icon: hotspot.kind === "memory"
        ? "book-open"
        : hotspot.kind === "thread"
          ? "message-circle"
          : hotspot.kind === "echo"
            ? "landmark"
            : "sparkles",
      actions: [{
        id: "touch-field",
        label: hotspot.prompt,
        description: "这次触发会成为一条新的世界事件",
        icon: hotspot.kind === "memory" ? "book-open" : "sparkles",
      }],
    }));
    return;
  }

  if (isHallWorld) {
    const cafeModule = worldModuleRegistry?.byId("venue.cafe.v1");
    sceneHotspots = [
      {
        id: "hall-cafe-door",
        kind: "venue",
        x: hallCafeDoor.x,
        z: hallCafeDoor.z,
        radius: cafeModule?.interaction?.radius ?? 1.9,
        eyebrow: "广场西侧的室内空间",
        title: cafeModule?.label ?? "Echo Cafe",
        detail: "咖啡厅适合熟人之间的一对一交流。进去坐下、邀请某个人，或在圆桌开启一次讨论。",
        prompt: cafeModule?.interaction?.verb ?? "进入咖啡厅",
        icon: "door-open",
        actions: [{ id: "enter-cafe", label: "推门进入", description: "前往熟人交流空间", icon: "door-open" }],
      },
      {
        id: "hall-campfire",
        kind: "campfire",
        x: VILLAGE_CAMPFIRE_LAYOUT.position.x,
        z: VILLAGE_CAMPFIRE_LAYOUT.position.z,
        radius: isVillageMarket ? VILLAGE_CAMPFIRE_LAYOUT.interactionRadius : 2.55,
        eyebrow: isVillageMarket ? "篝火 · 现场联机入口" : "篝火广场 · 多人社交",
        title: isVillageMarket ? "现场一起玩" : "篝火边的位置还空着",
        detail: isVillageMarket
          ? "靠近篝火按 E，创建或加入现场房间，和同行的人一起开始游戏。"
          : playerSeatedAt === "campfire"
            ? "联机入口已经打开：创建或加入现场房间，和同行的人坐到一起。"
            : "篝火是现场联机的入口。坐下来，创建或加入一个现场房间，和同行的人围炉相聚。",
        prompt: isVillageMarket
          ? "进入现场一起玩"
          : playerSeatedAt === "campfire"
            ? "篝火边（联机中）"
            : "在篝火边坐下（联机入口）",
        icon: "users",
        directActionId: isVillageMarket ? "enter-group-play" : null,
        actions: isVillageMarket
          ? [{ id: "enter-group-play", label: "进入现场一起玩", description: "创建或加入现场房间", icon: "users" }]
          : playerSeatedAt === "campfire"
            ? [{ id: "leave-fire", label: "起身离开", description: "退出联机入口，回到自己的世界", icon: "door-open" }]
            : [{ id: "sit-by-fire", label: "围炉坐下", description: "打开现场联机入口", icon: "users" }],
      },
    ];
    for (const record of boothSystem?.booths.values() ?? []) {
      sceneHotspots.push({
        id: `booth-${record.personId}`,
        kind: "booth",
        x: record.position.x,
        z: record.position.z,
        radius: boothInteractionRadius(
          record.position.blockerRadius,
          DEFAULT_CHARACTER_COLLIDER.radius,
        ),
        personId: record.personId,
        eyebrow: "人 ↔ 共同课题 ↔ 人",
        title: `${record.displayName ?? nameOf(record.personId)}的摊位`,
        detail: record.displayHeadline || "从这个摊位的照片、作品和共同经历出发，看看你们之间还有什么值得继续。",
        prompt: `看看${record.displayName ?? nameOf(record.personId)}的摊位`,
        icon: "store",
        actions: [
          { id: "chat-person", label: "和 TA 聊聊", description: "与 TA 的数字分身对话（基于授权信息）", icon: "message-circle" },
          { id: "open-package", label: "翻开资料包", description: "回到相遇事实与现场记录", icon: "eye" },
          { id: "enter-field", label: "进入关系场域", description: "看看这段关系被转译成怎样的空间", icon: "sparkles" },
          { id: "invite-cafe", label: "约到咖啡厅继续聊", description: "把邀请带到熟人交流空间", icon: "coffee" },
        ],
      });
    }
    return;
  }

  const tableHotspots = CAFE_LAYOUT.npcTables.map((table) => ({
    id: `cafe-table-${table.id}`,
    kind: "table",
    tableId: table.id,
    x: table.center.x,
    z: table.center.z,
    radius: table.capacity === 2 ? 1.9 : 2.05,
    eyebrow: "两个人之间的直接交流",
    title: table.label,
    detail: "坐下来后，可以邀请一位熟人、点一杯饮品，或从桌边调取一段共同记忆。",
    prompt: playerSeatedAt === table.id ? "看看桌边还能做什么" : `在${table.label}坐下`,
    icon: "coffee",
    actions: playerSeatedAt === table.id
      ? [
          { id: "invite-table", label: "邀请一位熟人", description: "选择这次想一起坐下的人", icon: "users" },
          { id: "recall-memory", label: "调取共同记忆", description: "从资料包中找回第一次相遇", icon: "book-open" },
          { id: "leave-seat", label: "起身离开", icon: "door-open" },
        ]
      : [{ id: "sit-at-table", label: "坐到桌边", description: "进入这张桌子的情境菜单", icon: "coffee" }],
  }));
  sceneHotspots = [
    {
      id: "cafe-exit-door",
      kind: "exit",
      x: 0,
      z: 4.3,
      radius: 1.6,
      eyebrow: "回到室外",
      title: "推开木门回到集市",
      detail: "回到篝火广场与市集街道，去看看摊位和现场房间。",
      prompt: "回到集市",
      icon: "door-open",
      actions: [{ id: "exit-cafe", label: "回到集市", description: "返回小镇广场", icon: "door-open" }],
    },
    {
      id: "cafe-roundtable",
      kind: "roundtable",
      x: CAFE_LAYOUT.roundtable.center.x,
      z: CAFE_LAYOUT.roundtable.center.z,
      radius: CAFE_LAYOUT.roundtable.interactionRadius,
      eyebrow: "中央六人圆桌",
      title: pendingSceneInviteId ? `邀请${nameOf(pendingSceneInviteId)}入座` : "发起一次圆桌会议",
      detail: pendingSceneInviteId
        ? `你从集市带来了给${nameOf(pendingSceneInviteId)}的邀请。还可以继续邀请其他人。`
        : "围绕最近的变化、下一步或共同记忆，邀请最多五个人一起坐下。",
      prompt: pendingSceneInviteId ? `带${nameOf(pendingSceneInviteId)}加入圆桌` : "发起圆桌会议",
      icon: "users",
      actions: [{ id: "open-meeting", label: "选择入座的人", description: "邀请后会议会写入今日播报", icon: "users" }],
    },
    {
      id: "cafe-bar",
      kind: "bar",
      x: 1.65,
      z: 3.15,
      radius: 1.8,
      eyebrow: "Echo Cafe 吧台",
      title: "今天想和谁喝一杯？",
      detail: "吧台不是装饰：点饮品、发出邀请，都会成为世界里可恢复的事件。",
      prompt: "在吧台点单或邀请熟人",
      icon: "coffee",
      actions: [
        { id: "order-coffee", label: "点一杯今日手冲", description: "给今天的世界留一个安静节点", icon: "coffee" },
        { id: "invite-coffee", label: "邀请一位熟人", description: "选择想一起喝咖啡的人", icon: "users" },
        { id: "recall-memory", label: "翻开一段共同记忆", icon: "book-open" },
      ],
    },
    {
      id: "cafe-broadcast",
      kind: "broadcast",
      x: 1.2,
      z: -3.65,
      radius: 1.65,
      eyebrow: "世界事件不是背景动画",
      title: "今日播报屏",
      detail: "这里滚动显示最近发生的邀请、圆桌、场域访问和共同记忆触发。",
      prompt: "查看今日世界事件",
      icon: "message-circle",
      actions: [{ id: "read-brief", label: "展开今日播报", icon: "message-circle" }],
    },
    ...tableHotspots,
  ];
  if (!SHOW_WORLD_BROADCAST_BOARD) {
    sceneHotspots = sceneHotspots.filter((hotspot) => hotspot.kind !== "broadcast");
  }
}


function nearestSceneHotspot() {
  if (!worldReady || experienceMode !== "cafe" || meetingMode || !player) return null;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const hotspot of sceneHotspots) {
    if (hotspot.kind === "person" && hotspot.personId) {
      const entity = npcSystem?.getEntity(hotspot.personId);
      if (entity) {
        hotspot.x = entity.root.position.x;
        hotspot.z = entity.root.position.z;
      }
    }
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
    id: `invite-person:${person.id}`,
    label: person.name,
    description: `${person.relation} · ${person.tags.slice(0, 2).join(" · ")}`,
    icon: "users",
  }));
}


function finishPlayerSeatApproach() {
  const target = playerSeatTarget;
  if (!target) return false;
  playerSeatTarget = null;
  actorAt(playerEntity, target.x, target.z, target.yaw);
  playerGroundY = playerEntity.baseY;
  playerEntity.spec.behavior.idle_bob = 0;
  playerMarker.visible = false;
  syncPlayerHeading(new THREE.Vector3(Math.sin(target.yaw), 0, Math.cos(target.yaw)));
  playerSeatedAt = target.id;
  canvas.dataset.playerSeatTarget = "";
  canvas.dataset.playerSeatedAt = target.id;
  characterSystem.setActivity(playerEntity, { seated: true });
  rebuildSceneHotspots();
  syncControlAvailability();
  return true;
}


function beginPlayerSeatApproach(id, seat) {
  if (!playerEntity || !seat) return false;
  playerSeatTarget = {
    id,
    x: seat.x,
    z: seat.z,
    yaw: seat.yaw,
  };
  playerSeatedAt = null;
  canvas.dataset.playerSeatedAt = "";
  canvas.dataset.playerSeatTarget = id;
  playerEntity.spec.behavior.idle_bob = 0;
  playerMarker.visible = experienceMode === "cafe";
  resetPlayerInput();
  syncControlAvailability();
  characterSystem.setActivity(playerEntity);
  const distance = Math.hypot(seat.x - player.position.x, seat.z - player.position.z);
  if (distance <= PLAYER_SEAT_ARRIVAL_DISTANCE) finishPlayerSeatApproach();
  return true;
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
  return beginPlayerSeatApproach(tableId, seat);
}


// 篝火木凳（与 build_hub_town.py FIRE_Stool 布局一致）：5 个树桩围火
const CAMPFIRE_CENTER = Object.freeze({
  x: VILLAGE_CAMPFIRE_LAYOUT.position.x,
  z: VILLAGE_CAMPFIRE_LAYOUT.position.z,
});
const CAMPFIRE_STOOLS = Object.freeze(
  Array.from({ length: 5 }, (_, index) => {
    const angle = (index / 5) * Math.PI * 2 + 0.35;
    return Object.freeze({
      x: CAMPFIRE_CENTER.x + Math.cos(angle) * 1.75,
      z: CAMPFIRE_CENTER.z + Math.sin(angle) * 1.75,
    });
  }),
);


function sitPlayerAtCampfire() {
  if (meetingMode || !player) return false;
  // 选离玩家最近的空木凳坐下，面向篝火
  let stool = CAMPFIRE_STOOLS[0];
  let best = Infinity;
  for (const candidate of CAMPFIRE_STOOLS) {
    const distance = Math.hypot(player.position.x - candidate.x, player.position.z - candidate.z);
    if (distance < best) {
      best = distance;
      stool = candidate;
    }
  }
  const yaw = Math.atan2(CAMPFIRE_CENTER.x - stool.x, CAMPFIRE_CENTER.z - stool.z);
  return beginPlayerSeatApproach("campfire", { ...stool, yaw });
}


function leavePlayerSeat() {
  if (!playerSeatedAt && !playerSeatTarget) return false;
  const x = player.position.x;
  const z = player.position.z;
  const yaw = Math.atan2(currentHeading.x, currentHeading.z);
  playerSeatTarget = null;
  actorAt(playerEntity, x, z, yaw);
  syncPlayerHeading(currentHeading);
  playerGroundY = playerEntity.baseY;
  playerEntity.spec.behavior.idle_bob = 0;
  playerMarker.visible = experienceMode === "cafe";
  playerSeatedAt = null;
  canvas.dataset.playerSeatTarget = "";
  canvas.dataset.playerSeatedAt = "";
  characterSystem.setActivity(playerEntity);
  rebuildSceneHotspots();
  syncControlAvailability();
  return true;
}


async function handleSceneInteraction(hotspot, actionId) {
  if (actionId === "enter-cafe") {
    navigateToWorld("cafe");
    return { close: true };
  }
  // v1 房间模式下的快捷开场白（conversation.starters 一键发给 PersonAgent）
  if (actionId.startsWith("message-person:")) {
    const [, personId, rawIndex] = actionId.split(":");
    const person = personLikeFor(personId);
    const text = person?.conversation.starters[Number(rawIndex)];
    if (!roomClient || !person || !text) {
      return { eyebrow: "暂时无法连接", title: "实时房间尚未就绪", detail: "请稍后再试。", icon: "message-circle", actions: [] };
    }
    await roomClient.message(personId, text);
    showLiveTalk(currentUser.id, text, 4);
    return { close: true };
  }
  if (actionId === "chat-person") {
    // 点按看资料、E 直接开聊：资料包面板定位到「和 TA 聊聊」
    void integrations.panel.openPerson(hotspot.personId, { focusChat: true });
    return { close: true };
  }
  if (actionId === "exit-cafe") {
    navigateToWorld("hall");
    return { close: true };
  }
  if (actionId === "enter-group-play") {
    integrations.groupPlay?.open();
    void recordWorldEvent("campfire-joined", "你靠近草地中央的篝火，打开了现场一起玩", []);
    return { close: true };
  }
  if (actionId === "sit-by-fire") {
    sitPlayerAtCampfire();
    integrations.groupPlay?.open();
    void recordWorldEvent("campfire-joined", "你在篝火边坐下，打开了现场联机入口", []);
    return {
        eyebrow: "篝火广场 · 多人社交",
        title: "你在篝火边坐下了",
        detail: "联机入口已打开：创建或加入现场房间，和同行的人围炉相聚。E 起身离开。",
        icon: "users",
      actions: [],
    };
  }
  if (actionId === "leave-fire") {
    leavePlayerSeat();
    integrations.groupPlay?.close();
    void recordWorldEvent("campfire-left", "你从篝火边起身，回到了自己的世界", []);
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
        eyebrow: "吧台",
        title: "一杯今日手冲",
        detail: "这个安静的停顿已留在今日播报里。",
        icon: "coffee",
      actions: [],
    };
  }
  if (actionId === "invite-coffee" || actionId === "invite-table") {
    return {
      eyebrow: hotspot.title,
      title: "邀请谁过来？",
      detail: "选定后 TA 会在中央圆桌等你；走到圆桌按 E 就能开成一场会议。",
      icon: "users",
      actions: inviteActions(),
    };
  }
  if (actionId.startsWith("invite-person:")) {
    const personId = actionId.slice("invite-person:".length);
    pendingSceneInviteId = personId;
    await recordWorldEvent("invitation-sent", `你邀请${nameOf(personId)}在咖啡厅坐下`, [personId]);
    rebuildSceneHotspots();
    return {
        eyebrow: "邀请已送达",
        title: `${nameOf(personId)}会在圆桌等你`,
        detail: "走到中央圆桌，按 E 就能把这次邀请变成一场会议。",
        icon: "users",
      actions: [],
    };
  }
  if (actionId === "sit-at-table") {
    if (!sitPlayerAt(hotspot.tableId)) {
      return {
          eyebrow: hotspot.title,
          title: "这张桌子已经坐满了",
          detail: "换一张还有空位的桌子，或去中央圆桌发起会议。",
          icon: "coffee",
      actions: [],
    };
    }
    // 氛围动作去按钮化：坐下即点单（表情 + 事件 + toast，无菜单项）
    void setCharacterExpression(currentUser.id, "happy", { source: "scene-interaction" });
    void recordWorldEvent("coffee-shared", `你在${hotspot.title}坐下，点了一杯饮品`, []);
    return {
        eyebrow: hotspot.title,
        title: "你在桌边坐下了",
        detail: "E 起身 · F 邀请熟人过来坐。",
        icon: "coffee",
      actions: [],
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
        eyebrow: `${brief.event_count} 条近期世界事件`,
        title: brief.headline,
        detail: brief.summary,
        icon: "message-circle",
      actions: [],
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
        eyebrow: relationshipField?.scene?.title ?? "关系场域",
        title: hotspot.title,
        detail: hotspot.detail,
        icon: hotspot.icon,
      actions: [],
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
  void worldAudio?.playNotification();
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
  room: { color: "#7fe0a8", label: "v1 房间事件" },
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
        : (liveWorld?.source === "live" ? [] : buildFallbackBooths(people, environmentAssetId));
    canvas.dataset.boothCount = String(boothSystem.sync(booths));
    canvas.dataset.boothReadablePanelCount = String(boothSystem.readablePanelCount);
    rebuildSceneHotspots();
  }

  if (isCafeWorld && roomClient?.snapshot) {
    applyRoomSnapshot(roomClient.snapshot);
    return;
  }

  for (const agent of adapted.agents) {
    if (agent.id === currentUser.id || liveMeetingOverrides.has(agent.id)) continue;
    const entity = npcSystem?.getEntity(agent.id);
    if (!entity) {
      if (!isHallWorld && agent.position) {
        liveTargets.set(agent.id, {
          x: agent.seat?.x ?? agent.position.x,
          z: agent.seat?.z ?? agent.position.z,
          yaw: agent.seat?.yaw ?? agent.position.yaw,
          state: agent.state,
          seat: agent.seat,
        });
      }
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
        // Backend positions may be booth centers; the visual anchor keeps the capsule in front.
        const anchor = boothSystem?.personAnchorFor(
          agent.id,
          DEFAULT_CHARACTER_COLLIDER.radius,
        ) ?? agent.position;
        if (anchor) {
          liveTargets.set(agent.id, {
            x: anchor.x,
            z: anchor.z,
            yaw: anchor.yaw ?? 0,
            state: "at-booth",
            animationState: agent.state,
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
    characterSystem.playAction(event.agentId, CHARACTER_ACTIONS.TALK, {
      durationMs: LIVE_BUBBLE_DURATION * 1000,
    });
    pushLiveToast(`${nameOf(event.agentId)} 和 ${nameOf(event.toAgentId)} 聊了起来`);
    return;
  }
  if (event.type === "animation-cue") {
    if (!event.agentId || !event.action) return;
    const applied = characterSystem.playAction(event.agentId, event.action, {
      durationMs: event.durationMs,
    });
    canvas.dataset.lastCharacterAction = `${event.agentId}:${event.action}:${applied}`;
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


function liveSeatKey(target) {
  const tableId = target.seat?.tableId;
  const seatIndex = target.seat?.seatIndex;
  if (tableId && Number.isInteger(seatIndex)) return `${tableId}:${seatIndex}`;
  if (!["seated", "talking", "in-meeting"].includes(target.state)) return null;
  return `position:${target.x.toFixed(1)}:${target.z.toFixed(1)}`;
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
      const dx = target.x - root.position.x;
      const dz = target.z - root.position.z;
      const distance = Math.hypot(dx, dz);
      const stepLength = Math.min(distance, LIVE_WALK_SPEED * delta);
      const [stepX, stepZ] = distance > 1e-5
        ? resolveCharacterMovement(
            entity,
            (dx / distance) * stepLength,
            (dz / distance) * stepLength,
            {
              targetX: target.x,
              targetZ: target.z,
              approachRadius: LIVE_SEAT_APPROACH_DISTANCE,
              targetApproach: true,
              targetBlockerId: boothSystem?.boothForPerson(personId)?.id ?? null,
            },
          )
        : [0, 0];
      root.position.x += stepX;
      root.position.z += stepZ;
      entity.collider?.sync(entity);
      entity.spec.behavior.idle_bob = 0.01;
      const actualStep = Math.hypot(stepX, stepZ);
      let facingYaw = target.yaw;
      if (actualStep > 1e-5) {
        liveFacing.set(stepX / actualStep, 0, stepZ / actualStep);
      } else if (distance > 0.05) {
        liveFacing.set(dx / distance, 0, dz / distance);
      } else {
        const playerDistance = player
          ? Math.hypot(player.position.x - root.position.x, player.position.z - root.position.z)
          : Infinity;
        if (playerDistance < 2.5) {
          facingYaw = Math.atan2(player.position.x - root.position.x, player.position.z - root.position.z);
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
      }
      targetQuaternion.setFromUnitVectors(MODEL_FORWARD, liveFacing);
      root.quaternion.slerp(targetQuaternion, 1 - Math.exp(-10 * delta));
      root.scale.y += (1 - root.scale.y) * (1 - Math.exp(-7 * delta));
      entity.baseY = surfaceHeightAt(root.position.x, root.position.z) ?? entity.baseY;
      characterSystem.setActivity(entity, {
        moving: actualStep > 1e-5,
        talking: actualStep <= 1e-5 && target.animationState === "talking",
      });
      root.userData.characterSeatKey = null;
      continue;
    }
    entity.spec.behavior.idle_bob = 0;
    const dx = target.x - root.position.x;
    const dz = target.z - root.position.z;
    const distance = Math.hypot(dx, dz);
    const hasTrustedSeat = Boolean(
      target.seat?.tableId && Number.isInteger(target.seat?.seatIndex),
    );
    const targetWantsSeat = hasTrustedSeat
      && ["seated", "talking", "in-meeting"].includes(target.state);
    const targetSeatKey = liveSeatKey(target);
    const alreadySeated = entity.animation?.posture === "seated";
    const arrivalDistance = targetWantsSeat ? LIVE_SEAT_ARRIVAL_DISTANCE : 0.05;
    const holdingSeat = (
      alreadySeated &&
      targetWantsSeat &&
      targetSeatKey !== null &&
      root.userData.characterSeatKey === targetSeatKey &&
      distance <= LIVE_SEAT_EXIT_DISTANCE
    );
    const moving = !holdingSeat && distance > arrivalDistance;
    const seated = targetWantsSeat && !moving;
    let movedThisFrame = false;

    if (moving) {
      // 匀速逼近快照目标：轮询节拍之间保持连续走动，而不是脉冲式追赶
      const stepLength = Math.min(distance, LIVE_WALK_SPEED * delta);
      // The live target remains authoritative; local capsule sliding only resolves render overlap.
      const [stepX, stepZ] = resolveCharacterMovement(
        entity,
        (dx / distance) * stepLength,
        (dz / distance) * stepLength,
        {
          targetX: target.x,
          targetZ: target.z,
          approachRadius: targetWantsSeat ? LIVE_SEAT_APPROACH_DISTANCE : 0,
          targetApproach: targetWantsSeat,
          targetBlockerId: target.seat?.tableId ?? null,
        },
      );
      root.position.x += stepX;
      root.position.z += stepZ;
      entity.collider?.sync(entity);
      const actualStep = Math.hypot(stepX, stepZ);
      if (actualStep > 1e-5) {
        movedThisFrame = true;
        liveFacing.set(stepX / actualStep, 0, stepZ / actualStep);
      } else {
        liveFacing.set(Math.sin(target.yaw), 0, Math.cos(target.yaw));
      }
    } else {
      const [snapX, snapZ] = resolveCharacterMovement(
        entity,
        target.x - root.position.x,
        target.z - root.position.z,
        {
          targetX: target.x,
          targetZ: target.z,
          approachRadius: targetWantsSeat ? LIVE_SEAT_APPROACH_DISTANCE : 0,
          targetApproach: targetWantsSeat,
          targetBlockerId: target.seat?.tableId ?? null,
        },
      );
      root.position.x += snapX;
      root.position.z += snapZ;
      entity.collider?.sync(entity);
      liveFacing.set(Math.sin(target.yaw), 0, Math.cos(target.yaw));
    }
    targetQuaternion.setFromUnitVectors(MODEL_FORWARD, liveFacing);
    root.quaternion.slerp(targetQuaternion, 1 - Math.exp(-10 * delta));

    root.scale.y += (1 - root.scale.y) * (1 - Math.exp(-7 * delta));
    entity.baseY = surfaceHeightAt(root.position.x, root.position.z) ?? 0;
    characterSystem.setActivity(entity, {
      moving: movedThisFrame,
      seated,
      talking: target.state === "talking",
    });
    root.userData.characterSeatKey = seated ? targetSeatKey : null;
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
    let pkg = null;
    try {
      pkg = await api.getPackage(agent.id);
      const name = pkg?.identity?.name ?? pkg?.name;
      if (typeof name === "string" && name.trim()) packageNames.set(agent.id, name.trim());
    } catch (error) {
      console.warn(`[EchoWorld] 新人 ${agent.id} 的资料包尚不可用`, error);
    }
    const palette =
      agent.palette ?? FALLBACK_PALETTES[hashString(agent.id) % FALLBACK_PALETTES.length];
    const name = nameOf(agent.id);
    const personLike = {
      id: agent.id,
      name,
      displayName: name,
      relation: "刚搬进世界的新朋友",
      palette,
      avatar: pkg?.avatar ?? agent.avatar ?? null,
      bio: "刚从一次真实相遇进入 EchoWorld。",
      conversation: {
        starters: ["最近在做什么？", "我们上次聊到了什么？", "想去圆桌坐坐吗？"],
        replies: ["（TA 还在整理自己的故事。）"],
      },
    };
    dynamicPeople.set(agent.id, personLike);
    const [spawn] = allocateEntrySpawns(1, currentCharacterOccupancy());
    pendingEntrySpawns.set(agent.id, spawn);
    const entity = await characterSystem.spawn(
      characterSpec(personLike, `agent-${agent.id}`, spawn, 0.005),
    );
    expressionSystem.register(entity, agent.id, activeCharacterVariant.id);
    heartSignalSystem.register(
      entity,
      agent.id,
      personSignalStore.getSnapshot(agent.id),
    );
    if (!useDemoSignals) void hydratePersonSignal(agent.id);
    npcSystem.register(personLike, entity);
    if (roomClient) rebuildSceneHotspots();
    canvas.dataset.npcCount = String(npcSystem.agents.size);
    canvas.dataset.characterCount = String(characterSystem.entities.length);
  } catch (error) {
    dynamicPeople.delete(agent.id);
    console.warn(`[EchoWorld] 新人 ${agent.id} 的实体生成失败`, error);
  } finally {
    pendingEntrySpawns.delete(agent.id);
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


// v1 房间远端成员（RoomClient → 同一渲染通道）：名册里的新面孔先现场克隆实体，
// 再交给 v0 的 groupPresenceOverrides 做插值；人名写入 packageNames 供气泡/Toast 使用
function applyRoomPresence(participants, viewerId) {
  for (const participant of Array.isArray(participants) ? participants : []) {
    if (!participant?.person_id || participant.person_id === viewerId) continue;
    if (participant.display_name && !personLikeFor(participant.person_id)) {
      packageNames.set(participant.person_id, participant.display_name);
    }
    if (npcSystem && !npcSystem.getEntity(participant.person_id)) {
      void ensureAgentEntity({
        id: participant.person_id,
        position: participant.presence
          ? {
              x: participant.presence.x,
              z: participant.presence.z,
              yaw: participant.presence.yaw ?? 0,
            }
          : null,
      });
    }
  }
  applyGroupPresence(participants, viewerId);
}


function startLiveWorld({ force = false } = {}) {
  if (!liveEnabled || liveWorld) return;
  if (roomEnabled && isCafeWorld && !force) return;
  liveWorld = new LiveWorld({
    snapshotUrl: isHallWorld ? HALL_LAYOUT.snapshotUrl : CAFE_WORLD.snapshotUrl,
    intervalMs: snapshotPollMs,
    mockUrl: publicUrl("data/mock/snapshot.demo.json"),
  });
  liveWorld.onSnapshot(applyLiveSnapshot);
  liveWorld.onEvent(handleLiveEvent);
  liveWorld.start();
}


async function startRoomWorld() {
  if (!roomEnabled || roomClient) return;
  const fallbackPositions = FALLBACK_SNAPSHOT.agents.map((agent) => agent.position);
  let packageMembers = [];
  try {
    const summaries = await api.getPackages();
    packageMembers = summaries
      .filter((item) => item.confirmed && item.person_id !== currentUser.id)
      .filter((item) => !people.some((person) => person.id === item.person_id))
      .map((item, index) => ({
        id: item.person_id,
        name: item.name ?? item.person_id,
        displayName: item.name ?? item.person_id,
        position: fallbackPositions[index % fallbackPositions.length],
      }));
  } catch (error) {
    console.warn("[EchoWorld] 无法读取新增 Package，咖啡厅先载入已有成员", error);
  }
  roomClient = new RoomClient({
    actor: {
      ...currentUser,
      position: { x: player.position.x, z: player.position.z },
    },
    members: [
      ...people.map((person) => ({
        ...person,
        position: fallbackById.get(person.id) ?? { x: 0, z: 0 },
      })),
      ...packageMembers,
    ],
  });
  roomClient.onSnapshot(applyRoomSnapshot);
  roomClient.onEvent(handleRoomEvent);
  try {
    await roomClient.start();
    canvas.dataset.roomSource = "v1";
    pushLiveToast("已进入实时 Echo Cafe 房间");
  } catch (error) {
    console.warn("[EchoWorld] v1 房间连接失败，保留 v0 世界", error);
    roomClient.stop();
    roomClient = null;
    canvas.dataset.roomSource = "unavailable";
    startLiveWorld({ force: true });
  }
}


function applyRoomSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.members)) return;
  liveWorldTick = Number(snapshot.sequence) || 0;
  setTickBadge(liveWorldTick, "room");
  canvas.dataset.liveSource = "room-v1";
  canvas.dataset.worldTick = String(liveWorldTick);
  const runtimeById = new Map(
    (snapshot.agent_runtime ?? []).map((item) => [item.agent_id, item]),
  );
  for (const member of snapshot.members) {
    if (member.member_id === currentUser.id) continue;
    const entity = npcSystem?.getEntity(member.member_id);
    if (!entity) {
      void ensureAgentEntity({
        id: member.member_id,
        position: member.position,
        state: "walking",
      });
      continue;
    }
    const position = member.position ?? {};
    const inMeeting = Boolean(snapshot.meeting?.participant_ids?.includes(member.member_id));
    const runtimeStatus = runtimeById.get(member.member_id)?.status ?? "idle";
    const renderState = inMeeting
      ? "in-meeting"
      : (runtimeStatus === "talking" ? "talking" : "walking");
    liveTargets.set(member.member_id, {
      x: Number(position.x) || 0,
      z: Number(position.z) || 0,
      yaw: entity.root.rotation.y,
      state: renderState,
      seat: null,
    });
    appShell.updateAgentState({
      personId: member.member_id,
      status: inMeeting ? "in-meeting" : runtimeStatus,
      tableId: inMeeting ? CAFE_LAYOUT.roundtable.id : null,
      tableLabel: inMeeting ? CAFE_LAYOUT.roundtable.label : "Echo Cafe",
      seatIndex: null,
      meeting: inMeeting,
    });
  }
  canvas.dataset.roomSequence = String(snapshot.sequence ?? 0);
  rebuildSceneHotspots();
}


function handleRoomEvent(event) {
  if (event?.type === "person.message-created") {
    const payload = event.payload ?? {};
    if (payload.speaker_id && payload.text) {
      showLiveTalk(payload.speaker_id, payload.text, 7);
      pushLiveToast(
        payload.listener_id === currentUser.id
          ? `${nameOf(payload.speaker_id)}回复了你`
          : `${nameOf(payload.speaker_id)}与${nameOf(payload.listener_id)}正在交谈`,
      );
    }
    return;
  }
  if (event?.type === "meeting.topic-proposed") {
    pushLiveToast(event.payload?.text ?? "圆桌提出了新话题", { level: "meeting" });
  }
}


function syncRoomPlayerPosition() {
  if (!roomClient || !player || performance.now() - lastRoomMoveAt < 800) return;
  const next = { x: Number(player.position.x.toFixed(3)), z: Number(player.position.z.toFixed(3)) };
  if (lastRoomPosition && Math.hypot(next.x - lastRoomPosition.x, next.z - lastRoomPosition.z) < 0.08) {
    return;
  }
  lastRoomMoveAt = performance.now();
  lastRoomPosition = next;
  void roomClient.move(next.x, next.z).catch((error) => {
    console.warn("[EchoWorld] 房间位置同步失败", error);
  });
}


function readMovementInput() {
  moveInput.set(0, 0);
  if (input.isDown("KeyA")) moveInput.x += 1;
  if (input.isDown("KeyD")) moveInput.x -= 1;
  if (input.isDown("KeyW")) moveInput.y += 1;
  if (input.isDown("KeyS")) moveInput.y -= 1;
  moveInput.x -= touchInput.x;
  moveInput.y += touchInput.y;
  if (moveInput.lengthSq() > 1) moveInput.normalize();
  return moveInput;
}


function currentBlockers() {
  // 静态壳来自 ColliderRegistry；大厅摊位圆为动态锚点，由 BoothSystem 快照同步后注入。
  return isHallWorld
    ? [...worldShell.staticCircles, ...(boothSystem?.blockers ?? [])]
    : worldShell.staticCircles;
}


// CharacterSystem owns every capsule; this view stays current for local and live NPCs.
function npcCapsules(excludeEntity = null) {
  if (!npcSystem) return [];
  const colliders = [];
  for (const agent of npcSystem.agents.values()) {
    if (agent.entity === excludeEntity || !agent.entity.collider) continue;
    agent.entity.collider.sync(agent.entity);
    colliders.push(agent.entity.collider);
  }
  return colliders;
}


function characterBlockers(excludeEntity = null) {
  const blockers = [...currentBlockers()];
  if (playerEntity?.collider && playerEntity !== excludeEntity) {
    playerEntity.collider.sync(playerEntity);
    blockers.push(playerEntity.collider);
  }
  blockers.push(...npcCapsules(excludeEntity));
  return blockers;
}


function targetBlockerFor(entity, blockers, targetBlockerId, targetX, targetZ) {
  if (targetX === null || targetZ === null) return null;
  const named = targetBlockerId
    ? blockers.find((blocker) => !blocker?.capsule && blocker?.id === targetBlockerId)
    : null;
  if (named) {
    const radius = named.r ?? named.radius ?? 0;
    if (
      Math.hypot(targetX - named.x, targetZ - named.z)
      < radius + (entity.collider?.radius ?? 0) + 0.08
    ) return named;
  }
  return blockers.find((blocker) => {
    if (blocker?.capsule || !Number.isFinite(blocker?.x) || !Number.isFinite(blocker?.z)) {
      return false;
    }
    const radius = blocker.r ?? blocker.radius ?? 0;
    return Math.hypot(targetX - blocker.x, targetZ - blocker.z)
      < radius + (entity.collider?.radius ?? 0) + 0.08;
  }) ?? null;
}


function resolveCharacterMovement(
  entity,
  stepX,
  stepZ,
  {
    targetX = null,
    targetZ = null,
    approachRadius = 0,
    targetApproach = false,
    targetBlockerId = null,
  } = {},
) {
  if (!entity?.collider) return [stepX, stepZ];
  entity.collider.sync(entity);
  const blockers = characterBlockers(entity);
  const remaining = targetX === null || targetZ === null
    ? Infinity
    : Math.hypot(targetX - entity.root.position.x, targetZ - entity.root.position.z);
  const ignoredBlocker = targetApproach && remaining < approachRadius
    ? targetBlockerFor(entity, blockers, targetBlockerId, targetX, targetZ)
    : null;
  const options = { ignore: ignoredBlocker };
  const penetrationOptions = { ...options, bounds: worldBounds };
  const currentPenetration = capsulePenetrationAt(
    entity.collider,
    entity.root.position.x,
    entity.root.position.z,
    blockers,
    penetrationOptions,
  );
  const [slideX, slideZ] = slideCapsuleStepAroundBlockers(
    entity.collider,
    stepX,
    stepZ,
    blockers,
    options,
  );
  const candidate = {
    x: entity.root.position.x + slideX,
    z: entity.root.position.z + slideZ,
  };
  const candidatePenetration = capsulePenetrationAt(
    entity.collider,
    candidate.x,
    candidate.z,
    blockers,
    penetrationOptions,
  );
  if (candidatePenetration <= 1e-5 || candidatePenetration < currentPenetration - 1e-5) {
    return [slideX, slideZ];
  }

  const xOnly = { x: entity.root.position.x + slideX, z: entity.root.position.z };
  const xPenetration = capsulePenetrationAt(
    entity.collider,
    xOnly.x,
    xOnly.z,
    blockers,
    penetrationOptions,
  );
  if (xPenetration <= 1e-5 || xPenetration < currentPenetration - 1e-5) {
    return [slideX, 0];
  }
  const zOnly = { x: entity.root.position.x, z: entity.root.position.z + slideZ };
  const zPenetration = capsulePenetrationAt(
    entity.collider,
    zOnly.x,
    zOnly.z,
    blockers,
    penetrationOptions,
  );
  if (zPenetration <= 1e-5 || zPenetration < currentPenetration - 1e-5) {
    return [0, slideZ];
  }
  return [0, 0];
}


function isWalkable(position, entity = playerEntity, blockers = characterBlockers(entity)) {
  if (!entity?.collider) {
    return (
      position.x >= worldBounds.minX &&
      position.x <= worldBounds.maxX &&
      position.z >= worldBounds.minZ &&
      position.z <= worldBounds.maxZ
    );
  }
  entity.collider.sync(entity);
  return capsuleFitsAt(entity.collider, position.x, position.z, blockers, {
    bounds: worldBounds,
  });
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
  if (playerSeatTarget) {
    const dx = playerSeatTarget.x - player.position.x;
    const dz = playerSeatTarget.z - player.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= PLAYER_SEAT_ARRIVAL_DISTANCE) {
      finishPlayerSeatApproach();
      return;
    }

    const stepLength = Math.min(distance, MOVE_SPEED * delta);
    const [stepX, stepZ] = resolveCharacterMovement(
      playerEntity,
      (dx / distance) * stepLength,
      (dz / distance) * stepLength,
      {
        targetX: playerSeatTarget.x,
        targetZ: playerSeatTarget.z,
        approachRadius: LIVE_SEAT_APPROACH_DISTANCE,
        targetApproach: true,
        targetBlockerId: playerSeatTarget.id,
      },
    );
    const movedThisFrame = Math.hypot(stepX, stepZ) > 1e-5;
    player.position.x += stepX;
    player.position.z += stepZ;
    playerGroundY = surfaceHeightAt(player.position.x, player.position.z) ?? playerGroundY;
    playerEntity.baseY = playerGroundY;
    playerEntity.collider?.sync(playerEntity);
    if (movedThisFrame) {
      moveDirection.set(stepX, 0, stepZ).normalize();
      targetQuaternion.setFromUnitVectors(MODEL_FORWARD, moveDirection);
      player.quaternion.slerp(targetQuaternion, 1 - Math.exp(-14 * delta));
      currentHeading.lerp(moveDirection, 1 - Math.exp(-9 * delta)).normalize();
    }

    if (
      Math.hypot(
        playerSeatTarget.x - player.position.x,
        playerSeatTarget.z - player.position.z,
      ) <= PLAYER_SEAT_ARRIVAL_DISTANCE
    ) {
      finishPlayerSeatApproach();
      return;
    }

    characterSystem.setActivity(playerEntity, { moving: movedThisFrame });
    const hasWalkClip = playerEntity?.animation?.clipsByRole.has(CHARACTER_ACTIONS.WALK);
    const bob = movedThisFrame && !hasWalkClip
      ? Math.abs(Math.sin(elapsed * 9.2)) * 0.028
      : 0;
    player.position.y = playerGroundY + PLAYER_FOOT_OFFSET + bob;
    updatePlayerMarker();
    return;
  }

  if (meetingMode || playerSeatedAt) {
    characterSystem.setActivity(playerEntity, { seated: true });
    return;
  }
  if (hasBlockingWorldUi()) {
    characterSystem.setActivity(playerEntity);
    return;
  }
  const movementInput = readMovementInput();
  const movementState = playerMovement.update(
    delta,
    movementInput,
    cameraController.getHorizontalAngle(),
    { run: input.isDown("ShiftLeft") || input.isDown("ShiftRight") },
  );
  const wantsToMove = movementState.moving;
  let movedThisFrame = false;
  moveDirection.copy(movementState.direction);

  if (wantsToMove) {
    const startX = player.position.x;
    const startZ = player.position.z;
    candidatePosition.copy(player.position).addScaledVector(
      moveDirection,
      movementState.speed * delta,
    );

    // Resolve the full player capsule against the scene and every other character.
    const [stepX, stepZ] = resolveCharacterMovement(
      playerEntity,
      candidatePosition.x - player.position.x,
      candidatePosition.z - player.position.z,
    );
    candidatePosition.set(player.position.x + stepX, 0, player.position.z + stepZ);
    commitCandidatePosition(candidatePosition);
    playerEntity.collider?.sync(playerEntity);
    movedThisFrame = Math.hypot(player.position.x - startX, player.position.z - startZ) > 1e-5;

  }

  targetQuaternion.setFromUnitVectors(MODEL_FORWARD, moveDirection);
  player.quaternion.slerp(targetQuaternion, 1 - Math.exp(-14 * delta));
  currentHeading.copy(moveDirection);

  characterSystem.setActivity(playerEntity, { moving: movedThisFrame });
  const hasWalkClip = playerEntity?.animation?.clipsByRole.has(CHARACTER_ACTIONS.WALK);
  const bob = movedThisFrame && !hasWalkClip
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
  cameraController.update(player.position, {
    delta,
    groundHeightAt: surfaceHeightAt,
    blockers: currentBlockers(),
    bounds: cameraBounds,
  });
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
    cinematicBasePosition.x + Math.sin(orbit) * cinematicOrbit[0],
    cinematicBasePosition.y + Math.sin(orbit * 0.8) * cinematicOrbit[1],
    cinematicBasePosition.z + Math.cos(orbit) * cinematicOrbit[2],
  );
  camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-2.7 * delta));
  lookTarget.lerp(cinematicTarget, 1 - Math.exp(-4 * delta));
  camera.lookAt(lookTarget);
}


// 大屏只读（?role=screen）：绕场地中心缓慢环视，覆盖整条街道/咖啡厅；
// 半径随世界边界放大（村落市集 60m 见方，夜集街道 28m）
const SCREEN_ORBIT_RADIUS = isHallWorld
  ? Math.max(11.5, (worldBounds.maxX - worldBounds.minX) * 0.38)
  : 7.5;
const SCREEN_ORBIT_HEIGHT = isHallWorld
  ? Math.max(7.4, (worldBounds.maxX - worldBounds.minX) * 0.24)
  : 5.6;
function updateScreenCamera(delta) {
  const orbit = elapsed * 0.08;
  desiredCameraPosition.set(
    Math.sin(orbit) * SCREEN_ORBIT_RADIUS,
    SCREEN_ORBIT_HEIGHT,
    Math.cos(orbit) * SCREEN_ORBIT_RADIUS,
  );
  desiredLookTarget.set(0, 0.7, 0);
  camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-2.2 * delta));
  lookTarget.lerp(desiredLookTarget, 1 - Math.exp(-3 * delta));
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
  canvas.dataset.cameraOrbit = [
    cameraController.yaw,
    cameraController.pitch,
    cameraController.distance,
  ].map((value) => value.toFixed(4)).join(",");
  canvas.dataset.pointerLocked = String(input.pointerLocked);
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
  canvas.dataset.cafeDoorPosition = `${hallCafeDoor.x.toFixed(2)},${hallCafeDoor.z.toFixed(2)}`;
  canvas.dataset.fieldEntityCount = String(relationshipFieldSystem?.hotspots.length ?? 0);
  canvas.dataset.worldModuleCount = String(worldModuleRegistry?.modules.length ?? 0);
  const characterDiagnostics = characterSystem.getAnimationDiagnostics();
  canvas.dataset.characterActions = characterDiagnostics
    .map((entry) => `${entry.personId}:${entry.active ?? "idle"}`)
    .join("|");
  canvas.dataset.characterColliders = characterDiagnostics
    .map((entry) => {
      const collider = entry.collider;
      return `${entry.personId}:${collider?.shape ?? "none"}:${collider?.radius.toFixed(3) ?? "0"}`;
    })
    .join("|");
}


function animate(timestamp) {
  timer.update(timestamp);
  const delta = Math.min(timer.getDelta(), 0.05);
  elapsed += delta;

  if (worldReady) {
    syncControlAvailability();
    const { dx, dy } = input.consumeMouseDelta();
    cameraController.applyMouseDelta(dx, dy);
    boothSystem?.update(delta);
    relationshipFieldSystem?.update(elapsed);
    if (liveEnabled) updateLiveAgents(delta);
    else npcSystem.update(delta, elapsed);
    heartSignalSystem.update(elapsed);
    campfireEntrance?.update(elapsed);
    if (experienceMode === "cafe") {
      updatePlayer(delta);
      syncRoomPlayerPosition();
      if (meetingMode) updateMeetingCamera(delta);
      else updateFollowCamera(delta);
      updatePlayerLabel();
      updateRoundtablePrompt();
      updateSceneInteraction();
    } else if (screenMode) {
      updateScreenCamera(delta);
    } else {
      updateCinematicCamera(delta);
    }
    characterSystem.update(delta, elapsed);
    updateSelectionMarker();
    updateSpeechPositions();
    updateLiveBubbles();
    if (isHallWorld) updateHallHover();
  }

  renderer.render(scene, camera);
  if (worldReady && diagnosticFrame++ % 15 === 0) refreshDiagnostics();
  input.endFrame();
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
  pointerStartedLocked = input.pointerLocked;
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
  if (!worldReady || experienceMode !== "cafe" || meetingMode || screenMode) return;
  if (pointerStartedLocked || input.pointerLocked) return;
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
  if (experienceMode === "cafe" && !screenMode && sceneInteraction.handleKey(event)) {
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
  if (
    event.code === "Escape" &&
    (playerSeatedAt || playerSeatTarget) &&
    !event.target.closest?.("input, textarea")
  ) {
    if (meetingMode) void endMeeting();
    else {
      if ((playerSeatedAt ?? playerSeatTarget?.id) === "campfire") integrations.groupPlay?.close();
      leavePlayerSeat();
    }
    event.preventDefault();
    return;
  }
  if (
    experienceMode === "cafe" &&
    !meetingMode &&
    ["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code) &&
    !event.target.closest?.("input, textarea")
  ) {
    event.preventDefault();
  }
});

window.addEventListener("blur", () => {
  resetPlayerInput();
});


function updateTouchStick(event) {
  if (
    experienceMode !== "cafe" ||
    meetingMode ||
    playerSeatedAt ||
    playerSeatTarget ||
    hasBlockingWorldUi()
  ) return;
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
  input.destroy();
  worldAudio?.dispose();
  cameraController.dispose();
  appShell.destroy();
  sceneInteraction.destroy();
  relationshipFieldSystem?.dispose();
  fieldSplatWorld?.dispose();
  worldBroadcastSystem?.dispose();
  campfireEntrance?.dispose();
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
  // 先探测后端可达性（auto 模式）：决定会议/场域/播报等走真实后端还是本地 mock
  meetingBackendLive = liveEnabled && await useLiveMode() &&
    typeof api.startMeeting === "function" && typeof api.postMeetingMessage === "function";
  appShell.setMeetingLive?.(meetingBackendLive);
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
      templateAssetId: activeSceneVariant.boothTemplateAssetId,
      showDisplayBoard: SHOW_CHARACTER_BOARDS,
    });
    await boothSystem.prepare();
  }
  let environment = null;
  if (isFieldWorld) {
    setProgress(0.12, `正在生成你与${fieldTargetPerson.name}的关系场域`);
    relationshipField = await api.getField(fieldTargetPerson.id);
    // world.status === "ready" 时用 Spark 渲染 Marble splat 世界（collider GLB
    // 作地面/碰撞射线目标）；未就绪或加载失败一律回退程序化场域（含 mock 模式）
    fieldSplatWorld = await tryLoadFieldSplatWorld({
      scene,
      renderer,
      field: relationshipField,
      assetStore,
      resolveMediaUrl,
      onProgress: setProgress,
    }).catch((error) => {
      console.warn("[EchoWorld] 场域 splat 世界加载失败，回退程序化场域", error);
      return null;
    });
    relationshipFieldSystem = new RelationshipFieldSystem({
      scene,
      field: relationshipField,
      decorations: !fieldSplatWorld,
    });
    relationshipFieldSystem.applyAtmosphere(scene, { fog: !fieldSplatWorld });
    if (fieldSplatWorld) {
      // 互动实体/同伴底座射线贴地，贴不上的隐藏；出生点由 spawnHint 供 spawnCharacters 使用
      const groundedHotspots = [];
      for (const object of relationshipFieldSystem.root.children) {
        const isEntity = object.isGroup && object.userData?.fieldEntityId;
        const isFieldMesh = object.isMesh && object.name?.startsWith("FIELD_");
        if (!isEntity && !isFieldMesh) continue;
        if (snapObjectToFieldGround(object, fieldSplatWorld.groundGroup)) {
          if (isEntity) {
            const hotspot = relationshipFieldSystem.hotspots
              .find((item) => item.id === `field-${object.userData.fieldEntityId}`);
            if (hotspot) groundedHotspots.push(hotspot);
          }
        } else {
          object.visible = false; // 该处没有地面，不悬浮
        }
      }
      if (groundedHotspots.length) relationshipFieldSystem.hotspots = groundedHotspots;
      environment = new THREE.Group();
      environment.name = "ROOT_FieldWorld";
      environment.add(fieldSplatWorld.root);
      environment.add(relationshipFieldSystem.root);
    } else {
      environment = relationshipFieldSystem.root;
    }
    canvas.dataset.fieldPerson = fieldTargetPerson.id;
    canvas.dataset.fieldSchema = relationshipField.schema;
    canvas.dataset.fieldGenerated = String(relationshipField.generated);
    canvas.dataset.fieldWorld = fieldSplatWorld ? `splat:${fieldSplatWorld.quality}` : "procedural";
  } else if (isHallWorld && environmentAssetId === "environment.hub-blockout.v1") {
    setProgress(0.12, `正在搭建${worldTitle}`);
    environment = createHubBlockoutEnvironment();
  } else {
    try {
      const environmentAsset = assetCatalog.resolve(environmentAssetId, "environment");
      setProgress(0.12, `正在搭建${worldTitle}`);
      environment = await assetStore.loadScene(environmentAsset.resolvedUrl);
      if (environmentAssetId === "environment.village-market.v1") {
        environment = createVillageMarketEnvironment(environment);
      }
    } catch (error) {
      console.warn(`[EchoWorld] 环境资产 ${environmentAssetId} 未就绪，使用简易占位场地`, error);
      environment = buildFallbackEnvironment();
    }
  }
  if (isVillageMarket && environment) {
    try {
      setProgress(0.58, "正在点亮草地中央的篝火");
      campfireEntrance = new CampfireEntrance({ assetStore, assetCatalog });
      environment.add(await campfireEntrance.load());
    } catch (error) {
      campfireEntrance = null;
      console.warn("[EchoWorld] 篝火模块未就绪，保留现场入口提示", error);
    }
  }
  setProgress(0.68);
  await configureWorld(environment);
}


async function setCharacterExpression(personId, expression, metadata = {}) {
  const applied = await expressionSystem.setExpression(personId, expression);
  if (
    ["npc-conversation", "roundtable-opening", "roundtable-reply"].includes(metadata.source)
  ) {
    characterSystem.playAction(personId, CHARACTER_ACTIONS.TALK, {
      durationMs: Math.max(350, Number(metadata.duration ?? 1) * 1000),
    });
  }
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
  get characterActions() { return { ...CHARACTER_ACTIONS }; },
  get characterAnimationState() { return characterSystem?.getAnimationDiagnostics() ?? []; },
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
  get audio() { return worldAudio?.diagnostics ?? null; },
  get boothSystem() { return boothSystem; },
  get relationshipField() { return relationshipField; },
  get sceneHotspots() { return [...sceneHotspots]; },
  get nearbyHotspot() { return nearbySceneHotspot; },
  get worldBrief() { return worldBroadcastSystem?.brief ?? null; },
  get campfire() { return campfireEntrance?.root ?? null; },
  get integrations() { return integrations; },
  getAgentState: (personId) => worldAgentState(personId),
  selectPerson: selectWorldPerson,
  setExpression: setCharacterExpression,
  playCharacterAction(personId, action, options = {}) {
    const applied = characterSystem?.playAction(personId, action, options) ?? false;
    canvas.dataset.lastCharacterAction = `${personId}:${action}:${applied}`;
    return applied;
  },
  raiseRightHand: (personId) =>
    characterSystem?.playAction(personId, CHARACTER_ACTIONS.RAISE_RIGHT_HAND) ?? false,
  raiseBothHands: (personId) =>
    characterSystem?.playAction(personId, CHARACTER_ACTIONS.RAISE_BOTH_HANDS) ?? false,
  stopCharacterAction: (personId) => characterSystem?.stopAction(personId) ?? false,
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
