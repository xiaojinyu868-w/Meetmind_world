import {
  AudioLines,
  Building2,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CloudUpload,
  FileImage,
  FileText,
  Film,
  Globe,
  LoaderCircle,
  Lock,
  MapPin,
  Music,
  NotebookPen,
  PartyPopper,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Tags,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
  createIcons,
} from "lucide";
import "./pipeline.css";

/**
 * PipelineFlow —— 「录入 → 处理 → 确认」三屏相遇仪式流程（对应 docs/API.md 的 IF-1 / IF-2 / IF-3）。
 *
 * 自包含模块：只依赖 lucide 与本目录的 pipeline.css；面向接口契约编程，
 * api 对象由宿主在 mount 时注入，本模块不 import 任何具体实现（mock 或真实后端皆可）。
 *
 * api 约定：
 *   ingest(payload, onUploadProgress?) => Promise<{ input_id: string, ... }>
 *     payload = { files: File[], captured_at: string, device: string, note: string, place_hint: string }
 *     onUploadProgress(percent 0-100) 可选；实现不回调时上传进度条呈不定态（不是假进度）。
 *   pipelineStream(inputId, onProgress) => Promise<{ encounter_draft } | encounterDraft>
 *     onProgress(event)：event = { step, status: "active" | "done" | "error", ...载荷 }
 *       或 { type: "result", encounter_draft }。节奏完全由事件驱动。
 *     载荷字段与契约一致：preprocess.keyframes[]、faces.face_candidates[]、
 *     transcript.summary_draft / segments[]、scene.scene_tags[] / photos[]。
 *   confirm(payload) => Promise<{ person_id: string, encounter_id?: string, avatar_status?: string }>
 *     payload = { encounter_draft, identity: { name, match_person_id }, privacy }
 *   assetUrl?(ref) => string  可选：把事实层指针（facts/...）解析为可加载 URL。
 *
 * opts：
 *   onConfirmed({ person_id })  确认成功回调（恰好触发一次）
 *   onClose()                   浮层被关闭时回调
 *   people                      已有人物列表（「可能是谁」并入候选），[{ person_id | id, name }]
 *   device                      IF-1 的 device 字段，默认 "phone"
 *   assetUrl(ref)               同 api.assetUrl，优先级低于 api.assetUrl
 *
 * 返回 handle：{ open, close, unmount, isOpen, phase }
 */

const ICONS = {
  AudioLines,
  Building2,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CloudUpload,
  FileImage,
  FileText,
  Film,
  Globe,
  LoaderCircle,
  Lock,
  MapPin,
  Music,
  NotebookPen,
  PartyPopper,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Tags,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
};

const STEPS = Object.freeze([
  { id: "preprocess", label: "预处理", icon: "film" },
  { id: "faces", label: "人脸", icon: "scan-face" },
  { id: "transcript", label: "转写", icon: "audio-lines" },
  { id: "scene", label: "场景", icon: "tags" },
  { id: "draft", label: "草稿", icon: "file-text" },
]);

const PRIVACY_LEVELS = Object.freeze([
  { value: "self-only", label: "仅自己可见", desc: "只有你能看到这段相遇，Agent 互动不携带", icon: "lock" },
  { value: "agent-usable", label: "Agent 可用", desc: "你的 Agent 可用于互动与匹配，不展示给其他用户", icon: "user-check" },
  { value: "org-shared", label: "组织内共享", desc: "在你所在的组织空间内可见", icon: "building-2" },
  { value: "public-approved", label: "本人同意公开", desc: "经 TA 本人同意后对外公开", icon: "globe" },
]);

const PHASE_META = Object.freeze({
  ingest: { title: "记录一次相遇", crumb: 0 },
  uploading: { title: "正在上传素材", crumb: 0 },
  processing: { title: "正在整理这次相遇", crumb: 1 },
  confirm: { title: "确认 TA 的身份", crumb: 2 },
  success: { title: "欢迎入住", crumb: 2 },
});

const CRUMB_LABELS = Object.freeze(["录入", "处理", "确认"]);

const ACCEPT_STRING = ".mp4,.mov,.m4a,.wav,.mp3,video/mp4,video/quicktime,audio/*,image/*";
const ACCEPTED_MIME = /^(video\/(mp4|quicktime)|audio\/(mpeg|mp4|x-m4a|m4a|wav|x-wav|mp3|aac)|image\/[\w.+-]+)$/;
const ACCEPTED_EXT = /\.(mp4|mov|m4a|wav|mp3|png|jpe?g|webp|gif|heic|heif)$/i;
const MAX_FILE_SIZE = 500 * 1024 * 1024;

const AVATAR_STATUS_COPY = Object.freeze({
  placeholder: "占位形象已生成，稍后可升级为 TA 的专属形象",
  queued: "TA 的专属形象正在排队生成",
  ready: "TA 的专属形象已就绪",
});

