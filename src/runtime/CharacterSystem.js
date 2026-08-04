import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { CharacterCapsuleCollider } from "./CharacterCapsule.js";


export const CHARACTER_ACTIONS = Object.freeze({
  IDLE: "idle",
  WALK: "walk",
  TALK: "talk",
  SIT_DOWN: "sit-down",
  SIT: "sit",
  SIT_TALK: "sit-talk",
  RAISE_RIGHT_HAND: "raise-right-hand",
  RAISE_BOTH_HANDS: "raise-both-hands",
});

const ACTION_ALIASES = Object.freeze({
  idle: CHARACTER_ACTIONS.IDLE,
  idling: CHARACTER_ACTIONS.IDLE,
  stand: CHARACTER_ACTIONS.IDLE,
  standing: CHARACTER_ACTIONS.IDLE,
  walk: CHARACTER_ACTIONS.WALK,
  walking: CHARACTER_ACTIONS.WALK,
  talk: CHARACTER_ACTIONS.TALK,
  talking: CHARACTER_ACTIONS.TALK,
  nod: CHARACTER_ACTIONS.TALK,
  sitdown: CHARACTER_ACTIONS.SIT_DOWN,
  sittingdown: CHARACTER_ACTIONS.SIT_DOWN,
  sit: CHARACTER_ACTIONS.SIT,
  seated: CHARACTER_ACTIONS.SIT,
  sitting: CHARACTER_ACTIONS.SIT,
  sittalk: CHARACTER_ACTIONS.SIT_TALK,
  seatedtalk: CHARACTER_ACTIONS.SIT_TALK,
  raiserighthand: CHARACTER_ACTIONS.RAISE_RIGHT_HAND,
  righthand: CHARACTER_ACTIONS.RAISE_RIGHT_HAND,
  wave: CHARACTER_ACTIONS.RAISE_RIGHT_HAND,
  raisebothhands: CHARACTER_ACTIONS.RAISE_BOTH_HANDS,
  bothhands: CHARACTER_ACTIONS.RAISE_BOTH_HANDS,
  celebrate: CHARACTER_ACTIONS.RAISE_BOTH_HANDS,
});

const WALKING_STATES = new Set(["arriving", "joining-meeting", "walking"]);
const SEATED_STATES = new Set(["in-meeting", "seated", "sitting"]);
const LOOPING_ACTIONS = new Set([
  CHARACTER_ACTIONS.IDLE,
  CHARACTER_ACTIONS.WALK,
  CHARACTER_ACTIONS.TALK,
  CHARACTER_ACTIONS.SIT,
  CHARACTER_ACTIONS.SIT_TALK,
]);
const SEATED_OVERRIDE_ACTIONS = new Set([
  CHARACTER_ACTIONS.SIT_DOWN,
  CHARACTER_ACTIONS.SIT_TALK,
]);


const MATERIAL_MODULE_TOKENS = Object.freeze({
  jacket: ["jacket", "coat", "outerwear"],
  hair: ["hair"],
  skin: ["skin"],
  pants: ["pants", "trouser", "trousers"],
  shoes: ["shoe", "shoes", "boot", "boots"],
  shirt: ["shirt", "innerwear"],
});


function normalizeKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}


function normalizeAction(value) {
  return ACTION_ALIASES[normalizeKey(value)] ?? null;
}


function colorValue(entry) {
  if (typeof entry === "string" || typeof entry === "number") return entry;
  if (entry?.isColor) return entry;
  if (entry && typeof entry === "object") {
    return entry.color ?? entry.value;
  }
  return undefined;
}


