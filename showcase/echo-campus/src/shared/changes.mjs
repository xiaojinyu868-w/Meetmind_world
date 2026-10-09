// Live event changes. Every store version carries the operations that turn the
// previous public snapshot into this one, so phones receive a few hundred bytes
// per change instead of the whole roster. Shared by the server, the browser
// client and the tests.

/** Operation kinds, in the shape the server emits them. */
export const CHANGE = Object.freeze({
  attendee: "attendee", // { attendee } upsert of a public attendee
  attendeeRemoved: "attendeeRemoved", // { id } left or no longer listed
  connection: "connection", // { connection } a confirmed connection
  activity: "activity", // { activity } the whole checkpoint summary
  event: "event", // { event } the public event profile
  remote: "remote", // { remote } partner members shown on the map, or null
});

function insertBySerial(list, attendee) {
  const at = list.findIndex(item => (Number(item.serial) || 0) > (Number(attendee.serial) || 0));
  if (at < 0) list.push(attendee); else list.splice(at, 0, attendee);
}

function applyOp(next, op) {
  switch (op?.type) {
    case CHANGE.attendee: {
      if (!op.attendee?.id) return;
      const index = next.attendees.findIndex(item => item.id === op.attendee.id);
      if (index >= 0) next.attendees[index] = op.attendee; else insertBySerial(next.attendees, op.attendee);
      return;
    }
    case CHANGE.attendeeRemoved:
      next.attendees = next.attendees.filter(item => item.id !== op.id);
      next.connections = next.connections.filter(item => item.fromId !== op.id && item.toId !== op.id);
      return;
    case CHANGE.connection: {
      if (!op.connection?.id) return;
      const index = next.connections.findIndex(item => item.id === op.connection.id);
      if (index >= 0) next.connections[index] = op.connection; else next.connections.push(op.connection);
      return;
    }
    case CHANGE.activity: next.activity = op.activity ?? null; return;
    case CHANGE.event: if (op.event) next.event = op.event; return;
    case CHANGE.remote: next.remote = op.remote ?? null; return;
    default:
  }
}

/** An on-site attendee, or a partner member shown on the map, by id. */
export function findPerson(snapshot, id) {
  return snapshot?.attendees?.find(item => item.id === id) || snapshot?.remote?.members?.find(item => item.id === id) || null;
}

/**
 * Applies `entries` ([{ v, ops }], ascending) to `snapshot` without mutating it.
 * Versions at or below the snapshot's are skipped (already applied). A missing
 * version is a gap: the caller must fetch a full snapshot. Returns
 * { snapshot, changed, gap } where `snapshot` includes everything applied
 * before the gap.
 */
export function applyChanges(snapshot, entries = []) {
  if (!snapshot || !Number.isSafeInteger(snapshot.version)) return { snapshot, changed: false, gap: entries.length > 0 };
  let next = null, version = snapshot.version;
  for (const entry of entries) {
    if (!entry || !Number.isSafeInteger(entry.v) || entry.v <= version) continue;
    if (entry.v !== version + 1) return { snapshot: next || snapshot, changed: !!next, gap: true };
    next ||= { ...snapshot, attendees: [...snapshot.attendees], connections: [...snapshot.connections] };
    for (const op of Array.isArray(entry.ops) ? entry.ops : []) applyOp(next, op);
    version = entry.v;
    next.version = version;
  }
  return { snapshot: next || snapshot, changed: !!next, gap: false };
}
