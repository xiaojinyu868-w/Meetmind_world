/**
 * RoomClient 纯逻辑与状态机自测（无浏览器依赖，直接 `node scripts/room-client.test.mjs`）。
 *
 * 覆盖：事件 schema 校验、WS 帧解析、sequence 去重/空洞补拉、退避序列、
 * WS 断线 cursor 重连、WS 不可用时的 HTTP 轮询降级、member.move 命令幂等形状。
 */
import assert from "node:assert/strict";
import {
  ROOM_CLIENT_STATES,
  RoomClient,
  SequenceCursor,
  computeBackoffMs,
  parseStreamFrame,
  validateRoomEvent,
} from "../src/runtime/RoomClient.js";

const results = [];
function test(name, fn) {
  results.push({ name, fn });
}

function eventFrame(seq, type = "member.moved", payload = {}) {
  return JSON.stringify({
    type: "event",
    protocol: "meetmind.rooms.v1",
    event: {
      schema: "meetmind.event.v1",
      event_id: `evt_${seq}`,
      type,
      room_id: "room-t",
      actor_id: "someone",
      payload,
      sequence: seq,
      occurred_at: new Date().toISOString(),
    },
  });
}

function makeEvent(seq, type = "member.moved", payload = {}) {
  return JSON.parse(eventFrame(seq, type, payload)).event;
}

function snapshot(sequence = 0) {
  return {
    schema: "meetmind.room-snapshot.v1",
    room_id: "room-t",
    name: "测试房间",
    sequence,
    members: [],
    hotspots: [],
    meeting: null,
    icebreaker: null,
    invitations: [],
    bulletins: [],
  };
}

/** 记录调用的假 fetch：按 method+path 路由到处理器。 */
function fakeFetch(routes, calls = []) {
  return async (url, options = {}) => {
    const method = options.method ?? "GET";
    calls.push({ method, url, body: options.body ? JSON.parse(options.body) : null });
    const key = `${method} ${url}`;
    for (const [pattern, handler] of routes) {
      if (key.startsWith(pattern) || new RegExp(pattern).test(key)) {
        const payload = typeof handler === "function" ? handler(options) : handler;
        return { ok: true, status: 200, json: async () => payload };
      }
    }
    return { ok: false, status: 404, json: async () => ({ detail: { code: "room_not_found", message: "no route" } }) };
  };
}

