import * as THREE from "three";


export const HUB_BLOCKOUT_LAYOUT = Object.freeze({
  bounds: Object.freeze({ minX: -6.5, maxX: 6.5, minZ: -13.7, maxZ: 8.8 }),
  market: Object.freeze({ width: 10.6, length: 10.8, centerZ: -8.2 }),
  plaza: Object.freeze({ x: 0, z: 2.5, radius: 6.2 }),
  cafePortal: Object.freeze({ x: -4.1, z: 0.6 }),
  campfire: Object.freeze({ x: 0, z: 2.5 }),
  broadcast: Object.freeze({ x: 5.7, z: 2.8 }),
});

const BOOTH_SLOTS = Object.freeze([
  Object.freeze({ x: -4, z: -12.6 }),
  Object.freeze({ x: 4, z: -12.6 }),
  Object.freeze({ x: -4, z: -9.7 }),
  Object.freeze({ x: 4, z: -9.7 }),
  Object.freeze({ x: -4, z: -6.8 }),
  Object.freeze({ x: 4, z: -6.8 }),
  Object.freeze({ x: -4, z: -3.9 }),
  Object.freeze({ x: 4, z: -3.9 }),
]);


function material(name, color) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
  });
}


function addBox(root, name, size, position, sourceMaterial) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), sourceMaterial);
  mesh.name = name;
  mesh.position.set(...position);
  root.add(mesh);
  return mesh;
}


function addAnchor(root, name, x, z, kind) {
  const anchor = new THREE.Group();
  anchor.name = name;
  anchor.position.set(x, 0, z);
  anchor.userData.kind = kind;
  root.add(anchor);
  return anchor;
}


function addInteractionMarker(root, { name, x, z, color, shape = "box" }) {
  const markerMaterial = material(`MAT_${name}`, color);
  const mesh = shape === "cylinder"
    ? new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.28, 24), markerMaterial)
    : new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25), markerMaterial);
  mesh.name = name;
  mesh.position.set(x, shape === "cylinder" ? 0.14 : 0.625, z);
  mesh.userData.interactionPlaceholder = true;
  root.add(mesh);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.25, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 }),
  );
  beacon.name = `${name}_Beacon`;
  beacon.position.set(x, 1.9, z);
  root.add(beacon);
  return mesh;
}


export function createHubBlockoutEnvironment() {
  const root = new THREE.Group();
  root.name = "ROOT_HubBlockoutV1";
  root.userData.schema = "echo-hub-blockout.v1";

  const marketMaterial = material("MAT_BlockoutMarket", "#a8b790");
  const plazaMaterial = material("MAT_BlockoutPlaza", "#c7b99a");
  const slotMaterial = material("MAT_BlockoutBoothSlot", "#73856b");
  const boundaryMaterial = material("MAT_BlockoutBoundary", "#57645b");

  const market = addBox(
    root,
    "GROUND_MarketStrip",
    [HUB_BLOCKOUT_LAYOUT.market.width, 0.16, HUB_BLOCKOUT_LAYOUT.market.length],
    [0, -0.08, HUB_BLOCKOUT_LAYOUT.market.centerZ],
    marketMaterial,
  );
  market.userData.zone = "market";

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(
      HUB_BLOCKOUT_LAYOUT.plaza.radius,
      HUB_BLOCKOUT_LAYOUT.plaza.radius,
      0.16,
      48,
    ),
    plazaMaterial,
  );
  plaza.name = "GROUND_PlazaCircle";
  plaza.position.set(HUB_BLOCKOUT_LAYOUT.plaza.x, -0.08, HUB_BLOCKOUT_LAYOUT.plaza.z);
  plaza.userData.zone = "plaza";
  root.add(plaza);

  for (const [index, slot] of BOOTH_SLOTS.entries()) {
    const pad = addBox(
      root,
      `PAD_Booth_${String(index + 1).padStart(2, "0")}`,
      [1.9, 0.08, 1.35],
      [slot.x, 0.04, slot.z],
      slotMaterial,
    );
    pad.userData.placeholder = "booth";
  }

  addBox(root, "BLOCKOUT_MarketBoundary_L", [0.12, 0.28, 10.8], [-5.35, 0.14, -8.2], boundaryMaterial);
  addBox(root, "BLOCKOUT_MarketBoundary_R", [0.12, 0.28, 10.8], [5.35, 0.14, -8.2], boundaryMaterial);

  addInteractionMarker(root, {
    name: "INTERACT_CafePortal",
    ...HUB_BLOCKOUT_LAYOUT.cafePortal,
    color: "#d96f5d",
  });
  addInteractionMarker(root, {
    name: "INTERACT_Campfire",
    ...HUB_BLOCKOUT_LAYOUT.campfire,
    color: "#e9b949",
    shape: "cylinder",
  });
  addInteractionMarker(root, {
    name: "INTERACT_Broadcast",
    ...HUB_BLOCKOUT_LAYOUT.broadcast,
    color: "#4f88a8",
  });

  addAnchor(root, "ANCHOR_PlayerSpawn", 0, -12.8, "spawn");
  addAnchor(root, "ANCHOR_CafeDoor", HUB_BLOCKOUT_LAYOUT.cafePortal.x, HUB_BLOCKOUT_LAYOUT.cafePortal.z, "venue");
  addAnchor(root, "ANCHOR_Campfire", HUB_BLOCKOUT_LAYOUT.campfire.x, HUB_BLOCKOUT_LAYOUT.campfire.z, "group-session");
  addAnchor(root, "ANCHOR_Broadcast", HUB_BLOCKOUT_LAYOUT.broadcast.x, HUB_BLOCKOUT_LAYOUT.broadcast.z, "broadcast");

  return root;
}
