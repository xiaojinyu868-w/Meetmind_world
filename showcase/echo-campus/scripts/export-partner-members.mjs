#!/usr/bin/env node
/**
 * The users a partner gave us (POST /api/partner/members, plus what came with its tickets) as a CSV that opens in
 * Excel. Reads the service's data file. The CSV holds contacts: it is written 0600 and stays out of the repo.
 *
 *   sudo node scripts/export-partner-members.mjs /var/lib/echo-campus-b2b/event.json --out /root/daimao-members.csv
 *   node scripts/export-partner-members.mjs <data file> [--source daimao]        # CSV to stdout
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const option = (name) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined; };
const file = args.find((arg, i) => !arg.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!file) {
  console.error("用法: node scripts/export-partner-members.mjs <数据文件> [--out 文件.csv] [--source daimao]");
  process.exit(1);
}
const members = JSON.parse(readFileSync(file, "utf8")).partnerMembers?.[option("--source") || "daimao"] || [];
const columns = [
  ["uid", "uid"], ["nickname", "昵称"], ["realName", "姓名"], ["phone", "手机号"], ["wechat", "微信号"], ["role", "身份"],
  ["organization", "机构"], ["bio", "简介"], ["offer", "能提供"], ["need", "在寻找"], ["category", "类别"], ["tags", "标签"],
  ["registeredAt", "报名时间"], ["checkedInAt", "签到时间"], ["firstSyncedAt", "首次同步"], ["syncedAt", "最近同步"], ["extra", "其他"],
];
const cell = (value) => {
  let text = Array.isArray(value) ? value.join("、") : value && typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  // Excel runs a cell that starts like this as a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};
const rows = [columns.map(([, label]) => cell(label)), ...members.map((m) => columns.map(([key]) => cell(m[key])))];
const csv = "\ufeff" + rows.map((row) => row.join(",")).join("\r\n") + "\r\n";
const out = option("--out");
if (out) {
  writeFileSync(out, csv, { mode: 0o600 });
  console.error(`${members.length} 位 → ${out}`);
} else process.stdout.write(csv);