/** 手动驱动的假 WebSocket。 */
class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  emit(text) {
    this.onmessage?.({ data: text });
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

function makeClient(overrides = {}, calls = []) {
  FakeWebSocket.instances = [];
  const routes = overrides.routes ?? [
    ["POST /api/v1/rooms/room-t/join", { joined: true, member: {}, sequence: 0 }],
    ["GET /api/v1/rooms/room-t/snapshot", snapshot(0)],
    ["GET /api/v1/rooms/room-t/events", { room_id: "room-t", events: [] }],
    ["POST /api/v1/rooms/room-t/commands", { accepted: true, command_id: "c", sequence: 0, events: [] }],
  ];
  const client = new RoomClient({
    baseUrl: "/api/v1/rooms",
    fetchImpl: fakeFetch(routes, calls),
    WebSocketImpl: overrides.ws === null ? null : FakeWebSocket,
    backoff: { baseMs: 20, maxMs: 60, jitterRatio: 0 },
    pollMs: 400,
    ...overrides.client,
  });
  return client;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- 纯函数 ----------

test("validateRoomEvent 接受合法事件", () => {
  const event = validateRoomEvent(makeEvent(1));
  assert.equal(event.sequence, 1);
  assert.equal(event.type, "member.moved");
});

test("validateRoomEvent 丢弃未知 schema / 缺字段，不抛出", () => {
  const warns = [];
  const original = console.warn;
  console.warn = (...args) => warns.push(args);
  try {
    assert.equal(validateRoomEvent({ schema: "mystery.v9" }), null);
    assert.equal(validateRoomEvent({ schema: "meetmind.event.v1", type: "x" }), null);
    assert.equal(validateRoomEvent(null), null);
  } finally {
    console.warn = original;
  }
  assert.ok(warns.length >= 2);
});

test("parseStreamFrame 解析 event/error 帧，垃圾帧归为 unknown", () => {
  assert.equal(parseStreamFrame(eventFrame(7)).event.sequence, 7);
  const error = parseStreamFrame(JSON.stringify({
    type: "error", protocol: "meetmind.rooms.v1", error: { code: "room_not_found", message: "x" },
  }));
  assert.deepEqual([error.kind, error.code], ["error", "room_not_found"]);
  assert.equal(parseStreamFrame("not json").kind, "unknown");
  assert.equal(parseStreamFrame(JSON.stringify({ type: "event", protocol: "other.v1" })).kind, "unknown");
});

test("SequenceCursor 去重与空洞检测", () => {
  const cursor = new SequenceCursor(3);
  assert.ok(cursor.isDuplicate(3));
  assert.ok(!cursor.isDuplicate(4));
  assert.ok(!cursor.hasGap(4));
  assert.ok(cursor.hasGap(5));
  assert.equal(cursor.advance(2), false);
  assert.equal(cursor.advance(4), true);
  assert.equal(cursor.current, 4);
});

test("computeBackoffMs 指数增长并封顶（零抖动）", () => {
  const options = { baseMs: 100, factor: 2, maxMs: 1000, jitterRatio: 0, random: () => 0 };
  assert.equal(computeBackoffMs(0, options), 100);
  assert.equal(computeBackoffMs(1, options), 200);
  assert.equal(computeBackoffMs(2, options), 400);
  assert.equal(computeBackoffMs(20, options), 1000);
});

// ---------- 客户端状态机 ----------

test("connect：join + 快照 + WS 上线，有序投递事件", async () => {
  const states = [];
  const events = [];
  const client = makeClient({
    client: { onStateChange: (state) => states.push(state), onEvent: (event) => events.push(event.sequence) },
  });
  await client.connect({ roomId: "room-t", memberId: "m1", displayName: "甲" });
  const ws = FakeWebSocket.instances.at(-1);
  assert.match(ws.url, /^ws:\/\/.*\/api\/v1\/rooms\/room-t\/stream\?after_sequence=0$/);
  ws.open();
  assert.equal(client.state, ROOM_CLIENT_STATES.LIVE);
  ws.emit(eventFrame(1));
  ws.emit(eventFrame(2));
  ws.emit(eventFrame(2)); // 重复帧去重
  ws.emit(eventFrame(3));
  assert.deepEqual(events, [1, 2, 3]);
  assert.equal(client.cursor.current, 3);
  assert.deepEqual(states, ["connecting", "live"]);
  client.close();
});

test("sequence 空洞：先 HTTP 补拉缺失段，再按序投递", async () => {
  const events = [];
  const client = makeClient({
    routes: [
      ["POST /api/v1/rooms/room-t/join", { joined: true, member: {}, sequence: 0 }],
      ["GET /api/v1/rooms/room-t/snapshot", snapshot(0)],
      ["GET /api/v1/rooms/room-t/events", { room_id: "room-t", events: [makeEvent(2), makeEvent(3)] }],
      ["POST /api/v1/rooms/room-t/commands", { accepted: true, events: [] }],
    ],
    client: { onEvent: (event) => events.push(event.sequence) },
  });
  await client.connect({ roomId: "room-t", memberId: "m1" });
  const ws = FakeWebSocket.instances.at(-1);
  ws.open();
  ws.emit(eventFrame(1));
  ws.emit(eventFrame(3)); // 跳过 2 → 触发 replay
  await sleep(50);
  assert.deepEqual(events, [1, 2, 3]);
  assert.equal(client.cursor.current, 3);
  client.close();
});

test("WS 断线：退避重连，用 after_sequence cursor 续传", async () => {
  const states = [];
  const client = makeClient({ client: { onStateChange: (state) => states.push(state) } });
  await client.connect({ roomId: "room-t", memberId: "m1" });
  const first = FakeWebSocket.instances.at(-1);
  first.open();
  first.emit(eventFrame(1));
  first.emit(eventFrame(2));
  first.close();
  assert.equal(client.state, ROOM_CLIENT_STATES.CONNECTING);
  await sleep(120); // 等退避重连（baseMs 20）
  const second = FakeWebSocket.instances.at(-1);
  assert.notEqual(second, first);
  assert.match(second.url, /after_sequence=2$/);
  second.open();
  assert.equal(client.state, ROOM_CLIENT_STATES.LIVE);
  assert.ok(states.includes("connecting"));
  client.close();
});

test("WS 不可用：降级 HTTP 轮询，事件照样有序到达", async () => {
  const events = [];
  const states = [];
  let served = 0;
  const client = makeClient({
    ws: null,
    routes: [
      ["POST /api/v1/rooms/room-t/join", { joined: true, member: {}, sequence: 0 }],
      ["GET /api/v1/rooms/room-t/snapshot", () => snapshot(served)],
      ["GET /api/v1/rooms/room-t/events", () => {
        served += 1;
        return { room_id: "room-t", events: served === 1 ? [makeEvent(1), makeEvent(2)] : [] };
      }],
      ["POST /api/v1/rooms/room-t/commands", { accepted: true, events: [] }],
    ],
    client: {
      pollMs: 400,
      onEvent: (event) => events.push(event.sequence),
      onStateChange: (state) => states.push(state),
    },
  });
  await client.connect({ roomId: "room-t", memberId: "m1" });
  await sleep(150);
  assert.deepEqual(events, [1, 2]);
  assert.ok(states.includes(ROOM_CLIENT_STATES.DEGRADED));
  client.close();
});

test("命令形状：command_id 幂等 uuid + actor_id；回执事件 ingest", async () => {
  const calls = [];
  const events = [];
  const client = makeClient({
    routes: [
      ["POST /api/v1/rooms/room-t/join", { joined: true, member: {}, sequence: 0 }],
      ["GET /api/v1/rooms/room-t/snapshot", snapshot(0)],
      ["GET /api/v1/rooms/room-t/events", { room_id: "room-t", events: [] }],
      ["POST /api/v1/rooms/room-t/commands", {
        accepted: true,
        command_id: "echo",
        sequence: 1,
        events: [makeEvent(1, "member.moved", { member_id: "m1", position: { x: 1, z: 2 } })],
      }],
    ],
    client: { onEvent: (event) => events.push(event.sequence) },
  }, calls);
  await client.connect({ roomId: "room-t", memberId: "m1", displayName: "甲" });
  FakeWebSocket.instances.at(-1).open();
  const result = await client.moveTo(1, 2);
  assert.equal(result.accepted, true);
  const commandCall = calls.find((call) => call.url.endsWith("/commands"));
  assert.equal(commandCall.body.actor_id, "m1");
  assert.equal(commandCall.body.type, "member.move");
  assert.deepEqual(commandCall.body.payload, { x: 1, z: 2 });
  assert.match(commandCall.body.command_id, /^cmd_/);
  assert.deepEqual(events, [1]); // 回执事件按序投递
  client.close();
});

test("远端成员位置：joined/moved 事件驱动 presenceParticipants", async () => {
  const rosters = [];
  const client = makeClient({
    client: { onMembersChange: (participants) => rosters.push(participants) },
  });
  await client.connect({ roomId: "room-t", memberId: "m1" });
  const ws = FakeWebSocket.instances.at(-1);
  ws.open();
  ws.emit(eventFrame(1, "member.joined", {
    member: { member_id: "m2", display_name: "乙", position: { x: 3, z: 4 } },
  }));
  ws.emit(eventFrame(2, "member.moved", { member_id: "m2", position: { x: 5, z: 6 } }));
  const latest = rosters.at(-1);
  const remote = latest.find((item) => item.person_id === "m2");
  assert.equal(remote.display_name, "乙");
  assert.deepEqual(remote.presence, { x: 5, z: 6, yaw: 0 });
  client.close();
});

test("只读（大屏）模式：不 join、不上报位置", async () => {
  const calls = [];
  const client = makeClient({}, calls);
  await client.connect({ roomId: "room-t", readOnly: true });
  FakeWebSocket.instances.at(-1).open();
  assert.equal(client.state, ROOM_CLIENT_STATES.LIVE);
  assert.equal(client.readOnly, true);
  assert.ok(!calls.some((call) => call.url.includes("/join")));
  client.startPresence(() => ({ x: 1, z: 1 }));
  await sleep(300);
  assert.ok(!calls.some((call) => call.url.includes("/commands")));
  client.close();
});

test("房间不存在：connect 抛错并回到 closed，不留定时器", async () => {
  const client = makeClient({ routes: [] });
  await assert.rejects(
    client.connect({ roomId: "room-t", memberId: "m1" }),
    /no route|HTTP 404/,
  );
  assert.equal(client.state, ROOM_CLIENT_STATES.CLOSED);
});

// ---------- 运行 ----------

let failed = 0;
for (const { name, fn } of results) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL - ${name}`);
    console.error(error);
  }
}
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exit(failed ? 1 : 0);
