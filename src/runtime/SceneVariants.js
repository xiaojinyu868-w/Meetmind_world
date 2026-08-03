export const SCENE_VARIANTS = Object.freeze([
  Object.freeze({
    id: "v1",
    label: "原始",
    title: "原始咖啡厅",
    environmentAssetId: "environment.cafe.v1",
    characterAssetId: "character.faceless-prototype.v1",
    visualProfile: "current",
  }),
  Object.freeze({
    id: "v2",
    label: "几何",
    title: "几何 Low-poly",
    environmentAssetId: "environment.cafe.reference.v1",
    characterAssetId: "character.faceless-reference-lowpoly.v1",
    visualProfile: "referenceLowpoly",
  }),
  Object.freeze({
    id: "v3",
    label: "绘本",
    title: "绘本冒险",
    environmentAssetId: "environment.cafe.painterly.v1",
    characterAssetId: "character.faceless-painterly-adventure.v1",
    visualProfile: "painterlyAdventure",
  }),
]);

export const DEFAULT_SCENE_VARIANT_ID = "v2";


export function sceneVariantById(value) {
  return SCENE_VARIANTS.find((variant) => variant.id === value) ?? null;
}


export function sceneVariantFromLocation(location = window.location) {
  const requested = new URLSearchParams(location.search).get("scene");
  return (
    sceneVariantById(requested) ??
    sceneVariantById(DEFAULT_SCENE_VARIANT_ID)
  );
}


export function navigateToSceneVariant(variantId, location = window.location) {
  const variant = sceneVariantById(variantId);
  if (!variant) return false;
  const nextUrl = new URL(location.href);
  nextUrl.searchParams.set("scene", variant.id);
  location.assign(nextUrl.href);
  return true;
}
