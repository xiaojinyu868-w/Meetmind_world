import * as THREE from "three";
import "./ui/world.css";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
import {getSceneDefinition} from "./runtime/SceneRegistry.js";
import {createCharacter} from "./scenes/Characters.js";
import {EventClient} from "./runtime/EventClient.js";
import {importScene} from "./runtime/SceneImporter.js";
import {readSceneStartup} from "./runtime/SceneStartup.js";
import {AppUI} from "./ui/AppUI.js";

const canvas=document.getElementById("world");
const params=new URLSearchParams(location.search);
const reduced=matchMedia("(prefers-reduced-motion:reduce)").matches;
const mobile=matchMedia("(pointer:coarse)").matches||innerWidth<700;
const quality=params.get("quality")||(mobile?"low":"high");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:params.has("capture")});
renderer.setPixelRatio(Math.min(devicePixelRatio,quality==="low"?1.35:1.75));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xe2e7df);
scene.fog=new THREE.Fog(0xe2e7df,95,240);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.12,350);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=6;controls.maxDistance=130;
controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.485;
controls.enablePan=true;controls.screenSpacePanning=false;controls.target.set(0,5,0);
const hemi=new THREE.HemisphereLight(0xdaeaff,0xb0a184,1.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffecd1,3.3);sun.position.set(-36,53,32);sun.castShadow=true;
sun.shadow.mapSize.set(quality==="low"?1024:2048,quality==="low"?1024:2048);
Object.assign(sun.shadow.camera,{left:-53,right:53,top:48,bottom:-48,near:1,far:145});
sun.shadow.normalBias=.035;sun.shadow.bias=-.00005;scene.add(sun);scene.add(sun.target);
const fill=new THREE.DirectionalLight(0xd5e7f4,.75);fill.position.set(35,18,-38);scene.add(fill);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.36;room.dispose();pmrem.dispose();
const actors=new THREE.Group();actors.name="Event attendees";scene.add(actors);
const linkRoot=new THREE.Group();linkRoot.name="Confirmed encounters";scene.add(linkRoot);
const markerRoot=new THREE.Group();scene.add(markerRoot);
const client=new EventClient({storage:EventClient.storageFor(params)});
let currentScene=null,sceneId="campus",switchSerial=0,cameraMove=null,tour=null,paused=false,time=0,last=performance.now(),selectedId=null,showcaseStarted=false;
const people=new Map(),keys=new Set(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let fpsFrames=0,fpsStart=performance.now(),fps=0,lastSnapshotVersion=-1,hasConnected=false;
let audioContext=null,soundEnabled=false;
const UI=new AppUI({
 client,
 onCamera:id=>goCamera(({overview:"hero",courtyard:"garden"})[id]||id),
 onScene:id=>switchScene(id),
 onImport:async ({manifest,file})=>{await switchScene("import",{manifest,file});},
 onTour:()=>toggleTour(),
 onSelectPerson:person=>{if(person?.id)focusPerson(person.id);},
 onSound:enabled=>{soundEnabled=enabled;if(enabled)chime("on");},
 onShowcase:()=>runShowcase()
});
function chime(kind="arrival"){
 if(!soundEnabled)return;
 audioContext??=new AudioContext();audioContext.resume();
 const now=audioContext.currentTime,frequencies=kind==="connection"?[392,493.88,587.33]:[440,659.25];
 frequencies.forEach((f,i)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type="sine";oscillator.frequency.value=f;gain.gain.setValueAtTime(0,now+i*.12);gain.gain.linearRampToValueAtTime(.025,now+i*.12+.03);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.12+1.2);oscillator.connect(gain).connect(audioContext.destination);oscillator.start(now+i*.12);oscillator.stop(now+i*.12+1.3);});
}
function cameraTo(position,target,fov=43,duration=1800){
 tour=null;const toP=new THREE.Vector3(...position),toT=new THREE.Vector3(...target);
 if(reduced||duration===0){camera.position.copy(toP);controls.target.copy(toT);camera.fov=fov;camera.updateProjectionMatrix();controls.update();cameraMove=null;return;}
 cameraMove={fromP:camera.position.clone(),fromT:controls.target.clone(),toP,toT,fromFov:camera.fov,toFov:fov,start:performance.now(),duration};
}
function fitPreset(preset){
 const result={...preset,position:[...preset.position],target:[...preset.target]};
 if(innerWidth<720){const p=new THREE.Vector3(...result.position),t=new THREE.Vector3(...result.target);p.sub(t).multiplyScalar(1.3).add(t);result.position=p.toArray();result.fov=Math.min(58,(result.fov||43)+8);}
 return result;
}
function goCamera(id,duration=1700){if(!currentScene)return;const preset=fitPreset(currentScene.cameras[id]||currentScene.cameras.hero);cameraTo(preset.position,preset.target,preset.fov||43,duration);}
function personPosition(index,isSelf=false){
 if(isSelf)return {...currentScene.spawn};
 const points=currentScene.anchors.people;return {...points[index%points.length]};
}
function addPerson(person,index,animate=false){
 const character=createCharacter({color:person.avatarColor||"#a59074",seed:index+23,name:person.name});
 character.root.userData.personId=person.id;
 character.root.traverse(o=>{o.userData.personId=person.id;});
 const pos=personPosition(index,person.id===client.me?.attendee?.id);character.root.position.set(pos.x,pos.y||0,pos.z);character.root.rotation.y=pos.yaw||0;
 actors.add(character.root);people.set(person.id,{...character,person,index,pos,arrival:animate?time:null});
 if(animate){character.root.scale.setScalar(.02);chime();}
 return character;
}
function syncPeople(snapshot){
 if(!currentScene||!snapshot)return;
 const ids=new Set(snapshot.attendees.map(p=>p.id));
 for(const [id,value] of people)if(!ids.has(id)){actors.remove(value.root);value.dispose?.();people.delete(id);}
 const visibleAttendees = snapshot.attendees.length <= 80 ? snapshot.attendees : [client.me?.attendee, ...snapshot.attendees.filter(p => p.id !== client.me?.attendee?.id).slice(-79)].filter(Boolean);
 visibleAttendees.forEach((person,index)=>{
  const old=people.get(person.id);if(old){if(old.person.avatarColor!==person.avatarColor){const position=old.root.position.clone(),yaw=old.root.rotation.y;actors.remove(old.root);old.dispose?.();people.delete(person.id);const replacement=addPerson(person,index,false);replacement.root.position.copy(position);replacement.root.rotation.y=yaw;}else old.person=person;return;}
  addPerson(person,index,lastSnapshotVersion>=0);
 });
 if(lastSnapshotVersion>=0&&snapshot.version>lastSnapshotVersion){const previousCount=linkRoot.children.length;syncLinks(snapshot);if(linkRoot.children.length>previousCount)chime("connection");}else syncLinks(snapshot);
 lastSnapshotVersion=snapshot.version;
}
function disposeLinks(){for(const o of [...linkRoot.children]){o.geometry.dispose();o.material.dispose();linkRoot.remove(o);}}
function syncLinks(snapshot){
 disposeLinks();
 for(const connection of snapshot.connections||[]){
 const a=people.get(connection.fromId||connection.attendeeIds?.[0]),b=people.get(connection.toId||connection.attendeeIds?.[1]);if(!a||!b)continue;
 const start=a.root.position.clone().add(new THREE.Vector3(0,.12,0)),end=b.root.position.clone().add(new THREE.Vector3(0,.12,0)),distance=start.distanceTo(end);
 const mid=start.clone().lerp(end,.5);mid.y+=Math.min(5,distance*.19);
 const curve=new THREE.QuadraticBezierCurve3(start,mid,end);
 const geometry=new THREE.TubeGeometry(curve,44,.017,5,false);
 const material=new THREE.MeshStandardMaterial({color:0xbc955c,metalness:.5,roughness:.45,transparent:true,opacity:connection.synthetic?.52:.9});
 const line=new THREE.Mesh(geometry,material);line.name="confirmed-"+connection.id;linkRoot.add(line);
 }
}
function clearPeople(){for(const person of people.values()){actors.remove(person.root);person.dispose?.();}people.clear();disposeLinks();}
async function switchScene(id,options={}){
 const serial=++switchSerial;UI.setBusy("正在准备场景");document.getElementById("loading-detail").textContent="正在读取建筑与景观";
 let result;
 try{
  result=id==="import"?await importScene(options.manifest,{renderer,file:options.file,onProgress:t=>UI.setBusy(t)}):await getSceneDefinition(id).factory({renderer,quality});
  if(serial!==switchSerial){result.dispose?.();return;}
  const previous=currentScene;
  clearPeople();clearSelection();if(previous)scene.remove(previous.root);
  currentScene=result;sceneId=id;scene.add(result.root);
  scene.environment=result.environment||env.texture;
  previous?.dispose?.();renderer.renderLists.dispose();
  syncPeople(client.snapshot);goCamera("hero",0);
  UI.setSceneLabel(id==="import"?options.manifest.name||"我的场景":getSceneDefinition(id).displayName);UI.sceneId=id;
  try{localStorage.setItem("echo-campus-scene",id==="import"?"campus":id);}catch{}
  UI.setBusy(null);document.getElementById("loading").classList.add("loaded");document.getElementById("loading").setAttribute("aria-hidden","true");
 }catch(error){result?.dispose?.();UI.setBusy(null);UI.toast("场景加载失败："+error.message);if(!currentScene)document.getElementById("loading-detail").textContent=error.message;throw error;}
}
function clearSelection(){
 selectedId=null;for(const o of [...markerRoot.children]){o.geometry.dispose();o.material.dispose();markerRoot.remove(o);}
}
function focusPerson(id){
 const p=people.get(id);if(!p)return;selectedId=id;UI.setSelectedPerson(p.person);
 for(const o of [...markerRoot.children]){o.geometry.dispose();o.material.dispose();markerRoot.remove(o);}
 const ring=new THREE.Mesh(new THREE.RingGeometry(.46,.51,64),new THREE.MeshBasicMaterial({color:0xc68d42,side:THREE.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.copy(p.root.position).y+=.055;markerRoot.add(ring);
 const target=p.root.position.clone().add(new THREE.Vector3(0,1.05,0)),position=target.clone().add(new THREE.Vector3(5,3.2,7));
 cameraTo(position.toArray(),target.toArray(),44,1200);
}
function toggleTour(){
 UI.closePanel();cameraMove=null;if(tour){tour=null;UI.toast("已暂停园区导览");return;}
 tour={started:performance.now(),base:camera.position.clone(),target:controls.target.clone()};UI.toast("导览已开始，拖动画面即可暂停");
}
controls.addEventListener("start",()=>{cameraMove=null;tour=null;});
let downPoint=null;
canvas.addEventListener("pointerdown",e=>{downPoint={x:e.clientX,y:e.clientY};});
canvas.addEventListener("pointerup",e=>{
 if(!downPoint||Math.hypot(e.clientX-downPoint.x,e.clientY-downPoint.y)>6)return;downPoint=null;
 const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
 const hit=raycaster.intersectObjects(actors.children,true)[0];if(hit?.object.userData.personId)focusPerson(hit.object.userData.personId);
});
window.addEventListener("keydown",e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){keys.add(e.key.toLowerCase());e.preventDefault();}if(e.key==="Escape"){UI.closePanel();cameraMove=null;tour=null;}});
window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));window.addEventListener("blur",()=>keys.clear());
document.addEventListener("visibilitychange",()=>{keys.clear();last=performance.now();});
function moveSelf(dt){
 const id=client.me?.attendee?.id,p=people.get(id);if(!p||!keys.size)return;
 const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0));
 const movement=new THREE.Vector3();if(keys.has("w")||keys.has("arrowup"))movement.add(forward);if(keys.has("s")||keys.has("arrowdown"))movement.sub(forward);if(keys.has("d")||keys.has("arrowright"))movement.add(right);if(keys.has("a")||keys.has("arrowleft"))movement.sub(right);
 if(!movement.lengthSq())return;movement.normalize().multiplyScalar(dt*2.2);const next=p.root.position.clone().add(movement),b=currentScene.bounds;
 next.x=THREE.MathUtils.clamp(next.x,b.minX,b.maxX);next.z=THREE.MathUtils.clamp(next.z,b.minZ,b.maxZ);
 let blocked=(currentScene.colliders||[]).some(c=>Math.hypot(next.x-c.x,next.z-c.z)<c.r+.28);
 // Built-in water is navigable only on the central bridge; imported scenes use author-supplied colliders.
 if(currentScene.isWalkable&&!currentScene.isWalkable(next.x,next.z))blocked=true;
 if(!blocked){p.root.position.copy(next);p.root.rotation.y=Math.atan2(movement.x,movement.z);p.walking=true;if(selectedId===id&&markerRoot.children[0])markerRoot.children[0].position.set(next.x,next.y+.055,next.z);if(Math.floor(time*5)!==Math.floor((time-dt)*5))syncLinks(client.snapshot);} 
}
client.addEventListener("snapshot",e=>{hasConnected=true;UI.setSnapshot(e.detail);syncPeople(e.detail);});
client.addEventListener("me",e=>{UI.setMe(e.detail);const me=e.detail?.attendee;if(me){const p=people.get(me.id);if(p&&!p.selfPlaced){p.root.position.set(currentScene.spawn.x,currentScene.spawn.y,currentScene.spawn.z);p.selfPlaced=true;syncLinks(client.snapshot);}}});
client.addEventListener("status",e=>{UI.setOnline(e.detail.online);if(!e.detail.online&&e.detail.message)UI.toast("活动连接暂不可用，场景仍可浏览");});
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
window.addEventListener("resize",resize);resize();
let showcaseTimers=[];
function runShowcase(){
 if(showcaseStarted){showcaseTimers.forEach(clearTimeout);showcaseTimers=[];showcaseStarted=false;UI.hideChrome(false);UI.closePanel();UI.toast("已退出展示导览");return;}
 showcaseStarted=true;UI.closePanel();goCamera("hero",0);UI.toast("90 秒展示导览开始，可随时拖动画面");
 const action=(seconds,fn)=>showcaseTimers.push(setTimeout(()=>{if(showcaseStarted)fn();},seconds*1000));
 action(8,()=>goCamera("arrival",6000));
 action(21,()=>goCamera("lobby",4500));
 action(30,()=>{UI.openDemoPanel();goCamera("arrival",2500);});
 action(44,()=>{UI.closePanel();const first=client.snapshot?.attendees?.[0];if(first)focusPerson(first.id);});
 action(57,()=>{UI.closePanel();goCamera("garden",4500);});
 action(69,()=>{UI.openScenePanel();});
 action(80,()=>{UI.closePanel();goCamera("aerial",5000);});
 action(92,()=>{showcaseStarted=false;UI.toast("导览结束，可以自由探索园区");});
}
function tick(now){
 requestAnimationFrame(tick);if(document.hidden){last=now;return;}
 const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused)time+=dt;
 if(cameraMove){const p=Math.min(1,(now-cameraMove.start)/cameraMove.duration),e=p*p*(3-2*p);camera.position.lerpVectors(cameraMove.fromP,cameraMove.toP,e);controls.target.lerpVectors(cameraMove.fromT,cameraMove.toT,e);camera.fov=THREE.MathUtils.lerp(cameraMove.fromFov,cameraMove.toFov,e);camera.updateProjectionMatrix();if(p>=1)cameraMove=null;}
 if(tour&&!paused){const t=(now-tour.started)/1000,angle=t*.035;const offset=tour.base.clone().sub(tour.target).applyAxisAngle(new THREE.Vector3(0,1,0),angle);camera.position.copy(tour.target).add(offset);controls.target.copy(tour.target);}
 controls.update();
 if(!paused){currentScene?.update(dt,time);for(const value of people.values()){value.walking=false;}moveSelf(dt);for(const value of people.values()){if(value.arrival!==null){const progress=Math.min(1,(time-value.arrival)/.75);value.root.scale.setScalar(Math.max(.02,1-Math.pow(1-progress,3)));if(progress===1)value.arrival=null;}value.update(dt,time,value.walking?"walking":selectedId===value.person.id?"wave":value.index%4===0?"talking":"idle");}}
 renderer.render(scene,camera);fpsFrames++;if(now-fpsStart>1000){fps=Math.round(fpsFrames*1000/(now-fpsStart));fpsFrames=0;fpsStart=now;}
}
requestAnimationFrame(tick);
function diagnostics(){
 let meshes=0,materials=new Set(),geometries=new Set();scene.traverse(o=>{if(o.isMesh){meshes++;geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
 return {renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},fps,dpr:renderer.getPixelRatio(),scene:sceneId,people:people.size,meshes,materials:materials.size,geometries:geometries.size,postPasses:0,shadowMapSize:sun.shadow.mapSize.x,quality,online:UI.online};
}
window.__THREE_GAME_DIAGNOSTICS__=diagnostics;
if(params.has("capture")||params.has("debug")){
 window.__ECHO_CAMPUS__={renderer,scene,camera,controls,client,UI,get currentScene(){return currentScene;},switchScene,goCamera,focusPerson,runShowcase,diagnostics,setPaused(value){paused=value;},setCamera(p,t,fov=43){cameraTo(p,t,fov,0);},setChromeHidden(value){UI.hideChrome(value);}};
 window.__THREE_GAME_TEST_HOOKS__={setState:async name=>{if(!currentScene)throw new Error("not ready");if(name==="active-play"||name==="hero"){UI.closePanel();goCamera("hero",0);}else if(name==="arrival"){UI.closePanel();goCamera("arrival",0);}else if(name==="garden"){UI.closePanel();goCamera("garden",0);}else if(name==="gallery"){await switchScene("gallery");}else if(name==="profile"){focusPerson(client.snapshot.attendees[0].id);}else throw new Error("unknown state: "+name);return {state:name};},setPausedForScreenshot(value){paused=value;},setSeed(){return 868;}};
}
(async()=>{try{let startup;try{startup=await readSceneStartup({search:location.search,baseUrl:document.baseURI});}catch(error){UI.toast("启动配置未完成："+error.message);startup={scene:"campus"};}try{await switchScene(startup.scene,startup.manifest?{manifest:startup.manifest}:{});}catch(error){if(startup.scene!=="campus"){await switchScene("campus");UI.toast("自定义场景加载失败，已回到白庭");}else throw error;}await client.start();if(params.get("tour")==="1")toggleTour();document.documentElement.dataset.ready="true";}catch(error){document.getElementById("loading-detail").textContent="加载未完成："+error.message;console.error(error);}})();
