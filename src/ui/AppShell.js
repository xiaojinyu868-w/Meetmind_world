import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Check,
  Clock3,
  DoorOpen,
  Info,
  MapPin,
  MessageCircle,
  Network,
  Plus,
  Send,
  Sparkles,
  UserRound,
  Users,
  X,
  createIcons,
} from "lucide";
import { renderRelationshipGraph } from "./RelationshipGraph.js";


const ICONS = {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Check,
  Clock3,
  DoorOpen,
  Info,
  MapPin,
  MessageCircle,
  Network,
  Plus,
  Send,
  Sparkles,
  UserRound,
  Users,
  X,
};

const VIEW_LABELS = {
  intro: "首页",
  network: "关系世界",
  scene: "相遇场景",
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

function profileMarkup(person) {
  return `
    <div class="profile-detail-list">
      <div class="profile-detail">
        ${icon("map-pin")}
        <span><small>所在城市</small><strong>${person.city}</strong></span>
      </div>
      <div class="profile-detail">
        ${icon("calendar-days")}
        <span><small>初次相遇</small><strong>${person.metAt}</strong></span>
      </div>
      <div class="profile-detail">
        ${icon("clock-3")}
        <span><small>最近相见</small><strong>${person.lastSeen}</strong></span>
      </div>
    </div>
    <p class="person-bio">${person.bio}</p>
    <div class="person-tags" aria-label="人物标签">
      ${person.tags.map((tag) => `<span>${tag}</span>`).join("")}
    </div>
    <div class="person-stats" aria-label="数据摘要">
      <div><strong>${person.stats.photos}</strong><span>照片</span></div>
      <div><strong>${person.stats.voiceClips}</strong><span>语音</span></div>
      <div><strong>${person.stats.memories}</strong><span>记忆</span></div>
    </div>`;
}

function memoriesMarkup(person) {
  return `
    <div class="memory-list">
      ${person.memories
        .map(
          (memory, index) => `
            <article class="memory-row">
              <span class="memory-index">${String(index + 1).padStart(2, "0")}</span>
              <div>
                <time>${memory.date}</time>
                <h4>${memory.title}</h4>
                <p>${memory.detail}</p>
              </div>
            </article>`,
        )
        .join("")}
    </div>`;
}

function sceneSummaryMarkup(person) {
  return `
    <div class="scene-summary-visual">
      <div class="scene-summary-icon">${icon("sparkles")}</div>
      <div>
        <small>共同场景</small>
        <h4>${person.scene.title}</h4>
        <p>${person.scene.summary}</p>
      </div>
    </div>
    <div class="scene-facts">
      <span>${icon("clock-3")} ${person.scene.moment}</span>
      <span>${icon("map-pin")} ${person.scene.atmosphere}</span>
    </div>`;
}

export function createAppShell({
  root,
  currentUser,
  people,
  relationships,
  onViewChange = () => {},
  onEnterScene = async () => {},
  onInvite = async () => {},
}) {
  let currentView = "intro";
  let selectedPerson = null;
  let personPanelTab = "profile";
  let scenePanelTab = null;
  let worldReady = false;
  let inviteOpen = false;
  const invitedIds = new Set();
  const messagesByPerson = new Map();

  root.innerHTML = `
    <div class="app-shell" data-view="intro">
      <section id="intro-view" class="app-view intro-view" aria-label="EchoWorld 首页">
        <div class="intro-scrim" aria-hidden="true"></div>
        <header class="intro-header">
          <a class="brand-lockup" href="#" data-action="home" aria-label="EchoWorld 首页">
            <span class="brand-mark">EW</span>
            <span><strong>EchoWorld</strong><small>3D 智能体关系世界</small></span>
          </a>
          <div class="world-status"><span></span>世界档案已同步</div>
        </header>

        <div class="intro-content">
          <p class="intro-kicker">YOUR RELATIONSHIPS, STILL LIVING</p>
          <h1>EchoWorld</h1>
          <p class="intro-lead">把现实里的相遇，变成会持续生长的 3D 关系世界。</p>
        </div>

        <button class="enter-world-button" type="button" data-action="enter-network" disabled>
          <span><small>开启我的世界</small>进入关系世界</span>
          ${icon("arrow-right")}
        </button>

        <footer class="intro-footer">
          <div><strong>06</strong><span>关系节点</span></div>
          <div><strong>42</strong><span>共同记忆</span></div>
          <div><strong>01</strong><span>世界在线</span></div>
          <p>ECHOWORLD / PRIVATE PROTOTYPE</p>
        </footer>
      </section>

      <section id="network-view" class="app-view network-view" aria-label="我的关系世界" aria-hidden="true">
        <header class="workspace-header">
          <button class="brand-lockup compact" type="button" data-action="home" aria-label="返回首页">
            <span class="brand-mark">EW</span>
            <span><strong>EchoWorld</strong><small>MY RELATIONSHIP WORLD</small></span>
          </button>
          <div class="workspace-title">
            ${icon("network")}
            <span><small>我的世界</small><strong>关系网络</strong></span>
          </div>
          <div class="workspace-meta"><span></span>最近同步：今天 10:24</div>
        </header>

        <div class="network-stage">
          <div class="network-coordinate">SHANGHAI · 31.2304° N / 121.4737° E</div>
          <div id="relationship-graph" class="relationship-graph"></div>
          <div class="network-summary">
            <span>6 个关系节点</span>
            <span>12 条连接</span>
            <span>3 个近期事件</span>
          </div>
        </div>

        <aside id="person-panel" class="person-panel" aria-label="人物资料" aria-hidden="true"></aside>
      </section>

      <section id="scene-view" class="app-view scene-view" aria-label="相遇场景" aria-hidden="true">
        <header class="scene-header">
          <button class="icon-button scene-back" type="button" data-action="back-network" title="返回关系网络" aria-label="返回关系网络">
            ${icon("arrow-left")}
          </button>
          <div class="scene-location">
            <small>正在相遇</small>
            <strong id="scene-location-title">共同场景</strong>
          </div>
          <div id="scene-party" class="scene-party" aria-label="场景中的人物"></div>
        </header>

        <div class="scene-caption">
          <span class="scene-live-dot"></span>
          <div><small id="scene-moment">共同记忆</small><strong id="scene-person-name">等待人物</strong></div>
        </div>

        <aside id="scene-panel" class="scene-panel" aria-label="场景信息" aria-hidden="true"></aside>

        <aside id="invite-drawer" class="invite-drawer" aria-label="邀请好友" aria-hidden="true"></aside>

        <nav class="scene-dock" aria-label="场景操作">
          <button type="button" data-scene-tool="talk">${icon("message-circle")}<span>交谈</span></button>
          <button type="button" data-scene-tool="profile">${icon("info")}<span>资料</span></button>
          <button type="button" data-scene-tool="invite">${icon("users")}<span>邀请</span></button>
        </nav>
      </section>

      <div id="app-toast" class="app-toast" role="status" aria-live="polite"></div>
    </div>`;

  const shell = root.querySelector(".app-shell");
  const graph = root.querySelector("#relationship-graph");
  const personPanel = root.querySelector("#person-panel");
  const scenePanel = root.querySelector("#scene-panel");
  const inviteDrawer = root.querySelector("#invite-drawer");
  const toast = root.querySelector("#app-toast");
  let toastTimer = null;

  function refreshGraph() {
    renderRelationshipGraph(graph, {
      currentUser,
      people,
      relationships,
      selectedId: selectedPerson?.id ?? null,
    });
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function getMessages(person) {
    if (!messagesByPerson.has(person.id)) {
      messagesByPerson.set(person.id, [
        { from: "them", text: person.conversation.greeting },
      ]);
    }
    return messagesByPerson.get(person.id);
  }

  function talkMarkup(person, context) {
    const messages = getMessages(person);
    return `
      <div class="talk-thread" data-talk-thread>
        ${messages
          .map(
            (message) => `
              <div class="talk-message ${message.from === "me" ? "is-me" : "is-them"}">
                ${message.from === "them" ? `<img src="${person.portrait}" alt="" />` : ""}
                <p>${escapeHtml(message.text)}</p>
              </div>`,
          )
          .join("")}
      </div>
      <div class="talk-starters" aria-label="对话建议">
        ${person.conversation.starters
          .map((starter) => `<button type="button" data-talk-starter="${escapeHtml(starter)}">${starter}</button>`)
          .join("")}
      </div>
      <form class="talk-composer" data-talk-form data-context="${context}">
        <input name="message" autocomplete="off" placeholder="给 ${person.name} 发一条消息" aria-label="消息" />
        <button type="submit" class="icon-button" title="发送" aria-label="发送消息">${icon("send")}</button>
      </form>`;
  }

  function panelContent(person, tab, context) {
    if (tab === "memories") return memoriesMarkup(person);
    if (tab === "talk") return talkMarkup(person, context);
    return context === "scene"
      ? `${sceneSummaryMarkup(person)}${profileMarkup(person)}`
      : profileMarkup(person);
  }

  function renderPersonPanel() {
    if (!selectedPerson) {
      personPanel.setAttribute("aria-hidden", "true");
      personPanel.innerHTML = "";
      shell.classList.remove("has-person-panel");
      return;
    }
    personPanel.innerHTML = `
      <div class="person-panel-header">
        <img src="${selectedPerson.portrait}" alt="${selectedPerson.name} 的 Low-poly 头像" />
        <div><span>${selectedPerson.relation}</span><h2>${selectedPerson.name}</h2><p>${selectedPerson.role} · ${selectedPerson.city}</p></div>
        <button class="icon-button" type="button" data-action="close-person" title="关闭" aria-label="关闭人物资料">${icon("x")}</button>
      </div>
      <div class="panel-tabs" role="tablist" aria-label="人物信息视图">
        <button type="button" role="tab" data-panel-tab="profile" aria-selected="${personPanelTab === "profile"}">${icon("user-round")}资料</button>
        <button type="button" role="tab" data-panel-tab="memories" aria-selected="${personPanelTab === "memories"}">${icon("book-open-text")}记忆</button>
        <button type="button" role="tab" data-panel-tab="talk" aria-selected="${personPanelTab === "talk"}">${icon("message-circle")}对话</button>
      </div>
      <div class="panel-content">${panelContent(selectedPerson, personPanelTab, "network")}</div>
      <div class="panel-actions">
        <button class="secondary-button" type="button" data-action="open-talk">${icon("message-circle")}开始对话</button>
        <button class="primary-button" type="button" data-action="enter-scene">${icon("door-open")}进入场景</button>
      </div>`;
    personPanel.setAttribute("aria-hidden", "false");
    shell.classList.add("has-person-panel");
    hydrateIcons(personPanel);
    requestAnimationFrame(() => {
      const thread = personPanel.querySelector("[data-talk-thread]");
      if (thread) thread.scrollTop = thread.scrollHeight;
    });
  }

  function renderScenePanel() {
    if (!selectedPerson || !scenePanelTab) {
      scenePanel.innerHTML = "";
      scenePanel.setAttribute("aria-hidden", "true");
      shell.classList.remove("has-scene-panel");
      return;
    }
    const title = scenePanelTab === "talk" ? `与 ${selectedPerson.name} 交谈` : `${selectedPerson.name} 的资料`;
    scenePanel.innerHTML = `
      <header class="scene-panel-header">
        <img src="${selectedPerson.portrait}" alt="" />
        <div><small>${selectedPerson.relation}</small><h3>${title}</h3></div>
        <button class="icon-button" type="button" data-action="close-scene-panel" title="关闭" aria-label="关闭场景面板">${icon("x")}</button>
      </header>
      <div class="scene-panel-content">${panelContent(selectedPerson, scenePanelTab, "scene")}</div>`;
    scenePanel.setAttribute("aria-hidden", "false");
    shell.classList.add("has-scene-panel");
    hydrateIcons(scenePanel);
    requestAnimationFrame(() => {
      const thread = scenePanel.querySelector("[data-talk-thread]");
      if (thread) thread.scrollTop = thread.scrollHeight;
    });
  }

  function renderSceneParty() {
    const party = root.querySelector("#scene-party");
    if (!selectedPerson) {
      party.innerHTML = "";
      return;
    }
    const invited = people.filter((person) => invitedIds.has(person.id));
    party.innerHTML = `
      <div class="party-avatars">
        <img src="${currentUser.portrait}" alt="${currentUser.displayName}" title="${currentUser.displayName}" />
        <img src="${selectedPerson.portrait}" alt="${selectedPerson.name}" title="${selectedPerson.name}" />
        ${invited.map((person) => `<img src="${person.portrait}" alt="${person.name}" title="${person.name}" />`).join("")}
      </div>
      <span>${2 + invited.length} 人在场</span>`;
  }

  function renderInviteDrawer() {
    if (!inviteOpen || !selectedPerson) {
      inviteDrawer.innerHTML = "";
      inviteDrawer.setAttribute("aria-hidden", "true");
      shell.classList.remove("has-invite-drawer");
      return;
    }
    const candidates = people.filter((person) => person.id !== selectedPerson.id);
    inviteDrawer.innerHTML = `
      <header>
        <div>${icon("users")}<span><small>扩展这次相遇</small><strong>邀请好友进入</strong></span></div>
        <button class="icon-button" type="button" data-action="close-invite" title="关闭" aria-label="关闭邀请列表">${icon("x")}</button>
      </header>
      <div class="invite-list">
        ${candidates
          .map((person) => {
            const invited = invitedIds.has(person.id);
            return `
              <div class="invite-row">
                <img src="${person.portrait}" alt="" />
                <span><strong>${person.name}</strong><small>${person.relation}</small></span>
                <button type="button" data-invite-id="${person.id}" ${invited ? "disabled" : ""} aria-label="${invited ? `${person.name} 已在场` : `邀请 ${person.name}`}">
                  ${icon(invited ? "check" : "plus")}
                  <span>${invited ? "已在场" : "邀请"}</span>
                </button>
              </div>`;
          })
          .join("")}
      </div>`;
    inviteDrawer.setAttribute("aria-hidden", "false");
    shell.classList.add("has-invite-drawer");
    hydrateIcons(inviteDrawer);
  }

  function updateSceneIdentity() {
    if (!selectedPerson) return;
    root.querySelector("#scene-location-title").textContent = selectedPerson.scene.title;
    root.querySelector("#scene-moment").textContent = selectedPerson.scene.moment;
    root.querySelector("#scene-person-name").textContent = `与 ${selectedPerson.name} 的相遇`;
    renderSceneParty();
  }

  function setView(view) {
    currentView = view;
    shell.dataset.view = view;
    document.body.dataset.view = view;
    for (const section of root.querySelectorAll(".app-view")) {
      const active = section.id === `${view}-view`;
      section.setAttribute("aria-hidden", String(!active));
    }
    if (view !== "scene") {
      scenePanelTab = null;
      inviteOpen = false;
      renderScenePanel();
      renderInviteDrawer();
    }
    onViewChange(view);
    document.title = `EchoWorld · ${VIEW_LABELS[view]}`;
  }

  function selectPerson(personId) {
    if (personId === currentUser.id) return;
    const person = people.find((candidate) => candidate.id === personId);
    if (!person) return;
    selectedPerson = person;
    personPanelTab = "profile";
    refreshGraph();
    renderPersonPanel();
  }

  async function enterSelectedScene(button) {
    if (!selectedPerson || !worldReady) return;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    const original = button.innerHTML;
    button.textContent = "正在构建场景";
    try {
      invitedIds.clear();
      await onEnterScene(selectedPerson);
      updateSceneIdentity();
      setView("scene");
    } catch (error) {
      console.error(error);
      showToast("场景暂时无法进入，请稍后重试");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.innerHTML = original;
      hydrateIcons(button);
    }
  }

  function submitTalk(person, message) {
    const text = String(message).trim();
    if (!text) return;
    const messages = getMessages(person);
    messages.push({ from: "me", text });
    if (currentView === "scene") renderScenePanel();
    else renderPersonPanel();

    const replyIndex = Math.max(0, messages.filter((entry) => entry.from === "me").length - 1);
    window.setTimeout(() => {
      messages.push({
        from: "them",
        text: person.conversation.replies[replyIndex % person.conversation.replies.length],
      });
      if (selectedPerson?.id !== person.id) return;
      if (currentView === "scene" && scenePanelTab === "talk") renderScenePanel();
      if (currentView === "network" && personPanelTab === "talk") renderPersonPanel();
    }, 520);
  }

  root.addEventListener("click", async (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;

    if (target.dataset.action === "home") {
      event.preventDefault();
      setView("intro");
      return;
    }
    if (target.dataset.action === "enter-network") {
      setView("network");
      return;
    }
    if (target.dataset.personId) {
      selectPerson(target.dataset.personId);
      return;
    }
    if (target.dataset.action === "close-person") {
      selectedPerson = null;
      refreshGraph();
      renderPersonPanel();
      return;
    }
    if (target.dataset.panelTab) {
      personPanelTab = target.dataset.panelTab;
      renderPersonPanel();
      return;
    }
    if (target.dataset.action === "open-talk") {
      personPanelTab = "talk";
      renderPersonPanel();
      return;
    }
    if (target.dataset.action === "enter-scene") {
      await enterSelectedScene(target);
      return;
    }
    if (target.dataset.action === "back-network") {
      setView("network");
      return;
    }
    if (target.dataset.sceneTool === "talk" || target.dataset.sceneTool === "profile") {
      inviteOpen = false;
      renderInviteDrawer();
      scenePanelTab = scenePanelTab === target.dataset.sceneTool ? null : target.dataset.sceneTool;
      renderScenePanel();
      return;
    }
    if (target.dataset.sceneTool === "invite") {
      scenePanelTab = null;
      renderScenePanel();
      inviteOpen = !inviteOpen;
      renderInviteDrawer();
      return;
    }
    if (target.dataset.action === "close-scene-panel") {
      scenePanelTab = null;
      renderScenePanel();
      return;
    }
    if (target.dataset.action === "close-invite") {
      inviteOpen = false;
      renderInviteDrawer();
      return;
    }
    if (target.dataset.talkStarter) {
      submitTalk(selectedPerson, target.dataset.talkStarter);
      return;
    }
    if (target.dataset.inviteId) {
      const person = people.find((candidate) => candidate.id === target.dataset.inviteId);
      if (!person || invitedIds.has(person.id)) return;
      target.disabled = true;
      try {
        await onInvite(person);
        invitedIds.add(person.id);
        renderInviteDrawer();
        renderSceneParty();
        showToast(`${person.name} 已进入场景`);
      } catch (error) {
        console.error(error);
        target.disabled = false;
        showToast("邀请没有送达，请稍后重试");
      }
    }
  });

  root.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-talk-form]");
    if (!form || !selectedPerson) return;
    event.preventDefault();
    const input = form.elements.message;
    submitTalk(selectedPerson, input.value);
    input.value = "";
  });

  refreshGraph();
  hydrateIcons(root);

  return {
    setWorldReady(ready) {
      worldReady = Boolean(ready);
      const button = root.querySelector('[data-action="enter-network"]');
      button.disabled = !worldReady;
      if (worldReady) button.classList.add("is-ready");
    },
    setView,
    showToast,
    get view() {
      return currentView;
    },
    get selectedPerson() {
      return selectedPerson;
    },
  };
}
