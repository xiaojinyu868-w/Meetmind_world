import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

function signedAngle(a, b) {
  return Math.atan2(a.z * b.x - a.x * b.z, a.x * b.x + a.z * b.z);
}

/** Convert local W/A/S/D input into a direction relative to camera yaw. */
export function cameraRelativeDirection(input, yaw, target = new THREE.Vector3()) {
  const localX = Number(input?.x) || 0;
  const localZ = Number(input?.y) || 0;
  const length = Math.hypot(localX, localZ);
  const x = length > 1 ? localX / length : localX;
  const z = length > 1 ? localZ / length : localZ;
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  return target.set(
    forwardX * z + forwardZ * x,
    0,
    forwardZ * z - forwardX * x,
  );
}

/**
 * Small spring-backed locomotion state. A/D choose a new forward direction,
 * matching agentworld-test, so the character turns and walks instead of
 * strafing sideways.
 */
export class CameraRelativeMovement {
  constructor({ speed = 2.7, runSpeed = speed * 1.45, turnStiffness = 34, turnDamping = 11 } = {}) {
    this.speed = speed;
    this.runSpeed = runSpeed;
    this.turnStiffness = turnStiffness;
    this.turnDamping = turnDamping;
    this.orientation = new THREE.Vector3(0, 0, -1);
    this.targetOrientation = this.orientation.clone();
    this.angularVelocity = 0;
  }

  reset(orientation = new THREE.Vector3(0, 0, -1)) {
    this.orientation.copy(orientation).setY(0);
    if (this.orientation.lengthSq() < 1e-6) this.orientation.set(0, 0, -1);
    this.orientation.normalize();
    this.targetOrientation.copy(this.orientation);
    this.angularVelocity = 0;
  }

  update(dt, input, yaw, { run = false } = {}) {
    const local = new THREE.Vector2(Number(input?.x) || 0, Number(input?.y) || 0);
    if (local.lengthSq() > 1) local.normalize();
    const moving = local.lengthSq() > 0.0025;
    if (moving) {
      cameraRelativeDirection(local, yaw, this.targetOrientation).normalize();
    }
    const frameDt = Math.min(Math.max(Number(dt) || 0, 0), 0.05);
    const desiredAngle = signedAngle(this.orientation, this.targetOrientation);
    this.angularVelocity += desiredAngle * this.turnStiffness * frameDt;
    this.angularVelocity *= Math.exp(-this.turnDamping * frameDt);
    this.orientation.applyAxisAngle(UP, this.angularVelocity * frameDt);
    this.orientation.normalize();
    return {
      moving,
      direction: this.orientation.clone(),
      targetDirection: this.targetOrientation.clone(),
      speed: run ? this.runSpeed : this.speed,
      input: local,
    };
  }
}
