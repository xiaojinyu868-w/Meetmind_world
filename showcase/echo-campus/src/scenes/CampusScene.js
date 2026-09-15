import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { SceneKit, roundedPlan, crescentPlan, horizontal, makeMaterials, random, addSign, disposeRoot } from "./SceneKit.js";

const TAU=Math.PI*2;

function arcBand(kit,material,inner,outer,start,end,y,h,z=-2) {
  kit.add(horizontal(crescentPlan(inner,outer,start,end,Math.max(4,Math.ceil((end-start)*20))),h,.025),material,0,y,z);
}
function arcRail(kit,r,start,end,y,z=-2) {
  const points=[];for(let i=0;i<=84;i++){const a=start+(end-start)*i/84;points.push(new THREE.Vector3(Math.sin(a)*r,y,-Math.cos(a)*r+z));}
  kit.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),84,.024,5,false),"bronze");
}
function treeFactory(kit,leafData,rng,quality) {
  function leaves(cx,cy,cz,s,count,tone){
    // Irregular leaf-cluster cores join branch tips into a continuous asymmetric crown.
    // Fine individual leaves break the edge; the tree never relies on one spherical blob.
    const cluster=new THREE.IcosahedronGeometry(1,1),pos=cluster.attributes.position,vertexColors=[];
    for(let v=0;v<pos.count;v++){
      const x=pos.getX(v),y=pos.getY(v),z=pos.getZ(v);
      const scale=.78+.10*Math.sin(x*9+z*11)+.09*Math.cos(y*13+x*7);
      pos.setXYZ(v,x*scale*s*.76,y*scale*s*.55,z*scale*s*.76);
      const c=new THREE.Color(tone).multiplyScalar(.79+.08*(y+1));vertexColors.push(c.r,c.g,c.b);
    }
    cluster.computeVertexNormals();
    const normal=cluster.attributes.normal;
    for(let v=0;v<pos.count;v++){
      const n=new THREE.Vector3(pos.getX(v),pos.getY(v)/.55,pos.getZ(v)).normalize();normal.setXYZ(v,n.x,n.y,n.z);
    }
    cluster.setAttribute("color",new THREE.Float32BufferAttribute(vertexColors,3));
    kit.add(cluster,"crown",cx,cy,cz);
    for(let k=0;k<count;k++){
      const az=rng()*TAU, u=rng()*2-1, radius=Math.cbrt(rng());
      const span=Math.sqrt(1-u*u)*radius*s;
      leafData.push({x:cx+Math.cos(az)*span,y:cy+u*radius*s*.55,z:cz+Math.sin(az)*span,
        rx:(rng()-.5)*2.2,ry:rng()*TAU,rz:(rng()-.5)*1.5,s:.65+rng()*.8,color:new THREE.Color(tone).multiplyScalar(.8+rng()*.4)});
    }
  }
  return (x,z,height=5.5,spread=2.8,tone=0x6f8158,base=0)=>{
    const bx=x+(rng()-.5)*.25,bz=z+(rng()-.5)*.25;
    kit.beam("bark",[x,base,z],[bx,base+height*.58,bz],.075,.16,8);
    for(let j=0;j<9;j++){
      const a=j*2.399+ rng()*.4,len=spread*(.5+rng()*.5),cy=base+height*(.58+rng()*.22);
      const px=bx+Math.cos(a)*len,pz=bz+Math.sin(a)*len;
      kit.beam("bark",[bx,base+height*(.4+rng()*.2),bz],[px,cy,pz],.015,.066,6);
      for(let t=0;t<3;t++){
        const ang=a+(t-1)*.8,tx=px+Math.cos(ang)*spread*.29,tz=pz+Math.sin(ang)*spread*.29,ty=cy+.25+rng()*.55;
        kit.beam("bark",[px,cy,pz],[tx,ty,tz],.008,.021,5);
        leaves(tx,ty,tz,spread*.42,quality==="low"?13:23,tone);
      }
    }
    for(let j=0;j<4;j++){const a=j*1.57;kit.beam("bark",[x,base+.1,z],[x+Math.cos(a)*.43,base+.015,z+Math.sin(a)*.43],.027,.075,6);}
  };
}
function leafGeometry(){
  const g=new THREE.BufferGeometry();
  const p=[0,0,-.2,-.08,.018,-.06,0,.026,.22, -.08,.018,-.06,-.07,.02,.085,0,.026,.22,
    0,0,-.2,0,.026,.22,.08,.018,-.06, .08,.018,-.06,0,.026,.22,.07,.02,.085];
  g.setAttribute("position",new THREE.Float32BufferAttribute(p,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(new Array(p.length/3*2).fill(0),2));g.computeVertexNormals();return g;
}
function addFoliage(root,material,data){
  const foliage=new THREE.InstancedMesh(leafGeometry(),material,data.length),dummy=new THREE.Object3D();
  data.forEach((d,i)=>{dummy.position.set(d.x,d.y,d.z);dummy.rotation.set(d.rx,d.ry,d.rz);dummy.scale.setScalar(d.s);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);foliage.setColorAt(i,d.color);});
  foliage.name="olive-ginkgo-leaf-canopies";foliage.castShadow=true;foliage.receiveShadow=true;foliage.instanceMatrix.needsUpdate=true;foliage.computeBoundingSphere();root.add(foliage);
  return foliage;
}
function grassPatch(kit,blades,rng,x,z,w,d,base=0){
  kit.slab("soil",x,base+.016,z,w,.025,d,.55);
  const count=Math.min(900,Math.floor(w*d*18));
  for(let i=0;i<count;i++)blades.push({x:x+(rng()-.5)*(w-.3),y:base+.05,z:z+(rng()-.5)*(d-.3),h:.13+rng()*.37,r:rng()*TAU});
}
function addGrasses(root,blades){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute([-.028,0,0, .028,0,0, .012,.65,.1, -.02,0,.012,.028,0,-.012,-.04,.55,-.02],3));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:0x8d9463,roughness:1,side:THREE.DoubleSide});
  const mesh=new THREE.InstancedMesh(geometry,material,blades.length),d=new THREE.Object3D(),rng=random(52);
  blades.forEach((v,i)=>{d.position.set(v.x,v.y,v.z);d.rotation.y=v.r;d.scale.set(.65+v.h, v.h*2, .65+v.h);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);mesh.setColorAt(i,new THREE.Color().setHSL(.19+rng()*.04,.18+rng()*.1,.29+rng()*.12));});
  mesh.name="ornamental-grasses";mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
}
function bench(kit,x,z,yaw=0){
  const p=(dx,dy,dz)=>[x+dx*Math.cos(yaw)+dz*Math.sin(yaw),dy,z-dx*Math.sin(yaw)+dz*Math.cos(yaw)];
  for(let i=0;i<6;i++)kit.box("wood",...p(0,.46,(i-2.5)*.105),2.8,.075,.08,yaw);
  for(const side of [-1,1])kit.box("bronze",...p(side*1.05,.22,0),.065,.42,.45,yaw);
}
function cafeTable(kit,x,y,z,r=.65){
  kit.cylinder("stone",x,y+.77,z,r,r,.055,24);kit.cylinder("bronze",x,y+.39,z,.045,.065,.73,8);kit.cylinder("bronze",x,y+.025,z,.27,.30,.05,16);
  for(let i=0;i<3;i++){
    const a=i*TAU/3,dx=Math.sin(a)*1.08,dz=Math.cos(a)*1.08;
    kit.cylinder("seat",x+dx,y+.45,z+dz,.24,.24,.08,12);
    for(const sx of [-.13,.13])kit.box("bronze",x+dx+sx,y+.23,z+dz,.025,.43,.025);
    kit.box("bronze",x+dx,y+.63,z+dz+.2,.035,.44,.025);
    kit.box("wood",x+dx,y+.74,z+dz+.2,.42,.18,.045);
  }
}

