import * as THREE from "three";

function color(value, fallback) {
  try {
    return new THREE.Color(value || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

function seededRandom(seedText) {
  let state = 2166136261;
  for (const char of String(seedText)) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function standardMaterial(value, options = {}) {
  return new THREE.MeshStandardMaterial({
    color: value,
    roughness: options.roughness ?? 0.86,
    metalness: options.metalness ?? 0.02,
    flatShading: true,
    emissive: options.emissive ?? "#000000",
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: Boolean(options.transparent),
    opacity: options.opacity ?? 1,
  });
}

function addBox(parent, name, size, position, material, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildThreshold(parent, entity, materials) {
  const group = new THREE.Group();
  group.name = "FIELD_Threshold";
  group.position.set(entity.position.x, 0, entity.position.z);
  addBox(group, "FIELD_ThresholdPostL", [0.24, 2.5, 0.24], [-1.25, 1.25, 0], materials.wood);
  addBox(group, "FIELD_ThresholdPostR", [0.24, 2.5, 0.24], [1.25, 1.25, 0], materials.wood);
  addBox(group, "FIELD_ThresholdLintel", [2.82, 0.28, 0.28], [0, 2.43, 0], materials.accent);
  for (let index = 0; index < 5; index += 1) {
    addBox(
      group,
      `FIELD_ThresholdToken_${index + 1}`,
      [0.28, 0.36, 0.06],
      [-0.72 + index * 0.36, 2.1 - Math.abs(2 - index) * 0.08, 0.17],
      index % 2 ? materials.paper : materials.accent,
      [0, 0, (index - 2) * 0.05],
    );
  }
  parent.add(group);
  return group;
}

function buildMemory(parent, entity, materials) {
  const group = new THREE.Group();
  group.name = "FIELD_MemoryFrame";
  group.position.set(entity.position.x, 0, entity.position.z);
  addBox(group, "FIELD_MemoryPlinth", [1.8, 0.3, 1.25], [0, 0.15, 0], materials.stone);
  addBox(group, "FIELD_MemoryLeft", [0.16, 1.55, 0.16], [-0.72, 1.02, 0], materials.wood);
  addBox(group, "FIELD_MemoryRight", [0.16, 1.55, 0.16], [0.72, 1.02, 0], materials.wood);
  addBox(group, "FIELD_MemoryTop", [1.6, 0.16, 0.16], [0, 1.76, 0], materials.wood);
  const memory = addBox(group, "FIELD_MemorySurface", [1.22, 1.04, 0.05], [0, 1.14, 0.03], materials.memory);
  memory.userData.fieldEntityId = entity.id;
  parent.add(group);
  return group;
}

function buildThread(parent, entity, materials) {
  const group = new THREE.Group();
  group.name = "FIELD_SharedThread";
  group.position.set(entity.position.x, 0, entity.position.z);
  addBox(group, "FIELD_ThreadBase", [1.7, 0.24, 1.3], [0, 0.12, 0], materials.stone);
  for (const side of [-1, 1]) {
    addBox(group, `FIELD_ThreadPost_${side}`, [0.16, 1.75, 0.16], [side * 0.68, 1.04, 0], materials.wood);
  }
  for (let index = 0; index < 6; index += 1) {
    const strand = addBox(
      group,
      `FIELD_ThreadStrand_${index + 1}`,
      [1.28, 0.035, 0.035],
      [0, 0.55 + index * 0.22, 0.04 + (index % 2) * 0.07],
      index % 2 ? materials.accent : materials.thread,
    );
    strand.userData.phase = index * 0.7;
  }
  parent.add(group);
  return group;
}

function buildEchoWell(parent, entity, materials) {
  const group = new THREE.Group();
  group.name = "FIELD_EchoWell";
  group.position.set(entity.position.x, 0, entity.position.z);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 1.02, 0.62, 10, 1, false),
    materials.stone,
  );
  base.position.y = 0.31;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const opening = new THREE.Mesh(
    new THREE.RingGeometry(0.48, 0.82, 12),
    materials.accent,
  );
  opening.name = "FIELD_EchoOpening";
  opening.rotation.x = -Math.PI * 0.5;
  opening.position.y = 0.64;
  group.add(opening);
  for (const side of [-1, 1]) {
    addBox(group, `FIELD_EchoPost_${side}`, [0.12, 1.45, 0.12], [side * 0.64, 1.22, 0], materials.wood);
  }
  addBox(group, "FIELD_EchoBeam", [1.5, 0.14, 0.14], [0, 1.9, 0], materials.wood);
  parent.add(group);
  return group;
}

function buildLandscape(parent, field, materials, random) {
  const ground = new THREE.Mesh(new THREE.CircleGeometry(9.4, 48), materials.ground);
  ground.name = "GROUND_RelationshipField";
  ground.rotation.x = -Math.PI * 0.5;
  ground.receiveShadow = true;
  parent.add(ground);

  const pathMaterial = materials.path;
  for (let index = 0; index < 19; index += 1) {
    const z = 6.1 - index * 0.58;
    const x = Math.sin(index * 0.62) * 0.38;
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42 + random() * 0.14, 0.46, 0.07, 7),
      pathMaterial,
    );
    stone.name = `FIELD_PathStone_${index + 1}`;
    stone.position.set(x, 0.035, z);
    stone.rotation.y = random() * Math.PI;
    stone.scale.z = 0.68 + random() * 0.3;
    stone.receiveShadow = true;
    parent.add(stone);
  }

  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2 + random() * 0.25;
    const radius = 6.8 + random() * 1.7;
    const hillX = Math.cos(angle) * radius;
    const hillZ = Math.sin(angle) * radius;
    // 出生点和第三人称相机位于场域南侧，中央入口必须保持完整视线。
    if (hillZ > 5.2 && Math.abs(hillX) < 4.5) continue;
    const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), materials.hill);
    hill.name = `FIELD_Hill_${index + 1}`;
    hill.position.set(hillX, 0.2, hillZ);
    hill.scale.set(1.4 + random(), 0.55 + random() * 0.35, 1.2 + random());
    hill.rotation.y = random() * Math.PI;
    hill.castShadow = true;
    hill.receiveShadow = true;
    parent.add(hill);
  }

  const plants = new THREE.Group();
  plants.name = "FIELD_Plants";
  for (let index = 0; index < 42; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 2.4 + random() * 5.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 1.05 && z > -5.4) continue;
    const plant = new THREE.Group();
    plant.name = `FIELD_Plant_${index + 1}`;
    plant.position.set(x, 0, z);
    plant.rotation.y = random() * Math.PI;
    plant.userData.phase = random() * Math.PI * 2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.52, 5), materials.stem);
    stem.position.y = 0.26;
    plant.add(stem);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 5), materials.leaf);
    crown.position.y = 0.62;
    crown.rotation.z = (random() - 0.5) * 0.18;
    plant.add(crown);
    plants.add(plant);
  }
  parent.add(plants);

  const companion = field.scene?.companion ?? { x: 0, z: -1.1 };
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.82, 0.18, 10), materials.accent);
  plinth.name = "FIELD_CompanionPlinth";
  plinth.position.set(companion.x, 0.09, companion.z);
  plinth.receiveShadow = true;
  parent.add(plinth);
}

