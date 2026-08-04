import * as THREE from "three";

/**
 * BoothSystem —— 展位大厅的展位渲染与增量同步。
 *
 * 数据契约（docs/ARCHITECTURE.md §4 快照 modules 扩展）：
 *   { id, type: "booth", person_id, position: {x, z, yaw},
 *     display: { name, headline, face_ref, photos[], tags[] } }
 *
 * 资产契约：模板 GLB（module.market-stall.v2）的展示面网格按约定命名——
 *   MESH_NamePlate / MESH_Portrait / MESH_PhotoFrame_01 / MESH_PhotoFrame_02 / MESH_Backdrop
 * 克隆实例时展示面材质独立克隆再贴图（贴图经 integrations.resolveMediaUrl 映射，
 * live → 媒体路由，失败回退占位肖像）；NamePlate/Backdrop 用 CanvasTexture 绘制。
 *
 * 模板 GLB 未到货时 prepare() 自动降级为简易 BoxGeometry 占位展位（同名网格），
 * 贴图/绘制路径完全一致，保证前后端并行开发不阻塞。
 */

export const BOOTH_BLOCKER_RADIUS = 0.9;
export const BOOTH_TEMPLATE_ASSET_ID = "module.market-stall.v2";

const MIN_BOOTH_INTERACTION_RADIUS = 2.15;
const BOOTH_INTERACTION_MARGIN = 0.12;

const ENTRANCE_DURATION = 0.3;
const PLACEHOLDER_PORTRAIT = "portraits/photo-derived/voxel/host.png";
const VOXEL_PORTRAITS = Object.freeze({
  "person-self": "portraits/photo-derived/voxel/host.png",
  "lin-che": "portraits/photo-derived/voxel/person_01.png",
  "zhou-ning": "portraits/photo-derived/voxel/person_02.png",
  "chen-mo": "portraits/photo-derived/voxel/person_03.png",
  "xu-an": "portraits/photo-derived/voxel/person_04.png",
  "su-he": "portraits/photo-derived/voxel/person_05.png",
  "tang-ke": "portraits/photo-derived/voxel/person_06.png",
});
const VILLAGE_MARKET_ENVIRONMENT_ASSET_ID = "environment.village-market.v1";
const DISPLAY_MESH_NAMES = Object.freeze(
  new Set(["MESH_NamePlate", "MESH_Portrait", "MESH_PhotoFrame_01", "MESH_PhotoFrame_02", "MESH_Backdrop"]),
);
const CANVAS_FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';

// mock 快照缺 booth 时的内置演示锚点：小镇 Hub 街道两侧（与 build_hub_town.py PAD_Booth 一致，面向街道中心）
const HUB_BOOTH_SLOTS = Object.freeze([
  Object.freeze({ x: -4.0, z: -12.6, yaw: Math.PI / 2 }),
  Object.freeze({ x: 4.0, z: -12.6, yaw: -Math.PI / 2 }),
  Object.freeze({ x: -4.0, z: -9.7, yaw: Math.PI / 2 }),
  Object.freeze({ x: 4.0, z: -9.7, yaw: -Math.PI / 2 }),
  Object.freeze({ x: -4.0, z: -6.8, yaw: Math.PI / 2 }),
  Object.freeze({ x: 4.0, z: -6.8, yaw: -Math.PI / 2 }),
]);

// 村落 1.0 使用环境 GLB 中现成的六张摊台。坐标由 GLB 包围盒标定；sourceNode 仅用于资产换版复核。
const VILLAGE_MARKET_BOOTH_SLOTS = Object.freeze([
  Object.freeze({ sourceNode: "samor_1112_119", x: 3.236, z: -10.894, yaw: Math.PI, personOffset: 1.7, personLateral: -0.6, blockerRadius: 1.4 }),
  Object.freeze({ sourceNode: "samor_1112_116", x: 0.136, z: -9.634, yaw: Math.PI, personOffset: 1.7, blockerRadius: 1.4 }),
  Object.freeze({ sourceNode: "samor_1112_113", x: 4.886, z: -7.864, yaw: Math.PI, personOffset: 1.7, blockerRadius: 1.4 }),
  Object.freeze({ sourceNode: "samor_1112_184", x: -10.914, z: -4.454, yaw: Math.PI / 2, personOffset: 1.25, blockerRadius: 1.9 }),
  Object.freeze({ sourceNode: "samor_1112_121", x: -9.864, z: 1.206, yaw: Math.PI, personOffset: 1.25, blockerRadius: 1.9 }),
  Object.freeze({ sourceNode: "samor_1112_192", x: -6.394, z: 8.676, yaw: Math.PI, personOffset: 1.6, blockerRadius: 2.05 }),
]);

