import fs from "node:fs";
import { createCharacter } from "../../src/scenes/Characters.js";
for(const [id,name,color,seed]of [["linyu","林予",0x447f71,2],["zhouche","周澈",0xc18167,1]]){
  const a=createCharacter({name,color,seed});a.root.rotation.y=-.14;a.root.updateMatrixWorld(true);const g=a.mesh.geometry;
  const data={materials:[{name:"avatar-cloth",color:[1,1,1],roughness:.83,metalness:0,vertexColors:true}],geometries:[{id:0,positions:Array.from(g.attributes.position.array),normals:Array.from(g.attributes.normal.array),colors:Array.from(g.attributes.color.array),uvs:Array.from(g.attributes.uv.array),indices:g.index?Array.from(g.index.array):null}],objects:[{name:"avatar-"+id,geometry:0,material:"avatar-cloth",matrix:a.mesh.matrixWorld.toArray()}],camera:{position:[1.6,1.35,4.0],target:[0,.85,0],fov:36},metadata:{source:"Real runtime procedural avatar, bind pose; offline Blender reference",transparent:true}};
  fs.writeFileSync(new URL(id+".json",import.meta.url),JSON.stringify(data));a.dispose();
}
