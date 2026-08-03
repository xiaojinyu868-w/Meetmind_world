import { CAFE_LAYOUT } from "./CafeLayout.js";


export const SNAPSHOT_SCHEMA = "echo-snapshot.v1";

const DEFAULT_SNAPSHOT_URL = `${import.meta.env.BASE_URL}api/v0/world/snapshot?advance=1`;
const DEFAULT_MOCK_URL = "data/mock/snapshot.demo.json";
const SIM_WALK_SPEED = 1.35;
const MEETING_SEAT_INDICES = Object.freeze([3, 4, 5, 2]);

// 本地演化用的兜底对话语料（仅 mock/fallback 数据源下出现）
const FALLBACK_LINES = Object.freeze([
  "最近在整理展会后留下的那些想法，越想越有意思。",
  "这家店的燕麦拿铁还是老味道。",
  "你说，关系这种东西会不会真的继续长大？",
  "上周路过旧礼堂，银杏叶落了一地。",
  "我新做的原型终于不需要说明书了。",
  "海边那班末班车，我后来还是没赶上。",
  "楼下花市多了一个卖旧花盆的摊子。",
  "歌单的最后一首，我一直给你留着。",
]);

// 内置兜底快照：实时接口与 mock 文件都不可用时，世界以此为起点本地演化
export const FALLBACK_SNAPSHOT = Object.freeze({
  schema: SNAPSHOT_SCHEMA,
  tick: 0,
  agents: Object.freeze([
    Object.freeze({ id: "lin-che", position: Object.freeze({ x: -4.53, z: -1.55, yaw: Math.PI / 2 }), state: "seated" }),
    Object.freeze({ id: "zhou-ning", position: Object.freeze({ x: -2.77, z: -1.55, yaw: -Math.PI / 2 }), state: "talking" }),
    Object.freeze({ id: "chen-mo", position: Object.freeze({ x: -4.53, z: 1.55, yaw: Math.PI / 2 }), state: "seated" }),
    Object.freeze({ id: "xu-an", position: Object.freeze({ x: -2.77, z: 1.55, yaw: -Math.PI / 2 }), state: "talking" }),
    Object.freeze({ id: "su-he", position: Object.freeze({ x: 2.89, z: -0.53, yaw: Math.PI * 0.86 }), state: "seated" }),
    Object.freeze({ id: "tang-ke", position: Object.freeze({ x: 3.67, z: -0.53, yaw: -Math.PI * 0.86 }), state: "seated" }),
  ]),
  modules: Object.freeze([
    Object.freeze({ id: "roundtable-six", type: "roundtable", position: Object.freeze({ x: 0, z: 0 }), interaction: Object.freeze({ label: "中央六人圆桌", radius: 2.72, primary: Object.freeze({ key: "E", action: "context-menu", label: "坐下" }), secondary: Object.freeze({ key: "F", action: "meeting", label: "发起圆桌" }) }) }),
    Object.freeze({ id: "table-window-two", type: "table", position: Object.freeze({ x: -3.65, z: -1.55 }), interaction: Object.freeze({ label: "窗边双人桌", radius: 1.65, primary: Object.freeze({ key: "E", action: "context-menu", label: "坐下" }), secondary: Object.freeze({ key: "F", action: "recall-memory", label: "共同记忆" }) }) }),
    Object.freeze({ id: "table-poster-two", type: "table", position: Object.freeze({ x: -3.65, z: 1.55 }), interaction: Object.freeze({ label: "海报双人桌", radius: 1.65, primary: Object.freeze({ key: "E", action: "context-menu", label: "坐下" }), secondary: Object.freeze({ key: "F", action: "recall-memory", label: "共同记忆" }) }) }),
    Object.freeze({ id: "table-library-four", type: "table", position: Object.freeze({ x: 3.28, z: -1.35 }), interaction: Object.freeze({ label: "书架四人桌", radius: 1.8, primary: Object.freeze({ key: "E", action: "context-menu", label: "坐下" }), secondary: Object.freeze({ key: "F", action: "recall-memory", label: "共同记忆" }) }) }),
    Object.freeze({ id: "table-counter-four", type: "table", position: Object.freeze({ x: 3.28, z: 1.65 }), interaction: Object.freeze({ label: "吧台侧四人桌", radius: 1.8, primary: Object.freeze({ key: "E", action: "context-menu", label: "坐下" }), secondary: Object.freeze({ key: "F", action: "recall-memory", label: "共同记忆" }) }) }),
  ]),
  events: Object.freeze([]),
});

