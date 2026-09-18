import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// A removable event layer: source architecture, calibrated ground and anchors are untouched.
const TAU = Math.PI * 2;
const PALETTE = Object.freeze({ stone: 0xe9e2d2, wood: 0xb38c61, sage: 0x829784, clay: 0xb98169, dark: 0x384d44, soil: 0x534a38, brass: 0xa3946e });
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
  // Seating occupies gaps between attendees, never the entrance / cross-aisle.
  const narrow=depth<14;
  for(const [u,v,yaw] of (narrow?[[.23,.2,0],[.72,.8,Math.PI],[.43,.82,Math.PI]]:[[.18,.77,Math.PI*.2],[.70,.81,-Math.PI*.2],[.80,.32,-Math.PI/2]])) put("lounge",u,v,1.38,yaw);
  for(const [u,v] of (narrow?[[.08,.15],[.90,.85],[.55,.18]]:[[.13,.37],[.86,.66],[.47,.14]]))put("planter",u,v,.68,0,{height:1.12});
  for(const [u,v] of (narrow?[[.05,.84],[.95,.2],[.32,.83],[.83,.18]]:[[.19,.19],[.76,.18],[.35,.82],[.88,.46]]))put("flowers",u,v,.53);
  for(const [u,v,yaw] of (narrow?[[.08,.48,Math.PI/2],[.88,.45,-Math.PI/2]]:[[.16,.88,0],[.87,.84,0]]))put("guide",u,v,.48,yaw,{label:placed.some(p=>p.kind==="guide")?"MEET & CONNECT":"ECHO CAMPUS"});
  // Small tables and soft seats read as a social space, not an ornamental sculpture court.
  for(const [u,v] of (narrow?[[.36,.21],[.59,.8]]:[[.30,.60],[.65,.53]]))put("coffee",u,v,.78);
  if(quality!=="low")for(const [u,v] of [[.13,.12],[.88,.89]])put("flowers",u,v,.46);
  // Canopy is a long terrace: group planting around seating and punctuate the
  // edges with three different tree poses, keeping the original clear aisles.
  const canopy=venueId==="venue-ab-canopy" || (narrow&&Math.abs(y-6.2991)<.05);
  if(canopy&&config.eventGarden?.socialIslands!==false){
    for(const [u,v,treeScale,yaw] of [[.215,.91,1.06,.42],[.65,.085,.88,2.1],[.80,.92,1.16,-.85]]){
      put("tree-island",u,v,.64,yaw,{treeScale,cluster:true});
    }
    for(const seat of placed.filter(p=>p.kind==="lounge")){
      const angles=[-.7,.7,2.45,-2.45,Math.PI/2,-Math.PI/2,0,Math.PI];let planted=0;
      for(const a of angles){const x=seat.x+Math.cos(a)*2.13,z=seat.z+Math.sin(a)*2.13,r=.38;
        if(fits(x,z,r)){placed.push({kind:"companion-flowers",x,y,z,r,yaw:a,cluster:true});if(++planted===2)break;}
      }
    }
  }
  return { venueId, y, bounds:{...b}, protectedPoints:points.map(p=>({x:p.x,z:p.z})), protectedGap:PROTECTED_GAP, corridors:{x:corridorX,z:corridorZ}, items:placed };
}