function mainBuilding(kit,plants,tree,rng){
  const levels=6,fh=3.12,start=-2.05,end=2.05;
  for(let floor=0;floor<=levels;floor++){
    const y=floor*fh, setback=Math.max(0,floor-2)*.19;
    const inside=16.25+setback, outside=24.0-setback;
    const a0=start+floor*.012,a1=end-floor*.012;
    arcBand(kit,"white",inside,outside,a0,a1,y,.27);
    if(floor===levels){arcBand(kit,"grass",inside+.65,outside-.75,a0+.025,a1-.025,y+.3,.045);break;}
    // A dark recess and warm timber soffit make the floorplates read as a buildable facade.
    arcBand(kit,"wood",inside+.15,outside-.2,a0,a1,y+fh-.085,.075);
    arcBand(kit,"bronze",inside+.045,inside+.09,a0,a1,y+.33,.055);
    const glassR=inside+1.55,backR=outside-.9,segments=52;
    for(let bay=0;bay<segments;bay++){
      const a=a0+(a1-a0)*(bay+.5)/segments, da=(a1-a0)/segments;
      const width=2*glassR*Math.sin(da/2)-.035;
      const x=Math.sin(a)*glassR,z=-Math.cos(a)*glassR-2;
      kit.box("glass",x,y+1.59,z,width,2.52,.038,-a);
      kit.box("bronze",x,y+1.59,z,.043,2.58,.065,-a);
      const bx=Math.sin(a)*backR,bz=-Math.cos(a)*backR-2;
      kit.box("backGlass",bx,y+1.6,bz,2*backR*Math.sin(da/2),2.57,.055,-a);
      if(bay%2===0){
        // Slender vertical fins catch sun beyond the glazing; each is a structural rhythm.
        kit.box("white",Math.sin(a)*(glassR-.14),y+1.64,-Math.cos(a)*(glassR-.14)-2,.095,2.7,.29,-a);
        kit.box("bronze",Math.sin(a)*(outside-.83),y+1.65,-Math.cos(a)*(outside-.83)-2,.065,2.7,.18,-a);
      }
      if(bay%4===0){
        const r=glassR+1.9;
        kit.box("wood",Math.sin(a)*r,y+.80,-Math.cos(a)*r-2,1.8,.06,.9,-a);
        for(const dx of [-.7,.7])kit.box("bronze",Math.sin(a)*r+Math.cos(a)*dx,y+.41,-Math.cos(a)*r-2+Math.sin(a)*dx,.035,.75,.65,-a);
        kit.box("linen",Math.sin(a)*(r+.95),y+.54,-Math.cos(a)*(r+.95)-2,.54,.12,.52,-a);
      }
      if(bay%8===2){
        const r=glassR+2.5;
        kit.box("warmLight",Math.sin(a)*r,y+2.79,-Math.cos(a)*r-2,1.8,.035,.22,-a);
      }
    }
    // Glazed ends and thin parapet rails close the open ends without a bulky box cap.
    for(const a of [a0,a1]){
      const r=(inside+outside)/2;kit.box("glass",Math.sin(a)*r,y+1.58,-Math.cos(a)*r-2,.045,2.52,outside-inside-1.25,-a);
      kit.box("white",Math.sin(a)*r,y+1.65,-Math.cos(a)*r-2,.15,2.65,.15,-a);
    }
    arcRail(kit,inside+.15,a0,a1,y+1.16);
    if(floor>0){
      // Inset ribbon planting: deliberate interruptions preserve the facade's clean horizontal silhouette.
      for(let segment=0;segment<7;segment++){
        const mid=a0+.28+segment*(a1-a0-.56)/6;
        arcBand(kit,"white",inside+.28,inside+.8,mid-.085,mid+.085,y+.3,.32);
        arcBand(kit,"soil",inside+.33,inside+.75,mid-.08,mid+.08,y+.64,.015);
        for(let j=0;j<32;j++){
          const a=mid+(rng()-.5)*.15,r=inside+.52+(rng()-.5)*.35;
          plants.push({x:Math.sin(a)*r,y:y+.7,z:-Math.cos(a)*r-2,h:.1+rng()*.18,r:rng()*TAU});
        }
      }
    }
  }
  // Ground floor colonnade and a clear central doorway at the end of the bridge.
  for(let j=0;j<=18;j++){
    const a=start+(end-start)*j/18,r=16.75;
    kit.cylinder("white",Math.sin(a)*r,1.5,-Math.cos(a)*r-2,.11,.14,3.0,12);
  }
  kit.slab("stone",0,.01,-15.8,6.4,.05,5.0,.6);
  kit.box("bronze",0,1.6,-19.78,4.8,2.7,.12);
  kit.box("glass",0,1.58,-19.67,4.63,2.58,.035);
  for(const x of [-.65,.65])kit.box("bronze",x,1.28,-19.58,.045,.76,.07);
  addSign(kit,{text:"ECHO CAMPUS",subtitle:"A PLACE FOR NEW CONNECTIONS",x:0,y:2.27,z:-18.55,width:4.2,height:.77});
  // Roof garden has visible ornamental trees, rather than an empty cap.
  for(const a of [-1.5,-.55,.35,1.3]){
    const r=20.1; tree(Math.sin(a)*r,-Math.cos(a)*r-2,2.5,1.15,0x839265,19.06);
  }
}
function pavilion(kit){
  // Lower west pavilion: curved corners, generous eaves, warm timber ceiling and visible cafe furniture.
  const x=-24,z=17,w=14,d=10;
  kit.slab("stone",x,-.03,z,w+1,.12,d+1,1.4);
  kit.slab("white",x,3.7,z,w+1.8,.3,d+1.6,1.7);
  kit.slab("wood",x,3.62,z,w+1.6,.08,d+1.4,1.7);
  kit.slab("white",x,7.25,z-1,11,.26,8.5,1.4);
  kit.slab("wood",x,7.17,z-1,10.8,.08,8.3,1.4);
  kit.slab("grass",x,7.56,z-1,9.4,.04,6.9,1.0);
  for(const dx of [-5.9,0,5.9])for(const dz of [-3.7,3.7])kit.cylinder("white",x+dx,1.82,z+dz,.11,.13,3.6,12);
  kit.box("glass",x,1.8,z+3.4,w-1,3.1,.045);
  kit.box("glass",x-6.2,1.8,z,.045,3.1,6.8);
  kit.box("glass",x,5.41,z+1.8,9.4,2.83,.045);
  kit.box("backGlass",x,5.42,z-4.2,9.4,2.84,.07);
  for(let j=-5;j<=5;j+=1.25){kit.box("bronze",x+j,1.78,z+3.44,.045,3.15,.065);}
  for(let j=-4;j<=4;j+=1.33)kit.box("white",x+j,5.46,z+1.82,.07,2.86,.2);
  kit.box("plaster",x,1.8,z-3.5,w-1,3.5,.15);
  for(const dx of [-4.1,0,4.1])cafeTable(kit,x+dx,0,z+1.3,.7);
  kit.box("wood",x-1,1.0,z-2.65,9.5,.95,.95);
  kit.box("stone",x-1,1.5,z-2.65,9.7,.08,1.04);
  for(const dx of [-4.2,-2.7,-1.2,.3,1.8])kit.cylinder("bronze",x+dx,.8,z-1.6,.025,.055,1.5,8);
  addSign(kit,{text:"THE COMMON ROOM",subtitle:"COFFEE  /  IDEAS  /  PEOPLE",x,y:2.5,z:z+3.55,width:4.4,height:.8,background:"#9c8360"});
}

