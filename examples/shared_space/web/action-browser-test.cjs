const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
(async () => {
  const out = process.env.LAB_EVIDENCE_DIR || path.join(require("node:os").tmpdir(), "meetmind-space-actions");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  try {
    const a = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const b = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const owner = await a.newPage(), guest = await b.newPage(), errors = [], passed = [];
    for (const page of [owner, guest]) page.on("pageerror", e => errors.push(e.message));
    const base = process.env.LAB_URL || "http://127.0.0.1:4197/";
    await owner.goto(base);
    await owner.locator("#identity").filter({ hasText: "小满" }).waitFor();
    await owner.locator("#invite").click();
    await owner.locator("#invite-dialog").waitFor({ state: "visible" });
    const inviteUrl = await owner.locator("#invite-link").inputValue();
    assert.ok(inviteUrl.startsWith("http"));
    await guest.goto(inviteUrl);
    await owner.getByRole("button", { name: "关闭", exact: true }).click();
    await guest.locator("#join").click();
    await guest.locator("#identity").filter({ hasText: "阿博" }).waitFor();
    for (const page of [owner, guest]) await page.locator('[data-tab="decide"]').click();
    await owner.getByLabel("我的下一步", { exact: true }).fill("实际量门框");
    await owner.getByLabel("截止时间", { exact: true }).fill("2026-09-19");
    await owner.getByLabel("完成标准", { exact: true }).fill("记录门框最窄处净宽");
    await owner.getByLabel("待测量事项", { exact: true }).fill("门框净宽");
    await owner.getByLabel("结果来源", { exact: true }).fill("计划本人用卷尺测量");
    await owner.getByRole("button", { name: "留下我的行动", exact: true }).click();
    await guest.waitForFunction(() => window.__space.state.actions.length === 1);
    await guest.locator(".action").filter({ hasText: "2026-09-19" }).waitFor();
    assert.equal(await guest.locator("[data-action]").count(), 0);
    passed.push("structured fields synchronize; guest cannot report owner action");

    const sequence = await owner.evaluate(() => window.__space.state.sequence);
    await owner.getByRole("button", { name: "自报完成", exact: true }).click();
    await owner.getByLabel("结果说明", { exact: true }).fill("不应保存的草稿");
    await owner.locator("#report-cancel").click();
    assert.equal(await owner.evaluate(() => window.__space.state.sequence), sequence);
    assert.equal(await owner.evaluate(() => window.__space.state.actions[0].status), "pending");
    await owner.getByRole("button", { name: "自报完成", exact: true }).click();
    await owner.keyboard.press("Escape");
    assert.equal(await owner.locator("#report-dialog").evaluate(el => el.open), false);
    assert.equal(await owner.evaluate(() => window.__space.state.sequence), sequence);
    passed.push("cancel button and Escape never submit a report");

    await owner.getByRole("button", { name: "自报完成", exact: true }).click();
    await owner.getByLabel("结果说明", { exact: true }).fill("最窄处82厘米，测量两次");
    await owner.getByLabel("本次结果来源", { exact: true }).fill("本人卷尺测量；照片仅描述，未上传");
    // Change the shared sequence while the owner is editing a modal.
    await guest.getByRole("button", { name: "暂不决定", exact: true }).click();
    await guest.waitForFunction(() => window.__space.state.decisions.bo?.status === "defer");
    await owner.locator("#report-submit").click();
    await owner.locator("#report-error").filter({ hasText: "对方刚更新" }).waitFor();
    assert.equal(await owner.getByLabel("结果说明", { exact: true }).inputValue(), "最窄处82厘米，测量两次");
    assert.equal(await guest.evaluate(() => window.__space.state.actions[0].status), "pending");
    await owner.locator("#report-submit").click();
    await owner.locator("#report-dialog").waitFor({ state: "hidden" });
    await guest.waitForFunction(() => window.__space.state.actions[0].status === "done");
    assert.equal(await guest.evaluate(() => window.__space.state.actions[0].result_source), "本人卷尺测量；照片仅描述，未上传");
    passed.push("stale save rejected with draft retained; explicit retry records result and source");

    const beforeForge = await guest.evaluate(() => window.__space.state.sequence);
    const gs = await guest.evaluate(() => JSON.parse(localStorage.getItem("meetmind.shared-space.session.v1")));
    const forged = await b.request.post(base + "space-api/command", { headers: { Authorization: "Bearer " + gs.token },
      data: { expected_sequence: beforeForge, request_id: "forged-action-report", command: { type: "action.report", action_id: "action-1", status: "not_done" } } });
    assert.equal(forged.status(), 400);
    const downloaded = owner.waitForEvent("download");
    await owner.locator("#export").click();
    await (await downloaded).saveAs(path.join(out, "summary.md"));
    const text = fs.readFileSync(path.join(out, "summary.md"), "utf8");
    for (const part of ["2026-09-19", "记录门框最窄处净宽", "最窄处82厘米", "本人卷尺测量"]) assert.ok(text.includes(part));
    await owner.screenshot({ path: path.join(out, "desktop.png"), fullPage: true });
    await guest.screenshot({ path: path.join(out, "guest-mobile.png"), fullPage: true });
    assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await owner.reload();
    await owner.locator("#identity").filter({ hasText: "小满" }).waitFor();
    await owner.locator('[data-tab="decide"]').click();
    assert.equal(await owner.evaluate(() => window.__space.state.actions[0].report_note), "最窄处82厘米，测量两次");
    await owner.getByRole("button", { name: "撤回报告", exact: true }).click();
    await guest.waitForFunction(() => window.__space.state.actions[0].status === "pending");
    assert.equal(await guest.evaluate(() => window.__space.state.actions[0].report_note), "");
    passed.push("API ownership enforcement; export and refresh persistence; report withdrawal sync");

    // A second participant can create and report their own action on mobile.
    await guest.getByLabel("我的下一步", { exact: true }).fill("复核展示架尺寸");
    await guest.getByLabel("完成标准", { exact: true }).fill("量好宽深高");
    await guest.getByRole("button", { name: "留下我的行动", exact: true }).click();
    await guest.waitForFunction(() => window.__space.state.actions.length === 2);
    await guest.getByRole("button", { name: "未完成", exact: true }).click();
    await guest.getByLabel("结果说明", { exact: true }).fill("暂时没有卷尺");
    await guest.getByLabel("本次结果来源", { exact: true }).fill("本人现场说明");
    assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await guest.screenshot({ path: path.join(out, "mobile-report.png"), fullPage: true });
    await guest.locator("#report-submit").click();
    await owner.waitForFunction(() => window.__space.state.actions.some(a => a.owner === "bo" && a.status === "not_done"));
    passed.push("mobile participant report form; separate personal status; no horizontal overflow");
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify({ passed, errors }, null, 2));
    console.log(out);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
