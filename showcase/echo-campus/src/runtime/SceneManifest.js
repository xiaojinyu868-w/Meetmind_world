export const SCENE_SCHEMA = "echo-campus.scene.v1";
const MAX_COORDINATE = 100000;
const isObject = value => value && typeof value === "object" && !Array.isArray(value);
function finite(value, label, limit = MAX_COORDINATE) {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > limit) throw new Error(label + "需要有限数字（绝对值不超过 " + limit + "）");
  return value;
}
function vector(value, label, fallback) {
  const source = value ?? fallback;
  if (!Array.isArray(source) || source.length !== 3) throw new Error(label + "需要三个数字");
  return source.map(v => finite(v, label));
}
function point(value, label) {
  if (!isObject(value)) throw new Error(label + "需要 {x,y,z} 坐标");
  const result = { x: finite(value.x, label), y: finite(value.y, label), z: finite(value.z, label) };
  if (value.yaw !== undefined) result.yaw = finite(value.yaw, label + "朝向");
  return result;
}
function modelUrl(value) {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || value.length > 4096 || /[\u0000-\u0020\\]/.test(value)) throw new Error("模型地址不正确");
  if (/^https?:\/\//.test(value)) {
    let parsed; try { parsed = new URL(value); } catch { throw new Error("模型地址不正确"); }
    if (!parsed.hostname || parsed.username || parsed.password) throw new Error("模型地址不正确");
  } else if (!/^blob:https?:\/\//.test(value) && !/^(\/(?!\/)|\.\.?\/)/.test(value)) throw new Error("模型地址须为 HTTP(S) 或相对路径");
  return value;
}
export function validateManifest(input) {
  if (!isObject(input)) throw new Error("场景配置必须是 JSON 对象");
  if (input.schema !== SCENE_SCHEMA) throw new Error("场景 schema 应为 " + SCENE_SCHEMA);
  if (!["glb", "splat", "procedural"].includes(input.type)) throw new Error("支持 glb、splat 或 procedural");
  const scale = input.scale ?? 1;
  if (typeof scale !== "number" || !Number.isFinite(scale) || scale <= 0 || scale > 1000) throw new Error("缩放应在 0 到 1000 之间");
  const position = vector(input.position, "位置", [0,0,0]), rotation = vector(input.rotation, "旋转", [0,0,0]);
  const groundY = finite(input.groundY ?? 0, "地面高度");
  const originalBounds = input.bounds ?? { minX: -25, maxX: 25, minZ: -25, maxZ: 25 };
  if (!isObject(originalBounds)) throw new Error("活动边界需要对象");
  const bounds = Object.fromEntries(["minX","maxX","minZ","maxZ"].map(k => [k, finite(originalBounds[k], "活动边界")]));
  if (bounds.minX >= bounds.maxX || bounds.minZ >= bounds.maxZ) throw new Error("活动边界不正确");
  let framingBounds;
  if (input.framingBounds !== undefined) {
    if (!isObject(input.framingBounds)) throw new Error("主体展示边界需要对象");
    framingBounds = Object.fromEntries(["minX","maxX","minY","maxY","minZ","maxZ"].map(k => [k, finite(input.framingBounds[k], "主体展示边界")]));
    if (["X","Y","Z"].some(axis => framingBounds["min"+axis] >= framingBounds["max"+axis])) throw new Error("主体展示边界不正确");
  }
  const regionBounds = {};
  if (input.regionBounds !== undefined) {
    if (!isObject(input.regionBounds) || Object.keys(input.regionBounds).length > 12) throw new Error("分区边界需要最多 12 个区域");
    for (const [name, value] of Object.entries(input.regionBounds)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(name) || !isObject(value)) throw new Error("分区边界格式不正确");
      const b = Object.fromEntries(["minX","maxX","minY","maxY","minZ","maxZ"].map(key => [key, finite(value[key], "分区边界")]));
      if (["X","Y","Z"].some(axis => b["min"+axis] >= b["max"+axis])) throw new Error("分区边界不正确");
      regionBounds[name] = b;
    }
  }
  const spawn = point(input.spawn ?? { x: 0, y: groundY, z: 8 }, "出生点");
  const inside = p => p.x >= bounds.minX && p.x <= bounds.maxX && p.z >= bounds.minZ && p.z <= bounds.maxZ;
  if (!inside(spawn)) throw new Error("出生点必须位于活动边界内");
  const rawAnchors = input.anchors ?? {};
  if (!isObject(rawAnchors)) throw new Error("交互锚点需要对象");
  const anchors = {};
  for (const [name, value] of Object.entries(rawAnchors)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(name)) throw new Error("锚点名称格式不正确");
    if (name === "people") {
      if (!Array.isArray(value) || value.length < 1 || value.length > 200) throw new Error("人物锚点需要 1–200 个坐标");
      anchors.people = value.map(p => point(p, "人物锚点"));
      if (anchors.people.some(p => !inside(p))) throw new Error("人物锚点必须位于活动边界内");
    } else {
      anchors[name] = point(value, "锚点 " + name);
      if (!inside(anchors[name])) throw new Error("交互锚点必须位于活动边界内");
    }
  }
  const rawCameras = input.cameras ?? {};
  if (!isObject(rawCameras) || Object.keys(rawCameras).length > 20) throw new Error("镜头配置需要对象，最多 20 个镜头");
  const cameras = {};
  for (const [name, value] of Object.entries(rawCameras)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(name) || !isObject(value)) throw new Error("镜头配置格式不正确");
    const cameraPosition = vector(value.position, "镜头位置"), target = vector(value.target, "镜头目标");
    const fov = finite(value.fov ?? 45, "镜头视场角", 179);
    if (fov < 10 || fov > 120) throw new Error("镜头视场角应为 10–120 度");
    if (cameraPosition.every((v,i) => Math.abs(v - target[i]) < 1e-6)) throw new Error("镜头位置不能与目标重合");
    cameras[name] = { position: cameraPosition, target, fov };
  }
  const rawColliders = input.colliders ?? [];
  if (!Array.isArray(rawColliders) || rawColliders.length > 512) throw new Error("碰撞壳需要最多 512 个圆形阻挡");
  const colliders = rawColliders.map(c => {
    if (!isObject(c)) throw new Error("碰撞壳需要 {x,z,r} 对象");
    const result = { x: finite(c.x, "碰撞壳"), z: finite(c.z, "碰撞壳"), r: finite(c.r ?? c.radius, "碰撞半径", 10000) };
    if (result.r <= 0) throw new Error("碰撞半径必须大于 0");
    return result;
  });
  if (colliders.some(c => Math.hypot(spawn.x - c.x, spawn.z - c.z) < c.r + 0.28)) throw new Error("出生点不能位于碰撞壳内");
  return {
    schema: SCENE_SCHEMA, name: String(input.name || "我的场景").slice(0,60),
    type: input.type, url: modelUrl(input.url), scale, position, rotation,
    bounds, spawn, groundY, anchors, cameras, colliders,
    ...(framingBounds ? { framingBounds } : {}),
    ...(input.siteMode === "campus" ? { siteMode: "campus" } : {}),
    ...(Object.keys(regionBounds).length ? { regionBounds } : {}),
  };
}
export function defaultManifest(type = "glb") {
  return {
    schema: SCENE_SCHEMA, name: type === "splat" ? "Marble 世界" : "导入建筑", type,
    url: "", scale: 1, position: [0,0,0], rotation: type === "splat" ? [180,0,0] : [0,0,0],
    bounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 }, spawn: { x:0, y:0, z:8 }, groundY:0,
    anchors: { arrival: { x:0, y:0, z:8 }, meeting: { x:4, y:0, z:6 } },
  };
}