function plaza(kit,root,plants,tree,rng,quality){
  kit.slab("grass",0,-.42,0,100,.32,95,13);
  const outer=roundedPlan(69,64,6.8),hole=roundedPlan(25,22,5.0);
  const path=new THREE.Path(hole.getPoints(64));outer.holes.push(path);
  kit.add(horizontal(outer,.10,.012),"paving",0,-.11,0);
  // Pool is inset flush with paving, with an uninterrupted bridge from forecourt to lobby.
  kit.slab("waterBed",0,-.08,0,25,.035,22,5.0);
  kit.slab("stone",0,-.055,4,4.35,.075,39.0,.25);
  for(const x of [-2.13,2.13])kit.box("bronze",x,-.012,1,.035,.025,28);
  for(let z=-13;z<=19;z+=1.2)kit.box("stone",0,.024,z,4.25,.008,.015);
  // Pool coping breaks the broad surface into human-scaled stone courses.
  const ring=roundedPlan(25.65,22.65,5.3);ring.holes.push(new THREE.Path(roundedPlan(25,22,5.0).getPoints(64)));
  kit.add(horizontal(ring,.065,.01),"stone",0,-.03,0);
  let water;
  if(quality!=="low"){
    const geometry=new THREE.ShapeGeometry(roundedPlan(24.98,21.98,4.99),64);
    water=new Reflector(geometry,{clipBias:.003,textureWidth:768,textureHeight:768,color:0xa1b4ae,multisample:0});
    water.rotation.x=-Math.PI/2;water.position.y=-.013;water.name="reflecting-courtyard-water";
    water.material.uniforms.uTime={value:0};
    water.material.fragmentShader=water.material.fragmentShader.replace("uniform vec3 color;","uniform vec3 color; uniform float uTime;").replace("vec4 base = texture2DProj( tDiffuse, vUv );","vec4 q = vUv; q.x += (sin(vUv.y * 72.0 + uTime * .42) + sin(vUv.x * 49.0 - uTime * .3)) * .00072 * q.w; vec4 base = texture2DProj( tDiffuse, q );");
    root.add(water);
  }else{
    water=new THREE.Mesh(new THREE.ShapeGeometry(roundedPlan(24.98,21.98,4.99),64),new THREE.MeshPhysicalMaterial({color:0x648a83,metalness:.36,roughness:.19,clearcoat:1}));water.rotation.x=-Math.PI/2;water.position.y=-.013;root.add(water);
  }
  // A forecourt with planted beds, long timber benches and crisp limestone thresholds.
  for(const side of [-1,1]){
    grassPatch(kit,plants,rng,side*11,22,10.0,7.0);
    for(const [ox,oz,h,s] of [[-2.8,-1.6,5.1,2.0],[2.1,1.5,6.2,2.4]])tree(side*11+ox,22+oz,h,s,side<0?0x798554:0x829266);
    bench(kit,side*7.0,17.2,0);
    bench(kit,side*16.9,21.4,Math.PI/2);
    for(let j=0;j<5;j++)kit.box("stone",side*6.0,.001,23+j*1.45,1.5,.055,1.1);
  }
  for(const [x,z,w,d] of [[-28,-16,8,16],[28,-15,8,17],[-27,26,9,5],[26,23,9,11],[-14,-30,13,5],[13,-30,12,5]]){
    grassPatch(kit,plants,rng,x,z,w,d);
    for(let j=0;j<4;j++)tree(x+(rng()-.5)*(w-2),z+(rng()-.5)*(d-2),4.2+rng()*3,1.7+rng()*.9,0x758458);
  }
  // Reeds nestle in small stones along the water's edges.
  for(const side of [-1,1]){
    grassPatch(kit,plants,rng,side*13.8,0,1.4,16);
    for(let j=0;j<12;j++){
      const x=side*(13.8+(rng()-.5)*.8),z=-7.5+j*1.3;
      const rock=new THREE.IcosahedronGeometry(.24+rng()*.15,1);kit.add(rock,"stone",x,.13,z,0,rng()*TAU,0,[1.4,.65,1]);
    }
  }
  // Quiet east-side meeting circle, furnished and directly accessible from the arrival plaza.
  kit.cylinder("stone",22,-.04,14,5.6,5.6,.11,72);
  kit.cylinder("wood",22,.74,14,1.85,1.85,.08,48);kit.cylinder("bronze",22,.36,14,.48,.64,.7,24);
  for(let j=0;j<8;j++){
    const a=j*TAU/8,x=22+Math.sin(a)*2.7,z=14+Math.cos(a)*2.7;
    kit.cylinder("linen",x,.44,z,.4,.35,.12,20);
    kit.cylinder("bronze",x,.20,z,.05,.10,.38,8);
    kit.box("wood",x,.70,z,.64,.38,.07,-a);
  }
  // A cantilevered canopy has posts, beams, slatted shading and no floating pieces.
  kit.slab("white",22,4.0,14,12.6,.2,10.8,1.4);
  kit.slab("wood",22,3.93,14,12.4,.07,10.6,1.35);
  for(const dx of [-5.1,5.1])for(const dz of [-4.1,4.1])kit.cylinder("bronze",22+dx,1.98,14+dz,.055,.09,3.96,10);
  for(let i=-5;i<=5;i++)kit.box("wood",22+i,4.25,14,.11,.28,9.5);
  addSign(kit,{text:"THE CONVERSATION GARDEN",x:22,y:3.08,z:19.45,width:5.3,height:.6,background:"#687964"});
  // NFC welcome plinth uses the same bronze/stone language as the architecture.
  kit.slab("stone",3.65,0,21.0,.76,1.10,.64,.10);
  kit.box("accent",3.65,1.16,21.0,.58,.045,.44);
  addSign(kit,{text:"TAP TO ENTER",subtitle:"NFC  /  ECHO CAMPUS",x:3.65,y:.75,z:21.326,width:.59,height:.29});
  for(const x of [-4.1,4.1]){
    kit.box("bronze",x,.6,28,.06,1.2,.06);
    kit.box("warmLight",x,1.19,28,.095,.065,.095);
  }
  // Perimeter meadow/tree silhouettes prevent the project from reading as an object on a disk.
  for(let j=0;j<30;j++){
    const a=j*TAU/30,r=41+rng()*8;
    tree(Math.sin(a)*r,Math.cos(a)*r,5+rng()*4,2.7+rng()*1.4,j%4===0?0x9b9d64:0x74816a);
  }
  return water;
}

