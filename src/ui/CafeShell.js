import {
  ArrowLeft,
  ArrowRight,
  Activity,
  Armchair,
  Check,
  Clock3,
  Circle,
  Coffee,
  Info,
  Heart,
  LocateFixed,
  MapPin,
  MessageCircle,
  Network,
  Plus,
  Pencil,
  Save,
  Send,
  Smile,
  Lightbulb,
  Sparkles,
  UserRound,
  Users,
  Wind,
  Thermometer,
  X,
  createIcons,
} from "lucide";
import { renderRelationshipGraph } from "./RelationshipGraph.js";
import { createProfileStore } from "../runtime/ProfileStore.js";


const ICONS = {
  ArrowLeft,
  ArrowRight,
  Activity,
  Armchair,
  Check,
  Clock3,
  Circle,
  Coffee,
  Info,
  Heart,
  LocateFixed,
  MapPin,
  MessageCircle,
  Network,
  Plus,
  Pencil,
  Save,
  Send,
  Smile,
  Lightbulb,
  Sparkles,
  UserRound,
  Users,
  Wind,
  Thermometer,
  X,
};

const EXPRESSIONS = [
  { id: "neutral", label: "平静", icon: "circle" },
  { id: "happy", label: "开心", icon: "smile" },
  { id: "surprised", label: "惊讶", icon: "sparkles" },
  { id: "thinking", label: "思考", icon: "lightbulb" },
];
const EXPRESSION_IDS = new Set(EXPRESSIONS.map(({ id }) => id));

const STATUS_LABELS = {
  arriving: "刚刚抵达",
  walking: "正在寻找座位",
  seated: "正在咖啡厅交谈",
  "joining-meeting": "正在前往圆桌",
  "in-meeting": "已加入圆桌会议",
};


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name, className = "") {
  return `<i data-lucide="${name}"${className ? ` class="${className}"` : ""}></i>`;
}