function paletteMatch(palette, materialName) {
  if (!palette || typeof palette !== "object" || Array.isArray(palette)) {
    return undefined;
  }

  const normalizedMaterial = normalizeKey(materialName);
  const materialWithoutPrefix = normalizedMaterial.replace(/^mat/, "");
  const entries = Object.entries(palette)
    .map(([key, value]) => ({ key: normalizeKey(key), value: colorValue(value) }))
    .filter(({ key, value }) => key && value !== undefined)
    .sort((left, right) => right.key.length - left.key.length);

  const exact = entries.find(
    ({ key }) => key === normalizedMaterial || key === materialWithoutPrefix,
  );
  if (exact) return exact.value;

  const namedPart = entries.find(
    ({ key }) =>
      normalizedMaterial.includes(key) || materialWithoutPrefix.includes(key),
  );
  if (namedPart) return namedPart.value;

  for (const { key, value } of entries) {
    const tokens = MATERIAL_MODULE_TOKENS[key];
    if (tokens?.some((token) => materialWithoutPrefix.includes(token))) {
      return value;
    }
  }
  return undefined;
}


function resolveMaterialColor(characterSpec, profile, materialName) {
  if (characterSpec.lock_texture_colors) return undefined;
  const sources = [
    characterSpec.material_overrides,
    characterSpec.palette?.material_overrides,
    characterSpec.palette,
    profile?.material_overrides,
    profile?.palette?.material_overrides,
    profile?.palette,
  ];
  for (const source of sources) {
    const value = paletteMatch(source, materialName);
    if (value !== undefined) return value;
  }
  return undefined;
}


export class CharacterSystem {
  constructor({ scene, assetStore, assetCatalog, resolveSurfaceY, materialAdapter = null }) {
    this.scene = scene;
    this.assetStore = assetStore;
    this.assetCatalog = assetCatalog;
    this.resolveSurfaceY = resolveSurfaceY;
    this.materialAdapter = materialAdapter;
    this.entities = [];
  }

