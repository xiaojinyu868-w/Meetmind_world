// Presentation-only ensemble. The event snapshot, matching and attendee records
// remain complete; this module only picks meshes and poses for the current view.
export const DEMO_SOCIAL_PAIRS = Object.freeze([
  Object.freeze(["seed-01", "seed-02"]),
  Object.freeze(["seed-03", "seed-04"]),
  Object.freeze(["seed-10", "seed-12"]),
]);
const DEMO_IDS = new Set(DEMO_SOCIAL_PAIRS.flat());
const PAIR_CENTERS = Object.freeze({
  "venue-ab-canopy": Object.freeze([[83.5, 205.1, .10], [90, 208.65, 1.12], [65.1, 205.25, 1.25]].map(Object.freeze)),
  "venue-ab-towers": Object.freeze([[56.9, -221, .22], [48, -225, 1.25], [59, -230, .15]].map(Object.freeze)),
  "venue-c": Object.freeze([[57.5, 30.1, .20], [49, 29.1, .30], [63, 25.4, 1.20]].map(Object.freeze)),
});
const PAIR_DISTANCE = 1.5;
const TALK_SECONDS = 4.5;
const HANDOFF_SECONDS = 1;
const REST_SECONDS = 8;
const CYCLE_SECONDS = TALK_SECONDS * 2 + HANDOFF_SECONDS + REST_SECONDS;

/** Actual device attendees can also have synthetic:true. Only curated-demo is
 * a fictional fixture. Budget is mesh LOD only, never a data/deletion policy.
 * Selected and self always fit, even when they exceed a very small budget.
 * Returns the original DTO references in snapshot order, without mutation.
 */
export function visibleSocialAttendees(snapshotAttendees, { selectedId = null, selfId = null, maxRendered = 36 } = {}) {
  const input = Array.isArray(snapshotAttendees) ? snapshotAttendees : [];
  const unique = new Map();
  for (const person of input) if (person && typeof person.id === "string" && person.id && !unique.has(person.id)) unique.set(person.id, person);
  const people = [...unique.values()];
  const requested = Number(maxRendered);
  const limit = requested === Infinity ? Infinity : Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 36;
  const chosen = new Set([selfId, selectedId].filter(id => unique.has(id)));
  const candidates = [
    ...people.filter(person => person.source !== "curated-demo"),
    ...people.filter(person => person.source === "curated-demo" && DEMO_IDS.has(person.id)),
  ];
  for (const person of candidates) {
    if (chosen.has(person.id)) continue;
    if (chosen.size >= limit) break;
    chosen.add(person.id);
  }
  return people.filter(person => chosen.has(person.id));
}

/** Stable identity preserves the existing seed-XX presentation (index + 23).
 * Non-fixture IDs use a deterministic hash, never their filtered display index.
 */
export function stablePersonSeed(id) {
  const value = String(id ?? "");
  const fixture = /^seed-(\d+)$/.exec(value);
  if (fixture) {
    const serial = Number(fixture[1]);
    if (Number.isSafeInteger(serial) && serial > 0 && serial < 1000000) return serial + 22;
  }
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619) >>> 0;
  return hash || 1;
}

/** Curated pairs are authored near the actual arrival views. Call only for
 * curated-demo DTOs. Unknown IDs/venues return null so the caller can use its
 * existing calibrated real-attendee allocation; no modulo/overlap fallback.
 */
export function demoSocialPose(personId, venueId, groundY = 0) {
  const pairIndex = DEMO_SOCIAL_PAIRS.findIndex(pair => pair.includes(personId));
  const centers = PAIR_CENTERS[venueId === "venue-campus" ? "venue-ab-canopy" : venueId];
  if (pairIndex < 0 || !centers || !Number.isFinite(groundY)) return null;
  const member = DEMO_SOCIAL_PAIRS[pairIndex].indexOf(personId);
  const [cx, cz, axis] = centers[pairIndex];
  const sign = member ? 1 : -1;
  const dx = sign * PAIR_DISTANCE / 2 * Math.cos(axis);
  const dz = sign * PAIR_DISTANCE / 2 * Math.sin(axis);
  return {
    x: cx + dx, y: groundY, z: cz + dz,
    yaw: Math.atan2(-2 * dx, -2 * dz) + (member ? .06 : -.06),
  };
}

/** Frame-independent intent, not animation playback: transition mixers only
 * when this value changes. Each pair has 4.5s A, 1s handoff, 4.5s B, 8s quiet;
 * three pairs are offset by 6s. Wave/selection remains a caller-side override.
 * Unrecognized IDs (including real attendees) never acquire fake conversation.
 */
export function conversationIntent(personId, timeSeconds) {
  const pairIndex = DEMO_SOCIAL_PAIRS.findIndex(pair => pair.includes(personId));
  if (pairIndex < 0 || !Number.isFinite(timeSeconds) || timeSeconds < 0) return "idle";
  const phase = (timeSeconds + pairIndex * 6) % CYCLE_SECONDS;
  const member = DEMO_SOCIAL_PAIRS[pairIndex].indexOf(personId);
  const speaking = member === 0
    ? phase < TALK_SECONDS
    : phase >= TALK_SECONDS + HANDOFF_SECONDS && phase < TALK_SECONDS * 2 + HANDOFF_SECONDS;
  return speaking ? "talking" : "idle";
}
