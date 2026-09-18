import * as THREE from "three";

// These names were inspected in the delivered venue GLBs. Plants, chairs,
// survey slabs and imported generic assets never enter the proxy pipeline.
const CANOPY = new Set(["*17", "[Translucent_Glass_Safety]", "Original default", "[Color M00]1", "[Color_006]", "[Metal_Corrogated_Shiny]1", "beton3", "[0053_Ivory]2", "ceiling1", "3D-ALUMINIUM4", " 3D-STEEL", "[Metal Aluminum Anodized]"]);
const TOWERS = new Set(["[Color H01]1", "Original default", "[Color M04]", "[Color M01]2", "[Color M01]4", "[Color M03]11", "[Color M03]1", "[Color M02]3", "[Color M06]", " 3D-STEEL", "[Metal Corrugated Shiny]9"]);
const PODIUM = new Set(["Source material 0", "Source material 1", "Source material 2", "Source material 3", "Source material 5", "Source material 6", "Source material 18", "Source material 21"]);

function sourceProfile(root) {
  const names = new Set();
  root.traverse(object => { for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) names.add(material.name); });
  if (names.has("[Translucent_Glass_Safety]")) return { name: "canopy", materials: CANOPY };
  if (names.has("[Color H01]1")) return { name: "towers", materials: TOWERS };
  if (names.has("Source material 0") && names.has("Source material 21")) return { name: "podium", materials: PODIUM };
  return { name: "unsupported", materials: new Set() };
}

/** Extract real source triangles for shadows; no boxes, hull guesses or changed source buffers.
 * The proxy contains only sizeable existing structural faces inside calibrated framingBounds.
 */
export function architectureShadowGeometry(modelRoot, config = {}, { minFaceArea = .10, maxTriangles = 45000 } = {}) {
  const b = config.framingBounds;
  const diagnostics = { profile: "unsupported", sourceTrianglesExamined: 0, sourceMeshes: 0, candidateTriangles: 0, proxyTriangles: 0, maxTriangles, minFaceArea, materials: {}, bounds: null };
  const geometry = new THREE.BufferGeometry();
  if (!b || ![b.minX,b.maxX,b.minY,b.maxY,b.minZ,b.maxZ].every(Number.isFinite)) return { geometry, diagnostics };
  modelRoot.updateWorldMatrix(true, true);
  const profile = sourceProfile(modelRoot); diagnostics.profile = profile.name;
  const modelInverse = modelRoot.matrixWorld.clone().invert();
  const worldBox = new THREE.Box3(new THREE.Vector3(b.minX, b.minY, b.minZ), new THREE.Vector3(b.maxX, b.maxY, b.maxZ));
  const worldPoint = new THREE.Vector3(), localPoint = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), cross = new THREE.Vector3();
  const candidates = [];
  modelRoot.traverse(object => {
    if (!object.isMesh || object.isSkinnedMesh || !object.geometry?.attributes?.position) return;
    const source = object.geometry, position = source.attributes.position, index = source.index;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const groups = Array.isArray(object.material) ? source.groups : [{ start: 0, count: index?.count || position.count, materialIndex: 0 }];
    const relative = modelInverse.clone().multiply(object.matrixWorld);
    let acceptedMesh = false;
    for (const group of groups) {
      const name = materials[group.materialIndex]?.name;
      if (!profile.materials.has(name)) continue;
      acceptedMesh = true;
      const end = Math.min(group.start + group.count, index?.count || position.count);
      for (let offset = group.start; offset + 2 < end; offset += 3) {
        diagnostics.sourceTrianglesExamined++;
        const points = [], world = []; let inside = true;
        for (let corner = 0; corner < 3; corner++) {
          const vertex = index ? index.getX(offset + corner) : offset + corner;
          localPoint.fromBufferAttribute(position, vertex);
          worldPoint.copy(localPoint).applyMatrix4(object.matrixWorld);
          if (!worldBox.containsPoint(worldPoint)) { inside = false; break; }
          world.push(worldPoint.clone()); points.push(localPoint.clone().applyMatrix4(relative));
        }
        if (!inside) continue;
        e1.subVectors(world[1], world[0]); e2.subVectors(world[2], world[0]);
        const area = cross.crossVectors(e1, e2).length() * .5;
        if (area < minFaceArea || !Number.isFinite(area)) continue;
        candidates.push({ points, area, name });
      }
    }
    if (acceptedMesh) diagnostics.sourceMeshes++;
  });
  diagnostics.candidateTriangles = candidates.length;
  // A hard budget retains the largest authored surfaces, not arbitrary every-N faces.
  if (candidates.length > maxTriangles) candidates.sort((a,b) => b.area - a.area).length = maxTriangles;
  const array = new Float32Array(candidates.length * 9);
  candidates.forEach((face, i) => {
    face.points.forEach((point, corner) => point.toArray(array, i * 9 + corner * 3));
    diagnostics.materials[face.name] = (diagnostics.materials[face.name] || 0) + 1;
  });
  geometry.setAttribute("position", new THREE.BufferAttribute(array, 3));
  if (array.length) { geometry.computeBoundingBox(); geometry.computeBoundingSphere(); diagnostics.bounds = { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() }; }
  diagnostics.proxyTriangles = candidates.length;
  return { geometry, diagnostics };
}

/** Attach root anywhere under the scene, call update before render, toggle with event view.
 * It neither changes source castShadow flags nor owns any source resource.
 */
export function createArchitectureShadows(modelRoot, config = {}) {
  const started = performance.now();
  const { geometry, diagnostics } = architectureShadowGeometry(modelRoot, config);
  const root = new THREE.Group(); root.name = "Verified architecture shadow surfaces"; root.visible = false; root.matrixAutoUpdate = false;
  const material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
  // MeshNormalMaterial in the AO GBuffer must not turn this invisible proxy
  // into an overlapping color/depth surface with missing vertex normals.
  material.allowOverride = false;
  material.name = "Shadow-only architecture proxy";
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = false; mesh.customDepthMaterial = depthMaterial; mesh.frustumCulled = true;
  root.add(mesh);
  const inverseParent = new THREE.Matrix4(); let disposed = false;
  diagnostics.enabled = false; diagnostics.elapsedMs = Math.round((performance.now() - started) * 10) / 10;
  function update() {
    if (disposed) return;
    modelRoot.updateWorldMatrix(true, false);
    if (root.parent) { root.parent.updateWorldMatrix(true, false); inverseParent.copy(root.parent.matrixWorld).invert(); root.matrix.multiplyMatrices(inverseParent, modelRoot.matrixWorld); }
    else root.matrix.copy(modelRoot.matrixWorld);
    root.matrixWorldNeedsUpdate = true;
  }
  function setEnabled(enabled) { if (disposed) return; root.visible = !!enabled && diagnostics.proxyTriangles > 0; diagnostics.enabled = root.visible; }
  function dispose() { if (disposed) return; disposed = true; root.removeFromParent(); root.clear(); geometry.dispose(); material.dispose(); depthMaterial.dispose(); diagnostics.enabled = false; }
  update();
  return { root, update, setEnabled, dispose, diagnostics };
}
