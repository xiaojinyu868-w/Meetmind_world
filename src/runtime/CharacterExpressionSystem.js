import * as THREE from "three";
import { publicUrl } from "./WorldSpec.js";


export const CHARACTER_EXPRESSIONS = Object.freeze([
  "neutral",
  "happy",
  "surprised",
  "thinking",
]);

const EXPRESSION_SET = new Set(CHARACTER_EXPRESSIONS);
const SLOT_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

const VARIANT_CONFIG = Object.freeze({
  voxel: Object.freeze({
    directory: "textures/characters/voxel/expressions",
    filter: "nearest",
  }),
});


function normalizedVariantId(variantId) {
  const normalized = String(variantId ?? "").toLowerCase().replace(/[_-]/g, "");
  if (normalized === "voxel") return "voxel";
  return null;
}


function assetSlot(resolvedAssetId) {
  const match = String(resolvedAssetId ?? "").match(
    /(?:^|\.)((?:person_\d+)|host)(?:\.|$)/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}


function expressionSlot(entity, personId) {
  const candidates = [
    entity?.expressionSlot,
    entity?.spec?.expression_slot,
    entity?.spec?.expression?.slot,
    entity?.root?.userData?.expressionSlot,
    assetSlot(entity?.resolvedAssetId),
    personId,
  ];
  const slot = candidates
    .map((candidate) => String(candidate ?? "").trim())
    .find((candidate) => SLOT_PATTERN.test(candidate));
  return slot ?? null;
}


function materialList(object) {
  if (!object?.isMesh || !object.material) return [];
  return Array.isArray(object.material) ? object.material : [object.material];
}


function expressionTargets(entity, variantId) {
  const targets = new Set();
  entity?.model?.traverse?.((object) => {
    for (const material of materialList(object)) {
      if (!material?.map) continue;
      const materialName = String(material.name ?? "");
      if (/voxelatlas/i.test(materialName) || object.name === "GEO_Head") {
        targets.add(material);
      }
    }
  });
  return [...targets].map((material) => ({ material, originalMap: material.map }));
}


function configureTexture(texture, filter) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;
  if (filter === "nearest") {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;
  } else {
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
  }
  texture.needsUpdate = true;
  return texture;
}


function restoreOriginalMaps(record) {
  for (const target of record.targets) {
    target.material.map = target.originalMap;
    target.material.needsUpdate = true;
  }
}


export class CharacterExpressionSystem {
  constructor({
    textureLoader = new THREE.TextureLoader(),
    resolveUrl = publicUrl,
    logger = console,
  } = {}) {
    this.textureLoader = textureLoader;
    this.resolveUrl = resolveUrl;
    this.logger = logger;
    this.records = new Map();
    this.textureCache = new Map();
    this.warnedUrls = new Set();
    this.disposed = false;
  }

  register(entity, personId, variantId) {
    if (this.disposed) return false;
    const id = String(personId ?? "").trim();
    const variant = normalizedVariantId(variantId);
    const slot = expressionSlot(entity, id);
    if (!id || !variant || !slot) return false;

    const targets = expressionTargets(entity, variant);
    if (targets.length === 0) {
      this.logger.warn?.(
        `No ${variant} expression material found for ${id}; expressions are disabled`,
      );
      return false;
    }

    this.unregister(id);
    const record = {
      entity,
      personId: id,
      variant,
      slot,
      targets,
      expressionRefs: entity?.spec?.expression_refs ?? null,
      state: "neutral",
      requestedState: "neutral",
      requestVersion: 0,
    };
    entity.root.userData.expression = "neutral";
    entity.root.userData.expressionVariant = variant;
    entity.root.userData.expressionSlot = slot;
    this.records.set(id, record);
    return true;
  }

  unregister(personId) {
    const id = String(personId ?? "").trim();
    const record = this.records.get(id);
    if (!record) return false;
    record.requestVersion += 1;
    restoreOriginalMaps(record);
    if (record.entity?.root?.userData) {
      delete record.entity.root.userData.expression;
      delete record.entity.root.userData.expressionVariant;
    }
    this.records.delete(id);
    return true;
  }

  async setExpression(personId, state) {
    if (this.disposed || !EXPRESSION_SET.has(state)) return false;
    const record = this.records.get(String(personId ?? "").trim());
    if (!record) return false;

    const requestVersion = ++record.requestVersion;
    record.requestedState = state;
    let texture = await this.#loadExpressionTexture(record, state);
    let appliedState = state;

    if (!texture && state !== "neutral") {
      texture = await this.#loadExpressionTexture(record, "neutral");
      appliedState = "neutral";
    }
    if (this.disposed || requestVersion !== record.requestVersion) return false;

    if (texture) {
      for (const target of record.targets) {
        target.material.map = texture;
        target.material.needsUpdate = true;
      }
    } else {
      restoreOriginalMaps(record);
      appliedState = "neutral";
    }

    record.state = appliedState;
    record.entity.root.userData.expression = appliedState;
    return appliedState === state;
  }

  getExpression(personId) {
    return this.records.get(String(personId ?? "").trim())?.state ?? null;
  }

  getRequestedExpression(personId) {
    return this.records.get(String(personId ?? "").trim())?.requestedState ?? null;
  }

  has(personId) {
    return this.records.has(String(personId ?? "").trim());
  }

  dispose() {
    if (this.disposed) return;
    for (const record of this.records.values()) {
      record.requestVersion += 1;
      restoreOriginalMaps(record);
      if (record.entity?.root?.userData) {
        delete record.entity.root.userData.expression;
        delete record.entity.root.userData.expressionVariant;
      }
    }
    this.records.clear();
    this.disposed = true;

    for (const pending of this.textureCache.values()) {
      Promise.resolve(pending).then((texture) => texture?.dispose());
    }
    this.textureCache.clear();
    this.warnedUrls.clear();
  }

  #textureUrl(record, state) {
    const externalUrl = record.expressionRefs?.[state];
    if (typeof externalUrl === "string" && externalUrl.trim()) {
      return externalUrl;
    }
    const config = VARIANT_CONFIG[record.variant];
    return this.resolveUrl(`${config.directory}/${record.slot}_${state}.png`);
  }

  #loadExpressionTexture(record, state) {
    const config = VARIANT_CONFIG[record.variant];
    const url = this.#textureUrl(record, state);
    if (!this.textureCache.has(url)) {
      const pending = this.textureLoader
        .loadAsync(url)
        .then((texture) => {
          if (this.disposed) {
            texture.dispose();
            return null;
          }
          texture.name = `Expression_${record.variant}_${record.slot}_${state}`;
          return configureTexture(texture, config.filter);
        })
        .catch((error) => {
          if (!this.warnedUrls.has(url)) {
            this.warnedUrls.add(url);
            this.logger.warn?.(`Expression texture unavailable: ${url}`, error);
          }
          return null;
        });
      this.textureCache.set(url, pending);
    }
    return this.textureCache.get(url);
  }
}
