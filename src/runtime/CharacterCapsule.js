import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";


export const DEFAULT_CHARACTER_COLLIDER = Object.freeze({
  radius: 0.28,
  standingHeight: 1.72,
  seatedHeight: 1.08,
});

const EPSILON = 1e-5;


function finiteOr(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}


function capsuleFor(value) {
  if (!value) return null;
  if (value instanceof Capsule) return value;
  if (value.capsule instanceof Capsule) return value.capsule;
  if (
    value.start?.isVector3 &&
    value.end?.isVector3 &&
    Number.isFinite(value.radius)
  ) return value;
  return null;
}


export function capsuleFootprint(value) {
  const capsule = capsuleFor(value);
  if (!capsule) return null;
  return {
    x: (capsule.start.x + capsule.end.x) * 0.5,
    z: (capsule.start.z + capsule.end.z) * 0.5,
    radius: Math.max(0, capsule.radius),
    segmentMinY: Math.min(capsule.start.y, capsule.end.y),
    segmentMaxY: Math.max(capsule.start.y, capsule.end.y),
    minY: Math.min(capsule.start.y, capsule.end.y) - capsule.radius,
    maxY: Math.max(capsule.start.y, capsule.end.y) + capsule.radius,
    capsule,
  };
}


export function blockerFootprint(value) {
  const capsule = capsuleFor(value);
  if (capsule) {
    const footprint = capsuleFootprint(capsule);
    return { ...footprint, capsule };
  }
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.z)) return null;
  return {
    x: value.x,
    z: value.z,
    radius: Math.max(0, finiteOr(value.r ?? value.radius, 0)),
    minY: Number.isFinite(value.minY) ? value.minY : -Infinity,
    maxY: Number.isFinite(value.maxY) ? value.maxY : Infinity,
    segmentMinY: Number.isFinite(value.minY) ? value.minY : -Infinity,
    segmentMaxY: Number.isFinite(value.maxY) ? value.maxY : Infinity,
    capsule: null,
  };
}


function verticalSegmentGap(first, second) {
  if (!first.capsule || !second.capsule) return 0;
  return Math.max(
    0,
    first.segmentMinY - second.segmentMaxY,
    second.segmentMinY - first.segmentMaxY,
  );
}


export function capsuleHorizontalCollisionRadius(first, second, margin = 0) {
  const combinedRadius = first.radius + second.radius + margin;
  const verticalGap = verticalSegmentGap(first, second);
  if (verticalGap >= combinedRadius) return 0;
  return Math.sqrt(Math.max(0, combinedRadius ** 2 - verticalGap ** 2));
}


export function capsuleIntersectsAt(mover, x, z, blocker, { margin = 0 } = {}) {
  const moverFootprint = capsuleFootprint(mover);
  const blockerData = blockerFootprint(blocker);
  if (!moverFootprint || !blockerData) return false;
  const candidate = { ...moverFootprint, x, z };
  const horizontalRadius = capsuleHorizontalCollisionRadius(candidate, blockerData, margin);
  if (horizontalRadius <= 0) return false;
  return Math.hypot(x - blockerData.x, z - blockerData.z)
    < horizontalRadius;
}


export function capsuleFitsAt(
  mover,
  x,
  z,
  blockers = [],
  {
    bounds = null,
    margin = 0,
    ignore = null,
  } = {},
) {
  return capsulePenetrationAt(mover, x, z, blockers, {
    bounds,
    margin,
    ignore,
  }) <= EPSILON;
}


export function capsulePenetrationAt(
  mover,
  x,
  z,
  blockers = [],
  {
    bounds = null,
    margin = 0,
    ignore = null,
  } = {},
) {
  const moverFootprint = capsuleFootprint(mover);
  if (!moverFootprint) return Infinity;
  let penetration = 0;
  if (bounds) {
    penetration += Math.max(0, bounds.minX + moverFootprint.radius + margin - x);
    penetration += Math.max(0, x - (bounds.maxX - moverFootprint.radius - margin));
    penetration += Math.max(0, bounds.minZ + moverFootprint.radius + margin - z);
    penetration += Math.max(0, z - (bounds.maxZ - moverFootprint.radius - margin));
  }
  for (const blocker of blockers ?? []) {
    if (ignore && (ignore.has?.(blocker) || ignore === blocker)) continue;
    const data = blockerFootprint(blocker);
    if (!data || data.radius <= 0) continue;
    const candidate = { ...moverFootprint, x, z };
    const horizontalRadius = capsuleHorizontalCollisionRadius(candidate, data, margin);
    if (horizontalRadius <= 0) continue;
    penetration += Math.max(
      0,
      horizontalRadius - Math.hypot(x - data.x, z - data.z),
    );
  }
  return penetration;
}


export class CharacterCapsuleCollider {
  constructor({
    radius = DEFAULT_CHARACTER_COLLIDER.radius,
    standingHeight = DEFAULT_CHARACTER_COLLIDER.standingHeight,
    seatedHeight = DEFAULT_CHARACTER_COLLIDER.seatedHeight,
  } = {}) {
    this.localRadius = Math.max(EPSILON, finiteOr(radius, DEFAULT_CHARACTER_COLLIDER.radius));
    this.localStandingHeight = Math.max(
      this.localRadius * 2,
      finiteOr(standingHeight, DEFAULT_CHARACTER_COLLIDER.standingHeight),
    );
    this.localSeatedHeight = Math.max(
      this.localRadius * 2,
      finiteOr(seatedHeight, DEFAULT_CHARACTER_COLLIDER.seatedHeight),
    );
    this.radius = this.localRadius;
    this.height = this.localStandingHeight;
    this.posture = "standing";
    this.groundY = 0;
    this.capsule = new Capsule(
      new THREE.Vector3(0, this.radius, 0),
      new THREE.Vector3(0, this.height - this.radius, 0),
      this.radius,
    );
  }

  sync(entityOrRoot, posture = null) {
    const root = entityOrRoot?.root ?? entityOrRoot;
    if (!root?.position) return this;
    const requestedPosture = posture
      ?? entityOrRoot?.animation?.posture
      ?? root.userData.characterPosture
      ?? "standing";
    this.posture = requestedPosture === "seated" ? "seated" : "standing";
    const horizontalScale = Math.max(EPSILON, Math.abs(root.scale?.x ?? 1));
    const verticalScale = Math.max(EPSILON, Math.abs(root.scale?.y ?? 1));
    this.radius = this.localRadius * horizontalScale;
    const localHeight = this.posture === "seated"
      ? this.localSeatedHeight
      : this.localStandingHeight;
    this.height = Math.max(this.radius * 2, localHeight * verticalScale);
    this.groundY = finiteOr(entityOrRoot?.baseY, root.position.y);
    const centerX = root.position.x;
    const centerZ = root.position.z;
    const segmentLength = Math.max(0, this.height - this.radius * 2);
    this.capsule.radius = this.radius;
    this.capsule.start.set(centerX, this.groundY + this.radius, centerZ);
    this.capsule.end.set(
      centerX,
      this.groundY + this.radius + segmentLength,
      centerZ,
    );
    root.userData.characterCollider = "capsule";
    root.userData.characterColliderRadius = this.radius;
    root.userData.characterColliderHeight = this.height;
    return this;
  }

  clone() {
    const copy = new CharacterCapsuleCollider({
      radius: this.localRadius,
      standingHeight: this.localStandingHeight,
      seatedHeight: this.localSeatedHeight,
    });
    copy.radius = this.radius;
    copy.height = this.height;
    copy.posture = this.posture;
    copy.groundY = this.groundY;
    copy.capsule.copy(this.capsule);
    return copy;
  }
}
