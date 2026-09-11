import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SemanticObjects } from "./SceneObjects.js";
import { buildRecipe, syncRecipe, disposeRecipe } from "./RecipeGeometry.js";

const recipe = () => ({
  schema: "meetmind.scene-recipe.v1", title: "Paper bridge", rationale: "Shared work",
  parts: [{ id: "deck", geometry: "box", size: [1.4, .1, .8], position: [0, .6, 0], rotation: [0, 0, 0],
    color: "#edd8b1", material: "paper", meaning: "共同完成的桥面" }],
});
const entity = () => ({ id: "artifact-1", kind: "artifact", title: "Our bridge" });

test("applying and editing a recipe retain entity, visual and part identities", () => {
  const objects = new SemanticObjects(new THREE.Scene());
  const apply = appearance => objects.apply({
    entities: [{ ...entity(), ...(appearance ? { appearance } : {}) }], relationships: [],
  });
  apply();
  const object = objects.objects.get("artifact-1");
  const position = object.position.clone();
  apply(recipe());
  const visual = object.userData.recipeVisual;
  const part = visual.children[0];
  const shape = part.geometry;
  const material = part.material;
  let disposed = 0;
  shape.addEventListener("dispose", () => disposed++);
  material.addEventListener("dispose", () => disposed++);
  assert.equal(visual.position.y, .16);
  assert.equal(part.userData.meaning, "共同完成的桥面");
  assert.equal(object.userData.defaultVisual.visible, false);

  apply(recipe());
  assert.equal(object.userData.recipeVisual, visual);
  const changed = recipe();
  Object.assign(changed.parts[0], {
    size: [1.5, .2, .9], position: [.2, .7, -.1], rotation: [0, .1, .2],
    color: "#889977", material: "metal", meaning: "共同加固的桥面",
  });
  apply(changed);
  assert.equal(objects.objects.get("artifact-1"), object);
  assert.ok(object.position.equals(position));
  assert.equal(object.userData.recipeVisual, visual);
  assert.equal(visual.children[0], part);
  assert.equal(part.geometry, shape);
  assert.equal(part.material, material);
  assert.equal(disposed, 0);
  assert.equal(material.color.getHexString(), "889977");
  assert.equal(material.metalness, .8);
  assert.equal(material.roughness, .33);
  assert.deepEqual(part.scale.toArray(), changed.parts[0].size);
  assert.deepEqual(part.position.toArray(), changed.parts[0].position);
  assert.deepEqual(part.rotation.toArray().slice(0, 3), changed.parts[0].rotation);
  assert.equal(part.userData.meaning, changed.parts[0].meaning);
  apply();
  assert.equal(disposed, 2);
  assert.equal(object.userData.recipeVisual, null);
  assert.equal(object.userData.defaultVisual.visible, true);
  assert.equal(objects.created, 1);
  objects.dispose();
});

test("part IDs preserve unchanged objects across reorder, addition, type change and removal", () => {
  const value = recipe();
  value.parts.push({ ...value.parts[0], id: "rail", size: [.1, .4, .8], position: [-.5, .8, 0] });
  const root = buildRecipe(value);
  const deck = root.children.find(part => part.name === "deck");
  const rail = root.children.find(part => part.name === "rail");
  const deckShape = deck.geometry;
  const deckMaterial = deck.material;
  const railShape = rail.geometry;
  const railMaterial = rail.material;
  let deckDisposed = 0;
  let railGeometryDisposed = 0;
  let railMaterialDisposed = 0;
  deckShape.addEventListener("dispose", () => deckDisposed++);
  railShape.addEventListener("dispose", () => railGeometryDisposed++);
  railMaterial.addEventListener("dispose", () => railMaterialDisposed++);

  const changed = structuredClone(value);
  changed.parts.reverse();
  changed.parts.find(part => part.id === "rail").geometry = "cylinder";
  changed.parts.push({ ...changed.parts[0], id: "post", geometry: "cone", position: [.5, .8, 0] });
  assert.equal(syncRecipe(root, changed), root);
  assert.equal(root.children.find(part => part.name === "deck"), deck);
  assert.equal(root.children.find(part => part.name === "rail"), rail);
  assert.equal(deck.geometry, deckShape);
  assert.equal(deck.material, deckMaterial);
  assert.equal(rail.material, railMaterial);
  assert.notEqual(rail.geometry, railShape);
  assert.equal(rail.geometry.type, "CylinderGeometry");
  assert.equal(deckDisposed, 0);
  assert.equal(railGeometryDisposed, 1);
  assert.equal(railMaterialDisposed, 0);
  const replacementShape = rail.geometry;
  let replacementDisposed = 0;
  replacementShape.addEventListener("dispose", () => replacementDisposed++);
  changed.parts = changed.parts.filter(part => part.id !== "rail");
  syncRecipe(root, changed);
  assert.equal(root.children.length, 2);
  assert.equal(rail.parent, null);
  assert.equal(replacementDisposed, 1);
  assert.equal(railMaterialDisposed, 1);
  assert.equal(deckDisposed, 0);
  disposeRecipe(root);
});