function roundedShape(w,d,r=.16) {
  const s=new THREE.Shape(),x=-w/2,z=-d/2;r=Math.min(r,w/2,d/2);
  s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);return s;
}
function slab(w,d,h,r=.16) {const g=new THREE.ExtrudeGeometry(roundedShape(w,d,r),{depth:h,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:2,curveSegments:12,steps:1});g.rotateX(-Math.PI/2);return g;}
function arcSlab(inner,outer,start,end,height) {
  const s=new THREE.Shape();for(let i=0;i<=32;i++){const a=start+(end-start)*i/32,x=Math.sin(a)*outer,z=Math.cos(a)*outer;i?s.lineTo(x,z):s.moveTo(x,z);}
  for(let i=32;i>=0;i--){const a=start+(end-start)*i/32;s.lineTo(Math.sin(a)*inner,Math.cos(a)*inner);}s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:height,bevelEnabled:true,bevelSize:.022,bevelThickness:.016,bevelSegments:2,curveSegments:24,steps:1});g.rotateX(-Math.PI/2);return g;
}
function surfaceTexture(kind,seed=5) {
  const c=document.createElement("canvas");c.width=c.height=256;const ctx=c.getContext("2d"),rng=random(seed);
  const colors=kind==="wood"?[190,154,111]:kind==="linen"?[231,228,214]:[232,226,214];
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

function leafGeometry(){
  const vertices=[],uvs=[],indices=[];const rows=6;
  for(let i=0;i<=rows;i++){const t=i/rows,w=Math.sin(Math.PI*t)*.5;for(const side of [-1,1]){vertices.push(side*w,.07*Math.sin(Math.PI*t)+side*.012,t);uvs.push(side>0?1:0,t);}}
  for(let i=0;i<rows;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
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
  const [benchSource,treeSource]=await Promise.all([loadProp(props?.benchUrl,"bench"),loadProp(props?.treeUrl,"tree")]);
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
  const batch=new Batches(root),leafInstances=[],petalInstances=[];const rng=random(26714);
  const cylinder=(p,m,x,y,z,top,bottom,h,segments=20)=>batch.add(new THREE.CylinderGeometry(top,bottom,h,segments),m,p,x,y,z);
  const panel=(p,m,x,y,z,w,d,h,r=.12)=>batch.add(slab(w,d,h,r),m,p,x,y,z);
  function planting(p,height=1.0,density=42,radius=.42) {
    for(let i=0;i<density;i++){
      const angle=rng()*TAU,rr=Math.sqrt(rng())*radius,bx=Math.cos(angle)*rr,bz=Math.sin(angle)*rr,h=height*(.5+rng()*.5),lean=(rng()-.5)*.2;
      if(i%5===0){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(bx,.45,bz),new THREE.Vector3(bx+lean,.45+h*.55,bz),new THREE.Vector3(bx+lean*1.5,.45+h,bz+.08)]);batch.add(new THREE.TubeGeometry(curve,5,.006,4,false),mats.stems,p);}
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.9+rng()*.45,rng()*TAU,(rng()-.5)*.8));
      const v=new THREE.Vector3(bx,.46+h*.38,bz),scale=new THREE.Vector3(.09+rng()*.13,1,.26+rng()*.30);
      leafInstances.push({p,v,q,scale,color:new THREE.Color().setHSL(.20+rng()*.09,.18+rng()*.13,.27+rng()*.18)});
      if(i%4===0){for(let k=0;k<5;k++){const a=k*TAU/5;petalInstances.push({p,v:new THREE.Vector3(bx+Math.sin(a)*.035,.46+h,bz+Math.cos(a)*.035),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(.16,0,a)),scale:new THREE.Vector3(.028,.048,.014),color:new THREE.Color(i%8===0?0xe7d2bb:0xb991a2)});}}
    }
  }
  function planter(p,flowers=false) {
    const r=flowers?.39:.58,h=flowers?.40:.56;
    const profile=[new THREE.Vector2(r*.72,0),new THREE.Vector2(r*.88,.045),new THREE.Vector2(r,h-.055),new THREE.Vector2(r,h),new THREE.Vector2(r-.045,h),new THREE.Vector2(r-.048,h-.09),new THREE.Vector2(r*.72,.055)];
    batch.add(new THREE.LatheGeometry(profile,quality==="low"?20:32),flowers?mats.clay:mats.stone,p);
    cylinder(p,mats.soil,0,h-.065,0,r-.06,r-.06,.015);
    planting(p,flowers?.45:1.05,quality==="low"?20:42,r-.11);
  }
  function botanicalCluster(p,tree=false){
    // A tall narrow vessel plus a low, wider companion gives each island a
    // tiered silhouette. Their entire base remains in its tested footprint.
    const h=tree?.52:.36,r=tree?.45:.27;
    const profile=[new THREE.Vector2(r*.78,0),new THREE.Vector2(r*.94,.045),new THREE.Vector2(r,h-.035),new THREE.Vector2(r,h),new THREE.Vector2(r-.03,h),new THREE.Vector2(r-.03,h-.06),new THREE.Vector2(r*.75,.04)];
    batch.add(new THREE.LatheGeometry(profile,quality==="low"?14:20),tree?mats.stone:mats.clay,p);
    cylinder(p,mats.soil,0,h-.05,0,r-.04,r-.04,.008,16);
    const count=quality==="low"?16:26;
    // Broad foliage sits low and reads clearly; slender grasses rise behind it.
    for(let i=0;i<count;i++){
      const a=i*2.399+.4,rr=Math.sqrt((i+.5)/count)*(r-.07),len=.18+rng()*.2;
      leafInstances.push({p,v:new THREE.Vector3(Math.sin(a)*rr,h-.025,Math.cos(a)*rr),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(-.85-rng()*.35,a,(rng()-.5)*.2)),scale:new THREE.Vector3(.10+rng()*.06,.6,len),color:new THREE.Color().setHSL(.23+rng()*.045,.27,.24+rng()*.18)});
    }
    for(let i=0;i<(quality==="low"?12:24);i++){
      const a=rng()*TAU,rr=rng()*(r*.65),hBlade=.30+rng()*.42;
      grassInstances.push({p,v:new THREE.Vector3(Math.cos(a)*rr,h-.025,Math.sin(a)*rr),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.23-rng()*.2,a,0)),scale:new THREE.Vector3(.018+rng()*.014,1,hBlade),color:new THREE.Color(i%3?0x849068:0xb0ad79)});
    }
    for(let i=0;i<(tree?6:4);i++){
      const a=i*2.4,rr=r*.48,x=Math.cos(a)*rr,z=Math.sin(a)*rr,flowerY=h+.28+(i%3)*.065;
      cylinder(p,mats.stems,x,(h+flowerY)/2,z,.003,.004,flowerY-h,4);
      for(let k=0;k<4;k++){const a=k*TAU/4;petalInstances.push({p,v:new THREE.Vector3(x+Math.sin(a)*.027,flowerY,z+Math.cos(a)*.027),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,0,a)),scale:new THREE.Vector3(.021,.035,.011),color:new THREE.Color(i%2?0xefe2bd:0xb68ba1)});}
    }
  }
  function lounge(p) {
    if(benchSource){stampProp(benchSource,p,"bench");return;}
    // Open crescent bench with separate oak slats and upholstered seating, no pedestal disc.
    batch.add(arcSlab(.83,1.23,-1.46,1.46,.10),mats.dark,p,0,.31,0);
    batch.add(arcSlab(.82,1.24,-1.46,1.46,.075),mats.sage,p,0,.45,0);
    for(let i=0;i<20;i++){const a=-1.39+i/19*2.78;batch.add(slab(.10,.37,.042,.015),mats.wood,p,Math.sin(a)*1.04,.405,-Math.cos(a)*1.04,0,-a);}
    for(const a of [-1.14,0,1.14])cylinder(p,mats.dark,Math.sin(a),.17,-Math.cos(a),.038,.046,.34,10);
    // Slim curved back is low enough to keep people and architecture readable.
    batch.add(arcSlab(1.19,1.24,-1.35,1.35,.25),mats.cream,p,0,.53,0);
    cylinder(p,mats.stone,0,.38,.08,.35,.35,.055,32);
    cylinder(p,mats.dark,0,.20,.08,.045,.052,.35,12);
    for(const a of [0,TAU/3,2*TAU/3])batch.add(new THREE.BoxGeometry(.055,.035,.36),mats.dark,p,Math.sin(a)*.12,.035,.08+Math.cos(a)*.12,0,a,0);
    cylinder(p,mats.clay,-.12,.46,.04,.055,.043,.11,16);
    cylinder(p,mats.soil,-.12,.515,.04,.044,.044,.005,12);
  }
  function coffee(p){
    cylinder(p,mats.stone,0,.61,0,.39,.40,.055,32);cylinder(p,mats.brass,0,.33,0,.042,.052,.56,16);
    for(const s of [-1,1])panel(p,mats.sage,s*.52,.34,.12,.38,.43,.13,.14);
    for(const s of [-1,1])cylinder(p,mats.dark,s*.52,.18,.12,.11,.14,.28,12);
    cylinder(p,mats.clay,.12,.69,0,.047,.038,.10,16);
  }
  function guide(p){
    panel(p,mats.dark,0,.025,0,.53,.46,.045,.055);
    panel(p,mats.wood,0,.08,0,.47,.17,1.48,.07);
    const t=labelTexture(p.label);resources.textures.add(t);const m=keepMaterial(`wayfinding ${p.label}`,{map:t,roughness:.88});
    const g=new THREE.PlaneGeometry(.46,1.19);const mesh=new THREE.Mesh(g,m);mesh.position.set(0,.91,.11);mesh.name="event wayfinding";mesh.castShadow=false;
    const group=new THREE.Group();group.position.set(p.x,p.y,p.z);group.rotation.y=p.yaw;group.add(mesh);root.add(group);resources.geometries.add(g);
    batch.add(new THREE.BoxGeometry(.39,.018,.013),mats.brass,p,0,.27,.111);
  }
  const grassInstances=[];
  for(const p of layout.items){if(p.kind==="lounge")lounge(p);else if(p.kind==="tree-island"||p.kind==="companion-flowers")botanicalCluster(p,p.kind==="tree-island");else if(p.kind==="planter"||p.kind==="flowers")planter(p,p.kind==="flowers");else if(p.kind==="coffee")coffee(p);else if(p.kind==="guide")guide(p);}
  batch.flush();
  function addInstances(name,geometry,material,items){if(!items.length){geometry.dispose();return;}const mesh=new THREE.InstancedMesh(geometry,material,items.length);mesh.name=name;const local=new THREE.Matrix4(),world=new THREE.Matrix4(),q=new THREE.Quaternion();
    items.forEach((item,i)=>{local.compose(item.v,item.q,item.scale);q.setFromAxisAngle(new THREE.Vector3(0,1,0),item.p.yaw||0);world.compose(new THREE.Vector3(item.p.x,item.p.y,item.p.z),q,new THREE.Vector3(1,1,1)).multiply(local);mesh.setMatrixAt(i,world);mesh.setColorAt(i,item.color);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.castShadow=quality!=="low";mesh.receiveShadow=true;root.add(mesh);}
  addInstances("layered botanical leaves",leafGeometry(),mats.foliage,leafInstances);
  addInstances("garden blossom clusters",new THREE.SphereGeometry(1,5,4),mats.petals,petalInstances);
  addInstances("terrace ornamental grasses",leafGeometry(),mats.foliage,grassInstances);

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
