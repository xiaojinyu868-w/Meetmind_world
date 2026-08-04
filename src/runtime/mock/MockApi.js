/**
 * MockApi —— API v0 契约客户端（先前端阶段的唯一数据入口）。
 *
 * 覆盖契约：IF-1 ingest / IF-2 pipeline / IF-3 confirm / IF-4 world/snapshot / IF-5 packages+search
 * / IF-6 agents/chat（玩家与 Agent 单聊 + 手动沉淀）。
 * （见 docs/API.md；快照 schema 见 docs/ARCHITECTURE.md §4。）
 *
 * mock / live 切换（前后端联调的唯一开关，全部逻辑集中在本文件）：
 * - 默认 mock：从 `public/data/mock/` 读取静态文件（经 publicUrl() 处理 BASE_URL）。
 * - URL 加 `?api=live`：改向真实后端 `baseURL = /api/v0` 发请求，mock 数据完全不加载。
 * - 用法：`http://127.0.0.1:5173/?api=live`；去掉参数即回到 mock。
 *
 * mock 数据约定（docs/API.md「前端 mock 约定」）：
 * - `pipeline.stream.jsonl`：黑客松展位（新人，`match_person_id: null`）。
 * - `pipeline-reunion.stream.jsonl`：老朋友重逢（`match_person_id` 非空）。
 *   jsonl 每行 = 一个 SSE `data` JSON：含 `step` 字段的是 progress 事件，
 *   含 `encounter_draft` 字段的是最后的 result 事件。
 */

import { publicUrl } from "../WorldSpec.js";

const LIVE_BASE_URL = `${import.meta.env.BASE_URL}api/v0`;
const LIVE_V1_BASE_URL = `${import.meta.env.BASE_URL}api/v1`;
const MOCK_DIR = "data/mock";
const SNAPSHOT_SCHEMA = "echo-snapshot.v1";

/** pipeline mock 播放节奏：每条 SSE 事件之间的间隔（毫秒），模拟真实处理耗时。 */
const PIPELINE_STEP_DELAY_MIN_MS = 600;
const PIPELINE_STEP_DELAY_MAX_MS = 1200;

const PIPELINE_SCENARIO_FILES = Object.freeze({
  new: "pipeline.stream.jsonl",
  reunion: "pipeline-reunion.stream.jsonl",
});

/**
 * 当前 API 模式："mock" | "live"。模块加载时由 URL 参数 `?api=live` 决定一次，
 * 之后不变（刷新页面才能切换），避免会话中途数据源混用。
 */
export const API_MODE = (() => {
  if (typeof window === "undefined" || !window.location) return "mock";
  const params = new URLSearchParams(window.location.search);
  return params.get("api") === "live" ? "live" : "mock";
})();

/** @returns {boolean} 当前是否连真实后端（`/api/v0`）。 */
export function isLiveMode() {
  return API_MODE === "live";
}

function mockUrl(fileName) {
  return publicUrl(`${MOCK_DIR}/${fileName}`);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`GET ${url} 未返回 JSON，请检查本地 /api 代理是否连接后端`);
  }
  return response.json();
}

function normalizePackageList(payload) {
  const packages = Array.isArray(payload) ? payload : payload?.packages;
  if (!Array.isArray(packages)) {
    throw new Error("IF-5 packages: 响应必须是数组或 { packages: [] }");
  }
  return packages;
}

async function fetchJsonLines(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${response.status}`);
  }
  const text = await response.text();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${url} 第 ${index + 1} 行不是合法 JSON：${error.message}`);
      }
    });
}