const NPC_SEATS = Object.freeze(
  CAFE_LAYOUT.npcTables.flatMap((table) =>
    table.seats.map((seat, seatIndex) =>
      Object.freeze({
        tableId: table.id,
        seatIndex,
        x: seat.x,
        z: seat.z,
        yaw: seat.yaw,
      }),
    ),
  ),
);


function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function seatKey(tableId, seatIndex) {
  return `${tableId}:${seatIndex}`;
}


// 世界快照轮询器：优先实时接口，失败自动降级 mock 文件，再兜底内置快照。
// 非 live 数据源下由内置演化器驱动走动与交谈；圆桌只由用户/预约事件发起。
export class LiveWorld {
  constructor({
    snapshotUrl = DEFAULT_SNAPSHOT_URL,
    mockUrl = DEFAULT_MOCK_URL,
    intervalMs = 2000,
    fetchImpl = null,
  } = {}) {
    this.snapshotUrl = snapshotUrl;
    this.mockUrl = mockUrl;
    this.intervalMs = intervalMs;
    this.fetchImpl = fetchImpl ?? ((...args) => fetch(...args));
    this.snapshotCallbacks = new Set();
    this.eventCallbacks = new Set();
    this.source = null;
    this.running = false;
    this.timer = null;
    this.baseSnapshot = null;
    this.baseSource = null;
    this.sim = null;
    this.previousEventKeys = new Set();
    this.onVisibilityChange = null;
  }

  onSnapshot(callback) {
    this.snapshotCallbacks.add(callback);
    return () => this.snapshotCallbacks.delete(callback);
  }

  onEvent(callback) {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.info(
      `[LiveWorld] 启动世界快照轮询（间隔 ${this.intervalMs}ms），优先数据源：${this.snapshotUrl}`,
    );
    if (typeof document !== "undefined") {
      this.onVisibilityChange = () => {
        if (document.hidden) this.#clearTimer();
        else if (this.running) void this.#poll();
      };
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }
    void this.#poll();
  }

  stop() {
    this.running = false;
    this.#clearTimer();
    if (this.onVisibilityChange && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }
    this.onVisibilityChange = null;
  }

  #clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  #scheduleNext() {
    this.#clearTimer();
    if (!this.running) return;
    if (typeof document !== "undefined" && document.hidden) return;
    this.timer = setTimeout(() => void this.#poll(), this.intervalMs);
  }

