import * as THREE from "three";

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function smoothingAlpha(response, delta) {
  const safeDelta = clamp(Number(delta) || 0, 0, 0.1);
  return 1 - Math.exp(-Math.max(0, response) * 60 * safeDelta);
}

function vectorFrom(value) {
  if (value?.isVector3) return value.clone();
  if (Array.isArray(value)) return new THREE.Vector3(...value);
  if (value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)) {
    return new THREE.Vector3(value.x, value.y, value.z);
  }
  return null;
}

function segmentCircleEntry(origin, target, circle, padding) {
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq < 1e-8) return null;

  const radius = Math.max(0, Number(circle.r ?? circle.radius) || 0) + padding;
  if (radius <= 0) return null;
  const ox = origin.x - circle.x;
  const oz = origin.z - circle.z;
  if (ox * ox + oz * oz <= radius * radius) {
    // Let an already-overlapping arm move out, but never cross through the
    // blocker when it initially points inward.
    return ox * dx + oz * dz <= 0 ? 0 : null;
  }

  const b = 2 * (ox * dx + oz * dz);
  const c = ox * ox + oz * oz - radius * radius;
  const discriminant = b * b - 4 * lengthSq * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const first = (-b - root) / (2 * lengthSq);
  const second = (-b + root) / (2 * lengthSq);
  const entry = first >= 0 && first <= 1 ? first : second >= 0 && second <= 1 ? second : null;
  return entry;
}

function segmentBoundsExit(origin, target, bounds) {
  if (!bounds) return null;
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const candidates = [];

  if (dx > 0 && target.x > bounds.maxX) {
    candidates.push({ side: "maxX", t: (bounds.maxX - origin.x) / dx });
  } else if (dx < 0 && target.x < bounds.minX) {
    candidates.push({ side: "minX", t: (bounds.minX - origin.x) / dx });
  }
  if (dz > 0 && target.z > bounds.maxZ) {
    candidates.push({ side: "maxZ", t: (bounds.maxZ - origin.z) / dz });
  } else if (dz < 0 && target.z < bounds.minZ) {
    candidates.push({ side: "minZ", t: (bounds.minZ - origin.z) / dz });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.t - b.t);
  const firstT = candidates[0].t;
  const firstHits = candidates.filter((candidate) => Math.abs(candidate.t - firstT) < 1e-6);
  const blocked = firstHits.some((candidate) => {
    const hitX = origin.x + dx * candidate.t;
    const hitZ = origin.z + dz * candidate.t;
    const coordinate = candidate.side.endsWith("X") ? hitZ : hitX;
    return !(bounds.openings ?? []).some((opening) => (
      opening?.side === candidate.side &&
      coordinate >= opening.min &&
      coordinate <= opening.max
    ));
  });
  return blocked ? clamp(firstT, 0, 1) : null;
}

/**
 * Camera rig ported from agentworld-test's ThirdPersonCamera, without the
 * source project's Rapier dependency. Collision is supplied as the target
 * project's XZ blocker circles and world bounds.
 */
