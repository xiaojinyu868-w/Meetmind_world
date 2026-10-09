#!/usr/bin/env node
// An event day against a real server process with production settings: guests
// arrive, stay connected, invite, confirm, stamp and edit at a peak rate, and
// every phone refreshes its inbox when told to. Reports server CPU and memory,
// request latency, bytes sent to phones, and whether every phone ends with
// exactly the server's snapshot.
//
//   node scripts/load-event.mjs [--guests 300] [--peak-seconds 120] [--rate 9] [--port 5299]
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { WebSocket } from "ws";
import { applyChanges } from "../src/shared/changes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, i, all) => (i % 2 ? pairs : [...pairs, [value.replace(/^--/, ""), all[i + 1]]]), []));
const GUESTS = Number(args.guests || 300), PEAK_SECONDS = Number(args["peak-seconds"] || 120), RATE = Number(args.rate || 9), PORT = Number(args.port || 5299);
const base = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "echo-load-"));
writeFileSync(join(dir, "event.json.config"), JSON.stringify({ demoMode: false, demoContent: false, openJoin: true, taps: "open" }));
const server = spawn(process.execPath, [resolve(HERE, "../server/index.mjs")], {
  env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", ECHO_EVENT_DATA: join(dir, "event.json"), ECHO_EVENT_CONFIG: join(dir, "event.json.config"), ECHO_DIST_DIR: join(dir, "dist"), ECHO_ALLOWED_ORIGINS: "http://localhost:5189" },
  stdio: ["ignore", "inherit", "inherit"],
});
const stop = () => { server.kill(); rmSync(dir, { recursive: true, force: true }); };
process.on("exit", stop);

