import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import * as THREE from "three";
import {planEventGarden,createEventGarden,createLandscapeGrove} from "../src/scenes/EventGarden.js";

function fakeDocument(){return {createElement:()=>({width:0,height:0,getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};}

for(const id of ["venue-ab-canopy","venue-ab-towers","venue-c"]){
  const config=JSON.parse(await readFile(new URL(`../public/scenes/venue/${id}.json`,import.meta.url),"utf8"));
  test(`${id}: furniture preserves calibrated occupants, checkpoints, existing obstacles and aisles`,()=>{
    const before=JSON.stringify(config),layout=planEventGarden(config,{venueId:id}),{items,protectedPoints,protectedGap,bounds,corridors}=layout;
    assert.equal(JSON.stringify(config),before,"planning must not mutate the manifest");
    assert.ok(items.length>=5,`Expected a usable garden, received ${items.length} props`);
    for(const p of items){
      assert.ok(p.x-p.r>=bounds.minX && p.x+p.r<=bounds.maxX && p.z-p.r>=bounds.minZ && p.z+p.r<=bounds.maxZ,"Footprint remains in calibrated activity bounds");
      assert.equal(p.y,config.groundY,"Furniture rests on calibrated source ground without a raised global platform");
      assert.ok(protectedPoints.every(a=>Math.hypot(p.x-a.x,p.z-a.z)>=p.r+protectedGap),`Blocked protected point by ${p.kind}`);
      assert.ok((config.colliders||[]).every(a=>Math.hypot(p.x-a.x,p.z-a.z)>=p.r+a.r+.18),"Must not overlap source obstacles");
      assert.ok(p.x+p.r<=corridors.x.min || p.x-p.r>=corridors.x.max,"Keep longitudinal aisle clear");
      assert.ok(p.z+p.r<=corridors.z.min || p.z-p.r>=corridors.z.max,"Keep cross aisle clear");
    }
    for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)assert.ok(Math.hypot(items[i].x-items[j].x,items[i].z-items[j].z)>=items[i].r+items[j].r+.32,"Separate furniture footprints");
  });
}
test("Reject uncalibrated empty bounds instead of placing props near origin",()=>assert.throws(()=>planEventGarden({bounds:{minX:0,maxX:0,minZ:0,maxZ:0}}),/calibrated/));

test("Generated micro scene contains finite geometry and disposes shared resources exactly once",async()=>{
  const previous=globalThis.document;
  // Geometry/resource smoke without a GPU. Actual typography and shading are browser-verified separately.
  globalThis.document=fakeDocument();
  try{
    const config=JSON.parse(await readFile(new URL("../public/scenes/venue/venue-ab-canopy.json",import.meta.url),"utf8"));
    const garden=await createEventGarden({venueId:"venue-ab-canopy",config,quality:"high"});
    let triangles=0,meshCount=0,instances=0;const geometries=new Set(),materials=new Set(),textures=new Set();
    garden.root.traverse(o=>{if(!o.isMesh)return;meshCount++;geometries.add(o.geometry);const positions=o.geometry.attributes.position;
      for(const n of positions.array)assert.ok(Number.isFinite(n),"No invalid positions from extrusion / material merge");
      const count=o.isInstancedMesh?o.count:1;instances+=count;triangles+=(o.geometry.index?.count??positions.count)/3*count;
      const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}
    });
    assert.ok(meshCount<24,`Batching avoids per-leaf draw calls: ${meshCount}`);
    assert.ok(triangles<250000,`Micro scene vertex budget: ${triangles}`);
    assert.ok(instances>100,"Layered foliage comes from instancing");
    assert.equal(garden.colliders.length,garden.layout.items.length);
    const disposed=new Map();for(const r of [...geometries,...materials,...textures])r.addEventListener("dispose",()=>disposed.set(r,(disposed.get(r)||0)+1));
    garden.dispose();garden.dispose();assert.equal(garden.root.children.length,0);for(const r of [...geometries,...materials,...textures])assert.equal(disposed.get(r),1,"Shared resources are disposed exactly once");
  }finally{globalThis.document=previous;}
});

