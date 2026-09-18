import * as THREE from "three";

// Overrides are keyed to material names inspected in the three delivered GLBs.
// Never infer that arbitrary green/blue geometry is vegetation/glass.
const MATERIAL_PROFILES = new Map([
  ["[Translucent_Glass_Safety]", "glass"],
  ["[Color H01]1", "glass"],
  ["Source material 0", "glass"],
  ["Original default", "stone"],
  ["3D-BEIGE STONE", "stone"],
  ["3D-MARBLE WALL1", "stone"],
  ["[Carrera Marble]", "stone"],
  ["Source material 2", "stone"],
  ["Source material 18", "ivory"],
  ["[Polished Concrete New]1", "paving"],
  ["[Polished Concrete New]2", "paving"],
  ["[Polished Concrete New]3", "paving"],
  ["[Polished Concrete New]4", "paving"],
  ["[Stone_Pavers_Flagstone_Gray]1", "paving"],
  ["[Grass Light Green]", "grass"],
  ["[Vegetation_Grass_Artificial]5", "grass"],
  ["[Vegetation_Grass_Artificial]7", "grass"],
  ["Grass", "grass"],
  ["Grass2", "grass"],
  ["3D-ALUMINIUM4", "aluminum"],
  [" 3D-STEEL", "aluminum"],
  ["[Metal Aluminum Anodized]", "aluminum"],
  ["[Metal_Aluminum_Anodized]10", "aluminum"],
]);
const HIDDEN_EVENT_MATERIALS = new Set(["Cutout+Tree greener"]);
const CAMERA_KEYS = ["left", "right", "top", "bottom", "near", "far", "zoom"];

export function eventMaterialProfile(material) {
  return HIDDEN_EVENT_MATERIALS.has(material?.name) ? "billboard" : MATERIAL_PROFILES.get(material?.name) || null;
}

export function eventLightFrame(config = {}) {
  const b = config.bounds;
  if (!b || ![b.minX, b.maxX, b.minZ, b.maxZ].every(Number.isFinite) || b.maxX <= b.minX || b.maxZ <= b.minZ) {
    throw new Error("Event look requires calibrated activity bounds");
  }
  const groundY = config.groundY ?? config.spawn?.y ?? 0;
  const center = new THREE.Vector3((b.minX + b.maxX) / 2, groundY + 1.2, (b.minZ + b.maxZ) / 2);
  // Tighten shadow texels around people instead of the entire survey model.
  const span = Math.max(18, Math.min(48, Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ) / 2 + 6));
  const offset = new THREE.Vector3(-38, 42, 28).normalize().multiplyScalar(Math.max(68, span * 2.8));
  return { center, sunPosition: center.clone().add(offset), span, near: .5, far: offset.length() + span * 3, groundY };
}

function cloneEventMaterial(original, profile) {
  const material = original.clone();
  material.name = original.name;
  material.userData = { ...original.userData, eventLook: true, sourceMaterialName: original.name };
  if (profile === "billboard") {
    material.visible = false;
    return material;
  }
  if (!material.isMeshStandardMaterial) return material;
  if (profile === "glass") {
    material.color.set(0x82a8b7);
    material.metalness = .24;
    material.roughness = .16;
    material.envMapIntensity = 1.25;
    // The source lacks interior glazing depth. Opaque reflections preserve its
    // authored silhouette without transparency sorting through entire towers.
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;
  } else if (profile === "stone" || profile === "ivory") {
    material.color.set(profile === "ivory" ? 0xe8e5da : 0xd4d2c7);
    material.roughness = .77;
    material.metalness = .025;
    material.envMapIntensity = .32;
  } else if (profile === "paving") {
    material.color.lerp(new THREE.Color(0xd5d0c3), .34);
    material.roughness = .84;
    material.metalness = 0;
    material.envMapIntensity = .24;
  } else if (profile === "grass") {
    material.color.set(0x788d68);
    material.roughness = .96;
    material.metalness = 0;
    material.envMapIntensity = .2;
  } else if (profile === "aluminum") {
    material.color.lerp(new THREE.Color(0xc4cbd0), .18);
    material.metalness = .55;
    material.roughness = .42;
    material.envMapIntensity = .6;
  }
  material.needsUpdate = true;
  return material;
}

