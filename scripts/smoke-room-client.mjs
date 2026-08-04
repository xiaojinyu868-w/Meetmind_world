/**
 * v1 房间双端实时冒烟（真实后端 + 真实 WebSocket）。
 *
 * 用法：
 *   node scripts/smoke-room-client.mjs                 # 自动拉起本地 uvicorn（ECHO_DATA_DIR=/tmp/...）
 *   node scripts/smoke-room-client.mjs --base-url http://127.0.0.1:8000   # 打已有后端
 *
 * 验证：创建房间 → 两名成员经 RoomClient 加入 → A 移动 → B 端按序收到
 * member.joined / member.moved 且 presenceParticipants 更新 → 再验证一个
 * 强制轮询（无 WS）的降级客户端同样收到有序事件。
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoomClient } from "../src/runtime/RoomClient.js";

const args = process.argv.slice(2);
const baseUrlArgIndex = args.indexOf("--base-url");
let baseUrl = baseUrlArgIndex >= 0 ? args[baseUrlArgIndex + 1] : null;
let backendProcess = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForBackend(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/v1/scenes/modules`);
      if (response.ok) return;
    } catch {
      // 尚未就绪
    }
    await sleep(400);
  }
  throw new Error(`后端 ${url} 等待超时`);
}

async function ensureBackend() {
  if (baseUrl) return;
  const port = 8700 + Math.floor(Math.random() * 200);
  baseUrl = `http://127.0.0.1:${port}`;
  const dataDir = mkdtempSync(join(tmpdir(), "echoworld-room-smoke-"));
  const python = new URL("../backend/.venv/bin/python", import.meta.url).pathname;
  // websockets 装进 /tmp（共享 venv 不带 WS 库，不能动）：通过 PYTHONPATH 叠加
  const pythonPath = ["/tmp/wslibs", process.env.PYTHONPATH].filter(Boolean).join(":");
  backendProcess = spawn(
    python,
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(port)],
    {
      cwd: new URL("../backend", import.meta.url).pathname,
      env: { ...process.env, ECHO_DATA_DIR: dataDir, PYTHONPATH: pythonPath },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  backendProcess.stderr.on("data", (chunk) => {
    const line = String(chunk).trim();
    if (line) console.error(`[uvicorn] ${line.split("\n").at(-1).slice(0, 160)}`);
  });
  await waitForBackend(baseUrl);
  console.log(`后端已就绪：${baseUrl}（ECHO_DATA_DIR=${dataDir}）`);
}

function makeDevice(name, { forcePolling = false } = {}) {
  const received = [];
  const client = new RoomClient({
    baseUrl: `${baseUrl}/api/v1/rooms`,
    WebSocketImpl: forcePolling ? null : undefined,
    pollMs: 400,
    onEvent: (event) => received.push(event),
  });
  return { name, client, received };
}

function assertOrdered(events, label) {
  for (let index = 1; index < events.length; index += 1) {
    if (events[index].sequence <= events[index - 1].sequence) {
      throw new Error(`${label} 事件乱序：#${events[index - 1].sequence} 之后出现 #${events[index].sequence}`);
    }
  }
}

async function waitFor(check, label, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = check();
    if (value) return value;
    await sleep(100);
  }
  throw new Error(`等待超时：${label}`);
}

async function main() {
  await ensureBackend();

  // 1. 创建房间
  const creator = new RoomClient({ baseUrl: `${baseUrl}/api/v1/rooms` });
  const room = await creator.createRoom({ name: "冒烟现场" });
  const roomId = room.room_id;
  console.log(`房间已创建：${roomId}`);

  // 2. 两名成员经 WS 客户端加入
  const a = makeDevice("A");
  const b = makeDevice("B");
  await a.client.connect({ roomId, memberId: "smoke-a", displayName: "甲", position: { x: 0, z: 0 } });
  await b.client.connect({ roomId, memberId: "smoke-b", displayName: "乙", position: { x: 1, z: 1 } });
  await waitFor(
    () => a.client.state === "live" && b.client.state === "live",
    "两端 WS 上线",
  );
  console.log("两端 WebSocket 已上线（state=live）");

  // 3. A 移动两次，B 端应看到 member.moved(smoke-a)
  await a.client.moveTo(2.5, 1.5);
  await a.client.moveTo(3.0, 2.0);
  await waitFor(
    () => b.received.filter((event) => event.type === "member.moved" && event.payload?.member_id === "smoke-a").length >= 2
      && b.received,
    "B 收到 A 的移动事件",
  );
  const bSeesA = b.client.members.get("smoke-a");
  if (!bSeesA || Math.abs(bSeesA.x - 3.0) > 1e-9 || Math.abs(bSeesA.z - 2.0) > 1e-9) {
    throw new Error(`B 端 A 的位置不正确：${JSON.stringify(bSeesA)}`);
  }
  console.log("B 端按序看到 A 的移动，位置已同步到 (3.0, 2.0)");

  // 4. B 移动，A 端确认 member.joined(smoke-b) 先于 member.moved(smoke-b)
  await b.client.moveTo(-1.5, 0.5);
  await waitFor(
    () => a.received.some((event) => event.type === "member.moved" && event.payload?.member_id === "smoke-b"),
    "A 收到 B 的移动事件",
  );
  const joinedSeq = a.received.find((event) => event.type === "member.joined" && event.payload?.member?.member_id === "smoke-b")?.sequence;
  const movedSeq = a.received.find((event) => event.type === "member.moved" && event.payload?.member_id === "smoke-b")?.sequence;
  if (!(joinedSeq > 0 && movedSeq > joinedSeq)) {
    throw new Error(`A 端事件顺序异常：joined=#${joinedSeq} moved=#${movedSeq}`);
  }
  assertOrdered(a.received, "A 端");
  assertOrdered(b.received, "B 端");
  console.log(`A 端顺序确认：member.joined(#${joinedSeq}) → member.moved(#${movedSeq})，两端序列严格递增`);

  // 5. 降级客户端（强制 HTTP 轮询，模拟不支持 WS 的代理）也能收到有序事件
  const c = makeDevice("C-轮询", { forcePolling: true });
  await c.client.connect({ roomId, memberId: "smoke-c", displayName: "丙", position: { x: 0, z: 1 } });
  await waitFor(() => c.client.state === "degraded", "C 进入轮询模式");
  await a.client.moveTo(4.0, 4.0);
  await waitFor(
    () => c.received.some((event) => event.type === "member.moved" && event.payload?.position?.x === 4.0),
    "轮询客户端收到 A 的最新移动",
  );
  assertOrdered(c.received, "C 端(轮询)");
  console.log("降级轮询客户端同样收到有序事件（WS 不可用时功能等价）");

  // 6. command_id 幂等：同一 command_id 重放返回 replayed
  const commandId = "smoke-cmd-idempotent-1";
  const first = await a.client.sendCommand("member.move", { x: 1, z: 1 }, { commandId });
  const replay = await a.client.sendCommand("member.move", { x: 1, z: 1 }, { commandId });
  if (!first.accepted || !replay.replayed) {
    throw new Error(`幂等校验失败：first=${JSON.stringify(first)} replay=${JSON.stringify(replay)}`);
  }
  console.log("command_id 幂等确认：重放返回 replayed=true");

  for (const device of [a, b, c]) device.client.close();
  console.log("\nSMOKE PASS");
}

let exitCode = 0;
try {
  await main();
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  backendProcess?.kill("SIGKILL");
}
process.exit(exitCode);
