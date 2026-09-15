import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { random } from "./SceneKit.js";

// Articulated procedural avatars: one draw call per person, consistent 1.70 m scale.
// Their anonymous faces deliberately avoid suggesting an unapproved photograph likeness.
export function createCharacter({color=0x607c71,seed=1,name="Guest"}={}){
  const root=new THREE.Group();root.name=`guest-${name}`;
  const rng=random(seed*7141+23),palette=new THREE.Color(color),geometries=[];
  const skin=new THREE.Color([0xcda17b,0xb88667,0xddb693,0xa57859][seed%4]);
  const trouser=new THREE.Color([0x333e42,0x515b55,0x434750,0x766b5a][seed%4]);
  const hairColor=new THREE.Color([0x403a31,0x54483b,0x2f3432,0x705a46][seed%4]);
  const bones=[];
  function bone(label,parent,x,y,z){const b=new THREE.Bone();b.name=label;b.position.set(x,y,z);if(parent!==null)bones[parent].add(b);bones.push(b);return bones.length-1;}
  const bRoot=bone("root",null,0,0,0),hip=bone("pelvis",bRoot,0,.9,0),spine=bone("chest",hip,0,.22,0),neck=bone("neck",spine,0,.3,0),head=bone("head",neck,0,.135,0);
  const upperL=bone("upper-arm-L",spine,.23,.18,0),lowerL=bone("forearm-L",upperL,0,-.265,0),handL=bone("hand-L",lowerL,0,-.25,0);
  const upperR=bone("upper-arm-R",spine,-.23,.18,0),lowerR=bone("forearm-R",upperR,0,-.265,0),handR=bone("hand-R",lowerR,0,-.25,0);
  const thighL=bone("thigh-L",hip,.10,-.015,0),shinL=bone("shin-L",thighL,0,-.4,0),footL=bone("foot-L",shinL,0,-.4,0);
  const thighR=bone("thigh-R",hip,-.10,-.015,0),shinR=bone("shin-R",thighR,0,-.4,0),footR=bone("foot-R",shinR,0,-.4,0);
  const add=(geometry,boneIndex,tint,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{
    const geo=geometry.index?geometry.toNonIndexed():geometry;geo.scale(sx,sy,sz);geo.rotateX(rx);geo.rotateY(ry);geo.rotateZ(rz);geo.translate(x,y,z);
    const count=geo.attributes.position.count,colors=[],indices=[],weights=[],c=tint?.isColor?tint:new THREE.Color(tint);
    for(let i=0;i<count;i++){colors.push(c.r,c.g,c.b);indices.push(boneIndex,0,0,0);weights.push(1,0,0,0);}
    geo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));geo.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(indices,4));geo.setAttribute("skinWeight",new THREE.Float32BufferAttribute(weights,4));geometries.push(geo);
  };
  const box=(b,c,x,y,z,w,h,d,rz=0)=>add(new THREE.BoxGeometry(w,h,d),b,c,x,y,z,1,1,1,0,0,rz);
  const capsule=(b,c,x,y,z,r,h,sx=1,sz=1)=>add(new THREE.CapsuleGeometry(r,Math.max(.001,h-2*r),3,8),b,c,x,y,z,sx,1,sz);
  const taper=(b,c,x,y,z,top,bottom,h,sx=1,sz=1)=>add(new THREE.CylinderGeometry(top,bottom,h,10),b,c,x,y,z,sx,1,sz);
  // Garment silhouette, collar, articulated sleeves, trouser taper and structured footwear.
  taper(spine,palette,0,1.13,0,.175,.16,.43,1.0,.60);
  capsule(hip,trouser,0,.916,0,.13,.16,1.25,.70);
  box(spine,0xe7e4d7,0,1.315,.06,.09,.11,.06);
  box(spine,palette.clone().multiplyScalar(.82),-.066,1.282,.102,.037,.17,.013,-.23);
  box(spine,palette.clone().multiplyScalar(1.1),.066,1.282,.102,.037,.17,.013,.23);
  box(spine,palette.clone().multiplyScalar(.86),.095,1.17,.107,.056,.06,.014);
  box(spine,0xede8d7,0,1.038,.101,.012,.015,.007);
  box(spine,0xede8d7,0,1.113,.103,.012,.015,.007);
  box(hip,0x4b463b,0,.931,.093,.23,.022,.026);
  box(hip,0xb2a17f,0,.931,.108,.035,.028,.012);
  capsule(neck,skin,0,1.411,0,.036,.11);
  capsule(head,skin,0,1.559,.005,.10,.225,.83,.88);
  // Hair: a cropped cap with temples, crown and asymmetrical fringe.
  add(new THREE.SphereGeometry(.105,12,8,0,TAU,0,Math.PI*.55),head,hairColor,0,1.585,-.009,.88,.95,.91);
  capsule(head,hairColor,seed%2?.075:-.075,1.554,-.016,.023,.12,.55,1.6);
  add(new THREE.SphereGeometry(.09,10,6,0,Math.PI,0,Math.PI*.46),head,hairColor,-.012,1.615,.026,.93,.61,.78,0,.4);
  // Tiny ears and nose establish direction without pretending to reconstruct a real face.
  for(const s of [-1,1])capsule(head,skin,s*.083,1.558,.002,.018,.04,.6,.8);
  capsule(head,skin,0,1.557,.084,.018,.039,.58,.84);
  if(seed%4===1){
    for(const s of [-1,1])box(head,0x554f42,s*.043,1.578,.087,.064,.027,.012);
    box(head,0x554f42,0,1.579,.092,.025,.006,.009);
  }
  for(const [s,upper,lower,hand,thigh,shin,foot] of [[1,upperL,lowerL,handL,thighL,shinL,footL],[-1,upperR,lowerR,handR,thighR,shinR,footR]]){
    const x=s*.23;
    capsule(upper,palette,x,1.178,0,.061,.30,.92,.89);
    capsule(upper,palette,s*.205,1.296,0,.069,.14,1.06,.9);
    capsule(lower,palette.clone().multiplyScalar(.96),x,.918,.006,.05,.25,.95,.95);
    taper(lower,0xe1ded1,x,.825,.006,.051,.049,.043,1,.96);
    capsule(hand,skin,x,.775,.015,.042,.097,.75,.75);
    taper(thigh,trouser,s*.1,.69,0,.082,.067,.40,.87,.91);
    taper(shin,trouser,s*.1,.29,.008,.067,.044,.4,.87,.94);
    capsule(foot,0xe5e2d8,s*.1,.062,.051,.045,.085,.98,1.96);
    box(foot,0xdddacf,s*.1,.031,.059,.091,.027,.173);
    box(foot,0x647168,s*.1,.084,.055,.09,.015,.067);
  }
  // Lanyard and NFC badge belong to the character; they remain readable in interaction shots.
  for(const s of [-1,1])box(spine,0x303e37,s*.04,1.234,.116,.013,.18,.008,-s*.23);
  box(spine,0xe8e3d3,0,1.12,.124,.102,.126,.016);
  box(spine,0x477d70,0,1.166,.134,.09,.025,.004);
  box(spine,0xa6b8a5,-.022,1.115,.135,.029,.041,.004);
  box(spine,0x556257,.019,1.126,.135,.034,.007,.004);
  box(spine,0x87907e,.019,1.11,.135,.034,.005,.004);
  // Smart watch and an occasional event tote give distant figures distinct functional silhouettes.
  box(lowerL,0x3f4b44,.23,.87,.04,.065,.035,.039);
  if(seed%3===0){
    box(upperL,0xc3ac83,.287,1.002,-.002,.075,.32,.25);
    box(upperL,0x8c8168,.285,1.18,-.075,.026,.18,.022);
    box(upperL,0x8c8168,.285,1.18,.075,.026,.18,.022);
    box(upperL,0x587966,.329,1.02,.08,.008,.07,.10);
  }
  const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.84,metalness:0});
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=`avatar-${name}`;mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
  root.add(mesh);root.userData.isCharacter=true;root.userData.personName=name;
  const phase=rng()*TAU;let walkBlend=0,talkBlend=0,waveBlend=0;
  return {
    root,mesh,bones,height:1.70,
    update(dt,time,state="idle"){
      const s=typeof state==="string"?state:state?.action||state?.state||"idle";
      const walking=["walking","walk"].includes(s),talking=["talking","talk","meeting"].includes(s),waving=["wave","arriving","greeting"].includes(s);
      const ease=1-Math.exp(-Math.min(dt,.1)*8);
      walkBlend+=(Number(walking)-walkBlend)*ease;talkBlend+=(Number(talking)-talkBlend)*ease;waveBlend+=(Number(waving)-waveBlend)*ease;
      const step=time*6.3+phase,swing=Math.sin(step)*.60*walkBlend;
      bones[hip].position.y=.9-.065*walkBlend+Math.sin(step*2)*.007*walkBlend;
      bones[spine].rotation.y=Math.sin(step)*.045*walkBlend+Math.sin(time*.7+phase)*.012;
      // Two-link inverse kinematics keeps the stance foot on y=0 and lifts only the swing foot.
      // The foot travels backwards during stance as the parent root moves forwards.
      for(const [phaseOffset,thigh,shin,foot] of [[0,thighL,shinL,footL],[Math.PI,thighR,shinR,footR]]){
        const gait=step+phaseOffset,footZ=Math.sin(gait)*.31,footY=.085+Math.max(0,Math.cos(gait))*.16;
        const dy=footY-(bones[hip].position.y-.015),distance=Math.min(.799,Math.sqrt(dy*dy+footZ*footZ));
        const a=Math.acos(distance/.8),aim=Math.atan2(-footZ,-dy);
        bones[thigh].rotation.x=(aim-a)*walkBlend;
        bones[shin].rotation.x=2*a*walkBlend;
        bones[foot].rotation.x=-(aim+a)*walkBlend;
      }
      bones[upperL].rotation.x=-swing*.65; bones[upperR].rotation.x=swing*.65-talkBlend*.3;
      bones[upperL].rotation.z=.04; bones[upperR].rotation.z=-.04-talkBlend*.15-waveBlend*1.8;
      bones[lowerL].rotation.x=-.07; bones[lowerR].rotation.x=-.07-talkBlend*(.65+Math.sin(time*2.8+phase)*.18)-waveBlend*.8;
      bones[handR].rotation.z=Math.sin(time*7)*waveBlend*.33;
      bones[head].rotation.y=Math.sin(time*.58+phase)*.09+(talkBlend*Math.sin(time*1.6+phase)*.1);
      bones[head].rotation.x=Math.sin(time*1.7+phase)*.018*talkBlend;
    },
    dispose(){geometry.dispose();material.dispose();mesh.skeleton.dispose();root.clear();},
  };
}
const TAU=Math.PI*2;
