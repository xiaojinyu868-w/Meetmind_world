import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {createCanvas}=require("/tmp/node_modules/@napi-rs/canvas");
import * as THREE from "three";
import { createCampusScene, createGalleryScene } from "../../src/scenes/CampusScene.js";
import { createCharacter } from "../../src/scenes/Characters.js";
// Geometry-only export. Canvas calls are recorded/no-op; it does not execute WebGL.
globalThis.document={createElement:()=>createCanvas(512,512)};
const base=path.dirname(new URL(import.meta.url).pathname),matrix=new THREE.Matrix4(),color=new THREE.Color();
for(const [name,make] of [["campus",createCampusScene],["gallery",createGalleryScene]]){
  const result=await make({quality:"low"}),root=result.root,avatars=[];
  result.anchors.people.forEach((p,i)=>{const a=createCharacter({name:`Sample${i}`,seed:i,color:[0x536d66,0xaa9471,0x717982,0x6c775f][i%4]});a.root.position.set(p.x,p.y,p.z);a.root.rotation.y=p.yaw;a.update(0,0,"idle");root.add(a.root);avatars.push(a);});
  root.updateMatrixWorld(true);
  const materials=[],geometries=[],objects=[],matIds=new Map(),geoIds=new Map(),counts={meshes:0,triangles:0,invalidValues:0};
  function matId(m,tag="material"){
    if(matIds.has(m.uuid))return matIds.get(m.uuid);
    const id=materials.length,role=tag.replace("campus-","");
    const textureColors={white:[.90,.875,.80],paving:[.53,.55,.48],stone:[.715,.700,.632],wood:[.40,.235,.11],grass:[.128,.172,.06],leaf:[.25,.33,.18]};
    const c=m.color?.toArray();
    const def={name:role+"-"+id,color:c||[.5,.5,.5],roughness:m.roughness??.5,metalness:m.metalness??0,opacity:m.opacity??1,emissive:m.emissive?.toArray()||[0,0,0],vertexColors:!!m.vertexColors};
    if(tag.includes("water"))Object.assign(def,{name:"water-surface-"+id,color:[.18,.3,.27],roughness:.12,metalness:.2});
    if(m.map?.image?.toBuffer){
      const filename=`${name}-texture-${id}.png`;fs.writeFileSync(path.join(base,filename),m.map.image.toBuffer("image/png"));
      def.map={file:filename,repeat:m.map.repeat.toArray(),offset:m.map.offset.toArray(),flipY:m.map.flipY};
    }
    if(m.bumpMap)def.bumpScale=m.bumpScale;
    materials.push(def);matIds.set(m.uuid,def.name);return def.name;
  }
  function geoId(g){
    if(geoIds.has(g.uuid))return geoIds.get(g.uuid);
    const id=geometries.length,def={id,positions:Array.from(g.attributes.position.array),normals:g.attributes.normal?Array.from(g.attributes.normal.array):null,uvs:g.attributes.uv?Array.from(g.attributes.uv.array):null,colors:g.attributes.color?Array.from(g.attributes.color.array):null,indices:g.index?Array.from(g.index.array):null};
    counts.invalidValues+=def.positions.filter(x=>!Number.isFinite(x)).length;
    geometries.push(def);geoIds.set(g.uuid,id);return id;
  }
  root.traverse(o=>{
    if(!o.isMesh||!o.visible)return;counts.meshes++;
    const n=o.isInstancedMesh?o.count:1,g=o.geometry;counts.triangles+=(g.index?.count??g.attributes.position.count)/3*n;
    const material=matId(o.material,o.name||"material"),obj={name:o.name,geometry:geoId(g),material,matrix:o.matrixWorld.toArray()};
    if(o.isSkinnedMesh)obj.skinning="bind-pose (animation not exported)";
    if(o.isInstancedMesh){obj.instances=[];for(let i=0;i<n;i++){o.getMatrixAt(i,matrix);const ins={matrix:matrix.toArray()};if(o.instanceColor){o.getColorAt(i,color);ins.color=color.toArray();}obj.instances.push(ins);}}
    objects.push(obj);
  });
  const data={metadata:{source:"Three.js geometry exported without WebGL",quality:"low foliage density, high architecture; artistic Blender reference only",avatars:"24 supplied bind-pose procedural avatars",counts},materials,geometries,objects,camera:result.cameras.hero,cameras:result.cameras};
  fs.mkdirSync(base,{recursive:true});fs.writeFileSync(path.join(base,name+".json"),JSON.stringify(data));console.log(name,JSON.stringify(counts));
  avatars.forEach(a=>a.dispose());result.dispose();
}
