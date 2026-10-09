import { PERSONAS, personaById, serialLabel } from "../shared/personas.mjs";
import { TOPIC_NAMES, splitChips, topicsIn } from "../shared/topics.mjs";

export const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ICONS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  spark: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  link: '<path d="M10 13a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-5.5-5.8L11 7M14 11a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 5.5 5.8L13 17"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  wave: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4m0-1V4.5a1.5 1.5 0 0 1 3 0V10m0-3.5a1.5 1.5 0 0 1 3 0V12m0-3a1.5 1.5 0 0 1 3 0v4a8 8 0 0 1-8 8h-1a7 7 0 0 1-6-3.5L3 13a1.6 1.6 0 0 1 2.6-1.9L7 13"/>',
  stamp: '<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.4 2.4 4.6-4.8"/>',
  nfc: '<path d="M4 8a12 12 0 0 1 16 0M7 11a8 8 0 0 1 10 0m-7 3a4 4 0 0 1 4 0"/><circle cx="12" cy="18" r="1"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};
export const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.spark) + "</svg>";

const PORTRAIT_VERSION = "20261002";
export function portraitUrl(personaId, kind = "bust") {
  return new URL(`assets/personas/portraits/${encodeURIComponent(personaId)}-${kind}.webp?v=${PORTRAIT_VERSION}`, globalThis.document?.baseURI || "http://localhost/").href;
}
export function personaFor(person) { return personaById(person?.persona) || PERSONAS[0]; }
const color = value => /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#7f9a7b";

/** Circular bust portrait; a tinted monogram shows until (or instead of) the image. */
export function avatar(person, { size = 44, ring = null, label = "" } = {}) {
  const persona = personaFor(person);
  const initial = esc((person?.name || persona.codename).slice(0, 1));
  return `<span class="court-avatar" style="--size:${size}px;--persona:${persona.color}${ring ? `;--ring:${color(ring)}` : ""}" ${label ? `aria-label="${esc(label)}"` : 'aria-hidden="true"'}><b>${initial}</b><img data-portrait src="${esc(portraitUrl(persona.id, "bust"))}" alt="" loading="lazy" decoding="async"></span>`;
}

/** Collectible persona card used for arrival, the persona picker and "my card". */
export function personaCard(persona, { serial = null, name = "", size = "full", eyebrow = "", flip = false } = {}) {
  return `<article class="court-persona-card court-persona-${size}${flip ? " is-flipping" : ""}" style="--persona:${persona.color}" data-persona-card="${esc(persona.id)}">
    <div class="court-persona-glow"></div>
    <img class="court-persona-figure" data-portrait src="${esc(portraitUrl(persona.id, size === "full" ? "full" : "bust"))}" alt="${esc(persona.codename)}分身形象" decoding="async">
    <span class="court-persona-fallback" aria-hidden="true">${esc(persona.codename.slice(0, 1))}</span>
    <header><span class="court-persona-no">NO.<b data-serial>${serialLabel(serial)}</b></span><span class="court-persona-trait">${esc(persona.trait)}</span></header>
    <footer>
      ${eyebrow ? `<small class="court-persona-eyebrow">${esc(eyebrow)}</small>` : ""}
      <h3>${esc(name || persona.codename)}</h3>
      <p class="court-persona-latin">${esc(persona.latin)}</p>
      <p class="court-persona-signature">${esc(persona.signature)}</p>
    </footer>
    <i class="court-persona-sheen" aria-hidden="true"></i>
  </article>`;
}

