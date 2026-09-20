import * as THREE from "three";
import { placeSignSurface } from "../runtime/SignSurface.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// A removable event layer: source architecture, calibrated ground and anchors are untouched.
const TAU = Math.PI * 2;
const PALETTE = Object.freeze({ stone: 0xdfd4be, wood: 0xa47645, sage: 0x829178, clay: 0xa7876f, dark: 0x344c3e, soil: 0x3c4030, brass: 0x89724e });
const PROTECTED_GAP = 1.05;
function random(seed) { let n=seed>>>0; return () => ((n=(n*1664525+1013904223)>>>0)/4294967296); }

/** Pure placement contract, also used by layout tests. All footprint circles remain in bounds. */
export function planEventGarden(config, { venueId = "", quality = "high" } = {}) {
  const b=config?.bounds;
  if (!b || ![b.minX,b.maxX,b.minZ,b.maxZ].every(Number.isFinite) || b.maxX<=b.minX || b.maxZ<=b.minZ) throw new Error("Event garden needs calibrated activity bounds");
  const width=b.maxX-b.minX, depth=b.maxZ-b.minZ, y=config.groundY ?? config.spawn?.y ?? 0;
  const points=[...(config.anchors?.people||[]),config.spawn,...Object.entries(config.anchors||{}).filter(([key])=>key.startsWith("checkpoint_")).map(([,p])=>p)].filter(Boolean);
  const existing=config.colliders||[], placed=[];
  const spawnX=config.spawn?.x ?? (b.minX+b.maxX)/2, meetingZ=config.anchors?.meeting?.z ?? (b.minZ+b.maxZ)/2;
  const corridorX={ min:spawnX-.95,max:spawnX+.95 };
  const corridorZ={ min:meetingZ-.52,max:meetingZ+.52 };
  function fits(x,z,r) {
    if(x-r<b.minX+.10||x+r>b.maxX-.10||z-r<b.minZ+.10||z+r>b.maxZ-.10)return false;
    if(x+r>corridorX.min&&x-r<corridorX.max)return false;
    if(z+r>corridorZ.min&&z-r<corridorZ.max)return false;
    if(points.some(p=>Math.hypot(p.x-x,p.z-z)<r+PROTECTED_GAP))return false;
    if(existing.some(p=>Math.hypot(p.x-x,p.z-z)<r+(p.r??p.radius??0)+.18))return false;
    return !placed.some(p=>Math.hypot(p.x-x,p.z-z)<r+p.r+.32);
  }
  function put(kind,u,v,r,yaw=0,extra={}) {
    const ideal={x:b.minX+width*u,z:b.minZ+depth*v};
    const offsets=[[0,0],[.6,0],[-.6,0],[0,.6],[0,-.6],[1.2,0],[-1.2,0],[.6,.6],[-.6,-.6],[1.8,0],[-1.8,0],[0,1.2],[0,-1.2]];
    for(const [dx,dz] of offsets){const x=ideal.x+dx,z=ideal.z+dz;if(fits(x,z,r)){placed.push({kind,x,y,z,r,yaw,...extra});return true;}}
    return false;
  }
  // A small family of garden rooms, not individually scattered pots. Every
  // room keeps a circular ground footprint; tree crowns begin above head height.
  const narrow=depth<14;
  const canopy=venueId==="venue-ab-canopy" || (narrow&&Math.abs(y-6.2991)<.05);
  for(const [u,v,yaw] of (narrow?[[.23,.20,0],[.72,.80,Math.PI],[.43,.82,Math.PI]]:[[.18,.77,Math.PI*.2],[.70,.81,-Math.PI*.2],[.80,.32,-Math.PI/2]])) put("lounge",u,v,1.38,yaw);
  // Tall multi-stem trees stand in substantial planted stone beds. Their trunks,
  // soil and understory are covered by the same collision circle.
  const treeSites=narrow?[[.08,.17,.8],[.55,.18,-.4],[.90,.82,1.4]]:[[.13,.37,.6],[.85,.66,1.2],[.47,.14,-.7]];
  for(const [u,v,yaw] of treeSites)put("planter",u,v,1.03,yaw,{treeScale:1});
  for(const [u,v,yaw] of (narrow?[[.08,.48,Math.PI/2],[.88,.45,-Math.PI/2]]:[[.16,.88,0],[.87,.84,0]]))put("guide",u,v,.48,yaw,{label:placed.some(p=>p.kind==="guide")?"MEET & CONNECT":"ECHO CAMPUS"});
  if(config.eventGarden?.socialIslands!==false){
    const islands=canopy?[[.215,.86,1.13,.42],[.65,.15,.96,2.1],[.80,.84,1.05,-.85]]:[[.23,.19,1.10,.42],[.79,.16,.94,2.1],[.38,.84,1.05,-.85]];
    for(const [u,v,treeScale,yaw] of islands){if(placed.filter(p=>p.kind==="planter"||p.kind==="tree-island").length>=4)break;put("tree-island",u,v,1.04,yaw,{treeScale,cluster:true});}
  }
  for(const [u,v,yaw] of (narrow?[[.05,.84,0],[.95,.2,0],[.32,.83,.2],[.83,.18,-.3]]:[[.19,.19,0],[.76,.18,.2],[.35,.82,-.3],[.88,.46,0]]))put("flowers",u,v,.84,yaw);
  for(const [u,v] of (narrow?[[.36,.21],[.59,.8]]:[[.30,.60],[.65,.53]]))put("coffee",u,v,.92);
  // Low meadow beds articulate the terrace edge but never turn it into a hedge
  // wall: its full length and all existing exits remain readable and reachable.
  if(quality!=="low")for(const [u,v] of (narrow?[[.30,.11],[.76,.12],[.49,.87]]:[[.10,.60],[.62,.90],[.86,.34]]))put("companion-flowers",u,v,.76,0,{cluster:true});
  return { venueId, y, bounds:{...b}, protectedPoints:points.map(p=>({x:p.x,z:p.z})), protectedGap:PROTECTED_GAP, corridors:{x:corridorX,z:corridorZ}, items:placed };
}

