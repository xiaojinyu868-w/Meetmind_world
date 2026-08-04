import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import {
  parseSpzPositions,
  toMetricPositions,
  buildSplatHeightmap,
  buildHeightmapMesh,
} from "./SplatHeightmap.js";

// 坐标系（官方文档）：spz 为 marble_raw_opencv，metric = raw × metric_scale_factor、
// metric.y -= ground_plane_offset，随后绕 X 轴 180°（查看器同款）。
// 地面不再用 collider GLB（实测两资产坐标区域不一致），改为从 splat 位置
// 直接构建高程图（SplatHeightmap.js）——所见即所踩。
const SPLAT_FLIP_QUATERNION = new THREE.Quaternion(1, 0, 0, 0);

// 对齐目标：可行走区域（朝上三角面的 XZ 分布）映射到这个尺度（~1/4 米制，
// 既保留景观纵深又不过度压缩——270m 世界压到 18m 会把丘陵压成泥浆）；
// Marble 世界的包围盒常含天空/地裙，bbox 定中会把内容甩到远处（2026-08-04 教训）
const WALK_TARGET_EXTENT_METERS = 45;
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
  if (!world || world.status !== "ready" || !world.spz) {
    return null;
  }
  const quality = pickSplatQuality(world);
  if (!quality) return null;
  const resolve = typeof resolveMediaUrl === "function" ? resolveMediaUrl : (ref) => ref;

  const sparkRenderer = new SparkRenderer({ renderer });
  sparkRenderer.name = "SPARK_FieldRenderer";
  scene.add(sparkRenderer);

  const splatUrl = resolve(world.spz[quality]);
  const splat = new SplatMesh({
    url: splatUrl,
    onProgress: (event) => {
      if (!onProgress || !event?.lengthComputable || !event.total) return;
      onProgress(0.15 + 0.55 * Math.min(1, event.loaded / event.total),
        "正在载入关系场域世界");
    },
  });
  splat.name = "SPLAT_FieldWorld";
  await withTimeout(splat.initialized, "splat 世界");

  // 从 splat 本身求可行走地面（唯一可信源）：下载 → 解压 → 解析位置
  onProgress?.(0.7, "正在解析场域地面");
  const spzResponse = await withTimeout(fetch(splatUrl), "场域 splat 数据");
  const spzBuffer = await spzResponse.arrayBuffer();
  let decompressed = spzBuffer;
  try {
    decompressed = await new Response(
      new Blob([spzBuffer]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer();
  } catch {
    // 少数导出可能是未压缩 SPZ：直接使用原 buffer
  }
  const { positions } = parseSpzPositions(new Uint8Array(decompressed));
  const metricScale = Number(world.metric_scale_factor) > 0
    ? Number(world.metric_scale_factor) : 1;
  const groundOffset = Number(world.ground_plane_offset) || 0;
  const metricPositions = toMetricPositions(positions, metricScale, groundOffset);
  const heightmap = buildSplatHeightmap(metricPositions, { cellSize: 2 });
  if (!heightmap) throw new Error("场域 splat 中找不到可行走地面");

  // 世界变换（官方换算同款）：splat 组 = flipX + 均匀缩放 + 位移；
  // 可行走范围映射到 WALK_TARGET_EXTENT_METERS，中心为地形质心
  const fit = THREE.MathUtils.clamp(
    WALK_TARGET_EXTENT_METERS / heightmap.extent, FIT_CLAMP.min, FIT_CLAMP.max);
  const k = metricScale * fit;
  const cx = heightmap.centroid.x;
  const cz = heightmap.centroid.z;

  const metricGroup = new THREE.Group();
  metricGroup.name = "WORLD_MarbleSplat";
  const splatGroup = new THREE.Group();
  splatGroup.name = "SPLAT_Flipped";
  splatGroup.quaternion.copy(SPLAT_FLIP_QUATERNION);
  splatGroup.scale.setScalar(k);
  splatGroup.position.set(-cx * fit, groundOffset * fit, -cz * fit);
  splatGroup.add(splat);
  metricGroup.add(splatGroup);

  // 高程图烘成不可见网格接入地面射线（所见即所踩）；网格在米制系构建，
  // 这里只缩放+平移（不含翻转——positions 已是翻转后坐标）
  const heightmapMesh = buildHeightmapMesh(heightmap);
  const groundGroup = new THREE.Group();
  groundGroup.name = "GROUND_FieldHeightmap";
  if (heightmapMesh) {
    groundGroup.scale.setScalar(fit);
    groundGroup.position.set(-cx * fit, 0, -cz * fit);
    groundGroup.add(heightmapMesh);
  }
  metricGroup.add(groundGroup);

  const spawnHint = heightmap.densest
    ? {
        x: (heightmap.densest.x - cx) * fit,
        z: (heightmap.densest.z - cz) * fit,
        yaw: Math.atan2(cx - heightmap.densest.x, cz - heightmap.densest.z),
      }
    : null;

  const root = new THREE.Group();
  root.name = "ROOT_FieldSplatWorld";
  root.add(metricGroup);

  // 安全网：高程图边缘之外补一张隐形平面兜住地面射线（略低于地面，高程图命中优先）
  const safetyNet = new THREE.Mesh(
    new THREE.PlaneGeometry(WALK_TARGET_EXTENT_METERS * 2, WALK_TARGET_EXTENT_METERS * 2),
    new THREE.MeshBasicMaterial(),
  );
  safetyNet.name = "GROUND_FieldSafetyNet";
  safetyNet.rotation.x = -Math.PI * 0.5;
  safetyNet.position.y = (heightmap.globalMedian - 0.3) * fit;
  safetyNet.visible = false;
  root.add(safetyNet);

  if (onProgress) onProgress(0.72, "场域世界已就绪");
  return {
    root,
    groundGroup,
    quality,
    spawnHint,
    groundQuery: (x, z) => heightmap.query(x / fit + cx, z / fit + cz) * fit,
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
