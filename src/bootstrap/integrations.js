import { CloudUpload, Coffee, Store, createIcons } from "lucide";
import * as MockApi from "../runtime/mock/MockApi.js";
import { publicUrl } from "../runtime/WorldSpec.js";
import { navigateToWorld } from "../runtime/WorldSwitch.js";
import { mountPackagePanel } from "../ui/package-panel/PackagePanel.js";
import { mountPipelineFlow } from "../ui/pipeline/PipelineFlow.js";

/**
 * integrations —— 咖啡厅/大厅视图的统一集成层。
 *
 * 职责：
 * 1. 把 MockApi（docs/API.md 契约客户端）适配为各 UI 模块期望的注入形状；
 * 2. 挂载同事模块：PipelineFlow（IF-1/2/3）、PackagePanel（IF-5）；
 *    （顶部检索条 2026-08-03 下线，SearchBar.js 保留在 package-panel/ 备用）
 * 3. 提供「记录相遇」入口按钮、世界切换导航按钮与模块间联动（选中定位、确认后刷新人名映射）。
 *
 * 模块 CSS 由各自 JS import（pipeline.css / panel.css），经 vite 自动生效。
 * z-index 分层：世界气泡(7) < 检索条(22) < 入口按钮(30) < 资料包面板(40) < 事件 Toast(60) < pipeline 浮层(80)。
 */

const INTEGRATIONS_ICONS = { CloudUpload, Coffee, Store };

const INTEGRATION_STYLES = `
.echo-integrations .record-fab {
  position: fixed;
  z-index: 30;
  bottom: max(92px, calc(env(safe-area-inset-bottom) + 72px));
  left: max(20px, env(safe-area-inset-left));
  display: none;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border: 1px solid rgb(255 255 255 / 56%);
  border-radius: 19px;
  color: var(--ink, #193d36);
  background: var(--glass, rgb(250 250 246 / 78%));
  box-shadow: 0 12px 30px rgb(18 45 39 / 18%);
  backdrop-filter: blur(16px) saturate(1.05);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.echo-integrations .record-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgb(18 45 39 / 24%);
}
.echo-integrations .record-fab:active { transform: translateY(0); }
.echo-integrations .record-fab svg { width: 20px; height: 20px; color: var(--coral, #d36f59); }
.echo-integrations .record-fab span { display: flex; flex-direction: column; line-height: 1.3; }
.echo-integrations .record-fab small {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  opacity: 0.62;
  text-transform: uppercase;
}
.echo-integrations .record-fab strong { font-size: 12px; font-weight: 800; }
body[data-view="cafe"] .echo-integrations .record-fab { display: flex; }
body[data-scene-actions="open"] .echo-integrations .record-fab { display: none; }

/* 世界切换导航：叠放在「记录相遇」之上，两个世界各显示对应的出口 */
.echo-integrations .nav-world-fab {
  bottom: max(160px, calc(env(safe-area-inset-bottom) + 140px));
}

.echo-integrations-toast {
  position: fixed;
  z-index: 60;
  bottom: 24px;
  left: 50%;
  padding: 10px 16px;
  border: 1px solid rgb(255 255 255 / 42%);
  border-radius: 16px;
  color: #fffdf4;
  background: rgb(21 58 50 / 88%);
  box-shadow: 0 12px 32px rgb(18 45 39 / 19%);
  font-size: 10px;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 10px);
  transition: opacity 200ms ease, transform 200ms ease;
}
.echo-integrations-toast.is-visible { opacity: 1; transform: translate(-50%, 0); }
`;


// 事实层指针（portraits/xxx.png、facts/...）→ 可加载 URL；绝对 URL / data / blob 原样透传。
// live 模式下 facts/... 媒体走后端媒体路由（/api/v0/media/<ref>，后端在建）；mock 模式保持 publicUrl。
export function resolveMediaUrl(ref) {
  if (ref === null || ref === undefined) return "";
  const value = String(ref).trim();
  if (!value) return "";
  if (/^(?:https?:)?\/\//.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  if (MockApi.isLiveMode() && value.startsWith("facts/")) {
    return `${import.meta.env.BASE_URL}api/v0/media/${value}`;
  }
  return publicUrl(value);
}


