import * as THREE from "three";

// 2.5D 总览相机：正交投影（无透视变形）+ 固定方位角 + 轻微俯视，
// 适合浏览全局与点选（MeetMind 市集概念图 tests/image.png 的呈现方式）；
// 与 ThirdPersonCamera 的沉浸漫游互补，两者可热切换。
export const OVERVIEW_PITCH = 0.86; // ≈49°：既看得清全局，也看得见人物/立面
export const OVERVIEW_MIN_VIEW_SIZE = 5;
export const OVERVIEW_MAX_VIEW_SIZE = 40;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// 可视范围在世界地面上的半宽/半深：正交下屏幕横轴对齐世界 X（yaw=0），
// 屏幕纵轴投到地面的深度 = halfHeight / sin(pitch)
export function overviewHalfExtents(viewSize, aspect, pitch = OVERVIEW_PITCH) {
  const halfHeight = Math.max(0.5, Number(viewSize) || 1) / 2;
  const halfWidth = halfHeight * Math.max(Number(aspect) || 1, 0.01);
  const halfDepth = halfHeight / Math.max(Math.sin(pitch), 0.2);
  return { halfWidth, halfDepth };
}

// 注视点钳制在边界内；视野比边界还大时取边界中心，画面不被甩出世界
export function clampOverviewTarget(x, z, bounds, halfWidth, halfDepth) {
  if (!bounds) return { x, z };
  const clampAxis = (value, min, max, half) => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return value;
    if (min + half > max - half) return (min + max) / 2;
    return clamp(value, min + half, max - half);
  };
  return {
    x: clampAxis(x, bounds.minX, bounds.maxX, halfWidth),
    z: clampAxis(z, bounds.minZ, bounds.maxZ, halfDepth),
  };
}

// 按世界尺度给一个「一眼看清全局又认得出人」的默认视野（世界单位 = 画面竖直跨度）
export function defaultOverviewViewSize(bounds) {
  if (!bounds) return 14;
  const span = Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
  return clamp(span * 0.45, 7, 24);
}

export class OverviewCamera {
  constructor({
    canvas = null,
    yaw = 0,
    pitch = OVERVIEW_PITCH,
    viewSize = 14,
    minViewSize = OVERVIEW_MIN_VIEW_SIZE,
    maxViewSize = OVERVIEW_MAX_VIEW_SIZE,
    aspect = (globalThis.innerWidth || 1) / (globalThis.innerHeight || 1),
    distance = 60,
  } = {}) {
    this.yaw = Number(yaw) || 0;
    this.pitch = clamp(Number(pitch) || OVERVIEW_PITCH, 0.35, 1.45);
    this.viewSize = clamp(Number(viewSize) || 14, minViewSize, maxViewSize);
    this.minViewSize = minViewSize;
    this.maxViewSize = maxViewSize;
    // 正交下相机距离只决定近/远裁剪区间，不影响画面大小
    this.distance = Math.max(10, Number(distance) || 60);
    this.enabled = true;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, this.distance + 160);
    this._aspect = Math.max(aspect, 0.01);
    this._target = new THREE.Vector3();
    this._smoothed = new THREE.Vector3();
    this._hasTarget = false;
    this._inputCanvas = canvas;
    this._applyFrustum();
    this._onWheel = (event) => {
      if (!this.enabled) return;
      this.setViewSize(this.viewSize * Math.exp((Number(event.deltaY) || 0) * 0.0011));
    };
    this._inputCanvas?.addEventListener("wheel", this._onWheel, { passive: true });
  }

  setViewSize(viewSize) {
    const next = clamp(Number(viewSize) || this.viewSize, this.minViewSize, this.maxViewSize);
    if (Math.abs(next - this.viewSize) < 1e-4) return;
    this.viewSize = next;
    this._applyFrustum();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  // 与 ThirdPersonCamera 同一约定：forward = (-sin yaw, -cos yaw)，
  // 直接喂给 CameraRelativeMovement 时 W 即屏幕上方
  getHorizontalAngle() {
    return this.yaw;
  }

  resize(aspect) {
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    this._aspect = aspect;
    this._applyFrustum();
  }

  update(targetPosition, { delta = 1 / 60, bounds = null } = {}) {
    if (!targetPosition) return;
    const clamped = this._clampTarget(targetPosition, bounds);
    if (!this._hasTarget) {
      this._smoothed.copy(clamped);
      this._hasTarget = true;
    } else {
      const alpha = 1 - Math.exp(-7 * Math.min(Math.max(delta, 0), 0.1));
      this._smoothed.lerp(clamped, alpha);
    }
    this._place(this._smoothed);
  }

  snapTo(targetPosition, { bounds = null } = {}) {
    if (!targetPosition) return;
    const clamped = this._clampTarget(targetPosition, bounds);
    this._smoothed.copy(clamped);
    this._hasTarget = true;
    this._place(this._smoothed);
  }

  dispose() {
    this._inputCanvas?.removeEventListener("wheel", this._onWheel);
    this._inputCanvas = null;
  }

  _clampTarget(targetPosition, bounds) {
    const { halfWidth, halfDepth } = overviewHalfExtents(this.viewSize, this._aspect, this.pitch);
    const { x, z } = clampOverviewTarget(
      targetPosition.x,
      targetPosition.z,
      bounds,
      halfWidth,
      halfDepth,
    );
    return this._target.set(x, targetPosition.y ?? 0, z);
  }

  _applyFrustum() {
    const halfHeight = this.viewSize / 2;
    const halfWidth = halfHeight * this._aspect;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  _place(target) {
    // 与 ThirdPersonCamera._computeOffset 同式：offset = (sin·cos, sin, cos·cos) * d
    const cosPitch = Math.cos(this.pitch);
    this.camera.position.set(
      target.x + Math.sin(this.yaw) * cosPitch * this.distance,
      target.y + Math.sin(this.pitch) * this.distance,
      target.z + Math.cos(this.yaw) * cosPitch * this.distance,
    );
    this.camera.lookAt(target);
  }
}
