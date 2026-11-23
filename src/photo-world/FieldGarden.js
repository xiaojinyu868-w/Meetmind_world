import * as T from 'three';
import { paintSurfaces } from './PaintedMaterials.js';

export function plantField(system, field, atlas) {
  const root=system.root, palette=field.scene.parameters;
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    if(mesh.name==='GROUND_RelationshipField'||mesh.name.startsWith('FIELD_Hill_'))mesh.material.name='FieldGrass';
    if(mesh.name.startsWith('FIELD_PathStone_'))mesh.material.name='StonePath';
    if(mesh.name.startsWith('FIELD_Hill_')){mesh.scale.y*=.62;mesh.scale.x*=.86;mesh.scale.z*=.86;}
  });
  paintSurfaces(root,atlas);
  let seed=0;
  for(const c of field.person_id)seed=(seed*31+c.charCodeAt(0))>>>0;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const pos=[],col=[],tone=new T.Color(),target=new T.Color(palette.accent);
  function tri(a,b,c,color) {pos.push(...a,...b,...c);for(let j=0;j<3;j++)col.push(color.r,color.g,color.b);}
  for(let i=0;i<720;i++){
    const angle=rand()*Math.PI*2,radius=Math.sqrt(rand())*8.75,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    if((Math.abs(x)<.86&&z>-5.3)||radius<1.6)continue;
    const y=.10,h=.12+rand()*.36;
    tone.set(palette.ground).lerp(target,rand()*.52).offsetHSL(0,.12,(rand()-.35)*.14);
    for(let k=0;k<3;k++){
      const a=k*Math.PI/1.5+angle,dx=Math.cos(a),dz=Math.sin(a),width=.047+rand()*.03;
      tri([x-width*dz,y,z+width*dx],[x+width*dz,y,z-width*dx],[x+dx*h*.49,y+h,z+dz*h*.49],tone);
    }
    if(i%7===0){
      const petal=target.clone().lerp(new T.Color(0xffedd0),.55+rand()*.36);
      for(let j=0;j<5;j++){const a=j*1.256;tri([x,y+h,z],[x+.12*Math.cos(a),y+h+.072,z+.12*Math.sin(a)],[x+.095*Math.cos(a+.64),y+h+.04,z+.095*Math.sin(a+.64)],petal);}
    }
  }
  const grass=new T.BufferGeometry();
  grass.setAttribute('position',new T.Float32BufferAttribute(pos,3));grass.setAttribute('color',new T.Float32BufferAttribute(col,3));grass.computeVertexNormals();
  const meadow=new T.Mesh(grass,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1}));
  root.add(meadow);
  const bark=new T.MeshStandardMaterial({color:0x866a53,roughness:.98});
  const leaf=new T.MeshStandardMaterial({color:new T.Color(palette.ground).lerp(target,.33),roughness:.91,flatShading:true});
  for(let i=0;i<8;i++){
    const a=Math.PI*.22+i*.40,r=7.4+rand()*1.4,x=Math.cos(a)*r,z=Math.sin(a)*r,h=1.55+rand()*1.25;
    const trunk=new T.Mesh(new T.CylinderGeometry(.065,.14,h,7),bark);trunk.position.set(x,h/2+.38,z);root.add(trunk);
    for(let j=0;j<3;j++){
      const n=new T.Mesh(new T.IcosahedronGeometry(.88+rand()*.36,0),leaf);
      n.position.set(x+Math.cos(j*2.39)*.47,h+.32+j*.26,z+Math.sin(j*2.39)*.47);
      n.scale.set(.89,.69,.91);n.castShadow=true;root.add(n);
    }
  }
  const print=root.getObjectByName('FIELD_MemorySurface');
  let current=null;
  return photo=>{
    if(!photo||photo===current||!print)return;
    current=photo;
    const c=document.createElement('canvas');c.width=320;c.height=260;const ctx=c.getContext('2d');
    ctx.fillStyle='#fff1d6';ctx.fillRect(0,0,320,260);
    const scale=Math.min(296/photo.naturalWidth,232/photo.naturalHeight),w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;
    ctx.drawImage(photo,(320-w)/2,(260-h)/2,w,h);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;print.material=new T.MeshBasicMaterial({map:tex,toneMapped:false});
    print.scale.set(1.03,1.03,1);print.parent.rotation.y=2.54;
  };
}
