export const PERSON_SIGNAL_SCHEMA_VERSION = "person-signal.v1";

const EVENT_TYPES = Object.freeze({
  snapshot: new Set(["person.signal.snapshot", "person.signal.updated"]),
  patch: new Set(["person.signal.patch"]),
  inference: new Set(["person.inference.updated"]),
  iceBreak: new Set(["person.iceBreak.detected"]),
  revoke: new Set(["person.consent.revoked"]),
});
const HEART_TRENDS = new Set([
  "rising",
  "steady",
  "falling",
  "stable",
  "settling",
  "unknown",
]);


function optionalNumber(value, min = -Infinity, max = Infinity) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(max, Math.max(min, numeric));
}


function timestampValue(value, fallback = null) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
}


function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}


function mergeSignal(previous = {}, patch = {}) {
  return {
    ...previous,
    ...patch,
    heart: { ...(previous.heart ?? {}), ...(patch.heart ?? {}) },
    metrics: { ...(previous.metrics ?? {}), ...(patch.metrics ?? {}) },
    inference: { ...(previous.inference ?? {}), ...(patch.inference ?? {}) },
    iceBreak: { ...(previous.iceBreak ?? {}), ...(patch.iceBreak ?? {}) },
    sourceRefs: { ...(previous.sourceRefs ?? {}), ...(patch.sourceRefs ?? {}) },
  };
}


export function normalizePersonSignal(input, previous = null) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Person signal must be an object");
  }
  const merged = mergeSignal(previous ?? {}, input);
  const personId = String(merged.personId ?? merged.person_id ?? "").trim();
  if (!personId) throw new TypeError("Person signal requires personId");

  const capturedAt = timestampValue(
    merged.capturedAt ?? merged.captured_at,
    previous?.capturedAt ?? null,
  );
  if (!capturedAt) throw new TypeError("Person signal requires a valid capturedAt");

  const heart = merged.heart ?? {};
  const metrics = merged.metrics ?? {};
  const inference = merged.inference ?? {};
  const iceBreak = merged.iceBreak ?? {};
  const sourceRefs = merged.sourceRefs ?? {};
  const trend = String(heart.trend ?? "unknown");

  return deepFreeze({
    schemaVersion: PERSON_SIGNAL_SCHEMA_VERSION,
    personId,
    capturedAt,
    status: String(merged.status ?? "recent"),
    heart: {
      currentBpm: optionalNumber(heart.currentBpm ?? heart.current_bpm, 30, 240),
      baselineBpm: optionalNumber(heart.baselineBpm ?? heart.baseline_bpm, 30, 240),
      peakBpm: optionalNumber(heart.peakBpm ?? heart.peak_bpm, 30, 240),
      heartScore: optionalNumber(
        heart.heartScore ?? heart.heart_score ?? heart.score,
        0,
        100,
      ),
      trend: HEART_TRENDS.has(trend) ? trend : "unknown",
      explanation: String(heart.explanation ?? "等待心动值解释"),
    },
    metrics: {
      breathingRate: optionalNumber(
        metrics.breathingRate ?? metrics.breathing_rate,
        0,
        80,
      ),
      stressIndex: optionalNumber(
        metrics.stressIndex ?? metrics.stress_index,
        0,
        100,
      ),
      skinTemperature: optionalNumber(
        metrics.skinTemperature ?? metrics.skin_temperature,
        0,
        60,
      ),
      hrv: optionalNumber(metrics.hrv, 0, 500),
      observedAt: timestampValue(
        metrics.observedAt ?? metrics.observed_at,
        null,
      ),
    },
    inference: {
      label: String(inference.label ?? "等待 AI 分析"),
      summary: String(inference.summary ?? "数据接入后生成解释"),
      confidence: optionalNumber(inference.confidence, 0, 1),
      caveat: String(
        inference.caveat ??
        "生理唤起不是喜欢或厌恶的直接证据，需要结合活动状态与上下文理解。",
      ),
    },
    iceBreak: {
      detected: Boolean(iceBreak.detected),
      at: timestampValue(iceBreak.at, null),
      breakSeconds: optionalNumber(
        iceBreak.breakSeconds ?? iceBreak.break_secs,
        0,
        86400,
      ),
      reliability: String(iceBreak.reliability ?? "pending"),
    },
    sourceRefs: {
      encounterId: String(sourceRefs.encounterId ?? sourceRefs.encounter_id ?? ""),
      heartStreamId: String(sourceRefs.heartStreamId ?? sourceRefs.heart_stream_id ?? ""),
      historicalBatchId: String(
        sourceRefs.historicalBatchId ?? sourceRefs.historical_batch_id ?? "",
      ),
      visionTrackId: String(sourceRefs.visionTrackId ?? sourceRefs.vision_track_id ?? ""),
      audioSegmentId: String(
        sourceRefs.audioSegmentId ?? sourceRefs.audio_segment_id ?? "",
      ),
    },
  });
}


