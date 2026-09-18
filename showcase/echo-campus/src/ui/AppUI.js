import QRCode from "qrcode";
import { defaultManifest, validateManifest } from "../runtime/SceneManifest.js";
import { listSceneDefinitions } from "../runtime/SceneRegistry.js";
import { VENUE_CANDIDATES, venueById, venueUrl } from "../runtime/VenueCatalog.js";
import "./style.css";

const ICONS = {
  spark: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  tour: '<path d="m9 5 11 7-11 7V5Z"/>',
  scene: '<path d="m3 8 9-5 9 5-9 5-9-5Zm0 4 9 5 9-5M3 16l9 5 9-5"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 5 6m0-6-5 6"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  link: '<path d="M10 13a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-5.5-5.8L11 7M14 11a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 5.5 5.8L13 17"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  nfc: '<path d="M4 8a12 12 0 0 1 16 0M7 11a8 8 0 0 1 10 0m-7 3a4 4 0 0 1 4 0"/><circle cx="12" cy="18" r="1"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/>',
  inbox: '<path d="m4 4-2 12v4h20v-4L20 4H4Zm-2 12h6l2 3h4l2-3h6"/>',
  flag: '<path d="M5 21V3m0 1c4-3 9 3 14 0v10c-5 3-10-3-14 0"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 5H4v16h16v-6"/>',
};
const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.spark) + "</svg>";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const color = value => /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#778879";
const COLORS = ["#778879", "#b98878", "#758e9d", "#b5a27d", "#9287a7", "#505e79"];
const CATEGORIES = [["investor", "投资人"], ["founder", "创业者"], ["audience", "观众"], ["media", "媒体"], ["platform", "平台伙伴"], ["organizer", "主办方"], ["guest", "其他来宾"]];
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES);
const INITIAL = { name: "林予", role: "AI 产品创始人", offer: "AI 产品研发、快速原型", need: "品牌设计、用户访谈", category: "founder", avatarColor: COLORS[0] };
const CAMERA_LABELS = { overview: "全景", arrival: "入口", courtyard: "庭院", aerial: "俯瞰" };