function roundedShape(w,d,r=.16) {
  const s=new THREE.Shape(),x=-w/2,z=-d/2;r=Math.min(r,w/2,d/2);
  s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);return s;
}
function slab(w,d,h,r=.16) {const g=new THREE.ExtrudeGeometry(roundedShape(w,d,r),{depth:h,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:2,curveSegments:8,steps:1});g.rotateX(-Math.PI/2);return g;}
function arcSlab(inner,outer,start,end,height) {
  const s=new THREE.Shape();for(let i=0;i<=32;i++){const a=start+(end-start)*i/32,x=Math.sin(a)*outer,z=Math.cos(a)*outer;i?s.lineTo(x,z):s.moveTo(x,z);}
  for(let i=32;i>=0;i--){const a=start+(end-start)*i/32;s.lineTo(Math.sin(a)*inner,Math.cos(a)*inner);}s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:height,bevelEnabled:true,bevelSize:.022,bevelThickness:.016,bevelSegments:2,curveSegments:24,steps:1});g.rotateX(-Math.PI/2);return g;
}
function surfaceTexture(kind,seed=5) {
  const c=document.createElement("canvas");c.width=c.height=256;const ctx=c.getContext("2d"),rng=random(seed);
  const colors=kind==="wood"?[165,127,83]:kind==="linen"?[231,228,214]:[219,209,189];
  const data=ctx.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;const n=kind==="wood"?Math.sin(y*.22+Math.sin(x*.023))*5+(rng()-.5)*10:kind==="linen"?((x%3===0||y%3===0)?-10:3)+(rng()-.5)*5:(rng()-.5)*16;for(let k=0;k<3;k++)data.data[i+k]=colors[k]+n;data.data[i+3]=255;}
  ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==="wood"?2:1,kind==="wood"?2:1);t.anisotropy=4;return t;
}
function labelTexture(title) {
  const c=document.createElement("canvas");c.width=512;c.height=768;const ctx=c.getContext("2d");ctx.fillStyle="#eae6d8";ctx.fillRect(0,0,512,768);
  ctx.fillStyle="#3c5449";ctx.fillRect(45,52,18,54);ctx.fillRect(69,42,18,64);ctx.fillRect(93,34,18,72);
  ctx.font="600 38px sans-serif";ctx.fillText("ECHO",46,172);ctx.fillText("CAMPUS",46,221);ctx.fillStyle="#899987";ctx.font="20px sans-serif";ctx.fillText("A PLACE TO CONNECT",46,268);
  ctx.strokeStyle="#b7bea9";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(46,323);ctx.lineTo(463,323);ctx.stroke();ctx.fillStyle="#526751";
  ctx.font="500 27px sans-serif";ctx.fillText(title==="ECHO CAMPUS"?"WELCOME":"MEET & CONNECT",46,379);ctx.font="24px Microsoft YaHei, sans-serif";ctx.fillText(title==="ECHO CAMPUS"?"从一次相遇开始":"找一处，聊一会",46,426);
  ctx.lineWidth=7;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(54,539);ctx.lineTo(192,539);ctx.lineTo(165,514);ctx.moveTo(192,539);ctx.lineTo(165,564);ctx.stroke();
  ctx.fillStyle="#a28060";ctx.font="17px sans-serif";ctx.fillText("EXPLORE · MEET · BELONG",46,700);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}

