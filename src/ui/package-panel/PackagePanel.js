import {
  Clock3,
  Info,
  Lightbulb,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRoundCheck,
  Users,
  X,
  createIcons,
} from "lucide";
import "./panel.css";

// 资料包面板：IF-5「GET /api/v0/packages/{person_id}」的消费端。
// 事实层（相遇时间线）与推断层（系统认知）在视觉上严格区隔（PRD P-3）。

const ICONS = {
  Clock3,
  Info,
  Lightbulb,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRoundCheck,
  Users,
  X,
};

// 权限圈层（CONTEXT-AND-MEMORY.md §5）
const PRIVACY_LEVELS = {
  "self-only": { level: "L1", label: "仅自己可见" },
  "agent-usable": { level: "L2", label: "Agent 可用" },
  "org-shared": { level: "L3", label: "组织内共享" },
  "public-approved": { level: "L4", label: "已授权公开" },
};

const INFERENCE_GROUPS = [
  { key: "interest", title: "兴趣标签", icon: "tag" },
  { key: "need", title: "需求判断", icon: "lightbulb" },
  { key: "relation", title: "关系推测", icon: "users" },
  { key: "other", title: "其他认知", icon: "sparkles" },
];

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];


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

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "时间未知");
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${WEEKDAYS[date.getDay()]} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

function inferenceGroupKey(type) {
  const text = String(type ?? "").toLowerCase();
  if (text.includes("interest")) return "interest";
  if (text.includes("need")) return "need";
  if (text.includes("relation")) return "relation";
  return "other";
}

/**
 * 挂载人物资料包面板（FR-1.8「上下文恢复」，核心价值时刻）。
 *
 * @param {HTMLElement} container 挂载点（通常是 #ui-root）
 * @param {object} api 面向 docs/API.md IF-5 的数据接口：
 *   - api.getPackage(personId) => Promise<echo-package.v0>  单个资料包（事实指针 + 推断视图）
 *   - api.resolveMediaUrl?(ref) => string  可选，把事实层指针解析为可展示的 URL；
 *     缺省时原样使用 ref（mock 阶段可直接给静态路径）
 * @returns {{ openPerson(personId: string): Promise<void>, close(): void, isOpen: boolean }}
 */
