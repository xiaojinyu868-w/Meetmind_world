import {
  Check,
  CircleAlert,
  ImagePlus,
  Info,
  LoaderCircle,
  PartyPopper,
  RefreshCw,
  ScanFace,
  Sparkles,
  UserPlus,
  Users,
  X,
  createIcons,
} from "lucide";
import "./onboarding.css";

/**
 * OnboardingFlow —— 「合照入场」三屏群体冷启动流程（FR-2.12，对应 /api/v1/group-onboarding 两段式）。
 *
 * 自包含模块：只依赖 lucide 与本目录的 onboarding.css；api 由宿主注入（mock 或真实后端皆可）。
 *
 * api 约定：
 *   detectGroupPhoto(file) => Promise<{ group_id, status, detector, faces: [{ face_id, bbox, face_ref }] , issues }>
 *     bbox 为归一化 xywh（0~1）；检测阶段不创建任何 Package。
 *   confirmGroupPhoto(groupId, assignments) => Promise<{ status, participants: [{ person_id, name, booth_id }] }>
 *     assignments = [{ face_id, face_ref, name, impression? }]；确认后才批量建档 + 注册展位。
 *   assetUrl?(ref) => string  可选：face_ref → 可加载 URL（人脸裁剪回显用；缺省用本地预览 CSS 裁剪）。
 *
 * opts：
 *   onComplete({ count, names, participants })  入场成功回调（恰好一次）
 *   onClose()                                   浮层关闭回调
 *   onNavigateHall?()                           成功屏 CTA：当前不在大厅时跳集市（缺省仅关闭）
 *
 * 返回 handle：{ open, close, unmount, isOpen, phase }
 */

const ICONS = {
  Check,
  CircleAlert,
  ImagePlus,
  Info,
  LoaderCircle,
  PartyPopper,
  RefreshCw,
  ScanFace,
  Sparkles,
  UserPlus,
  Users,
  X,
};

const PHASE_META = Object.freeze({
  upload: { title: "一张合照，朋友们一起入场", crumb: 0 },
  detecting: { title: "正在寻找照片里的面孔", crumb: 1 },
  assign: { title: "TA 们都叫什么？", crumb: 1 },
  success: { title: "朋友们已进场", crumb: 2 },
});

const CRUMB_LABELS = Object.freeze(["上传合照", "认脸", "入场"]);

const ACCEPT_STRING = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const ACCEPTED_MIME = /^image\/(jpeg|png|webp)$/;
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;


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
  return `${Math.round(bytes / 1024)} KB`;
}

function friendlyError(error, fallback) {
  const message = String(error?.message ?? "").trim();
  if (message && message.length <= 60) return message;
  return fallback;
}


