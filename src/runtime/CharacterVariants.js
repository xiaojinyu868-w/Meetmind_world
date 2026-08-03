const PHOTO_CHARACTER_ASSETS = Object.freeze({
  storybook: Object.freeze({
    "person-self": "character.photo.host.storybook.v1",
    "lin-che": "character.photo.person_01.storybook.v1",
    "zhou-ning": "character.photo.person_02.storybook.v1",
    "chen-mo": "character.photo.person_03.storybook.v1",
    "xu-an": "character.photo.person_04.storybook.v1",
    "su-he": "character.photo.person_05.storybook.v1",
    "tang-ke": "character.photo.person_06.storybook.v1",
  }),
  voxel: Object.freeze({
    "person-self": "character.photo.host.voxel.v1",
    "lin-che": "character.photo.person_01.voxel.v1",
    "zhou-ning": "character.photo.person_02.voxel.v1",
    "chen-mo": "character.photo.person_03.voxel.v1",
    "xu-an": "character.photo.person_04.voxel.v1",
    "su-he": "character.photo.person_05.voxel.v1",
    "tang-ke": "character.photo.person_06.voxel.v1",
  }),
});


export const CHARACTER_VARIANTS = Object.freeze([
  Object.freeze({
    id: "storybook",
    label: "绘本角色",
    title: "照片特征驱动的绘本 Low-poly 角色",
    assetByPersonId: PHOTO_CHARACTER_ASSETS.storybook,
    fallbackAssetId: "character.faceless-painterly-adventure.v1",
    textureFilter: "linear",
  }),
  Object.freeze({
    id: "voxel",
    label: "像素角色",
    title: "固定方块身体与五面像素头像",
    assetByPersonId: PHOTO_CHARACTER_ASSETS.voxel,
    fallbackAssetId: "character.photo.host.voxel.v1",
    textureFilter: "nearest",
  }),
]);

export const CHARACTER_VARIANT_OPTIONS = Object.freeze(
  CHARACTER_VARIANTS.filter((variant) => variant.id !== "storybook"),
);

export const DEFAULT_CHARACTER_VARIANT_ID = "voxel";


export function characterVariantById(value) {
  return CHARACTER_VARIANTS.find((variant) => variant.id === value) ?? null;
}


export function characterVariantFromLocation(location = window.location) {
  const requested = new URLSearchParams(location.search).get("character");
  return (
    CHARACTER_VARIANT_OPTIONS.find((variant) => variant.id === requested) ??
    CHARACTER_VARIANT_OPTIONS.find((variant) => variant.id === DEFAULT_CHARACTER_VARIANT_ID)
  );
}


export function characterAssetId(variant, personId) {
  return variant.assetByPersonId[personId] ?? variant.fallbackAssetId;
}


export function navigateToCharacterVariant(variantId, location = window.location) {
  const variant = CHARACTER_VARIANT_OPTIONS.find((candidate) => candidate.id === variantId);
  if (!variant) return false;
  const nextUrl = new URL(location.href);
  nextUrl.searchParams.set("character", variant.id);
  location.assign(nextUrl.href);
  return true;
}
