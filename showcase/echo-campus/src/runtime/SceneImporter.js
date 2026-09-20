import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { validateManifest } from "./SceneManifest.js";

// Decoder files belong to the app, not the imported model. A separate manager
// lets compressed local GLBs work without loosening external-resource checks.
export async function loadGLTFWithDraco(url, manager, {
  GLTFLoaderImpl = GLTFLoader, DRACOLoaderImpl = DRACOLoader,
  baseUrl = import.meta.env?.BASE_URL || "./",
} = {}) {
  const draco = new DRACOLoaderImpl(new THREE.LoadingManager());
  try {
    draco.setDecoderPath(baseUrl.replace(/\/?$/, "/") + "draco/");
    draco.setWorkerLimit(2);
    const loader = new GLTFLoaderImpl(manager);
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
    return await loader.loadAsync(url);
  } finally {
    draco.dispose();
  }
}

export function disposeObjectResources(root) {
  const roots = Array.isArray(root) ? root : [root];
  const geometries = new Set(), materials = new Set(), textures = new Set(), bitmaps = new Set(), skeletons = new Set();
  for (const node of roots) node?.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.skeleton) skeletons.add(object.skeleton);
    const list = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
    for (const material of list) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      for (const uniform of Object.values(material.uniforms || {})) if (uniform?.value?.isTexture) textures.add(uniform.value);
    }
  });
  for (const texture of textures) {
    const images = Array.isArray(texture.image) ? texture.image : [texture.image];
    for (const image of images) if (typeof image?.close === "function") bitmaps.add(image);
    texture.dispose();
  }
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const skeleton of skeletons) skeleton.dispose();
  for (const bitmap of bitmaps) bitmap.close();
}

function sceneLayout(config) {
  const b = config.bounds;
  const clampPoint = p => ({ ...p, x: THREE.MathUtils.clamp(p.x, b.minX, b.maxX), z: THREE.MathUtils.clamp(p.z, b.minZ, b.maxZ) });
  const arrival = config.anchors.arrival ?? { ...config.spawn };
  const meeting = config.anchors.meeting ?? clampPoint({ x: arrival.x + 4, y: config.groundY, z: arrival.z - 3 });
  const center = { x: (b.minX+b.maxX)/2, z: (b.minZ+b.maxZ)/2 };
  const extent = Math.max(b.maxX-b.minX,b.maxZ-b.minZ,8);
  const y = config.groundY;
  const cameras = {
    hero: { position:[center.x+extent*.62,y+extent*.40,center.z+extent*.72], target:[center.x,y+2,center.z], fov:45 },
    arrival: { position:[arrival.x+6,arrival.y+4,arrival.z+7], target:[arrival.x,arrival.y+1.4,arrival.z], fov:45 },
    garden: { position:[meeting.x+9,meeting.y+5,meeting.z+9], target:[meeting.x,meeting.y+1,meeting.z], fov:45 },
    aerial: { position:[center.x+extent*.5,y+extent*.8,center.z+extent*.6], target:[center.x,y,center.z], fov:50 },
    ...config.cameras,
  };
  const people = config.anchors.people ?? Array.from({length:18}, (_,i) => clampPoint({
    x:arrival.x+Math.cos(i*2.4)*(3+i*.23), y,
    z:arrival.z-4+Math.sin(i*2.4)*(3+i*.23),
  }));
  return { anchors:{ ...config.anchors, arrival, meeting, people }, cameras };
}
export async function importScene(input, {
  renderer, file, onProgress = () => {},
  // Dependency injection keeps cleanup and validation testable without a browser or GPU.
  loadGLTF, loadSpark, objectUrls = URL,
} = {}) {
  const config = validateManifest(input);
  if (config.type === "procedural") throw new Error("程序化场景请从列表选择");
  if (file?.size > 512 * 1024 * 1024) throw new Error("当前本地导入支持不超过 512 MB 的模型，请先压缩或拆分");
  const root = new THREE.Group(); root.name = config.name;
  const modelRoot = new THREE.Group(); root.add(modelRoot);
  let spark = null, resource = null, objectUrl = null, gltfScenes = [], disposed = false;
  function dispose() {
    if (disposed) return; disposed = true;
    if (config.type === "splat") {
      try { resource?.dispose?.(); } finally { spark?.dispose?.(); }
    } else {
      disposeObjectResources(gltfScenes);
    }
    root.clear();
    if (objectUrl) { objectUrls.revokeObjectURL(objectUrl); objectUrl = null; }
  }
  try {
    const url = file ? (objectUrl = objectUrls.createObjectURL(file)) : config.url;
    if (!url) throw new Error("请选择模型文件或填写地址");
    onProgress("正在载入 " + config.name);
    if (config.type === "glb") {
      if (file && /\.gltf$/i.test(file.name)) {
        let json;
        try { json = JSON.parse(await file.text()); } catch { throw new Error("GLTF 文件不是有效 JSON"); }
        const uris = [...(json.buffers || []), ...(json.images || [])].map(item => item.uri).filter(Boolean);
        if (uris.some(uri => typeof uri !== "string" || !uri.startsWith("data:"))) throw new Error("本地 GLTF 须内嵌纹理与缓冲区；请导出为单个 GLB 后重试");
      }
      const manager = new THREE.LoadingManager();
      if (file) manager.setURLModifier(requested => {
        if (requested === objectUrl || /^(blob:|data:)/.test(requested)) return requested;
        throw new Error("本地模型包含外部资源，请导出为自包含 GLB");
      });
      const gltf = await (loadGLTF ? loadGLTF(url, manager) : loadGLTFWithDraco(url, manager));
      gltfScenes = [...new Set([...(gltf.scenes || []), ...(gltf.scene ? [gltf.scene] : [])])];
      resource = gltf.scene || gltfScenes[0];
      if (!resource?.isObject3D) throw new Error("GLB 未包含可显示的场景");
      resource.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    } else {
      if (!renderer) throw new Error("Splat 场景需要可用的 WebGL 渲染器");
      const { SparkRenderer, SplatMesh } = await (loadSpark ? loadSpark() : import("@sparkjsdev/spark"));
      spark = new SparkRenderer({ renderer }); root.add(spark);
      resource = new SplatMesh(file ? { fileBytes: await file.arrayBuffer(), fileName: file.name } : { url });
      await resource.initialized;
    }
    modelRoot.add(resource);
    modelRoot.scale.setScalar(config.scale);
    modelRoot.position.fromArray(config.position);
    modelRoot.rotation.set(...config.rotation.map(THREE.MathUtils.degToRad));
    const layout = sceneLayout(config);
    return {
      root, modelRoot, config, bounds: config.bounds, spawn: config.spawn,
      anchors: layout.anchors, cameras: layout.cameras, colliders: config.colliders,
      update() {}, dispose,
    };
  } catch (error) {
    try { dispose(); } catch {}
    throw error;
  }
}
