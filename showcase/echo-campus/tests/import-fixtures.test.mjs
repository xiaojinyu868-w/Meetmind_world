import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { validateManifest } from "../src/runtime/SceneManifest.js";
const dir=new URL("../public/scenes/",import.meta.url);
test("self-contained 10m GLB fixture loads through real GLTFLoader without external assets",async()=>{
 const data=await readFile(new URL("import-test.glb",dir));
 assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);
 const jsonLength=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+jsonLength).toString("utf8").trim());
 assert.equal(json.buffers.length,1);assert.equal(json.buffers[0].uri,undefined);
 const buffer=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
 const gltf=await new GLTFLoader().parseAsync(buffer,"");
 let meshes=0;gltf.scene.traverse(o=>{if(o.isMesh)meshes++;});
 assert.ok(meshes>=15);
 assert.equal(gltf.scene.children[0].userData.units,"metres");
});
test("synthetic SPZ v2 has valid block lengths, finite coordinates and paired PLY vertex count",async()=>{
 const encoded=await readFile(new URL("import-test.spz",dir)),raw=gunzipSync(encoded);
 assert.equal(raw.readUInt32LE(0),0x5053474e);assert.equal(raw.readUInt32LE(4),2);
 const count=raw.readUInt32LE(8),fractional=raw[13];
 assert.equal(count,5875);assert.equal(raw.length,16+count*19);assert.equal(fractional,12);
 let minY=Infinity,maxY=-Infinity;
 for(let i=0;i<count;i++){const off=16+i*9;const s24=pos=>{let v=raw.readUIntLE(pos,3);if(v&0x800000)v-=0x1000000;return v/(1<<fractional);};const y=s24(off+3);minY=Math.min(minY,y);maxY=Math.max(maxY,y);assert.ok(Number.isFinite(s24(off))&&Number.isFinite(s24(off+6)));}
 assert.ok(Math.abs(minY)<.001);assert.ok(maxY>3.4&&maxY<3.6);
 const ply=await readFile(new URL("import-test.ply",dir)),header=ply.subarray(0,ply.indexOf("end_header")+11).toString();
 assert.ok(header.includes("element vertex "+count));assert.ok(header.includes("binary_little_endian"));
});
test("all fixture manifests validate and reference owned relative sample assets",async()=>{
 for(const ext of ["glb","ply","spz"]){const m=validateManifest(JSON.parse(await readFile(new URL("import-test."+ext+".json",dir),"utf8")));assert.equal(m.type,ext==="glb"?"glb":"splat");assert.deepEqual(m.rotation,[0,0,0]);assert.equal(m.anchors.people.length,18);assert.ok(m.url.endsWith("import-test."+ext));}
});
