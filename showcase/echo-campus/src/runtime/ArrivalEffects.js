import * as THREE from "three";

// A guest "arrives as light": a soft beam, a ground ripple and a few rising
// motes, all additive and depth-tested so architecture still occludes them.
// pow() bases are clamped: interpolated UVs overshoot 1.0 at rims, and a NaN
// in the half-float target turns into black specks after tone mapping.
const BEAM_VERTEX = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const BEAM_FRAGMENT = `uniform vec3 color;uniform float progress;varying vec2 vUv;
void main(){float rise=smoothstep(0.0,0.25,progress)*(1.0-smoothstep(0.55,1.0,progress));
float v=clamp(vUv.y,0.0,1.0);float vertical=pow(1.0-v,1.6)*smoothstep(0.0,0.08,v+0.02);
float s=max(sin(clamp(vUv.x,0.0,1.0)*3.14159),0.0);float edge=s*s*s;
gl_FragColor=vec4(color,clamp(vertical*edge*rise*0.85,0.0,1.0));}`;
const RING_FRAGMENT = `uniform vec3 color;uniform float progress;varying vec2 vUv;
void main(){vec2 p=vUv-0.5;float r=length(p)*2.0;float radius=mix(0.08,1.0,progress);
float band=smoothstep(radius-0.14,radius,r)*(1.0-smoothstep(radius,radius+0.02,r));
float fade=1.0-smoothstep(0.35,1.0,progress);gl_FragColor=vec4(color,band*fade*0.9);}`;

export function createArrivalEffects(parent, { reducedMotion = false } = {}) {
  const root = new THREE.Group();
  root.name = "Arrival effects";
  parent.add(root);
  const beamGeometry = new THREE.CylinderGeometry(0.55, 0.75, 6, 32, 1, true).translate(0, 3, 0);
  const ringGeometry = new THREE.PlaneGeometry(4.2, 4.2).rotateX(-Math.PI / 2);
  const moteGeometry = new THREE.BufferGeometry();
  const MOTES = 18;
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
  const active = [];

  function spawn(position, color = "#ffcf8f", { scale = 1, duration = 2.6 } = {}) {
    if (reducedMotion) return null;
    const tint = new THREE.Color(color).lerp(new THREE.Color("#fff3dc"), 0.35);
    const uniforms = { color: { value: tint }, progress: { value: 0 } };
    const common = { uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: BEAM_VERTEX };
    const beam = new THREE.Mesh(beamGeometry, new THREE.ShaderMaterial({ ...common, fragmentShader: BEAM_FRAGMENT, side: THREE.DoubleSide }));
    const ring = new THREE.Mesh(ringGeometry, new THREE.ShaderMaterial({ ...common, fragmentShader: RING_FRAGMENT }));
    ring.position.y = 0.04;
    const motes = moteGeometry.clone();
    const seeds = Array.from({ length: MOTES }, () => [Math.random() * Math.PI * 2, 0.15 + Math.random() * 0.55, 0.6 + Math.random() * 1.4]);
    const points = new THREE.Points(motes, new THREE.PointsMaterial({ color: tint, size: 0.07, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    const group = new THREE.Group();
    group.add(beam, ring, points);
    group.position.copy(position);
    group.scale.setScalar(scale);
    for (const object of [beam, ring, points]) { object.raycast = () => {}; object.renderOrder = 4; object.frustumCulled = false; }
    root.add(group);
    const effect = { group, uniforms, motes, seeds, points, age: 0, duration };
    active.push(effect);
    return effect;
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const effect = active[i];
      effect.age += dt;
      const t = Math.min(1, effect.age / effect.duration);
      effect.uniforms.progress.value = t;
      const positions = effect.motes.attributes.position;
      effect.seeds.forEach(([angle, radius, speed], index) => {
        const lift = (effect.age * speed) % 2.6;
        positions.setXYZ(index, Math.cos(angle + effect.age * 0.6) * radius, 0.2 + lift, Math.sin(angle + effect.age * 0.6) * radius);
      });
      positions.needsUpdate = true;
      effect.points.material.opacity = Math.sin(Math.PI * t) * 0.9;
      if (t >= 1) {
        root.remove(effect.group);
        effect.group.traverse(object => { if (object.material) object.material.dispose(); });
        effect.motes.dispose();
        active.splice(i, 1);
      }
    }
  }

  function dispose() {
    for (const effect of active) { effect.group.traverse(object => object.material?.dispose()); effect.motes.dispose(); }
    active.length = 0;
    beamGeometry.dispose(); ringGeometry.dispose(); moteGeometry.dispose();
    root.removeFromParent();
  }
  return { root, spawn, update, dispose, get count() { return active.length; } };
}
