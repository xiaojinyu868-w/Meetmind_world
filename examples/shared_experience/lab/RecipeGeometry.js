import * as THREE from "three";

const MATERIALS = Object.freeze({
  paper: { roughness: 0.9, metalness: 0 },
  wood: { roughness: 0.78, metalness: 0 },
  ceramic: { roughness: 0.28, metalness: 0.05 },
  metal: { roughness: 0.33, metalness: 0.8 },
  fabric: { roughness: 1, metalness: 0 },
});
function geometry(kind) {
  switch (kind) {
    case "box": return new THREE.BoxGeometry(1, 1, 1);
    case "sphere": return new THREE.SphereGeometry(0.5, 24, 16);
    case "cylinder": return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case "cone": return new THREE.ConeGeometry(0.5, 1, 32);
    case "torus": return new THREE.TorusGeometry(0.35, 0.15, 12, 36);
    default: throw new Error("Unsupported recipe geometry");
  }
}
function vector(value, min, max) {
  return Array.isArray(value) && value.length === 3 && value.every(n =>
    typeof n === "number" && Number.isFinite(n) && n >= min && n <= max);
}
function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function text(value, limit) {
  return typeof value === "string" && value.trim().length > 0 && [...value.trim()].length <= limit;
}
export function buildRecipe(recipe) {
  if (!exactKeys(recipe, ["schema", "title", "rationale", "parts"]) ||
    recipe.schema !== "meetmind.scene-recipe.v1" || !text(recipe.title, 80) ||
    !text(recipe.rationale, 800) || !Array.isArray(recipe.parts) ||
    recipe.parts.length < 1 || recipe.parts.length > 40) throw new Error("Invalid scene recipe");
  const root = new THREE.Group();
  const ids = new Set();
  try {
    for (const part of recipe.parts) {
      if (!exactKeys(part, ["id", "geometry", "size", "position", "rotation", "color", "material", "meaning"]) ||
        !text(part.id, 64) || ids.has(part.id) || !text(part.meaning, 240) ||
        !Object.hasOwn(MATERIALS, part.material) || typeof part.color !== "string" ||
        !/^#[0-9a-f]{6}$/i.test(part.color) || !vector(part.size, .03, 3) ||
        !vector(part.position, -2, 3) || Math.abs(part.position[0]) > 2 ||
        Math.abs(part.position[2]) > 2 || part.position[1] < 0 ||
        !vector(part.rotation, -Math.PI, Math.PI)) throw new Error("Invalid recipe part");
      ids.add(part.id);
      const shape = geometry(part.geometry);
      const material = new THREE.MeshStandardMaterial({ ...MATERIALS[part.material], color: part.color });
      const mesh = new THREE.Mesh(shape, material);
      mesh.name = part.id;
      mesh.userData.meaning = part.meaning;
      mesh.position.set(...part.position);
      mesh.scale.set(...part.size);
      mesh.rotation.set(...part.rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    }
  } catch (error) {
    disposeRecipe(root);
    throw error;
  }
  root.userData.recipeTitle = recipe.title;
  return root;
}
export function disposeRecipe(root) {
  root.traverse(object => {
    object.geometry?.dispose();
    if (object.material) object.material.dispose();
  });
}
