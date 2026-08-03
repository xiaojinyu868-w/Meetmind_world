const SUPPORTED_SCHEMA_VERSION = "echo-world.v1";


export function publicUrl(path) {
  const cleanPath = String(path).replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${cleanPath}`;
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`WorldSpec field must be a non-empty string: ${field}`);
  }
}

function validateCharacter(character, index) {
  const prefix = `characters[${index}]`;
  if (!character || typeof character !== "object") {
    throw new Error(`WorldSpec entry must be an object: ${prefix}`);
  }
  requireString(character.instance_id, `${prefix}.instance_id`);
  requireString(character.person_id, `${prefix}.person_id`);
  requireString(character.asset_id, `${prefix}.asset_id`);
  requireString(character.profile_asset_id, `${prefix}.profile_asset_id`);
  if (!character.spawn || typeof character.spawn !== "object") {
    throw new Error(`WorldSpec entry requires spawn data: ${prefix}.spawn`);
  }
  for (const axis of ["x", "z"]) {
    if (!Number.isFinite(character.spawn[axis])) {
      throw new Error(`WorldSpec spawn axis must be numeric: ${prefix}.spawn.${axis}`);
    }
  }
}

export function validateWorldSpec(spec) {
  if (!spec || typeof spec !== "object") {
    throw new Error("WorldSpec must be an object");
  }
  if (spec.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(`Unsupported WorldSpec schema: ${spec.schema_version}`);
  }
  if (!Array.isArray(spec.characters)) {
    throw new Error("WorldSpec characters must be an array");
  }
  requireString(spec.asset_catalog_url, "asset_catalog_url");
  if (!spec.environment || typeof spec.environment !== "object") {
    throw new Error("WorldSpec environment must be an object");
  }
  requireString(spec.environment.asset_id, "environment.asset_id");
  if (!spec.player || typeof spec.player !== "object") {
    throw new Error("WorldSpec player must be an object");
  }
  requireString(spec.player.node_name, "player.node_name");
  spec.characters.forEach(validateCharacter);
  return spec;
}

export async function loadWorldSpec(assetStore, url) {
  const spec = await assetStore.loadJson(url);
  return validateWorldSpec(spec);
}
