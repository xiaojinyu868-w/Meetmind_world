import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SemanticObjects } from "./SceneObjects.js";
import "./style.css";

document.querySelector("#app").innerHTML = `
  <header><a class="brand" href="/">MeetMind<span> world</span></a><span class="tag">FRAMEWORK LAB · 01</span></header>
  <main>
    <section class="intro"><div><p class="eyebrow">共同经历 / 持续状态 / 现实反馈</p><h1>经历改变世界。<br>每次变化，都有来处。</h1></div>
      <p class="intro-note">这是一个可操作的合成实验。<br>试着纠正作品、选择下一步，再记录现实结果。<br><strong>人物以身份标记展示，美术与产品场景尚未定稿。</strong></p></section>
    <div class="session-bar"><span id="session-status">连接实验会话…</span><button type="button" id="new-session">新建独立实验</button></div>
    <section id="pair-panel" class="pair-panel" hidden>
      <p id="pair-status">双人实验：每个浏览器只控制自己的合成角色。</p>
      <button id="pair-invite" type="button" hidden>创建另一位参与者的加入链接</button>
      <button id="pair-revoke" type="button" hidden>撤销另一位参与者的访问</button>
      <button id="pair-join" type="button" hidden>以阿博加入这个共同世界</button>
      <label class="field" id="pair-link-wrap" hidden>加入链接（30分钟内一次有效）<input id="pair-link" readonly aria-label="另一位参与者的加入链接"></label>
      <small>链接持有者可占用对应实验角色；这不是照片本人核验。链接由你自行交给对方，系统不会发送。</small>
    </section>
    <section class="workbench">
      <div class="world-pane"><div class="view-toolbar"><span><i></i> <span id="mode-label">语义空间</span></span><div class="toolbar-controls"><label>呈现 <select id="mode" aria-label="呈现模式"><option value="3d">3D 空间</option><option value="2d">2D 基线</option></select></label><label>查看身份 <select id="viewer" aria-label="查看身份"><option value="alice">小满</option><option value="bo">阿博</option><option value="observer">观察者</option></select></label></div></div>
        <div class="viewport"><canvas aria-label="共同经历三维空间"></canvas><div class="labels"></div><div class="canvas-help">拖动旋转 · 滚轮缩放 · 点击物件查看</div></div>
        <div class="baseline" hidden><div class="baseline-head"><span>经历与关系</span><small>同一份 world-state.v1</small></div><div class="baseline-list"></div></div>
        <div class="replay"><div class="replay-title"><span>回到一个时刻</span><span id="sequence"></span></div><div class="stages"></div></div>
      </div>
      <aside><div class="aside-heading"><span>当前世界</span><small id="count"></small></div><div id="entities" role="list"></div><section id="detail" aria-live="polite"></section></aside>
    </section>
    <details class="import-panel"><summary>导入一条本人签到 · JSON</summary>
      <p>先填写或载入示例，再确认内容。已成功提交的记录保存在当前实验会话；是否能跨服务重启恢复，见上方保存状态。查看身份是实验切换，不是登录认证。</p>
      <button type="button" id="load-checkin">载入合成签到示例</button>
      <form id="checkin-form">
        <label class="field">签到记录 JSON<textarea id="checkin-json" aria-label="签到记录 JSON" rows="6" required placeholder='{"event_id":"my-visit-1","provider":"manual","location":"地点","occurred_at":"2026-09-12T10:00:00+08:00"}'></textarea></label>
        <label class="field">可见范围<select id="checkin-visibility" aria-label="签到可见范围"><option value="private">仅本人</option><option value="shared">当前会话成员</option></select></label>
        <label class="checkin-consent"><input type="checkbox" id="checkin-confirm" required>我确认这条记录是本人的陈述（示例仅供合成测试）</label>
        <button class="primary" type="submit" id="import-checkin">确认并导入签到</button>
      </form>
    </details>
    <div id="notice" role="status"></div>
    <footer><span>同一份事件 → 2D 信息与 3D 对象</span><span>本机合成数据 · 不发送消息 · 不代表真实报名或完成</span></footer>
    <details class="raw"><summary>查看本次状态 JSON 与渲染诊断</summary><pre id="diagnostic"></pre><pre id="json"></pre></details>
  </main>`;