test("an invalid later part leaves the entire existing recipe untouched", () => {
  const root = buildRecipe(recipe());
  const part = root.children[0];
  const shape = part.geometry;
  const material = part.material;
  const originalTransform = part.matrix.clone();
  let disposed = 0;
  shape.addEventListener("dispose", () => disposed++);
  material.addEventListener("dispose", () => disposed++);
  const changed = recipe();
  changed.title = "Changed title";
  changed.rationale = "Changed interpretation";
  changed.parts[0].geometry = "sphere";
  changed.parts[0].color = "#000000";
  changed.parts[0].position = [1, 1, 1];
  changed.parts.push({ ...changed.parts[0], id: "invalid", geometry: "eval" });
  assert.throws(() => syncRecipe(root, changed));
  assert.equal(root.children.length, 1);
  assert.equal(root.children[0], part);
  assert.equal(part.geometry, shape);
  assert.equal(part.material, material);
  assert.equal(material.color.getHexString(), "edd8b1");
  assert.deepEqual(part.position.toArray(), [0, .6, 0]);
  assert.ok(part.matrix.equals(originalTransform));
  assert.equal(root.userData.recipeTitle, "Paper bridge");
  assert.equal(root.userData.recipeRationale, "Shared work");
  assert.equal(disposed, 0);
  disposeRecipe(root);
});

test("a malformed initial recipe falls back and a malformed update preserves the last valid visual", () => {
  assert.throws(() => buildRecipe({ ...recipe(), parts: [{ ...recipe().parts[0], geometry: "eval" }] }));
  const objects = new SemanticObjects(new THREE.Scene());
  const apply = appearance => objects.apply({ entities: [{ ...entity(), appearance }], relationships: [] });
  apply({ schema: "bad" });
  const object = objects.objects.get("artifact-1");
  assert.ok(object.userData.recipeError);
  assert.equal(object.userData.defaultVisual.visible, true);
  apply(recipe());
  const visual = object.userData.recipeVisual;
  const part = visual.children[0];
  apply({ schema: "bad" });
  assert.ok(object.userData.recipeError);
  assert.equal(object.userData.defaultVisual.visible, false);
  assert.equal(object.userData.recipeVisual, visual);
  assert.equal(visual.children[0], part);
  apply(recipe());
  assert.equal(object.userData.recipeError, null);
  assert.equal(object.userData.recipeVisual, visual);
  objects.dispose();
});

test("renderer rejects out of contract coordinates, duplicate IDs and unrecognized fields", () => {
  for (const modification of [
    r => r.parts[0].position = [0, -1, 0],
    r => r.parts[0].position = [2.5, 1, 0],
    r => r.parts[0].position = [0, 1, 2.5],
    r => r.parts[0].position = [0, NaN, 0],
    r => r.parts[0].size = [0, 1, 1],
    r => r.parts[0].rotation = [Infinity, 0, 0],
    r => r.parts[0].url = "https://example.invalid/asset",
    r => r.parts[0].meaning = "",
    r => r.parts[0].material = "unknown",
    r => r.parts[0].color = "red",
    r => r.parts.push(structuredClone(r.parts[0])),
    r => r.code = "unrecognized",
  ]) {
    const value = recipe();
    modification(value);
    assert.throws(() => buildRecipe(value));
  }
});