export class RelationshipFieldSystem {
  constructor({ scene, field }) {
    this.scene = scene;
    this.field = field;
    this.root = new THREE.Group();
    this.root.name = "ROOT_RelationshipField";
    this.animations = [];
    this.hotspots = [];
    this.#build();
    scene.add(this.root);
  }

  #build() {
    const parameters = this.field.scene?.parameters ?? {};
    const accent = color(parameters.accent, "#dfaa60");
    const ground = color(parameters.ground, "#839a6c");
    const random = seededRandom(this.field.person_id ?? this.field.scene?.title ?? "field");
    const materials = {
      ground: standardMaterial(ground, { roughness: 1 }),
      hill: standardMaterial(ground.clone().multiplyScalar(0.82), { roughness: 1 }),
      path: standardMaterial(color(parameters.horizon, "#d8cfb5"), { roughness: 1 }),
      stone: standardMaterial("#67746d", { roughness: 0.98 }),
      wood: standardMaterial("#4d5145", { roughness: 0.96 }),
      accent: standardMaterial(accent, { roughness: 0.75, emissive: accent, emissiveIntensity: 0.08 }),
      paper: standardMaterial("#e9e0c8", { roughness: 0.92 }),
      memory: standardMaterial("#8eb0ae", { roughness: 0.6, emissive: "#5b8985", emissiveIntensity: 0.18 }),
      thread: standardMaterial("#c5d6c5", { roughness: 0.68 }),
      stem: standardMaterial("#526c55", { roughness: 1 }),
      leaf: standardMaterial("#76905f", { roughness: 1 }),
    };
    buildLandscape(this.root, this.field, materials, random);

    for (const entity of this.field.scene?.entities ?? []) {
      let object = null;
      if (entity.type === "threshold") object = buildThreshold(this.root, entity, materials);
      else if (entity.type === "memory") object = buildMemory(this.root, entity, materials);
      else if (entity.type === "thread") object = buildThread(this.root, entity, materials);
      else if (entity.type === "echo") object = buildEchoWell(this.root, entity, materials);
      if (!object) continue;
      object.userData.fieldEntityId = entity.id;
      this.animations.push(object);
      this.hotspots.push({
        id: `field-${entity.id}`,
        kind: entity.type,
        x: entity.position.x,
        z: entity.position.z,
        radius: 1.75,
        eyebrow: this.field.scene.title,
        title: entity.label,
        detail: entity.detail,
        prompt: entity.interaction?.label ?? "触碰这段关系线索",
        eventType: entity.interaction?.event_type ?? "field-entered",
        personId: this.field.person_id,
      });
    }

    this.root.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = object.name !== "GROUND_RelationshipField";
      object.receiveShadow = true;
    });
  }

  applyAtmosphere(scene) {
    const parameters = this.field.scene?.parameters ?? {};
    scene.background = color(parameters.sky, "#91bbb4");
    scene.fog = new THREE.Fog(color(parameters.fog, "#d6dfd2"), 8.5, 26);
  }

  update(elapsed) {
    const plants = this.root.getObjectByName("FIELD_Plants");
    if (plants) {
      for (const plant of plants.children) {
        plant.rotation.z = Math.sin(elapsed * 1.35 + plant.userData.phase) * 0.035;
      }
    }
    const thread = this.root.getObjectByName("FIELD_SharedThread");
    if (thread) {
      thread.children.forEach((child) => {
        if (!child.name.startsWith("FIELD_ThreadStrand")) return;
        child.position.z = 0.04 + Math.sin(elapsed * 1.6 + child.userData.phase) * 0.035;
      });
    }
    const opening = this.root.getObjectByName("FIELD_EchoOpening");
    if (opening) opening.rotation.z = elapsed * 0.08;
  }

  dispose() {
    this.scene.remove(this.root);
    const materials = new Set();
    this.root.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry?.dispose?.();
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.filter(Boolean).forEach((material) => materials.add(material));
    });
    materials.forEach((material) => material.dispose());
  }
}
