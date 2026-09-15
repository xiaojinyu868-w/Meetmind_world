import test from "node:test";
import assert from "node:assert/strict";
import { registerScene, getSceneDefinition, listSceneDefinitions } from "../src/runtime/SceneRegistry.js";
test("built-in scene IDs, labels and factories are stable and immutable",()=>{
 const list=listSceneDefinitions();
 assert.deepEqual(list.slice(0,2).map(d=>d.id),["campus","gallery"]);
 assert.equal(getSceneDefinition("campus").displayName,"白庭校园");
 assert.equal(getSceneDefinition("gallery").displayName,"水上艺廊");
 assert.equal(typeof list[0].factory,"function");
 assert.ok(Object.isFrozen(list));assert.ok(Object.isFrozen(list[0]));
 assert.throws(()=>list.push({}));
 assert.throws(()=>registerScene({id:"campus",displayName:"overwrite",factory(){}}),/不允许覆盖/);
});
test("custom scene registration reaches selectors through one shared definition",async()=>{
 const scene={root:{},bounds:{},anchors:{},cameras:{}};const factory=async options=>({...scene,options});
 const registered=registerScene({id:"third-test-scene",displayName:"第三空间",helper:"手工建模实验",factory});
 assert.equal(getSceneDefinition("third-test-scene"),registered);
 assert.ok(listSceneDefinitions().some(d=>d.id==="third-test-scene"));
 assert.equal((await registered.factory({quality:"low"})).options.quality,"low");
 assert.throws(()=>getSceneDefinition("unknown"),/未注册/);
});
test("invalid registry definitions reject before modifying available scenes",()=>{
 const count=listSceneDefinitions().length;
 for(const bad of [
  {id:"Bad Id",displayName:"x",factory(){}},
  {id:"import",displayName:"x",factory(){}},
  {id:"missing-factory",displayName:"x"},
  {id:"bad-label",displayName:"<script>",factory(){}},
  {id:"bad-style",displayName:"x",factory(){},previewClass:'x onclick="bad"'},
 ])assert.throws(()=>registerScene(bad));
 assert.equal(listSceneDefinitions().length,count);
});
