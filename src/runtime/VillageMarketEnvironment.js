import * as THREE from "three";


export const VILLAGE_MARKET_LAYOUT = Object.freeze({
  bounds: Object.freeze({ minX: -30, maxX: 30, minZ: -30, maxZ: 30 }),
  floorY: 0,
  visualOffset: Object.freeze({ x: 3, y: 0.66, z: -3 }),
  cafeDoor: Object.freeze({ x: -7.75, z: 5.06 }),
});


export function createVillageMarketEnvironment(villageScene) {
  const root = new THREE.Group();
  root.name = "ROOT_VillageMarket";
  root.userData.schema = "echo-village-market.v1";

  villageScene.name = "VISUAL_VillageMarket";
  // The source village ground sits at Blender Z ~= -0.66. Lift only the visual
  // asset so the existing world anchors, characters, and interaction systems
  // can keep using their established y=0 contract.
  villageScene.position.set(
    VILLAGE_MARKET_LAYOUT.visualOffset.x,
    VILLAGE_MARKET_LAYOUT.visualOffset.y,
    VILLAGE_MARKET_LAYOUT.visualOffset.z,
  );
  root.add(villageScene);

  // The source village remains a visual-only layer. This transparent plane is
  // the sole terrain ray target, so characters always walk on one flat level.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(62, 62),
    new THREE.MeshBasicMaterial({
      name: "MAT_VillageWalkPlane",
      color: "#ffffff",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  floor.name = "GROUND_VillageWalkPlane";
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.y = VILLAGE_MARKET_LAYOUT.floorY;
  floor.userData.walkable = true;
  floor.userData.visualOnlyEnvironment = true;
  root.add(floor);

  const cafeDoorAnchor = new THREE.Group();
  cafeDoorAnchor.name = "ANCHOR_CafeDoor";
  cafeDoorAnchor.position.set(
    VILLAGE_MARKET_LAYOUT.cafeDoor.x,
    VILLAGE_MARKET_LAYOUT.floorY,
    VILLAGE_MARKET_LAYOUT.cafeDoor.z,
  );
  cafeDoorAnchor.userData.kind = "venue";
  root.add(cafeDoorAnchor);

  return root;
}
