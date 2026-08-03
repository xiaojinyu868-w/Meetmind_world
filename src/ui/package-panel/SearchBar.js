import { MapPin, ScanFace, Search, createIcons } from "lucide";
import "./panel.css";

// 顶部悬浮搜索框：IF-5「POST /api/v0/search」的消费端（FR-1.9 人物检索）。
// 文本输入合并 name / keyword 两种检索方式；「拍照识人」为 face 检索的占位入口。

const ICONS = { MapPin, ScanFace, Search };

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 6;


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

function formatShortTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function scorePercent(score) {
  const value = Number(score) || 0;
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

function isTypingTarget(element) {
  if (!element) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable;
}


/**
 * 挂载顶部悬浮搜索框。
 *
 * @param {HTMLElement} container 挂载点（通常是 #ui-root）
 * @param {object} api 面向 docs/API.md IF-5 的检索接口：
 *   - api.search({ by: "name" | "keyword", query }) => Promise<{ results: Array }>
 *     结果项契约：{ person_id, name, score, last_encounter: { time, place } }；
 *     可选扩展字段 avatar / face_ref / portrait 用于展示头像
 *   - api.resolveMediaUrl?(ref) => string  可选，解析头像指针
 * @param {(personId: string) => void} onLocate 选中结果回调（用于在咖啡厅中定位人物）
 * @returns {{
 *   focus(): void,
 *   close(): void,
 *   linkPanel(panel: { openPerson(id: string): void }): void,
 * }}
 */
export function mountSearchBar(container, api, onLocate = () => {}) {
  const wrap = document.createElement("div");
  wrap.className = "search-bar";
  wrap.innerHTML = `
    <div class="search-bar-box">
      <span class="search-bar-icon">${icon("search")}</span>
      <input type="search" autocomplete="off" spellcheck="false"
        placeholder="搜索姓名或关键词" aria-label="搜索人物（按 / 快速聚焦）" />
      <kbd class="search-bar-kbd" title="按 / 快速聚焦">/</kbd>
      <button class="search-face" type="button" data-face-search title="拍照识人（即将上线）">
        ${icon("scan-face")}<span>拍照识人</span>
      </button>
    </div>
    <div class="search-results" aria-hidden="true"></div>
    <div class="search-toast" role="status" aria-live="polite"></div>`;
  container.append(wrap);

  const input = wrap.querySelector("input");
  const dropdown = wrap.querySelector(".search-results");
  const toast = wrap.querySelector(".search-toast");

  let results = [];
  let activeIndex = -1;
  let debounceTimer = null;
  let searchSeq = 0;
  let toastTimer = null;
  let panel = null;

  function resolveMedia(ref) {
    if (!ref) return "";
    if (typeof api?.resolveMediaUrl === "function") return api.resolveMediaUrl(ref);
    return String(ref);
  }

  function hydrateIcons() {
    createIcons({ icons: ICONS, root: wrap, attrs: { "stroke-width": 1.8 } });
    for (const svg of wrap.querySelectorAll("svg[data-lucide]")) svg.removeAttribute("data-lucide");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function hideDropdown() {
    results = [];
    activeIndex = -1;
    dropdown.setAttribute("aria-hidden", "true");
    dropdown.innerHTML = "";
  }

  function showDropdown(markup) {
    dropdown.innerHTML = markup;
    dropdown.setAttribute("aria-hidden", "false");
    hydrateIcons();
  }

  function resultRowMarkup(item, index) {
    const avatarRef = item.avatar ?? item.face_ref ?? item.portrait;
    const avatarUrl = resolveMedia(avatarRef);
    const place = item.last_encounter?.place ?? "未知地点";
    const time = formatShortTime(item.last_encounter?.time);
    return `
      <button class="search-result${index === activeIndex ? " is-active" : ""}" type="button"
        data-index="${index}" role="option" aria-selected="${index === activeIndex}">
        ${
          avatarUrl
            ? `<img src="${escapeHtml(avatarUrl)}" alt="" />`
            : `<span class="search-result-initial">${escapeHtml(String(item.name ?? "?").slice(0, 1))}</span>`
        }
        <span class="search-result-main">
          <strong>${escapeHtml(item.name ?? "未命名")}</strong>
          <small>${icon("map-pin")}${escapeHtml(place)}${time ? ` · ${escapeHtml(time)}` : ""}</small>
        </span>
        <span class="search-result-score">${scorePercent(item.score)}<small>相关度</small></span>
      </button>`;
  }

  function renderResults() {
    if (!results.length) {
      showDropdown(`<p class="search-hint">没有找到匹配的人，换个关键词试试。</p>`);
      return;
    }
    showDropdown(
      `<div class="search-result-list" role="listbox">${results.map(resultRowMarkup).join("")}</div>`,
    );
  }

  function moveActive(delta) {
    if (!results.length) return;
    activeIndex = (activeIndex + delta + results.length) % results.length;
    for (const row of dropdown.querySelectorAll(".search-result")) {
      row.classList.toggle("is-active", Number(row.dataset.index) === activeIndex);
    }
  }

  function selectResult(item) {
    if (!item) return;
    input.value = item.name ?? "";
    input.blur();
    hideDropdown();
    onLocate(item.person_id);
    panel?.openPerson?.(item.person_id);
  }

  async function runSearch(query) {
    const seq = ++searchSeq;
    showDropdown(`<p class="search-hint">搜索中…</p>`);
    try {
      // 契约中三种检索方式互斥；单一输入框并行发起姓名与关键词两路，按 person_id 合并取最高分
      const settled = await Promise.allSettled([
        api.search({ by: "name", query }),
        api.search({ by: "keyword", query }),
      ]);
      if (seq !== searchSeq) return;
      const merged = new Map();
      for (const outcome of settled) {
        if (outcome.status !== "fulfilled") continue;
        for (const item of outcome.value?.results ?? []) {
          if (!item?.person_id) continue;
          const prev = merged.get(item.person_id);
          if (!prev || (item.score ?? 0) > (prev.score ?? 0)) merged.set(item.person_id, item);
        }
      }
      results = [...merged.values()]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, MAX_RESULTS);
      activeIndex = results.length ? 0 : -1;
      renderResults();
    } catch (error) {
      console.error("[search-bar] 检索失败", error);
      if (seq !== searchSeq) return;
      showDropdown(`<p class="search-hint">检索暂时不可用，请稍后重试。</p>`);
    }
  }

  input.addEventListener("input", () => {
    window.clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (!query) {
      searchSeq += 1;
      hideDropdown();
      return;
    }
    debounceTimer = window.setTimeout(() => runSearch(query), DEBOUNCE_MS);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectResult(results[activeIndex] ?? results[0]);
    } else if (event.key === "Escape") {
      if (dropdown.getAttribute("aria-hidden") === "false") {
        event.stopPropagation();
        hideDropdown();
      } else {
        input.blur();
      }
    }
  });

  dropdown.addEventListener("click", (event) => {
    const row = event.target.closest("[data-index]");
    if (row) selectResult(results[Number(row.dataset.index)]);
  });

  wrap.querySelector("[data-face-search]").addEventListener("click", () => {
    // face 检索 stub：正式路径为 api.search({ by: "face", photo: <base64> })
    showToast("拍照识人即将上线 · 届时拍一张照片就能找到 TA");
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !isTypingTarget(event.target)
    ) {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!wrap.contains(event.target)) hideDropdown();
  });

  hydrateIcons();

  return {
    focus() {
      input.focus();
      input.select();
    },
    close: hideDropdown,
    linkPanel(panelController) {
      panel = panelController;
    },
  };
}
