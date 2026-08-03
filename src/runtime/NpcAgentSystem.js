import * as THREE from "three";
import { CAFE_LAYOUT, tableById } from "./CafeLayout.js";


const WALK_SPEED = 1.65;
const SEATED_SCALE_Y = 0.82;
const SEATED_ROOT_Y = 0.025;


function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}


function distance2D(from, to) {
  return Math.hypot(to.x - from.x, to.z - from.z);
}


export class NpcAgentSystem {
  constructor({ people, onConversation = () => {}, onStateChange = () => {} }) {
    this.peopleById = new Map(people.map((person) => [person.id, person]));
    this.agents = new Map();
    this.onConversation = onConversation;
    this.onStateChange = onStateChange;
    this.mode = "cafe";
    this.nextConversationAt = 4.5;
    this.conversationCursor = 0;
    this.meetingPersonIds = [];
    this._from = new THREE.Vector3();
    this._to = new THREE.Vector3();
    this._targetQuaternion = new THREE.Quaternion();
  }

  register(person, entity) {
    const agent = {
      person,
      entity,
      personId: person.id,
      status: "arriving",
      tableId: null,
      seatIndex: null,
      transition: null,
      lineCursor: Math.floor(Math.random() * person.conversation.replies.length),
    };
    entity.root.userData.agentState = agent.status;
    this.agents.set(person.id, agent);
    return agent;
  }

  replaceEntity(personId, entity) {
    const agent = this.agents.get(personId);
    if (!agent) return false;
    agent.entity = entity;
    entity.root.userData.agentState = agent.status;
    return true;
  }

  initializeCafe() {
    this.mode = "cafe";
    this.meetingPersonIds = [];
    const personIds = shuffle([...this.agents.keys()]);
    const tables = shuffle(CAFE_LAYOUT.npcTables);

    // Three pairs guarantee that the cafe has visible autonomous conversations.
    personIds.forEach((personId, index) => {
      const table = tables[Math.floor(index / 2) % tables.length];
      const seatIndex = index % Math.min(2, table.seats.length);
      this.moveToSeat(personId, table.id, seatIndex, "walking");
    });
  }

  moveToSeat(personId, tableId, seatIndex, movingStatus = "walking") {
    const agent = this.agents.get(personId);
    const table = tableById(tableId);
    const seat = table?.seats?.[seatIndex];
    if (!agent || !table || !seat) return false;

    const root = agent.entity.root;
    const start = root.position.clone();
    root.scale.set(1, 1, 1);
    agent.entity.baseY = 0;
    agent.status = movingStatus;
    agent.tableId = tableId;
    agent.seatIndex = seatIndex;
    agent.transition = {
      start,
      end: new THREE.Vector3(seat.x, 0, seat.z),
      yaw: seat.yaw,
      progress: 0,
      duration: Math.max(0.7, distance2D(start, seat) / WALK_SPEED),
    };
    this.#notify(agent);
    return true;
  }

  startMeeting(personIds) {
    const invited = [...new Set(personIds)].filter((personId) => this.agents.has(personId)).slice(0, 5);
    this.mode = "meeting";
    this.meetingPersonIds = invited;
    invited.forEach((personId, index) => {
      this.moveToSeat(
        personId,
        CAFE_LAYOUT.roundtable.id,
        index + 1,
        "joining-meeting",
      );
    });
    this.nextConversationAt = 2.4;
    return invited;
  }

  endMeeting() {
    this.initializeCafe();
  }

  update(delta, elapsed) {
    for (const agent of this.agents.values()) {
      if (!agent.transition) continue;
      const transition = agent.transition;
      transition.progress = Math.min(1, transition.progress + delta / transition.duration);
      const eased = 1 - Math.pow(1 - transition.progress, 3);
      agent.entity.root.position.lerpVectors(transition.start, transition.end, eased);
      agent.entity.root.position.y = Math.abs(Math.sin(transition.progress * Math.PI * 4)) * 0.025;
      agent.entity.baseY = agent.entity.root.position.y;

      this._to
        .subVectors(transition.end, agent.entity.root.position)
        .setY(0);
      if (this._to.lengthSq() > 0.01) {
        this._to.normalize();
        this._targetQuaternion.setFromUnitVectors(
          this._from.set(0, 0, 1),
          this._to,
        );
        agent.entity.root.quaternion.slerp(this._targetQuaternion, 0.12);
      }

      if (transition.progress >= 1) {
        agent.transition = null;
        agent.status = agent.tableId === CAFE_LAYOUT.roundtable.id ? "in-meeting" : "seated";
        agent.entity.root.position.set(transition.end.x, SEATED_ROOT_Y, transition.end.z);
        agent.entity.root.rotation.set(0, transition.yaw, 0);
        agent.entity.root.scale.set(1, SEATED_SCALE_Y, 1);
        agent.entity.baseY = SEATED_ROOT_Y;
        this.#notify(agent);
      }
    }

    if (elapsed >= this.nextConversationAt) {
      this.#emitConversation(elapsed);
    }
  }

  getState(personId) {
    const agent = this.agents.get(personId);
    if (!agent) return null;
    const table = tableById(agent.tableId);
    return {
      personId,
      status: agent.status,
      tableId: agent.tableId,
      tableLabel: table?.label ?? "咖啡厅",
      seatIndex: agent.seatIndex,
      meeting: agent.tableId === CAFE_LAYOUT.roundtable.id,
    };
  }

  getEntity(personId) {
    return this.agents.get(personId)?.entity ?? null;
  }

  get tableGroups() {
    const groups = new Map();
    for (const agent of this.agents.values()) {
      if (!agent.tableId || agent.transition) continue;
      if (!groups.has(agent.tableId)) groups.set(agent.tableId, []);
      groups.get(agent.tableId).push(agent);
    }
    return groups;
  }

  #emitConversation(elapsed) {
    const validGroups = [...this.tableGroups.entries()].filter(([, agents]) => agents.length >= 2);
    if (validGroups.length === 0) {
      this.nextConversationAt = elapsed + 2.5;
      return;
    }

    const [tableId, group] = validGroups[this.conversationCursor % validGroups.length];
    this.conversationCursor += 1;
    const speaker = group[this.conversationCursor % group.length];
    const lines = speaker.person.conversation.replies;
    const text = lines[speaker.lineCursor % lines.length];
    speaker.lineCursor += 1;
    this.onConversation({
      tableId,
      speakerId: speaker.personId,
      listenerIds: group.filter((agent) => agent !== speaker).map((agent) => agent.personId),
      text,
      meeting: tableId === CAFE_LAYOUT.roundtable.id,
      duration: 4.6,
    });
    this.nextConversationAt = elapsed + 5.2 + Math.random() * 2.8;
  }

  #notify(agent) {
    agent.entity.root.userData.agentState = agent.status;
    this.onStateChange(this.getState(agent.personId));
  }
}
