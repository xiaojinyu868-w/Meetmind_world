import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { lightHarbor } from "./NightLights.js";
import { buildMiniature } from "./Miniature.js";

const STOPS = ["garden", "forum", "post"];
const SEA_LEVEL = -0.50;

function water() {
  const base = Reflector.ReflectorShader;
  const shader = {
    name: "HarborWater",
    uniforms: { ...base.uniforms, tide: { value: 0 } },
    vertexShader: base.vertexShader.replace("void main()", "varying vec2 waterXY;\nvoid main()")
      .replace("vUv = textureMatrix", "waterXY = position.xy;\n vUv = textureMatrix"),
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float tide;
      varying vec4 vUv;
      varying vec2 waterXY;
      void main() {
        vec2 p = waterXY, uv = vUv.xy / vUv.w;
        float d = length(p);
        float a = sin(p.y * 8.7 + 2.4*sin(p.x * 1.75 - tide * .36) + tide * .68);
        float b = sin(p.x * 5.2 + p.y * 11.0 + sin(p.y*1.1+p.x*.7) - tide * .9);
        uv.x += (.0022 * a + .0015 * b);
        uv.y += .0012 * a;
        vec3 reflected = texture2D(tDiffuse, uv).rgb;
        float foam = pow(max(0., a * .69 + b * .31), 14.);
        float swell = .5 + .5 * sin(p.x * .5 + sin(p.y * .72 + tide * .13));
        vec3 color = mix(vec3(.007,.018,.027), vec3(.012,.05,.058), swell * exp(-d * .043));
        color += foam * vec3(.010,.024,.026) * exp(-d * .045);
        color += reflected * vec3(.26,.34,.38);
        float fade = 1. - smoothstep(6., 15., d + .6*sin(p.y * .4));
        gl_FragColor = vec4(color, fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  };
  const sea = new Reflector(new T.PlaneGeometry(44,44), {
    shader, textureWidth: 512, textureHeight: 384, clipBias: .003, multisample: 0
  });
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_LEVEL;
  sea.material.transparent = true;
  sea.material.depthWrite = false;
  sea.renderOrder = -1;
  return sea;
}

function tinyLights() {
  const positions = [];
  let seed = 412;
  function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
  for (let i = 0; i < 65; i++) positions.push((random()-.5)*19, random()**1.7*7+.4, (random()-.5)*10);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));
  const material = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: {tide:{value:0}},
    vertexShader: `uniform float tide; varying float glimmer;
      void main(){vec3 p=position; p.y+=.19*sin(tide*.5+p.x); p.x+=.18*cos(tide*.23+p.z);
      glimmer=pow(.5+.5*sin(tide*.8+p.x*3.),2.); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      gl_PointSize=clamp(67./gl_Position.w,1.,5.);}`,
    fragmentShader: `varying float glimmer;void main(){float a=max(0.,1.-2.*length(gl_PointCoord-.5));
      gl_FragColor=vec4(1.,.77,.41,pow(a,1.3)*(.2+.8*glimmer));}`
  });
  return new T.Points(geometry,material);
}

