import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import {
  CHARACTER_ACTIONS,
  CharacterSystem,
} from "../src/runtime/CharacterSystem.js";
import { boothPersonAnchor } from "../src/runtime/BoothSystem.js";
import {
  capsuleFitsAt,
  capsuleFootprint,
  capsuleIntersectsAt,
  capsulePenetrationAt,
  CharacterCapsuleCollider,
} from "../src/runtime/CharacterCapsule.js";
import { CAFE_LAYOUT } from "../src/runtime/CafeLayout.js";
import { CAFE_TABLE_COLLIDERS } from "../src/runtime/ColliderRegistry.js";
import { createEntrySpawnScatter } from "../src/runtime/EntrySpawnScatter.js";
import { eventIdentityKey } from "../src/runtime/LiveWorld.js";
import { NpcAgentSystem } from "../src/runtime/NpcAgentSystem.js";
import { normalizeEvent } from "../src/runtime/SnapshotAdapter.js";
import {
  slideCapsuleStepAroundBlockers,
  slideStepAroundBlockers,
} from "../src/runtime/WalkSlide.js";


function animationClip(name, ...nodeNames) {
  const rootValues = name === "SitDown"
    ? [0, -0.1, -0.1]
    : (["Sit", "SitTalk"].includes(name) ? [-0.1, -0.1, -0.1] : [0, 0, 0]);
  return new THREE.AnimationClip(
    name,
    1,
    nodeNames.flatMap((nodeName) => [
      new THREE.NumberKeyframeTrack(
        `${nodeName}.rotation[x]`,
        [0, 0.5, 1],
        name === "Idle" ? [0, 0, 0] : [0, 0.3, 0],
      ),
      ...(nodeName === "Root"
        ? [new THREE.NumberKeyframeTrack(`${nodeName}.position[y]`, [0, 0.5, 1], rootValues)]
        : []),
    ]),
  );
}


function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}


async function createAnimatedEntity() {
  const source = new THREE.Group();
  for (const name of ["Root", "Torso", "Head", "Arm_R", "Arm_L", "Leg_R", "Leg_L"]) {
    const node = new THREE.Object3D();
    node.name = name;
    source.add(node);
  }
  const clips = [
    animationClip("Idle", "Torso"),
    animationClip("Walk", "Leg_L"),
    animationClip("Talk", "Head"),
    animationClip("SitDown", "Root", "Leg_L", "Leg_R"),
    animationClip("Sit", "Root", "Leg_L", "Leg_R"),
    animationClip("SitTalk", "Root", "Head", "Leg_L", "Leg_R"),
    animationClip("RaiseRightHand", "Arm_R"),
    animationClip("RaiseBothHands", "Arm_L"),
  ];
  const system = new CharacterSystem({
    scene: new THREE.Scene(),
    assetStore: { loadGltf: async () => ({ scene: source, animations: clips }) },
    assetCatalog: { resolve: () => ({ resolvedUrl: "memory://character" }) },
    resolveSurfaceY: () => 0,
  });
  const entity = await system.spawn({
    instance_id: "test-character",
    person_id: "test-person",
    profile: { person_id: "test-person" },
    asset_id: "character.test",
    spawn: { x: 0, z: 0 },
    behavior: { idle_bob: 0 },
  });
  return { entity, system };
}


function actionState(system) {
  const state = system.getAnimationDiagnostics()[0];
  return { active: state.active, base: state.base, override: state.override };
}


function postureState(system) {
  const state = system.getAnimationDiagnostics()[0];
  return { ...actionState(system), posture: state.posture };
}


test("idle is the static default and seating has an explicit transition", async () => {
  const { entity, system } = await createAnimatedEntity();
  const torsoBone = entity.model.getObjectByName("Torso");
  assert.deepEqual(postureState(system), {
    active: CHARACTER_ACTIONS.IDLE,
    base: CHARACTER_ACTIONS.IDLE,
    override: null,
    posture: "standing",
  });
  system.update(0.5, 0.5);
  assert.ok(Math.abs(torsoBone.rotation.x) < 1e-8);

  system.setActivity(entity, { moving: true });
  assert.equal(entity.animation.currentRole, CHARACTER_ACTIONS.WALK);
  system.setActivity(entity);
  assert.equal(entity.animation.currentRole, CHARACTER_ACTIONS.IDLE);
  system.setActivity(entity, { moving: true });

  system.setActivity(entity, { seated: true });
  assert.deepEqual(postureState(system), {
    active: CHARACTER_ACTIONS.SIT_DOWN,
    base: CHARACTER_ACTIONS.SIT,
    override: CHARACTER_ACTIONS.SIT_DOWN,
    posture: "seated",
  });

  system.update(0.6, 0.6);
  system.update(0.6, 1.2);
  assert.deepEqual(postureState(system), {
    active: CHARACTER_ACTIONS.SIT,
    base: CHARACTER_ACTIONS.SIT,
    override: null,
    posture: "seated",
  });
});


