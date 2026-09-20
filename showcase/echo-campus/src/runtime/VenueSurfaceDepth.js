// These source surfaces overlap in the supplied engineering models. Bias only
// their render materials; keep the shared geometry, textures and depth tests.
const SURFACE_RULES = Object.freeze([
  Object.freeze({
    id: "commercial-stone",
    sourceVenue: "venue-c-commercial-20230518",
    materialName: "石材幕墙",
    factor: -1,
    units: -4,
  }),
  Object.freeze({
    id: "canopy-concrete-base",
    sourceVenue: "venue-ab-canopy",
    materialName: "beton3",
    factor: 1,
    units: 4,
  }),
]);

export function applyVenueSurfaceDepth(root) {
  const originals = new Map();
  const clones = new Map();
  const rules = Object.fromEntries(SURFACE_RULES.map(rule => [rule.id, 0]));
  let disposed = false;

  root?.traverse(object => {
    if (!object.isMesh || !object.material) return;
    const original = object.material;
    const materials = Array.isArray(original) ? original : [original];
    let changed = false;
    const replacements = materials.map(material => {
      const rule = SURFACE_RULES.find(candidate =>
        object.userData.sourceVenue === candidate.sourceVenue && material?.name === candidate.materialName
      );
      if (!rule) return material;
      let byRule = clones.get(material);
      if (!byRule) { byRule = new Map(); clones.set(material, byRule); }
      if (!byRule.has(rule.id)) {
        const clone = material.clone();
        clone.polygonOffset = true;
        clone.polygonOffsetFactor = rule.factor;
        clone.polygonOffsetUnits = rule.units;
        byRule.set(rule.id, clone);
      }
      changed = true;
      rules[rule.id]++;
      return byRule.get(rule.id);
    });
    if (changed) {
      originals.set(object, original);
      object.material = Array.isArray(original) ? replacements : replacements[0];
    }
  });

  return {
    matchedMeshes: originals.size,
    clonedMaterials: [...clones.values()].reduce((total, byRule) => total + byRule.size, 0),
    rules,
    dispose() {
      if (disposed) return;
      disposed = true;
      // Restore first so the importer can discover and release original assets.
      for (const [object, material] of originals) object.material = material;
      for (const byRule of clones.values()) for (const clone of byRule.values()) clone.dispose();
      originals.clear();
      clones.clear();
    },
  };
}
