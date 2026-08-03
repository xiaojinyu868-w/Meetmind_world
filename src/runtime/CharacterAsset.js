import { publicUrl } from "./WorldSpec.js";


export const CHARACTER_ASSET_SCHEMA = "character-asset.v1";

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const SAFE_RELATIVE_PREFIXES = ["assets/", "models/"];
const SAFE_ABSOLUTE_PREFIXES = ["/assets/", "/models/", "/api/v0/assets/"];


function numberInRange(value, minimum, maximum) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}


function safeGlbUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const url = value.trim();
  if (url.length > 2048) return null;
  if (url.includes("..") || /[?#]/.test(url) || !url.toLowerCase().endsWith(".glb")) return null;
  if (url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      return parsed.username || parsed.password ? null : url;
    } catch {
      return null;
    }
  }
  if (url.startsWith("/")) {
    return SAFE_ABSOLUTE_PREFIXES.some((prefix) => url.startsWith(prefix)) ? url : null;
  }
  return SAFE_RELATIVE_PREFIXES.some((prefix) => url.startsWith(prefix)) ? url : null;
}


function safeAnimations(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > 32) return null;
  const animations = {};
  for (const [semanticName, clipName] of entries) {
    const semantic = semanticName.trim();
    if (!semantic || semantic.length > 64) return null;
    if (
      typeof clipName !== "string" ||
      !clipName.trim() ||
      clipName.trim().length > 128 ||
      /[\\/]|:\/\//.test(clipName)
    ) return null;
    animations[semantic] = clipName.trim();
  }
  return animations;
}


export function normalizeCharacterAsset(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.schema_version !== CHARACTER_ASSET_SCHEMA) return null;
  if (
    typeof value.character_id !== "string" ||
    !value.character_id.trim() ||
    value.character_id.trim().length > 128
  ) return null;
  if (!Number.isInteger(value.revision) || value.revision < 1) return null;
  if (typeof value.content_hash !== "string" || !SHA256_PATTERN.test(value.content_hash)) return null;
  const glbUrl = safeGlbUrl(value.glb_url);
  if (!glbUrl) return null;

  const runtime = value.runtime;
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) return null;
  const scaleMeters = numberInRange(runtime.scale_meters, 0.01, 3);
  const groundOffset = numberInRange(runtime.ground_offset, -1, 1);
  if (scaleMeters === null || groundOffset === null || runtime.forward_axis !== "+Z") return null;
  const animations = safeAnimations(runtime.animations);
  if (!animations) return null;
  if (value.qa?.status !== "passed") return null;

  return Object.freeze({
    schema_version: CHARACTER_ASSET_SCHEMA,
    character_id: value.character_id.trim(),
    revision: value.revision,
    glb_url: glbUrl,
    content_hash: value.content_hash.toLowerCase(),
    runtime: Object.freeze({
      scale_meters: scaleMeters,
      ground_offset: groundOffset,
      forward_axis: "+Z",
      animations: Object.freeze(animations),
    }),
    qa: Object.freeze({ status: "passed" }),
  });
}


export function characterAssetKey(asset) {
  const normalized = normalizeCharacterAsset(asset);
  return normalized
    ? `${normalized.character_id}@${normalized.revision}:${normalized.content_hash}`
    : null;
}


export function characterAssetUrl(asset) {
  const normalized = normalizeCharacterAsset(asset);
  if (!normalized) return null;
  const url = normalized.glb_url;
  return url.startsWith("https://") || url.startsWith("/") ? url : publicUrl(url);
}
