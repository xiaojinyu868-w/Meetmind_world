export const WORLDS = Object.freeze([
  Object.freeze({ id: "hall", label: "集市", title: "Echo 集市大厅" }),
  Object.freeze({ id: "cafe", label: "咖啡厅", title: "Echo Cafe" }),
]);

export const DEFAULT_WORLD_ID = "hall";

// 展位大厅布局：16×12m，出生点在入口、面向大厅中心（-Z）
export const HALL_LAYOUT = Object.freeze({
  bounds: Object.freeze({ minX: -7.5, maxX: 7.5, minZ: -5.5, maxZ: 5.5 }),
  playerSpawn: Object.freeze({ x: 0, z: 4.5, yaw: Math.PI }),
  npcEntrySpawns: Object.freeze([
    Object.freeze({ x: -2.55, z: 4.2, yaw: Math.PI }),
    Object.freeze({ x: -1.55, z: 4.35, yaw: Math.PI }),
    Object.freeze({ x: -0.55, z: 4.2, yaw: Math.PI }),
    Object.freeze({ x: 0.55, z: 4.2, yaw: Math.PI }),
    Object.freeze({ x: 1.55, z: 4.35, yaw: Math.PI }),
    Object.freeze({ x: 2.55, z: 4.2, yaw: Math.PI }),
  ]),
  environmentAssetId: "environment.expo-hall.v1",
  boothTemplateAssetId: "module.booth-template.v1",
  // 大厅静止陈列，快照轮询低频即可；咖啡厅维持 2s 实时感
  snapshotPollMs: 10000,
  snapshotUrl: "/api/v0/world/snapshot?world=hall&advance=1",
});

export const CAFE_WORLD = Object.freeze({
  snapshotPollMs: 2000,
  snapshotUrl: "/api/v0/world/snapshot?advance=1",
});


export function worldById(value) {
  return WORLDS.find((world) => world.id === value) ?? null;
}


export function worldFromLocation(location = window.location) {
  const requested = new URLSearchParams(location.search).get("world");
  return (
    WORLDS.find((world) => world.id === requested) ??
    WORLDS.find((world) => world.id === DEFAULT_WORLD_ID)
  );
}


export function navigateToWorld(worldId, location = window.location) {
  const world = WORLDS.find((candidate) => candidate.id === worldId);
  if (!world) return false;
  const nextUrl = new URL(location.href);
  nextUrl.searchParams.set("world", world.id);
  location.assign(nextUrl.href);
  return true;
}
