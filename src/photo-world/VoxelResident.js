import * as THREE from 'three';
import { clone as cloneRig } from 'three/addons/utils/SkeletonUtils.js';

export function makeResident(person, template, cafe) {
  const model = cloneRig(template);
  const material = new THREE.MeshStandardMaterial({roughness:.90});
  const outfit = new THREE.Color(person.color || '#6b8876');
  const plain = new Map();
  const bones = {};
  model.traverse(node => {
    if (node.isBone) bones[node.name] = node;
    if (!node.isMesh) return;
    const shade = node.name.includes('Head') ? '#d9b390' : node.name.includes('Leg') ? '#454e5a' : outfit;
    if (!plain.has(shade)) plain.set(shade, new THREE.MeshStandardMaterial({color:shade,roughness:.92}));
    node.material = plain.get(shade);
    node.castShadow = node.receiveShadow = true;
  });
  const actor = new THREE.Group();
  actor.add(model);
  actor.scale.setScalar(cafe ? .99 : 1.39);
  let loadedUrl = '', active = 0;
  actor.userData.texture = url => {
    if (loadedUrl === url) return;
    loadedUrl = url;
    const generation = ++active;
    new THREE.TextureLoader().load(url, texture => {
      if (generation !== active) {texture.dispose();return;}
      // The Blender UVs use glTF texture coordinates, including the vertical convention.
      texture.flipY=false;
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.magFilter=THREE.NearestFilter;
      texture.minFilter=THREE.NearestMipmapLinearFilter;
      material.map?.dispose();material.map=texture;material.needsUpdate=true;
      model.traverse(node => {if(node.isMesh)node.material=material;});
      for (const m of plain.values()) m.dispose();
      plain.clear();
    },undefined,()=>{if(generation===active)loadedUrl='';});
  };
  actor.userData.pose = (walking, sitting, seconds, dt) => {
    const swing = walking ? Math.sin(seconds*9+person.seat)*.55 : 0;
    const ease = Math.min(1,dt*12);
    for(const [name,angle] of [['Leg_L',sitting?-1.15:swing],['Leg_R',sitting?-1.15:-swing],['Arm_L',sitting?-.42:-swing*.66],['Arm_R',sitting?-.42:swing*.66]]){
      const bone=bones[name];if(bone)bone.rotation.x+=(angle-bone.rotation.x)*ease;
    }
  };
  return actor;
}
