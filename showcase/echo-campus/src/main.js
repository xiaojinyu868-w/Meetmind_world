import {placeSignSurface} from "./runtime/SignSurface.js";
import {loadVenueAsset} from "./runtime/VenueAsset.js";
import {pickSocialPerson} from "./runtime/SocialPicking.js";
import * as THREE from "three";
import "./ui/world.css";
import "./ui/tape-stamp.css";
import {showStamp,stampDate} from "./ui/TapeStamp.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
import {getSceneDefinition} from "./runtime/SceneRegistry.js";
import {createCharacter} from "./scenes/Characters.js";
import {loadCharacterLibrary,PREMIUM_CHARACTER_ASSETS} from "./scenes/PremiumCharacters.js";
import {createArrivalEffects} from "./runtime/ArrivalEffects.js";
import {createWorldLabels} from "./runtime/WorldLabels.js";
import {personaById,serialLabel} from "./shared/personas.mjs";
import {findPerson} from "./shared/changes.mjs";
import {visibleSocialAttendees,demoSocialPose,stablePersonSeed,conversationIntent,DEMO_SOCIAL_PAIRS} from "./scenes/SocialEnsemble.js";
import {createEventGarden,planEventGarden} from "./scenes/EventGarden.js";
import {planSocialFloor,socialSlotFor} from "./runtime/SocialFloor.js";
import {createCourtDressing} from "./scenes/CourtDressing.js";
import {socialPeopleLayout} from "./runtime/SocialPeopleLayout.js";
import {createLandscapeSite} from "./runtime/LandscapeSite.js";
import {createContextLandscape} from "./runtime/ContextLandscape.js";
import {createArchitectureShadows} from "./runtime/ArchitectureShadows.js";
import {createRenderFinish} from "./runtime/RenderFinish.js";
import {createPrecisionRenderFinish} from "./runtime/PrecisionRenderFinish.js";
import {chooseDepthPrecision,probeDepthPrecisionContext,precisionCameraRange,cachePrecisionBounds,adaptPolygonOffsetMaterials} from "./runtime/RenderPrecision.js";
import {stablePcfShadowChunk} from "./runtime/TemporalSurfaceFiltering.js";
import {resumeDepthIfCurrent,consumeStandardDepthResume} from "./runtime/DepthModeResume.js";
import {profileCameraPreset} from "./runtime/ProfileFraming.js";
import {createEventLook} from "./runtime/EventLook.js";
import {prepareVenueEntourage} from "./runtime/VenueEntourage.js";
import {EventClient} from "./runtime/EventClient.js";
import {importScene} from "./runtime/SceneImporter.js";
import {readSceneStartup} from "./runtime/SceneStartup.js";
import {AppUI} from "./ui/AppUI.js";
import {installCanvasRecorder} from "./runtime/CanvasRecorder.js";
import {venueById,loadVenueManifest,startupVenueFromSearch,resolveStartupVenue,venueViewLoadOptions} from "./runtime/VenueCatalog.js";
import {inspectModelBounds,applyModelFraming,calibratedCheckpoints,setEventLayersVisible,CHECKPOINT_IDS,cameraForVenueView,fitBuildingPreset,presentationBoundsForModel} from "./runtime/VenuePresentation.js";

