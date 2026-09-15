import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultManifest, validateManifest } from "../src/runtime/SceneManifest.js";

if (!globalThis.FileReader) globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result=result;this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result=>{this.result="data:"+blob.type+";base64,"+Buffer.from(result).toString("base64");this.onloadend?.();}); }
};
const output=resolve(dirname(fileURLToPath(import.meta.url)),"../public/scenes");
await mkdir(output,{recursive:true});
const root=new THREE.Group();root.name="Synthetic 10m white exhibition pavilion";
root.userData={purpose:"synthetic import validation fixture",units:"metres",source:"procedural authored geometry"};
const white=new THREE.MeshStandardMaterial({color:0xf4f2e9,roughness:.55});
const stone=new THREE.MeshStandardMaterial({color:0xb9bbac,roughness:.8});
const bronze=new THREE.MeshStandardMaterial({color:0x987347,metalness:.7,roughness:.3});
const green=new THREE.MeshStandardMaterial({color:0x6e8663,roughness:1});
function box(x,y,z,w,h,d,material=white,name=""){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.name=name;root.add(mesh);return mesh;
}
box(0,-.12,0,10,.24,10,stone,"10m square floor");
box(0,3.45,-.7,10,.22,8.6,white,"White canopy");
box(-4.85,1.65,-.7,.3,3.3,8.6,white,"West wall");
box(4.85,1.65,-.7,.3,3.3,8.6,white,"East wall");
box(0,1.65,-4.85,10,3.3,.3,white,"Rear gallery wall");
for(const x of [-3.5,3.5])box(x,1.65,3.2,.18,3.3,.18,bronze,"Entrance column");
for(const x of [-2.7,0,2.7]){box(x,.42,-2.3,1.2,.84,1.2,stone,"Exhibition plinth");const sculpture=new THREE.Mesh(new THREE.TorusKnotGeometry(.35,.10,64,10),bronze);sculpture.position.set(x,1.25,-2.3);root.add(sculpture);}
for(const x of [-4.25,4.25]){box(x,.20,4.1,1.0,.40,1.2,stone,"Planter");const shrub=new THREE.Mesh(new THREE.SphereGeometry(.44,12,8),green);shrub.position.set(x,.62,4.1);root.add(shrub);}
root.updateMatrixWorld(true);
const glb=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true,trs:true});
await writeFile(resolve(output,"import-test.glb"),Buffer.from(glb));

