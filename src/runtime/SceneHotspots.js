const HOTSPOT_ACTIONS = new Set([
  "context-menu",
  "meeting",
  "recall-memory",
  "open-package",
  "invite-to-cafe",
]);


function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}


function normalizeCommand(raw, expectedKey) {
  if (!raw || typeof raw !== "object" || raw.key !== expectedKey) return null;
  const action = String(raw.action ?? "").trim();
  const label = String(raw.label ?? "").trim();
  if (!HOTSPOT_ACTIONS.has(action) || !label) return null;
  return Object.freeze({ key: expectedKey, action, label: label.slice(0, 24) });
}


export function normalizeSceneHotspot(module) {
  const interaction = module?.interaction;
  const x = finiteNumber(module?.position?.x);
  const z = finiteNumber(module?.position?.z);
  const radius = finiteNumber(interaction?.radius);
  const primary = normalizeCommand(interaction?.primary, "E");
  const secondary = normalizeCommand(interaction?.secondary, "F");
  const label = String(interaction?.label ?? "").trim();
  if (
    typeof module?.id !== "string" || !module.id.trim() ||
    x === null || z === null || radius === null || radius < 0.5 || radius > 5 ||
    !label || !primary || !secondary
  ) return null;
  return Object.freeze({
    id: module.id,
    type: String(module.type ?? "module"),
    personId: typeof module.person_id === "string" ? module.person_id : null,
    x,
    z,
    radius,
    label: label.slice(0, 40),
    primary,
    secondary,
  });
}


export function normalizeSceneHotspots(modules) {
  return (Array.isArray(modules) ? modules : [])
    .map(normalizeSceneHotspot)
    .filter(Boolean);
}


export function nearestSceneHotspot(hotspots, position) {
  const x = finiteNumber(position?.x);
  const z = finiteNumber(position?.z);
  if (x === null || z === null) return null;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const hotspot of Array.isArray(hotspots) ? hotspots : []) {
    const distance = Math.hypot(x - hotspot.x, z - hotspot.z);
    if (distance <= hotspot.radius && distance < nearestDistance) {
      nearest = hotspot;
      nearestDistance = distance;
    }
  }
  return nearest ? Object.freeze({ ...nearest, distance: nearestDistance }) : null;
}