// 每个摊位的配色变体（雨篷主色 × 车台布色）：按 personId 稳定取色，世界因此「每个摊位不一样」
const BOOTH_COLOR_VARIANTS = Object.freeze([
  Object.freeze({ awning: "#c65f45", cloth: "#5b7ba6" }),
  Object.freeze({ awning: "#3e7a8a", cloth: "#8a9ab0" }),
  Object.freeze({ awning: "#d8913e", cloth: "#6e8a9a" }),
  Object.freeze({ awning: "#8a5a7a", cloth: "#7fa3c4" }),
  Object.freeze({ awning: "#4f7a5a", cloth: "#a68ab0" }),
  Object.freeze({ awning: "#a6534a", cloth: "#5e7b9c" }),
  Object.freeze({ awning: "#5b7ba6", cloth: "#c49a6a" }),
  Object.freeze({ awning: "#7a8a4e", cloth: "#b06a4a" }),
]);
const BOOTH_TINT_MATERIALS = Object.freeze({
  MAT_Stall_AwningRed: "awning",
  MAT_Stall_ClothBlue: "cloth",
});

function boothVariantIndexFor(personId) {
  let hash = 0;
  for (const char of String(personId ?? "")) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return hash % BOOTH_COLOR_VARIANTS.length;
}

// 人物站位在展位正前方（出展人面向访客）；具体摊台可覆盖默认距离。
const PERSON_ANCHOR_OFFSET = 0.85;


export function boothSlotsForEnvironment(environmentAssetId) {
  return environmentAssetId === VILLAGE_MARKET_ENVIRONMENT_ASSET_ID
    ? VILLAGE_MARKET_BOOTH_SLOTS
    : HUB_BOOTH_SLOTS;
}


export function boothInteractionRadius(blockerRadius, visitorRadius = 0) {
  const obstacleRadius = Math.max(0, finiteOr(blockerRadius, BOOTH_BLOCKER_RADIUS));
  const actorRadius = Math.max(0, finiteOr(visitorRadius, 0));
  return Math.max(
    MIN_BOOTH_INTERACTION_RADIUS,
    obstacleRadius + actorRadius + BOOTH_INTERACTION_MARGIN,
  );
}


// 出生即站在自己的展位前：与 buildFallbackBooths 的人↔展位顺序同构
export function fallbackBoothAnchor(index, environmentAssetId = null) {
  const slots = boothSlotsForEnvironment(environmentAssetId);
  const position = slots[index % slots.length];
  const personOffset = position.personOffset ?? PERSON_ANCHOR_OFFSET;
  const personLateral = position.personLateral ?? 0;
  return {
    x: position.x + Math.sin(position.yaw) * personOffset + Math.cos(position.yaw) * personLateral,
    z: position.z + Math.cos(position.yaw) * personOffset - Math.sin(position.yaw) * personLateral,
    yaw: position.yaw,
  };
}

// 用现有 6 人构造演示展位（契约同构的 modules 条目）
export function buildFallbackBooths(people, environmentAssetId = null) {
  const slots = boothSlotsForEnvironment(environmentAssetId);
  return (Array.isArray(people) ? people : []).map((person, index) => {
    const position = slots[index % slots.length];
    return {
      id: `booth_${person.id}`,
      type: "booth",
      person_id: person.id,
      position: {
        x: position.x,
        z: position.z,
        yaw: position.yaw,
        person_offset: position.personOffset ?? PERSON_ANCHOR_OFFSET,
        person_lateral: position.personLateral ?? 0,
        blocker_radius: position.blockerRadius ?? BOOTH_BLOCKER_RADIUS,
      },
      display: {
        name: person.name,
        headline: person.headline ?? [person.role, person.city].filter(Boolean).join(" · "),
        face_ref: person.portrait ?? null,
        photos: person.portrait ? [person.portrait] : [],
        tags: Array.isArray(person.tags) ? person.tags : [],
      },
    };
  });
}


