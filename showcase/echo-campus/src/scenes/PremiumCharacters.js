import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Keep source textures and geometry shared; only skeletons, mixers and name badges
// belong to an individual attendee. Coordinates exposed to the world are meters.
export const PREMIUM_CHARACTER_ASSETS = Object.freeze([
  Object.freeze({ id: "host-female", path: "assets/premium/host-female.glb", height: 1.68, forwardYaw: -Math.PI / 2 }),
  Object.freeze({ id: "host-male", path: "assets/premium/host-male.glb", height: 1.78, forwardYaw: -Math.PI / 2 }),
]);

const LIBRARIES = new Map();
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const CLIP_ALIASES = Object.freeze({
  idle: /idle|stand|breath|待机/i,
  walk: /walk|locomotion|行走/i,
  wave: /wave|greet|hello|挥手/i,
  talk: /talk|speak|conversation|交谈/i,
});
let defaultLibrary = null;
const WARDROBE_COLORS = Object.freeze({
  "host-female": Object.freeze([0x667e70, 0x617987, 0x897985, 0xa48d73, 0xa6ac9f]),
  "host-male": Object.freeze([0x354c58, 0x596367, 0x696b58, 0x6d5d63, 0x446558]),
});

export function premiumWardrobeForSeed(assetId, seed = 1) {
  const palette = WARDROBE_COLORS[assetId];
  if (!palette) return null;
  const numeric = Number(seed);
  const value = Math.abs(Number.isFinite(numeric) ? Math.trunc(numeric) : 1);
  // Consecutive seeds alternate models; divide by two so each model cycles
  // through all five outfits, rather than correlating one outfit with sex.
  const index = Math.floor(value / 2) % palette.length;
  return Object.freeze({ index, color: palette[index], kind: assetId === "host-female" ? 1 : 2,
    heightFactor: 0.95 + ((value * 37 + 11) % 10) * 0.01 });
}

