import {
  BookOpen,
  Coffee,
  DoorOpen,
  Eye,
  Landmark,
  MapPin,
  MessageCircle,
  Sparkles,
  Store,
  Users,
  X,
  createIcons,
} from "lucide";
import "./scene-interaction.css";

const ICONS = {
  BookOpen,
  Coffee,
  DoorOpen,
  Eye,
  Landmark,
  MapPin,
  MessageCircle,
  Sparkles,
  Store,
  Users,
  X,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name) {
  return `<i data-lucide="${name || "sparkles"}"></i>`;
}

function hydrate(root) {
  createIcons({ icons: ICONS, root, attrs: { "stroke-width": 1.8 } });
}

export function mountSceneInteraction({ root = document.body, onAction = async () => null } = {}) {
  const mount = document.createElement("div");
  mount.className = "scene-interaction";
  mount.innerHTML = `
    <button class="scene-interaction-prompt" type="button" aria-hidden="true">
      <kbd>E / F</kbd>
      <span><small>附近可互动</small><strong></strong></span>
    </button>
    <aside class="scene-interaction-sheet" aria-hidden="true" aria-label="场景互动"></aside>`;
  root.append(mount);

  const prompt = mount.querySelector(".scene-interaction-prompt");
  const sheet = mount.querySelector(".scene-interaction-sheet");
  let nearby = null;
  let sheetOpen = false;
  let busy = false;

  function renderSheet(hotspot = nearby, narrative = null) {
    if (!hotspot) return;
    const actions = narrative?.actions ?? hotspot.actions ?? [];
    sheet.innerHTML = `
      <header>
        <span class="scene-interaction-symbol">${icon(narrative?.icon ?? hotspot.icon ?? "sparkles")}</span>
        <div>
          <small>${escapeHtml(narrative?.eyebrow ?? hotspot.eyebrow ?? "场景互动")}</small>
          <h2>${escapeHtml(narrative?.title ?? hotspot.title)}</h2>
        </div>
        <button type="button" class="scene-interaction-close" data-scene-close title="关闭" aria-label="关闭场景互动">${icon("x")}</button>
      </header>
      <p>${escapeHtml(narrative?.detail ?? hotspot.detail ?? hotspot.prompt)}</p>
      ${actions.length ? `<div class="scene-interaction-actions">
        ${actions.map((action) => `
          <button type="button" data-scene-action="${escapeHtml(action.id)}" ${busy ? "disabled" : ""}>
            ${icon(action.icon ?? "sparkles")}
            <span><strong>${escapeHtml(action.label)}</strong>${action.description ? `<small>${escapeHtml(action.description)}</small>` : ""}</span>
          </button>`).join("")}
      </div>` : ""}`;
    hydrate(sheet);
  }

  function setNearby(hotspot) {
    nearby = hotspot ?? null;
    if (sheetOpen) return;
    const visible = Boolean(nearby);
    prompt.setAttribute("aria-hidden", String(!visible));
    if (nearby) {
      prompt.querySelector("strong").textContent = nearby.prompt ?? nearby.title;
      prompt.querySelector("small").textContent = nearby.eyebrow ?? "附近可互动";
    }
  }

  function open() {
    if (!nearby || busy) return false;
    sheetOpen = true;
    renderSheet();
    sheet.setAttribute("aria-hidden", "false");
    prompt.setAttribute("aria-hidden", "true");
    return true;
  }

  function close() {
    sheetOpen = false;
    sheet.setAttribute("aria-hidden", "true");
    sheet.innerHTML = "";
    prompt.setAttribute("aria-hidden", String(!nearby));
  }

  function showNarrative(narrative) {
    if (!nearby) return;
    sheetOpen = true;
    renderSheet(nearby, narrative);
    sheet.setAttribute("aria-hidden", "false");
    prompt.setAttribute("aria-hidden", "true");
  }

  prompt.addEventListener("click", open);
  sheet.addEventListener("click", async (event) => {
    const closeButton = event.target.closest("[data-scene-close]");
    if (closeButton) {
      close();
      return;
    }
    const button = event.target.closest("[data-scene-action]");
    if (!button || busy || !nearby) return;
    busy = true;
    button.disabled = true;
    try {
      const result = await onAction(nearby, button.dataset.sceneAction);
      busy = false;
      if (result?.close) close();
      else if (result) showNarrative(result);
    } catch (error) {
      console.error(error);
      busy = false;
      showNarrative({
        eyebrow: "互动没有完成",
        title: "这里暂时没有回应",
        detail: "世界状态没有成功保存，请稍后再试。",
        icon: "message-circle",
        actions: [],
      });
    } finally {
      busy = false;
    }
  });

  return {
    setNearby,
    open,
    close,
    showNarrative,
    handleKey(event) {
      if (!["KeyE", "KeyF"].includes(event.code) || event.repeat || event.target.closest?.("input, textarea, select")) {
        return false;
      }
      if (sheetOpen) close();
      else open();
      return Boolean(nearby);
    },
    get nearby() { return nearby; },
    get isOpen() { return sheetOpen; },
    destroy() { mount.remove(); },
  };
}
