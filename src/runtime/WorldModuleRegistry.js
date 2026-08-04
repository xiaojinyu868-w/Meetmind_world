import { publicUrl } from "./WorldSpec.js";

const SCHEMA = "echo-world-modules.v1";
const ALLOWED_KINDS = new Set(["venue", "dynamic-field"]);
const ALLOWED_STATUS = new Set(["available", "reserved"]);

export class WorldModuleRegistry {
  constructor(modules) {
    this.modules = Object.freeze(modules.map((module) => Object.freeze(module)));
  }

  static async load(url = publicUrl("data/world-modules.json")) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`世界模块清单加载失败：HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.schema !== SCHEMA || !Array.isArray(payload.modules)) {
      throw new Error(`世界模块清单必须符合 ${SCHEMA}`);
    }
    const ids = new Set();
    for (const module of payload.modules) {
      if (!module?.id || ids.has(module.id)) throw new Error(`世界模块 id 无效或重复：${module?.id}`);
      if (!ALLOWED_KINDS.has(module.kind)) throw new Error(`未知世界模块 kind：${module.kind}`);
      if (!ALLOWED_STATUS.has(module.status)) throw new Error(`未知世界模块 status：${module.status}`);
      if (!module.mount?.world || !module.entry?.world || !module.interaction?.verb) {
        throw new Error(`世界模块 ${module.id} 缺少 mount/entry/interaction 契约`);
      }
      ids.add(module.id);
    }
    return new WorldModuleRegistry(payload.modules);
  }

  availableIn(worldId) {
    return this.modules.filter((module) => module.mount.world === worldId && module.status === "available");
  }

  byId(moduleId) {
    return this.modules.find((module) => module.id === moduleId) ?? null;
  }
}
