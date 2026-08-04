const ROOM_PROTOCOL = "meetmind.rooms.v1";

function commandId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class RoomClient {
  constructor({ roomId = "echoworld-cafe", actor, members = [], baseUrl = "api/v1" } = {}) {
    this.roomId = roomId;
    this.actor = actor;
    this.members = members;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.sequence = 0;
    this.snapshot = null;
    this.socket = null;
    this.running = false;
    this.reconnectTimer = null;
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
    await this.#replay();
    this.#connect();
  }

  stop() {
    this.running = false;
    window.clearTimeout(this.reconnectTimer);
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
    for (const member of [this.actor, ...this.members]) {
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
    }
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
    const response = await fetch(`${this.baseUrl}/${path}`, {
      headers: { accept: "application/json", "content-type": "application/json" },
      ...options,
    });
    if (!response.ok) {
      const error = new Error(`Room API HTTP ${response.status}`);
      error.status = response.status;
      error.body = await response.json().catch(() => null);
      throw error;
    }
    return response.json();
  }
}
