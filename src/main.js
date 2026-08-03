import * as THREE from "three";
import { currentUser, people, relationships } from "./data/demoPeople.js";
import { AssetCatalog } from "./runtime/AssetCatalog.js";
import { AssetStore } from "./runtime/AssetStore.js";
import { CAFE_LAYOUT } from "./runtime/CafeLayout.js";
import { CharacterSystem } from "./runtime/CharacterSystem.js";
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
  sceneVariantFromLocation,
} from "./runtime/SceneVariants.js";
import {
  adaptMaterialToProfile,
  adaptSceneMaterials,
  installVisualProfile,
} from "./runtime/VisualProfiles.js";
import { loadWorldSpec, publicUrl } from "./runtime/WorldSpec.js";
import { createCafeShell } from "./ui/CafeShell.js";
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
installVisualProfile(scene, renderer, activeSceneVariant.visualProfile);

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
});

canvas.dataset.ready = "false";
canvas.dataset.appView = experienceMode;
canvas.dataset.roundtableReserved = "true";
canvas.dataset.characterVariant = activeCharacterVariant.id;


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
    characterSpec(currentUser, "self-player", CAFE_LAYOUT.playerSpawn, 0),
  );
  player = playerEntity.root;
  playerGroundY = player.position.y;
  currentHeading.copy(MODEL_FORWARD).applyQuaternion(player.quaternion).setY(0).normalize();

  npcSystem = new NpcAgentSystem({
    people,
    onConversation: (event) => appShell.showNpcConversation(event),
    onStateChange: (state) => appShell.updateAgentState(state),
  });

  for (let index = 0; index < people.length; index += 1) {
    setProgress(0.76 + index * 0.03, `正在载入 ${people[index].name} 的人物模型`);
    const entity = await characterSystem.spawn(
      characterSpec(
        people[index],
        `agent-${people[index].id}`,
        NPC_ENTRY_SPAWNS[index],
      ),
    );
    npcSystem.register(people[index], entity);
  }
  npcSystem.initializeCafe();

  playerMarker = makeGroundMarker("#f2c55f", 0.32, 0.42, 0.42);
  playerMarker.name = "PLAYER_GroundMarker";
  selectionMarker = makeGroundMarker("#d36f59", 0.36, 0.48, 0.72);
  selectionMarker.name = "SELECTION_GroundMarker";
  selectionMarker.visible = false;
  updatePlayerMarker();
}


async function configureWorld(root) {
  environmentRoot = root;
  adaptSceneMaterials(root, activeSceneVariant.visualProfile);
  scene.add(root);
  root.updateMatrixWorld(true);

  root.traverse((object) => {
    if (!object.isMesh) return;
    const isFloor = object.name === "GROUND_CafeFloor";
    object.castShadow = !isFloor;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      material.envMapIntensity = 0.38;
    });
  });

  const groundRoot = root.getObjectByName("GROUND_CafeFloor");
  if (!groundRoot) throw new Error("咖啡厅资产缺少 GROUND_CafeFloor");
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

  validateRuntimeAnchors(root);
  await spawnCharacters();
  worldReady = true;
  canvas.dataset.ready = "true";
  canvas.dataset.characterCount = String(characterSystem.entities.length);
  canvas.dataset.npcCount = String(npcSystem.agents.size);
  canvas.dataset.environment = activeSceneVariant.environmentAssetId;
  canvas.dataset.sceneVariant = activeSceneVariant.id;
  setProgress(1, `${activeSceneVariant.title} 已准备好`);
  appShell.setWorldReady(true);
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
  if (mode === "cafe") canvas.focus({ preventScroll: true });
}


function selectWorldPerson(personId) {
  const person = people.find((candidate) => candidate.id === personId) ?? null;
  selectedPersonId = person?.id ?? null;
  appShell.selectWorldPerson(selectedPersonId);
  canvas.dataset.selectedPerson = selectedPersonId ?? "";
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
  const accepted = npcSystem.startMeeting(personIds);
  if (accepted.length === 0) return [];
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
  npcSystem.endMeeting();
  canvas.dataset.meetingActive = "false";
  canvas.dataset.meetingInvited = "";
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


function isWalkable(position) {
  if (
    position.x < CAFE_LAYOUT.bounds.minX ||
    position.x > CAFE_LAYOUT.bounds.maxX ||
    position.z < CAFE_LAYOUT.bounds.minZ ||
    position.z > CAFE_LAYOUT.bounds.maxZ
  ) return false;
  return !TABLE_BLOCKERS.some(
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
  const distance = Math.hypot(
    player.position.x - CAFE_LAYOUT.roundtable.center.x,
    player.position.z - CAFE_LAYOUT.roundtable.center.z,
  );
  roundtableNearby = experienceMode === "cafe" && !meetingMode && distance <= CAFE_LAYOUT.roundtable.interactionRadius;
  appShell.setRoundtableNearby(roundtableNearby);
  canvas.dataset.roundtableNearby = String(roundtableNearby);
}


function refreshDiagnostics() {
  const states = people.map((person) => npcSystem.getState(person.id));
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
    npcSystem.update(delta, elapsed);
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
  const hits = raycaster.intersectObjects(
    characterSystem.entities.map((entity) => entity.root),
    true,
  );
  const root = hits.length > 0 ? personRootFromHit(hits[0].object) : null;
  const personId = root?.userData.personId;
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
async function boot() {
  setProgress(0.04, `正在读取${activeSceneVariant.title}`);
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
      activeSceneVariant.visualProfile,
    ),
  });
  const environmentAsset = assetCatalog.resolve(
    activeSceneVariant.environmentAssetId,
    "environment",
  );
  setProgress(0.12, `正在搭建${activeSceneVariant.title}`);
  const environment = await assetStore.loadScene(environmentAsset.resolvedUrl);
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