function pavingTexture(){
  const c=document.createElement("canvas");c.width=c.height=512;const ctx=c.getContext("2d"),rng=random(7781),data=ctx.createImageData(512,512);
  // Four small limestone courses per 2.4m tile. Noise stays subtle at human height.
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){const row=Math.floor(y/128),offset=(row%2)*128,xx=(x+offset)%256,i=(y*512+x)*4;
    const joint=(y%128<2||xx<2),course=[0,4,-3,2][row],n=(rng()-.5)*6+course+(joint?-24:0);
    data.data[i]=208+n;data.data[i+1]=203+n;data.data[i+2]=187+n;data.data[i+3]=255;
  }ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}

class Batches {
  constructor(root){this.root=root;this.map=new Map();this.matrix=new THREE.Matrix4();this.rotation=new THREE.Quaternion();this.scale=new THREE.Vector3(1,1,1);}
  add(geometry,material,placement,x=0,y=0,z=0,rx=0,ry=0,rz=0) {
    let g=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();
    g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);g.rotateY(placement.yaw||0);g.translate(placement.x,placement.y,placement.z);
    if(!g.attributes.normal)g.computeVertexNormals();if(!g.attributes.uv)g.setAttribute("uv",new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    if(!this.map.has(material))this.map.set(material,[]);this.map.get(material).push(g);
  }
  flush(){for(const [material,list] of this.map){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,material);mesh.name=`event-garden-${material.name}`;mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);}this.map.clear();}
}

function leafGeometry(rows=6){
  // An actual folded oval leaf: a raised center vein and two curved halves.
  // A zero-width tip is connected by fans, avoiding the folded card silhouette.
  const vertices=[],uvs=[],indices=[];
  for(let i=0;i<=rows;i++){
    const t=i/rows,w=Math.pow(Math.sin(Math.PI*t),.72)*.5;
    for(const side of [-1,0,1]){vertices.push(side*w,.05*Math.sin(Math.PI*t)+(side===0?.04:0)*Math.sin(Math.PI*t),t);uvs.push((side+1)/2,t);}
  }
  for(let i=0;i<rows;i++){const k=i*3;for(let j=0;j<2;j++){indices.push(k+j,k+j+1,k+j+3,k+j+1,k+j+4,k+j+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function canopyLeafGeometry(){
  // Eight triangles: a gently folded, six-sided elliptical outline around one
  // central vein. Enough contour for real leaf silhouettes, cheap in thousands.
  const g=new THREE.BufferGeometry(),points=[0,.025,.48,0,0,0,-.38,0,.17,-.5,0,.44,-.38,0,.77,0,0,1,.38,0,.77,.5,0,.44,.38,0,.17],indices=[];
  for(let i=1;i<=8;i++)indices.push(0,i,i===8?1:i+1);
  g.setAttribute("position",new THREE.Float32BufferAttribute(points,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(points.flatMap((_,i)=>i%3===0?[points[i]+.5,points[i+2]]:[]),2));g.setIndex(indices);g.computeVertexNormals();return g;
}

/** Roof/landscape trees supplied only with ground positions verified by the caller.
 * No collision, vessels, ground guesses or fetching. Shared foliage is instanced;
 * woody branches are merged into one material batch. Dispose owns only this kit.
 */
export function createLandscapeGrove(points=[],{quality="balanced"}={}){
  // Distant foliage keeps its silhouette through broader overlapping leaves and
  // solid inner crowns. Reserve individual leaf detail for explicit cinema mode.
  const cinema=quality==="cinema"||quality==="high",leafCount=cinema?64:quality==="low"?16:24;
  const leafScale=Math.min(1.7,Math.sqrt(64/leafCount)),coreScale=cinema?1:quality==="low"?1.3:1.2;
  const root=new THREE.Group();root.name="Architectural landscape grove";
  const bark=new THREE.MeshStandardMaterial({color:0x827661,roughness:.98});bark.name="landscape bark";
  const leaves=new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.88});leaves.name="landscape oval foliage";
  const batch=new Batches(root),instances=[],cores=[],rng=random(293814);
  const valid=points.filter(p=>[p.x,p.y,p.z].every(Number.isFinite));
  valid.forEach((p,index)=>{
    const scale=p.scale||1,s={x:p.x,y:p.y,z:p.z,yaw:p.yaw||0},height=3.65*scale;
    const branch=(a,b,r)=>{const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),g=new THREE.CylinderGeometry(r*.55,r,d.length(),5,1);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);batch.add(g,bark,s);};
    branch([0,0,0],[.06*scale,height*.70,0],.067*scale);
    const centers=[];
    for(let j=0;j<9;j++){
      const a=j*2.399+index*.61,reach=(j<6?1.1:.62)*scale,y=height*(j<6?.65:.88);
      const x=Math.cos(a)*reach,z=Math.sin(a)*reach;
      branch([0,height*.40,0],[x,y,z],.026*scale);
      centers.push([x,y+.12*scale,z,j<6?.86:.78]);
      cores.push({s,v:new THREE.Vector3(x,y+.15*scale,z),q:new THREE.Quaternion(),scale:new THREE.Vector3((j<6?.42:.38)*scale*coreScale,.34*scale*coreScale,(j<6?.43:.38)*scale*coreScale),color:new THREE.Color().setHSL(.242,.30,.205+rng()*.055)});
    }
    const count=leafCount;
    for(const [cx,cy,cz,cr] of centers)for(let j=0;j<count;j++){
      const a=j*2.399,v=1-2*(j+.5)/count,rad=Math.sqrt(1-v*v),r=cr*scale*(.68+rng()*.28),x=cx+Math.cos(a)*rad*r,y=cy+v*r*.73,z=cz+Math.sin(a)*rad*r;
      const color=new THREE.Color().setHSL(.238+rng()*.025,.28+rng()*.14,.20+(y/height)*.07+rng()*.065);
      instances.push({s,v:new THREE.Vector3(x,y,z),q:new THREE.Quaternion().setFromEuler(new THREE.Euler((rng()-.5)*2.2,rng()*TAU,rng()*TAU)),scale:new THREE.Vector3((.18+rng()*.08)*scale*leafScale,1,(.26+rng()*.11)*scale*leafScale),color});
    }
  });
  batch.flush();
  const geometry=canopyLeafGeometry(),mesh=new THREE.InstancedMesh(geometry,leaves,instances.length),m=new THREE.Matrix4(),world=new THREE.Matrix4(),q=new THREE.Quaternion();
  mesh.name="landscape connected leaf crowns";
  instances.forEach((p,i)=>{m.compose(p.v,p.q,p.scale);q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.s.yaw);world.compose(new THREE.Vector3(p.s.x,p.s.y,p.s.z),q,new THREE.Vector3(1,1,1)).multiply(m);mesh.setMatrixAt(i,world);mesh.setColorAt(i,p.color);});
  if(instances.length){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();}
  mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh);
  // At this distance leaves are lit detail, not expensive additional shadow
  // casters. Near-field event trees carry the architectural contact shadows.
  const coreGeometry=new THREE.IcosahedronGeometry(1,quality==="low"?0:1),coreMesh=new THREE.InstancedMesh(coreGeometry,leaves,cores.length);coreMesh.name="dense landscape inner crowns";
  cores.forEach((p,i)=>{m.compose(p.v,p.q,p.scale);q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.s.yaw);world.compose(new THREE.Vector3(p.s.x,p.s.y,p.s.z),q,new THREE.Vector3(1,1,1)).multiply(m);coreMesh.setMatrixAt(i,world);coreMesh.setColorAt(i,p.color);});
  if(cores.length){coreMesh.instanceMatrix.needsUpdate=true;coreMesh.instanceColor.needsUpdate=true;coreMesh.computeBoundingBox();coreMesh.computeBoundingSphere();}root.add(coreMesh);
  root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
  let triangles=0,calls=0;root.traverse(o=>{if(o.isMesh){calls++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});
  root.userData.landscapeGrove={trees:valid.length,triangles,calls,leafCount,quality};
  let disposed=false;return {root,update(){},dispose(){if(disposed)return;disposed=true;root.traverse(o=>o.geometry?.dispose());bark.dispose();leaves.dispose();root.clear();}};
}

