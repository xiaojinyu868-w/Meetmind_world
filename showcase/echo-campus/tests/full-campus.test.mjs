import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { resolveStartupVenue, startupVenueFromSearch, venueById, venueViewLoadOptions } from "../src/runtime/VenueCatalog.js";
import { validateManifest } from "../src/runtime/SceneManifest.js";
import { fitBuildingPreset, presentationBoundsForModel, framingForModel } from "../src/runtime/VenuePresentation.js";
import { createEventLook } from "../src/runtime/EventLook.js";
import { architectureShadowGeometry } from "../src/runtime/ArchitectureShadows.js";
import { socialPeopleLayout } from "../src/runtime/SocialPeopleLayout.js";
import { DEMO_SOCIAL_PAIRS, demoSocialPose } from "../src/scenes/SocialEnsemble.js";
import { planEventGarden } from "../src/scenes/EventGarden.js";

const readManifest = async id => JSON.parse(await readFile(new URL(`../public/scenes/venue/${id}.json`, import.meta.url), "utf8"));
const campus = validateManifest(await readManifest("venue-campus"));
const canopy = validateManifest(await readManifest("venue-ab-canopy"));
const bounds = presentationBoundsForModel(null, campus);
function corners(box) {
  const result=[];
  for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) result.push(new THREE.Vector3(x,y,z));
  return result;
}
function cameraFor(preset, aspect) {
  const camera=new THREE.PerspectiveCamera(preset.fov,aspect,.5,10000);
  camera.position.fromArray(preset.position);camera.lookAt(...preset.target);camera.updateMatrixWorld(true);
  return camera;
}
function assertInFrustum(point,camera,label) {
  const p=point.clone().project(camera);
  assert.ok(Math.abs(p.x)<=1.00001&&Math.abs(p.y)<=1.00001&&p.z>=-1&&p.z<=1,`${label}: projected (${p.x},${p.y},${p.z})`);
}
function disposeMeshes(root) {
  const geometries=new Set(),materials=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}
function lookFixture() {
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xe2e7df);scene.fog=new THREE.Fog(0xe2e7df,100,300);
  const modelRoot=new THREE.Group();scene.add(modelRoot);
  const sun=new THREE.DirectionalLight(),hemi=new THREE.HemisphereLight(),fill=new THREE.DirectionalLight();scene.add(sun,sun.target,hemi,fill);
  const renderer={toneMappingExposure:1};
  return {scene,modelRoot,sun,hemi,fill,renderer,config:campus};
}

test("assembled campus semantic survives manifest validation and retains calibrated activity coordinates",()=>{
  assert.equal(campus.siteMode,"campus");
  assert.equal(canopy.siteMode,undefined);
  assert.equal(campus.scale,1);assert.deepEqual(campus.position,[0,0,0]);assert.deepEqual(campus.rotation,[0,0,0]);
  for(const key of ["bounds","spawn","groundY","anchors","colliders"])assert.deepEqual(campus[key],canopy[key],key);
  assert.ok(campus.framingBounds.maxX-campus.framingBounds.minX>canopy.framingBounds.maxX-canopy.framingBounds.minX);
  assert.ok(campus.framingBounds.maxZ-campus.framingBounds.minZ>canopy.framingBounds.maxZ-canopy.framingBounds.minZ);
  for(const id of ["hero","aerial","arrival","garden","towers","hub","commercial"])assert.ok(campus.cameras[id],id);
});

test("campus panorama and plan presets frame every calibrated campus corner on desktop and portrait",()=>{
  const frame=framingForModel(bounds,campus.cameras,campus);
  for(const id of ["hero","aerial"]){
    const original=campus.cameras[id];
    const desktop=cameraFor(original,1440/900);desktop.far=frame.far;desktop.updateProjectionMatrix();
    for(const corner of corners(bounds.box))assertInFrustum(corner,desktop,`${id} desktop`);
    const mobilePreset={...original,position:new THREE.Vector3(...original.position).sub(new THREE.Vector3(...original.target)).multiplyScalar(1.3).add(new THREE.Vector3(...original.target)).toArray(),fov:Math.min(58,original.fov+8)};
    const fitted=fitBuildingPreset(mobilePreset,bounds,390/844),mobile=cameraFor(fitted,390/844);
    for(const corner of corners(bounds.box))assertInFrustum(corner,mobile,`${id} portrait`);
  }
});