export class PersonSignalStore {
  constructor(initialSnapshots = []) {
    this.snapshots = new Map();
    this.sequences = new Map();
    this.listeners = new Set();
    for (const snapshot of initialSnapshots) {
      this.upsert(snapshot, { source: "initial", allowStale: true, notify: false });
    }
  }

  getSnapshot(personId) {
    return this.snapshots.get(String(personId ?? "").trim()) ?? null;
  }

  get(personId) {
    return this.getSnapshot(personId);
  }

  list() {
    return [...this.snapshots.values()];
  }

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  upsert(input, {
    source = "programmatic",
    allowStale = false,
    notify = true,
  } = {}) {
    const personId = String(input?.personId ?? input?.person_id ?? "").trim();
    const previous = this.getSnapshot(personId);
    const snapshot = normalizePersonSignal(input, previous);
    if (
      previous &&
      !allowStale &&
      Date.parse(snapshot.capturedAt) < Date.parse(previous.capturedAt)
    ) {
      return { accepted: false, reason: "stale", snapshot: previous };
    }

    this.snapshots.set(snapshot.personId, snapshot);
    if (notify) this.#notify(snapshot, { source, previous, personId: snapshot.personId });
    return { accepted: true, reason: "updated", snapshot };
  }

  remove(personId, { source = "programmatic", notify = true } = {}) {
    const id = String(personId ?? "").trim();
    const previous = this.getSnapshot(id);
    if (!previous) return false;
    this.snapshots.delete(id);
    this.sequences.delete(id);
    if (notify) this.#notify(null, { source, previous, personId: id, removed: true });
    return true;
  }

  ingestEvent(event) {
    if (!event || typeof event !== "object") {
      return { accepted: false, reason: "invalid-event", snapshot: null };
    }
    const type = String(event.type ?? "");
    const payload = event.payload ?? {};
    const snapshotPayload = payload.personSignal ?? event.snapshot ?? payload;
    const personId = String(
      event.personId ?? event.person_id ?? snapshotPayload.personId ?? snapshotPayload.person_id ?? "",
    ).trim();
    if (!personId) return { accepted: false, reason: "missing-person", snapshot: null };

    const sequence = optionalNumber(event.sequence, 0, Number.MAX_SAFE_INTEGER);
    const previousSequence = this.sequences.get(personId);
    if (sequence !== null && previousSequence !== undefined && sequence <= previousSequence) {
      return { accepted: false, reason: "stale-sequence", snapshot: this.getSnapshot(personId) };
    }

    if (EVENT_TYPES.revoke.has(type)) {
      const removed = this.remove(personId, { source: type });
      if (sequence !== null) this.sequences.set(personId, sequence);
      return { accepted: removed, reason: removed ? "removed" : "missing", snapshot: null };
    }

    const capturedAt =
      snapshotPayload.capturedAt ??
      snapshotPayload.captured_at ??
      event.occurredAt ??
      event.capturedAt;
    let input = null;
    if (EVENT_TYPES.snapshot.has(type)) {
      input = { ...snapshotPayload, personId, capturedAt };
    } else if (EVENT_TYPES.patch.has(type)) {
      input = mergeSignal(this.getSnapshot(personId) ?? { personId }, {
        ...snapshotPayload,
        personId,
        capturedAt,
      });
    } else if (EVENT_TYPES.inference.has(type)) {
      input = mergeSignal(this.getSnapshot(personId) ?? { personId }, {
        personId,
        capturedAt,
        inference: payload.inference ?? payload,
      });
    } else if (EVENT_TYPES.iceBreak.has(type)) {
      input = mergeSignal(this.getSnapshot(personId) ?? { personId }, {
        personId,
        capturedAt,
        iceBreak: payload.iceBreak ?? payload,
      });
    } else {
      return { accepted: false, reason: "unsupported-event", snapshot: null };
    }

    const result = this.upsert(input, { source: type });
    if (result.accepted && sequence !== null) this.sequences.set(personId, sequence);
    return result;
  }

  #notify(snapshot, metadata) {
    const detail = Object.freeze(metadata);
    for (const listener of this.listeners) listener(snapshot, detail);
  }
}
