import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// The court's "afternoon dollhouse": a low warm sun behind the guests, long
// shadows toward the camera, shadows lifted toward plum and never black, one
// film over every view. Numbers are checked against the ranges in
// docs/EXPERIENCE-DESIGN.md with the frame metrics, not by eye alone.

export const COURT_PALETTE = Object.freeze({
  paper: "#FBF6EE", ink: "#3A2E28", ink2: "#7A6A5E", plum: "#3E3546", teal: "#2F5D62", apricot: "#F2B880",
});

/** Post presets. `neutral` is the identity: a view that never asks for a look renders as before. */
export const COURT_LOOK = Object.freeze({
  neutral: Object.freeze({
    bloom: Object.freeze({ strength: 0, radius: 0.4, threshold: 1.4 }),
    finish: Object.freeze({ uSat: 1, uVibrance: 0, uContrast: 1, uWarm: 0, uVignette: 0, uGrain: 0, uLift: 0 }),
  }),
  // The bloom works on the linear picture: only festoon bulbs, glints and the
  // emblem's brass pass 1.4, never the sunlit paving. The campus is pale stone
  // and glass, so the film adds colour and contrast instead of taking them away.
  day: Object.freeze({
    bloom: Object.freeze({ strength: 0.16, radius: 0.4, threshold: 1.4 }),
    finish: Object.freeze({ uSat: 1.12, uVibrance: 0.22, uContrast: 1.04, uWarm: 0.035, uVignette: 0.24, uGrain: 0.028, uLift: 0.8 }),
  }),
});

/** Light for the court's event view; applied over EventLook while the court dressing is on. */
export const COURT_LIGHT = Object.freeze({
  // 30° rather than 22°: below that the towers around the court shade most of its floor.
  sun: Object.freeze({ color: "#FFC48A", intensity: 3.2, elevation: 30, off: 45, shadowIntensity: 0.75 }),
  sky: Object.freeze({ sky: "#B5C9EC", ground: "#E4C29C", intensity: 0.95 }),
  // Cool sky bounce from the camera's side, onto the faces the backlight leaves
  // in shade; any stronger and the court goes flat and grey.
  fill: Object.freeze({ color: "#A8B9E8", intensity: 0.3, elevation: 35 }),
  exposure: 1.03,
  environment: 0.5,
});

/**
 * Depth-of-field bands for the finishing pass (0 = bottom of the screen).
 * `walk` keeps the crowd sharp, `stage` reads as a miniature from above,
 * `close` holds one person and lets the court fall away; `lift` is added to
 * the film's shadow lift (a dark coat in backlight must not go black).
 */
export const COURT_SHOTS = Object.freeze({
  walk: Object.freeze({ tilt: 0.1, band: 0.22, focus: 0.5, lift: 0 }),
  stage: Object.freeze({ tilt: 0.35, band: 0.2, focus: 0.45, lift: 0 }),
  close: Object.freeze({ tilt: 0.9, band: 0.16, focus: 0.5, lift: 2.0 }),
});

/** Where the fill goes for a sun at `sunOffset` from `center`: mirrored across the vertical, raised to `elevation`. */
export function fillPosition(center, sunOffset, { elevation = COURT_LIGHT.fill.elevation, distance = 60 } = {}) {
  const flat = Math.hypot(sunOffset.x, sunOffset.z) || 1, e = THREE.MathUtils.degToRad(elevation);
  return new THREE.Vector3(-sunOffset.x / flat * Math.cos(e), Math.sin(e), -sunOffset.z / flat * Math.cos(e)).multiplyScalar(distance).add(center);
}

/** Unit vector toward a sun at `azimuth` (degrees from +z toward +x) and `elevation` above the horizon. */
export function sunDirection(azimuth, elevation, target = new THREE.Vector3()) {
  const a = THREE.MathUtils.degToRad(azimuth), e = THREE.MathUtils.degToRad(elevation);
  return target.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
}

/**
 * The azimuth that lights a view from behind its subject: the sun ahead of the
 * camera, `off` degrees to one side (positive puts it upper right on screen).
 */