export class ThirdPersonCamera {
  constructor({
    canvas = null,
    fov = 48,
    aspect = (globalThis.innerWidth || 1) / (globalThis.innerHeight || 1),
    near = 0.06,
    far = 80,
    distance = 4.8,
    minDistance = 2.5,
    maxDistance = 12,
    yaw = 0,
    pitch = 0.42,
    mouseSensitivity = 0.0025,
    lookOffset = new THREE.Vector3(0, 1.28, 0),
    positionLerp = 0.12,
    lookLerp = 0.16,
  } = {}) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.distance = distance;
    this.minDistance = minDistance;
    this.maxDistance = maxDistance;
    this.yaw = yaw;
    this.pitch = pitch;
    this.mouseSensitivity = mouseSensitivity;
    this.positionLerp = positionLerp;
    this.lookLerp = lookLerp;
    this.fovLerp = positionLerp;
    this.enabled = true;
    this.lookOffset = lookOffset.clone ? lookOffset.clone() : new THREE.Vector3(...lookOffset);
    this._target = new THREE.Vector3();
    this._smoothedLook = new THREE.Vector3();
    this._hasTarget = false;
    this._collisionResolver = null;
    this._collisionPadding = 0.32;
    this._boundaryPadding = 0.08;
    this._defaultFov = fov;
    this._targetFov = fov;
    this._lockedState = null;
    this._inputCanvas = canvas;
    this._onWheel = (event) => {
      if (!this.enabled) return;
      this.distance = clamp(
        this.distance + (Number(event.deltaY) || 0) * 0.01,
        this.minDistance,
        this.maxDistance,
      );
    };
    this._inputCanvas?.addEventListener("wheel", this._onWheel, { passive: true });
  }

  applyMouseDelta(dx, dy, sensitivity = this.mouseSensitivity) {
    if (!this.enabled) return;
    this.yaw -= (Number(dx) || 0) * sensitivity;
    this.pitch = clamp(this.pitch + (Number(dy) || 0) * sensitivity, -Math.PI / 3, Math.PI / 3);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  getHorizontalAngle() {
    return this.yaw;
  }

  getForward(target = new THREE.Vector3()) {
    return target.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  /** Set the camera orbit behind a character whose forward vector is `heading`. */
  setYawFromHeading(heading) {
    if (!heading || Math.hypot(heading.x, heading.z) < 1e-6) return;
    this.yaw = Math.atan2(-heading.x, -heading.z);
  }

  setCollisionResolver(resolver) {
    this._collisionResolver = typeof resolver === "function" ? resolver : null;
  }

  update(targetPosition, deltaOrOptions = 1 / 60, maybeOptions = {}) {
    const options = typeof deltaOrOptions === "number"
      ? (maybeOptions ?? {})
      : (deltaOrOptions ?? {});
    const delta = typeof deltaOrOptions === "number"
      ? deltaOrOptions
      : (options.delta ?? 1 / 60);
    const {
      groundHeightAt = null,
      blockers = [],
      bounds = null,
    } = options;
    const positionAlpha = smoothingAlpha(this.positionLerp, delta);
    const lookAlpha = smoothingAlpha(this.lookLerp, delta);
    const fovAlpha = smoothingAlpha(this.fovLerp, delta);

    if (this._lockedState) {
      const resolved = this._resolveDesiredPosition(
        this._lockedState.lookAt,
        this._lockedState.position,
        { blockers, bounds },
      );
      this._clampToGround(resolved, groundHeightAt);
      this.camera.position.lerp(resolved, positionAlpha);
      if (this.camera.position.y < 0.5) this.camera.position.y = 0.5;
      if (!this._hasTarget) {
        this._smoothedLook.copy(this._lockedState.lookAt);
        this._hasTarget = true;
      } else {
        this._smoothedLook.lerp(this._lockedState.lookAt, lookAlpha);
      }
      this._updateFov(fovAlpha);
      this.camera.lookAt(this._smoothedLook);
      return;
    }

    this._updateFov(fovAlpha);
    if (!targetPosition) return;
    this._target.copy(targetPosition).add(this.lookOffset);
    if (!this._hasTarget) {
      this._smoothedLook.copy(this._target);
      this._hasTarget = true;
    } else {
      this._smoothedLook.lerp(this._target, lookAlpha);
    }

    const desired = this._target.clone().add(this._computeOffset());
    const resolved = this._resolveDesiredPosition(this._target, desired, { blockers, bounds });
    this._clampToGround(resolved, groundHeightAt);
    this.camera.position.lerp(resolved, positionAlpha);
    if (this.camera.position.y < 0.5) this.camera.position.y = 0.5;
    this.camera.lookAt(this._smoothedLook);
  }

  snapTo(targetPosition, {
    yaw = this.yaw,
    pitch = this.pitch,
    distance = this.distance,
    groundHeightAt = null,
    blockers = [],
    bounds = null,
  } = {}) {
    if (!targetPosition) return;
    if (Number.isFinite(yaw)) this.yaw = yaw;
    if (Number.isFinite(pitch)) this.pitch = clamp(pitch, -Math.PI / 3, Math.PI / 3);
    if (Number.isFinite(distance)) this.distance = clamp(distance, this.minDistance, this.maxDistance);
    this._target.copy(targetPosition).add(this.lookOffset);
    this._smoothedLook.copy(this._target);
    const desired = this._target.clone().add(this._computeOffset());
    const resolved = this._resolveDesiredPosition(this._target, desired, { blockers, bounds });
    this._clampToGround(resolved, groundHeightAt);
    this.camera.position.copy(resolved);
    if (this.camera.position.y < 0.5) this.camera.position.y = 0.5;
    this.camera.lookAt(this._smoothedLook);
    this._hasTarget = true;
  }

  lockTo(position, lookAt, fov = 40) {
    const lockPosition = vectorFrom(position);
    const lockLookAt = vectorFrom(lookAt);
    if (!lockPosition || !lockLookAt) return false;
    this._lockedState = {
      position: lockPosition,
      lookAt: lockLookAt,
    };
    this._targetFov = Number.isFinite(fov) ? fov : 40;
    return true;
  }

  unlock(fov = this._defaultFov) {
    this._lockedState = null;
    this._targetFov = Number.isFinite(fov) ? fov : this._defaultFov;
  }

  resize(aspect) {
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this._inputCanvas?.removeEventListener("wheel", this._onWheel);
    this._inputCanvas = null;
    this._lockedState = null;
    this._collisionResolver = null;
  }

  _computeOffset() {
    return new THREE.Vector3(
      Math.sin(this.yaw) * this.distance,
      Math.tan(this.pitch) * this.distance,
      Math.cos(this.yaw) * this.distance,
    );
  }

  _resolveDesiredPosition(origin, desired, collisionOptions) {
    if (!this._collisionResolver) {
      return this._resolveCollision(origin, desired, collisionOptions);
    }
    const result = this._collisionResolver(origin.clone(), desired.clone(), this);
    return vectorFrom(result) ?? desired.clone();
  }

  _clampToGround(position, groundHeightAt) {
    if (groundHeightAt) {
      const groundY = groundHeightAt(position.x, position.z);
      if (Number.isFinite(groundY)) position.y = Math.max(position.y, groundY + 0.5);
    }
    if (!Number.isFinite(position.y) || position.y < 0.5) position.y = 0.5;
  }

  _updateFov(alpha) {
    const difference = this._targetFov - this.camera.fov;
    if (Math.abs(difference) <= 0.001) return;
    this.camera.fov += difference * alpha;
    if (Math.abs(this._targetFov - this.camera.fov) <= 0.01) {
      this.camera.fov = this._targetFov;
    }
    this.camera.updateProjectionMatrix();
  }

  _resolveCollision(origin, desired, { blockers = [], bounds = null } = {}) {
    const resolved = desired.clone();
    const dx = desired.x - origin.x;
    const dz = desired.z - origin.z;
    const length = Math.hypot(dx, dz);
    if (length > 1e-6) {
      let safeLength = length;
      for (const blocker of blockers ?? []) {
        const entry = segmentCircleEntry(origin, desired, blocker, this._collisionPadding);
        if (entry !== null) {
          safeLength = Math.min(
            safeLength,
            Math.max(0, length * entry - this._collisionPadding),
          );
        }
      }
      const boundsExit = segmentBoundsExit(origin, desired, bounds);
      if (boundsExit !== null) {
        safeLength = Math.min(
          safeLength,
          Math.max(0, length * boundsExit - this._boundaryPadding),
        );
      }
      if (safeLength < length) {
        resolved.x = origin.x + (dx / length) * safeLength;
        resolved.z = origin.z + (dz / length) * safeLength;
      }
    }
    return resolved;
  }
}

export { WORLD_UP };