// The generated 2:1 artwork depicts sky only, not a full sphere. Place it in
// the upper hemisphere, then give the lower hemisphere a neutral ground fill.
function skyHemisphereTexture(source, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = quality === "low" ? 1024 : 2048;
  canvas.height = canvas.width / 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sky canvas unavailable");
  ctx.drawImage(source.image, 0, 0, canvas.width, canvas.height / 2);
  const gradient = ctx.createLinearGradient(0, canvas.height / 2, 0, canvas.height);
  gradient.addColorStop(0, "#bccbd0");
  gradient.addColorStop(.25, "#c4c6b8");
  gradient.addColorStop(1, "#aaa895");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.name = "Echo Campus upper-hemisphere garden sky";
  return texture;
}

function snapshotLight(light) {
  if (!light) return null;
  return { color: light.color.clone(), intensity: light.intensity, position: light.position.clone(), groundColor: light.groundColor?.clone(), target: light.target?.position.clone() };
}
function restoreLight(light, state) {
  if (!light || !state) return;
  light.color.copy(state.color); light.intensity = state.intensity; light.position.copy(state.position);
  if (state.groundColor) light.groundColor.copy(state.groundColor);
  if (state.target) { light.target.position.copy(state.target); light.target.updateMatrixWorld(); }
}

/** Creates a reversible event presentation, initially disabled.
 * Call after source applyModelFraming(), dispose before the next venue framing.
 * This owns only cloned materials, its sky texture and its PMREM target.
 */
