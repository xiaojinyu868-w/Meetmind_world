export const currentUser = Object.freeze({
  id: "person-self",
  name: "我",
  displayName: "小满",
  initials: "XM",
  portrait: "portraits/photo-derived/voxel/host.png",
  relation: "关系世界的中心",
  role: "体验设计师",
  city: "上海",
  palette: {
    hair: "#302a27",
    jacket: "#2f665c",
    MAT_Jacket_Light: "#4d8175",
    shirt: "#e8dfc2",
    pants: "#303f45",
    shoes: "#c28a3a",
    skin: "#d79a73",
  },
  graph: { x: 50, y: 48 },
});

// 2026-08-25：6 个 mock NPC（lin-che/zhou-ning/chen-mo/xu-an/su-he/tang-ke）与
// 12 条关系边已清空——线上世界人物以后端 Package 为准（LiveWorld 快照驱动，
// 见 main.js ensureAgentEntity），demoPeople 只保留 currentUser 单节点，
// 关系 Map 不再展示虚构人物。
export const people = Object.freeze([]);

export const relationships = Object.freeze([]);

export function getPerson(personId) {
  return people.find((person) => person.id === personId) ?? null;
}