function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}


function normalizeBoothModule(raw) {
  if (!raw || typeof raw !== "object" || raw.type !== "booth") return null;
  const personId = typeof raw.person_id === "string" ? raw.person_id : null;
  if (!personId) return null;
  const x = finiteOr(raw.position?.x, null);
  const z = finiteOr(raw.position?.z, null);
  if (x === null || z === null) return null;
  const personOffset = Math.max(
    0.7,
    finiteOr(raw.position?.person_offset ?? raw.position?.personOffset, PERSON_ANCHOR_OFFSET),
  );
  const personLateral = finiteOr(
    raw.position?.person_lateral ?? raw.position?.personLateral,
    0,
  );
  const blockerRadius = Math.max(
    0.35,
    finiteOr(raw.position?.blocker_radius ?? raw.position?.blockerRadius, BOOTH_BLOCKER_RADIUS),
  );
  return {
    id: typeof raw.id === "string" ? raw.id : `booth_${personId}`,
    personId,
    position: {
      x,
      z,
      yaw: finiteOr(raw.position?.yaw, 0),
      personOffset,
      personLateral,
      blockerRadius,
    },
    display: raw.display && typeof raw.display === "object" ? raw.display : {},
  };
}


function normalizeDisplay(display, personId) {
  // Hall displays are an avatar surface, not a raw-media viewer. Resolve from
  // the current voxel family by person id so stale package refs cannot bring
  // legacy renders (including facts/seed/* images) back into the scene.
  const portraitRef = VOXEL_PORTRAITS[personId] ?? PLACEHOLDER_PORTRAIT;
  return {
    name: typeof display.name === "string" && display.name.trim() ? display.name : personId,
    headline: typeof display.headline === "string" ? display.headline : "",
    faceRef: portraitRef,
    photos: [portraitRef, portraitRef],
    tags: (Array.isArray(display.tags) ? display.tags : [])
      .filter((tag) => typeof tag === "string" && tag.trim())
      .slice(0, 6),
  };
}


function fillRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  ctx.fill();
}


function drawNamePlate(ctx, width, height, { name, headline }) {
  ctx.fillStyle = "#1e3a32";
  fillRoundRect(ctx, 0, 0, width, height, height * 0.18);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f7f1da";
  ctx.font = `800 ${Math.round(height * (headline ? 0.38 : 0.5))}px ${CANVAS_FONT}`;
  ctx.fillText(name, width / 2, headline ? height * 0.33 : height * 0.5, width * 0.9);
  if (headline) {
    ctx.fillStyle = "#d8c98f";
    ctx.font = `500 ${Math.round(height * 0.19)}px ${CANVAS_FONT}`;
    ctx.fillText(headline, width / 2, height * 0.74, width * 0.88);
  }
}


function drawBackdrop(ctx, width, height, { tags }) {
  ctx.fillStyle = "#f2ecdc";
  ctx.fillRect(0, 0, width, height);
  const pad = Math.round(width * 0.07);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#7a6f55";
  ctx.font = `600 ${Math.round(height * 0.055)}px ${CANVAS_FONT}`;
  ctx.fillText("AI 推断的兴趣标签", pad, pad * 0.9);

  const chipFont = `700 ${Math.round(height * 0.075)}px ${CANVAS_FONT}`;
  const chipHeight = Math.round(height * 0.14);
  const chipPadX = Math.round(chipHeight * 0.45);
  const gap = Math.round(height * 0.035);
  let cursorX = pad;
  let cursorY = pad * 1.6;
  ctx.font = chipFont;
  for (const tag of tags) {
    const label = `AI·${tag}`;
    const chipWidth = Math.ceil(ctx.measureText(label).width) + chipPadX * 2;
    if (cursorX + chipWidth > width - pad) {
      cursorX = pad;
      cursorY += chipHeight + gap;
    }
    if (cursorY + chipHeight > height - pad * 0.5) break;
    ctx.fillStyle = "#dde7da";
    fillRoundRect(ctx, cursorX, cursorY, chipWidth, chipHeight, chipHeight / 2);
    ctx.fillStyle = "#1f5047";
    ctx.fillText(label, cursorX + chipPadX, cursorY + chipHeight / 2 + 1);
    cursorX += chipWidth + gap;
  }
  if (tags.length === 0) {
    ctx.fillStyle = "#a89f83";
    ctx.font = `500 ${Math.round(height * 0.06)}px ${CANVAS_FONT}`;
    ctx.fillText("标签整理中", pad, pad * 1.6 + chipHeight / 2);
  }
}


