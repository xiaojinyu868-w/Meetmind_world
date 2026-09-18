import * as THREE from "three";
import { createLandscapeGrove } from "../scenes/EventGarden.js";

const GRASS=new Set(["[Grass Light Green]","[Vegetation_Grass_Artificial]5","[Vegetation_Grass_Artificial]7","Grass","Grass2"]);

// A design layer anchored to actual source lawn triangles, never to a guessed Y.
export function createLandscapeSite(modelRoot,config,{quality="high",obstructionRoot=null}={}) {
  modelRoot.updateMatrixWorld(true);obstructionRoot?.updateMatrixWorld(true);
  const lawn=[],points=[],near=config.bounds,framing=config.framingBounds;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
  modelRoot.traverse(o=>{
    if(!o.isMesh||!GRASS.has(o.material?.name))return;
    const pos=o.geometry.attributes.position,idx=o.geometry.index,count=idx?.count||pos.count;
    for(let i=0;i<count;i+=3){a.fromBufferAttribute(pos,idx?idx.getX(i):i).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(pos,idx?idx.getX(i+1):i+1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(pos,idx?idx.getX(i+2):i+2).applyMatrix4(o.matrixWorld);normal.crossVectors(ab.subVectors(b,a),ac.subVectors(c,a));if(normal.length()<.1||Math.abs(normal.normalize().y)<.95)continue;lawn.push([a.clone(),b.clone(),c.clone()]);}
  });
  let seed=4981;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const v=new THREE.Vector3();
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  for(const triangle of lawn){
    const area=ab.subVectors(triangle[1],triangle[0]).cross(ac.subVectors(triangle[2],triangle[0])).length()*.5;
    const tries=Math.min(45,Math.floor(area/16));
    for(let i=0;i<tries;i++){
      const u=Math.sqrt(random()),r=random();v.copy(triangle[0]).multiplyScalar(1-u).addScaledVector(triangle[1],u*(1-r)).addScaledVector(triangle[2],u*r);
      if(v.y<-.1||v.y>30||v.x<framing.minX-50||v.x>framing.maxX+50||v.z<framing.minZ-65||v.z>framing.maxZ+45)continue;
      if(v.x>near.minX-3&&v.x<near.maxX+3&&v.z>near.minZ-3&&v.z<near.maxZ+3)continue;
      if(points.some(p=>Math.hypot(p.x-v.x,p.z-v.z)<6.8))continue;
      ray.set(v.clone().add(new THREE.Vector3(0,9,0)),down);const hits=obstructionRoot?ray.intersectObject(obstructionRoot,true):[];
      if(hits.some(h=>h.point.y>v.y+.15&&h.point.y<v.y+9))continue;
      points.push({x:v.x,y:v.y+.02,z:v.z,scale:(v.y>15?.9:1.45)+random()*.65,yaw:random()*Math.PI*2});
      if(points.length>=(quality==="low"?50:95))break;
    }if(points.length>=(quality==="low"?50:95))break;
  }
  const grove=createLandscapeGrove(points,{quality});grove.root.name="Landscape on verified source lawns";
  return {...grove,diagnostics:{trees:points.length,sourceLawnTriangles:lawn.length,points}};
}
