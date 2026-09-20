import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {prepareStandardDepthResume,consumeStandardDepthResume,discardStandardDepthResume,resumeDepthIfCurrent} from "../src/runtime/DepthModeResume.js";
import {adaptPolygonOffsetMaterials,cachePrecisionBounds} from "../src/runtime/RenderPrecision.js";

test("fallback restores the exact selected imported file and manifest once",async()=>{
 const data=new Map(),files=new Map();
 const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const file=new Blob(["fixture"]),options={manifest:{type:"splat",name:"Test"},file};
 const url=await prepareStandardDepthResume({id:"import",options},{currentUrl:"https://example.test/?venue=venue-campus",storage,saveFile:async(k,v)=>files.set(k,v)});
 assert.equal(new URL(url).searchParams.get("depth"),"standard");
 const record=await consumeStandardDepthResume({search:new URL(url).search,storage,loadFile:async k=>{const v=files.get(k);files.delete(k);return v}});
 assert.equal(record.id,"import");assert.equal(record.options.file,file);assert.deepEqual(record.options.manifest,options.manifest);
 assert.equal(files.size,0);assert.equal(data.size,0);
 assert.equal(await consumeStandardDepthResume({search:new URL(url).search,storage}),null);
});

test("offset adaptation is idempotent and returns canonical units in conventional mode",()=>{
 const root=new THREE.Group(),material=new THREE.MeshBasicMaterial({polygonOffset:true,polygonOffsetUnits:-4,polygonOffsetFactor:-1});
 root.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
 adaptPolygonOffsetMaterials(root,true);assert.equal(material.polygonOffsetUnits,4);
 adaptPolygonOffsetMaterials(root,true);assert.equal(material.polygonOffsetUnits,4);
 adaptPolygonOffsetMaterials(root,false);assert.equal(material.polygonOffsetUnits,-4);
 material.polygonOffsetUnits=-2;adaptPolygonOffsetMaterials(root,true);assert.equal(material.polygonOffsetUnits,2);
});

test("cached precision bounds include translated instances without counting distant horizon",()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(2,2,2),material=new THREE.MeshBasicMaterial();
 const mesh=new THREE.InstancedMesh(geometry,material,2);mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,0,0));mesh.setMatrixAt(1,new THREE.Matrix4().makeTranslation(100,0,0));root.add(mesh);
 const backdrop=new THREE.Mesh(new THREE.BoxGeometry(8000,1,8000),material);backdrop.userData.noCollision=true;root.add(backdrop);
 const boxes=cachePrecisionBounds(root,{exclude:backdrop});assert.equal(boxes.length,1);assert.equal(boxes[0].max.x,101);assert.equal(boxes[0].min.x,-1);
});

test("a later scene choice cancels an in-flight depth reload and releases the old import",async()=>{
 let serial=1,finishPrepare;
 const discarded=[],navigated=[];
 const pending=resumeDepthIfCurrent({id:"import",options:{}},{
  isCurrent:()=>serial===1,
  prepare:()=>new Promise(resolve=>{finishPrepare=resolve}),
  discard:async url=>discarded.push(url),replace:url=>navigated.push(url)
 });
 serial=2;finishPrepare("https://example.test/?depth=standard");
 assert.equal(await pending,false);assert.equal(navigated.length,0);assert.equal(discarded.length,1);
});

test("the still-current depth reload navigates once and retains its transfer",async()=>{
 const navigated=[];let discarded=false;
 const result=await resumeDepthIfCurrent({id:"gallery",options:{}},{isCurrent:()=>true,prepare:async()=>"https://example.test/?depth=standard",discard:async()=>{discarded=true},replace:url=>navigated.push(url)});
 assert.equal(result,true);assert.equal(navigated.length,1);assert.equal(discarded,false);
});

test("discard removes both resume metadata and its temporary local file",async()=>{
 const data=new Map(),files=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const url=await prepareStandardDepthResume({id:"import",options:{file:new Blob(["fixture"]),manifest:{type:"splat"}}},{currentUrl:"https://example.test/",storage,saveFile:async(k,v)=>files.set(k,v)});
 await discardStandardDepthResume(url,{storage,removeFile:async key=>files.delete(key)});
 assert.equal(data.size,0);assert.equal(files.size,0);
 await discardStandardDepthResume(url,{storage,removeFile:async()=>{throw new Error("already removed")}});
});

test("metadata storage failure rolls back an already-saved local import",async()=>{
 const files=new Map(),storage={setItem:()=>{throw new Error("quota")},removeItem:()=>{}};
 await assert.rejects(prepareStandardDepthResume({id:"import",options:{file:new Blob(["fixture"])}},{currentUrl:"https://example.test/",storage,saveFile:async(k,v)=>files.set(k,v),removeFile:async key=>files.delete(key)}),/quota/);
 assert.equal(files.size,0);
});

test("ordinary startup and denied resume storage do not block scene loading",async()=>{
 assert.equal(await consumeStandardDepthResume({search:"?venue=venue-campus"}),null);
 assert.equal(await consumeStandardDepthResume({search:"?depthResume=00000000-0000-0000-0000-000000000001",storage:{getItem:()=>{throw new Error("SecurityError")}}}),null);
});
