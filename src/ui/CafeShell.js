import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  Check,
  Clock3,
  Coffee,
  Info,
  LocateFixed,
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
  Armchair,
  Check,
  Clock3,
  Coffee,
  Info,
  LocateFixed,
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
  return `
    <div class="variant-controls variant-controls--${context}">
      ${variantSwitcherMarkup({
        variants: sceneVariants,
        activeVariant: activeSceneVariant,
        context,
        kind: "scene",
        label: "场景风格",
      })}
      ${variantSwitcherMarkup({
        variants: characterVariants,
        activeVariant: activeCharacterVariant,
        context,
        kind: "character",
        label: "人物生成方案",
      })}
    </div>`;
}

function inspectorMarkup(person, state, context = "world") {
  const status = STATUS_LABELS[state?.status] ?? "在 Echo Cafe";
  const place = state?.tableLabel ?? "咖啡厅大厅";
  return `
    <header class="inspector-identity">
      <img src="${person.portrait}" alt="${person.name} 的 Low-poly 头像" />
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
}) {
  let currentView = "intro";
  let worldReady = false;
  let roundtableNearby = false;
  let selectedWorldPerson = null;
  let selectedMapPerson = null;
  let meetingSheetOpen = false;
  let meetingActive = false;
  let meetingCursor = 0;
  const invitedIds = new Set();
  const agentStates = new Map();
  const meetingMessages = [];
  const speechTimers = new Map();
  const activeSpeechIds = new Set();

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
            ${activeSceneVariant && activeCharacterVariant ? variantControlsMarkup({
              sceneVariants,
              activeSceneVariant,
              characterVariants,
              activeCharacterVariant,
              context: "intro",
            }) : ""}
            <div class="intro-live"><span></span>6 个 Agent 已抵达</div>
          </div>
        </header>
        <div class="intro-copy">
          <p>YOUR RELATIONSHIPS, IN ONE PLACE</p>
          <h1>Echo Cafe</h1>
          <h2>每一段关系，都有一张可以再次坐下的桌子。</h2>
        </div>
        <button class="intro-enter" type="button" data-action="enter-cafe" disabled>
          <span><small>进入我的关系空间</small>走进咖啡厅</span>
          ${icon("arrow-right")}
        </button>
        <footer class="intro-footnote">
          <span>ECHOWORLD / PRIVATE AGENT SPACE</span>
          <span>06 PEOPLE · 04 TABLES · 01 ROUNDTABLE</span>
        </footer>
      </section>

      <section id="cafe-view" class="cafe-view cafe-world-view" aria-label="Echo Cafe" aria-hidden="true">
        <header class="cafe-hud-top">
          <button class="glass-control venue-control" type="button" data-action="intro" aria-label="返回首页">
            <span class="cafe-brand-mark solid">EW</span>
            <span><small>当前位置</small><strong>Echo Cafe</strong></span>
          </button>
          <div class="cafe-presence">
            <div class="presence-faces">
              ${people.map((person) => `<img src="${person.portrait}" alt="" title="${person.name}" />`).join("")}
            </div>
            <span><strong>6</strong> Agent 在线</span>
          </div>
          <button class="glass-control map-control" type="button" data-action="open-map">
            ${icon("network")}
            <span><small>人物关系</small><strong>关系 Map</strong></span>
          </button>
        </header>

        ${activeSceneVariant && activeCharacterVariant ? variantControlsMarkup({
          sceneVariants,
          activeSceneVariant,
          characterVariants,
          activeCharacterVariant,
          context: "cafe",
        }) : ""}

        <div id="world-speech-layer" class="world-speech-layer" aria-live="polite"></div>

        <div id="roundtable-prompt" class="roundtable-prompt" aria-hidden="true">
          <span class="roundtable-symbol">${icon("users")}</span>
          <span><small>中央六人圆桌</small><strong>发起一次圆桌会议</strong></span>
          <button type="button" data-action="open-meeting">开始</button>
        </div>

        <aside id="world-inspector" class="world-inspector glass-panel" aria-label="人物资料" aria-hidden="true"></aside>
        <aside id="meeting-sheet" class="meeting-sheet glass-panel" aria-label="圆桌会议" aria-hidden="true"></aside>

        <div class="cafe-bottom-status glass-control" aria-label="咖啡厅状态">
          ${icon("coffee")}
          <span><strong>Echo Cafe</strong><small>Agent 正在自主交流</small></span>
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
  const roundtablePrompt = root.querySelector("#roundtable-prompt");
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
    document.title = view === "intro" ? "EchoWorld · Echo Cafe" : view === "map" ? "EchoWorld · 关系 Map" : "EchoWorld · Echo Cafe 在线";
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
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
    if (!selectedWorldPerson) {
      worldInspector.innerHTML = "";
      worldInspector.setAttribute("aria-hidden", "true");
      shell.classList.remove("has-world-inspector");
      return;
    }
    worldInspector.innerHTML = inspectorMarkup(
      selectedWorldPerson,
      agentStates.get(selectedWorldPerson.id),
      "world",
    );
    worldInspector.setAttribute("aria-hidden", "false");
    shell.classList.add("has-world-inspector");
    hydrateIcons(worldInspector);
  }

  function renderMapInspector() {
    if (!selectedMapPerson) {
      mapInspector.innerHTML = "";
      mapInspector.setAttribute("aria-hidden", "true");
      shell.classList.remove("has-map-inspector");
      return;
    }
    mapInspector.innerHTML = `
      ${inspectorMarkup(selectedMapPerson, agentStates.get(selectedMapPerson.id), "map")}
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
            ${person ? `<img src="${person.portrait}" alt="${person.displayName ?? person.name}" />` : `<i>${index + 1}</i>`}
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
      <div class="meeting-invite-list">
        ${people.map((person) => {
          const selected = invitedIds.has(person.id);
          const state = agentStates.get(person.id);
          return `
            <button class="meeting-person-row${selected ? " is-selected" : ""}" type="button" data-meeting-person="${person.id}" aria-pressed="${selected}">
              <img src="${person.portrait}" alt="" />
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
    hydrateIcons(meetingSheet);
  }

  function renderMeetingActive() {
    const participants = people.filter((person) => invitedIds.has(person.id));
    meetingSheet.innerHTML = `
      <header class="meeting-header active">
        <div class="meeting-party-faces">
          <img src="${currentUser.portrait}" alt="" />
          ${participants.map((person) => `<img src="${person.portrait}" alt="" />`).join("")}
        </div>
        <div><small>${participants.length + 1} 人已入座</small><h2>圆桌会议进行中</h2></div>
        <button class="glass-icon-button" type="button" data-action="end-meeting" title="结束会议" aria-label="结束圆桌会议">${icon("x")}</button>
      </header>
      <div class="meeting-thread" data-meeting-thread>
        ${meetingMessages.map((message) => {
          const person = message.personId === currentUser.id ? currentUser : people.find((candidate) => candidate.id === message.personId);
          return `<div class="meeting-message${message.personId === currentUser.id ? " is-me" : ""}">
            <img src="${person.portrait}" alt="" />
            <span><small>${person.displayName ?? person.name}</small><p>${escapeHtml(message.text)}</p></span>
          </div>`;
        }).join("")}
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
    hydrateIcons(meetingSheet);
    requestAnimationFrame(() => {
      const thread = meetingSheet.querySelector("[data-meeting-thread]");
      if (thread) thread.scrollTop = thread.scrollHeight;
    });
  }

  function closeMeetingSheet() {
    meetingSheetOpen = false;
    meetingSheet.innerHTML = "";
    meetingSheet.setAttribute("aria-hidden", "true");
    shell.classList.remove("has-meeting-sheet");
  }

  function submitMeetingMessage(message) {
    const text = String(message).trim();
    if (!text || !meetingActive) return;
    meetingMessages.push({ personId: currentUser.id, text });
    renderMeetingActive();
    const participants = people.filter((person) => invitedIds.has(person.id));
    if (participants.length === 0) return;
    const responder = participants[meetingCursor % participants.length];
    const reply = responder.conversation.replies[meetingCursor % responder.conversation.replies.length];
    meetingCursor += 1;
    window.setTimeout(() => {
      if (!meetingActive) return;
      meetingMessages.push({ personId: responder.id, text: reply });
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
    if (target.dataset.action === "open-meeting") {
      meetingSheetOpen = true;
      invitedIds.clear();
      shell.classList.add("has-meeting-sheet");
      renderMeetingSetup();
      return;
    }
    if (target.dataset.action === "close-meeting") {
      closeMeetingSheet();
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
        const acceptedIds = await onMeetingStart([...invitedIds]);
        invitedIds.clear();
        acceptedIds.forEach((personId) => invitedIds.add(personId));
        meetingActive = true;
        meetingMessages.length = 0;
        meetingMessages.push({
          personId: [...invitedIds][0],
          text: "大家都到了。既然坐在同一张桌边，我们从最近发生的一件事开始吧。",
        });
        renderMeetingActive();
      } catch (error) {
        console.error(error);
        target.disabled = false;
        showToast("圆桌暂时没有准备好");
      }
      return;
    }
    if (target.dataset.action === "end-meeting") {
      await onMeetingEnd();
      meetingActive = false;
      invitedIds.clear();
      closeMeetingSheet();
      showToast("圆桌会议已结束");
      return;
    }
    if (target.dataset.meetingTopic) {
      submitMeetingMessage(target.dataset.meetingTopic);
    }
  });

  root.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-meeting-form]");
    if (!form) return;
    event.preventDefault();
    const input = form.elements.message;
    submitMeetingMessage(input.value);
    input.value = "";
  });

  refreshGraph();
  hydrateIcons(root);

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
      renderWorldInspector();
    },
    updateAgentState(state) {
      if (!state) return;
      agentStates.set(state.personId, state);
      if (selectedWorldPerson?.id === state.personId) renderWorldInspector();
      if (selectedMapPerson?.id === state.personId) renderMapInspector();
    },
    setRoundtableNearby(nearby) {
      roundtableNearby = Boolean(nearby);
      const visible = currentView === "cafe" && roundtableNearby && !meetingActive && !meetingSheetOpen;
      roundtablePrompt.setAttribute("aria-hidden", String(!visible));
    },
    showNpcConversation({ speakerId, text, duration = 4.5 }) {
      const person = people.find((candidate) => candidate.id === speakerId);
      if (!person) return;
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
    get speechPersonIds() {
      return [...activeSpeechIds];
    },
    get view() {
      return currentView;
    },
    get isMeetingActive() {
      return meetingActive;
    },
    get isWorldReady() {
      return worldReady;
    },
  };
}