export function arrivalView({ event, persona, nextSerial, entry, tapInfo, busy = false, error = "" }) {
  const name = esc(event?.name || "相遇之庭");
  const label = tapInfo?.kind === "wristband" ? `已识别${esc(tapInfo.categoryLabel || "手环")}手环` : esc(entry?.label || "已感应到你的到来");
  return `<div class="court-arrival-inner">
    <header class="court-arrival-top"><span>${esc(event?.brand || "ECHO CAMPUS")}</span><i></i><span>${esc(event?.location || "")}</span></header>
    <section class="court-tap" aria-hidden="true"><i></i><i></i><i></i><span>${icon("nfc")}</span></section>
    <p class="court-arrival-kicker">${label}</p>
    <h1 class="court-arrival-title">${name}</h1>
    <p class="court-arrival-sub">${esc(event?.subtitle || "碰一下，就在这里相遇")}</p>
    <div class="court-arrival-stage">
      <p class="court-arrival-intro">今天，你是</p>
      ${personaCard(persona, { serial: null, flip: true, eyebrow: `即将成为第 ${serialLabel(nextSerial)} 位来客` })}
    </div>
    <div class="court-arrival-actions">
      <button type="button" class="court-btn court-btn-primary court-btn-block" data-action="arrive" ${busy ? "disabled" : ""}><span>${busy ? "正在进入庭院…" : `以「${esc(persona.codename)}」进入`}</span>${icon("arrow")}</button>
      <button type="button" class="court-btn court-btn-ghost" data-action="arrival-shuffle" ${busy ? "disabled" : ""}>${icon("shuffle")}<span>换一个形象</span></button>
    </div>
    <div class="court-form-error" role="alert" ${error ? "" : "hidden"}>${esc(error)}</div>
    <p class="court-fineprint">进入即表示同意以这个分身出现在本活动的公共世界。不采集照片、手机号或定位；名片和微信都由你决定是否填写，可随时隐身或删除。</p>
  </div>`;
}

export function chips(text, { tone = "", limit = 6 } = {}) {
  const list = splitChips(text, limit);
  return list.length ? `<ul class="court-chips ${tone}">${list.map(item => `<li>${esc(item)}</li>`).join("")}</ul>` : "";
}

export function overlapLines(me, person) {
  if (!me || !person || me.id === person.id) return [];
  const theyHelp = [...topicsIn(me.need)].filter(topic => topicsIn(person.offer).has(topic));
  const youHelp = [...topicsIn(me.offer)].filter(topic => topicsIn(person.need).has(topic));
  return [
    ...(theyHelp.length ? [`TA 能提供你在找的「${theyHelp.join("、")}」`] : []),
    ...(youHelp.length ? [`你能提供 TA 在找的「${youHelp.join("、")}」`] : []),
  ];
}

const NOTE_PRESETS = ["你好，想认识你", "想交换个微信", "聊聊合作机会", "对你的方向很感兴趣"];

