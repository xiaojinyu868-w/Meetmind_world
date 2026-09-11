import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SemanticObjects } from "./SceneObjects.js";
import "./style.css";

document.querySelector("#app").innerHTML = `
  <header><a class="brand" href="/">MeetMind<span> world</span></a><span class="tag">FRAMEWORK LAB · 01</span></header>
  <main>
    <section class="intro"><div><p class="eyebrow">共同经历 / 持续状态 / 现实反馈</p><h1>经历改变世界。<br>每次变化，都有来处。</h1></div>
      <p class="intro-note">这是一个可操作的合成实验。<br>试着纠正作品、选择下一步，再记录现实结果。<br><strong>人物以身份标记展示，美术与产品场景尚未定稿。</strong></p></section>
    <section class="workbench">
      <div class="world-pane"><div class="view-toolbar"><span><i></i> <span id="mode-label">语义空间</span></span><div class="toolbar-controls"><label>呈现 <select id="mode" aria-label="呈现模式"><option value="3d">3D 空间</option><option value="2d">2D 基线</option></select></label><label>查看身份 <select id="viewer" aria-label="查看身份"><option value="alice">小满</option><option value="bo">阿博</option><option value="observer">观察者</option></select></label></div></div>
        <div class="viewport"><canvas aria-label="共同经历三维空间"></canvas><div class="labels"></div><div class="canvas-help">拖动旋转 · 滚轮缩放 · 点击物件查看</div></div>
        <div class="baseline" hidden><div class="baseline-head"><span>事件时间线</span><small>同一份 world-state.v1</small></div><div class="baseline-list"></div></div>
        <div class="replay"><div class="replay-title"><span>回到一个时刻</span><span id="sequence"></span></div><div class="stages"></div></div>
      </div>
      <aside><div class="aside-heading"><span>当前世界</span><small id="count"></small></div><div id="entities" role="list"></div><section id="detail" aria-live="polite"></section></aside>
    </section>
    <div id="notice" role="status"></div>
    <footer><span>同一份事件 → 2D 信息与 3D 对象</span><span>本机合成数据 · 不发送消息 · 不代表真实报名或完成</span></footer>
    <details class="raw"><summary>查看本次状态 JSON 与渲染诊断</summary><pre id="diagnostic"></pre><pre id="json"></pre></details>
  </main>`;

const names = { alice: "小满", bo: "阿博", observer: "观察者" };
const kindNames = { person: "身份", artifact: "共同作品", "memory-object": "共同经历", action: "下一次行动" };
const eventNames = {
  "identity.claimed": "本人认领", "identity.candidate.observed": "发现候选",
  "experience.confirmed": "记录经历", "artifact.observed": "创建作品",
  "inference.superseded": "纠正作品标题", "action.proposed": "提出下一步",
  "action.accepted": "接受行动", "action.declined": "拒绝行动",
  "action.outcome.recorded": "自报现实结果", "action.outcome.revoked": "撤回自报",
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

function notice(text, error = false) {
  const element = document.querySelector("#notice");
  element.textContent = text;
  element.className = error ? "error" : "";
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { element.textContent = ""; }, 6000);
}
async function request(path, body) {
  const response = await fetch(path, body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : {});
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? "实验服务不可用");
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
    activeThrough = command === "reset" ? fields.through : null;
    apply(next);
    notice(command === "reset" ? "已回放到所选时刻；本会话的后续实验操作已重置。" : "事件已记录，2D 与 3D 已同步。");
  } catch (error) {
    notice(error.message, true);
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
}
function renderBaseline() {
  const root = document.querySelector(".baseline-list");
  if (!root || !state) return;
  root.replaceChildren();
  const entities = state.entities.filter((item) => item.kind !== "world");
  if (!entities.length) {
    root.append(node("p", "muted", "这个时刻还没有对当前查看者可见的对象。"));
    return;
  }
  for (const item of entities) {
    const card = node("button", "baseline-card" + (item.id === selectedId ? " selected" : ""));
    card.dataset.entityId = item.id;
    const title = item.title ?? item.display_name ?? "候选身份";
    card.append(node("span", "baseline-kind", kindNames[item.kind] ?? item.kind),
                 node("strong", "", title));
    const provenance = item.provenance?.slice(-1)[0];
    if (provenance) card.append(node("small", "", (eventNames[provenance.type] ?? provenance.type) + " · #" + provenance.sequence));
    if (item.kind === "action") {
      const choices = Object.entries(item.decisions ?? {}).map(([id, decision]) => (names[id] ?? id) + "：" + (decision.status === "accepted" ? "愿意" : "不参加"));
      card.append(node("small", "", choices.join(" · ") || "尚未决定"));
    }
    card.addEventListener("click", () => select(item.id));
    root.append(card);
  }
}
function setMode(mode) {
  const is3d = mode !== "2d";
  document.querySelector(".viewport").hidden = !is3d;
  document.querySelector(".baseline").hidden = is3d;
  document.querySelector("#mode-label").textContent = is3d ? "语义空间" : "2D 信息基线";
  renderBaseline();
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
    if (item.created_by === viewer) button(root, "撤回这段经历", () => command("experience.revoked"), "quiet-danger");
  }
  if (item.kind === "action") {
    if (item.basis_status === "withdrawn") root.append(node("p", "warning", "原经历已撤回。这里保留行动历史，不再展示原依据。"));
    for (const person of item.participant_ids) {
      const decision = item.decisions[person]?.status;
      const result = item.outcomes[person];
      const row = node("div", "decision");
      row.append(node("strong", "", names[person] ?? person), node("span", "", decision === "accepted" ? "愿意参加" : decision === "declined" ? "这次不参加" : "尚未决定"));
      row.append(node("small", "", result ? (result.result === "completed" ? "本人自报：已完成" : "本人自报：未完成") : "没有当前现实结果报告"));
      if (result) row.append(node("p", "", result.note));
      root.append(row);
    }
    if (item.participant_ids.includes(viewer)) {
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
  const details = node("details", "provenance");
  details.append(node("summary", "", "为什么它会在这里 · " + item.provenance.length + " 次变化"));
  const list = node("ol");
  for (const entry of item.provenance) {
    list.append(node("li", "", (eventNames[entry.type] ?? entry.type) + " · " + (names[entry.actor_id] ?? entry.actor_id) + " · #" + entry.sequence));
  }
  details.append(list, node("code", "", "稳定对象 ID: " + item.id));
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
  updateDiagnostic();
}
new ResizeObserver(() => {
  const { width, height } = viewport.getBoundingClientRect();
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
document.querySelector("#mode").addEventListener("change", (event) => setMode(event.target.value));
setMode("3d");
document.querySelector("#viewer").addEventListener("change", async (event) => {
  if (busy) { event.target.value = viewer; return; }
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
  controls.update();
  renderer.render(scene, camera);
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
    drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    createdObjects: objects.created, removedObjects: objects.removed,
    objects: [...objects.objects].map(([id, object]) => ({ id, uuid: object.uuid, position: object.position.toArray() })),
  }, null, 2);
}
const diagnosticTimer = setInterval(updateDiagnostic, 1000);
try {
  const session = await request("/lab-api/sessions", {});
  sessionId = session.session_id;
  apply(await request("/lab-api/state?session_id=" + sessionId + "&viewer=" + viewer));
} catch (error) {
  notice("实验服务连接失败：" + error.message, true);
}
window.addEventListener("pagehide", () => {
  rendering = false;
  clearInterval(diagnosticTimer);
  objects.dispose();
  controls.dispose();
  renderer.dispose();
});
