import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


export class AssetStore {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.sceneCache = new Map();
    this.jsonCache = new Map();
  }

  loadScene(url) {
    if (!this.sceneCache.has(url)) {
      const pending = this.gltfLoader.loadAsync(url).then((gltf) => gltf.scene);
      this.sceneCache.set(url, pending);
    }
    return this.sceneCache.get(url);
  }

  loadJson(url) {
    if (!this.jsonCache.has(url)) {
      const pending = fetch(url).then(async (response) => {
        if (!response.ok) {
          throw new Error(`JSON request failed (${response.status}): ${url}`);
        }
        return response.json();
      });
      this.jsonCache.set(url, pending);
    }
    return this.jsonCache.get(url);
  }
}