const names = { alice: "小满", bo: "阿博", observer: "观察者" };
const kindNames = { person: "身份", artifact: "共同作品", "memory-object": "共同经历", action: "下一次行动" };
const eventNames = {
  "identity.claimed": "本人认领", "identity.candidate.observed": "发现候选",
  "experience.confirmed": "记录经历", "experience.corrected": "本人更正经历",
  "visual.basis.reviewed": "本人重核外观依据", "action.basis.reviewed": "本人重核行动依据", "artifact.observed": "创建作品",
  "inference.superseded": "纠正作品标题", "action.proposed": "提出下一步",
  "action.accepted": "接受行动", "action.declined": "拒绝行动",
  "action.outcome.recorded": "自报现实结果", "action.outcome.revoked": "撤回自报",
  "visual.recipe.patched": "局部修改外观", "visual.recipe.applied": "应用生成外观", "visual.recipe.removed": "恢复默认外观",
};
const stages = [[5, "共同经历"], [6, "作品初稿"], [7, "完成纠错"], [8, "提出行动"], [10, "不同选择"], [11, "自报完成"], [12, "撤回结果"], [13, "撤回经历"]];
const stageRoot = document.querySelector(".stages");
for (const [sequence, title] of stages) {
  const button = document.createElement("button");
  button.textContent = title;
  button.dataset.through = sequence;
  stageRoot.append(button);
}
const viewport = document.querySelector(".viewport");
const canvas = document.querySelector("canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xebeae2);
scene.fog = new THREE.Fog(0xebeae2, 22, 42);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(9, 10, 12);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.1, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 9;
controls.maxDistance = 22;
controls.minPolarAngle = 0.18;
controls.maxPolarAngle = Math.PI / 2.3;
scene.add(new THREE.HemisphereLight(0xfff7e7, 0xb0b9ae, 2.8));
const sun = new THREE.DirectionalLight(0xfff1cf, 3.3);
sun.position.set(-5, 12, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
sun.shadow.normalBias = 0.03;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xebeae2, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.31;
ground.receiveShadow = true;
scene.add(ground);
const table = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.25, 0.28, 96), new THREE.MeshStandardMaterial({ color: 0xe2ddce, roughness: 0.85 }));
table.position.y = -0.14;
table.receiveShadow = true;
table.castShadow = true;
scene.add(table);
for (const radius of [5.5, 5.7]) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.012, 128), new THREE.MeshBasicMaterial({ color: 0xc4bdab, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.006;
  scene.add(ring);
}
const objects = new SemanticObjects(scene);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const labels = new Map();
let sessionId, state, selectedId = "artifact-1", viewer = "alice", busy = false, noticeTimer;
let rendering = true;
let activeThrough = 8;
let presentationMode = "3d";
let modelEnabled = false;
let generatingId = null;
const proposals = new Map();
const recipeDrafts = new Map();
const actionDrafts = new Map();
const correctionDrafts = new Map();
let renderedFrames = 0;
const SESSION_KEY = "meetmind.lab.session.v1";
let pairMode = false, accessToken = null, pairAccessLost = false, polling = false;
const pendingInvite = new URLSearchParams(location.hash.slice(1)).get("join");
let browserSaveAvailable = true;
let persistentSession = false;
function rememberSession() {
  if (!sessionId) return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId, viewer, selectedId, mode: presentationMode, token: accessToken }));
  } catch { browserSaveAvailable = false; }
}
function savedSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return value && /^[a-f0-9]{32}$/.test(value.sessionId) ? value : null;
  } catch { browserSaveAvailable = false; return null; }
}
function showSessionStatus() {
  document.querySelector("#session-status").textContent = !sessionId ? "未连接到实验会话" :
    !browserSaveAvailable ? "浏览器无法记住会话；刷新后需要重新连接" :
    persistentSession ? "历史已保存 · 刷新和服务重启后可继续" : "刷新可继续 · 当前服务重启后会丢失";
}
function configurePair() {
  document.querySelector("#pair-panel").hidden = !pairMode;
  document.querySelector("#viewer").disabled = pairMode;
  document.querySelector(".replay").hidden = pairMode;
  document.querySelector("#pair-invite").hidden = !pairMode || viewer !== "alice" || !sessionId;
  document.querySelector("#pair-revoke").hidden = !pairMode || viewer !== "alice" || !sessionId;
  document.querySelector("#pair-status").textContent = pairMode ? "我的实验角色：" + (names[viewer] ?? viewer) +
    " · 独立凭证控制 · 自动同步共同变化" : "";
}
async function useSession(session, saved = null) {
  const nextViewer = pairMode ? session.viewer : saved && session.members.includes(saved.viewer) ? saved.viewer : "alice";
  const nextToken = session.token ?? (pairMode ? saved?.token : null);
  if (pairMode && session.token) {
    // Keep a consumed invite's issued capability even if the following state read fails.
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId: session.session_id, viewer: nextViewer,
        selectedId: saved?.selectedId ?? "artifact-1", mode: saved?.mode ?? "3d", token: nextToken }));
    } catch { browserSaveAvailable = false; }
  }
  const next = await request("/lab-api/state?session_id=" + session.session_id + "&viewer=" + nextViewer, undefined, nextToken);
  sessionId = session.session_id;
  accessToken = nextToken;
  pairAccessLost = false;
  persistentSession = session.persistent === true;
  modelEnabled = session.model_generation === true;
  viewer = nextViewer;
  selectedId = saved?.selectedId ?? "artifact-1";
  activeThrough = saved || pairMode ? null : 8;
  document.querySelector("#viewer").value = viewer;
  setMode(saved?.mode ?? "3d");
  apply(next);
  rememberSession();
  showSessionStatus();
  configurePair();
}
async function connectSession(fresh = false) {
  const saved = fresh ? null : savedSession();
  try { pairMode = (await request("/lab-api/mode")).pair_mode === true; } catch { pairMode = false; }
  const session = await request("/lab-api/sessions", saved ? { session_id: saved.sessionId } : {},
    saved?.token ?? null);
  if (saved && session.session_id !== saved.sessionId) throw new Error("当前服务不支持恢复原会话；请使用新版持久化实验入口。");
  pairMode = session.pair_mode === true;
  await useSession(session, saved);
}

