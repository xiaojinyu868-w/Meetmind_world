import {
  Copy,
  DoorOpen,
  Loader,
  LogIn,
  MonitorPlay,
  Play,
  Radio,
  Square,
  Users,
  X,
  createIcons,
} from "lucide";
import {
  ROOM_CLIENT_STATES,
  ROOM_STATE_LABELS,
  RoomClient,
} from "../../runtime/RoomClient.js";
import "./room.css";

const ROOM_ICONS = {
  Copy,
  DoorOpen,
  Loader,
  LogIn,
  MonitorPlay,
  Play,
  Radio,
  Square,
  Users,
  X,
};

const DEVICE_MEMBER_KEY = "echoworld.v1RoomMemberId";


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


/** 每台设备一个稳定的成员 id（同一浏览器多次进房沿用同一身份）。 */
function deviceMemberId() {
  try {
    const existing = window.localStorage.getItem(DEVICE_MEMBER_KEY);
    if (existing) return existing;
    const created = `member-${crypto.randomUUID().slice(0, 8)}`;
    window.localStorage.setItem(DEVICE_MEMBER_KEY, created);
    return created;
  } catch {
    return `member-${Math.random().toString(36).slice(2, 10)}`;
  }
}


function shortRoomCode(roomId) {
  return String(roomId ?? "").replace(/^room-/, "").slice(0, 8).toUpperCase();
}


function eventText(event, memberName) {
  const who = memberName(event.actor_id);
  switch (event.type) {
    case "room.created":
      return "房间已建立";
    case "member.joined":
      return `${memberName(event.payload?.member?.member_id)} 进入了现场`;
    case "member.moved":
      return null; // 高频位置事件不进事件条
    case "hotspot.interacted":
      return `${who} 触发了热点「${event.payload?.hotspot_id}」`;
    case "meeting.invited":
      return `${who} 发起了圆桌邀请`;
    case "meeting.invitation-responded":
      return `${memberName(event.payload?.member_id)} ${event.payload?.response === "accepted" ? "接受" : "谢绝"}了圆桌邀请`;
    case "meeting.started":
      return `圆桌会议开始：${event.payload?.topic ?? ""}`;
    case "meeting.ended":
      return "圆桌会议结束";
    case "bulletin.published":
      return `世界播报：${event.payload?.text ?? ""}`;
    case "icebreaker.requested":
      return `${who} 想玩一轮破冰`;
    case "icebreaker.started":
      return "破冰开始";
    case "icebreaker.finished":
      return "破冰完成，互动已回流";
    case "memory.updated":
      return "互动数据已回流到推断层";
    default:
      return event.type;
  }
}


/**
 * v1 现场房间面板（ROADMAP 2.H.3 升级 / docs/MVP2-BACKEND.md）。
 *
 * 与 v0 GroupPlay 并存：功能探测 GET {baseUrl}/scenes/modules 失败时整体隐藏，
 * v0 流程不受影响。"谁写的？" 游戏仍留在 v0，这里只承载
 * 房间创建/加入、名册与在线、member.move 位置同步、meeting.* 命令、有序事件条。
 *
 * 大屏只读（screenMode）：不挂载 FAB/面板，readOnly 直连 ?room= 指定的房间，
 * 只留一个状态角标。
 */