export function createHarbor(host, onVisit, markers) {
  const narrow = () => innerWidth <= 720;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x101e25, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  host.append(renderer.domElement);
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(32,1,.15,160);
  scene.add(new T.HemisphereLight(0xb6cee7, 0x645666, .83));
  const key = new T.DirectionalLight(0xe7dbce, 1.52);
  key.position.set(-6,14,9); key.castShadow = true;
  Object.assign(key.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.5,far:40});
  key.shadow.mapSize.set(1024,1024); key.shadow.bias=-.00035; key.shadow.normalBias=.025;
  scene.add(key);
  const rim = new T.DirectionalLight(0x7dbfea,1.58);
  rim.position.set(6,7,-10); scene.add(rim);
  const miniature = buildMiniature(T);
  const updateLamps=lightHarbor(miniature.object);
  const sea = water(), lights = tinyLights();
  scene.add(miniature.object,sea,lights);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.minPolarAngle = .55; controls.maxPolarAngle = 1.29;
  controls.rotateSpeed = .55; controls.zoomSpeed = .65;
  const direction = new T.Vector3(13,10,18).normalize();
  const overviewTarget = new T.Vector3(0,1.15,0);
  let focused = null, framing = null, immersive = false, letter = null;
  let width=1,height=1, aspect=1, homeDistance=28;
  let last = 0, time = 0, slowFrames = 0, qualityReduced = false;
  const view = {x:0,y:0};
  function compose(jump = false) {
    const portable = narrow(), detail = STOPS.includes(focused);
    const target = detail ? miniature.anchors[focused].clone() : overviewTarget.clone();
    const distance = detail ? (portable ? Math.max(12,homeDistance*.62) : homeDistance*.68) : homeDistance;
    const offset = direction.clone().multiplyScalar(distance);
    if (detail) offset.applyAxisAngle(new T.Vector3(0,1,0),{garden:.12,forum:-.22,post:.15}[focused]);
    const x = portable || immersive ? 0 : detail ? -.17 : .145;
    const y = portable ? (detail ? -.18 : -.085) : -.012;
    framing={target, position:target.clone().add(offset), x, y};
    if (jump || reduced.matches) {
      controls.target.copy(target); camera.position.copy(framing.position);
      view.x=x; view.y=y; framing=null; controls.update();
    }
  }
  function viewport() {
    width=host.clientWidth; height=host.clientHeight;
    if (!width || !height) return;
    aspect=width/height;
    const share = narrow() ? .93 : .64;
    const fov = T.MathUtils.degToRad(camera.fov);
    homeDistance=Math.max(16, 16.5/(2*Math.tan(fov/2)*aspect*share));
    controls.minDistance=Math.max(8,homeDistance*.35); controls.maxDistance=homeDistance*1.5;
    renderer.setPixelRatio(Math.min(devicePixelRatio, qualityReduced ? .82 : narrow() ? 1.35 : 1.6));
    renderer.setSize(width,height,false);
    camera.aspect=aspect; camera.updateProjectionMatrix();
    compose(true);
  }
  function applyFrame(delta) {
    if (framing) {
      const k=1-Math.exp(-5*delta);
      controls.target.lerp(framing.target,k); camera.position.lerp(framing.position,k);
      view.x=T.MathUtils.lerp(view.x,framing.x,k); view.y=T.MathUtils.lerp(view.y,framing.y,k);
      if (camera.position.distanceToSquared(framing.position)<.0001) framing=null;
    }
    camera.setViewOffset(width,height,-width*view.x,-height*view.y,width,height);
    controls.update();
  }
  const ray = new T.Raycaster(), mouse = new T.Vector2();
  let pressed = null;
  function hit(e) {
    const rect = host.getBoundingClientRect();
    mouse.set((e.clientX-rect.left)/width*2-1,1-(e.clientY-rect.top)/height*2);
    ray.setFromCamera(mouse,camera);
    return ray.intersectObjects(miniature.pickables,false)[0]?.object.userData.stop;
  }
  const el = renderer.domElement;
  el.addEventListener("pointerdown",e=>{pressed=[e.clientX,e.clientY];framing=null;});
  el.addEventListener("pointercancel",()=>{pressed=null;});
  el.addEventListener("pointerup",e=>{
    if(pressed && Math.hypot(e.clientX-pressed[0],e.clientY-pressed[1])<6 && !immersive) {
      const id=hit(e); if (id) onVisit(id);
    }
    pressed=null;
  });
  el.addEventListener("pointermove",e=>{
    if(!pressed && e.pointerType==="mouse") el.style.cursor=hit(e) && !immersive ? "pointer" : "grab";
  });
  const projected=new T.Vector3();
  function placeMarkers() {
    for(const id of STOPS) {
      const tag=markers[id]; projected.copy(miniature.anchors[id]);
      projected.y+=id==="forum" ? 2.85 : id==="garden" ? 3.08 : 1.97;
      projected.project(camera);
      tag.style.transform="translate(" + ((projected.x+1)*width*.5).toFixed(1) + "px," + ((1-projected.y)*height*.5).toFixed(1)+"px) translate(-50%,-100%)";
    }
  }
  const envelope=new T.Group();
  const paper=new T.Mesh(new T.BoxGeometry(.48,.28,.032),new T.MeshStandardMaterial({color:0xffeac6,roughness:.87}));
  const seam=new T.BufferGeometry().setFromPoints([new T.Vector3(-.23,.13,.018),new T.Vector3(0,-.027,.023),new T.Vector3(.23,.13,.018)]);
  envelope.add(paper,new T.Line(seam,new T.LineBasicMaterial({color:0x9f6e4a})));
  envelope.visible=false;scene.add(envelope);
  const boatOrigin=miniature.boat.position.clone();
  const landing=new T.Vector3(.95,.76,2.50), tracking=new T.Vector3(), targetPosition=new T.Vector3();
  function launchLetter() {
    controls.enabled=false;framing=null;
    const start=miniature.anchors.post.clone(); start.y+=.25;
    const mid=start.clone().lerp(landing,.5);mid.y+=2.45;
    letter={age:reduced.matches?5.2:0,path:new T.QuadraticBezierCurve3(start,mid,landing)};
    envelope.visible=true;
  }
  function stopLetter(){
    letter=null;envelope.visible=false;miniature.boat.position.copy(boatOrigin);controls.enabled=true;
  }
  function sail(delta){
    letter.age+=delta;
    const arrival=Math.min(letter.age/2.5,1), travel=T.MathUtils.smoothstep(letter.age,2.1,8);
    letter.path.getPoint(arrival,envelope.position);
    envelope.rotation.set(-.13, .55+Math.sin(arrival*Math.PI*2)*.75,Math.sin(arrival*Math.PI*3)*.21);
    envelope.visible=arrival<1;
    miniature.boat.position.x=boatOrigin.x-2.3*travel;
    miniature.boat.position.z=boatOrigin.z+4.8*travel;
    miniature.boat.rotation.y+=.59*travel;
    miniature.boat.getWorldPosition(tracking);tracking.y+=.8;
    if(arrival<1) tracking.lerp(envelope.position,.48*(1-arrival));
    const k = reduced.matches?1:1-Math.exp(-3.2*delta);
    const distance=narrow()?9.4:8.5;
    targetPosition.set(.42+.22*travel,.29,.88-.12*travel).normalize().multiplyScalar(distance).add(tracking);
    controls.target.lerp(tracking,k);camera.position.lerp(targetPosition,k);
    view.x=T.MathUtils.lerp(view.x,0,k);view.y=T.MathUtils.lerp(view.y,-.05,k);
  }
  function animate(stamp) {
    if(document.hidden) {last=0;return;}
    const elapsed=last?(stamp-last)/1000:.03;
    if (last && elapsed<1/33 && !framing) return;
    last=stamp;
    const delta=Math.min(elapsed,.09);
    if (!reduced.matches) time+=delta;
    if (elapsed>.095 && elapsed<4) slowFrames++; else slowFrames=Math.max(0,slowFrames-1);
    if (slowFrames>16 && !qualityReduced && renderer.getPixelRatio()>.82) {qualityReduced=true;viewport();}
    miniature.animate(time);updateLamps(time);sea.material.uniforms.tide.value=time;lights.material.uniforms.tide.value=time;
    if(letter)sail(Math.min(elapsed,.35));
    applyFrame(delta);
    placeMarkers();renderer.render(scene,camera);
    if (!host.dataset.ready) host.dataset.ready="true";
  }
  const observer=new ResizeObserver(viewport);observer.observe(host);viewport();
  renderer.setAnimationLoop(animate);
  el.addEventListener("webglcontextlost",e=>{e.preventDefault();renderer.setAnimationLoop(null);host.dispatchEvent(new Event("harbor-lost"));});
  return {
    focus(id) {focused=id;compose();},
    panorama(value) {immersive=value;focused=null;compose();},
    launchLetter, stopLetter,
    get stats(){return {...renderer.info.render};}
  };
}