// Small SH degree 0 Gaussian field. The same authored samples are encoded as PLY and SPZ v2.
const points=[];const step=.22;
function sample(x,y,z,r,g,b,s=.13){points.push({x,y,z,r,g,b,s});}
for(let ix=-22;ix<=22;ix++)for(let iz=-22;iz<=22;iz++)sample(ix*step,0,iz*step,.69,.73,.64);
for(let i=-22;i<=22;i++)for(let j=1;j<=15;j++){
 sample(i*step,j*step,-4.84,.92,.92,.88);
 sample(-4.84,j*step,i*step,.90,.91,.87);
 sample(4.84,j*step,i*step,.91,.92,.88);
}
for(let ix=-22;ix<=22;ix++)for(let iz=-22;iz<=14;iz++)sample(ix*step,3.52,iz*step,.93,.94,.90);
for(let i=0;i<160;i++){const a=i*Math.PI*2/160;sample(Math.cos(a)*.8,1.3+Math.sin(a)*.8,-1.6,.57,.38,.19,.09);}
const properties=["x","y","z","nx","ny","nz","f_dc_0","f_dc_1","f_dc_2","opacity","scale_0","scale_1","scale_2","rot_0","rot_1","rot_2","rot_3"];
const header=Buffer.from("ply\nformat binary_little_endian 1.0\ncomment Synthetic Echo Campus validation fixture; not a Marble export\nelement vertex "+points.length+"\n"+properties.map(p=>"property float "+p+"\n").join("")+"end_header\n");
const bytes=Buffer.alloc(points.length*properties.length*4),sh0=.28209479177387814;
points.forEach((p,i)=>{
 const row=[p.x,p.y,p.z,0,0,0,(p.r-.5)/sh0,(p.g-.5)/sh0,(p.b-.5)/sh0,3.0,Math.log(p.s),Math.log(p.s),Math.log(p.s),1,0,0,0];
 row.forEach((v,j)=>bytes.writeFloatLE(v,(i*properties.length+j)*4));
});
await writeFile(resolve(output,"import-test.ply"),Buffer.concat([header,bytes]));
const n=points.length,spz=Buffer.alloc(16+n*19);spz.writeUInt32LE(0x5053474e,0);spz.writeUInt32LE(2,4);spz.writeUInt32LE(n,8);spz[12]=0;spz[13]=12;spz[14]=0;spz[15]=0;
let at=16;for(const p of points)for(const v of [p.x,p.y,p.z]){const fixed=Math.round(v*4096);spz.writeUIntLE((fixed+0x1000000)%0x1000000,at,3);at+=3;}
for(let i=0;i<n;i++)spz[at++]=243;
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
for(const p of points)for(const v of [p.r,p.g,p.b])spz[at++]=clamp(((v-.5)*.15/sh0+.5)*255);
for(const p of points)for(let j=0;j<3;j++)spz[at++]=clamp((Math.log(p.s)+10)*16);
for(let i=0;i<n;i++)for(let j=0;j<3;j++)spz[at++]=128;
if(at!==spz.length)throw new Error("SPZ byte count mismatch");
await writeFile(resolve(output,"import-test.spz"),gzipSync(spz,{level:9}));
const cameras={
 hero:{position:[13,9,15],target:[0,1.2,0],fov:43},
 arrival:{position:[0,2.4,9],target:[0,1.4,-2],fov:48},
 garden:{position:[6,3,4],target:[0,1.2,-2],fov:48},
 aerial:{position:[9,16,10],target:[0,0,0],fov:46},
};
const base={...defaultManifest("glb"),name:"10 米白展厅 · 导入测试",bounds:{minX:-5,maxX:5,minZ:-5,maxZ:5},spawn:{x:0,y:0,z:4},anchors:{arrival:{x:0,y:0,z:4},meeting:{x:2,y:0,z:1},people:Array.from({length:18},(_,i)=>({x:-3.5+(i%6)*1.4,y:0,z:2.9-Math.floor(i/6)*1.3}))},cameras,colliders:[{x:-2.7,z:-2.3,r:.85},{x:0,z:-2.3,r:.85},{x:2.7,z:-2.3,r:.85}]};
for(const [extension,type] of [["glb","glb"],["ply","splat"],["spz","splat"]]){
 const m=validateManifest({...base,name:base.name+" ("+extension.toUpperCase()+")",type,url:"./import-test."+extension,rotation:[0,0,0]});
 await writeFile(resolve(output,"import-test."+extension+".json"),JSON.stringify(m,null,2)+"\n");
}
await writeFile(resolve(output,"README.md"),"# Synthetic import fixtures\n\nGenerated by scripts/generate-import-fixtures.mjs using owned procedural geometry. No photos, private data or third-party assets.\n\n- import-test.glb: self-contained 10 m white pavilion with exhibition plinths.\n- import-test.ply / import-test.spz: "+points.length+" authored Gaussians, SH degree 0. SPZ uses gzip-compressed version 2 and 12 fractional bits. This is NOT a Marble export.\n- Matching *.json use Y-up rotation [0,0,0], unlike the UI Marble-oriented X=180 initial default.\n\nThese files support future real loader/render checks. File creation and structural tests are NOT browser render validation.\n");
console.log(JSON.stringify({glbBytes:glb.byteLength,splats:n,spzRawBytes:spz.length,output}));