test("every spawned character owns a posture-aware vertical capsule", async () => {
  const { entity, system } = await createAnimatedEntity();
  assert.equal(entity.collider instanceof CharacterCapsuleCollider, true);
  assert.equal(entity.root.userData.characterCollider, "capsule");
  const standing = capsuleFootprint(entity.collider);
  assert.ok(Math.abs(standing.minY) < 1e-8);
  assert.ok(Math.abs(standing.maxY - 1.72) < 1e-8);

  system.setActivity(entity, { seated: true, transition: false });
  const seated = capsuleFootprint(entity.collider);
  assert.ok(Math.abs(seated.maxY - 1.08) < 1e-8);
  assert.ok(seated.maxY < standing.maxY);
});


test("seated talking preserves the seated pose and movement restores walk", async () => {
  const { entity, system } = await createAnimatedEntity();
  system.setActivity(entity, { seated: true, transition: false });
  assert.equal(system.playAction(entity, CHARACTER_ACTIONS.TALK, { durationMs: 500 }), true);
  assert.equal(entity.animation.currentRole, CHARACTER_ACTIONS.SIT_TALK);
  assert.equal(entity.animation.currentAction.loop, THREE.LoopRepeat);

  system.update(0.6, 0.6);
  assert.deepEqual(postureState(system), {
    active: CHARACTER_ACTIONS.SIT,
    base: CHARACTER_ACTIONS.SIT,
    override: null,
    posture: "seated",
  });

  system.setActivity(entity, { moving: true });
  assert.deepEqual(postureState(system), {
    active: CHARACTER_ACTIONS.WALK,
    base: CHARACTER_ACTIONS.WALK,
    override: null,
    posture: "standing",
  });
});


test("talk arriving during sit-down waits for the seated transition", async () => {
  const { entity, system } = await createAnimatedEntity();
  system.setActivity(entity, { seated: true });
  assert.equal(system.playAction(entity, CHARACTER_ACTIONS.TALK, { durationMs: 2000 }), true);
  assert.equal(entity.animation.currentRole, CHARACTER_ACTIONS.SIT_DOWN);
  assert.equal(entity.animation.pendingOverride.role, CHARACTER_ACTIONS.SIT_TALK);

  system.update(1.1, 1.1);
  assert.deepEqual(postureState(system), {
    active: CHARACTER_ACTIONS.SIT_TALK,
    base: CHARACTER_ACTIONS.SIT,
    override: CHARACTER_ACTIONS.SIT_TALK,
    posture: "seated",
  });
  assert.equal(entity.animation.pendingOverride, null);
});


test("talk requested while walking waits until the character has sat down", async () => {
  const { entity, system } = await createAnimatedEntity();
  system.setActivity(entity, { moving: true });
  assert.equal(system.playAction(entity, CHARACTER_ACTIONS.TALK, { durationMs: 2000 }), true);
  assert.equal(entity.animation.currentRole, CHARACTER_ACTIONS.WALK);
  assert.equal(entity.animation.pendingOverride.role, CHARACTER_ACTIONS.TALK);

  system.setActivity(entity, { seated: true });
  assert.equal(entity.animation.currentRole, CHARACTER_ACTIONS.SIT_DOWN);
  assert.equal(entity.animation.pendingOverride.role, CHARACTER_ACTIONS.SIT_TALK);
  system.update(1.1, 1.1);
  assert.equal(entity.animation.currentRole, CHARACTER_ACTIONS.SIT_TALK);
});


test("sit-down completion keeps the root at the seated height", async () => {
  const { entity, system } = await createAnimatedEntity();
  const rootBone = entity.model.getObjectByName("Root");
  system.setActivity(entity, { seated: true });

  system.update(1.05, 1.05);
  assert.ok(Math.abs(rootBone.position.y + 0.1) < 1e-5);
  assert.equal(entity.animation.currentRole, CHARACTER_ACTIONS.SIT);

  system.update(0.016, 1.066);
  assert.ok(Math.abs(rootBone.position.y + 0.1) < 1e-5);
});


