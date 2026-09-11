import * as THREE from "three";
import { buildRecipe, syncRecipe, disposeRecipe } from "./RecipeGeometry.js";

const COLORS = Object.freeze({
  person: 0x719b8c,
  artifact: 0xe4a266,
  "memory-object": 0x8b99b2,
  action: 0xad9274,
});
const POSITIONS = Object.freeze({
  alice: [-3.25, 0, 1.25], bo: [-2, 0, -2],
  "candidate-e": [-4.3, 0, -1.3], "memory-1": [0, 0, -1.1],
  "artifact-1": [0.5, 0, 2.2], "action-1": [3.4, 0, -0.2],
});

function dispose(object) {
  object.traverse((child) => {
    child.geometry?.dispose();
    if (child.material) {
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        material.dispose();
      }
    }
  });
}

function mesh(parent, geometry, color, position, rotation = [0, 0, 0]) {
  const result = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.76 }));
  result.position.set(...position);
  result.rotation.set(...rotation);
  result.castShadow = true;
  result.receiveShadow = true;
  parent.add(result);
  return result;
}

function createObject(entity) {
  const group = new THREE.Group();
  group.userData.entityId = entity.id;
  const color = COLORS[entity.kind] ?? 0xa8adab;
  const base = mesh(group, new THREE.CylinderGeometry(0.77, 0.87, 0.16, 48), 0xf1ece1, [0, 0.08, 0]);
  group.userData.base = base;
  if (entity.kind === "person") {
    mesh(group, new THREE.CylinderGeometry(0.46, 0.53, 0.5, 40), color, [0, 0.4, 0]);
    mesh(group, new THREE.TorusGeometry(0.3, 0.055, 12, 40), 0xfaf1d9, [0, 1.02, 0], [Math.PI / 2, 0, 0]);
    mesh(group, new THREE.SphereGeometry(0.19, 24, 16), 0xf2ddbd, [0, 1.12, 0]);
  } else if (entity.kind === "artifact") {
    // A folded paper bridge, authored as connected panels rather than a proxy cube.
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 0.17;
      const y = 0.4 + 0.55 * Math.cos(x * 1.7);
      const angle = Math.atan(-0.55 * 1.7 * Math.sin(x * 1.7));
      mesh(group, new THREE.BoxGeometry(0.185, 0.055, 0.85), i % 2 ? 0xf5d6a7 : 0xf6e8ce, [x, y, 0], [0, 0, angle]);
    }
    mesh(group, new THREE.BoxGeometry(1.7, 0.045, 0.96), color, [0, 0.24, 0]);
  } else if (entity.kind === "memory-object") {
    for (const side of [-1, 1]) {
      mesh(group, new THREE.BoxGeometry(0.66, 0.085, 0.95), color, [side * 0.32, 0.42, 0], [0, 0, side * 0.13]);
      for (let i = 0; i < 4; i++) {
        mesh(group, new THREE.BoxGeometry(0.64, 0.015, 0.9), 0xfff5df,
          [side * 0.32, 0.48 + i * 0.019, 0], [0, 0, side * 0.13]);
      }
    }
  } else {
    mesh(group, new THREE.CylinderGeometry(0.38, 0.46, 0.66, 40), color, [0, 0.51, 0]);
    mesh(group, new THREE.TorusGeometry(0.36, 0.045, 12, 48), 0xf9f0d5, [0, 1.13, 0], [Math.PI / 2, 0, 0]);
    const indicator = mesh(group, new THREE.SphereGeometry(0.15, 24, 16), 0xc9b696, [0, 1.36, 0]);
    group.userData.indicator = indicator;
  }
  const defaultVisual = new THREE.Group();
  for (const child of [...group.children]) {
    if (child !== base) defaultVisual.add(child);
  }
  group.add(defaultVisual);
  group.userData.defaultVisual = defaultVisual;
  return group;
}

export class SemanticObjects {
  constructor(scene) {
    this.scene = scene;
    this.objects = new Map();
    this.edges = new THREE.Group();
    scene.add(this.edges);
    this.created = 0;
    this.removed = 0;
  }

  apply(state) {
    const visible = new Set();
    for (const entity of state.entities) {
      if (entity.kind === "world") continue;
      visible.add(entity.id);
      let object = this.objects.get(entity.id);
      if (!object) {
        object = createObject(entity);
        const hash = [...entity.id].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) >>> 0;
        const position = POSITIONS[entity.id] ?? [Math.cos(hash) * 3.5, 0, Math.sin(hash) * 3.5];
        object.position.set(...position);
        this.objects.set(entity.id, object);
        this.scene.add(object);
        this.created++;
      }
      object.userData.entity = entity;
      const signature = entity.appearance ? JSON.stringify(entity.appearance) : null;
      if (signature !== (object.userData.recipeSignature ?? null)) {
        let visual = object.userData.recipeVisual ?? null;
        let error = null;
        if (entity.appearance) {
          try {
            if (visual) syncRecipe(visual, entity.appearance);
            else {
              visual = buildRecipe(entity.appearance);
              visual.position.y = 0.16;
              object.add(visual);
            }
          } catch (cause) {
            // Keep the last valid appearance when a later proposal is malformed.
            error = cause.message;
          }
        } else if (visual) {
          object.remove(visual);
          disposeRecipe(visual);
          visual = null;
        }
        object.userData.defaultVisual.visible = !visual;
        object.userData.recipeVisual = visual;
        object.userData.recipeSignature = signature;
        object.userData.recipeError = error;
      }
      if (entity.kind === "action") {
        const reported = Object.values(entity.outcomes).some((item) => item.result === "completed");
        object.userData.indicator.material.color.setHex(entity.basis_status === "withdrawn" ? 0xbb7165 : reported ? 0x709b79 : 0xc9b696);
      }
    }
    for (const [id, object] of this.objects) {
      if (visible.has(id)) continue;
      this.scene.remove(object);
      dispose(object);
      this.objects.delete(id);
      this.removed++;
    }
    dispose(this.edges);
    this.edges.clear();
    for (const edge of state.relationships) {
      const from = this.objects.get(edge.from);
      const to = this.objects.get(edge.to);
      if (!from || !to) continue;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        from.position.clone().setY(0.18), to.position.clone().setY(0.18),
      ]);
      this.edges.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x96aa9f })));
    }
  }

  select(id) {
    for (const [key, object] of this.objects) {
      object.userData.base.material.color.setHex(key === id ? 0xeac98a : 0xf1ece1);
    }
  }

  dispose() {
    for (const object of this.objects.values()) {
      this.scene.remove(object);
      dispose(object);
    }
    this.objects.clear();
    this.scene.remove(this.edges);
    dispose(this.edges);
  }
}