export function backlightAzimuth(cameraPosition, subject, off = COURT_LIGHT.sun.off) {
  const dx = subject.x - cameraPosition.x, dz = subject.z - cameraPosition.z;
  return THREE.MathUtils.radToDeg(Math.atan2(dx, dz)) - off;
}

const FINISH_KEYS = ["uSat", "uVibrance", "uContrast", "uWarm", "uVignette", "uGrain", "uLift"];

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 16 / 9 }, uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
    uSat: { value: 1 }, uVibrance: { value: 0 }, uContrast: { value: 1 }, uWarm: { value: 0 }, uVignette: { value: 0 }, uGrain: { value: 0 },
    uTilt: { value: 0 }, uFocus: { value: 0.5 }, uBand: { value: 0.22 }, uFxaa: { value: 0 },
    // A THREE.Color whose linear components act on display values: at 0.6 black
    // rises to about #080608 and mid-tones barely move.
    uLift: { value: 0 }, uLiftTint: { value: new THREE.Color(COURT_PALETTE.plum) },
  },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uAspect, uSat, uVibrance, uContrast, uWarm, uVignette, uGrain, uTilt, uFocus, uBand, uFxaa, uLift;
    uniform vec2 uTexel; uniform vec3 uLiftTint; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 7.13) * 43758.5453); }
    vec3 fxaa(vec2 uv){
      const vec3 W = vec3(0.299, 0.587, 0.114);
      vec3 nw = texture2D(tDiffuse, uv + vec2(-1.0, -1.0) * uTexel).rgb, ne = texture2D(tDiffuse, uv + vec2(1.0, -1.0) * uTexel).rgb;
      vec3 sw = texture2D(tDiffuse, uv + vec2(-1.0, 1.0) * uTexel).rgb, se = texture2D(tDiffuse, uv + vec2(1.0, 1.0) * uTexel).rgb;
      vec3 m = texture2D(tDiffuse, uv).rgb;
      float lnw = dot(nw, W), lne = dot(ne, W), lsw = dot(sw, W), lse = dot(se, W), lm = dot(m, W);
      float lo = min(lm, min(min(lnw, lne), min(lsw, lse))), hi = max(lm, max(max(lnw, lne), max(lsw, lse)));
      vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse));
      float reduce = max((lnw + lne + lsw + lse) * (0.25 / 8.0), 1.0 / 128.0);
      dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + reduce), vec2(-8.0), vec2(8.0)) * uTexel;
      vec3 a = 0.5 * (texture2D(tDiffuse, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tDiffuse, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
      vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, uv - dir * 0.5).rgb + texture2D(tDiffuse, uv + dir * 0.5).rgb);
      float lb = dot(b, W);
      return (lb < lo || lb > hi) ? a : b;
    }
    void main(){
      vec4 c = vec4(uFxaa > 0.5 ? fxaa(vUv) : texture2D(tDiffuse, vUv).rgb, 1.0);
      if (uTilt > 0.001) {
        float b = uTilt * smoothstep(uBand, uBand + 0.34, abs(vUv.y - uFocus));
        if (b > 0.001) {
          vec3 acc = c.rgb;
          for (int i = 0; i < 16; i++) {
            float fi = float(i), r = sqrt((fi + 0.5) / 16.0) * b * 0.013, a = fi * 2.39996;
            acc += texture2D(tDiffuse, vUv + vec2(cos(a) * r / uAspect * 1.6, sin(a) * r)).rgb;
          }
          c.rgb = acc / 17.0;
        }
      }
      float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = max(mix(vec3(luma), c.rgb, uSat), 0.0);
      float chroma = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
      c.rgb = max(mix(vec3(luma), c.rgb, 1.0 + uVibrance * (1.0 - chroma)), 0.0);
      c.rgb = clamp((c.rgb - 0.5) * uContrast + 0.5, 0.0, 1.0);
      vec2 d = vUv - 0.5; d.x *= 1.15;
      c.rgb *= mix(1.0 - uVignette, 1.0, smoothstep(0.85, 0.2, length(d)));
      // After the vignette, so its corners go plum rather than black.
      c.rgb += uLift * uLiftTint * (1.0 - c.rgb) * (1.0 - c.rgb);
      c.rgb += vec3(uWarm, uWarm * 0.55, 0.0) * (1.0 - c.rgb);
      c.rgb += (hash(vUv * 1000.0) - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
};

// One NaN pixel would be smeared by the bloom's mip chain into a black block.
const ScrubShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: FinishShader.vertexShader,
  fragmentShader: "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0); gl_FragColor = c; }",
};

