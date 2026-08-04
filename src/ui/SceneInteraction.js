import {
  BookOpen,
  Coffee,
  DoorOpen,
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
  Landmark,
  MapPin,
  MessageCircle,
  Sparkles,
  Store,
  Users,
  X,
};

const TOAST_DURATION_MS = 5000;

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

/**
 * 场景互动（INTERACTION-DESIGN §6 交互收敛）：
 *  - 一键一动作：热点带 primaryAction（E）/ 可选 secondaryAction（F），按下即发生，无菜单。
 *  - prompt 内联展示「E 聊聊 · F 场域」双键提示；触屏渲染为主/次两个小按钮。
 *  - onAction 返回 {close} / {toast} / {picker}：
 *    toast 为瞬态叙事卡（自动消失，非模态，不锁移动）；
 *    picker 为唯一保留的模态层——横向人物 chip 条（选人邀请），ESC 关闭。
 *
 * @param {object} [options]
 * @param {HTMLElement} [options.root]
 * @param {(hotspot: object, actionId: string) => Promise<object|null>} [options.onAction]
 */
export function mountSceneInteraction({ root = document.body, onAction = async () => null } = {}) {
  // 触屏设备没有 E/F 键盘：主/次动作渲染为两个小按钮，不是键盘说明文字
  const coarsePointer =
    typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const mount = document.createElement("div");
  mount.className = "scene-interaction";
  mount.innerHTML = `
    <div class="scene-interaction-prompt" aria-hidden="true">
      <span class="scene-interaction-keys"></span>
      <span class="scene-interaction-text"><small></small><strong></strong></span>
    </div>
    <aside class="scene-interaction-picker" aria-hidden="true" aria-label="选择人物"></aside>
    <div class="scene-interaction-toast" aria-hidden="true" role="status"></div>`;
  root.append(mount);

  const prompt = mount.querySelector(".scene-interaction-prompt");
  const promptKeys = mount.querySelector(".scene-interaction-keys");
  const picker = mount.querySelector(".scene-interaction-picker");
  const toast = mount.querySelector(".scene-interaction-toast");
  let nearby = null;
  let pickerOpen = false;
  let busy = false;
  let toastTimer = 0;

  function renderPromptKeys() {
    if (!nearby) return;
    const { primaryAction, secondaryAction } = nearby;
    if (coarsePointer) {
      promptKeys.innerHTML = [
        primaryAction
          ? `<button type="button" class="scene-interaction-chip is-primary" data-scene-key="primary">${escapeHtml(primaryAction.label)}</button>`
          : "",
        secondaryAction
          ? `<button type="button" class="scene-interaction-chip" data-scene-key="secondary">${escapeHtml(secondaryAction.label)}</button>`
          : "",
      ].join("");
    } else {
      promptKeys.innerHTML = [
        primaryAction
          ? `<span class="scene-interaction-key"><kbd>E</kbd>${escapeHtml(primaryAction.label)}</span>`
          : "",
        primaryAction && secondaryAction ? `<span class="scene-interaction-key-sep">·</span>` : "",
        secondaryAction
          ? `<span class="scene-interaction-key"><kbd>F</kbd>${escapeHtml(secondaryAction.label)}</span>`
          : "",
      ].join("");
    }
  }

  function setNearby(hotspot) {
    nearby = hotspot ?? null;
    if (pickerOpen) return;
    const visible = Boolean(nearby);
    prompt.setAttribute("aria-hidden", String(!visible));
    if (nearby) {
      prompt.querySelector("strong").textContent = nearby.prompt ?? nearby.title;
      prompt.querySelector("small").textContent = nearby.eyebrow ?? "附近可互动";
      renderPromptKeys();
    }
  }

  function showToast(card) {
    window.clearTimeout(toastTimer);
    toast.innerHTML = `
      <header>
        <span class="scene-interaction-symbol">${icon(card.icon)}</span>
        <div>
          <small>${escapeHtml(card.eyebrow ?? "世界已记住")}</small>
          <strong>${escapeHtml(card.title)}</strong>
        </div>
      </header>
      ${card.detail ? `<p>${escapeHtml(card.detail)}</p>` : ""}`;
    hydrate(toast);
    toast.setAttribute("aria-hidden", "false");
    toastTimer = window.setTimeout(() => {
      toast.setAttribute("aria-hidden", "true");
      toast.innerHTML = "";
    }, Math.max(2000, Math.round((card.duration ?? TOAST_DURATION_MS / 1000) * 1000)));
  }

  function openPicker(config) {
    pickerOpen = true;
    picker.innerHTML = `
      <header>
        <div>
          <small>${escapeHtml(config.eyebrow ?? "邀请")}</small>
          <strong>${escapeHtml(config.title ?? "邀请谁？")}</strong>
        </div>
        <button type="button" class="scene-interaction-close" data-scene-close title="取消" aria-label="取消邀请">${icon("x")}</button>
      </header>
      <div class="scene-interaction-picker-chips">
        ${(config.people ?? []).map((person) => `
          <button type="button" data-scene-pick="${escapeHtml(person.actionId)}">
            <strong>${escapeHtml(person.label)}</strong>
            ${person.description ? `<small>${escapeHtml(person.description)}</small>` : ""}
          </button>`).join("")}
      </div>`;
    hydrate(picker);
    picker.setAttribute("aria-hidden", "false");
    prompt.setAttribute("aria-hidden", "true");
  }

  function close() {
    pickerOpen = false;
    picker.setAttribute("aria-hidden", "true");
    picker.innerHTML = "";
    prompt.setAttribute("aria-hidden", String(!nearby));
  }

  async function activateDirectAction() {
    const actionId = nearby?.directActionId;
    if (!actionId || busy || !nearby) return false;
    busy = true;
    try {
      const result = await onAction(nearby, actionId);
      if (result?.close) close();
      else if (result) showNarrative(result);
    } catch (error) {
      console.error(error);
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
    return true;
  }

  function activate() {
    if (nearby?.directActionId) {
      void activateDirectAction();
      return true;
    }
    return open();
  }

  function showNarrative(narrative) {
    if (!nearby) return;
    sheetOpen = true;
    renderSheet(nearby, narrative);
    sheet.setAttribute("aria-hidden", "false");
    prompt.setAttribute("aria-hidden", "true");
  }

  prompt.addEventListener("click", activate);
  sheet.addEventListener("click", async (event) => {
    const closeButton = event.target.closest("[data-scene-close]");
    if (closeButton) {
      close();
      return;
    }
    const button = event.target.closest("[data-scene-action]");
    if (!button || busy || !nearby) return;
    busy = true;
    try {
      const result = await onAction(nearby, action.id);
      if (result?.picker) openPicker(result.picker);
      else if (result?.toast) showToast(result.toast);
    } catch (error) {
      console.error(error);
      showToast({
        eyebrow: "互动没有完成",
        title: "这里暂时没有回应",
        detail: "世界状态没有成功保存，请稍后再试。",
        icon: "message-circle",
      });
    } finally {
      busy = false;
    }
  }

  prompt.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-scene-key]");
    if (chip) {
      run(chip.dataset.sceneKey === "secondary" ? nearby?.secondaryAction : nearby?.primaryAction);
      return;
    }
    // 鼠标点 prompt 本体 = 主动作（与按 E 等价）
    run(nearby?.primaryAction);
  });

  picker.addEventListener("click", async (event) => {
    if (event.target.closest("[data-scene-close]")) {
      close();
      return;
    }
    const chip = event.target.closest("[data-scene-pick]");
    if (!chip || busy || !nearby) return;
    busy = true;
    chip.disabled = true;
    try {
      const result = await onAction(nearby, chip.dataset.scenePick);
      close();
      if (result?.toast) showToast(result.toast);
      else if (result?.picker) openPicker(result.picker);
    } catch (error) {
      console.error(error);
      close();
      showToast({
        eyebrow: "互动没有完成",
        title: "邀请没有送达",
        detail: "世界状态没有成功保存，请稍后再试。",
        icon: "message-circle",
      });
    } finally {
      busy = false;
    }
  });

  return {
    setNearby,
    close,
    showNarrative: showToast, // 兼容旧调用：叙事一律走瞬态 toast（非模态）
    handleKey(event) {
      if (!["KeyE", "KeyF"].includes(event.code) || event.repeat || event.target.closest?.("input, textarea, select")) {
        return false;
      }
      if (sheetOpen) close();
      else activate();
      return Boolean(nearby);
    },
    get nearby() { return nearby; },
    get isOpen() { return pickerOpen; }, // 仅模态层（选人条）算打开：锁移动、吃 ESC
    destroy() {
      window.clearTimeout(toastTimer);
      mount.remove();
    },
  };
}