const canvas=document.getElementById("world");
const params=new URLSearchParams(location.search);
const reduced=matchMedia("(prefers-reduced-motion:reduce)").matches;
const mobile=matchMedia("(pointer:coarse)").matches||innerWidth<700;
const requestedQuality=params.get("quality");
const quality=["low","balanced","cinema"].includes(requestedQuality)?requestedQuality:requestedQuality==="high"?"cinema":mobile?"low":"balanced";
const contextOptions={antialias:true,alpha:false,preserveDrawingBuffer:params.has("capture")};
const context=canvas.getContext("webgl2",contextOptions);
const depthProbe=probeDepthPrecisionContext(context,{requestedSamples:quality==="low"?2:4});
const depthPlan=chooseDepthPrecision({...depthProbe,clipControl:depthProbe.clipControl&&params.get("depth")!=="standard"&&!!startupVenueFromSearch(location.search)});
const renderer=new THREE.WebGLRenderer({canvas,context,...contextOptions,...depthPlan.rendererOptions});
const reversedDepth=!!renderer.capabilities.reversedDepthBuffer;
THREE.ShaderChunk.shadowmap_pars_fragment=stablePcfShadowChunk(THREE.ShaderChunk.shadowmap_pars_fragment);
renderer.setPixelRatio(Math.min(devicePixelRatio,quality==="cinema"?1.75:quality==="low"?1:1.25));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xe2e7df);
scene.fog=new THREE.Fog(0xe2e7df,95,240);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.12,350);
camera._reversedDepth=reversedDepth;camera.updateProjectionMatrix();
const renderFinish=reversedDepth?createPrecisionRenderFinish(renderer,scene,camera,quality,{samples:depthProbe.samples}):createRenderFinish(renderer,scene,camera,quality);
let precisionBounds=[];
const precisionDirection=new THREE.Vector3();
function refreshDepthMaterials(){adaptPolygonOffsetMaterials(scene,reversedDepth);}
// ?debug&sun=azimuth,elevation tries another sun without editing the venue file.
function debugSun(manifest){
 const value=params.has("debug")&&params.get("sun");if(!value)return manifest;
 const [azimuth,elevation]=value.split(",").map(Number);
 return [azimuth,elevation].every(Number.isFinite)?{...manifest,eventLook:{...manifest.eventLook,sun:{azimuth,elevation}}}:manifest;
}
function updateDepthRange(){
 if(!currentScene)return;
 if(currentScene.config?.type==="splat"){if(camera.near!==.12){camera.near=.12;camera.updateProjectionMatrix();}return;}
 const boxes=precisionBounds.slice();
 if(actors.visible)for(const value of people.values()){
  const p=value.root.position;
  boxes.push({min:{x:p.x-1.5,y:p.y-.5,z:p.z-1.5},max:{x:p.x+1.5,y:p.y+3.5,z:p.z+1.5}});
 }
 camera.getWorldDirection(precisionDirection);
 const range=precisionCameraRange({boxes,position:camera.position,forward:precisionDirection,reversed:reversedDepth,baselineFar:Math.max(350,camera.far)});
 if(Math.abs(camera.near-range.near)>.00001||camera.far!==range.far){camera.near=range.near;camera.far=range.far;camera.updateProjectionMatrix();}
}
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=6;controls.maxDistance=130;
controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.485;
controls.enablePan=true;controls.screenSpacePanning=false;controls.target.set(0,5,0);
const hemi=new THREE.HemisphereLight(0xdaeaff,0xb0a184,1.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffecd1,3.3);sun.position.set(-36,53,32);sun.castShadow=true;
sun.shadow.mapSize.set(quality==="cinema"?2048:1024,quality==="cinema"?2048:1024);
Object.assign(sun.shadow.camera,{left:-53,right:53,top:48,bottom:-48,near:1,far:145});
sun.shadow.normalBias=.035;sun.shadow.bias=-.00005;scene.add(sun);scene.add(sun.target);
const fill=new THREE.DirectionalLight(0xd5e7f4,.75);fill.position.set(35,18,-38);scene.add(fill);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.36;room.dispose();pmrem.dispose();
const actors=new THREE.Group();actors.name="Event attendees";scene.add(actors);
const linkRoot=new THREE.Group();linkRoot.name="Confirmed encounters";scene.add(linkRoot);
const markerRoot=new THREE.Group();scene.add(markerRoot);
const activityMarkerRoot=new THREE.Group();activityMarkerRoot.name="Activity checkpoints";scene.add(activityMarkerRoot);
const client=new EventClient({storage:EventClient.storageFor(params)});
let currentScene=null,sceneId="campus",switchSerial=0,cameraMove=null,tour=null,paused=false,time=0,last=performance.now(),selectedId=null,showcaseStarted=false;
let premiumLibrary=null,premiumLoadPromise=null;
const people=new Map(),keys=new Set(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const hoverRoot=new THREE.Group();hoverRoot.name="Interaction hover";scene.add(hoverRoot);
let hoveredId=null,hoveredMarker=null;
let fpsFrames=0,fpsStart=performance.now(),fps=0,hasConnected=false,knownAttendees=null;
const pendingArrivals=new Set();
let audioContext=null,soundEnabled=false,activeVenue=null,venueView="event",venueEventReady=false,venuePresentationBounds=null;
const arrivals=createArrivalEffects(scene,{reducedMotion:reduced});
const labels=createWorldLabels({budget:mobile?7:params.get("mode")==="stage"?18:12});
if(params.get("mode")==="stage")labels.layer.classList.add("court-stage-labels");
const LINK_VERTEX="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}";
const LINK_FRAGMENT="uniform vec3 color;uniform float time;uniform float strength;uniform float burst;varying vec2 vUv;void main(){float flow=fract(vUv.x*2.6-time*0.42);float pulse=smoothstep(0.0,0.07,flow)*(1.0-smoothstep(0.1,0.4,flow));float ends=smoothstep(0.0,0.05,vUv.x)*(1.0-smoothstep(0.95,1.0,vUv.x));float d=(vUv.x-burst)*7.0;float wave=burst>=0.0?exp(-d*d)*1.6:0.0;float a=clamp((0.32+pulse*0.85+wave)*ends*strength,0.0,1.0);gl_FragColor=vec4(color*(0.85+pulse*0.7+wave),a);}";
const linkTime={value:0};
let pendingArrival=null,knownConnections=null,clientReady=null;
const UI=new AppUI({
 client,
 onArrive:attendee=>welcomeArrival(attendee),
 onPersonaPreview:id=>requestPersona(id,true),
 onCamera:id=>goCamera(({overview:"hero",courtyard:"garden"})[id]||id),
 onScene:id=>switchScene(id),
 onVenue:(id,options={})=>switchScene(id,{view:"source",...options}),
 onView:view=>setVenueView(view),
 onImport:async ({manifest,file})=>{await switchScene("import",{manifest,file});},
 onTour:()=>toggleTour(),
 onSelectPerson:person=>{if(person?.id)focusPerson(person.id);},
 onActivityCheckpoint:id=>focusActivityCheckpoint(id),
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
function fitPreset(preset,id){
 const result={...preset,position:[...preset.position],target:[...preset.target]};
 if(innerWidth<720&&preset.portrait)return {...preset.portrait,position:[...preset.portrait.position],target:[...preset.portrait.target]};
 if(innerWidth<720){const p=new THREE.Vector3(...result.position),t=new THREE.Vector3(...result.target);p.sub(t).multiplyScalar(1.3).add(t);result.position=p.toArray();result.fov=Math.min(58,(result.fov||43)+8);}
 const region=currentScene?.config?.regionBounds?.[id];
 const bounds=region?{box:new THREE.Box3(new THREE.Vector3(region.minX,region.minY,region.minZ),new THREE.Vector3(region.maxX,region.maxY,region.maxZ))}:venuePresentationBounds;
 return activeVenue&&bounds&&innerWidth<720&&(region||["hero","aerial"].includes(id))?fitBuildingPreset(result,bounds,camera.aspect):result;
}
function goCamera(id,duration=1700){if(!currentScene)return;const presets=venueView==="event"?{...currentScene.cameras,...currentScene.eventCameras}:currentScene.cameras,actual=presets[id]?id:"hero",preset=fitPreset(presets[actual],actual);if(activeVenue&&venuePresentationBounds){const distance=new THREE.Vector3(...preset.position).distanceTo(new THREE.Vector3(...preset.target)),reach=distance+venuePresentationBounds.radius;controls.maxDistance=Math.max(controls.maxDistance,distance*1.1);camera.far=Math.max(camera.far,reach*2);if(venueView!=="event"){scene.fog.near=Math.max(scene.fog.near,reach*1.05);scene.fog.far=Math.max(scene.fog.far,reach*1.7);}}cameraTo(preset.position,preset.target,preset.fov||43,duration);renderFinish.look.setShot(UI.stage?"stage":"walk");UI.setCameraSelection(actual);if(activeVenue){const url=new URL(location.href);url.searchParams.set("camera",actual);history.replaceState(null,"",url);}}
// Everyone, including the viewer, stands on the shared social floor plan, so
// a guest is in the same spot on every phone and on the big screen.
function personPosition(index,isSelf=false,person=null){
 const demo=person?.source==="curated-demo"&&demoSocialPose(person.id,activeVenue?.id,currentScene.spawn.y||0);if(demo)return demo;
 const occupied=[...people.values()].filter(value=>value.person.id!==person?.id).map(value=>value.root.position);
 if(currentScene.socialFloor?.slots.length)return socialSlotFor(currentScene.socialFloor,person,occupied);
 const points=currentScene.eventPeople||currentScene.anchors.people||[];
 const available=points.find(point=>occupied.every(other=>Math.hypot(other.x-point.x,other.z-point.z)>1));
 return available?{...available}:null;
}
// Persona models stream in on demand (self and the selected guest first); a
// guest appears the moment their own look is ready, never in a stand-in body.
const personaState=new Map(),personaQueue=[];let personaLoads=0,fallbackPromise=null;
function pumpPersonas(){
 while(premiumLibrary&&personaLoads<(mobile?2:4)&&personaQueue.length){
  const id=personaQueue.shift();personaLoads++;
  premiumLibrary.ensurePersona(id).then(()=>personaState.set(id,"ready")).catch(error=>{console.warn("Persona unavailable",id,error.message);personaState.set(id,"failed");return ensureFallbackModels();})
   .finally(()=>{personaLoads--;pumpPersonas();if(client.snapshot)syncPeople(client.snapshot);});
 }
}
function requestPersona(id,urgent=false){
 if(!personaById(id))return;
 if(!premiumLibrary){premiumLoadPromise?.then(()=>requestPersona(id,urgent));return;}
 if(personaState.has(id)){if(urgent&&personaState.get(id)==="queued"){personaQueue.splice(personaQueue.indexOf(id),1);personaQueue.unshift(id);}return;}
 personaState.set(id,"queued");urgent?personaQueue.unshift(id):personaQueue.push(id);pumpPersonas();
}
function ensureFallbackModels(){return fallbackPromise??=Promise.allSettled(PREMIUM_CHARACTER_ASSETS.map(definition=>premiumLibrary.ensureDefinition(definition)));}
function personaReady(person){
 if(!premiumLibrary)return !premiumLoadPromise;
 const id=personaById(person.persona)?.id;
 if(id&&premiumLibrary.hasPersona(id))return true;
 if(id&&personaState.get(id)!=="failed"){requestPersona(id,person.id===client.me?.attendee?.id||person.id===selectedId);return false;}
 if(!premiumLibrary.templates.length){ensureFallbackModels().then(()=>client.snapshot&&syncPeople(client.snapshot));return false;}
 return true;
}
function addPerson(person,index,animate=false){
 const persona=personaById(person.persona);
 const options={persona:persona?.id,color:person.avatarColor||persona?.color||"#a59074",seed:stablePersonSeed(person.id),name:person.name,presentation:"social"};
 const character=premiumLibrary?.templates.length?premiumLibrary.createPremiumCharacter(options):createCharacter(options);
 character.root.userData.personId=person.id;
 character.root.traverse(o=>{o.userData.personId=person.id;});
 const self=person.id===client.me?.attendee?.id;
 const pos=personPosition(index,self,person);
 // A full floor never stacks two avatars; the extra guest simply waits off-screen.
 if(!pos){character.dispose?.();return null;}
 character.root.position.set(pos.x,pos.y||0,pos.z);character.root.rotation.y=pos.yaw||0;
 actors.add(character.root);adaptPolygonOffsetMaterials(character.root,reversedDepth);
 people.set(person.id,{...character,person,index,pos,arrival:animate?time:null,reaction:null,labelColor:persona?.color||person.avatarColor,assetId:character.assetId});
 if(animate){character.root.scale.setScalar(.02);chime();arrivals.spawn(character.root.position,persona?.color||"#ffcf8f",{scale:self?1.3:1});}
 return character;
}
// Only guests missing from the previous snapshot are arriving; a guest whose
// model finished streaming later was already here and appears quietly.
function noteArrivals(snapshot){
 const ids=new Set((snapshot?.attendees||[]).map(a=>a.id));
 if(knownAttendees)for(const id of ids)if(!knownAttendees.has(id))pendingArrivals.add(id);
 for(const id of pendingArrivals)if(!ids.has(id))pendingArrivals.delete(id);
 knownAttendees=ids;
}
function syncPeople(snapshot){
 if(snapshot)noteArrivals(snapshot);
 if(!currentScene||!snapshot||(activeVenue&&!venueEventReady))return;
 const selfId=client.me?.attendee?.id;
 // Measured with 60 on the floor (docs/EVENT-OPERATIONS.md); a larger crowd takes turns.
 const visibleAttendees=visibleSocialAttendees([...snapshot.attendees,...(snapshot.remote?.members||[])],{selectedId,selfId,maxRendered:mobile?30:50,ambientCurated:UI.stage?9:mobile?4:9,now:Date.now()});
 const ids=new Set(visibleAttendees.map(p=>p.id));
 for(const [id,value] of people)if(!ids.has(id)){if(selectedId===id)clearSelection();actors.remove(value.root);value.dispose?.();people.delete(id);}
 const self=visibleAttendees.find(p=>p.id===selfId);if(self)requestPersona(self.persona,true);
 visibleAttendees.forEach((person,index)=>{
  const old=people.get(person.id);
  if(old){
   const upgrade=premiumLibrary?.hasPersona(person.persona)&&old.assetId!==person.persona;
   if(old.person.persona!==person.persona||old.person.avatarColor!==person.avatarColor||upgrade){
    if(!personaReady(person))return;
    const position=old.root.position.clone(),yaw=old.root.rotation.y;actors.remove(old.root);old.dispose?.();people.delete(person.id);
    const replacement=addPerson(person,index,false);if(!replacement)return;replacement.root.position.copy(position);replacement.root.rotation.y=yaw;
    // Model upgrades land in bursts while the persona library streams in; only mark the ones the guest is watching.
    if(person.id===selfId||person.id===selectedId)arrivals.spawn(position,personaById(person.persona)?.color||"#ffcf8f",{scale:.8,duration:1.8});
   }else old.person=person;
   return;
  }
  if(!personaReady(person))return;
  addPerson(person,index,pendingArrivals.delete(person.id)||person.id===selfId);
 });
 syncLinks(snapshot);
}
function disposeLinks(){for(const o of [...linkRoot.children]){o.geometry.dispose();o.material.dispose();linkRoot.remove(o);}}
function linkVisible(line){const self=client.me?.attendee?.id;return UI.stage||(!!selectedId&&line.userData.attendees.includes(selectedId))||(!!self&&line.userData.attendees.includes(self));}
function syncLinks(snapshot){
 disposeLinks();
 const ids=new Set((snapshot.connections||[]).map(c=>c.id));
 const fresh=knownConnections?[...ids].filter(id=>!knownConnections.has(id)):[];
 knownConnections=ids;
 for(const connection of snapshot.connections||[]){
 const a=people.get(connection.fromId||connection.attendeeIds?.[0]),b=people.get(connection.toId||connection.attendeeIds?.[1]);if(!a||!b)continue;
 const start=a.root.position.clone().add(new THREE.Vector3(0,1.15,0)),end=b.root.position.clone().add(new THREE.Vector3(0,1.15,0)),distance=start.distanceTo(end);
 const mid=start.clone().lerp(end,.5);mid.y+=Math.min(4,.6+distance*.24);
 const curve=new THREE.QuadraticBezierCurve3(start,mid,end);
 const geometry=new THREE.TubeGeometry(curve,64,.026,6,false);
 const isNew=fresh.includes(connection.id);
 const material=new THREE.ShaderMaterial({uniforms:{color:{value:new THREE.Color(0xffc977)},time:linkTime,strength:{value:connection.synthetic&&!isNew?.6:1},burst:{value:isNew?0:-1}},vertexShader:LINK_VERTEX,fragmentShader:LINK_FRAGMENT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const line=new THREE.Mesh(geometry,material);line.name="confirmed-"+connection.id;line.raycast=()=>{};line.renderOrder=3;line.userData.attendees=[a.person.id,b.person.id];line.userData.burstStart=isNew?time:null;line.visible=linkVisible(line);linkRoot.add(line);
 if(isNew){for(const p of [a,b]){p.reaction={state:"celebrate",until:time+(p.celebrationDuration||3.2)};arrivals.spawn(p.root.position,"#ffcf8f",{scale:.7,duration:2});}chime("connection");
  const self=client.me?.attendee;
  if(!UI.stage&&self&&[a.person.id,b.person.id].includes(self.id))showStamp({play:"REC ●",date:`${stampDate()}\n${self.name||"你"} × ${(a.person.id===self.id?b:a).person.name}`});}
 }
}
function clearPeople(){for(const person of people.values()){actors.remove(person.root);person.dispose?.();}people.clear();disposeLinks();}
async function setVenueView(view,{updateUrl=true,moveCamera=true,reloadAsset=true}={}){
 // Every explicit choice supersedes pending loads, including a return to the displayed view.
 if(reloadAsset){switchSerial++;UI.setBusy(null);}
 const next=view==="source"?"source":"event";
 if(activeVenue&&next==="event"&&!venueEventReady){UI.toast("此模型尚未完成活动坐标校准，先查看源模型");return;}
 if(reloadAsset&&activeVenue&&currentScene?.venueAsset?.mode!==next)return switchScene(activeVenue.id,venueViewLoadOptions(activeVenue.id,next));
 venueView=activeVenue?next:"event";
 if(activeVenue&&next==="source"){showcaseTimers.forEach(clearTimeout);showcaseTimers=[];showcaseStarted=false;tour=null;cameraMove=null;}
 keys.clear();clearSelection();
 setEventLayersVisible([actors,linkRoot,markerRoot,hoverRoot,activityMarkerRoot,...(currentScene?.eventGarden?[currentScene.eventGarden.root]:[]),...(currentScene?.landscapeSite?[currentScene.landscapeSite.root]:[]),...(currentScene?.contextLandscape?[currentScene.contextLandscape.root]:[])],venueView==="event");
 // The court grade sits on top of EventLook: lift it first, lay it last.
 if(venueView!=="event")currentScene?.courtDressing?.setEnabled(false);
 currentScene?.eventLook?.setEnabled(venueView==="event");
 if(venueView==="event")currentScene?.courtDressing?.setEnabled(true);
 refreshDepthMaterials();
 renderFinish.setEnabled(venueView==="event");
 currentScene?.eventEntourage?.setEvent(venueView==="event");
 currentScene?.architectureShadows?.setEnabled(venueView==="event");
 UI.setVenueState({candidate:activeVenue,view:venueView,eventReady:venueEventReady});
 if(activeVenue&&moveCamera)goCamera(cameraForVenueView(venueView));
 if(updateUrl&&activeVenue){const url=new URL(location.href);url.searchParams.set("view",venueView);history.replaceState(null,"",url);if(UI.stage)UI.renderStageQr();}
}
function restoreBuiltInFraming(){
 camera.near=.12;camera.far=350;camera.updateProjectionMatrix();controls.minDistance=6;controls.maxDistance=130;
 sun.shadow.bias=-.00005;sun.shadow.normalBias=.035;
 scene.fog=new THREE.Fog(0xe2e7df,95,240);sun.position.set(-36,53,32);sun.target.position.set(0,0,0);
 Object.assign(sun.shadow.camera,{left:-53,right:53,top:48,bottom:-48,near:1,far:145});sun.shadow.camera.updateProjectionMatrix();sun.shadow.needsUpdate=true;
}
async function switchScene(id,options={}){
 const serial=++switchSerial;
 // Reflector's oblique clipping and imported splats retain their verified
 // conventional-depth path. Preserve the requested import through the reload.
 if(reversedDepth&&(id==="campus"||id==="gallery"||options.manifest?.type==="splat")){
  const redirecting=await resumeDepthIfCurrent({id,options},{isCurrent:()=>serial===switchSerial});
  if(!redirecting)return;
  return new Promise(()=>{});
 }
 UI.setBusy("正在准备场景");document.getElementById("loading-detail").textContent="正在读取建筑与景观";
 let result;
 try{
  const candidate=venueById(id);
  let manifest=options.manifest;
  if(candidate){const loaded=await loadVenueManifest(id,{baseUrl:document.baseURI});manifest=loaded.manifest;}
  if(serial!==switchSerial)return;
  const importer=input=>importScene(input,{renderer,file:options.file,onProgress:t=>{if(serial===switchSerial)UI.setBusy(t);}});
  // Phone guests stand in the courtyard; they never need the far towers.
  const light=mobile&&!UI.stage&&!UI.partnerOpen&&params.get("venueDetail")!=="full";
  result=candidate?await loadVenueAsset({id,manifest,view:options.view,baseUrl:document.baseURI,importer,light,onFallback:()=>{if(serial===switchSerial)UI.toast("轻量模型暂不可用，正在载入原始建筑");}}):id==="import"?await importer(manifest):await getSceneDefinition(id).factory({renderer,quality});
  if(serial!==switchSerial){result.dispose?.();return;}
  // Validate real geometry and all presentation data before touching the visible scene.
  const modelBounds=candidate?inspectModelBounds(result.modelRoot):null;

  const eventReady=!!candidate&&!!manifest.anchors.people?.length&&CHECKPOINT_IDS.every(key=>manifest.anchors["checkpoint_"+key]);
  if(eventReady&&options.view==="event"){
   result.eventEntourage=result.venueAsset?.prefiltered?null:await prepareVenueEntourage(result.modelRoot,{venueId:id,baseUrl:new URL("./",document.baseURI).href});
   result.eventGarden=await createEventGarden({venueId:id,config:manifest,quality,props:{treeUrl:new URL("assets/premium/garden-tree.glb",document.baseURI).href,treeHeight:3.2,benchUrl:new URL("assets/premium/garden-seat.glb",document.baseURI).href,benchWidth:2.6}});
   result.eventEntourage?.setEvent(true);
   result.architectureShadows=createArchitectureShadows(result.modelRoot,manifest);result.root.add(result.architectureShadows.root);
   // Local event dressing stays at the surveyed HUB south stair entrance; the complete park retains its authored landscape.
   const landscapeConfig=manifest.siteMode==="campus"?{...manifest,framingBounds:{minX:20,maxX:170,minY:-10,maxY:90,minZ:45,maxZ:250}}:manifest;
   result.landscapeSite=createLandscapeSite(result.modelRoot,landscapeConfig,{quality,obstructionRoot:result.architectureShadows.root});result.root.add(result.landscapeSite.root);
   result.contextLandscape=createContextLandscape(result.modelRoot,landscapeConfig,{quality});result.root.add(result.contextLandscape.root);
   result.root.add(result.eventGarden.root);
   // A distant visual ground closes gaps beyond the supplied survey slab.
   // It sits below all source geometry and never changes walking or model bounds.
   const backdropMaterial=new THREE.MeshBasicMaterial({color:0xb9c4c0,fog:true,transparent:true,depthWrite:false});
   // Keep the surveyed park opaque underneath; fade only its distant surround before the far clip.
   const backdropFade=manifest.siteMode==="campus"?[Math.max(350,modelBounds.radius*2.8),Math.max(1050,modelBounds.radius*4.8)]:[350,1050];
   backdropMaterial.onBeforeCompile=shader=>{shader.uniforms.backdropFade={value:new THREE.Vector2(...backdropFade)};shader.vertexShader="varying vec3 backdropViewPosition;\n"+shader.vertexShader.replace("#include <project_vertex>","#include <project_vertex>\nbackdropViewPosition=mvPosition.xyz;");shader.fragmentShader="uniform vec2 backdropFade;\nvarying vec3 backdropViewPosition;\n"+shader.fragmentShader.replace("#include <opaque_fragment>","diffuseColor.a *= 1.0-smoothstep(backdropFade.x,backdropFade.y,length(backdropViewPosition));\n#include <opaque_fragment>");};
   backdropMaterial.customProgramCacheKey=()=>"distant-ground-fade-v2";
   const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(8000,8000),backdropMaterial);
   backdrop.name="Distant landscape horizon";backdrop.rotation.x=-Math.PI/2;
   backdrop.position.set(modelBounds.center.x,Math.min(-4,modelBounds.box.min.y-1),modelBounds.center.z);
   backdrop.raycast=()=>{};backdrop.userData.noCollision=true;result.eventGarden.root.add(backdrop);
   result.backdrop=backdrop;
   result.eventPeople=socialPeopleLayout(manifest,result.eventGarden.colliders);
   // Planned from the full-quality garden so phones and the big screen agree.
   const plannedGarden=planEventGarden(manifest,{venueId:id,quality:"high"});
   const signposts=Object.values(calibratedCheckpoints(manifest.anchors)).map(([x,,z])=>({x,z,r:.55}));
   result.socialFloor=planSocialFloor({bounds:manifest.bounds,focus:manifest.spawn,groundY:manifest.groundY??0,
    colliders:[...(manifest.colliders||[]),...plannedGarden.items.map(p=>({x:p.x,z:p.z,r:p.r})),...signposts],
    reserved:DEMO_SOCIAL_PAIRS.flat().map(pid=>demoSocialPose(pid,id,manifest.groundY??0)).filter(Boolean)});
   result.courtDressing=createCourtDressing({bounds:manifest.bounds,groundY:manifest.groundY??0,event:client.snapshot?.event||{},theme:client.snapshot?.event?.theme||{},
    colliders:[...(manifest.colliders||[]),...plannedGarden.items.map(p=>({x:p.x,z:p.z,r:p.r})),...signposts],quality,sun,hemi,fill,renderer,scene,reversedDepth,
    replaces:[result.eventGarden.root.getObjectByName("event paving surface")].filter(Boolean),look:renderFinish.look});
   result.eventGarden.root.add(result.courtDressing.root);
   const a=manifest.anchors.arrival,y=manifest.groundY;
   result.eventCameras=id==="venue-campus"?{
    hero:manifest.cameras.hero,
    // The courtyard where guests stand, with the HUB stair and canopy behind.
    // Upright phones look down ~25° instead, or the canopy fills a third of the screen.
    arrival:{position:[171.34,7.4,108.5],target:[171.34,.9,86.5],fov:46,portrait:{position:[171.34,13.5,113],target:[171.34,.7,86],fov:54}},
    garden:{position:[185,4.3,94],target:[171.34,3.5,73],fov:43}
   }:id==="venue-ab-canopy"?{
    hero:{position:[190,65,330],target:[87,37,164],fov:38},
    arrival:{position:[101,y+3.7,213],target:[85,y+1.7,204],fov:51},
    garden:{position:[84.2,y+1.85,211.1],target:[83.5,y+1.0,205.1],fov:34}
   }:{arrival:{position:[a.x+5,y+3.1,a.z+5],target:[a.x-2,y+1.1,a.z-7],fov:49},garden:{position:[a.x-5,y+2.3,a.z-1],target:[a.x,y+1.1,a.z-10],fov:45}};
   const pairA=demoSocialPose("seed-01",id,y),pairB=demoSocialPose("seed-02",id,y);
   if(pairA&&pairB){const cx=(pairA.x+pairB.x)/2,cz=(pairA.z+pairB.z)/2;result.eventCameras.garden=["venue-ab-canopy","venue-campus"].includes(id)?{position:[cx+4.2,y+2.05,cz+5.3],target:[cx-.7,y+1.12,cz-.7],fov:38}:{position:[cx+.7,y+1.85,cz+6],target:[cx,y+1,cz],fov:34};}
   if(id==="venue-campus")result.eventCameras.hero=manifest.cameras.hero;
   const originalDispose=result.dispose;
   result.dispose=()=>{result.courtDressing?.dispose();result.eventLook?.dispose();result.eventEntourage?.dispose();result.backdrop?.geometry.dispose();result.backdrop?.material.dispose();result.eventGarden?.dispose();result.architectureShadows?.dispose();result.landscapeSite?.dispose();result.contextLandscape?.dispose();originalDispose?.();};
  }
  if(eventReady&&options.view==="event"){result.eventLook=await createEventLook({renderer,scene,modelRoot:result.modelRoot,config:debugSun(manifest),sun,hemi,fill,baseUrl:new URL("./",document.baseURI).href,quality});result.eventEntourage?.setEvent(true);}
  if(serial!==switchSerial){result.dispose?.();return;}
  if(premiumLoadPromise)await premiumLoadPromise;
  if(serial!==switchSerial){result.dispose?.();return;}
  const previous=currentScene;
  previous?.courtDressing?.setEnabled(false);
  previous?.eventLook?.dispose();
  showcaseTimers.forEach(clearTimeout);showcaseTimers=[];showcaseStarted=false;tour=null;cameraMove=null;keys.clear();
  clearPeople();clearSelection();UI.closePanel();if(previous)scene.remove(previous.root);
  currentScene=result;sceneId=id;activeVenue=candidate;venueEventReady=eventReady;venuePresentationBounds=candidate?presentationBoundsForModel(modelBounds,manifest):null;scene.add(result.root);
  scene.environment=result.environment||env.texture;
  if(candidate)applyModelFraming({bounds:modelBounds,cameras:result.cameras,config:manifest,camera,controls,sun,scene});else restoreBuiltInFraming();
  previous?.dispose?.();renderer.renderLists.dispose();
  syncPeople(client.snapshot);buildActivityMarkers();precisionBounds=cachePrecisionBounds(result.root,{exclude:result.backdrop});precisionBounds.push(...cachePrecisionBounds(activityMarkerRoot));refreshDepthMaterials();
  UI.setSceneLabel(candidate?.name||(id==="import"?manifest.name||"我的场景":getSceneDefinition(id).displayName),id);
  const url=new URL(location.href);url.searchParams.delete("scene");url.searchParams.delete("venue");url.searchParams.delete("camera");
  if(candidate){url.searchParams.delete("sceneManifest");url.searchParams.set("venue",id);if(options.scope==="building")url.searchParams.set("scope","building");else if(id==="venue-campus")url.searchParams.delete("scope");}
  else if(id!=="import"){url.searchParams.delete("sceneManifest");url.searchParams.delete("view");url.searchParams.set("scene",id);}
  else { url.searchParams.delete("view"); }
  history.replaceState(null,"",url);
  setVenueView(candidate?(options.view==="event"&&eventReady?"event":"source"):"event",{moveCamera:false,reloadAsset:false});
  goCamera(options.camera||(id==="venue-campus"&&options.view==="event"?"arrival":candidate?cameraForVenueView(venueView):"hero"),0);
  if(UI.stage)UI.renderStageQr();
  try{localStorage.setItem("echo-campus-scene",id==="import"?"campus":id);}catch{}
  document.documentElement.dataset.ready="true";
  UI.setBusy(null);document.getElementById("loading").classList.add("loaded");document.getElementById("loading").setAttribute("aria-hidden","true");
  if(pendingArrival){const attendee=pendingArrival;setTimeout(()=>welcomeArrival(attendee),60);}
 }catch(error){if(result&&result!==currentScene)result.dispose?.();if(serial===switchSerial){UI.setBusy(null);UI.toast("场景加载失败："+error.message);if(!currentScene)document.getElementById("loading-detail").textContent=error.message;}throw error;}
}
function clearSelection(){
 renderFinish.look.setShot(UI.stage?"stage":"walk");
 selectedId=null;linkRoot.children.forEach(o=>o.visible=false);for(const o of [...markerRoot.children]){o.geometry.dispose();o.material.dispose();markerRoot.remove(o);}
 hoveredId=null;hoveredMarker=null;hoverRoot.traverse(o=>{o.geometry?.dispose?.();const m=o.material;if(m){(Array.isArray(m)?m:[m]).forEach(x=>x?.dispose?.());}});hoverRoot.clear();UI.setHoverTarget?.(null);
}
const ACTIVITY_MARKERS={
 welcome:{label:"入场签到",partner:"ECHO CAMPUS",color:0x9e7651,positions:{campus:[3.65,.2,22.3],gallery:[3,.2,24.9]}},
 future:{label:"未来计算",partner:"中科曙光 · 海光信息",color:0x567e88,positions:{campus:[-19,.2,9],gallery:[-25,.2,1]}},
 platform:{label:"平台共创",partner:"字节 · 豆包 · 飞书",color:0x7f6f9d,positions:{campus:[22,.2,14],gallery:[24,.2,-8]}},
 gallery:{label:"水上艺廊",partner:"空间体验站",color:0x5b8e83,positions:{campus:[-9,.2,-.7],gallery:[0,.2,1.4]}},
 connection:{label:"相遇确认",partner:"ECHO CAMPUS",color:0xb1844c,positions:{campus:[22,.2,19.5],gallery:[25,.2,19.5]}},
};
function markerLabelTexture(label,partner,color){
 const canvas=document.createElement("canvas");canvas.width=720;canvas.height=180;const ctx=canvas.getContext("2d");
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="rgba(248,250,242,.94)";ctx.beginPath();ctx.roundRect(12,12,696,156,26,26);ctx.fill();
 ctx.strokeStyle=`#${color.toString(16).padStart(6,"0")}`;ctx.lineWidth=5;ctx.stroke();ctx.fillStyle="#3f5946";ctx.font="600 42px Microsoft YaHei, sans-serif";ctx.textAlign="center";ctx.fillText(label,360,78);
 ctx.fillStyle="#81917f";ctx.font="24px Microsoft YaHei, sans-serif";ctx.fillText(partner,360,122);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function disposeActivityMarkers(){
 activityMarkerRoot.traverse(o=>{if(o.geometry)o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!m)continue;const map=m.map;if(map?.isTexture)map.dispose();m.dispose?.();}});
 activityMarkerRoot.clear();
}
function buildActivityMarkers(){
 disposeActivityMarkers();if(!currentScene||!currentScene.anchors)return;
 const sceneKey=sceneId==="gallery"?"gallery":"campus";
 const custom=sceneId!=="gallery"&&sceneId!=="campus";
 const customPositions=custom?calibratedCheckpoints(currentScene.anchors):null;
 for(const [id,definition] of Object.entries(ACTIVITY_MARKERS)){
  const position=custom?customPositions[id]:definition.positions[sceneKey];if(!position)continue;
  const group=new THREE.Group();group.name=`activity-marker-${id}`;group.position.set(...position);group.userData.activityMarkerId=id;
  const color=new THREE.Color(definition.color);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.25,.30,.065,32),new THREE.MeshStandardMaterial({color:0xd8d0bc,roughness:.8}));base.position.y=.033;
  const stem=new THREE.Mesh(new THREE.BoxGeometry(.075,1.04,.075),new THREE.MeshStandardMaterial({color:0x616d5f,metalness:.45,roughness:.4}));stem.position.y=.56;
  const board=new THREE.Mesh(new THREE.BoxGeometry(.72,.93,.06),new THREE.MeshStandardMaterial({color:0xe9e2d2,roughness:.65}));board.position.y=1.16;
  const art=document.createElement("canvas");art.width=512;art.height=640;const ctx=art.getContext("2d");
  ctx.fillStyle="#eae6db";ctx.fillRect(0,0,512,640);ctx.fillStyle="#"+definition.color.toString(16).padStart(6,"0");ctx.fillRect(0,0,512,12);
  ctx.fillStyle="#597061";ctx.font="500 19px sans-serif";ctx.fillText("ECHO CAMPUS",36,66);
  ctx.fillStyle="#354a42";ctx.font="500 44px Microsoft YaHei, sans-serif";ctx.fillText(definition.label,36,176);
  ctx.font="20px Microsoft YaHei, sans-serif";const partner=definition.partner;ctx.fillText(partner,36,227);
  ctx.strokeStyle="#aab3a3";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(36,269);ctx.lineTo(476,269);ctx.stroke();
  ctx.font="400 19px sans-serif";ctx.fillStyle="#869382";ctx.fillText("DISCOVER & CONNECT",36,316);
  ctx.strokeStyle="#"+definition.color.toString(16).padStart(6,"0");ctx.lineWidth=6;ctx.lineCap="round";
  for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(220,478,38+i*24,-.65,.65);ctx.stroke();}
  ctx.font="500 22px Microsoft YaHei, sans-serif";ctx.fillStyle="#536b59";ctx.fillText("点击探索 · 碰一碰",36,590);
  const map=new THREE.CanvasTexture(art);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(.695,.90),new THREE.MeshStandardMaterial({map,roughness:.78}));face.position.y=1.16;placeSignSurface(face,board.geometry);
  const back=face.clone();placeSignSurface(back,board.geometry,-1);
  group.add(base,stem,board,face,back);group.traverse(o=>{o.userData.activityMarkerId=id;if(o.isMesh&&!o.userData.signSurface){o.castShadow=true;o.receiveShadow=true;}});activityMarkerRoot.add(group);
 }
}
function focusActivityCheckpoint(id){
 if(activeVenue&&venueView!=="event")return;
 const marker=activityMarkerRoot.children.find(item=>item.userData.activityMarkerId===id);if(!marker)return UI.openActivity(id);
 UI.openActivity(id);const target=marker.position.clone().add(new THREE.Vector3(0,.82,0));const position=target.clone().add(new THREE.Vector3(1.4,1,3.7));cameraTo(position.toArray(),target.toArray(),45,1000);
}
function framePerson(position,yaw,{exclude=null,duration=1200,sheet=true}={}){
 const panelWidth=innerWidth>760?(document.querySelector(".ec-panel")?.getBoundingClientRect().width||420)+44:0;
 const sheetFraction=innerWidth<=760&&sheet?Math.min(.68,(Math.min(innerHeight*.66,620)+10)/innerHeight):0;
 const preset=profileCameraPreset({position,yaw,aspect:camera.aspect,panelFraction:panelWidth/innerWidth,sheetFraction,neighbors:[...people.values()].filter(other=>other!==exclude).map(other=>other.root.position)});
 cameraTo(preset.position,preset.target,preset.fov,duration);
 renderFinish.look.setShot("close",{focus:sheetFraction+(1-sheetFraction)*.5});
}
function focusPerson(id,{openCard=true,duration=1200}={}){
 if(activeVenue&&venueView!=="event")return;
 let p=people.get(id);
 const known=findPerson(client.snapshot,id);
 if(!p){if(!known)return;selectedId=id;syncPeople(client.snapshot);p=people.get(id);}
 // Their look may still be streaming in: the card never waits for the model.
 if(!p){if(openCard)UI.setSelectedPerson(known);return;}
 selectedId=id;p.reaction={state:"wave",until:time+(p.greetingDuration||5.8)};
 premiumLibrary?.upgradePersona(p.person.persona);
 linkRoot.children.forEach(o=>o.visible=linkVisible(o));
 if(openCard)UI.setSelectedPerson(p.person);
 for(const o of [...markerRoot.children]){o.geometry.dispose();o.material.dispose();markerRoot.remove(o);}
 const ring=new THREE.Mesh(new THREE.RingGeometry(.46,.51,64),new THREE.MeshBasicMaterial({color:new THREE.Color(p.labelColor||"#c68d42"),side:THREE.DoubleSide,transparent:true,opacity:.95}));ring.rotation.x=-Math.PI/2;ring.position.copy(p.root.position).y+=.055;ring.userData.selectionRing=true;markerRoot.add(ring);
 framePerson(p.root.position,p.root.rotation.y,{exclude:p,duration,sheet:openCard});
}
// After a one-tap arrival: a short descent from above the courtyard to the
// guest's own avatar, which materializes in a beam of light.
function welcomeArrival(attendee){
 if(!attendee)return;
 if(!currentScene||(activeVenue&&!venueEventReady)){pendingArrival=attendee;return;}
 pendingArrival=null;
 if(activeVenue&&venueView!=="event")setVenueView("event");
 requestPersona(attendee.persona,true);premiumLibrary?.upgradePersona(attendee.persona,{pin:true});
 const spawn=currentScene.spawn,center=new THREE.Vector3(spawn.x,spawn.y||0,spawn.z);
 cameraTo([center.x+9,center.y+22,center.z+18],[center.x,center.y+1,center.z],52,0);
 if(client.snapshot)syncPeople(client.snapshot);
 const p=people.get(attendee.id);
 setTimeout(()=>{
  const current=people.get(attendee.id);
  if(current){current.reaction={state:"wave",until:time+(current.greetingDuration||5)};selectedId=attendee.id;}
  framePerson(current?.root.position||center,current?.root.rotation.y??0,{exclude:current,duration:2600,sheet:false});
  if(p&&!p.arrival)arrivals.spawn(p.root.position,personaById(attendee.persona)?.color,{scale:1.3,duration:3});
  showStamp({date:`${stampDate()}\n${client.snapshot?.event?.name||"相遇之庭"}  NO.${serialLabel(attendee.serial)}`});
 },180);
}
// Big screen: a slow orbit over the courtyard so every arrival and lit
// connection stays in frame without an operator.
// A pendulum over the open south side of the court; a full circle would pass
// behind the HUB stair and landscape slopes.
const stageOrbit={phase:0};
function updateStageCamera(dt){
 if(!UI.stage||!currentScene||cameraMove||tour||controlsActive)return;
 if(renderFinish.look.shot!=="stage")renderFinish.look.setShot("stage");
 const b=currentScene.config?.bounds,y=currentScene.spawn?.y||0;
 const center=b?new THREE.Vector3((b.minX+b.maxX)/2,y,(b.minZ+b.maxZ)/2):controls.target.clone();
 const radius=b?Math.max(15,Math.hypot(b.maxX-b.minX,b.maxZ-b.minZ)*.5):24;
 stageOrbit.phase+=dt*(reduced?0:.05);
 const angle=.12+Math.sin(stageOrbit.phase)*.62;
 camera.position.set(center.x+Math.sin(angle)*radius,y+radius*.42,center.z+Math.cos(angle)*radius);
 controls.target.set(center.x,y+.8,center.z);
}
let controlsActive=false;
function toggleTour(){
 UI.closePanel();cameraMove=null;if(tour){tour=null;UI.toast("已暂停园区导览");return;}
 tour={started:performance.now(),base:camera.position.clone(),target:controls.target.clone()};UI.toast("导览已开始，拖动画面即可暂停");
}
controls.addEventListener("start",()=>{cameraMove=null;tour=null;controlsActive=true;});
controls.addEventListener("end",()=>{controlsActive=false;});
let downPoint=null;
canvas.addEventListener("pointerdown",e=>{downPoint={x:e.clientX,y:e.clientY};});
canvas.addEventListener("pointermove",e=>{
 if((activeVenue&&venueView!=="event")||e.buttons||UI.panel)return;
 const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
 const personHit=pickSocialPerson(raycaster.ray,people.values()),markerHit=raycaster.intersectObjects(activityMarkerRoot.children,true)[0];
 const hit=personHit&&(!markerHit||personHit.distance<markerHit.distance)?personHit:markerHit;
 const nextPerson=hit?.object.userData.personId||null,nextMarker=hit?.object.userData.activityMarkerId||null;
 if(nextPerson!==hoveredId||nextMarker!==hoveredMarker){hoveredId=nextPerson;hoveredMarker=nextMarker;UI.setHoverTarget?.(nextPerson?people.get(nextPerson)?.person:nextMarker?{name:ACTIVITY_MARKERS[nextMarker]?.label}:null);hoverRoot.traverse(o=>{o.geometry?.dispose?.();const m=o.material;if(m){(Array.isArray(m)?m:[m]).forEach(x=>x?.dispose?.());}});hoverRoot.clear();
  if(nextPerson){const p=people.get(nextPerson);if(p){const ring=new THREE.Mesh(new THREE.RingGeometry(.58,.64,48),new THREE.MeshBasicMaterial({color:0xf3d39a,transparent:true,opacity:.72,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.copy(p.root.position).y+=.06;ring.userData.hoverRing=true;hoverRoot.add(ring);}}
 }
});
canvas.addEventListener("pointerleave",()=>{hoveredId=null;hoveredMarker=null;hoverRoot.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});hoverRoot.clear();UI.setHoverTarget?.(null);});
canvas.addEventListener("pointerup",e=>{
 if(activeVenue&&venueView!=="event"){downPoint=null;return;}
 if(!downPoint||Math.hypot(e.clientX-downPoint.x,e.clientY-downPoint.y)>6)return;downPoint=null;
 const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
 const personHit=pickSocialPerson(raycaster.ray,people.values()),markerHit=raycaster.intersectObjects(activityMarkerRoot.children,true)[0];
 const hit=personHit&&(!markerHit||personHit.distance<markerHit.distance)?personHit:markerHit;if(hit?.object.userData.personId)focusPerson(hit.object.userData.personId);else if(hit?.object.userData.activityMarkerId)focusActivityCheckpoint(hit.object.userData.activityMarkerId);
});
window.addEventListener("keydown",e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){keys.add(e.key.toLowerCase());e.preventDefault();}if(e.key==="Escape"){UI.closePanel();cameraMove=null;tour=null;}});
window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));window.addEventListener("blur",()=>keys.clear());
document.addEventListener("visibilitychange",()=>{keys.clear();last=performance.now();});
// Social exhibit: keys explore the space with the camera. Avatars remain
// grounded at their calibrated conversation spots on desktop and phone alike.
function moveView(dt){
 if(!keys.size||UI.panel||(activeVenue&&venueView!=="event"))return;
 const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();
 const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0));
 const movement=new THREE.Vector3();
 if(keys.has("w")||keys.has("arrowup"))movement.add(forward);
 if(keys.has("s")||keys.has("arrowdown"))movement.sub(forward);
 if(keys.has("d")||keys.has("arrowright"))movement.add(right);
 if(keys.has("a")||keys.has("arrowleft"))movement.sub(right);
 if(!movement.lengthSq())return;
 cameraMove=null;tour=null;
 movement.normalize().multiplyScalar(dt*THREE.MathUtils.clamp(camera.position.distanceTo(controls.target)*.3,2,12));
 controls.target.add(movement);camera.position.add(movement);
}
client.addEventListener("snapshot",e=>{hasConnected=true;UI.setSnapshot(e.detail);currentScene?.courtDressing?.setEvent(e.detail.event||{});syncPeople(e.detail);});
// A crowd beyond the budget takes turns (SocialEnsemble ROTATE_MS); look for the next batch every minute.
setInterval(()=>{if(client.snapshot)syncPeople(client.snapshot);},60000);
client.addEventListener("me",e=>{UI.setMe(e.detail);const me=e.detail?.attendee;if(!me)return;requestPersona(me.persona,true);premiumLoadPromise?.then(()=>premiumLibrary?.upgradePersona(me.persona,{pin:true}));});
client.addEventListener("status",e=>{UI.setOnline(e.detail.online);if(!e.detail.online&&e.detail.message)UI.toast("活动连接暂不可用，场景仍可浏览");});
function resize(){renderer.setSize(innerWidth,innerHeight,false);renderFinish.resize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
window.addEventListener("resize",resize);resize();
let showcaseTimers=[];
function runShowcase(){
 if(activeVenue&&venueView!=="event"){toggleTour();return;}
 if(showcaseStarted){showcaseTimers.forEach(clearTimeout);showcaseTimers=[];showcaseStarted=false;UI.hideChrome(false);UI.closePanel();UI.toast("已退出展示导览");return;}
 showcaseStarted=true;UI.closePanel();goCamera("hero",0);UI.toast("90 秒展示导览开始，可随时拖动画面");
 const action=(seconds,fn)=>showcaseTimers.push(setTimeout(()=>{if(showcaseStarted)fn();},seconds*1000));
 action(8,()=>goCamera("arrival",6000));
 action(21,()=>goCamera("garden",4500));
 action(30,()=>{UI.openDemoPanel();goCamera("arrival",2500);});
 action(44,()=>{UI.closePanel();const first=client.snapshot?.attendees?.[0];if(first)focusPerson(first.id);});
 action(57,()=>{UI.closePanel();goCamera("garden",4500);});
 action(69,()=>{UI.openScenePanel();});
 action(80,()=>{UI.closePanel();goCamera("aerial",5000);});
 action(92,()=>{showcaseStarted=false;UI.toast("导览结束，可以自由探索园区");});
}
function tick(now){
 requestAnimationFrame(tick);if(document.hidden){last=now;return;}
 const elapsed=Math.min(.25,Math.max(0,(now-last)/1000)),dt=Math.min(.05,elapsed);last=now;if(!paused)time+=elapsed;
 if(cameraMove){const p=Math.min(1,(now-cameraMove.start)/cameraMove.duration),e=p*p*(3-2*p);camera.position.lerpVectors(cameraMove.fromP,cameraMove.toP,e);controls.target.lerpVectors(cameraMove.fromT,cameraMove.toT,e);camera.fov=THREE.MathUtils.lerp(cameraMove.fromFov,cameraMove.toFov,e);camera.updateProjectionMatrix();if(p>=1)cameraMove=null;}
 if(tour&&!paused){const t=(now-tour.started)/1000,angle=t*.035;const offset=tour.base.clone().sub(tour.target).applyAxisAngle(new THREE.Vector3(0,1,0),angle);camera.position.copy(tour.target).add(offset);controls.target.copy(tour.target);}
 controls.update();
 updateDepthRange();
 if(!paused){
  moveView(dt);
  currentScene?.update(dt,time);currentScene?.eventLook?.update?.(dt,camera,controls.target);
  currentScene?.eventGarden?.update?.(dt,time);currentScene?.landscapeSite?.update?.(dt,time);currentScene?.architectureShadows?.update();currentScene?.courtDressing?.update(dt,time);renderFinish.look.update(dt,time);
  for(const ring of hoverRoot.children){
   ring.scale.setScalar(reduced?1:1+Math.sin(time*4.2)*.04);
  }
  for(const ring of markerRoot.children){
   if(ring.userData.selectionRing)ring.scale.setScalar(reduced?1:1+Math.sin(time*3.5)*.05);
  }
  if(actors.visible)for(const value of people.values()){
   if(value.arrival!==null){const progress=Math.min(1,(time-value.arrival)/.75);value.root.scale.setScalar(Math.max(.02,1-Math.pow(1-progress,3)));if(progress===1)value.arrival=null;}
   // No cosmetic translation, yaw snapping, or Walk on a stationary avatar.
   const reacting=value.reaction&&value.reaction.until>time?value.reaction.state:null;
   value.update(elapsed,time,reacting||(value.person.source==="curated-demo"?conversationIntent(value.person.id,time):"idle"));
  }
  linkTime.value=time;
  for(const line of linkRoot.children){const start=line.userData.burstStart;if(start!==null&&start!==undefined){const t=(time-start)/2.2;line.material.uniforms.burst.value=t<1?t:-1;if(t>=1)line.userData.burstStart=null;}}
  arrivals.update(dt);
  updateStageCamera(dt);
 }
 const showLabels=actors.visible&&!UI.root.classList.contains("ec-cinema-mode")&&!(activeVenue&&venueView!=="event");
 labels.setHidden(!showLabels);
 if(showLabels)labels.update(camera,people,{selfId:client.me?.attendee?.id,selectedId,pendingIds:new Set((client.me?.encounters||[]).filter(c=>c.canConfirm).map(c=>c.fromId))});
 renderFinish.render();fpsFrames++;if(now-fpsStart>1000){fps=Math.round(fpsFrames*1000/(now-fpsStart));fpsFrames=0;fpsStart=now;}
}
requestAnimationFrame(tick);
function diagnostics(){
 let meshes=0,materials=new Set(),geometries=new Set();scene.traverse(o=>{if(o.isMesh){meshes++;geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
 return {venue:activeVenue?.id||null,venueView,venueAsset:currentScene?.venueAsset,eventReady:venueEventReady,depthPrecision:{mode:depthPlan.mode,probe:depthProbe,target:renderFinish.diagnostics,near:camera.near,far:camera.far,bounds:precisionBounds.length},renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},fps,dpr:renderer.getPixelRatio(),scene:sceneId,people:people.size,characterPresentation:"continuous-social",meshes,materials:materials.size,geometries:geometries.size,postPasses:renderFinish.passes,shadowMapSize:sun.shadow.mapSize.x,quality,online:UI.online,premiumCharacters:!!premiumLibrary,faces:premiumLibrary?.faceDiagnostics?.()||null,gardenItems:currentScene?.eventGarden?.layout?.items?.length||0,landscapeSite:currentScene?.landscapeSite?.diagnostics,contextLandscape:currentScene?.contextLandscape?.diagnostics,architectureShadows:currentScene?.architectureShadows?.diagnostics,eventLook:currentScene?.eventLook?.diagnostics};
}
window.__THREE_GAME_DIAGNOSTICS__=diagnostics;
installCanvasRecorder(canvas, diagnostics);
if(params.has("capture")||params.has("debug")){
 window.__ECHO_CAMPUS__={renderer,scene,camera,controls,client,UI,look:renderFinish.look,lights:{sun,hemi,fill},get currentScene(){return currentScene;},get premiumLibrary(){return premiumLibrary;},switchScene,goCamera,focusPerson,runShowcase,diagnostics,setVenueView,setPaused(value){paused=value;},setCamera(p,t,fov=43){cameraTo(p,t,fov,0);},setChromeHidden(value){UI.hideChrome(value);},face(id,weights){const f=people.get(id)?.face;if(weights!==undefined)f?.force(weights);return f?{installed:f.installed,weights:{...f.weights}}:null;}};
 window.__THREE_GAME_TEST_HOOKS__={setState:async name=>{if(!currentScene)throw new Error("not ready");if(name==="active-play"||name==="hero"){UI.closePanel();goCamera("hero",0);}else if(name==="arrival"){UI.closePanel();goCamera("arrival",0);}else if(name==="garden"){UI.closePanel();goCamera("garden",0);}else if(name==="gallery"){await switchScene("gallery");}else if(name==="profile"){focusPerson(client.snapshot.attendees[0].id);}else throw new Error("unknown state: "+name);return {state:name};},setPausedForScreenshot(value){paused=value;},setSeed(){return 868;}};
}
(async()=>{
 try{
  premiumLoadPromise=loadCharacterLibrary({baseUrl:document.baseURI,assets:[],allowEmpty:true}).then(library=>{
   premiumLibrary=library;library.hdBudget=mobile?3:6;library.textureAnisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   // Faces compile off the frame; phones find them only for the people they look at closely.
   library.compileFace=(material,mesh)=>{const proxy=mesh.clone();proxy.material=material;return renderer.compileAsync(proxy,camera,scene);};
   library.autoFaces=quality!=="low";if(library.autoFaces)library.wakeFaces();
   pumpPersonas();
  }).catch(error=>{premiumLoadPromise=null;console.warn("Premium characters unavailable",error.message);});
  // The event connection never waits for architecture: an NFC guest can
  // claim a persona while the campus is still streaming in.
  clientReady=client.start().then(()=>UI.handleTap());
  const resume=await consumeStandardDepthResume();
  const requestedVenue=startupVenueFromSearch(location.search);
  // The complete campus opens at the surveyed HUB south stair entrance; regional links retain their own framing.
  const startupVenue=resolveStartupVenue(location.search);
  if(resume){await switchScene(resume.id,resume.options);const url=new URL(location.href);url.searchParams.delete("depthResume");history.replaceState(null,"",url);}
  else if(requestedVenue){
   if(!venueById(requestedVenue))throw new Error("未找到此源模型，请从场地面板选择");
   await switchScene(startupVenue,{view:params.get("view")||(startupVenue==="venue-campus"?"event":"source"),camera:params.get("camera")||undefined});
  }else{
   let startup;
   try{startup=await readSceneStartup({search:location.search,baseUrl:document.baseURI});}catch(error){UI.toast("启动配置未完成："+error.message);startup={scene:"campus"};}
   try{await switchScene(startup.scene,startup.manifest?{manifest:startup.manifest}:{});}catch(error){if(startup.scene!=="campus"){await switchScene("campus");UI.toast("自定义场景加载失败，已回到白庭");}else throw error;}
  }
  await clientReady;if(params.get("tour")==="1")toggleTour();document.documentElement.dataset.ready="true";
 }catch(error){
  document.getElementById("loading-detail").textContent="加载未完成："+error.message;
  if(startupVenueFromSearch(location.search)){document.getElementById("loading").classList.add("loaded");document.getElementById("loading").setAttribute("aria-hidden","true");UI.openScenePanel();UI.sceneError("真实模型加载未完成："+error.message+"。请选择可用源文件重试。");}
  if(startupVenueFromSearch(location.search))(clientReady||client.start()).catch(connectionError=>UI.toast("活动连接暂不可用："+connectionError.message));
  console.error(error);
 }
})();