  async spawn(characterSpec) {
    const profilePromise = this.#resolveProfile(characterSpec);
    const profile = await profilePromise;
    let resolvedAssetId = characterSpec.asset_id;
    let sourceGltf;
    try {
      const asset = this.assetCatalog.resolve(resolvedAssetId, "character");
      sourceGltf = await this.#loadCharacterGltf(asset.resolvedUrl);
    } catch (error) {
      if (!characterSpec.fallback_asset_id) throw error;
      console.warn(
        `Character asset ${resolvedAssetId} failed; using ${characterSpec.fallback_asset_id}`,
        error,
      );
      resolvedAssetId = characterSpec.fallback_asset_id;
      const fallbackAsset = this.assetCatalog.resolve(resolvedAssetId, "character");
      sourceGltf = await this.#loadCharacterGltf(fallbackAsset.resolvedUrl);
    }

    if (
      profile?.person_id &&
      characterSpec.person_id &&
      profile.person_id !== characterSpec.person_id
    ) {
      throw new Error(
        `Person profile mismatch: ${characterSpec.person_id} != ${profile.person_id}`,
      );
    }

    const model = clone(sourceGltf.scene);
    const root = new THREE.Group();
    const scale = characterSpec.spawn.scale ?? 1;
    const x = characterSpec.spawn.x;
    const z = characterSpec.spawn.z;
    const groundY = this.resolveSurfaceY(x, z);
    if (groundY === null) {
      throw new Error(`Character spawn is outside terrain: ${characterSpec.instance_id}`);
    }

    const materials = new Set();
    const materialClones = new Map();
    const cloneMaterial = (sourceMaterial) => {
      if (!sourceMaterial) return sourceMaterial;
      if (materialClones.has(sourceMaterial)) {
        return materialClones.get(sourceMaterial);
      }

      const instanceMaterial = sourceMaterial.clone();
      this.#configureTexture(instanceMaterial.map, characterSpec.texture_filter);
      const color = resolveMaterialColor(
        characterSpec,
        profile,
        sourceMaterial.name,
      );
      if (color !== undefined && instanceMaterial.color?.isColor) {
        instanceMaterial.color.set(color);
        instanceMaterial.needsUpdate = true;
      }
      const finalMaterial = this.materialAdapter
        ? this.materialAdapter(instanceMaterial)
        : instanceMaterial;
      if (finalMaterial !== instanceMaterial) instanceMaterial.dispose();
      materialClones.set(sourceMaterial, finalMaterial);
      materials.add(finalMaterial);
      return finalMaterial;
    };

    root.name = `PERSON_${characterSpec.instance_id}`;
    root.position.set(x, groundY + (characterSpec.spawn.ground_offset ?? 0), z);
    root.rotation.y = characterSpec.spawn.yaw ?? 0;
    root.scale.setScalar(scale);
    root.userData.personId =
      characterSpec.person_id ?? profile?.person_id ?? characterSpec.instance_id;
    root.userData.profile = profile;
    root.userData.interaction = characterSpec.interaction ?? null;

    model.name = `${root.name}_Model`;
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneMaterial)
        : cloneMaterial(object.material);
    });
    root.add(model);
    this.scene.add(root);

    const entity = {
      root,
      model,
      profile,
      spec: characterSpec,
      resolvedAssetId,
      instanceId: characterSpec.instance_id,
      materials,
      baseY: root.position.y,
      phase: this.entities.length * 1.71,
      animation: null,
      collider: new CharacterCapsuleCollider({
        radius: characterSpec.collider?.radius ?? characterSpec.collision?.radius,
        standingHeight:
          characterSpec.collider?.standingHeight
          ?? characterSpec.collider?.standing_height
          ?? characterSpec.collision?.standingHeight
          ?? characterSpec.collision?.standing_height
          ?? characterSpec.collider?.height
          ?? characterSpec.collision?.height,
        seatedHeight:
          characterSpec.collider?.seatedHeight
          ?? characterSpec.collider?.seated_height
          ?? characterSpec.collision?.seatedHeight
          ?? characterSpec.collision?.seated_height,
      }),
    };
    this.#initializeAnimation(entity, sourceGltf.animations ?? []);
    if (entity.animation) this.setBaseAction(entity, CHARACTER_ACTIONS.IDLE);
    entity.collider.sync(entity);
    this.entities.push(entity);
    return entity;
  }

  async #loadCharacterGltf(url) {
    if (typeof this.assetStore.loadGltf === "function") {
      return this.assetStore.loadGltf(url);
    }
    const scene = await this.assetStore.loadScene(url);
    return { scene, animations: [] };
  }

  #initializeAnimation(entity, clips) {
    const clipsByRole = new Map();
    for (const clip of clips) {
      const role = normalizeAction(clip.name);
      if (role && !clipsByRole.has(role)) clipsByRole.set(role, clip);
    }
    if (clipsByRole.size === 0) return;

    const mixer = new THREE.AnimationMixer(entity.model);
    entity.animation = {
      mixer,
      clipsByRole,
      actionsByRole: new Map(),
      baseRole: null,
      currentRole: null,
      currentAction: null,
      overrideRole: null,
      overrideRemaining: null,
      pendingOverride: null,
      finishedOverrideAction: null,
      posture: "standing",
    };
    entity.root.userData.characterPosture = "standing";
    mixer.addEventListener("finished", (event) => {
      const animation = entity.animation;
      if (!animation || event.action !== animation.currentAction) return;
      if (animation.overrideRole) animation.finishedOverrideAction = event.action;
    });
  }

  #resolveEntity(entityOrId) {
    if (entityOrId?.root && entityOrId?.model) return entityOrId;
    return this.entities.find((entity) =>
      entity.instanceId === entityOrId ||
      entity.root.userData.personId === entityOrId,
    ) ?? null;
  }

  #actionFor(entity, role) {
    const animation = entity.animation;
    if (!animation) return null;
    if (animation.actionsByRole.has(role)) return animation.actionsByRole.get(role);
    const clip = animation.clipsByRole.get(role);
    if (!clip) return null;
    const action = animation.mixer.clipAction(clip);
    animation.actionsByRole.set(role, action);
    return action;
  }

  #activate(
    entity,
    role,
    { loop = LOOPING_ACTIONS.has(role), fadeSeconds = 0.16, restart = false } = {},
  ) {
    const animation = entity.animation;
    const nextAction = this.#actionFor(entity, role);
    if (!animation || !nextAction) return false;
    const sameRunning =
      animation.currentRole === role &&
      animation.currentAction === nextAction &&
      nextAction.isRunning();
    if (sameRunning && !restart) return true;

    const previousAction = animation.currentAction;
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.clampWhenFinished = role === CHARACTER_ACTIONS.SIT_DOWN;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    nextAction.play();
    if (previousAction && previousAction !== nextAction) {
      previousAction.crossFadeTo(nextAction, fadeSeconds, true);
    } else if (!sameRunning && fadeSeconds > 0) {
      nextAction.fadeIn(fadeSeconds);
    }
    animation.currentRole = role;
    animation.currentAction = nextAction;
    animation.finishedOverrideAction = null;
    entity.root.userData.characterAction = role;
    return true;
  }

  #stopCurrent(entity, fadeSeconds = 0.16) {
    const animation = entity.animation;
    if (!animation?.currentAction) return;
    if (fadeSeconds > 0) animation.currentAction.fadeOut(fadeSeconds);
    else animation.currentAction.stop();
    animation.currentRole = null;
    animation.currentAction = null;
    entity.root.userData.characterAction = null;
  }

  #finishOverride(entity) {
    const animation = entity.animation;
    if (!animation) return;
    const finishedRole = animation.overrideRole;
    const pendingOverride = animation.pendingOverride;
    animation.overrideRole = null;
    animation.overrideRemaining = null;
    animation.pendingOverride = null;
    if (animation.baseRole) {
      this.#activate(entity, animation.baseRole, {
        fadeSeconds: finishedRole === CHARACTER_ACTIONS.SIT_DOWN ? 0 : 0.16,
      });
    }
    else this.#stopCurrent(entity);
    if (pendingOverride && animation.posture === "seated") {
      animation.overrideRole = pendingOverride.role;
      animation.overrideRemaining = pendingOverride.shouldLoop
        ? pendingOverride.durationSeconds
        : null;
      this.#activate(entity, pendingOverride.role, {
        loop: pendingOverride.shouldLoop,
        restart: true,
      });
    }
  }

  setState(entityOrId, state, { seated = null } = {}) {
    const entity = this.#resolveEntity(entityOrId);
    if (!entity?.animation) return false;
    const token = String(state ?? "").trim().toLowerCase();
    if (WALKING_STATES.has(token)) return this.setActivity(entity, { moving: true });
    if (SEATED_STATES.has(token)) return this.setActivity(entity, { seated: true });
    if (token === "talking") {
      return this.setActivity(entity, {
        seated: seated ?? entity.animation.posture === "seated",
        talking: true,
      });
    }
    return this.setActivity(entity);
  }

  setActivity(
    entityOrId,
    { moving = false, seated = false, talking = false, transition = true } = {},
  ) {
    const entity = this.#resolveEntity(entityOrId);
    const animation = entity?.animation;
    if (!entity || !animation) return false;

    const queuedTalk = !animation.overrideRole && animation.pendingOverride?.role === CHARACTER_ACTIONS.TALK
      ? animation.pendingOverride
      : null;
    const wantsSeated = Boolean(seated) && !moving;
    if (wantsSeated) {
      const enteringSeat = animation.posture !== "seated";
      animation.posture = "seated";
      entity.root.userData.characterPosture = "seated";
      entity.collider?.sync(entity);
      const baseRole = talking
        ? CHARACTER_ACTIONS.SIT_TALK
        : CHARACTER_ACTIONS.SIT;

      if (
        enteringSeat &&
        transition &&
        animation.clipsByRole.has(CHARACTER_ACTIONS.SIT_DOWN)
      ) {
        const transitionStarted = this.playAction(entity, CHARACTER_ACTIONS.SIT_DOWN);
        const baseSet = this.setBaseAction(entity, baseRole);
        if (queuedTalk) {
          animation.pendingOverride = {
            ...queuedTalk,
            role: CHARACTER_ACTIONS.SIT_TALK,
          };
        }
        return transitionStarted || baseSet;
      }
      const baseSet = this.setBaseAction(entity, baseRole);
      if (queuedTalk) {
        animation.pendingOverride = null;
        this.playAction(entity, CHARACTER_ACTIONS.SIT_TALK, {
          durationMs: queuedTalk.durationSeconds === null
            ? null
            : queuedTalk.durationSeconds * 1000,
        });
      }
      return baseSet;
    }

    const leavingSeat = animation.posture === "seated";
    animation.posture = "standing";
    entity.root.userData.characterPosture = "standing";
    entity.collider?.sync(entity);
    const baseRole = moving
      ? CHARACTER_ACTIONS.WALK
      : (talking ? CHARACTER_ACTIONS.TALK : CHARACTER_ACTIONS.IDLE);
    const baseSet = this.setBaseAction(entity, baseRole);
    if (
      animation.overrideRole &&
      (moving || (leavingSeat && SEATED_OVERRIDE_ACTIONS.has(animation.overrideRole)))
    ) {
      animation.pendingOverride = null;
      this.stopAction(entity);
    }
    if (!moving && queuedTalk) {
      animation.pendingOverride = null;
      this.playAction(entity, CHARACTER_ACTIONS.TALK, {
        durationMs: queuedTalk.durationSeconds === null
          ? null
          : queuedTalk.durationSeconds * 1000,
      });
    }
    return baseSet;
  }

  setBaseAction(entityOrId, actionName) {
    const entity = this.#resolveEntity(entityOrId);
    if (!entity?.animation) return false;
    const role = actionName == null ? CHARACTER_ACTIONS.IDLE : normalizeAction(actionName);
    if (actionName != null && !role) return false;
    if (role && !entity.animation.clipsByRole.has(role)) return false;
    if (role && !LOOPING_ACTIONS.has(role)) return false;
    entity.animation.baseRole = role;
    if (entity.animation.overrideRole) return true;
    if (role) return this.#activate(entity, role, { loop: true });
    this.#stopCurrent(entity);
    return true;
  }

  playAction(entityOrId, actionName, { durationMs = null } = {}) {
    const entity = this.#resolveEntity(entityOrId);
    let role = normalizeAction(actionName);
    if (
      role === CHARACTER_ACTIONS.TALK &&
      entity?.animation?.posture === "seated" &&
      entity.animation.clipsByRole.has(CHARACTER_ACTIONS.SIT_TALK)
    ) {
      role = CHARACTER_ACTIONS.SIT_TALK;
    }
    if (!entity?.animation || !role || !entity.animation.clipsByRole.has(role)) return false;

    const durationSeconds = Number.isFinite(durationMs) && durationMs > 0
      ? durationMs / 1000
      : null;
    if (
      role === CHARACTER_ACTIONS.TALK &&
      entity.animation.posture === "standing" &&
      entity.animation.baseRole === CHARACTER_ACTIONS.WALK
    ) {
      entity.animation.pendingOverride = {
        role,
        durationSeconds,
        shouldLoop: LOOPING_ACTIONS.has(role) && durationSeconds !== null,
      };
      return true;
    }
    if (
      entity.animation.overrideRole === CHARACTER_ACTIONS.SIT_DOWN &&
      role === CHARACTER_ACTIONS.SIT_TALK
    ) {
      entity.animation.pendingOverride = {
        role,
        durationSeconds,
        shouldLoop: LOOPING_ACTIONS.has(role) && durationSeconds !== null,
      };
      return true;
    }
    const shouldLoop = LOOPING_ACTIONS.has(role) && durationSeconds !== null;
    entity.animation.overrideRole = role;
    entity.animation.pendingOverride = null;
    entity.animation.overrideRemaining = shouldLoop
      ? durationSeconds
      : (role === CHARACTER_ACTIONS.SIT_DOWN
        ? (entity.animation.clipsByRole.get(role)?.duration ?? 1) + 0.25
        : null);
    return this.#activate(entity, role, { loop: shouldLoop, restart: true });
  }

  stopAction(entityOrId) {
    const entity = this.#resolveEntity(entityOrId);
    if (!entity?.animation?.overrideRole) return false;
    entity.animation.pendingOverride = null;
    entity.animation.finishedOverrideAction = null;
    entity.animation.overrideRole = null;
    entity.animation.overrideRemaining = null;
    if (entity.animation.baseRole) {
      this.#activate(entity, entity.animation.baseRole, { loop: true, restart: true });
    } else {
      this.#stopCurrent(entity, 0);
    }
    return true;
  }

  getAnimationDiagnostics() {
    return this.entities.map((entity) => ({
      personId: entity.root.userData.personId,
      clips: entity.animation ? [...entity.animation.clipsByRole.keys()] : [],
      active: entity.animation?.currentRole ?? null,
      base: entity.animation?.baseRole ?? null,
      override: entity.animation?.overrideRole ?? null,
      posture: entity.animation?.posture ?? null,
      collider: entity.collider
        ? {
            shape: "capsule",
            radius: entity.collider.radius,
            height: entity.collider.height,
          }
        : null,
    }));
  }

  #configureTexture(texture, filterMode) {
    if (!texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    if (filterMode === "nearest") {
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestMipmapNearestFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
    }
  }

  async spawnAll(characterSpecs) {
    const entities = [];
    for (const characterSpec of characterSpecs) {
      entities.push(await this.spawn(characterSpec));
    }
    return entities;
  }

  despawn(entityOrInstanceId) {
    const entity =
      typeof entityOrInstanceId === "string"
        ? this.entities.find(
            (candidate) => candidate.spec.instance_id === entityOrInstanceId,
          )
        : entityOrInstanceId;
    const index = this.entities.indexOf(entity);
    if (index === -1) return false;

    this.entities.splice(index, 1);
    if (entity.animation) {
      entity.animation.mixer.stopAllAction();
      entity.animation.mixer.uncacheRoot(entity.model);
    }
    entity.root.removeFromParent();
    for (const material of entity.materials ?? []) {
      material.dispose();
    }
    return true;
  }

  remove(instanceId) {
    return this.despawn(instanceId);
  }

  clear({ preserveIds = [] } = {}) {
    const preserved = new Set(
      typeof preserveIds === "string" ? [preserveIds] : preserveIds,
    );
    let removed = 0;
    for (const entity of [...this.entities]) {
      if (preserved.has(entity.spec.instance_id)) continue;
      if (this.despawn(entity)) removed += 1;
    }
    return removed;
  }

  update(delta, elapsed) {
    for (const entity of this.entities) {
      const animation = entity.animation;
      if (animation) {
        const timedRole = animation.overrideRole;
        animation.mixer.update(delta);
        if (
          animation.finishedOverrideAction &&
          animation.finishedOverrideAction === animation.currentAction
        ) {
          animation.finishedOverrideAction = null;
          this.#finishOverride(entity);
        }
        if (
          animation.overrideRole === timedRole &&
          animation.overrideRemaining !== null
        ) {
          animation.overrideRemaining -= delta;
          if (animation.overrideRemaining <= 0) this.#finishOverride(entity);
        }
      }
      const idleAmplitude = animation?.currentRole
        ? 0
        : (entity.spec.behavior?.idle_bob ?? 0.006);
      entity.root.position.y =
        entity.baseY + Math.sin(elapsed * 1.7 + entity.phase) * idleAmplitude;
      entity.collider?.sync(entity);
    }
  }

  async #resolveProfile(characterSpec) {
    if (characterSpec.profile !== undefined && characterSpec.profile !== null) {
      if (typeof characterSpec.profile !== "object" || Array.isArray(characterSpec.profile)) {
        throw new Error("Character inline profile must be an object");
      }
      return characterSpec.profile;
    }
    if (!characterSpec.profile_asset_id) {
      throw new Error(
        `Character requires profile or profile_asset_id: ${characterSpec.instance_id}`,
      );
    }
    const profileAsset = this.assetCatalog.resolve(
      characterSpec.profile_asset_id,
      "person-profile",
    );
    return this.assetStore.loadJson(profileAsset.resolvedUrl);
  }
}
