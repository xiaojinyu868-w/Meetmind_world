// Fixed, auditable vocabulary for supply/demand matching. The browser offers
// the same names as one-tap chips, so a chip always matches its own topic.
export const TOPICS = Object.freeze([
  ["Agent", ["agent", "智能体"]],
  ["AI 产品", ["ai 产品", "ai产品", "ai 工程", "人工智能"]],
  ["品牌设计", ["品牌设计", "品牌故事", "视觉叙事"]],
  ["空间设计", ["空间设计", "建筑可视化"]],
  ["实时 3D", ["实时 3d", "实时3d", "3d"]],
  ["数字人", ["数字人", "数字分身"]],
  ["活动", ["线下活动", "活动策划", "活动"]],
  ["社群", ["社群", "社区"]],
  ["产品验证", ["产品验证", "用户访谈"]],
  ["种子用户", ["种子用户"]],
  ["融资", ["融资", "投资", "募资"]],
  ["创业团队", ["创业团队", "创业", "合伙人"]],
  ["全栈开发", ["全栈开发", "快速原型"]],
  ["产品设计", ["产品设计", "交互原型"]],
  ["云计算", ["云计算", "工程部署"]],
  ["技术共创", ["技术共创"]],
  ["教育", ["教育"]],
  ["数字艺术", ["数字艺术"]],
  ["NFC", ["nfc", "物联网"]],
  ["内容传播", ["内容传播", "内容"]],
  ["出海", ["出海", "海外市场", "国际化"]],
  ["市场渠道", ["市场渠道", "渠道", "商务合作", "bd"]],
  ["支付与商业化", ["支付", "商业化", "变现"]],
  ["人才招聘", ["招聘", "人才"]],
].map(([name, aliases]) => Object.freeze([name, Object.freeze(aliases)])));

export const TOPIC_NAMES = Object.freeze(TOPICS.map(([name]) => name));

export function topicsIn(text) {
  const lower = String(text || "").toLowerCase();
  return new Set(TOPICS.filter(([, aliases]) => aliases.some(alias => lower.includes(alias))).map(([name]) => name));
}

/** Split free text such as "品牌设计、种子用户" into display chips. */
export function splitChips(text, limit = 6) {
  return String(text || "").split(/[、,，;；/|\n]+/).map(part => part.trim()).filter(Boolean).slice(0, limit);
}