export function mountPackagePanel(container, api) {
  const layer = document.createElement("div");
  layer.className = "package-panel-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = `
    <div class="pp-backdrop" data-pp-close aria-hidden="true"></div>
    <aside class="package-panel" role="dialog" aria-modal="true" aria-label="人物资料包" tabindex="-1">
      <button class="pp-close" type="button" data-pp-close title="关闭" aria-label="关闭资料包">${icon("x")}</button>
      <div class="pp-body"></div>
    </aside>
    <div class="pp-toast" role="status" aria-live="polite"></div>`;
  container.append(layer);

  const panel = layer.querySelector(".package-panel");
  const body = layer.querySelector(".pp-body");
  const toast = layer.querySelector(".pp-toast");

  let open = false;
  let activePersonId = null;
  let requestSeq = 0;
  let toastTimer = null;
  const cache = new Map();

  // 在场状态（LiveWorld 快照注入）：setPresenceProvider 由 integrations 接线，不改对外签名
  const PRESENCE_LABELS = {
    "at-booth": "在自己的展位",
    walking: "走动中",
    seated: "已入座",
    talking: "与人交谈中",
    "in-meeting": "圆桌会议中",
  };
  const PRESENCE_REFRESH_MS = 2000;
  let presenceProvider = null;
  let presenceTimer = null;

  function refreshPresence() {
    const row = body.querySelector("[data-pp-presence]");
    if (!row) return;
    const state =
      open && activePersonId && typeof presenceProvider === "function"
        ? presenceProvider(activePersonId)
        : null;
    const label = state ? PRESENCE_LABELS[state.status ?? state.state] : null;
    if (!label) {
      row.hidden = true;
      return;
    }
    row.hidden = false;
    row.querySelector("[data-pp-presence-text]").textContent = label;
  }

  function startPresenceTimer() {
    stopPresenceTimer();
    if (typeof presenceProvider !== "function") return;
    presenceTimer = window.setInterval(refreshPresence, PRESENCE_REFRESH_MS);
  }

  function stopPresenceTimer() {
    window.clearInterval(presenceTimer);
    presenceTimer = null;
  }

  function resolveMedia(ref) {
    if (!ref) return "";
    if (typeof api?.resolveMediaUrl === "function") return api.resolveMediaUrl(ref);
    return String(ref);
  }

  // M1.7：<img> 加载失败统一降级为占位肖像（onerror 先置空防循环触发）
  const placeholderImg = resolveMedia("portraits/person-self.png");
  const imgFallback = `onerror="this.onerror=null;this.src='${escapeHtml(placeholderImg)}'"`;

  function hydrateIcons() {
    createIcons({ icons: ICONS, root: layer, attrs: { "stroke-width": 1.8 } });
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function skeletonMarkup() {
    return `
      <div class="pp-skeleton" aria-label="资料包加载中">
        <div class="pp-sk-hero"><i></i><span><b></b><b></b><b></b></span></div>
        <div class="pp-sk-card"></div>
        <div class="pp-sk-card short"></div>
        <div class="pp-sk-card"></div>
      </div>`;
  }

  function errorMarkup() {
    return `
      <div class="pp-error">
        <strong>资料包暂时无法打开</strong>
        <p>网络或数据源出了点问题，请稍后重试。</p>
        <button type="button" data-pp-retry>重新加载</button>
      </div>`;
  }

  function encounterMarkup(encounter, index, total) {
    const facts = encounter.facts ?? {};
    const photos = Array.isArray(facts.photos) ? facts.photos : [];
    const media = Array.isArray(facts.media) ? facts.media : [];
    const speakerAudio = Array.isArray(facts.speaker_audio) ? facts.speaker_audio : [];
    const conversationRecordings = Array.isArray(facts.conversation_recordings)
      ? facts.conversation_recordings
      : [];
    const audioRefs = [...new Set([
      ...speakerAudio,
      ...conversationRecordings,
      ...media.filter((ref) => /\.(m4a|wav|mp3|aac|ogg|flac)(\?|#|$)/i.test(String(ref))),
    ])];
    const videoRefs = [...new Set(media.filter(
      (ref) => /\.(mp4|mov|webm)(\?|#|$)/i.test(String(ref)),
    ))];
    const faceSummary = facts.face_summary ?? {};
    const voiceSummary = facts.voice_summary ?? {};
    const points = []
      .concat(encounter.highlights ?? encounter.key_points ?? encounter.talking_points ?? [])
      .filter(Boolean);
    const privacy = PRIVACY_LEVELS[encounter.privacy];
    const agentUsable = encounter.privacy === "agent-usable";
    const canAuthorize = String(encounter.encounter_id ?? "").startsWith("enc_k3_");
    return `
      <article class="pp-encounter">
        <header class="pp-encounter-head">
          <span class="pp-encounter-no">${pad2(total - index)}</span>
          <div class="pp-encounter-title">
            <strong>${escapeHtml(encounter.place ?? "未知地点")}</strong>
            <small>${icon("clock-3")}${escapeHtml(formatDateTime(encounter.time))}</small>
          </div>
          ${privacy ? `<span class="pp-encounter-privacy" title="${privacy.level} · ${privacy.label}">${privacy.level}</span>` : ""}
        </header>
        ${
          canAuthorize
            ? `<label class="pp-agent-toggle">
                <span>${icon("user-round-check")}Agent 记忆</span>
                <input type="checkbox" data-pp-agent-memory="${escapeHtml(encounter.encounter_id)}"${agentUsable ? " checked" : ""} />
                <i aria-hidden="true"></i>
              </label>`
            : ""
        }
        ${
          photos.length
            ? `<div class="pp-photos">${photos
                .map((ref) => `<img src="${escapeHtml(resolveMedia(ref))}" alt="相遇现场照片" loading="lazy" ${imgFallback} />`)
                .join("")}</div>`
            : ""
        }
        ${
          points.length
            ? `<ul class="pp-points">${points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>`
            : ""
        }
        ${
          faceSummary.observation_count || voiceSummary.turn_count
            ? `<dl class="pp-evidence-summary">
                ${faceSummary.observation_count ? `<div><dt>人脸观测</dt><dd>${escapeHtml(faceSummary.observation_count)} 条${Number.isFinite(faceSummary.confidence) ? ` · ${Math.round(faceSummary.confidence * 100)}%` : ""}</dd></div>` : ""}
                ${voiceSummary.turn_count ? `<div><dt>声纹归属</dt><dd>${escapeHtml(voiceSummary.identity_state ?? "已归属")} · ${Number.isFinite(voiceSummary.confidence) ? `${Math.round(voiceSummary.confidence * 100)}%` : "待评估"}</dd></div>` : ""}
              </dl>`
            : ""
        }
        ${
          audioRefs.length || videoRefs.length || facts.transcript
            ? `<div class="pp-media">
                ${audioRefs.map((ref) => {
                  const full = conversationRecordings.includes(ref);
                  return `<figure class="pp-audio"><figcaption>${icon("mic")}${full ? "整段会话录音" : "说话人分段音频"}</figcaption><audio controls preload="metadata" src="${escapeHtml(resolveMedia(ref))}"></audio></figure>`;
                }).join("")}
                ${videoRefs.map((ref) => `<video class="pp-video" controls preload="metadata" src="${escapeHtml(resolveMedia(ref))}"></video>`).join("")}
                ${facts.transcript ? `<button type="button" class="pp-media-button" data-pp-open-media="${escapeHtml(resolveMedia(facts.transcript))}">${icon("info")}<span>转写全文</span></button>` : ""}
              </div>`
            : ""
        }
      </article>`;
  }

  function collectInferences(pkg, encounters) {
    const entries = [];
    for (const inf of Array.isArray(pkg.inferences) ? pkg.inferences : []) {
      entries.push({ inf, context: "来自人物综合视图" });
    }
    for (const encounter of encounters) {
      for (const inf of Array.isArray(encounter.inferences) ? encounter.inferences : []) {
        entries.push({ inf, context: `来自相遇「${encounter.place ?? encounter.encounter_id ?? "未知地点"}」` });
      }
    }
    return entries;
  }

  function inferenceItemMarkup({ inf, context }) {
    const pct = Math.max(0, Math.min(100, Math.round((Number(inf.confidence) || 0) * 100)));
    const sources = []
      .concat(inf.source_facts ?? inf.source ?? [])
      .filter(Boolean)
      .join("、");
    const tip = [
      `来源：${sources || "相遇记录"}`,
      `模型：${inf.model ?? "未知模型"} · 置信度 ${pct}%`,
      `生成于：${formatDateTime(inf.created_at)}`,
      context,
    ].join("\n");
    return `
      <li class="pp-inf-item" tabindex="0">
        <span class="pp-inf-main">
          <span class="pp-inf-value">${escapeHtml(inf.value ?? "未命名推断")}</span>
          <i class="pp-inf-bar" style="--conf:${pct}%"></i>
        </span>
        <span class="pp-inf-conf">${pct}%</span>
        <span class="pp-inf-tip" role="tooltip">${escapeHtml(tip)}</span>
      </li>`;
  }

  function inferenceSectionMarkup(pkg, encounters) {
    const entries = collectInferences(pkg, encounters);
    const groups = INFERENCE_GROUPS.map((group) => ({
      ...group,
      items: entries.filter((entry) => inferenceGroupKey(entry.inf.type) === group.key),
    })).filter((group) => group.items.length > 0);
    return `
      <section class="pp-section pp-inference-section" aria-label="系统认知（AI 推断）">
        <div class="pp-section-head">
          <h3>${icon("sparkles")}系统认知</h3>
          <span class="pp-section-tag pp-section-tag-ai">AI 推断 · 可随时重算</span>
        </div>
        <p class="pp-inference-note">${icon("info")}<span>以下为模型推断，不属于事实记录，不会回写污染原始相遇；每条都标注置信度，悬停可查看来源与依据。</span></p>
        ${
          groups.length
            ? groups
                .map(
                  (group) => `
              <div class="pp-inf-group">
                <h4>${icon(group.icon)}${group.title}</h4>
                <ul class="pp-inf-list">${group.items.map(inferenceItemMarkup).join("")}</ul>
              </div>`,
                )
                .join("")
            : `<p class="pp-empty">推断层还没有内容。系统会在积累更多相遇后生成认知。</p>`
        }
      </section>`;
  }

  function packageMarkup(pkg) {
    const identity = pkg.identity ?? {};
    const encounters = (Array.isArray(pkg.encounters) ? [...pkg.encounters] : []).sort(
      (a, b) => new Date(b.time) - new Date(a.time),
    );
    const name = identity.name ?? pkg.name ?? "未命名的人";
    const faceUrl = resolveMedia(identity.face_ref ?? pkg.avatar?.real_face_ref ?? pkg.portrait);
    const confirmed = identity.confirmed !== false;
    const privacy =
      PRIVACY_LEVELS[pkg.privacy] ??
      PRIVACY_LEVELS[encounters[0]?.privacy] ??
      PRIVACY_LEVELS["self-only"];
    const headline =
      identity.headline ??
      pkg.headline ??
      pkg.bio ??
      (encounters.length
        ? `相识于 ${encounters[encounters.length - 1].place ?? "一次现场相遇"}`
        : "一段等待被想起的关系");
    const photoTotal = encounters.reduce((sum, enc) => sum + (enc.facts?.photos?.length ?? 0), 0);
    const firstTime = encounters.length ? formatShortDate(encounters[encounters.length - 1].time) : null;
    const meta = [
      `相遇 ${encounters.length} 次`,
      photoTotal ? `现场照片 ${photoTotal} 张` : null,
      firstTime ? `首次相见 ${firstTime}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return `
      <header class="pp-hero">
        <div class="pp-hero-face">
          ${
            faceUrl
              ? `<img src="${escapeHtml(faceUrl)}" alt="${escapeHtml(name)}的真实人脸照片" ${imgFallback} />`
              : `<span class="pp-hero-face-fallback">${escapeHtml(name.slice(0, 1))}</span>`
          }
          <span class="pp-hero-face-tag">真实人脸</span>
        </div>
        <div class="pp-hero-info">
          <span class="pp-eyebrow">人物资料包 · PERSON PACKAGE</span>
          <h2>${escapeHtml(name)}</h2>
          <p class="pp-headline">${escapeHtml(headline)}</p>
          <p class="pp-presence" data-pp-presence hidden>
            <span class="pp-presence-dot" aria-hidden="true"></span>
            <span data-pp-presence-text></span>
          </p>
          <div class="pp-badges">
            <span class="pp-badge pp-badge-privacy">${icon("shield-check")}${privacy.level} · ${privacy.label}</span>
            <span class="pp-badge ${confirmed ? "pp-badge-ok" : "pp-badge-warn"}">${confirmed ? "身份已确认" : "身份待确认"}</span>
          </div>
          <p class="pp-meta">${escapeHtml(meta)}</p>
        </div>
      </header>
      <section class="pp-section" aria-label="相遇时间线">
        <div class="pp-section-head">
          <h3>${icon("map-pin")}相遇</h3>
          <span class="pp-section-tag">事实层 · 只增不改</span>
        </div>
        ${
          encounters.length
            ? encounters.map((enc, index) => encounterMarkup(enc, index, encounters.length)).join("")
            : `<p class="pp-empty">还没有相遇记录。</p>`
        }
      </section>
      ${inferenceSectionMarkup(pkg, encounters)}`;
  }

  function render(pkg) {
    body.innerHTML = packageMarkup(pkg);
    body.scrollTop = 0;
    hydrateIcons();
    refreshPresence();
  }

  function openPanel() {
    open = true;
    layer.setAttribute("aria-hidden", "false");
    panel.focus({ preventScroll: true });
    startPresenceTimer();
  }

  function close() {
    if (!open) return;
    open = false;
    activePersonId = null;
    requestSeq += 1;
    stopPresenceTimer();
    layer.setAttribute("aria-hidden", "true");
  }

  async function openPerson(personId) {
    activePersonId = personId;
    openPanel();
    if (cache.has(personId)) {
      render(cache.get(personId));
      return;
    }
    const seq = ++requestSeq;
    body.innerHTML = skeletonMarkup();
    body.scrollTop = 0;
    try {
      const pkg = await api.getPackage(personId);
      if (!pkg || typeof pkg !== "object") throw new Error("empty package");
      cache.set(personId, pkg);
      if (seq !== requestSeq || activePersonId !== personId) return;
      render(pkg);
    } catch (error) {
      console.error("[package-panel] 加载资料包失败", error);
      if (seq !== requestSeq) return;
      body.innerHTML = errorMarkup();
    }
  }

  layer.addEventListener("click", (event) => {
    if (event.target.closest("[data-pp-close]")) {
      close();
      return;
    }
    const mediaLink = event.target.closest("[data-pp-open-media]");
    if (mediaLink) {
      window.open(mediaLink.dataset.ppOpenMedia, "_blank", "noopener,noreferrer");
      return;
    }
    if (event.target.closest("[data-pp-retry]") && activePersonId) {
      cache.delete(activePersonId);
      openPerson(activePersonId);
    }
  });

  layer.addEventListener("change", async (event) => {
    const input = event.target.closest("[data-pp-agent-memory]");
    if (!input || !activePersonId) return;
    const encounterId = input.dataset.ppAgentMemory;
    input.disabled = true;
    try {
      const pkg = await api.setEncounterPrivacy(
        activePersonId,
        encounterId,
        input.checked ? "agent-usable" : "self-only",
      );
      cache.set(activePersonId, pkg);
      render(pkg);
      showToast(input.checked ? "这次相遇已加入 Agent 记忆" : "这次相遇已退出 Agent 记忆");
    } catch (error) {
      console.error("[package-panel] 更新 Agent 记忆授权失败", error);
      input.checked = !input.checked;
      input.disabled = false;
      showToast("授权更新失败，请稍后重试");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (open && event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  });

  hydrateIcons();

  return {
    openPerson,
    close,
    // 注入在场状态提供者：(personId) => { status } | null，由 integrations 接 LiveWorld 快照缓存
    setPresenceProvider(provider) {
      presenceProvider = typeof provider === "function" ? provider : null;
      if (open) {
        startPresenceTimer();
        refreshPresence();
      }
    },
    get isOpen() {
      return open;
    },
  };
}