// 统一 api 适配层：MockApi（契约形状）→ 各 UI 模块期望的注入形状。
// getPackages 结果做 Promise 缓存（confirm 成功后 invalidatePackages 失效）。
export function createUnifiedApi(base = MockApi) {
  let packagesPromise = null;
  return {
    // IF-1：PipelineFlow 的 ingest(payload{files, captured_at, device, note, place_hint}, onProgress?)
    // → MockApi.ingest(files, meta)；mock 无真实上传进度，不回调节流（模块呈不定态，非假进度）
    ingest(payload, _onUploadProgress) {
      const { files, ...meta } = payload ?? {};
      return base.ingest(Array.isArray(files) ? files : [], meta);
    },
    // IF-2
    pipelineStream(inputId, onProgress, options) {
      return base.pipelineStream(inputId, onProgress, options);
    },
    // IF-3：PipelineFlow 的 confirm(payload{encounter_draft, identity, privacy})
    confirm(payload) {
      return base.confirm(
        payload?.encounter_draft,
        payload?.identity ?? {},
        payload?.privacy ?? "self-only",
      );
    },
    // IF-4
    fetchSnapshot() {
      return base.fetchSnapshot();
    },
    startMeeting(payload) {
      return base.startMeeting(payload);
    },
    endMeeting(meetingId) {
      return base.endMeeting(meetingId);
    },
    // IF-5
    getPackage(personId) {
      return base.getPackage(personId);
    },
    search(request) {
      return base.search(request);
    },
    getPackages() {
      if (!packagesPromise) {
        packagesPromise = base.getPackages().catch((error) => {
          packagesPromise = null;
          throw error;
        });
      }
      return packagesPromise;
    },
    invalidatePackages() {
      packagesPromise = null;
    },
    resolveMediaUrl,
    assetUrl: resolveMediaUrl,
  };
}


let fallbackToastTimer = null;

function fallbackToast(message) {
  let element = document.querySelector(".echo-integrations-toast");
  if (!element) {
    element = document.createElement("div");
    element.className = "echo-integrations-toast";
    document.body.append(element);
  }
  element.textContent = message;
  element.classList.add("is-visible");
  window.clearTimeout(fallbackToastTimer);
  fallbackToastTimer = window.setTimeout(() => element.classList.remove("is-visible"), 2600);
}


/**
 * 挂载咖啡厅视图的全部集成模块。
 *
 * @param {object} [options]
 * @param {object} [options.api] 外部注入的统一 api（缺省用 createUnifiedApi() 包装 MockApi；
 *   必须具备 PipelineFlow 要求的 ingest / pipelineStream / confirm）
 * @param {(personId: string) => boolean} [options.onPersonSelectedHook]
 *   在世界中选中/定位人物；返回 false 表示该人不在世界中（容错跳过，不清除当前选中）
 * @param {(packages: object[]) => void} [options.onPackagesChangedHook]
 *   getPackages 刷新后回调（用于同步气泡/Toast 的人名映射）
 * @param {(message: string) => void} [options.onToastHook] Toast 输出（缺省用内置小 Toast）
 * @param {(personId: string) => { status?: string, state?: string } | null} [options.presenceProvider]
 *   在场状态提供者（LiveWorld 快照缓存），注入资料包面板的头部状态行
 * @returns {{ api: object, flow: object, panel: object, searchBar: null,
 *   openPipeline(): void, refreshPackages(): Promise<object[]> }}
 *   （searchBar 已下线置 null，SearchBar.js 能力保留在 src/ui/package-panel/ 备用）
 */