export function personView({ person, me, encounter, categoryLabel, own, curated, eventName = "相遇之庭" }) {
  const persona = personaFor(person);
  const lines = overlapLines(me, person);
  const showCodename = person.name && !person.name.startsWith(persona.codename);
  let action;
  if (own) {
    action = `<div class="court-actions-row"><button type="button" class="court-btn court-btn-primary" data-action="edit-profile">${icon("edit")}<span>编辑我的名片</span></button><button type="button" class="court-btn court-btn-soft" data-action="matches">${icon("spark")}<span>认识新朋友</span></button></div>`;
  } else if (person.remote) {
    // A partner community's member on the map: not here in person, so no invitation from this card.
    action = `<p class="court-muted-line">TA 是${esc(person.partner || "合作社群")}的成员，这次在线上和大家一起出现在地图里，不在现场。</p>`;
  } else if (encounter?.status === "confirmed") {
    const contact = encounter.peerContact
      ? `<div class="court-contact"><span>${icon("link")}微信 / 联系方式</span><strong>${esc(encounter.peerContact)}</strong><button type="button" class="court-btn court-btn-small" data-action="copy-contact" data-value="${esc(encounter.peerContact)}">${icon("copy")}复制</button></div>`
      : `<p class="court-muted-line">${person.sharesContact ? "TA 的联系方式稍后可见" : "TA 暂未留下联系方式，可以在现场继续聊。"}</p>`;
    action = `<div class="ec-confirmed court-met">${icon("check")}<span>你们已在${esc(eventName)}相遇 · 已确认</span></div>${contact}`;
  } else if (encounter?.canConfirm) {
    action = `${encounter.note ? `<blockquote class="court-note">“${esc(encounter.note)}”</blockquote>` : ""}<div class="court-actions-row"><button type="button" class="court-btn court-btn-accent" data-action="confirm" data-id="${esc(encounter.id)}">${icon("heart")}<span>接受，交换名片</span></button><button type="button" class="court-btn court-btn-soft" data-action="decline" data-id="${esc(encounter.id)}">先不了</button></div>`;
  } else if (encounter) {
    action = `<div class="ec-pending court-pending">${icon("wave")}<span>已打招呼，等待对方确认</span></div>${encounter.note ? `<p class="court-muted-line">你说：“${esc(encounter.note)}”</p>` : ""}`;
  } else {
    action = `<button type="button" class="court-btn court-btn-accent court-btn-block" data-action="compose">${icon("wave")}<span>想认识 TA</span>${icon("arrow")}</button>
      <form class="court-compose" data-form="compose" hidden>
        <p>打个招呼（可选）</p>
        <div class="court-chip-picks">${NOTE_PRESETS.map(text => `<button type="button" data-action="note-preset" data-value="${esc(text)}">${esc(text)}</button>`).join("")}</div>
        <input name="note" maxlength="60" autocomplete="off" placeholder="写一句话，TA 确认前只有你们看得到">
        <div class="court-actions-row"><button type="button" class="court-btn court-btn-accent" data-action="encounter" data-id="${esc(person.id)}">${icon("heart")}<span>发送招呼</span></button><button type="button" class="court-btn court-btn-soft" data-action="compose-cancel">取消</button></div>
      </form>`;
  }
  return `<div class="court-person" style="--persona:${persona.color}">
    <div class="court-person-band"><span class="court-person-no">${person.remote ? esc(person.partner || "线上成员") : `NO.${serialLabel(person.serial)}`}</span><span class="court-person-trait">${esc(persona.trait)} · ${esc(persona.signature)}</span></div>
    <div class="ec-person-header court-person-header">${avatar(person, { size: 84, ring: person.wristbandColor })}<div><h2>${esc(person.name)}</h2><p>${esc(person.role || "来宾")}${showCodename ? ` <span class="court-codename">· ${esc(persona.codename)}</span>` : ""}</p><span class="court-category" style="--band:${color(person.wristbandColor)}"><i></i>${esc(categoryLabel)}${curated ? " · 演示人物" : ""}</span></div></div>
    ${person.bio ? `<p class="court-bio">${esc(person.bio)}</p>` : ""}
    ${person.organization ? `<p class="court-org">${esc(person.organization)}</p>` : ""}
    <div class="court-fields">
      <section><h4>TA 能提供</h4>${chips(person.offer) || '<p class="court-empty-line">还没写</p>'}</section>
      <section><h4>TA 想认识</h4>${chips(person.need, { tone: "is-need" }) || '<p class="court-empty-line">还没写</p>'}</section>
    </div>
    ${lines.length ? `<div class="court-overlap">${icon("spark")}<div>${lines.map(line => `<p>${esc(line)}</p>`).join("")}</div></div>` : ""}
    <div class="court-person-actions">${action}</div>
    <div class="court-person-foot">
      ${own ? "" : `<button type="button" class="court-text-btn" data-action="locate">${icon("pin")}在庭院中找到 TA</button>`}
      ${curated && !own ? '<p class="court-muted-line">演示人物不会真实回应。可以用第二部手机领取分身，体验双方确认。</p>' : (own ? '<p class="court-muted-line">只有双方都确认后，相遇才会在世界里点亮；微信只对相遇的人可见。</p>' : "")}
    </div>
  </div>`;
}