test("every campus region preset has its actual target in front of desktop and portrait cameras",()=>{
  for(const id of ["arrival","garden","towers","hub","commercial"]){
    const preset=campus.cameras[id],target=new THREE.Vector3(...preset.target);
    for(const aspect of [1440/900,390/844])assertInFrustum(target,cameraFor(preset,aspect),`${id} target`);
  }
});

test("campus expansion preserves garden fixtures, social poses and ordinary attendee layout",()=>{
  const original=planEventGarden(canopy,{venueId:"venue-ab-canopy"});
  const combined=planEventGarden(campus,{venueId:"venue-campus"});
  for(const key of ["y","bounds","protectedPoints","protectedGap","corridors","items"])assert.deepEqual(combined[key],original[key],key);
  const furniture=original.items.filter(p=>Number.isFinite(p.r??p.radius));
  assert.deepEqual(socialPeopleLayout(campus,furniture),socialPeopleLayout(canopy,furniture));
  for(const id of DEMO_SOCIAL_PAIRS.flat()){
    const pose=demoSocialPose(id,"venue-campus",campus.groundY);
    assert.deepEqual(pose,demoSocialPose(id,"venue-ab-canopy",canopy.groundY));assert.equal(pose.y,6.2991);
    assert.ok(pose.x>=campus.bounds.minX&&pose.x<=campus.bounds.maxX&&pose.z>=campus.bounds.minZ&&pose.z<=campus.bounds.maxZ);
  }
});

test("campus event look retains all original A04 site layers and restores source material identities",async()=>{
  const f=lookFixture(),surfaces=[];
  for(const name of ["[Color A04]","[Color A04]","[Color A04]2"]){
    const material=new THREE.MeshStandardMaterial();material.name=name;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(30,30),material);mesh.position.x=surfaces.length*40;
    f.modelRoot.add(mesh);surfaces.push({mesh,material});
  }
  const look=await createEventLook({...f,skyUrl:null});
  try{
    look.setEnabled(true);
    for(const {mesh,material}of surfaces){assert.equal(mesh.visible,true);assert.equal(mesh.material.visible,true);assert.notEqual(mesh.material,material);}
    look.setEnabled(false);
    for(const {mesh,material}of surfaces){assert.equal(mesh.material,material);assert.equal(mesh.visible,true);}
    look.setEnabled(true);for(const {mesh}of surfaces)assert.equal(mesh.material.visible,true);
  }finally{look.dispose();disposeMeshes(f.modelRoot);}
});

test("campus fog follows close and far views without erasing any calibrated region",async()=>{
  const f=lookFixture(),originalFog=f.scene.fog;
  const look=await createEventLook({...f,skyUrl:null});
  try{
    look.setEnabled(true);
    for(const id of ["hero","arrival","garden","aerial","towers","hub","commercial","hero"]){
      const preset=campus.cameras[id],camera=cameraFor(preset,1440/900),target=new THREE.Vector3(...preset.target);
      look.update(1/60,camera,target);
      assert.ok(f.scene.fog.far>f.scene.fog.near&&f.scene.fog.near>0);
      const maximumDepth=Math.max(...corners(bounds.box).map(p=>-p.clone().applyMatrix4(camera.matrixWorldInverse).z));
      assert.ok(maximumDepth<f.scene.fog.far,`${id}: whole site must remain before opaque fog`);
      for(const region of ["towers","hub","commercial"]){
        const depth=-new THREE.Vector3(...campus.cameras[region].target).applyMatrix4(camera.matrixWorldInverse).z;
        const t=THREE.MathUtils.clamp((depth-f.scene.fog.near)/(f.scene.fog.far-f.scene.fog.near),0,1),fog=t*t*(3-2*t);
        assert.ok(fog<.5,`${id} must retain ${region} contrast; fog=${fog}`);
      }
    }
    look.setEnabled(false);assert.equal(f.scene.fog,originalFog);
  }finally{look.dispose();disposeMeshes(f.modelRoot);}
});

