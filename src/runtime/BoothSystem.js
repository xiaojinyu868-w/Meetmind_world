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

const ENTRANCE_DURATION = 0.3;
const PLACEHOLDER_PORTRAIT = "portraits/person-self.png";
const DISPLAY_MESH_NAMES = Object.freeze(
  new Set(["MESH_NamePlate", "MESH_Portrait", "MESH_PhotoFrame_01", "MESH_PhotoFrame_02", "MESH_Backdrop"]),
);
const CANVAS_FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';

// mock 快照缺 booth 时的内置演示锚点：集市街道两侧两排，面向街道中心（间距 4m ≥ 2.2m 约定）
const FALLBACK_BOOTH_POSITIONS = Object.freeze([
  Object.freeze({ x: -3.5, z: -5, yaw: Math.PI / 2 }),
  Object.freeze({ x: 3.5, z: -5, yaw: -Math.PI / 2 }),
  Object.freeze({ x: -3.5, z: -1, yaw: Math.PI / 2 }),
  Object.freeze({ x: 3.5, z: -1, yaw: -Math.PI / 2 }),
  Object.freeze({ x: -3.5, z: 3, yaw: Math.PI / 2 }),
  Object.freeze({ x: 3.5, z: 3, yaw: -Math.PI / 2 }),
]);

// 人物站位在展位正前方（出展人面向访客），与展位中心保持 0.85m
const PERSON_ANCHOR_OFFSET = 0.85;


// 出生即站在自己的展位前：与 buildFallbackBooths 的人↔展位顺序同构
export function fallbackBoothAnchor(index) {
  const position = FALLBACK_BOOTH_POSITIONS[index % FALLBACK_BOOTH_POSITIONS.length];
  return {
    x: position.x + Math.sin(position.yaw) * PERSON_ANCHOR_OFFSET,
    z: position.z + Math.cos(position.yaw) * PERSON_ANCHOR_OFFSET,
    yaw: position.yaw,
  };
}

