export const DEMO_EVENT = Object.freeze({
  id: "echo-campus-preview",
  name: "ECHO CAMPUS",
  subtitle: "一次相遇，一座共同生长的世界",
  mode: "demo",
  demoMode: true,
  disclosure: "园区内置人物为虚构演示资料。新加入的昵称、角色、供给与需求经确认后向本活动公开展示。NFC 演示链接不代表身份认证。",
  startsAt: "2026-10-01T09:00:00+08:00",
  location: "白庭 · 创造者相遇之夜",
  schema: "echo-campus-event.v1",
});

const PEOPLE = [
  ["林序", "AI 产品创始人", "Agent 产品研发、产品验证", "品牌设计、种子用户", "#566c58"],
  ["陈知", "品牌设计师", "品牌设计、视觉叙事", "AI 产品研发、线下活动", "#bea27c"],
  ["沈溪", "空间体验设计师", "空间设计、建筑可视化", "实时 3D、活动策划", "#7997a0"],
  ["许舟", "实时图形工程师", "实时 3D、数字人研发", "空间设计、产品验证", "#505e79"],
  ["唐悦", "活动策划人", "线下活动、社群运营", "数字人研发、品牌设计", "#ae735e"],
  ["顾言", "天使投资人", "融资交流、商业战略", "AI 产品、早期创业团队", "#85866c"],
  ["周可", "独立开发者", "全栈开发、快速原型", "产品设计、种子用户", "#9f958b"],
  ["夏遥", "社区主理人", "社群运营、用户访谈", "活动策划、AI 产品", "#a88898"],
  ["贺南", "云计算架构师", "云计算、AI 工程部署", "早期创业团队、技术共创", "#758e9d"],
  ["宋宁", "产品研究员", "用户访谈、产品验证", "Agent 研发、技术共创", "#b5a27d"],
  ["陆白", "交互设计师", "产品设计、交互原型", "全栈开发、用户访谈", "#b98878"],
  ["苏禾", "教育科技创始人", "教育场景、种子用户", "Agent 研发、融资交流", "#778879"],
  ["姜澜", "数字艺术家", "数字艺术、视觉叙事", "实时 3D、空间设计", "#9287a7"],
  ["江辰", "硬件创业者", "NFC 硬件、物联网", "云计算、线下活动", "#748e87"],
  ["温然", "内容创作者", "内容传播、品牌故事", "AI 产品、技术共创", "#bb9675"],
];

export function seedAttendees(now = new Date().toISOString()) {
  return PEOPLE.map(([name, role, offer, need, avatarColor], i) => ({
    id: "seed-" + String(i + 1).padStart(2, "0"),
    name, role, offer, need, avatarColor,
    position: {
      x: Math.cos(i * 2.399963) * (8 + i % 3 * 2),
      z: Math.sin(i * 2.399963) * (6 + i % 4),
    },
    synthetic: true,
    source: "curated-demo",
    consent: true,
    joinedAt: now,
  }));
}

export function seedConnections(now = new Date().toISOString()) {
  return [[0,1],[2,3],[4,7],[6,10],[8,13],[9,11],[3,12]].map(([a,b], i) => ({
    id: "seed-connection-" + (i + 1),
    fromId: "seed-" + String(a + 1).padStart(2, "0"),
    toId: "seed-" + String(b + 1).padStart(2, "0"),
    status: "confirmed",
    createdAt: now,
    confirmedAt: now,
    synthetic: true,
  }));
}

// These codes are explicitly public DEMONSTRATION fixtures, never real event credentials.
// Replace this registry with organizer-issued private claims before accepting real attendees.
export function demoBadges() {
  return Array.from({ length: 10 }, (_, i) => {
    const serial = String(i + 1).padStart(2, "0");
    return { badgeId: "demo-visitor-" + serial, activationCode: "ECHO-DEMO-" + serial };
  });
}