function notice(text, error = false) {
  const element = document.querySelector("#notice");
  element.textContent = text;
  element.className = error ? "error" : "";
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { element.textContent = ""; }, 6000);
}
async function request(path, body, token = accessToken) {
  const headers = { ...(body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: "Bearer " + token } : {}) };
  const response = await fetch(path, { headers, ...(body ? { method: "POST", body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  if (!response.ok) {
    const error = new Error(value.error ?? "实验服务不可用");
    error.status = response.status;
    throw error;
  }
  return value;
}

async function command(command, fields = {}) {
  if (busy || !state) return;
  busy = true;
  renderDetail();
  try {
    const next = await request("/lab-api/commands", {
      session_id: sessionId, viewer, expected_sequence: state.basis.through_sequence,
      subject_id: selectedId, command, ...fields,
    });
    if (command === "reset") {
      proposals.clear();
      recipeDrafts.clear();
      actionDrafts.clear();
      correctionDrafts.clear();
    } else if (["visual.recipe.applied", "visual.recipe.patched", "visual.recipe.removed", "visual.basis.reviewed", "inference.superseded", "experience.corrected", "experience.revoked"].includes(command)) {
      proposals.delete(viewer + ":" + selectedId);
    }
    if (command === "experience.corrected") correctionDrafts.delete(viewer + ":" + selectedId);
    if (command === "action.proposed") {
      selectedId = "action-" + viewer + "-" + fields.request_id;
    }
    activeThrough = command === "reset" ? fields.through : null;
    apply(next);
    notice(command === "reset" ? "已回放到所选时刻；本会话的后续实验操作已重置。" : command === "checkin.import" ? "签到已确认并导入。相同记录重复提交不会重复造物。" : "事件已记录，2D 与 3D 已同步。");
  } catch (error) {
    if (/状态已更新|对象已变化/.test(error.message)) {
      try {
        const latest = await request("/lab-api/state?session_id=" + sessionId + "&viewer=" + viewer);
        apply(latest);
        notice(error.message + "；已加载最新记录，更正草稿保留，请重新核对后提交。", true);
      } catch { notice(error.message, true); }
    } else notice(error.message, true);
  } finally {
    busy = false;
    renderDetail();
  }
}
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function select(id) {
  selectedId = id;
  objects.select(id);
  renderList();
  renderDetail();
  renderBaseline();
  rememberSession();
}
function renderBaseline() {
  const root = document.querySelector(".baseline-list");
  if (!root || !state) return;
  root.replaceChildren();
  const entities = state.entities.filter((item) => item.kind !== "world");
  const byId = new Map(entities.map((item) => [item.id, item]));
  const titleOf = (id) => byId.get(id)?.title ?? byId.get(id)?.display_name ?? id;
  if (!entities.length) {
    root.append(node("p", "muted", "这个时刻还没有对当前查看者可见的对象。"));
    return;
  }
  for (const item of entities) {
    const card = node("button", "baseline-card" + (item.id === selectedId ? " selected" : ""));
    card.dataset.entityId = item.id;
    card.setAttribute("aria-pressed", String(item.id === selectedId));
    card.append(node("span", "baseline-kind", kindNames[item.kind] ?? item.kind),
      node("strong", "", item.title ?? item.display_name ?? "候选身份"));
    if (item.source_basis_status && item.source_basis_status !== "active") {
    root.append(node("p", "warning", item.source_basis_status === "withdrawn" ? "这件内容的部分来源已撤回。" : "这件内容引用的经历已更正，请核对当前说法。"));
    appendCurrentBasis(root, item.source_basis_versions);
  }
  if (item.kind === "person") {
      card.append(node("small", "", item.claim === "confirmed" ? "本人已认领" : "候选 · 尚未认领"));
    }
    if (item.source) card.append(node("small", "baseline-source",
      item.source.provider + " · " + item.source.occurred_at + " · 本人陈述"));
    for (const edge of state.relationships.filter((edge) => edge.from === item.id || edge.to === item.id)) {
      card.append(node("small", "baseline-relation",
        titleOf(edge.from) + " → " + titleOf(edge.to) + " · " +
        (names[edge.reported_by] ?? edge.reported_by) + "记录的参与"));
    }
    if (item.plan) card.append(node("small", "", new Date(item.plan.scheduled_at).toLocaleString("zh-CN") +
      " · " + item.plan.location + " · " + item.plan.success_criteria));
    if (item.appearance) {
      card.append(node("small", "", "生成外观：" + item.appearance.title + " · " + item.appearance.parts.length + " 个部件"));
      card.append(node("small", "", item.appearance.rationale));
    }
    for (const entry of item.provenance ?? []) {
      card.append(node("small", "baseline-event",
        "#" + entry.sequence + " " + (eventNames[entry.type] ?? entry.type) +
        " · " + (names[entry.actor_id] ?? entry.actor_id)));
    }
    if (item.kind === "action") {
      for (const id of item.participant_ids) {
        const decision = item.decisions[id]?.status;
        const report = item.outcomes[id];
        card.append(node("small", "baseline-decision", (names[id] ?? id) + "：" +
          (decision === "accepted" ? "愿意参加" : decision === "declined" ? "这次不参加" : "尚未决定") +
          " · " + (report ? "本人自报：" + (report.result === "completed" ? "已完成" : "未完成") : "没有当前现实结果报告")));
        if (report) card.append(node("small", "", report.note));
      }
      if (item.basis_status === "changed") card.append(node("small", "warning", "原经历已更正 · 各自重新核对"));
      if (item.basis_status === "withdrawn") card.append(node("small", "warning", "原经历已撤回"));
    }
    card.addEventListener("click", () => select(item.id));
    root.append(card);
  }
}
function setMode(mode) {
  presentationMode = mode === "2d" ? "2d" : "3d";
  const is3d = presentationMode === "3d";
  document.querySelector(".viewport").hidden = !is3d;
  document.querySelector(".baseline").hidden = is3d;
  document.querySelector("#mode").value = presentationMode;
  rememberSession();
  document.querySelector("#mode-label").textContent = is3d ? "语义空间" : "2D 信息基线";
  renderBaseline();
  updateDiagnostic();
}
function renderList() {
  const root = document.querySelector("#entities");
  root.replaceChildren();
  const entities = state.entities.filter((item) => item.kind !== "world");
  document.querySelector("#count").textContent = entities.length + " 个对象";
  for (const item of entities) {
    const button = node("button", "entity" + (item.id === selectedId ? " selected" : ""));
    button.dataset.entityId = item.id;
    button.append(node("span", "kind", kindNames[item.kind]), node("span", "entity-title", item.title ?? item.display_name ?? "未确认的人物"));
    button.addEventListener("click", () => select(item.id));
    root.append(button);
  }
}
function button(root, text, action, className = "") {
  const element = node("button", className, text);
  element.disabled = busy;
  element.addEventListener("click", action);
  root.append(element);
  return element;
}
function renderActionComposer(root, item) {
  if (!item.action_candidate_ids?.includes(viewer)) return;
  const section = node("details", "action-composer");
  section.append(node("summary", "", "从这段经历，约一件下一步的事"));
  section.append(node("p", "muted", "写清什么时候、在哪里、一起完成什么。每个人仍需自己接受或拒绝。"));
  const key = viewer + ":" + item.id;
  const draft = actionDrafts.get(key) ?? { requestId: crypto.randomUUID(), title: "", time: "",
    duration: "60", location: "", criteria: "", participants: [viewer] };
  actionDrafts.set(key, draft);
  const form = node("form");
  const edit = () => { draft.requestId = crypto.randomUUID(); };
  for (const [name, label, type, limit] of [
    ["title", "下一步具体做什么", "text", 160],
    ["time", "计划时间（本机时区）", "datetime-local"],
    ["duration", "预计时长（分钟）", "number"],
    ["location", "行动地点", "text", 160],
    ["criteria", "怎样算完成", "textarea", 500],
  ]) {
    const wrap = node("label", "field", label);
    const input = node(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") input.type = type;
    input.setAttribute("aria-label", label);
    input.required = true;
    input.value = draft[name];
    if (limit) input.maxLength = limit;
    if (type === "number") { input.min = "5"; input.max = "1440"; input.step = "1"; }
    input.addEventListener("input", () => { draft[name] = input.value; edit(); });
    wrap.append(input);
    form.append(wrap);
  }
  const participants = node("fieldset", "action-participants");
  participants.append(node("legend", "", "邀请谁一起（仅当前实验身份）"));
  for (const id of item.action_candidate_ids) {
    const label = node("label", "checkin-consent");
    const input = node("input");
    input.type = "checkbox";
    input.checked = draft.participants.includes(id);
    input.disabled = id === viewer;
    input.setAttribute("aria-label", "行动参与者：" + (names[id] ?? id));
    input.addEventListener("change", () => {
      draft.participants = input.checked ? [...draft.participants, id] : draft.participants.filter(value => value !== id);
      edit();
    });
    label.append(input, document.createTextNode((names[id] ?? id) + (id === viewer ? "（我）" : "")));
    participants.append(label);
  }
  form.append(participants);
  const submit = node("button", "primary", "提出这次行动");
  submit.type = "submit";
  submit.disabled = busy;
  form.append(submit);
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const date = new Date(draft.time);
    if (!Number.isFinite(date.getTime())) return notice("请选择有效时间。", true);
    command("action.proposed", { request_id: draft.requestId, title: draft.title,
      participant_ids: draft.participants,
      plan: { scheduled_at: date.toISOString(), duration_minutes: Number(draft.duration),
        location: draft.location, success_criteria: draft.criteria } });
  });
  section.append(form);
  root.append(section);
}
function appendCurrentBasis(root, versions = []) {
  const list = node("ul", "current-basis");
  for (const ref of versions) {
    const source = state.entities.find(item => (item.correction_event || item.source_event) === ref);
    if (source) list.append(node("li", "", source.title || source.display_name || "当前来源"));
  }
  if (list.children.length) root.append(list);
}
function renderDetail() {
  const root = document.querySelector("#detail");
  root.replaceChildren();
  const item = state?.entities.find((entity) => entity.id === selectedId);
  if (!item) {
    root.append(node("p", "muted", "点击空间里的物件，查看它的经历与可选操作。"));
    return;
  }
  root.append(node("p", "eyebrow", kindNames[item.kind]), node("h2", "", item.title ?? item.display_name ?? "未确认的人物"));
  if (item.kind === "person") {
    root.append(node("p", "muted", item.claim === "confirmed" ? "这份身份已由本人认领。" : "尚未认领，仅对观察者可见，不代表已确认的真人关系。"));
  }
  if (item.kind === "artifact") {
    root.append(node("p", "muted", "纠正标题时，这件纸桥的对象身份、位置和其他对象保持不变。"));
    if (item.created_by === viewer) {
      const label = node("label", "field", "作品标题");
      const input = node("input");
      input.value = item.title;
      input.maxLength = 100;
      input.setAttribute("aria-label", "作品标题");
      label.append(input);
      root.append(label);
      button(root, "保存纠正", () => command("inference.superseded", { title: input.value }), "primary");
    }
  }
  if (item.kind === "memory-object") {
    root.append(node("p", "muted", "参与关系来自" + (names[item.reported_by] ?? item.reported_by) + "的陈述，不等于所有人的共同确认。"));
    if (item.created_by === viewer) {
      const key = viewer + ":" + item.id;
      const target = item.correction_event || item.source_event;
      const draft = correctionDrafts.get(key) || { title: item.title, target };
      const label = node("label", "field", "更正我记录的经历");
      const input = node("textarea");
      input.value = draft.title; input.maxLength = 600;
      input.setAttribute("aria-label", "更正我记录的经历");
      input.addEventListener("input", () => correctionDrafts.set(key, { title: input.value, target: draft.target }));
      label.append(input); root.append(label);
      if (draft.target !== target) root.append(node("p", "warning", "经历已有更新。草稿已保留，请先查看当前内容再重新填写。"));
      const save = button(root, "保存经历更正", () => command("experience.corrected", { title: input.value, target_event_id: draft.target }), "primary");
      save.disabled = busy || draft.target !== target;
      if (correctionDrafts.has(key)) button(root, "放弃草稿并查看当前经历", () => { correctionDrafts.delete(key); renderDetail(); });
      root.append(node("p", "footnote", "只更正本人的文字陈述，保留记录者、参与关系和来源。关联外观及行动将提示重新核对。"));
    }
    if (item.created_by === viewer) button(root, "撤回这段经历", () => command("experience.revoked"), "quiet-danger");
  }
  if (item.kind === "action") {
    if (item.plan) {
      const plan = node("dl", "source-meta action-plan");
      for (const [label, value] of [["时间", new Date(item.plan.scheduled_at).toLocaleString("zh-CN")],
        ["时长", item.plan.duration_minutes + " 分钟"], ["地点", item.plan.location],
        ["想完成", item.plan.success_criteria]]) {
        plan.append(node("dt", "", label), node("dd", "", value));
      }
      root.append(plan);
      if (item.decisions[viewer]?.status === "accepted") {
        const link = node("a", "calendar-download", "下载我的日历文件");
        link.href = "/lab-api/calendar?" + new URLSearchParams({ session_id: sessionId, viewer, action_id: item.id });
        link.download = "meetmind-action.ics";
        if (pairMode) link.addEventListener("click", async event => {
          event.preventDefault();
          try {
            const response = await fetch(link.href, { headers: { Authorization: "Bearer " + accessToken } });
            if (!response.ok) throw new Error("当前角色不能下载这个计划。");
            const url = URL.createObjectURL(await response.blob());
            const download = document.createElement("a");
            download.href = url; download.download = "meetmind-action.ics"; download.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (error) { notice(error.message, true); }
        });
        root.append(link, node("p", "footnote", "下载后可自行导入日历。不会替其他人发邀请，下载也不代表已经参加。"));
      }
    }
    if (item.basis_status === "changed") {
      root.append(node("p", "warning", "行动依据中的经历已更正。原先选择和自报仍是历史，需要各自重新核对。"));
      appendCurrentBasis(root, item.basis_versions);
    }
    if (item.basis_status === "withdrawn") root.append(node("p", "warning", "原经历已撤回。这里保留行动历史，不再展示原依据。"));
    for (const person of item.participant_ids) {
      const decision = item.decisions[person]?.status;
      const result = item.outcomes[person];
      const row = node("div", "decision");
      row.append(node("strong", "", names[person] ?? person), node("span", "", decision === "accepted" ? "愿意参加" : decision === "declined" ? "这次不参加" : "尚未决定"));
      row.append(node("small", "", result ? (result.result === "completed" ? "本人自报：已完成" : "本人自报：未完成") : "没有当前现实结果报告"));
      if (result) row.append(node("p", "", result.note));
      if (item.basis_status === "changed") row.append(node("small", "", item.basis_reviews?.[person]?.status === "active" ? "本人已核对当前依据" : "尚未核对当前依据"));
      root.append(row);
    }
    if (item.participant_ids.includes(viewer)) {
      if (item.basis_status === "changed" && item.basis_reviews?.[viewer]?.status !== "active") {
        button(root, "我已重新核对这些依据", () => command("action.basis.reviewed", { basis_event_ids: item.basis_versions }), "primary");
        root.append(node("p", "footnote", "这只记录你已查看当前依据，不改变你或他人的原先选择，也不表示重新同意参加。"));
      }
      const decision = item.decisions[viewer];
      const actions = node("div", "actions");
      if (!decision) {
        button(actions, "我愿意参加", () => command("action.accepted"), "primary");
        button(actions, "这次不参加", () => command("action.declined"));
      } else if (decision.status === "accepted" && !item.outcomes[viewer]) {
        const label = node("label", "field", "现实里发生了什么");
        const input = node("textarea");
        input.maxLength = 500;
        input.placeholder = "只说明你自己的结果…";
        input.setAttribute("aria-label", "现实结果说明");
        label.append(input);
        root.append(label);
        button(actions, "自报已完成", () => command("action.outcome.recorded", { result: "completed", note: input.value }), "primary");
        button(actions, "自报未完成", () => command("action.outcome.recorded", { result: "not_completed", note: input.value }));
      } else if (item.outcomes[viewer]) {
        button(actions, "撤回我的结果报告", () => command("action.outcome.revoked"), "quiet-danger");
      }
      root.append(actions);
    }
    root.append(node("p", "footnote", "意愿、自报与外部验证分别表达。这个实验不会验证现实发生，也不会替任何人报名。"));
  }
  if (["artifact", "memory-object"].includes(item.kind)) {
    renderActionComposer(root, item);
    const generator = node("section", "recipe-panel");
    generator.append(node("h3", "", "把经历变成一件物品"));
    generator.append(node("p", "muted", "模型接收当前物件的标题和你的要求；局部修改时还会接收现有外观与部件含义。应用后保持身份、来源和现实结果。"));
    if (item.created_by === viewer && modelEnabled) {
      const label = node("label", "field", "生成要求");
      const input = node("textarea");
      input.setAttribute("aria-label", "生成要求");
      input.maxLength = 1200;
      const draftKey = viewer + ":" + item.id + (item.appearance ? ":patch" : ":create");
      input.value = recipeDrafts.get(draftKey) ?? (item.appearance ?
        "保留现有结构和颜色，在旁边加一盏小灯，象征想继续一起创作。灯是视觉寓意，不代表现实新增事件。" :
        "把“" + item.title + "”做成有清楚轮廓、支撑合理的纸艺纪念物，部件含义与这段经历有关。");
      input.addEventListener("input", () => recipeDrafts.set(draftKey, input.value));
      label.append(input);
      generator.append(label);
      const generate = button(generator, generatingId ? "模型正在生成…" : item.appearance ? "生成局部修改提案" : "生成视觉提案", async () => {
        if (generatingId) return;
        const subject = item.id;
        const requestedViewer = viewer;
        const instruction = input.value;
        generatingId = subject;
        renderDetail();
        try {
          const proposal = await request("/lab-api/proposals", {
            session_id: sessionId, viewer: requestedViewer, subject_id: subject, instruction,
            mode: item.appearance ? "patch" : "create",
          });
          for (const key of proposals.keys()) {
            if (key.startsWith(requestedViewer + ":")) proposals.delete(key);
          }
          proposals.set(requestedViewer + ":" + subject, proposal);
          notice("生成提案已返回。查看组成和含义后，可以应用到物件。");
        } catch (error) { notice(error.message, true); }
        finally {
          generatingId = null;
          renderDetail();
        }
      }, "primary");
      generate.disabled = Boolean(generatingId) || busy;
      generator.append(node("p", "footnote", "点击会调用当前配置的模型服务。未配置或调用失败会显示错误，不替换成预设模型结果。"));
    } else if (!modelEnabled) generator.append(node("p", "muted", "当前服务未开启模型生成。"));
    const proposal = proposals.get(viewer + ":" + item.id);
    if (proposal) {
      const card = node("div", "recipe-proposal");
      card.append(node("strong", "", proposal.recipe.title),
        node("p", "", proposal.recipe.rationale),
        node("small", "", proposal.model + " · " + proposal.recipe.parts.length + " 个部件"));
      if (proposal.changes) {
        const diff = node("div", "recipe-diff");
        for (const [key, label] of [["added", "新增"], ["updated", "修改"], ["removed", "移除"], ["preserved", "保留"]]) {
          diff.append(node("p", "", label + " " + proposal.changes[key].length + " · " + (proposal.changes[key].join("、") || "无")));
        }
        card.append(diff);
      }
      const review = node("details");
      review.append(node("summary", "", "查看配方与部件含义"));
      const list = node("ul");
      for (const part of proposal.recipe.parts) list.append(node("li", "", part.id + " · " + part.meaning));
      review.append(list, node("pre", "", JSON.stringify(proposal.patch ?? proposal.recipe, null, 2)));
      card.append(review);
      button(card, "应用这个提案", () => command(proposal.mode === "patch" ? "visual.recipe.patched" : "visual.recipe.applied", { proposal_id: proposal.proposal_id }), "primary");
      generator.append(card);
    }
    if (item.appearance && item.appearance_basis_status !== "active") {
      generator.append(node("p", "warning", item.appearance_basis_status === "withdrawn" ? "外观的部分来源已撤回；保留物件，不再当作当前经历的表达。" : "经历已更正，当前外观仍待本人核对。"));
      appendCurrentBasis(generator, item.appearance_basis_versions);
      if (item.created_by === viewer && item.appearance_basis_status === "changed") {
        button(generator, "核对后保留这个外观", () => command("visual.basis.reviewed", {
          basis_event_ids: item.appearance_basis_versions, appearance_event_id: item.appearance_event,
        }));
      }
    }
    if (item.appearance) {
      generator.append(node("p", "muted", "当前外观：" + item.appearance.title + " · " + item.appearance_model));
      generator.append(node("p", "muted", item.appearance.rationale));
      const parts = node("details");
      parts.append(node("summary", "", "当前部件与含义"));
      for (const part of item.appearance.parts) parts.append(node("p", "muted", part.id + "：" + part.meaning));
      generator.append(parts);
      if (item.created_by === viewer) button(generator, "恢复默认外观", () => command("visual.recipe.removed"));
    }
    root.append(generator);
  }
  const details = node("details", "provenance");
  details.append(node("summary", "", "为什么它会在这里 · " + item.provenance.length + " 次变化"));
  const list = node("ol");
  for (const entry of item.provenance) {
    const row = node("li", "", (eventNames[entry.type] ?? entry.type) + " · " + (names[entry.actor_id] ?? entry.actor_id) + " · #" + entry.sequence);
    for (const ref of entry.source_refs ?? []) {
      const sourceObject = state.entities.find((entity) => entity.provenance.some((record) => record.event_id === ref));
      if (sourceObject && sourceObject.id !== selectedId) {
        button(row, "来源：" + (sourceObject.title ?? sourceObject.display_name ?? sourceObject.id),
          () => select(sourceObject.id), "source-link");
      } else row.append(node("code", "", " 来源事件 " + ref));
    }
    list.append(row);
  }
  details.append(list, node("code", "", "稳定对象 ID: " + item.id));
  if (item.source) {
    const meta = node("dl", "source-meta");
    for (const [label, value] of [["服务", item.source.provider], ["记录 ID", item.source.record_id],
      ["发生时间", item.source.occurred_at], ["地点", item.source.location],
      ["开始", item.source.starts_at], ["结束", item.source.ends_at]]) {
      if (value) meta.append(node("dt", "", label), node("dd", "", value));
    }
    meta.append(node("dt", "", "证据类型"), node("dd", "", "本人陈述 · 未经外部验证"));
    details.append(meta);
  }
  root.append(details);
}
function apply(next) {
  state = next;
  objects.apply(state);
  if (!state.entities.some((item) => item.id === selectedId)) selectedId = null;
  objects.select(selectedId);
  renderList();
  renderDetail();
  renderBaseline();
  for (const [id, label] of labels) {
    if (objects.objects.has(id)) continue;
    label.remove();
    labels.delete(id);
  }
  for (const [id, object] of objects.objects) {
    let label = labels.get(id);
    if (!label) {
      label = node("button", "object-label");
      label.addEventListener("click", () => select(id));
      document.querySelector(".labels").append(label);
      labels.set(id, label);
    }
    label.textContent = object.userData.entity.title ?? object.userData.entity.display_name ?? "候选身份";
  }
  document.querySelector("#sequence").textContent = "事件 #" + state.basis.through_sequence;
  document.querySelectorAll("[data-through]").forEach((element) => {
    element.classList.toggle("active", Number(element.dataset.through) === activeThrough);
  });
  document.querySelector("#json").textContent = JSON.stringify(state, null, 2);
  rememberSession();
  showSessionStatus();
  updateDiagnostic();
}
new ResizeObserver(() => {
  const { width, height } = viewport.getBoundingClientRect();
  if (width <= 0 || height <= 0) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}).observe(viewport);
let pointerDown;
canvas.addEventListener("pointerdown", (event) => { pointerDown = [event.clientX, event.clientY]; });
canvas.addEventListener("pointerup", (event) => {
  if (!pointerDown || Math.hypot(event.clientX - pointerDown[0], event.clientY - pointerDown[1]) > 6) return;
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([...objects.objects.values()], true)[0];
  if (!hit) return;
  let object = hit.object;
  while (object && !object.userData.entityId) object = object.parent;
  if (object) select(object.userData.entityId);
});
stageRoot.addEventListener("click", (event) => {
  const target = event.target.closest("[data-through]");
  if (target) command("reset", { through: Number(target.dataset.through) });
});
document.querySelector("#load-checkin").addEventListener("click", () => {
  document.querySelector("#checkin-json").value = JSON.stringify({
    event_id: "synthetic-visit-001", provider: "synthetic-demo",
    location: "合成纸桥工作坊", occurred_at: "2026-09-12T10:00:00+08:00"
  }, null, 2);
  document.querySelector("#checkin-confirm").checked = false;
});
document.querySelector("#checkin-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  try {
    const record = JSON.parse(document.querySelector("#checkin-json").value);
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("请输入 JSON 对象");
    if (!document.querySelector("#checkin-confirm").checked) throw new Error("请先确认本人陈述");
    await command("checkin.import", { record: { ...record, confirmed: true },
      visibility: document.querySelector("#checkin-visibility").value });
  } catch (error) { notice(error.message, true); }
});
document.querySelector("#mode").addEventListener("change", (event) => setMode(event.target.value));
setMode("3d");
document.querySelector("#viewer").addEventListener("change", async (event) => {
  if (busy || pairMode) { event.target.value = viewer; return; }
  const nextViewer = event.target.value;
  busy = true;
  try {
    const next = await request("/lab-api/state?session_id=" + sessionId + "&viewer=" + nextViewer);
    viewer = nextViewer;
    apply(next);
  } catch (error) {
    event.target.value = viewer;
    notice(error.message, true);
  } finally { busy = false; renderDetail(); }
});
function frame() {
  if (!rendering) return;
  requestAnimationFrame(frame);
  if (presentationMode === "2d" || document.hidden) return;
  controls.update();
  renderer.render(scene, camera);
  renderedFrames++;
  const width = viewport.clientWidth, height = viewport.clientHeight;
  for (const [id, label] of labels) {
    const object = objects.objects.get(id);
    const point = object.position.clone().add(new THREE.Vector3(0, 1.65, 0)).project(camera);
    label.style.left = (point.x * 0.5 + 0.5) * width + "px";
    label.style.top = (-point.y * 0.5 + 0.5) * height + "px";
    label.hidden = point.z > 1 || Math.abs(point.x) > 1 || Math.abs(point.y) > 1;
  }
}
frame();
function updateDiagnostic() {
  document.querySelector("#diagnostic").textContent = JSON.stringify({
    mode: presentationMode, renderedFrames,
    drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    createdObjects: objects.created, removedObjects: objects.removed,
    objects: [...objects.objects].map(([id, object]) => ({ id, uuid: object.uuid, position: object.position.toArray(),
      recipeError: object.userData.recipeError ?? null,
      recipeParts: object.userData.recipeVisual?.children.length ?? 0,
      parts: object.userData.recipeVisual?.children.map(part => ({ id: part.name, uuid: part.uuid,
        geometry: part.geometry.uuid, material: part.material.uuid, position: part.position.toArray() })) ?? [] })),
  }, null, 2);
}
const diagnosticTimer = setInterval(updateDiagnostic, 1000);
try {
  if (pendingInvite) {
    pairMode = (await request("/lab-api/mode")).pair_mode === true;
    if (!pairMode) throw new Error("当前服务不支持双人加入链接。");
    document.querySelector("#pair-panel").hidden = false;
    document.querySelector("#pair-join").hidden = false;
    document.querySelector("#new-session").hidden = true;
    document.querySelector("#session-status").textContent = "收到共同世界邀请，确认加入后才取得角色访问权。";
  } else await connectSession();
} catch (error) {
  document.querySelector("#session-status").textContent = "恢复失败，已保留浏览器中的会话记录。可稍后刷新，或新建独立实验。";
  notice("实验服务连接失败：" + error.message, true);
}
document.querySelector("#pair-join").addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  try {
    const session = await request("/lab-api/pair/join", { invite: pendingInvite }, null);
    history.replaceState(null, "", location.pathname + location.search);
    await useSession(session);
    document.querySelector("#pair-join").hidden = true;
    document.querySelector("#new-session").hidden = false;
    notice("已加入共同世界，你现在只控制阿博的选择和反馈。");
  } catch (error) { notice(error.message, true); }
  finally { busy = false; renderDetail(); }
});
document.querySelector("#pair-invite").addEventListener("click", async () => {
  try {
    const value = await request("/lab-api/pair/invite", {});
    const url = new URL(location.pathname, location.href);
    url.hash = "join=" + encodeURIComponent(value.invite);
    document.querySelector("#pair-link").value = url.href;
    document.querySelector("#pair-link-wrap").hidden = false;
  } catch (error) { notice(error.message, true); }
});
document.querySelector("#pair-revoke").addEventListener("click", async () => {
  try {
    await request("/lab-api/pair/revoke", {});
    document.querySelector("#pair-link").value = "";
    document.querySelector("#pair-link-wrap").hidden = true;
    notice("另一端访问已撤销；过去的共同历史仍然保留。");
  } catch (error) { notice(error.message, true); }
});
const pairPollTimer = setInterval(async () => {
  if (!pairMode || !sessionId || !accessToken || pairAccessLost || busy || polling || document.hidden) return;
  polling = true;
  const targetSession = sessionId, targetViewer = viewer, targetToken = accessToken;
  try {
    const next = await request("/lab-api/state?session_id=" + targetSession + "&viewer=" + targetViewer, undefined, targetToken);
    if (!busy && sessionId === targetSession && viewer === targetViewer && accessToken === targetToken &&
      !document.activeElement?.matches("input, textarea, select") &&
      next.basis.through_event_id !== state?.basis.through_event_id) {
      activeThrough = null;
      apply(next);
    }
  } catch (error) {
    // A delayed failure from the previous world must not clear the current one.
    if (sessionId !== targetSession || viewer !== targetViewer || accessToken !== targetToken) return;
    if (error.status === 403) {
      pairAccessLost = true;
      state = null;
      proposals.clear();
      recipeDrafts.clear();
      actionDrafts.clear();
      correctionDrafts.clear();
      objects.apply({ entities: [], relationships: [] });
      for (const label of labels.values()) label.remove();
      labels.clear();
      document.querySelector("#entities").replaceChildren();
      document.querySelector(".baseline-list").replaceChildren();
      document.querySelector("#json").textContent = "";
      renderDetail();
      document.querySelector("#session-status").textContent = "当前角色访问已失效；需要新的邀请才能继续。";
    } else notice("同步暂时失败：" + error.message, true);
  } finally { polling = false; }
}, 1200);
document.querySelector("#new-session").addEventListener("click", async () => {
  if (busy || generatingId) return;
  busy = true;
  try {
    await connectSession(true);
    proposals.clear();
    document.querySelector("#pair-link-wrap").hidden = true;
    recipeDrafts.clear();
    actionDrafts.clear();
    notice("已新建独立实验；原会话数据没有删除。");
  } catch (error) { notice(error.message, true); }
  finally { busy = false; renderDetail(); }
});
window.addEventListener("pagehide", () => {
  rendering = false;
  clearInterval(diagnosticTimer);
  clearInterval(pairPollTimer);
  objects.dispose();
  controls.dispose();
  renderer.dispose();
});