/** Optional props load once and share resources across clones. Yaw values are radians.
 * treeUrl / treeHeight / treeYaw; benchUrl / benchWidth / benchYaw.
 * Bench width is capped to the existing calibrated collision footprint, never stretched.
 */
export async function createEventGarden({ venueId="", config, quality="high", props=config?.eventGarden?.props||{}, loadGLTF=url=>new GLTFLoader().loadAsync(url) }={}) {
  const layout=planEventGarden(config,{venueId,quality}),root=new THREE.Group();root.name=`Event garden · ${venueId}`;
  root.userData.eventGarden=true;root.userData.layout=layout.items;
  const resources={geometries:new Set(),materials:new Set(),textures:new Set()},warnings=[];
  function registerObject(object){object?.traverse(o=>{if(o.geometry)resources.geometries.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:[o.material])){if(!m)continue;resources.materials.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.textures.add(v);}});}
  async function loadProp(url,kind){
    if(!url)return null;
    try{
      const gltf=await loadGLTF(url),source=gltf.scene;
      // Register even rejected geometry so failures do not leak decoded textures.
      [...new Set([...(gltf.scenes||[]),source])].filter(Boolean).forEach(registerObject);
      if(!source?.isObject3D)throw new Error("Missing GLB scene");
      const rotation=new THREE.Group();rotation.rotation.y=props[kind+"Yaw"]||0;rotation.add(source);rotation.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(rotation),size=box.getSize(new THREE.Vector3());
      if(![...size.toArray(),...box.min.toArray(),...box.max.toArray()].every(Number.isFinite)||size.y<=.001||size.x<=.001)throw new Error("Invalid prop bounds");
      const scale=kind==="bench"?Math.min((props.benchWidth||2.6)/size.x,2.64/Math.hypot(size.x,size.z)):(props.treeHeight||2.65)/size.y;
      const normalized=new THREE.Group();normalized.name=`normalized ${kind}`;normalized.scale.setScalar(scale);normalized.position.set(-(box.min.x+size.x/2)*scale,-box.min.y*scale,-(box.min.z+size.z/2)*scale);normalized.add(rotation);
      return normalized;
    }catch(error){warnings.push(`${kind} prop could not load: ${error.message}`);return null;}
  }
  // Imported props remain an explicit extension point; the composed garden
  // uses authored seat kits and real instanced leaf crowns by default.
  const [benchSource,treeSource]=await Promise.all([loadProp(props?.useGeneratedBench?props.benchUrl:null,"bench"),loadProp(props?.useGeneratedTree?props.treeUrl:null,"tree")]);
  function stampProp(source,p,kind,raise=0){const holder=new THREE.Group();holder.name=`generated garden ${kind}`;holder.position.set(p.x,p.y+raise,p.z);holder.rotation.y=p.yaw||0;holder.add(source.clone(true));holder.traverse(o=>{if(o.isMesh){o.castShadow=quality!=="low";o.receiveShadow=true;}});root.add(holder);return holder;}
  const keepMaterial=(name,options)=>{const m=new THREE.MeshStandardMaterial(options);m.name=name;resources.materials.add(m);return m;};
  const wood=surfaceTexture("wood"),linen=surfaceTexture("linen"),stone=surfaceTexture("stone");[wood,linen,stone].forEach(t=>resources.textures.add(t));
  const mats={
    stone:keepMaterial("warm stone",{color:0xffffff,map:stone,bumpMap:stone,bumpScale:.006,roughness:.82}),
    wood:keepMaterial("oiled oak",{color:0xffffff,map:wood,roughness:.57}),
    sage:keepMaterial("sage upholstery",{color:PALETTE.sage,map:linen,roughness:.96}),
    cream:keepMaterial("linen upholstery",{color:0xeee7d8,map:linen,roughness:.94}),
    clay:keepMaterial("terracotta ceramic",{color:PALETTE.clay,roughness:.84}),
    dark:keepMaterial("forest green metal",{color:PALETTE.dark,metalness:.25,roughness:.5}),
    soil:keepMaterial("planting soil",{color:PALETTE.soil,roughness:1}),
    brass:keepMaterial("brushed brass",{color:PALETTE.brass,metalness:.75,roughness:.43}),
    stems:keepMaterial("botanical stems",{color:0x718060,roughness:.9}),
    bark:keepMaterial("warm grey bark",{color:0x82725b,roughness:.96}),
    mulch:keepMaterial("fine garden mulch",{color:0x5e6050,roughness:1}),
    foliage:keepMaterial("layered sage leaves",{color:0xffffff,side:THREE.DoubleSide,roughness:.86}),
    petals:keepMaterial("soft flower petals",{color:0xffffff,side:THREE.DoubleSide,roughness:.86})
  };
  // Visual paving is a zero-thickness event decal, not a raised platform / collision surface.
  // It occupies only the calibrated activity rectangle; source model mode hides the whole root.
  if(config?.eventGarden?.paving!==false){
    const b=layout.bounds,w=b.maxX-b.minX,d=b.maxZ-b.minZ,texture=pavingTexture();texture.repeat.set(w/2.4,d/2.4);resources.textures.add(texture);
    const material=keepMaterial("limestone event paving",{map:texture,color:0xffffff,roughness:.90,bumpMap:texture,bumpScale:.007,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const geometry=new THREE.PlaneGeometry(w,d),mesh=new THREE.Mesh(geometry,material);mesh.name="event paving surface";mesh.rotation.x=-Math.PI/2;mesh.position.set((b.minX+b.maxX)/2,layout.y+.009,(b.minZ+b.maxZ)/2);mesh.receiveShadow=true;mesh.castShadow=false;mesh.userData.noCollision=true;root.add(mesh);
  }
  const batch=new Batches(root),leafInstances=[],petalInstances=[],treeLeafInstances=[],crownInstances=[],grassInstances=[];const rng=random(26714);
  const cylinder=(p,m,x,y,z,top,bottom,h,segments=20)=>batch.add(new THREE.CylinderGeometry(top,bottom,h,segments),m,p,x,y,z);
  const panel=(p,m,x,y,z,w,d,h,r=.12)=>batch.add(slab(w,d,h,r),m,p,x,y,z);
  function branch(p,points,radius){
    const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));
    batch.add(new THREE.TubeGeometry(curve,8,radius,6,false),mats.bark,p);
  }
  function seedLeaf(items,p,x,y,z,width,length,a,tilt,color){
    items.push({p,v:new THREE.Vector3(x,y,z),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt,a,(rng()-.5)*.65)),scale:new THREE.Vector3(width,1,length),color:new THREE.Color(color)});
  }
  function meadow(p,radius=.75,base=.25,rich=true){
    // Dense perennial drifts: broad silver-green leaves at the foot, arching
    // fine blades behind, then small upright flowering spikes. No naked soil.
    const clumps=quality==="low"?7:12;
    for(let j=0;j<clumps;j++){
      const a=j*2.399,rr=Math.sqrt((j+.5)/clumps)*radius*.78,x=Math.cos(a)*rr,z=Math.sin(a)*rr;
      const broad=j%3!==0;
      for(let k=0;k<(broad?11:19);k++){
        const az=k*2.399+a,l=(broad?.22:.39)+rng()*(broad?.16:.28);
        seedLeaf(broad?leafInstances:grassInstances,p,x+(rng()-.5)*.08,base+.015,z+(rng()-.5)*.08,broad?.12+rng()*.08:.022+rng()*.014,l,az,-1.00-rng()*.45,[0x647458,0x829379,0x9ba88b,0x6f835d][j%4]);
      }
      if(rich&&j%2===0){
        for(let k=0;k<3;k++){
          const xx=x+(rng()-.5)*.18,zz=z+(rng()-.5)*.18,h=.38+rng()*.20;
          cylinder(p,mats.stems,xx,base+h*.5,zz,.003,.004,h,4);
          // Salvia flower spikes stay legible from a human camera: each is a
          // stack of six tiny whorls, never large disconnected triangles.
          for(let n=0;n<6;n++)for(let q=0;q<3;q++){
            const az=q*TAU/3+n*.8,rad=.022*(1-n*.07);
            petalInstances.push({p,v:new THREE.Vector3(xx+Math.cos(az)*rad,base+h-.14+n*.024,zz+Math.sin(az)*rad),q:new THREE.Quaternion(),scale:new THREE.Vector3(.018,.015,.02),color:new THREE.Color(j%4?0x8c829e:0xe4dcc6)});
          }
        }
      }
    }
    // At the outer planting line, broad leaves drape over and soften the rim.
    for(let i=0;i<24;i++){const a=i*2.399;seedLeaf(leafInstances,p,Math.cos(a)*radius*.80,base+.035,Math.sin(a)*radius*.80,.13,.27,a,-.68,0x889779);}
  }
  function stoneBed(p,radius,tree=false){
    const w=radius*1.62,d=radius*1.14,h=tree?.30:.23;
    // A thin cap and dark recessed line give limestone construction a human
    // scale. Beds are broad and low rather than tall ornamental flower pots.
    panel(p,mats.dark,0,.015,0,w-.055,d-.055,.025,.25);
    panel(p,mats.stone,0,.04,0,w,d,h-.035,.25);
    panel(p,mats.soil,0,h-.035,0,w-.095,d-.095,.022,.20);
    panel(p,mats.stone,0,h-.008,-d/2+.032,w,.064,.036,.02);
    panel(p,mats.stone,0,h-.008,d/2-.032,w,.064,.036,.02);
    panel(p,mats.stone,-w/2+.032,h-.008,0,.064,d-.1,.036,.02);
    panel(p,mats.stone,w/2-.032,h-.008,0,.064,d-.1,.036,.02);
    meadow(p,radius*.58,h, true);
    return h;
  }
  function gardenTree(p){
    const s=p.treeScale||1,base=.30;
    // Three stems open into a broad, irregular zelkova crown. Each branch ends
    // inside a leaf cluster so trees read as connected organisms, not confetti.
    branch(p,[[0,base,0],[-.045,1.00,0],[.06,1.75,.02],[-.13,2.40,0]],.067*s);
    branch(p,[[.025,base,.035],[.17,1.07,.05],[.37,1.92,.12],[.56,2.55,.23]],.037*s);
    branch(p,[[-.035,.55,-.01],[-.28,1.45,-.08],[-.39,2.12,-.20]],.036*s);
    const clusters=[];
    for(let level=0;level<3;level++){
      const count=level===2?5:7;
      for(let j=0;j<count;j++){
        const a=j*TAU/count+level*1.0+p.x*.17,reach=(level===2?.56:1.13)*(1+(rng()-.5)*.25)*s;
        const tip=[Math.cos(a)*reach,base+(2.1+level*.48)*s,Math.sin(a)*reach*.84];
        branch(p,[[.03,1.50+level*.21,0],[tip[0]*.48,tip[1]-.28,tip[2]*.46],tip],.015*(1-level*.18));
        clusters.push({x:tip[0],y:tip[1]+.16,z:tip[2],rx:(level===2?.58:.65)*s,ry:.46*s,rz:.60*s});
        crownInstances.push({p,v:new THREE.Vector3(tip[0],tip[1]+.16,tip[2]),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(.1,a,.2)),scale:new THREE.Vector3((level===2?.27:.31)*s,.23*s,.28*s),color:new THREE.Color().setHSL(.245,.29,.205+rng()*.055)});
      }
    }
    const leaves=quality==="low"?65:100;
    for(const c of clusters)for(let i=0;i<leaves;i++){
      // Stratified ellipsoid sampling guarantees a filled but perforated crown.
      const a=i*2.399+rng()*.35,v=1-2*(i+.5)/leaves,rad=Math.sqrt(Math.max(0,1-v*v)),shell=.55+.45*Math.sqrt(rng());
      const x=c.x+Math.cos(a)*rad*c.rx*shell,y=c.y+v*c.ry,z=c.z+Math.sin(a)*rad*c.rz*shell;
      const light=(y-(base+1.8))/(2.0*s),color=new THREE.Color().setHSL(.239+rng()*.025,.28+rng()*.12,.22+Math.max(0,light)*.095+rng()*.06);
      seedLeaf(treeLeafInstances,p,x,y,z,.115+rng()*.06,.19+rng()*.11,a,-.42-rng()*.6,color); treeLeafInstances[treeLeafInstances.length-1].q.setFromEuler(new THREE.Euler((rng()-.5)*2.2,rng()*TAU,rng()*TAU));
    }
  }
  function planter(p){stoneBed(p,p.r,true);if(!treeSource)gardenTree(p);}
  function flowerBed(p){stoneBed(p,p.r,false);}
  function lounge(p) {
    if(benchSource){stampProp(benchSource,p,"bench");return;}
    // A real two-seat conversation bench: independent oak boards, rounded arm
    // rails, tapered legs, sage cushions and a low stone table.
    const bench={...p};
    for(let i=0;i<7;i++)panel(bench,mats.wood,0,.445,-.54+i*.075,1.87,.063,.048,.018);
    for(let i=0;i<4;i++)panel(bench,mats.wood,0,.60+i*.08,-.66,1.92,.055,.055,.012);
    for(const x of [-.78,.78]){
      cylinder(bench,mats.dark,x,.24,-.62,.022,.033,.48,8);
      cylinder(bench,mats.dark,x,.24,-.10,.022,.033,.48,8);
      panel(bench,mats.dark,x,.40,-.36,.055,.58,.05,.01);
      panel(bench,mats.wood,x,.65,-.36,.07,.59,.045,.025);
      cylinder(bench,mats.dark,x,.54,-.13,.016,.016,.20,8);
      cylinder(bench,mats.dark,x,.57,-.62,.019,.019,.62,8);
    }
    for(const x of [-.42,.42])panel(bench,mats.sage,x,.49,-.34,.69,.44,.05,.055);
    // Table and two stools face the bench. The grouping stays within its circle.
    cylinder(p,mats.stone,0,.48,.59,.32,.34,.05,28);
    cylinder(p,mats.dark,0,.25,.59,.042,.054,.42,10);
    cylinder(p,mats.dark,0,.055,.59,.20,.22,.055,16);
    for(const x of [-.83,.83]){
      cylinder(p,mats.wood,x,.445,.53,.245,.245,.043,20);
      cylinder(p,mats.sage,x,.478,.53,.215,.215,.035,20);
      for(let j=0;j<3;j++){const a=j*TAU/3; cylinder(p,mats.dark,x+Math.cos(a)*.15,.24,.53+Math.sin(a)*.15,.018,.026,.40,8);}
    }
    // A planted back to each bench turns the furniture into a place to stop,
    // not a loose object in a paved void. Its base stays within the 1.38m circle.
    panel(p,mats.stone,0,.025,-.98,1.60,.22,.255,.07);
    panel(p,mats.soil,0,.27,-.98,1.47,.12,.015,.03);
    for(let i=0;i<6;i++){
      const x=-.63+i*.252;
      for(let k=0;k<7;k++)seedLeaf(leafInstances,p,x,.28,-1.0,.10,.24,k*TAU/7,-1.25,0x657d57);
      const h=.42+(i%2)*.08;cylinder(p,mats.stems,x,.28+h*.5,-1.0,.003,.004,h,4);
      for(let k=0;k<4;k++)petalInstances.push({p,v:new THREE.Vector3(x,.28+h-k*.023,-1.0),q:new THREE.Quaternion(),scale:new THREE.Vector3(.025,.022,.024),color:new THREE.Color(i%2?0x8c829e:0xdad9c5)});
    }
    cylinder(p,mats.clay,.11,.566,.55,.035,.032,.10,12);
    cylinder(p,mats.cream,-.1,.535,.60,.064,.064,.012,16);
  }
  function coffee(p){
    cylinder(p,mats.stone,0,.64,0,.30,.32,.05,24);
    cylinder(p,mats.dark,0,.34,0,.038,.05,.58,12);
    cylinder(p,mats.dark,0,.055,0,.22,.25,.045,18);
    for(const x of [-.60,.60]){
        // Rotations are baked through the same batching path for compact calls.
      panel(p,mats.sage,x,.44,0,.41,.46,.07,.10);
      panel(p,mats.wood,x+(x>0?.20:-.20),.51,0,.055,.43,.31,.025);
      for(const dx of [-.15,.15])for(const dz of [-.15,.15])cylinder(p,mats.dark,x+dx,.24,dz,.016,.022,.40,6);
    }
    cylinder(p,mats.clay,.10,.727,0,.038,.032,.10,14);
  }
  function guide(p){
    panel(p,mats.dark,0,.025,0,.53,.46,.045,.055);
    const backing=slab(.47,.17,1.48,.07);
    const t=labelTexture(p.label);resources.textures.add(t);const m=keepMaterial(`wayfinding ${p.label}`,{map:t,roughness:.88});
    const g=new THREE.PlaneGeometry(.46,1.19);const mesh=new THREE.Mesh(g,m);mesh.position.y=.91;mesh.name="event wayfinding";placeSignSurface(mesh,backing);
    batch.add(backing,mats.wood,p,0,.08,0);
    const group=new THREE.Group();group.position.set(p.x,p.y,p.z);group.rotation.y=p.yaw;group.add(mesh);root.add(group);resources.geometries.add(g);
    batch.add(new THREE.BoxGeometry(.39,.018,.013),mats.brass,p,0,.27,.111);
  }
  for(const p of layout.items){
    if(p.kind==="lounge")lounge(p);
    else if(p.kind==="planter"||p.kind==="tree-island")planter(p);
    else if(p.kind==="flowers"||p.kind==="companion-flowers")flowerBed(p);
    else if(p.kind==="coffee")coffee(p);
    else if(p.kind==="guide")guide(p);
  }
  batch.flush();
  function addInstances(name,geometry,material,items){if(!items.length){geometry.dispose();return;}const mesh=new THREE.InstancedMesh(geometry,material,items.length);mesh.name=name;const local=new THREE.Matrix4(),world=new THREE.Matrix4(),q=new THREE.Quaternion();
    items.forEach((item,i)=>{local.compose(item.v,item.q,item.scale);q.setFromAxisAngle(new THREE.Vector3(0,1,0),item.p.yaw||0);world.compose(new THREE.Vector3(item.p.x,item.p.y,item.p.z),q,new THREE.Vector3(1,1,1)).multiply(local);mesh.setMatrixAt(i,world);mesh.setColorAt(i,item.color);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.castShadow=quality!=="low";mesh.receiveShadow=true;root.add(mesh);}
  addInstances("dense zelkova inner crowns",new THREE.IcosahedronGeometry(1,1),mats.foliage,crownInstances);
  addInstances("complete zelkova leaf crowns",canopyLeafGeometry(),mats.foliage,treeLeafInstances);
  addInstances("layered botanical leaves",leafGeometry(),mats.foliage,leafInstances);
  addInstances("garden blossom clusters",new THREE.SphereGeometry(1,4,3),mats.petals,petalInstances);
  addInstances("terrace ornamental grasses",leafGeometry(3),mats.foliage,grassInstances);

  if(treeSource)for(const p of layout.items.filter(item=>item.kind==="planter").slice(0,quality==="low"?2:3))stampProp(treeSource,p,"tree",.49);
  if(treeSource)for(const p of layout.items.filter(item=>item.kind==="tree-island").slice(0,quality==="low"?2:3)){
    const tree=stampProp(treeSource,p,"tree",.47);tree.scale.setScalar(p.treeScale);tree.userData.boundaryTree=true;
    // These leafy edge accents reuse the generated mesh without another heavy
    // shadow submission. Main trees and the authored vessels retain grounding.
    tree.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  }
  registerObject(root);
  const colliders=layout.items.map(p=>({x:p.x,z:p.z,r:p.r,source:"event-garden",kind:p.kind}));
  let disposed=false;
  return {root,colliders,layout,warnings,update(){},dispose(){if(disposed)return;disposed=true;resources.geometries.forEach(g=>g.dispose());resources.materials.forEach(m=>m.dispose());resources.textures.forEach(t=>{t.image?.close?.();t.dispose();});root.clear();}};
}
