#!/usr/bin/env node
/**
 * How the event went, from the service's data file: who came in, who said what they were looking for, greetings
 * sent and answered, connections made, what people wanted most. Counts only: no names, contacts or ids.
 *
 *   sudo node scripts/event-report.mjs /var/lib/echo-campus-b2b/event.json [--json]
 */
import { readFileSync } from "node:fs";
import { topicsIn } from "../src/shared/topics.mjs";

const file = process.argv[2];
if (!file) { console.error("用法: node scripts/event-report.mjs <数据文件> [--json]"); process.exit(1); }
const state = JSON.parse(readFileSync(file, "utf8"));
const guests = (state.attendees || []).filter(a => a.source !== "curated-demo");
const ids = new Set(guests.map(a => a.id));
const encounters = (state.encounters || []).filter(c => ids.has(c.fromId) && ids.has(c.toId));
const confirmed = encounters.filter(c => c.status === "confirmed");
const minutes = confirmed.map(c => (Date.parse(c.confirmedAt) - Date.parse(c.createdAt)) / 60000).filter(Number.isFinite).sort((a, b) => a - b);
const connected = new Set(confirmed.flatMap(c => [c.fromId, c.toId]));
const greeters = new Set(encounters.map(c => c.fromId));
const tally = field => {
  const counts = new Map();
  for (const a of guests) for (const topic of topicsIn(a[field])) counts.set(topic, (counts.get(topic) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([topic, count]) => ({ topic, count }));
};
const pct = (n, d) => d ? Math.round(n / d * 100) + "%" : "—";
const report = {
  event: state.event?.name || "", generatedAt: new Date().toISOString(),
  guests: guests.length, viaPartner: guests.filter(a => a.partner).length, onsite: guests.filter(a => a.onsiteAt).length,
  saidWhatTheyNeed: guests.filter(a => topicsIn(a.need).size).length, saidWhatTheyOffer: guests.filter(a => topicsIn(a.offer).size).length,
  leftContact: guests.filter(a => a.contact).length,
  greetings: encounters.length, guestsWhoGreeted: greeters.size, confirmed: confirmed.length,
  declined: encounters.filter(c => c.status === "declined").length, pending: encounters.filter(c => c.status === "pending").length,
  guestsConnected: connected.size, medianMinutesToYes: minutes.length ? Math.round(minutes[Math.floor(minutes.length / 2)]) : null,
  viaPartnerTap: confirmed.filter(c => c.via === "daimao").length,
  topNeeds: tally("need"), topOffers: tally("offer"),
  partnerMembersSynced: Object.values(state.partnerMembers || {}).reduce((sum, list) => sum + list.length, 0),
  checkins: Object.entries((state.checkins || []).reduce((m, c) => (m[c.checkpointId] = (m[c.checkpointId] || 0) + 1, m), {})).map(([checkpoint, count]) => ({ checkpoint, count })),
};
if (process.argv.includes("--json")) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }
console.log(`${report.event} · ${report.generatedAt.slice(0, 16).replace("T", " ")} (UTC)`);
console.log(`来宾 ${report.guests} 位（呆猫进入 ${report.viaPartner}，到场 ${report.onsite}）`);
console.log(`写了想认识谁 ${report.saidWhatTheyNeed}（${pct(report.saidWhatTheyNeed, report.guests)}）· 写了能提供什么 ${report.saidWhatTheyOffer} · 留了联系方式 ${report.leftContact}`);
console.log(`打招呼 ${report.greetings} 次（${report.guestsWhoGreeted} 人发起）· 成了 ${report.confirmed} 对（接受率 ${pct(report.confirmed, report.greetings)}）· 婉拒 ${report.declined} · 待回应 ${report.pending}`);
console.log(`至少认识 1 人的来宾 ${report.guestsConnected}（${pct(report.guestsConnected, report.guests)}）· 从打招呼到确认中位 ${report.medianMinutesToYes ?? "—"} 分钟 · 呆猫碰一碰连线 ${report.viaPartnerTap}`);
console.log(`最想认识：${report.topNeeds.map(t => `${t.topic} ${t.count}`).join("、") || "—"}`);
console.log(`最能提供：${report.topOffers.map(t => `${t.topic} ${t.count}`).join("、") || "—"}`);
console.log(`呆猫同步的用户资料 ${report.partnerMembersSynced} 位 · 打卡 ${report.checkins.map(c => `${c.checkpoint} ${c.count}`).join("、") || "—"}`);
