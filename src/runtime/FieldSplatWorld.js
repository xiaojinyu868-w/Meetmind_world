import * as THREE from "three";
import {
  buildHeightmapMesh,
  buildSplatHeightmap,
  parseSpzPositions,
  toMetricPositions,
} from "./SplatHeightmap.js";

const SPLAT_FLIP_QUATERNION = new THREE.Quaternion(1, 0, 0, 0);
const WALK_TARGET_EXTENT_METERS = 45;
const FIT_CLAMP = { min: 0.05, max: 40 };
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
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const lowCore = (navigator.hardwareConcurrency ?? 8) <= 4;
  if ((coarse || lowCore) && spz["100k"]) return "100k";
  if (spz["500k"]) return "500k";
  if (spz["100k"]) return "100k";
  return null;
}


async function readSpzPositions(url) {
  const response = await withTimeout(fetch(url), "场域 splat 数据");
  if (!response.ok) throw new Error(`场域 splat 请求失败：${response.status}`);
  const buffer = await response.arrayBuffer();
  let bytes = new Uint8Array(buffer);
  // SPZ files returned by Marble are gzip wrapped; keep support for raw SPZ in
  // local exports and older fixtures.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b && typeof DecompressionStream === "function") {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return parseSpzPositions(bytes).positions;
}