test("walking cancels sit-down and any queued seated talk", async () => {
  const { entity, system } = await createAnimatedEntity();
  system.setActivity(entity, { seated: true });
  system.playAction(entity, CHARACTER_ACTIONS.TALK, { durationMs: 2000 });

  system.setActivity(entity, { moving: true });
  assert.deepEqual(postureState(system), {
    active: CHARACTER_ACTIONS.WALK,
    base: CHARACTER_ACTIONS.WALK,
    override: null,
    posture: "standing",
  });
  assert.equal(entity.animation.pendingOverride, null);

  system.update(1.2, 1.2);
  assert.equal(entity.animation.currentRole, CHARACTER_ACTIONS.WALK);
});


test("same-role talk override finishes and returns to the talking base", async () => {
  const { entity, system } = await createAnimatedEntity();
  assert.equal(system.setBaseAction(entity, CHARACTER_ACTIONS.TALK), true);
  assert.equal(system.playAction(entity, CHARACTER_ACTIONS.TALK), true);

  system.update(0.6, 0.6);
  system.update(0.6, 1.2);

  assert.deepEqual(actionState(system), {
    active: CHARACTER_ACTIONS.TALK,
    base: CHARACTER_ACTIONS.TALK,
    override: null,
  });
});


test("gesture duration never loops and the gesture restores its base action", async () => {
  const { entity, system } = await createAnimatedEntity();
  assert.equal(system.setBaseAction(entity, CHARACTER_ACTIONS.WALK), true);
  assert.equal(
    system.playAction(entity, CHARACTER_ACTIONS.RAISE_RIGHT_HAND, { durationMs: 5000 }),
    true,
  );
  assert.equal(entity.animation.currentAction.loop, THREE.LoopOnce);

  system.update(1.1, 1.1);

  assert.deepEqual(actionState(system), {
    active: CHARACTER_ACTIONS.WALK,
    base: CHARACTER_ACTIONS.WALK,
    override: null,
  });
});


test("stopping a gesture restores rather than erases the base action", async () => {
  const { entity, system } = await createAnimatedEntity();
  system.setBaseAction(entity, CHARACTER_ACTIONS.WALK);
  system.playAction(entity, CHARACTER_ACTIONS.RAISE_BOTH_HANDS);
  system.update(0.2, 0.2);

  assert.equal(system.stopAction(entity), true);
  assert.deepEqual(actionState(system), {
    active: CHARACTER_ACTIONS.WALK,
    base: CHARACTER_ACTIONS.WALK,
    override: null,
  });
});


test("animation cue normalization and identity include actor and action", () => {
  const rightCue = {
    type: "animation.cue",
    actor_id: "lin-che",
    sequence: 21,
    payload: { action: "RaiseRightHand", duration_ms: 1800 },
  };
  const bothCue = {
    type: "animation.cue",
    actor_id: "lin-che",
    sequence: 22,
    payload: { action: "RaiseBothHands", duration_ms: 1800 },
  };
  assert.notEqual(eventIdentityKey(rightCue), eventIdentityKey(bothCue));
  assert.deepEqual(normalizeEvent(bothCue), {
    type: "animation-cue",
    agentId: "lin-che",
    toAgentId: null,
    text: "",
    action: "RaiseBothHands",
    durationMs: 1800,
    participants: [],
    tick: null,
  });
});


test("local NPC conversations wait until both actors have settled into their seats", () => {
  const conversations = [];
  const people = ["person-a", "person-b"].map((id) => ({
    id,
    conversation: { replies: [`hello from ${id}`] },
  }));
  const system = new NpcAgentSystem({
    people,
    onConversation: (event) => conversations.push(event),
  });
  for (const person of people) {
    system.register(person, {
      root: new THREE.Group(),
      baseY: 0,
    });
  }
  const table = CAFE_LAYOUT.npcTables[0];
  system.moveToSeat(people[0].id, table.id, 0);
  system.moveToSeat(people[1].id, table.id, 1);

  system.update(10, 10);
  assert.equal(conversations.length, 0);
  system.update(0, 12.4);
  assert.equal(conversations.length, 0);
  system.update(0, 12.6);
  assert.equal(conversations.length, 1);
});


test("local NPC already at its seat never enters a walking transition", () => {
  const person = { id: "person-a", conversation: { replies: ["hello"] } };
  const states = [];
  const system = new NpcAgentSystem({
    people: [person],
    onStateChange: (state) => states.push(state.status),
  });
  const table = CAFE_LAYOUT.npcTables[0];
  const seat = table.seats[0];
  const root = new THREE.Group();
  root.position.set(seat.x, 0, seat.z);
  const agent = system.register(person, { root, baseY: 0 });

  assert.equal(system.moveToSeat(person.id, table.id, 0), true);
  assert.equal(agent.transition, null);
  assert.equal(agent.status, "seated");
  assert.deepEqual(states, ["seated"]);
});


