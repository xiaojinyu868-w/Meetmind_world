import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";


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
    let resolvedAssetId = characterSpec.asset_key ?? characterSpec.asset_id;
    let assetLoadStatus = characterSpec.asset_url ? "dynamic" : "catalog";
    let sourceScene;
    try {
      if (characterSpec.asset_url) {
        sourceScene = await this.assetStore.loadScene(characterSpec.asset_url);
      } else {
        const asset = this.assetCatalog.resolve(characterSpec.asset_id, "character");
        sourceScene = await this.assetStore.loadScene(asset.resolvedUrl);
      }
    } catch (error) {
      if (!characterSpec.fallback_asset_id) throw error;
      console.warn(
        `Character asset ${resolvedAssetId} failed; using ${characterSpec.fallback_asset_id}`,
        error,
      );
      resolvedAssetId = characterSpec.fallback_asset_id;
      assetLoadStatus = "fallback";
      const fallbackAsset = this.assetCatalog.resolve(resolvedAssetId, "character");
      sourceScene = await this.assetStore.loadScene(fallbackAsset.resolvedUrl);
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

    const model = clone(sourceScene);
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
    root.userData.assetLoadStatus = assetLoadStatus;

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
      assetLoadStatus,
      instanceId: characterSpec.instance_id,
      materials,
      baseY: root.position.y,
      phase: this.entities.length * 1.71,
    };
    this.entities.push(entity);
    return entity;
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

  update(_delta, elapsed) {
    for (const entity of this.entities) {
      const idleAmplitude = entity.spec.behavior?.idle_bob ?? 0.006;
      entity.root.position.y =
        entity.baseY + Math.sin(elapsed * 1.7 + entity.phase) * idleAmplitude;
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