export async function createEventLook({
  renderer, scene, modelRoot, config, sun, hemi, fill,
  baseUrl = import.meta.env?.BASE_URL || "./", quality = "high",
  skyUrl = baseUrl.replace(/\/?$/, "/") + "assets/premium/garden-sky.webp",
  loadTexture = url => new THREE.TextureLoader().loadAsync(url),
  prepareSkyTexture = skyHemisphereTexture,
  createEnvironment = (texture, webglRenderer) => {
    const generator = new THREE.PMREMGenerator(webglRenderer);
    try { return generator.fromEquirectangular(texture); } finally { generator.dispose(); }
  },
} = {}) {
  if (!scene?.isScene || !modelRoot?.isObject3D || !sun?.shadow?.camera) throw new Error("Event look needs scene, model and shadow light");
  const frame = eventLightFrame(config), records = [], shadowRecords = [], clones = new Map(), warnings = [];
  const diagnostics = { enabled: false, sky: "unavailable", overrides: {}, materialClones: 0, hiddenBillboards: 0, shadowSpan: frame.span, warnings };
  modelRoot.traverse(object => {
    if (!object.isMesh || !object.material) return;
    const triangles=(object.geometry?.index?.count||object.geometry?.attributes.position?.count||0)/3;
    if(object.castShadow&&triangles>100000)shadowRecords.push({object,castShadow:object.castShadow});
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const materials = sourceMaterials.map(material => {
      const profile = eventMaterialProfile(material);
      if (!profile) return material;
      if (!clones.has(material)) {
        clones.set(material, cloneEventMaterial(material, profile));
        diagnostics.overrides[profile] = (diagnostics.overrides[profile] || 0) + 1;
      }
      return clones.get(material);
    });
    const hidden = sourceMaterials.every(material => HIDDEN_EVENT_MATERIALS.has(material.name));
    if (hidden) diagnostics.hiddenBillboards++;
    if (hidden || materials.some((m, i) => m !== sourceMaterials[i])) records.push({ object, material: object.material, visible: object.visible, eventMaterials: Array.isArray(object.material) ? materials : materials[0], hidden });
  });
  diagnostics.materialClones = clones.size;diagnostics.heavyShadowMeshesSkipped=shadowRecords.length;
  let sky = null, environment = null;
  if (skyUrl) {
    let loaded = null;
    try {
      loaded = await loadTexture(skyUrl);
      sky = prepareSkyTexture(loaded, quality);
      if (!sky?.isTexture) throw new Error("Invalid sky texture");
      sky.mapping = THREE.EquirectangularReflectionMapping;
      sky.colorSpace = THREE.SRGBColorSpace;
      environment = renderer ? createEnvironment(sky, renderer) : null;
      diagnostics.sky = environment ? "generated-sky-and-reflections" : "generated-sky";
    } catch (error) {
      warnings.push(`Sky unavailable: ${error.message}`);
      if (sky) sky.dispose();
      sky = null;
    } finally {
      if (loaded && loaded !== sky) loaded.dispose();
    }
  }
  let enabled = false, disposed = false, source = null;
  function captureSource() {
    return {
      background: scene.background, environment: scene.environment, fog: scene.fog,
      environmentIntensity: scene.environmentIntensity, backgroundIntensity: scene.backgroundIntensity, backgroundBlurriness: scene.backgroundBlurriness,
      backgroundRotation: scene.backgroundRotation.clone(), environmentRotation: scene.environmentRotation.clone(),
      exposure: renderer?.toneMappingExposure,
      sun: snapshotLight(sun), hemi: snapshotLight(hemi), fill: snapshotLight(fill),
      shadow: { ...Object.fromEntries(CAMERA_KEYS.map(key => [key, sun.shadow.camera[key]])), bias: sun.shadow.bias, normalBias: sun.shadow.normalBias, radius: sun.shadow.radius, intensity: sun.shadow.intensity },
    };
  }
  function setEnabled(next) {
    if (disposed) return false;
    next = !!next;
    if (next === enabled) return enabled;
    if (next) {
      source = captureSource();
      for(const record of shadowRecords)record.object.castShadow=false;
      for (const record of records) { record.object.material = record.eventMaterials; if (record.hidden) record.object.visible = false; }
      scene.background = sky || new THREE.Color(0xc3d8e1);
      if (environment) scene.environment = environment.texture;
      scene.environmentIntensity = .62;
      scene.backgroundIntensity = .95;
      scene.backgroundBlurriness = 0;
      // The bright area of the authored panorama is near u=.76. Rotate both
      // lighting and background together so reflections match the visible sky.
      const skyRotation = config.eventLook?.skyRotation ?? -2.5;
      scene.backgroundRotation.set(0, skyRotation, 0);
      scene.environmentRotation.set(0, skyRotation, 0);
      scene.fog = new THREE.Fog(0xd9e0db, Math.max(110, source.fog?.near || 0), Math.max(420, source.fog?.far || 0));
      if (renderer) renderer.toneMappingExposure = 1.01;
      sun.color.set(0xffedce); sun.intensity = 2.85;
      sun.position.copy(frame.sunPosition); sun.target.position.copy(frame.center); sun.target.updateMatrixWorld();
      Object.assign(sun.shadow.camera, { left: -frame.span, right: frame.span, top: frame.span, bottom: -frame.span, near: frame.near, far: frame.far, zoom: 1 });
      sun.shadow.bias = -.00018; sun.shadow.normalBias = .045; sun.shadow.radius = 2; sun.shadow.intensity = .85;
      if (hemi) { hemi.color.set(0xc8e2f5); hemi.groundColor.set(0xc4b393); hemi.intensity = .83; }
      if (fill) { fill.color.set(0xdcecff); fill.intensity = .38; fill.position.copy(frame.center).add(new THREE.Vector3(34, 22, -28)); }
    } else {
      for (const record of records) { record.object.material = record.material; record.object.visible = record.visible; }
      for(const record of shadowRecords)record.object.castShadow=record.castShadow;
      scene.background = source.background; scene.environment = source.environment; scene.fog = source.fog;
      scene.environmentIntensity = source.environmentIntensity; scene.backgroundIntensity = source.backgroundIntensity; scene.backgroundBlurriness = source.backgroundBlurriness;
      scene.backgroundRotation.copy(source.backgroundRotation); scene.environmentRotation.copy(source.environmentRotation);
      if (renderer) renderer.toneMappingExposure = source.exposure;
      restoreLight(sun, source.sun); restoreLight(hemi, source.hemi); restoreLight(fill, source.fill);
      for (const key of CAMERA_KEYS) sun.shadow.camera[key] = source.shadow[key];
      for (const key of ["bias", "normalBias", "radius", "intensity"]) sun.shadow[key] = source.shadow[key];
    }
    sun.shadow.camera.updateProjectionMatrix(); sun.shadow.needsUpdate = true;
    enabled = next; diagnostics.enabled = next;
    return enabled;
  }
  function dispose() {
    if (disposed) return;
    if (enabled) setEnabled(false);
    disposed = true;
    // Clones share all original texture references. Do not traverse/dispose maps.
    for (const material of clones.values()) material.dispose();
    environment?.dispose(); sky?.dispose();
    records.length = 0; clones.clear();
  }
  return { setEnabled, dispose, diagnostics };
}
