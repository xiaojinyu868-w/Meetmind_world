import * as THREE from "three";

const MATERIALS = Object.freeze({
  paper: { roughness: 0.9, metalness: 0 },
  wood: { roughness: 0.78, metalness: 0 },
  ceramic: { roughness: 0.28, metalness: 0.05 },
  metal: { roughness: 0.33, metalness: 0.8 },
  fabric: { roughness: 1, metalness: 0 },
});
const GEOMETRIES = new Set(["box", "sphere", "cylinder", "cone", "torus"]);

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
function validateRecipe(recipe) {
  if (!exactKeys(recipe, ["schema", "title", "rationale", "parts"]) ||
    recipe.schema !== "meetmind.scene-recipe.v1" || !text(recipe.title, 80) ||
    !text(recipe.rationale, 800) || !Array.isArray(recipe.parts) ||
    recipe.parts.length < 1 || recipe.parts.length > 40) throw new Error("Invalid scene recipe");
  const ids = new Set();
  for (const part of recipe.parts) {
    if (!exactKeys(part, ["id", "geometry", "size", "position", "rotation", "color", "material", "meaning"]) ||
      !text(part.id, 64) || ids.has(part.id) || !text(part.meaning, 240) ||
      !GEOMETRIES.has(part.geometry) || !Object.hasOwn(MATERIALS, part.material) ||
      typeof part.color !== "string" || !/^#[0-9a-f]{6}$/i.test(part.color) ||
      !vector(part.size, .03, 3) || !vector(part.position, -2, 3) ||
      Math.abs(part.position[0]) > 2 || Math.abs(part.position[2]) > 2 ||
      part.position[1] < 0 || !vector(part.rotation, -Math.PI, Math.PI)) {
      throw new Error("Invalid recipe part");
    }
    ids.add(part.id);
  }
}
function updatePart(mesh, part) {
  mesh.name = part.id;
  mesh.userData.recipePartId = part.id;
  mesh.userData.recipeGeometry = part.geometry;
  mesh.userData.recipeMaterial = part.material;
  mesh.userData.meaning = part.meaning;
  mesh.position.set(...part.position);
  mesh.scale.set(...part.size);
  mesh.rotation.set(...part.rotation);
  mesh.material.color.set(part.color);
  Object.assign(mesh.material, MATERIALS[part.material]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

// Validate the complete proposal and allocate replacements before touching a live recipe.
export function syncRecipe(root, recipe) {
  validateRecipe(recipe);
  const existing = new Map(root.children.map(mesh => [mesh.userData.recipePartId, mesh]));
  const staged = [];
  try {
    for (const part of recipe.parts) {
      const current = existing.get(part.id);
      if (!current) {
        const shape = geometry(part.geometry);
        let material;
        try {
          material = new THREE.MeshStandardMaterial({ ...MATERIALS[part.material], color: part.color });
          staged.push({ part, mesh: new THREE.Mesh(shape, material), added: true });
        } catch (error) {
          shape.dispose();
          material?.dispose();
          throw error;
        }
      } else {
        staged.push({ part, mesh: current, added: false,
          replacement: current.userData.recipeGeometry !== part.geometry ? geometry(part.geometry) : null });
      }
    }
  } catch (error) {
    for (const item of staged) {
      if (item.added) disposeRecipe(item.mesh);
      else item.replacement?.dispose();
    }
    throw error;
  }
  for (const { part, mesh, added, replacement } of staged) {
    if (replacement) {
      const old = mesh.geometry;
      mesh.geometry = replacement;
      old.dispose();
    }
    updatePart(mesh, part);
    if (added) root.add(mesh);
    existing.delete(part.id);
  }
  for (const removed of existing.values()) {
    root.remove(removed);
    disposeRecipe(removed);
  }
  root.userData.recipeTitle = recipe.title;
  root.userData.recipeRationale = recipe.rationale;
  return root;
}
export function buildRecipe(recipe) {
  return syncRecipe(new THREE.Group(), recipe);
}
export function disposeRecipe(root) {
  root.traverse(object => {
    object.geometry?.dispose();
    if (object.material) object.material.dispose();
  });
}