export function mountIntegrations({
  api = null,
  onPersonSelectedHook = null,
  onPackagesChangedHook = null,
  onToastHook = null,
  presenceProvider = null,
} = {}) {
  const unifiedApi = api ?? createUnifiedApi();
  const notifyToast = typeof onToastHook === "function" ? onToastHook : fallbackToast;
  const locatePerson =
    typeof onPersonSelectedHook === "function" ? onPersonSelectedHook : () => false;

  const mountRoot = document.createElement("div");
  mountRoot.className = "echo-integrations";
  document.body.append(mountRoot);

  const styleElement = document.createElement("style");
  styleElement.textContent = INTEGRATION_STYLES;
  document.head.append(styleElement);

  // 资料包面板（IF-5 单包查看，事实层/推断层分隔）+ 在场状态提供者（LiveWorld 快照缓存）
  const panel = mountPackagePanel(mountRoot, unifiedApi);
  if (typeof presenceProvider === "function") panel.setPresenceProvider(presenceProvider);

  // 顶部检索条已下线（2026-08-03 产品决策：检索降级为底层能力，避免"查库"心智与"世界即入口"冲突）。
  // SearchBar.js 模块保留不删，未来可能在面板内以小入口恢复；此处置空兜底，调用方需判空。
  const searchBar = null;

  // 相遇录入流程（IF-1/2/3）。模块 mount 时会自动 open()，立即收起，由入口按钮触发。
  const pipelinePeople = [];
  const flow = mountPipelineFlow(mountRoot, unifiedApi, {
    people: pipelinePeople,
    onConfirmed({ person_id } = {}) {
      // 确认成功：缓存失效 → 重拉人名映射 → Toast → 世界中已有实体则选中高亮
      unifiedApi.invalidatePackages();
      refreshPackages().catch((error) => {
        console.warn("[integrations] confirm 后刷新资料包列表失败", error);
      });
      notifyToast("TA 已住进你的世界");
      try {
        locatePerson(person_id);
      } catch (error) {
        console.warn("[integrations] 新确认的人尚不在世界中，跳过选中", error);
      }
    },
  });
  flow.close();

  function refreshPackages() {
    return unifiedApi.getPackages().then((packages) => {
      pipelinePeople.length = 0;
      for (const pkg of Array.isArray(packages) ? packages : []) {
        const id = pkg?.person_id ?? pkg?.id;
        const name = pkg?.identity?.name ?? pkg?.name ?? id;
        if (id) pipelinePeople.push({ person_id: id, name });
      }
      onPackagesChangedHook?.(packages);
      return packages;
    });
  }
  refreshPackages().catch((error) => {
    console.warn("[integrations] getPackages 首次拉取失败", error);
  });

  // 「记录相遇」入口按钮（仅 cafe 视图显示，样式见 INTEGRATION_STYLES）
  const fab = document.createElement("button");
  fab.className = "record-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "记录一次相遇");
  fab.innerHTML =
    `<i data-lucide="cloud-upload"></i>` +
    `<span><small>Echo 录入</small><strong>记录相遇</strong></span>`;
  fab.addEventListener("click", () => flow.open());
  mountRoot.append(fab);

  // 世界切换导航：大厅 →「去咖啡厅坐坐」，咖啡厅 →「回到我的集市」（body.dataset.world 由 main.js 写入）
  const currentWorld = document.body.dataset.world === "cafe" ? "cafe" : "hall";
  const navToCafe = currentWorld === "hall";
  const navFab = document.createElement("button");
  navFab.className = "record-fab nav-world-fab";
  navFab.type = "button";
  navFab.setAttribute("aria-label", navToCafe ? "去咖啡厅坐坐" : "回到我的集市");
  navFab.innerHTML =
    `<i data-lucide="${navToCafe ? "coffee" : "store"}"></i>` +
    `<span><small>${navToCafe ? "Echo Cafe" : "Expo Hall"}</small>` +
    `<strong>${navToCafe ? "去咖啡厅坐坐" : "回到我的集市"}</strong></span>`;
  navFab.addEventListener("click", () => navigateToWorld(navToCafe ? "cafe" : "hall"));
  mountRoot.append(navFab);
  createIcons({ icons: INTEGRATIONS_ICONS, root: mountRoot, attrs: { "stroke-width": 1.8 } });
  for (const svg of mountRoot.querySelectorAll("svg[data-lucide]")) svg.removeAttribute("data-lucide");

  return {
    api: unifiedApi,
    flow,
    panel,
    searchBar,
    openPipeline: () => flow.open(),
    refreshPackages,
  };
}