async function postJson(path, body) {
  const response = await fetch(`${LIVE_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`POST ${path} failed: HTTP ${response.status}`);
  }
  return response.json();
}

/** 带后端 detail 的 POST（会议室等需要把 409 原因透传到 UI 的端点用）。 */
async function postJsonWithDetail(path, body) {
  const response = await fetch(`${LIVE_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.json())?.detail ?? "";
    } catch {
      detail = "";
    }
    const error = new Error(detail || `POST ${path} failed: HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function postV1Json(path, body) {
  const response = await fetch(`${LIVE_V1_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`POST v1 ${path} failed: HTTP ${response.status}`);
  }
  return response.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomStepDelay() {
  const span = PIPELINE_STEP_DELAY_MAX_MS - PIPELINE_STEP_DELAY_MIN_MS;
  return PIPELINE_STEP_DELAY_MIN_MS + Math.random() * span;
}

/**
 * 消费 SSE 流（`event:` / `data:` 行，空行分隔），逐块回调。
 * @param {Response} response fetch 响应（body 必须是可读流）
 * @param {(event: string, data: object) => void} onEvent 每条事件的回调
 */
async function consumeEventStream(response, onEvent) {
  if (!response.body) {
    throw new Error("当前环境不支持 ReadableStream，无法消费 SSE");
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice("event:".length).trim();
        else if (line.startsWith("data:")) data += line.slice("data:".length).trim();
      }
      if (data) onEvent(event, JSON.parse(data));
      boundary = buffer.indexOf("\n\n");
    }
  }
}

/**
 * 校验世界快照（echo-snapshot.v1，版本号硬校验；docs/ARCHITECTURE.md §4）。
 * @param {object} snapshot
 * @returns {object} 原快照
 */
function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("snapshot 必须是对象");
  }
  if (snapshot.schema !== SNAPSHOT_SCHEMA) {
    throw new Error(`不支持的 snapshot schema：${snapshot.schema}（期望 ${SNAPSHOT_SCHEMA}）`);
  }
  if (!Array.isArray(snapshot.agents)) {
    throw new Error("snapshot.agents 必须是数组");
  }
  if (!Array.isArray(snapshot.modules)) snapshot.modules = [];
  if (!Array.isArray(snapshot.events)) snapshot.events = [];
  return snapshot;
}

/**
 * mock 模式下的内置 fallback 快照：snapshot.demo.json 加载失败时使用，
 * 保证世界仍然可渲染（6 个 Agent 就位、桌位模块齐全、无近期事件）。
 * live 模式不使用 fallback —— 后端故障必须暴露，不用 mock 数据掩盖。
 */
export const SNAPSHOT_FALLBACK = Object.freeze({
  schema: SNAPSHOT_SCHEMA,
  tick: 0,
  agents: Object.freeze([
    { id: "lin-che", position: { x: -4.53, z: -1.55, yaw: 1.5708 }, state: "seated",
      avatar: { palette: { hair: "#252a31", jacket: "#315d83", MAT_Jacket_Light: "#527ea2", shirt: "#f0e7cf", pants: "#313d4a", shoes: "#d07444", skin: "#d79a73" } } },
    { id: "chen-mo", position: { x: -2.77, z: -1.55, yaw: -1.5708 }, state: "seated",
      avatar: { palette: { hair: "#242829", jacket: "#667443", MAT_Jacket_Light: "#89965c", shirt: "#e4dec8", pants: "#3d4442", shoes: "#a45d3c", skin: "#d79a73" } } },
    { id: "zhou-ning", position: { x: -4.53, z: 1.55, yaw: 1.5708 }, state: "seated",
      avatar: { palette: { hair: "#56352b", jacket: "#b85f50", MAT_Jacket_Light: "#d27a68", shirt: "#f0dfc5", pants: "#344957", shoes: "#d0a95d", skin: "#d79a73" } } },
    { id: "xu-an", position: { x: -2.77, z: 1.55, yaw: -1.5708 }, state: "seated",
      avatar: { palette: { hair: "#67392e", jacket: "#c18b39", MAT_Jacket_Light: "#d4a85d", shirt: "#f0e5c9", pants: "#315d59", shoes: "#715040", skin: "#d79a73" } } },
    { id: "su-he", position: { x: 2.89, z: 0.83, yaw: 0.4398 }, state: "seated",
      avatar: { palette: { hair: "#29282b", jacket: "#8b4a62", MAT_Jacket_Light: "#af6680", shirt: "#dce8e5", pants: "#3d4552", shoes: "#b98945", skin: "#d79a73" } } },
    { id: "tang-ke", position: { x: 3.67, z: 0.83, yaw: -0.4398 }, state: "seated",
      avatar: { palette: { hair: "#4a352d", jacket: "#2f7d7b", MAT_Jacket_Light: "#52a09b", shirt: "#efe5ca", pants: "#383e48", shoes: "#cc7548", skin: "#d79a73" } } },
  ]),
  modules: Object.freeze([
    { id: "roundtable-six", type: "roundtable", position: { x: 0, z: 0 } },
    { id: "table-window-two", type: "table", position: { x: -3.65, z: -1.55 } },
    { id: "table-poster-two", type: "table", position: { x: -3.65, z: 1.55 } },
    { id: "table-library-four", type: "table", position: { x: 3.28, z: -1.35 } },
    { id: "table-counter-four", type: "table", position: { x: 3.28, z: 1.65 } },
  ]),
  events: Object.freeze([]),
});

