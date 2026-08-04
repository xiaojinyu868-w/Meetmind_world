const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));


function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}


function unitRandom(random) {
  return Math.min(1 - Number.EPSILON, Math.max(0, finiteNumber(random(), 0.5)));
}


function blockerRadius(blocker) {
  return Math.max(0, finiteNumber(blocker?.r ?? blocker?.radius, 0));
}


function candidateIsSafe(
  candidate,
  {
    bounds,
    blockers,
    occupied,
    surfaceHeightAt,
    characterRadius,
    clearance,
    minSeparation,
  },
) {
  const inset = characterRadius + clearance;
  if (
    candidate.x < bounds.minX + inset ||
    candidate.x > bounds.maxX - inset ||
    candidate.z < bounds.minZ + inset ||
    candidate.z > bounds.maxZ - inset
  ) return false;
  if (!Number.isFinite(surfaceHeightAt(candidate.x, candidate.z))) return false;

  for (const blocker of blockers) {
    if (!Number.isFinite(blocker?.x) || !Number.isFinite(blocker?.z)) continue;
    const radius = blockerRadius(blocker);
    if (radius <= 0) continue;
    if (
      Math.hypot(candidate.x - blocker.x, candidate.z - blocker.z)
      < radius + characterRadius + clearance
    ) return false;
  }

  for (const other of occupied) {
    if (!Number.isFinite(other?.x) || !Number.isFinite(other?.z)) continue;
    const otherRadius = Math.max(0, finiteNumber(other.radius ?? other.r, characterRadius));
    const requiredDistance = Math.max(
      minSeparation,
      characterRadius + otherRadius + clearance,
    );
    if (
      Math.hypot(candidate.x - other.x, candidate.z - other.z)
      < requiredDistance
    ) return false;
  }
  return true;
}


export function createEntrySpawnScatter({
  count,
  bounds,
  blockers = [],
  occupied = [],
  surfaceHeightAt = () => 0,
  center = null,
  characterRadius = 0.28,
  clearance = 0.1,
  minSeparation = 0.72,
  maxRadius = 2.5,
  random = Math.random,
  attemptsPerSpawn = 120,
} = {}) {
  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError("Entry spawn count must be a non-negative integer");
  }
  if (!bounds || ![bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ].every(Number.isFinite)) {
    throw new TypeError("Entry spawn bounds are required");
  }
  if (count === 0) return [];

  const scatterCenter = {
    x: finiteNumber(center?.x, (bounds.minX + bounds.maxX) * 0.5),
    z: finiteNumber(center?.z, (bounds.minZ + bounds.maxZ) * 0.5),
  };
  const safeRadius = Math.max(minSeparation, finiteNumber(maxRadius, 2.5));
  const accepted = occupied
    .map((entry) => ({
      x: finiteNumber(entry?.x),
      z: finiteNumber(entry?.z),
      radius: Math.max(0, finiteNumber(entry?.radius ?? entry?.r, characterRadius)),
    }))
    .filter((entry) => entry.x !== null && entry.z !== null);
  const result = [];
  const randomRotation = unitRandom(random) * TAU;
  const safetyContext = {
    bounds,
    blockers,
    occupied: accepted,
    surfaceHeightAt,
    characterRadius,
    clearance,
    minSeparation,
  };

  const accept = (candidate) => {
    if (!candidateIsSafe(candidate, safetyContext)) return false;
    const yaw = Math.atan2(
      scatterCenter.x - candidate.x,
      scatterCenter.z - candidate.z,
    );
    const spawn = { x: candidate.x, z: candidate.z, yaw };
    result.push(spawn);
    accepted.push({ x: candidate.x, z: candidate.z, radius: characterRadius });
    return true;
  };

  for (let spawnIndex = 0; spawnIndex < count; spawnIndex += 1) {
    let placed = false;
    for (let attempt = 0; attempt < attemptsPerSpawn && !placed; attempt += 1) {
      const angle = unitRandom(random) * TAU;
      const radius = safeRadius * Math.sqrt(0.08 + unitRandom(random) * 0.92);
      placed = accept({
        x: scatterCenter.x + Math.cos(angle) * radius,
        z: scatterCenter.z + Math.sin(angle) * radius,
      });
    }

    for (let attempt = 0; attempt < 480 && !placed; attempt += 1) {
      const sequence = attempt + spawnIndex * 37;
      const angle = randomRotation + sequence * GOLDEN_ANGLE;
      const radius = safeRadius * Math.sqrt(0.08 + ((sequence * 0.61803398875) % 1) * 0.92);
      placed = accept({
        x: scatterCenter.x + Math.cos(angle) * radius,
        z: scatterCenter.z + Math.sin(angle) * radius,
      });
    }

    if (!placed) {
      throw new Error(
        `Unable to place ${count} characters safely near entry center `
          + `(${scatterCenter.x.toFixed(2)}, ${scatterCenter.z.toFixed(2)})`,
      );
    }
  }
  return result;
}