  async #poll() {
    if (!this.running) return;
    this.#clearTimer();
    try {
      const snapshot = await this.#fetchJson(this.snapshotUrl);
      if (!snapshot || !Array.isArray(snapshot.agents)) {
        throw new Error("snapshot 缺少 agents 数组");
      }
      this.sim = null;
      this.#setSource("live");
      this.#emit(snapshot);
    } catch (liveError) {
      await this.#pollDegraded(liveError);
    } finally {
      this.#scheduleNext();
    }
  }

  async #pollDegraded(liveError) {
    if (!this.sim) {
      if (!this.baseSnapshot) {
        try {
          const mock = await this.#fetchJson(this.mockUrl);
          if (!mock || !Array.isArray(mock.agents)) {
            throw new Error("mock 快照缺少 agents 数组");
          }
          this.baseSnapshot = mock;
          this.baseSource = "mock";
        } catch (mockError) {
          this.baseSnapshot = FALLBACK_SNAPSHOT;
          this.baseSource = "fallback";
          console.warn("[LiveWorld] 实时快照与 mock 快照均不可用，使用内置兜底快照", {
            liveError: String(liveError),
            mockError: String(mockError),
          });
        }
      }
      this.sim = this.#createSim(this.baseSnapshot);
    }
    this.#setSource(this.baseSource);
    this.#emit(this.#evolveSim(this.sim));
  }

  async #fetchJson(url) {
    const response = await this.fetchImpl(url, { headers: { accept: "application/json" } });
    if (!response || !response.ok) throw new Error(`HTTP ${response?.status ?? "error"}`);
    return response.json();
  }

  #setSource(source) {
    if (this.source === source) return;
    this.source = source;
    const detail =
      source === "live"
        ? `实时后端（GET ${this.snapshotUrl}）`
        : source === "mock"
          ? `本地 mock 文件（${this.mockUrl}，前端本地演化）`
          : "内置兜底快照（前端本地演化）";
    console.info(`[LiveWorld] 世界数据源：${source} — ${detail}`);
  }

  #emit(snapshot) {
    // events 是最近事件缓冲，跨轮询会重复出现：只对上一轮没见过的 key 触发
    const keys = new Set();
    const events = Array.isArray(snapshot?.events) ? snapshot.events : [];
    for (const event of events) {
      if (!event || typeof event !== "object") continue;
      const key = JSON.stringify([
        event.type,
        event.agent_id ?? event.agentId,
        event.to_agent_id ?? event.toAgentId ?? event.target_id,
        event.text,
        event.participants,
        event.tick,
      ]);
      keys.add(key);
      if (this.previousEventKeys.has(key)) continue;
      for (const callback of this.eventCallbacks) callback(event);
    }
    this.previousEventKeys = keys;
    for (const callback of this.snapshotCallbacks) callback(snapshot);
  }

  // ---- 本地演化器（mock / fallback 数据源专用，live 快照原样透传） ----

  #createSim(baseSnapshot) {
    const sim = {
      tick: finiteOr(baseSnapshot?.tick, 0),
      agents: new Map(),
      occupied: new Map(),
      meeting: null,
      lastMeetingTick: -8,
    };
    const rawAgents = Array.isArray(baseSnapshot?.agents) ? baseSnapshot.agents : [];
    for (const rawAgent of rawAgents) {
      if (!rawAgent || typeof rawAgent.id !== "string" || rawAgent.id === "") continue;
      const position = rawAgent.position ?? {};
      const agent = {
        id: rawAgent.id,
        x: finiteOr(position.x, 0),
        z: finiteOr(position.z, 0),
        yaw: finiteOr(position.yaw, 0),
        state: "seated",
        avatar: rawAgent.avatar ?? null,
        target: null,
        tableId: null,
        seatIndex: null,
      };
      const state = String(rawAgent.state ?? "seated").toLowerCase();
      if (state === "walking") {
        agent.state = "walking";
        this.#sendToNpcSeat(sim, agent, null);
      } else if (state === "in-meeting") {
        const seat = this.#claimRoundtableSeat(sim, agent);
        agent.state = "in-meeting";
        if (seat) {
          agent.x = seat.x;
          agent.z = seat.z;
          agent.yaw = seat.yaw;
        }
      } else {
        agent.state = state === "talking" ? "talking" : "seated";
        const seat = this.#nearestNpcSeat(sim, agent.x, agent.z, 1.5);
        if (seat) this.#occupy(sim, agent, seat);
      }
      sim.agents.set(agent.id, agent);
    }
    return sim;
  }

  #occupy(sim, agent, seat) {
    if (agent.tableId) sim.occupied.delete(seatKey(agent.tableId, agent.seatIndex));
    sim.occupied.set(seatKey(seat.tableId, seat.seatIndex), agent.id);
    agent.tableId = seat.tableId;
    agent.seatIndex = seat.seatIndex;
  }

  #freeSeat(sim, agent) {
    if (agent.tableId) sim.occupied.delete(seatKey(agent.tableId, agent.seatIndex));
    agent.tableId = null;
    agent.seatIndex = null;
  }

  #nearestNpcSeat(sim, x, z, maxDistance) {
    let best = null;
    let bestDistance = maxDistance;
    for (const seat of NPC_SEATS) {
      if (sim.occupied.has(seatKey(seat.tableId, seat.seatIndex))) continue;
      const distance = Math.hypot(seat.x - x, seat.z - z);
      if (distance <= bestDistance) {
        best = seat;
        bestDistance = distance;
      }
    }
    return best;
  }

  #claimRoundtableSeat(sim, agent) {
    const seats = CAFE_LAYOUT.roundtable.seats;
    const ordered = [...MEETING_SEAT_INDICES, ...seats.map((_, index) => index)];
    for (const seatIndex of ordered) {
      const seat = seats[seatIndex];
      if (!seat || sim.occupied.has(seatKey(CAFE_LAYOUT.roundtable.id, seatIndex))) continue;
      const claim = {
        tableId: CAFE_LAYOUT.roundtable.id,
        seatIndex,
        x: seat.x,
        z: seat.z,
        yaw: seat.yaw,
      };
      this.#occupy(sim, agent, claim);
      return claim;
    }
    return null;
  }

  #sendToNpcSeat(sim, agent, excludeTableId) {
    this.#freeSeat(sim, agent);
    let candidates = NPC_SEATS.filter(
      (seat) =>
        !sim.occupied.has(seatKey(seat.tableId, seat.seatIndex)) &&
        seat.tableId !== excludeTableId,
    );
    if (candidates.length === 0) {
      candidates = NPC_SEATS.filter(
        (seat) => !sim.occupied.has(seatKey(seat.tableId, seat.seatIndex)),
      );
    }
    if (candidates.length === 0) return false;
    const seat = candidates[Math.floor(Math.random() * candidates.length)];
    sim.occupied.set(seatKey(seat.tableId, seat.seatIndex), agent.id);
    agent.target = { ...seat, meeting: false };
    agent.state = "walking";
    return true;
  }

  #evolveSim(sim) {
    sim.tick += 1;
    const events = [];
    const step = (this.intervalMs / 1000) * SIM_WALK_SPEED;

    // 1. 走动中的 agent 向目标座位推进
    for (const agent of sim.agents.values()) {
      if (!agent.target) continue;
      const dx = agent.target.x - agent.x;
      const dz = agent.target.z - agent.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 0.001) agent.yaw = Math.atan2(dx, dz);
      if (distance <= step) {
        agent.x = agent.target.x;
        agent.z = agent.target.z;
        agent.yaw = agent.target.yaw;
        this.#occupy(sim, agent, agent.target);
        agent.state = agent.target.meeting ? "in-meeting" : "seated";
        agent.target = null;
      } else {
        agent.x += (dx / distance) * step;
        agent.z += (dz / distance) * step;
        agent.state = "walking";
      }
    }

    // 2. 圆桌会议结束：参与者各自找普通桌坐下
    if (sim.meeting && sim.tick >= sim.meeting.endsAtTick) {
      const participants = sim.meeting.participantIds;
      for (const personId of participants) {
        const agent = sim.agents.get(personId);
        if (agent) this.#sendToNpcSeat(sim, agent, CAFE_LAYOUT.roundtable.id);
      }
      events.push({ type: "meeting-ended", participants });
      sim.meeting = null;
      sim.lastMeetingTick = sim.tick;
    }

    // 3. 同桌交谈（含由外部事件安排到圆桌的参与者）
    if (sim.tick % 2 === 0) {
      const groups = new Map();
      for (const agent of sim.agents.values()) {
        if (agent.target || !agent.tableId) continue;
        if (!groups.has(agent.tableId)) groups.set(agent.tableId, []);
        groups.get(agent.tableId).push(agent);
      }
      const talkGroups = [...groups.values()].filter((group) => group.length >= 2);
      if (talkGroups.length > 0) {
        const group = talkGroups[Math.floor(Math.random() * talkGroups.length)];
        const speaker = group[Math.floor(Math.random() * group.length)];
        const listeners = group.filter((agent) => agent !== speaker);
        const listener = listeners[Math.floor(Math.random() * listeners.length)];
        if (speaker.state !== "in-meeting") speaker.state = "talking";
        if (listener.state !== "in-meeting") listener.state = "talking";
        events.push({
          type: "agent-talk",
          agent_id: speaker.id,
          to_agent_id: listener.id,
          text: FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)],
        });
      }
    }

    // 4. 偶尔有人换桌走动
    for (const agent of sim.agents.values()) {
      if (agent.target || agent.state === "in-meeting" || !agent.tableId) continue;
      if (Math.random() < 0.05) this.#sendToNpcSeat(sim, agent, agent.tableId);
    }

    return {
      schema: SNAPSHOT_SCHEMA,
      tick: sim.tick,
      agents: [...sim.agents.values()].map((agent) => ({
        id: agent.id,
        position: { x: round3(agent.x), z: round3(agent.z), yaw: round3(agent.yaw) },
        state: agent.state,
        ...(agent.avatar ? { avatar: agent.avatar } : {}),
      })),
      modules: Array.isArray(this.baseSnapshot?.modules) ? this.baseSnapshot.modules : [],
      events,
    };
  }
}
