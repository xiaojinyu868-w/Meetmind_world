import * as THREE from "three";

// Keep a person centered in the unobscured viewport for every world heading.
export function profileCameraPreset({ position, yaw = 0, aspect = 1, panelFraction = 0, neighbors = [] }) {
  const candidates = [0.55, -0.55, 1.05, -1.05, 0].map((angle, index) => {
  const heading = yaw + angle, fov = 43, distance = 3.4;
  const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const target = new THREE.Vector3(position.x, position.y + 1.03, position.z);
  const camera = target.clone().addScaledVector(forward, distance);
  const halfWidth = distance * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect;
  const shift = halfWidth * Math.min(0.6, Math.max(0, panelFraction));
  target.addScaledVector(right, shift);
  camera.addScaledVector(right, shift);
  const probe = new THREE.PerspectiveCamera(fov, aspect, 0.05, 100);
  probe.position.copy(camera);probe.lookAt(target);probe.updateMatrixWorld();
  const subject = new THREE.Vector3(position.x, position.y + 1.03, position.z).project(probe);
  let score = index * 0.02;
  for (const neighbor of neighbors) {
    const torso = new THREE.Vector3(neighbor.x, neighbor.y + 1.05, neighbor.z);
    const depth = torso.clone().applyMatrix4(probe.matrixWorldInverse).z;
    const projected = torso.clone().project(probe);
    if (depth < 0 && depth > -distance - 0.5 && Math.abs(projected.y) < 1.3) {
      const radius = 0.5 / Math.max(0.25, -depth * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect);
      score += Math.max(0, radius + 0.14 - Math.abs(projected.x - subject.x)) * 20;
    }
  }
  return { position: camera.toArray(), target: target.toArray(), fov, score };
  });
  candidates.sort((a,b)=>a.score-b.score);
  const {score,...preset}=candidates[0];return preset;
}
