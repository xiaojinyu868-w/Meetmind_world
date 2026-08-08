import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  OVERVIEW_PITCH,
  OverviewCamera,
  clampOverviewTarget,
  defaultOverviewViewSize,
  overviewHalfExtents,
} from "../src/runtime/OverviewCamera.js";
import { cameraRelativeDirection } from "../src/runtime/CameraRelativeMovement.js";

const BOUNDS = Object.freeze({ minX: -14, maxX: 14, minZ: -15, maxZ: 15 });

test("overviewHalfExtents: 半宽随 aspect、半深随俯视角度", () => {
  const { halfWidth, halfDepth } = overviewHalfExtents(10, 2, OVERVIEW_PITCH);
  assert.ok(Math.abs(halfWidth - 10) < 1e-6); // halfHeight=5 × aspect=2
  assert.ok(Math.abs(halfDepth - 5 / Math.sin(OVERVIEW_PITCH)) < 1e-6);
});

test("clampOverviewTarget: 边界内不动、出界钳制、视野大于边界取中心", () => {
  const { halfWidth, halfDepth } = overviewHalfExtents(10, 1, OVERVIEW_PITCH);
  assert.deepEqual(clampOverviewTarget(3, 4, BOUNDS, halfWidth, halfDepth), { x: 3, z: 4 });
  const clamped = clampOverviewTarget(100, -100, BOUNDS, halfWidth, halfDepth);
  assert.equal(clamped.x, BOUNDS.maxX - halfWidth);
  assert.equal(clamped.z, BOUNDS.minZ + halfDepth);
  // 视野比世界还大：落在边界中心而不是 NaN/甩出
  const tiny = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
  assert.deepEqual(clampOverviewTarget(0.3, -0.2, tiny, 10, 10), { x: 0, z: 0 });
  // 无边界原样通过
  assert.deepEqual(clampOverviewTarget(7, 8, null, 5, 5), { x: 7, z: 8 });
});

test("defaultOverviewViewSize: 按世界尺度取值并钳在可读区间", () => {
  assert.equal(defaultOverviewViewSize(BOUNDS), Math.min(28 * 0.45, 24));
  assert.equal(defaultOverviewViewSize({ minX: -3, maxX: 3, minZ: -3, maxZ: 3 }), 7);
  assert.equal(defaultOverviewViewSize({ minX: -100, maxX: 100, minZ: -100, maxZ: 100 }), 24);
  assert.equal(defaultOverviewViewSize(null), 14);
});

test("snapTo: 相机落在固定方位角/俯角的正交臂上并注视目标", () => {
  const rig = new OverviewCamera({ yaw: 0, viewSize: 14, aspect: 1 });
  rig.snapTo(new THREE.Vector3(2, 0, -3), { bounds: null });
  const target = new THREE.Vector3(2, 0, -3);
  const offset = rig.camera.position.clone().sub(target).normalize();
  const expected = new THREE.Vector3(
    Math.sin(0) * Math.cos(OVERVIEW_PITCH),
    Math.sin(OVERVIEW_PITCH),
    Math.cos(0) * Math.cos(OVERVIEW_PITCH),
  );
  assert.ok(offset.distanceTo(expected) < 1e-6);
  // 视线穿过目标
  const look = new THREE.Vector3();
  rig.camera.getWorldDirection(look);
  assert.ok(look.dot(offset) < -0.999);
});

test("W 键方向 = 屏幕上方（与正交相机的前向一致）", () => {
  for (const yaw of [0, Math.PI / 3, -Math.PI * 0.7]) {
    const rig = new OverviewCamera({ yaw, viewSize: 14, aspect: 1 });
    rig.snapTo(new THREE.Vector3(0, 0, 0), { bounds: null });
    const forward = new THREE.Vector3();
    rig.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const w = cameraRelativeDirection({ x: 0, y: 1 }, rig.getHorizontalAngle());
    assert.ok(w.distanceTo(forward) < 1e-6, `yaw=${yaw}`);
  }
});

test("setViewSize: 缩放钳制在区间内并同步视锥", () => {
  const rig = new OverviewCamera({ viewSize: 14, aspect: 1.5, minViewSize: 5, maxViewSize: 40 });
  rig.setViewSize(1000);
  assert.equal(rig.viewSize, 40);
  assert.equal(rig.camera.top, 20);
  assert.equal(rig.camera.right, 30);
  rig.setViewSize(0.01);
  assert.equal(rig.viewSize, 5);
  assert.equal(rig.camera.top, 2.5);
});

test("滚轮缩放受 enabled 门控（切换沉浸视角后总览不再吃滚轮）", () => {
  const rig = new OverviewCamera({ viewSize: 14, aspect: 1 });
  rig._onWheel({ deltaY: -400 });
  const zoomed = rig.viewSize;
  assert.ok(zoomed < 14);
  rig.setEnabled(false);
  rig._onWheel({ deltaY: -400 });
  assert.equal(rig.viewSize, zoomed);
  rig.setEnabled(true);
});

test("update: 平滑跟随并钳制在世界边界内", () => {
  const rig = new OverviewCamera({ viewSize: 10, aspect: 1 });
  // 目标远远出界：跟随点应被钳回边界内
  rig.snapTo(new THREE.Vector3(999, 0, 999), { bounds: BOUNDS });
  const snappedX = rig._smoothed.x;
  assert.ok(snappedX <= BOUNDS.maxX && snappedX >= BOUNDS.minX);
  // 平滑跟随新目标（不瞬移，持续收敛）
  rig.update(new THREE.Vector3(0, 0, 0), { delta: 1 / 60, bounds: BOUNDS });
  const before = rig._smoothed.distanceTo(new THREE.Vector3(0, 0, 0));
  for (let i = 0; i < 120; i += 1) {
    rig.update(new THREE.Vector3(0, 0, 0), { delta: 1 / 60, bounds: BOUNDS });
  }
  const after = rig._smoothed.distanceTo(new THREE.Vector3(0, 0, 0));
  assert.ok(after < before);
  assert.ok(after < 0.05);
});

test("resize: 宽高比同步进视锥", () => {
  const rig = new OverviewCamera({ viewSize: 10, aspect: 1 });
  rig.resize(2);
  assert.equal(rig.camera.right, 10);
  assert.equal(rig.camera.left, -10);
  rig.resize(0); // 非法值忽略
  assert.equal(rig.camera.right, 10);
});
