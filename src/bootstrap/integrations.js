import { CloudUpload, Coffee, ScanFace, Store, Users, createIcons } from "lucide";
import * as MockApi from "../runtime/mock/MockApi.js";
import { publicUrl } from "../runtime/WorldSpec.js";
import { navigateToWorld } from "../runtime/WorldSwitch.js";
import { mountPackagePanel } from "../ui/package-panel/PackagePanel.js";
import { mountPipelineFlow } from "../ui/pipeline/PipelineFlow.js";
import { mountGroupPlay } from "../ui/group/GroupPlay.js";
import { mountOnboardingFlow } from "../ui/onboarding/OnboardingFlow.js";

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

const INTEGRATIONS_ICONS = { CloudUpload, Coffee, ScanFace, Store, Users };

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
.echo-integrations .record-fab[hidden] { display: none !important; }
body[data-view="cafe"] .echo-integrations .record-fab { display: flex; }

/* 世界切换导航：叠放在「记录相遇」之上，两个世界各显示对应的出口 */
.echo-integrations .nav-world-fab {
  bottom: max(160px, calc(env(safe-area-inset-bottom) + 140px));
}

/* 「合照入场」：再上一层；空集市时 pulse 吸引注意 */
.echo-integrations .onboard-fab {
  bottom: max(228px, calc(env(safe-area-inset-bottom) + 208px));
}
.echo-integrations .onboard-fab.is-suggested {
  animation: echo-onboard-pulse 1.8s ease-in-out infinite;
  border-color: rgb(229 180 81 / 80%);
}
@keyframes echo-onboard-pulse {
  0%, 100% { box-shadow: 0 12px 30px rgb(18 45 39 / 18%); }
  50% { box-shadow: 0 12px 34px rgb(229 180 81 / 45%); }
}