function makeCanvasForMesh(mesh) {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  const width3d = box ? box.max.x - box.min.x : 1;
  const height3d = box ? box.max.y - box.min.y : 1;
  const aspect = height3d > 0 ? width3d / height3d : 2;
  const width = 512;
  const height = Math.round(THREE.MathUtils.clamp(width / aspect, 128, 1024));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d"), width, height };
}


// The booth contract has one visitor-facing side. Turn imported display planes
// toward that side once and render FrontSide only; duplicate coplanar back faces
// caused mirrored text, upside-down UVs and z-fighting.
function orientDisplayTowardVisitor(mesh) {
  mesh.material.side = THREE.FrontSide;
  mesh.material.needsUpdate = true;
  mesh.rotateY(Math.PI);
}


// 村落已有实体摊台时仅补资料板；资产加载失败时仍可生成带台箱的完整兜底展位。
function buildFallbackTemplate({ includeCounter = true } = {}) {
  const group = new THREE.Group();
  group.name = "BOOTH_TemplateFallback";
  const wood = new THREE.MeshStandardMaterial({ color: "#8a6a4a", roughness: 0.9 });
  const board = new THREE.MeshStandardMaterial({ color: "#2a4a40", roughness: 0.85 });
  const displayMaterial = () =>
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92 });

  const boardZ = includeCounter ? -0.46 : -1.45;
  const displayZ = boardZ + 0.045;
  const backdrop3d = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.3, 0.08), board);
  backdrop3d.name = "MESH_BackdropBoard";
  backdrop3d.position.set(0, 1.32, boardZ);

  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.6), displayMaterial());
  backdrop.name = "MESH_Backdrop";
  backdrop.position.set(0, 1.1, displayZ);
  const namePlate = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.44), displayMaterial());
  namePlate.name = "MESH_NamePlate";
  namePlate.position.set(0, 2.2, displayZ);
  const portrait = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.72), displayMaterial());
  portrait.name = "MESH_Portrait";
  portrait.position.set(-0.55, 1.15, displayZ + 0.005);
  const photo1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), displayMaterial());
  photo1.name = "MESH_PhotoFrame_01";
  photo1.position.set(0.48, 1.45, displayZ + 0.005);
  const photo2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), displayMaterial());
  photo2.name = "MESH_PhotoFrame_02";
  photo2.position.set(0.48, 0.95, displayZ + 0.005);

  if (includeCounter) {
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.95, 0.6), wood);
    counter.name = "MESH_FallbackCounter";
    counter.position.set(0, 0.475, 0.38);
    group.add(counter);
  } else {
    wood.dispose();
  }
  group.add(backdrop3d, backdrop, namePlate, portrait, photo1, photo2);
  return group;
}


export class BoothSystem {
  constructor({ scene, assetStore, assetCatalog, resolveMediaUrl, placeholderRef = PLACEHOLDER_PORTRAIT, templateAssetId = BOOTH_TEMPLATE_ASSET_ID }) {
    this.scene = scene;
    this.assetStore = assetStore;
    this.assetCatalog = assetCatalog;
    this.resolveMediaUrl =
      typeof resolveMediaUrl === "function" ? resolveMediaUrl : (ref) => String(ref ?? "");
    this.placeholderRef = placeholderRef;
    this.templateAssetId = templateAssetId;
    this.template = null;
    this.booths = new Map();
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();
  }

