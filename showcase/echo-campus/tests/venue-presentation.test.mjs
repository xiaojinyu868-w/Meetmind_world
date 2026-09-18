import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { VENUE_CANDIDATES, loadVenueManifest, venueUrl, startupVenueFromSearch } from "../src/runtime/VenueCatalog.js";
import { inspectModelBounds, framingForModel, calibratedCheckpoints, setEventLayersVisible, applyModelFraming, cameraForVenueView, nearPlaneForDistance, fitBuildingPreset } from "../src/runtime/VenuePresentation.js";
import { defaultManifest } from "../src/runtime/SceneManifest.js";
const baseUrl="https://example.com/echo-campus/";

test("venue source files have distinct direct links and no invented A/B plot assignment",()=>{
 assert.equal(VENUE_CANDIDATES.length,3);
 assert.equal(new Set(VENUE_CANDIDATES.map(v=>v.manifest)).size,3);
 for(const c of VENUE_CANDIDATES){
  const url=new URL(venueUrl(c.id,{baseUrl:baseUrl+"?code=secret&capture=1#old"}));
  assert.equal(url.searchParams.get("venue"),c.id);assert.equal(url.searchParams.get("view"),"source");
  assert.equal(url.searchParams.has("code"),false);assert.equal(url.hash,"");
 }
 assert.match(VENUE_CANDIDATES[0].note,/不代表已确认/);
 assert.match(VENUE_CANDIDATES[1].note,/不代表已确认/);
 assert.throws(()=>venueUrl("missing",{baseUrl}),/未知/);
});
test("venue fetch resolves actual GLB relative to manifest and rejects missing or non-GLB assets",async()=>{
 const load=fetchImpl=>loadVenueManifest("venue-c",{baseUrl,fetchImpl});
 const result=await load(async url=>{
  assert.equal(url.href,baseUrl+"scenes/venue/venue-c.json");
  return {ok:true,text:async()=>JSON.stringify({...defaultManifest(),url:"./c-real.glb"})};
 });
 assert.equal(result.manifest.url,baseUrl+"scenes/venue/c-real.glb");
 await assert.rejects(load(async()=>({ok:false,status:404})),/读取失败/);
 await assert.rejects(load(async()=>({ok:true,text:async()=>JSON.stringify({...defaultManifest("splat"),url:"./test.spz"})})),/真实 GLB/);
 await assert.rejects(load(async()=>({ok:true,text:async()=>JSON.stringify(defaultManifest())})),/地址缺失/);
});
test("millimeter-normalized large site fits mobile camera presets beyond old 350m clip",()=>{
 const root=new THREE.Group();const mesh=new THREE.Mesh(new THREE.BoxGeometry(400000,180000,220000));root.add(mesh);root.scale.setScalar(.001);root.position.set(200,90,50);
 const bounds=inspectModelBounds(root);
 assert.deepEqual(bounds.size.toArray(),[400,180,220]);
 const cameras={hero:{position:[750,380,650]},aerial:{position:[800,700,600]}};
 const frame=framingForModel(bounds,cameras);
 for(const p of Object.values(cameras)){
  const farthest=new THREE.Vector3(...p.position).distanceTo(bounds.center)*1.3+bounds.radius;
  assert.ok(frame.far>farthest);assert.ok(frame.fogNear>=farthest-1e-9);
 }
 assert.ok(frame.maxDistance>130);assert.ok(frame.shadowSpan>53);
 const camera=new THREE.PerspectiveCamera(),controls={},sun=new THREE.DirectionalLight(),scene=new THREE.Scene();scene.background=new THREE.Color("white");
 applyModelFraming({bounds,cameras,camera,controls,sun,scene});
 assert.equal(camera.far,frame.far);assert.equal(controls.maxDistance,frame.maxDistance);assert.equal(scene.fog.near,frame.fogNear);
 root.traverse(o=>o.geometry?.dispose());mesh.material.dispose();
});
test("empty converted geometry rejects; checkpoint coordinates preserve explicit ground height without guesses",()=>{
 assert.throws(()=>inspectModelBounds(new THREE.Group()),/可见几何/);
 const points=calibratedCheckpoints({checkpoint_welcome:{x:12,y:8.2,z:-8},checkpoint_future:{x:23,y:8.4,z:9},arrival:{x:0,y:0,z:0}});
 assert.deepEqual(points,{welcome:[12,8.2,-8],future:[23,8.4,9]});
 assert.deepEqual(calibratedCheckpoints({}),{});
});
test("source/event layer switches preserve group contents and keep visibility as one state",()=>{
 const groups=Array.from({length:4},()=>{const g=new THREE.Group();g.add(new THREE.Object3D());return g;});
 setEventLayersVisible(groups,false);assert.ok(groups.every(g=>!g.visible&&g.children.length===1));
 setEventLayersVisible(groups,true);assert.ok(groups.every(g=>g.visible&&g.children.length===1));
});