export async function createCampusScene({renderer,quality="high"}={}){
  const root=new THREE.Group();root.name="Echo Campus / Whitewater Courtyard";
  const materials=makeMaterials(),kit=new SceneKit(root,materials),rng=random(868),leaves=[],plants=[];
  const tree=treeFactory(kit,leaves,rng,quality);
  mainBuilding(kit,plants,tree,rng);pavilion(kit);
  const water=plaza(kit,root,plants,tree,rng,quality);
  kit.flush();addFoliage(root,materials.leaf,leaves);addGrasses(root,plants);
  const colliders=[{x:22,z:14,r:1.95},{x:3.65,z:21,r:.5}];
  for(let j=0;j<=18;j++){const a=-2.05+4.1*j/18;colliders.push({x:Math.sin(a)*20.2,z:-Math.cos(a)*20.2-2,r:3.0});}
  colliders.push({x:-24,z:17,r:5.8});
  const people=[
    [-3.2,23.4,.5],[2,26.5,-.6],[5,18.1,-1.4],[-5,15.8,1],[-5.8,12.9,2],
    [6.1,13.8,-1.2],[7.6,15.4,2.4],[-8.7,17.1,1.5],[0,10.5,3.14],[.8,4.2,3.14],
    [-.8,-8.4,0],[0,-15.5,1],[-16.0,7.2,.8],[-17.5,9.2,-.3],[-18.3,15.6,1.4],
    [17.0,15.3,-.8],[19.2,13.7,2.5],[25.0,14.2,-1.5],[28.3,8.2,-1.3],[15.7,4.9,.4],
    [26.2,1.7,2.5],[-14.7,-8.6,-.1],[14.2,-6.3,1],[-.6,19.2,Math.PI],
  ].map(([x,z,yaw])=>({x,y:0,z,yaw}));
  return {
    root,bounds:{minX:-32,maxX:32,minZ:-29,maxZ:31},spawn:{x:0,y:0,z:25.5},
    anchors:{arrival:{x:3.65,y:0,z:22.3},meeting:{x:22,y:0,z:20.6},people},
    cameras:{
      hero:{position:[32,23,57],target:[0,6.5,-1.5],fov:42},
      arrival:{position:[14,8,36],target:[0,4.3,-2],fov:43},
      garden:{position:[7,5.6,20],target:[0,4.5,-9],fov:54},
      aerial:{position:[41,60,40],target:[0,1,-1],fov:45},
      lobby:{position:[0,2.7,13],target:[0,5.0,-17],fov:51},
    },colliders,
    isWalkable(x,z){
      const dx=Math.max(Math.abs(x)-7.5,0),dz=Math.max(Math.abs(z)-6,0);
      const inWater=Math.abs(x)<12.5&&Math.abs(z)<11&&dx*dx+dz*dz<25;
      return !inWater||Math.abs(x)<=2.17;
    },
    update(dt,time){if(water.material.uniforms?.uTime)water.material.uniforms.uTime.value=time;},
    dispose(){if(water.isReflector)water.dispose();disposeRoot(root);},
  };
}

