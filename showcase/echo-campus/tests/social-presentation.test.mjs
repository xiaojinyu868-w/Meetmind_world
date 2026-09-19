import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import * as THREE from "three";
import {loadCharacterLibrary} from "../src/scenes/PremiumCharacters.js";

if (!globalThis.ProgressEvent) globalThis.ProgressEvent = class { constructor(type,data){this.type=type;Object.assign(this,data);} };

// Actual shipped rigs, meshes and clips; remove only images for Node's headless
// loader. The geometry, weights, bind matrices and animation accessors are intact.
async function realRig(sex) {
  const buffer = await readFile(new URL("../public/assets/premium/host-" + sex + ".glb", import.meta.url));
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20,20+jsonLength).toString());
  const binStart = 28 + jsonLength;
  const binLength = buffer.readUInt32LE(20 + jsonLength);
  json.buffers = [{byteLength:binLength,uri:"data:application/octet-stream;base64,"+buffer.subarray(binStart,binStart+binLength).toString("base64")}];
  delete json.images;delete json.textures;delete json.samplers;
  json.materials = [{pbrMetallicRoughness:{baseColorFactor:[.4,.5,.4,1]}}];
  for(const mesh of json.meshes)for(const primitive of mesh.primitives)primitive.material=0;
  return "data:model/gltf+json;base64,"+Buffer.from(JSON.stringify(json)).toString("base64");
}
for (const sex of ["female", "male"]) test(sex + ": social stance stays planted through a full idle, greeting, talk and rejected Walk", async () => {
  const library = await loadCharacterLibrary({assets:[{id:"host-"+sex,path:await realRig(sex),height:sex==="female"?1.68:1.78,forwardYaw:-Math.PI/2}]});
  const character = library.createPremiumCharacter({presentation:"social"});
  const mesh = character.model.getObjectByProperty("isSkinnedMesh",true);
  const footBones = mesh.skeleton.bones.filter(b=>/^(?:[LR]_(?:Foot|ToeBase))$/.test(b.name));
  assert.equal(footBones.length,4);
  const vertex = new THREE.Vector3(), indices = [];
  character.root.updateMatrixWorld(true);
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){
    mesh.getVertexPosition(i,vertex).applyMatrix4(mesh.matrixWorld);
    character.root.worldToLocal(vertex);
    if(vertex.y<.055)indices.push(i);
  }
  assert.ok(indices.length>20,"real shoe samples");
  const subset=indices.filter((_,i)=>i%Math.ceil(indices.length/32)===0);
  const sample=()=>[
    ...footBones.map(b=>character.root.worldToLocal(b.getWorldPosition(new THREE.Vector3())).toArray()),
    ...subset.map(i=>{mesh.getVertexPosition(i,vertex).applyMatrix4(mesh.matrixWorld);return character.root.worldToLocal(vertex).toArray();}),
  ];
  const baseline=sample();
  assert.ok(Math.abs(new THREE.Box3().setFromObject(character.root,true).min.y)<.0001,"actual first-pose sole on ground");
  const sourceRoot=character.root.position.toArray();
  const arms=mesh.skeleton.bones.filter(b=>/Upperarm$/.test(b.name));
  const armRest=arms.map(b=>b.quaternion.clone());
  let armMotion=0,maxFootDrift=0;
  let time=0;
  for(const [state,seconds] of [["idle",16],["wave",4.5],["talking",3],["walking",1],["wave",4.5],["idle",1]]) {
    for(let frame=0;frame<seconds*30;frame++){
      time+=1/30;character.update(1/30,time,state);
      if(time>8){character.root.position.set(70,6.2991,205);character.root.rotation.y=.73;character.root.scale.setScalar(time<12?.3:1);}
      character.root.updateMatrixWorld(true);
      const points=sample();
      for(let i=0;i<points.length;i++)maxFootDrift=Math.max(maxFootDrift,new THREE.Vector3(...points[i]).distanceTo(new THREE.Vector3(...baseline[i])));
      if(state==="wave")for(let i=0;i<arms.length;i++)armMotion=Math.max(armMotion,arms[i].quaternion.angleTo(armRest[i]));
      assert.notEqual(character.root.userData.animationState,"walk","social presentation never steps in place");
    }
  }
  assert.ok(maxFootDrift<.0001,"foot/sole drift "+maxFootDrift);
  assert.ok(armMotion>.1,"greeting still visibly articulates arm bones");
  assert.deepEqual(character.root.position.toArray(),[70,6.2991,205]);
  assert.equal(character.mixer._actions.find(a=>a.getClip().name==="SocialWave").isRunning(),false,"one greeting settles");
  console.log(JSON.stringify({sex,maxFootDrift,armMotion,shoeSamples:subset.length,presentation:character.root.userData.characterPresentation}));
  character.dispose();library.dispose();
});

