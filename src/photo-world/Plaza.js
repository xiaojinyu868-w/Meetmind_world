import * as T from 'three';
import { paintSurfaces } from './PaintedMaterials.js';
import { plantField } from './FieldGarden.js';
import { makeResident } from './VoxelResident.js';
import { booths, boothNumber } from './Market.js';
import { photographExhibit } from './Exhibit.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setMarketLights, waterSurface } from './Lanterns.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const base = import.meta.env.BASE_URL;
const clay = new Map();
function pigment(color) {
  if (!clay.has(color)) clay.set(color,new T.MeshStandardMaterial({color,roughness:.88,flatShading:true}));
  return clay.get(color);
}
function shape(parent,geometry,color,x,y,z) {
  const m = new T.Mesh(geometry,typeof color === 'object' ? color : pigment(color));
  m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
const box = (p,w,h,d,c,x,y,z) => shape(p,new T.BoxGeometry(w,h,d),c,x,y,z);
const ball = (p,r,c,x,y,z,n=1) => shape(p,new T.IcosahedronGeometry(r,n),c,x,y,z);
const cylinder = (p,a,b,h,c,x,y,z,n=12) => shape(p,new T.CylinderGeometry(a,b,h,n),c,x,y,z);
function compact(group) {
  group.updateMatrixWorld(true);
  const byMaterial = new Map();
  group.traverse(node=>{
    if (!node.isMesh || Array.isArray(node.material)) return;
    const g = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
    for (const key of Object.keys(g.attributes)) if (!['position','normal','uv'].includes(key)) g.deleteAttribute(key);
    if (!g.attributes.uv) g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(node.matrixWorld);
    if (!byMaterial.has(node.material)) byMaterial.set(node.material,[]);
    byMaterial.get(node.material).push(g);
  });
  const output = new T.Group();
  for (const [mat,geos] of byMaterial) {
    const g = mergeGeometries(geos);
    if (g) shape(output,g,mat,0,0,0);
    geos.forEach(geo=>geo.dispose());
  }
  return output;
}
function seedRandom(seed) {
  return ()=>{ seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
}
function garden() {
  const g=new T.Group(),rand=seedRandom(8871);
  const tones=[0x435d3d,0x648253,0x91a667,0xa7a65a,0xd9ad58];
  for(const [x,z,height] of [[-10,-8,3.7],[10,-7,4.5],[9.3,.2,3.3],[-11,-11,2.8],[-12,7,4.1],[10,8.5,4.4],[-7,12,3.7],[5,12,3.6],[12,-12,3.6]]){
    cylinder(g,.16,.31,height*.79,0x665444,x,height*.39,z,7);
    for(let j=0;j<6;j++){
      const a=j*2.39, r=j===5?0:height*.24;
      const leaf=ball(g,height*(.29+rand()*.12),tones[(j+Math.floor(rand()*2))%tones.length],
        x+Math.cos(a)*r,height*(j===5?.98:.76+rand()*.14),z+Math.sin(a)*r);
      leaf.scale.set(1,.92,1);
    }
  }
  for(let i=0;i<165;i++){
    const side=i%2?1:-1,x=side*(6+rand()*6),z=-12+rand()*21;
    cylinder(g,.024,.07,.28+rand()*.12,0x698250,x,.16,z,4);
    const flower=ball(g,.065+rand()*.06,[0xe5b99e,0xf0deb0,0xe1a55a,0xafb9cb][i%4],x,.33,z,0);
    flower.scale.y=.73;
  }
  // Paper lanterns strung over the market street, supported at both ends.
  for(const z of [-10,-4]){
    const pts=[];
    for(const x of [-5,5])cylinder(g,.07,.12,4.9,0x765640,x,2.45,z,8);
    for(let i=0;i<=20;i++){
      const x=-5+i*.5,y=4.8-.65*(1-(x/5)**2);
      pts.push(new T.Vector3(x,y,z));
      if(i%4===2){
        cylinder(g,.025,.025,.21,0x594638,x,y-.1,z,5);
        const lamp=ball(g,.23,0xffcc79,x,y-.39,z,1);lamp.scale.y=1.27;
        cylinder(g,.12,.12,.06,0x9e5835,x,y-.65,z,8);
      }
    }
    g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,.022,5,false),pigment(0x58493f)));
  }
  return compact(g);
}