test("campus shadow extraction includes canopy, tower and podium structure simultaneously",()=>{
  const root=new THREE.Group(),expected=[];
  const structural=["[Translucent_Glass_Safety]","[Color H01]1","Source material 21"];
  function add(name,index){
    const vertices=[index*10,8,10,index*10+4,8,10,index*10+4,14,10];
    const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
    const material=new THREE.MeshStandardMaterial();material.name=name;
    const mesh=new THREE.Mesh(geometry,material);root.add(mesh);return vertices;
  }
  structural.forEach((name,index)=>expected.push(...add(name,index)));
  add("Uviferaleaves",4);add("[Color A04]",5);
  const before=root.children.map(o=>Array.from(o.geometry.attributes.position.array));
  const result=architectureShadowGeometry(root,campus);
  try{
    assert.equal(result.diagnostics.profile,"campus");assert.equal(result.diagnostics.proxyTriangles,3);
    for(const name of structural)assert.equal(result.diagnostics.materials[name],1);
    assert.equal(result.diagnostics.materials.Uviferaleaves,undefined);assert.equal(result.diagnostics.materials["[Color A04]"],undefined);
    assert.deepEqual(Array.from(result.geometry.attributes.position.array),expected);
    assert.deepEqual(root.children.map(o=>Array.from(o.geometry.attributes.position.array)),before);
  }finally{result.geometry.dispose();disposeMeshes(root);}
});

test("shared event links migrate to the campus while explicit source, building and imported links retain intent",()=>{
  const cases=[
    ["", "venue-campus"],
    ["?entry=nfc&persona=02", "venue-campus"],
    ["?venue=venue-campus&view=event", "venue-campus"],
    ["?venue=venue-campus&view=source", "venue-campus"],
    ["?venue=venue-ab-canopy&view=event&camera=garden", "venue-campus"],
    ["?venue=venue-ab-canopy&view=source", "venue-ab-canopy"],
    ["?venue=venue-ab-canopy", "venue-ab-canopy"],
    ["?venue=venue-ab-canopy&view=event&scope=building", "venue-ab-canopy"],
    ["?venue=venue-ab-towers&view=event", "venue-ab-towers"],
    ["?venue=venue-c&view=source", "venue-c"],
    ["?scene=campus&view=event", null],
    ["?scene=gallery", null],
    ["?sceneManifest=./custom.json&view=event", null],
    ["?venue=unknown&view=event", "unknown"],
    ["?venue=&view=event", ""],
  ];
  for(const [search,expected]of cases)assert.equal(resolveStartupVenue(search),expected,search);
  assert.equal(startupVenueFromSearch("?venue=venue-ab-canopy&view=event"),"venue-ab-canopy","basic parser remains separate from migration");
  assert.equal(venueById(resolveStartupVenue("?venue=unknown&view=event")),null,"unknown id must still fail the normal lookup");
});

for(const id of ["towers","hub","commercial"]){
  test(`${id}: desktop preset frames every audited regional corner`,()=>{
    const raw=campus.regionBounds[id];assert.ok(raw,`${id} audited bounds`);
    const region=presentationBoundsForModel(null,{framingBounds:raw});
    const camera=cameraFor(campus.cameras[id],1440/900);
    for(const corner of corners(region.box))assertInFrustum(corner,camera,`${id} desktop region`);
  });
  test(`${id}: portrait fit frames every audited regional corner`,()=>{
    const region=presentationBoundsForModel(null,{framingBounds:campus.regionBounds[id]});
    const original=campus.cameras[id],target=new THREE.Vector3(...original.target);
    const widened={...original,position:new THREE.Vector3(...original.position).sub(target).multiplyScalar(1.3).add(target).toArray(),fov:Math.min(58,original.fov+8)};
    const fitted=fitBuildingPreset(widened,region,390/844),mobile=cameraFor(fitted,390/844);
    for(const corner of corners(region.box))assertInFrustum(corner,mobile,`${id} portrait region`);
  });
}

test("explicit source inspection stays a single building when changing layers and reopening the URL",()=>{
  for(const id of ["venue-ab-canopy","venue-ab-towers","venue-c"]){
    const url=new URL(`https://example.test/echo-campus/?venue=${id}&view=source&camera=hero`);
    for(const view of ["event","source","event"]){
      const options=venueViewLoadOptions(id,view);
      assert.deepEqual(options,{view,scope:"building"});
      url.searchParams.set("view",options.view);url.searchParams.set("scope",options.scope);
      assert.equal(resolveStartupVenue(url.search),id,`${id} ${view} must survive reload after explicit layer selection`);
    }
  }
  assert.deepEqual(venueViewLoadOptions("venue-campus","event"),{view:"event"});
  assert.deepEqual(venueViewLoadOptions("venue-campus","source"),{view:"source"});
  assert.throws(()=>venueViewLoadOptions("missing","event"),/未知/);
});
