import { createCampusScene, createGalleryScene } from "../scenes/CampusScene.js";

const definitions = new Map();
function text(value, field, max, fallback = "") {
  const result = value ?? fallback;
  if (typeof result !== "string" || !result.trim() || result.length > max || /[<>\u0000-\u001f]/.test(result)) throw new Error(field + "格式不正确");
  return result.trim();
}
export function registerScene(definition) {
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) throw new Error("场景定义需要对象");
  const id = definition.id;
  if (typeof id !== "string" || !/^[a-z][a-z0-9-]{0,39}$/.test(id) || ["import","imported"].includes(id)) throw new Error("场景 id 需要小写字母、数字与连字符，且不能使用保留名称");
  if (definitions.has(id)) throw new Error("场景 id 已注册，不允许覆盖：" + id);
  if (typeof definition.factory !== "function") throw new Error("场景 factory 必须是函数");
  const displayName = text(definition.displayName ?? definition.name, "场景名称", 40);
  const helper = text(definition.helper, "场景说明", 90, "定制程序化场景");
  const previewClass = definition.previewClass ?? "ec-campus-art";
  if (!/^ec-[a-z0-9-]{1,40}$/.test(previewClass)) throw new Error("场景预览样式名不正确");
  const record = Object.freeze({ id, displayName, name: displayName, helper, previewClass, factory: definition.factory });
  definitions.set(id, record);
  return record;
}
export function listSceneDefinitions() { return Object.freeze([...definitions.values()]); }
export function getSceneDefinition(id) {
  const definition = definitions.get(id);
  if (!definition) throw new Error("未注册的场景：" + String(id));
  return definition;
}
registerScene({ id:"campus", displayName:"白庭校园", helper:"白色建筑 · 水庭 · 开放连廊", previewClass:"ec-campus-art", factory:createCampusScene });
registerScene({ id:"gallery", displayName:"水上艺廊", helper:"漂浮展厅 · 静水 · 艺术漫游", previewClass:"ec-gallery-art", factory:createGalleryScene });
