import * as THREE from "three";

const projected = new THREE.Vector3();
const toCamera = new THREE.Vector3();

/** Pick which people get a floating name: self and the selected person always,
 * then the nearest on-screen guests whose tag would not collide with one
 * already placed, up to the budget. Pure for testing. */
export function chooseLabels(entries, { selfId = null, selectedId = null, budget = 10, maxDistance = 34, width = Infinity } = {}) {
  const pinned = [], rest = [];
  for (const entry of entries) {
    if (!entry.onScreen) continue;
    if (entry.id === selfId || entry.id === selectedId) pinned.push(entry);
    else if (entry.distance <= maxDistance) rest.push(entry);
  }
  rest.sort((a, b) => a.distance - b.distance);
  const placed = [], boxes = [];
  const box = entry => { const w = entry.width || 90, x = Math.min(Math.max(entry.x, w / 2 + 6), width - w / 2 - 6); return { x0: x - w / 2, x1: x + w / 2, y0: entry.y - 30, y1: entry.y }; };
  const overlaps = b => boxes.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  for (const entry of [...pinned, ...rest]) {
    if (placed.length >= Math.max(budget, pinned.length)) break;
    const b = box(entry);
    if (!pinned.includes(entry) && overlaps(b)) continue;
    placed.push(entry); boxes.push(b);
  }
  return placed;
}

export function createWorldLabels({ container = document.body, budget = 10 } = {}) {
  const layer = document.createElement("div");
  layer.className = "court-labels";
  layer.setAttribute("aria-hidden", "true");
  container.append(layer);
  const nodes = new Map();
  let hidden = false;

  function node(id) {
    let element = nodes.get(id);
    if (!element) {
      element = document.createElement("span");
      element.className = "court-label";
      element.innerHTML = "<i></i><b></b><em></em>";
      layer.append(element);
      nodes.set(id, element);
    }
    return element;
  }

  function update(camera, people, { selfId = null, selectedId = null, pendingIds = new Set(), width = innerWidth, height = innerHeight } = {}) {
    if (hidden) return;
    const entries = [];
    for (const [id, value] of people) {
      const root = value.root;
      if (!root.visible || !root.parent?.visible) continue;
      projected.copy(root.position);
      projected.y += (value.height || 1.75) * root.scale.y + 0.32;
      toCamera.copy(projected).sub(camera.position);
      const distance = toCamera.length();
      projected.project(camera);
      const onScreen = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.05 && projected.y > -1.05 && projected.y < 1.1;
      const text = id === selfId ? `你 · ${value.person?.name || ""}` : value.person?.name || "";
      entries.push({ id, value, distance, onScreen, x: (projected.x + 1) / 2 * width, y: (1 - projected.y) / 2 * height, width: 34 + [...text].reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 12.5 : 7), 0) });
    }
    const visible = new Set();
    for (const entry of chooseLabels(entries, { selfId, selectedId, budget, width })) {
      entry.x = Math.min(Math.max(entry.x, entry.width / 2 + 6), width - entry.width / 2 - 6);
      const element = node(entry.id);
      const person = entry.value.person;
      const self = entry.id === selfId;
      element.dataset.kind = self ? "self" : entry.id === selectedId ? "selected" : "guest";
      element.style.setProperty("--c", entry.value.labelColor || "#7f9a7b");
      const label = self ? `你 · ${person.name}` : person.name;
      if (element.dataset.text !== label) { element.dataset.text = label; element.querySelector("b").textContent = label; }
      element.querySelector("em").hidden = !pendingIds.has(entry.id);
      const fade = self || entry.id === selectedId ? 1 : Math.max(0.35, Math.min(1, 1.25 - entry.distance / 40));
      element.style.opacity = String(fade);
      element.style.transform = `translate3d(${entry.x.toFixed(1)}px,${entry.y.toFixed(1)}px,0) translate(-50%,-100%) scale(${(0.82 + fade * 0.18).toFixed(3)})`;
      element.hidden = false;
      visible.add(entry.id);
    }
    for (const [id, element] of nodes) {
      if (visible.has(id)) continue;
      if (!people.has(id)) { element.remove(); nodes.delete(id); }
      else element.hidden = true;
    }
  }

  function setHidden(value) {
    hidden = !!value;
    layer.hidden = hidden;
  }
  function dispose() { layer.remove(); nodes.clear(); }
  return { layer, update, setHidden, dispose };
}