/**
 * Appends the court's finishing chain to a composer that already renders the
 * scene: (scrub + bloom, by default unless `quality` is low) → OutputPass →
 * finish. `fxaa` is for targets without multisampling. Starts neutral.
 */
export function addCourtFinish(composer, { quality = "balanced", bloom: withBloom = quality !== "low", fxaa = false, width = 1, height = 1 } = {}) {
  let bloom = null;
  const passes = [];
  if (withBloom) {
    const scrub = new ShaderPass(ScrubShader);
    bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0, COURT_LOOK.day.bloom.radius, COURT_LOOK.day.bloom.threshold);
    bloom.enabled = false;
    passes.push(scrub, bloom);
  }
  const output = new OutputPass();
  const finish = new ShaderPass(FinishShader);
  finish.uniforms.uFxaa.value = fxaa ? 1 : 0;
  passes.push(output, finish);
  for (const pass of passes) composer.addPass(pass);
  const u = finish.uniforms;
  let name = "neutral", baseLift = 0, wanted = { shot: "walk", focus: null };
  const goal = () => {
    const preset = COURT_SHOTS[wanted.shot] || COURT_SHOTS.walk, on = name !== "neutral";
    return { tilt: on ? preset.tilt : 0, band: preset.band, focus: wanted.focus ?? preset.focus, lift: baseLift + (on ? preset.lift : 0) };
  };
  const settle = () => { const g = goal(); u.uTilt.value = g.tilt; u.uBand.value = g.band; u.uFocus.value = g.focus; u.uLift.value = g.lift; };

  /** A COURT_LOOK name, or a preset object of the same shape (named "custom"). */
  function use(next = "neutral") {
    const custom = next && typeof next === "object" && next.finish && next.bloom;
    const preset = custom ? next : COURT_LOOK[next] || COURT_LOOK.neutral;
    name = custom ? "custom" : COURT_LOOK[next] ? next : "neutral";
    for (const key of FINISH_KEYS) u[key].value = preset.finish[key];
    baseLift = preset.finish.uLift;
    if (bloom) {
      bloom.strength = preset.bloom.strength; bloom.radius = preset.bloom.radius; bloom.threshold = preset.bloom.threshold;
      bloom.enabled = preset.bloom.strength > 0;
    }
    settle();
    return name;
  }
  /** Eases the depth-of-field band to one of COURT_SHOTS (with an optional focus height). */
  function setShot(next = "walk", { focus = null, instant = false } = {}) {
    wanted = { shot: COURT_SHOTS[next] ? next : "walk", focus };
    if (instant) settle();
  }
  return {
    passes: passes.length, bloom, uniforms: u,
    get name() { return name; },
    get shot() { return wanted.shot; },
    use, setShot,
    update(dt, time) {
      u.uTime.value = time % 1000;
      const g = goal(), k = 1 - Math.exp(-Math.max(0, dt) * 3);
      u.uTilt.value += (g.tilt - u.uTilt.value) * k;
      u.uBand.value += (g.band - u.uBand.value) * k;
      u.uFocus.value += (g.focus - u.uFocus.value) * k;
      u.uLift.value += (g.lift - u.uLift.value) * k;
    },
    resize(w, h, pixelRatio = 1) {
      u.uAspect.value = w / Math.max(1, h);
      u.uTexel.value.set(1 / Math.max(1, w * pixelRatio), 1 / Math.max(1, h * pixelRatio));
    },
    dispose() { for (const pass of passes) pass.dispose?.(); },
  };
}
