import * as THREE from "three";

/**
 * SPZ v2 解析与 splat 高程图（FR-2.11 场域）。
 *
 * 动机：Marble 导出的 collider GLB 与 spz 分属不同坐标区域（2026-08-04 实测
 * 两资产 percentile 分布无法线性配准），用 collider 对齐 splat 永远对不齐。
 * 唯一可信源是 splat 本身：按官方公式（metric_scale_factor / ground_plane_offset /
 * X 轴 180°）放置世界后，从 splat 位置直接构建可行走高程图。
 */

/** 解析 SPZ v2：16 字节头 + 每 splat 9 字节 24-bit 定点位置。 */
export function parseSpzPositions(bytes) {
  const view = new DataView(bytes.buffer ?? bytes, bytes.byteOffset ?? 0);
  const magic = view.getUint32(0, true);
  if (magic !== 0x5053474e) throw new Error(`不是 SPZ 资产（magic=${magic.toString(16)}）`);
  const count = view.getUint32(8, true);
  const fracBits = view.getUint8(13);
  const scale = 1 / (1 << fracBits);
  const positions = new Float32Array(count * 3);
  let offset = 16;
  const readS24 = (at) => {
    const v = view.getUint16(at, true) | (view.getUint8(at + 2) << 16);
    return ((v & 0x800000) ? v - 0x1000000 : v) * scale;
  };
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = readS24(offset);
    positions[i * 3 + 1] = readS24(offset + 3);
    positions[i * 3 + 2] = readS24(offset + 6);
    offset += 9;
  }
  return { count, positions };
}

/**
 * 官方坐标换算（marble_raw_opencv → 米制地面系）：
 * metric = raw * metricScale；metric.y -= groundOffset；随后绕 X 轴 180°。
 * 返回应用该换算后的位置数组（新分配）。
 */
export function toMetricPositions(positions, metricScale, groundOffset) {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    out[i] = positions[i] * metricScale;
    out[i + 1] = -((positions[i + 1] * metricScale) - groundOffset);
    out[i + 2] = -(positions[i + 2] * metricScale);
  }
  return out;
}

function percentile(sorted, q) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
}

/**
 * 从米制位置构建地形高程图：
 * 1) y 直方图找地形密集层（草地/地面）；
 * 2) 地面层 splat 的 XZ 铺网格，每格取中位高度；
 * 3) query(x,z) 最近格高度（缺失回退最近有值格，再回退全局中位）。
 */
export function buildSplatHeightmap(metricPositions, { cellSize = 2, layerBand = 1.2 } = {}) {
  const count = metricPositions.length / 3;
  const ys = [];
  for (let i = 0; i < count; i += 1) ys.push(metricPositions[i * 3 + 1]);
  ys.sort((a, b) => a - b);
  // 地形层：y 分布里最密的 0.5m 桶（地面/草地），天空与地裙是稀疏长尾
  const buckets = new Map();
  for (const y of ys) {
    const key = Math.round(y * 2) / 2;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  let layerY = 0; let layerCount = 0;
  for (const [y, n] of buckets) if (n > layerCount) { layerY = y; layerCount = n; }
  // 起伏地形不能只用单一层：从最密桶向上扩展，直到密度跌破峰值 2%（丘陵草顶保留）
  const peak = layerCount;
  let layerTop = layerY;
  for (let y = layerY; ; y += 0.5) {
    const n = buckets.get(y) ?? 0;
    if (y > layerY && n < peak * 0.02) break;
    layerTop = y;
  }
  const inLayer = (y) => y >= layerY - layerBand && y <= layerTop + 0.5;

  const cells = new Map();
  const xs = []; const zs = [];
  for (let i = 0; i < count; i += 1) {
    const y = metricPositions[i * 3 + 1];
    if (!inLayer(y)) continue;
    const x = metricPositions[i * 3];
    const z = metricPositions[i * 3 + 2];
    const key = `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
    let cell = cells.get(key);
    if (!cell) { cell = []; cells.set(key, cell); }
    cell.push(y);
    xs.push(x); zs.push(z);
  }
  if (!xs.length) return null;
  xs.sort((a, b) => a - b); zs.sort((a, b) => a - b);
  const extent = Math.max(
    percentile(xs, 0.95) - percentile(xs, 0.05),
    percentile(zs, 0.95) - percentile(zs, 0.05),
    1e-3,
  );
  const centroid = { x: percentile(xs, 0.5), z: percentile(zs, 0.5) };

  const cellMedian = new Map();
  let densest = null; let densestCount = 0;
  for (const [key, list] of cells) {
    list.sort((a, b) => a - b);
    const median = list[list.length >> 1];
    cellMedian.set(key, median);
    if (list.length > densestCount) {
      densestCount = list.length;
      const [gx, gz] = key.split(",").map(Number);
      densest = { x: (gx + 0.5) * cellSize, z: (gz + 0.5) * cellSize, y: median };
    }
  }
  const globalMedian = percentile([...cellMedian.values()].sort((a, b) => a - b), 0.5);

  function query(x, z) {
    const gx = Math.floor(x / cellSize); const gz = Math.floor(z / cellSize);
    for (let ring = 0; ring <= 6; ring += 1) {
      let best = null; let bestDist = Infinity;
      for (let dx = -ring; dx <= ring; dx += 1) {
        for (let dz = -ring; dz <= ring; dz += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
          const y = cellMedian.get(`${gx + dx},${gz + dz}`);
          if (y === undefined) continue;
          const dist = Math.hypot(dx, dz);
          if (dist < bestDist) { best = y; bestDist = dist; }
        }
      }
      if (best !== null) return best;
    }
    return globalMedian;
  }

  return {
    query,
    layerY,
    extent,
    centroid,
    densest,
    cellSize,
    cellMedian,
    globalMedian,
  };
}

/**
 * 把高程图烘成一张不可见网格（GROUND_ 前缀），直接接入现有
 * groundMeshes 射线地面路径——人物脚踩的就是 splat 自己的地面。
 */
export function buildHeightmapMesh(heightmap, { name = "GROUND_FieldHeightmap", margin = 6 } = {}) {
  const { cellMedian, cellSize } = heightmap;
  const keys = [...cellMedian.keys()];
  if (!keys.length) return null;
  const positions = [];
  const indices = [];
  let vi = 0;
  for (const key of keys) {
    const [gx, gz] = key.split(",").map(Number);
    const y = cellMedian.get(key);
    const x0 = gx * cellSize; const z0 = gz * cellSize;
    const x1 = x0 + cellSize; const z1 = z0 + cellSize;
    positions.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
    indices.push(vi, vi + 2, vi + 1, vi, vi + 3, vi + 2);
    vi += 4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  mesh.name = name;
  mesh.userData.margin = margin;
  return mesh;
}
