import {
  blockerFootprint,
  capsuleHorizontalCollisionRadius,
  capsuleFootprint,
} from "./CharacterCapsule.js";


const DEFAULT_MARGIN = 0.05;


/**
 * Projects a horizontal step along blockers instead of stopping at the first hit.
 * Static scene blockers may be circles; moving characters are vertical capsules.
 */
export function slideStepAroundBlockers(
  x,
  z,
  stepX,
  stepZ,
  blockers,
  {
    margin = DEFAULT_MARGIN,
    moverRadius = 0,
    moverMinY = -Infinity,
    moverMaxY = Infinity,
    ignore = null,
  } = {},
) {
  let sx = stepX;
  let sz = stepZ;
  const moverRange = { minY: moverMinY, maxY: moverMaxY };
  for (const blocker of blockers ?? []) {
    if (ignore && (ignore.has?.(blocker) || ignore === blocker)) continue;
    const data = blockerFootprint(blocker);
    if (!data || data.radius <= 0) continue;
    const moverData = {
      ...moverRange,
      radius: moverRadius,
      segmentMinY: moverMinY + moverRadius,
      segmentMaxY: moverMaxY - moverRadius,
      capsule: Number.isFinite(moverMinY) && Number.isFinite(moverMaxY),
    };
    const collisionRadius = capsuleHorizontalCollisionRadius(moverData, data, margin);
    if (collisionRadius <= 0) continue;

    const nextDistance = Math.hypot(x + sx - data.x, z + sz - data.z);
    if (nextDistance >= collisionRadius) continue;

    let radialX = x - data.x;
    let radialZ = z - data.z;
    const radialLength = Math.hypot(radialX, radialZ);
    if (radialLength < 1e-4) {
      const stepLength = Math.hypot(sx, sz);
      radialX = stepLength > 1e-8 ? -sx / stepLength : 1;
      radialZ = stepLength > 1e-8 ? -sz / stepLength : 0;
    } else {
      radialX /= radialLength;
      radialZ /= radialLength;
    }

    const stepLength = Math.hypot(sx, sz);
    if (stepLength < 1e-8) break;
    if (radialLength < collisionRadius - margin) {
      sx = radialX * stepLength;
      sz = radialZ * stepLength;
      continue;
    }

    const tangentX = -radialZ;
    const tangentZ = radialX;
    const tangentDot = sx * tangentX + sz * tangentZ;
    if (Math.abs(tangentDot) < 1e-4) {
      const cross = (data.x - x) * stepZ - (data.z - z) * stepX;
      const side = Math.abs(cross) < 1e-5 ? 1 : Math.sign(cross);
      sx = tangentX * stepLength * side;
      sz = tangentZ * stepLength * side;
    } else {
      sx = tangentX * tangentDot;
      sz = tangentZ * tangentDot;
    }
  }
  return [sx, sz];
}


export function slideCapsuleStepAroundBlockers(
  mover,
  stepX,
  stepZ,
  blockers,
  options = {},
) {
  const footprint = capsuleFootprint(mover);
  if (!footprint) return [0, 0];
  return slideStepAroundBlockers(
    footprint.x,
    footprint.z,
    stepX,
    stepZ,
    blockers,
    {
      ...options,
      moverRadius: footprint.radius,
      moverMinY: footprint.minY,
      moverMaxY: footprint.maxY,
    },
  );
}