test("seat approach slides around blockers but can enter the final seat radius", () => {
  const blocker = { x: 0.4, z: 0, r: 0.3 };
  const [slideX, slideZ] = slideStepAroundBlockers(
    0,
    0,
    0.2,
    0,
    [blocker],
  );
  assert.ok(Math.hypot(0 + slideX - blocker.x, slideZ - blocker.z) >= 0.35);
  assert.notEqual(slideZ, 0);

  const finalStep = slideStepAroundBlockers(
    0.2,
    0,
    0.1,
    0,
    [blocker],
    { ignore: blocker },
  );
  assert.deepEqual(finalStep, [0.1, 0]);
});


test("capsule sliding combines both character radii and ignores height-separated actors", () => {
  const moverRoot = new THREE.Group();
  const blockerRoot = new THREE.Group();
  blockerRoot.position.x = 0.65;
  const mover = new CharacterCapsuleCollider().sync({ root: moverRoot, baseY: 0 });
  const blocker = new CharacterCapsuleCollider().sync({ root: blockerRoot, baseY: 0 });

  const [stepX, stepZ] = slideCapsuleStepAroundBlockers(
    mover,
    0.12,
    0,
    [blocker],
  );
  assert.notEqual(stepZ, 0);
  assert.ok(Math.hypot(stepX - 0.65, stepZ) >= 0.61 - 1e-8);

  const targetTable = { x: 0.4, z: 0, r: 0.3 };
  const [, dynamicStepZ] = slideCapsuleStepAroundBlockers(
    mover,
    0.12,
    0,
    [targetTable, blocker],
    { ignore: targetTable },
  );
  assert.notEqual(dynamicStepZ, 0);

  blockerRoot.position.y = 3;
  blocker.sync({ root: blockerRoot, baseY: 3 });
  assert.deepEqual(
    slideCapsuleStepAroundBlockers(mover, 0.12, 0, [blocker]),
    [0.12, 0],
  );

  blockerRoot.position.set(0.55, 1.5, 0);
  blocker.sync({ root: blockerRoot, baseY: 1.5 });
  assert.equal(capsuleIntersectsAt(mover, 0, 0, blocker), false);
});


test("capsule placement includes body radius at world bounds and static blockers", () => {
  const root = new THREE.Group();
  const collider = new CharacterCapsuleCollider().sync({ root, baseY: 0 });
  const bounds = { minX: 0, maxX: 4, minZ: -2, maxZ: 2 };
  assert.equal(capsuleFitsAt(collider, 0.2, 0, [], { bounds }), false);
  assert.equal(capsuleFitsAt(collider, 0.3, 0, [], { bounds }), true);
  assert.equal(
    capsuleFitsAt(collider, 0.5, 0, [{ x: 1, z: 0, r: 0.25 }], { bounds }),
    false,
  );
});


test("entry spawns scatter safely near the cafe center", () => {
  const characterRadius = 0.28;
  const clearance = 0.12;
  const center = { x: 0, z: 2.35 };
  const spawns = createEntrySpawnScatter({
    count: 7,
    bounds: CAFE_LAYOUT.bounds,
    blockers: CAFE_TABLE_COLLIDERS,
    surfaceHeightAt: () => 0,
    center,
    characterRadius,
    clearance,
    minSeparation: 0.76,
    maxRadius: 2.35,
    random: seededRandom(42),
  });

  assert.equal(spawns.length, 7);
  for (const spawn of spawns) {
    assert.ok(Math.hypot(spawn.x - center.x, spawn.z - center.z) <= 2.35 + 1e-8);
    assert.ok(spawn.x >= CAFE_LAYOUT.bounds.minX + characterRadius + clearance);
    assert.ok(spawn.x <= CAFE_LAYOUT.bounds.maxX - characterRadius - clearance);
    assert.ok(spawn.z >= CAFE_LAYOUT.bounds.minZ + characterRadius + clearance);
    assert.ok(spawn.z <= CAFE_LAYOUT.bounds.maxZ - characterRadius - clearance);
    for (const blocker of CAFE_TABLE_COLLIDERS) {
      assert.ok(
        Math.hypot(spawn.x - blocker.x, spawn.z - blocker.z)
          >= blocker.r + characterRadius + clearance,
      );
    }
  }
  for (let left = 0; left < spawns.length; left += 1) {
    for (let right = left + 1; right < spawns.length; right += 1) {
      assert.ok(
        Math.hypot(
          spawns[left].x - spawns[right].x,
          spawns[left].z - spawns[right].z,
        ) >= 0.76,
      );
    }
  }
});


