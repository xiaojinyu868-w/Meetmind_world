import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { loadCharacterLibrary, premiumWardrobeForSeed } from "../src/scenes/PremiumCharacters.js";

if (!globalThis.ProgressEvent) globalThis.ProgressEvent = class ProgressEvent {
  constructor(type, data) { this.type = type; Object.assign(this, data); }
};

// A minimal skinned GLTF exercises real GLTFLoader + SkeletonUtils, without a
// renderer, paid provider dependency or generated image fixtures.
function fixture({ hip = false } = {}) {
  const chunks = [], bufferViews = [], accessors = [];
  let offset = 0;
  function accessor(values, componentType, type, min, max) {
    const source = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
    const padded = new Uint8Array(Math.ceil(source.length / 4) * 4); padded.set(source);
    chunks.push(padded);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: source.byteLength }); offset += padded.byteLength;
    const components = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[type];
    accessors.push({ bufferView: bufferViews.length - 1, componentType, type, count: values.length / components, ...(min ? { min, max } : {}) });
    return accessors.length - 1;
  }
  const positions = accessor(new Float32Array([-0.2,0,0, 0.2,0,0, 0.2,2,0, -0.2,2,0]), 5126, "VEC3", [-0.2,0,0], [0.2,2,0]);
  const normals = accessor(new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]), 5126, "VEC3");
  const joints = accessor(new Uint16Array(16), 5123, "VEC4");
  const weights = accessor(new Float32Array([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]), 5126, "VEC4");
  const indices = accessor(new Uint16Array([0,1,2,0,2,3]), 5123, "SCALAR");
  const matrices = [new THREE.Matrix4(), new THREE.Matrix4().makeTranslation(0,-1,0), new THREE.Matrix4().makeTranslation(0,-1.7,0)];
  const inverse = accessor(new Float32Array(matrices.flatMap(matrix => matrix.toArray())), 5126, "MAT4");
  const times = accessor(new Float32Array([0,1]), 5126, "SCALAR", [0], [1]);
  const rootMotion = accessor(new Float32Array([0,0,0,2,0.04,3]), 5126, "VEC3");
  const spineMotion = accessor(new Float32Array([0,1,0,0.08,1.03,0.06]), 5126, "VEC3");
  const waveMotion = accessor(new Float32Array([0,0,0,1,0,0.342,0,0.94]), 5126, "VEC4");
  const binary = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
  const data = {
    asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0,3] }],
    nodes: [{ name: "Root", children: [1] }, { name: hip ? "Hip" : "Spine", translation: [0,1,0], children: [2] }, { name: "Head", translation: [0,0.7,0] }, { name: "Avatar", mesh: 0, skin: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: positions, NORMAL: normals, JOINTS_0: joints, WEIGHTS_0: weights }, indices, material: 0 }] }],
    skins: [{ joints: [0,1,2], skeleton: 0, inverseBindMatrices: inverse }],
    materials: [{ name: "Painted", pbrMetallicRoughness: { baseColorFactor: [0.4,0.5,0.4,1], roughnessFactor: 0.8 } }],
    animations: [
      { name: "Idle", samplers: [{ input: times, output: spineMotion }], channels: [{ sampler: 0, target: { node: 1, path: "translation" } }] },
      { name: "Walk", samplers: [{ input: times, output: rootMotion }, { input: times, output: spineMotion }], channels: [{ sampler: 0, target: { node: 0, path: "translation" } }, { sampler: 1, target: { node: 1, path: "translation" } }] },
      { name: "Wave", samplers: [{ input: times, output: waveMotion }], channels: [{ sampler: 0, target: { node: 2, path: "rotation" } }] },
    ], buffers: [{ byteLength: binary.length, uri: `data:application/octet-stream;base64,${binary.toString("base64")}` }], bufferViews, accessors,
  };
  return `data:model/gltf+json;base64,${Buffer.from(JSON.stringify(data)).toString("base64")}`;
}

