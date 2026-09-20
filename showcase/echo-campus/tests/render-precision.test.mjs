import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { chooseDepthPrecision, createFloatDepthTarget, precisionCameraRange, depthOffsetUnits, probeDepthPrecisionContext } from "../src/runtime/RenderPrecision.js";
import { stablePcfShadowChunk, filteredPeriodicStripe, FILTERED_GLASS_FUNCTIONS } from "../src/runtime/TemporalSurfaceFiltering.js";

const box = (a, b) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
const view = { position: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, -1) };

test("reverse depth requires both actual clip-control and framebuffer support, with explicit unverified-splat fallback", () => {
  for (const options of [{}, { clipControl: true }, { floatDepthComplete: true }]) {
    assert.equal(chooseDepthPrecision(options).mode, "conventional");
  }
  const support = { clipControl: true, floatDepthComplete: true };
  assert.deepEqual(chooseDepthPrecision(support).rendererOptions, { reversedDepthBuffer: true, logarithmicDepthBuffer: false });
  assert.equal(chooseDepthPrecision({ ...support, splatMode: true }).mode, "conventional");
  assert.equal(chooseDepthPrecision({ ...support, splatMode: true, splatVerified: true }).mode, "reversed-float");
});

test("float depth attachments survive composer target cloning and resizing", () => {
  const target = createFloatDepthTarget(640, 480, { samples: 4 }), clone = target.clone();
  try {
    assert.equal(target.depthTexture.type, THREE.FloatType);
    assert.equal(target.depthTexture.format, THREE.DepthFormat);
    assert.equal(target.texture.type, THREE.HalfFloatType);
    assert.equal(target.stencilBuffer, false);
    assert.equal(clone.depthTexture.type, THREE.FloatType);
    assert.notEqual(clone.depthTexture, target.depthTexture);
    clone.setSize(800, 600);
    assert.equal(clone.width, 800); assert.equal(clone.height, 600);
    assert.equal(target.width, 640);
  } finally { target.dispose(); clone.dispose(); }
});

test("fallback near plane never cuts an included foreground subject or geometry around the camera", () => {
  const distant = box([-20, -20, -1200], [20, 20, -500]);
  const nearPerson = box([-.3, -1, -1.2], [.3, 1, -.5]);
  const wide = precisionCameraRange({ ...view, boxes: [distant] });
  assert.equal(wide.near, 50);
  const both = precisionCameraRange({ ...view, boxes: [distant, nearPerson] });
  assert.ok(both.near >= .12 && both.near <= .125);
  const enclosing = precisionCameraRange({ ...view, boxes: [distant, box([-2, -2, -2], [2, 2, 2])] });
  assert.equal(enclosing.near, .12);
  const reverse = precisionCameraRange({ ...view, boxes: [distant], reversed: true });
  assert.equal(reverse.near, .12);
  assert.ok(reverse.far > 1200);
});

test("fallback range safely projects every bound corner under arbitrary camera orientation", () => {
  const position = new THREE.Vector3(400, 300, 600), forward = new THREE.Vector3(-2, -.7, -3);
  const boxes = [box([-80, -14, -190], [390, 150, 390]), box([-.5, 0, -1], [1, 2, 0])];
  const result = precisionCameraRange({ boxes, position, forward });
  const direction = forward.clone().normalize();
  for (const b of boxes) for (const x of [b.min.x,b.max.x]) for (const y of [b.min.y,b.max.y]) for (const z of [b.min.z,b.max.z]) {
    const depth = new THREE.Vector3(x,y,z).sub(position).dot(direction);
    if (depth > .12) assert.ok(depth > result.near && depth < result.far);
  }
  assert.equal(precisionCameraRange({ ...view, boxes: [] }).near, .12);
  assert.throws(() => precisionCameraRange({ ...view, boxes: [box([0,0,0],[NaN,1,1])] }));
});

test("32F reverse projection distinguishes millimetre-scale separation at one kilometre without increasing near", () => {
  const normal = new THREE.PerspectiveCamera(45,1,.12,3500), reversed = normal.clone();
  reversed._reversedDepth = true; reversed.updateProjectionMatrix();
  const normalized = (camera, z, reverse) => {
    const p = new THREE.Vector3(0, 0, -z).applyMatrix4(camera.projectionMatrix);
    return Math.fround(reverse ? p.z : p.z * .5 + .5);
  };
  assert.equal(normalized(normal,1000,false),normalized(normal,1000.001,false));
  assert.notEqual(normalized(reversed,1000,true),normalized(reversed,1000.001,true));
});

