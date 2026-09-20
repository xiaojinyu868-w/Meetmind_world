// Express distant shadow offsets in metres per shadow texel. The close garden
// retains its original contact-shadow tuning; no model geometry is displaced.
export function eventShadowTuning({ wide = false, span, mapSize, near, far, sunDirection } = {}) {
  if (!wide) return { bias: -.00006, normalBias: .025, radius: 3 };
  if (![span, mapSize, near, far].every(Number.isFinite) || span <= 0 || mapSize <= 0 || far <= near) {
    throw new Error("Shadow tuning requires positive coverage, resolution and depth range");
  }
  const { x, y, z } = sunDirection || {};
  if (![x, y, z].every(Number.isFinite) || y <= 0) throw new Error("Shadow tuning requires an above-horizon sun direction");
  const worldTexel = span * 2 / mapSize;
  // A grazing light magnifies a flat receiver's depth slope. Limit that slope
  // compensation so future sky choices cannot grow it without a bound.
  const slope = Math.min(4, Math.hypot(x, z) / y);
  const depthBiasMeters = worldTexel * 1.1 * slope + .02;
  return {
    bias: -depthBiasMeters / (far - near),
    // Imported CAD includes double-sided roofs whose stored normal points down.
    // Offsetting along it pushes those receivers into the shadow caster; use
    // light-space depth compensation instead of moving along that normal.
    normalBias: 0,
    radius: .75,
    worldTexel,
    depthBiasMeters,
  };
}