function hydrateIcons(root) {
  createIcons({ icons: ICONS, root, attrs: { "stroke-width": 1.8 } });
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatSignalValue(value, digits = 0) {
  const number = finiteNumber(value);
  return number === null ? "--" : number.toFixed(digits);
}

function formatSignalTime(value, includeDate = false) {
  if (!value) return "等待时间戳";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    ...(includeDate ? { month: "numeric", day: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatConfidence(value) {
  const number = finiteNumber(value);
  if (number === null) return "--";
  const percent = number <= 1 ? number * 100 : number;
  return `${Math.round(Math.max(0, Math.min(100, percent)))}%`;
}

function signalMetricMarkup({ iconName, label, metric, fallbackUnit, fallbackExplanation, digits = 0 }) {
  const value = metric?.value ?? metric;
  const unit = metric?.unit ?? fallbackUnit;
  const status = metric?.status ?? (value === null || value === undefined ? "待接入" : "最近记录");
  const explanation = metric?.explanation ?? fallbackExplanation ?? "AI 会结合个人基线解释这个指标。";
  return `
    <div class="signal-metric">
      <div class="signal-metric-heading">
        ${icon(iconName)}
        <span>${escapeHtml(label)}</span>
        <small>${escapeHtml(status)}</small>
      </div>
      <strong>${formatSignalValue(value, digits)}<small>${escapeHtml(unit ?? "")}</small></strong>
      <p>${escapeHtml(explanation)}</p>
    </div>`;
}

function formatHeartTrend(value) {
  return ({
    rising: "上升",
    steady: "平稳",
    stable: "稳定",
    falling: "回落",
    settling: "趋稳",
    unknown: "待建立基线",
  })[value] ?? value ?? "待建立基线";
}

function formatReliability(value) {
  const label = ({ high: "高", medium: "中", low: "低", pending: "待评估" })[value];
  return label ?? formatConfidence(value);
}

function personSignalMarkup(person, snapshot, context) {
  const heart = snapshot?.heart ?? {};
  const metrics = snapshot?.metrics ?? {};
  const interpretation = snapshot?.interpretation ?? snapshot?.inference ?? {};
  const iceBreak = snapshot?.iceBreak ?? {};
  const score = finiteNumber(heart.score ?? heart.heartScore);
  const bpm = finiteNumber(heart.bpm ?? heart.currentBpm);
  const baselineBpm = finiteNumber(heart.baselineBpm);
  const peakBpm = finiteNumber(heart.peakBpm);
  const beatDuration = score === null ? 0.9 : Math.max(0.42, Math.min(1.35, 1.35 - (score / 100) * 0.93));
  const beatScale = score === null ? 1.08 : 1.06 + Math.max(0, Math.min(100, score)) * 0.0014;
  const status = String(snapshot?.status ?? "waiting").toLowerCase();
  const isLive = ["live", "active", "streaming", "realtime"].includes(status);
  const isDemo = Object.values(snapshot?.sourceRefs ?? {}).some((value) => String(value).startsWith("demo-"));
  const statusLabel = isDemo ? "演示数据" : isLive ? "实时" : snapshot ? "历史记录" : "等待数据";
  const isInactive = ["stale", "unavailable", "offline", "error"].includes(status);
  const caveat = interpretation.caveat || "推测，不是情感事实";
  const heartExplanation = heart.explanation
    ?? "心动值会结合个人静息基线与当前心率变化计算，不等同于喜欢程度。";
  const capturedAt = snapshot?.capturedAt ?? snapshot?.timestamp;
  const accessibleSummary = `${person.name} 的心动值 ${score ?? "暂无"}，当前心率 ${bpm ?? "暂无"} BPM`;

  return `
    <section class="person-signal" data-signal-person="${escapeHtml(person.id)}" data-signal-context="${escapeHtml(context)}" aria-label="${escapeHtml(person.name)} 的生理信号" aria-live="polite">
      <header class="signal-section-heading">
        <span>生理信号</span>
        <span class="signal-capture-status${isLive ? " is-live" : ""}">
          <i aria-hidden="true"></i>${statusLabel} · ${escapeHtml(formatSignalTime(capturedAt, !isLive))}
        </span>
      </header>

      <div class="heart-signal${score === null || isInactive ? " is-waiting" : ""}" style="--heart-beat-duration: ${beatDuration.toFixed(2)}s; --heart-beat-scale: ${beatScale.toFixed(2)}">
        <span class="heart-signal-icon" aria-hidden="true">${icon("heart")}</span>
        <div class="heart-score">
          <small>心动值</small>
          <strong>${score === null ? "--" : Math.round(score)}<span>/100</span></strong>
        </div>
        <div class="heart-bpm">
          <small>当前心率</small>
          <strong>${bpm === null ? "--" : Math.round(bpm)}<span>BPM</span></strong>
          <p>基线 ${baselineBpm === null ? "--" : Math.round(baselineBpm)} · 峰值 ${peakBpm === null ? "--" : Math.round(peakBpm)}</p>
        </div>
        <span class="sr-only">${escapeHtml(accessibleSummary)}</span>
      </div>
      <p class="heart-signal-explanation">${escapeHtml(heartExplanation)}</p>
      <div class="heart-signal-meta">
        <span>${icon("activity")}趋势 ${escapeHtml(formatHeartTrend(heart.trend))}</span>
        <span>置信度 ${formatConfidence(heart.confidence ?? interpretation.confidence)}</span>
      </div>

      <div class="signal-metrics" aria-label="其他生理指标">
        ${signalMetricMarkup({ iconName: "wind", label: "呼吸", metric: metrics.breathingRate, fallbackUnit: "次/分", fallbackExplanation: "反映当时的生理唤起与交流节奏。", digits: 0 })}
        ${signalMetricMarkup({ iconName: "activity", label: "压力", metric: metrics.stressIndex ?? metrics.stress, fallbackUnit: "%", fallbackExplanation: "多信号融合估计，不代表负面情绪。", digits: 0 })}
        ${signalMetricMarkup({ iconName: "thermometer", label: "体表温度", metric: metrics.skinTemperature, fallbackUnit: "°C", fallbackExplanation: "容易受到环境与佩戴状态影响。", digits: 1 })}
        ${signalMetricMarkup({ iconName: "sparkles", label: "HRV", metric: metrics.hrv, fallbackUnit: "ms", fallbackExplanation: "反映心搏间变化，需对照个人历史基线。", digits: 0 })}
      </div>

      <div class="signal-interpretation">
        <div class="signal-interpretation-heading">
          ${icon("sparkles")}
          <span><small>AI 综合解释</small><strong>${escapeHtml(interpretation.label ?? "等待形成判断")}</strong></span>
          <em>${formatConfidence(interpretation.confidence)}</em>
        </div>
        <p>${escapeHtml(interpretation.summary ?? "照片、对话和可穿戴数据接入后，这里会说明当前数值相对个人基线意味着什么。")}</p>
        <small class="signal-caveat">${icon("info")}${escapeHtml(caveat.includes("推测，不是情感事实") ? caveat : `推测，不是情感事实 · ${caveat}`)}</small>
      </div>

      <div class="ice-break-signal" data-detected="${Boolean(iceBreak.detected)}">
        <span>${icon("sparkles")}</span>
        <div>
          <small>破冰瞬间</small>
          <strong>${iceBreak.detected ? `在 ${formatSignalTime(iceBreak.at)} 捕捉到互动转折` : "尚未识别到明确转折"}</strong>
          <p>${iceBreak.detected
            ? `用时 ${formatSignalValue(iceBreak.breakSeconds)} 秒 · 可靠度 ${formatReliability(iceBreak.reliability)}`
            : "持续记录后，将在这里标记关系开始自然升温的时刻。"}</p>
        </div>
      </div>
    </section>`;
}


function variantSwitcherMarkup({ variants, activeVariant, context, kind, label }) {
  return `
    <div
      class="variant-switcher variant-switcher--${kind}"
      data-option-count="${variants.length}"
      role="group"
      aria-label="${escapeHtml(label)}"
    >
      ${variants.map((variant) => `
        <button
          type="button"
          data-${kind}-variant="${escapeHtml(variant.id)}"
          aria-pressed="${variant.id === activeVariant.id}"
          title="${escapeHtml(variant.title)}"
        >${escapeHtml(variant.label)}</button>
      `).join("")}
    </div>`;
}


function variantControlsMarkup({
  sceneVariants,
  activeSceneVariant,
  characterVariants,
  activeCharacterVariant,
  context,
}) {
  const sceneSwitcher = sceneVariants.length > 1 && activeSceneVariant
    ? variantSwitcherMarkup({
        variants: sceneVariants,
        activeVariant: activeSceneVariant,
        context,
        kind: "scene",
        label: "场景版本",
      })
    : "";
  const characterSwitcher = characterVariants.length > 1 && activeCharacterVariant
    ? variantSwitcherMarkup({
        variants: characterVariants,
        activeVariant: activeCharacterVariant,
        context,
        kind: "character",
        label: "人物生成方案",
      })
    : "";
  if (!sceneSwitcher && !characterSwitcher) return "";
  return `
    <div class="variant-controls variant-controls--${context}">
      ${sceneSwitcher}
      ${characterSwitcher}
    </div>`;
}

// 头像渲染器工厂：src 经注入的 resolveMediaUrl 映射（live 媒体路由 / BASE_URL），
// onerror 降级为 canvas dataURL（palette.jacket 圆底 + 名字首字），任何情况下不出现破图
function createAvatarRenderer(resolveMediaUrl) {
  const fallbackCache = new Map();
  function fallbackUrl(person) {
    const key = person.id ?? person.name;
    if (!fallbackCache.has(key)) {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = person.palette?.jacket ?? "#2f665c";
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fffdf4";
      ctx.font = '700 30px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(person.displayName ?? person.name ?? "?").slice(0, 1), 32, 34);
      fallbackCache.set(key, canvas.toDataURL("image/png"));
    }
    return fallbackCache.get(key);
  }
  return function avatarImg(person, { alt = "", title = "" } = {}) {
    const fallback = fallbackUrl(person);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${escapeHtml(resolveMediaUrl(person.portrait))}" alt="${escapeHtml(alt)}"${titleAttr} onerror="this.onerror=null;this.src='${fallback}'" />`;
  };
}

// 模块级默认渲染器：createCafeShell 创建时赋值，供顶层 inspectorMarkup/personInspectorMarkup 共享
let defaultAvatarImg = null;

function inspectorMarkup(person, state, context = "world", signal = null) {
  const avatar = defaultAvatarImg
    ? defaultAvatarImg(person, { alt: `${person.name} 的 Low-poly 头像` })
    : `<img src="${person.portrait}" alt="${person.name} 的 Low-poly 头像" />`;
  const status = STATUS_LABELS[state?.status] ?? "在 Echo Cafe";
  const place = state?.tableLabel ?? "咖啡厅大厅";
  return `
    <header class="inspector-identity">
      ${avatar}
      <div>
        <span>${person.relation}</span>
        <h2>${person.name}</h2>
        <p>${person.role} · ${person.city}</p>
      </div>
      <button class="glass-icon-button" type="button" data-action="close-${context}-person" title="关闭" aria-label="关闭人物资料">${icon("x")}</button>
    </header>
    <div class="agent-live-state">
      <span class="live-state-dot"></span>
      <div><small>Agent 状态</small><strong>${status}</strong></div>
      <span>${place}</span>
    </div>
    ${personSignalMarkup(person, signal, context)}
    <p class="inspector-bio">${person.bio}</p>
    <div class="inspector-facts">
      <div>${icon("map-pin")}<span><small>所在城市</small><strong>${person.city}</strong></span></div>
      <div>${icon("clock-3")}<span><small>最近相见</small><strong>${person.lastSeen}</strong></span></div>
    </div>
    <div class="inspector-tags">${person.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
    <div class="inspector-stats">
      <div><strong>${person.stats.photos}</strong><small>照片</small></div>
      <div><strong>${person.stats.voiceClips}</strong><small>语音</small></div>
      <div><strong>${person.stats.memories}</strong><small>记忆</small></div>
    </div>`;
}

function inspectorControlsMarkup(person, context, mode, expression) {
  return `
    <div class="inspector-controls">
      <div class="inspector-mode-switch" role="group" aria-label="个人资料显示模式">
        <button type="button" data-inspector-mode="profile" data-inspector-context="${context}" aria-pressed="${mode === "profile"}">
          ${icon("user-round")}<span>资料</span>
        </button>
        <button type="button" data-inspector-mode="edit" data-inspector-context="${context}" aria-pressed="${mode === "edit"}">
          ${icon("pencil")}<span>编辑</span>
        </button>
      </div>
      <div class="expression-control" role="group" aria-label="切换 ${escapeHtml(person.name)} 的表情">
        <small>表情</small>
        <div>
          ${EXPRESSIONS.map((option) => `
            <button
              type="button"
              data-person-expression="${option.id}"
              data-expression-person="${escapeHtml(person.id)}"
              aria-label="${escapeHtml(option.label)}表情"
              aria-pressed="${expression === option.id}"
              title="${escapeHtml(option.label)}"
            >${icon(option.icon)}<span>${escapeHtml(option.label)}</span></button>
          `).join("")}
        </div>
      </div>
    </div>`;
}

function inspectorEditMarkup(person, context) {
  const formId = `profile-form-${context}-${person.id}`;
  return `
    <form class="profile-edit-form" id="${escapeHtml(formId)}" data-profile-form data-profile-person="${escapeHtml(person.id)}" data-profile-context="${context}">
      <div class="profile-edit-grid">
        <label><span>姓名</span><input name="name" value="${escapeHtml(person.name)}" maxlength="30" required /></label>
        <label><span>关系</span><input name="relation" value="${escapeHtml(person.relation)}" maxlength="40" /></label>
        <label><span>角色</span><input name="role" value="${escapeHtml(person.role)}" maxlength="40" /></label>
        <label><span>城市</span><input name="city" value="${escapeHtml(person.city)}" maxlength="30" /></label>
      </div>
      <label class="profile-edit-wide"><span>个人简介</span><textarea name="bio" rows="4" maxlength="320">${escapeHtml(person.bio)}</textarea></label>
      <label class="profile-edit-wide"><span>标签 <small>用逗号分隔</small></span><input name="tags" value="${escapeHtml((person.tags ?? []).join(", "))}" maxlength="160" /></label>
      <div class="profile-edit-actions">
        <button type="button" data-action="cancel-profile-edit" data-inspector-context="${context}">取消</button>
        <button type="submit">${icon("save")}<span>保存资料</span></button>
      </div>
    </form>`;
}

function personInspectorMarkup(person, state, context, mode, expression, signal) {
  const baseMarkup = inspectorMarkup(person, state, context, signal);
  const headerEnd = baseMarkup.indexOf("</header>") + "</header>".length;
  const header = baseMarkup.slice(0, headerEnd);
  const controls = inspectorControlsMarkup(person, context, mode, expression);
  if (mode === "edit") {
    return `${header}${controls}<div class="inspector-panel-content is-editing">${inspectorEditMarkup(person, context)}</div>`;
  }
  return `${header}${controls}<div class="inspector-panel-content">${baseMarkup.slice(headerEnd)}</div>`;
}


export function createCafeShell({
  root,
  currentUser,
  people,
  relationships,
  sceneVariants = [],
  activeSceneVariant = null,
  characterVariants = [],
  activeCharacterVariant = null,
  onViewChange = () => {},
  onSceneVariantChange = () => {},
  onCharacterVariantChange = () => {},
  onLocatePerson = () => {},
  onMeetingStart = async () => {},
  onMeetingEnd = async () => {},
  onNotification = () => {},
  resolveMediaUrl = (ref) => ref,
  world = "cafe",
  fieldPerson = null,
  onExpressionChange = () => {},
  onProfileChange = () => {},
  signalStore = null,
  signalByPersonId = null,
}) {
  let currentView = "intro";
  let worldReady = false;
  let selectedWorldPerson = null;
  let selectedMapPerson = null;
  let meetingSheetOpen = false;
  // live 会议模式由 boot() 后端探测后回填（setMeetingLive），决定会议台词走真实后端
  let meetingLive = false;
  let meetingActive = false;
  let meetingEndedState = false;
  let meetingTopic = null;
  let meetingCursor = 0;
  const invitedIds = new Set();
  const agentStates = new Map();
  const meetingMessages = [];
  const speechTimers = new Map();
  const activeSpeechIds = new Set();
  const avatarImg = createAvatarRenderer(resolveMediaUrl);
  defaultAvatarImg = avatarImg;
  // HUD 文案按世界联动（hall=集市 / cafe=咖啡厅 / field=关系场域）
  const worldLabel = world === "hall"
    ? "Echo 集市"
    : world === "field"
      ? `${fieldPerson?.name ?? "TA"} · 关系场域`
      : "Echo Cafe";
  const worldStatusLine = world === "hall"
    ? "展位陈列中 · 欢迎串门"
    : world === "field"
      ? "共同记忆正在构成环境"
      : "熟人交流空间 · 今日播报已开启";
  const introTitle = world === "field" ? "关系场域" : world === "cafe" ? "Echo Cafe" : "Echo 集市";
  const introDescription = world === "field"
    ? `这里表达的是你与${fieldPerson?.name ?? "TA"}相处时留下的感觉，而不是对现实的复刻。`
    : world === "cafe"
      ? "坐到桌边，邀请熟人喝杯咖啡，或在圆桌展开一次有上下文的交流。"
      : "这是你的关系集市：你认识的人，都在这里有了自己的展位。";
  const introAction = world === "field" ? "进入这段关系" : world === "cafe" ? "推门进咖啡厅" : "走进集市";
  const expressionTimers = new Map();
  const personExpressions = new Map();
  const personSignals = new Map();
  const inspectorModes = { world: "profile", map: "profile" };
  const profileStore = createProfileStore();
  const storedProfiles = profileStore.getAll();
  people = people.map((person) => ({ ...person, ...(storedProfiles[person.id] ?? {}) }));

  if (signalByPersonId instanceof Map) {
    for (const [personId, snapshot] of signalByPersonId) personSignals.set(personId, snapshot);
  } else if (signalByPersonId && typeof signalByPersonId === "object") {
    for (const [personId, snapshot] of Object.entries(signalByPersonId)) personSignals.set(personId, snapshot);
  }

  root.innerHTML = `
    <div class="cafe-shell" data-view="intro">
      <section id="intro-view" class="cafe-view intro-view" aria-label="EchoWorld 首页">
        <div class="intro-tone" aria-hidden="true"></div>
        <header class="intro-bar">
          <div class="cafe-brand light">
            <span class="cafe-brand-mark">EW</span>
            <span><strong>EchoWorld</strong><small>AGENT RELATIONSHIP CAFE</small></span>
          </div>
          <div class="intro-actions">
            ${activeSceneVariant && activeCharacterVariant && world !== "field" ? variantControlsMarkup({
              sceneVariants,
              activeSceneVariant,
              characterVariants,
              activeCharacterVariant,
              context: "intro",
            }) : ""}
            <div class="intro-live"><span></span>${world === "field" ? "关系场域已生成" : world === "cafe" ? "熟人空间已开门" : "6 个 Agent 已在展位就位"}</div>
          </div>
        </header>
        <div class="intro-copy">
          <p>YOUR RELATIONSHIPS, IN ONE PLACE</p>
          <h1>${introTitle}</h1>
          <h2>${introDescription}</h2>
        </div>
        <button class="intro-enter" type="button" data-action="enter-cafe" disabled>
          <span><small>${world === "field" ? "YOU × THEM" : "进入我的关系空间"}</small>${introAction}</span>
          ${icon("arrow-right")}
        </button>
        <footer class="intro-footnote">
          <span>ECHOWORLD / PRIVATE AGENT SPACE</span>
          <span>${world === "field" ? "01 RELATION · 04 MEMORIES · REGENERABLE" : "06 PEOPLE · 06 BOOTHS · 01 CAFE"}</span>
        </footer>
      </section>

      <section id="cafe-view" class="cafe-view cafe-world-view" aria-label="${worldLabel}" aria-hidden="true">
        <header class="cafe-hud-top">
          <button class="glass-control venue-control" type="button" data-action="intro" aria-label="返回首页">
            <span class="cafe-brand-mark solid">EW</span>
            <span><small>当前位置</small><strong>${worldLabel}</strong></span>
          </button>
          <div class="cafe-presence">
            <div class="presence-faces">
              ${(world === "field" && fieldPerson ? [fieldPerson] : people).map((person) => avatarImg(person, { title: person.name })).join("")}
            </div>
            <span><strong>${world === "field" ? 1 : people.length}</strong> Agent 在线</span>
          </div>
          <button class="glass-control map-control" type="button" data-action="open-map">
            ${icon("network")}
            <span><small>人物关系</small><strong>关系 Map</strong></span>
          </button>
        </header>

        ${activeSceneVariant && activeCharacterVariant && world !== "field" ? variantControlsMarkup({
          sceneVariants,
          activeSceneVariant,
          characterVariants,
          activeCharacterVariant,
          context: "cafe",
        }) : ""}

        <div id="world-speech-layer" class="world-speech-layer" aria-live="polite"></div>

        <aside id="world-inspector" class="world-inspector glass-panel" aria-label="人物资料" aria-hidden="true"></aside>
        <aside id="meeting-sheet" class="meeting-sheet glass-panel" aria-label="圆桌会议" aria-hidden="true"></aside>

        <div class="cafe-bottom-status glass-control" aria-label="${worldLabel}状态">
          ${icon("coffee")}
          <span><strong>${worldLabel}</strong><small>${worldStatusLine}</small></span>
        </div>
      </section>

      <section id="map-view" class="cafe-view relationship-view" aria-label="人物关系 Map" aria-hidden="true">
        <header class="map-header">
          <button class="glass-icon-button" type="button" data-action="back-cafe" title="返回咖啡厅" aria-label="返回咖啡厅">${icon("arrow-left")}</button>
          <div><small>EchoWorld</small><strong>人物关系 Map</strong></div>
          <span>6 PEOPLE / 12 CONNECTIONS</span>
        </header>
        <div id="cafe-relationship-graph" class="cafe-relationship-graph"></div>
        <aside id="map-inspector" class="map-inspector" aria-label="人物资料" aria-hidden="true"></aside>
      </section>

      <div id="cafe-toast" class="cafe-toast" role="status" aria-live="polite"></div>
    </div>`;

  const shell = root.querySelector(".cafe-shell");
  const graph = root.querySelector("#cafe-relationship-graph");
  const worldInspector = root.querySelector("#world-inspector");
  const mapInspector = root.querySelector("#map-inspector");
  const meetingSheet = root.querySelector("#meeting-sheet");
  const speechLayer = root.querySelector("#world-speech-layer");
  const toast = root.querySelector("#cafe-toast");
  let toastTimer = null;

  function setView(view) {
    currentView = view;
    shell.dataset.view = view;
    document.body.dataset.view = view;
    for (const section of root.querySelectorAll(".cafe-view")) {
      section.setAttribute("aria-hidden", String(section.id !== `${view}-view`));
    }
    if (view !== "cafe") {
      selectedWorldPerson = null;
      renderWorldInspector();
    }
    onViewChange(view);
    document.title = view === "intro" ? `EchoWorld · ${worldLabel}` : view === "map" ? "EchoWorld · 关系 Map" : `EchoWorld · ${worldLabel} 在线`;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    onNotification(message);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function getPersonSignal(personId) {
    if (personSignals.has(personId)) return personSignals.get(personId);
    if (typeof signalStore?.getSnapshot !== "function") return null;
    try {
      const snapshot = signalStore.getSnapshot(personId);
      if (snapshot) personSignals.set(personId, snapshot);
      return snapshot ?? null;
    } catch (error) {
      console.warn(`Unable to read physiological signal for ${personId}`, error);
      return null;
    }
  }

  function applyPersonSignal(snapshot, fallbackPersonId = null) {
    const personId = snapshot?.personId ?? fallbackPersonId;
    if (!personId || !snapshot) return false;
    personSignals.set(personId, { ...snapshot, personId });
    if (selectedWorldPerson?.id === personId) renderWorldInspector();
    if (selectedMapPerson?.id === personId) renderMapInspector();
    return true;
  }

  function clearPersonSignal(personId) {
    if (!personId || !personSignals.delete(personId)) return false;
    if (selectedWorldPerson?.id === personId) renderWorldInspector();
    if (selectedMapPerson?.id === personId) renderMapInspector();
    return true;
  }

  function setPersonSignal(personIdOrSnapshot, nextSnapshot = null) {
    const snapshot = typeof personIdOrSnapshot === "string"
      ? { ...nextSnapshot, personId: personIdOrSnapshot }
      : personIdOrSnapshot;
    if (!snapshot?.personId) return false;
    if (typeof signalStore?.upsert === "function") {
      try {
        const result = signalStore.upsert(snapshot);
        return applyPersonSignal(result?.snapshot ?? snapshot);
      } catch (error) {
        console.warn(`Unable to persist physiological signal for ${snapshot.personId}`, error);
      }
    }
    return applyPersonSignal(snapshot);
  }

  function expressionForText(text) {
    if (/[!！]/.test(text)) return "surprised";
    if (/[?？]/.test(text)) return "thinking";
    return "happy";
  }

  function syncExpressionControls(personId) {
    const expression = personExpressions.get(personId) ?? "neutral";
    for (const button of root.querySelectorAll(`[data-expression-person="${CSS.escape(personId)}"]`)) {
      button.setAttribute("aria-pressed", String(button.dataset.personExpression === expression));
    }
  }

  function setPersonExpression(personId, expression = "neutral", metadata = {}) {
    const person = people.find((candidate) => candidate.id === personId);
    if (!person || !EXPRESSION_IDS.has(expression)) return false;

    window.clearTimeout(expressionTimers.get(personId));
    expressionTimers.delete(personId);
    const previous = personExpressions.get(personId) ?? "neutral";
    personExpressions.set(personId, expression);
    syncExpressionControls(personId);
    onExpressionChange(personId, expression, { ...metadata, previous });

    const duration = Number(metadata.duration ?? 0);
    if (expression !== "neutral" && duration > 0) {
      expressionTimers.set(personId, window.setTimeout(() => {
        setPersonExpression(personId, "neutral", {
          source: "auto-reset",
          previousSource: metadata.source ?? "programmatic",
        });
      }, duration * 1000));
    }
    return true;
  }

  function savePersonProfile(personId, values, context) {
    const index = people.findIndex((person) => person.id === personId);
    if (index < 0) return;
    const changes = {
      name: String(values.name ?? "").trim(),
      relation: String(values.relation ?? "").trim(),
      role: String(values.role ?? "").trim(),
      city: String(values.city ?? "").trim(),
      bio: String(values.bio ?? "").trim(),
      tags: String(values.tags ?? "")
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12),
    };
    const updated = { ...people[index], ...changes };
    people = people.map((person) => person.id === personId ? updated : person);
    profileStore.save(personId, changes);
    if (selectedWorldPerson?.id === personId) selectedWorldPerson = updated;
    if (selectedMapPerson?.id === personId) selectedMapPerson = updated;
    inspectorModes[context] = "profile";
    refreshGraph();
    renderWorldInspector();
    renderMapInspector();
    onProfileChange(personId, updated, { source: "manual", changes });
    showToast(`已保存 ${updated.name} 的个人资料`);
  }

  function refreshGraph() {
    renderRelationshipGraph(graph, {
      currentUser,
      people,
      relationships,
      selectedId: selectedMapPerson?.id ?? null,
    });
  }

  function renderWorldInspector() {
    // 已退役，由 PackagePanel 取代（2026-08-03）：世界内点击小人的人物详情侧栏不再展示，
    // 避免两代人物 UI 并存。资料编辑/表情/信号面板经地图 inspector（personInspectorMarkup）保留可用。
    // 保留函数体与全部调用点以兼容既有流程（selectedWorldPerson 选中态、agentStates 跟踪）。
    worldInspector.innerHTML = "";
    worldInspector.setAttribute("aria-hidden", "true");
    shell.classList.remove("has-world-inspector");
  }

  function renderMapInspector() {
    if (!selectedMapPerson) {
      mapInspector.innerHTML = "";
      mapInspector.setAttribute("aria-hidden", "true");
      shell.classList.remove("has-map-inspector");
      return;
    }
    mapInspector.innerHTML = `
      ${personInspectorMarkup(
        selectedMapPerson,
        agentStates.get(selectedMapPerson.id),
        "map",
        inspectorModes.map,
        personExpressions.get(selectedMapPerson.id) ?? "neutral",
        getPersonSignal(selectedMapPerson.id),
      )}
      <button class="locate-person-button" type="button" data-action="locate-person">
        ${icon("locate-fixed")}<span>在咖啡厅中定位</span>
      </button>`;
    mapInspector.setAttribute("aria-hidden", "false");
    shell.classList.add("has-map-inspector");
    hydrateIcons(mapInspector);
  }

  function renderRoundtableSeats() {
    const seats = [currentUser.id, ...invitedIds];
    return `
      <div class="meeting-seat-map" aria-label="六人圆桌座位">
        ${Array.from({ length: 6 }, (_, index) => {
          const personId = seats[index];
          const person = personId === currentUser.id ? currentUser : people.find((candidate) => candidate.id === personId);
          return `<span class="meeting-seat seat-${index + 1}${person ? " is-filled" : ""}">
            ${person ? avatarImg(person, { alt: person.displayName ?? person.name }) : `<i>${index + 1}</i>`}
          </span>`;
        }).join("")}
        <span class="meeting-table-core">${icon("coffee")}<small>${seats.length}/6</small></span>
      </div>`;
  }

  function renderMeetingSetup() {
    meetingSheet.innerHTML = `
      <header class="meeting-header">
        <span class="meeting-header-icon">${icon("users")}</span>
        <div><small>中央六人圆桌</small><h2>邀请谁一起坐下？</h2></div>
        <button class="glass-icon-button" type="button" data-action="close-meeting" title="关闭" aria-label="关闭圆桌会议">${icon("x")}</button>
      </header>
      ${renderRoundtableSeats()}
      <label class="meeting-topic-field">
        <span>议题 <small>可选，会成为大家讨论的中心</small></span>
        <input name="meeting-topic" data-meeting-topic-input maxlength="80"
          placeholder="例如：帮 TA 的摄影展想想宣传点子" value="${escapeHtml(meetingTopic ?? "")}" />
      </label>
      <div class="meeting-invite-list">
        ${people.map((person) => {
          const selected = invitedIds.has(person.id);
          const state = agentStates.get(person.id);
          return `
            <button class="meeting-person-row${selected ? " is-selected" : ""}" type="button" data-meeting-person="${person.id}" aria-pressed="${selected}">
              ${avatarImg(person)}
              <span><strong>${person.name}</strong><small>${state?.tableLabel ?? person.relation}</small></span>
              <i>${icon(selected ? "check" : "plus")}</i>
            </button>`;
        }).join("")}
      </div>
      <footer class="meeting-footer">
        <span>还可邀请 ${5 - invitedIds.size} 人</span>
        <button type="button" data-action="start-meeting" ${invitedIds.size === 0 ? "disabled" : ""}>邀请 ${invitedIds.size} 人入座</button>
      </footer>`;
    meetingSheet.setAttribute("aria-hidden", "false");
    notifyMeetingPanelFocus();
    hydrateIcons(meetingSheet);
  }

  function meetingMessageMarkup(message) {
    if (message.system) {
      return `<div class="meeting-message is-system"><p>${escapeHtml(message.text)}</p></div>`;
    }
    const person = message.personId === currentUser.id
      ? currentUser
      : people.find((candidate) => candidate.id === message.personId);
    if (!person) return "";
    return `<div class="meeting-message${message.personId === currentUser.id ? " is-me" : ""}">
      ${avatarImg(person)}
      <span><small>${person.displayName ?? person.name}</small><p>${escapeHtml(message.text)}</p></span>
    </div>`;
  }

  function scrollMeetingThread() {
    requestAnimationFrame(() => {
      const thread = meetingSheet.querySelector("[data-meeting-thread]");
      if (thread) thread.scrollTop = thread.scrollHeight;
    });
  }

  function renderMeetingActive() {
    const participants = people.filter((person) => invitedIds.has(person.id));
    meetingSheet.innerHTML = `
      <header class="meeting-header active">
        <div class="meeting-party-faces">
          ${avatarImg(currentUser)}
          ${participants.map((person) => avatarImg(person)).join("")}
        </div>
        <div><small>${participants.length + 1} 人已入座${meetingTopic ? ` · 议题：${escapeHtml(meetingTopic)}` : ""}</small><h2>圆桌会议进行中</h2></div>
        <button class="glass-icon-button" type="button" data-action="end-meeting" title="结束会议" aria-label="结束圆桌会议">${icon("x")}</button>
      </header>
      <div class="meeting-thread" data-meeting-thread>
        ${meetingMessages.map(meetingMessageMarkup).join("")}
      </div>
      <div class="meeting-topics">
        <button type="button" data-meeting-topic="最近有什么新变化？">最近的变化</button>
        <button type="button" data-meeting-topic="我们下一步一起做什么？">下一步</button>
        <button type="button" data-meeting-topic="说说大家共同记得的一件事。">共同记忆</button>
      </div>
      <form class="meeting-composer" data-meeting-form>
        <input name="message" autocomplete="off" placeholder="对圆桌上的人说点什么" aria-label="圆桌消息" />
        <button type="submit" class="glass-icon-button" title="发送" aria-label="发送消息">${icon("send")}</button>
      </form>`;
    meetingSheet.setAttribute("aria-hidden", "false");
    notifyMeetingPanelFocus();
    hydrateIcons(meetingSheet);
    scrollMeetingThread();
  }

  function renderMeetingEnded() {
    const participants = people.filter((person) => invitedIds.has(person.id));
    meetingSheet.innerHTML = `
      <header class="meeting-header">
        <div class="meeting-party-faces">
          ${avatarImg(currentUser)}
          ${participants.map((person) => avatarImg(person)).join("")}
        </div>
        <div><small>${meetingTopic ? `议题：${escapeHtml(meetingTopic)}` : "圆桌会议"}</small><h2>会议结束</h2></div>
        <button class="glass-icon-button" type="button" data-action="close-meeting" title="关闭" aria-label="关闭圆桌会议">${icon("x")}</button>
      </header>
      <div class="meeting-thread" data-meeting-thread>
        ${meetingMessages.map(meetingMessageMarkup).join("")}
        <div class="meeting-message is-system"><p>会议结束，大家回到了各自的位置。这次讨论已写入今日播报。</p></div>
      </div>
      <footer class="meeting-footer">
        <span>感谢发起这场讨论</span>
        <button type="button" data-action="close-meeting">收起会议记录</button>
      </footer>`;
    meetingSheet.setAttribute("aria-hidden", "false");
    notifyMeetingPanelFocus();
    hydrateIcons(meetingSheet);
    scrollMeetingThread();
  }

  function closeMeetingSheet() {
    meetingSheetOpen = false;
    meetingEndedState = false;
    meetingSheet.innerHTML = "";
    meetingSheet.setAttribute("aria-hidden", "true");
    shell.classList.remove("has-meeting-sheet");
  }

  // 面板互斥：会议 sheet 打开时广播；资料包等其他面板打开时自动收起（仅隐藏，不结束会议）。
  const PANEL_FOCUS_EVENT = "echoworld:panel-focus";
  function notifyMeetingPanelFocus() {
    window.dispatchEvent(new CustomEvent(PANEL_FOCUS_EVENT, { detail: { id: "meeting" } }));
  }
  window.addEventListener(PANEL_FOCUS_EVENT, (event) => {
    if (event.detail?.id !== "meeting" && meetingSheetOpen) closeMeetingSheet();
  });

  // 结束/离开会议的统一出口：setup 阶段直接关 sheet；会议进行中走 onMeetingEnd
  // （live 模式下由后端立即散场，meeting-ended 进今日播报）
  async function requestCloseMeeting() {
    if (!meetingSheetOpen) return false;
    if (meetingEndedState) {
      closeMeetingSheet();
      invitedIds.clear();
      return true;
    }
    if (!meetingActive) {
      closeMeetingSheet();
      return true;
    }
    await onMeetingEnd();
    meetingActive = false;
    invitedIds.clear();
    closeMeetingSheet();
    showToast("圆桌会议已结束");
    return true;
  }

  function pushMeetingMessage(message) {
    meetingMessages.push(message);
    if (meetingMessages.length > 80) meetingMessages.splice(0, meetingMessages.length - 80);
  }

  async function submitMeetingMessage(message) {
    const text = String(message).trim();
    if (!text || !meetingActive) return;
    pushMeetingMessage({ personId: currentUser.id, text });
    renderMeetingActive();
    if (meetingLive) {
      // live：发言 POST 给后端会议，作为当前讨论点；Agent 的回应从快照事件回流
      Promise.resolve(onMeetingMessage(text)).catch((error) => {
        console.warn("[EchoWorld] 会议发言未送达", error);
        showToast("这句话没有传到圆桌上，请再试一次");
      });
      return;
    }
    const participants = people.filter((person) => invitedIds.has(person.id));
    if (participants.length === 0) return;
    const responder = participants[meetingCursor % participants.length];
    const reply = responder.conversation.replies[meetingCursor % responder.conversation.replies.length];
    meetingCursor += 1;
    setPersonExpression(responder.id, "thinking", {
      source: "roundtable-listening",
      duration: 1,
    });
    window.setTimeout(() => {
      if (!meetingActive) return;
      pushMeetingMessage({ personId: responder.id, text: reply });
      setPersonExpression(responder.id, expressionForText(reply), {
        source: "roundtable-reply",
        text: reply,
        duration: 4.5,
      });
      renderMeetingActive();
    }, 620);
  }

  root.addEventListener("click", async (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;

    if (target.dataset.sceneVariant) {
      onSceneVariantChange(target.dataset.sceneVariant);
      return;
    }

    if (target.dataset.characterVariant) {
      onCharacterVariantChange(target.dataset.characterVariant);
      return;
    }

    if (target.dataset.inspectorMode) {
      const context = target.dataset.inspectorContext;
      if (context === "world" || context === "map") {
        inspectorModes[context] = target.dataset.inspectorMode === "edit" ? "edit" : "profile";
        if (context === "world") renderWorldInspector();
        else renderMapInspector();
      }
      return;
    }

    if (target.dataset.personExpression) {
      setPersonExpression(target.dataset.expressionPerson, target.dataset.personExpression, {
        source: "manual",
        persistent: true,
      });
      return;
    }

    if (target.dataset.action === "cancel-profile-edit") {
      const context = target.dataset.inspectorContext;
      inspectorModes[context] = "profile";
      if (context === "world") renderWorldInspector();
      else renderMapInspector();
      return;
    }

    if (target.dataset.action === "enter-cafe") {
      setView("cafe");
      return;
    }
    if (target.dataset.action === "intro") {
      setView("intro");
      return;
    }
    if (target.dataset.action === "open-map") {
      selectedMapPerson = null;
      refreshGraph();
      renderMapInspector();
      setView("map");
      return;
    }
    if (target.dataset.action === "back-cafe") {
      setView("cafe");
      return;
    }
    if (target.dataset.personId) {
      if (target.dataset.personId === currentUser.id) return;
      selectedMapPerson = people.find((person) => person.id === target.dataset.personId) ?? null;
      refreshGraph();
      renderMapInspector();
      return;
    }
    if (target.dataset.action === "close-map-person") {
      selectedMapPerson = null;
      refreshGraph();
      renderMapInspector();
      return;
    }
    if (target.dataset.action === "close-world-person") {
      selectedWorldPerson = null;
      renderWorldInspector();
      return;
    }
    if (target.dataset.action === "locate-person" && selectedMapPerson) {
      const person = selectedMapPerson;
      selectedWorldPerson = person;
      onLocatePerson(person);
      setView("cafe");
      renderWorldInspector();
      showToast(`已在咖啡厅中定位 ${person.name}`);
      return;
    }
    if (target.dataset.action === "close-meeting") {
      await requestCloseMeeting();
      return;
    }
    if (target.dataset.meetingPerson) {
      const personId = target.dataset.meetingPerson;
      if (invitedIds.has(personId)) invitedIds.delete(personId);
      else if (invitedIds.size < 5) invitedIds.add(personId);
      else showToast("圆桌最多再邀请 5 人");
      renderMeetingSetup();
      return;
    }
    if (target.dataset.action === "start-meeting" && invitedIds.size > 0) {
      target.disabled = true;
      try {
        const topic = String(meetingTopic ?? "").trim().slice(0, 80) || null;
        const acceptedIds = await onMeetingStart([...invitedIds], topic);
        invitedIds.clear();
        acceptedIds.forEach((personId) => invitedIds.add(personId));
        meetingActive = true;
        meetingEndedState = false;
        meetingTopic = topic;
        meetingCursor = 0;
        meetingMessages.length = 0;
        if (meetingLive) {
          // live：会议对话由后端 LLM 产出，经快照事件回流；这里没有预制台词
          pushMeetingMessage({
            system: true,
            text: topic
              ? `议题「${topic}」已定下，大家正在入座，讨论马上开始。`
              : "大家正在入座，讨论马上开始。",
          });
        } else {
          pushMeetingMessage({
            personId: [...invitedIds][0],
            text: "大家都到了。既然坐在同一张桌边，我们从最近发生的一件事开始吧。",
          });
          setPersonExpression([...invitedIds][0], "happy", {
            source: "roundtable-opening",
            duration: 4.5,
          });
        }
        renderMeetingActive();
      } catch (error) {
        console.error(error);
        target.disabled = false;
        showToast(error?.message || "圆桌暂时没有准备好");
      }
      return;
    }
    if (target.dataset.action === "end-meeting") {
      await requestCloseMeeting();
      return;
    }
    if (target.dataset.meetingTopic) {
      void submitMeetingMessage(target.dataset.meetingTopic);
    }
  });

  // 议题输入即时同步（邀请列表重渲染会重建输入框，靠 meetingTopic 恢复值）
  root.addEventListener("input", (event) => {
    if (event.target.closest("[data-meeting-topic-input]")) {
      meetingTopic = event.target.value;
    }
  });

  root.addEventListener("submit", (event) => {
    const profileForm = event.target.closest("[data-profile-form]");
    if (profileForm) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(profileForm).entries());
      savePersonProfile(
        profileForm.dataset.profilePerson,
        values,
        profileForm.dataset.profileContext,
      );
      return;
    }
    const form = event.target.closest("[data-meeting-form]");
    if (!form) return;
    event.preventDefault();
    const input = form.elements.message;
    void submitMeetingMessage(input.value);
    input.value = "";
  });

  refreshGraph();
  hydrateIcons(root);

  let unsubscribeSignalStore = () => {};
  if (typeof signalStore?.subscribe === "function") {
    const subscription = signalStore.subscribe((event, metadata = {}) => {
      if (!event && metadata.removed) {
        clearPersonSignal(metadata.personId);
        return;
      }
      applyPersonSignal(event?.snapshot ?? event?.signal ?? event);
    });
    if (typeof subscription === "function") unsubscribeSignalStore = subscription;
  }

  return {
    setWorldReady(ready) {
      worldReady = Boolean(ready);
      const button = root.querySelector('[data-action="enter-cafe"]');
      button.disabled = !worldReady;
      button.classList.toggle("is-ready", worldReady);
    },
    setView,
    selectWorldPerson(personId) {
      selectedWorldPerson = people.find((person) => person.id === personId) ?? null;
      inspectorModes.world = "profile";
      renderWorldInspector();
    },
    updateAgentState(state) {
      if (!state) return;
      agentStates.set(state.personId, state);
      if (selectedWorldPerson?.id === state.personId) renderWorldInspector();
      if (selectedMapPerson?.id === state.personId) renderMapInspector();
    },
    setRoundtableNearby() {
      // 已退役（2026-08-04）：旧的 #roundtable-prompt 悬浮入口由场景热点
      // cafe-roundtable（E/F 情境菜单）完全取代，避免两套提示并存造成的重叠。
      // 方法保留为空操作，兼容既有调用点。
    },
    setMeetingLive(value) {
      // 后端可达性在 boot() 异步探测后回填（auto 模式），会议台词因此能
      // 在探测完成后再决定走真实后端还是本地演示轮播。
      meetingLive = Boolean(value);
    },
    openMeeting(personIds = []) {
      if (meetingActive || meetingSheetOpen || world !== "cafe") return false;
      meetingSheetOpen = true;
      meetingEndedState = false;
      meetingTopic = null;
      invitedIds.clear();
      for (const personId of personIds) {
        if (people.some((person) => person.id === personId) && invitedIds.size < 5) {
          invitedIds.add(personId);
        }
      }
      shell.classList.add("has-meeting-sheet");
      renderMeetingSetup();
      return true;
    },
    closeMeeting() {
      if (meetingActive) return false;
      closeMeetingSheet();
      return true;
    },
    requestCloseMeeting,
    // live 模式：快照事件里的会议台词（agent-talk 带本场 meeting_id）进入会议线程
    ingestMeetingMessage({ personId, text } = {}) {
      if (!meetingActive || !meetingSheetOpen) return false;
      const person = people.find((candidate) => candidate.id === personId);
      if (!person || !text) return false;
      pushMeetingMessage({ personId, text: String(text) });
      setPersonExpression(personId, expressionForText(String(text)), {
        source: "roundtable-live",
        text: String(text),
        duration: 4.5,
      });
      renderMeetingActive();
      return true;
    },
    // live 模式：后端会议散场（meeting-ended 事件）→ 线程定格为"会议结束"
    meetingEnded() {
      if (!meetingActive) return false;
      meetingActive = false;
      meetingEndedState = true;
      if (meetingSheetOpen) renderMeetingEnded();
      return true;
    },
    showNpcConversation({ speakerId, text, duration = 4.5 }) {
      const person = people.find((candidate) => candidate.id === speakerId);
      if (!person) return;
      setPersonExpression(speakerId, expressionForText(text), {
        source: "npc-conversation",
        text,
        duration,
      });
      let bubble = speechLayer.querySelector(`[data-speech-person="${speakerId}"]`);
      if (!bubble) {
        bubble = document.createElement("div");
        bubble.className = "world-speech-bubble";
        bubble.dataset.speechPerson = speakerId;
        speechLayer.append(bubble);
      }
      bubble.innerHTML = `<span>${person.name}</span><p>${escapeHtml(text)}</p>`;
      bubble.classList.add("is-visible");
      activeSpeechIds.add(speakerId);
      window.clearTimeout(speechTimers.get(speakerId));
      speechTimers.set(speakerId, window.setTimeout(() => {
        bubble.classList.remove("is-visible");
        activeSpeechIds.delete(speakerId);
      }, duration * 1000));
    },
    positionSpeech(personId, x, y, visible) {
      const bubble = speechLayer.querySelector(`[data-speech-person="${personId}"]`);
      if (!bubble) return;
      const compact = window.innerWidth <= 700;
      const bubbleWidth = compact
        ? Math.min(190, window.innerWidth * 0.52)
        : Math.min(230, window.innerWidth * 0.42);
      const horizontalMargin = bubbleWidth * 0.5 + 12;
      const safeX = Math.min(
        Math.max(x, horizontalMargin),
        window.innerWidth - horizontalMargin,
      );
      const safeY = Math.max(y, compact ? 252 : 244);
      bubble.style.left = `${safeX}px`;
      bubble.style.top = `${safeY}px`;
      bubble.style.visibility = visible ? "visible" : "hidden";
    },
    showToast,
    setPersonExpression,
    setPersonSignal,
    getPersonSignal,
    getPersonExpression(personId) {
      return personExpressions.get(personId) ?? "neutral";
    },
    get speechPersonIds() {
      return [...activeSpeechIds];
    },
    get view() {
      return currentView;
    },
    get isMeetingActive() {
      return meetingActive;
    },
    get isMeetingSheetOpen() {
      return meetingSheetOpen;
    },
    get isWorldReady() {
      return worldReady;
    },
    destroy() {
      unsubscribeSignalStore();
    },
  };
}