export async function createGalleryScene({renderer,quality="high"}={}){
  const root=new THREE.Group();root.name="Echo Campus / Water Gallery";
  const materials=makeMaterials(),kit=new SceneKit(root,materials),rng=random(531),leaves=[],plants=[];
  const tree=treeFactory(kit,leaves,rng,quality);
  kit.slab("grass",0,-.43,0,100,.33,95,13);
  const galleryGround=roundedPlan(65,58,3.0),galleryHole=roundedPlan(34,21,.6);
  const holePoints=galleryHole.getPoints(48).map(p=>new THREE.Vector2(p.x,p.y-1.4));
  galleryGround.holes.push(new THREE.Path(holePoints));
  kit.add(horizontal(galleryGround,.08,.012),"paving",0,-.10,0);
  // A pair of long, low galleries form an asymmetric L around a reflecting basin.
  // Floor, canopy, structural columns and glazing are authored independently of Whitewater Courtyard.
  function wing(x,z,w,d,levels=2){
    for(let f=0;f<=levels;f++){
      const y=f*3.3,upperInset=f===levels?1.0:0;
      kit.slab("white",x,y,z,w+1.7-upperInset,.28,d+1.7-upperInset,.65);
      if(f===levels){kit.slab("grass",x,y+.31,z,w-1.4,.035,d-1.4,.5);break;}
      kit.slab("wood",x,y+3.22,z,w+1.55,.08,d+1.55,.64);
      kit.box("plaster",x,y+1.7,z-d/2+.4,w-.5,2.95,.16);
      kit.box("glass",x,y+1.69,z+d/2-.9,w-.35,2.73,.045);
      for(let bx=-w/2+.7;bx<w/2;bx+=1.55){
        kit.box("bronze",x+bx,y+1.69,z+d/2-.86,.045,2.76,.07);
        if(Math.abs(bx)>3)kit.box("white",x+bx,y+1.69,z+d/2-.65,.10,2.78,.32);
      }
      for(const sx of [-1,1])kit.box("glass",x+sx*(w/2-.2),y+1.68,z,.042,2.76,d-1.6);
      for(const bx of [-w/2+.55,w/2-.55])for(const bz of [-d/2+.55,d/2-.55])kit.cylinder("white",x+bx,y+1.7,z+bz,.085,.12,3.12,12);
      for(let dx=-w/2+3;dx<w/2-1;dx+=5){
        kit.box("stone",x+dx,y+.43,z+1.1,2.5,.86,.85);
        kit.box("bronze",x+dx,y+.94,z+1.1,.018,.25,.018);
        kit.add(new THREE.TorusKnotGeometry(.3,.065,48,6),"bronze",x+dx,y+1.28,z+1.1,0,.3,0,[1,.8,1]);
        kit.box("warmLight",x+dx,y+3.15,z,.85,.045,.08);
      }
      if(f>0){for(let dx=-w/2+1;dx<w/2;dx+=3)kit.box("bronze",x+dx,y+.63,z+d/2+.55,.035,.72,.035);kit.box("bronze",x,y+.99,z+d/2+.55,w-.8,.035,.035);}
    }
  }
  wing(0,-16,41,8.0,2);
  wing(-25,-2,9,21,1);
  wing(24,-8,8,14,1);
  // A roof terrace overlooking the basin has low planting and a small sculptural grove.
  for(const x of [-14,-6,7,15])tree(x,-16,2.35,1.15,0x83906a,6.92);
  for(const z of [-7,0,5])tree(-25,z,2.1,1.0,0x889367,3.6);
  addSign(kit,{text:"ECHO WATER GALLERY",subtitle:"ART  /  TECHNOLOGY  /  ENCOUNTERS",x:0,y:2.45,z:-12.72,width:6,height:1.03});
  kit.slab("waterBed",0,-.028,1.4,34,.01,21,.6);
  const edge=roundedPlan(34.5,21.5,.8);edge.holes.push(new THREE.Path(roundedPlan(34,21,.6).getPoints(32)));
  kit.add(horizontal(edge,.035,.01),"stone",0,-.008,1.4);
  // The landing walkway and two transverse routes link directly to the glazed gallery doors.
  kit.slab("stone",0,-.018,4,3.0,.042,35,.15);
  kit.slab("stone",0,-.016,-8.0,38,.042,2.8,.15);
  let water;
  if(quality!=="low"){
    water=new Reflector(new THREE.ShapeGeometry(roundedPlan(33.95,20.95,.58),32),{clipBias:.003,textureWidth:768,textureHeight:768,color:0xa5b6ac,multisample:0});
  }else water=new THREE.Mesh(new THREE.ShapeGeometry(roundedPlan(33.95,20.95,.58),32),new THREE.MeshPhysicalMaterial({color:0x668d86,roughness:.20,metalness:.4}));
  water.rotation.x=-Math.PI/2;water.position.set(0,-.012,1.4);water.name="gallery-reflecting-pool";root.add(water);
  for(const side of [-1,1]){
    grassPatch(kit,plants,rng,side*12,19.8,17.0,6.0);
    for(const [ox,oz,h,sp] of [[-4,-.9,4.7,1.9],[1.6,.5,5.8,2.3],[5.3,-.2,4.4,1.6]])tree(side*12+ox,19.8+oz,h,sp,0x839168);
    bench(kit,side*7.2,15.5,0);bench(kit,side*16,15.5,0);
    grassPatch(kit,plants,rng,side*20.2,2,2,18);
  }
  for(const [x,z,w,d] of [[-28,21,6,9],[28,21,6,9],[-24,-24,12,5],[18,-24,22,5]]){
    grassPatch(kit,plants,rng,x,z,w,d);
    for(let i=0;i<3;i++)tree(x+(rng()-.5)*(w-1.5),z+(rng()-.5)*(d-1.5),4.5+rng()*2,1.8+rng()*.5);
  }
  // A bronze ribbon sculpture anchors the middle-distance reflection and signals a distinct scene.
  const pts=[[-1,0,0],[-2,2,-.4],[-.8,4.8,0],[1.2,5.1,.5],[2,2.8,.1],[.4,1.5,-.4],[-1,0,0]].map(p=>new THREE.Vector3(...p));
  const sculpt=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),100,.20,10,false);
  kit.add(sculpt,"bronze",-9,0,-.7,0,-.45,0);
  kit.cylinder("stone",-9,.04,-.7,1.8,1.8,.12,36);
  // An open conversation terrace sits to the east of the basin.
  cafeTable(kit,25,0,10,.82);cafeTable(kit,25,0,15,.82);
  kit.slab("white",25,3.42,12.5,9,.21,13,.65);kit.slab("wood",25,3.36,12.5,8.8,.06,12.8,.63);
  for(const dx of [-3.7,3.7])for(const dz of [-5.8,5.8])kit.cylinder("bronze",25+dx,1.7,12.5+dz,.055,.085,3.4,8);
  kit.slab("stone",3.0,0,23.5,.74,1.10,.64,.1);kit.box("accent",3,1.16,23.5,.58,.045,.44);
  addSign(kit,{text:"TAP TO ENTER",subtitle:"NFC  /  ECHO CAMPUS",x:3,y:.75,z:23.826,width:.59,height:.29});
  for(let j=0;j<28;j++){const a=j*TAU/28,r=42+rng()*7;tree(Math.sin(a)*r,Math.cos(a)*r,5+rng()*3,2.2+rng()*1.2,0x7e8e71);}
  kit.flush();addFoliage(root,materials.leaf,leaves);addGrasses(root,plants);
  const people=[[-3,25,.7],[2,27,-.4],[4,23,-1.4],[-6,15.2,1.2],[-8,14.5,-1],[-15,15.6,.6],[8,15.1,2.4],[10,14.6,-.6],[0,11,3.14],[0,4,0],[0,-5,3.14],[-5,-8,1.5],[-11,-8,-1.3],[7,-8,.8],[14,-8,-1.5],[-21,5,2],[-22,8,.4],[21,13,1.2],[26,19.5,3.14],[29,20,-.8],[28,7.5,-1.4],[-22,15,1],[-.6,20,0],[4,15.5,-.4]].map(([x,z,yaw])=>({x,y:0,z,yaw}));
  return {root,bounds:{minX:-31,maxX:31,minZ:-27,maxZ:29},spawn:{x:0,y:0,z:26},
    anchors:{arrival:{x:3,y:0,z:24.9},meeting:{x:25,y:0,z:19.5},people},
    cameras:{hero:{position:[44,26,48],target:[0,2.7,-3],fov:43},arrival:{position:[12,6.0,33],target:[0,2,-9],fov:46},garden:{position:[30,5.4,23],target:[0,2,-7],fov:48},aerial:{position:[35,56,34],target:[0,0,-1],fov:46},lobby:{position:[0,2.2,15],target:[0,3,-13],fov:51}},
    colliders:[{x:25,z:10,r:1.15},{x:25,z:15,r:1.15},{x:-9,z:-.7,r:1.8},{x:-25,z:0,r:4.9},{x:-25,z:-8,r:4.9},{x:24,z:-8,r:5.0},...[-18,-12,-6,0,6,12,18].map(x=>({x,z:-16,r:4.2}))],
    isWalkable(x,z){
      const dx=Math.max(Math.abs(x)-16.4,0),dz=Math.max(Math.abs(z-1.4)-9.9,0);
      const inWater=Math.abs(x)<17&&Math.abs(z-1.4)<10.5&&dx*dx+dz*dz<.36;
      return !inWater||Math.abs(x)<=1.5||(z>=-9.4&&z<=-6.6);
    },
    update(){},dispose(){if(water.isReflector)water.dispose();disposeRoot(root);}};
}
