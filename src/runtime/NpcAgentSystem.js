import * as THREE from "three";
import { CAFE_LAYOUT, tableById } from "./CafeLayout.js";


const WALK_SPEED = 1.65;
const SEAT_ARRIVAL_DISTANCE = 0.04;


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
  constructor({
    people,
    onConversation = () => {},
    onStateChange = () => {},
    resolveMovement = ({ stepX, stepZ }) => [stepX, stepZ],
  }) {
    this.peopleById = new Map(people.map((person) => [person.id, person]));
    this.agents = new Map();
    this.onConversation = onConversation;
    this.onStateChange = onStateChange;
    this.resolveMovement = resolveMovement;
    this.mode = "cafe";
    this.nextConversationAt = 4.5;
    this.lastElapsed = 0;
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
      seatedAt: null,
      transition: null,
      lineCursor: Math.floor(Math.random() * person.conversation.replies.length),
    };
    entity.root.userData.agentState = agent.status;
    this.agents.set(person.id, agent);
    return agent;
  }

  initializeCafe() {
    this.mode = "cafe";
    this.meetingPersonIds = [];
    this.nextConversationAt = this.lastElapsed + 4.5;
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
    const end = new THREE.Vector3(seat.x, 0, seat.z);
    const distance = distance2D(start, end);
    root.scale.set(1, 1, 1);
    agent.entity.baseY = 0;
    agent.tableId = tableId;
    agent.seatIndex = seatIndex;
    agent.seatedAt = null;
    if (distance <= 0.001) {
      agent.status = tableId === CAFE_LAYOUT.roundtable.id ? "in-meeting" : "seated";
      agent.transition = null;
      root.position.copy(end);
      root.rotation.set(0, seat.yaw, 0);
      agent.entity.collider?.sync(agent.entity);
      agent.seatedAt = this.lastElapsed;
      this.#notify(agent);
      return true;
    }

    agent.status = movingStatus;
    agent.transition = {
      start,
      end,
      yaw: seat.yaw,
      progress: 0,
      duration: Math.max(0.7, distance / WALK_SPEED),
      distance,
      distanceTraveled: 0,
      stalledFor: 0,
      recoverySide:
        [...personId].reduce((hash, character) => hash + character.charCodeAt(0), 0) % 2
          ? 1
          : -1,
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
    this.nextConversationAt = this.lastElapsed + 2.4;
    return invited;
  }

  endMeeting() {
    this.initializeCafe();
  }

  update(delta, elapsed) {
    this.lastElapsed = elapsed;
    for (const agent of this.agents.values()) {
      if (!agent.transition) continue;
      const transition = agent.transition;
      const root = agent.entity.root;
      const remainingBeforeMove = distance2D(root.position, transition.end);
      const rawStepLength = Math.min(remainingBeforeMove, WALK_SPEED * Math.max(0, delta));
      const rawStepX = remainingBeforeMove > 1e-8
        ? ((transition.end.x - root.position.x) / remainingBeforeMove) * rawStepLength
        : 0;
      const rawStepZ = remainingBeforeMove > 1e-8
        ? ((transition.end.z - root.position.z) / remainingBeforeMove) * rawStepLength
        : 0;
      let resolved = this.resolveMovement({
        agent,
        entity: agent.entity,
        stepX: rawStepX,
        stepZ: rawStepZ,
        targetX: transition.end.x,
        targetZ: transition.end.z,
      });
      let stepX = Number.isFinite(resolved?.[0]) ? resolved[0] : 0;
      let stepZ = Number.isFinite(resolved?.[1]) ? resolved[1] : 0;
      if (Math.hypot(stepX, stepZ) <= 1e-6 && rawStepLength > 1e-6) {
        transition.stalledFor += Math.max(0, delta);
        if (transition.stalledFor >= 0.35) {
          const recoveryX = -(rawStepZ / rawStepLength) * rawStepLength * transition.recoverySide;
          const recoveryZ = (rawStepX / rawStepLength) * rawStepLength * transition.recoverySide;
          resolved = this.resolveMovement({
            agent,
            entity: agent.entity,
            stepX: recoveryX,
            stepZ: recoveryZ,
            targetX: transition.end.x,
            targetZ: transition.end.z,
          });
          stepX = Number.isFinite(resolved?.[0]) ? resolved[0] : 0;
          stepZ = Number.isFinite(resolved?.[1]) ? resolved[1] : 0;
        }
      }
      root.position.x += stepX;
      root.position.z += stepZ;
      const actualStep = Math.hypot(stepX, stepZ);
      if (actualStep > 1e-6) transition.stalledFor = 0;
      transition.distanceTraveled += actualStep;
      const remaining = distance2D(root.position, transition.end);
      transition.progress = transition.distance > 1e-8
        ? Math.max(0, Math.min(1, 1 - remaining / transition.distance))
        : 1;
      agent.entity.collider?.sync(agent.entity);

      this._to.set(stepX, 0, stepZ);
      if (this._to.lengthSq() > 1e-6) {
        this._to.normalize();
        this._targetQuaternion.setFromUnitVectors(
          this._from.set(0, 0, 1),
          this._to,
        );
        agent.entity.root.quaternion.slerp(this._targetQuaternion, 0.12);
      }

      if (remaining <= SEAT_ARRIVAL_DISTANCE) {
        agent.transition = null;
        agent.status = agent.tableId === CAFE_LAYOUT.roundtable.id ? "in-meeting" : "seated";
        root.position.y = 0;
        root.rotation.set(0, transition.yaw, 0);
        root.scale.set(1, 1, 1);
        agent.entity.baseY = 0;
        agent.entity.collider?.sync(agent.entity);
        agent.seatedAt = elapsed;
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
    const validGroups = [...this.tableGroups.entries()].filter(([, agents]) =>
      agents.length >= 2 &&
      agents.every((agent) => agent.seatedAt !== null && elapsed - agent.seatedAt >= 1),
    );
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
