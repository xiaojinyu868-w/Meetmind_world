import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import { Input } from "../src/runtime/Input.js";
import {
  CameraRelativeMovement,
  cameraRelativeDirection,
} from "../src/runtime/CameraRelativeMovement.js";
import {
  CAMERA_PITCH_MAX,
  ThirdPersonCamera,
} from "../src/runtime/ThirdPersonCamera.js";


class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type, event = {}) {
    if (!event.target) event.target = this;
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}


function assertVector(vector, expected, epsilon = 1e-6) {
  expected.forEach((value, index) => {
    assert.ok(
      Math.abs(vector.getComponent(index) - value) <= epsilon,
      `component ${index}: expected ${value}, got ${vector.getComponent(index)}`,
    );
  });
}


test("WASD direction follows camera yaw and normalizes diagonals", () => {
  assertVector(cameraRelativeDirection({ x: 0, y: 1 }, 0), [0, 0, -1]);
  assertVector(cameraRelativeDirection({ x: 1, y: 0 }, 0), [-1, 0, 0]);
  assertVector(cameraRelativeDirection({ x: -1, y: 0 }, 0), [1, 0, 0]);
  assertVector(cameraRelativeDirection({ x: 0, y: 1 }, Math.PI / 2), [-1, 0, 0]);

  const diagonal = cameraRelativeDirection({ x: 1, y: 1 }, 0);
  assert.ok(Math.abs(diagonal.length() - 1) <= 1e-6);
});


test("movement turns toward camera-relative input and preserves run speed", () => {
  const movement = new CameraRelativeMovement({ speed: 2, runSpeed: 3 });
  movement.update(1 / 60, { x: 1, y: 0 }, 0);
  const firstTurnX = movement.orientation.x;
  assert.ok(firstTurnX < 0, "A should start turning toward camera-left");

  for (let frame = 0; frame < 180; frame += 1) {
    movement.update(1 / 60, { x: 0, y: 0 }, 0);
  }
  assert.ok(movement.orientation.x < -0.999);
  assert.ok(Math.abs(movement.orientation.z) < 0.002);

  const walking = movement.update(1 / 60, { x: 0, y: 1 }, 0);
  const running = movement.update(1 / 60, { x: 0, y: 1 }, 0, { run: true });
  assert.equal(walking.speed, 2);
  assert.equal(running.speed, 3);
});


test("pointer-lock input tracks keys and consumes mouse motion", async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const hadWindow = Object.hasOwn(globalThis, "window");
  const hadDocument = Object.hasOwn(globalThis, "document");
  const fakeWindow = new FakeEventTarget();
  const fakeDocument = new FakeEventTarget();
  const canvas = new FakeEventTarget();
  let lockRequests = 0;

  fakeDocument.pointerLockElement = null;
  fakeDocument.exitPointerLock = () => {
    fakeDocument.pointerLockElement = null;
    fakeDocument.dispatch("pointerlockchange");
  };
  canvas.requestPointerLock = () => {
    lockRequests += 1;
    fakeDocument.pointerLockElement = canvas;
    fakeDocument.dispatch("pointerlockchange");
    return Promise.resolve();
  };

  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;
  const input = new Input(canvas);
  try {
    fakeWindow.dispatch("keydown", { code: "KeyW", target: { tagName: "INPUT" } });
    assert.equal(input.isDown("KeyW"), false);

    fakeWindow.dispatch("keydown", { code: "KeyW", target: { tagName: "DIV" } });
    assert.equal(input.isDown("KeyW"), true);
    assert.equal(input.justPressed("KeyW"), true);
    input.endFrame();
    assert.equal(input.justPressed("KeyW"), false);
    fakeWindow.dispatch("keyup", { code: "KeyW", target: { tagName: "DIV" } });
    assert.equal(input.isDown("KeyW"), false);

    canvas.dispatch("click");
    assert.equal(lockRequests, 1);
    assert.equal(input.pointerLocked, true);
    fakeDocument.dispatch("mousemove", { movementX: 12, movementY: -7 });
    assert.deepEqual(input.consumeMouseDelta(), { dx: 12, dy: -7 });
    assert.deepEqual(input.consumeMouseDelta(), { dx: 0, dy: 0 });

    input.setPointerLockEnabled(false);
    assert.equal(input.pointerLocked, false);
    canvas.dispatch("click");
    assert.equal(lockRequests, 1);
  } finally {
    input.destroy();
    if (hadWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
    if (hadDocument) globalThis.document = originalDocument;
    else delete globalThis.document;
  }
});


