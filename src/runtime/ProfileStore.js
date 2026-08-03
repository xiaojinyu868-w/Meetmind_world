const PROFILE_STORAGE_KEY = "echoworld:profile-overrides:v1";
const PROFILE_STORAGE_VERSION = 1;
const EDITABLE_FIELDS = ["name", "relation", "role", "city", "bio", "tags"];

function sanitizeProfile(profile = {}) {
  const sanitized = {};
  for (const field of EDITABLE_FIELDS) {
    if (!(field in profile)) continue;
    if (field === "tags") {
      sanitized.tags = Array.isArray(profile.tags)
        ? profile.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12)
        : [];
      continue;
    }
    sanitized[field] = String(profile[field] ?? "").trim();
  }
  return sanitized;
}

export function createProfileStore(storage = globalThis.localStorage) {
  function readDocument() {
    try {
      const parsed = JSON.parse(storage?.getItem(PROFILE_STORAGE_KEY) ?? "null");
      if (parsed?.version !== PROFILE_STORAGE_VERSION || !parsed.profiles) return {};
      return parsed.profiles;
    } catch {
      return {};
    }
  }

  function writeDocument(profiles) {
    try {
      storage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
        version: PROFILE_STORAGE_VERSION,
        profiles,
      }));
      return true;
    } catch {
      return false;
    }
  }

  return {
    getAll() {
      const profiles = readDocument();
      return Object.fromEntries(
        Object.entries(profiles).map(([personId, profile]) => [personId, sanitizeProfile(profile)]),
      );
    },
    save(personId, profile) {
      const profiles = readDocument();
      profiles[personId] = sanitizeProfile(profile);
      return writeDocument(profiles);
    },
    key: PROFILE_STORAGE_KEY,
  };
}
