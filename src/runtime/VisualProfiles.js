import * as THREE from "three";


const VISUAL_PROFILES = Object.freeze({
  current: Object.freeze({
    background: "#92b6bc",
    fog: Object.freeze({ color: "#92b6bc", near: 18, far: 36 }),
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 1.02,
    shadowType: THREE.PCFShadowMap,
    materialMode: "gltf",
    hemisphere: Object.freeze({ sky: "#d9eef0", ground: "#725a45", intensity: 1.65 }),
    sun: Object.freeze({ color: "#ffe5b0", intensity: 3.1, position: [-5.5, 9.5, 6.5] }),
    points: Object.freeze([
      Object.freeze({ position: [0, 2.75, 0], intensity: 8.5 }),
      Object.freeze({ position: [-3.4, 2.75, 0], intensity: 5.2 }),
      Object.freeze({ position: [3.3, 2.75, 0], intensity: 5.2 }),
    ]),
  }),
  referenceLowpoly: Object.freeze({
    background: "#a9c7c0",
    fog: Object.freeze({ color: "#a9c7c0", near: 20, far: 40 }),
    toneMapping: THREE.NeutralToneMapping,
    exposure: 1.08,
    shadowType: THREE.PCFShadowMap,
    materialMode: "flat",
    hemisphere: Object.freeze({ sky: "#d8ece5", ground: "#59623e", intensity: 1.1 }),
    sun: Object.freeze({ color: "#ffd58a", intensity: 3.65, position: [-7.5, 10.5, 6.8] }),
    points: Object.freeze([]),
  }),
  painterlyAdventure: Object.freeze({
    background: "#8fbfc0",
    fog: Object.freeze({ color: "#8fbfc0", near: 19, far: 38 }),
    toneMapping: THREE.NeutralToneMapping,
    exposure: 1.08,
    shadowType: THREE.PCFShadowMap,
    materialMode: "toon",
    environmentMaterialMode: "gltf",
    hemisphere: Object.freeze({ sky: "#d8edf0", ground: "#596147", intensity: 1.22 }),
    sun: Object.freeze({ color: "#ffd095", intensity: 3.55, position: [-6.2, 10.8, 7.8] }),
    points: Object.freeze([
      Object.freeze({ position: [3.8, 2.4, -2.4], color: "#8fc7d5", intensity: 1.2, distance: 9 }),
    ]),
  }),
  // 小镇 Hub 黄昏夜集：深蓝夜空 + 微弱暖阳 + 篝火/串灯/门灯暖点光
  hubDusk: Object.freeze({
    background: "#2e3a5c",
    fog: Object.freeze({ color: "#3a4666", near: 16, far: 46 }),
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 1.05,
    shadowType: THREE.PCFShadowMap,
    materialMode: "gltf",
    hemisphere: Object.freeze({ sky: "#5a6c9e", ground: "#3e3226", intensity: 1.05 }),
    sun: Object.freeze({ color: "#ffb98a", intensity: 1.5, position: [-9, 11, 7] }),
    shadowBounds: Object.freeze({ left: -17, right: 17, top: 18, bottom: -18, far: 46 }),
    points: Object.freeze([
      Object.freeze({ position: [0, 1.5, 2.5], color: "#ff9a4e", intensity: 22, distance: 10 }),
      Object.freeze({ position: [0, 3.0, -8.6], color: "#ffc46a", intensity: 12, distance: 13 }),
      Object.freeze({ position: [-4.4, 2.2, 0.6], color: "#ffc46a", intensity: 9, distance: 9 }),
      Object.freeze({ position: [0, 2.8, -14.2], color: "#ffc46a", intensity: 9, distance: 10 }),
      Object.freeze({ position: [3.0, 1.6, 10.2], color: "#9ec2e8", intensity: 6, distance: 12 }),
    ]),
  }),
  blockout: Object.freeze({
    background: "#d9e2d7",
    fog: Object.freeze({ color: "#d9e2d7", near: 24, far: 48 }),
    toneMapping: THREE.NeutralToneMapping,
    exposure: 1.02,
    shadowType: THREE.PCFSoftShadowMap,
    materialMode: "flat",
    hemisphere: Object.freeze({ sky: "#eef5ef", ground: "#66705d", intensity: 1.25 }),
    sun: Object.freeze({ color: "#ffe0a3", intensity: 3.2, position: [-8, 13, 7] }),
    shadowBounds: Object.freeze({ left: -8, right: 8, top: 12, bottom: -14, far: 40 }),
    points: Object.freeze([]),
  }),
  villageMarket: Object.freeze({
    background: "#b8c8bc",
    fog: Object.freeze({ color: "#b8c8bc", near: 42, far: 92 }),
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 1.08,
    shadowType: THREE.PCFSoftShadowMap,
    materialMode: "gltf",
    environmentMaterialMode: "gltf",
    hemisphere: Object.freeze({ sky: "#e6efe4", ground: "#66704d", intensity: 1.28 }),
    sun: Object.freeze({ color: "#ffd28f", intensity: 3.5, position: [-28, 42, 24] }),
    shadowBounds: Object.freeze({ left: -34, right: 34, top: 34, bottom: -34, far: 110 }),
    points: Object.freeze([]),
  }),
});

