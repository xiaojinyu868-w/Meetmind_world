export const SCENE_APP_SCHEMA = "echo-scene-app.v1";
export const FIELD_SCHEMA = "echo-field.v1";


function nonEmpty(value, maxLength = 240) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, maxLength) : null;
}


function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}


function unit(value, fallback) {
  return Math.max(0, Math.min(1, finite(value, fallback)));
}


export function normalizeFieldAsset(raw) {
  if (!raw || typeof raw !== "object" || raw.schema !== FIELD_SCHEMA || raw.status !== "ready") {
    return null;
  }
  if (raw.generated !== true || raw.regenerable !== true) return null;
  const sourcePointers = raw.generated_from ?? raw.generatedFrom;
  const generatedFrom = (Array.isArray(sourcePointers) ? sourcePointers : [])
    .map((value) => nonEmpty(value, 260))
    .filter(Boolean);
  const model = nonEmpty(raw.model, 100);
  const createdAt = nonEmpty(raw.created_at ?? raw.createdAt, 64);
  const title = nonEmpty(raw.scene?.title, 100);
  const summary = nonEmpty(raw.scene?.summary, 420);
  if (!generatedFrom.length || !model || !createdAt || !title || !summary) return null;
  const sourceParameters = raw.scene?.parameters ?? {};
  const parameters = Object.freeze({
    sky: nonEmpty(sourceParameters.sky, 32) ?? "#89afa5",
    ground: nonEmpty(sourceParameters.ground, 32) ?? "#b9a878",
    accent: nonEmpty(sourceParameters.accent, 32) ?? "#315d83",
    fog: nonEmpty(sourceParameters.fog, 32) ?? "#d7dfd2",
    openness: unit(sourceParameters.openness, 0.65),
    warmth: unit(sourceParameters.warmth, 0.65),
  });
  const entities = (Array.isArray(raw.scene?.entities) ? raw.scene.entities : [])
    .slice(0, 8)
    .map((entity) => {
      const id = nonEmpty(entity?.id, 80);
      const type = nonEmpty(entity?.type, 40);
      const label = nonEmpty(entity?.label, 100);
      const detail = nonEmpty(entity?.detail, 420);
      if (!id || !type || !label || !detail) return null;
      return Object.freeze({
        id,
        type,
        label,
        detail,
        position: Object.freeze({ x: finite(entity.position?.x), z: finite(entity.position?.z) }),
      });
    })
    .filter(Boolean);
  const spawn = Object.freeze({
    x: finite(raw.scene?.spawn?.x),
    z: finite(raw.scene?.spawn?.z, 5.2),
    yaw: finite(raw.scene?.spawn?.yaw, Math.PI),
  });
  return Object.freeze({
    schema: FIELD_SCHEMA,
    status: "ready",
    generated: true,
    regenerable: true,
    generatedFrom: Object.freeze(generatedFrom),
    model,
    createdAt,
    scene: Object.freeze({ title, summary, parameters, entities: Object.freeze(entities), spawn }),
  });
}


export function normalizeSceneAppEntry(raw) {
  if (!raw || typeof raw !== "object" || raw.schema !== SCENE_APP_SCHEMA) return null;
  const appId = nonEmpty(raw.app_id, 80);
  const kind = nonEmpty(raw.kind, 40);
  const label = nonEmpty(raw.label, 80);
  const status = ["queued", "ready", "unavailable"].includes(raw.status)
    ? raw.status
    : null;
  const personId = nonEmpty(raw.target?.person_id, 100);
  const fieldRef = nonEmpty(raw.target?.field_ref, 280);
  if (!appId || !kind || !label || !status || !personId || !fieldRef) return null;
  const capabilities = (Array.isArray(raw.capabilities) ? raw.capabilities : [])
    .map((item) => nonEmpty(item, 40))
    .filter(Boolean);
  return Object.freeze({
    schema: SCENE_APP_SCHEMA,
    appId,
    kind,
    label,
    status,
    target: Object.freeze({ personId, fieldRef }),
    capabilities: Object.freeze(capabilities),
  });
}


export function fieldEntryFromPackage(pkg) {
  const personId = nonEmpty(pkg?.person_id, 100);
  const status = pkg?.field?.status;
  if (!personId || !["queued", "ready"].includes(status)) return null;
  const entry = normalizeSceneAppEntry({
    schema: SCENE_APP_SCHEMA,
    app_id: "relationship-field",
    kind: "field",
    label: status === "ready" ? "进入关系场域" : "场域准备中",
    status,
    target: { person_id: personId, field_ref: `people/${personId}/profile.json#field` },
    capabilities: status === "ready" ? ["walk", "interact"] : [],
  });
  if (!entry) return null;
  return Object.freeze({ ...entry, field: normalizeFieldAsset(pkg.field) });
}
