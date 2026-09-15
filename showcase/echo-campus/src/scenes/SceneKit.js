import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function random(seed = 17) {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}

export function roundedPlan(width, depth, radius = .35) {
  const s = new THREE.Shape(), x = -width / 2, z = -depth / 2;
  const r = Math.min(radius, width / 2, depth / 2);
  s.moveTo(x + r, z); s.lineTo(x + width - r, z);
  s.quadraticCurveTo(x + width, z, x + width, z + r);
  s.lineTo(x + width, z + depth - r); s.quadraticCurveTo(x + width, z + depth, x + width - r, z + depth);
  s.lineTo(x + r, z + depth); s.quadraticCurveTo(x, z + depth, x, z + depth - r);
  s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z);
  return s;
}

export function crescentPlan(inner, outer, start, end, segments = 100) {
  const shape = new THREE.Shape();
  const addArc = (r, from, to, first) => {
    for (let i = 0; i <= segments; i++) {
      const a = from + (to - from) * i / segments;
      const x = Math.sin(a) * r, y = Math.cos(a) * r;
      if (first && i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
  };
  addArc(outer, start, end, true); addArc(inner, end, start, false); shape.closePath();
  return shape;
}

export function horizontal(shape, height = .2, bevel = .025) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height, bevelEnabled: bevel > 0, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: 2, curveSegments: 20, steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function finishTexture(canvas, repeat, color = true) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat); texture.anisotropy = 8;
  return texture;
}

export function stoneTexture({ color = [220, 218, 207], size = 512, repeat = .3, seed = 7, lines = false } = {}) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d"), image = ctx.createImageData(size, size), rng = random(seed);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const noise = (rng() - .5) * 12 + Math.sin(x / 33 + Math.sin(y / 71)) * 1.6;
    const joint = lines && ((x % 256 < 2) || (y % 128 < 2)) ? -25 : 0;
    image.data[i] = color[0] + noise + joint; image.data[i+1] = color[1] + noise + joint;
    image.data[i+2] = color[2] + noise + joint; image.data[i+3] = 255;
  }
  ctx.putImageData(image, 0, 0); return finishTexture(canvas, repeat);
}

export function woodTexture() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d"), rng = random(64);
  ctx.fillStyle = "#a9855a"; ctx.fillRect(0,0,512,512);
  for (let i=0;i<1100;i++) {
    const y=rng()*512; ctx.strokeStyle=`rgba(${rng()>.5?"63,42,20":"217,186,134"},${.03+rng()*.13})`;
    ctx.lineWidth=.4+rng()*1.6; ctx.beginPath(); ctx.moveTo(0,y);
    ctx.bezierCurveTo(150,y+rng()*4,320,y-rng()*5,512,y+rng()*2); ctx.stroke();
  }
  for(let y=0;y<512;y+=64){ctx.fillStyle="rgba(37,31,21,.25)";ctx.fillRect(0,y,512,1);}
  return finishTexture(canvas, .35);
}

export function makeMaterials() {
  const stone = stoneTexture(), paving = stoneTexture({color:[193,195,182],lines:true,repeat:.14});
  const white = stoneTexture({color:[243,241,230],repeat:.45,seed:13});
  const grass = stoneTexture({color:[100,115,69],repeat:.1,seed:22});
  const wood = woodTexture();
  const standard = (color, roughness = .7, extra = {}) => new THREE.MeshStandardMaterial({color, roughness, ...extra});
  return {
    white: standard(0xffffff,.62,{map:white,bumpMap:white,bumpScale:.018}),
    stone: standard(0xffffff,.9,{map:stone,bumpMap:stone,bumpScale:.025}),
    paving: standard(0xffffff,.94,{map:paving,bumpMap:paving,bumpScale:.025}),
    wood: standard(0xffffff,.7,{map:wood}),
    bronze: standard(0x5c6054,.34,{metalness:.72}),
    dark: standard(0x363e36,.92),
    plaster: standard(0xdad8c9,.95),
    grass: standard(0xffffff,.98,{map:grass}),
    soil: standard(0x666047,1),
    bark: standard(0x70694f,1),
    leaf: standard(0xffffff,.93,{side:THREE.DoubleSide,vertexColors:false}),
    crown: standard(0xffffff,.96,{vertexColors:true}),
    glass: new THREE.MeshPhysicalMaterial({color:0x9badab,metalness:.15,roughness:.14,transparent:true,opacity:.33,depthWrite:false,side:THREE.DoubleSide,clearcoat:1,envMapIntensity:1.15}),
    backGlass: standard(0x4e6563,.2,{metalness:.3,envMapIntensity:1.2}),
    warmLight: standard(0xffeac8,.45,{emissive:0xffddb0,emissiveIntensity:.65}),
    accent: standard(0x397c74,.52,{metalness:.12}),
    seat: standard(0xc69c68,.8),
    linen: standard(0xe0d4b8,1),
    waterBed: standard(0x5f827f,.28,{metalness:.1}),
  };
}

// Material batching keeps the complex building and landscape at a small, stable draw-call count.
export class SceneKit {
  constructor(root, materials) { this.root=root; this.materials=materials; this.batches=new Map(); this.loose=[]; }
  add(geometry, material, x=0,y=0,z=0, rx=0,ry=0,rz=0, scale=null) {
    const g=geometry.index?geometry.toNonIndexed():geometry.clone();
    geometry.dispose();
    if(scale)g.scale(...scale);
    g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);
    const key=typeof material==="string"?material:material.uuid;
    if(!this.batches.has(key))this.batches.set(key,{material:typeof material==="string"?this.materials[material]:material,geometries:[]});
    this.batches.get(key).geometries.push(g); return g;
  }
  box(material,x,y,z,w,h,d,ry=0) { return this.add(new THREE.BoxGeometry(w,h,d),material,x,y,z,0,ry); }
  slab(material,x,y,z,w,h,d,r=.25) {return this.add(horizontal(roundedPlan(w,d,r),h,.015),material,x,y,z);}
  cylinder(material,x,y,z,rt,rb,h,n=12){return this.add(new THREE.CylinderGeometry(rt,rb,h,n),material,x,y,z);}
  beam(material,from,to,r1=.05,r2=r1,n=7) {
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a);
    const geo=new THREE.CylinderGeometry(r1,r2,d.length(),n,1,true);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));
    return this.add(geo,material,...a.add(b).multiplyScalar(.5).toArray());
  }
  flush() {
    for(const [name,b] of this.batches){
      const merged=mergeGeometries(b.geometries,false); b.geometries.forEach(g=>g.dispose());
      if(!merged)throw new Error(`Cannot merge ${name}`);
      merged.computeBoundingSphere(); const mesh=new THREE.Mesh(merged,b.material); mesh.name=`campus-${name}`;
      mesh.castShadow=!b.material.transparent && !["paving","soil","grass","waterBed","warmLight"].includes(name);
      mesh.receiveShadow=true;this.root.add(mesh);
    }
    this.batches.clear();
  }
}

export function addSign(kit, {text, subtitle="", x,y,z,width=3,height=.85, color="#ede9dc", background="#354a42", yaw=0}) {
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext("2d");ctx.fillStyle=background;ctx.fillRect(0,0,1024,256);
  ctx.fillStyle=color;ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="500 65px Arial, sans-serif";ctx.fillText(text,512,subtitle?95:130);
  if(subtitle){ctx.font="25px Arial, sans-serif";ctx.fillText(subtitle,512,178);}
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.78});
  kit.add(new THREE.PlaneGeometry(width,height),mat,x,y,z,0,yaw);
  return tex;
}

export function disposeRoot(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});
  for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();
}
