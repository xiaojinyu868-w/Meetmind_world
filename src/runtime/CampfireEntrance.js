import * as THREE from "three";

import { VILLAGE_CAMPFIRE_LAYOUT } from "./CampfireLayout.js";


const SIZE_TOLERANCE = 0.03;


function assertExpectedSize(size, expected) {
  const dimensions = [
    ["width", size.x, expected.width],
    ["height", size.y, expected.height],
    ["depth", size.z, expected.depth],
  ];
  for (const [label, actual, target] of dimensions) {
    if (Math.abs(actual - target) > SIZE_TOLERANCE) {
      throw new Error(
        `Campfire ${label} mismatch: expected ${target.toFixed(3)}m, got ${actual.toFixed(3)}m`,
      );
    }
  }
}


export class CampfireEntrance {
  constructor({ assetStore, assetCatalog, layout = VILLAGE_CAMPFIRE_LAYOUT }) {
    this.assetStore = assetStore;
    this.assetCatalog = assetCatalog;
    this.layout = layout;
    this.root = null;
    this.light = null;
    this.size = null;
  }

  async load() {
    const asset = this.assetCatalog.resolve(this.layout.assetId, "environment-module");
    const template = await this.assetStore.loadScene(asset.resolvedUrl);
    const root = template.clone(true);
    root.name = "PROP_VillageCampfire";
    root.userData.assetId = this.layout.assetId;
    root.userData.interaction = "group-play";

    root.updateMatrixWorld(true);
    const localBounds = new THREE.Box3().setFromObject(root);
    const localCenter = localBounds.getCenter(new THREE.Vector3());
    const size = localBounds.getSize(new THREE.Vector3());
    assertExpectedSize(size, this.layout.dimensions);

    root.position.set(
      this.layout.position.x - localCenter.x,
      this.layout.position.y - localBounds.min.y,
      this.layout.position.z - localCenter.z,
    );

    const light = new THREE.PointLight("#ff9a4e", 10, 6, 2);
    light.name = "LIGHT_VillageCampfire";
    light.position.set(localCenter.x, localBounds.min.y + size.y * 0.68, localCenter.z);
    root.add(light);

    this.root = root;
    this.light = light;
    this.size = size;
    return root;
  }

  update(elapsed) {
    if (!this.light) return;
    const flicker = Math.sin(elapsed * 6.7) + Math.sin(elapsed * 11.3) * 0.38;
    this.light.intensity = 10 + flicker * 1.15;
  }

  dispose() {
    this.root?.removeFromParent();
    this.root = null;
    this.light = null;
  }
}
