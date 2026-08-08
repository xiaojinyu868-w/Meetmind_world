const STALL_TRIGGER_SECONDS = 0.28;
const RECOVERY_SECONDS = 1.05;


export function createMovementRecoveryState({ side = 1 } = {}) {
  return {
    side: side < 0 ? -1 : 1,
    stalledFor: 0,
    recoveryUntil: 0,
  };
}


export function steerRecoveryStep(stepX, stepZ, state, now) {
  const length = Math.hypot(stepX, stepZ);
  if (length <= 1e-8 || !state || now >= state.recoveryUntil) {
    return [stepX, stepZ];
  }

  const forwardX = stepX / length;
  const forwardZ = stepZ / length;
  const lateralX = -forwardZ * state.side;
  const lateralZ = forwardX * state.side;
  // Keep some forward intent while committing to one side long enough to clear
  // another character or a piece of furniture. Re-picking the side every frame
  // is what caused the old left/right micro-jitter loop.
  const steeredX = forwardX * 0.28 + lateralX * 0.96;
  const steeredZ = forwardZ * 0.28 + lateralZ * 0.96;
  const steeredLength = Math.hypot(steeredX, steeredZ) || 1;
  return [
    (steeredX / steeredLength) * length,
    (steeredZ / steeredLength) * length,
  ];
}


export function observeMovementRecovery(
  state,
  {
    delta,
    now,
    distanceBefore,
    distanceAfter,
    requestedLength,
    actualLength,
  },
) {
  if (!state || requestedLength <= 1e-8) return false;
  const progress = distanceBefore - distanceAfter;
  const blocked = actualLength < requestedLength * 0.15;
  const notAdvancing = progress < Math.max(0.00015, actualLength * 0.06);

  if (blocked || notAdvancing) {
    state.stalledFor += Math.max(0, delta);
  } else {
    state.stalledFor = Math.max(0, state.stalledFor - Math.max(0, delta) * 2);
  }

  if (state.stalledFor < STALL_TRIGGER_SECONDS) return false;
  state.stalledFor = 0;
  state.recoveryUntil = Math.max(state.recoveryUntil, now + RECOVERY_SECONDS);
  return true;
}
