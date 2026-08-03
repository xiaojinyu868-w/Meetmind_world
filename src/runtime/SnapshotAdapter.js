import { CAFE_LAYOUT } from "./CafeLayout.js";


export const SNAPSHOT_SCHEMA = "echo-snapshot.v1";
export const AGENT_STATES = Object.freeze(["walking", "seated", "talking", "in-meeting", "at-booth"]);

// seated/talking 位置与座位锚点的最大偏差，超过则认为快照未对齐座位
const SEAT_SNAP_RADIUS = 1.4;

const NPC_SEATS = Object.freeze(
  CAFE_LAYOUT.npcTables.flatMap((table) =>
    table.seats.map((seat, seatIndex) =>
      Object.freeze({
        tableId: table.id,
        tableLabel: table.label,
        seatIndex,
        x: seat.x,
        z: seat.z,
        yaw: seat.yaw,
      }),
    ),
  ),
);

const ROUNDTABLE_SEATS = Object.freeze(
  CAFE_LAYOUT.roundtable.seats.map((seat, seatIndex) =>
    Object.freeze({
      tableId: CAFE_LAYOUT.roundtable.id,
      tableLabel: CAFE_LAYOUT.roundtable.label,
      seatIndex,
      x: seat.x,
      z: seat.z,
      yaw: seat.yaw,
    }),
  ),
);

const EVENT_TYPE_ALIASES = Object.freeze({
  "meeting-start": "meeting-started",
  "meeting-end": "meeting-ended",
});


function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}


export function normalizeAgentState(state) {
  const token = String(state ?? "").trim().toLowerCase();
  return AGENT_STATES.includes(token) ? token : "walking";
}


export function normalizeEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== "object") return null;
  const rawType = String(rawEvent.type ?? "").trim();
  if (!rawType) return null;
  return {
    type: EVENT_TYPE_ALIASES[rawType] ?? rawType,
    agentId:
      typeof rawEvent.agent_id === "string"
        ? rawEvent.agent_id
        : (typeof rawEvent.agentId === "string" ? rawEvent.agentId : null),
    toAgentId:
      typeof rawEvent.to_agent_id === "string"
        ? rawEvent.to_agent_id
        : (typeof rawEvent.toAgentId === "string"
            ? rawEvent.toAgentId
            : (typeof rawEvent.target_id === "string" ? rawEvent.target_id : null)),
    text: typeof rawEvent.text === "string" ? rawEvent.text : "",
    participants: Array.isArray(rawEvent.participants)
      ? rawEvent.participants.filter((id) => typeof id === "string")
      : [],
    tick: finiteNumber(rawEvent.tick),
  };
}


function nearestFreeSeat(seats, takenSeats, x, z, maxDistance = Infinity) {
  let best = null;
  let bestDistance = maxDistance;
  for (const seat of seats) {
    if (takenSeats.has(`${seat.tableId}:${seat.seatIndex}`)) continue;
    const distance = Math.hypot(seat.x - x, seat.z - z);
    if (distance <= bestDistance) {
      best = seat;
      bestDistance = distance;
    }
  }
  return best;
}


function adaptAgent(rawAgent, { knownPeople, takenSeats }) {
  if (!rawAgent || typeof rawAgent !== "object" || Array.isArray(rawAgent)) return null;
  const id =
    typeof rawAgent.id === "string" && rawAgent.id.trim() !== ""
      ? rawAgent.id
      : (typeof rawAgent.person_id === "string" && rawAgent.person_id.trim() !== ""
          ? rawAgent.person_id
          : null);
  if (!id) return null;

  const state = normalizeAgentState(rawAgent.state);
  const rawPosition = rawAgent.position ?? {};
  const x = finiteNumber(rawPosition.x);
  const z = finiteNumber(rawPosition.z);
  const position =
    x === null || z === null ? null : { x, z, yaw: finiteNumber(rawPosition.yaw) ?? 0 };

  const snapshotPalette = rawAgent.avatar?.palette;
  const palette =
    snapshotPalette && typeof snapshotPalette === "object" && !Array.isArray(snapshotPalette)
      ? snapshotPalette
      : (knownPeople.get(id)?.palette ?? null);

  let seat = null;
  if (position) {
    if (state === "in-meeting") {
      seat = nearestFreeSeat(ROUNDTABLE_SEATS, takenSeats, position.x, position.z);
    } else if (state === "seated" || state === "talking") {
      seat = nearestFreeSeat(NPC_SEATS, takenSeats, position.x, position.z, SEAT_SNAP_RADIUS);
    }
  }
  if (seat) takenSeats.add(`${seat.tableId}:${seat.seatIndex}`);

  return { id, state, position, palette, seat };
}


// 快照（echo-snapshot.v1）→ 前端渲染结构。纯函数，字段缺失一律防御。
export function adaptSnapshot(rawSnapshot, { people = [], reservedRoundtableSeats = [] } = {}) {
  const knownPeople = new Map(
    (Array.isArray(people) ? people : [])
      .filter((person) => person && typeof person.id === "string")
      .map((person) => [person.id, person]),
  );
  const takenSeats = new Set();
  for (const seatIndex of reservedRoundtableSeats) {
    takenSeats.add(`${CAFE_LAYOUT.roundtable.id}:${seatIndex}`);
  }

  const rawAgents = Array.isArray(rawSnapshot?.agents) ? rawSnapshot.agents : [];
  // in-meeting 优先按 id 排序分配圆桌座位，保证多人参会时座位确定且不重叠
  const sortedAgents = [...rawAgents].sort((left, right) => {
    const leftMeeting = normalizeAgentState(left?.state) === "in-meeting" ? 0 : 1;
    const rightMeeting = normalizeAgentState(right?.state) === "in-meeting" ? 0 : 1;
    if (leftMeeting !== rightMeeting) return leftMeeting - rightMeeting;
    return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
  });

  const agents = sortedAgents
    .map((rawAgent) => adaptAgent(rawAgent, { knownPeople, takenSeats }))
    .filter(Boolean);
  const events = (Array.isArray(rawSnapshot?.events) ? rawSnapshot.events : [])
    .map(normalizeEvent)
    .filter(Boolean);
  // modules 原样透传（booth 等展示数据归 BoothSystem 消费），仅做对象/id 防御
  const modules = (Array.isArray(rawSnapshot?.modules) ? rawSnapshot.modules : []).filter(
    (module) => module && typeof module === "object" && typeof module.id === "string",
  );

  return {
    schema: typeof rawSnapshot?.schema === "string" ? rawSnapshot.schema : null,
    tick: finiteNumber(rawSnapshot?.tick) ?? 0,
    agents,
    events,
    modules,
  };
}
