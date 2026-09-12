import "./style.css";
import { SpaceView } from "./SpaceView.js";
import { ProposalPanel } from "./ProposalPanel.js";
document.querySelector("#app").innerHTML = [
'<header class="top"><a class="brand" href="/">MeetMind <span>world</span></a><span class="experiment">共同空间 · 实验 02</span><div class="account"><span id="identity">正在连接…</span><button id="invite" hidden>邀请另一位</button><button id="new">新建空间</button></div></header>',
'<main><section class="intro"><div><p class="eyebrow">把生活里的要求，放进我们的空间</p><h1>一起安放，<br>下一段生活。</h1></div><div class="brief"><p>一个人需要安静办公，一个人想留出运动的位置。<br>还有那件一起做的纸桥，我们想把它放在哪里？</p><p class="subtle">6 × 5 米合成房间 · 人工样例，未调用模型</p></div></section>',
'<section id="joining" class="joining" hidden><h2>一起看看这个房间</h2><p>加入后，你将以实验角色「阿博」表达自己的要求与选择。</p><button id="join" class="primary">以阿博加入</button></section><div id="notice" role="status" aria-live="polite"></div>',
'<div class="workspace"><section class="studio"><div class="studio-bar"><div><span class="live-dot"></span><strong id="version">方案 01</strong><span id="sync" class="subtle">正在恢复空间</span></div><div class="segmented"><button id="mode3d" aria-pressed="true">3D 空间</button><button id="mode2d" aria-pressed="false">2D 平面</button></div></div>',
'<div id="preview-label" hidden>提案预览 · 仅你可见，共同方案尚未改变</div><div id="viewport"></div><div class="view-note"><span id="control-help">选中家具后拖动摆放 · 空白处拖动旋转 · 滚轮缩放</span><span>单位：米</span></div>',
'<div class="layout-strip"><div><small>从两个想法开始</small><strong>先安排，再讨论</strong></div><button data-preset="A">方案 A · 围坐交流</button><button data-preset="B">方案 B · 留出活动区</button></div><div id="issues" class="issues"></div><section id="proposal-panel" class="proposal-panel"></section>',
'<div class="editing"><div id="object-title"><h3>点击一件家具</h3><p class="subtle">查看它的尺寸与位置，或在空间里拖动。</p></div><form id="move" hidden><label>横向 X<input id="x" aria-label="横向 X" type="number" step=".1" required></label><label>纵向 Z<input id="z" aria-label="纵向 Z" type="number" step=".1" required></label><label>方向<select id="rotation" aria-label="家具方向"><option value="0">0°</option><option value="90">90°</option></select></label><button class="primary">更新位置</button></form></div></section>',
'<aside><nav class="tabs" aria-label="空间讨论"><button data-tab="needs" aria-selected="true">我们的要求</button><button data-tab="story" aria-selected="false">来处</button><button data-tab="decide" aria-selected="false">一起决定</button></nav><div id="panel"></div></aside></div>',
'<footer><span id="durable">合成实验 · 共同历史保存在独立实验目录</span><div><button id="export">导出当前方案</button><button id="revoke" hidden>撤销另一位访问</button></div><p>只检查简化的平面几何，不是装修或安全规范验收。加入链接仅供本机实验使用。</p></footer></main>',
'<dialog id="invite-dialog"><form method="dialog"><button class="close" aria-label="关闭">×</button></form><p class="eyebrow">一起进入同一个空间</p><h2>把这个链接交给另一位</h2><p>在另一个独立浏览器会话打开，以阿博加入。链接 30 分钟内一次有效。</p><input id="invite-link" readonly aria-label="加入链接"><p class="subtle">实验身份不等于真人核验；系统不会替你发送消息。</p></dialog>'
].join("");
const $ = (id) => document.querySelector(id), KEY = "meetmind.shared-space.session.v1";
const pendingInvite = new URLSearchParams(location.hash.slice(1)).get("join");
let session = null, state = null, selected = "desk", tab = "needs", mode = "3d";
let busy = false, polling = false, lost = false, noticeTimer;
const scene = new SpaceView($("#viewport"), { onSelect: select, onMove: fields => { if (proposals.previewing) { scene.apply({...proposals.proposal.preview,violations:proposals.proposal.violations}); notify("正在预览提案，请先退出预览再移动家具。", true); } else return send({ type: "object.move", ...fields }); } });
const proposals = new ProposalPanel($("#proposal-panel"), {
  getState: () => state, getSession: () => session, request, receive, notify,
  preview: value => { $("#preview-label").hidden = !value; if (value || state) scene.apply(value || state); }
});
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function notify(text, error = false) {
  $("#notice").textContent = text; $("#notice").classList.toggle("error", error);
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $("#notice").textContent = ""; }, 9000);
}
function saved() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } }
function remember() { try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { notify("浏览器无法保存访问凭证，刷新后可能无法恢复。", true); } }
async function request(path, body, token = session?.token) {
  const response = await fetch(path, { headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { method: "POST", body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  if (!response.ok) { const error = new Error(value.error || "服务暂时不可用"); error.status = response.status; throw error; }
  return value;
}
function receive(result) {
  state = result.state;
  proposals.update(state, result.model_enabled);
  scene.apply(proposals.previewing && proposals.proposal ? {...proposals.proposal.preview, violations:proposals.proposal.violations} : state);
  scene.select(selected);
  $("#version").textContent = "方案 " + String(state.revision).padStart(2, "0");
  $("#sync").textContent = "历史已保存 · 自动同步"; $("#identity").textContent = state.members[session.viewer] + " · 我的实验身份";
  $("#invite").hidden = $("#revoke").hidden = session.viewer !== "alice"; $("#joining").hidden = true;
  renderIssues(); renderObject(); renderPanel();
  window.__space = { state, viewer: session.viewer, diagnostics: () => scene.diagnostics() };
}
async function connect(fresh = false) {
  const previous = fresh ? null : saved();
  const result = previous?.token ? await request("/space-api/state", undefined, previous.token) : await request("/space-api/sessions", {}, null);
  session = { session_id: result.session_id, viewer: result.viewer, token: result.token || previous?.token };
  lost = false; proposals.reset(); remember(); receive(result);
}
async function send(command) {
  if (busy || !state || lost) { if (state) scene.apply(state); return; }
  proposals.clearPreview(); busy = true; $("#sync").textContent = "保存中…";
  try {
    const result = await request("/space-api/command", { expected_sequence: state.sequence, request_id: crypto.randomUUID(), command });
    receive(result); notify(command.type === "decision.set" ? "已记录你对这个版本的选择。" : "变化已保存，对方会看到同一份方案。");
  } catch (error) {
    notify(error.message, true);
    if (error.status === 409) {
      try {
        const result = await request("/space-api/state");
        state = result.state; scene.apply(state); renderIssues();
        $("#version").textContent = "方案 " + String(state.revision).padStart(2, "0");
        $("#sync").textContent = "已更新，请检查后重试";
      } catch {}
    } else if (state) { scene.apply(state); $("#sync").textContent = "未保存，请重试"; }
  } finally { busy = false; }
}
function select(id) { selected = id; scene.select(id); renderObject(); }
function renderObject() {
  const object = state?.objects.find(o => o.id === selected); $("#move").hidden = !object;
  $("#object-title").innerHTML = object ? "<h3>" + esc(object.label) + '</h3><p class="subtle">' + object.width + " × " + object.depth + " 米 · " + (object.source_id ? "带着一段共同来历" : "合成家具尺寸") + "</p>" : "<h3>点击一件家具</h3>";
  if (object) { $("#x").value = object.x; $("#z").value = object.z; $("#rotation").value = object.rotation; }
}
function renderIssues() {
  const issues = state?.violations || []; $("#issues").classList.toggle("has-issues", issues.length > 0);
  $("#issues").innerHTML = issues.length ? "<strong>" + issues.length + " 处需要一起调整</strong>" + issues.map(v => "<p>" + esc(v.message) + "</p>").join("") : "<strong>当前几何检查通过</strong><p>尺寸、门口和已启用的活动区没有检测到冲突；仍需现实测量确认。</p>";
}
const statusText = { accepted: "接受这个版本", changes: "希望再调整", measure: "先补充测量", defer: "暂不决定" };
function person(id, suffix="") { return '<div class="person"><span class="avatar ' + id + '">' + esc(state.members[id].slice(0,1)) + "</span><span>" + esc(state.members[id]) + suffix + "</span>"; }
function renderPanel() {
  if (!state || !session) { $("#panel").replaceChildren(); return; }
  for (const b of document.querySelectorAll("[data-tab]")) b.setAttribute("aria-selected", String(b.dataset.tab === tab));
  if (tab === "needs") {
    $("#panel").innerHTML = '<div class="panel-heading"><p class="eyebrow">01 / 把各自的需要说清楚</p><h2>这里，也要容得下我。</h2><p>每个人确认自己的要求。启用后，空间会标出需要保留的位置。</p></div>' + state.requirements.map(r =>
      '<article class="requirement ' + (r.enabled ? "enabled" : "") + '">' + person(r.owner) + "<small>" + (r.enabled ? "已确认" : "待本人确认") + "</small></div><h3>" + esc(r.label) + "</h3><p>" + (r.zone ? "留出 " + r.zone.width + " × " + r.zone.depth + " 米" : "让共同做过的物件继续留在生活里") + "</p>" +
      (r.review_needed ? '<p class="warning">相关经历有变化，请重新检查这项要求。</p>' : "") +
      (r.owner === session.viewer ? '<button data-requirement="' + esc(r.id) + '" data-enabled="' + (!r.enabled || r.review_needed) + '">' + (r.review_needed ? "按当前来处重新确认" : r.enabled ? "暂时取消这项要求" : "这是我的要求") + "</button>" : '<small class="subtle">等待本人选择，你可以查看但不能替他决定。</small>') + "</article>").join("");
  } else if (tab === "story") {
    $("#panel").innerHTML = '<div class="panel-heading"><p class="eyebrow">02 / 这次决定，从哪里来</p><h2>生活里的事，有后文。</h2><p>这些是合成经历。一个人的说法，可以被补充，也可以有不同记忆。</p></div>' + state.memories.map(m =>
      '<article class="memory">' + person(m.owner,"记录") + "<small>第 " + m.version + ' 版</small></div><p class="memory-text">' + (m.withdrawn ? "这段经历的来源已撤回。" : esc(m.text)) + "</p>" +
      Object.entries(m.replies || {}).map(([id,r]) => '<p class="reply">' + esc(state.members[id]) + "：" + (r.status === "confirmed" ? "我的记忆也是这样" : "我记得有些不同") + " " + esc(r.note) + "</p>").join("") +
      (!m.withdrawn && m.owner === session.viewer ? '<form data-memory="' + esc(m.id) + '"><label>补充或纠正<textarea aria-label="纠正' + esc(m.id) + '" maxlength="500">' + esc(m.text) + '</textarea></label><button>保存这段变化</button><button type="button" class="text-button" data-withdraw="' + esc(m.id) + '">撤回来源</button></form>' : "") +
      (!m.withdrawn && m.owner !== session.viewer ? '<form data-reply="' + esc(m.id) + '"><label>我的补充<textarea aria-label="补充' + esc(m.id) + '" maxlength="500" placeholder="留下自己的记忆"></textarea></label><div class="button-row"><button name="status" value="confirmed">我也这样记得</button><button name="status" value="different">我记得不同</button></div></form>' : "") + "</article>").join("");
  } else {
    $("#panel").innerHTML = '<div class="panel-heading"><p class="eyebrow">03 / 不必急着达成一致</p><h2>这是我们都想要的吗？</h2><p>选择绑定当前方案 ' + state.revision + '。之后改变布局或要求，需要再看一次。</p></div><div class="decisions">' +
      Object.entries(state.members).map(([id,name]) => {
        const d = state.decisions[id], current = d && d.revision === state.revision;
        return '<article class="decision"><span class="avatar ' + id + '">' + esc(name.slice(0,1)) + "</span><div><strong>" + esc(name) + "</strong><p>" + (d ? esc(statusText[d.status]) + (current ? "" : " · 旧方案 " + d.revision) : "还没有作出选择") + "</p>" + (d?.note ? "<small>" + esc(d.note) + "</small>" : "") + "</div><small>" + (current ? "当前版本" : "待确认") + "</small></article>";
      }).join("") + '</div><form id="decision-form"><label>我想补充<textarea id="decision-note" aria-label="决定说明" maxlength="500" placeholder="可以指出分歧，也可以先不决定"></textarea></label><div class="decision-buttons"><button name="status" value="accepted" class="primary" ' + (state.violations.length || state.requirements.some(r=>r.review_needed) ? "disabled" : "") + '>我接受这个版本</button><button name="status" value="changes">还需要调整</button><button name="status" value="measure">先去测量</button><button name="status" value="defer">暂不决定</button></div></form>' +
      '<section class="next-step"><h3>把下一步带回生活</h3><p class="subtle">例如：周末量一下门宽，再决定是否买这张桌子。</p><form id="action-form"><label>我的下一步<input id="action-text" aria-label="我的下一步" maxlength="200" required placeholder="写下一件自己愿意做的事"></label><div class="action-fields"><label>截止时间<input id="action-due" aria-label="截止时间" maxlength="80" placeholder="例如：本周六"></label><label>完成标准<input id="action-criteria" aria-label="完成标准" maxlength="360" placeholder="做到什么算完成"></label><label>待测量事项<input id="action-measurement" aria-label="待测量事项" maxlength="240" placeholder="需要测什么"></label><label>结果来源<input id="action-source" aria-label="结果来源" maxlength="240" placeholder="照片、尺寸或链接"></label></div><button>留下我的行动</button></form>' +
      state.actions.map(a => '<article class="action"><strong>' + esc(state.members[a.owner]) + " · " + esc(a.text) + "</strong>" + (a.due_at ? "<p>截止：" + esc(a.due_at) + "</p>" : "") + (a.completion_criteria ? "<p>完成标准：" + esc(a.completion_criteria) + "</p>" : "") + (a.measurement ? "<p>待测量：" + esc(a.measurement) + "</p>" : "") + (a.result_source ? "<p>结果来源：" + esc(a.result_source) + "</p>" : "") + "<p>" + (a.status === "done" ? "本人自报已完成" : a.status === "not_done" ? "本人自报未完成" : "尚无完成报告") + (a.report_note ? " · " + esc(a.report_note) : "") + "</p>" + (a.owner === session.viewer ? '<div class="button-row"><button data-action="' + esc(a.id) + '" data-status="done">自报完成</button><button data-action="' + esc(a.id) + '" data-status="not_done">未完成</button><button data-action="' + esc(a.id) + '" data-status="pending">撤回报告</button></div>' : "") + "</article>").join("") + "</section>";
  }
}
$("#panel").addEventListener("click", e => {
  const r=e.target.closest("[data-requirement]"); if(r)send({type:"requirement.set",requirement_id:r.dataset.requirement,enabled:r.dataset.enabled==="true"});
  const w=e.target.closest("[data-withdraw]"); if(w)send({type:"memory.withdraw",memory_id:w.dataset.withdraw});
  const a=e.target.closest("[data-action]"); if(a){const note=a.dataset.status === "pending" ? "" : window.prompt("补充本次结果（可留空）：", "") ?? ""; if(note === null)return; send({type:"action.report",action_id:a.dataset.action,status:a.dataset.status,note});}
});
$("#panel").addEventListener("submit", e => {
  e.preventDefault(); const f=e.target;
  if(f.dataset.memory)send({type:"memory.edit",memory_id:f.dataset.memory,text:f.querySelector("textarea").value});
  else if(f.dataset.reply)send({type:"memory.reply",memory_id:f.dataset.reply,status:e.submitter.value,note:f.querySelector("textarea").value});
  else if(f.id==="decision-form")send({type:"decision.set",status:e.submitter.value,note:$("#decision-note").value});
  else if(f.id==="action-form")send({type:"action.add",text:$("#action-text").value,due_at:$("#action-due").value,completion_criteria:$("#action-criteria").value,measurement:$("#action-measurement").value,result_source:$("#action-source").value});
});
for(const b of document.querySelectorAll("[data-tab]"))b.onclick=()=>{tab=b.dataset.tab;renderPanel();};
for(const b of document.querySelectorAll("[data-preset]"))b.onclick=()=>send({type:"layout.preset",preset:b.dataset.preset});
$("#move").onsubmit=e=>{e.preventDefault();send({type:"object.move",object_id:selected,x:Number($("#x").value),z:Number($("#z").value),rotation:Number($("#rotation").value)});};
function setMode(next){mode=next;scene.setMode(mode);$("#mode3d").setAttribute("aria-pressed",String(mode==="3d"));$("#mode2d").setAttribute("aria-pressed",String(mode==="2d"));$("#control-help").textContent=mode==="3d"?"选中家具后拖动摆放 · 空白处拖动旋转 · 滚轮缩放":"平面中选择或拖动家具 · 精确尺寸与3D保持一致";}
$("#mode3d").onclick=()=>setMode("3d");$("#mode2d").onclick=()=>setMode("2d");
$("#invite").onclick=async()=>{try{const v=await request("/space-api/invite",{});const u=new URL(location.pathname,location.href);u.hash="join="+encodeURIComponent(v.invite);$("#invite-link").value=u.href;$("#invite-dialog").showModal();}catch(e){notify(e.message,true);}};
$("#join").onclick=async()=>{if(busy)return;busy=true;try{const r=await request("/space-api/join",{invite:pendingInvite},null);session={session_id:r.session_id,viewer:r.viewer,token:r.token};remember();history.replaceState(null,"",location.pathname+location.search);receive(r);}catch(e){notify(e.message,true);}finally{busy=false;}};
$("#new").onclick=async()=>{if(busy)return;busy=true;try{await connect(true);}catch(e){notify(e.message,true);}finally{busy=false;}};
$("#revoke").onclick=async()=>{try{await request("/space-api/revoke",{});notify("另一位的访问已撤销，共同历史继续保留。");}catch(e){notify(e.message,true);}};
$("#export").onclick=async()=>{if(!session)return;try{const v=await request("/space-api/export");const u=URL.createObjectURL(new Blob([v.text],{type:"text/markdown;charset=utf-8"}));const a=document.createElement("a");a.href=u;a.download="共同空间-方案"+v.revision+".md";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);notify("已导出当前方案与每个人的选择。");}catch(e){notify(e.message,true);}};
const timer=setInterval(async()=>{
  if(!session||busy||polling||lost||document.hidden)return;polling=true;const token=session.token;
  try{
    const r=await request("/space-api/state",undefined,token);if(session?.token!==token||busy)return;
    if(r.state.sequence!==state?.sequence){if(document.activeElement?.matches("input,textarea,select"))$("#sync").textContent="对方有更新 · 输入结束后同步";else receive(r);}
  }catch(e){
    if(session?.token!==token)return;
    if(e.status===403){lost=true;proposals.reset();state=null;scene.apply({room:{width:6,depth:5,height:2.8,door:{x:3,z:.55,width:1.2,depth:1.1}},objects:[],requirements:[],violations:[]});$("#panel").replaceChildren();$("#issues").replaceChildren();$("#move").hidden=true;$("#object-title").textContent="";$("#sync").textContent="当前角色访问已失效";delete window.__space;notify("当前访问已失效，需要新的加入链接。",true);}
    else $("#sync").textContent="连接暂时中断，正在重试";
  }finally{polling=false;}
},1200);
try{if(pendingInvite){$("#joining").hidden=false;$("#identity").textContent="等待加入";}else await connect();}catch(e){$("#sync").textContent="连接失败，保留原访问记录";notify(e.message,true);}
window.addEventListener("pagehide",()=>{clearInterval(timer);scene.dispose();});
