const seat = (nodeName, x, z, yaw) =>
  Object.freeze({ nodeName, x, z, yaw, anchorHeight: 0.46 });


export const CAFE_LAYOUT = Object.freeze({
  bounds: Object.freeze({ minX: -5.35, maxX: 5.35, minZ: -4.45, maxZ: 4.45 }),
  playerSpawn: Object.freeze({ x: 0, z: 4.15, yaw: Math.PI }),
  roundtable: Object.freeze({
    id: "roundtable-six",
    nodeName: "TABLE_Central6",
    label: "中央六人圆桌",
    center: Object.freeze({ x: 0, z: 0 }),
    interactionRadius: 2.72,
    seats: Object.freeze([
      seat("SEAT_Central6_04", 0, 1.57, Math.PI),
      seat("SEAT_Central6_03", 1.36, 0.785, -Math.PI * 2 / 3),
      seat("SEAT_Central6_02", 1.36, -0.785, -Math.PI / 3),
      seat("SEAT_Central6_01", 0, -1.57, 0),
      seat("SEAT_Central6_06", -1.36, -0.785, Math.PI / 3),
      seat("SEAT_Central6_05", -1.36, 0.785, Math.PI * 2 / 3),
    ]),
  }),
  npcTables: Object.freeze([
    Object.freeze({
      id: "table-window-two",
      nodeName: "TABLE_2_01",
      label: "窗边双人桌",
      capacity: 2,
      center: Object.freeze({ x: -3.65, z: -1.55 }),
      seats: Object.freeze([
        seat("SEAT_2_01_01", -4.53, -1.55, Math.PI / 2),
        seat("SEAT_2_01_02", -2.77, -1.55, -Math.PI / 2),
      ]),
    }),
    Object.freeze({
      id: "table-poster-two",
      nodeName: "TABLE_2_02",
      label: "海报双人桌",
      capacity: 2,
      center: Object.freeze({ x: -3.65, z: 1.55 }),
      seats: Object.freeze([
        seat("SEAT_2_02_01", -4.53, 1.55, Math.PI / 2),
        seat("SEAT_2_02_02", -2.77, 1.55, -Math.PI / 2),
      ]),
    }),
    Object.freeze({
      id: "table-library-four",
      nodeName: "TABLE_4_01",
      label: "书架四人桌",
      capacity: 4,
      center: Object.freeze({ x: 3.28, z: -1.35 }),
      seats: Object.freeze([
        seat("SEAT_4_01_01", 2.89, -0.53, Math.PI * 0.86),
        seat("SEAT_4_01_02", 3.67, -0.53, -Math.PI * 0.86),
        seat("SEAT_4_01_03", 2.89, -2.17, Math.PI * 0.14),
        seat("SEAT_4_01_04", 3.67, -2.17, -Math.PI * 0.14),
      ]),
    }),
    Object.freeze({
      id: "table-counter-four",
      nodeName: "TABLE_4_02",
      label: "吧台侧四人桌",
      capacity: 4,
      center: Object.freeze({ x: 3.28, z: 1.65 }),
      seats: Object.freeze([
        seat("SEAT_4_02_01", 2.89, 2.47, Math.PI * 0.86),
        seat("SEAT_4_02_02", 3.67, 2.47, -Math.PI * 0.86),
        seat("SEAT_4_02_03", 2.89, 0.83, Math.PI * 0.14),
        seat("SEAT_4_02_04", 3.67, 0.83, -Math.PI * 0.14),
      ]),
    }),
  ]),
});


export function tableById(tableId) {
  if (tableId === CAFE_LAYOUT.roundtable.id) return CAFE_LAYOUT.roundtable;
  return CAFE_LAYOUT.npcTables.find((table) => table.id === tableId) ?? null;
}
