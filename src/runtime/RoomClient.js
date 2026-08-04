/**
 * RoomClient —— v1 现场房间客户端（docs/MVP2-BACKEND.md，TBD-ARCH-4 现场档）。
 *
 * 契约：
 * - REST：POST /api/v1/rooms、/{id}/join、/{id}/commands、GET /{id}/snapshot、
 *   /{id}/events?after_sequence=N、/{id}/brief。
 * - WS：/{id}/stream?after_sequence=N，帧协议 meetmind.rooms.v1，
 *   事件信封 meetmind.event.v1（sequence 由服务端严格递增）。
 *
 * 行为：
 * - 优先 WebSocket 有序事件流；WS 不可用（老代理/浏览器拒绝）时降级为
 *   events 端点 HTTP 轮询，功能等价、延迟略高。
 * - 断线后按指数退避重连，重连用 after_sequence cursor 补拉丢失事件；
 *   发现 sequence 空洞时先走 HTTP replay 补齐再继续投递。
 * - 所有事件按 sequence 去重；未知 schema 的事件/快照丢弃并 console.warn，永不抛穿。
 *
 * 纯逻辑（validateRoomEvent / parseStreamFrame / SequenceCursor / computeBackoffMs）
 * 不依赖浏览器 API，可直接在 node 下自测（scripts/room-client.test.mjs）。
 */

export const ROOM_STREAM_PROTOCOL = "meetmind.rooms.v1";
export const ROOM_EVENT_SCHEMA = "meetmind.event.v1";
export const ROOM_SNAPSHOT_SCHEMA = "meetmind.room-snapshot.v1";

export const ROOM_CLIENT_STATES = Object.freeze({
  IDLE: "idle", // 尚未连接
  CONNECTING: "connecting", // 正在握手 / 断线重连中
  LIVE: "live", // WebSocket 有序事件流在线
  REPLAYING: "replaying", // 正在用 HTTP events 端点补拉 cursor 之后的事件
  DEGRADED: "degraded", // WS 不可用，降级为 HTTP 轮询
  CLOSED: "closed", // 已主动离开
});

export const ROOM_STATE_LABELS = Object.freeze({
  idle: "未连接",
  connecting: "连接中",
  live: "实时在线",
  replaying: "补拉事件",
  degraded: "轮询模式",
  closed: "已离开",
});

const DEFAULT_BACKOFF = Object.freeze({
  baseMs: 600,
  factor: 2,
  maxMs: 10000,
  jitterRatio: 0.25,
});


/** 指数退避 + 抖动（random 可注入，便于确定性测试）。 */
export function computeBackoffMs(attempt, options = {}) {
  const { baseMs, factor, maxMs, jitterRatio } = { ...DEFAULT_BACKOFF, ...options };
  const random = typeof options.random === "function" ? options.random : Math.random;
  const exponential = Math.min(maxMs, baseMs * factor ** Math.max(0, attempt));
  const jitter = exponential * jitterRatio * random();
  return Math.round(exponential + jitter);
}


/** 校验并归一化一条 meetmind.event.v1 事件；不合法返回 null（并 warn）。 */
export function validateRoomEvent(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.schema !== ROOM_EVENT_SCHEMA) {
    console.warn(`[RoomClient] 丢弃未知 schema 的事件：${raw.schema ?? "unknown"}`);
    return null;
  }
  if (
    typeof raw.event_id !== "string" || raw.event_id.length === 0
    || typeof raw.type !== "string" || raw.type.length === 0
    || typeof raw.room_id !== "string" || raw.room_id.length === 0
    || !Number.isInteger(raw.sequence) || raw.sequence < 1
  ) {
    console.warn("[RoomClient] 丢弃缺字段的事件", raw);
    return null;
  }
  return raw;
}


/**
 * 解析一帧 WS 消息。
 * 返回 { kind: "event", event } / { kind: "error", code, message } / { kind: "unknown" }。
 */
export function parseStreamFrame(text) {
  let frame = null;
  try {
    frame = JSON.parse(text);
  } catch {
    console.warn("[RoomClient] 丢弃无法解析的 WS 帧");
    return { kind: "unknown" };
  }
  if (!frame || typeof frame !== "object") return { kind: "unknown" };
  if (frame.protocol !== ROOM_STREAM_PROTOCOL) {
    console.warn(`[RoomClient] 丢弃未知协议的 WS 帧：${frame.protocol ?? "unknown"}`);
    return { kind: "unknown" };
  }
  if (frame.type === "event") {
    const event = validateRoomEvent(frame.event);
    return event ? { kind: "event", event } : { kind: "unknown" };
  }
  if (frame.type === "error") {
    return {
      kind: "error",
      code: String(frame.error?.code ?? "unknown"),
      message: String(frame.error?.message ?? ""),
    };
  }
  return { kind: "unknown" };
}


