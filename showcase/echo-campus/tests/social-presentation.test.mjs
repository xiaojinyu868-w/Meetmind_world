import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { loadCharacterLibrary } from "../src/scenes/PremiumCharacters.js";

if (!globalThis.ProgressEvent) globalThis.ProgressEvent = class {
  constructor(type, data) { this.type = type; Object.assign(this, data); }
};

// The shipped geometry, weights, bind matrices and complete clips are retained.
// Only textures are replaced so GLTFLoader can run without a browser or GPU.
async function realRig(sex) {
  const buffer = await readFile(new URL("../public/assets/premium/host-" + sex + ".glb", import.meta.url));
  let json, binary;
  for (let offset = 12; offset < buffer.length;) {
    const size = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4);
    const chunk = buffer.subarray(offset + 8, offset + 8 + size);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString());
    if (type === 0x004e4942) binary = chunk;
    offset += 8 + size;
  }
  assert.ok(json && binary, "real GLB JSON and BIN chunks");
  json.buffers = [{ byteLength: binary.length, uri: "data:application/octet-stream;base64," + binary.toString("base64") }];
  delete json.images; delete json.textures; delete json.samplers;
  json.materials = [{ pbrMetallicRoughness: { baseColorFactor: [0.4, 0.5, 0.4, 1] } }];
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) primitive.material = 0;
  return "data:model/gltf+json;base64," + Buffer.from(JSON.stringify(json)).toString("base64");
}

const DT = 1 / 30;
const findAction = (character, name) => {
  const action = character.mixer._actions.find(item => item.getClip().name === name);
  assert.ok(action, "real action " + name);
  return action;
};
const poseOf = root => ({
  position: root.position.toArray(), quaternion: root.quaternion.toArray(), scale: root.scale.toArray(),
});
const assertRoot = (character, pose) => {
  assert.deepEqual(poseOf(character.root), pose, "clip playback must not move, turn or scale the attendee root");
};

function rigProbe(character) {
  const meshes = [], shoes = [], vertex = new THREE.Vector3();
  character.root.updateMatrixWorld(true);
  character.model.traverse(object => { if (object.isSkinnedMesh) meshes.push(object); });
  // Select all vertices from the authored shoe region, not just 32 samples.
  // This catches a heel or toe that happens to miss the runtime's sparse probe.
  for (const mesh of meshes) {
    for (let index = 0; index < mesh.geometry.attributes.position.count; index++) {
      vertex.fromBufferAttribute(mesh.geometry.attributes.position, index).applyMatrix4(mesh.matrixWorld);
      character.root.worldToLocal(vertex);
      if (vertex.y < 0.14) shoes.push({ mesh, index });
    }
  }
  assert.ok(shoes.length > 40, "real shoe geometry is available");
  const hip = character.model.getObjectByName("Hip");
  const legs = ["L_Calf", "R_Calf"].map(name => character.model.getObjectByName(name));
  const upper = ["L_Upperarm", "R_Upperarm", "L_Forearm", "R_Forearm", "NeckTwist01"].map(name => character.model.getObjectByName(name));
  assert.ok(hip && legs.every(Boolean) && upper.every(Boolean));
  const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const restLegs = legs.map(bone => bone.quaternion.clone().normalize());
  const restUpper = upper.map(bone => bone.quaternion.clone().normalize());
  let maxLegAngle = 0, maxUpperAngle = 0, lowestSole = Infinity, highestSole = -Infinity;
  return {
    sample() {
      character.root.updateMatrixWorld(true);
      character.root.worldToLocal(hip.getWorldPosition(vertex)); min.min(vertex); max.max(vertex);
      legs.forEach((bone, index) => { maxLegAngle = Math.max(maxLegAngle, restLegs[index].angleTo(bone.quaternion.clone().normalize())); });
      upper.forEach((bone, index) => { maxUpperAngle = Math.max(maxUpperAngle, restUpper[index].angleTo(bone.quaternion.clone().normalize())); });
      let lowest = Infinity;
      for (const sample of shoes) {
        sample.mesh.getVertexPosition(sample.index, vertex).applyMatrix4(sample.mesh.matrixWorld);
        character.root.worldToLocal(vertex); lowest = Math.min(lowest, vertex.y);
      }
      lowestSole = Math.min(lowestSole, lowest); highestSole = Math.max(highestSole, lowest);
    },
    report() {
      return { shoeVertices: shoes.length, hipRange: max.clone().sub(min).toArray(),
        maxLegDegrees: THREE.MathUtils.radToDeg(maxLegAngle), maxUpperDegrees: THREE.MathUtils.radToDeg(maxUpperAngle),
        lowestSole, highestSole };
    },
  };
}