.echo-integrations .group-fab {
  right: max(20px, env(safe-area-inset-right));
  left: auto;
  display: flex;
  border-radius: 6px;
  color: #fff;
  background: rgb(28 75 65 / 90%);
}
.echo-integrations .group-fab svg { color: #efc76f; }
.echo-integrations .group-fab small { color: rgb(255 255 255 / 68%); }
.echo-integrations.has-group-room .group-fab { display: none; }

@media (max-width: 640px) {
  .echo-integrations .group-fab {
    width: 46px;
    height: 46px;
    padding: 0;
    justify-content: center;
  }
  .echo-integrations .group-fab span { display: none; }
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


// 事实层指针（portraits/xxx.png、facts/...、derived/...）→ 可加载 URL；绝对 URL / data / blob 原样透传。
// live 模式下 facts/... 与 derived/... 媒体走后端媒体路由（/api/v0/media/<ref>）；mock 模式保持 publicUrl。
export function resolveMediaUrl(ref) {
  if (ref === null || ref === undefined) return "";
  const value = String(ref).trim();
  if (!value) return "";
  if (/^(?:https?:)?\/\//.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  if (MockApi.isLiveMode() && (value.startsWith("facts/") || value.startsWith("derived/"))) {
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
    // FR-2.12 合照入场两段式
    detectGroupPhoto(photo, options) {
      return base.groupOnboardingDetect(photo, options);
    },
    confirmGroupPhoto(groupId, assignments) {
      return base.groupOnboardingConfirm(groupId, assignments);
    },
    // IF-4
    fetchSnapshot() {
      return base.fetchSnapshot();
    },
    // IF-5
    getPackage(personId) {
      return base.getPackage(personId);
    },
    // IF-6：玩家与 Agent 单聊 + 手动沉淀（资料包面板内对话框）
    chatWithAgent(personId, message, history) {
      return base.chatWithAgent(personId, message, history);
    },
    saveChatNote(personId, text) {
      return base.saveChatNote(personId, text);
    },
    // IF-6：用户发起的圆桌会议 + 玩家会议发言
    startMeeting(participantIds, topic) {
      return base.startMeeting(participantIds, topic);
    },
    postMeetingMessage(text) {
      return base.postMeetingMessage(text);
    },
    // IF-6：发起人提前结束会议（live 即时散场；mock 仅保持契约形状）
    endMeeting() {
      return typeof base.endMeeting === "function"
        ? base.endMeeting()
        : Promise.resolve({ meeting_id: null, ended: true });
    },
    // K3 线：相遇隐私级别切换（L1/L2）与生理信号聚合查询
    setEncounterPrivacy(personId, encounterId, privacy) {
      return base.setEncounterPrivacy(personId, encounterId, privacy);
    },
    getPersonSignal(personId) {
      return base.getPersonSignal(personId);
    },
    getField(personId) {
      return base.getField(personId);
    },
    regenerateField(personId) {
      return base.regenerateField(personId);
    },
    getWorldEvents(limit) {
      return base.getWorldEvents(limit);
    },
    getWorldBrief() {
      return base.getWorldBrief();
    },
    recordWorldInteraction(payload) {
      return base.recordWorldInteraction(payload);
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
 * @param {object[]} [options.groupParticipants] 上游已完成建档的现场参与者 DTO
 * @param {() => {x:number,z:number,yaw:number}|null} [options.groupPresenceProvider]
 * @param {(participants: object[], viewerId: string) => void} [options.onGroupPresenceHook]
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
  groupParticipants = [],
  groupPresenceProvider = null,
  onGroupPresenceHook = null,
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

  const groupPlay = mountGroupPlay(mountRoot, {
    participants: groupParticipants,
    getLocalPresence: groupPresenceProvider,
    onPresence: onGroupPresenceHook,
    onToast: notifyToast,
  });

  // 合照入场（FR-2.12 两段式：认脸 → 逐脸确认姓名 → 批量建档进展位）
  const currentWorld = ["hall", "cafe", "field"].includes(document.body.dataset.world)
    ? document.body.dataset.world
    : "hall";
  const onboardingFlow = mountOnboardingFlow(mountRoot, unifiedApi, {
    onComplete({ count, names }) {
      unifiedApi.invalidatePackages();
      refreshPackages().catch((error) => {
        console.warn("[integrations] 合照入场后刷新资料包列表失败", error);
      });
      notifyToast(`${count} 位朋友已进入集市${names?.length ? `：${names.join("、")}` : ""}`);
    },
    // 成功屏 CTA：不在大厅时整页跳集市（大厅内则下一轮快照自动带出新展位，无需刷新）
    onNavigateHall: currentWorld === "hall" ? null : () => navigateToWorld("hall"),
  });

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
  const navTarget = currentWorld === "hall" ? "cafe" : "hall";
  const navToCafe = navTarget === "cafe";
  const navFab = document.createElement("button");
  navFab.className = "record-fab nav-world-fab";
  navFab.type = "button";
  navFab.setAttribute("aria-label", navToCafe ? "去咖啡厅坐坐" : "回到我的集市");
  navFab.innerHTML =
    `<i data-lucide="${navToCafe ? "coffee" : "store"}"></i>` +
    `<span><small>${navToCafe ? "Echo Cafe" : "Expo Hall"}</small>` +
    `<strong>${navToCafe ? "去咖啡厅坐坐" : "回到我的集市"}</strong></span>`;
  navFab.addEventListener("click", () => navigateToWorld(navTarget));
  mountRoot.append(navFab);

  // 「合照入场」入口按钮（cafe 视图显示；空集市时 pulse 引导）
  const onboardFab = document.createElement("button");
  onboardFab.className = "record-fab onboard-fab";
  onboardFab.type = "button";
  onboardFab.setAttribute("aria-label", "用一张合照让朋友们入场");
  onboardFab.innerHTML =
    `<i data-lucide="scan-face"></i>` +
    `<span><small>Group Onboarding</small><strong>合照入场</strong></span>`;
  onboardFab.addEventListener("click", () => onboardingFlow.open());
  mountRoot.append(onboardFab);

  // 空集市引导：大厅快照同步后仍无展位时，提示合照入场（一次性）
  if (currentWorld === "hall") {
    window.setTimeout(() => {
      const boothCount = document.querySelector("#world")?.dataset.boothCount;
      if (boothCount === "0") {
        onboardFab.classList.add("is-suggested");
        notifyToast("集市还空着——用一张合照让大家一起入场");
      }
    }, 5000);
  }

  const groupFab = document.createElement("button");
  groupFab.className = "record-fab group-fab";
  groupFab.type = "button";
  groupFab.setAttribute("aria-label", "进入现场房间");
  groupFab.title = "进入现场房间";
  groupFab.innerHTML =
    `<i data-lucide="users"></i>` +
    `<span><small>Group Session</small><strong>现场一起玩</strong></span>`;
  groupFab.addEventListener("click", () => groupPlay.open());
  mountRoot.append(groupFab);
  if (currentWorld === "field") {
    fab.hidden = true;
    groupFab.hidden = true;
    onboardFab.hidden = true;
  }
  for (const button of [fab, navFab, onboardFab, groupFab]) {
    createIcons({ icons: INTEGRATIONS_ICONS, root: button, attrs: { "stroke-width": 1.8 } });
  }

  return {
    api: unifiedApi,
    flow,
    panel,
    searchBar,
    groupPlay,
    onboardingFlow,
    openPipeline: () => flow.open(),
    openOnboarding: () => onboardingFlow.open(),
    refreshPackages,
  };
}
