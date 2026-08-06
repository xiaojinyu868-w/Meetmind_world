export const WORLDS = Object.freeze([
  Object.freeze({ id: "hall", label: "广场", title: "Echo 广场" }),
  Object.freeze({ id: "cafe", label: "咖啡厅", title: "Echo Cafe" }),
  Object.freeze({ id: "field", label: "关系场域", title: "关系回声场域" }),
]);

export const DEFAULT_WORLD_ID = "hall";

// Hub 的共享运行时契约。环境资产、摊位模板和镜头由 SceneVariants 独立选择。
export const HALL_LAYOUT = Object.freeze({
  bounds: Object.freeze({ minX: -14.2, maxX: 14.2, minZ: -15.4, maxZ: 15.4 }),
  playerSpawn: Object.freeze({ x: 0, z: -12.8, yaw: 0 }),
  // 大厅静止陈列，快照轮询低频即可；咖啡厅维持 2s 实时感
  snapshotPollMs: 10000,
  snapshotUrl: `${import.meta.env.BASE_URL}api/v0/world/snapshot?world=hall`,
});

export const CAFE_WORLD = Object.freeze({
  snapshotPollMs: 2000,
  snapshotUrl: `${import.meta.env.BASE_URL}api/v0/world/snapshot`,
});

export const FIELD_WORLD = Object.freeze({
  environmentAssetId: "environment.relationship-field.v1",
  bounds: Object.freeze({ minX: -7.6, maxX: 7.6, minZ: -7.6, maxZ: 7.6 }),
  playerSpawn: Object.freeze({ x: 0, z: 6.2, yaw: Math.PI }),
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
  nextUrl.searchParams.delete("scene");
  if (world.id !== "field") nextUrl.searchParams.delete("person");
  if (world.id !== "cafe") nextUrl.searchParams.delete("invite");
  location.assign(nextUrl.href);
  return true;
}


export function fieldPersonFromLocation(location = window.location) {
  const value = new URLSearchParams(location.search).get("person");
  return typeof value === "string" && value.trim() ? value.trim() : null;
}


export function navigateToField(personId, location = window.location) {
  if (typeof personId !== "string" || !personId.trim()) return false;
  const nextUrl = new URL(location.href);
  nextUrl.searchParams.set("world", "field");
  nextUrl.searchParams.set("person", personId.trim());
  nextUrl.searchParams.delete("invite");
  location.assign(nextUrl.href);
  return true;
}
