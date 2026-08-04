import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


export class AssetStore {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.gltfCache = new Map();
    this.jsonCache = new Map();
  }

  loadGltf(url) {
    if (!this.gltfCache.has(url)) {
      const pending = this.gltfLoader.loadAsync(url)
        .then(({ scene, animations = [] }) => ({ scene, animations }))
        .catch((error) => {
          if (this.gltfCache.get(url) === pending) this.gltfCache.delete(url);
          throw error;
        });
      this.gltfCache.set(url, pending);
    }
    return this.gltfCache.get(url);
  }

  loadScene(url) {
    return this.loadGltf(url).then((gltf) => gltf.scene);
  }

  loadJson(url) {
    if (!this.jsonCache.has(url)) {
      const pending = fetch(url)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`JSON request failed (${response.status}): ${url}`);
          }
          return response.json();
        })
        .catch((error) => {
          if (this.jsonCache.get(url) === pending) this.jsonCache.delete(url);
          throw error;
        });
      this.jsonCache.set(url, pending);
    }
    return this.jsonCache.get(url);
  }
}
