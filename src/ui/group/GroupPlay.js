import {
  ArrowRight,
  Check,
  Clipboard,
  Copy,
  DoorOpen,
  LogIn,
  Play,
  Radio,
  RotateCcw,
  Users,
  X,
  createIcons,
} from "lucide";
import { GroupRoomClient } from "../../runtime/GroupRoomClient.js";
import "./group.css";

const GROUP_ICONS = {
  ArrowRight,
  Check,
  Clipboard,
  Copy,
  DoorOpen,
  LogIn,
  Play,
  Radio,
  RotateCcw,
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


function initials(name) {
  return [...String(name ?? "?")].slice(-2).join("").toUpperCase();
}


function roomRenderKey(room, viewerId) {
  const game = room?.game;
  const current = game?.current_round;
  return [
    room?.phase,
    viewerId,
    room?.participants?.length,
    room?.participants?.map((item) => Number(item.online)).join(""),
    room?.impression_progress?.submitted,
    game?.status,
    game?.round_index,
    current?.guess?.selected_id,
    room?.events?.length,
  ].join(":");
}


function participantDto(person) {
  return {
    person_id: person.id,
    display_name: person.displayName ?? person.name ?? person.id,
    avatar_ref: person.portrait ?? null,
  };
}


export function mountGroupPlay(root, {
  participants = [],
  getLocalPresence = null,
  onPresence = null,
  onToast = null,
} = {}) {
  const profiles = participants.filter((item) => item?.id);
  const profileById = new Map(profiles.map((item) => [item.id, item]));
  const client = new GroupRoomClient();
  const initialUrl = new URL(window.location.href);
  const sharedRoomCode = initialUrl.searchParams.get("groupCode") ?? "";
  let room = null;
  let viewerId = initialUrl.searchParams.get("groupPlayer") ?? profiles[0]?.id ?? null;
  let facilitatorMode = initialUrl.searchParams.get("groupFacilitator") === "1";
  let renderKey = "";
  let presenceTimer = null;
  let networkErrorShown = false;
  let busy = false;
  const impressionDrafts = new Map();

  const overlay = document.createElement("section");
  overlay.className = "gp-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <header class="gp-header">
      <div class="gp-brand"><span class="gp-brand-mark">EW</span><strong>现场房间</strong></div>
      <div class="gp-room-meta" aria-live="polite"></div>
      <button class="gp-icon-button gp-close" type="button" aria-label="收起现场房间" title="收起现场房间">
        <i data-lucide="x"></i>
      </button>
    </header>
    <div class="gp-layout">
      <aside class="gp-rail"></aside>
      <main class="gp-main" aria-live="polite"></main>
    </div>`;
  document.body.append(overlay);

  const hud = document.createElement("button");
  hud.className = "gp-room-hud";
  hud.type = "button";
  hud.hidden = true;
  hud.innerHTML = `<i data-lucide="radio"></i><span><small>现场房间</small><strong>--</strong></span>`;
  root.append(hud);

  const main = overlay.querySelector(".gp-main");
  const rail = overlay.querySelector(".gp-rail");
  const meta = overlay.querySelector(".gp-room-meta");

  function notify(message) {
    if (typeof onToast === "function") onToast(message);
  }

  function setBusy(next) {
    busy = next;
    overlay.classList.toggle("is-busy", next);
    for (const button of overlay.querySelectorAll("button")) button.disabled = next;
  }

  function open() {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("gp-open");
    render(true);
  }

  function close() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("gp-open");
  }

  function updateUrl() {
    const url = new URL(window.location.href);
    if (room) {
      url.searchParams.set("groupRoom", room.session_id);
      url.searchParams.set("groupPlayer", viewerId);
      if (facilitatorMode) url.searchParams.set("groupFacilitator", "1");
      else url.searchParams.delete("groupFacilitator");
    } else {
      url.searchParams.delete("groupRoom");
      url.searchParams.delete("groupPlayer");
      url.searchParams.delete("groupFacilitator");
    }
    url.searchParams.delete("groupCode");
    window.history.replaceState(window.history.state, "", url);
  }

  function setRoom(snapshot, forceRender = false) {
    room = snapshot;
    root.classList.add("has-group-room");
    networkErrorShown = false;
    hud.hidden = false;
    hud.querySelector("strong").textContent = `${room.code} · ${room.participants.length} 人`;
    onPresence?.(room.participants, viewerId);
    const nextKey = roomRenderKey(room, viewerId);
    if (forceRender || nextKey !== renderKey) {
      renderKey = nextKey;
      render(true);
    } else {
      renderHeader();
    }
  }

  function clearMissingRoom() {
    client.stopPolling();
    window.clearInterval(presenceTimer);
    presenceTimer = null;
    room = null;
    renderKey = "";
    root.classList.remove("has-group-room");
    hud.hidden = true;
    onPresence?.([], viewerId);
    updateUrl();
    render(true);
  }

  function startSync() {
    if (!room) return;
    client.startPolling(
      room.session_id,
      () => viewerId,
      (snapshot) => setRoom(snapshot),
      (error) => {
        if (error.status === 404) {
          clearMissingRoom();
          notify("现场房间已结束，已回到普通世界");
          return;
        }
        if (!networkErrorShown) notify(error.message);
        networkErrorShown = true;
      },
    );
    window.clearInterval(presenceTimer);
    presenceTimer = window.setInterval(() => {
      if (!room || !viewerId || typeof getLocalPresence !== "function") return;
      const position = getLocalPresence();
      if (!position) return;
      client.updatePresence(room.session_id, viewerId, position).catch((error) => {
        if (error.status === 404) {
          clearMissingRoom();
          return;
        }
        if (!networkErrorShown) notify(error.message);
        networkErrorShown = true;
      });
    }, 550);
  }

  function renderHeader() {
    if (!room) {
      meta.innerHTML = `<span class="gp-status"><i></i>等待创建</span>`;
      return;
    }
    const viewer = room.participants.find((item) => item.person_id === viewerId);
    meta.innerHTML = `
      <span class="gp-status is-live"><i></i>${escapeHtml(room.code)}</span>
      <span>${escapeHtml(viewer?.display_name ?? "未选择身份")}</span>`;
  }

  function renderRail() {
    if (!room) {
      rail.innerHTML = `
        <div class="gp-rail-title"><i data-lucide="users"></i><span>现场同行</span></div>
        <div class="gp-empty-roster">房间建立后，同伴会出现在这里。</div>`;
      return;
    }
    rail.innerHTML = `
      <div class="gp-rail-title"><i data-lucide="users"></i><span>${room.participants.length} 人在场</span></div>
      ${facilitatorMode ? `
        <label class="gp-device-select">
          <span>主持设备身份</span>
          <select data-action="viewer">
            ${room.participants.map((item) => `
              <option value="${escapeHtml(item.person_id)}" ${item.person_id === viewerId ? "selected" : ""}>
                ${escapeHtml(item.display_name)}
              </option>`).join("")}
          </select>
        </label>` : `
        <div class="gp-device-select gp-device-fixed">
          <span>本机身份</span>
          <strong>${escapeHtml(room.participants.find((item) => item.person_id === viewerId)?.display_name ?? viewerId)}</strong>
        </div>`}
      <div class="gp-roster">
        ${room.participants.map((item) => {
          const progress = room.impression_progress.by_author[item.person_id];
          const done = progress?.submitted === progress?.required;
          return `
            <div class="gp-person ${item.person_id === viewerId ? "is-viewer" : ""}">
              <span class="gp-avatar">${escapeHtml(initials(item.display_name))}</span>
              <span class="gp-person-copy"><strong>${escapeHtml(item.display_name)}</strong><small>${done ? "印象已写完" : `${progress?.submitted ?? 0}/${progress?.required ?? 0} 条${item.online ? "" : " · 未连接"}`}</small></span>
              ${done ? `<i class="gp-person-check" data-lucide="check"></i>` : `<span class="gp-online-dot ${item.online ? "" : "is-offline"}"></span>`}
            </div>`;
        }).join("")}
      </div>
      <div class="gp-room-code">
        <span><small>房间码</small><strong>${escapeHtml(room.code)}</strong></span>
        <button class="gp-icon-button" type="button" data-action="copy" aria-label="复制房间链接" title="复制房间链接"><i data-lucide="copy"></i></button>
      </div>`;
  }

  function renderLobby() {
    const host = profiles[0];
    const companions = profiles.slice(1, 6);
    main.innerHTML = `
      <div class="gp-lobby">
        <div class="gp-kicker">GROUP SESSION</div>
        <h1>今晚，和谁一起进入世界？</h1>
        <form class="gp-create-form" data-form="create">
          <label class="gp-field">
            <span>房间名称</span>
            <input name="title" maxlength="60" value="今晚的第一印象" autocomplete="off" />
          </label>
          <fieldset class="gp-companion-fieldset">
            <legend>现场同伴</legend>
            <div class="gp-companion-grid">
              ${companions.map((person, index) => `
                <label class="gp-companion">
                  <input type="checkbox" name="companion" value="${escapeHtml(person.id)}" ${index < 4 ? "checked" : ""} />
                  <span class="gp-avatar">${escapeHtml(initials(person.displayName ?? person.name))}</span>
                  <span><strong>${escapeHtml(person.displayName ?? person.name)}</strong><small>${escapeHtml(person.role ?? "现场同伴")}</small></span>
                  <i data-lucide="check"></i>
                </label>`).join("")}
            </div>
          </fieldset>
          <button class="gp-primary" type="submit"><i data-lucide="door-open"></i><span>建立现场房间</span></button>
        </form>
        <div class="gp-join-band">
          <form data-form="join">
            <label class="gp-field"><span>房间码</span><input name="code" maxlength="6" inputmode="text" autocomplete="off" placeholder="6 位房间码" value="${escapeHtml(sharedRoomCode.toUpperCase())}" /></label>
            <button class="gp-secondary" type="submit"><i data-lucide="log-in"></i><span>加入</span></button>
          </form>
          <span class="gp-identity-note">以 ${escapeHtml(host?.displayName ?? host?.name ?? "我")} 的身份</span>
        </div>
      </div>`;
  }

  function renderImpressions() {
    const viewer = room.participants.find((item) => item.person_id === viewerId);
    const ownProgress = room.impression_progress.by_author[viewerId];
    const allDone = room.impression_progress.complete;
    const viewerDone = ownProgress?.submitted === ownProgress?.required;
    main.innerHTML = `
      <div class="gp-stage-heading">
        <div><div class="gp-kicker">FIRST IMPRESSION</div><h1>${allDone ? "第一印象已收齐" : `轮到 ${escapeHtml(viewer?.display_name ?? "你")} 写了`}</h1></div>
        <div class="gp-progress"><strong>${room.impression_progress.submitted}</strong><span>/ ${room.impression_progress.required}</span></div>
      </div>
      <div class="gp-progress-track"><i style="width:${Math.round(room.impression_progress.submitted / room.impression_progress.required * 100)}%"></i></div>
      ${viewerDone ? `
        <div class="gp-waiting">
          <span class="gp-waiting-mark"><i data-lucide="check"></i></span>
          <h2>${allDone ? "大家都写完了" : "你的第一印象已提交"}</h2>
          <p>${allDone ? "“谁写的？”已经可以开场。" : "等待其他现场同伴写完。"}</p>
          ${viewerId === room.host_id && allDone ? `<button class="gp-primary" type="button" data-action="start-game"><i data-lucide="play"></i><span>开始“谁写的？”</span></button>` : ""}
        </div>` : `
        <form class="gp-impression-form" data-form="impressions">
          <div class="gp-impression-list">
            ${room.participants.map((subject) => {
              const self = subject.person_id === viewerId;
              return `
                <label class="gp-impression-row">
                  <span class="gp-avatar">${escapeHtml(initials(subject.display_name))}</span>
                  <span class="gp-impression-who"><strong>${self ? "我自己" : escapeHtml(subject.display_name)}</strong><small>${self ? "我的一个特征" : "我对 TA 的第一印象"}</small></span>
                  <input name="impression:${escapeHtml(subject.person_id)}" data-subject-id="${escapeHtml(subject.person_id)}" maxlength="80" required autocomplete="off" placeholder="写下一句话" value="${escapeHtml(impressionDrafts.get(`${viewerId}:${subject.person_id}`) ?? "")}" />
                </label>`;
            }).join("")}
          </div>
          <button class="gp-primary" type="submit"><i data-lucide="clipboard"></i><span>提交 ${room.participants.length} 条印象</span></button>
        </form>`}
      ${renderEventStrip()}`;
  }

  function renderGame() {
    const game = room.game;
    const current = game.current_round;
    const guesser = room.participants.find((item) => item.person_id === current.guesser_id);
    const guessed = Boolean(current.guess);
    const isTurn = current.guesser_id === viewerId;
    const isHost = room.host_id === viewerId;
    const author = room.participants.find((item) => item.person_id === current.author_id);
    main.innerHTML = `
      <div class="gp-game-topline">
        <span>谁写的？</span><strong>${game.round_index + 1} / ${game.round_count}</strong>
      </div>
      <div class="gp-game-stage">
        <div class="gp-turn-avatar">${escapeHtml(initials(guesser?.display_name))}</div>
        <div class="gp-turn-label">${escapeHtml(guesser?.display_name)} 的回合</div>
        <blockquote>“${escapeHtml(current.text)}”</blockquote>
        ${guessed ? `
          <div class="gp-reveal ${current.guess.correct ? "is-correct" : "is-wrong"}">
            <span>${current.guess.correct ? "猜对了" : "答案揭晓"}</span>
            <strong>${escapeHtml(author?.display_name)}</strong>
          </div>
          ${isHost ? `<button class="gp-primary" type="button" data-action="next-round"><i data-lucide="arrow-right"></i><span>${game.round_index + 1 === game.round_count ? "查看结果" : "下一轮"}</span></button>` : `<div class="gp-await">等待房主开启下一轮</div>`}` : `
          <div class="gp-options" role="group" aria-label="猜测作者">
            ${current.options.map((option) => `
              <button type="button" data-action="guess" data-author-id="${escapeHtml(option.person_id)}" ${isTurn ? "" : "disabled"}>
                <span class="gp-avatar">${escapeHtml(initials(option.display_name))}</span>
                <strong>${escapeHtml(option.display_name)}</strong>
              </button>`).join("")}
          </div>
          ${isTurn ? "" : `<div class="gp-await">等待 ${escapeHtml(guesser?.display_name)} 作答</div>`}`}
      </div>
      ${renderScoreboard(game.scores)}
      ${renderEventStrip()}`;
  }

  function renderResults() {
    main.innerHTML = `
      <div class="gp-results">
        <div class="gp-kicker">SESSION MEMORY</div>
        <h1>这一晚已经写进世界</h1>
        ${renderScoreboard(room.game.scores, true)}
        <div class="gp-result-event"><i data-lucide="radio"></i><span>第一印象与游戏结果已回到每个人的推断层</span></div>
        <button class="gp-primary" type="button" data-action="close"><i data-lucide="door-open"></i><span>回到共享空间</span></button>
      </div>
      ${renderEventStrip()}`;
  }

  function renderScoreboard(scores, expanded = false) {
    const ordered = room.participants
      .map((item) => ({ ...item, score: scores[item.person_id] ?? 0 }))
      .sort((a, b) => b.score - a.score || a.display_name.localeCompare(b.display_name));
    return `
      <section class="gp-scoreboard ${expanded ? "is-expanded" : ""}">
        <div class="gp-section-label">现场积分</div>
        ${ordered.map((item, index) => `
          <div class="gp-score-row">
            <span>${index + 1}</span><strong>${escapeHtml(item.display_name)}</strong><em>${item.score}</em>
          </div>`).join("")}
      </section>`;
  }

  function renderEventStrip() {
    const event = room.events.at(-1);
    if (!event) return "";
    return `<div class="gp-event-strip"><i data-lucide="radio"></i><span>${escapeHtml(event.text)}</span></div>`;
  }

  function bindActions() {
    overlay.querySelector('[data-action="close"]')?.addEventListener("click", close);
    overlay.querySelector('[data-action="viewer"]')?.addEventListener("change", (event) => {
      viewerId = event.target.value;
      updateUrl();
      renderKey = "";
      render(true);
      onPresence?.(room.participants, viewerId);
    });
    overlay.querySelector('[data-action="copy"]')?.addEventListener("click", async () => {
      const url = new URL(window.location.href);
      url.searchParams.set("groupCode", room.code);
      url.searchParams.delete("groupRoom");
      url.searchParams.delete("groupPlayer");
      url.searchParams.delete("groupFacilitator");
      try {
        await navigator.clipboard.writeText(url.toString());
        notify("房间链接已复制");
      } catch {
        notify(`房间码：${room.code}`);
      }
    });
    overlay.querySelector('[data-form="create"]')?.addEventListener("submit", handleCreate);
    overlay.querySelector('[data-form="join"]')?.addEventListener("submit", handleJoin);
    overlay.querySelector('[data-form="impressions"]')?.addEventListener("submit", handleImpressions);
    for (const input of overlay.querySelectorAll(".gp-impression-row input[data-subject-id]")) {
      input.addEventListener("input", () => {
        impressionDrafts.set(`${viewerId}:${input.dataset.subjectId}`, input.value);
      });
    }
    overlay.querySelector('[data-action="start-game"]')?.addEventListener("click", () => runAction(
      () => client.startGame(room.session_id, viewerId),
    ));
    for (const button of overlay.querySelectorAll('[data-action="guess"]')) {
      button.addEventListener("click", () => runAction(
        () => client.submitGuess(room.session_id, viewerId, button.dataset.authorId),
      ));
    }
    overlay.querySelector('[data-action="next-round"]')?.addEventListener("click", () => runAction(
      () => client.nextRound(room.session_id, viewerId),
    ));
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (busy || profiles.length < 2) return;
    const form = new FormData(event.currentTarget);
    const selected = form.getAll("companion").map((id) => profileById.get(id)).filter(Boolean);
    if (selected.length < 1) {
      notify("至少选择一位现场同伴");
      return;
    }
    setBusy(true);
    try {
      const snapshot = await client.createSession({
        title: form.get("title"),
        host: participantDto(profiles[0]),
        participants: selected.map(participantDto),
      });
      viewerId = profiles[0].id;
      facilitatorMode = true;
      setRoom(snapshot, true);
      updateUrl();
      startSync();
      notify(`房间 ${snapshot.code} 已建立`);
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();
    if (busy || !profiles[0]) return;
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    if (code.length !== 6) {
      notify("请输入 6 位房间码");
      return;
    }
    setBusy(true);
    try {
      const snapshot = await client.joinSession(code, participantDto(profiles[0]));
      viewerId = profiles[0].id;
      facilitatorMode = false;
      setRoom(snapshot, true);
      updateUrl();
      startSync();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleImpressions(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const entries = room.participants.map((subject) => ({
      subjectId: subject.person_id,
      value: String(form.get(`impression:${subject.person_id}`) ?? "").trim(),
    }));
    if (entries.some((item) => !item.value)) {
      notify("请写完这一组第一印象");
      return;
    }
    setBusy(true);
    try {
      const snapshot = await client.writeImpressions(
        room.session_id,
        viewerId,
        entries.map((item) => ({ subject_id: item.subjectId, value: item.value })),
      );
      for (const item of entries) impressionDrafts.delete(`${viewerId}:${item.subjectId}`);
      setRoom(snapshot, true);
      notify("这一组第一印象已收下");
    } catch (error) {
      notify(error.message);
      const snapshot = await client.getSession(room.session_id, viewerId).catch(() => null);
      if (snapshot) setRoom(snapshot, true);
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action) {
    if (busy) return;
    setBusy(true);
    try {
      setRoom(await action(), true);
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  function render(force = false) {
    if (!force && !overlay.classList.contains("is-open")) return;
    renderHeader();
    renderRail();
    if (!room) renderLobby();
    else if (room.phase === "impressions") renderImpressions();
    else if (room.phase === "game") renderGame();
    else renderResults();
    createIcons({ icons: GROUP_ICONS, root: rail, attrs: { "stroke-width": 1.8 } });
    createIcons({ icons: GROUP_ICONS, root: main, attrs: { "stroke-width": 1.8 } });
    bindActions();
  }

  overlay.querySelector(".gp-close").addEventListener("click", close);
  hud.addEventListener("click", open);
  createIcons({
    icons: GROUP_ICONS,
    root: overlay.querySelector(".gp-header"),
    attrs: { "stroke-width": 1.8 },
  });
  createIcons({ icons: GROUP_ICONS, root: hud, attrs: { "stroke-width": 1.8 } });
  render(true);

  const initialRoomId = initialUrl.searchParams.get("groupRoom");
  const initialPlayerId = initialUrl.searchParams.get("groupPlayer");
  if (initialRoomId && initialPlayerId) {
    client.getSession(initialRoomId, viewerId).then((snapshot) => {
      if (!snapshot.participants.some((item) => item.person_id === viewerId)) {
        throw new Error("这个恢复链接不属于当前设备身份");
      }
      setRoom(snapshot, true);
      updateUrl();
      startSync();
      open();
    }).catch((error) => {
      if (error.status === 404) {
        clearMissingRoom();
        notify("现场房间已结束，已回到普通世界");
      } else {
        notify(error.message);
      }
    });
  } else if (sharedRoomCode) {
    open();
  }

  return { open, close, getRoom: () => room, getViewerId: () => viewerId };
}