const TYPEWRITER_INTERVAL = 30;
const SUCCESS_AUTO_CLOSE = 3400;


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name, className = "") {
  return `<i data-lucide="${name}"${className ? ` class="${className}"` : ""}></i>`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function fileKind(file) {
  const type = file.type || "";
  const name = file.name || "";
  if (type.startsWith("video/") || /\.(mp4|mov)$/i.test(name)) return "video";
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(name)) return "image";
  return "audio";
}

function isAcceptedFile(file) {
  return ACCEPTED_MIME.test(file.type || "") || ACCEPTED_EXT.test(file.name || "");
}

function friendlyError(error, fallback) {
  const status = error?.status ?? error?.code;
  if (status === 400) return "文件格式不支持，请换成 mp4 / mov / m4a / wav / mp3 或照片";
  if (status === 413) return "文件超出大小限制（单个 ≤ 500MB）";
  const message = String(error?.message ?? "").trim();
  if (message && message.length <= 60) return message;
  return fallback;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}


export function mountPipelineFlow(container, api, opts = {}) {
  if (!container) throw new Error("mountPipelineFlow 需要一个容器元素");
  if (!api || typeof api.ingest !== "function" || typeof api.pipelineStream !== "function" || typeof api.confirm !== "function") {
    throw new Error("mountPipelineFlow 需要 api 实现 ingest / pipelineStream / confirm 三个方法");
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const onConfirmed = typeof opts.onConfirmed === "function" ? opts.onConfirmed : () => {};
  const onClose = typeof opts.onClose === "function" ? opts.onClose : () => {};

  let alive = true;
  let open = false;
  let runId = 0;
  let confirmedFired = false;
  let typeTimer = null;
  let successTimer = null;

  const state = {
    phase: "ingest",
    files: [],
    note: "",
    place: "",
    capturedAt: "",
    uploadPercent: null,
    inputId: null,
    stepStatus: new Map(STEPS.map((step) => [step.id, "waiting"])),
    keyframes: [],
    faces: [],
    sceneTags: [],
    transcriptTarget: "",
    transcriptTyped: "",
    pendingDraft: null,
    streamError: null,
    draft: null,
    name: "",
    mergeId: null,
    privacy: "self-only",
    avatarStatus: "placeholder",
    personId: null,
    submitting: false,
    error: null,
    fileError: "",
  };

  const rootEl = document.createElement("div");
  rootEl.className = "pf-overlay";
  rootEl.setAttribute("role", "dialog");
  rootEl.setAttribute("aria-modal", "true");
  rootEl.setAttribute("aria-label", "相遇录入流程");
  rootEl.tabIndex = -1;
  container.append(rootEl);

  function hydrateIcons(scope) {
    createIcons({ icons: ICONS, root: scope, attrs: { "stroke-width": 1.8 } });
    for (const svg of scope.querySelectorAll("svg[data-lucide]")) svg.removeAttribute("data-lucide");
  }

  function resolveAssetUrl(ref) {
    if (!ref) return "";
    if (typeof api.assetUrl === "function") return api.assetUrl(ref);
    if (typeof opts.assetUrl === "function") return opts.assetUrl(ref);
    return String(ref);
  }

  function peopleOptions() {
    return (Array.isArray(opts.people) ? opts.people : [])
      .map((person) => ({ id: person.person_id ?? person.id, name: person.name ?? person.person_id ?? person.id }))
      .filter((person) => person.id);
  }

  function personNameOf(personId) {
    return peopleOptions().find((person) => person.id === personId)?.name ?? "";
  }

  function bestFaceMatch() {
    return state.faces
      .filter((face) => face.match_person_id)
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0] ?? null;
  }

  function resetState() {
    for (const file of state.files) {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
    }
    window.clearInterval(typeTimer);
    window.clearTimeout(successTimer);
    typeTimer = null;
    successTimer = null;
    state.phase = "ingest";
    state.files = [];
    state.note = "";
    state.place = "";
    state.capturedAt = "";
    state.uploadPercent = null;
    state.inputId = null;
    state.stepStatus = new Map(STEPS.map((step) => [step.id, "waiting"]));
    state.keyframes = [];
    state.faces = [];
    state.sceneTags = [];
    state.transcriptTarget = "";
    state.transcriptTyped = "";
    state.pendingDraft = null;
    state.streamError = null;
    state.draft = null;
    state.name = "";
    state.mergeId = null;
    state.privacy = "self-only";
    state.avatarStatus = "placeholder";
    state.personId = null;
    state.submitting = false;
    state.error = null;
    state.fileError = "";
    confirmedFired = false;
  }

  /* ---------- 渲染 ---------- */

  function render() {
    const meta = PHASE_META[state.phase];
    rootEl.innerHTML = `
      <div class="pf-panel" data-pf-panel>
        <header class="pf-header">
          <span class="pf-brand">EW</span>
          <div class="pf-header-copy">
            <small>ECHOWORLD · 相遇仪式</small>
            <strong>${meta.title}</strong>
          </div>
          <ol class="pf-crumb" aria-label="流程进度">
            ${CRUMB_LABELS.map((label, index) => `
              <li class="${index < meta.crumb ? "is-done" : ""}${index === meta.crumb ? "is-current" : ""}">
                <i></i><span>${label}</span>
              </li>`).join("")}
          </ol>
          <button class="pf-icon-button" type="button" data-action="close" title="关闭" aria-label="关闭相遇流程">${icon("x")}</button>
        </header>
        <div class="pf-body" data-pf-body></div>
      </div>`;
    const body = rootEl.querySelector("[data-pf-body]");
    if (state.phase === "ingest") renderIngest(body);
    else if (state.phase === "uploading") renderUploading(body);
    else if (state.phase === "processing") renderProcessing(body);
    else if (state.phase === "confirm") renderConfirm(body);
    else if (state.phase === "success") renderSuccess(body);
    hydrateIcons(rootEl);
  }

  function errorBanner(phase) {
    if (!state.error || state.error.phase !== phase) return "";
    return `
      <div class="pf-error" role="alert">
        ${icon("circle-alert")}
        <span>${escapeHtml(state.error.message)}</span>
      </div>`;
  }

  function fileRow(file) {
    const kind = fileKind(file);
    const kindIcon = kind === "video" ? "video" : kind === "image" ? "image" : "music";
    const thumb = file.previewUrl
      ? `<img src="${file.previewUrl}" alt="" />`
      : `<span class="pf-file-kind is-${kind}">${icon(kindIcon)}</span>`;
    return `
      <li class="pf-file-row">
        ${thumb}
        <span class="pf-file-meta"><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)}</small></span>
        <button class="pf-file-remove" type="button" data-remove-file="${escapeHtml(file.key)}" title="移除" aria-label="移除 ${escapeHtml(file.name)}">${icon("trash-2")}</button>
      </li>`;
  }

  function renderIngest(body) {
    body.innerHTML = `
      <div class="pf-dropzone" data-pf-dropzone role="button" tabindex="0" aria-label="拖拽或点击选择媒体文件">
        <input type="file" data-pf-file-input multiple accept="${ACCEPT_STRING}" hidden />
        <span class="pf-dropzone-icon">${icon("cloud-upload")}</span>
        <strong>拖拽视频 / 录音 / 现场照片到这里</strong>
        <small>或点击选择文件 · 支持 mp4 / mov / m4a / wav / mp3 / 照片（可多选）· 单个 ≤ 500MB</small>
      </div>
      ${state.fileError ? `<p class="pf-file-error" role="alert">${icon("circle-alert")}${escapeHtml(state.fileError)}</p>` : ""}
      ${state.files.length > 0 ? `
        <ul class="pf-file-list" aria-label="已选文件">
          ${state.files.map(fileRow).join("")}
        </ul>` : ""}
      <div class="pf-field-grid">
        <label class="pf-field">
          <span>${icon("notebook-pen")}备注</span>
          <input type="text" data-pf-note maxlength="60" placeholder="如：黑客松 3 号展位的介绍者" value="${escapeHtml(state.note)}" />
        </label>
        <label class="pf-field">
          <span>${icon("map-pin")}地点提示</span>
          <input type="text" data-pf-place maxlength="40" placeholder="如：上海 · 西岸艺术中心" value="${escapeHtml(state.place)}" />
        </label>
      </div>
      ${errorBanner("ingest")}
      <footer class="pf-footer">
        <span class="pf-footer-hint">采集时间自动记录为当前时间 · 原始素材落盘后只增不改</span>
        <button class="pf-button-primary" type="button" data-action="submit-ingest" ${state.files.length === 0 ? "disabled" : ""}>
          上传并开始整理${icon("sparkles")}
        </button>
      </footer>`;
  }

  function renderUploading(body) {
    const failed = state.error?.phase === "uploading";
    const totalBytes = state.files.reduce((sum, file) => sum + (file.size || 0), 0);
    body.innerHTML = `
      <div class="pf-upload-stage">
        <span class="pf-upload-orb${failed ? " is-failed" : ""}">
          ${icon(failed ? "circle-alert" : "cloud-upload")}
        </span>
        <h2>${failed ? "上传没有完成" : "正在把现场封存进事实层"}</h2>
        <p>${state.files.length} 个文件 · ${formatBytes(totalBytes)} · 落盘后只读</p>
        ${failed ? `
          ${errorBanner("uploading")}
          <div class="pf-error-actions">
            <button class="pf-button-primary" type="button" data-action="retry-upload">${icon("refresh-cw")}重试上传</button>
            <button class="pf-button-ghost" type="button" data-action="back-ingest">返回修改</button>
          </div>` : `
          <div class="pf-upload-track" role="progressbar" aria-label="上传进度"${state.uploadPercent == null ? "" : ` aria-valuenow="${Math.round(state.uploadPercent)}" aria-valuemin="0" aria-valuemax="100"`}>
            <div class="${state.uploadPercent == null ? "is-indeterminate" : ""}" data-pf-upload-bar style="width:${state.uploadPercent ?? 0}%"></div>
          </div>
          <span class="pf-upload-pct" data-pf-upload-pct>${state.uploadPercent == null ? "正在建立连接…" : `${Math.round(state.uploadPercent)}%`}</span>`}
      </div>`;
  }

  function stepMarkup(step) {
    const status = state.stepStatus.get(step.id);
    return `
      <li class="pf-step is-${status}" data-step="${step.id}">
        <span class="pf-step-dot" data-icon="${status === "done" ? "check" : step.icon}">${icon(status === "done" ? "check" : step.icon)}</span>
        <span class="pf-step-label">${step.label}</span>
      </li>`;
  }

  function faceCardMarkup(face) {
    const confidence = Math.round((face.confidence ?? 0) * 100);
    const circumference = 2 * Math.PI * 40;
    const matchName = face.match_person_id
      ? (face.match_name || personNameOf(face.match_person_id) || face.match_person_id)
      : "";
    return `
      <article class="pf-face-card">
        <span class="pf-face-photo">
          <svg class="pf-ring" viewBox="0 0 88 88" aria-hidden="true">
            <circle class="pf-ring-track" cx="44" cy="44" r="40"></circle>
            <circle class="pf-ring-value" cx="44" cy="44" r="40" stroke-dasharray="${(confidence / 100) * circumference} ${circumference}"></circle>
          </svg>
          <img src="${escapeHtml(resolveAssetUrl(face.face_ref ?? face.photo ?? face.url))}" alt="人脸候选照片" loading="lazy" />
          <em>${confidence}%</em>
        </span>
        ${face.match_person_id
          ? `<span class="pf-face-badge is-match">${icon("sparkles")}可能是 ${escapeHtml(matchName)}</span>`
          : `<span class="pf-face-badge is-new">${icon("user-plus")}新面孔</span>`}
      </article>`;
  }

  function renderProcessing(body) {
    if (state.error?.phase === "processing") {
      body.innerHTML = `
        <div class="pf-upload-stage">
          <span class="pf-upload-orb is-failed">${icon("circle-alert")}</span>
          <h2>整理中途出了点问题</h2>
          <p>已落盘的素材不受影响，可以直接重试处理</p>
          ${errorBanner("processing")}
          <div class="pf-error-actions">
            <button class="pf-button-primary" type="button" data-action="retry-pipeline">${icon("refresh-cw")}重新处理</button>
            <button class="pf-button-ghost" type="button" data-action="back-ingest">重新录入</button>
          </div>
        </div>`;
      return;
    }
    body.innerHTML = `
      <ol class="pf-steps" data-pf-steps aria-label="处理步骤">
        ${STEPS.map(stepMarkup).join("")}
      </ol>
      <div class="pf-processing-grid">
        <section class="pf-section is-wide">
          <h3>${icon("film")}关键帧</h3>
          <div class="pf-filmstrip" data-pf-filmstrip>
            ${state.keyframes.length === 0 ? `<span class="pf-empty">正在抽取现场画面…</span>` : ""}
          </div>
        </section>
        <section class="pf-section">
          <h3>${icon("scan-face")}人脸候选</h3>
          <div class="pf-face-row" data-pf-faces>
            ${state.faces.length === 0 ? `<span class="pf-empty">正在寻找面孔…</span>` : ""}
          </div>
        </section>
        <section class="pf-section">
          <h3>${icon("audio-lines")}转写</h3>
          <div class="pf-transcript is-typing" data-pf-transcript aria-live="polite">
            <span data-pf-transcript-text>${escapeHtml(state.transcriptTyped)}</span>
            ${state.transcriptTarget ? "" : `<span class="pf-empty" data-pf-transcript-empty>正在聆听对话…</span>`}
          </div>
        </section>
        <section class="pf-section is-wide">
          <h3>${icon("tags")}场景</h3>
          <div class="pf-chip-row" data-pf-scenes>
            ${state.sceneTags.length === 0 ? `<span class="pf-empty">正在识别场景…</span>` : ""}
          </div>
        </section>
      </div>
      <footer class="pf-footer">
        <span class="pf-footer-hint">${icon("loader-circle", "pf-spin")}中间特征实时流入，节奏跟随处理流</span>
      </footer>`;
    if (state.keyframes.length > 0) {
      const strip = body.querySelector("[data-pf-filmstrip]");
      for (const ref of state.keyframes) appendFilmFrame(ref, false);
      void strip;
    }
    if (state.faces.length > 0) {
      for (const face of state.faces) appendFaceCard(face, false);
    }
    if (state.sceneTags.length > 0) {
      for (const tag of state.sceneTags) appendSceneChip(tag, false);
    }
    if (state.transcriptTarget) startTypewriter();
  }

  function renderConfirm(body) {
    const bestFace = [...state.faces].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0] ?? null;
    const summary = state.transcriptTarget || state.draft?.summary_draft || state.draft?.encounter?.summary || "";
    const place = state.place || state.draft?.encounter?.place || state.draft?.place_hint || "";
    const timeText = state.capturedAt
      ? new Date(state.capturedAt).toLocaleString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "";
    const options = peopleOptions();
    if (state.mergeId && !options.some((person) => person.id === state.mergeId)) {
      options.unshift({ id: state.mergeId, name: `可能是 ${bestFaceMatch()?.match_name || personNameOf(state.mergeId) || state.mergeId}` });
    }
    body.innerHTML = `
      <div class="pf-confirm-grid">
        <aside class="pf-recap">
          <span class="pf-recap-photo${bestFace ? "" : " is-empty"}">
            ${bestFace ? `<img src="${escapeHtml(resolveAssetUrl(bestFace.face_ref ?? bestFace.photo ?? bestFace.url))}" alt="相遇照片" />` : icon("scan-face")}
          </span>
          <div class="pf-recap-lines">
            <small>相遇草稿 · 待确认</small>
            ${timeText || place ? `<p>${icon("map-pin")}${escapeHtml([timeText, place].filter(Boolean).join(" · "))}</p>` : ""}
            ${summary ? `<blockquote>${escapeHtml(summary)}</blockquote>` : ""}
            ${state.sceneTags.length > 0 ? `
              <div class="pf-chip-row is-static">${state.sceneTags.map((tag) => `<span class="pf-chip">${icon("tags")}${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
          </div>
        </aside>
        <form class="pf-confirm-form" data-pf-confirm-form novalidate>
          <label class="pf-field">
            <span>${icon("notebook-pen")}TA 怎么称呼？</span>
            <input type="text" data-pf-name name="name" maxlength="24" placeholder="输入姓名或称呼" value="${escapeHtml(state.name)}" autocomplete="off" required />
          </label>
          <label class="pf-field">
            <span>${icon("users")}可能是谁</span>
            <span class="pf-select-wrap">
              <select data-pf-merge aria-label="并入已有人物或新建">
                <option value="">新建此人</option>
                ${options.map((person) => `<option value="${escapeHtml(person.id)}"${person.id === state.mergeId ? " selected" : ""}>并入：${escapeHtml(person.name)}</option>`).join("")}
              </select>
              ${icon("chevron-down")}
            </span>
            <small class="pf-field-hint">并入已有 Package，或为这次相遇新建一个人物</small>
          </label>
          <fieldset class="pf-privacy">
            <legend>${icon("shield-check")}隐私级别</legend>
            ${PRIVACY_LEVELS.map((level) => `
              <label class="pf-privacy-card${state.privacy === level.value ? " is-selected" : ""}">
                <input type="radio" name="pf-privacy" value="${level.value}"${state.privacy === level.value ? " checked" : ""} />
                ${icon(level.icon)}
                <span><strong>${level.label}</strong><small>${level.desc}</small></span>
                <i class="pf-privacy-check">${icon("check")}</i>
              </label>`).join("")}
          </fieldset>
          ${errorBanner("confirm")}
          <footer class="pf-footer">
            <span class="pf-footer-hint">确认后才写入你的关系世界（事实层只增不改）</span>
            <button class="pf-button-primary" type="submit" data-pf-confirm-submit ${state.name.trim() && !state.submitting ? "" : "disabled"}>
              ${state.submitting ? icon("loader-circle", "pf-spin") : icon("circle-check")}${state.submitting ? "正在写入…" : "确认并写入世界"}
            </button>
          </footer>
        </form>
      </div>`;
  }

  function renderSuccess(body) {
    const name = state.name.trim() || "TA";
    body.innerHTML = `
      <div class="pf-success">
        <span class="pf-success-halo"></span>
        <span class="pf-success-halo is-late"></span>
        <span class="pf-success-badge">${icon("party-popper")}</span>
        <h2>TA 已住进你的世界</h2>
        <p><strong>${escapeHtml(name)}</strong> · ${escapeHtml(AVATAR_STATUS_COPY[state.avatarStatus] ?? AVATAR_STATUS_COPY.placeholder)}</p>
        <button class="pf-button-primary" type="button" data-action="finish">回到咖啡厅</button>
      </div>`;
  }

  /* ---------- 处理屏的增量补丁（避免重放动画） ---------- */

  function patchSteps() {
    const rail = rootEl.querySelector("[data-pf-steps]");
    if (!rail) return;
    for (const step of STEPS) {
      const item = rail.querySelector(`[data-step="${step.id}"]`);
      if (!item) continue;
      const status = state.stepStatus.get(step.id);
      item.classList.toggle("is-waiting", status === "waiting");
      item.classList.toggle("is-active", status === "active");
      item.classList.toggle("is-done", status === "done");
      const dot = item.querySelector(".pf-step-dot");
      const want = status === "done" ? "check" : step.icon;
      if (dot?.dataset.icon !== want) {
        dot.dataset.icon = want;
        dot.innerHTML = icon(want);
        hydrateIcons(dot);
      }
    }
  }

  function markStep(stepId, status) {
    const index = STEPS.findIndex((step) => step.id === stepId);
    if (index === -1) return;
    if (status === "done" || status === "active") {
      for (const prior of STEPS.slice(0, index)) {
        if (state.stepStatus.get(prior.id) !== "done") state.stepStatus.set(prior.id, "done");
      }
    }
    state.stepStatus.set(stepId, status);
    patchSteps();
  }

  function appendFilmFrame(ref, animate = true) {
    const strip = rootEl.querySelector("[data-pf-filmstrip]");
    if (!strip) return;
    strip.querySelector(".pf-empty")?.remove();
    const frame = document.createElement("figure");
    frame.className = `pf-frame${animate ? "" : " is-settled"}`;
    frame.innerHTML = `<img src="${escapeHtml(resolveAssetUrl(ref))}" alt="现场关键帧" loading="lazy" />`;
    strip.append(frame);
    frame.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest", inline: "end" });
  }

  function appendFaceCard(face, animate = true) {
    const row = rootEl.querySelector("[data-pf-faces]");
    if (!row) return;
    row.querySelector(".pf-empty")?.remove();
    const wrapper = document.createElement("div");
    wrapper.className = animate ? "" : "is-settled";
    wrapper.innerHTML = faceCardMarkup(face);
    const card = wrapper.firstElementChild;
    if (!animate) card.classList.add("is-settled");
    row.append(card);
    hydrateIcons(card);
  }

  function appendSceneChip(tag, animate = true) {
    const row = rootEl.querySelector("[data-pf-scenes]");
    if (!row) return;
    row.querySelector(".pf-empty")?.remove();
    const chip = document.createElement("span");
    chip.className = `pf-chip${animate ? "" : " is-settled"}`;
    chip.innerHTML = `${icon("tags")}${escapeHtml(tag)}`;
    row.append(chip);
    hydrateIcons(chip);
  }

  function startTypewriter() {
    window.clearInterval(typeTimer);
    typeTimer = null;
    const textEl = rootEl.querySelector("[data-pf-transcript-text]");
    rootEl.querySelector("[data-pf-transcript-empty]")?.remove();
    if (!textEl) return;
    if (reducedMotion) {
      state.transcriptTyped = state.transcriptTarget;
      textEl.textContent = state.transcriptTyped;
      return;
    }
    typeTimer = window.setInterval(() => {
      if (state.transcriptTyped.length >= state.transcriptTarget.length) {
        window.clearInterval(typeTimer);
        typeTimer = null;
        return;
      }
      const lag = state.transcriptTarget.length - state.transcriptTyped.length;
      const step = lag > 90 ? 4 : lag > 40 ? 2 : 1;
      state.transcriptTyped = state.transcriptTarget.slice(0, state.transcriptTyped.length + step);
      const el = rootEl.querySelector("[data-pf-transcript-text]");
      if (el) el.textContent = state.transcriptTyped;
    }, TYPEWRITER_INTERVAL);
  }

  function setTranscriptTarget(text) {
    const clean = String(text ?? "").trim();
    if (!clean || clean === state.transcriptTarget) return;
    state.transcriptTarget = state.transcriptTarget && !state.transcriptTarget.endsWith(clean)
      ? `${state.transcriptTarget} ${clean}`
      : clean;
    startTypewriter();
  }

  function patchUploadBar() {
    const bar = rootEl.querySelector("[data-pf-upload-bar]");
    const label = rootEl.querySelector("[data-pf-upload-pct]");
    if (!bar || state.uploadPercent == null) return;
    bar.classList.remove("is-indeterminate");
    bar.style.width = `${state.uploadPercent}%`;
    if (label) label.textContent = `${Math.round(state.uploadPercent)}%`;
  }

  /* ---------- 流程动作 ---------- */

  function addFiles(fileList) {
    const incoming = [...fileList];
    const rejected = [];
    let added = 0;
    for (const file of incoming) {
      if (!isAcceptedFile(file)) {
        rejected.push(`${file.name}（格式不支持）`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}（超过 500MB）`);
        continue;
      }
      if (state.files.some((item) => item.name === file.name && item.size === file.size)) continue;
      file.key = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
      if (fileKind(file) === "image") file.previewUrl = URL.createObjectURL(file);
      state.files.push(file);
      added += 1;
    }
    state.fileError = rejected.length > 0 ? `已跳过：${rejected.join("、")}` : "";
    if (added > 0 || rejected.length > 0) render();
  }

  async function runUpload() {
    const run = ++runId;
    state.phase = "uploading";
    state.error = null;
    state.uploadPercent = null;
    state.capturedAt = new Date().toISOString();
    render();
    try {
      const response = await api.ingest(
        {
          files: state.files,
          captured_at: state.capturedAt,
          device: opts.device ?? "phone",
          note: state.note.trim(),
          place_hint: state.place.trim(),
        },
        (percent) => {
          if (run !== runId || !alive || typeof percent !== "number") return;
          state.uploadPercent = Math.max(0, Math.min(100, percent));
          patchUploadBar();
        },
      );
      if (run !== runId || !alive) return;
      const inputId = response?.input_id ?? response?.inputId ?? null;
      if (!inputId) throw new Error("服务未返回 input_id，请重试");
      state.inputId = inputId;
      await runPipeline(run);
    } catch (error) {
      if (run !== runId || !alive) return;
      console.error("[PipelineFlow] ingest failed:", error);
      state.error = { phase: "uploading", message: friendlyError(error, "上传失败，请检查网络后重试") };
      render();
    }
  }

  function handlePipelineEvent(event) {
    if (!event || typeof event !== "object") return;
    if (event.type === "result" || event.encounter_draft) {
      if (event.encounter_draft) state.pendingDraft = event.encounter_draft;
      return;
    }
    const step = event.step;
    if (!STEPS.some((item) => item.id === step)) return;
    if (event.status === "error") {
      state.streamError = new Error(event.message || "处理失败，请重试");
      throw state.streamError;
    }
    markStep(step, event.status === "done" ? "done" : "active");
    if (Array.isArray(event.keyframes)) {
      for (const ref of event.keyframes) {
        if (state.keyframes.includes(ref)) continue;
        state.keyframes.push(ref);
        appendFilmFrame(ref);
      }
    }
    if (Array.isArray(event.photos)) {
      for (const ref of event.photos) {
        if (state.keyframes.includes(ref)) continue;
        state.keyframes.push(ref);
        appendFilmFrame(ref);
      }
    }
    if (Array.isArray(event.face_candidates)) {
      for (const face of event.face_candidates) {
        const key = face?.face_ref ?? face?.photo ?? JSON.stringify(face);
        if (state.faces.some((item) => (item.face_ref ?? item.photo ?? JSON.stringify(item)) === key)) continue;
        state.faces.push(face);
        appendFaceCard(face);
      }
    }
    if (Array.isArray(event.segments)) {
      for (const segment of event.segments) {
        setTranscriptTarget(typeof segment === "string" ? segment : segment?.text ?? "");
      }
    }
    if (typeof event.summary_draft === "string") setTranscriptTarget(event.summary_draft);
    if (typeof event.text === "string" && step === "transcript") setTranscriptTarget(event.text);
    if (Array.isArray(event.scene_tags)) {
      for (const tag of event.scene_tags) {
        if (state.sceneTags.includes(tag)) continue;
        state.sceneTags.push(tag);
        appendSceneChip(tag);
      }
    }
  }

  async function runPipeline(existingRun) {
    const run = existingRun ?? ++runId;
    state.phase = "processing";
    state.error = null;
    state.stepStatus = new Map(STEPS.map((step) => [step.id, "waiting"]));
    state.keyframes = [];
    state.faces = [];
    state.sceneTags = [];
    state.transcriptTarget = "";
    state.transcriptTyped = "";
    state.pendingDraft = null;
    state.streamError = null;
    render();
    try {
      const result = await api.pipelineStream(state.inputId, (event) => {
        if (run !== runId || !alive) return;
        handlePipelineEvent(event);
      });
      if (run !== runId || !alive) return;
      if (state.streamError) throw state.streamError;
      const draft = result?.encounter_draft ?? result ?? state.pendingDraft;
      if (!draft || typeof draft !== "object") throw new Error("未生成相遇草稿，请重试");
      state.draft = draft;
      markStep("draft", "done");
      await wait(reducedMotion ? 120 : 700);
      if (run !== runId || !alive) return;
      enterConfirm();
    } catch (error) {
      if (run !== runId || !alive) return;
      console.error("[PipelineFlow] pipeline failed:", error);
      state.error = { phase: "processing", message: friendlyError(error, "处理失败，请重试") };
      render();
    }
  }

  function enterConfirm() {
    const suggestion = bestFaceMatch();
    state.mergeId = suggestion?.match_person_id ?? null;
    state.name = (state.mergeId ? personNameOf(state.mergeId) : "") || state.draft?.identity?.name || state.draft?.name || "";
    state.phase = "confirm";
    render();
  }

  async function runConfirm() {
    const name = state.name.trim();
    if (!name || state.submitting) return;
    const run = ++runId;
    state.submitting = true;
    state.error = null;
    render();
    try {
      const response = await api.confirm({
        encounter_draft: state.draft,
        identity: { name, match_person_id: state.mergeId || null },
        privacy: state.privacy,
      });
      if (run !== runId || !alive) return;
      const personId = response?.person_id ?? response?.personId ?? null;
      if (!personId) throw new Error("服务未返回 person_id，请重试");
      state.personId = personId;
      state.avatarStatus = response?.avatar_status ?? "placeholder";
      state.submitting = false;
      state.phase = "success";
      render();
      successTimer = window.setTimeout(() => finish(), SUCCESS_AUTO_CLOSE);
    } catch (error) {
      if (run !== runId || !alive) return;
      console.error("[PipelineFlow] confirm failed:", error);
      state.submitting = false;
      state.error = { phase: "confirm", message: friendlyError(error, "确认失败，请重试") };
      render();
    }
  }

  function finish() {
    window.clearTimeout(successTimer);
    successTimer = null;
    if (!confirmedFired && state.personId) {
      confirmedFired = true;
      try {
        onConfirmed({ person_id: state.personId });
      } catch (error) {
        console.error("[PipelineFlow] onConfirmed callback failed:", error);
      }
    }
    close();
  }

  function openFlow() {
    runId += 1;
    resetState();
    open = true;
    render();
    rootEl.classList.add("is-open");
    rootEl.removeAttribute("aria-hidden");
    rootEl.focus({ preventScroll: true });
  }

  function close() {
    if (!open) return;
    runId += 1;
    open = false;
    window.clearInterval(typeTimer);
    window.clearTimeout(successTimer);
    typeTimer = null;
    successTimer = null;
    rootEl.classList.remove("is-open");
    rootEl.setAttribute("aria-hidden", "true");
    onClose();
  }

  function unmount() {
    if (!alive) return;
    alive = false;
    runId += 1;
    window.clearInterval(typeTimer);
    window.clearTimeout(successTimer);
    for (const file of state.files) {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
    }
    document.removeEventListener("keydown", onKeydown, true);
    rootEl.remove();
  }

  /* ---------- 事件委托 ---------- */

  rootEl.addEventListener("click", (event) => {
    const target = event.target.closest("button, [data-pf-dropzone], select, label");
    if (!target || !rootEl.contains(target)) return;

    if (target.dataset.action === "close") {
      close();
      return;
    }
    if (target.dataset.action === "submit-ingest") {
      runUpload();
      return;
    }
    if (target.dataset.action === "retry-upload") {
      runUpload();
      return;
    }
    if (target.dataset.action === "back-ingest") {
      runId += 1;
      state.phase = "ingest";
      state.error = null;
      render();
      return;
    }
    if (target.dataset.action === "retry-pipeline") {
      runPipeline();
      return;
    }
    if (target.dataset.action === "finish") {
      finish();
      return;
    }
    if (target.dataset.removeFile) {
      event.stopPropagation();
      const index = state.files.findIndex((file) => file.key === target.dataset.removeFile);
      if (index !== -1) {
        const [removed] = state.files.splice(index, 1);
        if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
        render();
      }
      return;
    }
    if (target.hasAttribute("data-pf-dropzone")) {
      rootEl.querySelector("[data-pf-file-input]")?.click();
    }
  });

  rootEl.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.hasAttribute?.("data-pf-dropzone")) {
      event.preventDefault();
      rootEl.querySelector("[data-pf-file-input]")?.click();
    }
  });

  rootEl.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-pf-file-input]")) {
      addFiles(target.files);
      target.value = "";
      return;
    }
    if (target.matches("[data-pf-merge]")) {
      state.mergeId = target.value || null;
      if (state.mergeId) {
        state.name = personNameOf(state.mergeId) || state.name;
        const nameInput = rootEl.querySelector("[data-pf-name]");
        if (nameInput) nameInput.value = state.name;
      }
      syncConfirmSubmit();
      return;
    }
    if (target.matches('input[name="pf-privacy"]')) {
      state.privacy = target.value;
      for (const card of rootEl.querySelectorAll(".pf-privacy-card")) {
        card.classList.toggle("is-selected", card.querySelector("input")?.value === state.privacy);
      }
    }
  });

  rootEl.addEventListener("input", (event) => {
    const target = event.target;
    if (target.matches("[data-pf-note]")) {
      state.note = target.value;
      return;
    }
    if (target.matches("[data-pf-place]")) {
      state.place = target.value;
      return;
    }
    if (target.matches("[data-pf-name]")) {
      state.name = target.value;
      syncConfirmSubmit();
    }
  });

  rootEl.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-pf-confirm-form]");
    if (!form) return;
    event.preventDefault();
    runConfirm();
  });

  function syncConfirmSubmit() {
    const submit = rootEl.querySelector("[data-pf-confirm-submit]");
    if (submit) submit.disabled = !state.name.trim() || state.submitting;
  }

  rootEl.addEventListener("dragover", (event) => {
    const zone = event.target.closest?.("[data-pf-dropzone]");
    if (!zone) return;
    event.preventDefault();
    zone.classList.add("is-dragover");
  });

  rootEl.addEventListener("dragleave", (event) => {
    const zone = event.target.closest?.("[data-pf-dropzone]");
    if (!zone || zone.contains(event.relatedTarget)) return;
    zone.classList.remove("is-dragover");
  });

  rootEl.addEventListener("drop", (event) => {
    const zone = event.target.closest?.("[data-pf-dropzone]");
    if (!zone) return;
    event.preventDefault();
    zone.classList.remove("is-dragover");
    if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files);
  });

  rootEl.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const holder = image.closest(".pf-frame, .pf-face-photo, .pf-recap-photo, .pf-file-row");
    if (holder) {
      holder.classList.add("is-broken");
      image.remove();
    }
  }, true);

  function onKeydown(event) {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      close();
    }
  }
  document.addEventListener("keydown", onKeydown, true);

  openFlow();

  return {
    open: openFlow,
    close,
    unmount,
    get isOpen() {
      return open;
    },
    get phase() {
      return state.phase;
    },
  };
}
