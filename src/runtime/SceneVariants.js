export const SCENE_VARIANTS = Object.freeze([
  // 2026-08-05 产品决策：放弃「原始版本」（木屋夜集 hub-town），村落市集 1.0 成为唯一版本；
  // 旧 ?scene=original 链接经 sceneVariantFromLocation 兜底回落到这里
  Object.freeze({
    id: "v1",
    label: "1.0",
    title: "市集与广场 1.0",
    environmentAssetId: "environment.village-market.v1",
    visualProfile: "villageMarket",
    boothTemplateAssetId: null,
    cinematic: Object.freeze({
      position: Object.freeze([43, 32, 47]),
      target: Object.freeze([0, -0.4, 0]),
      orbit: Object.freeze([1.1, 0.3, 0.9]),
      far: 140,
    }),
  }),
]);

export const SCENE_VARIANT_OPTIONS = SCENE_VARIANTS;

// 唯一版本即村落市集 1.0（场景更大，展位容量随街道/广场外扩）
export const DEFAULT_SCENE_VARIANT_ID = "v1";


export function sceneVariantById(value) {
  return SCENE_VARIANTS.find((variant) => variant.id === value) ?? null;
}


export function sceneVariantFromLocation(location = window.location) {
  const requested = new URLSearchParams(location.search).get("scene");
  return (
    SCENE_VARIANT_OPTIONS.find((variant) => variant.id === requested) ??
    SCENE_VARIANT_OPTIONS.find((variant) => variant.id === DEFAULT_SCENE_VARIANT_ID)
  );
}


export function navigateToSceneVariant(variantId, location = window.location) {
  const variant = SCENE_VARIANT_OPTIONS.find((candidate) => candidate.id === variantId);
  if (!variant) return false;
  const nextUrl = new URL(location.href);
  nextUrl.searchParams.set("scene", variant.id);
  nextUrl.searchParams.set("world", "hall");
  location.assign(nextUrl.href);
  return true;
}