  async prepare() {
    if (!this.templateAssetId) {
      this.template = buildFallbackTemplate({ includeCounter: false });
      return this;
    }
    try {
      const asset = this.assetCatalog.resolve(this.templateAssetId, "environment-module");
      this.template = await this.assetStore.loadScene(asset.resolvedUrl);
    } catch (error) {
      console.warn(`[BoothSystem] 展位模板 ${this.templateAssetId} 未就绪，使用简易占位展位`, error);
      this.template = buildFallbackTemplate();
    }
    return this;
  }

  // 快照 modules 增量同步：新 booth 建实例（0.3s 缩放入场）、display 变化重贴、消失则移除
  sync(modules) {
    if (!this.template) return 0;
    const seen = new Set();
    for (const raw of Array.isArray(modules) ? modules : []) {
      const booth = normalizeBoothModule(raw);
      if (!booth || seen.has(booth.id)) continue;
      seen.add(booth.id);
      const existing = this.booths.get(booth.id);
      if (existing) this.#refresh(existing, booth);
      else this.#add(booth);
    }
    for (const [boothId, record] of [...this.booths]) {
      if (!seen.has(boothId)) this.#remove(record);
    }
    return seen.size;
  }

  update(delta) {
    for (const record of this.booths.values()) {
      if (record.entrance >= 1) continue;
      record.entrance = Math.min(1, record.entrance + delta / ENTRANCE_DURATION);
      const eased = 1 - Math.pow(1 - record.entrance, 3);
      record.root.scale.setScalar(0.01 + 0.99 * eased);
    }
  }

  get blockers() {
    return [...this.booths.values()].map((record) => ({
      id: record.id,
      personId: record.personId,
      x: record.position.x,
      z: record.position.z,
      radius: record.position.blockerRadius,
    }));
  }

  get pickRoots() {
    return [...this.booths.values()].map((record) => record.root);
  }

  get readablePanelCount() {
    let count = 0;
    for (const record of this.booths.values()) count += record.displayMaterials.length;
    return count;
  }

  boothForPerson(personId) {
    for (const record of this.booths.values()) {
      if (record.personId === personId) return record;
    }
    return null;
  }

  // 出展人站位锚点：展位正前方，按摊台深度保留不穿模距离，朝向与展位一致。
  personAnchorFor(personId) {
    const record = this.boothForPerson(personId);
    if (!record) return null;
    const { x, z, yaw, personOffset, personLateral } = record.position;
    return {
      x: x + Math.sin(yaw) * personOffset + Math.cos(yaw) * personLateral,
      z: z + Math.cos(yaw) * personOffset - Math.sin(yaw) * personLateral,
      yaw,
    };
  }