function installCharacterShader(material, wardrobe = null) {
  material.onBeforeCompile = shader => {
    shader.uniforms.premiumRimColor = { value: new THREE.Color(0xffdfb8) };
    shader.uniforms.premiumWardrobeColor = { value: new THREE.Color(wardrobe?.color ?? 0xffffff) };
    shader.uniforms.premiumWardrobeKind = { value: wardrobe?.kind ?? 0 };
    shader.fragmentShader = "uniform vec3 premiumRimColor;\nuniform vec3 premiumWardrobeColor;\nuniform float premiumWardrobeKind;\n" + shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      if (premiumWardrobeKind > 0.5) {
        vec3 sourceTexel = diffuseColor.rgb;
        float luminance = dot(sourceTexel, vec3(0.2126, 0.7152, 0.0722));
        float clothMask = 0.0;
        float referenceLuminance = 0.178;
        if (premiumWardrobeKind < 1.5) {
          // Only green-biased sage blazer texels. Every protected face/hand
          // island has red > green, and therefore exactly zero mask weight.
          clothMask = smoothstep(0.001,0.008,sourceTexel.g-sourceTexel.r)
            * smoothstep(0.008,0.020,sourceTexel.g-sourceTexel.b)
            * smoothstep(0.020,0.055,luminance) * (1.0-smoothstep(0.42,0.65,luminance));
        } else {
          // Only dark blue-green trouser texels; sand overshirt is preserved
          // because warm beige fabric and skin cannot be separated by hue.
          clothMask = smoothstep(0.007,0.022,sourceTexel.b-sourceTexel.r)
            * smoothstep(0.006,0.016,sourceTexel.g-sourceTexel.r)
            * smoothstep(0.008,0.018,luminance) * (1.0-smoothstep(0.10,0.18,luminance));
          referenceLuminance = 0.036;
        }
        vec3 dyedCloth = premiumWardrobeColor * clamp(luminance/referenceLuminance,0.30,2.25);
        diffuseColor.rgb = mix(sourceTexel,dyedCloth,clothMask);
      }`,
    ).replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\nfloat premiumFresnel = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);\ntotalEmissiveRadiance += premiumRimColor * premiumFresnel * 0.055;",
    );
  };
  material.customProgramCacheKey = () => "echo-premium-character-cloth-rim-v2";
}

function baseLocation(baseUrl) {
  const fallback = typeof document !== "undefined" ? document.baseURI : "http://localhost/";
  return new URL("./", baseUrl || fallback).href;
}

function stateName(state) {
  const value = typeof state === "string" ? state : state?.action || state?.state || "idle";
  if (/^(walk|walking|run|running)$/.test(value)) return "walk";
  if (/^(wave|arriving|greeting)$/.test(value)) return "wave";
  if (/^(talk|talking|meeting|in-meeting)$/.test(value)) return "talk";
  return "idle";
}

function softenMaterial(source, materialCache) {
  if (materialCache.has(source)) return materialCache.get(source);
  const material = source.clone();
  material.name = `premium-${source.name || "surface"}`;
  if (material.isMeshStandardMaterial) {
    material.roughness = Math.max(0.58, material.roughness ?? 0.8);
    material.metalness = Math.min(0.08, material.metalness ?? 0);
    material.envMapIntensity = 0.7;
    // A small warm bounce keeps the painted silhouette readable, with no hull
    // copies, no outline extrusion and no modification to skinning transforms.
    installCharacterShader(material);
  }
  materialCache.set(source, material);
  return material;
}

function parseTrackTarget(name) {
  try { return THREE.PropertyBinding.parseTrackName(name); } catch { return null; }
}

function prepareClips(animations, topRootBones, clipNames = []) {
  const rootNames = new Set(topRootBones.filter(bone => /(?:^|[|:_.])root$/i.test(bone.name)).map(bone => bone.name));
  return animations.map((source, index) => {
    const clip = source.clone();
    if (clipNames[index]) clip.name = clipNames[index];
    for (const track of clip.tracks) {
      const target = parseTrackTarget(track.name);
      const nodeName = target?.objectName === "bones" ? target.objectIndex : target?.nodeName;
      // Only the actual uppermost root bone: never strip pelvis/hip, twist,
      // or lower-limb translation tracks. Their animation is part of the rig.
      if (target?.propertyName !== "position" || !rootNames.has(nodeName) || track.getValueSize() !== 3) continue;
      const values = track.values, x = values[0], z = values[2];
      for (let i = 0; i < values.length; i += 3) { values[i] = x; values[i + 2] = z; }
    }
    return clip;
  });
}

function inspectAsset(gltf, definition, materialCache) {
  const scene = gltf.scene;
  if (!scene) throw new Error(`${definition.id}: GLB 中没有场景`);
  let meshes = 0, skinnedMeshes = 0, triangles = 0;
  const topRootBones = [], boneNames = [], textures = new Set();
  scene.traverse(object => {
    if (object.isBone) {
      boneNames.push(object.name);
      if (!object.parent?.isBone) topRootBones.push(object);
    }
    if (!object.isMesh) return;
    meshes++;
    if (object.isSkinnedMesh) skinnedMeshes++;
    triangles += (object.geometry.index?.count || object.geometry.attributes.position?.count || 0) / 3;
    object.castShadow = true;
    object.receiveShadow = true;
    if (object.isSkinnedMesh) object.frustumCulled = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const prepared = materials.map(material => softenMaterial(material, materialCache));
    object.material = Array.isArray(object.material) ? prepared : prepared[0];
    prepared.forEach(material => Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); }));
  });
  if (!meshes) throw new Error(`${definition.id}: GLB 中没有可显示网格`);
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene, true), size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y < 0.001) throw new Error(`${definition.id}: 角色高度无效`);
  const clips = prepareClips(gltf.animations || [], topRootBones, definition.clipNames);
  const clipByState = new Map();
  for (const [state, matcher] of Object.entries(CLIP_ALIASES)) {
    const exact = clips.find(clip => clip.name.toLowerCase() === state);
    const match = exact || clips.find(clip => matcher.test(clip.name));
    if (match) clipByState.set(state, match);
  }
  const warnings = [];
  if (!skinnedMeshes) warnings.push("模型无骨骼，保持真实静态姿态，不伪造行走动作");
  if (!clipByState.has("walk")) warnings.push("尚无经验证的 Walk 动画");
  if (!clipByState.has("idle")) warnings.push("尚无 Idle 动画，仅可使用轻微骨骼待机");
  return { definition, scene, clips, clipByState, info: Object.freeze({
    id: definition.id, url: definition.url, height: definition.height,
    forwardYaw: definition.forwardYaw || 0, meshes, skinnedMeshes, triangles,
    textures: textures.size, boneNames: Object.freeze(boneNames),
    animations: Object.freeze(clips.map(clip => ({ name: clip.name, duration: clip.duration, tracks: clip.tracks.length }))),
    warnings: Object.freeze(warnings),
  }) };
}

function roundedBadge(color) {
  const shape = new THREE.Shape(), w = 0.043, h = 0.057, r = 0.006;
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h); shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r); shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
  const parts = [];
  function part(geometry, tint, x, y, z) {
    const result = geometry.index ? geometry.toNonIndexed() : geometry;
    if (result !== geometry) geometry.dispose();
    result.translate(x, y, z);
    const value = new THREE.Color(tint), count = result.attributes.position.count, colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) value.toArray(colors, i * 3);
    result.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    parts.push(result);
  }
  part(new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1, steps: 1, curveSegments: 4 }), 0xf5eee0, 0, 0, 0);
  part(new THREE.BoxGeometry(0.074, 0.025, 0.001), color, 0, 0.035, 0.0055);
  part(new THREE.BoxGeometry(0.033, 0.007, 0.001), 0x415954, 0.013, 0.003, 0.0055);
  part(new THREE.BoxGeometry(0.026, 0.005, 0.001), 0xa6aa99, 0.0095, -0.011, 0.0055);
  part(new THREE.BoxGeometry(0.021, 0.025, 0.001), 0xb7c4b8, -0.022, -0.005, 0.0055);
  part(new THREE.BoxGeometry(0.021, 0.012, 0.007), 0xb2986e, 0, 0.063, 0.001);
  const merged = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  return merged;
}

function findBone(model, matcher) {
  let selected = null;
  model.traverse(object => { if (!selected && object.isBone && matcher.test(object.name)) selected = object; });
  return selected;
}

// Keep a complete standing pose in every clip so crossfades cannot restore
// the exporter's A-pose. Generated greetings contain steps and hip travel;
// the social presentation deliberately uses only their upper-body gesture.
function standingSocialClips(template) {
  const idle = template.clipByState.get("idle");
  if (!idle) return new Map();
  const idleTracks = new Map(idle.tracks.map(track => [track.name, track]));
  const upper = new Set(), gesture = new Set();
  template.scene.traverse(node => {
    if (!node.isBone) return;
    if (/^waist$|^spine$|^spine0?1$/i.test(node.name)) node.traverse(child => { if (child.isBone) upper.add(child.name); });
    if (/^[LR]_Clavicle$|^NeckTwist01$|^Head$/i.test(node.name)) node.traverse(child => { if (child.isBone) gesture.add(child.name); });
  });
  const result = new Map();
  for (const state of ["idle", "wave"]) {
    const source = template.clipByState.get(state) || idle;
    const allowed = state === "wave" ? gesture : upper;
    const sourceTracks = new Map(source.tracks.map(track => [track.name, track]));
    const tracks = [];
    for (const name of new Set([...idleTracks.keys(), ...sourceTracks.keys()])) {
      const original = sourceTracks.get(name) || idleTracks.get(name);
      const target = parseTrackTarget(name);
      const nodeName = target?.objectName === "bones" ? target.objectIndex : target?.nodeName;
      if (allowed.has(nodeName) && sourceTracks.has(name)) { tracks.push(original.clone()); continue; }
      const reference = idleTracks.get(name);
      if (!reference) continue;
      const constant = reference.clone(), size = reference.getValueSize();
      constant.times = new Float32Array([0, source.duration]);
      constant.values = new reference.values.constructor(size * 2);
      constant.values.set(reference.values.subarray(0, size), 0);
      constant.values.set(reference.values.subarray(0, size), size);
      tracks.push(constant);
    }
    result.set(state, new THREE.AnimationClip("Social" + (state === "idle" ? "Idle" : "Wave"), source.duration, tracks));
  }
  return result;
}

function makeCharacter(library, template, { color = 0x607c71, seed = 1, name = "Guest", presentation = "animated" } = {}) {
  if (library.disposed) throw new Error("角色库已释放");
  const root = new THREE.Group();
  root.name = `guest-${name}`;
  root.userData.isCharacter = true;
  root.userData.personName = name;
  root.userData.characterAsset = template.definition.id;
  const social = presentation === "social";
  root.userData.characterPresentation = social ? "grounded-social" : "animated";
  let socialFloorOffset = 0;
  const motion = new THREE.Group(), visual = new THREE.Group(), model = cloneSkeleton(template.scene);
  // Fixtures and future custom libraries may have an unrelated id; only the
  // two authored host assets receive the cloth-mask variants.
  const wardrobe = premiumWardrobeForSeed(template.definition.id, seed);
  const height = template.definition.height * (wardrobe?.heightFactor || 1);
  if (wardrobe) model.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const variants = materials.map(material => {
      if (!material.isMeshStandardMaterial) return material;
      const key = `${material.uuid}:${wardrobe.index}`;
      if (!library.wardrobeMaterials.has(key)) {
        const variant = material.clone();
        installCharacterShader(variant, wardrobe);
        variant.name = `${material.name}-outfit-${wardrobe.index}`;
        library.wardrobeMaterials.set(key, variant);
      }
      return library.wardrobeMaterials.get(key);
    });
    object.material = Array.isArray(object.material) ? variants : variants[0];
  });
  // SkinnedMesh raycasting otherwise caches only the first pose's sphere;
  // a raised hand can then become unclickable outside its idle bounds.
  model.traverse(object => {
    if (!object.isSkinnedMesh) return;
    object.computeBoundingSphere();
    object.boundingSphere.radius *= 2;
    object.boundingBox = null;
  });
  motion.name = "in-place-motion-compensation";
  visual.name = "normalized-character";
  visual.rotation.y = template.definition.forwardYaw || 0;
  visual.add(model); motion.add(visual); root.add(motion);
  root.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(visual, true);
  const scale = height / (bounds.max.y - bounds.min.y);
  visual.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(visual, true);
  visual.position.set(-(bounds.min.x + bounds.max.x) / 2, -bounds.min.y, -(bounds.min.z + bounds.max.z) / 2);
  root.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(visual, true);

  const chest = findBone(model, /chest|spine2|spine_?03|spine_?3|upperchest/i) || findBone(model, /spine/i);
  const head = findBone(model, /(?:^|[_:.])head$|mixamorighead$|^head$/i);
  // Recent Tripo v1 FBX outputs put locomotion on Hip while Root remains
  // static. Counter-translate a visual-only parent in world-horizontal axes;
  // do not destroy Hip tracks (their source-space axes carry height as well).
  const hip = findBone(model, /^hip$|^hips$|mixamorighips$/i);
  const hipReference = hip ? root.worldToLocal(hip.getWorldPosition(new THREE.Vector3())) : null;
  const hipPosition = new THREE.Vector3();
  const soleSamples = [], probeVertex = new THREE.Vector3(), inverseRoot = new THREE.Matrix4();
  model.traverse(object => {
    if (!object.isSkinnedMesh) return;
    const candidates = [];
    for (let index = 0; index < object.geometry.attributes.position.count; index++) {
      object.getVertexPosition(index, probeVertex).applyMatrix4(object.matrixWorld);
      root.worldToLocal(probeVertex);
      if (probeVertex.y < 0.055) candidates.push(index);
    }
    const count = Math.min(64, candidates.length);
    for (let index = 0; index < count; index++) soleSamples.push({ mesh: object, index: candidates[Math.floor(index * candidates.length / count)] });
  });
  // All attendee colors stay on their badges, never tinting skin or source art.
  const palette = new THREE.Color(color).getHexString();
  if (!library.badgeGeometries.has(palette)) library.badgeGeometries.set(palette, roundedBadge(color));
  const badge = new THREE.Mesh(library.badgeGeometries.get(palette), library.badgeMaterial);
  badge.name = "attendee-nfc-badge";
  const badgeY = height * 0.725, badgeX = height * 0.045;
  const origin = new THREE.Vector3(badgeX, badgeY, bounds.max.z + 0.2);
  const probe = new THREE.Raycaster(origin, new THREE.Vector3(0, 0, -1));
  const surface = probe.intersectObject(visual, true)[0];
  badge.position.set(badgeX, badgeY, (surface?.point.z ?? bounds.max.z * 0.7) + 0.007);
  motion.add(badge); root.updateMatrixWorld(true);
  if (chest) chest.attach(badge);

  const clipByState = social ? (template.socialClips ||= standingSocialClips(template)) : template.clipByState;
  const mixer = template.clips.length ? new THREE.AnimationMixer(model) : null;
  const actions = new Map();
  for (const [state, clip] of clipByState) {
    const action = mixer.clipAction(clip);
    if (state === "wave") { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
    actions.set(state, action);
  }
  const phase = ((Number(seed) || 1) * 0.61803398875 % 1) * Math.PI * 2;
  let previousState = null, activeAction = null, disposed = false, greetingFinished = false;
  const modified = [], turn = new THREE.Quaternion();
  function chooseAction(state) {
    return actions.get(state) || actions.get("idle") || null;
  }
  function transition(state) {
    let action = chooseAction(state);
    if (state === "wave" && greetingFinished) action = actions.get("idle") || action;
    if (action === activeAction) return;
    const previous = activeAction;
    activeAction = action;
    if (action) {
      action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
      if (!previous && action !== actions.get("wave")) action.time = phase / (Math.PI * 2) * action.getClip().duration;
      if (previous) action.crossFadeFrom(previous, 0.26, false);
      // First creation must evaluate the fully weighted Idle immediately.
      // Fading from weight zero blends against the exported T/A bind pose.
    } else previous?.fadeOut(0.2);
  }
  const onFinished = event => {
    if (event.action === actions.get("wave")) { greetingFinished = true; transition(previousState || "idle"); }
  };
  mixer?.addEventListener("finished", onFinished);
  function subtleBone(bone, axis, angle) {
    if (!bone) return;
    modified.push({ bone, before: bone.quaternion.clone() });
    turn.setFromAxisAngle(axis, angle); bone.quaternion.multiply(turn);
  }
  library.instances++;
  const character = {
    root, model, mixer, height, greetingDuration: (clipByState.get("wave")?.duration || 1) + 0.3, assetInfo: wardrobe ? Object.freeze({ ...template.info, height, wardrobe }) : template.info,
    update(dt, time, state = "idle") {
      if (disposed) return;
      for (const { bone, before } of modified) bone.quaternion.copy(before);
      modified.length = 0;
      const requestedState = stateName(state);
      const nextState = social && requestedState === "walk" ? "idle" : requestedState;
      root.userData.animationState = nextState;
      if (nextState !== previousState) { greetingFinished = false; previousState = nextState; transition(nextState); }
      mixer?.update(THREE.MathUtils.clamp(Number(dt) || 0, 0, 0.1));
      const seconds = Number(time) || 0;
      // Real local bone motion only. Missing locomotion stays honestly static;
      // no root hopping or whole-model rocking pretends to be a walk cycle.
      if (nextState === "talk" && !actions.has("talk")) {
        subtleBone(head, AXIS_X, Math.sin(seconds * 2.1 + phase) * 0.035);
        subtleBone(chest, AXIS_Y, Math.sin(seconds * 0.9 + phase) * 0.012);
      } else if (!activeAction && nextState !== "walk") {
        subtleBone(head, AXIS_Y, Math.sin(seconds * 0.55 + phase) * 0.025);
        subtleBone(chest, AXIS_X, Math.sin(seconds * 1.6 + phase) * 0.006);
      }
      motion.position.y = 0;
      if (hipReference) {
        motion.position.set(0, 0, 0);
        root.updateMatrixWorld(true);
        root.worldToLocal(hip.getWorldPosition(hipPosition));
        motion.position.x = hipReference.x - hipPosition.x;
        motion.position.z = hipReference.z - hipPosition.z;
      }
      root.updateMatrixWorld(true);
      // Small shoe/ground correction from actual deformed sole vertices.
      // The motion remains fully skinned; only stance penetration is removed.
      if (social) {
        motion.position.y = socialFloorOffset;
        root.updateMatrixWorld(true);
      } else if (soleSamples.length) {
        inverseRoot.copy(root.matrixWorld).invert();
        let lowest = Infinity;
        for (const sample of soleSamples) {
          sample.mesh.getVertexPosition(sample.index, probeVertex).applyMatrix4(sample.mesh.matrixWorld).applyMatrix4(inverseRoot);
          lowest = Math.min(lowest, probeVertex.y);
        }
        motion.position.y = THREE.MathUtils.clamp(-lowest, -0.08, 0.10);
        root.updateMatrixWorld(true);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer?.removeEventListener("finished", onFinished);
      mixer?.stopAllAction(); mixer?.uncacheRoot(model);
      const skeletons = new Set();
      model.traverse(object => { if (object.isSkinnedMesh) skeletons.add(object.skeleton); });
      skeletons.forEach(skeleton => skeleton.dispose());
      root.removeFromParent(); root.clear();
      library.instances--;
      library.releaseIfUnused();
    },
  };
  character.update(0, 0, "idle");
  if (social) {
    // One precise full-mesh measurement in the evaluated standing pose.
    // Unlike per-frame min-foot compensation, this never bobs the whole body.
    socialFloorOffset = -new THREE.Box3().setFromObject(root, true).min.y;
    motion.position.y = socialFloorOffset;
    root.updateMatrixWorld(true);
  }
  return character;
}

export async function loadCharacterLibrary({ baseUrl, assets = PREMIUM_CHARACTER_ASSETS, onProgress } = {}) {
  const base = baseLocation(baseUrl), definitions = assets.map(definition => ({ ...definition, url: new URL(definition.path, base).href }));
  const key = JSON.stringify(definitions);
  if (LIBRARIES.has(key)) { const library = await LIBRARIES.get(key); defaultLibrary = library; return library; }
  const promise = (async () => {
    const manager = new THREE.LoadingManager();
    if (onProgress) manager.onProgress = (url, completed, total) => onProgress({ url, completed, total });
    const draco = new DRACOLoader(manager).setDecoderPath(new URL("draco/", base).href);
    const loader = new GLTFLoader(manager).setDRACOLoader(draco), materialCache = new Map();
    const results = await Promise.allSettled(definitions.map(async definition => inspectAsset(await loader.loadAsync(definition.url), definition, materialCache)));
    draco.dispose();
    const templates = results.filter(result => result.status === "fulfilled").map(result => result.value);
    const errors = results.flatMap((result, index) => result.status === "rejected" ? [{ id: definitions[index].id, message: result.reason?.message || String(result.reason) }] : []);
    if (!templates.length) { materialCache.forEach(material => material.dispose()); throw new Error(`角色模型暂未加载：${errors.map(error => `${error.id} ${error.message}`).join("；")}`); }
    const library = {
      templates, errors: Object.freeze(errors), assets: Object.freeze(templates.map(template => template.info)),
      instances: 0, disposed: false, released: false, badgeGeometries: new Map(), wardrobeMaterials: new Map(),
      badgeMaterial: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.08 }),
      createPremiumCharacter(options = {}) {
        const numericSeed = Number(options.seed);
        const seed = Math.abs(Number.isFinite(numericSeed) ? Math.trunc(numericSeed) : 1);
        const template = templates.find(item => item.definition.id === options.assetId) || templates[seed % templates.length];
        return makeCharacter(library, template, options);
      },
      dispose() {
        if (library.disposed) return;
        library.disposed = true; LIBRARIES.delete(key);
        if (defaultLibrary === library) defaultLibrary = null;
        library.releaseIfUnused();
      },
      releaseIfUnused() {
        if (!library.disposed || library.instances || library.released) return;
        library.released = true;
        const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
        templates.forEach(template => template.scene.traverse(object => {
          if (object.geometry) geometries.add(object.geometry);
          if (object.isSkinnedMesh) skeletons.add(object.skeleton);
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            if (!material) continue; materials.add(material);
            Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
          }
        }));
        library.badgeGeometries.forEach(geometry => geometry.dispose()); library.badgeGeometries.clear();
        library.badgeMaterial.dispose();
        library.wardrobeMaterials.forEach(material => material.dispose()); library.wardrobeMaterials.clear();
        geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
        textures.forEach(texture => texture.dispose()); skeletons.forEach(skeleton => skeleton.dispose());
      },
    };
    return library;
  })();
  LIBRARIES.set(key, promise);
  try { const library = await promise; defaultLibrary = library; return library; }
  catch (error) { LIBRARIES.delete(key); throw error; }
}

export function createPremiumCharacter(options) {
  if (!defaultLibrary) throw new Error("请先 await loadCharacterLibrary({baseUrl}) 再创建角色");
  return defaultLibrary.createPremiumCharacter(options);
}
