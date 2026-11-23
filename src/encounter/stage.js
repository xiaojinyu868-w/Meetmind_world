import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const positions = [[-3.15,1.3],[.1,-.42],[3.15,1.05]];
const palette = [0x296556,0xb86847,0x455a72];
const ids = ['founder','maker','research'];
const names = ['林舟','陈禾','顾宁'];

export function makeStage(host, overlay, faces = []) {
  let renderer;
  try {
    renderer = new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  } catch {
    const group = document.createElement('div');
    group.className = 'fallback-roster';
    const chips = names.map(name => {
      const el = document.createElement('span'); el.textContent = name; group.append(el); return el;
    });
    host.append(group);
    return { update(candidate, confirmed) {
      chips.forEach((el,i) => el.classList.toggle('active', candidate === ids[i] || (confirmed && i === 0)));
    }};
  }
  host.append(renderer.domElement);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new T.Scene();
  scene.background = new T.Color(0xe6e8d9);
  scene.fog = new T.FogExp2(0xe6e8d9,.026);
  const camera = new T.PerspectiveCamera(35,1,.1,100);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enablePan = false;
  controls.minPolarAngle = .60; controls.maxPolarAngle = 1.32;
  controls.minAzimuthAngle = -.42; controls.maxAzimuthAngle = .5;
  controls.enableDamping = true;
  controls.target.set(0,1.25,0);
  const light = new T.DirectionalLight(0xffefd3,3.5);
  light.position.set(-5,11,6); light.castShadow = true;
  Object.assign(light.shadow.camera,{left:-10,right:10,top:9,bottom:-9,near:.1,far:32});
  light.shadow.mapSize.set(1024,1024); light.shadow.normalBias=.025;
  scene.add(light,new T.HemisphereLight(0xffffff,0xb4b89c,2.1));
  const materials = new Map();
  function mat(color) {
    if (!materials.has(color)) materials.set(color,new T.MeshStandardMaterial({color,roughness:.85}));
    return materials.get(color);
  }
  function mesh(geom,material,x,y,z,parent=scene) {
    const obj = new T.Mesh(geom,typeof material === 'number' ? mat(material) : material);
    obj.position.set(x,y,z); obj.castShadow=true; obj.receiveShadow=true; parent.add(obj); return obj;
  }
  const box = (w,h,d,c,x,y,z,p) => mesh(new T.BoxGeometry(w,h,d),c,x,y,z,p);
  const cyl = (a,b,h,c,x,y,z,p,n=48) => mesh(new T.CylinderGeometry(a,b,h,n),c,x,y,z,p);
  const ball = (size,c,x,y,z,p) => mesh(new T.SphereGeometry(size,18,14),c,x,y,z,p);
  box(80,.25,80,0xd2d9c6,0,-.61,0);
  cyl(6.05,5.88,.26,0x487566,0,-.34,0,scene,80);
  cyl(5.8,5.94,.24,0xcbbca2,0,-.14,0,scene,80);
  cyl(5.6,5.75,.18,0xf2ddba,0,.03,0,scene,80);
  function arch(x,z,r,wall) {
    const bottom=1.65, outer=r+.3, shape=new T.Shape();
    shape.moveTo(-outer,0); shape.lineTo(-r,0); shape.lineTo(-r,bottom);
    shape.absarc(0,bottom,r,Math.PI,0,true); shape.lineTo(r,0); shape.lineTo(outer,0);
    shape.lineTo(outer,bottom); shape.absarc(0,bottom,outer,0,Math.PI,false); shape.closePath();
    mesh(new T.ExtrudeGeometry(shape,{depth:.35,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:2,steps:1,curveSegments:28}),wall,x,.15,z);
  }
  arch(-3,-2.35,1.1,0xc79c73); arch(0,-3.35,1.5,0xf2dabc); arch(3,-2.35,1.1,0xca9975);
  function tree(x,z,s) {
    cyl(.09*s,.14*s,1.75*s,0x775e43,x,.95*s,z);
    [[0,1.92,0,.66],[-.29,1.7,.04,.45],[.32,1.83,-.12,.49]].forEach(([dx,y,dz,r],i)=>{
      const leaf=mesh(new T.IcosahedronGeometry(r*s,1),[0x718d69,0x85986c,0x506f58][i],x+dx*s,y*s,z+dz*s);
      leaf.scale.y=1.24;
    });
  }
  tree(-4.35,-1.65,1.06);tree(4.65,-1.65,.85);tree(-3.95,-3.1,.7);tree(3.85,-3.3,1.03);
  [-4.4,4.6].forEach(x=>{
    box(.95,.14,.44,0xa37554,x,.58,.6);
    [-.28,.28].forEach(dx=>box(.12,.36,.28,0x666c5e,x+dx,.33,.6));
  });
  const labels=[], avatars=[], halos=[];
  positions.forEach(([x,z],i)=>{
    const baseY=.17;
    cyl(.86,.92,.23,0xc8b596,x,.23,z);
    cyl(.84,.86,.08,0xf3e9d4,x,.385,z);
    const group=new T.Group(); group.position.set(x,baseY+.26,z); group.rotation.y=[.13,0,-.15][i];scene.add(group);
    const skin=[0xc58f6e,0xc88c69,0xce9a75][i];
    [-.15,.15].forEach(dx=>{
      box(.22,.48,.25,0x384d47,dx,.3,0,group);
      box(.22,.13,.36,0x524a3c,dx,.075,.045,group);
    });
    const coat=cyl(.28,.35,.68,palette[i],0,.84,0,group,9);coat.scale.z=.86;
    [-1,1].forEach(sign=>{
      const sleeve=cyl(.11,.095,.49,palette[i],sign*.325,.85,0,group,8); sleeve.rotation.z=sign*.14;
      ball(.09,skin,sign*.36,.58,.02,group);
    });
    ball(.275,skin,0,1.49,0,group);
    const hair=ball(.282,0x36372d,0,1.55,-.035,group);hair.scale.set(1,.76,1);
    if(i===1){const bob=ball(.28,0x40372f,0,1.45,-.095,group);bob.scale.set(1.03,1.05,.84);}
    [-.1,.1].forEach(dx=>{ball(.023,0x363d32,dx,1.49,.247,group);});
    if(i===2){[-.095,.095].forEach(dx=>mesh(new T.TorusGeometry(.073,.012,6,18),0x343a35,dx,1.49,.26,group));box(.055,.018,.018,0x343a35,0,1.49,.26,group);}
    if(i===0)box(.36,.22,.17,0xc0c7b8,.14,.75,.26,group);
    if(faces[i]){
      const tex=new T.CanvasTexture(faces[i]); tex.colorSpace=T.SRGBColorSpace;
      const seal=mesh(new T.CircleGeometry(.235,48),new T.MeshBasicMaterial({map:tex}),0,.08,.89,group);
      seal.rotation.x=-.24;
      const rim=mesh(new T.TorusGeometry(.245,.025,8,48),0xc68a55,0,.08,.88,group);rim.rotation.x=-.24;
    }
    const ring=mesh(new T.TorusGeometry(.9,.048,10,70),0xd48b37,x,.46,z);ring.rotation.x=-Math.PI/2;ring.visible=false;halos.push(ring);
    avatars.push(group);
    const tag=document.createElement('span');tag.className='person-label';tag.textContent=names[i];overlay.append(tag);labels.push(tag);
  });
  let thread=null, selected=-1, confirmed=false;
  function update(id,hasConfirmation) {
    const idx=ids.indexOf(id);
    if(selected===idx && confirmed===hasConfirmation) return;
    selected=idx;confirmed=hasConfirmation;
    if(thread){scene.remove(thread);thread.geometry.dispose();thread=null;}
    halos.forEach((h,i)=>{h.visible=i===idx||(hasConfirmation&&i===0);h.material=mat(hasConfirmation?0x11795e:0xd48b37);labels[i].classList.toggle('active',h.visible);});
    if(hasConfirmation&&idx>0) {
      const [ax,az]=positions[0], [bx,bz]=positions[idx];
      const curve=new T.QuadraticBezierCurve3(new T.Vector3(ax,.55,az+.45),new T.Vector3((ax+bx)/2,1.55,(az+bz)/2+.9),new T.Vector3(bx,.55,bz+.45));
      thread=mesh(new T.TubeGeometry(curve,48,.065,10,false),0x137d60,0,0,0);
    }
  }
  function size() {
    const {width,height}=host.getBoundingClientRect();
    if(!width||!height)return;
    camera.aspect=width/height;
    const distance=Math.max(13.8,16/camera.aspect);
    camera.position.set(2.1,distance*.49,distance);controls.target.set(0,1.05,0);
    controls.minDistance=distance*.8;controls.maxDistance=distance*1.35;
    camera.updateProjectionMatrix();controls.update();renderer.setSize(width,height,false);
  }
  new ResizeObserver(size).observe(host);size();
  const pos=new T.Vector3();
  let running=false;
  const frame=()=>{
    if(!running)return;
    controls.update();
    const w=host.clientWidth,h=host.clientHeight;
    avatars.forEach((group,i)=>{
      pos.copy(group.position);pos.y+=1.9;pos.project(camera);
      labels[i].style.left=((pos.x+1)*w/2)+'px';labels[i].style.top=((1-pos.y)*h/2)+'px';
    });
    renderer.render(scene,camera);requestAnimationFrame(frame);
  };
  new IntersectionObserver(([entry])=>{if(entry.isIntersecting&&!running){running=true;frame();}else if(!entry.isIntersecting){running=false;}}).observe(host);
  return {update};
}
