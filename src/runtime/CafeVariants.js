export const CAFE_SCENE_VARIANTS = Object.freeze([
  Object.freeze({
    id: "original",
    label: "原版",
    title: "原版咖啡厅",
    environmentAssetId: "environment.cafe.v1",
    visualProfile: "current",
  }),
  Object.freeze({
    id: "reference",
    label: "几何",
    title: "几何 Low-poly 咖啡厅",
    environmentAssetId: "environment.cafe.reference.v1",
    visualProfile: "referenceLowpoly",
  }),
  Object.freeze({
    id: "storybook",
    label: "绘本",
    title: "绘本咖啡厅",
    environmentAssetId: "environment.cafe.painterly.v1",
    visualProfile: "painterlyAdventure",
  }),
]);

export const DEFAULT_CAFE_SCENE_VARIANT_ID = "storybook";


export function cafeSceneVariantFromLocation(location = window.location) {
  const requested = new URLSearchParams(location.search).get("scene");
  return (
    CAFE_SCENE_VARIANTS.find((variant) => variant.id === requested) ??
    CAFE_SCENE_VARIANTS.find((variant) => variant.id === DEFAULT_CAFE_SCENE_VARIANT_ID)
  );
}


export function navigateToCafeSceneVariant(variantId, location = window.location) {
  const variant = CAFE_SCENE_VARIANTS.find((candidate) => candidate.id === variantId);
  if (!variant) return false;
  const nextUrl = new URL(location.href);
  nextUrl.searchParams.set("world", "cafe");
  nextUrl.searchParams.set("scene", variant.id);
  nextUrl.searchParams.delete("person");
  location.assign(nextUrl.href);
  return true;
}
