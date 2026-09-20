import * as THREE from "three";

// Use the actual backing bounds: bevels extend beyond its nominal depth.
export function placeSignSurface(face, backingGeometry, direction = 1) {
  backingGeometry.computeBoundingBox();
  const edge = direction > 0 ? backingGeometry.boundingBox.max.z : backingGeometry.boundingBox.min.z;
  face.position.z = edge + direction * .008;
  face.rotation.y = direction > 0 ? 0 : Math.PI;
  face.material.side = THREE.FrontSide;
  face.material.polygonOffset = true;
  face.material.polygonOffsetFactor = -1;
  face.material.polygonOffsetUnits = -1;
  face.castShadow = false;
  face.receiveShadow = false;
  face.userData.signSurface = true;
  return face;
}