export function mountRoomPanel(root, {
  baseUrl = "/api/v1",
  currentUser = null,
  screenMode = false,
  screenRoomId = null,
  getLocalPresence = null,
  onRemotePresence = null,
  onToast = null,
} = {}) {
  const client = new RoomClient({
    baseUrl: `${baseUrl}/rooms`,
    onEvent: handleEvent,
    onStateChange: () => renderChrome(),
    onMembersChange: (participants) => {
      onRemotePresence?.(participants, client.memberId);
      renderChrome();
    },
    onError: (error) => notify(error.message),
  });
  const memberNames = new Map();
  const eventLog = [];
  let available = false;
  let joined = false;
  let busy = false;

  function notify(message) {
    if (message && typeof onToast === "function") onToast(message);
  }

  function memberName(memberId) {
    if (!memberId) return "系统";
    if (memberId === client.memberId) return "你";
    return memberNames.get(memberId) ?? memberId;
  }

  function handleEvent(event) {
    for (const member of client.members.values()) {
      memberNames.set(member.memberId, member.displayName);
    }
    const text = eventText(event, memberName);
    if (text) {
      eventLog.push({ sequence: event.sequence, text });
      if (eventLog.length > 30) eventLog.shift();
      renderChrome();
    }
  }

  // ---------- 大屏只读 ----------

  const screenChip = document.createElement("div");
  screenChip.className = "room-screen-chip";
  screenChip.hidden = true;
  root.append(screenChip);

  function renderScreenChip() {
    if (!screenMode) return;
    screenChip.hidden = false;
    const label = ROOM_STATE_LABELS[client.state] ?? client.state;
    screenChip.innerHTML = `
      <i data-lucide="monitor-play"></i>
      <span><strong>${escapeHtml(client.roomState.name || screenRoomId || "等待房间")}</strong>
      <small>${escapeHtml(label)} · ${client.members.size} 人在场 · seq ${client.cursor.current}</small></span>`;
    createIcons({ icons: ROOM_ICONS, root: screenChip, attrs: { "stroke-width": 1.8 } });
  }

  // ---------- 面板 ----------

  const fab = document.createElement("button");
  fab.className = "room-fab";
  fab.type = "button";
  fab.hidden = true;
  fab.setAttribute("aria-label", "进入 v1 联机房间");
  fab.title = "进入 v1 联机房间";
  fab.innerHTML = `<i data-lucide="radio"></i><span><small>跨设备实时</small><strong>联机房间</strong></span>`;
  root.append(fab);

  const overlay = document.createElement("section");
  overlay.className = "room-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <header class="room-header">
      <div class="room-brand"><i data-lucide="radio"></i><strong>联机房间</strong><span class="room-version">v1 · 有序事件流</span></div>
      <div class="room-meta" aria-live="polite"></div>
      <button class="room-icon-button room-close" type="button" aria-label="收起联机房间" title="收起联机房间">
        <i data-lucide="x"></i>
      </button>
    </header>
    <main class="room-main" aria-live="polite"></main>`;
  document.body.append(overlay);
  const main = overlay.querySelector(".room-main");
  const meta = overlay.querySelector(".room-meta");

  function open() {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    render();
  }

  function closeOverlay() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function stateBadge() {
    const label = ROOM_STATE_LABELS[client.state] ?? client.state;
    const live = client.state === ROOM_CLIENT_STATES.LIVE;
    return `<span class="room-state ${live ? "is-live" : ""}"><i></i>${escapeHtml(label)}</span>`;
  }

  function renderChrome() {
    renderScreenChip();
    if (!joined) return;
    meta.innerHTML = `
      ${stateBadge()}
      <span>${escapeHtml(client.roomState.name)} · ${client.members.size} 人</span>`;
    if (overlay.classList.contains("is-open")) render();
  }

  function renderLobby() {
    main.innerHTML = `
      <div class="room-lobby">
        <div class="room-kicker">LIVE ROOM · V1</div>
        <h1>同一个现场，同一个世界</h1>
        <p class="room-hint">v1 房间由后端确定性服务承载：WebSocket 有序事件流，断线自动按序号补拉；代理不支持 WebSocket 时自动降级轮询。</p>
        <form class="room-form" data-form="create">
          <label class="room-field"><span>房间名称</span>
            <input name="name" maxlength="60" value="今晚的回声现场" autocomplete="off" />
          </label>
          <label class="room-field"><span>房间码（可选，留空自动生成）</span>
            <input name="roomId" maxlength="40" autocomplete="off" placeholder="例如 demo-night" />
          </label>
          <label class="room-field"><span>你的名字</span>
            <input name="displayName" maxlength="40" value="${escapeHtml(currentUser?.name ?? "")}" autocomplete="off" />
          </label>
          <button class="room-primary" type="submit"><i data-lucide="door-open"></i><span>建立联机房间</span></button>
        </form>
        <div class="room-join-band">
          <form class="room-form" data-form="join">
            <label class="room-field"><span>加入已有房间</span>
              <input name="roomId" maxlength="40" autocomplete="off" placeholder="房间码 / 房间 ID" value="${escapeHtml(screenRoomId ?? "")}" />
            </label>
            <label class="room-field"><span>你的名字</span>
              <input name="displayName" maxlength="40" value="${escapeHtml(currentUser?.name ?? "")}" autocomplete="off" />
            </label>
            <button class="room-secondary" type="submit"><i data-lucide="log-in"></i><span>加入</span></button>
          </form>
        </div>
      </div>`;
  }

  function renderMeetingSection() {
    const meeting = client.roomState.meeting;
    const pending = client.roomState.invitations.filter(
      (item) => item.status === "invited" || item.status === "accepted",
    );
    if (meeting) {
      const mine = meeting.organizer_id === client.memberId;
      return `
        <section class="room-meeting">
          <div class="room-section-label">圆桌进行中</div>
          <p><strong>${escapeHtml(meeting.topic)}</strong> · ${meeting.participant_ids?.length ?? 0} 人</p>
          ${mine ? `<button class="room-secondary" type="button" data-action="end-meeting"><i data-lucide="square"></i><span>结束会议</span></button>` : ""}
        </section>`;
    }
    const rows = pending.map((invitation) => {
      const mine = invitation.organizer_id === client.memberId;
      const invited = invitation.participant_ids?.includes(client.memberId);
      const myResponse = invitation.responses?.[client.memberId];
      const canStart = mine && invitation.status === "accepted";
      return `
        <div class="room-invitation">
          <span><strong>${escapeHtml(memberName(invitation.organizer_id))}</strong> 邀请 ${invitation.participant_ids?.length ?? 0} 人圆桌「${escapeHtml(invitation.topic)}」<small>${escapeHtml(invitation.status)}</small></span>
          <span class="room-invitation-actions">
            ${invited && !myResponse ? `
              <button class="room-mini" type="button" data-action="accept" data-invitation-id="${escapeHtml(invitation.invitation_id)}">接受</button>
              <button class="room-mini is-quiet" type="button" data-action="decline" data-invitation-id="${escapeHtml(invitation.invitation_id)}">谢绝</button>` : ""}
            ${canStart ? `<button class="room-mini" type="button" data-action="start-meeting" data-invitation-id="${escapeHtml(invitation.invitation_id)}"><i data-lucide="play"></i>开始</button>` : ""}
          </span>
        </div>`;
    }).join("");
    return `
      <section class="room-meeting">
        <div class="room-section-label">圆桌会议</div>
        ${rows || `<p class="room-quiet">还没有会议邀请。</p>`}
        <button class="room-secondary" type="button" data-action="invite-all"><i data-lucide="users"></i><span>邀请在场所有人圆桌</span></button>
      </section>`;
  }

  function renderRoom() {
    const roster = [...client.members.values()];
    main.innerHTML = `
      <div class="room-roster-block">
        <div class="room-section-label">${roster.length} 人在场</div>
        <div class="room-roster">
          ${roster.map((member) => `
            <div class="room-person ${member.memberId === client.memberId ? "is-viewer" : ""}">
              <span class="room-avatar">${escapeHtml(initials(member.displayName))}</span>
              <span class="room-person-copy"><strong>${escapeHtml(member.displayName)}</strong>
              <small>(${member.x.toFixed(1)}, ${member.z.toFixed(1)})${member.memberId === client.memberId ? " · 本机" : ""}</small></span>
              <span class="room-online-dot"></span>
            </div>`).join("")}
        </div>
        <div class="room-code-row">
          <span><small>房间码</small><strong>${escapeHtml(client.roomId)}</strong></span>
          <button class="room-icon-button" type="button" data-action="copy" aria-label="复制房间链接" title="复制房间链接"><i data-lucide="copy"></i></button>
        </div>
      </div>
      ${renderMeetingSection()}
      <div class="room-events">
        <div class="room-section-label">有序事件</div>
        ${eventLog.length
          ? eventLog.slice(-6).reverse().map((item) => `
            <div class="room-event"><em>#${item.sequence}</em><span>${escapeHtml(item.text)}</span></div>`).join("")
          : `<p class="room-quiet">事件会按服务端顺序出现在这里。</p>`}
      </div>
      <button class="room-secondary room-leave" type="button" data-action="leave"><i data-lucide="x"></i><span>离开房间</span></button>`;
  }

  function bindActions() {
    overlay.querySelector('[data-form="create"]')?.addEventListener("submit", handleCreate);
    overlay.querySelector('[data-form="join"]')?.addEventListener("submit", handleJoin);
    overlay.querySelector('[data-action="copy"]')?.addEventListener("click", async () => {
      const url = new URL(window.location.href);
      url.searchParams.set("room", client.roomId);
      url.searchParams.delete("role");
      try {
        await navigator.clipboard.writeText(url.toString());
        notify("房间链接已复制");
      } catch {
        notify(`房间码：${client.roomId}`);
      }
    });
    overlay.querySelector('[data-action="leave"]')?.addEventListener("click", () => {
      client.close();
      joined = false;
      onRemotePresence?.([], null);
      render();
    });
    overlay.querySelector('[data-action="invite-all"]')?.addEventListener("click", () => runAction(async () => {
      const others = [...client.members.keys()].filter((id) => id !== client.memberId);
      if (others.length < 1) throw new Error("房间里还没有其他成员");
      await client.inviteMeeting({
        participantIds: others,
        topic: "现场圆桌",
      });
      notify("圆桌邀请已发出");
    }));
    for (const button of overlay.querySelectorAll('[data-action="accept"], [data-action="decline"]')) {
      button.addEventListener("click", () => runAction(() =>
        client.respondMeeting(
          button.dataset.invitationId,
          button.dataset.action === "accept" ? "accepted" : "declined",
        )));
    }
    overlay.querySelector('[data-action="start-meeting"]')?.addEventListener("click", (event) => runAction(() =>
      client.startMeeting(event.currentTarget.dataset.invitationId)));
    overlay.querySelector('[data-action="end-meeting"]')?.addEventListener("click", () => runAction(() =>
      client.endMeeting()));
  }

  function setBusy(next) {
    busy = next;
    overlay.classList.toggle("is-busy", next);
  }

  async function runAction(action) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function enterRoom(roomId, displayName, { create = false, name = "" } = {}) {
    if (busy) return;
    if (!roomId) {
      notify("请填写房间码");
      return;
    }
    setBusy(true);
    try {
      if (create) await client.createRoom({ roomId: roomId || null, name: name || roomId });
      await client.connect({
        roomId,
        memberId: deviceMemberId(),
        displayName: displayName || currentUser?.name || "现场伙伴",
        position: typeof getLocalPresence === "function" ? getLocalPresence() : null,
      });
      joined = true;
      client.startPresence(() => getLocalPresence?.());
      onRemotePresence?.(client.presenceParticipants(), client.memberId);
      notify(create ? `房间 ${client.roomId} 已建立` : `已加入房间 ${client.roomId}`);
      renderChrome();
      render();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  function handleCreate(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomId = String(form.get("roomId") ?? "").trim();
    void enterRoom(roomId || `room-${crypto.randomUUID().slice(0, 8)}`, String(form.get("displayName") ?? "").trim(), {
      create: true,
      name: String(form.get("name") ?? "").trim(),
    });
  }

  function handleJoin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void enterRoom(
      String(form.get("roomId") ?? "").trim(),
      String(form.get("displayName") ?? "").trim(),
    );
  }

  function render() {
    if (joined) renderRoom();
    else renderLobby();
    createIcons({ icons: ROOM_ICONS, root: overlay, attrs: { "stroke-width": 1.8 } });
    bindActions();
  }

  fab.addEventListener("click", open);
  overlay.querySelector(".room-close").addEventListener("click", closeOverlay);
  createIcons({ icons: ROOM_ICONS, root: fab, attrs: { "stroke-width": 1.8 } });
  createIcons({
    icons: ROOM_ICONS,
    root: overlay.querySelector(".room-header"),
    attrs: { "stroke-width": 1.8 },
  });

  // ---------- 功能探测 + 大屏自动连接 ----------

  async function probe() {
    try {
      const response = await fetch(`${baseUrl}/scenes/modules`);
      available = response.ok;
    } catch {
      available = false;
    }
    if (screenMode) {
      if (available && screenRoomId) {
        client.connect({ roomId: screenRoomId, readOnly: true })
          .then(() => onRemotePresence?.(client.presenceParticipants(), null))
          .catch((error) => notify(error.message));
      }
      renderScreenChip();
      return;
    }
    fab.hidden = !available;
    if (!available) {
      console.info("[RoomPanel] 后端未提供 v1 房间（/api/v1/scenes/modules 不可达），面板保持隐藏，v0 现场房间不受影响");
    }
  }

  void probe();

  return {
    open,
    close: closeOverlay,
    client,
    isAvailable: () => available,
    isJoined: () => joined,
  };
}
