import * as THREE from "three";

export function inspectModelBounds(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) throw new Error("模型未包含可见几何，保留当前场景");
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  if (![...center.toArray(),...size.toArray()].every(Number.isFinite) || size.length()<=1e-6) throw new Error("模型范围无效，保留当前场景");
  return {box,center,size,radius:size.length()/2};
}
// The complete geometry controls clipping. Calibrated manifest bounds control
// presentation, so a large or offset survey slab cannot flatten building shadows.
export function presentationBoundsForModel(model, config={}) {
  const b=config.framingBounds;
  if (!b) return model;
  const values=[b.minX,b.maxX,b.minY,b.maxY,b.minZ,b.maxZ];
  if (!values.every(Number.isFinite)||["X","Y","Z"].some(axis=>b["min"+axis]>=b["max"+axis])) throw new Error("主体展示边界无效");
  const box=new THREE.Box3(new THREE.Vector3(b.minX,b.minY,b.minZ),new THREE.Vector3(b.maxX,b.maxY,b.maxZ));
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  return {box,center,size,radius:size.length()/2};
}
export function framingForModel(model,cameras={},config={}) {
  const focus=presentationBoundsForModel(model,config);
  const {center,size,radius}=focus;
  const presetDistances=Object.values(cameras).map(p=>{
    const position=new THREE.Vector3(...p.position),target=p.target?new THREE.Vector3(...p.target):center;
    return position.clone().sub(target).multiplyScalar(1.3).add(target).distanceTo(center);
  });
  const distance=Math.max(radius*4,130,...presetDistances.map(d=>d*1.15));
  const fullModelReach=center.distanceTo(model.center)+model.radius;
  const shadowSpan=Math.max(size.x,size.y,size.z,10)*.7;
  const lightDistance=new THREE.Vector3(-.8,1.3,.85).length()*shadowSpan*2;
  const depthReach=radius*1.35+10;
  return {near:.5,far:Math.max(350,distance+fullModelReach*2),minDistance:.75,maxDistance:distance,
    fogNear:Math.max(95,...presetDistances.map(d=>d+radius),radius*2.4),fogFar:Math.max(240,distance+radius*3),shadowSpan,
    sunPosition:center.clone().add(new THREE.Vector3(-.8,1.3,.85).multiplyScalar(shadowSpan*2)),
    sunTarget:center.clone(),shadowNear:Math.max(.5,lightDistance-depthReach),shadowFar:lightDistance+depthReach,shadowBias:-.001,shadowNormalBias:.2,presentationBounds:focus};
}
export function applyModelFraming({bounds,cameras,config={},camera,controls,sun,scene}) {
  const frame=framingForModel(bounds,cameras,config);
  camera.near=frame.near;camera.far=frame.far;camera.updateProjectionMatrix();
  controls.minDistance=frame.minDistance;controls.maxDistance=frame.maxDistance;
  scene.fog=new THREE.Fog(scene.background,frame.fogNear,frame.fogFar);
  sun.position.copy(frame.sunPosition);sun.target.position.copy(frame.sunTarget);
  Object.assign(sun.shadow.camera,{left:-frame.shadowSpan,right:frame.shadowSpan,top:frame.shadowSpan,bottom:-frame.shadowSpan,near:frame.shadowNear,far:frame.shadowFar});
  sun.shadow.bias=frame.shadowBias;sun.shadow.normalBias=frame.shadowNormalBias;
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.needsUpdate=true;
  return frame;
}
export function nearPlaneForDistance(distance) { return Math.max(.5, distance/300); }
export function cameraForVenueView(view) { return view==="event"?"arrival":"hero"; }
export const CHECKPOINT_IDS = Object.freeze(["welcome","future","platform","gallery","connection"]);
export function calibratedCheckpoints(anchors={}) {
  return Object.fromEntries(CHECKPOINT_IDS.flatMap(id=>{
    const p=anchors["checkpoint_"+id];
    return p && [p.x,p.y,p.z].every(Number.isFinite) ? [[id,[p.x,p.y,p.z]]] : [];
  }));
}
export function setEventLayersVisible(groups,visible) {
  for (const group of groups) group.visible=!!visible;
}

// Preserve all calibrated building corners on portrait screens; a fixed zoom
// multiplier cannot fit a wide site into a narrow horizontal field of view.
export function fitBuildingPreset(preset,bounds,aspect) {
  const position=new THREE.Vector3(...preset.position),target=new THREE.Vector3(...preset.target);
  const forward=target.clone().sub(position).normalize();
  const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  const up=new THREE.Vector3().crossVectors(right,forward).normalize();
  const tanY=Math.tan(THREE.MathUtils.degToRad(preset.fov||45)/2),tanX=tanY*aspect;
  let distance=position.distanceTo(target);
  for(const x of [bounds.box.min.x,bounds.box.max.x])for(const y of [bounds.box.min.y,bounds.box.max.y])for(const z of [bounds.box.min.z,bounds.box.max.z]){
    const v=new THREE.Vector3(x,y,z).sub(target),depth=v.dot(forward);
    distance=Math.max(distance,Math.abs(v.dot(right))*1.12/tanX-depth,Math.abs(v.dot(up))*1.12/tanY-depth);
  }
  return {...preset,position:target.clone().addScaledVector(forward,-distance).toArray()};
}