// The original plaza occupies a 30 × 34 metre plinth. Layer the exposed soil
// below its existing perimeter so the buildings and walkable surface keep their coordinates.
function terrainEdge() {
  const group = new T.Group();
  const rand = seedRandom(983);
  const ring = [];
  const corners = [[-15,-17],[15,-17],[15,17],[-15,17]];
  for (let side=0; side<4; side++) {
    const [a,b]=corners[side], [c,d]=corners[(side+1)%4];
    for (let n=0; n<9; n++) ring.push([a+(c-a)*n/9,b+(d-b)*n/9]);
  }
  const profile = ring.map(([x,z]) => {
    const depth=1.5+rand()*1.4;
    const ledge=.975+rand()*.023, heel=.88-rand()*.08, foot=.71-rand()*.11;
    return [[x,-.49,z],[x*ledge,-.77-rand()*.28,z*ledge],[x*heel,-depth,z*heel],[x*foot,-depth-.46-rand()*.4,z*foot]];
  });
  const colors = [[0x896948,0x997449,0x806044],[0x775a4e,0x7f6250,0x685855],[0x665354,0x5c5353,0x75605a]];
  const pos=[], rgb=[];
  for (let i=0;i<profile.length;i++) {
    const a=profile[i], b=profile[(i+1)%profile.length];
    for (let level=0;level<3;level++) {
      const color=new T.Color(colors[level][Math.floor(rand()*3)]);
      for (const pt of [a[level],b[level],a[level+1],b[level],b[level+1],a[level+1]]) {
        pos.push(...pt);rgb.push(color.r,color.g,color.b);
      }
    }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(rgb,3));
  geo.computeVertexNormals();
  const bank=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.98,side:T.DoubleSide,flatShading:true}));
  group.add(bank);
  return group;
}