test("fixed PCF patch uses r185 source anchors, preserves baseline bias and handles reverse bias", () => {
  const source = THREE.ShaderChunk.shadowmap_pars_fragment;
  const patched = stablePcfShadowChunk(source);
  assert.ok(!patched.includes("float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;"));
  const start = patched.indexOf("float getShadow( sampler2DShadow shadowMap,");
  assert.match(patched.slice(start, start + 650), /USE_REVERSED_DEPTH_BUFFER[\s\S]*shadowCoord.z -= shadowBias;[\s\S]*#else[\s\S]*shadowCoord.z \+= shadowBias;/);
  assert.ok(patched.includes("float phi = 0.0;"));
  assert.throws(() => stablePcfShadowChunk("different shader version"));
  assert.equal(depthOffsetUnits(-4,true),4);
  assert.equal(depthOffsetUnits(-4,false),-4);
});

test("analytical floor stripes preserve mean coverage and periodicity as details become subpixel", () => {
  for (const pixel of [.002,.1,.8,1,2,9]) {
    let average=0;
    for(let i=0;i<2000;i++) average+=filteredPeriodicStripe((i+.5)/2000,pixel);
    average/=2000;
    assert.ok(Math.abs(average-.055)<.00003, `${pixel}: ${average}`);
    for(const point of [-3.13,0,.99,34.3]) {
      assert.ok(Math.abs(filteredPeriodicStripe(point,pixel)-filteredPeriodicStripe(point+1,pixel))<1e-10);
      if(Number.isInteger(pixel))assert.ok(Math.abs(filteredPeriodicStripe(point,pixel)-.055)<1e-10);
    }
  }
  assert.ok(FILTERED_GLASS_FUNCTIONS.includes("fwidth(position)"));
});

test("actual-context probe restores caller bindings and falls back from unavailable multisampling", () => {
  let count=0, deleted=0, sample=0;
  const gl={};
  for(const key of ["DRAW_FRAMEBUFFER_BINDING","READ_FRAMEBUFFER_BINDING","RENDERBUFFER_BINDING","MAX_SAMPLES","RENDERBUFFER","FRAMEBUFFER","DRAW_FRAMEBUFFER","READ_FRAMEBUFFER","RGBA16F","DEPTH_COMPONENT32F","COLOR_ATTACHMENT0","DEPTH_ATTACHMENT","SAMPLES","FRAMEBUFFER_COMPLETE"])gl[key]=key;
  const bindings=new Map([[gl.DRAW_FRAMEBUFFER_BINDING,"saved-draw"],[gl.READ_FRAMEBUFFER_BINDING,"saved-read"],[gl.RENDERBUFFER_BINDING,"saved-buffer"]]);
  gl.getExtension=()=>({});gl.getParameter=key=>key===gl.MAX_SAMPLES?8:bindings.get(key);
  gl.getInternalformatParameter=()=>new Int32Array([4,2]);
  gl.createFramebuffer=gl.createRenderbuffer=()=>({id:++count});
  gl.deleteFramebuffer=gl.deleteRenderbuffer=()=>deleted++;
  gl.bindFramebuffer=(type,value)=>{if(type===gl.FRAMEBUFFER||type===gl.DRAW_FRAMEBUFFER)bindings.set(gl.DRAW_FRAMEBUFFER_BINDING,value);if(type===gl.FRAMEBUFFER||type===gl.READ_FRAMEBUFFER)bindings.set(gl.READ_FRAMEBUFFER_BINDING,value);};
  gl.bindRenderbuffer=(type,value)=>bindings.set(gl.RENDERBUFFER_BINDING,value);
  gl.renderbufferStorageMultisample=(type,n)=>{sample=n;};gl.renderbufferStorage=()=>{sample=0;};
  gl.framebufferRenderbuffer=()=>{};
  gl.checkFramebufferStatus=()=>sample===2?gl.FRAMEBUFFER_COMPLETE:"incomplete";
  const result=probeDepthPrecisionContext(gl,{requestedSamples:4});
  assert.equal(result.samples,2);assert.equal(result.floatDepthComplete,true);
  assert.deepEqual(result.tested,[{samples:4,complete:false},{samples:2,complete:true}]);
  assert.equal(count,deleted);
  assert.deepEqual([...bindings.values()],["saved-draw","saved-read","saved-buffer"]);
});
