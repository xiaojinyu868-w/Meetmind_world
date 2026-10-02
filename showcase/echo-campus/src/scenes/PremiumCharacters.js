import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { createCharacterContactShadowResources, updateCharacterContactShadow } from "./CharacterContactShadow.js";
import { personaById } from "../shared/personas.mjs";

// Keep source textures and geometry shared; only skeletons, mixers and name badges
// belong to an individual attendee. Coordinates exposed to the world are meters.
export const PREMIUM_CHARACTER_ASSETS = Object.freeze([
  Object.freeze({ id: "host-female", path: "assets/premium/host-female.glb?v=social-20260919", height: 1.68, forwardYaw: -Math.PI / 2 }),
  Object.freeze({ id: "host-male", path: "assets/premium/host-male.glb?v=social-20260919", height: 1.78, forwardYaw: -Math.PI / 2 }),
]);
export const PERSONA_ASSET_VERSION = "20261002";
// Close-up textures (scripts/personas/build-hd-textures.mjs), content-hashed.
export const PERSONA_HD_PATH = "assets/personas/hd/";

function loadTexture(url) {
  if (typeof createImageBitmap === "function") {
    // Decoded off the main thread; raw bytes, color management left to three.
    const loader = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: "none", premultiplyAlpha: "none", colorSpaceConversion: "none" });
    return loader.loadAsync(url).then(bitmap => { const texture = new THREE.Texture(bitmap); texture.flipY = false; texture.needsUpdate = true; return texture; });
  }
  return new THREE.TextureLoader().loadAsync(url).then(texture => { texture.flipY = false; return texture; });
}

function disposeTextures(textures) {
  for (const texture of textures) { texture.dispose(); texture.image?.close?.(); }
}

/** One rigged Tripo GLB per preset persona, loaded on demand. */
export function personaAssetDefinition(personaId) {
  const persona = personaById(personaId);
  if (!persona) return null;
  return Object.freeze({ id: persona.id, path: `assets/personas/${persona.id}.glb?v=${PERSONA_ASSET_VERSION}`, height: persona.height, forwardYaw: -Math.PI / 2, persona: true });
}

const LIBRARIES = new Map();
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const CLIP_ALIASES = Object.freeze({
  idle: /idle|stand|breath|待机/i,
  walk: /walk|locomotion|行走/i,
  wave: /wave|greet|hello|挥手/i,
  talk: /talk|speak|conversation|agree|交谈/i,
  celebrate: /clap|cheer|celebrat|鼓掌/i,
});
// A full Tripo clap take runs ~17 s; a celebration reads in its first beats.
const CELEBRATE_SECONDS = 3.6;
// Upper-arm swing toward the torso while idling, in radians.
const ARM_SETTLE = 0.11;
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
  if (/^(celebrate|celebrating|clap|connected)$/.test(value)) return "celebrate";
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