// 用现有 6 人构造演示展位（契约同构的 modules 条目）
export function buildFallbackBooths(people) {
  return (Array.isArray(people) ? people : []).map((person, index) => {
    const position = FALLBACK_BOOTH_POSITIONS[index % FALLBACK_BOOTH_POSITIONS.length];
    return {
      id: `booth_${person.id}`,
      type: "booth",
      person_id: person.id,
      position: { ...position },
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
  return {
    id: typeof raw.id === "string" ? raw.id : `booth_${personId}`,
    personId,
    position: { x, z, yaw: finiteOr(raw.position?.yaw, 0) },
    display: raw.display && typeof raw.display === "object" ? raw.display : {},
  };
}


function normalizeDisplay(display, personId) {
  return {
    name: typeof display.name === "string" && display.name.trim() ? display.name : personId,
    headline: typeof display.headline === "string" ? display.headline : "",
    faceRef: typeof display.face_ref === "string" ? display.face_ref : null,
    photos: (Array.isArray(display.photos) ? display.photos : [])
      .filter((ref) => typeof ref === "string" && ref.trim())
      .slice(0, 2),
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


// GLB 展示材质是 doubleSided；直接从背面观看会把文字/照片镜像。
// 改为两张方向相反的 FrontSide 平面，让摊位内外两侧都保持自然阅读方向。
function addReadableBackFace(mesh) {
  mesh.material.side = THREE.FrontSide;
  mesh.material.needsUpdate = true;
  const back = new THREE.Mesh(mesh.geometry, mesh.material.clone());
  back.name = `${mesh.name}_ReadableBack`;
  back.position.copy(mesh.position);
  back.quaternion.copy(mesh.quaternion);
  back.scale.copy(mesh.scale);
  back.rotateY(Math.PI);
  back.material.side = THREE.FrontSide;
  back.material.needsUpdate = true;
  back.castShadow = false;
  back.receiveShadow = false;
  back.userData.displaySource = mesh.name;
  mesh.parent.add(back);
  return back;
}


// 模板 GLB 未到货时的简易占位展位：展示面网格同名，贴图/绘制路径一致
function buildFallbackTemplate() {
  const group = new THREE.Group();
  group.name = "BOOTH_TemplateFallback";
  const wood = new THREE.MeshStandardMaterial({ color: "#8a6a4a", roughness: 0.9 });
  const board = new THREE.MeshStandardMaterial({ color: "#2a4a40", roughness: 0.85 });
  const displayMaterial = () =>
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92 });

  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.95, 0.6), wood);
  counter.position.set(0, 0.475, 0.38);
  const backdrop3d = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.3, 0.08), board);
  backdrop3d.position.set(0, 1.32, -0.46);

  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.6), displayMaterial());
  backdrop.name = "MESH_Backdrop";
  backdrop.position.set(0, 1.1, -0.415);
  const namePlate = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.44), displayMaterial());
  namePlate.name = "MESH_NamePlate";
  namePlate.position.set(0, 2.2, -0.415);
  const portrait = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.72), displayMaterial());
  portrait.name = "MESH_Portrait";
  portrait.position.set(-0.55, 1.15, -0.41);
  const photo1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), displayMaterial());
  photo1.name = "MESH_PhotoFrame_01";
  photo1.position.set(0.48, 1.45, -0.41);
  const photo2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), displayMaterial());
  photo2.name = "MESH_PhotoFrame_02";
  photo2.position.set(0.48, 0.95, -0.41);

  group.add(counter, backdrop3d, backdrop, namePlate, portrait, photo1, photo2);
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
      x: record.position.x,
      z: record.position.z,
      radius: BOOTH_BLOCKER_RADIUS,
    }));
  }

  get pickRoots() {
    return [...this.booths.values()].map((record) => record.root);
  }

  get readablePanelCount() {
    let count = 0;
    for (const record of this.booths.values()) count += record.displayBacks.size;
    return count;
  }

  boothForPerson(personId) {
    for (const record of this.booths.values()) {
      if (record.personId === personId) return record;
    }
    return null;
  }

  // 出展人站位锚点：展位正前方 PERSON_ANCHOR_OFFSET 处，朝向与展位一致（面向访客）
  personAnchorFor(personId) {
    const record = this.boothForPerson(personId);
    if (!record) return null;
    const { x, z, yaw } = record.position;
    return {
      x: x + Math.sin(yaw) * PERSON_ANCHOR_OFFSET,
      z: z + Math.cos(yaw) * PERSON_ANCHOR_OFFSET,
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
    const displayMaterials = [];
    const displayMeshes = [];
    root.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (DISPLAY_MESH_NAMES.has(object.name)) {
        object.material = object.material.clone();
        displayMaterials.push(object.material);
        displayMeshes.push(object);
      }
    });
    const displayBacks = new Map();
    for (const mesh of displayMeshes) {
      const back = addReadableBackFace(mesh);
      displayBacks.set(mesh.name, back);
      displayMaterials.push(back.material);
    }
    // hover 提示地环（初始隐藏，setHighlighted 控制）
    const hoverRing = new THREE.Mesh(
      new THREE.RingGeometry(BOOTH_BLOCKER_RADIUS + 0.06, BOOTH_BLOCKER_RADIUS + 0.2, 40),
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
      displayBacks,
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
      record.displayBacks.get("MESH_NamePlate")?.scale.setScalar(scale);
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
    if (!mesh || !ref) return;
    this.#loadTexture(ref, (texture) => {
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;
      const back = record.displayBacks.get(meshName);
      if (back) {
        back.material.map = texture;
        back.material.needsUpdate = true;
      }
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
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
    const back = record.displayBacks.get(meshName);
    if (back) {
      back.material.map = texture;
      back.material.needsUpdate = true;
    }
  }
}
