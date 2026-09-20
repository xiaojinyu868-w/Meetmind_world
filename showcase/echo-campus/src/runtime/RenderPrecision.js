import * as THREE from "three";

// Candidate integration policy. The caller must prove that a 32F framebuffer is
// complete on the actual context; EXT_clip_control alone is not that proof.
export function chooseDepthPrecision({ clipControl = false, floatDepthComplete = false, splatMode = false, splatVerified = false } = {}) {
  const reversed = !!clipControl && !!floatDepthComplete && (!splatMode || !!splatVerified);
  return {
    mode: reversed ? "reversed-float" : "conventional",
    rendererOptions: { reversedDepthBuffer: reversed, logarithmicDepthBuffer: false },
    reason: reversed ? "supported-and-verified" : !clipControl ? "no-clip-control" : !floatDepthComplete ? "no-verified-float-depth" : "splat-needs-runtime-verification",
  };
}

// A reverse-Z camera over a fixed-point depth attachment retains quantization
// error. Render into an explicit float-depth target before OutputPass/blitting.
export function createFloatDepthTarget(width, height, { samples = 0, colorType = THREE.HalfFloatType } = {}) {
  const depthTexture = new THREE.DepthTexture(width, height, THREE.FloatType);
  depthTexture.format = THREE.DepthFormat;
  return new THREE.WebGLRenderTarget(width, height, {
    type: colorType, depthTexture, depthBuffer: true, stencilBuffer: false,
    samples, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  });
}

// Bounds may overestimate geometry, never underestimate it. Include the source,
// visitors and scene fixtures. If any bound crosses the camera, keep baselineNear.
// This is a safe fallback for fixed-point devices; target distance alone is not.
export function precisionCameraRange({ boxes, position, forward, reversed = false, baselineNear = .12, baselineFar = 350 } = {}) {
  if (!Array.isArray(boxes) || !position || !forward) throw new Error("Camera precision requires world bounds and camera vectors");
  const length = Math.hypot(forward.x, forward.y, forward.z);
  if (!Number.isFinite(length) || length <= 0 || !(baselineNear > 0 && baselineFar > baselineNear)) throw new Error("Invalid camera range inputs");
  const direction = { x: forward.x / length, y: forward.y / length, z: forward.z / length };
  let nearest = Infinity, furthest = 0;
  for (const box of boxes) {
    if (!box?.min || !box?.max) throw new Error("Expected min/max world bounds");
    const values = [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z, position.x, position.y, position.z];
    if (!values.every(Number.isFinite) || ["x", "y", "z"].some(axis => box.min[axis] > box.max[axis])) throw new Error("Invalid world bounds");
    let lo = Infinity, hi = -Infinity;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const depth = (x - position.x) * direction.x + (y - position.y) * direction.y + (z - position.z) * direction.z;
      lo = Math.min(lo, depth); hi = Math.max(hi, depth);
    }
    if (hi <= baselineNear) continue;
    nearest = Math.min(nearest, lo); furthest = Math.max(furthest, hi);
  }
  const near = reversed || !Number.isFinite(nearest) ? baselineNear : Math.max(baselineNear, Math.min(50, nearest * .25));
  return { near, far: Math.max(baselineFar, furthest * 1.05 + 10), nearestBoundDepth: Number.isFinite(nearest) ? nearest : null };
}

// Three r185 reverses polygonOffsetFactor internally but leaves Units unchanged.
// Keep the application's units convention (negative means toward the camera).
export function depthOffsetUnits(units, reversed = false) { return reversed ? -units : units; }

// Run on the actual WebGL2 context before constructing the renderer. Restore GL
// bindings and allocate no textures; attachment support can vary by MSAA count.
export function probeDepthPrecisionContext(gl, { requestedSamples = 4 } = {}) {
  if (!gl?.getInternalformatParameter) return { clipControl: false, floatDepthComplete: false, samples: 0 };
  const clipControl = !!gl.getExtension("EXT_clip_control");
  gl.getExtension("EXT_color_buffer_float");
  const previousDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
  const previousRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
  const previousBuffer = gl.getParameter(gl.RENDERBUFFER_BINDING);
  const tested = [];
  const supported = format => Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER, format, gl.SAMPLES) || []);
  const depths = supported(gl.DEPTH_COMPONENT32F), colors = supported(gl.RGBA16F);
  const choices = [...new Set([Math.min(requestedSamples, gl.getParameter(gl.MAX_SAMPLES)), 2, 0])]
    .filter(n => n === 0 || n <= requestedSamples && depths.includes(n) && colors.includes(n)).sort((a, b) => b - a);
  try {
    for (const samples of choices) {
      const framebuffer = gl.createFramebuffer(), color = gl.createRenderbuffer(), depth = gl.createRenderbuffer();
      try {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        for (const [buffer, format, attachment] of [[color, gl.RGBA16F, gl.COLOR_ATTACHMENT0], [depth, gl.DEPTH_COMPONENT32F, gl.DEPTH_ATTACHMENT]]) {
          gl.bindRenderbuffer(gl.RENDERBUFFER, buffer);
          if (samples) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, format, 2, 2);
          else gl.renderbufferStorage(gl.RENDERBUFFER, format, 2, 2);
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, buffer);
        }
        const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        tested.push({ samples, complete });
        if (complete) return { clipControl, floatDepthComplete: true, samples, tested };
      } finally {
        gl.deleteRenderbuffer(color); gl.deleteRenderbuffer(depth); gl.deleteFramebuffer(framebuffer);
      }
    }
    return { clipControl, floatDepthComplete: false, samples: 0, tested };
  } finally {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, previousDraw);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, previousRead);
    gl.bindRenderbuffer(gl.RENDERBUFFER, previousBuffer);
  }
}

// Applied to each newly attached material once. WeakMap state is intentionally
// not copied by Material.clone(), unlike userData, so event overrides stay sane.
const offsetAdaptations = new WeakMap();
export function adaptPolygonOffsetMaterials(root, reversed = false) {
  let count = 0;
  root?.traverse(object => {
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material?.polygonOffset) continue;
      const previous = offsetAdaptations.get(material);
      if (previous?.reversed === reversed && previous.applied === material.polygonOffsetUnits) continue;
      const canonical = previous?.applied === material.polygonOffsetUnits ? previous.canonical : material.polygonOffsetUnits;
      material.polygonOffsetUnits = depthOffsetUnits(canonical, reversed);
      offsetAdaptations.set(material, { canonical, applied: material.polygonOffsetUnits, reversed });
      count++;
    }
  });
  return count;
}

// Cache per-mesh bounding boxes once per scene installation. Each geometry's
// cached boundingBox is reused; frame updates only project eight box corners.
export function cachePrecisionBounds(root, { exclude = null } = {}) {
  const boxes = [];
  root?.updateWorldMatrix(true, true);
  root?.traverse(object => {
    if (!object.isMesh || object.isSkinnedMesh || object === exclude || !object.geometry) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    if (object.geometry.boundingBox?.isEmpty()) return;
    if (object.isInstancedMesh) {
      if (!object.boundingBox) object.computeBoundingBox();
      if (object.boundingBox) boxes.push(object.boundingBox.clone().applyMatrix4(object.matrixWorld));
    } else boxes.push(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  return boxes;
}