test("survey slab affects clip safety but not calibrated subject lighting or fog",()=>{
 const building=new THREE.Group();building.add(new THREE.Mesh(new THREE.BoxGeometry(220,42,305)));
 const model=inspectModelBounds(building);
 const config={bounds:{minX:0,maxX:30,minZ:0,maxZ:30},framingBounds:{minX:-110,maxX:110,minY:-21,maxY:21,minZ:-152.5,maxZ:152.5},groundY:-21};
 const cameras={hero:{position:[230,160,350],target:[0,15,0]}};
 const normal=framingForModel(model,cameras,config);
 const slab=new THREE.Mesh(new THREE.BoxGeometry(1200,1,1200));slab.position.set(250,-22,200);building.add(slab);
 const withSlab=framingForModel(inspectModelBounds(building),cameras,config);
 assert.equal(withSlab.shadowSpan,normal.shadowSpan);
 assert.equal(withSlab.fogNear,normal.fogNear);assert.equal(withSlab.fogFar,normal.fogFar);
 assert.deepEqual(withSlab.sunTarget,normal.sunTarget);assert.deepEqual(withSlab.sunPosition,normal.sunPosition);
 assert.ok(withSlab.far>normal.far);
 building.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});
test("source and event views choose building and human scale camera presets",()=>{
 assert.equal(cameraForVenueView("event"),"arrival");
 assert.equal(cameraForVenueView("source"),"hero");
});

test("venue clipping keeps depth precision at building and attendee scale",()=>{
 assert.equal(nearPlaneForDistance(6),.5);
 assert.equal(nearPlaneForDistance(600),2);
 assert.equal(nearPlaneForDistance(150),.5);
});

test("plain event URL defaults to real C source model while explicit imported/built-in links remain valid",()=>{
 assert.equal(startupVenueFromSearch(""),"venue-c");
 assert.equal(startupVenueFromSearch("?entry=nfc&persona=01"),"venue-c");
 assert.equal(startupVenueFromSearch("?venue=venue-ab-towers"),"venue-ab-towers");
 assert.equal(startupVenueFromSearch("?scene=campus"),null);
 assert.equal(startupVenueFromSearch("?scene=gallery"),null);
 assert.equal(startupVenueFromSearch("?sceneManifest=./scene.json"),null);
});

test("portrait building fit keeps every subject corner within the screen",()=>{
 const root=new THREE.Mesh(new THREE.BoxGeometry(224,62,305));const bounds=inspectModelBounds(root);
 const fitted=fitBuildingPreset({position:[220,180,285],target:[0,20,0],fov:53},bounds,390/844);
 const camera=new THREE.PerspectiveCamera(53,390/844,.5,3000);camera.position.fromArray(fitted.position);camera.lookAt(...fitted.target);camera.updateMatrixWorld(true);
 for(const x of [bounds.box.min.x,bounds.box.max.x])for(const y of [bounds.box.min.y,bounds.box.max.y])for(const z of [bounds.box.min.z,bounds.box.max.z]){const ndc=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(ndc.x)<1&&Math.abs(ndc.y)<1);}
 root.geometry.dispose();root.material.dispose();
});
