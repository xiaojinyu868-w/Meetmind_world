// Preset avatar roster shared by the event service (assignment, default names)
// and the browser (models, portraits, card styling). A persona is a *look*, not
// a role: attendees keep their own optional role and category.
export const PERSONAS = Object.freeze([
  { id: "qingliu", codename: "青柳", latin: "WILLOW", trait: "清新", signature: "栗色短发 · 鼠尾草外套", line: "带着一点清晨的风，来认识新的人。", color: "#7f9a7b", sex: "f", height: 1.68 },
  { id: "shazhou", codename: "沙洲", latin: "SANDBAR", trait: "踏实", signature: "沙色衬衫 · 蓝绿长裤", line: "话不多，但每句都算数。", color: "#b8976a", sex: "m", height: 1.78 },
  { id: "songshi", codename: "松石", latin: "TURQUOISE", trait: "沉稳", signature: "银发圆框眼镜 · 炭灰双排扣", line: "见过很多个起点，依然愿意听新的故事。", color: "#5f827d", sex: "m", height: 1.76 },
  { id: "zhusha", codename: "朱砂", latin: "VERMILION", trait: "灵感", signature: "红色贝雷帽 · 芥末黄开衫", line: "总是先在人群里看见颜色。", color: "#c8452f", sex: "f", height: 1.64 },
  { id: "baizao", codename: "白噪", latin: "WHITE NOISE", trait: "专注", signature: "白色头戴耳机 · 藏青卫衣", line: "戴上耳机是专注，摘下来是好奇。", color: "#34507e", sex: "m", height: 1.77 },
  { id: "qingci", codename: "青瓷", latin: "CELADON", trait: "从容", signature: "玉簪低发髻 · 青瓷盘扣上衣", line: "慢一点，把每次相遇都泡出味道。", color: "#5e9a8b", sex: "f", height: 1.66 },
  { id: "qingpao", codename: "晴跑", latin: "SUNRUN", trait: "活力", signature: "白色棒球帽 · 淡紫风衣", line: "先跑起来，路上会遇到同行的人。", color: "#8c78c2", sex: "m", height: 1.79 },
  { id: "zheshi", codename: "赭石", latin: "OCHRE", trait: "自由", signature: "及肩卷发 · 赭橙亚麻衬衫", line: "灵感来的时候，总想找个人分享。", color: "#b5653a", sex: "m", height: 1.8 },
  { id: "shuangye", codename: "霜叶", latin: "FROST LEAF", trait: "洞见", signature: "银白短发 · 驼色风衣与酒红丝巾", line: "愿意为一个好问题停下来。", color: "#8e3a4a", sex: "f", height: 1.62 },
  { id: "mochuan", codename: "墨川", latin: "INK RIVER", trait: "硬核", signature: "光头短须 · 黑色机能夹克", line: "把复杂的事，拆成能动手的事。", color: "#2e3742", sex: "m", height: 1.78 },
  { id: "shanhu", codename: "珊瑚", latin: "CORAL", trait: "热情", signature: "蓬松卷发 · 珊瑚粉西装", line: "从远方来，想听听这里的故事。", color: "#df6f5d", sex: "f", height: 1.7 },
  { id: "xiaoman", codename: "小满", latin: "GRAIN BUDS", trait: "好奇", signature: "双麻花辫 · 墨绿棒球夹克", line: "第一次来，什么都想问一问。", color: "#3d6b4f", sex: "f", height: 1.6 },
].map(persona => Object.freeze(persona)));

export const PERSONA_IDS = Object.freeze(PERSONAS.map(persona => persona.id));
const BY_ID = new Map(PERSONAS.map(persona => [persona.id, persona]));

export function personaById(id) { return BY_ID.get(id) || null; }

export function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value ?? "")) hash = Math.imul(hash ^ char.codePointAt(0), 16777619) >>> 0;
  return hash;
}

/** Least-used persona among the active roster; ties break by a stable hash of
 * the attendee id so concurrent joins still spread across looks. */
export function assignPersona(activeIds, usage = new Map(), salt = "") {
  const pool = (activeIds?.length ? activeIds : PERSONA_IDS).filter(id => BY_ID.has(id));
  if (!pool.length) return PERSONA_IDS[0];
  const least = Math.min(...pool.map(id => usage.get(id) || 0));
  const candidates = pool.filter(id => (usage.get(id) || 0) === least);
  return candidates[hashString(salt) % candidates.length];
}

export function serialLabel(serial) {
  const value = Number(serial);
  return Number.isSafeInteger(value) && value > 0 ? String(value).padStart(3, "0") : "···";
}

export function defaultDisplayName(personaId, serial) {
  const persona = personaById(personaId) || PERSONAS[0];
  return `${persona.codename}·${serialLabel(serial)}`;
}