const momentTints={trip:0x7da08c,birthday:0xd58c78,pet:0xbd8867,meeting:0xdbaf63,daily:0x83a6ab};
function keepsake(kind) {
  const g=new T.Group(), c=momentTints[kind]||0xceab77;
  cylinder(g,.84,.94,.18,0xc1ab83,0,.09,0,32);
  if(kind==='birthday'){
    cylinder(g,.53,.55,.42,c,0,.38,0,32);cylinder(g,.54,.55,.11,0xffecd5,0,.64,0,32);
    for(let i=0;i<5;i++){const a=i*1.256;cylinder(g,.033,.033,.31,0xe8b66b,.32*Math.cos(a),.82,.32*Math.sin(a));ball(g,.064,0xffcf76,.32*Math.cos(a),1.02,.32*Math.sin(a));}
  }else if(kind==='trip'){
    shape(g,new T.ConeGeometry(.62,1.12,4),c,.14,.74,0).rotation.y=.55;
    shape(g,new T.ConeGeometry(.39,.81,4),0xb9c8a0,-.38,.58,.12).rotation.y=.55;
    shape(g,new T.ConeGeometry(.17,.31,4),0xf3ecd7,.14,1.145,0).rotation.y=.55;
  }else if(kind==='pet'){
    ball(g,.38,c,0,.53,0);ball(g,.31,c,.11,.97,0);
    for(const x of [-.08,.29])shape(g,new T.ConeGeometry(.13,.31,3),c,x,1.25,0);
    for(const x of [-.03,.21])ball(g,.031,0x392d2a,x,1,.27);
    const tail=ball(g,.19,c,-.38,.57,.02);tail.scale.set(.65,1.8,.8);tail.rotation.z=.5;
  }else if(kind==='meeting'){
    box(g,.98,.14,.65,0x92704b,0,.67,0);cylinder(g,.10,.13,.49,0x6a5848,0,.41,0);
    for(const x of [-.27,.27])cylinder(g,.107,.095,.15,0xf3e8c7,x,.81,0);
    for(const x of [-.70,.70]){cylinder(g,.25,.25,.13,c,x,.41,0);cylinder(g,.09,.1,.27,0x816847,x,.23,0);}
  }else{
    box(g,.79,.68,.56,c,0,.54,0);
    const roof=shape(g,new T.ConeGeometry(.68,.51,4),0x91694f,0,1.11,0);roof.rotation.y=Math.PI/4;
    box(g,.24,.35,.03,0xffd592,0,.52,.29);
  }
  return g;
}
function memoryPosition(i){
  const x=(i%2===0?-1:1)*(3.85+Math.floor(i/12)*1.9);
  return [x,-2.1-(Math.floor(i/2)%6)*1.93];
}
export async function mountPlaza(host,{pick,walk,ready,onFailure,place='hall',field=null,withSeat=null,workPhoto}) {
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setClearColor(0x000000,0);
  renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
  host.prepend(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(33,1,.1,240);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=78;
  controls.minPolarAngle=.35;controls.maxPolarAngle=1.18;controls.rotateSpeed=.6;
  const hemi=new T.HemisphereLight(0xffeed6,0x889aa0,1.9);scene.add(hemi);
  const key=new T.DirectionalLight(0xffdda0,3.0);
  key.position.set(-23,18,-15); key.castShadow=true;const shadowSize=host.clientWidth>850?1536:1024;key.shadow.mapSize.set(shadowSize,shadowSize);
  Object.assign(key.shadow.camera,{left:-21,right:21,top:22,bottom:-22,far:90});
  key.shadow.normalBias=.04;key.shadow.bias=-.00045;scene.add(key);
  const rim=new T.DirectionalLight(0xb0dce1,1.0);rim.position.set(12,9,15);scene.add(rim);
  let day=false;
  function lightMode(){
    hemi.color.set(day?0xffeed6:0xc5c7e2);hemi.groundColor.set(day?0x889aa0:0x524359);hemi.intensity=day?1.78:.79;
    key.color.set(day?0xffdda0:0xffb574);key.intensity=day?2.65:1.68;rim.color.set(day?0xb0dce1:0x97b4df);rim.intensity=day?.9:.92;
    renderer.toneMappingExposure=day?1.13:1.04;host.parentElement.classList.toggle('day',day);
  }
  lightMode();
  const fill=new T.DirectionalLight(0xffe3ce,.85);fill.position.set(8,10,-16);scene.add(fill);
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.19}));
  floor.rotation.x=-Math.PI/2;floor.position.y=place==='hall'?-4.95:-1.48;floor.receiveShadow=true;scene.add(floor);
  const loader=new GLTFLoader();
  const template=(await loader.loadAsync(base+'models/characters/photo-derived/voxel/host.glb')).scene;
  host.dataset.place=place;host.parentElement.dataset.place=place;
  const atlas=new T.TextureLoader().load(base+'photo-world/surfaces.webp');atlas.colorSpace=T.SRGBColorSpace;
  let lightRig={size(){},tick(){}},fieldSystem=null;
  const street=[],featured=new Map();
  let fieldPhoto=()=>{},fieldSignature='';
  function setField(next){
    if(!next||!fieldSystem)return;
    field=next;
    const signature=JSON.stringify([next.scene.parameters,next.model]);
    if(signature===fieldSignature)return;
    if(fieldSignature){
      const Field=fieldSystem.constructor;
      fieldSystem.dispose();fieldSystem=new Field({scene,field});
      renderer.shadowMap.needsUpdate=true;
    }
    fieldSignature=signature;fieldPhoto=plantField(fieldSystem,next,atlas);
    const p=next.scene.parameters;
    host.parentElement.style.setProperty('--field-sky',p.sky+'9a');
    host.parentElement.style.setProperty('--field-horizon',p.horizon+'80');
    hemi.color.set(p.horizon);key.color.set(p.accent).lerp(new T.Color(0xffeacc),.72);
  }
  if(place==='field' && field){
    const {RelationshipFieldSystem}=await import('../runtime/RelationshipFieldSystem.js');
    fieldSystem=new RelationshipFieldSystem({scene,field});
    setField(field);
    hemi.intensity=1.85;key.intensity=1.5;
  }else if(place==='cafe'){
    const cafe=await loader.loadAsync(base+'models/echo_world_storybook_cafe.glb');
    paintSurfaces(cafe.scene,atlas);scene.add(compact(cafe.scene));
    const lamp=new T.PointLight(0xffcc88,31,13);lamp.position.set(0,3.8,0);scene.add(lamp);
    hemi.intensity=1.75;
  }else{
  const [town,stall]=await Promise.all(['echo_world_hub_town.glb','modules/echo_world_market_stall_20260804.glb'].map(n=>loader.loadAsync(base+'models/'+n))).catch(e=>{renderer.dispose();renderer.domElement.remove();onFailure?.();throw e;});
  paintSurfaces(town.scene,atlas);paintSurfaces(stall.scene,atlas);waterSurface(town.scene);
  lightRig=setMarketLights(town.scene,scene);
  const layout=compact(town.scene);
  layout.scale.z=-1;
  scene.add(layout,garden(),terrainEdge());
  const stallModel=compact(stall.scene);
  for (const [i,{x,z,angle}] of booths.entries()){
    const m=stallModel.clone();m.scale.setScalar(.72);m.position.set(x,0,z);m.rotation.y=angle;
    m.userData.hit=['booth',String(i)];street.push(m);scene.add(m);
  }
  }
  const rand=seedRandom(221),count=50,positions=new Float32Array(count*3);
  for(let i=0;i<count;i++)positions.set([(rand()-.5)*23,rand()*3+.7,(rand()-.5)*25],i*3);
  const sparksGeometry=new T.BufferGeometry();sparksGeometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const sparks=new T.Points(sparksGeometry,new T.PointsMaterial({color:0xffe2a7,size:.085,transparent:true,opacity:.85,depthWrite:false}));
  scene.add(sparks);
  const avatars=new Map(),objects=new Map(),labels=new Map();
  const screen=new T.Vector3(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  let exhibit=null;
  let hero=true,me=null,pose='overview',lastPhoto=null,interacted=false;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const originalHeight=host.clientHeight;
  function compose(mode,instant=false,point=null){
    pose=mode;
    const target=point || (place!=='hall'?new T.Vector3(0,.75,0):mode==='fire'?new T.Vector3(0,1,2.5):new T.Vector3(0,.7,-1));
    const distance=place==='cafe'?(mode==='fire'?9:20):place==='field'?(mode==='fire'?12:30):mode==='fire'?13:Math.max(49,Math.min(75,40/(host.clientWidth/Math.max(host.clientHeight,1)) + 12));
    const dir=(place==='cafe'?new T.Vector3(.32,1.12,1.05):new T.Vector3(.73,.84,-.88)).normalize();
    if(instant){controls.target.copy(target);camera.position.copy(target).addScaledVector(dir,distance);camera.lookAt(target);}
    else {flight={at:performance.now(),from:camera.position.clone(),focus:controls.target.clone(),to:target.clone().addScaledVector(dir,distance),target};}
  }
  let flight=null,interacting=false,lastControl=0;
  function resize(){const w=host.clientWidth,h=host.clientHeight||originalHeight||360;if(!w)return;lightRig.size(h);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(hero&&!interacted)compose('overview',true);}
  new ResizeObserver(resize).observe(host);resize();compose('overview',true);
  controls.addEventListener('start',()=>{interacted=true;interacting=true;flight=null;});
  controls.addEventListener('end',()=>{interacting=false;lastControl=performance.now();});
  function label(id,title,object,kind,offset){
    let entry=labels.get(id);
    if(!entry){
      const node=document.createElement('button');node.type='button';node.className='world-pin '+kind;
      node.addEventListener('click',()=>pick(kind,kind==='booth'?id.slice(6):id));host.append(node);
      entry={node,object,offset};labels.set(id,entry);
    }
    entry.object=object;
    if(entry.node.textContent!==title)entry.node.textContent=title;
  }
  function update(data,photo,home=false){
    hero=home;me=data.me;
    if(place==='field')fieldPhoto(photo);
    if(photo!==lastPhoto){
      if(photo && !exhibit && place==='hall'){
        exhibit=photographExhibit(photo,data.title);scene.add(exhibit);exhibit.userData.hit=['photo','origin'];
        if(!home)label('origin','那张合照',exhibit,'photo',3.12);
      }
      lastPhoto=photo;
    }
    for(const p of data.people){
      if(!p.name)continue;
      const visible=place==='field'?(p.seat===me||p.seat===withSeat):((p.place||'hall')===place);
      if(!visible){const old=avatars.get(p.seat);if(old)old.mesh.visible=false;continue;}
      let item=avatars.get(p.seat);
      if(!item){
        const mesh=makeResident(p,template,place==='cafe');mesh.userData.hit=['person','p'+p.seat];mesh.position.set(p.x,0,p.z);scene.add(mesh);renderer.shadowMap.needsUpdate=true;
        item={mesh,goal:new T.Vector3(),person:p};avatars.set(p.seat,item);
      }
      item.mesh.visible=true;
      item.person=p;item.goal.set(p.x,p.posture==='sit'?-.25:0,p.z);
      if(place==='field')item.goal.set(p.seat===me?.95:-.95,0,-.5);
      if(!home)label('p'+p.seat,p.name,item.mesh,'person',place==='cafe'?1.70:2.35);
    }
    if(place==='hall'&&street.length && (home||data.me!==null)){
      for(const [slot,stall] of street.entries()){
        const work=data.moments.filter(m=>m.kind==='project'&&boothNumber(m.seat)===slot).at(-1);
        if(!home)label('booth-'+slot,work?.title||'作品摊',stall,'booth',2.5);
        if(!work||!work.has_photo||featured.get(slot)===work.id)continue;
        featured.set(slot,work.id);
        workPhoto(work).then(img=>{
          if(featured.get(slot)!==work.id)return;
          const old=stall.getObjectByName('SubmittedWork');
          if(old){old.material.map?.dispose();old.material.dispose();old.geometry.dispose();stall.remove(old);}
          const c=document.createElement('canvas');c.width=384;c.height=290;
          const ctx=c.getContext('2d');ctx.fillStyle='#f8edd7';ctx.fillRect(0,0,c.width,c.height);
          const k=Math.min(356/img.naturalWidth,258/img.naturalHeight),w=img.naturalWidth*k,h=img.naturalHeight*k;
          ctx.drawImage(img,(384-w)/2,(290-h)/2,w,h);
          const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
          const panel=new T.Mesh(new T.PlaneGeometry(1.85,1.40),new T.MeshStandardMaterial({map:tex,roughness:.9,side:T.DoubleSide}));
          panel.name='SubmittedWork';panel.position.set(0,1.61,.77);panel.rotation.x=-.12;stall.add(panel);
        }).catch(()=>featured.delete(slot));
      }
    }
    const visibleMoments=place==='cafe'?[]:place==='field'?data.moments.filter(m=>field?.moments.includes(m.id)):data.moments.filter(m=>m.kind!=='project');
    visibleMoments.forEach((v,i)=>{
      if(!objects.has(v.id)){
        const m=keepsake(v.kind);m.userData.hit=['moment',v.id];const [x,z]=place==='field'?[Math.cos(i*2.4)*3.6,Math.sin(i*2.4)*3.6]:memoryPosition(i);m.position.set(x,0,z);
        scene.add(m);renderer.shadowMap.needsUpdate=true;objects.set(v.id,m);
      }
      if(!home)label(v.id,v.title,objects.get(v.id),'moment',1.57);
    });
    for(const [id,e] of labels){
      if(id.startsWith('p') && avatars.has(Number(id.slice(1))))e.object=avatars.get(Number(id.slice(1))).mesh;
      e.node.hidden=home||!e.object.visible;
    }
    if(!home && place==='field' && fieldSystem){
      fieldSystem.animations.forEach(obj=>{const eid=obj.userData.fieldEntityId,entry=field.scene.entities.find(e=>e.id===eid);
        if(entry)label(eid,entry.label,obj,'field',2.4);});
    }
    host.classList.toggle('home-stage',home);
  }
  let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(hero||me===null||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
    const r=renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),camera);
    const interactive=[...street,...objects.values(),...Array.from(avatars.values(),p=>p.mesh).filter(m=>m.visible)];if(exhibit)interactive.push(exhibit);
    const surface=ray.intersectObjects(interactive,true)[0];
    if(surface){let obj=surface.object;while(obj&&!obj.userData.hit)obj=obj.parent;if(obj){pick(...obj.userData.hit);return;}}
    if(place==='field')return;
    const hit=ray.ray.intersectPlane(plane,new T.Vector3());
    if(hit&&place==='cafe'&&(Math.abs(hit.x)>5.6||Math.abs(hit.z)>4.4))return;
    if(hit && hit.x>=-8 && hit.x<=8 && hit.z>=-13 && hit.z<=9)walk(hit.x,hit.z);
  });
  let last=0,rendered=false;
  function draw(t){
    requestAnimationFrame(draw);if(document.hidden||(rendered&&document.querySelector('dialog[open]'))||t-last<((flight||interacting||t-lastControl<650)?15:(reduce?100:32)))return;
    const dt=Math.min(.12,(t-last)/1000);last=t;
    if(flight){const k=reduce?1:Math.min(1,(performance.now()-flight.at)/830),ease=k*k*(3-2*k);
      camera.position.lerpVectors(flight.from,flight.to,ease);controls.target.lerpVectors(flight.focus,flight.target,ease);if(k===1)flight=null;}
    controls.update();lightRig.tick(t,day);fieldSystem?.update(t/1000);
    for(const [seat,{mesh,goal,person}] of avatars){
      const moving=mesh.position.distanceTo(goal)>.065;
      mesh.position.lerp(goal,Math.min(1,dt*5));
      mesh.rotation.y=person.posture==='sit'?Math.atan2(-mesh.position.x,(place==='cafe'?0:2.5)-mesh.position.z):Math.atan2(camera.position.x-mesh.position.x,camera.position.z-mesh.position.z);
      mesh.rotation.z=reduce?0:Math.sin(t*(moving?.015:.0017)+seat)* (moving?.045:.013);
      mesh.userData.pose(moving,person.posture==='sit',t/1000,dt);
    }
    if(!reduce){sparks.position.y=Math.sin(t*.0007)*.13;sparks.rotation.y=.015*Math.sin(t*.00016);}
    camera.updateMatrixWorld();
    if(!hero){
      const occupied=[];
      for(const e of labels.values()){
        screen.copy(e.object.position);screen.y+=e.offset;screen.project(camera);
        const x=(screen.x*.5+.5)*host.clientWidth,y=(.5-screen.y*.5)*host.clientHeight;
        const collision=occupied.some(p=>Math.abs(p.x-x)<60&&Math.abs(p.y-y)<22);
        e.node.hidden=!e.object.visible||collision||Math.abs(screen.x)>.95||Math.abs(screen.y)>.94||screen.z>1;
        if(!e.node.hidden){occupied.push({x,y});e.node.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-100%)';}
      }
    }
    renderer.render(scene,camera);rendered=true;
  }
  requestAnimationFrame(draw);host.dataset.ready='true';ready?.();
  return {update,setField,light(){day=!day;lightMode();return day;},portrait(seat,url){
    avatars.get(seat)?.mesh.userData.texture(url);
  },capture(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},overview:()=>compose('overview'),fire:()=>compose('fire'),focus(id){
    const object=labels.get(id)?.object;if(object)compose('fire',false,object.position.clone().add(new T.Vector3(0,.75,0)));
  }};
}
