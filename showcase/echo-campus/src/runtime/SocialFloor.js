// Conversation clusters on the calibrated event floor. The plan depends only
// on the venue config, so every phone and the big screen derive the same
// slots and an attendee stands in the same place everywhere.
const TAU = Math.PI * 2;

function hash(a, b) {
  let h = Math.imul(a + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** Plans pairs that grow into trios: slot order fills the first two members of
 * every cluster (nearest the focus first), then the third members. */
export function planSocialFloor({ bounds, colliders = [], reserved = [], focus = null, groundY = 0, clusterGap = 3.4, radius = 0.72, margin = 0.7, personRadius = 0.34, reservedGap = 1.15 } = {}) {
  const b = bounds;
  if (!b || ![b.minX, b.maxX, b.minZ, b.maxZ].every(Number.isFinite) || b.maxX - b.minX < 2 || b.maxZ - b.minZ < 2) return { slots: [], clusters: [] };
  const fx = focus?.x ?? (b.minX + b.maxX) / 2, fz = focus?.z ?? (b.minZ + b.maxZ) / 2;
  const inside = (x, z) => x >= b.minX + margin && x <= b.maxX - margin && z >= b.minZ + margin && z <= b.maxZ - margin;
  const clear = (x, z) => colliders.every(c => Math.hypot(x - c.x, z - c.z) >= (c.r ?? c.radius ?? 0) + personRadius + 0.12)
    && reserved.every(p => Math.hypot(x - p.x, z - p.z) >= reservedGap);
  const clusters = [];
  const rowStep = clusterGap * Math.sqrt(3) / 2;
  for (let row = 0, z = b.minZ + margin + radius; z <= b.maxZ - margin - radius + 1e-6; row++, z += rowStep) {
    for (let col = 0, x = b.minX + margin + radius + (row % 2 ? clusterGap / 2 : 0); x <= b.maxX - margin - radius + 1e-6; col++, x += clusterGap) {
      const cx = x + (hash(row, col) - 0.5) * 0.7, cz = z + (hash(col, row) - 0.5) * 0.6;
      const base = hash(row * 31 + 7, col * 17 + 3) * TAU;
      const members = [0, 1, 2].map(k => {
        const angle = base + k * TAU / 3;
        const px = cx + Math.sin(angle) * radius, pz = cz + Math.cos(angle) * radius;
        return { x: +px.toFixed(3), y: groundY, z: +pz.toFixed(3), yaw: Math.atan2(cx - px, cz - pz) };
      }).filter(m => inside(m.x, m.z) && clear(m.x, m.z));
      if (members.length >= 2) clusters.push({ x: cx, z: cz, members, distance: Math.hypot(cx - fx, cz - fz) });
    }
  }
  clusters.sort((a, c) => a.distance - c.distance);
  const slots = [];
  for (const cluster of clusters) slots.push(cluster.members[0], cluster.members[1]);
  for (const cluster of clusters) if (cluster.members[2]) slots.push(cluster.members[2]);
  return { slots, clusters };
}

/** Real arrivals take slots from the center outward by arrival number; demo
 * fill-ins take them from the outer edge, so guests always get the heart of
 * the court. Occupied slots are skipped, so nobody ever stands inside someone. */
export function socialSlotFor(plan, person, occupied = [], { firstRealSerial = 16, gap = 0.95 } = {}) {
  const slots = plan?.slots || [];
  if (!slots.length) return null;
  const serial = Number(person?.serial) || 0;
  const curated = person?.source === "curated-demo";
  const start = curated ? slots.length - 1 - (serial % slots.length) : Math.max(0, serial - firstRealSerial) % slots.length;
  const step = curated ? -1 : 1;
  for (let k = 0; k < slots.length; k++) {
    const slot = slots[((start + step * k) % slots.length + slots.length) % slots.length];
    if (occupied.every(p => Math.hypot(p.x - slot.x, p.z - slot.z) >= gap)) return { ...slot };
  }
  return null;
}