test("third-person camera orbits, zooms, collides, and locks", () => {
  const canvas = new FakeEventTarget();
  const controller = new ThirdPersonCamera({
    canvas,
    distance: 4,
    minDistance: 2.5,
    maxDistance: 6,
    pitch: 0,
  });
  const target = new THREE.Vector3(0, 0, 0);

  canvas.dispatch("wheel", { deltaY: 100 });
  assert.equal(controller.distance, 5);
  canvas.dispatch("wheel", { deltaY: 1000 });
  assert.equal(controller.distance, 6);
  controller.applyMouseDelta(100, 10000);
  assert.ok(Math.abs(controller.yaw + 0.25) <= 1e-6);
  assert.equal(controller.pitch, CAMERA_PITCH_MAX);

  controller.snapTo(target, { yaw: 0, pitch: 0, distance: 4 });
  for (let frame = 0; frame < 180; frame += 1) {
    controller.update(target, {
      delta: 1 / 60,
      blockers: [{ x: 0, z: 2, r: 0.5 }],
      groundHeightAt: () => 2,
    });
  }
  assert.ok(controller.camera.position.z < 1.1, "blocker should shorten the camera arm");
  assert.ok(controller.camera.position.y >= 2.49, "camera should stay above the ground");

  controller.snapTo(new THREE.Vector3(1.28, 0, 0), {
    yaw: -Math.PI / 2,
    pitch: 0,
    distance: 4,
    blockers: [{ x: 0, z: 0, r: 1.27 }],
  });
  assert.ok(
    controller.camera.position.x >= 1.27,
    "an arm starting in blocker padding must not cross through the blocker",
  );

  controller.snapTo(new THREE.Vector3(0, 0, 4.4), {
    yaw: 0,
    pitch: 0,
    distance: 4,
    bounds: { minX: -5, maxX: 5, minZ: -4.45, maxZ: 4.45 },
  });
  assert.ok(controller.camera.position.z <= 4.45, "room bounds must shorten the camera arm");

  controller.snapTo(new THREE.Vector3(0, 0, 4.4), {
    yaw: 0,
    pitch: 0,
    distance: 4,
    bounds: {
      minX: -5,
      maxX: 5,
      minZ: -4.45,
      maxZ: 4.45,
      openings: [{ side: "maxZ", min: -1.5, max: 1.5 }],
    },
  });
  assert.ok(controller.camera.position.z > 4.45, "a doorway should let the camera arm pass");

  assert.equal(controller.lockTo([3, 4, -2], [0, 1, 0], 36), true);
  for (let frame = 0; frame < 180; frame += 1) controller.update(null, 1 / 60);
  assert.ok(controller.camera.position.distanceTo(new THREE.Vector3(3, 4, -2)) < 0.01);
  assert.ok(Math.abs(controller.camera.fov - 36) < 0.02);

  controller.unlock();
  for (let frame = 0; frame < 180; frame += 1) controller.update(target, 1 / 60);
  assert.ok(Math.abs(controller.camera.fov - 48) < 0.02);
  controller.dispose();
});


test("camera smoothing responds to the real frame delta", () => {
  const target = new THREE.Vector3(0, 0, 0);
  const slowFrame = new ThirdPersonCamera({ distance: 4, pitch: 0 });
  const fastFrame = new ThirdPersonCamera({ distance: 4, pitch: 0 });
  slowFrame.snapTo(target, { yaw: 0 });
  fastFrame.snapTo(target, { yaw: 0 });
  const start = slowFrame.camera.position.clone();
  slowFrame.yaw = Math.PI / 2;
  fastFrame.yaw = Math.PI / 2;
  slowFrame.update(target, 1 / 120);
  fastFrame.update(target, 1 / 30);

  assert.ok(
    fastFrame.camera.position.distanceTo(start) > slowFrame.camera.position.distanceTo(start),
  );
});


test("camera arm pulls in fast on blockers and recovers slowly", () => {
  const target = new THREE.Vector3(0, 0, 0);
  const controller = new ThirdPersonCamera({ distance: 4, pitch: 0 });
  controller.snapTo(target, { yaw: 0 });
  const blocker = { x: 0, z: 2, r: 0.5 };

  // 遮挡出现：恒速拉近，1 秒内必须贴近允许臂长（保护优先）
  for (let frame = 0; frame < 60; frame += 1) {
    controller.update(target, { delta: 1 / 60, blockers: [blocker] });
  }
  const pulledIn = controller.camera.position.z;
  assert.ok(pulledIn < 1.2, `blocked arm should pull in fast, got z=${pulledIn}`);

  // 遮挡消失：缓慢恢复（0.5 秒内不得弹回，4 秒后接近目标臂长）
  for (let frame = 0; frame < 30; frame += 1) {
    controller.update(target, { delta: 1 / 60 });
  }
  assert.ok(
    controller.camera.position.z < 2.6,
    `recovery must be gradual, got z=${controller.camera.position.z}`,
  );
  for (let frame = 0; frame < 240; frame += 1) {
    controller.update(target, { delta: 1 / 60 });
  }
  assert.ok(controller.camera.position.z > 3.8, "arm should eventually recover");
});


test("spherical orbit keeps true 3d distance at any pitch", () => {
  const target = new THREE.Vector3(0, 0, 0);
  const controller = new ThirdPersonCamera({ distance: 4, pitch: Math.PI / 4 });
  controller.snapTo(target, { yaw: 0 });
  const arm = controller.camera.position
    .clone()
    .sub(target.clone().add(controller.lookOffset));
  assert.ok(
    Math.abs(arm.length() - 4) < 1e-6,
    `orbit distance should be pitch-independent, got ${arm.length()}`,
  );
});


test("sprint boost widens fov and never fights camera locks", () => {
  const target = new THREE.Vector3(0, 0, 0);
  const controller = new ThirdPersonCamera({ distance: 4, pitch: 0 });
  controller.snapTo(target, { yaw: 0 });
  const settle = (frames = 180) => {
    for (let frame = 0; frame < frames; frame += 1) controller.update(target, 1 / 60);
  };
  settle();
  assert.ok(Math.abs(controller.camera.fov - 48) < 0.02);

  controller.setSprintBoost(true);
  settle();
  assert.ok(Math.abs(controller.camera.fov - 53) < 0.02, "sprint should widen fov by 5");

  controller.lockTo([3, 4, -2], [0, 1, 0], 36);
  settle();
  assert.ok(Math.abs(controller.camera.fov - 36) < 0.02, "lock fov wins over sprint");

  controller.unlock();
  settle();
  assert.ok(Math.abs(controller.camera.fov - 53) < 0.02, "unlock restores sprint fov");

  controller.setSprintBoost(false);
  settle();
  assert.ok(Math.abs(controller.camera.fov - 48) < 0.02);
  controller.dispose();
});
