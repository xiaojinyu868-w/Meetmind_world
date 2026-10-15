#!/usr/bin/env node
/**
 * The 呆猫 integration rehearsed end to end on a throwaway instance of this very code: a second server on
 * 127.0.0.1:5391 with its own data file and token — production and its data are never touched. Every call the 呆猫
 * backend and the web-view make, in the order they make them, checked against docs/DAIMAO-MINIPROGRAM-API.md.
 *
 *   node scripts/partner-rehearsal.mjs [--report docs/qa/daimao-rehearsal.json]
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.REHEARSAL_PORT || 5391);
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = randomBytes(36).toString("base64url");
const taken = await fetch(`${BASE}/api/health`).then(() => true, () => false);
if (taken) {
  console.error(`127.0.0.1:${PORT} 上已经有服务在跑，演练不会碰它。换个端口：REHEARSAL_PORT=5392 node scripts/partner-rehearsal.mjs`);
  process.exit(2);
}
const tmp = mkdtempSync(join(tmpdir(), "echo-rehearsal-"));
const at = process.argv.indexOf("--report");
const reportPath = at > 0 ? resolve(process.argv[at + 1]) : null;

const env = { ...process.env };
for (const k of Object.keys(env)) if (k.startsWith("ECHO_")) delete env[k];
Object.assign(env, {
  NODE_ENV: "production", HOST: "127.0.0.1", PORT: String(PORT), ECHO_DIST_DIR: join(ROOT, "dist"), ECHO_EVENT_DATA: join(tmp, "event.json"),
  ECHO_ALLOWED_ORIGINS: BASE, ECHO_PUBLIC_URL: `${BASE}/`, ECHO_PARTNER_SOURCE: "daimao", ECHO_PARTNER_LABEL: "呆猫", ECHO_PARTNER_API_TOKEN: TOKEN,
});
const server = spawn(process.execPath, ["server/index.mjs"], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

const results = [];
const check = (step, ok, detail = "") => {
  results.push({ step, ok: !!ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${step}${detail ? `  — ${detail}` : ""}`);
};
async function call(method, path, { body, auth = TOKEN, origin } = {}) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${auth}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (origin) headers.Origin = origin;
  const r = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text, type: r.headers.get("content-type") || "" };
}
const code = (r) => r.json?.error?.code || "";
const local = (url) => url.replace(/^https?:\/\/[^/]+/, "");

async function main() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  const health0 = (await call("GET", "/api/health", { auth: "" })).json;
  check("服务起来了，合作接口已开启", health0?.ok && health0.partnerApi, `模式 ${health0?.mode}，场上 ${health0?.attendees} 人（演示人物）`);

  // 1. 自检
  let r = await call("GET", "/api/partner/ping", { auth: "" });
  check("不带 token 自检被拒", r.status === 401 && code(r) === "PARTNER_AUTH_REQUIRED", `${r.status} ${code(r)}`);
  r = await call("GET", "/api/partner/ping", { auth: "x".repeat(48) });
  check("错误 token 被拒", r.status === 401, `${r.status} ${code(r)}`);
  r = await call("GET", "/api/partner/ping");
  check("正确 token 自检通过", r.status === 200 && r.json?.ok && r.json.mapUrl, `${r.status} source=${r.json?.source} label=${r.json?.label}`);

  // 2. 换票的输入校验
  r = await call("POST", "/api/partner/tickets", { body: { uid: "dm_rehearsal_a", nickname: "测试小李" } });
  check("缺少 consent 被拒", r.status === 400 && code(r) === "CONSENT_REQUIRED", `${r.status} ${code(r)}`);
  r = await call("POST", "/api/partner/tickets", { body: { uid: "13800138000@daimao", consent: true } });
  check("uid 格式不对被拒（不能用手机号这类明文）", r.status === 400 && code(r) === "INVALID_UID", `${r.status} ${code(r)}`);

  // 3. 新用户：换票 → 打开地图 → 认领 → 挑形象入场
  const a = { uid: "dm_rehearsal_a", nickname: "测试小李", avatarUrl: "https://example.com/avatar/a.png", consent: true, role: "独立开发者", organization: "一人公司 · 记账工具", bio: "做了三年独立开发", offer: "前端、小程序开发", need: "找增长合伙人" };
  r = await call("POST", "/api/partner/tickets", { body: a });
  const ticketA = r.json?.ticket;
  check("新用户换票", r.status === 200 && r.json?.status === "new" && r.json.attendee === null && r.json.expiresIn === 1800, `status=${r.json?.status} expiresIn=${r.json?.expiresIn}`);
  check("返回的地图链接带 from=daimao 和票据", /[?&]from=daimao/.test(r.json?.url || "") && r.json.url.includes(`ticket=${ticketA}`), local(r.json?.url || "").replace(ticketA, "<票据>"));
  const page = await fetch(BASE + local(r.json.url));
  const html = await page.text();
  check("web-view 打开地图页", page.status === 200 && /text\/html/.test(page.headers.get("content-type") || "") && html.includes("<html"), `${page.status} ${page.headers.get("content-type")}`);
  r = await call("POST", "/api/partner/claim", { body: { ticket: ticketA }, auth: "", origin: BASE });
  check("页面认领票据：新用户先挑形象", r.status === 200 && r.json?.pending === true && r.json.profile?.name === "测试小李", JSON.stringify(r.json?.profile));
  r = await call("POST", "/api/join", { body: { ticket: ticketA, consent: true }, auth: "", origin: BASE });
  const sessionA = r.json?.token, serialA = r.json?.attendee?.serial;
  check("带票入场，出现在地图上", r.status === 201 && sessionA && serialA, `${r.status} 编号 ${serialA} 名字 ${r.json?.attendee?.name}`);

  // 4. 老用户：再换票 → 直接进地图；昵称以呆猫为准
  r = await call("POST", "/api/partner/tickets", { body: { ...a, nickname: "小李（改名）" } });
  const ticketA2 = r.json?.ticket;
  check("老用户再换票", r.status === 200 && r.json?.status === "returning" && r.json.attendee?.serial === serialA, `status=${r.json?.status} 编号 ${r.json?.attendee?.serial}`);
  r = await call("POST", "/api/partner/claim", { body: { ticket: ticketA2 }, auth: "", origin: BASE });
  check("老用户认领：直接登录同一个人", r.status === 200 && r.json?.resumed === true && r.json.token && r.json.attendee?.serial === serialA, `resumed=${r.json?.resumed} 编号 ${r.json?.attendee?.serial}`);
  check("昵称跟着呆猫更新", r.json?.attendee?.name === "小李（改名）", r.json?.attendee?.name);

  // 5. 现场到场：checkin 直接上大屏，重复到场不重复建人
  const before = (await call("GET", "/api/health", { auth: "" })).json.attendees;
  const b = { uid: "dm_rehearsal_b", nickname: "测试小王", avatarUrl: "https://example.com/avatar/b.png", consent: true, checkin: true };
  r = await call("POST", "/api/partner/tickets", { body: b });
  const serialB = r.json?.attendee?.serial;
  check("到场换票：不用打开地图就上图", r.status === 200 && r.json?.status === "checked-in" && r.json.attendee?.onsite === true && r.json.attendee.personaPending === true, `status=${r.json?.status} 编号 ${serialB} 形象待确认=${r.json?.attendee?.personaPending}`);
  r = await call("POST", "/api/partner/tickets", { body: b });
  const after = (await call("GET", "/api/health", { auth: "" })).json.attendees;
  check("重复到场不重复建人", r.json?.status === "returning" && after === before + 1, `第二次 status=${r.json?.status}，人数 ${before} → ${after}`);

  // 6. 碰一碰连线
  r = await call("POST", "/api/partner/connections", { body: { uidA: a.uid, uidB: b.uid } });
  check("推送连线：新连线 201", r.status === 201, `${r.status}`);
  r = await call("POST", "/api/partner/connections", { body: { uidA: b.uid, uidB: a.uid } });
  check("重复推送：已存在 200", r.status === 200, `${r.status}`);
  r = await call("POST", "/api/partner/connections", { body: { uidA: a.uid, uidB: "dm_rehearsal_nobody" } });
  check("一方没上图：404 MEMBER_NOT_ON_MAP", r.status === 404 && code(r) === "MEMBER_NOT_ON_MAP", `${r.status} ${code(r)}`);

  // 7. 用户资料同步：打开过地图的补全资料，没打开过的也存一份，都不上地图
  r = await call("POST", "/api/partner/members", { body: { members: [
    { uid: a.uid, consent: true, realName: "李测试", phone: "13800138000", wechat: "rehearsal_li", tags: ["AI"], registeredAt: "2026-10-20T12:00:00+08:00" },
    { uid: "dm_rehearsal_c", consent: true, nickname: "测试小陈", phone: "13900139000", registeredAt: 1792900800, extra: { city: "南京" } },
  ] } });
  check("同步用户资料：已有的补全，没打开过地图的新建", r.status === 200 && r.json?.created === 1 && r.json.updated === 1, JSON.stringify(r.json));
  const people = (await call("GET", "/api/health", { auth: "" })).json.attendees;
  check("同步的用户不上地图", people === after, `场上仍是 ${people} 人`);
  r = await call("GET", "/api/event", { auth: "" });
  check("同步的资料不出现在公开数据里", r.status === 200 && !/13800138000|13900139000|dm_rehearsal_c|测试小陈|李测试/.test(r.text), "");
  r = await call("POST", "/api/partner/members", { body: { members: [{ uid: "dm_rehearsal_c", consent: true, nickname: "小陈" }] } });
  check("再次同步：只改带了的字段", r.status === 200 && r.json?.updated === 1, JSON.stringify(r.json));
  r = await call("POST", "/api/partner/members", { body: { members: [{ uid: "dm_rehearsal_d", nickname: "没同意" }] } });
  check("缺少 consent 的同步被拒", r.status === 400 && code(r) === "CONSENT_REQUIRED", `${r.status} ${code(r)}`);
  let saved = [];
  for (let i = 0; i < 30 && !saved.some((m) => m.uid === "dm_rehearsal_c" && m.nickname === "小陈"); i++) {
    await new Promise((done) => setTimeout(done, 100));
    try { saved = JSON.parse(readFileSync(join(tmp, "event.json"), "utf8")).partnerMembers?.daimao || []; } catch {}
  }
  const c = saved.find((m) => m.uid === "dm_rehearsal_c"), sa = saved.find((m) => m.uid === a.uid);
  check("资料存进了我们的数据文件，没带的字段保留", c?.nickname === "小陈" && c.phone === "13900139000" && c.extra?.city === "南京" && sa?.phone === "13800138000" && sa.nickname === "小李（改名）", `${saved.length} 位：${saved.map((m) => m.uid).join("、")}`);
  const csv = execFileSync(process.execPath, ["scripts/export-partner-members.mjs", join(tmp, "event.json")], { cwd: ROOT, encoding: "utf8" });
  const lines = csv.trim().split("\r\n");
  check("导出成表格：表头加每人一行", lines.length === saved.length + 1 && lines[0].includes("手机号") && csv.includes("13900139000"), `${lines.length - 1} 行`);
  r = await call("POST", "/api/partner/members", { body: { members: [{ uid: "dm_rehearsal_c", deleted: true }] } });
  check("用户注销：推 deleted 后删掉这一位", r.status === 200 && r.json?.deleted === 1, JSON.stringify(r.json));

  // 8. 数据回传
  r = await call("GET", "/api/partner/export");
  const members = r.json?.members || [];
  const ma = members.find((m) => m.uid === a.uid), mb = members.find((m) => m.uid === b.uid);
  check("导出包含两位呆猫用户", r.status === 200 && ma && mb, `members=${members.length} otherAttendees=${r.json?.otherAttendees}`);
  check("导出的连线来源是 daimao", ma?.connections?.some((c) => c.uid === b.uid && c.via === "daimao"), JSON.stringify(ma?.connections?.map((c) => ({ uid: c.uid, via: c.via }))));
  check("首次带入的资料在导出里", ma?.profile?.need === "找增长合伙人" && ma.profile.role === "独立开发者", JSON.stringify(ma?.profile));
  check("到场时间记录了", !!mb?.onsiteAt, mb?.onsiteAt || "");
  const raw = JSON.stringify(r.json);
  check("导出里没有 token、票据、手机号和邮箱", !raw.includes(TOKEN) && !raw.includes(ticketA) && !/1[3-9]\d{9}/.test(raw) && !/[\w.+-]+@[\w-]+\.[\w.]+/.test(raw), "");

  // 9. 公开数据里看不到呆猫 uid
  r = await call("GET", "/api/event", { auth: "" });
  check("公开的活动数据里不出现呆猫 uid", r.status === 200 && !r.text.includes("dm_rehearsal_a") && !r.text.includes("dm_rehearsal_b"), "");

  // 10. 票据异常
  r = await call("POST", "/api/partner/claim", { body: { ticket: randomBytes(24).toString("base64url") }, auth: "", origin: BASE });
  check("不存在或过期的票据：410", r.status === 410 && code(r) === "TICKET_EXPIRED", `${r.status} ${code(r)}`);
  r = await call("POST", "/api/partner/claim", { body: { ticket: "<script>" }, auth: "", origin: BASE });
  check("格式不对的票据：400", r.status === 400 && code(r) === "INVALID_TICKET", `${r.status} ${code(r)}`);
  r = await call("POST", "/api/partner/claim", { body: { ticket: ticketA2 }, auth: "", origin: "https://evil.example.com" });
  check("不在白名单的来源被拒", r.status === 403 && code(r) === "ORIGIN_NOT_ALLOWED", `${r.status} ${code(r)}`);

  // 11. 日志里没有 token、票据和手机号
  check("服务日志里没有 token、票据和手机号", ![TOKEN, ticketA, ticketA2, "13800138000", "13900139000"].some((s) => serverLog.includes(s)), `${serverLog.split("\n").filter(Boolean).length} 行日志`);
}

let failed = false;
try {
  await main();
} catch (e) {
  failed = true;
  check("演练中途出错", false, e.message);
} finally {
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 400));
  rmSync(tmp, { recursive: true, force: true });
}
const passed = results.filter((x) => x.ok).length;
console.log(`\n${passed}/${results.length} 项通过`);
if (reportPath) writeFileSync(reportPath, JSON.stringify({ at: new Date().toISOString(), commit: process.env.REHEARSAL_COMMIT || "", passed, total: results.length, results }, null, 2) + "\n");
process.exit(failed || passed !== results.length ? 1 : 0);