function topicPicker(name, selectedText) {
  const selected = new Set(splitChips(selectedText, 12));
  const extra = [...selected].filter(item => !TOPIC_NAMES.includes(item));
  return `<div class="court-topic-picker" data-topic-picker="${name}">${TOPIC_NAMES.map(topic => `<label><input type="checkbox" value="${esc(topic)}" ${selected.has(topic) ? "checked" : ""}><span>${esc(topic)}</span></label>`).join("")}</div>
    <input class="court-topic-extra" data-topic-extra="${name}" maxlength="80" placeholder="其他（用顿号分隔）" value="${esc(extra.join("、"))}">
    <input type="hidden" name="${name}" value="${esc(selectedText || "")}">`;
}

export function profileFormView({ values, profile, persona, categories, isUpdate, badgeId = "", code = "", tapCategory = "" }) {
  // With nothing saved yet there is nothing to hide: offer the recommended
  // "after a mutual encounter" scope for the first contact a guest types.
  const visibility = profile?.contact ? (profile.contactVisibility || "connections") : (values.publicContact ? "public" : "connections");
  return `<form class="ec-form court-form" data-form="join" novalidate>
    <div class="court-form-hero" style="--persona:${persona.color}">
      ${personaCard(persona, { serial: values.serial, size: "mini" })}
      <div><p class="court-form-kicker">你的分身</p><h3>${esc(persona.codename)} <small>${esc(persona.trait)}</small></h3><p>${esc(persona.signature)}</p><button type="button" class="court-btn court-btn-small" data-action="pick-persona">${icon("shuffle")}换个形象</button></div>
    </div>
    <input type="hidden" name="persona" value="${esc(persona.id)}">
    <input type="hidden" name="avatarColor" value="${esc(persona.color)}">
    <fieldset class="court-fieldset"><legend>名片 <small>全部选填</small></legend>
      <label>昵称<input name="name" maxlength="24" autocomplete="nickname" value="${esc(profile?.customName === false ? "" : values.name)}" placeholder="留空就叫「${esc(persona.codename)}·${serialLabel(values.serial)}」"></label>
      <label>一句话介绍<input name="bio" maxlength="160" value="${esc(values.bio || "")}" placeholder="例如：在做 AI 硬件，喜欢爬山"></label>
      <div class="court-two"><label>我的身份<input name="role" maxlength="60" value="${esc(values.role === "来宾" ? "" : values.role)}" placeholder="例如：创始人"></label><label>机构 / 单位<input name="organization" maxlength="80" value="${esc(values.organization || "")}" placeholder="可不填写"></label></div>
      <div class="court-field-label">活动身份${tapCategory ? ' <small class="court-from-tap">来自手环</small>' : ""}</div>
      <div class="court-category-picks" role="radiogroup">${categories.map(item => `<label style="--band:${color(item.wristbandColor)}"><input type="radio" name="category" value="${esc(item.id)}" ${values.category === item.id ? "checked" : ""}><span><i></i>${esc(item.label)}</span></label>`).join("")}</div>
    </fieldset>
    <fieldset class="court-fieldset"><legend>我能提供 <small>选几个，推荐更准</small></legend>${topicPicker("offer", values.offer)}</fieldset>
    <fieldset class="court-fieldset"><legend>我想认识 <small>你在找的人或资源</small></legend>${topicPicker("need", values.need)}</fieldset>
    <fieldset class="court-fieldset"><legend>微信 / 联系方式 <small>可选</small></legend>
      <label class="court-sr" for="court-contact">联系方式</label><input id="court-contact" name="contact" maxlength="120" autocomplete="off" value="${esc(profile?.contact ?? values.contact ?? "")}" placeholder="微信号、手机号以外的任意联系方式">
      <div class="court-segment" role="radiogroup" aria-label="联系方式可见范围">
        <label><input type="radio" name="contactVisibility" value="connections" ${visibility === "connections" ? "checked" : ""}><span>相遇后可见<small>推荐</small></span></label>
        <label><input type="radio" name="contactVisibility" value="public" ${visibility === "public" ? "checked" : ""}><span>所有人可见</span></label>
        <label><input type="radio" name="contactVisibility" value="hidden" ${visibility === "hidden" ? "checked" : ""}><span>不展示</span></label>
      </div>
      <p class="court-hint-line">「相遇后可见」：只有你们双方都确认相遇后，对方才能看到。</p>
    </fieldset>
    <label class="court-switch"><input type="checkbox" name="listed" ${profile?.listed === false ? "" : "checked"}><span><strong>在庭院中显示我</strong><small>关闭后进入隐身，别人看不到你的分身和名片</small></span></label>
    <input type="hidden" name="badgeId" value="${esc(badgeId)}"><input type="hidden" name="activationCode" value="${esc(code)}">
    <label class="ec-consent court-consent"><input type="checkbox" name="consent" required><span>我同意在本活动中公开展示以上名片资料，用于分身名片、同路人推荐和相遇连接。</span></label>
    <div class="ec-form-error court-form-error" role="alert" hidden></div>
    <button type="submit" class="court-btn court-btn-primary court-btn-block">${isUpdate ? "保存我的名片" : "进入相遇之庭"}${icon("arrow")}</button>
    ${isUpdate ? `<button type="button" class="court-text-btn court-danger" data-action="leave">${icon("trash")}删除我在本活动的全部资料</button>` : ""}
  </form>`;
}

