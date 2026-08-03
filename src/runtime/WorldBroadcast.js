export const BROADCAST_SCHEMA = "echo-broadcast.v1";


function nonEmpty(value, maxLength = 240) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, maxLength) : null;
}


export function normalizeWorldBroadcast(raw) {
  if (!raw || typeof raw !== "object" || raw.schema !== BROADCAST_SCHEMA) return null;
  const ticker = (Array.isArray(raw.ticker) ? raw.ticker : [])
    .slice(-8)
    .map((item) => {
      const id = nonEmpty(item?.id, 80);
      const type = nonEmpty(item?.type, 80);
      const text = nonEmpty(item?.text, 240);
      const occurredAt = nonEmpty(item?.occurred_at, 64);
      if (!id || !type || !text || !occurredAt) return null;
      return Object.freeze({ id, type, text, occurredAt, tick: Number(item.tick) || 0 });
    })
    .filter(Boolean);
  const sourceMorning = raw.morning;
  const date = nonEmpty(sourceMorning?.date, 10);
  const period = nonEmpty(sourceMorning?.period, 10);
  const title = nonEmpty(sourceMorning?.title, 80);
  const summary = nonEmpty(sourceMorning?.summary, 240);
  if (!date || !period || !title || !summary) return null;
  const morning = Object.freeze({
    date,
    period,
    title,
    summary,
    items: (Array.isArray(sourceMorning.items) ? sourceMorning.items : [])
      .map((item) => nonEmpty(item, 240))
      .filter(Boolean)
      .slice(0, 4),
    newEncounters: Math.max(0, Number(sourceMorning.new_encounters) || 0),
    worldEvents: Math.max(0, Number(sourceMorning.world_events) || 0),
  });
  return Object.freeze({ schema: BROADCAST_SCHEMA, ticker: Object.freeze(ticker), morning });
}


export function morningStorageKey(worldId, date) {
  return `echoworld:morning:${String(worldId || "world")}:${String(date || "unknown")}`;
}


export function shouldShowMorning(report, worldId, storage = globalThis.localStorage) {
  if (!report?.date || !storage?.getItem) return Boolean(report?.date);
  return storage.getItem(morningStorageKey(worldId, report.date)) !== "seen";
}


export function markMorningSeen(report, worldId, storage = globalThis.localStorage) {
  if (!report?.date || !storage?.setItem) return false;
  storage.setItem(morningStorageKey(worldId, report.date), "seen");
  return true;
}