/**
 * IF-1 输入接口：`POST /api/v0/ingest`（multipart/form-data）。
 * 接收一段视频/音频输入，落盘即只读。
 * @contract IF-1
 * @param {Array<File|Blob>} files 媒体文件（mp4/mov/m4a/wav/mp3），至少一个
 * @param {object} meta
 * @param {string} meta.captured_at ISO8601 采集时间（必填）
 * @param {string} meta.device `glasses` / `phone` / `k3-board`（必填）
 * @param {string} [meta.note] 用户手动备注
 * @param {string} [meta.place_hint] 地点提示
 * @returns {Promise<{input_id: string, facts_refs: string[], status: string}>}
 */
export async function ingest(files, meta = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("IF-1 ingest: 至少需要一个媒体文件（media 必填）");
  }
  if (!meta.captured_at || !meta.device) {
    throw new Error("IF-1 ingest: meta.captured_at 与 meta.device 必填");
  }
  if (isLiveMode()) {
    const form = new FormData();
    for (const file of files) form.append("media", file);
    form.append("captured_at", meta.captured_at);
    form.append("device", meta.device);
    if (meta.note) form.append("note", meta.note);
    if (meta.place_hint) form.append("place_hint", meta.place_hint);
    const response = await fetch(`${LIVE_BASE_URL}/ingest`, { method: "POST", body: form });
    if (!response.ok) {
      throw new Error(`IF-1 ingest failed: HTTP ${response.status}`);
    }
    return response.json();
  }
  return fetchJson(mockUrl("ingest.response.json"));
}

/**
 * IF-2 处理接口「pipeline」：`POST /api/v0/pipeline`（SSE 流式）。
 * 对一次输入启动处理，流式产出中间特征，最终给出相遇草稿（永远未确认，须走 IF-3）。
 *
 * mock 模式：按行读取 jsonl，用定时器逐条播放（每条间隔 600–1200ms 随机），
 * progress 行回调 onProgress，result 行的 encounter_draft 作为 Promise 结果。
 * @contract IF-2
 * @param {string} inputId 来自 IF-1 的 input_id（mock 模式仅作签名对齐，不参与取数）
 * @param {(progress: object) => void} [onProgress] 每个 progress 事件
 *   （preprocess / faces / transcript / scene）触发一次
 * @param {object} [options]
 * @param {"new"|"reunion"} [options.scenario="new"] mock 专用：演示场景，
 *   "new"=黑客松新人（match_person_id 为 null），"reunion"=老朋友重逢（非空）；live 模式忽略
 * @returns {Promise<object>} encounter_draft（echo-package.v0 结构，`identity.confirmed` 恒为 false）
 */
