import QRCode from "qrcode";
import { defaultManifest, validateManifest } from "../runtime/SceneManifest.js";
import { listSceneDefinitions } from "../runtime/SceneRegistry.js";
import { VENUE_CANDIDATES, venueById, venueUrl } from "../runtime/VenueCatalog.js";
import { PERSONAS, personaById, serialLabel } from "../shared/personas.mjs";
import { avatar, arrivalView, inboxView, matchesView, passportView, personView, personaCard, personaPickerView, profileFormView, stageView } from "./CourtViews.js";
import "./style.css";
import "./court.css";

const ICONS = {
  spark: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  tour: '<path d="m9 5 11 7-11 7V5Z"/>',
  scene: '<path d="m3 8 9-5 9 5-9 5-9-5Zm0 4 9 5 9-5M3 16l9 5 9-5"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 5 6m0-6-5 6"/>',
  link: '<path d="M10 13a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-5.5-5.8L11 7M14 11a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 5.5 5.8L13 17"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  nfc: '<path d="M4 8a12 12 0 0 1 16 0M7 11a8 8 0 0 1 10 0m-7 3a4 4 0 0 1 4 0"/><circle cx="12" cy="18" r="1"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 5H4v16h16v-6"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  stamp: '<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.4 2.4 4.6-4.8"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
};
const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.spark) + "</svg>";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const CATEGORIES = [["investor", "投资人"], ["founder", "创业者"], ["audience", "观众"], ["media", "媒体"], ["platform", "平台伙伴"], ["organizer", "主办方"], ["guest", "其他来宾"]];
const DEFAULT_CATEGORIES = CATEGORIES.map(([id, label]) => ({ id, label, wristbandColor: "#778879" }));
const INITIAL = { name: "", role: "", offer: "", need: "", category: "guest", bio: "", organization: "", contact: "" };
const CAMERA_LABELS = { overview: "全景", arrival: "入口", courtyard: "庭院", aerial: "俯瞰" };
const THEME_VARS = { ink: "--court-ink", paper: "--court-paper", accent: "--court-accent", glow: "--court-glow", sage: "--court-sage" };

