import * as THREE from "three";

const box = new THREE.Box3();
const point = new THREE.Vector3();

// Pick a stable standing volume, not every deformed triangle on every pointer
// event. Full clips can raise a hand outside an Idle mesh's cached bounds.
export function pickSocialPerson(ray, characters, { near = 0, far = Infinity } = {}) {
  let best = null;
  for (const character of characters) {
    const { root } = character;
    if (!root.visible) continue;
    const scale = root.scale.x, height = (character.height || 1.78) * scale;
    const radius = 0.42 * scale, p = root.position;
    box.min.set(p.x - radius, p.y + 0.025 * scale, p.z - radius);
    box.max.set(p.x + radius, p.y + height + 0.06 * scale, p.z + radius);
    if (!ray.intersectBox(box, point)) continue;
    const distance = point.distanceTo(ray.origin);
    if (distance < near || distance > far || (best && distance >= best.distance)) continue;
    best = { distance, object: root, point: point.clone() };
  }
  return best;
}