test("dynamic entry scatter keeps clear of characters already in the scene", () => {
  const reserved = [{ x: 0, z: 0, radius: 0.28 }];
  const random = seededRandom(7);
  for (let index = 0; index < 3; index += 1) {
    const [spawn] = createEntrySpawnScatter({
      count: 1,
      bounds: { minX: -2, maxX: 2, minZ: -2, maxZ: 2 },
      occupied: reserved,
      surfaceHeightAt: () => 0,
      center: { x: 0, z: 0 },
      maxRadius: 1.4,
      random,
    });
    assert.ok(reserved.every((other) =>
      Math.hypot(spawn.x - other.x, spawn.z - other.z) >= 0.72,
    ));
    reserved.push({ ...spawn, radius: 0.28 });
  }
});


test("booth person anchors stay outside the character collision boundary", () => {
  const booth = {
    x: -10.914,
    z: -4.454,
    yaw: Math.PI / 2,
    personOffset: 1.25,
    blockerRadius: 1.9,
  };
  const anchor = boothPersonAnchor(booth, 0.28);
  assert.ok(
    Math.hypot(anchor.x - booth.x, anchor.z - booth.z)
      >= booth.blockerRadius + 0.28 + 0.12 - 1e-8,
  );
});


test("an overlapping capsule may move only when the step reduces penetration", () => {
  const root = new THREE.Group();
  const collider = new CharacterCapsuleCollider().sync({ root, baseY: 0 });
  const blockers = [{ x: 0, z: 0, r: 0.4 }];
  const current = capsulePenetrationAt(collider, 0, 0, blockers);
  const outward = capsulePenetrationAt(collider, 0.05, 0, blockers);
  const inward = capsulePenetrationAt(collider, 0.01, 0, blockers);
  assert.ok(outward < current);
  assert.ok(inward < current);
  assert.ok(outward < inward);
});


test("local NPC movement waits for actual collision-resolved progress", () => {
  const person = { id: "person-a", conversation: { replies: ["hello"] } };
  let blocked = true;
  const system = new NpcAgentSystem({
    people: [person],
    resolveMovement: ({ stepX, stepZ }) => blocked ? [0, 0] : [stepX, stepZ],
  });
  const table = CAFE_LAYOUT.npcTables[0];
  const root = new THREE.Group();
  root.position.set(table.seats[0].x + 1, 0, table.seats[0].z);
  const entity = {
    root,
    baseY: 0,
    collider: new CharacterCapsuleCollider(),
  };
  entity.collider.sync(entity);
  const agent = system.register(person, entity);
  system.moveToSeat(person.id, table.id, 0);

  system.update(10, 10);
  assert.notEqual(agent.transition, null);
  assert.equal(agent.status, "walking");
  assert.ok(Math.abs(root.position.x - (table.seats[0].x + 1)) < 1e-8);

  blocked = false;
  system.update(10, 20);
  assert.equal(agent.transition, null);
  assert.equal(agent.status, "seated");
});


test("local NPC tries a deterministic side step after sustained blocking", () => {
  const person = { id: "person-a", conversation: { replies: ["hello"] } };
  const system = new NpcAgentSystem({
    people: [person],
    resolveMovement: ({ stepX, stepZ }) => Math.abs(stepZ) < 1e-8
      ? [0, 0]
      : [stepX, stepZ],
  });
  const table = CAFE_LAYOUT.npcTables[0];
  const root = new THREE.Group();
  root.position.set(table.seats[0].x + 1, 0, table.seats[0].z);
  const agent = system.register(person, { root, baseY: 0 });
  system.moveToSeat(person.id, table.id, 0);

  system.update(0.2, 0.2);
  assert.equal(root.position.z, table.seats[0].z);
  system.update(0.2, 0.4);
  assert.notEqual(root.position.z, table.seats[0].z);
  assert.notEqual(agent.transition, null);
});


test("meeting conversation delay is relative to the current world time", () => {
  const person = { id: "person-a", conversation: { replies: ["hello"] } };
  const system = new NpcAgentSystem({ people: [person] });
  system.register(person, { root: new THREE.Group(), baseY: 0 });
  system.update(0, 50);
  system.startMeeting([person.id]);
  assert.equal(system.nextConversationAt, 52.4);
});
