export class EventClient extends EventTarget {
  constructor({
    baseUrl = globalThis.document?.baseURI || "http://localhost:5189/",
    storage = globalThis.localStorage,
    fetchImpl = globalThis.fetch?.bind(globalThis),
    WebSocketImpl = globalThis.WebSocket,
    timers = globalThis,
    timeoutMs = 12000,
  } = {}) {
    super();
    this.baseUrl = baseUrl; this.storage = storage; this.fetchImpl = fetchImpl;
    this.WebSocketImpl = WebSocketImpl; this.timers = timers; this.timeoutMs = timeoutMs;
    this.token = ""; this.snapshot = null; this.me = null; this.closed = false;
    this.retry = 0; this.ws = null; this.retryTimer = null; this.pollTimer = null;
    this.mePending = null; this.meTargetVersion = 0;
    try { this.token = storage?.getItem("echo-campus-token") || ""; } catch {}
  }
  emit(type, detail) { if (!this.closed) this.dispatchEvent(new CustomEvent(type, { detail })); }
  clearSession(expectedToken = this.token) {
    if (expectedToken !== this.token) return;
    this.token = ""; this.me = null;
    try { this.storage?.removeItem("echo-campus-token"); } catch {}
    this.emit("me", null);
  }
  async request(path, options = {}) {
    const issuedToken = this.token;
    const controller = new AbortController();
    const timer = this.timers.setTimeout(() => controller.abort(), this.timeoutMs);
    const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
    try {
      const response = await this.fetchImpl(new URL("api/" + path, this.baseUrl), {
        ...options, signal,
        headers: { "Content-Type": "application/json", ...(issuedToken ? { Authorization: "Bearer " + issuedToken } : {}), ...options.headers },
      });
      let data;
      try { data = await response.json(); } catch { throw new Error("服务暂未响应，请稍后重试"); }
      if (!response.ok) {
        if (response.status === 401) this.clearSession(issuedToken);
        const error = new Error(data.error?.message || (typeof data.error === "string" ? data.error : data.message) || "操作未完成");
        error.status = response.status; error.code = data.error?.code || "REQUEST_FAILED";
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") throw new Error("活动服务响应超时，请稍后重试");
      throw error;
    } finally { this.timers.clearTimeout(timer); }
  }
  async start() {
    this.closed = false;
    let loaded = false;
    try { loaded = this.setSnapshot(await this.request("event")); if (this.token) await this.refreshMe(); }
    catch (error) { this.emit("status", { online: false, message: error.message }); }
    this.connect();
    this.startPolling();
    return loaded;
  }
  setSnapshot(data) {
    if (!data || !data.event || !Number.isSafeInteger(data.version) || data.version < 1 || !Array.isArray(data.attendees) || !Array.isArray(data.connections)) return false;
    if (this.snapshot && data.event.id === this.snapshot.event.id && data.version <= this.snapshot.version) return false;
    this.snapshot = { event: data.event, version: data.version, attendees: data.attendees, connections: data.connections };
    this.emit("snapshot", this.snapshot);
    return true;
  }
  async refreshMe() {
    if (!this.token || this.closed) return null;
    this.meTargetVersion = Math.max(this.meTargetVersion, this.snapshot?.version || 0);
    if (this.mePending) return this.mePending;
    const issuedToken = this.token;
    this.mePending = (async () => {
      try {
        let data = await this.request("me");
        if (this.closed || issuedToken !== this.token) return this.me;
        // One follow-up covers a snapshot received while the first /me request was in flight.
        if (data.version < this.meTargetVersion) data = await this.request("me");
        if (this.closed || issuedToken !== this.token) return this.me;
        if (!this.me || data.version >= (this.me.version || 0)) { this.me = data; this.emit("me", data); }
        return this.me;
      } catch (error) {
        // 401 clears the session in request(). A transient outage must not erase a valid local identity.
        if (error.status !== 401) this.emit("status", { online: false, message: error.message });
        return this.me;
      } finally { this.mePending = null; }
    })();
    return this.mePending;
  }
  async join(profile) {
    if (profile?.consent !== true) throw new Error("请先确认在本活动公开展示这些资料");
    const data = await this.request("join", { method: "POST", body: JSON.stringify(profile) });
    if (!data.token || !data.attendee?.id) throw new Error("活动服务未返回有效的分身，请重试");
    this.token = data.token;
    try { this.storage?.setItem("echo-campus-token", data.token); } catch {
      this.emit("status", { online: true, message: "此浏览器无法保存会话，刷新后需要重新入场" });
    }
    this.me = { attendee: data.attendee, version: data.snapshot?.version || 0, encounters: this.me?.attendee?.id === data.attendee.id ? this.me.encounters : [] };
    this.emit("me", this.me);
    this.setSnapshot(data.snapshot);
    await this.refreshMe();
    return data;
  }
  async matches() { return this.request("matches"); }
  async encounter(peerId) {
    const result = await this.request("encounters", { method: "POST", body: JSON.stringify({ peerId }) });
    this.meTargetVersion = Math.max(this.meTargetVersion, result.version || 0);
    await this.refreshMe(); return result;
  }
  async confirm(id) {
    const result = await this.request("encounters/" + encodeURIComponent(id) + "/confirm", { method: "POST", body: "{}" });
    this.meTargetVersion = Math.max(this.meTargetVersion, result.version || 0);
    await this.refreshMe(); return result;
  }
  startPolling() {
    if (this.closed || this.pollTimer !== null) return;
    this.pollTimer = this.timers.setTimeout(async () => {
      this.pollTimer = null;
      if (this.closed) return;
      if (!this.ws || this.ws.readyState !== 1) {
        try {
          const changed = this.setSnapshot(await this.request("event"));
          this.emit("status", { online: true, transport: "poll" });
          if (this.token && (changed || !this.me)) await this.refreshMe();
        } catch (error) { this.emit("status", { online: false, message: error.message }); }
      }
      this.startPolling();
    }, 10000);
  }
  connect() {
    if (this.closed || !this.WebSocketImpl || (this.ws && this.ws.readyState < 2)) return;
    const url = new URL("api/live", this.baseUrl); url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    let ws;
    try { ws = new this.WebSocketImpl(url); } catch { this.scheduleReconnect(); return; }
    this.ws = ws;
    ws.onopen = () => {
      if (this.closed || this.ws !== ws) return;
      this.retry = 0; this.emit("status", { online: true, transport: "websocket" });
    };
    ws.onmessage = event => {
      if (this.closed || this.ws !== ws) return;
      try {
        const data = JSON.parse(event.data);
        const changed = this.setSnapshot(data.snapshot || data);
        if (changed && this.token) this.refreshMe();
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (this.closed || this.ws !== ws) return;
      this.emit("status", { online: false });
      this.scheduleReconnect();
    };
  }
  scheduleReconnect() {
    if (this.closed || this.retryTimer !== null) return;
    this.retryTimer = this.timers.setTimeout(() => { this.retryTimer = null; this.connect(); }, Math.min(10000, 1000 * 2 ** this.retry++));
  }
  dispose() {
    this.closed = true;
    if (this.retryTimer !== null) this.timers.clearTimeout(this.retryTimer);
    if (this.pollTimer !== null) this.timers.clearTimeout(this.pollTimer);
    this.retryTimer = null; this.pollTimer = null;
    if (this.ws) { this.ws.onclose = null; this.ws.onmessage = null; this.ws.onopen = null; this.ws.close(); }
  }
}