export async function pipelineStream(inputId, onProgress, options = {}) {
  if (isLiveMode()) {
    const response = await fetch(`${LIVE_BASE_URL}/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ input_id: inputId, mode: "stream" }),
    });
    if (!response.ok) {
      throw new Error(`IF-2 pipeline failed: HTTP ${response.status}`);
    }
    let draft = null;
    await consumeEventStream(response, (event, data) => {
      if (event === "result") {
        draft = data.encounter_draft ?? null;
      } else if (event === "progress") {
        onProgress?.(data);
      }
    });
    if (!draft) {
      throw new Error("IF-2 pipeline: SSE 流结束但未收到 result 事件");
    }
    return draft;
  }

  const fileName = PIPELINE_SCENARIO_FILES[options.scenario] ?? PIPELINE_SCENARIO_FILES.new;
  const events = await fetchJsonLines(mockUrl(fileName));
  let draft = null;
  for (const eventData of events) {
    await delay(randomStepDelay());
    if (eventData.encounter_draft) {
      draft = eventData.encounter_draft;
    } else {
      onProgress?.(eventData);
    }
  }
  if (!draft) {
    throw new Error(`${fileName} 缺少 encounter_draft 结果行`);
  }
  return draft;
}

/**
 * IF-3 确认接口：`POST /api/v0/confirm`。
 * 用户对 pipeline 草稿做确认/修正后才写入 Package（事实层只能由此写入）。
 *
 * mock 模式不持久化：按契约合成确认响应（新人为新生成的 person_id，
 * 老朋友则沿用 identity.match_person_id），`avatar_status` 恒为 "placeholder"。
 * @contract IF-3
 * @param {object} draft IF-2 产出的 encounter_draft（可被用户编辑过）
 * @param {object} identity
 * @param {string|null} identity.name 用户确认的姓名
 * @param {string|null} identity.match_person_id null=新建 Person，否则并入已有
 * @param {string} [privacy="self-only"] 权限圈层（默认 L1）
 * @returns {Promise<{person_id: string, encounter_id: string, package_ref: string, avatar_status: string}>}
 */
export async function confirm(draft, identity, privacy = "self-only") {
  if (!draft || typeof draft !== "object") {
    throw new Error("IF-3 confirm: encounter_draft 必填");
  }
  if (!identity || typeof identity !== "object") {
    throw new Error("IF-3 confirm: identity 必填");
  }
  if (isLiveMode()) {
    return postJson("/confirm", {
      encounter_draft: draft,
      identity: { name: identity.name ?? null, match_person_id: identity.match_person_id ?? null },
      privacy,
    });
  }
  const personId = identity.match_person_id ?? `person_${Date.now().toString(36)}`;
  const encounterId = draft.encounters?.[0]?.encounter_id ?? "enc_01";
  return {
    person_id: personId,
    encounter_id: encounterId,
    package_ref: `people/${personId}/profile.json`,
    avatar_status: "placeholder",
  };
}

/**
 * IF-5 资料包列表：`GET /api/v0/packages`。
 * @contract IF-5
 * @returns {Promise<object[]>} echo-package.v0 资料包数组
 */
export async function getPackages() {
  if (isLiveMode()) {
    return normalizePackageList(await fetchJson(`${LIVE_BASE_URL}/packages`));
  }
  return normalizePackageList(await fetchJson(mockUrl("packages.demo.json")));
}

/**
 * IF-5 单个资料包：`GET /api/v0/packages/{person_id}`。
 * @contract IF-5
 * @param {string} personId
 * @returns {Promise<object>} echo-package.v0 资料包；不存在时抛错（对应 404）
 */
export async function getPackage(personId) {
  if (isLiveMode()) {
    return fetchJson(`${LIVE_BASE_URL}/packages/${encodeURIComponent(personId)}`);
  }
  const packages = await getPackages();
  const pkg = packages.find((item) => item.person_id === personId);
  if (!pkg) {
    throw new Error(`IF-5 getPackage: 资料包不存在（404）：${personId}`);
  }
  return pkg;
}

function mockFieldFromPackage(pkg) {
  const first = pkg.encounters?.[0] ?? {};
  const values = (pkg.encounters ?? [])
    .flatMap((encounter) => encounter.inferences ?? [])
    .map((inference) => String(inference.value ?? "").trim())
    .filter(Boolean);
  const name = pkg.identity?.name ?? pkg.person_id;
  const generatedFrom = (pkg.encounters ?? []).flatMap((encounter) => [
    encounter.facts?.transcript,
    ...(encounter.facts?.media ?? []),
    ...(encounter.facts?.photos ?? []),
  ]).filter(Boolean);
  return {
    schema: "echo-field.v1",
    status: "ready",
    person_id: pkg.person_id,
    generated: true,
    regenerable: true,
    generated_from: generatedFrom.length ? generatedFrom : [`people/${pkg.person_id}/relations.md`],
    model: "relationship-field-mock.v1",
    created_at: new Date().toISOString(),
    relation: {
      with: name,
      summary: values[0] ?? "一段仍在生长的关系",
      shared_threads: values.slice(0, 3),
      first_impressions: [],
    },
    scene: {
      title: `你与${name} · 回声场域`,
      summary: `这里呈现的不是 ${name} 的肖像，而是你们共同经历留下的空间感。`,
      metaphor: "一座把零散记忆编成路径的风丘",
      parameters: {
        sky: "#8fc9c3",
        horizon: "#d5e5d4",
        ground: "#8fa66d",
        accent: pkg.avatar?.palette?.jacket ?? "#d9a85f",
        fog: "#dce8dc",
        openness: 0.64,
        warmth: 0.68,
        motion: 0.45,
        weather: "微风穿过草坡",
      },
      spawn: { x: 0, z: 6.2, yaw: Math.PI },
      companion: { person_id: pkg.person_id, x: 0, z: -1.1, yaw: 0 },
      entities: [
        { id: "threshold", type: "threshold", label: "关系入口", detail: "一座把零散记忆编成路径的风丘", position: { x: 0, z: 3.8 }, interaction: { label: "听听这个场域为何出现", event_type: "field-entered" } },
        { id: "first-encounter", type: "memory", label: "第一次相遇", detail: first.place ?? first.time ?? "第一次留下记录的地方", position: { x: -2.5, z: 0.4 }, interaction: { label: "调取这段共同记忆", event_type: "memory-recalled" } },
        { id: "shared-thread", type: "thread", label: "共同课题", detail: values[1] ?? values[0] ?? "仍在形成的共同课题", position: { x: 2.4, z: -1.6 }, interaction: { label: "继续这条共同线索", event_type: "thread-opened" } },
        { id: "echo-well", type: "echo", label: "回声井", detail: values[0] ?? "一段仍在生长的关系", position: { x: -1.1, z: -3.6 }, interaction: { label: "留下此刻的回声", event_type: "echo-left" } },
      ],
    },
  };
}

/** FR-2.11：读取/生成个人关系场域。 */
export async function getField(personId) {
  if (isLiveMode()) {
    return fetchJson(`${LIVE_BASE_URL}/fields/${encodeURIComponent(personId)}`);
  }
  return mockFieldFromPackage(await getPackage(personId));
}

/** FR-2.11：重算可删除的场域推断，不修改事实层。 */
export async function regenerateField(personId) {
  if (isLiveMode()) {
    return postJson(`/fields/${encodeURIComponent(personId)}/regenerate`, {});
  }
  return getField(personId);
}

const MOCK_WORLD_EVENTS_KEY = "echoworld.world-events.v1";

function readMockWorldEvents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MOCK_WORLD_EVENTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** FR-2.9：读取近期世界事件。 */
export async function getWorldEvents(limit = 20) {
  if (isLiveMode()) {
    return fetchJson(`${LIVE_BASE_URL}/world/events?limit=${Math.max(1, Math.min(100, limit))}`);
  }
  return { events: readMockWorldEvents().slice(0, limit) };
}

/** FR-2.9：进入世界时的晨报摘要。 */
export async function getWorldBrief() {
  if (isLiveMode()) return fetchJson(`${LIVE_BASE_URL}/world/brief`);
  const events = readMockWorldEvents().slice(0, 6);
  return {
    schema: "echo-world-brief.v1",
    date: new Date().toISOString().slice(0, 10),
    headline: events[0]?.summary ?? "集市今天安静开门",
    summary: events.length
      ? events.slice(0, 3).map((event) => event.summary).join("；")
      : "还没有新事件。走近一个摊位，或邀请一位朋友到圆桌坐下。",
    event_count: events.length,
    events,
  };
}

/** FR-2.8/2.9：把空间互动追加为世界事件。 */
export async function recordWorldInteraction(payload) {
  if (isLiveMode()) return postJson("/world/interactions", payload);
  const events = readMockWorldEvents();
  const event = {
    schema: "echo-world-event.v1",
    event_id: `mock_${Date.now().toString(36)}`,
    type: payload.type,
    summary: payload.summary,
    person_ids: payload.person_ids ?? [],
    source: payload.source ?? "scene-interaction",
    created_at: new Date().toISOString(),
    payload: payload.payload ?? {},
  };
  events.unshift(event);
  localStorage.setItem(MOCK_WORLD_EVENTS_KEY, JSON.stringify(events.slice(0, 100)));
  return event;
}

/**
 * IF-6 玩家与 Agent 单聊：`POST /api/v0/agents/{person_id}/chat`。
 *
 * mock 模式：基于资料包内容合成"package-aware"的演示回复（generated_by="mock"），
 * 命中授权标签时围绕它回应并给出真实推断来源指针；首轮给结构化开场建议。
 * @contract IF-6
 * @param {string} personId
 * @param {string} message 玩家消息（1..500 字）
 * @param {Array<{role: "user"|"assistant", content: string}>} [history] 客户端回显的最近 ≤10 轮
 * @returns {Promise<{person_id: string, reply: string, cited_facts: string[], suggestions: string[], generated_by: string}>}
 */
export async function chatWithAgent(personId, message, history = []) {
  if (isLiveMode()) {
    return postJson(`/agents/${encodeURIComponent(personId)}/chat`, { message, history });
  }
  await delay(randomStepDelay());
  const pkg = await getPackage(personId);
  return mockAgentChatReply(pkg, message, history);
}

function mockAgentChatReply(pkg, message, history) {
  const name = pkg.identity?.name ?? "TA";
  const encounters = pkg.encounters ?? [];
  const inferences = encounters.flatMap((encounter) =>
    (encounter.inferences ?? [])
      .filter((inf) => inf?.value)
      .map((inf) => ({ ...inf, encounter_id: encounter.encounter_id })),
  );
  const flatTags = inferences
    .flatMap((inf) => String(inf.value).split(/[、，,\s/；;]+/))
    .map((tag) => tag.trim())
    .filter((tag) => tag && tag.length <= 12);
  const places = encounters.map((encounter) => encounter.place).filter(Boolean);
  const text = String(message ?? "");
  const hit = flatTags.find((tag) => text.includes(tag));

  let reply;
  let citedFacts = [];
  if (hit) {
    const source = inferences.find((inf) => String(inf.value).includes(hit));
    citedFacts = [].concat(source?.source_facts ?? source?.source ?? []).filter(Boolean).slice(0, 1);
    reply = `${hit}这个我记得一些——档案里留着的片段是：「${String(source?.value ?? hit).slice(0, 60)}」。更多的你得问 ${name} 本人，我只是守着授权资料的分身（演示模式）。`;
  } else if (flatTags.length) {
    reply = `我是 ${name} 的数字分身（演示模式，未接真实模型）。我能聊的只有授权资料里这些线索：${flatTags.slice(0, 3).join("、")}。想从哪一条开始？`;
  } else {
    reply = `我是 ${name} 的数字分身（演示模式）。资料还很少，你可以多告诉我一些，等正式接入后我会记住的。`;
  }

  const suggestions = [];
  for (const tag of flatTags.slice(0, 2)) suggestions.push(`最近还在忙${tag}的事吗？`);
  if (places[0]) suggestions.push(`还记得${String(places[0]).split("·").pop().trim()}那次吗？`);
  if (!suggestions.length) suggestions.push("我们是怎么认识的来着？", "跟我讲讲你最近在忙什么。");

  return {
    person_id: pkg.person_id,
    reply,
    cited_facts: citedFacts,
    suggestions: suggestions.slice(0, 3),
    generated_by: "mock",
  };
}

/**
 * IF-6 手动沉淀：`POST /api/v0/agents/{person_id}/chat/save-note`。
 * mock 模式不持久化，按契约合成推断指针返回（演示 toast 流程）。
 * @contract IF-6
 * @param {string} personId
 * @param {string} text 用户选中的对话要点
 * @returns {Promise<{inference_ref: string, note: object}>}
 */
export async function saveChatNote(personId, text) {
  if (isLiveMode()) {
    return postJson(`/agents/${encodeURIComponent(personId)}/chat/save-note`, {
      text,
      source: "player-chat",
    });
  }
  await delay(240);
  const note = {
    id: `mock${Date.now().toString(36)}`,
    type: "player-note",
    author: "来自玩家转述",
    value: String(text ?? "").trim(),
    confidence: 1.0,
    source: { type: "player-chat" },
    created_at: new Date().toISOString(),
  };
  return { inference_ref: `inferences/${personId}/player-note-${note.id}.json`, note };
}

/**
 * IF-6 用户发起的圆桌会议：`POST /api/v0/agents/meeting`。
 *
 * mock 模式：不真正开会，返回契约形状的演示响应（静态 demo 仍走本地轮播台词）。
 * @contract IF-6
 * @param {string[]} participantIds 2..5 名在场人物
 * @param {string|null} [topic] 可选议题（≤80 字）
 * @returns {Promise<{meeting_id: string, participants: string[], topic: string|null,
 *   duration_ticks: number, state: string}>}
 */
export async function startMeeting(participantIds, topic = null) {
  if (isLiveMode()) {
    return postJsonWithDetail("/agents/meeting", {
      participant_ids: participantIds,
      topic: topic ?? null,
    });
  }
  await delay(randomStepDelay());
  return {
    meeting_id: `mock_meeting_${Date.now().toString(36)}`,
    participants: participantIds,
    topic: topic ?? null,
    duration_ticks: 0,
    state: "running",
  };
}

/**
 * IF-6 玩家对进行中的会议发言：`POST /api/v0/agents/meeting/current/message`。
 *
 * mock 模式：直接受理（无真实会议可发言，仅保持契约形状）。
 * @contract IF-6
 * @param {string} text 玩家发言（1..200 字）
 * @returns {Promise<{meeting_id: string, accepted: boolean}>}
 */
export async function postMeetingMessage(text) {
  if (isLiveMode()) {
    return postJsonWithDetail("/agents/meeting/current/message", { text });
  }
  await delay(120);
  return { meeting_id: "mock_meeting", accepted: true };
}

/** 收集资料包内可检索文本（mock keyword 检索用）。 */
function collectPackageText(pkg) {
  const parts = [pkg.identity?.name, pkg.identity?.role, pkg.identity?.city];
  for (const relation of pkg.relations ?? []) parts.push(relation.note);
  for (const encounter of pkg.encounters ?? []) {
    parts.push(encounter.place);
    for (const inference of encounter.inferences ?? []) parts.push(inference.value);
  }
  return parts.filter(Boolean).join("\n");
}

/**
 * IF-5 检索：`POST /api/v0/search`（face / name / keyword 三种方式互斥）。
 *
 * mock 模式语义（无真实比对算法，仅演示交互）：
 * - `by: "name"`：按姓名子串过滤 search.demo.json 的 results。
 * - `by: "keyword"`：query 按空白分词，要求每个词都命中该人资料包文本
 *   （姓名/角色/城市/地点/关系备注/推断值），再按 score 排序返回。
 * - `by: "face"`：返回按 score 排序的全量候选（mock 不做真人脸比对）。
 * @contract IF-5
 * @param {object} request
 * @param {"face"|"name"|"keyword"} request.by 检索方式
 * @param {string} [request.query] name / keyword 方式的查询串
 * @param {string} [request.photo] face 方式的 base64 照片
 * @returns {Promise<{results: Array<{person_id: string, name: string, score: number, last_encounter: {time: string, place: string}}>}>}
 */
export async function search(request) {
  if (!request || typeof request !== "object") {
    throw new Error("IF-5 search: request 必填");
  }
  if (isLiveMode()) {
    return postJson("/search", request);
  }
  const { results } = await fetchJson(mockUrl("search.demo.json"));
  if (request.by === "name") {
    const query = String(request.query ?? "").trim();
    if (!query) return { results: [] };
    return { results: results.filter((item) => item.name.includes(query)) };
  }
  if (request.by === "keyword") {
    const tokens = String(request.query ?? "").trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return { results: [] };
    const packages = await fetchJson(mockUrl("packages.demo.json"));
    const matched = new Set(
      packages
        .filter((pkg) => {
          const haystack = collectPackageText(pkg);
          return tokens.every((token) => haystack.includes(token));
        })
        .map((pkg) => pkg.person_id),
    );
    return { results: results.filter((item) => matched.has(item.person_id)) };
  }
  if (request.by === "face") {
    return { results };
  }
  throw new Error(`IF-5 search: 不支持的检索方式 by="${request.by}"（face/name/keyword 互斥）`);
}

/**
 * FR-2.12 合照入场 · 第一段「认脸」：`POST /api/v1/group-onboarding/detect`（multipart）。
 * 只做人脸检测，不创建 Package；返回 group_id + 人脸候选（bbox 归一化 xywh + face_ref）。
 *
 * mock 模式：读取 `group-onboarding.detect.demo.json`（5 张演示人脸，face_ref 指向
 * 现有 portraits 资产），完全离线可用。
 * @param {File|Blob} photo 合照（JPEG/PNG/WebP，≤25MB）
 * @param {object} [options]
 * @param {number} [options.expectedCount=0] 预期人数（0 = 不限）
 * @returns {Promise<{group_id: string, status: string, detector: string,
 *   faces: Array<{face_id: string, bbox: object, face_ref: string}>, issues: string[]}>}
 */
export async function groupOnboardingDetect(photo, { expectedCount = 0 } = {}) {
  if (!photo) {
    throw new Error("合照入场 detect: photo 必填");
  }
  if (isLiveMode()) {
    const form = new FormData();
    form.append("photo", photo);
    form.append("expected_count", String(expectedCount));
    const response = await fetch(`${LIVE_V1_BASE_URL}/group-onboarding/detect`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      throw new Error(`合照认脸失败: HTTP ${response.status}`);
    }
    return response.json();
  }
  return fetchJson(mockUrl("group-onboarding.detect.demo.json"));
}

/**
 * FR-2.12 合照入场 · 第二段「确认入场」：`POST /api/v1/group-onboarding/confirm`。
 * 用户逐脸确认姓名后提交；批量建档 + 注册展位大厅（下一轮快照即可见展位）。
 *
 * mock 模式：以 `group-onboarding.register.demo.json` 为模板，把用户确认的姓名
 * 逐个合并进 participants（person_id 为演示占位，不持久化）。
 * @param {string} groupId 第一段返回的 group_id
 * @param {Array<{face_id?: string, face_ref?: string, name: string}>} assignments
 * @returns {Promise<{status: string, participants: Array<{person_id: string, name: string,
 *   confirmed: boolean, face_ref: string|null, booth_id: string}>}>}
 */
export async function groupOnboardingConfirm(groupId, assignments) {
  if (!groupId) {
    throw new Error("合照入场 confirm: group_id 必填");
  }
  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new Error("合照入场 confirm: assignments 至少包含一位人物");
  }
  if (isLiveMode()) {
    return postV1Json("/group-onboarding/confirm", { group_id: groupId, assignments });
  }
  const template = await fetchJson(mockUrl("group-onboarding.register.demo.json"));
  const participants = assignments.map((assignment, index) => {
    const slot = template.participants[index] ?? template.participants[0];
    return {
      ...slot,
      person_id: `group-demo-${assignment.face_id ?? `person-${index + 1}`}`,
      name: assignment.name,
      face_ref: assignment.face_ref ?? slot.face_ref,
      booth_id: `booth_group-demo-${assignment.face_id ?? `person-${index + 1}`}`,
    };
  });
  return { ...template, group_id: groupId, participants };
}

/**
 * IF-4 世界快照：`GET /api/v0/world/snapshot`（echo-snapshot.v1，前端唯一渲染数据源）。
 *
 * mock 模式：fetch `snapshot.demo.json`，失败（文件缺失/格式错误/schema 不符）
 * 时回退到内置 {@link SNAPSHOT_FALLBACK} 常量并输出警告。
 * live 模式：失败直接抛错，不用 fallback 掩盖后端故障。
 * @contract IF-4
 * @returns {Promise<object>} echo-snapshot.v1 快照
 */
export async function fetchSnapshot() {
  if (isLiveMode()) {
    return validateSnapshot(await fetchJson(`${LIVE_BASE_URL}/world/snapshot`));
  }
  try {
    return validateSnapshot(await fetchJson(mockUrl("snapshot.demo.json")));
  } catch (error) {
    console.warn("[MockApi] snapshot.demo.json 加载失败，使用内置 fallback 快照：", error);
    return SNAPSHOT_FALLBACK;
  }
}
