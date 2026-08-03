function lineMarkup(edge, peopleById, currentUserId) {
  const [fromId, toId] = edge;
  const from = peopleById.get(fromId);
  const to = peopleById.get(toId);
  if (!from || !to) return "";
  const primary = fromId === currentUserId || toId === currentUserId;
  return `
    <line
      class="relationship-line${primary ? " is-primary" : ""}"
      x1="${from.graph.x}"
      y1="${from.graph.y}"
      x2="${to.graph.x}"
      y2="${to.graph.y}"
    />`;
}

function nodeMarkup(person, { currentUserId, selectedId }) {
  const isSelf = person.id === currentUserId;
  const selected = person.id === selectedId;
  const relationship = isSelf ? "我的坐标" : person.relation;
  return `
    <button
      class="relationship-node${isSelf ? " is-self" : ""}${selected ? " is-selected" : ""}"
      style="--node-x: ${person.graph.x}%; --node-y: ${person.graph.y}%"
      type="button"
      data-person-id="${person.id}"
      aria-label="${isSelf ? person.displayName : person.name}，${relationship}"
      ${isSelf ? "aria-current=\"true\"" : ""}
    >
      <span class="node-orbit" aria-hidden="true"></span>
      <span class="node-avatar">
        <img src="${person.portrait}" alt="" draggable="false" />
      </span>
      <span class="node-caption">
        <strong>${isSelf ? person.displayName : person.name}</strong>
        <small>${relationship}</small>
      </span>
    </button>`;
}

export function renderRelationshipGraph(
  container,
  { currentUser, people, relationships, selectedId = null },
) {
  const everyone = [currentUser, ...people];
  const peopleById = new Map(everyone.map((person) => [person.id, person]));
  container.innerHTML = `
    <div class="relationship-map" aria-label="人物关系网络">
      <svg class="relationship-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${relationships.map((edge) => lineMarkup(edge, peopleById, currentUser.id)).join("")}
      </svg>
      <div class="map-pulse" aria-hidden="true"></div>
      ${everyone
        .map((person) => nodeMarkup(person, { currentUserId: currentUser.id, selectedId }))
        .join("")}
    </div>`;
}
