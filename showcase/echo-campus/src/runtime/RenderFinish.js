import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { addCourtFinish } from "./CourtLook.js";

export function createRenderFinish(renderer,scene,camera,quality) {
  renderer.info.autoReset=false;
  const samples=quality==="low"?2:4;
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples});
  const composer=new EffectComposer(renderer,target),render=new RenderPass(scene,camera);
  composer.addPass(render);
  let ao=null;
  if(quality==="cinema"){
    ao=new GTAOPass(scene,camera,innerWidth,innerHeight);
    ao.updateGtaoMaterial({radius:1.15,distanceExponent:1.4,thickness:1.2,scale:1,samples:12});
    ao.updatePdMaterial({lumaPhi:8,depthPhi:1,normalPhi:5,radius:6,samples:8,rings:2});
    ao.blendIntensity=.8;
    // The normal prepass must not update the entire directional shadow a second time.
    const renderNormals=ao._renderOverride.bind(ao);
    ao._renderOverride=(...args)=>{
      const auto=renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate=false;
      try{return renderNormals(...args)}finally{renderer.shadowMap.autoUpdate=auto}
    };
    composer.addPass(ao);
  }
  const look=addCourtFinish(composer,{quality,fxaa:samples===0,width:innerWidth,height:innerHeight});
  let enabled=true;
  return {look,render(){renderer.info.reset();if(enabled)composer.render();else renderer.render(scene,camera)},resize(w,h){composer.setSize(w,h);look.resize(w,h,renderer.getPixelRatio())},setEnabled(v){enabled=!!v},get passes(){return enabled?1+(ao?1:0)+look.passes:0},dispose(){ao?.dispose();look.dispose();composer.dispose()}};
}
