import { CAFE_LAYOUT } from "./CafeLayout.js";

/**
 * ColliderRegistry —— 环境静态碰撞壳注册表（XZ 平面 2D 碰撞）。
 *
 * 按环境资产 id 返回静态壳：
 *   { bounds: {minX, maxX, minZ, maxZ}, staticCircles: [{x, z, r}] }
 *
 * - cafe（v1 及美术变体）：桌位圆形阻挡 + 咖啡厅边界（活的世界锚点锁定 v1 布局）；
 * - market-street / expo-hall：边界 + 空静态圆列表——摊位/展位圆为动态锚点，
 *   由 BoothSystem 在快照同步后注入（main.js currentBlockers() 每帧合并）。
 *
 * NPC ↔ NPC 的分离解算权威在后端（位置权威分离），前端壳只做静态保险。
 */

// 咖啡厅桌位圆形阻挡（原 main.js TABLE_BLOCKERS 迁入，锚点按 v1 原始咖啡厅标定）
export const CAFE_TABLE_COLLIDERS = Object.freeze([
  Object.freeze({ x: 0, z: 0, r: 1.27 }),
  Object.freeze({ x: -3.65, z: -1.55, r: 0.72 }),
  Object.freeze({ x: -3.65, z: 1.55, r: 0.72 }),
  Object.freeze({ x: 3.28, z: -1.35, r: 0.94 }),
  Object.freeze({ x: 3.28, z: 1.65, r: 0.94 }),
]);

const CAFE_SHELL = Object.freeze({
  id: "cafe",
  bounds: CAFE_LAYOUT.bounds,
  staticCircles: CAFE_TABLE_COLLIDERS,
});

const MARKET_STREET_SHELL = Object.freeze({
  id: "market-street",
  bounds: Object.freeze({ minX: -5.5, maxX: 5.5, minZ: -10, maxZ: 10 }),
  staticCircles: Object.freeze([]),
});

const EXPO_HALL_SHELL = Object.freeze({
  id: "expo-hall",
  bounds: Object.freeze({ minX: -7.5, maxX: 7.5, minZ: -5.5, maxZ: 5.5 }),
  staticCircles: Object.freeze([]),
});

const RELATIONSHIP_FIELD_SHELL = Object.freeze({
  id: "relationship-field",
  bounds: Object.freeze({ minX: -7.6, maxX: 7.6, minZ: -7.6, maxZ: 7.6 }),
  staticCircles: Object.freeze([
    Object.freeze({ x: -2.5, z: 0.4, r: 0.72 }),
    Object.freeze({ x: 2.4, z: -1.6, r: 0.76 }),
    Object.freeze({ x: -1.1, z: -3.6, r: 0.82 }),
  ]),
});

// 小镇 Hub（build_hub_town.py 布局常量的前端镜像：建筑/篝火/大树/长椅/河带）
const HUB_TREE_COLLIDERS = [
  [-5.6, -1.8, 0.8], [8.6, 7.2, 0.75], [-8.8, 12.8, 0.8], [12.2, 13.4, 0.7],
  [-12.6, 6.8, 0.65], [12.6, -12.6, 0.75], [10.8, -6.2, 0.6], [-12.8, -6.8, 0.65],
  [-13.0, -11.8, 0.6], [2.8, 14.0, 0.65], [-5.2, 13.8, 0.7], [8.2, 13.2, 0.6],
  [-4.6, -14.2, 0.7], [4.8, -14.0, 0.7],
];
const HUB_RIVER_COLLIDERS = (() => {
  const circles = [];
  for (let x = -13.4; x <= 13.4; x += 2.2) {
    if (Math.abs(x + 3.2) < 2.4 || Math.abs(x - 3.2) < 2.4) continue; // 木桥与汀步可通行
    circles.push([x, 10.2 + 1.4 * Math.sin(x * 0.3), 2.0]);
  }
  return circles;
})();
const HUB_TOWN_SHELL = Object.freeze({
  id: "hub-town",
  bounds: Object.freeze({ minX: -14.2, maxX: 14.2, minZ: -15.4, maxZ: 15.4 }),
  staticCircles: Object.freeze([
    Object.freeze({ x: -9.2, z: 2.5, r: 4.35 }),
    Object.freeze({ x: 0, z: 2.5, r: 1.05 }),
    Object.freeze({ x: -2.3, z: -14.5, r: 0.32 }),
    Object.freeze({ x: 2.3, z: -14.5, r: 0.32 }),
    Object.freeze({ x: 6.2, z: 6.9, r: 0.7 }),
    Object.freeze({ x: -6.4, z: 7.6, r: 0.7 }),
    Object.freeze({ x: 5.6, z: -2.6, r: 0.7 }),
    ...[...HUB_TREE_COLLIDERS, ...HUB_RIVER_COLLIDERS].map(([x, z, r]) =>
      Object.freeze({ x, z, r })),
  ]),
});

const SHELL_BY_ENVIRONMENT = Object.freeze({
  "environment.cafe.v1": CAFE_SHELL,
  // 美术变体几何不同，但活的世界锁定 v1 锚点（见 main.js 提示 Toast），碰撞同 v1
  "environment.cafe.reference.v1": CAFE_SHELL,
  "environment.cafe.painterly.v1": CAFE_SHELL,
  "environment.market-street.v1": MARKET_STREET_SHELL,
  "environment.hub-town.v1": HUB_TOWN_SHELL,
  "environment.cafe.interior.v2": CAFE_SHELL,
  "environment.expo-hall.v1": EXPO_HALL_SHELL,
  "environment.relationship-field.v1": RELATIONSHIP_FIELD_SHELL,
});

/**
 * 按环境资产 id 取静态碰撞壳；未知环境保守回退咖啡厅壳并告警。
 * @param {string} environmentAssetId
 * @returns {{ id: string, bounds: object, staticCircles: ReadonlyArray<{x: number, z: number, r: number}> }}
 */
export function colliderShellFor(environmentAssetId) {
  const shell = SHELL_BY_ENVIRONMENT[environmentAssetId];
  if (!shell) {
    console.warn(`[ColliderRegistry] 未知环境资产 ${environmentAssetId}，回退咖啡厅碰撞壳`);
    return CAFE_SHELL;
  }
  return shell;
}

/**
 * TODO（美术线）：从 GLB manifest 读取 COLLIDER_* 空物体导出静态壳。
 * 约定：美术在 Blender 里以 COLLIDER_CIRCLE_*（x,z + 半径入 metadata）/ COLLIDER_BOUNDS_*
 * 空物体标注碰撞体，导出 manifest json 后在此解析为 shell 结构，替代手写常量。
 * @param {object} _manifestJson
 * @returns {null} 暂未实现，调用方继续使用注册表常量壳
 */
export function loadFromManifest(_manifestJson) {
  console.warn("[ColliderRegistry] loadFromManifest 尚未实现（待美术线 COLLIDER_* 导出约定）");
  return null;
}