export function personaPickerView({ current, active = PERSONAS.map(p => p.id) }) {
  return `<div class="court-persona-grid">${PERSONAS.filter(p => active.includes(p.id)).map(persona => `<button type="button" class="court-persona-pick ${persona.id === current ? "is-selected" : ""}" data-action="choose-persona" data-id="${esc(persona.id)}" style="--persona:${persona.color}" aria-pressed="${persona.id === current}">
      <span class="court-pick-art"><img data-portrait src="${esc(portraitUrl(persona.id, "bust"))}" alt="" loading="lazy"><b>${esc(persona.codename.slice(0, 1))}</b></span>
      <strong>${esc(persona.codename)}</strong><small>${esc(persona.trait)} · ${esc(persona.signature.split(" · ")[0])}</small></button>`).join("")}</div>`;
}

function encounterRow(item, kind, people) {
  const peer = item.peer || people.get(item.fromId === item.selfId ? item.toId : item.fromId) || {};
  const peerId = peer.id || (item.direction === "outgoing" ? item.toId : item.fromId);
  let side;
  if (kind === "incoming") side = `<div class="court-row-actions"><button type="button" class="ec-small-primary court-btn court-btn-small court-btn-accent" data-action="confirm" data-id="${esc(item.id)}">接受${icon("check")}</button><button type="button" class="court-btn court-btn-small court-btn-soft" data-action="decline" data-id="${esc(item.id)}">先不了</button></div>`;
  else if (kind === "confirmed") side = item.peerContact ? `<button type="button" class="court-contact-pill" data-action="copy-contact" data-value="${esc(item.peerContact)}">${icon("copy")}<span>${esc(item.peerContact)}</span></button>` : `<span class="ec-encounter-state is-confirmed">${icon("check")}已确认</span>`;
  else side = `<span class="ec-encounter-state">等待确认</span>`;
  return `<article class="ec-inbox-card court-row"><button type="button" class="ec-inbox-person" data-action="select-person" data-id="${esc(peerId)}">${avatar(peer, { size: 44 })}<span><strong>${esc(peer.name || "一位来宾")}</strong><small>${item.note ? "“" + esc(item.note) + "”" : esc(peer.role || "来宾")}</small></span></button>${side}</article>`;
}

