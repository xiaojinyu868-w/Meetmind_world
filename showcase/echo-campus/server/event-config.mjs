import { readFileSync } from "node:fs";
import { PERSONA_IDS } from "../src/shared/personas.mjs";

const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
const TEXT_FIELDS = { id: 64, name: 40, brand: 40, subtitle: 80, location: 80, disclosure: 400, startsAt: 40, endsAt: 40 };
const THEME_KEYS = ["ink", "paper", "accent", "glow", "sage"];

function fail(message) { throw new Error("活动配置无效：" + message); }

function text(value, field, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max) fail(`${field} 需要 1–${max} 字`);
  return value.trim();
}

function categories(list) {
  if (!Array.isArray(list) || !list.length || list.length > 12) fail("categories 需要 1–12 项");
  const seen = new Set();
  const result = list.map(item => {
    if (!item || !ID.test(item.id) || seen.has(item.id)) fail("category id 重复或格式不正确");
    if (!HEX.test(item.wristbandColor || "")) fail(`${item.id} 的手环颜色不正确`);
    seen.add(item.id);
    return Object.freeze({ id: item.id, label: text(item.label, "category.label", 12), wristbandColor: item.wristbandColor.toLowerCase() });
  });
  if (!seen.has("guest")) fail("categories 必须包含 guest");
  return Object.freeze(result);
}

function checkpoints(list) {
  if (!Array.isArray(list) || list.length > 24) fail("checkpoints 最多 24 项");
  const seen = new Set();
  return Object.freeze(list.map(item => {
    if (!item || !ID.test(item.id) || seen.has(item.id)) fail("checkpoint id 重复或格式不正确");
    const points = Number(item.points);
    if (!Number.isInteger(points) || points < 0 || points > 1000) fail(`${item.id} 的分值不正确`);
    seen.add(item.id);
    return Object.freeze({ id: item.id, label: text(item.label, "checkpoint.label", 16), partner: text(item.partner, "checkpoint.partner", 32), description: text(item.description, "checkpoint.description", 80), points });
  }));
}

function tags(map) {
  if (!map || typeof map !== "object" || Array.isArray(map)) fail("tags 需要对象");
  const entries = Object.entries(map);
  if (entries.length > 5000) fail("tags 最多 5000 个");
  return Object.freeze(Object.fromEntries(entries.map(([tag, value]) => {
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(tag)) fail(`tag ${tag} 格式不正确`);
    if (!value || !["wristband", "checkpoint", "entry"].includes(value.kind)) fail(`tag ${tag} 的 kind 不正确`);
    return [tag, Object.freeze({ kind: value.kind, ...(value.category ? { category: String(value.category) } : {}), ...(value.checkpoint ? { checkpoint: String(value.checkpoint) } : {}) })];
  })));
}

/** Validates a partner event profile. Unknown keys are ignored so a config
 * written for a newer build never silently changes security behavior. */
export function validateEventConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("需要 JSON 对象");
  const result = {};
  for (const [field, max] of Object.entries(TEXT_FIELDS)) if (input[field] !== undefined) result[field] = text(input[field], field, max);
  if (input.demoMode !== undefined) {
    if (typeof input.demoMode !== "boolean") fail("demoMode 需要布尔值");
    result.demoMode = input.demoMode;
    result.mode = input.demoMode ? "demo" : "event";
  }
  if (input.theme !== undefined) {
    if (!input.theme || typeof input.theme !== "object") fail("theme 需要对象");
    result.theme = Object.freeze(Object.fromEntries(THEME_KEYS.filter(key => input.theme[key] !== undefined).map(key => {
      if (!HEX.test(input.theme[key])) fail(`theme.${key} 需要 #RRGGBB`);
      return [key, input.theme[key].toLowerCase()];
    })));
  }
  if (input.personas !== undefined) {
    if (!Array.isArray(input.personas) || !input.personas.length || input.personas.some(id => !PERSONA_IDS.includes(id))) fail("personas 只能使用已登记的分身形象");
    result.personas = Object.freeze([...new Set(input.personas)]);
  }
  if (input.entry !== undefined) {
    if (!input.entry || typeof input.entry !== "object") fail("entry 需要对象");
    result.entry = Object.freeze({ label: text(input.entry.label ?? "碰一下手环或立牌", "entry.label", 24), hint: text(input.entry.hint ?? "也可以扫码进入", "entry.hint", 40) });
  }
  if (input.categories !== undefined) result.categories = categories(input.categories);
  if (input.checkpoints !== undefined) result.checkpoints = checkpoints(input.checkpoints);
  if (input.tags !== undefined) result.tags = tags(input.tags);
  return Object.freeze(result);
}

export function readEventConfig(file) {
  if (!file) return Object.freeze({});
  let parsed;
  try { parsed = JSON.parse(readFileSync(file, "utf8")); }
  catch (error) { fail(`无法读取 ${file}：${error.message}`); }
  return validateEventConfig(parsed);
}