export class AppUI {
  constructor({ client, onCamera = () => {}, onScene = () => {}, onImport = () => {}, onTour = () => {}, onSelectPerson = () => {}, onActivityCheckpoint = () => {}, onSound = () => {}, onShowcase = () => {}, onVenue = () => {}, onView = () => {}, onArrive = () => {}, onPartner = () => {}, onPersonaPreview = () => {} }) {
    this.client = client;
    this.callbacks = { onCamera, onScene, onImport, onTour, onSelectPerson, onActivityCheckpoint, onSound, onShowcase, onVenue, onView, onArrive, onPartner, onPersonaPreview };
    this.root = document.getElementById("ui");
    this.snapshot = null; this.me = null; this.activity = null; this.online = false; this.panel = null;
    this.selectedPerson = null; this.soundEnabled = false; this.selectedCamera = "overview";
    this.sceneId = "campus"; this.sceneLabel = "白庭校园"; this.sceneFile = null;
    const query = new URL(location.href).searchParams;
    this.stage = query.get("mode") === "stage";
    this.mobile = !!(globalThis.matchMedia?.("(pointer:coarse)").matches) || (globalThis.innerWidth || 1024) < 760;
    this.entryNfc = query.get("entry") === "nfc" || query.has("badge") || query.has("tag");
    this.tapTag = /^[A-Za-z0-9_-]{2,64}$/.test(query.get("tag") || "") ? query.get("tag") : null;
    this.tapSignature = this.tapTag && query.get("sig") ? { ts: Number(query.get("ts")), nonce: query.get("nonce") || "", sig: query.get("sig") || "" } : null;
    this.tapInfo = null;
    this.partnerOpen = !this.stage && (query.get("mode") === "partner" || query.get("view") === "source" || query.get("scope") === "building" || query.has("capture"));
    this.sceneManifest = defaultManifest("glb");
    try {
      const saved = localStorage.getItem("echo-campus-scene-manifest");
      if (saved) this.sceneManifest = validateManifest(JSON.parse(saved));
    } catch {}
    this.activeVenueId = null; this.venueView = "event"; this.venueEventReady = false;
    this.root.innerHTML = this.shell();
    this.root.classList.toggle("court-is-stage", this.stage);
    this.root.classList.toggle("court-is-mobile", this.mobile);
    this.root.classList.toggle("court-partner-open", this.partnerOpen);
    this.root.addEventListener("click", e => this.onClick(e));
    this.root.addEventListener("error", e => {
      if (e.target.matches?.("[data-venue-thumbnail]")) { e.target.hidden = true; e.target.parentElement.classList.add("is-unavailable"); }
      if (e.target.matches?.("[data-portrait]")) e.target.closest(".court-avatar,.court-persona-card,.court-pick-art")?.classList.add("is-missing");
    }, true);
    this.root.addEventListener("submit", e => this.onSubmit(e));
    this.root.addEventListener("change", e => this.onChange(e));
    this.root.addEventListener("input", e => {
      if (e.target.matches("[data-transform],[data-manifest-name],[data-manifest-url]")) this.updateManifestFromControls();
      if (e.target.matches("[data-topic-extra]")) this.syncTopicField(e.target.closest("form"), e.target.dataset.topicExtra);
    });
    this.keyHandler = e => this.onKey(e);
    document.addEventListener("keydown", this.keyHandler);
    this.syncChrome();
    if (this.stage) this.renderStage();
    if (this.entryNfc && !this.client?.token && !this.stage) this.openArrival();
  }
  shell() {
    return `<div class="ec-chrome court-chrome">
      <div class="court-hud" data-hud>
        <div class="court-hud-top">
          <button type="button" class="court-event-pill" data-action="camera" data-id="arrival" aria-label="回到庭院入口">
            <span class="ec-live-dot court-live-dot" data-live-dot></span>
            <span><strong data-event-name>相遇之庭</strong><small data-world-count>正在连接活动</small></span>
          </button>
          <div class="court-hud-actions">
            <button type="button" class="court-icon-btn" data-action="inbox" aria-label="我的相遇">${icon("heart")}<span class="court-badge" data-inbox-count hidden>0</span></button>
            <button type="button" class="court-icon-btn" data-action="activity" aria-label="相遇护照与积分">${icon("stamp")}<span class="court-badge court-badge-soft" data-activity-points hidden>0</span></button>
            <button type="button" class="court-icon-btn court-partner-toggle" data-action="partner" aria-label="展示控制台" aria-pressed="${this.partnerOpen}">${icon("sliders")}</button>
          </div>
        </div>
        <div class="court-hud-bottom">
          <button type="button" class="court-me" data-action="join"><span class="court-me-avatar" data-me-avatar>${icon("nfc")}</span><span><strong data-entry-label>领取我的分身</strong><small data-me-sub>碰一下，或点这里进入</small></span></button>
          <button type="button" class="court-discover" data-action="matches">${icon("spark")}<span>认识新朋友</span></button>
        </div>
      </div>
      <div class="court-partner" data-partner>
        <header class="ec-header">
          <button type="button" class="ec-brand" data-action="camera" data-id="overview" aria-label="Echo Campus 返回园区全景">
            <span class="ec-brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
            <span><strong>ECHO CAMPUS</strong><small>展示控制台 <b>·</b> 合作方视图</small></span>
          </button>
          <nav class="ec-tools" aria-label="展示工具">
            <button class="ec-tool ec-presentation" data-action="showcase" aria-label="播放合作展示流程">${icon("spark")}<span>演示</span></button>
            <button class="ec-tool" data-action="tour" aria-label="自动导览">${icon("tour")}<span>导览</span></button>
            <button class="ec-tool" data-action="scenes" aria-label="切换或导入场景">${icon("scene")}<span>场地</span></button>
            <button class="ec-tool ec-sound" data-action="sound" aria-label="开启环境声音" aria-pressed="false">${icon("mute")}<span>声音</span></button>
          </nav>
        </header>
        <div class="ec-scene-caption"><span class="ec-caption-line"></span><span data-scene-name>白庭校园</span><span class="ec-caption-coordinate" data-scene-coordinate>WHITE COURT</span></div>
        <aside class="ec-venue-context" data-venue-context hidden><div class="ec-venue-source"><span>提供模型 · 真实转换</span><strong data-venue-source-name></strong><small data-venue-provenance></small></div><div class="ec-venue-view" role="group" aria-label="场地显示层"><button type="button" data-action="venue-view" data-id="source" aria-pressed="false">源模型</button><button type="button" data-action="venue-view" data-id="event" aria-pressed="false">活动布置</button></div><nav class="ec-venue-view" data-campus-regions aria-label="园区分区" hidden style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:6px"><button type="button" data-action="camera" data-id="towers" aria-pressed="false">T1–3 塔楼</button><button type="button" data-action="camera" data-id="hub" aria-pressed="false">HUB 中庭</button><button type="button" data-action="camera" data-id="commercial" aria-pressed="false">C 地块</button></nav><button type="button" class="ec-primary ec-full" data-campus-return data-action="venue" data-id="venue-campus" hidden style="margin-top:8px;min-height:40px">查看完整园区 ${icon("arrow")}</button><p data-venue-layer-note></p></aside>
        <footer class="ec-footer">
          <nav class="ec-camera-dock" aria-label="园区视角">${Object.entries(CAMERA_LABELS).map(([id, label], i) => `<button type="button" data-action="camera" data-id="${id}" class="${i === 0 ? "is-active" : ""}" aria-pressed="${i === 0}"><span class="ec-camera-number">0${i + 1}</span>${label}</button>`).join("")}</nav>
        </footer>
        <button type="button" class="ec-demo-link" data-action="demo">NFC / 双端体验 ${icon("external")}</button>
      </div>
      <div class="ec-hover-card court-hover" data-hover-card hidden><span class="ec-hover-kicker" data-hover-kicker>点一下</span><strong data-hover-name></strong><small data-hover-copy>看看 TA 是谁</small></div>
      <div class="ec-hint court-hint" data-world-hint>${this.mobile ? "拖动环看 · 双指缩放 · 点一点人物" : "拖动环看 · 滚轮缩放 · 点一点人物"}</div>
      ${this.stage ? '<div class="court-stage" data-stage></div>' : ""}
    </div>
    <div class="court-arrival" data-arrival hidden></div>
    <div class="ec-panel-layer" hidden><button class="ec-panel-scrim" aria-label="关闭面板" data-action="close" tabindex="-1"></button><section class="ec-panel" role="dialog" aria-modal="true" aria-labelledby="ec-panel-title" tabindex="-1"></section></div>
    <div class="ec-toast-stack" aria-live="polite" aria-atomic="true"></div>
    <div class="ec-busy" role="status" hidden><span class="ec-spinner"></span><span data-busy-label></span></div>`;
  }
  categories() { return this.snapshot?.event?.categories?.length ? this.snapshot.event.categories : DEFAULT_CATEGORIES; }
  categoryLabel(id) { return this.categories().find(item => item.id === id)?.label || "其他来宾"; }
  eventName() { return this.snapshot?.event?.name || "相遇之庭"; }
  peopleMap() { return new Map((this.snapshot?.attendees || []).map(person => [person.id, person])); }
  applyTheme(event) {
    const theme = event?.theme || {};
    for (const [key, variable] of Object.entries(THEME_VARS)) if (/^#[0-9a-fA-F]{6}$/.test(theme[key] || "")) document.documentElement.style.setProperty(variable, theme[key]);
    if (event?.name && document.title !== `${event.name} · ${event.brand || "ECHO CAMPUS"}`) document.title = `${event.name} · ${event.brand || "ECHO CAMPUS"}`;
  }
  syncChrome() {
    const meta = this.root.querySelector("[data-world-count]");
    const people = this.snapshot?.attendees?.length || 0, links = this.snapshot?.connections?.length || 0;
    if (meta) meta.textContent = this.snapshot ? `${people} 位来客 · ${links} 次相遇` : (this.online ? "活动实时同步" : "正在连接活动");
    this.root.querySelectorAll("[data-live-dot]").forEach(dot => dot.classList.toggle("is-online", this.online));
    const name = this.root.querySelector("[data-event-name]");
    if (name) name.textContent = this.eventName();
    this.activity = this.snapshot?.activity || this.activity;
    const points = this.root.querySelector("[data-activity-points]");
    if (points) { const value = this.me?.activity?.points || 0; points.textContent = value; points.hidden = !this.me?.attendee || !value; }
    const attendee = this.me?.attendee;
    const entry = this.root.querySelector("[data-entry-label]"), sub = this.root.querySelector("[data-me-sub]"), face = this.root.querySelector("[data-me-avatar]");
    if (entry) entry.textContent = attendee ? attendee.name : "领取我的分身";
    if (sub) sub.textContent = attendee ? `我的名片 · NO.${serialLabel(attendee.serial)}` : (this.entryNfc ? "一下就好，不用填写" : "碰一下，或点这里进入");
    if (face) face.innerHTML = attendee ? avatar(attendee, { size: 40 }) : icon("nfc");
    this.root.querySelector(".court-me")?.classList.toggle("is-signed-in", !!attendee);
    const pending = this.me?.encounters?.filter(c => c.canConfirm).length || 0;
    const badge = this.root.querySelector("[data-inbox-count]");
    if (badge) { badge.textContent = pending; badge.hidden = !pending; }
    const sceneName = this.root.querySelector("[data-scene-name]");
    if (sceneName) sceneName.textContent = this.sceneLabel;
    const partner = this.root.querySelector(".court-partner-toggle");
    if (partner) partner.setAttribute("aria-pressed", String(this.partnerOpen));
  }
  setSnapshot(snapshot) {
    const previous = this.snapshot;
    this.snapshot = snapshot;
    if (snapshot?.event && snapshot.event !== previous?.event) this.applyTheme(snapshot.event);
    if (this.selectedPerson) {
      const updated = snapshot?.attendees?.find(person => person.id === this.selectedPerson.id);
      if (updated) this.selectedPerson = updated;
    }
    this.syncChrome();
    if (this.panel === "person" && this.selectedPerson) this.renderPerson(this.selectedPerson);
    if (this.panel === "inbox") this.renderInbox();
    if (this.stage) this.renderStage();
    if (this.arrivalOpen && !this.arrivalBusy) this.updateArrivalCount();
  }
  setMe(data) {
    const previous = this.me;
    this.me = data;
    if (data?.attendee && data.attendee.id === this.selectedPerson?.id) this.selectedPerson = data.attendee;
    this.syncChrome();
    if (this.panel === "inbox") this.renderInbox();
    if (this.panel === "person" && this.selectedPerson) this.renderPerson(this.selectedPerson);
    const before = new Set((previous?.encounters || []).filter(c => c.status === "confirmed").map(c => c.id));
    const fresh = previous?.attendee?.id === data?.attendee?.id ? (data?.encounters || []).filter(c => c.status === "confirmed" && !before.has(c.id)) : [];
    for (const encounter of fresh) this.toast(`你和 ${encounter.peer?.name || "一位来客"} 的相遇已点亮${encounter.peerContact ? " · 已交换联系方式" : ""}`);
    const incoming = (data?.encounters || []).filter(c => c.canConfirm && !(previous?.encounters || []).some(p => p.id === c.id));
    if (previous?.attendee && incoming.length) this.toast(`${incoming[0].peer?.name || "有人"} 想认识你${incoming[0].note ? "：“" + incoming[0].note + "”" : ""}`);
  }
  setOnline(value) { this.online = !!value; this.syncChrome(); }
  setSceneLabel(name, id = null) {
    this.sceneLabel = String(name || "我的场景");
    this.sceneId = id || listSceneDefinitions().find(d => d.displayName === this.sceneLabel)?.id || "imported";
    const coordinate = this.sceneId === "venue-campus" ? "THE WHOLE CAMPUS" : venueById(this.sceneId) ? "SOURCE MODEL" : { campus: "WHITE COURT", gallery: "WATER GALLERY", imported: "IMPORTED SCENE" }[this.sceneId] || "IMPORTED SCENE";
    const label = this.root.querySelector("[data-scene-coordinate]");
    if (label) label.textContent = coordinate;
    this.syncChrome();
  }
  setVenueState({ candidate = null, view = "event", eventReady = false } = {}) {
    this.activeVenueId = candidate?.id || null;
    this.venueView = view;
    this.venueEventReady = !!eventReady;
    const context = this.root.querySelector("[data-venue-context]");
    const isCampus = candidate?.id === "venue-campus";
    context.hidden = !candidate;
    this.root.querySelector("[data-campus-regions]").hidden = !isCampus;
    this.root.querySelector("[data-campus-return]").hidden = !candidate || isCampus;
    this.root.classList.toggle("ec-source-view", !!candidate && view === "source");
    this.root.classList.toggle("ec-event-view", !!candidate && view === "event");
    if (candidate && view === "source" && !this.partnerOpen) this.setPartnerOpen(true);
    const coordinate = this.root.querySelector("[data-scene-coordinate]"); if (coordinate && candidate) coordinate.textContent = isCampus ? "THE WHOLE CAMPUS" : view === "event" ? "THE SOCIAL GARDEN" : "SOURCE MODEL";
    if (candidate) {
      this.root.querySelector("[data-venue-source-name]").textContent = candidate.source;
      this.root.querySelector("[data-venue-provenance]").textContent = isCampus ? "塔楼 · T6 主楼 · HUB 中庭 · C 地块" : "园区局部查看 · 可一键回到完整园区";
      this.root.querySelector("[data-venue-layer-note]").textContent = isCampus ? (view === "source" ? "拖动环看整个园区，选择分区靠近查看。" : "先看园区全景，再进入交流现场。") : (view === "source" ? "拖动环看、滚轮缩放，查看此区域建筑。" : "自由探索 · 点选人物，开始一次相遇");
      context.querySelectorAll("[data-action=venue-view]").forEach(button => {
        if (button.dataset.id === "source") button.textContent = isCampus ? "园区建筑" : "源模型";
        const active = button.dataset.id === view;
        button.setAttribute("aria-pressed", String(active));
        button.classList.toggle("is-active", active);
        button.disabled = button.dataset.id === "event" && !eventReady;
        if (button.dataset.id === "event") button.title = eventReady ? "查看人物和活动点位叠加" : "活动坐标校准完成后可用";
      });
    }
    const labels = isCampus ? { hero: "完整园区", arrival: "活动入口", garden: "近看交流", aerial: "总平面" } : candidate ? { overview: "外景", arrival: "入口", courtyard: view === "event" ? "近看交流" : "侧景", aerial: "俯瞰" } : CAMERA_LABELS;
    this.root.querySelector(".ec-camera-dock").innerHTML = Object.entries(labels).map(([id, label], index) => `<button type="button" data-action="camera" data-id="${id}" aria-pressed="false"><span class="ec-camera-number">0${index + 1}</span>${label}</button>`).join("");
    this.root.querySelector(".ec-brand").dataset.id = isCampus ? "hero" : "overview";
    this.setCameraSelection(this.selectedCamera);
    const hint = this.root.querySelector("[data-world-hint]");
    if (hint) hint.textContent = candidate && view === "source" ? "拖动环看 · 滚轮缩放" : (this.mobile ? "拖动环看 · 双指缩放 · 点一点人物" : "拖动环看 · 滚轮缩放 · 点一点人物");
  }
  setCameraSelection(id) {
    const aliases = this.activeVenueId === "venue-campus" ? { overview: "hero", courtyard: "garden" } : { hero: "overview", garden: "courtyard" };
    this.selectedCamera = aliases[id] || id;
    this.root.querySelectorAll(".ec-camera-dock button, [data-campus-regions] button").forEach(button => { const active = button.dataset.id === this.selectedCamera; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
  }
  setPartnerOpen(open) {
    this.partnerOpen = !!open;
    this.root.classList.toggle("court-partner-open", this.partnerOpen);
    this.syncChrome();
    this.callbacks.onPartner?.(this.partnerOpen);
  }
  setBusy(text) {
    const busy = this.root.querySelector(".ec-busy");
    busy.hidden = !text;
    busy.querySelector("[data-busy-label]").textContent = text || "";
  }
  hideChrome(hidden) { this.root.classList.toggle("ec-cinema-mode", !!hidden); if (hidden) this.closePanel(); }
  toast(text, tone = "") {
    const stack = this.root.querySelector(".ec-toast-stack");
    const element = document.createElement("div");
    element.className = "ec-toast court-toast" + (tone ? " is-" + tone : "");
    element.textContent = String(text);
    stack.append(element);
    while (stack.children.length > 3) stack.firstElementChild.remove();
    setTimeout(() => { element.classList.add("is-leaving"); setTimeout(() => element.remove(), 240); }, 4600);
  }
  setHoverTarget(person) {
    const card = this.root.querySelector("[data-hover-card]");
    if (!card) return;
    if (!person) { card.hidden = true; return; }
    card.hidden = false;
    card.querySelector("[data-hover-name]").textContent = person.name || "活动点位";
    card.querySelector("[data-hover-kicker]").textContent = person.persona ? `NO.${serialLabel(person.serial)} · ${personaById(person.persona)?.codename || ""}` : "活动点位";
    card.querySelector("[data-hover-copy]").textContent = person.role ? `${person.role} · 点一下看看 TA 是谁` : "点一下查看";
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
    const panel = this.root.querySelector(".ec-panel");
    panel.classList.toggle("ec-panel-wide", kind === "scenes");
    panel.dataset.kind = kind;
  }
  closePanel() {
    this.panel = null;
    this.panelRevision = (this.panelRevision || 0) + 1;
    this.root.querySelector(".ec-panel-layer").hidden = true;
    this.root.classList.remove("ec-has-panel");
    if (this.lastFocus?.isConnected && typeof this.lastFocus.focus === "function") this.lastFocus.focus({ preventScroll: true });
  }
  panelHeader(kicker, title, subtitle = "") {
    return `<div class="ec-panel-header court-panel-header"><span class="court-grabber" aria-hidden="true"></span><div><p class="ec-eyebrow">${esc(kicker)}</p><h1 id="ec-panel-title">${esc(title)}</h1>${subtitle ? `<p class="ec-panel-subtitle">${esc(subtitle)}</p>` : ""}</div><button class="ec-close" type="button" data-action="close" aria-label="关闭面板">${icon("close")}</button></div>`;
  }
  render(html, focus = true) {
    const panel = this.root.querySelector(".ec-panel");
    panel.innerHTML = html;
    panel.scrollTop = 0;
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
      this.setCameraSelection(id);
      return this.run("onCamera", id);
    }
    if (action === "partner") return this.setPartnerOpen(!this.partnerOpen);
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
    if (action === "arrive") return this.arrive(button);
    if (action === "arrival-shuffle") return this.shuffleArrival();
    if (action === "join") {
      if (this.me?.attendee) return this.setSelectedPerson(this.me.attendee);
      return this.openArrival();
    }
    if (action === "edit-profile") return this.openOnboarding();
    if (action === "pick-persona") return this.openPersonaPicker();
    if (action === "choose-persona") return this.choosePersona(id);
    if (action === "persona-back") return this.openOnboarding({ keepDraft: true });
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
      const person = this.snapshot?.attendees.find(a => a.id === id) || this.me?.encounters?.find(c => c.peer?.id === id)?.peer;
      if (person) { this.setSelectedPerson(person); return this.run("onSelectPerson", person); }
    }
    if (action === "compose") {
      const form = this.root.querySelector('[data-form="compose"]');
      if (form) { form.hidden = false; button.hidden = true; requestAnimationFrame(() => form.elements.note?.focus({ preventScroll: true })); }
      return;
    }
    if (action === "compose-cancel") {
      const form = this.root.querySelector('[data-form="compose"]');
      if (form) { form.hidden = true; this.root.querySelector('[data-action="compose"]')?.removeAttribute("hidden"); }
      return;
    }
    if (action === "note-preset") {
      const input = this.root.querySelector('[data-form="compose"] [name="note"]');
      if (input) input.value = button.dataset.value || "";
      return;
    }
    if (action === "encounter") return this.requestEncounter(id, button);
    if (action === "confirm") return this.confirmEncounter(id, button);
    if (action === "decline") return this.declineEncounter(id, button);
    if (action === "checkin") return this.checkin(id, button);
    if (action === "leave") return this.leave(button);
    if (action === "locate") { this.closePanel(); return this.run("onSelectPerson", this.selectedPerson); }
    if (action === "copy-contact" || action === "copy-link") {
      const value = button.dataset.value || button.dataset.url || "";
      try { await navigator.clipboard.writeText(value); this.toast(action === "copy-link" ? "演示入口已复制" : "已复制，去微信里添加吧"); }
      catch { this.toast(action === "copy-link" ? "可长按下方入口链接复制" : "可以长按文字手动复制"); }
      return;
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
  hideWelcome() {}

  // ── Arrival: one tap from NFC/QR to a persona in the world ──────────────
  pickArrivalPersona(exclude = null) {
    const params = new URL(location.href).searchParams;
    const active = this.snapshot?.event?.personas?.length ? this.snapshot.event.personas : PERSONAS.map(p => p.id);
    const requested = params.get("persona");
    if (!exclude && personaById(requested) && active.includes(requested)) return requested;
    const usage = new Map();
    for (const person of this.snapshot?.attendees || []) if (person.persona) usage.set(person.persona, (usage.get(person.persona) || 0) + 1);
    const pool = active.filter(id => id !== exclude && personaById(id));
    const least = Math.min(...pool.map(id => usage.get(id) || 0));
    const candidates = pool.filter(id => (usage.get(id) || 0) <= least + 1);
    return candidates[Math.floor(Math.random() * candidates.length)] || pool[0] || PERSONAS[0].id;
  }
  openArrival() {
    if (this.stage) return;
    this.closePanel();
    this.arrivalOpen = true; this.arrivalBusy = false; this.arrivalError = "";
    this.arrivalPersona ||= this.pickArrivalPersona();
    const layer = this.root.querySelector("[data-arrival]");
    layer.hidden = false; layer.classList.remove("is-leaving");
    this.root.classList.add("court-arriving");
    this.renderArrival();
    this.callbacks.onPersonaPreview?.(this.arrivalPersona);
  }
  renderArrival() {
    const layer = this.root.querySelector("[data-arrival]");
    const persona = personaById(this.arrivalPersona) || PERSONAS[0];
    const tapInfo = this.tapInfo?.tag ? { ...this.tapInfo.tag, categoryLabel: this.categoryLabel(this.tapInfo.tag.category) } : null;
    layer.style.setProperty("--persona", persona.color);
    layer.innerHTML = arrivalView({ event: this.snapshot?.event, persona, nextSerial: this.nextSerial(), entry: this.snapshot?.event?.entry, tapInfo, busy: this.arrivalBusy, error: this.arrivalError });
  }
  nextSerial() { return Math.max(0, ...(this.snapshot?.attendees || []).map(p => p.serial || 0)) + 1; }
  updateArrivalCount() {
    const eyebrow = this.root.querySelector("[data-arrival] .court-persona-eyebrow");
    if (eyebrow) eyebrow.textContent = `即将成为第 ${serialLabel(this.nextSerial())} 位来客`;
  }
  shuffleArrival() {
    this.arrivalPersona = this.pickArrivalPersona(this.arrivalPersona);
    this.renderArrival();
    this.callbacks.onPersonaPreview?.(this.arrivalPersona);
  }
  async arrive(button) {
    if (this.arrivalBusy) return;
    this.arrivalBusy = true; this.arrivalError = "";
    if (button) button.disabled = true;
    this.renderArrival();
    try {
      const body = { consent: true, persona: this.arrivalPersona };
      if (this.tapInfo?.tag?.kind === "wristband" && this.tapInfo.tag.category) body.category = this.tapInfo.tag.category;
      const result = await this.client.join(body);
      this.setMe(this.client.me || { attendee: result.attendee, encounters: [] });
      const layer = this.root.querySelector("[data-arrival]");
      const serial = layer.querySelector("[data-serial]");
      if (serial) serial.textContent = serialLabel(result.attendee.serial);
      layer.querySelector(".court-persona-card")?.classList.add("is-stamped");
      layer.querySelector(".court-persona-eyebrow")?.replaceChildren(document.createTextNode(`第 ${serialLabel(result.attendee.serial)} 位来客`));
      await new Promise(resolve => setTimeout(resolve, 900));
      this.closeArrival();
      await this.run("onArrive", result.attendee);
      this.toast(`欢迎，${result.attendee.name}。点一点身边的人，看看 TA 是谁`);
      if (this.tapInfo?.tag?.kind === "checkpoint") await this.handleTap(true);
    } catch (error) {
      this.arrivalError = error?.message || "进入暂未完成，请重试";
      this.arrivalBusy = false;
      this.renderArrival();
      return;
    }
    this.arrivalBusy = false;
  }
  closeArrival() {
    const layer = this.root.querySelector("[data-arrival]");
    this.arrivalOpen = false;
    layer.classList.add("is-leaving");
    this.root.classList.remove("court-arriving");
    setTimeout(() => { if (!this.arrivalOpen) { layer.hidden = true; layer.innerHTML = ""; } }, 700);
  }
  /** Resolves ?tag= once: wristbands preset the category, checkpoints stamp the passport.
   * A signed tap is single-use, so its parameters leave the URL immediately and
   * the stamp after a first-time arrival goes through the regular checkin. */
  async handleTap(afterJoin = false) {
    if (afterJoin && this.tapInfo?.tag?.kind === "checkpoint") {
      try {
        const result = await this.client.checkin(this.tapInfo.tag.checkpoint);
        this.toast(result.idempotent ? "这个点位已经盖过章" : `盖章成功 · +${result.checkin.points} 分`);
        this.openActivity(this.tapInfo.tag.checkpoint);
      } catch (error) { this.toast(error.message || "盖章暂未完成"); }
      return null;
    }
    if (!this.tapTag || this.tapHandled) return null;
    this.tapHandled = true;
    try {
      const view = this.root.ownerDocument.defaultView || globalThis;
      const url = new URL(view.location.href);
      for (const key of ["tag", "ts", "nonce", "sig"]) url.searchParams.delete(key);
      view.history.replaceState(view.history.state, "", url);
    } catch {}
    try {
      const result = await this.client.tap(this.tapTag, this.tapSignature || {});
      this.tapInfo = result;
      if (result.attendee) this.toast(`已识别${this.categoryLabel(result.attendee.category)}手环`);
      if (result.checkin) {
        this.toast(result.checkin.idempotent ? "这个点位已经盖过章" : `盖章成功 · +${result.checkin.checkin.points} 分`);
        this.openActivity(result.tag.checkpoint);
      }
      if (this.arrivalOpen) this.renderArrival();
      return result;
    } catch (error) { this.toast(error.message || "这次触碰没有识别成功"); return null; }
  }

  // ── Person card ─────────────────────────────────────────────────────────
  renderPerson(person) {
    const own = this.me?.attendee?.id === person.id;
    const encounter = this.me?.encounters?.find(c => c.attendeeIds?.includes(person.id) || c.fromId === person.id || c.toId === person.id);
    const persona = personaById(person.persona) || PERSONAS[0];
    this.render(this.panelHeader(own ? "MY CARD · 我的名片" : `${persona.latin} · ${persona.codename}`, own ? "这是你" : "看看 TA 是谁") +
      personView({ person, me: this.me?.attendee, encounter, categoryLabel: this.categoryLabel(person.category), own, curated: person.source === "curated-demo", eventName: this.eventName() }), false);
  }
  async requestEncounter(peerId, button) {
    if (this.encounterPending) return;
    if (!this.me?.attendee) { this.toast("先领取你的分身，再打招呼"); return this.openArrival(); }
    this.encounterPending = true; button.disabled = true;
    const note = this.root.querySelector('[data-form="compose"] [name="note"]')?.value?.trim() || "";
    try {
      const result = await this.client.encounter(peerId, note);
      this.setMe(this.client.me);
      this.toast(result.encounter.status === "confirmed" ? "你们已经确认相遇" : "招呼已送达，等 TA 回应");
      if (this.selectedPerson && this.panel === "person") this.renderPerson(this.selectedPerson);
    } catch (error) { this.toast(error.message); } finally { this.encounterPending = false; button.disabled = false; }
  }
  async confirmEncounter(id, button) {
    if (this.confirmPending) return;
    this.confirmPending = true; button.disabled = true;
    try {
      await this.client.confirm(id);
      this.setMe(this.client.me);
      this.toast("相遇已被双方确认，连接正在世界中点亮", "glow");
      if (this.panel === "inbox") this.renderInbox();
    } catch (error) { this.toast(error.message); } finally { this.confirmPending = false; button.disabled = false; }
  }
  async declineEncounter(id, button) {
    button.disabled = true;
    try { await this.client.decline(id); this.setMe(this.client.me); this.toast("已放到一边，对方不会收到提醒"); if (this.panel === "inbox") this.renderInbox(); }
    catch (error) { this.toast(error.message); button.disabled = false; }
  }

  // ── My card / profile editor (explicit consent, all optional) ───────────
  formValues(form) {
    const data = Object.fromEntries(new FormData(form));
    return { ...data, listed: form.elements.listed ? form.elements.listed.checked : true };
  }
  openOnboarding({ keepDraft = false } = {}) {
    const params = new URL(location.href).searchParams;
    const base = keepDraft && this.profileDraft ? this.profileDraft : (this.me?.attendee ? { ...this.me.attendee, contact: this.me.profile?.contact ?? this.me.attendee.contact ?? "" } : { ...INITIAL, category: this.tapInfo?.tag?.category || "guest" });
    if (!keepDraft) this.profilePersona = base.persona || this.arrivalPersona || this.pickArrivalPersona();
    const persona = personaById(this.profilePersona) || PERSONAS[0];
    const badgeId = params.get("badge") || "";
    const code = params.get("code") || "";
    this.openPanel("join");
    this.render(this.panelHeader("YOUR CARD · 我的名片", this.me?.attendee ? "更新我的名片" : "让你，出现在这里", this.me?.attendee ? "只填你愿意公开的。微信可以只给相遇的人看。" : "资料全部选填，也可以什么都不填直接进入。") +
      profileFormView({ values: { ...INITIAL, ...base, serial: this.me?.attendee?.serial ?? null }, profile: keepDraft ? this.profileDraft?.profile : this.me?.profile, persona, categories: this.categories(), isUpdate: !!this.me?.attendee, badgeId, code, tapCategory: this.tapInfo?.tag?.category || "" }));
    const form = this.root.querySelector('[data-form="join"]');
    if (form.elements.category && !form.querySelector('[name="category"]:checked')) form.querySelector('[name="category"][value="guest"]')?.setAttribute("checked", "");
  }
  openPersonaPicker() {
    const form = this.root.querySelector('[data-form="join"]');
    if (form) {
      const values = this.formValues(form);
      this.profileDraft = { ...values, serial: this.me?.attendee?.serial ?? null, profile: { contact: values.contact, contactVisibility: values.contactVisibility, listed: values.listed, customName: !!values.name } };
    }
    this.openPanel("persona");
    const active = this.snapshot?.event?.personas?.length ? this.snapshot.event.personas : PERSONAS.map(p => p.id);
    this.render(this.panelHeader("CHOOSE A LOOK", "换一个分身形象", "每个形象都有鲜明的特征，方便在人群里认出彼此。") + `<button type="button" class="court-text-btn court-back" data-action="persona-back">${icon("back")}返回名片</button>` + personaPickerView({ current: this.profilePersona, active }));
  }
  choosePersona(id) {
    if (!personaById(id)) return;
    this.profilePersona = id;
    this.callbacks.onPersonaPreview?.(id);
    if (this.profileDraft) this.profileDraft.persona = id;
    this.openOnboarding({ keepDraft: !!this.profileDraft });
  }
  syncTopicField(form, name) {
    if (!form) return;
    const picked = [...form.querySelectorAll(`[data-topic-picker="${name}"] input:checked`)].map(input => input.value);
    const extra = (form.querySelector(`[data-topic-extra="${name}"]`)?.value || "").split(/[、,，;；/]+/).map(s => s.trim()).filter(Boolean);
    const hidden = form.querySelector(`input[type="hidden"][name="${name}"]`);
    if (hidden) hidden.value = [...new Set([...picked, ...extra])].join("、").slice(0, 160);
  }
  async onSubmit(event) {
    const form = event.target;
    if (form.matches?.('[data-form="quick-topics"]')) return this.submitQuickTopics(event);
    if (form.matches?.('[data-form="compose"]')) { event.preventDefault(); return; }
    if (!form.matches('[data-form="join"]')) return;
    event.preventDefault();
    if (this.joinPending) return;
    const errorBox = form.querySelector(".ec-form-error");
    if (!form.elements.consent.checked) { errorBox.textContent = "请先勾选同意公开展示，再保存。"; errorBox.hidden = false; form.reportValidity?.(); return; }
    const panelRevision = this.panelRevision;
    this.joinPending = true;
    const data = this.formValues(form);
    data.consent = true;
    for (const field of ["organization", "bio"]) if (!data[field]) delete data[field];
    if (!data.badgeId) { delete data.badgeId; delete data.activationCode; }
    if (!data.category) data.category = "guest";
    if (!data.contact) data.contactVisibility = "hidden";
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true; errorBox.hidden = true;
    try {
      const result = await this.client.join(data);
      this.profileDraft = null;
      this.setMe(this.client.me || { attendee: result.attendee, encounters: [] });
      this.toast(result.resumed ? "名片已更新" : `${result.attendee.name}，欢迎来到${this.eventName()}`);
      if (this.panel === "join" && this.panelRevision === panelRevision) {
        this.closePanel();
        if (!result.resumed) await this.run("onArrive", result.attendee);
        else await this.run("onSelectPerson", result.attendee);
      }
    } catch (error) {
      if (form.isConnected) { errorBox.textContent = error.message || "保存暂未完成，请重试"; errorBox.hidden = false; }
      else this.toast(error.message || "保存暂未完成，请重试");
    } finally { this.joinPending = false; submit.disabled = false; }
  }
  async submitQuickTopics(event) {
    event.preventDefault();
    const form = event.target;
    if (!form.elements.consent.checked) return this.toast("勾选后才会公开到你的名片上");
    const me = this.me?.attendee;
    if (!me) return this.openArrival();
    const need = form.querySelector('input[type="hidden"][name="need"]').value;
    if (!need) return this.toast("先选一两个方向吧");
    try {
      await this.client.join({ consent: true, persona: me.persona, name: this.me.profile?.customName === false ? "" : me.name, role: me.role === "来宾" ? "" : me.role, offer: me.offer, need, category: me.category, bio: me.bio || undefined, organization: me.organization || undefined, contact: this.me.profile?.contact || "", contactVisibility: this.me.profile?.contact ? this.me.profile.contactVisibility : "hidden", listed: this.me.profile?.listed !== false, avatarColor: me.avatarColor });
      this.setMe(this.client.me);
      this.openMatches();
    } catch (error) { this.toast(error.message); }
  }
  async leave(button) {
    if (!button.dataset.armed) { button.dataset.armed = "1"; button.lastChild.textContent = "再点一次，确认删除全部资料"; setTimeout(() => { if (button.isConnected) { delete button.dataset.armed; button.lastChild.textContent = "删除我在本活动的全部资料"; } }, 4000); return; }
    button.disabled = true;
    try { await this.client.leave(); this.closePanel(); this.setMe(null); this.toast("你的资料已删除，感谢来过"); }
    catch (error) { this.toast(error.message); button.disabled = false; }
  }

  // ── Discover, connections, passport ─────────────────────────────────────
  async openMatches() {
    if (!this.me?.attendee) return this.openArrival();
    this.openPanel("matches");
    const revision = this.panelRevision = (this.panelRevision || 0) + 1;
    const header = this.panelHeader("FELLOW TRAVELERS", "认识新朋友", "从你们主动公开的供给与需求出发。");
    this.render(header + '<div class="ec-panel-loading court-loading"><span class="ec-spinner"></span>正在整理相遇线索</div>');
    try {
      const result = await this.client.matches();
      if (this.panel !== "matches" || this.panelRevision !== revision) return;
      const me = this.me?.attendee;
      this.render(header + matchesView({ result, people: this.peopleMap(), me: this.me, quickTopics: !me?.offer && !me?.need }));
    } catch (error) {
      if (this.panel === "matches" && this.panelRevision === revision) this.render(this.panelHeader("FELLOW TRAVELERS", "相遇线索暂未就绪") + `<p class="ec-empty-state court-empty">${esc(error.message)}</p><button class="court-btn court-btn-soft court-btn-block" data-action="matches">重新获取</button>`);
    }
  }
  async openInbox() {
    if (!this.me?.attendee) return this.openArrival();
    this.openPanel("inbox");
    this.renderInbox();
    await this.client.refreshMe();
    if (this.panel === "inbox") { this.me = this.client.me; this.renderInbox(); }
  }
  renderInbox() {
    if (!this.me?.attendee) return;
    this.render(this.panelHeader("OUR ENCOUNTERS", "我的相遇", "每一次相遇，都由两个人共同确认。") + inboxView({ me: this.me, people: this.peopleMap() }), false);
  }
  async openActivity(focusId = null) {
    this.openPanel("activity");
    this.activityFocusId = focusId || null;
    this.activity = this.snapshot?.activity || this.activity || { checkpoints: [] };
    const renderActivity = () => {
      const done = new Set((this.me?.activity?.checkins || []).map(item => item.checkpointId));
      this.render(this.panelHeader("ENCOUNTER PASSPORT", "相遇护照", "把现场的每一站，变成一条看得见的路径。") + passportView({ checkpoints: this.activity?.checkpoints || [], done, points: this.me?.activity?.points || 0, signedIn: !!this.me?.attendee }));
      if (this.activityFocusId) requestAnimationFrame(() => { const card = this.root.querySelector(`[data-checkpoint-id="${String(this.activityFocusId).replace(/["\\]/g, "\\$&")}"]`); if (card) { card.classList.add("is-focus"); card.scrollIntoView({ block: "center", behavior: "smooth" }); setTimeout(() => card.classList.remove("is-focus"), 1800); } });
    };
    renderActivity();
    if (this.me?.attendee) {
      try { const result = await this.client.activity(); this.activity = result; } catch {}
      if (this.panel === "activity") renderActivity();
    }
  }
  async checkin(checkpointId, button) {
    if (!this.me?.attendee || button.disabled) return this.openArrival();
    button.disabled = true;
    try { const result = await this.client.checkin(checkpointId); this.activity = result.snapshot?.activity || this.activity; this.me = this.client.me; this.syncChrome(); this.toast(result.idempotent ? "这个点位已经盖过章" : `盖章成功 · +${result.checkin.points} 分`); if (this.panel === "activity") this.openActivity(); }
    catch (error) { button.disabled = false; this.toast(error.message || "盖章暂未完成"); }
  }

  // ── Stage (big screen) ──────────────────────────────────────────────────
  renderStage() {
    const host = this.root.querySelector("[data-stage]");
    if (!host || !this.snapshot) return;
    const attendees = this.snapshot.attendees || [];
    const arrivals = [...attendees].filter(p => p.source !== "curated-demo").sort((a, b) => String(b.joinedAt).localeCompare(String(a.joinedAt)) || (b.serial || 0) - (a.serial || 0));
    const meets = [...(this.snapshot.connections || [])].filter(c => !c.synthetic || c.confirmedAt).sort((a, b) => String(b.confirmedAt).localeCompare(String(a.confirmedAt)));
    const key = `${this.snapshot.version}`;
    if (host.dataset.version === key) return;
    host.dataset.version = key;
    host.innerHTML = stageView({ event: this.snapshot.event, attendees, connections: this.snapshot.connections || [], arrivals: arrivals.length ? arrivals : attendees.slice(-5).reverse(), meets });
    this.renderStageQr();
  }
  demoUrl(serial = "01", stage = false) {
    const url = new URL(document.baseURI);
    const current = new URL(this.root.ownerDocument.location.href);
    url.search = ""; url.hash = "";
    for (const key of ["sceneManifest", "scene", "venue", "view", "camera"]) if (current.searchParams.has(key)) url.searchParams.set(key, current.searchParams.get(key));
    if (current.searchParams.get("scope") === "building") url.searchParams.set("scope", "building");
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
    if (canvas) try { await QRCode.toCanvas(canvas, entry.href, { width: 132, margin: 1, color: { dark: "#1c2621ff", light: "#ffffffff" } }); } catch {}
  }
  openDemoPanel() {
    this.openPanel("demo");
    const first = this.demoUrl("01"), second = this.demoUrl("02"), stage = this.demoUrl("01", true), tabDemo = this.tabDemoUrl();
    this.render(this.panelHeader("FROM A TAP TO A WORLD", "碰一下，进入同一个世界", "手机负责入场，大屏见证每一位来宾的出现。") +
      `<div class="ec-demo-qr"><canvas data-demo-qr></canvas><div><span class="ec-tag">第一设备入口</span><h2>手机扫码<br>领取你的分身</h2><p>也可将同一入口写入 NFC 标签。</p></div></div>
      <ol class="ec-demo-steps"><li><span>01</span><div><strong>手机领取</strong><p>碰一下或扫码，一键以预设分身进入，不用填写资料。</p></div></li><li><span>02</span><div><strong>另一台设备加入</strong><p>打开第二设备入口，点选对方打个招呼。</p></div></li><li><span>03</span><div><strong>双方确认，点亮连接</strong><p>回到第一台设备接受招呼，大屏同步点亮，名片里的微信对彼此可见。</p></div></li></ol>
      <div class="ec-demo-links"><a href="${esc(first)}" target="_blank" rel="noopener">打开第一设备入口${icon("external")}</a><a href="${esc(second)}" target="_blank" rel="noopener">打开第二设备入口${icon("external")}</a><a href="${esc(stage)}" target="_blank" rel="noopener">打开大屏展示模式${icon("external")}</a><a href="${esc(tabDemo)}" target="_blank" rel="noopener">同机演示：独立访客窗口${icon("external")}</a></div>
      <button class="ec-secondary ec-full" data-action="copy-link" data-url="${esc(first)}">复制演示入口${icon("link")}</button>
      <div class="ec-notice">${icon("nfc")}<span>真实双端体验可用两部手机；只有一台电脑时，请用「独立访客窗口」领取第二位来宾，身份仅保存在该窗口，关闭后需重新领取。普通标签页仍共享当前身份。演示入口允许创建虚构身份，仅用于体验，不证明持卡人身份。真实 NFC 硬件读写、现场网络与身份领取需在活动前实机联调。</span></div>`);
    const canvas = this.root.querySelector("[data-demo-qr]");
    QRCode.toCanvas(canvas, first, { width: 156, margin: 1, color: { dark: "#1c2621ff", light: "#ffffffff" } }).catch(() => this.toast("二维码暂未生成，可使用下方入口链接"));
  }
  async loadVenue(id, button) {
    if (this.venuePending || !venueById(id)) return;
    this.venuePending = true;
    const revision = this.panelRevision;
    button.disabled = true;
    const errorBox = this.root.querySelector("[data-venue-error]");
    if (errorBox) errorBox.hidden = true;
    try {
      await this.callbacks.onVenue(id, id === "venue-campus" ? { view: "event", camera: "arrival" } : { view: "source", scope: "building" });
      if (this.panel === "scenes" && revision === this.panelRevision) this.closePanel();
    } catch (error) {
      if (errorBox?.isConnected) { errorBox.textContent = "未能载入源模型：" + error.message + "。当前场景保留，可重试或选择另一份源文件。"; errorBox.hidden = false; }
      else this.toast("源模型加载未完成：" + error.message);
    } finally { this.venuePending = false; button.disabled = false; }
  }
  venueCardsMarkup() {
    return `<section class="ec-venue-picker" aria-label="提供的真实场地模型"><div class="ec-section-heading"><h2>完整园区与分区</h2><span>从全景走进现场</span></div><p class="ec-venue-picker-intro">完整园区汇集塔楼、T6 主楼、HUB 中庭与 C 地块。也可以单独查看各区域。</p><div class="ec-venue-cards">${VENUE_CANDIDATES.map(candidate => `<article class="ec-venue-card ${this.activeVenueId === candidate.id ? "is-selected" : ""}"><button type="button" data-action="venue" data-id="${candidate.id}" aria-label="加载 ${esc(candidate.name)}"><span class="ec-venue-thumbnail"><img data-venue-thumbnail src="${esc(candidate.thumbnail)}" alt="${esc(candidate.name)}的场地模型总览" loading="lazy"><span class="ec-venue-thumbnail-unavailable">缩略图暂不可用</span></span><span class="ec-venue-card-copy"><strong>${esc(candidate.name)}</strong><small>${esc(candidate.id === "venue-campus" ? "塔楼 · T6 主楼 · HUB 中庭 · C 地块" : candidate.id === "venue-ab-towers" ? "T1–3 塔楼区域" : candidate.id === "venue-ab-canopy" ? "T6 主楼与入口区域" : "C 地块商业裙房")}</small><span>${this.activeVenueId === candidate.id ? "当前场地" : candidate.id === "venue-campus" ? "进入完整园区" : "单独查看区域"} ${icon("arrow")}</span></span></button><a class="ec-venue-direct" href="${esc(venueUrl(candidate.id, { baseUrl: document.baseURI }))}" target="_blank" rel="noopener">单独打开 ${icon("external")}</a></article>`).join("")}</div><div class="ec-form-error" data-venue-error role="alert" hidden></div><p class="ec-venue-boundary-note">园区建筑与活动布置可分别查看。人物与互动点为活动演示内容。</p></section>`;
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
      <div class="ec-vector-label"><span>旋转角度</span><small>单位 ° · Marble 常用 X = 180</small></div><div class="ec-vector-controls">${m.rotation.map((v, i) => `<label><span>${"XYZ"[i]}</span><input type="number" step="1" data-transform="rotation" data-axis="${i}" value="${v}"></label>`).join("")}</div>
      <div class="ec-vector-label"><span>位置偏移</span><small>世界坐标</small></div><div class="ec-vector-controls">${m.position.map((v, i) => `<label><span>${"XYZ"[i]}</span><input type="number" step="0.1" data-transform="position" data-axis="${i}" value="${v}"></label>`).join("")}</div>
      <details class="ec-manifest-details"><summary>高级配置 · 边界、出生点与交互锚点</summary><textarea data-manifest-json rows="12" spellcheck="false" aria-label="场景 JSON 配置">${esc(JSON.stringify(m, null, 2))}</textarea><button type="button" class="ec-text-button" data-action="sync-manifest">${icon("refresh")}将 JSON 同步到调节器</button><p class="ec-field-note">旋转以角度填写。模型只负责视觉；groundY 与 bounds 定义活动平面和边界，可独立校准。导入文件未包含在导出的 JSON 中。</p></details>
      <div class="ec-form-error" data-scene-error role="alert" hidden></div><button class="ec-primary ec-full" type="button" data-action="apply-manifest">${icon("scene")}应用到当前世界${icon("arrow")}</button><div class="ec-two-cols ec-import-actions"><button class="ec-secondary" type="button" data-action="save-manifest">保存本机配置</button><button class="ec-secondary" type="button" data-action="export-manifest">${icon("download")}导出 JSON</button></div><button class="ec-text-button ec-reset" type="button" data-action="reset-manifest">重置调节参数</button></div>`);
  }
  onChange(event) {
    if (event.target.matches("[data-topic-picker] input")) {
      const picker = event.target.closest("[data-topic-picker]");
      this.syncTopicField(event.target.closest("form"), picker.dataset.topicPicker);
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
      this.sceneManifest.rotation = event.target.value === "splat" ? [180, 0, 0] : [0, 0, 0];
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

export { personaCard };