let toonGradient = null;


function getToonGradient() {
  if (toonGradient) return toonGradient;
  toonGradient = new THREE.DataTexture(
    new Uint8Array([72, 134, 196, 255]),
    4,
    1,
    THREE.RedFormat,
  );
  toonGradient.minFilter = THREE.NearestFilter;
  toonGradient.magFilter = THREE.NearestFilter;
  toonGradient.generateMipmaps = false;
  toonGradient.needsUpdate = true;
  return toonGradient;
}


export function visualProfile(profileId) {
  return VISUAL_PROFILES[profileId] ?? VISUAL_PROFILES.current;
}


export function installVisualProfile(scene, renderer, profileId) {
  const profile = visualProfile(profileId);
  scene.background = new THREE.Color(profile.background);
  scene.fog = new THREE.Fog(profile.fog.color, profile.fog.near, profile.fog.far);
  renderer.toneMapping = profile.toneMapping;
  renderer.toneMappingExposure = profile.exposure;
  renderer.shadowMap.type = profile.shadowType;

  const hemisphere = new THREE.HemisphereLight(
    profile.hemisphere.sky,
    profile.hemisphere.ground,
    profile.hemisphere.intensity,
  );
  hemisphere.name = "LIGHT_Hemisphere";
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(profile.sun.color, profile.sun.intensity);
  sun.name = "LIGHT_Sun";
  sun.position.fromArray(profile.sun.position);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  const shadowBounds = profile.shadowBounds ?? { left: -8, right: 8, top: 7, bottom: -7, far: 28 };
  sun.shadow.camera.far = shadowBounds.far;
  sun.shadow.camera.left = shadowBounds.left;
  sun.shadow.camera.right = shadowBounds.right;
  sun.shadow.camera.top = shadowBounds.top;
  sun.shadow.camera.bottom = shadowBounds.bottom;
  sun.shadow.bias = -0.00016;
  sun.shadow.normalBias = 0.025;
  sun.target.position.set(0, 0, -0.6);
  scene.add(sun, sun.target);

  for (const [index, pointSpec] of profile.points.entries()) {
    const point = new THREE.PointLight(
      pointSpec.color ?? "#ffd391",
      pointSpec.intensity,
      pointSpec.distance ?? 7.2,
      2,
    );
    point.name = `LIGHT_Accent_${index + 1}`;
    point.position.fromArray(pointSpec.position);
    scene.add(point);
  }
  return profile;
}


export function adaptMaterialToProfile(sourceMaterial, profileId, scope = "character") {
  const profile = visualProfile(profileId);
  const materialMode = scope === "environment"
    ? profile.environmentMaterialMode ?? profile.materialMode
    : profile.materialMode;
  if (materialMode === "gltf") return sourceMaterial;
  if (/outline|glass|window|water|emission/i.test(sourceMaterial.name)) {
    return sourceMaterial;
  }

  if (materialMode === "toon") {
    const material = new THREE.MeshToonMaterial({
      name: sourceMaterial.name,
      color: sourceMaterial.color?.clone() ?? new THREE.Color("#ffffff"),
      map: sourceMaterial.map ?? null,
      alphaMap: sourceMaterial.alphaMap ?? null,
      transparent: sourceMaterial.transparent,
      opacity: sourceMaterial.opacity,
      side: sourceMaterial.side,
      vertexColors: sourceMaterial.vertexColors,
      gradientMap: getToonGradient(),
    });
    material.userData.sourceMaterial = sourceMaterial.name;
    return material;
  }

  sourceMaterial.roughness = 0.94;
  sourceMaterial.metalness = 0;
  sourceMaterial.envMapIntensity = 0.12;
  sourceMaterial.flatShading = true;
  sourceMaterial.needsUpdate = true;
  return sourceMaterial;
}


export function adaptSceneMaterials(root, profileId) {
  const materialCache = new Map();
  const adapt = (material) => {
    if (!material) return material;
    if (!materialCache.has(material)) {
      materialCache.set(
        material,
        adaptMaterialToProfile(material, profileId, "environment"),
      );
    }
    return materialCache.get(material);
  };
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(adapt)
      : adapt(object.material);
  });
}