// These are full-body, individually retargeted performances, not held frames.
// Rebase only each take's constant stage origin. Hip weight shifts, both legs,
// torso, shoulders, wrists and recovery remain authored animation throughout.
function standingSocialClips(template) {
  const names = { idle: "Social-Standing_Relax", talk: "Social-Agree", wave: "Social-Greet_02", celebrate: "Social-Clap" };
  const result = new Map();
  let reference = null;
  for (const [state, name] of Object.entries(names)) {
    const source = template.clips.find(clip => clip.name === name) || template.clipByState.get(state) || (state === "celebrate" ? null : template.clipByState.get("idle"));
    if (!source) continue;
    const clip = source.clone();
    clip.name = "Social" + state[0].toUpperCase() + state.slice(1);
    const start = Math.min(...clip.tracks.map(track => track.times[0]));
    for (const track of clip.tracks) for (let i = 0; i < track.times.length; i++) track.times[i] -= start;
    clip.duration -= start;
    const probe = cloneSkeleton(template.scene), mixer = new THREE.AnimationMixer(probe);
    mixer.clipAction(clip).play(); mixer.update(0); probe.updateMatrixWorld(true);
    const feet = [findBone(probe, /^L_Foot$/), findBone(probe, /^R_Foot$/)].filter(Boolean);
    const center = new THREE.Vector3();
    feet.forEach(foot => center.add(foot.getWorldPosition(new THREE.Vector3())));
    if (feet.length) center.divideScalar(feet.length);
    if (!reference) reference = center.clone();
    const hip = findBone(probe, /^Hip$/i);
    if (hip && feet.length) {
      const shift = reference.clone().sub(center); shift.y = 0;
      const origin = hip.parent.getWorldPosition(new THREE.Vector3());
      const local = hip.parent.worldToLocal(origin.clone().add(shift)).sub(hip.parent.worldToLocal(origin));
      const track = clip.tracks.find(track => track.name === hip.name + ".position");
      if (track) for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] += local.x; track.values[i + 1] += local.y; track.values[i + 2] += local.z;
      }
    }
    mixer.stopAllAction(); mixer.uncacheRoot(probe);
    const skeletons = new Set(); probe.traverse(o => { if (o.isSkinnedMesh) skeletons.add(o.skeleton); });
    skeletons.forEach(skeleton => skeleton.dispose());
    result.set(state, clip);
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
  root.userData.characterPresentation = social ? "continuous-social" : "animated";
  const motion = new THREE.Group(), visual = new THREE.Group(), model = cloneSkeleton(template.scene);
  // Fixtures and future custom libraries may have an unrelated id; only the
  // two authored host assets receive the cloth-mask variants.
  const wardrobe = premiumWardrobeForSeed(template.definition.id, seed);
  const height = template.definition.height * (wardrobe?.heightFactor || 1);
  const contactShadow = library.contactShadowResources.create(height);
  root.add(contactShadow);
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
  // Side from the bone's actual position (root +Z is the facing direction).
  const upperArms = [findBone(model, /^l_upperarm$|leftarm$/i), findBone(model, /^r_upperarm$|rightarm$/i)].filter(Boolean)
    .map(bone => ({ bone, side: Math.sign(root.worldToLocal(bone.getWorldPosition(new THREE.Vector3())).x) || 1 }));
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
    if (state === "wave" || state === "celebrate" || (social && state === "talk")) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
    actions.set(state, action);
  }
  const phase = ((Number(seed) || 1) * 0.61803398875 % 1) * Math.PI * 2;
  let previousState = null, activeAction = null, disposed = false, greetingFinished = false;
  let socialRequest = null, performanceState = "idle", performanceReturning = false;
  const modified = [], turn = new THREE.Quaternion();
  function chooseAction(state) {
    return actions.get(state) || actions.get("idle") || null;
  }
  function transition(state) {
    if (social) { performanceState = state; performanceReturning = false; }
    let action = chooseAction(state);
    if (state === "wave" && greetingFinished) action = actions.get("idle") || action;
    if (action === activeAction) return;
    const previous = activeAction;
    activeAction = action;
    if (action) {
      action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
      if (!previous && action !== actions.get("wave")) action.time = social ? phase / (Math.PI * 2) * 1.8 : phase / (Math.PI * 2) * action.getClip().duration;
      if (previous) action.crossFadeFrom(previous, social ? 0.65 : 0.26, false);
      // First creation must evaluate the fully weighted Idle immediately.
      // Fading from weight zero blends against the exported T/A bind pose.
    } else previous?.fadeOut(0.2);
  }
  const onFinished = event => {
    if (social) return;
    if (event.action === actions.get("wave")) { greetingFinished = true; transition(previousState || "idle"); }
  };
  mixer?.addEventListener("finished", onFinished);
  function subtleBone(bone, axis, angle) {
    if (!bone) return;
    modified.push({ bone, before: bone.quaternion.clone() });
    turn.setFromAxisAngle(axis, angle); bone.quaternion.multiply(turn);
  }
  const facing = new THREE.Vector3(), parentTurn = new THREE.Quaternion(), worldTurn = new THREE.Quaternion();
  // Rotates a bone about the character's facing axis in world space.
  function swingBone(bone, angle) {
    modified.push({ bone, before: bone.quaternion.clone() });
    bone.parent.updateWorldMatrix(true, false);
    bone.parent.getWorldQuaternion(parentTurn);
    root.getWorldDirection(facing);
    worldTurn.setFromAxisAngle(facing, angle);
    bone.quaternion.premultiply(parentTurn.clone().invert().multiply(worldTurn).multiply(parentTurn));
  }
  let armSettle = 1;
  library.instances++;
  const character = {
    root, model, mixer, height, assetId: template.definition.id, conversationDuration: clipByState.get("talk")?.duration || 4, greetingDuration: (clipByState.get("wave")?.duration || 1) + 0.3, celebrationDuration: Math.min(CELEBRATE_SECONDS, clipByState.get("celebrate")?.duration || 0) || 0, assetInfo: wardrobe ? Object.freeze({ ...template.info, height, wardrobe }) : template.info,
    update(dt, time, state = "idle") {
      if (disposed) return;
      for (const { bone, before } of modified) bone.quaternion.copy(before);
      modified.length = 0;
      const requestedState = stateName(state);
      const nextState = social && requestedState === "walk" ? "idle" : requestedState;
      if (social) {
        if (!activeAction) transition("idle");
        // Intents trigger a complete phrase once; idle intent cannot cut a
        // gesture short, and a held intent cannot repeat it indefinitely.
        if (nextState !== socialRequest) {
          socialRequest = nextState;
          if (nextState === "wave" || nextState === "celebrate" || (nextState === "talk" && performanceState === "idle")) transition(nextState);
        }
        const phraseEnd = performanceState === "celebrate" ? Math.min(activeAction.getClip().duration, CELEBRATE_SECONDS) : activeAction.getClip().duration;
        if (performanceState !== "idle" && !performanceReturning && activeAction.time >= phraseEnd - 0.65) {
          performanceReturning = true;
          transition("idle");
        }
        root.userData.animationState = performanceState;
      } else {
        root.userData.animationState = nextState;
        if (nextState !== previousState) { greetingFinished = false; previousState = nextState; transition(nextState); }
      }
      mixer?.update(THREE.MathUtils.clamp(Number(dt) || 0, 0, social ? 0.25 : 0.1));
      root.userData.animationClip = activeAction?.getClip().name || null;
      root.userData.animationTime = activeAction?.time || 0;
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
      // Tripo's relaxed idle still hangs the arms in a mannequin A-pose; draw
      // them in toward the body while idling, eased so every gesture starts
      // and ends on its authored pose.
      const idling = social ? performanceState === "idle" : nextState === "idle";
      armSettle += ((idling ? 1 : 0) - armSettle) * Math.min(1, (Number(dt) || 0) * 3);
      if (armSettle > 0.01) for (const { bone, side } of upperArms) swingBone(bone, -side * ARM_SETTLE * armSettle);
      updateCharacterContactShadow(contactShadow, root);
      motion.position.y = 0;
      if (hipReference && !social) {
        motion.position.set(0, 0, 0);
        root.updateMatrixWorld(true);
        root.worldToLocal(hip.getWorldPosition(hipPosition));
        motion.position.x = hipReference.x - hipPosition.x;
        motion.position.z = hipReference.z - hipPosition.z;
      }
      root.updateMatrixWorld(true);
      // Small shoe/ground correction from actual deformed sole vertices.
      // The motion remains fully skinned; only stance penetration is removed.
      if (soleSamples.length) {
        inverseRoot.copy(root.matrixWorld).invert();
        let lowest = Infinity;
        for (const sample of soleSamples) {
          sample.mesh.getVertexPosition(sample.index, probeVertex).applyMatrix4(sample.mesh.matrixWorld).applyMatrix4(inverseRoot);
          lowest = Math.min(lowest, probeVertex.y);
        }
        motion.position.y = THREE.MathUtils.clamp(-lowest, -0.12, 0.12);
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
  return character;
}

export async function loadCharacterLibrary({ baseUrl, assets = PREMIUM_CHARACTER_ASSETS, onProgress, allowEmpty = false } = {}) {
  const base = baseLocation(baseUrl), definitions = assets.map(definition => ({ ...definition, url: new URL(definition.path, base).href }));
  const key = JSON.stringify(definitions) + (allowEmpty ? ":lazy" : "");
  if (LIBRARIES.has(key)) { const library = await LIBRARIES.get(key); defaultLibrary = library; return library; }
  const promise = (async () => {
    const manager = new THREE.LoadingManager();
    if (onProgress) manager.onProgress = (url, completed, total) => onProgress({ url, completed, total });
    let draco = null;
    const loaderFor = () => {
      draco ||= new DRACOLoader(manager).setDecoderPath(new URL("draco/", base).href);
      return new GLTFLoader(manager).setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    };
    const loader = loaderFor(), materialCache = new Map();
    const results = await Promise.allSettled(definitions.map(async definition => inspectAsset(await loader.loadAsync(definition.url), definition, materialCache)));
    const templates = results.filter(result => result.status === "fulfilled").map(result => result.value);
    const errors = results.flatMap((result, index) => result.status === "rejected" ? [{ id: definitions[index].id, message: result.reason?.message || String(result.reason) }] : []);
    if (!templates.length && !allowEmpty) { draco?.dispose(); materialCache.forEach(material => material.dispose()); throw new Error(`角色模型暂未加载：${errors.map(error => `${error.id} ${error.message}`).join("；")}`); }
    const pending = new Map(), hd = new Map();
    let hdManifest = null;
    const templateMaterials = template => {
      const materials = new Set();
      template.scene.traverse(object => { for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material); });
      return materials;
    };
    function revertHd(id) {
      const entry = hd.get(id);
      if (!entry) return;
      hd.delete(id);
      for (const swap of entry.swaps || []) {
        Object.assign(swap.material, { map: swap.map, normalMap: swap.normalMap });
        if (swap.material.roughnessMap !== swap.roughnessMap) Object.assign(swap.material, { roughnessMap: swap.roughnessMap, roughness: swap.roughness, needsUpdate: true });
      }
      disposeTextures(entry.textures);
    }
    function trimHd() {
      const loaded = [...hd].filter(([, entry]) => entry.swaps);
      const evictable = loaded.filter(([id]) => id !== library.pinnedHd).sort((a, b) => a[1].used - b[1].used);
      for (let excess = loaded.length - library.hdBudget; excess > 0 && evictable.length; excess--) revertHd(evictable.shift()[0]);
    }
    const library = {
      templates, errors, assets: templates.map(template => template.info),
      instances: 0, disposed: false, released: false, badgeGeometries: new Map(), wardrobeMaterials: new Map(),
      /** Close-up texture sets kept resident; the least recently framed revert to 1K. */
      hdBudget: 4, pinnedHd: null, textureAnisotropy: 4,
      get hdPersonas() { return [...hd].filter(([, entry]) => entry.swaps).map(([id]) => id); },
      /**
       * Swaps 2K color, 1K normal and 1K roughness into one persona's shared
       * materials, so every guest wearing that look sharpens at once. Pinned
       * (the guest's own look) is never evicted. Resolves true once applied.
       */
      upgradePersona(id, { pin = false } = {}) {
        if (!personaById(id) || library.disposed) return Promise.resolve(false);
        if (pin) library.pinnedHd = id;
        const existing = hd.get(id);
        if (existing) { existing.used = performance.now(); return existing.promise; }
        const entry = { used: performance.now(), swaps: null, textures: [] };
        hd.set(id, entry);
        entry.promise = (async () => {
          hdManifest ??= fetch(new URL(`${PERSONA_HD_PATH}manifest.json?v=${PERSONA_ASSET_VERSION}`, base)).then(response => (response.ok ? response.json() : null)).catch(() => null);
          const [manifest, template] = await Promise.all([hdManifest, library.ensurePersona(id)]);
          const files = manifest?.personas?.[id];
          if (!files?.color || !files?.normal) { hd.delete(id); return false; }
          const url = item => new URL(`${PERSONA_HD_PATH}${item.file}?v=${item.sha256.slice(0, 12)}`, base).href;
          const [color, normal, roughness] = await Promise.all([loadTexture(url(files.color)), loadTexture(url(files.normal)), files.roughness ? loadTexture(url(files.roughness)) : null]);
          entry.textures = [color, normal, roughness].filter(Boolean);
          if (library.released || hd.get(id) !== entry) { disposeTextures(entry.textures); return false; }
          color.colorSpace = THREE.SRGBColorSpace;
          entry.swaps = [];
          for (const material of templateMaterials(template)) {
            if (!material.isMeshStandardMaterial || !material.map) continue;
            for (const texture of entry.textures) Object.assign(texture, { wrapS: material.map.wrapS, wrapT: material.map.wrapT, channel: material.map.channel, anisotropy: library.textureAnisotropy });
            entry.swaps.push({ material, map: material.map, normalMap: material.normalMap, roughnessMap: material.roughnessMap, roughness: material.roughness });
            material.map = color;
            if (material.normalMap) material.normalMap = normal;
            if (roughness) Object.assign(material, { roughnessMap: roughness, roughness: 1, needsUpdate: true });
          }
          trimHd();
          return true;
        })().catch(error => { if (hd.get(id) === entry) hd.delete(id); disposeTextures(entry.textures); console.warn("HD textures unavailable", id, error?.message || error); return false; });
        return entry.promise;
      },
      contactShadowResources: createCharacterContactShadowResources(),
      badgeMaterial: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.08 }),
      hasPersona(id) { return templates.some(item => item.definition.id === id); },
      /** Loads one persona GLB once; concurrent callers share the request. */
      ensurePersona(id) { return library.ensureDefinition(personaAssetDefinition(id)); },
      ensureDefinition(definition) {
        const id = definition?.id;
        if (library.hasPersona(id)) return Promise.resolve(templates.find(item => item.definition.id === id));
        if (pending.has(id)) return pending.get(id);
        if (!definition || library.disposed) return Promise.reject(new Error("未知的分身形象"));
        const url = new URL(definition.path, base).href;
        const request = loaderFor().loadAsync(url).then(gltf => {
          if (library.released) throw new Error("角色库已释放");
          const template = inspectAsset(gltf, { ...definition, url }, materialCache);
          templates.push(template); library.assets.push(template.info);
          return template;
        }).catch(error => { errors.push({ id, message: error?.message || String(error) }); throw error; }).finally(() => pending.delete(id));
        pending.set(id, request);
        return request;
      },
      createPremiumCharacter(options = {}) {
        if (!templates.length) throw new Error("角色模型尚未就绪");
        const numericSeed = Number(options.seed);
        const seed = Math.abs(Number.isFinite(numericSeed) ? Math.trunc(numericSeed) : 1);
        const sex = personaById(options.persona)?.sex;
        const template = templates.find(item => item.definition.id === options.persona)
          || templates.find(item => item.definition.id === options.assetId)
          || templates.find(item => item.definition.id === (sex === "m" ? "host-male" : sex === "f" ? "host-female" : ""))
          || templates.find(item => !item.definition.persona)
          || templates[seed % templates.length];
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
        for (const id of [...hd.keys()]) revertHd(id);
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
        draco?.dispose();
        library.contactShadowResources.dispose();
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