  #add(booth) {
    const root = this.template.clone(true);
    root.name = `BOOTH_${booth.id}`;
    root.position.set(booth.position.x, 0, booth.position.z);
    root.rotation.set(0, booth.position.yaw, 0);
    root.scale.setScalar(0.01);
    root.userData.personId = booth.personId;
    root.userData.boothId = booth.id;
    // 每摊位配色变体：雨篷/车台布材质独立克隆后换色（personId 稳定取色）
    const variant = BOOTH_COLOR_VARIANTS[boothVariantIndexFor(booth.personId)];
    const displayMaterials = [];
    const displayMeshes = [];
    root.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const tintKey = BOOTH_TINT_MATERIALS[object.material?.name];
      if (tintKey) {
        object.material = object.material.clone();
        object.material.color.set(variant[tintKey]);
      }
      if (DISPLAY_MESH_NAMES.has(object.name)) {
        object.material = object.material.clone();
        displayMaterials.push(object.material);
        displayMeshes.push(object);
      }
    });
    for (const mesh of displayMeshes) {
      orientDisplayTowardVisitor(mesh);
    }
    // hover 提示地环（初始隐藏，setHighlighted 控制）
    const hoverRing = new THREE.Mesh(
      new THREE.RingGeometry(
        booth.position.blockerRadius + 0.06,
        booth.position.blockerRadius + 0.2,
        40,
      ),
      new THREE.MeshBasicMaterial({
        color: "#f2c55f",
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    hoverRing.name = "BOOTH_HoverRing";
    hoverRing.rotation.x = -Math.PI * 0.5;
    hoverRing.position.y = 0.02;
    hoverRing.renderOrder = 4;
    hoverRing.visible = false;
    root.add(hoverRing);
    const record = {
      id: booth.id,
      personId: booth.personId,
      position: booth.position,
      root,
      displayMaterials,
      ownedTextures: new Map(),
      displaySignature: null,
      displayName: null,
      displayHeadline: null,
      hoverRing,
      namePlate: root.getObjectByName("MESH_NamePlate") ?? null,
      entrance: 0,
    };
    this.#applyDisplay(record, booth.display);
    this.scene.add(root);
    this.booths.set(booth.id, record);
    return record;
  }

  #refresh(record, booth) {
    record.personId = booth.personId;
    record.position = booth.position;
    record.root.position.set(booth.position.x, 0, booth.position.z);
    record.root.rotation.set(0, booth.position.yaw, 0);
    record.root.userData.personId = booth.personId;
    this.#applyDisplay(record, booth.display);
  }

  #remove(record) {
    record.root.removeFromParent();
    record.hoverRing?.geometry.dispose();
    record.hoverRing?.material.dispose();
    for (const texture of record.ownedTextures.values()) texture.dispose();
    for (const material of record.displayMaterials) material.dispose();
    this.booths.delete(record.id);
  }

  // hover 高亮：展示面 emissive 增强 + 地环 + 名牌放大（仅动 per-booth 独立材质，共享材质不受影响）
  setHighlighted(record, highlighted) {
    if (!record) return;
    for (const material of record.displayMaterials) {
      material.emissive?.set(highlighted ? "#4a3d20" : "#000000");
    }
    if (record.hoverRing) record.hoverRing.visible = highlighted;
    if (record.namePlate) {
      const scale = highlighted ? 1.15 : 1;
      record.namePlate.scale.setScalar(scale);
    }
  }

  #applyDisplay(record, rawDisplay) {
    const display = normalizeDisplay(rawDisplay, record.personId);
    record.displayName = display.name;
    record.displayHeadline = display.headline;
    const signature = JSON.stringify(display);
    if (signature === record.displaySignature) return;
    record.displaySignature = signature;
    this.#retexture(record, "MESH_Portrait", display.faceRef);
    this.#retexture(record, "MESH_PhotoFrame_01", display.photos[0]);
    this.#retexture(record, "MESH_PhotoFrame_02", display.photos[1]);
    this.#drawPanel(record, "MESH_NamePlate", (ctx, width, height) =>
      drawNamePlate(ctx, width, height, display),
    );
    this.#drawPanel(record, "MESH_Backdrop", (ctx, width, height) =>
      drawBackdrop(ctx, width, height, display),
    );
  }

  #retexture(record, meshName, ref) {
    const mesh = record.root.getObjectByName(meshName);
    if (!mesh) return;
    const sourceRef = ref || this.placeholderRef;
    this.#loadTexture(sourceRef, (texture) => {
      this.#setDisplayTexture(mesh, texture);
    });
  }

  #loadTexture(ref, onReady, isFallback = false) {
    const url = this.resolveMediaUrl(ref);
    if (!url) return;
    const cached = this.textureCache.get(url);
    if (cached) {
      onReady(cached);
      return;
    }
    this.textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        this.textureCache.set(url, texture);
        onReady(texture);
      },
      undefined,
      () => {
        if (!isFallback && ref !== this.placeholderRef) {
          console.warn(`[BoothSystem] 贴图加载失败，回退占位肖像：${ref}`);
          this.#loadTexture(this.placeholderRef, onReady, true);
        }
      },
    );
  }

  #drawPanel(record, meshName, paint) {
    const mesh = record.root.getObjectByName(meshName);
    if (!mesh) return;
    const { canvas, ctx, width, height } = makeCanvasForMesh(mesh);
    paint(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const previous = record.ownedTextures.get(meshName);
    if (previous) previous.dispose();
    record.ownedTextures.set(meshName, texture);
    this.#setDisplayTexture(mesh, texture);
  }

  #setDisplayTexture(mesh, texture) {
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
  }
}
