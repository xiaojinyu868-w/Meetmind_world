export const SCENE_VARIANTS = Object.freeze([
  Object.freeze({
    id: "original",
    label: "原始版本",
    title: "木屋夜集（保留）",
    environmentAssetId: "environment.hub-town.v1",
    visualProfile: "hubDusk",
    boothTemplateAssetId: "module.market-stall.v2",
    cinematic: Object.freeze({
      position: Object.freeze([6.45, 4.55, 8]),
      target: Object.freeze([0, 0.72, -0.35]),
      orbit: Object.freeze([0.45, 0.12, 0.34]),
    }),
  }),
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

// 默认保持木屋夜集（hub-town）；村落市集经 ?scene=v1 或场景版本切换器进入
export const DEFAULT_SCENE_VARIANT_ID = "original";


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