for (const sex of ["female", "male"]) test(sex + ": complete social motion stays grounded, finishes phrases and preserves attendee transforms", async () => {
  const library = await loadCharacterLibrary({ assets: [{
    id: "host-" + sex, path: await realRig(sex), height: sex === "female" ? 1.68 : 1.78, forwardYaw: -Math.PI / 2,
  }] });
  const reports = [];
  try {
    for (const scale of [1, 0.3]) {
      const character = library.createPremiumCharacter({ presentation: "social", seed: 23 });
      try {
        character.root.position.set(70, 6.2991, 205);
        character.root.rotation.y = 0.73;
        character.root.scale.setScalar(scale);
        const rootPose = poseOf(character.root), probe = rigProbe(character);
        assert.equal(character.root.userData.characterPresentation, "continuous-social");
        const idle = findAction(character, "SocialIdle");
        let time = 0;
        const step = state => { time += DT; character.update(DT, time, state); assertRoot(character, rootPose); probe.sample(); };
        // A full cycle must contain actual weight shifts and lower-body motion.
        for (let frame = 0; frame < Math.ceil((idle.getClip().duration + 0.25) / DT); frame++) step("idle");
        const idleReport = probe.report();
        assert.ok(Math.hypot(idleReport.hipRange[0], idleReport.hipRange[2]) > 0.015, "Hip weight transfer must remain in the complete Idle");
        assert.ok(idleReport.maxLegDegrees > 1, "lower body must animate instead of being frozen to one frame");
        assert.ok(idle.isRunning(), "Idle continues looping");

        for (const [request, clipName] of [["talking", "SocialTalk"], ["wave", "SocialWave"]]) {
          const action = findAction(character, clipName), duration = action.getClip().duration;
          // A brief intent is a request for a complete phrase, not its lifetime.
          step(request); step(request); step("idle");
          assert.ok(action.isRunning(), request + " starts from a short intent");
          let previousTime = action.time, maxActionTime = action.time;
          for (let frame = 0; frame < Math.ceil((duration + 1) / DT); frame++) {
            step("idle");
            assert.ok(action.time + 1e-6 >= previousTime, request + " must not restart during a phrase");
            previousTime = action.time; maxActionTime = Math.max(maxActionTime, action.time);
            if (frame === Math.floor(duration * 0.45 / DT)) assert.ok(action.isRunning(), request + " must not be cut off when intent returns to idle");
          }
          assert.ok(maxActionTime >= duration - 2 * DT, request + " reaches its authored ending through the return blend");
          assert.ok(idle.isRunning(), request + " returns to a moving Idle");
          assert.equal(action.isRunning(), false, request + " ends as a one-shot");
          // Sustained intent plays once, returns to Idle, then stays there.
          step(request);
          assert.ok(action.isRunning() && action.time < 0.1, request + " can be deliberately requested again");
          let restarts = 0; previousTime = action.time;
          for (let frame = 0; frame < Math.ceil((duration * 2 + 1) / DT); frame++) {
            step(request);
            if (action.time < previousTime - DT) restarts++;
            previousTime = action.time;
          }
          assert.equal(restarts, 0, request + " held intent cannot restart its clip");
          assert.equal(action.isRunning(), false);
          assert.ok(idle.isRunning());
          step("idle");
        }

        // A legacy Walk intent must not introduce accidental treadmill motion.
        for (let frame = 0; frame < 15; frame++) step("walking");
        assert.notEqual(character.root.userData.animationState, "walk");
        const report = { sex, scale, ...probe.report() };
        reports.push(report);
        assert.ok(report.maxUpperDegrees > 20, "the greeting visibly articulates complete arm motion");
        assert.ok(report.lowestSole > -0.012, "shoe penetration exceeds 12 mm: " + report.lowestSole);
        assert.ok(report.highestSole < 0.035, "both soles hover above the floor: " + report.highestSole);
      } finally { character.dispose(); }
    }
    console.log(JSON.stringify({ completeSocialMotion: reports }));
  } finally { library.dispose(); }
});

test("social phrases and Idle keep real elapsed time at 6 fps", async () => {
  const results = [];
  for (const sex of ["female", "male"]) {
    const library = await loadCharacterLibrary({ assets: [{
      id: "host-" + sex, path: await realRig(sex), height: sex === "female" ? 1.68 : 1.78, forwardYaw: -Math.PI / 2,
    }] });
    const character = library.createPremiumCharacter({ presentation: "social", seed: 23 });
    try {
      character.root.position.set(70, 6.2991, 205);
      character.root.rotation.y = 0.73;
      character.root.scale.setScalar(0.3);
      const rootPose = poseOf(character.root), lowFpsDt = 1 / 6;
      const talk = findAction(character, "SocialTalk"), idle = findAction(character, "SocialIdle");
      const duration = talk.getClip().duration;
      assert.ok(duration > 3.5 && duration < 4.5, "the shipped Talk phrase lasts about four seconds");
      let elapsed = 0, finishedAt = null;
      character.mixer.addEventListener("finished", event => {
        if (event.action === talk) finishedAt = elapsed;
      });
      // One 6-fps frame requests Talk; all following frames request Idle.
      // Animation time must follow elapsed wall time, not the old 0.1 s cap.
      const frames = Math.ceil((duration + lowFpsDt) / lowFpsDt);
      for (let frame = 0; frame < frames; frame++) {
        elapsed += lowFpsDt;
        character.update(lowFpsDt, elapsed, frame === 0 ? "talking" : "idle");
        assertRoot(character, rootPose);
        if (elapsed <= 2 + 1e-8) assert.ok(Math.abs(talk.time - elapsed) < 1e-5,
          "Talk slowed below elapsed time at 6 fps: " + talk.time + " versus " + elapsed);
      }
      assert.notEqual(finishedAt, null, "the complete authored Talk reaches its end within real duration");
      assert.ok(finishedAt >= duration - 1e-5 && finishedAt <= duration + lowFpsDt + 1e-5,
        "Talk should finish near four real seconds, not six or more: " + finishedAt);
      assert.ok(idle.isRunning(), "the completed phrase settles back into Idle");
      for (let frame = 0; frame < 6; frame++) {
        const before = idle.time;
        elapsed += lowFpsDt; character.update(lowFpsDt, elapsed, "idle");
        assertRoot(character, rootPose);
        const advanced = (idle.time - before + idle.getClip().duration) % idle.getClip().duration;
        assert.ok(Math.abs(advanced - lowFpsDt) < 1e-5, "Idle also follows real elapsed time at 6 fps");
      }
      results.push({ sex, dt: lowFpsDt, authoredDuration: duration, finishedAt });
    } finally { character.dispose(); library.dispose(); }
  }
  console.log(JSON.stringify({ lowFpsSocialTiming: results }));
});