/** sequence 游标：去重 + 空洞检测。 */
export class SequenceCursor {
  constructor(initial = 0) {
    this.current = Number.isInteger(initial) && initial > 0 ? initial : 0;
  }

  isDuplicate(sequence) {
    return sequence <= this.current;
  }

  hasGap(sequence) {
    return sequence > this.current + 1;
  }

  advance(sequence) {
    if (sequence > this.current) {
      this.current = sequence;
      return true;
    }
    return false;
  }
}


function newCommandId() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return `cmd_${cryptoApi.randomUUID()}`;
  return `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}


function defaultStreamUrl(baseUrl, roomId, afterSequence) {
  const origin = globalThis.location?.href ?? "http://127.0.0.1/";
  const url = new URL(baseUrl, origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${encodeURIComponent(roomId)}/stream`;
  url.search = `?after_sequence=${Math.max(0, afterSequence)}`;
  return url.toString();
}


export class RoomClient {
  /**
   * @param {object} [options]
   * @param {string} [options.baseUrl] REST 根，默认 "/api/v1/rooms"
   * @param {(roomId: string, afterSequence: number) => string} [options.streamUrlFactory]
   * @param {typeof fetch} [options.fetchImpl] 测试注入用
   * @param {typeof WebSocket|null} [options.WebSocketImpl] 传 null 强制走轮询
   * @param {number} [options.wsOpenTimeoutMs] WS 握手超时，超时即降级轮询
   * @param {number} [options.pollMs] 降级轮询节拍
   * @param {number} [options.presenceMs] member.move 上报节拍（约 4.5Hz）
   * @param {number} [options.upgradeRetryMs] 轮询模式下多久重试一次 WS 升级
   * @param {(event: object) => void} [options.onEvent] 有序事件回调（已去重）
   * @param {(state: string) => void} [options.onStateChange]
   * @param {(participants: object[]) => void} [options.onMembersChange] 远端位置/名册变化
   * @param {(error: Error) => void} [options.onError]
   */
  constructor({
    baseUrl = "/api/v1/rooms",
    streamUrlFactory = null,
    fetchImpl = null,
    WebSocketImpl = undefined,
    wsOpenTimeoutMs = 4000,
    pollMs = 1000,
    presenceMs = 220,
    upgradeRetryMs = 15000,
    backoff = {},
    onEvent = null,
    onStateChange = null,
    onMembersChange = null,
    onError = null,
  } = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.streamUrlFactory = streamUrlFactory
      ?? ((roomId, afterSequence) => defaultStreamUrl(this.baseUrl, roomId, afterSequence));
    this.fetchImpl = fetchImpl ?? globalThis.fetch?.bind(globalThis);
    // undefined → 取全局 WebSocket；显式 null → 禁用 WS（强制轮询）
    this.WebSocketImpl = WebSocketImpl === undefined
      ? globalThis.WebSocket ?? null
      : WebSocketImpl;
    this.wsOpenTimeoutMs = wsOpenTimeoutMs;
    this.pollMs = Math.max(400, pollMs);
    this.presenceMs = Math.max(120, presenceMs);
    this.upgradeRetryMs = Math.max(5000, upgradeRetryMs);
    this.backoff = { ...DEFAULT_BACKOFF, ...backoff };
    this.onEvent = onEvent;
    this.onStateChange = onStateChange;
    this.onMembersChange = onMembersChange;
    this.onError = onError;

    this.state = ROOM_CLIENT_STATES.IDLE;
    this.roomId = null;
    this.memberId = null;
    this.displayName = null;
    this.readOnly = false;
    this.cursor = new SequenceCursor(0);
    this.members = new Map(); // member_id -> { memberId, displayName, x, z }
    this.roomState = {
      name: "",
      meeting: null,
      icebreaker: null,
      invitations: [],
      bulletins: [],
    };
    this.lastEventAt = 0;

    this._stopped = true;
    this._ws = null;
    this._wsOpenTimer = null;
    this._reconnectTimer = null;
    this._pollTimer = null;
    this._presenceTimer = null;
    this._upgradeTimer = null;
    this._reconnectAttempt = 0;
    this._catchUpPromise = null;
    this._pendingEvents = [];
    this._lastSentPresence = null;
    this._presenceBeat = 0;
  }

