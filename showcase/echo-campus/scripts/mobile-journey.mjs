#!/usr/bin/env node
/**
 * One guest's phone journey through the map, screenshotted step by step: the 呆猫 entry (ticket → look →
 * arrival), the court, another guest's card, recommendations, the inbox, the passport, one's own card.
 * WebGL is software-rendered here, so it is slow, but it is the real page against a real server.
 *
 *   node scripts/mobile-journey.mjs --base https://capture.meetmind.online/echo-campus-preview/ \
 *     --token-file /etc/echo-campus-preview/secrets.env --out /tmp/journey [--uid dm_journey_1] [--dpr 2]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const opt = (name, fallback) => { const at = args.indexOf("--" + name); return at >= 0 ? args[at + 1] : fallback; };
const base = opt("base", "https://capture.meetmind.online/echo-campus-preview/").replace(/\/?$/, "/");
const out = resolve(opt("out", "/tmp/journey"));
const uid = opt("uid", "dm_journey_" + Date.now().toString(36));
const dpr = Number(opt("dpr", "2"));
const chrome = opt("chrome", "/root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell");
const tokenLine = readFileSync(opt("token-file", "/etc/echo-campus-preview/secrets.env"), "utf8").split("\n").find((l) => l.startsWith("ECHO_PARTNER_API_TOKEN="));
if (!tokenLine) throw new Error("no ECHO_PARTNER_API_TOKEN in the token file");
const token = tokenLine.slice("ECHO_PARTNER_API_TOKEN=".length).trim();
mkdirSync(out, { recursive: true });

const guest = {
  uid, consent: true, nickname: "王悦", avatarUrl: "https://capture.meetmind.online/echo-campus/assets/personas/portraits/qingci-bust.webp",
  role: "AI 硬件创业者", organization: "深空智造", bio: "做桌面机器人，刚完成样机", offer: "硬件供应链、嵌入式开发", need: "找天使投资和渠道合作",
};
// --blank: a guest whose partner profile says nothing about what they offer or look for (the map asks them).
if (args.includes("--blank")) for (const key of ["role", "organization", "bio", "offer", "need"]) delete guest[key];
const ticket = await fetch(base + "api/partner/tickets", {
  method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(guest),
}).then((r) => r.json());
if (!ticket.url) throw new Error("ticket failed: " + JSON.stringify(ticket));

const browser = await chromium.launch({ executablePath: chrome, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, locale: "zh-CN",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50(0x1800322d) NetType/WIFI Language/zh_CN miniProgram/wxdaimao",
});
// Software WebGL can take seconds per frame; a few frames a second leaves room for input and screenshots.
await context.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => setTimeout(() => raf(cb), window.__rafDelay ?? 150);
});
const page = await context.newPage();
const problems = [];
page.on("console", (m) => { if (m.type() === "error") problems.push("console: " + m.text().slice(0, 240)); });
page.on("pageerror", (e) => problems.push("pageerror: " + String(e.message).slice(0, 240)));
const steps = [];
const started = Date.now();
const wait = (ms) => page.waitForTimeout(ms);
async function shot(name, note = "") {
  const file = join(out, name + ".png");
  await page.evaluate(() => window.__ECHO_CAMPUS__?.setPaused?.(true));
  await wait(400);
  await page.screenshot({ path: file, timeout: 180000 });
  await page.evaluate(() => window.__ECHO_CAMPUS__?.setPaused?.(false));
  steps.push({ name, note, at: Math.round((Date.now() - started) / 1000) });
  console.log(`📸 ${name}${note ? "  " + note : ""}`);
}
const click = (selector) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, selector);

// `debug` exposes window.__ECHO_CAMPUS__ without the recording toolbar that `capture` adds; the UI is unchanged.
await page.goto(ticket.url.replace(/^https?:\/\/[^/]+\/[^?]*/, base.replace(/\/$/, "/")) + "&debug=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => !document.querySelector("[data-arrival]")?.hidden || document.documentElement.dataset.ready === "true", null, { timeout: 240000, polling: 1000 });
await wait(4000);
await shot("01-arrival", "碰一下进来后的第一屏");
const arrived = await click('[data-arrival] [data-action="arrive"]');
await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 300000, polling: 1000 });
await wait(9000);
await shot("02-court", arrived ? "入场后落到自己身上" : "没有找到入场按钮");
await wait(6000);
await shot("02b-court-later", "停留几秒后");
const someone = await page.evaluate(() => {
  const app = window.__ECHO_CAMPUS__, me = app.client.me?.attendee?.id;
  const other = (app.client.snapshot?.attendees || []).find((p) => p.id !== me && p.name && !/^访客/.test(p.name));
  if (other) app.focusPerson(other.id);
  return other ? other.name : null;
});
await wait(5000);
await shot("03-person", "点开别人：" + someone);
await click('[data-action="close"]');
await wait(1500);
await click('[data-action="matches"]');
await wait(4000);
await shot("04-matches", "认识新朋友");
await click('[data-action="close"]');
await wait(1200);
await click('[data-action="inbox"]');
await wait(3000);
await shot("05-inbox", "我的相遇");
await click('[data-action="close"]');
await wait(1200);
await click('[data-action="activity"]');
await wait(3000);
await shot("06-passport", "相遇护照");
await click('[data-action="close"]');
await wait(1200);
await click(".court-me");
await wait(3000);
await shot("07-mycard", "我的名片");
const metrics = await page.evaluate(() => ({ shot: window.__ECHO_CAMPUS__?.look?.shot, tilt: window.__ECHO_CAMPUS__?.look?.uniforms?.uTilt?.value, labels: document.querySelectorAll(".world-label, [data-world-label]").length }));
writeFileSync(join(out, "journey.json"), JSON.stringify({ base, uid, dpr, seconds: Math.round((Date.now() - started) / 1000), steps, metrics, problems }, null, 2));
console.log(`done in ${Math.round((Date.now() - started) / 1000)}s, ${problems.length} problems`, JSON.stringify(metrics));
await browser.close();
