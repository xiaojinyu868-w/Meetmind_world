import * as THREE from "three";
import { finishArchitecturalMaterial } from "./ArchitecturalMaterials.js";

// Overrides are keyed to material names inspected in the three delivered GLBs.
// Never infer that arbitrary green/blue geometry is vegetation/glass.
const MATERIAL_PROFILES = new Map([
  ["[Water Sparkling]", "water"],
  ["[Color A04]2", "site"],
  ["[Color A04]", "site-dark"],
  ["[Color_005]", "road"],
  ["[Color M05]", "road"],
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
  // Low sun ahead-left gives the garden warm edge light and long natural shadows.
  const offset = new THREE.Vector3(-38, 14, 28).normalize().multiplyScalar(Math.max(68, span * 2.8));
  return { center, sunPosition: center.clone().add(offset), span, near: .5, far: offset.length() + span * 3, groundY };
}

function cloneEventMaterial(original, profile, time, hideDuplicateSite = false) {
  const material = original.clone();
  material.name = original.name;
  material.userData = { ...original.userData, eventLook: true, sourceMaterialName: original.name };
  if (profile === "billboard") {
    material.visible = false;
    return material;
  }
  if (!material.isMeshStandardMaterial) return material;
  if (profile === "glass") {
    material.color.set(0x9bb9cd);
    material.metalness = .18;
    material.roughness = .36;
    material.envMapIntensity = .85;
    // The source lacks interior glazing depth. Opaque reflections preserve its
    // authored silhouette without transparency sorting through entire towers.
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;
  } else if (profile === "stone" || profile === "ivory") {
    material.color.set(profile === "ivory" ? 0xe9dfcc : 0xd7d1c2);
    material.roughness = .88;
    material.metalness = 0;
    material.envMapIntensity = .28;
  } else if (profile === "paving") {
    material.color.set(0xcac2b5);
    material.roughness = .91;
    material.metalness = 0;
    material.envMapIntensity = .24;
  } else if (profile === "grass") {
    material.color.set(0x859b7c);
    material.roughness = .96;
    material.metalness = 0;
    material.envMapIntensity = .2;
  } else if (profile === "aluminum") {
    material.color.set(0xcac9c1);
    material.metalness = .42;
    material.roughness = .48;
    material.envMapIntensity = .48;
  } else if (profile === "water") {
    material.color.set(0x649aa6);material.roughness=.32;material.metalness=.12;material.envMapIntensity=.85;
    // Preserve source texture ownership, but remove high-frequency offline
    // surface maps from the event pass so camera motion stays calm.
    material.normalMap=null;material.bumpMap=null;material.roughnessMap=null;material.metalnessMap=null;
    material.transparent=false;material.opacity=1;material.depthWrite=true;
    material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;
  } else if (profile === "site" || profile === "site-dark") {
    material.color.set(profile==="site"?0xc5cabb:0xb7beae);material.roughness=.96;material.metalness=0;
    // The delivered canopy contains a second, nearly coplanar site layer under
    // [Color A04]2. Keep the authored [Color A04] material in source view, but
    // remove this duplicate from the event pass to stop distant z-fighting.
    if (profile === "site-dark" && hideDuplicateSite) material.visible = false;
    if(profile==="site"){material.polygonOffset=true;material.polygonOffsetFactor=-2;material.polygonOffsetUnits=-2;}
  } else if (profile === "road") {
    material.color.set(0x858c94);material.roughness=.95;material.metalness=0;
  }
  finishArchitecturalMaterial(material, profile, time);
  material.needsUpdate = true;
  return material;
}

// Recompose a directional painting into a full sky. The original bottom
// orange band was made for a flat photograph; at street level it became a
// giant orange wall. We retain its blue/cloud artwork, omit the solar disc,
// and bring the cloud bank through eye level before fading into aerial haze.
export function eventSkyMapping(sunDirection, options = {}) {
  const direction = sunDirection.clone().normalize();
  const sourceSunU = options.skySunUv?.[0] ?? .286;
  const sourceSunV = options.skySunUv?.[1] ?? .844;
  if (![sourceSunU, sourceSunV].every(v => Number.isFinite(v) && v > 0 && v < 1) || direction.y <= 0) {
    throw new Error("Sky mapping requires an interior sun pixel and an above-horizon light");
  }
  const elevation = Math.asin(THREE.MathUtils.clamp(direction.y, .001, .999));
  const sunHemisphereV = 1 - elevation / (Math.PI / 2);
  const sourceLongitude = (sourceSunU - .5) * Math.PI * 2;
  const rotation = options.skyRotation ?? sourceLongitude - Math.atan2(direction.z, direction.x);
  return { sourceSunU, sourceSunV, sunHemisphereV, elevation, rotation, sourceHorizon: .60, sourceLimit: .72, finish: "blue-peach-clouds" };
}

// q=0 is zenith, q=1 is eye-level horizon, q=2 is nadir. Keeping the
// horizon at source v=.60 exposes the authored blue and warm cloud layers.
export function skySourceV(q, mapping) {
  q = THREE.MathUtils.clamp(q, 0, 2);
  return q <= 1 ? mapping.sourceHorizon * Math.pow(q, .82) : Math.min(mapping.sourceLimit, mapping.sourceHorizon + (q - 1) * .48);
}

function skyHemisphereTexture(source, quality, mapping) {
  const canvas = document.createElement("canvas");
  canvas.width = quality === "low" ? 1024 : 2048;
  canvas.height = canvas.width / 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sky canvas unavailable");
  const upperHeight = canvas.height / 2, image = source.image;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  for (let row = 0; row < canvas.height; row++) {
    const sy = skySourceV(row / upperHeight, mapping) * image.height;
    const syNext = skySourceV((row + 1) / upperHeight, mapping) * image.height;
    ctx.drawImage(image, 0, sy, image.width, Math.max(1, syNext - sy), 0, row, canvas.width, 1);
  }
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height), data = pixels.data;
  const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); };
  for (let row = 0; row < canvas.height; row++) {
    const q = row / upperHeight;
    const haze = .045 + .13 * smooth((q - .45) / .55) + .825 * smooth((q - 1.04) / .40);
    for (let x = 0; x < canvas.width; x++) {
      const at = (row * canvas.width + x) * 4;
      const r = data[at] / 255, g = data[at + 1] / 255, b = data[at + 2] / 255;
      const luma = r * .2126 + g * .7152 + b * .0722;
      const warm = smooth((r - b - .05) / .40), cool = smooth((b - r) / .27);
      let rr = .12 + luma * .80 + (r - luma) * .82;
      let gg = .12 + luma * .80 + (g - luma) * .82;
      let bb = .12 + luma * .80 + (b - luma) * .82;
      // Golden edges become peach, blue shadows stay blue-lavender. This
      // is a one-time texture grade, not a full-screen postprocess.
      rr += (.96 - rr) * warm * .25; gg += (.81 - gg) * warm * .25; bb += (.73 - bb) * warm * .25;
      rr += (.39 - rr) * cool * .22; gg += (.60 - gg) * cool * .22; bb += (.82 - bb) * cool * .22;
      const du = Math.min(Math.abs(x / canvas.width - mapping.sourceSunU), 1 - Math.abs(x / canvas.width - mapping.sourceSunU));
      const glow = Math.exp(-Math.pow(du / .115, 2) - Math.pow((q - mapping.sunHemisphereV) / .20, 2)) * .20;
      rr += (1 - rr) * glow; gg += (.94 - gg) * glow; bb += (.81 - bb) * glow;
      data[at] = Math.round(255 * (rr + (.82 - rr) * haze));
      data[at + 1] = Math.round(255 * (gg + (.84 - gg) * haze));
      data[at + 2] = Math.round(255 * (bb + (.88 - bb) * haze));
    }
  }
  // Blend only the opposite-side longitude seam. A single non-mirrored
  // panorama and no original sun disc means no duplicated suns can appear.
  const seamWidth = Math.round(canvas.width * .04);
  for (let row = 0; row < canvas.height; row++) {
    const base = row * canvas.width * 4;
    for (let c = 0; c < 3; c++) {
      const edge = (data[base + c] + data[base + (canvas.width - 1) * 4 + c]) * .5;
      for (let x = 0; x < seamWidth; x++) {
        const amount = 1 - smooth(x / (seamWidth - 1));
        for (const xx of [x, canvas.width - 1 - x]) { const at = base + xx * 4 + c; data[at] += (edge - data[at]) * amount; }
      }
    }
  }
  const zenith = [0, 0, 0];
  for (let x = 0; x < canvas.width; x++) for (let c = 0; c < 3; c++) zenith[c] += data[x * 4 + c] / canvas.width;
  const poleRows = Math.max(1, Math.round(upperHeight * .10));
  for (let row = 0; row < poleRows; row++) {
    const amount = 1 - smooth(row / poleRows);
    for (let x = 0; x < canvas.width; x++) for (let c = 0; c < 3; c++) { const at = (row * canvas.width + x) * 4 + c; data[at] += (zenith[c] - data[at]) * amount; }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.name = "Echo Campus blue-peach painted cloudscape";
  texture.userData.skyMapping = mapping;
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
  skyUrl = baseUrl.replace(/\/?$/, "/") + "assets/premium/social-sunset.webp",
  loadTexture = url => new THREE.TextureLoader().loadAsync(url),
  prepareSkyTexture = skyHemisphereTexture,
  createEnvironment = (texture, webglRenderer) => {
    const generator = new THREE.PMREMGenerator(webglRenderer);
    try { return generator.fromEquirectangular(texture); } finally { generator.dispose(); }
  },
} = {}) {
  if (!scene?.isScene || !modelRoot?.isObject3D || !sun?.shadow?.camera) throw new Error("Event look needs scene, model and shadow light");
  const frame = eventLightFrame(config), records = [], shadowRecords = [], clones = new Map(), warnings = [], time={value:0};
  const skyMapping = eventSkyMapping(frame.sunPosition.clone().sub(frame.center), config.eventLook);
  const diagnostics = { enabled: false, sky: "unavailable", skyMapping, overrides: {}, materialClones: 0, hiddenBillboards: 0, shadowSpan: frame.span, warnings };
  modelRoot.traverse(object => {
    if (!object.isMesh || !object.material) return;
    const triangles=(object.geometry?.index?.count||object.geometry?.attributes.position?.count||0)/3;
    if(object.castShadow)shadowRecords.push({object,castShadow:object.castShadow});
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const materials = sourceMaterials.map(material => {
      const profile = eventMaterialProfile(material);
      if (!profile) return material;
      if (!clones.has(material)) {
        const hideDuplicateSite=config.siteMode!=="campus"&&config.name?.includes("雨棚");
        clones.set(material, cloneEventMaterial(material, profile, time, hideDuplicateSite));
        diagnostics.overrides[profile] = (diagnostics.overrides[profile] || 0) + 1;
      }
      return clones.get(material);
    });
    const hidden = sourceMaterials.every(material => HIDDEN_EVENT_MATERIALS.has(material.name));
    if (hidden) diagnostics.hiddenBillboards++;
    if (hidden || materials.some((m, i) => m !== sourceMaterials[i])) records.push({ object, material: object.material, visible: object.visible, eventMaterials: Array.isArray(object.material) ? materials : materials[0], hidden });
  });
  diagnostics.materialClones = clones.size;diagnostics.sourceShadowMeshesSkipped=shadowRecords.length;
  let sky = null, environment = null;
  if (skyUrl) {
    let loaded = null;
    try {
      loaded = await loadTexture(skyUrl);
      sky = prepareSkyTexture(loaded, quality, skyMapping);
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
      source = captureSource();activeSpan=frame.span;
      for(const record of shadowRecords)record.object.castShadow=false;
      for (const record of records) { record.object.material = record.eventMaterials; if (record.hidden) record.object.visible = false; }
      scene.background = sky || new THREE.Color(0xd1d6e0);
      if (environment) scene.environment = environment.texture;
      scene.environmentIntensity = .62;
      scene.backgroundIntensity = .94;
      scene.backgroundBlurriness = 0;
      // The painted warm glow, reflection map and real key light share
      // one direction; the flat illustration's original solar disc is omitted.
      scene.backgroundRotation.set(0, skyMapping.rotation, 0);
      scene.environmentRotation.set(0, skyMapping.rotation, 0);
      // Warm light and a blue-lavender fill keep shaded architecture luminous.
      scene.fog = new THREE.Fog(0xd1d6e0, 220, 660);
      if (renderer) renderer.toneMappingExposure = 1.04;
      sun.color.set(0xffd8a8); sun.intensity = 3.35;
      sun.position.copy(frame.sunPosition); sun.target.position.copy(frame.center); sun.target.updateMatrixWorld();
      Object.assign(sun.shadow.camera, { left: -frame.span, right: frame.span, top: frame.span, bottom: -frame.span, near: frame.near, far: frame.far, zoom: 1 });
      sun.shadow.bias = -.00006; sun.shadow.normalBias = .025; sun.shadow.radius = 3; sun.shadow.intensity = .84;
      if (hemi) { hemi.color.set(0xc7d8f5); hemi.groundColor.set(0xb8a5a3); hemi.intensity = 1.35; }
      if (fill) { fill.color.set(0xb9c9f1); fill.intensity = .46; fill.position.copy(frame.center).add(new THREE.Vector3(34, 22, -28)); }
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
  let activeSpan=frame.span;
  return { setEnabled, dispose, diagnostics, update(dt,camera,target){
    time.value+=Math.min(dt,.05);
    if(!enabled||!camera||!target)return;
    const distance=camera.position.distanceTo(target),b=config.framingBounds;
    if(!b)return;
    if(config.siteMode==="campus"){
      const radius=Math.hypot(b.maxX-b.minX,b.maxY-b.minY,b.maxZ-b.minZ)/2;
      scene.fog.near=Math.max(480,distance+radius*1.05);scene.fog.far=scene.fog.near+radius*2.5;
    }
    const wide=distance>80;
    const span=wide?Math.max(b.maxX-b.minX,b.maxZ-b.minZ)*.72:frame.span;
    if(Math.abs(span-activeSpan)<.01)return;
    activeSpan=span;
    const center=wide?new THREE.Vector3((b.minX+b.maxX)/2,(b.minY+b.maxY)/2,(b.minZ+b.maxZ)/2):frame.center;
    const offset=frame.sunPosition.clone().sub(frame.center).normalize().multiplyScalar(wide?span*3:frame.sunPosition.distanceTo(frame.center));
    sun.position.copy(center).add(offset);sun.target.position.copy(center);sun.target.updateMatrixWorld();
    Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:.5,far:offset.length()+span*3});
    sun.shadow.normalBias=wide?.06:.025;sun.shadow.camera.updateProjectionMatrix();sun.shadow.needsUpdate=true;
    diagnostics.shadowSpan=span;
  } };
}
