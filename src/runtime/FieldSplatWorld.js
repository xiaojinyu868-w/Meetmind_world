import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

// Marble SPZ 资产坐标系为 marble_raw_opencv：Marble 官方查看器对生成资产
// 统一绕 X 轴旋转 180°（见 docs.worldlabs.ai「Rendering Marble SPZ files in
// third-party engines」）。semantics_metadata 的换算公式：
//   metric = raw * metric_scale_factor; metric.y -= ground_plane_offset
// 轴转换在 metric 换算之后应用，因此 three.js 侧（T·R·S 顺序）：
//   scale = metric_scale_factor * fit，rotation.x = π，position.y = ground_plane_offset * fit
const SPLAT_FLIP_QUATERNION = new THREE.Quaternion(1, 0, 0, 0);

// 生成的微缩世界（通常 1~2 米宽）放大到可行走尺度：XZ 跨度目标值（米）
const FIT_EXTENT_METERS = 22;
const FIT_CLAMP = { min: 2, max: 60 };
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
 * （碰撞/地面射线目标，GROUND_ 前缀组供 configureWorld 收集），返回
 * { root, groundGroup, quality, dispose }；world 缺失/未就绪返回 null，
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

  // 以 collider 包围盒为准做定中+缩放：地面落 y=0，XZ 中心对齐场域原点
  const bounds = new THREE.Box3().setFromObject(colliderScene);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const metricScale = Number(world.metric_scale_factor) > 0
    ? Number(world.metric_scale_factor) : 1;
  const groundOffset = Number(world.ground_plane_offset) || 0;
  const rawExtent = Math.max(size.x, size.z, 1e-3);
  const fit = THREE.MathUtils.clamp(
    FIT_EXTENT_METERS / (metricScale * rawExtent), FIT_CLAMP.min, FIT_CLAMP.max);
  const k = metricScale * fit;

  const metricGroup = new THREE.Group();
  metricGroup.name = "WORLD_MarbleSplat";
  metricGroup.scale.setScalar(k);
  metricGroup.quaternion.copy(SPLAT_FLIP_QUATERNION);
  // R·S 后中心为 (cx·k, -cy·k, -cz·k)：抵消 XZ；y 方向地面偏移按 fit 缩放
  metricGroup.position.set(-center.x * k, groundOffset * fit, center.z * k);
  metricGroup.add(splat);
  metricGroup.add(groundGroup);

  const root = new THREE.Group();
  root.name = "ROOT_FieldSplatWorld";
  root.add(metricGroup);

  // 安全网：collider 在出生点/边缘可能缺面，补一张隐形平面兜住地面射线，
  // 保证 actorAt/isWalkable 不因空洞抛错（略低于地面，collider 命中优先）
  const safetyNet = new THREE.Mesh(
    new THREE.PlaneGeometry(FIT_EXTENT_METERS * 1.6, FIT_EXTENT_METERS * 1.6),
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
    worldId: world.world_id ?? null,
    dispose() {
      scene.remove(sparkRenderer);
      splat.dispose?.();
      sparkRenderer.dispose?.();
    },
  };
}