export function inboxView({ me, people }) {
  const encounters = (me?.encounters || []).map(item => ({ ...item, selfId: me.attendee.id }));
  const incoming = encounters.filter(c => c.canConfirm), confirmed = encounters.filter(c => c.status === "confirmed"), outgoing = encounters.filter(c => c.status === "pending" && !c.canConfirm);
  const group = (title, list, kind) => list.length ? `<section><h2>${title}<span>${list.length}</span></h2>${list.map(item => encounterRow(item, kind, people)).join("")}</section>` : "";
  return `<div class="ec-inbox-groups court-groups">${group("TA 们想认识你", incoming, "incoming")}${group("已相遇 · 已确认", confirmed, "confirmed")}${group("等待回应", outgoing, "outgoing")}${!encounters.length ? `<div class="ec-empty-state court-empty">${icon("heart")}<p>第一场相遇，正在等你开启。</p><span>点一点庭院里的人，或者看看为你推荐的同路人。</span></div>` : ""}</div>
    <button type="button" class="court-btn court-btn-primary court-btn-block" data-action="matches">${icon("spark")}<span>认识新朋友</span>${icon("arrow")}</button>
    <p class="court-muted-line">待确认的招呼只有你们两人看得到。双方确认后，相遇会在公共世界里点亮。</p>`;
}

export function matchesView({ result, people, me, quickTopics = false }) {
  const list = result?.matches || [];
  const cards = list.map((m, i) => `<article class="ec-match-card court-match"><div class="ec-match-top"><span class="ec-match-index">0${i + 1}</span><button type="button" data-action="select-person" data-id="${esc(m.attendee.id)}">${avatar(m.attendee, { size: 46 })}<span><strong>${esc(m.attendee.name)}</strong><small>${esc(m.attendee.role)}</small></span>${icon("arrow")}</button></div>
    <div class="ec-match-reasons">${m.reasons.map(r => `<p>${icon("spark")}${esc(r)}</p>`).join("")}</div>
    <details class="ec-match-evidence"><summary>为什么推荐</summary>${m.evidence.map(e => `<p><b>${esc(e.topic)}</b><span>你的${e.yourField === "need" ? "需求" : "供给"}：${esc(e.yourText)}</span><span>TA 的${e.peerField === "offer" ? "供给" : "需求"}：${esc(e.peerText)}</span></p>`).join("")}</details></article>`).join("");
  const others = [...people.values()].filter(p => p.id !== me?.attendee?.id).sort((a, b) => (a.source === "curated-demo") - (b.source === "curated-demo") || (b.serial || 0) - (a.serial || 0)).slice(0, 18);
  const prompt = quickTopics ? `<form class="court-quick-topics" data-form="quick-topics"><p><strong>选几个你想认识的方向</strong>我们会按大家主动公开的供需，帮你找到同路人。</p>${topicPicker("need", me?.attendee?.need || "")}<label class="court-inline-consent"><input type="checkbox" name="consent" required><span>把所选方向公开在我的名片上</span></label><button type="submit" class="court-btn court-btn-primary court-btn-block">${icon("spark")}公开并推荐</button></form>` : "";
  return `${prompt}<div class="ec-match-list court-matches">${cards || '<div class="ec-empty-state court-empty">暂时没有明确重合的供需。<br>补充名片后，新的同路人会出现在这里。</div>'}</div>
    <section class="court-people"><h2>庭院里的人<span>${people.size}</span></h2><div class="court-people-grid">${others.map(p => `<button type="button" data-action="select-person" data-id="${esc(p.id)}">${avatar(p, { size: 52, ring: p.wristbandColor })}<strong>${esc(p.name)}</strong><small>${esc(p.role || "来宾")}</small></button>`).join("")}</div></section>
    <div class="ec-notice ec-notice-soft court-notice">${icon("spark")}<span>推荐来自双方公开的供需标签，用固定词表匹配，没有使用大模型；理由可以逐条核对。</span></div>`;
}