test("Generated bench loads once, replaces old lounge geometry, preserves pose and colliders, and disposes shared resources once",async()=>{
  const previous=globalThis.document;globalThis.document=fakeDocument();
  try{
    const config=JSON.parse(await readFile(new URL("../public/scenes/venue/venue-ab-canopy.json",import.meta.url),"utf8"));
    const material=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry(2.8,.7,.9);geometry.translate(3,2,-5);
    const source=new THREE.Group();source.add(new THREE.Mesh(geometry,material));let calls=0,geometryDisposed=0,materialDisposed=0;
    geometry.addEventListener("dispose",()=>geometryDisposed++);material.addEventListener("dispose",()=>materialDisposed++);
    const garden=await createEventGarden({venueId:"venue-ab-canopy",config,props:{useGeneratedBench:true,benchUrl:"bench.glb",benchWidth:2.8},loadGLTF:async()=>{calls++;return {scene:source};}});
    const benches=garden.root.children.filter(o=>o.name==="generated garden bench"),poses=garden.layout.items.filter(p=>p.kind==="lounge");
    assert.equal(calls,1);assert.equal(benches.length,poses.length);assert.equal(garden.warnings.length,0);
    assert.deepEqual(garden.colliders,planEventGarden(config).items.map(p=>({x:p.x,z:p.z,r:p.r,source:"event-garden",kind:p.kind})));
    for(let i=0;i<benches.length;i++){
      const p=poses[i],bench=benches[i];assert.deepEqual(bench.position.toArray(),[p.x,p.y,p.z]);assert.equal(bench.rotation.y,p.yaw);
      const box=new THREE.Box3().setFromObject(bench);assert.ok(Math.abs(box.min.y-p.y)<1e-5,"Imported feet normalized to ground");
      const localBounds=new THREE.Box3().setFromObject(bench.children[0]);
      for(const x of [localBounds.min.x,localBounds.max.x])for(const z of [localBounds.min.z,localBounds.max.z])assert.ok(Math.hypot(x-p.x,z-p.z)<=p.r+.001,"Imported bench remains inside authored footprint");
    }
    garden.dispose();garden.dispose();assert.equal(geometryDisposed,1);assert.equal(materialDisposed,1);
  }finally{globalThis.document=previous;}
});

test("Unavailable bench keeps the authored lounge instead of a blank prop slot",async()=>{
  const previous=globalThis.document;globalThis.document=fakeDocument();
  try{
    const config=JSON.parse(await readFile(new URL("../public/scenes/venue/venue-ab-canopy.json",import.meta.url),"utf8"));
    const garden=await createEventGarden({config,props:{useGeneratedBench:true,benchUrl:"missing.glb"},loadGLTF:async()=>{throw new Error("Network unavailable");}});
    assert.equal(garden.warnings.length,1);assert.ok(garden.root.getObjectByName("event-garden-oiled oak"));assert.equal(garden.root.children.filter(o=>o.name==="generated garden bench").length,0);garden.dispose();
  }finally{globalThis.document=previous;}
});

test("All three refined gardens stay under 250k triangles and 60 visible calls",async()=>{
  const previous=globalThis.document;globalThis.document=fakeDocument();
  try{
    for(const id of ["venue-ab-canopy","venue-ab-towers","venue-c"]){
      const config=JSON.parse(await readFile(new URL(`../public/scenes/venue/${id}.json`,import.meta.url),"utf8"));
      let imported=0;const garden=await createEventGarden({venueId:id,config,props:{treeUrl:"old-tree.glb",benchUrl:"old-bench.glb"},loadGLTF:async()=>{imported++;throw Error("Should not fetch legacy props by default");}});
      let triangles=0,calls=0;garden.root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);calls++;}});
      assert.equal(imported,0,"Legacy generated plastic foliage/bench no longer overrides authored garden");
      assert.ok(triangles<250000,`${id}: ${triangles}`);assert.ok(calls<60,`${id}: ${calls}`);
      assert.ok(garden.root.getObjectByName("complete zelkova leaf crowns"));assert.ok(garden.root.getObjectByName("terrace ornamental grasses"));
      console.log("refined garden budget",id,JSON.stringify({triangles,calls,items:garden.layout.items.map(p=>p.kind)}));garden.dispose();
    }
  }finally{globalThis.document=previous;}
});

test("Landscape grove grounds supplied trees, batches leaf crowns and owns no terrain",()=>{
  const points=Array.from({length:30},(_,i)=>({x:10+i*4,y:3+i*.03,z:8,scale:1+(i%3)*.08,yaw:i*.2}));
  const grove=createLandscapeGrove(points),stats=grove.root.userData.landscapeGrove;
  assert.equal(stats.trees,30);assert.ok(stats.triangles<170000,`Grove budget ${stats.triangles}`);assert.equal(stats.calls,3);
  assert.equal(grove.root.children.length,3);assert.ok(grove.root.getObjectByName("landscape connected leaf crowns").isInstancedMesh);
  const disposed=new Map();grove.root.traverse(o=>{if(o.geometry)o.geometry.addEventListener("dispose",()=>disposed.set(o.geometry,(disposed.get(o.geometry)||0)+1));});
  grove.dispose();grove.dispose();assert.ok([...disposed.values()].every(n=>n===1));console.log("grove budget",JSON.stringify(stats));
});
