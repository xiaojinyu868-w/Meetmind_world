const SEATED_STATES = new Set(["seated", "talking", "in-meeting"]);
export const MEETING_SEAT_SETTLE_TIMEOUT = 8;


export function seatKeyForTarget(target) {
  if (!target) return null;
  const tableId = target.seat?.tableId;
  const seatIndex = target.seat?.seatIndex;
  if (tableId && Number.isInteger(seatIndex)) return `${tableId}:${seatIndex}`;
  if (!SEATED_STATES.has(target.state)) return null;
  if (!Number.isFinite(target.x) || !Number.isFinite(target.z)) return null;
  return `position:${target.x.toFixed(1)}:${target.z.toFixed(1)}`;
}


export function roomMeetingSeatFor(memberId, participantIds, seats) {
  const index = participantIds?.indexOf(memberId) ?? -1;
  if (index < 0 || !Array.isArray(seats) || !seats[index]) return null;
  return { seat: seats[index], seatIndex: index };
}


export function shouldForceMeetingSeat({ state, elapsed, assignedAt, timeout = MEETING_SEAT_SETTLE_TIMEOUT }) {
  return state === "in-meeting"
    && Number.isFinite(elapsed)
    && Number.isFinite(assignedAt)
    && elapsed - assignedAt >= timeout;
}


export function isMeetingActorReady({
  target,
  currentSeatKey,
  animationReady,
  roundtableId,
}) {
  if (!animationReady || target?.state !== "in-meeting") return false;
  if (target.seat?.tableId !== roundtableId) return false;
  const expectedSeatKey = seatKeyForTarget(target);
  return expectedSeatKey !== null && currentSeatKey === expectedSeatKey;
}