  // ---------- REST ----------

  async _request(path, options = {}) {
    if (!this.fetchImpl) throw new Error("当前环境没有 fetch，无法连接现场房间");
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const detail = payload?.detail;
      const error = new Error(detail?.message ?? `房间请求失败（HTTP ${response.status}）`);
      error.status = response.status;
      error.code = detail?.code ?? null;
      throw error;
    }
    return payload;
  }

  /** 创建房间（可在 connect 之前独立调用）。 */
  createRoom({ roomId = null, name, hotspots = null }) {
    const body = { name };
    if (roomId) body.room_id = roomId;
    if (Array.isArray(hotspots)) body.hotspots = hotspots;
    return this._request("", { method: "POST", body: JSON.stringify(body) });
  }

  /** 拉取房间快照（校验 meetmind.room-snapshot.v1）。 */
  async fetchSnapshot(roomId = this.roomId) {
    const snapshot = await this._request(`/${encodeURIComponent(roomId)}/snapshot`);
    if (snapshot?.schema !== ROOM_SNAPSHOT_SCHEMA) {
      throw new Error(`房间快照版本不兼容：${snapshot?.schema ?? "unknown"}`);
    }
    return snapshot;
  }

  /** 断线补拉：cursor 之后的有序事件（非法事件丢弃）。 */
  async fetchEvents(afterSequence = this.cursor.current, limit = 200, roomId = this.roomId) {
    const payload = await this._request(
      `/${encodeURIComponent(roomId)}/events?after_sequence=${Math.max(0, afterSequence)}&limit=${limit}`,
    );
    return (Array.isArray(payload?.events) ? payload.events : [])
      .map(validateRoomEvent)
      .filter(Boolean);
  }

  fetchBrief(afterSequence = 0, roomId = this.roomId) {
    return this._request(
      `/${encodeURIComponent(roomId)}/brief?after_sequence=${Math.max(0, afterSequence)}`,
    );
  }

  /**
   * 发送房间命令。command_id 缺省生成 uuid，幂等重试安全。
   * 返回 { accepted, command_id, sequence, events }。
   */
  async sendCommand(type, payload = {}, { commandId = null } = {}) {
    if (!this.roomId || !this.memberId) throw new Error("尚未加入房间，无法发送命令");
    const result = await this._request(`/${encodeURIComponent(this.roomId)}/commands`, {
      method: "POST",
      body: JSON.stringify({
        command_id: commandId ?? newCommandId(),
        actor_id: this.memberId,
        type,
        payload,
      }),
    });
    // 命令回执里的事件直接 ingest（sequence 去重，WS 重投不会重复触发回调）
    if (Array.isArray(result?.events) && result.events.length) {
      this._ingestEvents(result.events.map(validateRoomEvent).filter(Boolean));
    }
    return result;
  }

  moveTo(x, z) {
    return this.sendCommand("member.move", { x, z });
  }

  interactHotspot(hotspotId, action) {
    return this.sendCommand("hotspot.interact", { hotspot_id: hotspotId, action });
  }

  inviteMeeting({ hotspotId = "roundtable", participantIds, topic = "", invitationId = null } = {}) {
    return this.sendCommand("meeting.invite", {
      hotspot_id: hotspotId,
      participant_ids: participantIds,
      topic,
      ...(invitationId ? { invitation_id: invitationId } : {}),
    });
  }

  respondMeeting(invitationId, response) {
    return this.sendCommand("meeting.respond", {
      invitation_id: invitationId,
      response,
    });
  }

  startMeeting(invitationId, meetingId = null) {
    return this.sendCommand("meeting.start", {
      invitation_id: invitationId,
      ...(meetingId ? { meeting_id: meetingId } : {}),
    });
  }

  endMeeting(meetingId = null) {
    return this.sendCommand("meeting.end", meetingId ? { meeting_id: meetingId } : {});
  }

  // ---------- 连接生命周期 ----------

  /**
   * 加入并连接房间。
   * @param {object} options
   * @param {string} options.roomId
   * @param {string} [options.memberId] 不传则 readOnly（大屏只读）
   * @param {string} [options.displayName]
   * @param {{x:number,z:number}} [options.position]
   * @param {boolean} [options.readOnly]
   */
  async connect({ roomId, memberId = null, displayName = "", position = null, readOnly = false } = {}) {
    this.close();
    this._stopped = false;
    this.roomId = roomId;
    this.memberId = memberId;
    this.displayName = displayName || memberId || "大屏";
    this.readOnly = readOnly || !memberId;
    this.cursor = new SequenceCursor(0);
    this.members.clear();
    this._setState(ROOM_CLIENT_STATES.CONNECTING);
    try {
      if (!this.readOnly) {
        await this._request(`/${encodeURIComponent(roomId)}/join`, {
          method: "POST",
          body: JSON.stringify({
            member_id: memberId,
            display_name: this.displayName,
            position: position ?? { x: 0, z: 0 },
          }),
        });
      }
      await this._syncFromSnapshot();
    } catch (error) {
      this.close();
      throw error;
    }
    this._openStream();
    return this.snapshotInfo();
  }

  snapshotInfo() {
    return {
      roomId: this.roomId,
      name: this.roomState.name,
      memberId: this.memberId,
      readOnly: this.readOnly,
      sequence: this.cursor.current,
      state: this.state,
    };
  }

  /** 离开房间并停止一切网络活动（幂等）。 */
  close() {
    this._stopped = true;
    this._clearTimers();
    if (this._ws) {
      try {
        this._ws.onopen = null;
        this._ws.onmessage = null;
        this._ws.onerror = null;
        this._ws.onclose = null;
        this._ws.close();
      } catch {
        // 关闭中的 WS 抛错无需处理
      }
      this._ws = null;
    }
    if (this.state !== ROOM_CLIENT_STATES.IDLE) {
      this._setState(ROOM_CLIENT_STATES.CLOSED);
    }
    this.roomId = null;
    this.memberId = null;
    this.members.clear();
    this._lastSentPresence = null;
  }

  _clearTimers() {
    for (const key of ["_wsOpenTimer", "_reconnectTimer", "_pollTimer", "_presenceTimer", "_upgradeTimer"]) {
      clearTimeout(this[key]);
      clearInterval(this[key]);
      this[key] = null;
    }
  }

  _setState(next) {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange?.(next);
  }

  _reportError(error) {
    if (this.onError) this.onError(error);
    else console.warn("[RoomClient]", error);
  }

  async _syncFromSnapshot() {
    const snapshot = await this.fetchSnapshot();
    this.roomState.name = snapshot.name ?? this.roomId;
    this.roomState.meeting = snapshot.meeting ?? null;
    this.roomState.icebreaker = snapshot.icebreaker ?? null;
    this.roomState.invitations = Array.isArray(snapshot.invitations) ? snapshot.invitations : [];
    this.roomState.bulletins = Array.isArray(snapshot.bulletins) ? snapshot.bulletins : [];
    for (const member of Array.isArray(snapshot.members) ? snapshot.members : []) {
      if (!member?.member_id) continue;
      this.members.set(member.member_id, {
        memberId: member.member_id,
        displayName: member.display_name ?? member.member_id,
        x: Number(member.position?.x ?? 0),
        z: Number(member.position?.z ?? 0),
      });
    }
    this.cursor.advance(snapshot.sequence ?? 0);
    this._emitMembers();
  }

  // ---------- 事件流（WS + 降级轮询） ----------

  _openStream() {
    if (this._stopped) return;
    if (typeof this.WebSocketImpl !== "function") {
      this._enterDegraded();
      return;
    }
    this._setState(ROOM_CLIENT_STATES.CONNECTING);
    let settled = false;
    let ws = null;
    try {
      ws = new this.WebSocketImpl(
        this.streamUrlFactory(this.roomId, this.cursor.current),
      );
    } catch (error) {
      console.warn("[RoomClient] WebSocket 建立失败，降级为轮询", error);
      this._enterDegraded();
      return;
    }
    this._ws = ws;
    this._wsOpenTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        // 忽略关闭异常
      }
      console.warn("[RoomClient] WebSocket 握手超时，降级为轮询");
      this._ws = null;
      this._enterDegraded();
    }, this.wsOpenTimeoutMs);

    ws.onopen = () => {
      if (this._stopped || this._ws !== ws) return;
      settled = true;
      clearTimeout(this._wsOpenTimer);
      this._wsOpenTimer = null;
      this._reconnectAttempt = 0;
      this._setState(ROOM_CLIENT_STATES.LIVE);
    };
    ws.onmessage = (message) => {
      if (this._stopped || this._ws !== ws) return;
      const frame = parseStreamFrame(message.data);
      if (frame.kind === "event") {
        this._ingestEvents([frame.event]);
      } else if (frame.kind === "error") {
        this._reportError(new Error(`房间事件流错误：${frame.code} ${frame.message}`));
      }
    };
    ws.onerror = () => {
      // onclose 会紧随其后，统一在那里处理重连/降级
      if (!settled) {
        settled = true;
        clearTimeout(this._wsOpenTimer);
        this._wsOpenTimer = null;
      }
    };
    ws.onclose = () => {
      if (this._stopped || this._ws !== ws) return;
      this._ws = null;
      clearTimeout(this._wsOpenTimer);
      this._wsOpenTimer = null;
      if (!settled) {
        // 握手阶段就被关闭（例如代理不支持 Upgrade）：直接降级轮询
        this._enterDegraded();
        return;
      }
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (this._stopped) return;
    this._setState(ROOM_CLIENT_STATES.CONNECTING);
    const delay = computeBackoffMs(this._reconnectAttempt, this.backoff);
    this._reconnectAttempt += 1;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._stopped) return;
      // 重连前先 HTTP 补拉 cursor 之后的事件（REPLAYING），再重新挂流
      void this._catchUp().finally(() => {
        if (!this._stopped) this._openStream();
      });
    }, delay);
  }

  _enterDegraded() {
    if (this._stopped) return;
    this._setState(ROOM_CLIENT_STATES.DEGRADED);
    clearTimeout(this._pollTimer);
    const poll = async () => {
      if (this._stopped || this.state !== ROOM_CLIENT_STATES.DEGRADED) return;
      try {
        await this._catchUp();
        this._reconnectAttempt = 0;
      } catch (error) {
        this._reportError(error);
      }
      if (!this._stopped && this.state === ROOM_CLIENT_STATES.DEGRADED) {
        this._pollTimer = setTimeout(poll, this.pollMs);
      }
    };
    void poll();
    // 周期性尝试升级回 WebSocket（例如代理已加上 Upgrade 头后无需刷新页面）
    clearInterval(this._upgradeTimer);
    this._upgradeTimer = setInterval(() => {
      if (this._stopped || this.state !== ROOM_CLIENT_STATES.DEGRADED) return;
      clearTimeout(this._pollTimer);
      this._openStream();
    }, this.upgradeRetryMs);
  }

  /** HTTP replay：把 cursor 之后的事件补齐（含名册重同步），可重入。 */
  _catchUp() {
    if (this._catchUpPromise) return this._catchUpPromise;
    const previousState = this.state;
    this._setState(ROOM_CLIENT_STATES.REPLAYING);
    this._catchUpPromise = (async () => {
      // events 端点单页最多 500 条，循环翻页直到追上
      for (let page = 0; page < 10; page += 1) {
        const events = await this.fetchEvents(this.cursor.current);
        if (events.length === 0) break;
        this._ingestEvents(events);
        if (events.length < 200) break;
      }
      await this._syncFromSnapshot();
    })().finally(() => {
      this._catchUpPromise = null;
      if (!this._stopped && this.state === ROOM_CLIENT_STATES.REPLAYING) {
        this._setState(
          previousState === ROOM_CLIENT_STATES.DEGRADED
            ? ROOM_CLIENT_STATES.DEGRADED
            : ROOM_CLIENT_STATES.LIVE,
        );
      }
      this._drainPending();
    });
    return this._catchUpPromise;
  }

  _drainPending() {
    if (this._pendingEvents.length === 0) return;
    const queued = this._pendingEvents;
    this._pendingEvents = [];
    this._ingestEvents(queued);
  }

  /** 统一事件入口：去重 + 与 pending 合并排序后按序投递；仍有空洞时缓存并 HTTP 补拉。 */
  _ingestEvents(events) {
    const incoming = [];
    for (const event of Array.isArray(events) ? events : []) {
      if (!event || !Number.isInteger(event.sequence)) continue;
      if (event.room_id !== this.roomId) continue;
      if (this.cursor.isDuplicate(event.sequence)) continue;
      incoming.push(event);
    }
    if (incoming.length === 0) return;
    const queue = [...this._pendingEvents, ...incoming]
      .sort((a, b) => a.sequence - b.sequence);
    this._pendingEvents = [];
    for (let index = 0; index < queue.length; index += 1) {
      const event = queue[index];
      if (this.cursor.isDuplicate(event.sequence)) continue;
      if (this.cursor.hasGap(event.sequence)) {
        // 仍有空洞：缓存本事件及之后的事件，补拉缺失段后由 drain 继续投递
        this._pendingEvents = queue.slice(index);
        if (!this._catchUpPromise) {
          void this._catchUp().catch((error) => this._reportError(error));
        }
        break;
      }
      this.cursor.advance(event.sequence);
      this._applyEvent(event);
    }
  }

  _applyEvent(event) {
    this.lastEventAt = Date.now();
    if (event.type === "member.joined") {
      const member = event.payload?.member;
      if (member?.member_id) {
        this.members.set(member.member_id, {
          memberId: member.member_id,
          displayName: member.display_name ?? member.member_id,
          x: Number(member.position?.x ?? 0),
          z: Number(member.position?.z ?? 0),
        });
        this._emitMembers();
      }
    } else if (event.type === "member.moved") {
      const memberId = event.payload?.member_id;
      const member = this.members.get(memberId);
      if (member) {
        member.x = Number(event.payload?.position?.x ?? member.x);
        member.z = Number(event.payload?.position?.z ?? member.z);
        this._emitMembers();
      }
    } else if (event.type === "meeting.invited") {
      this.roomState.invitations = [
        ...this.roomState.invitations.filter(
          (item) => item.invitation_id !== event.payload?.invitation_id,
        ),
        event.payload,
      ];
    } else if (event.type === "meeting.invitation-responded") {
      this.roomState.invitations = this.roomState.invitations.map((item) =>
        item.invitation_id === event.payload?.invitation_id
          ? {
              ...item,
              status: event.payload?.status ?? item.status,
              responses: {
                ...(item.responses ?? {}),
                [event.payload?.member_id]: event.payload?.response,
              },
            }
          : item,
      );
    } else if (event.type === "meeting.started") {
      this.roomState.meeting = event.payload ?? null;
    } else if (event.type === "meeting.ended") {
      this.roomState.meeting = null;
    } else if (event.type === "bulletin.published") {
      this.roomState.bulletins = [...this.roomState.bulletins, event.payload];
    } else if (event.type === "icebreaker.started") {
      this.roomState.icebreaker = event.payload ?? null;
    } else if (event.type === "icebreaker.finished") {
      this.roomState.icebreaker = event.payload ?? this.roomState.icebreaker;
    }
    this.onEvent?.(event);
  }

  // ---------- 位置同步 ----------

  /**
   * 远端成员位置（与 v0 applyGroupPresence 相同的 participants 形状）：
   * [{ person_id, display_name, online, presence: { x, z, yaw } }]
   */
  presenceParticipants() {
    return [...this.members.values()].map((member) => ({
      person_id: member.memberId,
      display_name: member.displayName,
      online: true,
      presence: { x: member.x, z: member.z, yaw: 0 },
    }));
  }

  _emitMembers() {
    this.onMembersChange?.(this.presenceParticipants());
  }

  /**
   * 本地位置上报：getPosition() => {x, z, yaw} | null。
   * 约 4.5Hz 采样；位置没变不发送，但每 ~3s 强制心跳一次保持新鲜度。
   */
  startPresence(getPosition) {
    this.stopPresence();
    if (this.readOnly || typeof getPosition !== "function") return;
    this._presenceTimer = setInterval(() => {
      if (this._stopped || !this.roomId || !this.memberId) return;
      const position = getPosition();
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return;
      const last = this._lastSentPresence;
      this._presenceBeat += 1;
      const moved = !last
        || Math.hypot(position.x - last.x, position.z - last.z) > 0.02;
      const heartbeat = this._presenceBeat % 14 === 0; // ~3s
      if (!moved && !heartbeat) return;
      this._lastSentPresence = { x: position.x, z: position.z };
      this.moveTo(position.x, position.z).catch((error) => this._reportError(error));
    }, this.presenceMs);
  }

  stopPresence() {
    clearInterval(this._presenceTimer);
    this._presenceTimer = null;
    this._lastSentPresence = null;
  }
}
