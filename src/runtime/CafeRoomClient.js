// 咖啡厅 v1 实时房间客户端（K3/Autonomy 线，2026-08-04 自 meetmind_go WIP 并入）。
// 与 RoomClient.js（大厅正式线：WS 有序重放/降级轮询/大屏）并存——本客户端是
// 咖啡厅 PersonAgent 自主交互线的轻量实现；baseUrl 默认已修正为带 BASE_URL。
const ROOM_PROTOCOL = "meetmind.rooms.v1";

function commandId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class RoomClient {
  static POLL_INTERVAL_MS = 6000;

  constructor({ roomId = "echoworld-cafe", actor, members = [], baseUrl = `${import.meta.env.BASE_URL}api/v1` } = {}) {
    this.roomId = roomId;
    this.actor = actor;
    this.members = members;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.sequence = 0;
    this.snapshot = null;
    this.socket = null;
    this.running = false;
    this.reconnectTimer = null;
    this.pollTimer = null;
    this.eventCallbacks = new Set();
    this.snapshotCallbacks = new Set();
    this.seenEventIds = new Set();
  }

  onEvent(callback) {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  onSnapshot(callback) {
    this.snapshotCallbacks.add(callback);
    return () => this.snapshotCallbacks.delete(callback);
  }

  async start() {
    if (this.running) return;
    this.running = true;
    await this.#ensureRoom();
    await this.#refreshSnapshot();
    try {
      await this.#replay();
    } catch (error) {
      // 历史回放失败（事件量大/网关慢）不阻塞启动：WS + 轮询照常建立，
      // 世界最终一致比开局完整性更重要
      console.warn("[EchoWorld] 房间事件回放失败，跳过（轮询兜底）", error);
    }
    this.#connect();
    // 周期性快照轮询：房间生活指挥（入座/走位/会议）的权威刷新通道；
    // WS 事件负责即时性，轮询负责最终一致（WS 断开/事件丢失时世界仍然生动）
    this.pollTimer = window.setInterval(() => {
      if (this.running) this.#refreshSnapshot().catch(() => {});
    }, RoomClient.POLL_INTERVAL_MS);
  }

  stop() {
    this.running = false;
    window.clearTimeout(this.reconnectTimer);
    window.clearInterval(this.pollTimer);
    this.socket?.close();
    this.socket = null;
  }

  async send(type, payload = {}) {
    const response = await this.#request(`rooms/${this.roomId}/commands`, {
      method: "POST",
      body: JSON.stringify({
        command_id: commandId(type.replaceAll(".", "-")),
        actor_id: this.actor.id,
        type,
        payload,
      }),
    });
    for (const event of response.events ?? []) this.#emitEvent(event);
    this.sequence = Math.max(this.sequence, Number(response.sequence) || 0);
    await this.#refreshSnapshot();
    return response;
  }

  move(x, z) {
    return this.send("member.move", { x, z });
  }

  message(targetId, text) {
    return this.send("person.message", { target_id: targetId, text });
  }

  async #ensureRoom() {
    try {
      await this.#request("rooms", {
        method: "POST",
        body: JSON.stringify({ room_id: this.roomId, name: "Echo Cafe" }),
      });
    } catch (error) {
      if (error.status !== 409) throw error;
    }
    // 并发 join：19 个串行 POST 在弱网/高负载下会耗尽启动预算（曾因此
    // 超时回退 v0，世界只剩 6 人）；join 幂等，并发安全
    await Promise.all([this.actor, ...this.members].map(async (member) => {
      try {
        await this.#request(`rooms/${this.roomId}/join`, {
          method: "POST",
          body: JSON.stringify({
            member_id: member.id,
            display_name: member.displayName ?? member.name ?? member.id,
            position: member.position ?? { x: 0, z: 0 },
          }),
        });
      } catch (error) {
        if (error.status !== 409) throw error;
      }
    }));
  }

  async #refreshSnapshot() {
    this.snapshot = await this.#request(`rooms/${this.roomId}/snapshot`);
    this.sequence = Math.max(this.sequence, Number(this.snapshot.sequence) || 0);
    for (const callback of this.snapshotCallbacks) callback(this.snapshot);
  }

  async #replay() {
    const data = await this.#request(
      `rooms/${this.roomId}/events?after_sequence=${this.sequence}`,
    );
    for (const event of data.events ?? []) this.#emitEvent(event);
  }

  #connect() {
    if (!this.running || typeof WebSocket === "undefined") return;
    const base = new URL(`${this.baseUrl}/rooms/${this.roomId}/stream`, window.location.href);
    base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
    base.searchParams.set("after_sequence", String(this.sequence));
    this.socket = new WebSocket(base.href);
    this.socket.addEventListener("message", (message) => {
      let frame;
      try {
        frame = JSON.parse(message.data);
      } catch {
        return;
      }
      if (frame.protocol === ROOM_PROTOCOL && frame.type === "event") {
        this.#emitEvent(frame.event);
      }
    });
    this.socket.addEventListener("close", () => {
      this.socket = null;
      if (!this.running) return;
      this.reconnectTimer = window.setTimeout(async () => {
        try {
          await this.#replay();
          await this.#refreshSnapshot();
        } finally {
          this.#connect();
        }
      }, 1200);
    });
  }

  #emitEvent(event) {
    if (!event?.event_id || this.seenEventIds.has(event.event_id)) return;
    this.seenEventIds.add(event.event_id);
    if (this.seenEventIds.size > 1000) {
      this.seenEventIds = new Set([...this.seenEventIds].slice(-500));
    }
    this.sequence = Math.max(this.sequence, Number(event.sequence) || 0);
    for (const callback of this.eventCallbacks) callback(event);
  }

  async #request(path, options = {}) {
    // 60s 超时：为真实模型首轮响应留出空间，同时避免请求永久挂起
    const controller = new AbortController();
    // Real roundtable startup waits for the model's first responses. Keep a hard
    // timeout, but do not abort a healthy provider merely because it needs >15s.
    const timer = window.setTimeout(() => controller.abort(), 60000);
    const token = window.localStorage?.getItem("meetmind_access_token");
    try {
      const response = await fetch(`${this.baseUrl}/${path}`, {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        ...options,
      });
      if (!response.ok) {
        const error = new Error(`Room API HTTP ${response.status}`);
        error.status = response.status;
        error.body = await response.json().catch(() => null);
        throw error;
      }
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }
}