test("premium clones have individual rigs, ground normalization, shared art and isolated disposal", async () => {
  const library = await loadCharacterLibrary({ assets: [{ id: "fixture", path: fixture(), height: 1.78 }] });
  assert.equal(library.assets[0].skinnedMeshes, 1);
  const a = library.createPremiumCharacter({ name: "A", seed: 1 }), b = library.createPremiumCharacter({ name: "B", seed: 1 });
  assert.equal(a.mixer.existingAction(library.templates[0].clipByState.get("idle")).getEffectiveWeight(),1,"first frame is real Idle, never an A-pose blend");
  const meshA = a.model.getObjectByName("Avatar"), meshB = b.model.getObjectByName("Avatar");
  assert.notEqual(meshA.skeleton, meshB.skeleton);
  assert.notEqual(meshA.skeleton.bones[0], meshB.skeleton.bones[0]);
  assert.equal(meshA.geometry, meshB.geometry);
  assert.equal(meshA.material, meshB.material);
  const bounds = new THREE.Box3().setFromObject(a.root, true);
  assert.ok(Math.abs(bounds.min.y) < 0.0001);
  assert.ok(Math.abs(bounds.max.y - 1.78) < 0.0001);
  const templateWalk = library.templates[0].clips.find(clip => clip.name === "Walk");
  const rootTrack = templateWalk.tracks.find(track => track.name === "Root.position");
  assert.deepEqual([...rootTrack.values].map(value => +value.toFixed(2)), [0,0,0,0,0.04,0]);
  const spineTrack = templateWalk.tracks.find(track => track.name === "Spine.position");
  assert.deepEqual([...spineTrack.values].map(value => +value.toFixed(2)), [0,1,0,0.08,1.03,0.06]);
  const before = b.model.getObjectByName("Root").position.clone();
  a.update(0.1, 0.1, "walking");
  assert.deepEqual(b.model.getObjectByName("Root").position.toArray(), before.toArray());
  let geometryDisposed = 0; meshA.geometry.addEventListener("dispose", () => geometryDisposed++);
  a.dispose(); a.dispose();
  assert.equal(geometryDisposed, 0);
  assert.equal(library.instances, 1);
  library.dispose();
  assert.equal(geometryDisposed, 0, "shared art stays alive until existing attendees leave");
  assert.throws(() => library.createPremiumCharacter(), /已释放/);
  b.update(0.1, 0.2, "talking");
  b.dispose();
  assert.equal(geometryDisposed, 1);
  assert.equal(library.released, true);
});

test("known outfits vary without copying shared geometry or recoloring material base", async () => {
  const choices=Array.from({length:10},(_,index)=>premiumWardrobeForSeed("host-female",index+23));
  assert.equal(new Set(choices.map(choice=>choice.index)).size,5);
  assert.ok(choices.every(choice=>choice.heightFactor>=.95&&choice.heightFactor<=1.04));
  const library=await loadCharacterLibrary({assets:[{id:"host-female",path:fixture(),height:1.68}]});
  const a=library.createPremiumCharacter({seed:24}), b=library.createPremiumCharacter({seed:26});
  const ma=a.model.getObjectByName("Avatar"), mb=b.model.getObjectByName("Avatar");
  assert.equal(ma.geometry,mb.geometry);
  assert.notEqual(ma.material,mb.material);
  assert.deepEqual(ma.material.color.toArray(),mb.material.color.toArray());
  assert.equal(a.height,1.68*premiumWardrobeForSeed("host-female",24).heightFactor);
  assert.ok(new THREE.Box3().setFromObject(a.root,true).min.y>-.0001);
  const shader={uniforms:{},fragmentShader:"#include <map_fragment>\n#include <emissivemap_fragment>"};
  ma.material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.premiumWardrobeKind.value,1);
  assert.match(shader.fragmentShader,/sourceTexel.g-sourceTexel.r/);
  a.dispose();b.dispose();library.dispose();
  assert.equal(library.wardrobeMaterials.size,0);
});

test("one-shot greeting returns to Idle while selection remains active", async () => {
  const library = await loadCharacterLibrary({ assets: [{ id: "wave-fixture", path: fixture(), height: 1.68 }] });
  const character = library.createPremiumCharacter();
  character.update(0.1, 0.1, "wave");
  const wave = character.mixer.existingAction(library.templates[0].clipByState.get("wave"));
  assert.ok(wave.isRunning());
  for (let frame = 0; frame < 20; frame++) character.update(0.1, frame * 0.1, "wave");
  assert.ok(character.mixer.existingAction(library.templates[0].clipByState.get("idle")).isRunning());
  assert.equal(wave.isRunning(), false);
  character.dispose(); library.dispose();
});

test("Hip locomotion compensation stays in attendee-local coordinates after movement and arrival scaling", async () => {
  const library = await loadCharacterLibrary({ assets: [{ id: "hip-fixture", path: fixture({ hip: true }), height: 1.78, forwardYaw: -Math.PI / 2 }] });
  const character = library.createPremiumCharacter();
  character.root.position.set(70,6.2991,205);
  character.root.rotation.y = 0.73;
  character.root.scale.setScalar(0.3);
  const hip = character.model.getObjectByName("Hip");
  const localPosition = () => character.root.worldToLocal(hip.getWorldPosition(new THREE.Vector3()));
  character.update(0.1,0.1,"idle");
  const initial = localPosition();
  for (let frame=0;frame<20;frame++) character.update(0.05,frame*0.05,"walking");
  const after = localPosition();
  assert.ok(Math.abs(after.x-initial.x)<1e-5);
  assert.ok(Math.abs(after.z-initial.z)<1e-5);
  assert.deepEqual(character.root.position.toArray(),[70,6.2991,205]);
  assert.equal(character.root.scale.x,0.3);
  const mesh = character.model.getObjectByName("Avatar");
  assert.ok(mesh.boundingSphere.radius > 1.5);
  assert.equal(mesh.boundingBox,null);
  character.dispose(); library.dispose();
});
