import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SemanticObjects } from "./SceneObjects.js";
import { buildRecipe } from "./RecipeGeometry.js";

const recipe = () => ({ schema:"meetmind.scene-recipe.v1", title:"Paper bridge", rationale:"Shared work",
  parts:[{id:"deck",geometry:"box",size:[1.4,.1,.8],position:[0,.6,0],rotation:[0,0,0],
    color:"#edd8b1",material:"paper",meaning:"共同完成的桥面"}]});
const entity = () => ({id:"artifact-1",kind:"artifact",title:"Our bridge"});
test("apply, reapply, change and remove recipe retain entity root and release replaced geometry",()=>{
  const objects = new SemanticObjects(new THREE.Scene());
  const apply = e=>objects.apply({entities:[e],relationships:[]});
  apply(entity());
  const object = objects.objects.get("artifact-1");
  const position = object.position.clone();
  apply({...entity(),appearance:recipe()});
  const visual = object.userData.recipeVisual;
  assert.equal(visual.position.y, .16);
  assert.equal(visual.children[0].userData.meaning,"共同完成的桥面");
  assert.equal(object.userData.defaultVisual.visible,false);
  apply({...entity(),appearance:recipe()});
  assert.equal(object.userData.recipeVisual,visual);
  const changed=recipe();changed.parts[0].color="#889977";
  let disposed=false;
  visual.children[0].geometry.addEventListener("dispose",()=>{disposed=true;});
  apply({...entity(),appearance:changed});
  assert.ok(disposed);
  assert.equal(objects.objects.get("artifact-1"),object);
  assert.ok(object.position.equals(position));
  apply(entity());
  assert.equal(object.userData.recipeVisual,null);
  assert.equal(object.userData.defaultVisual.visible,true);
  assert.equal(objects.created,1);
  objects.dispose();
});
test("malformed recipe cannot execute or load assets; error falls back visibly",()=>{
  assert.throws(()=>buildRecipe({...recipe(),parts:[{...recipe().parts[0],geometry:"eval"}]}));
  const objects=new SemanticObjects(new THREE.Scene());
  objects.apply({entities:[{...entity(),appearance:{schema:"bad"}}],relationships:[]});
  const object=objects.objects.get("artifact-1");
  assert.ok(object.userData.recipeError);
  assert.equal(object.userData.defaultVisual.visible,true);
  objects.dispose();
});
test("renderer rejects out of contract coordinates and unrecognized fields", () => {
  for (const modification of [
    r => r.parts[0].position = [0, -1, 0],
    r => r.parts[0].position = [2.5, 1, 0],
    r => r.parts[0].position = [0, 1, 2.5],
    r => r.parts[0].url = "https://example.invalid/asset",
    r => r.parts[0].meaning = "",
    r => r.code = "unrecognized",
  ]) {
    const value = recipe();
    modification(value);
    assert.throws(() => buildRecipe(value));
  }
});
