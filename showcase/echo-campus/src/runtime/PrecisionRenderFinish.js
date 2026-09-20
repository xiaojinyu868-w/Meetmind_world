import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createFloatDepthTarget } from "./RenderPrecision.js";

// Candidate replacement for RenderFinish when a float depth target was probed.
// Even with AO disabled, the scene must pass through the float-depth attachment;
// falling back to renderer.render(scene,camera) would restore 24-bit depth.
export function createPrecisionRenderFinish(renderer, scene, camera, quality, { samples = 4 } = {}) {
  const target = createFloatDepthTarget(1, 1, { samples });
  const composer = new EffectComposer(renderer, target);
  const render = new RenderPass(scene, camera), output = new OutputPass();
  composer.addPass(render);
  let ao = null;
  if (quality === "cinema") {
    ao = new GTAOPass(scene, camera, 1, 1);
    // Set before the target is first allocated. GTAO and its denoiser in r185
    // reconstruct reversed depth via the camera inverse projection matrix.
    ao.depthTexture.type = THREE.FloatType;
    ao.depthTexture.format = THREE.DepthFormat;
    ao.normalRenderTarget.stencilBuffer = false;
    ao.updateGtaoMaterial({ radius: 1.15, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 12 });
    ao.updatePdMaterial({ lumaPhi: 8, depthPhi: 1, normalPhi: 5, radius: 6, samples: 8, rings: 2 });
    ao.blendIntensity = .8;
    const renderNormals = ao._renderOverride.bind(ao);
    ao._renderOverride = (...args) => {
      const auto = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;
      try { return renderNormals(...args); } finally { renderer.shadowMap.autoUpdate = auto; }
    };
    composer.addPass(ao);
  }
  composer.addPass(output);
  renderer.info.autoReset = false;
  return {
    render() { renderer.info.reset(); composer.render(); },
    resize(width, height) { composer.setSize(width, height); },
    setEnabled(enabled) { if (ao) ao.enabled = !!enabled; },
    get passes() { return ao?.enabled ? 3 : 2; },
    diagnostics: { depthFormat: "DEPTH_COMPONENT32F", colorFormat: "RGBA16F", samples, reversed: !!renderer.capabilities.reversedDepthBuffer },
    dispose() { ao?.dispose(); render.dispose(); output.dispose(); composer.dispose(); },
  };
}