export function mountOnboardingFlow(container, api, opts = {}) {
  if (!container) throw new Error("mountOnboardingFlow 需要一个容器元素");
  if (!api || typeof api.detectGroupPhoto !== "function" || typeof api.confirmGroupPhoto !== "function") {
    throw new Error("mountOnboardingFlow 需要 api 实现 detectGroupPhoto / confirmGroupPhoto");
  }

  const onComplete = typeof opts.onComplete === "function" ? opts.onComplete : () => {};
  const onClose = typeof opts.onClose === "function" ? opts.onClose : () => {};
  const onNavigateHall = typeof opts.onNavigateHall === "function" ? opts.onNavigateHall : null;

  let alive = true;
  let open = false;
  let runId = 0;
  let completedFired = false;

  const state = {
    phase: "upload",
    file: null,
    previewUrl: "",
    groupId: null,
    sourceRef: null,
    detector: null,
    faces: [], // [{ face_id, bbox, face_ref, name, skipped }]
    issues: [],
    result: null,
    submitting: false,
    error: null,
    fileError: "",
  };

  const rootEl = document.createElement("div");
  rootEl.className = "ob-overlay";
  rootEl.setAttribute("role", "dialog");
  rootEl.setAttribute("aria-modal", "true");
  rootEl.setAttribute("aria-label", "合照入场流程");
  rootEl.tabIndex = -1;
  container.append(rootEl);

  function hydrateIcons(scope) {
    createIcons({ icons: ICONS, root: scope, attrs: { "stroke-width": 1.8 } });
  }

  function revokePreview() {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = "";
  }

  function resetState() {
    revokePreview();
    state.phase = "upload";
    state.file = null;
    state.groupId = null;
    state.sourceRef = null;
    state.detector = null;
    state.faces = [];
    state.issues = [];
    state.result = null;
    state.submitting = false;
    state.error = null;
    state.fileError = "";
    completedFired = false;
  }

  function namedFaces() {
    return state.faces.filter((face) => !face.skipped && face.name.trim());
  }

  /* ---------- 渲染 ---------- */

  function render() {
    const meta = PHASE_META[state.phase];
    rootEl.innerHTML = `
      <div class="ob-panel" data-ob-panel>
        <header class="ob-header">
          <span class="ob-brand">EW</span>
          <div class="ob-header-copy">
            <small>ECHOWORLD · 合照入场</small>
            <strong>${meta.title}</strong>
          </div>
          <ol class="ob-crumb" aria-label="流程进度">
            ${CRUMB_LABELS.map((label, index) => `
              <li class="${index < meta.crumb ? "is-done" : ""}${index === meta.crumb ? "is-current" : ""}">
                <i></i><span>${label}</span>
              </li>`).join("")}
          </ol>
          <button class="ob-icon-button" type="button" data-action="close" title="关闭" aria-label="关闭合照入场">${icon("x")}</button>
        </header>
        <div class="ob-body" data-ob-body></div>
      </div>`;
    const body = rootEl.querySelector("[data-ob-body]");
    if (state.phase === "upload") renderUpload(body);
    else if (state.phase === "detecting") renderDetecting(body);
    else if (state.phase === "assign") renderAssign(body);
    else if (state.phase === "success") renderSuccess(body);
    hydrateIcons(rootEl);
  }

  function errorBanner(phase) {
    if (!state.error || state.error.phase !== phase) return "";
    return `
      <div class="ob-error" role="alert">
        ${icon("circle-alert")}
        <span>${escapeHtml(state.error.message)}</span>
      </div>`;
  }

  function renderUpload(body) {
    body.innerHTML = `
      <div class="ob-dropzone" data-ob-dropzone role="button" tabindex="0" aria-label="拖拽或点击选择合照">
        <input type="file" data-ob-file-input accept="${ACCEPT_STRING}" hidden />
        ${state.previewUrl
          ? `<img class="ob-preview" src="${state.previewUrl}" alt="合照预览" />`
          : `<span class="ob-dropzone-icon">${icon("image-plus")}</span>
             <strong>拖拽一张合照到这里</strong>
             <small>或点击选择 · 支持 JPG / PNG / WebP · ≤ 25MB</small>`}
      </div>
      ${state.file ? `
        <p class="ob-file-line">${icon("users")}${escapeHtml(state.file.name)} · ${formatBytes(state.file.size)}
          <button class="ob-link" type="button" data-action="clear-file">换一张</button>
        </p>` : ""}
      ${state.fileError ? `<p class="ob-file-error" role="alert">${icon("circle-alert")}${escapeHtml(state.fileError)}</p>` : ""}
      ${errorBanner("upload")}
      <footer class="ob-footer">
        <span class="ob-footer-hint">照片只用于识别人脸与生成形象，原件落盘后只增不改</span>
        <button class="ob-button-primary" type="button" data-action="submit-detect" ${state.file ? "" : "disabled"}>
          开始认脸${icon("sparkles")}
        </button>
      </footer>`;
  }

  function renderDetecting(body) {
    const failed = state.error?.phase === "detecting";
    body.innerHTML = `
      <div class="ob-detect-stage">
        ${state.previewUrl ? `<img class="ob-detect-photo${failed ? " is-dim" : ""}" src="${state.previewUrl}" alt="合照" />` : ""}
        <span class="ob-detect-orb${failed ? " is-failed" : ""}">
          ${icon(failed ? "circle-alert" : "scan-face", failed ? "" : "ob-pulse")}
        </span>
        <h2>${failed ? "认脸没有成功" : "正在照片里寻找朋友们的脸…"}</h2>
        <p>${failed ? "照片已安全落盘，可以直接重试" : "AI 正在框出前景的每一位朋友，背景路人会被忽略"}</p>
        ${failed ? `
          ${errorBanner("detecting")}
          <div class="ob-error-actions">
            <button class="ob-button-primary" type="button" data-action="retry-detect">${icon("refresh-cw")}重试认脸</button>
            <button class="ob-button-ghost" type="button" data-action="back-upload">换一张照片</button>
          </div>` : ""}
      </div>`;
  }

  function faceChipStyle(bbox) {
    // 用本地预览图做 CSS 裁剪：background-size 放大到 bbox 恰好铺满圆形 chip；
    // position 百分比 = 起点 / (1 - 尺寸)（把 bbox 的对应点对齐到容器边缘）
    const posX = bbox.width >= 1 ? 0 : (100 * bbox.x / (1 - bbox.width)).toFixed(2);
    const posY = bbox.height >= 1 ? 0 : (100 * bbox.y / (1 - bbox.height)).toFixed(2);
    return `background-image:url(${state.previewUrl});`
      + `background-size:${(100 / bbox.width).toFixed(2)}% ${(100 / bbox.height).toFixed(2)}%;`
      + `background-position:${posX}% ${posY}%;`;
  }

  function renderAssign(body) {
    if (state.faces.length === 0) {
      body.innerHTML = `
        <div class="ob-detect-stage">
          ${state.previewUrl ? `<img class="ob-detect-photo is-dim" src="${state.previewUrl}" alt="合照" />` : ""}
          <span class="ob-detect-orb is-failed">${icon("scan-face")}</span>
          <h2>没有认出清晰的人脸</h2>
          <p>换一张大家正对镜头、光线更好的合照试试</p>
          <div class="ob-error-actions">
            <button class="ob-button-primary" type="button" data-action="retry-detect">${icon("refresh-cw")}重新认脸</button>
            <button class="ob-button-ghost" type="button" data-action="back-upload">换一张照片</button>
          </div>
        </div>`;
      return;
    }
    const named = namedFaces().length;
    body.innerHTML = `
      <div class="ob-photo-wrap" data-ob-photo-wrap>
        <img class="ob-photo" src="${state.previewUrl}" alt="合照 · 人脸框选" />
        ${state.faces.map((face, index) => `
          <span class="ob-bbox${face.skipped ? " is-skipped" : ""}" style="
            left:${(face.bbox.x * 100).toFixed(2)}%;top:${(face.bbox.y * 100).toFixed(2)}%;
            width:${(face.bbox.width * 100).toFixed(2)}%;height:${(face.bbox.height * 100).toFixed(2)}%;">
            <em>${index + 1}</em>
          </span>`).join("")}
      </div>
      ${state.issues.length > 0 ? `
        <p class="ob-issues">${icon("circle-alert")}${escapeHtml(state.issues.join("；"))}</p>` : ""}
      <ul class="ob-face-list" aria-label="逐脸确认姓名">
        ${state.faces.map((face, index) => `
          <li class="ob-face-row${face.skipped ? " is-skipped" : ""}" data-face="${face.face_id}">
            <span class="ob-face-chip" style="${faceChipStyle(face.bbox)}" aria-hidden="true"></span>
            <span class="ob-face-index">${index + 1}</span>
            <input type="text" data-face-name="${face.face_id}" maxlength="24"
              placeholder="TA 的称呼" value="${escapeHtml(face.name)}"
              ${face.skipped ? "disabled" : ""} autocomplete="off" />
            <button class="ob-link" type="button" data-action="toggle-skip" data-face-id="${face.face_id}">
              ${face.skipped ? "恢复" : "跳过"}
            </button>
          </li>`).join("")}
      </ul>
      ${errorBanner("assign")}
      <footer class="ob-footer">
        <span class="ob-footer-hint">从左到右编号 · 跳过的人不会入场 · 确认后才写入你的世界</span>
        <div class="ob-footer-actions">
          <button class="ob-button-ghost" type="button" data-action="retry-detect">${icon("refresh-cw")}重新认脸</button>
          <button class="ob-button-primary" type="button" data-action="submit-confirm" data-ob-submit ${named === 0 || state.submitting ? "disabled" : ""}>
            ${state.submitting ? icon("loader-circle", "ob-spin") : icon("user-plus")}${state.submitting ? "正在入场…" : `确认 ${named} 位朋友入场`}
          </button>
        </div>
      </footer>`;
  }

  function renderSuccess(body) {
    const participants = state.result?.participants ?? [];
    const names = participants.map((item) => item.name).filter(Boolean);
    const queued = participants.filter((item) => item.booth_status === "queued" || !item.booth_id).length;
    const duplicateNames = participants
      .filter((item) => item.possible_duplicate_of)
      .map((item) => item.name);
    body.innerHTML = `
      <div class="ob-success">
        <span class="ob-success-halo"></span>
        <span class="ob-success-halo is-late"></span>
        <span class="ob-success-badge">${icon("party-popper")}</span>
        <h2>${participants.length} 位朋友已进入集市</h2>
        <div class="ob-chip-row">
          ${names.map((name) => `<span class="ob-chip">${icon("check")}${escapeHtml(name)}</span>`).join("")}
        </div>
        <p>${queued > 0
          ? (queued === participants.length
            ? "集市展位暂时满了，TA 们的展位排队中，扩容后自动上墙"
            : `大部分展位已经搭好；${queued} 位朋友的展位排队中，扩容后自动上墙`)
          : "TA 们的展位已经搭好，走进大厅就能看到"}</p>
        ${duplicateNames.length
          ? `<p class="ob-dup-hint">${icon("info")}<span>${duplicateNames.map((n) => `「${escapeHtml(n)}」`).join("")}与世界里已有的人物同名——如果不是同一个人就没事；如果录重了，打开 TA 的资料包可以注销多余的一个。</span></p>`
          : ""}
        <button class="ob-button-primary" type="button" data-action="finish">
          ${onNavigateHall ? `去集市看看${icon("sparkles")}` : "太好了"}
        </button>
      </div>`;
  }

  /* ---------- 流程动作 ---------- */

  function setFile(file) {
    state.fileError = "";
    if (!file) return;
    if (!ACCEPTED_MIME.test(file.type || "")) {
      state.fileError = "合照只支持 JPG / PNG / WebP";
      render();
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      state.fileError = "合照超过 25MB，请压缩后再试";
      render();
      return;
    }
    revokePreview();
    state.file = file;
    state.previewUrl = URL.createObjectURL(file);
    state.error = null;
    render();
  }

  async function runDetect() {
    if (!state.file) return;
    const run = ++runId;
    state.phase = "detecting";
    state.error = null;
    render();
    try {
      const payload = await api.detectGroupPhoto(state.file);
      if (run !== runId || !alive) return;
      if (!payload?.group_id || !Array.isArray(payload.faces)) {
        throw new Error("识别服务返回格式不正确，请重试");
      }
      state.groupId = payload.group_id;
      state.sourceRef = payload.source_ref ?? null;
      state.detector = payload.detector ?? null;
      state.issues = Array.isArray(payload.issues) ? payload.issues : [];
      state.faces = payload.faces
        .filter((face) => face?.bbox)
        .map((face, index) => ({
          face_id: face.face_id ?? `face_${index + 1}`,
          bbox: face.bbox,
          face_ref: face.face_ref ?? null,
          name: "",
          skipped: false,
        }));
      state.phase = "assign";
      render();
    } catch (error) {
      if (run !== runId || !alive) return;
      console.error("[OnboardingFlow] detect failed:", error);
      state.error = { phase: "detecting", message: friendlyError(error, "认脸失败，请检查网络后重试") };
      render();
    }
  }

  async function runConfirm() {
    const named = namedFaces();
    if (named.length === 0 || state.submitting) return;
    const run = ++runId;
    state.submitting = true;
    state.error = null;
    render();
    try {
      const assignments = named.map((face) => ({
        face_id: face.face_id,
        face_ref: face.face_ref,
        name: face.name.trim(),
      }));
      const result = await api.confirmGroupPhoto(state.groupId, assignments);
      if (run !== runId || !alive) return;
      if (!Array.isArray(result?.participants)) {
        throw new Error("入场服务返回格式不正确，请重试");
      }
      state.result = result;
      state.submitting = false;
      state.phase = "success";
      render();
      if (!completedFired) {
        completedFired = true;
        try {
          onComplete({
            count: result.participants.length,
            names: result.participants.map((item) => item.name).filter(Boolean),
            participants: result.participants,
          });
        } catch (error) {
          console.error("[OnboardingFlow] onComplete callback failed:", error);
        }
      }
    } catch (error) {
      if (run !== runId || !alive) return;
      console.error("[OnboardingFlow] confirm failed:", error);
      state.submitting = false;
      state.error = { phase: "assign", message: friendlyError(error, "入场失败，请重试") };
      render();
    }
  }

  function finish() {
    close();
    if (onNavigateHall) onNavigateHall();
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
    rootEl.classList.remove("is-open");
    rootEl.setAttribute("aria-hidden", "true");
    onClose();
  }

  function unmount() {
    if (!alive) return;
    alive = false;
    runId += 1;
    revokePreview();
    rootEl.remove();
  }

  /* ---------- 事件委托 ---------- */

  rootEl.addEventListener("click", (event) => {
    const target = event.target.closest("button, [data-ob-dropzone]");
    if (!target || !rootEl.contains(target)) return;
    const action = target.dataset.action;
    if (action === "close") close();
    else if (action === "submit-detect") runDetect();
    else if (action === "retry-detect") runDetect();
    else if (action === "back-upload") {
      runId += 1;
      state.phase = "upload";
      state.error = null;
      render();
    } else if (action === "clear-file") {
      revokePreview();
      state.file = null;
      state.fileError = "";
      render();
    } else if (action === "toggle-skip") {
      const face = state.faces.find((item) => item.face_id === target.dataset.faceId);
      if (face) {
        face.skipped = !face.skipped;
        render();
      }
    } else if (action === "submit-confirm") runConfirm();
    else if (action === "finish") finish();
    else if (target.hasAttribute("data-ob-dropzone")) {
      rootEl.querySelector("[data-ob-file-input]")?.click();
    }
  });

  rootEl.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.hasAttribute?.("data-ob-dropzone")) {
      event.preventDefault();
      rootEl.querySelector("[data-ob-file-input]")?.click();
    }
  });

  rootEl.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-ob-file-input]")) {
      setFile(target.files?.[0] ?? null);
      target.value = "";
    }
  });

  rootEl.addEventListener("input", (event) => {
    const target = event.target;
    if (target.matches("[data-face-name]")) {
      const face = state.faces.find((item) => item.face_id === target.dataset.faceName);
      if (!face) return;
      face.name = target.value;
      const submit = rootEl.querySelector("[data-ob-submit]");
      if (submit) {
        const named = namedFaces().length;
        submit.disabled = named === 0 || state.submitting;
        submit.innerHTML = `${icon("user-plus")}确认 ${named} 位朋友入场`;
        hydrateIcons(submit);
      }
    }
  });

  // 拖拽进 dropzone
  rootEl.addEventListener("dragover", (event) => {
    if (event.target.closest("[data-ob-dropzone]")) event.preventDefault();
  });
  rootEl.addEventListener("drop", (event) => {
    const zone = event.target.closest("[data-ob-dropzone]");
    if (!zone) return;
    event.preventDefault();
    setFile(event.dataTransfer?.files?.[0] ?? null);
  });

  return {
    open: openFlow,
    close,
    unmount,
    isOpen: () => open,
    phase: () => state.phase,
  };
}