const ROLES = ["AI 产品创始人", "独立开发者", "天使投资人", "品牌设计师", "社群主理人", "硬件创业者", "内容创作者"];
const TOPICS = ["AI 产品研发、产品验证", "品牌设计、种子用户", "融资交流、商业战略", "实时 3D、数字人研发", "线下活动、社群运营", "云计算、AI 工程部署"];
const pick = list => list[Math.floor(Math.random() * list.length)];
const latency = { join: [], write: [], me: [] };
let errors = 0, httpBytes = 0, wsBytes = 0, wsMessages = 0, mePings = 0;
async function call(path, { body, token, kind = "write" } = {}) {
  const t0 = performance.now();
  const response = await fetch(base + path, { method: body ? "POST" : "GET", headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  latency[kind]?.push(performance.now() - t0);
  httpBytes += text.length;
  if (!response.ok) { errors++; return null; }
  return JSON.parse(text);
}
const health = () => fetch(base + "/api/health").then(r => r.json());
const percentile = (list, p) => { const sorted = [...list].sort((a, b) => a - b); return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0; };

class Phone {
  constructor(guest) { this.guest = guest; this.view = null; this.gaps = 0; }
  open() {
    return new Promise((resolveOpen, reject) => {
      const ws = this.ws = new WebSocket(base.replace("http:", "ws:") + "/api/live", { origin: "http://localhost:5189" });
      ws.on("open", () => ws.send(JSON.stringify({ type: "auth", token: this.guest.token })));
      ws.on("error", reject);
      ws.on("message", async raw => {
        wsBytes += raw.length; wsMessages++;
        const data = JSON.parse(raw.toString());
        if (data.type === "snapshot") { const { type, ...snapshot } = data; this.view = snapshot; resolveOpen(); return; }
        if (data.type === "changes") {
          const result = applyChanges(this.view, data.entries);
          this.view = result.snapshot;
          if (result.gap) { this.gaps++; this.view = await call("/api/event", { kind: "me" }); }
          return;
        }
        if (data.type === "me") { mePings++; await call("/api/me", { token: this.guest.token, kind: "me" }); }
      });
    });
  }
}

for (let i = 0; i < 50 && !(await health().catch(() => null)); i++) await sleep(200);
const startHealth = await health();
console.log(`server up, ${GUESTS} guests, peak ${PEAK_SECONDS}s at ${RATE} actions/s`);
const t0 = performance.now();
const guests = [], phones = [];
// Arrivals: a guest every 60/GUESTS seconds, each with a filled-in card, then online.
for (let i = 0; i < GUESTS; i++) {
  const joined = await call("/api/join", { kind: "join", body: { consent: true, name: `来宾${i}`, role: pick(ROLES), offer: pick(TOPICS), need: pick(TOPICS), organization: "压测机构", bio: "一句话介绍：".padEnd(40, "测"), category: pick(["investor", "founder", "guest"]) } });
  if (!joined) continue;
  guests.push(joined);
  const phone = new Phone(joined);
  phones.push(phone);
  await phone.open();
  await sleep(60000 / GUESTS * 0.2);
}
const arrived = performance.now();
console.log(`arrivals: ${guests.length} in ${((arrived - t0) / 1000).toFixed(1)}s`);
const peakStart = await health();
const pendingInvites = [];
const bytesBefore = wsBytes + httpBytes;
let actions = 0;
for (let second = 0; second < PEAK_SECONDS; second++) {
  const tick = performance.now();
  const work = [];
  for (let n = 0; n < RATE; n++) {
    const roll = Math.random(), a = pick(guests), b = pick(guests);
    if (roll < 0.35 && a !== b) work.push(call("/api/encounters", { token: a.token, body: { peerId: b.attendee.id, note: "你好，想认识你" } }).then(r => r && pendingInvites.push({ id: r.encounter.id, to: b })));
    else if (roll < 0.6 && pendingInvites.length) { const invite = pendingInvites.splice(Math.floor(Math.random() * pendingInvites.length), 1)[0]; work.push(call(`/api/encounters/${invite.id}/confirm`, { token: invite.to.token, body: {} })); }
    else if (roll < 0.9) work.push(call("/api/tap", { token: a.token, body: { tag: pick(["CP-welcome", "CP-future", "CP-platform", "CP-gallery"]) } }));
    else work.push(call("/api/join", { token: a.token, kind: "write", body: { consent: true, name: a.attendee.name, role: pick(ROLES), need: pick(TOPICS), offer: pick(TOPICS) } }));
    actions++;
  }
  await Promise.all(work);
  await sleep(Math.max(0, 1000 - (performance.now() - tick)));
}
await sleep(2500);
const end = await health();
const peakSeconds = (performance.now() - arrived) / 1000;
const truth = await (await fetch(base + "/api/event")).json();
// Same content; a phone appends connections in the order they were confirmed, the snapshot in the order they were asked.
const byId = list => JSON.stringify([...list].sort((a, b) => a.id.localeCompare(b.id)));
const mismatch = phone => phone.view?.version !== truth.version ? "version" : byId(phone.view.attendees) !== byId(truth.attendees) ? "attendees" : byId(phone.view.connections) !== byId(truth.connections) ? "connections" : JSON.stringify(phone.view.activity) !== JSON.stringify(truth.activity) ? "activity" : null;
const consistent = phones.filter(phone => !mismatch(phone)).length;
const reasons = phones.map(mismatch).filter(Boolean).reduce((all, reason) => ({ ...all, [reason]: (all[reason] || 0) + 1 }), {});
const snapshotBytes = JSON.stringify(truth).length;
const peakBytes = wsBytes + httpBytes - bytesBefore;
const versions = end.version - peakStart.version;
console.log(JSON.stringify({
  guests: guests.length, live: end.live, actions, versions, errors,
  latencyMs: Object.fromEntries(Object.entries(latency).map(([k, v]) => [k, { p50: +percentile(v, 0.5).toFixed(1), p95: +percentile(v, 0.95).toFixed(1), p99: +percentile(v, 0.99).toFixed(1) }])),
  serverCpuPercentDuringPeak: +((end.cpuMs - peakStart.cpuMs) / (peakSeconds * 1000) * 100).toFixed(1),
  serverMemoryMb: end.memoryMb, startMemoryMb: startHealth.memoryMb,
  peakTrafficMBps: +(peakBytes / peakSeconds / 1048576).toFixed(3), wsMessages, mePings,
  snapshotKB: +(snapshotBytes / 1024).toFixed(1),
  // What the previous protocol (the whole snapshot to every phone on every change) would have sent in the same peak.
  oldProtocolMBps: +(versions * snapshotBytes * phones.length / peakSeconds / 1048576).toFixed(1),
  phonesMatchingServer: `${consistent}/${phones.length}`, mismatches: reasons, gaps: phones.reduce((s, p) => s + p.gaps, 0),
}, null, 1));
for (const phone of phones) phone.ws.terminate();
process.exit(consistent === phones.length && !errors ? 0 : 1);