/** `demo`: any stamp can be pressed; at a real event only a checkpoint marked manual has a button, the rest are stamped by touching their stand. */
export function passportView({ checkpoints, done, points, signedIn, demo = true }) {
  const stamp = (item, ok) => {
    if (!signedIn) return "";
    if (ok || demo || item.manual) return `<button type="button" class="${ok ? "ec-checkpoint-done" : "ec-small-primary"} court-btn court-btn-small ${ok ? "court-btn-soft" : "court-btn-primary"}" data-action="checkin" data-id="${esc(item.id)}" ${ok ? "disabled" : ""}>${ok ? "已盖章" : demo ? "演示盖章" : "盖章"}</button>`;
    return `<span class="court-stamp-hint">${icon("nfc")}碰一下现场立牌</span>`;
  };
  const total = checkpoints.reduce((sum, item) => sum + item.points, 0);
  const progress = total ? Math.round(points / total * 100) : 0;
  return `<div class="court-passport-head"><div class="court-ring" style="--p:${progress}"><strong>${points}</strong><small>/ ${total} 分</small></div><div><p>已盖章 <b>${done.size}</b> / ${checkpoints.length}</p><span>在现场用手机碰一下点位立牌即可盖章，每个点位只计一次。</span></div></div>
    <div class="court-stamps">${checkpoints.map((item, index) => { const ok = done.has(item.id); return `<article class="ec-checkpoint-card court-stamp ${ok ? "is-done" : ""}" data-checkpoint-id="${esc(item.id)}"><span class="court-stamp-seal">${ok ? icon("check") : String(index + 1).padStart(2, "0")}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.partner)} · ${item.points} 分</small><p>${esc(item.description)}</p></div>${stamp(item, ok)}</article>`; }).join("") || '<div class="ec-empty-state court-empty">活动点位将在这里出现。</div>'}</div>
    ${signedIn ? "" : `<button type="button" class="court-btn court-btn-primary court-btn-block" data-action="join">先领取分身，再开始盖章${icon("arrow")}</button>`}`;
}

export function stageView({ event, attendees, connections, arrivals, meets, qrReady }) {
  const people = new Map(attendees.map(p => [p.id, p]));
  return `<div class="court-stage-title"><span>${esc(event?.brand || "ECHO CAMPUS")}</span><h1>${esc(event?.name || "相遇之庭")}</h1><p>${esc(event?.subtitle || "")}</p></div>
    <div class="court-stage-stats"><div><strong data-stage-count="people">${attendees.length}</strong><span>位来客在场</span></div><div><strong data-stage-count="links">${connections.length}</strong><span>次相遇已点亮</span></div></div>
    <aside class="court-stage-feed">
      <section><h2>刚刚抵达</h2>${arrivals.slice(0, 5).map(p => `<div class="court-feed-row">${avatar(p, { size: 40 })}<span><strong>${esc(p.name)}</strong><small>${esc(personaFor(p).codename)} · ${esc(personaFor(p).trait)}</small></span></div>`).join("") || '<p class="court-muted-line">等待第一位来客</p>'}</section>
      <section><h2>刚刚相遇</h2>${meets.slice(0, 4).map(c => { const a = people.get(c.fromId), b = people.get(c.toId); return a && b ? `<div class="court-feed-pair">${avatar(a, { size: 36 })}<i>${icon("heart")}</i>${avatar(b, { size: 36 })}<span>${esc(a.name)} × ${esc(b.name)}</span></div>` : ""; }).join("") || '<p class="court-muted-line">第一场相遇即将发生</p>'}</section>
    </aside>
    <div class="court-stage-join"><canvas data-stage-qr></canvas><div><strong>${esc(event?.entry?.label || "碰一下手环或立牌")}</strong><span>${esc(event?.entry?.hint || "也可以扫码进入")}</span>${qrReady ? "" : ""}</div></div>`;
}
