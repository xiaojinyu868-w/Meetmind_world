import * as THREE from "three";

/** One tiny radial texture for the library, two triangles per attendee.
 * This supplements sunlight with local contact, so a covered terrace still
 * reads as grounded. It never samples the scene or adds a render pass.
 */
export function createCharacterContactShadowResources() {
  const size = 64, pixels = new Uint8Array(size * size * 4), edge = Math.exp(-6);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + .5) / size * 2 - 1, v = (y + .5) / size * 2 - 1;
    const radiusSquared = u * u + v * v, offset = (y * size + x) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
    pixels[offset + 3] = radiusSquared >= 1 ? 0 : Math.round(255 * (Math.exp(-6 * radiusSquared) - edge) / (1 - edge));
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.name = "shared soft shoe contact gradient";
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ map: texture, color: 0x34473e, transparent: true, opacity: .26,
    depthWrite: false, depthTest: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  material.name = "soft local character contact";
  // A contact tint cannot become visible geometry in the cinema normal pass.
  material.allowOverride = false;
  let disposed = false;
  return { geometry, material, texture,
    create(height = 1.72) {
      if (disposed) throw new Error("Contact shadow resources released");
      const mesh = new THREE.Mesh(geometry, material), factor = height / 1.72;
      mesh.name = "soft character contact shadow";
      mesh.rotation.x = -Math.PI / 2; mesh.scale.set(.92 * factor, .65 * factor, 1);
      mesh.position.y = .024;
      mesh.castShadow = false; mesh.receiveShadow = false;
      mesh.raycast = () => {};
      mesh.userData.characterContactShadow = true;
      return mesh;
    },
    dispose() { if (disposed) return; disposed = true; geometry.dispose(); material.dispose(); texture.dispose(); },
  };
}

/** Keep the decal above the activity paving while the attendee scales in. */
export function updateCharacterContactShadow(mesh, root) {
  mesh.position.y = .024 / Math.max(.02, Math.abs(root.scale.y));
}