export class AppUI {
  constructor({ client, onCamera = () => {}, onScene = () => {}, onImport = () => {}, onTour = () => {}, onSelectPerson = () => {}, onActivityCheckpoint = () => {}, onSound = () => {}, onShowcase = () => {}, onVenue = () => {}, onView = () => {} }) {
    this.client = client;
    this.callbacks = { onCamera, onScene, onImport, onTour, onSelectPerson, onActivityCheckpoint, onSound, onShowcase, onVenue, onView };
    this.root = document.getElementById("ui");
    this.snapshot = null; this.me = null; this.activity = null; this.online = false; this.panel = null;
    this.selectedPerson = null; this.soundEnabled = false; this.selectedCamera = "overview";
    this.sceneId = "campus"; this.sceneLabel = "白庭校园"; this.sceneFile = null;
    this.stage = new URL(location.href).searchParams.get("mode") === "stage";
    this.sceneManifest = defaultManifest("glb");
    try {
      const saved = localStorage.getItem("echo-campus-scene-manifest");
      if (saved) this.sceneManifest = validateManifest(JSON.parse(saved));
    } catch {}
    this.activeVenueId = null; this.venueView = "event"; this.venueEventReady = false;
    this.root.innerHTML = this.shell();
    this.root.addEventListener("click", e => this.onClick(e));
    this.root.addEventListener("error", e => {
      if (e.target.matches?.("[data-venue-thumbnail]")) { e.target.hidden = true; e.target.parentElement.classList.add("is-unavailable"); }
    }, true);
    this.root.addEventListener("submit", e => this.onSubmit(e));
    this.root.addEventListener("change", e => this.onChange(e));
    this.root.addEventListener("input", e => {
      if (e.target.matches("[data-transform],[data-manifest-name],[data-manifest-url]")) this.updateManifestFromControls();
    });
    this.keyHandler = e => this.onKey(e);
    document.addEventListener("keydown", this.keyHandler);
    this.syncChrome();
    if (this.stage) this.renderStageQr();
    const query = new URL(location.href).searchParams;
    if (query.has("badge") || query.get("entry") === "nfc") this.entryTimer = setTimeout(() => { if (!this.panel && !this.disposed) this.openOnboarding(); }, 350);
  }
  shell() {
    return `<div class="ec-chrome">
      <header class="ec-header">
        <button type="button" class="ec-brand" data-action="camera" data-id="overview" aria-label="Echo Campus 返回园区全景">
          <span class="ec-brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span><strong>ECHO CAMPUS</strong><small>数字相遇体验 <b>·</b> 演示活动</small></span>
        </button>
        <nav class="ec-tools" aria-label="展示工具">
          <button class="ec-tool ec-presentation" data-action="showcase" aria-label="播放合作展示流程">${icon("spark")}<span>演示</span></button>
          <button class="ec-tool" data-action="tour" aria-label="自动导览">${icon("tour")}<span>导览</span></button>
          <button class="ec-tool" data-action="scenes" aria-label="切换或导入场景">${icon("scene")}<span>场地</span></button>
          <button class="ec-tool ec-sound" data-action="sound" aria-label="开启环境声音" aria-pressed="false">${icon("mute")}<span>声音</span></button>
        </nav>
      </header>
      <div class="ec-scene-caption"><span class="ec-caption-line"></span><span data-scene-name>白庭校园</span><span class="ec-caption-coordinate" data-scene-coordinate>WHITE COURT</span></div>
      <aside class="ec-venue-context" data-venue-context hidden><div class="ec-venue-source"><span>提供模型 · 真实转换</span><strong data-venue-source-name></strong><small data-venue-provenance></small></div><div class="ec-venue-view" role="group" aria-label="场地显示层"><button type="button" data-action="venue-view" data-id="source" aria-pressed="false">源模型</button><button type="button" data-action="venue-view" data-id="event" aria-pressed="false">活动布置</button></div><p data-venue-layer-note></p></aside>
      <div class="ec-hint" data-world-hint>拖动环看 <span>·</span> 滚轮缩放 <span>·</span> 点选人物</div>
      <footer class="ec-footer">
        <div class="ec-world-meta">
          <span class="ec-live-dot" data-live-dot></span>
          <div><span data-connection>正在连接活动</span><small data-world-count>一座为相遇而生的世界</small></div>
        </div>
        <nav class="ec-camera-dock" aria-label="园区视角">${Object.entries(CAMERA_LABELS).map(([id,label],i) => `<button type="button" data-action="camera" data-id="${id}" class="${i === 0 ? "is-active" : ""}" aria-pressed="${i === 0}"><span class="ec-camera-number">0${i+1}</span>${label}</button>`).join("")}</nav>
        <div class="ec-entry-actions"><button type="button" class="ec-activity-button" data-action="activity" aria-label="活动任务与积分">${icon("flag")}<span data-activity-points hidden>0</span></button><button type="button" class="ec-inbox-button" data-action="inbox" aria-label="我的相遇" hidden>${icon("inbox")}<span data-inbox-count hidden>0</span></button><button type="button" class="ec-primary ec-entry-button" data-action="join">${icon("nfc")}<span data-entry-label>领取我的分身</span>${icon("arrow")}</button></div>
      </footer>
      ${this.stage ? '<aside class="ec-stage-qr"><canvas data-stage-qr></canvas><div><strong>让相遇进入世界</strong><span>手机扫码领取演示分身</span><button type="button" data-action="demo">双端演示 ' + icon("arrow") + '</button></div></aside>' : ''}
      <button type="button" class="ec-demo-link" data-action="demo">NFC / 双端体验 ${icon("external")}</button>
    </div>
    <div class="ec-panel-layer" hidden><button class="ec-panel-scrim" aria-label="关闭面板" data-action="close" tabindex="-1"></button><section class="ec-panel" role="dialog" aria-modal="true" aria-labelledby="ec-panel-title" tabindex="-1"></section></div>
    <div class="ec-toast-stack" aria-live="polite" aria-atomic="true"></div>
    <div class="ec-busy" role="status" hidden><span class="ec-spinner"></span><span data-busy-label></span></div>`;
  }
  syncChrome() {
    const meta = this.root.querySelector("[data-connection]");
    if (meta) meta.textContent = this.online ? "活动实时同步" : "等待活动连接";
    this.root.querySelector("[data-live-dot]")?.classList.toggle("is-online", this.online);
    const count = this.root.querySelector("[data-world-count]");
    if (count && this.snapshot) count.textContent = this.snapshot.attendees.length + " 位演示分身 · " + this.snapshot.connections.length + " 次已确认相遇";
    this.activity = this.snapshot?.activity || this.activity;
    const points = this.root.querySelector("[data-activity-points]");
    if (points) { const value = this.me?.activity?.points || 0; points.textContent = value; points.hidden = !this.me?.attendee; }
    const entry = this.root.querySelector("[data-entry-label]");
    if (entry) entry.textContent = this.me?.attendee ? "我的分身" : "领取我的分身";
    const inbox = this.root.querySelector(".ec-inbox-button");
    if (inbox) inbox.hidden = !this.me?.attendee;
    const pending = this.me?.encounters?.filter(c => c.canConfirm).length || 0;
    const badge = this.root.querySelector("[data-inbox-count]");
    if (badge) { badge.textContent = pending; badge.hidden = !pending; }
    this.root.querySelector("[data-scene-name]").textContent = this.sceneLabel;
  }
  setSnapshot(snapshot) {
    this.snapshot = snapshot;
    if (this.selectedPerson) {
      const updated = snapshot?.attendees?.find(person => person.id === this.selectedPerson.id);
      if (updated) this.selectedPerson = updated;
    }
    this.syncChrome();
    if (this.panel === "person" && this.selectedPerson) this.renderPerson(this.selectedPerson);
    if (this.panel === "inbox") this.renderInbox();
  }
  setMe(data) {
    this.me = data;
    if (data?.attendee?.id === this.selectedPerson?.id) this.selectedPerson = data.attendee;
    this.syncChrome();
    if (this.panel === "inbox") this.renderInbox();
    if (this.panel === "person" && this.selectedPerson) this.renderPerson(this.selectedPerson);
  }
  setOnline(value) { this.online = !!value; this.syncChrome(); }
  setSceneLabel(name, id = null) {
    this.sceneLabel = String(name || "我的场景");
    this.sceneId = id || listSceneDefinitions().find(d => d.displayName === this.sceneLabel)?.id || "imported";
    const coordinate = venueById(this.sceneId) ? "SOURCE MODEL" : { campus: "WHITE COURT", gallery: "WATER GALLERY", imported: "IMPORTED SCENE" }[this.sceneId] || "IMPORTED SCENE";
    const label = this.root.querySelector("[data-scene-coordinate]");
    if (label) label.textContent = coordinate;
    this.syncChrome();
  }
  setVenueState({ candidate = null, view = "event", eventReady = false } = {}) {
    this.activeVenueId = candidate?.id || null;
    this.venueView = view;
    this.venueEventReady = !!eventReady;
    const context = this.root.querySelector("[data-venue-context]");
    context.hidden = !candidate;
    this.root.classList.toggle("ec-source-view", !!candidate && view === "source");
    this.root.classList.toggle("ec-event-view", !!candidate && view === "event");
    const coordinate=this.root.querySelector("[data-scene-coordinate]");if(coordinate&&candidate)coordinate.textContent=view==="event"?"THE SOCIAL GARDEN":"SOURCE MODEL";
    if (candidate) {
      this.root.querySelector("[data-venue-source-name]").textContent = candidate.source;
      this.root.querySelector("[data-venue-provenance]").textContent = candidate.id.startsWith("venue-ab-") ? "AB 两份源文件版本 · A / B 边界尚未确认" : "C 地块文件包 · 转换模型预览";
      this.root.querySelector("[data-venue-layer-note]").textContent = view === "source" ? "仅查看转换后的原始建筑，拖动环看、滚轮缩放。" : "自由探索 · 点选人物，开始一次相遇";
      context.querySelectorAll("[data-action=venue-view]").forEach(button => {
        const active = button.dataset.id === view;
        button.setAttribute("aria-pressed", String(active));
        button.classList.toggle("is-active", active);
        button.disabled = button.dataset.id === "event" && !eventReady;
        if (button.dataset.id === "event") button.title = eventReady ? "查看人物和活动点位叠加" : "活动坐标校准完成后可用";
      });
    }
    const labels = candidate ? { overview:"外景", arrival:"入口", courtyard:view==="event"?"会客花园":"侧景", aerial:"俯瞰" } : CAMERA_LABELS;
    this.root.querySelectorAll(".ec-camera-dock button").forEach((button,index) => { button.innerHTML = `<span class="ec-camera-number">0${index+1}</span>${labels[button.dataset.id]}`; });
    const hint = this.root.querySelector("[data-world-hint]");
    if (hint) hint.textContent = candidate && view === "source" ? "拖动环看 · 滚轮缩放" : "拖动环看 · 滚轮缩放 · 点选人物";
  }
  setCameraSelection(id) {
    this.selectedCamera = ({hero:"overview",garden:"courtyard"})[id] || id;
    this.root.querySelectorAll(".ec-camera-dock button").forEach(button => { const active = button.dataset.id === this.selectedCamera; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
  }
  setBusy(text) {
    const busy = this.root.querySelector(".ec-busy");
    busy.hidden = !text;
    busy.querySelector("[data-busy-label]").textContent = text || "";
  }
  hideChrome(hidden) { this.root.classList.toggle("ec-cinema-mode", !!hidden); if (hidden) this.closePanel(); }
  toast(text) {
    const stack = this.root.querySelector(".ec-toast-stack");
    const element = document.createElement("div");
    element.className = "ec-toast";
    element.textContent = String(text);
    stack.append(element);
    while (stack.children.length > 3) stack.firstElementChild.remove();
    setTimeout(() => { element.classList.add("is-leaving"); setTimeout(() => element.remove(), 240); }, 4600);
  }
  setSelectedPerson(person) {
    if (!person) return;
    this.selectedPerson = person;
    this.openPanel("person");
    this.renderPerson(person);
  }
  openPanel(kind) {
    if (!this.panel) this.lastFocus = document.activeElement;
    this.panelRevision = (this.panelRevision || 0) + 1;
    this.panel = kind;
    this.root.querySelector(".ec-panel-layer").hidden = false;
    this.root.classList.add("ec-has-panel");
    this.root.querySelector(".ec-panel").classList.toggle("ec-panel-wide", kind === "scenes");
  }
  closePanel() {
    this.panel = null;
    this.panelRevision = (this.panelRevision || 0) + 1;
    this.root.querySelector(".ec-panel-layer").hidden = true;
    this.root.classList.remove("ec-has-panel");
    if (this.lastFocus?.isConnected && typeof this.lastFocus.focus === "function") this.lastFocus.focus({ preventScroll: true });
  }
  panelHeader(kicker, title, subtitle = "") {
    return `<div class="ec-panel-header"><div><p class="ec-eyebrow">${esc(kicker)}</p><h1 id="ec-panel-title">${esc(title)}</h1>${subtitle ? `<p class="ec-panel-subtitle">${esc(subtitle)}</p>` : ""}</div><button class="ec-close" type="button" data-action="close" aria-label="关闭面板">${icon("close")}</button></div>`;
  }
  render(html, focus = true) {
    const panel = this.root.querySelector(".ec-panel");
    panel.innerHTML = html;
    if (focus) requestAnimationFrame(() => panel.focus({ preventScroll: true }));
  }
  async run(callback, ...args) {
    try { return await this.callbacks[callback](...args); }
    catch (error) { this.toast(error?.message || "操作暂未完成，请重试"); }
  }
  async onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action, id = button.dataset.id;
    if (action === "close") return this.closePanel();
    if (action === "camera") {
      this.selectedCamera = id;
      this.root.querySelectorAll(".ec-camera-dock button").forEach(b => {
        const active = b.dataset.id === id; b.classList.toggle("is-active", active); b.setAttribute("aria-pressed", String(active));
      });
      return this.run("onCamera", id);
    }
    if (action === "tour") { this.closePanel(); return this.run("onTour"); }
    if (action === "showcase") { this.closePanel(); return this.run("onShowcase"); }
    if (action === "sound") {
      this.soundEnabled = !this.soundEnabled;
      button.setAttribute("aria-pressed", String(this.soundEnabled));
      button.setAttribute("aria-label", this.soundEnabled ? "关闭环境声音" : "开启环境声音");
      button.innerHTML = icon(this.soundEnabled ? "sound" : "mute") + "<span>声音</span>";
      button.classList.toggle("is-active", this.soundEnabled);
      return this.run("onSound", this.soundEnabled);
    }
    if (action === "join") {
      if (this.me?.attendee) return this.setSelectedPerson(this.me.attendee);
      return this.openOnboarding();
    }
    if (action === "edit-profile") return this.openOnboarding();
    if (action === "scenes") return this.openScenePanel();
    if (action === "venue") return this.loadVenue(id, button);
    if (action === "venue-view") return this.run("onView", id);
    if (action === "scene") {
      this.sceneId = id;
      this.closePanel();
      return this.run("onScene", id);
    }
    if (action === "matches") return this.openMatches();
    if (action === "demo") return this.openDemoPanel();
    if (action === "inbox") return this.openInbox();
    if (action === "activity") return this.openActivity();
    if (action === "checkpoint") return this.run("onActivityCheckpoint", id);
    if (action === "select-person") {
      const person = this.snapshot?.attendees.find(a => a.id === id);
      if (person) { this.setSelectedPerson(person); return this.run("onSelectPerson", person); }
    }
    if (action === "encounter") return this.requestEncounter(id, button);
    if (action === "confirm") return this.confirmEncounter(id, button);
    if (action === "checkin") return this.checkin(id, button);
    if (action === "locate") { this.closePanel(); return this.run("onSelectPerson", this.selectedPerson); }
    if (action === "copy-link") {
      try { await navigator.clipboard.writeText(button.dataset.url); this.toast("演示入口已复制"); }
      catch { this.toast("可长按下方入口链接复制"); }
    }
    if (action === "save-manifest" || action === "export-manifest") return this.saveManifest(action === "export-manifest");
    if (action === "apply-manifest") return this.applyManifest(button);
    if (action === "clear-scene-file") { this.sceneFile = null; this.openScenePanel(); return; }
    if (action === "reset-manifest") {
      this.sceneManifest = defaultManifest(this.sceneManifest.type === "splat" ? "splat" : "glb");
      this.openScenePanel();
    }
    if (action === "sync-manifest") {
      try { this.readManifest(); this.openScenePanel(); this.toast("JSON 配置已同步到调节器"); }
      catch (error) { this.sceneError(error.message); }
    }
  }
  onKey(event) {
    if (!this.panel) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.closePanel(); return; }
    if (event.key === "Tab") {
      const focusables = [...this.root.querySelector(".ec-panel").querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex="0"]')].filter(e => !e.hidden && e.offsetParent);
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === this.root.querySelector(".ec-panel"))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  openOnboarding() {
    const params = new URL(location.href).searchParams;
    const secondIdentity = (params.get("persona") === "02" || params.get("badge") === "demo-visitor-02");
    const values = this.me?.attendee || (secondIdentity ? { name: "周澈", role: "品牌设计师", offer: "品牌设计、用户访谈", need: "AI 产品研发、快速原型", category: "founder", avatarColor: COLORS[1] } : INITIAL);
    const badgeId = params.get("badge") || "";
    const code = params.get("code") || "";
    this.openPanel("join");
    this.render(this.panelHeader("YOUR DIGITAL PRESENCE", this.me?.attendee ? "更新我的分身" : "让你，出现在这里", "一次轻触，从线下的相遇走进同一个世界。") +
      `<form class="ec-form" data-form="join">
        <div class="ec-profile-preview"><div class="ec-avatar-figure" style="--avatar:${color(values.avatarColor)}"><i class="ec-avatar-head"></i><i class="ec-avatar-body"></i><i class="ec-avatar-leg l"></i><i class="ec-avatar-leg r"></i></div><div><span class="ec-tag">风格化演示分身</span><p>以你的意愿和兴趣<br>开启第一场对话</p></div></div>
        ${badgeId ? `<div class="ec-notice ec-notice-soft">${icon("nfc")}<span>已识别演示入场卡。领取仍需激活凭据，公开链接不用于证明真实身份。</span></div>` : ""}
        <div class="ec-two-cols"><label>昵称<input name="name" required maxlength="24" autocomplete="off" value="${esc(values.name)}" placeholder="你的名字"></label><label>我的身份<input name="role" required maxlength="60" value="${esc(values.role)}" placeholder="例：产品创始人"></label></div>
        <div class="ec-two-cols"><label>活动身份<select name="category">${Object.entries(CATEGORY_LABELS).map(([id,label]) => `<option value="${id}" ${values.category === id ? "selected" : ""}>${label}</option>`).join("")}</select><small>手环颜色由活动身份自动匹配</small></label><label>机构 / 单位（选填）<input name="organization" maxlength="80" value="${esc(values.organization || "")}" placeholder="可不填写"></label></div>
        <label>一句话介绍（选填）<textarea name="bio" maxlength="160" rows="2" placeholder="让别人更快了解你">${esc(values.bio || "")}</textarea></label>
        <label>联系入口（选填）<input name="contact" maxlength="120" value="${esc(values.contact || "")}" placeholder="邮箱、主页或社交账号"></label>
        <label class="ec-consent ec-optional"><input type="checkbox" name="publicContact" ${values.publicContact ? "checked" : ""}><span>我愿意在公开名片中展示联系入口（可随时关闭）</span></label>
        <label>我能提供<textarea name="offer" required maxlength="160" rows="2" placeholder="技能、资源，或你愿意分享的经验">${esc(values.offer)}</textarea></label>
        <label>我想认识<textarea name="need" required maxlength="160" rows="2" placeholder="希望遇见的伙伴，或想一起解决的问题">${esc(values.need)}</textarea></label>
        <fieldset class="ec-colors"><legend>选择分身色彩</legend>${COLORS.map(c => `<label style="--swatch:${c}"><input type="radio" name="avatarColor" value="${c}" ${c === color(values.avatarColor) ? "checked" : ""}><span aria-label="${c}">${icon("check")}</span></label>`).join("")}</fieldset>
        <input type="hidden" name="badgeId" value="${esc(badgeId)}"><input type="hidden" name="activationCode" value="${esc(code)}">
        <label class="ec-consent"><input type="checkbox" name="consent" required ${this.me?.attendee ? "checked" : ""}><span>我同意在本活动中公开展示以上资料，用于分身名片、供需推荐和相遇连接。</span></label>
        <p class="ec-field-note">当前为演示活动，可使用虚构昵称。分身为风格化形象；不会采集照片、声音或私密资料。</p>
        <div class="ec-form-error" role="alert" hidden></div>
        <button type="submit" class="ec-primary ec-full">${this.me?.attendee ? "保存我的分身" : "进入这场相遇"}${icon("arrow")}</button>
      </form>`);
  }
  async onSubmit(event) {
    const form = event.target;
    if (!form.matches('[data-form="join"]')) return;
    event.preventDefault();
    if (this.joinPending || !form.reportValidity()) return;
    const panelRevision = this.panelRevision;
    this.joinPending = true;
    const data = Object.fromEntries(new FormData(form));
    data.consent = form.elements.consent.checked;
    data.publicContact = form.elements.publicContact?.checked === true;
    for (const field of ["organization", "contact", "bio"]) if (!data[field]) delete data[field];
    if (!data.badgeId) { delete data.badgeId; delete data.activationCode; }
    const submit = form.querySelector('[type="submit"]'), errorBox = form.querySelector(".ec-form-error");
    submit.disabled = true; errorBox.hidden = true;
    try {
      const result = await this.client.join(data);
      this.setMe(this.client.me || { attendee: result.attendee, encounters: [] });
      this.toast(result.resumed ? "分身资料已更新" : result.attendee.name + "，欢迎来到白庭");
      if (this.panel === "join" && this.panelRevision === panelRevision) {
        this.closePanel();
        await this.run("onSelectPerson", result.attendee);
        await this.run("onCamera", "arrival");
      }
    } catch (error) {
      if (form.isConnected) { errorBox.textContent = error.message || "领取暂未完成，请重试"; errorBox.hidden = false; }
      else this.toast(error.message || "领取暂未完成，请重试");
    } finally { this.joinPending = false; submit.disabled = false; }
  }
  renderPerson(person) {
    const own = this.me?.attendee?.id === person.id;
    const encounter = this.me?.encounters?.find(c => c.attendeeIds?.includes(person.id) || c.fromId === person.id || c.toId === person.id);
    const action = own ? `<button class="ec-primary ec-full" data-action="matches">${icon("spark")}发现值得认识的人${icon("arrow")}</button><button class="ec-secondary ec-full" data-action="edit-profile">编辑我的名片</button>` :
      encounter?.status === "confirmed" ? `<div class="ec-confirmed">${icon("check")}你们已确认这次相遇</div>` :
      encounter?.canConfirm ? `<button class="ec-primary ec-full" data-action="confirm" data-id="${esc(encounter.id)}">${icon("link")}确认这次相遇${icon("arrow")}</button>` :
      encounter ? '<div class="ec-pending">相遇请求已送出，等待对方确认</div>' :
      `<button class="ec-primary ec-full" data-action="encounter" data-id="${esc(person.id)}">${icon("link")}发起一次相遇${icon("arrow")}</button>`;
    this.render(this.panelHeader(own ? "MY DIGITAL PRESENCE" : "A NEW CONNECTION", own ? "这是你的名片" : "每个人，都是一个入口") +
      `<div class="ec-person-header"><div class="ec-person-avatar" style="--avatar:${color(person.avatarColor)}">${esc(person.name?.slice(0,1))}<span></span></div><div><h2>${esc(person.name)}</h2><p>${esc(person.role)}</p><span class="ec-tag" style="border-color:${color(person.wristbandColor)}55">${esc(CATEGORY_LABELS[person.category] || "其他来宾")} · ${person.source === "curated-demo" ? "虚构演示人物" : "演示活动分身"}</span></div></div>
      <div class="ec-profile-fields"><section><span>我能提供</span><p>${esc(person.offer)}</p></section><section><span>我想认识</span><p>${esc(person.need)}</p></section>${person.organization ? `<section><span>机构 / 单位</span><p>${esc(person.organization)}</p></section>` : ""}${person.bio ? `<section><span>一句话介绍</span><p>${esc(person.bio)}</p></section>` : ""}${person.publicContact && person.contact ? `<section><span>联系入口</span><p>${esc(person.contact)}</p></section>` : ""}</div>
      <div class="ec-panel-actions">${action}<button class="ec-text-button" data-action="locate">${icon("pin")}在园区中定位</button></div>
      ${person.source === "curated-demo" && !own ? '<p class="ec-field-note">此人物为虚构演示资料，无法代替本人确认相遇。可使用「双端体验」让另一台设备真实接收并确认。</p>' : '<p class="ec-field-note">只有双方确认后，关系才会点亮在共同的世界中。</p>'}
      <div class="ec-person-bottom"><button data-action="inbox">${icon("inbox")}我的相遇</button><button data-action="demo">${icon("nfc")}双端体验</button></div>`, false);
  }
  async requestEncounter(peerId, button) {
    if (this.encounterPending) return;
    if (!this.me?.attendee) { this.toast("先领取你的分身，再发起相遇"); return this.openOnboarding(); }
    this.encounterPending = true; button.disabled = true;
    try {
      const result = await this.client.encounter(peerId);
      this.setMe(this.client.me);
      this.toast(result.encounter.status === "confirmed" ? "你们已经确认相遇" : "相遇请求已发送，等待对方确认");
      if (this.selectedPerson && this.panel === "person") this.renderPerson(this.selectedPerson);
    } catch (error) { this.toast(error.message); } finally { this.encounterPending = false; button.disabled = false; }
  }
  async confirmEncounter(id, button) {
    if (this.confirmPending) return;
    this.confirmPending = true; button.disabled = true;
    try {
      await this.client.confirm(id);
      this.setMe(this.client.me);
      this.toast("相遇已被双方确认，连接正在世界中点亮");
    } catch (error) { this.toast(error.message); } finally { this.confirmPending = false; button.disabled = false; }
  }
  async openMatches() {
    if (!this.me?.attendee) return this.openOnboarding();
    this.openPanel("matches");
    const revision = this.panelRevision = (this.panelRevision || 0) + 1;
    this.render(this.panelHeader("MEANINGFUL ENCOUNTERS", "下一位，值得认识的人", "从你们主动分享的供给与需求出发。") + '<div class="ec-panel-loading"><span class="ec-spinner"></span>正在整理相遇线索</div>');
    try {
      const result = await this.client.matches();
      if (this.panel !== "matches" || this.panelRevision !== revision) return;
      this.render(this.panelHeader("MEANINGFUL ENCOUNTERS", "下一位，值得认识的人", "从你们主动分享的供给与需求出发。") +
        `<div class="ec-match-list">${result.matches.map((m,i) => `<article class="ec-match-card"><div class="ec-match-top"><span class="ec-match-index">0${i+1}</span><button data-action="select-person" data-id="${esc(m.attendee.id)}"><span class="ec-mini-avatar" style="--avatar:${color(m.attendee.avatarColor)}">${esc(m.attendee.name.slice(0,1))}</span><span><strong>${esc(m.attendee.name)}</strong><small>${esc(m.attendee.role)}</small></span>${icon("arrow")}</button></div><div class="ec-match-reasons">${m.reasons.map(r => `<p>${icon("spark")}${esc(r)}</p>`).join("")}</div><details class="ec-match-evidence"><summary>为什么推荐这次相遇</summary>${m.evidence.map(e => `<p><b>${esc(e.topic)}</b><span>你的${e.yourField === "need" ? "需求" : "供给"}：${esc(e.yourText)}</span><span>TA 的${e.peerField === "offer" ? "供给" : "需求"}：${esc(e.peerText)}</span></p>`).join("")}</details></article>`).join("") || '<div class="ec-empty-state">暂时没有明确重合的供需。<br>补充名片后，新的相遇线索会出现在这里。</div>'}</div>
        <div class="ec-notice ec-notice-soft">${icon("spark")}<span>当前推荐来自公开供需标签的确定性匹配，未使用大模型。推荐理由可逐条核对，分数不代表合作概率。</span></div><button class="ec-secondary ec-full" data-action="edit-profile">调整我的供给与需求</button>`);
    } catch (error) {
      if (this.panel === "matches" && this.panelRevision === revision) this.render(this.panelHeader("MEANINGFUL ENCOUNTERS", "相遇线索暂未就绪") + `<p class="ec-empty-state">${esc(error.message)}</p><button class="ec-secondary ec-full" data-action="matches">重新获取</button>`);
    }
  }
  async openActivity(focusId = null) {
    this.openPanel("activity");
    this.activityFocusId = focusId || null;
    this.activity = this.snapshot?.activity || this.activity || { checkpoints: [] };
    const mine = new Set((this.me?.activity?.checkins || []).map(item => item.checkpointId));
    const renderActivity = () => {
      const points = this.me?.activity?.points || 0;
      const checkpoints = this.activity?.checkpoints || [];
      this.render(this.panelHeader("ACTIVITY PASSPORT", "把现场，变成一条可见的路径", "点击场景里的标记可快速定位；每个点位只计一次，积分只用于本次活动互动。") +
        `<div class="ec-activity-total"><div><span>我的积分</span><strong>${points}</strong><small>/ ${checkpoints.reduce((sum, item) => sum + item.points, 0)} 可得</small></div><div><span>已完成</span><strong>${mine.size}</strong><small>/ ${checkpoints.length} 点位</small></div></div>` +
        `<div class="ec-checkpoint-list">${checkpoints.map(item => { const done = mine.has(item.id); return `<article class="ec-checkpoint-card ${done ? "is-done" : ""}" data-checkpoint-id="${esc(item.id)}"><div class="ec-checkpoint-index">${done ? icon("check") : icon("flag")}</div><div class="ec-checkpoint-copy"><strong>${esc(item.label)}</strong><small>${esc(item.partner)} · ${item.points} 分</small><p>${esc(item.description)}</p></div>${this.me?.attendee ? `<button class="${done ? "ec-checkpoint-done" : "ec-small-primary"}" data-action="checkin" data-id="${esc(item.id)}" ${done ? "disabled" : ""}>${done ? "已完成" : "打卡"}</button>` : ""}</article>`; }).join("") || `<div class="ec-empty-state">活动点位将在这里出现。</div>`}</div>` +
        `<div class="ec-notice ec-notice-soft">${icon("nfc")}<span>现场可用 NFC 触碰完成同一动作；当前演示也支持网页按钮和二维码。重复触碰不会重复加分。</span></div>` +
        (!this.me?.attendee ? `<button class="ec-primary ec-full" data-action="join">先领取分身，再开始打卡${icon("arrow")}</button>` : ""));
    };
    renderActivity();
    if (this.activityFocusId) {
      requestAnimationFrame(() => {
        const card = this.root.querySelector(`[data-checkpoint-id="${CSS.escape(this.activityFocusId)}"]`);
        if (card) { card.classList.add("is-focus"); card.scrollIntoView({ block: "center", behavior: "smooth" }); setTimeout(() => card.classList.remove("is-focus"), 1800); }
      });
    }
    if (this.me?.attendee) {
      try { const result = await this.client.activity(); this.activity = result; } catch {}
      if (this.panel === "activity") { renderActivity(); if (this.activityFocusId) { const card = this.root.querySelector(`[data-checkpoint-id="${CSS.escape(this.activityFocusId)}"]`); if (card) { card.classList.add("is-focus"); card.scrollIntoView({ block: "center", behavior: "smooth" }); } } }
    }
  }
  async checkin(checkpointId, button) {
    if (!this.me?.attendee || button.disabled) return this.openOnboarding();
    button.disabled = true;
    try { const result = await this.client.checkin(checkpointId); this.activity = result.snapshot?.activity || this.activity; this.me = this.client.me; this.toast(result.idempotent ? "这个点位已经完成" : `打卡成功，获得 ${result.checkin.points} 分`); if (this.panel === "activity") this.openActivity(); }
    catch (error) { button.disabled = false; this.toast(error.message || "打卡暂未完成"); }
  }
  async openInbox() {
    if (!this.me?.attendee) return this.openOnboarding();
    this.openPanel("inbox");
    this.renderInbox();
    await this.client.refreshMe();
    if (this.panel === "inbox") { this.me = this.client.me; this.renderInbox(); }
  }
  renderInbox() {
    const encounters = this.me?.encounters || [];
    const pending = encounters.filter(c => c.canConfirm), confirmed = encounters.filter(c => c.status === "confirmed"), outgoing = encounters.filter(c => c.status === "pending" && !c.canConfirm);
    const rows = (items, kind) => items.map(c => {
      const peerId = c.fromId === this.me.attendee.id ? c.toId : c.fromId;
      const peer = this.snapshot?.attendees.find(a => a.id === peerId);
      return `<article class="ec-inbox-card"><button class="ec-inbox-person" data-action="select-person" data-id="${esc(peerId)}"><span class="ec-mini-avatar" style="--avatar:${color(peer?.avatarColor)}">${esc(peer?.name?.slice(0,1) || "友")}</span><span><strong>${esc(peer?.name || "一位参会者")}</strong><small>${esc(peer?.role || "演示分身")}</small></span></button>${kind === "incoming" ? `<button class="ec-small-primary" data-action="confirm" data-id="${esc(c.id)}">确认相遇${icon("check")}</button>` : `<span class="ec-encounter-state ${kind === "confirmed" ? "is-confirmed" : ""}">${kind === "confirmed" ? icon("check") + "已确认" : "等待确认"}</span>`}</article>`;
    }).join("");
    this.render(this.panelHeader("OUR CONNECTIONS", "相遇，留下回响", "每条连接，都由两个人共同确认。") +
      `<div class="ec-inbox-groups">${pending.length ? '<section><h2>等待你的确认 <span>' + pending.length + '</span></h2>' + rows(pending, "incoming") + '</section>' : ""}${confirmed.length ? '<section><h2>已点亮的连接 <span>' + confirmed.length + '</span></h2>' + rows(confirmed, "confirmed") + '</section>' : ""}${outgoing.length ? '<section><h2>我发出的邀请 <span>' + outgoing.length + '</span></h2>' + rows(outgoing, "outgoing") + '</section>' : ""}${!encounters.length ? '<div class="ec-empty-state">' + icon("link") + '<p>第一条连接，正在等你开启。</p><span>在园区点选人物，或从供需推荐开始。</span></div>' : ""}</div><button class="ec-primary ec-full" data-action="matches">${icon("spark")}发现值得认识的人${icon("arrow")}</button><p class="ec-field-note">待确认请求仅对参与双方可见。正式确认的连接将出现在本活动的公共世界中。</p>`, false);
  }
  demoUrl(serial = "01", stage = false) {
    const url = new URL(document.baseURI);
    const current = new URL(this.root.ownerDocument.location.href);
    url.search = ""; url.hash = "";
    for (const key of ["sceneManifest", "scene", "venue", "view", "camera"]) if (current.searchParams.has(key)) url.searchParams.set(key, current.searchParams.get(key));
    if (stage) url.searchParams.set("mode", "stage");
    else { url.searchParams.set("entry", "nfc"); if (serial) url.searchParams.set("persona", serial); }
    return url.href;
  }
  tabDemoUrl() {
    const url = new URL(this.demoUrl("02"));
    url.searchParams.set("demoSession", "tab");
    return url.href;
  }
  async renderStageQr() {
    const entry = new URL(this.demoUrl(null));
    const canvas = this.root.querySelector("[data-stage-qr]");
    if (canvas) try { await QRCode.toCanvas(canvas, entry.href, { width: 104, margin: 1, color: { dark: "#29483cff", light: "#ffffffff" } }); } catch {}
  }
  openDemoPanel() {
    this.openPanel("demo");
    const first = this.demoUrl("01"), second = this.demoUrl("02"), stage = this.demoUrl("01", true), tabDemo = this.tabDemoUrl();
    this.render(this.panelHeader("FROM A TAP TO A WORLD", "轻触一下，进入同一个世界", "手机负责入场，大屏见证每一位来宾的出现。") +
      `<div class="ec-demo-qr"><canvas data-demo-qr></canvas><div><span class="ec-tag">第一设备入口</span><h2>手机扫码<br>领取你的分身</h2><p>也可将同一入口写入 NFC 标签。</p></div></div>
      <ol class="ec-demo-steps"><li><span>01</span><div><strong>手机领取</strong><p>填写并确认公开资料，分身即时出现在园区。</p></div></li><li><span>02</span><div><strong>另一台设备加入</strong><p>打开第二设备入口，点选对方发起相遇。</p></div></li><li><span>03</span><div><strong>双方确认，点亮连接</strong><p>回到第一台设备确认请求，大屏同步展示关系。</p></div></li></ol>
      <div class="ec-demo-links"><a href="${esc(first)}" target="_blank" rel="noopener">打开第一设备入口${icon("external")}</a><a href="${esc(second)}" target="_blank" rel="noopener">打开第二设备入口${icon("external")}</a><a href="${esc(stage)}" target="_blank" rel="noopener">打开大屏展示模式${icon("external")}</a><a href="${esc(tabDemo)}" target="_blank" rel="noopener">同机演示：独立访客窗口${icon("external")}</a></div>
      <button class="ec-secondary ec-full" data-action="copy-link" data-url="${esc(first)}">复制演示入口${icon("link")}</button>
      <div class="ec-notice">${icon("nfc")}<span>真实双端体验可用两部手机；只有一台电脑时，请用「独立访客窗口」领取第二位来宾，身份仅保存在该窗口，关闭后需重新领取。普通标签页仍共享当前身份。演示入口允许创建虚构身份，仅用于体验，不证明持卡人身份。真实 NFC 硬件读写、现场网络与身份领取需在活动前实机联调。</span></div>`);
    const canvas = this.root.querySelector("[data-demo-qr]");
    QRCode.toCanvas(canvas, first, { width: 156, margin: 1, color: { dark: "#29483cff", light: "#ffffffff" } }).catch(() => this.toast("二维码暂未生成，可使用下方入口链接"));
  }
  async loadVenue(id, button) {
    if (this.venuePending || !venueById(id)) return;
    this.venuePending = true;
    const revision = this.panelRevision;
    button.disabled = true;
    const errorBox = this.root.querySelector("[data-venue-error]");
    if (errorBox) errorBox.hidden = true;
    try {
      await this.callbacks.onVenue(id);
      if (this.panel === "scenes" && revision === this.panelRevision) this.closePanel();
    } catch (error) {
      if (errorBox?.isConnected) { errorBox.textContent = "未能载入源模型：" + error.message + "。当前场景保留，可重试或选择另一份源文件。"; errorBox.hidden = false; }
      else this.toast("源模型加载未完成：" + error.message);
    } finally { this.venuePending = false; button.disabled = false; }
  }
  venueCardsMarkup() {
    return `<section class="ec-venue-picker" aria-label="提供的真实场地模型"><div class="ec-section-heading"><h2>你提供的场地模型</h2><span>真实文件 · 可旋转查看</span></div><p class="ec-venue-picker-intro">先看建筑本身，再切换活动布置。AB 下两项为源文件版本，不能据此划分 A / B 地块。</p><div class="ec-venue-cards">${VENUE_CANDIDATES.map(candidate => `<article class="ec-venue-card ${this.activeVenueId === candidate.id ? "is-selected" : ""}"><button type="button" data-action="venue" data-id="${candidate.id}" aria-label="加载 ${esc(candidate.name)}"><span class="ec-venue-thumbnail"><img data-venue-thumbnail src="${esc(candidate.thumbnail)}" alt="${esc(candidate.name)}的真实转换模型截图" loading="lazy"><span class="ec-venue-thumbnail-unavailable">缩略图暂不可用</span></span><span class="ec-venue-card-copy"><strong>${esc(candidate.name)}</strong><small>${esc(candidate.source)}</small><span>${this.activeVenueId === candidate.id ? "当前模型" : "打开 3D 外景"} ${icon("arrow")}</span></span></button><a class="ec-venue-direct" href="${esc(venueUrl(candidate.id,{baseUrl:document.baseURI}))}" target="_blank" rel="noopener">单独打开 ${icon("external")}</a></article>`).join("")}</div><div class="ec-form-error" data-venue-error role="alert" hidden></div><p class="ec-venue-boundary-note">缩略图来自转换模型截图。活动点位、人物及关系线可独立开关；它们不属于原始建筑文件。</p></section>`;
  }
  openScenePanel() {
    this.openPanel("scenes");
    this.root.querySelector(".ec-panel").scrollTop = 0;
    const m = this.sceneManifest;
    this.render(this.panelHeader("A WORLD WITHOUT A FIXED SHELL", "换一个世界，继续相遇", "人物、名片与已确认的关系保留，场景可以自由替换。") +
      `${this.venueCardsMarkup()}<div class="ec-section-heading"><h2>概念演示场景</h2><span>与提供的场地模型分开</span></div><div class="ec-scene-cards">${listSceneDefinitions().map(definition => `<button class="ec-scene-card ${this.sceneId === definition.id ? "is-selected" : ""}" data-action="scene" data-id="${esc(definition.id)}"><div class="ec-scene-art ${esc(definition.previewClass)}"><i></i><i></i><i></i><b></b></div><span><strong>${esc(definition.displayName)}</strong><small>${esc(definition.helper)}</small></span>${icon("arrow")}</button>`).join("")}</div>
      <div class="ec-section-heading"><h2>导入你的场景</h2><span>GLB / GLTF / SPZ / PLY / SPLAT</span></div>
      <label class="ec-upload-area"><input type="file" accept=".glb,.gltf,.spz,.ply,.splat" data-scene-file><span>${icon("upload")}</span><strong>${this.sceneFile ? esc(this.sceneFile.name) : "选择模型或 Marble 导出文件"}</strong><small>文件仅在本地读取，不会上传到活动服务</small></label>
      ${this.sceneFile ? '<button class="ec-text-button ec-clear-file" type="button" data-action="clear-scene-file">移除当前文件，改用模型链接</button>' : ""}
      <div class="ec-form ec-import-form"><div class="ec-two-cols"><label>显示名称<input data-manifest-name value="${esc(m.name)}" maxlength="60"></label><label>格式<select data-manifest-type><option value="glb" ${m.type === "glb" ? "selected" : ""}>GLB / GLTF 网格</option><option value="splat" ${m.type === "splat" ? "selected" : ""}>Gaussian Splat / SPZ</option></select></label></div>
      <label>或使用模型链接<input data-manifest-url type="url" placeholder="https://… / model.glb" value="${esc(m.url || "")}"><small>链接须允许跨域读取；远程模型直接从该地址下载。</small></label>
      <div class="ec-transform-grid"><label>整体缩放<input data-transform="scale" type="number" min="0.0001" max="1000" step="0.1" value="${m.scale}"></label><label>地面高度<input data-transform="groundY" type="number" step="0.1" value="${m.groundY ?? 0}"></label></div>
      <div class="ec-vector-label"><span>旋转角度</span><small>单位 ° · Marble 常用 X = 180</small></div><div class="ec-vector-controls">${m.rotation.map((v,i) => `<label><span>${"XYZ"[i]}</span><input type="number" step="1" data-transform="rotation" data-axis="${i}" value="${v}"></label>`).join("")}</div>
      <div class="ec-vector-label"><span>位置偏移</span><small>世界坐标</small></div><div class="ec-vector-controls">${m.position.map((v,i) => `<label><span>${"XYZ"[i]}</span><input type="number" step="0.1" data-transform="position" data-axis="${i}" value="${v}"></label>`).join("")}</div>
      <details class="ec-manifest-details"><summary>高级配置 · 边界、出生点与交互锚点</summary><textarea data-manifest-json rows="12" spellcheck="false" aria-label="场景 JSON 配置">${esc(JSON.stringify(m, null, 2))}</textarea><button type="button" class="ec-text-button" data-action="sync-manifest">${icon("refresh")}将 JSON 同步到调节器</button><p class="ec-field-note">旋转以角度填写。模型只负责视觉；groundY 与 bounds 定义活动平面和边界，可独立校准。导入文件未包含在导出的 JSON 中。</p></details>
      <div class="ec-form-error" data-scene-error role="alert" hidden></div><button class="ec-primary ec-full" type="button" data-action="apply-manifest">${icon("scene")}应用到当前世界${icon("arrow")}</button><div class="ec-two-cols ec-import-actions"><button class="ec-secondary" type="button" data-action="save-manifest">保存本机配置</button><button class="ec-secondary" type="button" data-action="export-manifest">${icon("download")}导出 JSON</button></div><button class="ec-text-button ec-reset" type="button" data-action="reset-manifest">重置调节参数</button></div>`);
  }
  onChange(event) {
    if (event.target.matches('[name="avatarColor"]')) {
      const avatar = this.root.querySelector(".ec-avatar-figure");
      if (avatar) avatar.style.setProperty("--avatar", color(event.target.value));
    }
    if (event.target.matches("[data-scene-file]")) {
      const file = event.target.files?.[0];
      if (!file) return;
      this.sceneFile = file;
      const type = /\.(spz|ply|splat)$/i.test(file.name) ? "splat" : "glb";
      this.sceneManifest = { ...defaultManifest(type), name: file.name.replace(/\.[^.]+$/, ""), url: "" };
      this.openScenePanel();
    }
    if (event.target.matches("[data-manifest-type]")) {
      this.sceneManifest.type = event.target.value;
      this.sceneManifest.rotation = event.target.value === "splat" ? [180,0,0] : [0,0,0];
      this.openScenePanel();
    }
    if (event.target.matches("[data-manifest-name],[data-manifest-url]")) this.updateManifestFromControls();
  }
  updateManifestFromControls() {
    const panel = this.root.querySelector(".ec-panel");
    if (!panel.querySelector("[data-manifest-json]")) return;
    const m = { ...this.sceneManifest, position: [...this.sceneManifest.position], rotation: [...this.sceneManifest.rotation] };
    m.name = panel.querySelector("[data-manifest-name]").value;
    m.url = panel.querySelector("[data-manifest-url]").value.trim();
    m.type = panel.querySelector("[data-manifest-type]").value;
    panel.querySelectorAll("[data-transform]").forEach(input => {
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      if (input.dataset.axis !== undefined) m[input.dataset.transform][Number(input.dataset.axis)] = value;
      else m[input.dataset.transform] = value;
    });
    this.sceneManifest = m;
    panel.querySelector("[data-manifest-json]").value = JSON.stringify(m, null, 2);
  }
  readManifest() {
    const text = this.root.querySelector("[data-manifest-json]").value;
    this.sceneManifest = validateManifest(JSON.parse(text));
    return this.sceneManifest;
  }
  sceneError(message) {
    const error = this.root.querySelector("[data-scene-error]");
    if (error) { error.hidden = false; error.textContent = message; } else this.toast(message);
  }
  saveManifest(download) {
    try {
      const manifest = this.readManifest();
      localStorage.setItem("echo-campus-scene-manifest", JSON.stringify(manifest));
      if (download) {
        const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }));
        const a = document.createElement("a"); a.href = url; a.download = "echo-campus-scene.json"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.toast("场景配置已导出；本地模型请单独保留");
      } else this.toast("配置已保存到此浏览器；刷新后需重新选择本地模型");
    } catch (error) { this.sceneError(error.message); }
  }
  async applyManifest(button) {
    if (this.importPending) return;
    this.importPending = true;
    const panelRevision = this.panelRevision;
    button.disabled = true;
    try {
      const manifest = this.readManifest();
      if (!this.sceneFile && !manifest.url) throw new Error("请先选择本地模型文件，或填写可读取的模型链接");
      this.setBusy("正在把新的世界带到这里");
      await this.callbacks.onImport({ manifest, file: this.sceneFile });
      this.sceneId = "imported";
      this.setSceneLabel(manifest.name);
      try { localStorage.setItem("echo-campus-scene-manifest", JSON.stringify(manifest)); }
      catch { this.toast("场景已载入；此浏览器未能保存配置，可导出 JSON 保留"); }
      if (this.panel === "scenes" && this.panelRevision === panelRevision) this.closePanel();
      this.toast("场景已替换，相遇继续");
    } catch (error) { this.sceneError(error.message || "场景加载未完成"); }
    finally { this.importPending = false; this.setBusy(null); button.disabled = false; }
  }
  dispose() { this.disposed = true; clearTimeout(this.entryTimer); this.root.ownerDocument.removeEventListener("keydown", this.keyHandler); }
}