/**
 * Load a Marble world and return the visible splat plus a ground-only mesh.
 * The collider is loaded as a hidden diagnostic mesh, never used blindly as
 * the visible world's ground because Marble exports can have separate frames.
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
  if (!world || world.status !== "ready" || !world.spz) return null;
  const quality = pickSplatQuality(world);
  if (!quality) return null;
  const resolve = typeof resolveMediaUrl === "function" ? resolveMediaUrl : (ref) => ref;
  const splatUrl = resolve(world.spz[quality]);
  if (!splatUrl) return null;

  // Spark is only needed inside a generated relationship field. Keep its
  // sizeable renderer out of the cafe/hall startup bundle.
  const { SparkRenderer, SplatMesh } = await import("@sparkjsdev/spark");
  const sparkRenderer = new SparkRenderer({ renderer });
  sparkRenderer.name = "SPARK_FieldRenderer";
  scene.add(sparkRenderer);
  let splat = null;
  let colliderScene = null;
  try {
    splat = new SplatMesh({
      url: splatUrl,
      onProgress: (event) => {
        if (!onProgress || !event?.lengthComputable || !event.total) return;
        onProgress(0.15 + 0.45 * Math.min(1, event.loaded / event.total), "正在载入关系场域世界");
      },
    });
    splat.name = "SPLAT_FieldWorld";
    await withTimeout(splat.initialized, "splat 世界");
    onProgress?.(0.62, "正在解析场域地面");
    const rawPositions = await readSpzPositions(splatUrl);
    const metricPositions = toMetricPositions(
      rawPositions,
      world.metric_scale_factor,
      world.ground_plane_offset,
    );
    const heightmap = buildSplatHeightmap(metricPositions, { cellSize: 2 });
    if (!heightmap) throw new Error("场域 splat 中找不到可行走地面");

    const fit = THREE.MathUtils.clamp(
      WALK_TARGET_EXTENT_METERS / heightmap.extent,
      FIT_CLAMP.min,
      FIT_CLAMP.max,
    );
    const metricScale = Number(world.metric_scale_factor) > 0
      ? Number(world.metric_scale_factor)
      : 1;
    const groundOffset = Number(world.ground_plane_offset) || 0;
    const metricGroup = new THREE.Group();
    metricGroup.name = "WORLD_MarbleSplat";
    const splatGroup = new THREE.Group();
    splatGroup.name = "SPLAT_Flipped";
    splatGroup.quaternion.copy(SPLAT_FLIP_QUATERNION);
    splatGroup.scale.setScalar(metricScale * fit);
    splatGroup.position.set(
      -heightmap.centroid.x * fit,
      groundOffset * fit,
      -heightmap.centroid.z * fit,
    );
    splatGroup.add(splat);
    metricGroup.add(splatGroup);

    const heightmapMesh = buildHeightmapMesh(heightmap);
    const groundGroup = new THREE.Group();
    groundGroup.name = "GROUND_FieldHeightmap";
    groundGroup.scale.setScalar(fit);
    groundGroup.position.set(-heightmap.centroid.x * fit, 0, -heightmap.centroid.z * fit);
    if (heightmapMesh) groundGroup.add(heightmapMesh);
    metricGroup.add(groundGroup);

    // Collider GLB remains available for diagnostics and future semantic
    // obstacles. Its geometry is not assumed to be aligned with the splat.
    if (world.collider_ref) {
      try {
        colliderScene = await withTimeout(
          assetStore.loadScene(resolve(world.collider_ref)),
          "场域碰撞网格",
        );
        colliderScene.name = "COLLIDER_FieldSource";
        colliderScene.visible = false;
        colliderScene.traverse((object) => {
          if (object.isMesh) object.visible = false;
        });
        splatGroup.add(colliderScene);
      } catch (error) {
        console.warn("[FieldSplatWorld] collider.glb 不可用，继续使用 SPZ 地面", error);
      }
    }

    const safetyNet = new THREE.Mesh(
      new THREE.PlaneGeometry(WALK_TARGET_EXTENT_METERS * 2, WALK_TARGET_EXTENT_METERS * 2),
      new THREE.MeshBasicMaterial(),
    );
    safetyNet.name = "GROUND_FieldSafetyNet";
    safetyNet.rotation.x = -Math.PI * 0.5;
    safetyNet.position.y = (heightmap.globalMedian - 0.3) * fit;
    safetyNet.visible = false;

    const root = new THREE.Group();
    root.name = "ROOT_FieldSplatWorld";
    root.add(metricGroup);
    root.add(safetyNet);
    const spawn = heightmap.densest
      ? {
          x: (heightmap.densest.x - heightmap.centroid.x) * fit,
          z: (heightmap.densest.z - heightmap.centroid.z) * fit,
          yaw: Math.atan2(
            heightmap.centroid.x - heightmap.densest.x,
            heightmap.centroid.z - heightmap.densest.z,
          ),
        }
      : null;
    // 可行走边界用高程图格子的实测分布（2%–98% 分位，抗离群孤岛），
    // 与 spawnHint 同一世界系（减质心 × fit）；±extent×0.58 的经验盒在
    // 地形偏离质心时会把真实可行走区裁掉（2026-08-05 lin-che 世界实测）
    const cellCentersX = [];
    const cellCentersZ = [];
    for (const key of heightmap.cellMedian.keys()) {
      const [gx, gz] = key.split(",").map(Number);
      cellCentersX.push((gx + 0.5) * heightmap.cellSize);
      cellCentersZ.push((gz + 0.5) * heightmap.cellSize);
    }
    cellCentersX.sort((a, b) => a - b);
    cellCentersZ.sort((a, b) => a - b);
    const pickQ = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * q)))];
    const BOUNDS_MARGIN = 1.5;
    const bounds = Object.freeze({
      minX: (pickQ(cellCentersX, 0.02) - heightmap.centroid.x) * fit - BOUNDS_MARGIN,
      maxX: (pickQ(cellCentersX, 0.98) - heightmap.centroid.x) * fit + BOUNDS_MARGIN,
      minZ: (pickQ(cellCentersZ, 0.02) - heightmap.centroid.z) * fit - BOUNDS_MARGIN,
      maxZ: (pickQ(cellCentersZ, 0.98) - heightmap.centroid.z) * fit + BOUNDS_MARGIN,
    });
    onProgress?.(0.72, "场域世界已就绪");
    return {
      root,
      groundGroup,
      quality,
      spawnHint: spawn,
      bounds,
      groundQuery: (x, z) => heightmap.query(x / fit + heightmap.centroid.x, z / fit + heightmap.centroid.z) * fit,
      worldId: world.world_id ?? null,
      colliderLoaded: Boolean(colliderScene),
      dispose() {
        scene.remove(sparkRenderer);
        splat?.dispose?.();
        sparkRenderer.dispose?.();
      },
    };
  } catch (error) {
    splat?.dispose?.();
    scene.remove(sparkRenderer);
    sparkRenderer.dispose?.();
    throw error;
  }
}


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
