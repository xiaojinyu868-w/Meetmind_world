#!/usr/bin/env node
// The encoding list for the NFC wristbands and stands (docs/NFC-MATERIALS-DRAFT.md):
// one line per item with the number printed on it and the link written into its
// chip (the same link goes into its QR code).
//
//   node scripts/nfc-tags.mjs --wristbands investor:40,founder:120,guest:60 \
//     --checkpoints welcome,booth-a --gates south --spare 0.15 \
//     [--config event.json] [--base https://capture.meetmind.online/echo-campus/] [--out nfc-tags.csv]
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readEventConfig } from "../server/event-config.mjs";
import { ATTENDEE_CATEGORIES, CHECKPOINTS } from "../server/seed.mjs";

export const DEFAULT_BASE = "https://capture.meetmind.online/echo-campus/";
// NTAG213 holds 144 bytes of NDEF; the URI record, its header and the TLV leave about 130 characters of link.
export const NTAG213_URL_LIMIT = 130;
const ID = /^[a-z0-9][a-z0-9-]{0,47}$/;

/**
 * Rows for every item, spares included (rounded up). `categories` and
 * `checkpoints` are what the event config allows; an unknown one throws, so a
 * misspelt booth never reaches the factory.
 */
export function planTags({ wristbands = {}, checkpoints = [], gates = [], spare = 0.15, base = DEFAULT_BASE, categories = ATTENDEE_CATEGORIES, eventCheckpoints = CHECKPOINTS }) {
  const root = new URL(base);
  if (root.protocol !== "https:") throw new Error("链接必须是 https");
  if (!(spare >= 0 && spare <= 1)) throw new Error("备用比例需要在 0–1 之间");
  const known = new Set(categories.map(item => item.id)), stands = new Set(eventCheckpoints.map(item => item.id));
  const link = (tag, entry) => { const url = new URL(root); if (entry) url.searchParams.set("entry", "nfc"); url.searchParams.set("tag", tag); return url.href; };
  const rows = [];
  for (const [category, count] of Object.entries(wristbands)) {
    if (!known.has(category)) throw new Error(`活动配置里没有类别 ${category}`);
    if (!(Number.isInteger(count) && count > 0)) throw new Error(`${category} 的数量需要正整数`);
    const label = categories.find(item => item.id === category).label;
    for (let n = 1, total = Math.ceil(count * (1 + spare)); n <= total; n++) {
      const tag = `WB-${category}-${String(n).padStart(4, "0")}`;
      rows.push({ number: tag, kind: "手环", target: label, spare: n > count, url: link(tag, true) });
    }
  }
  for (const id of checkpoints) {
    if (!stands.has(id)) throw new Error(`活动配置里没有打卡点 ${id}`);
    const label = eventCheckpoints.find(item => item.id === id).label;
    for (const copy of ["A", "B"]) rows.push({ number: `CP-${id}`, kind: "打卡点立牌", target: label, spare: copy === "B", url: link(`CP-${id}`, false) });
  }
  for (const id of gates) {
    if (!ID.test(id)) throw new Error(`入口名 ${id} 只能用小写字母、数字和连字符`);
    for (const copy of ["A", "B"]) rows.push({ number: `GATE-${id}`, kind: "入口立牌", target: id, spare: copy === "B", url: link(`GATE-${id}`, true) });
  }
  const longest = Math.max(0, ...rows.map(row => row.url.length));
  if (longest > NTAG213_URL_LIMIT) throw new Error(`最长的链接 ${longest} 个字符，NTAG213 放不下，请换 NTAG215 或缩短域名`);
  return { rows, longest };
}

export function toCsv(rows) {
  const cell = value => /[",\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value);
  return "\ufeff" + [["编号", "物料", "类别或点位", "备用", "写入芯片和二维码的链接"], ...rows.map(row => [row.number, row.kind, row.target, row.spare ? "是" : "", row.url])].map(line => line.map(cell).join(",")).join("\r\n") + "\r\n";
}

function parse(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, ""), value = argv[i + 1];
    if (!key || value === undefined) throw new Error(`参数 ${argv[i]} 缺少取值`);
    options[key] = value;
  }
  const list = value => (value ? value.split(",").map(item => item.trim()).filter(Boolean) : []);
  const config = options.config ? readEventConfig(resolve(options.config)) : {};
  return {
    wristbands: Object.fromEntries(list(options.wristbands).map(item => { const [id, count] = item.split(":"); return [id, Number(count)]; })),
    checkpoints: list(options.checkpoints), gates: list(options.gates),
    spare: options.spare === undefined ? 0.15 : Number(options.spare), base: options.base || DEFAULT_BASE,
    categories: config.categories || ATTENDEE_CATEGORIES, eventCheckpoints: config.checkpoints || CHECKPOINTS,
    out: options.out || "nfc-tags.csv",
  };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || "")).href) {
  try {
    const options = parse(process.argv.slice(2));
    const { rows, longest } = planTags(options);
    writeFileSync(options.out, toCsv(rows));
    const by = rows.reduce((sum, row) => ({ ...sum, [row.kind]: (sum[row.kind] || 0) + 1 }), {});
    console.log(`${options.out}: ${rows.length} 件（${Object.entries(by).map(([kind, n]) => `${kind} ${n}`).join("，")}），最长链接 ${longest} 个字符`);
  } catch (error) {
    console.error("生成失败：" + error.message);
    process.exit(1);
  }
}
