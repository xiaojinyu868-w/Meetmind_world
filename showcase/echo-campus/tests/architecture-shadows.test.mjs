import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { architectureShadowGeometry, createArchitectureShadows } from "../src/runtime/ArchitectureShadows.js";
const config = { framingBounds: { minX: -20,maxX:20,minY:-1,maxY:20,minZ:-20,maxZ:20 } };
function triangle(name, vertices) {
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  const material = new THREE.MeshStandardMaterial();material.name=name;
  return new THREE.Mesh(geometry,material);
}
function model() {
  const root = new THREE.Group();
  const wall=triangle("[Translucent_Glass_Safety]",[0,0,0,4,0,0,4,6,0]);root.add(wall);
  const roof=triangle("beton3",[0,6,0,4,6,0,4,6,4]);root.add(roof);
  return {root,wall,roof};
}
test("proxy copies exact large structural surfaces, skips foliage, tiny detail and out-of-frame land",()=>{
 const {root,wall,roof}=model();
 root.add(triangle("Uviferaleaves",[0,0,0,4,0,0,4,8,0]));
 root.add(triangle("beton3",[0,0,0,.01,0,0,.01,.01,0]));
 root.add(triangle("beton3",[500,0,0,504,0,0,504,6,0]));
 const r=architectureShadowGeometry(root,config);
 assert.equal(r.diagnostics.proxyTriangles,2);assert.equal(r.diagnostics.profile,"canopy");
 assert.deepEqual(Array.from(r.geometry.attributes.position.array),[...wall.geometry.attributes.position.array,...roof.geometry.attributes.position.array]);
 assert.equal(r.diagnostics.materials.Uviferaleaves,undefined);
});
test("nested transforms remain source exact and never mutate source buffers",()=>{
 const {root,wall}=model();root.remove(root.children[1]);root.position.set(5,0,3);wall.position.set(2,0,-1);
 const before=Array.from(wall.geometry.attributes.position.array);const r=architectureShadowGeometry(root,config);
 assert.deepEqual(Array.from(r.geometry.attributes.position.array),[2,0,-1,6,0,-1,6,6,-1]);
 assert.deepEqual(Array.from(wall.geometry.attributes.position.array),before);
});
test("triangle budget retains largest actual faces, does not fabricate a hull",()=>{
 const {root}=model();const r=architectureShadowGeometry(root,config,{maxTriangles:1});
 assert.equal(r.diagnostics.candidateTriangles,2);assert.equal(r.diagnostics.proxyTriangles,1);
 assert.deepEqual(Array.from(r.geometry.attributes.position.array),[0,0,0,4,0,0,4,6,0]);
});
test("proxy is initially disabled, has no color/depth effect, only disposes owned resources",()=>{
 const {root,wall}=model();const scene=new THREE.Scene();scene.add(root);let sourceDisposed=0;wall.material.addEventListener("dispose",()=>sourceDisposed++);wall.geometry.addEventListener("dispose",()=>sourceDisposed++);
 const proxy=createArchitectureShadows(root,config);scene.add(proxy.root);proxy.update(new THREE.PerspectiveCamera(),new THREE.Vector3());
 assert.equal(proxy.root.visible,false);const mesh=proxy.root.children[0];assert.equal(mesh.material.colorWrite,false);assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.allowOverride,false);assert.equal(mesh.customDepthMaterial.depthWrite,true);assert.equal(mesh.castShadow,true);
 proxy.setEnabled(true);assert.equal(proxy.root.visible,true);proxy.setEnabled(false);assert.equal(proxy.root.visible,false);
 let disposed=0;mesh.geometry.addEventListener("dispose",()=>disposed++);proxy.dispose();proxy.dispose();assert.equal(sourceDisposed,0);assert.equal(disposed,1);assert.equal(proxy.root.parent,null);
});
test("unsupported imports and absent framing stay empty rather than guessing geometry",()=>{
 const root=new THREE.Group();root.add(triangle("random blue model",[0,0,0,4,0,0,4,6,0]));
 assert.equal(architectureShadowGeometry(root,config).diagnostics.proxyTriangles,0);
 assert.equal(architectureShadowGeometry(model().root,{}).diagnostics.proxyTriangles,0);
});
