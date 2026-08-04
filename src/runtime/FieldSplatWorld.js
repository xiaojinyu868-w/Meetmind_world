import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

// Marble SPZ splat 资产坐标系为 marble_raw_opencv：官方查看器对 splat 统一
// 绕 X 轴旋转 180°（见 docs.worldlabs.ai「Rendering Marble SPZ files in
// third-party engines」）。**collider GLB 不翻**——它是面向引擎导出的标准
// Y-up glTF（2026-08-04 实测：对其再翻转会让人站在"地形背面"、脚踩天空）。
const SPLAT_FLIP_QUATERNION = new THREE.Quaternion(1, 0, 0, 0);

// 对齐目标：可行走区域（朝上三角面的 XZ 分布）映射到这个尺度，而不是包围盒——
// Marble 世界的包围盒常含天空/地裙，bbox 定中会把内容甩到远处（2026-08-04 教训）
const WALK_TARGET_EXTENT_METERS = 18;
const FIT_CLAMP = { min: 0.05, max: 40 };
const UP_NORMAL_MIN = 0.85;
const LOAD_TIMEOUT_MS = 90000;

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} 加载超时`)), LOAD_TIMEOUT_MS);
    }),
  ]);
}

function pickSplatQuality(world) {
  const spz = world.spz ?? {};
  // 触屏/低核数设备走 100k 轻量档，桌面优先 500k
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const lowCore = (navigator.hardwareConcurrency ?? 8) <= 4;
  if ((coarse || lowCore) && spz["100k"]) return "100k";
  if (spz["500k"]) return "500k";
  if (spz["100k"]) return "100k";
  return null;
}

/**
 * 从 collider 三角形实测可行走面（绕 X 翻转后的坐标系）：
 * 取法线朝上（normal.y > UP_NORMAL_MIN）的三角面，面积加权求地面高度，
 * XZ 用 5%~95% 分位数求可行走范围与中心（抗天空/地裙离群面）。
 * 返回 { groundY, centerX, centerZ, extent, spawn }（均为翻转后、未缩放的坐标）。
 */
export function analyzeWalkableSurface(colliderScene) {
  colliderScene.updateMatrixWorld(true);
  const va = new THREE.Vector3(); const vb = new THREE.Vector3(); const vc = new THREE.Vector3();
  const ab = new THREE.Vector3(); const ac = new THREE.Vector3(); const n = new THREE.Vector3();
  const faces = [];
  let areaSum = 0;
  let groundYSum = 0;
  colliderScene.traverse((object) => {
    if (!object.isMesh) return;
    const pos = object.geometry?.attributes?.position;
    if (!pos) return;
    const index = object.geometry.index;
    const triCount = index ? index.count / 3 : pos.count / 3;
    for (let t = 0; t < triCount; t += 1) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
      va.fromBufferAttribute(pos, i0).applyMatrix4(object.matrixWorld);
      vb.fromBufferAttribute(pos, i1).applyMatrix4(object.matrixWorld);
      vc.fromBufferAttribute(pos, i2).applyMatrix4(object.matrixWorld);
      ab.subVectors(vb, va); ac.subVectors(vc, va);
      n.crossVectors(ab, ac);
      const doubleArea = n.length();
      if (doubleArea < 1e-8) continue;
      n.normalize();
      if (n.y < UP_NORMAL_MIN) continue;
      const area = doubleArea / 2;
      const cx = (va.x + vb.x + vc.x) / 3;
      const cy = (va.y + vb.y + vc.y) / 3;
      const cz = (va.z + vb.z + vc.z) / 3;
      faces.push({ area, x: cx, y: cy, z: cz });
      areaSum += area;
      groundYSum += area * cy;
    }
  });
  if (!faces.length || areaSum <= 0) return null;
  faces.sort((a, b) => a.x - b.x);
  const pick = (key, q) => {
    const sorted = [...faces].sort((a, b) => a[key] - b[key]);
    const target = areaSum * q;
    let acc = 0;
    for (const face of sorted) {
      acc += face.area;
      if (acc >= target) return face[key];
    }
    return sorted[sorted.length - 1][key];
  };
  const x05 = pick("x", 0.05); const x95 = pick("x", 0.95);
  const z05 = pick("z", 0.05); const z95 = pick("z", 0.95);
  const centerX = pick("x", 0.5); const centerZ = pick("z", 0.5);
  const groundY = groundYSum / areaSum;
  const extent = Math.max(x95 - x05, z95 - z05, 1e-3);
  // 出生点：面积最大且靠近可行走中心的面（站在真实地面上，面向场域中心）
  let spawn = null;
  for (const face of [...faces].sort((a, b) => b.area - a.area).slice(0, 200)) {
    const dist = Math.hypot(face.x - centerX, face.z - centerZ);
    if (!spawn || dist < spawn.dist) spawn = { x: face.x, z: face.z, dist };
  }
  return { groundY, centerX, centerZ, extent, spawn };
}

/**
 * 尝试用 Spark 渲染场域的 Marble splat 世界（FR-2.11 升级）。
 *
 * field.world.status === "ready" 时加载 .spz（Spark SplatMesh）+ collider GLB
 * （碰撞/地面射线目标，GROUND_ 前缀组供 configureWorld 收集）。对齐全部几何驱动：
 * 可行走面定中、地面落 y=0、按可行走范围缩放，返回
 * { root, groundGroup, quality, spawnHint, dispose }；world 缺失/未就绪返回 null，
 * 加载失败抛错由调用方回退程序化场域。
 */
export async function tryLoadFieldSplatWorld({
  scene,
  renderer,
  field,
  assetStore,
  resolveMediaUrl,
  onProgress = null,
}) {
  const world = field?.world;
  if (!world || world.status !== "ready" || !world.spz || !world.collider_ref) {
    return null;
  }
  const quality = pickSplatQuality(world);
  if (!quality) return null;
  const resolve = typeof resolveMediaUrl === "function" ? resolveMediaUrl : (ref) => ref;

  const sparkRenderer = new SparkRenderer({ renderer });
  sparkRenderer.name = "SPARK_FieldRenderer";
  scene.add(sparkRenderer);

  const splat = new SplatMesh({
    url: resolve(world.spz[quality]),
    onProgress: (event) => {
      if (!onProgress || !event?.lengthComputable || !event.total) return;
      onProgress(0.15 + 0.55 * Math.min(1, event.loaded / event.total),
        "正在载入关系场域世界");
    },
  });
  splat.name = "SPLAT_FieldWorld";
  await withTimeout(splat.initialized, "splat 世界");

  const colliderScene = await withTimeout(
    assetStore.loadScene(resolve(world.collider_ref)), "场域碰撞网格");
  const groundGroup = new THREE.Group();
  groundGroup.name = "GROUND_FieldCollider";
  groundGroup.add(colliderScene);
  groundGroup.traverse((object) => {
    if (object.isMesh) object.visible = false; // 只做射线目标，不参与渲染
  });

  // 几何驱动对齐（翻转后坐标系）：可行走面中心 → 原点，地面 → y=0，
  // 可行走范围 → WALK_TARGET_EXTENT_METERS
  const walk = analyzeWalkableSurface(colliderScene);
  const metricGroup = new THREE.Group();
  metricGroup.name = "WORLD_MarbleSplat";
  const splatGroup = new THREE.Group();
  splatGroup.name = "SPLAT_Flipped";
  splatGroup.quaternion.copy(SPLAT_FLIP_QUATERNION); // 只有 splat 翻转
  let spawnHint = null;
  if (walk) {
    const scale = THREE.MathUtils.clamp(
      WALK_TARGET_EXTENT_METERS / walk.extent, FIT_CLAMP.min, FIT_CLAMP.max);
    // collider 为原生 Y-up：splat 翻转后与 collider 同帧（collider = flip(splat_raw)），
    // 两组共用同一 scale/position 即对齐
    for (const group of [metricGroup, splatGroup]) {
      group.scale.setScalar(scale);
      group.position.set(
        -walk.centerX * scale,
        -walk.groundY * scale,
        -walk.centerZ * scale,
      );
    }
    if (walk.spawn) {
      spawnHint = {
        x: (walk.spawn.x - walk.centerX) * scale,
        z: (walk.spawn.z - walk.centerZ) * scale,
        yaw: Math.atan2(walk.centerX - walk.spawn.x, walk.centerZ - walk.spawn.z),
      };
    }
  } else {
    // collider 无可用地面（异常资产）：不缩放不定中，交给安全网兜底
    console.warn("[FieldSplatWorld] collider 无可行走面，使用单位变换");
  }
  splatGroup.add(splat);
  metricGroup.add(splatGroup);
  metricGroup.add(groundGroup);

  const root = new THREE.Group();
  root.name = "ROOT_FieldSplatWorld";
  root.add(metricGroup);

  // 安全网：collider 在出生点/边缘可能缺面，补一张隐形平面兜住地面射线，
  // 保证 actorAt/isWalkable 不因空洞抛错（略低于地面，collider 命中优先）
  const safetyNet = new THREE.Mesh(
    new THREE.PlaneGeometry(WALK_TARGET_EXTENT_METERS * 2, WALK_TARGET_EXTENT_METERS * 2),
    new THREE.MeshBasicMaterial(),
  );
  safetyNet.name = "GROUND_FieldSafetyNet";
  safetyNet.rotation.x = -Math.PI * 0.5;
  safetyNet.position.y = -0.06;
  safetyNet.visible = false;
  root.add(safetyNet);

  if (onProgress) onProgress(0.72, "场域世界已就绪");
  return {
    root,
    groundGroup,
    quality,
    spawnHint,
    worldId: world.world_id ?? null,
    dispose() {
      scene.remove(sparkRenderer);
      splat.dispose?.();
      sparkRenderer.dispose?.();
    },
  };
}

/**
 * 把场域内的物件（互动实体/同伴底座等）按射线贴到 splat 地面上：
 * 从 (x, 高点, z) 向下打射线，命中 collider 则贴地并返回 true；
 * 未命中（该位置没有地面）返回 false，调用方决定隐藏或保留。
 */
export function snapObjectToFieldGround(object, groundGroup, { lift = 0 } = {}) {
  if (!object || !groundGroup) return false;
  groundGroup.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(object.position.x, 60, object.position.z),
    new THREE.Vector3(0, -1, 0),
  );
  const hits = raycaster.intersectObject(groundGroup, true);
  if (!hits.length) return false;
  object.position.y = hits[0].point.y + lift;
  return true;
}
