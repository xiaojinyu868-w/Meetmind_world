const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
(async () => {
  const out = process.env.LAB_EVIDENCE_DIR || path.join(require("node:os").tmpdir(), "meetmind-space-context");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  try {
    const a = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const b = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const owner = await a.newPage(), guest = await b.newPage(), errors = [], passed = [];
    for (const p of [owner, guest]) p.on("pageerror", e => errors.push(e.message));
    const base = process.env.LAB_URL || "http://127.0.0.1:4197/";
    await owner.goto(base);
    await owner.locator("#identity").filter({ hasText: "小满" }).waitFor();
    await owner.locator("#invite").click();
    await owner.locator("#invite-dialog").waitFor({ state: "visible" });
    const invitation = await owner.locator("#invite-link").inputValue();
    await owner.getByRole("button", { name: "关闭", exact: true }).click();
    await guest.goto(invitation);
    await guest.locator("#join").click();
    await guest.locator("#identity").filter({ hasText: "阿博" }).waitFor();
    await owner.locator('[data-tab="story"]').click();
    await owner.getByRole("button", { name: "带进一段新经历", exact: true }).click();
    await owner.locator('#context-dialog [name="text"]').fill("测试经历：昨晚一起尝试瑜伽，沙发挡住了垫子");
    await owner.locator('#context-dialog [name="occurred_on"]').fill("2026-09-12");
    await owner.locator('#context-dialog [name="source_note"]').fill("测试数据，本人录入");
    await owner.locator("#context-save").click();
    await owner.locator("#context-dialog").waitFor({ state: "hidden" });
    await guest.waitForFunction(() => window.__space.state.memories.length === 3);
    const memory = await guest.evaluate(() => window.__space.state.memories.at(-1));
    assert.equal(memory.origin, "participant-entry");
    assert.equal(await guest.evaluate(() => window.__space.state.requirements.length), 3);
    assert.equal(await guest.evaluate(() => window.__space.state.revision), 1);
    passed.push("new experience attributed to author with date/source, no automatic spatial intent");

    await guest.getByRole("button", { name: "添加我的活动区域", exact: true }).click();
    await guest.locator('#context-dialog [name="label"]').fill("为我留出练习空间");
    await guest.locator('#context-dialog [name="source_id"]').selectOption(memory.id);
    for (const [key, value] of Object.entries({ x: "4.3", z: "3.8", width: "1.8", depth: "2" }))
      await guest.locator('#context-dialog [name="' + key + '"]').fill(value);
    await guest.locator("#context-save").click();
    await guest.locator("#context-dialog").waitFor({ state: "hidden" });
    await owner.waitForFunction(() => window.__space.state.requirements.length === 4);
    const req = await owner.evaluate(() => window.__space.state.requirements.at(-1));
    assert.equal(req.owner, "bo");
    assert.ok(await guest.evaluate(id => window.__space.diagnostics().region_ids.includes(id), req.id));
    assert.ok(await owner.evaluate(id => window.__space.state.violations.some(v => v.requirement_id === id), req.id));
    const uuid = await owner.evaluate(() => window.__space.diagnostics().object_uuids);
    await owner.locator('[data-tab="needs"]').click();
    const card = owner.locator(".requirement").filter({ hasText: "为我留出练习空间" });
    await card.getByText("关联经历不等于双方认可。", { exact: true }).waitFor();
    assert.equal(await card.getByRole("button").count(), 0);
    passed.push("other participant explicitly links their own requirement; shared zone/conflicts; no impersonated endorsement");

    // Open an edit against source version 1, then change the source from the other side.
    const gcard = guest.locator(".requirement").filter({ hasText: "为我留出练习空间" });
    await gcard.getByRole("button", { name: "调整这项要求", exact: true }).click();
    await guest.locator('#context-dialog [name="width"]').fill("1.2");
    await owner.locator('[data-tab="story"]').click();
    const mform = owner.locator('form[data-memory="' + memory.id + '"]');
    await mform.locator("textarea").fill("测试经历已纠正：只是计划下周尝试，还没有一起练习");
    await mform.getByRole("button", { name: "保存这段变化", exact: true }).click();
    await owner.waitForFunction(id => window.__space.state.memories.find(m => m.id === id).version === 2, memory.id);
    await guest.locator("#context-save").click();
    await guest.locator("#context-error").filter({ hasText: "对方刚更新" }).waitFor();
    assert.equal(await guest.locator('#context-dialog [name="width"]').inputValue(), "1.2");
    await guest.locator("#context-save").click();
    await guest.locator("#context-error").filter({ hasText: "方案已变化" }).waitFor();
    await guest.locator("#context-cancel").click();
    await guest.locator(".requirement").filter({ hasText: "为我留出练习空间" }).getByText(/只是计划下周尝试/).waitFor();
    assert.ok(await guest.evaluate(id => window.__space.state.requirements.find(r => r.id === id).review_needed, req.id));
    assert.equal(await guest.evaluate(id => window.__space.state.requirements.find(r => r.id === id).zone.width, req.id), 1.8);
    await guest.locator(".requirement").filter({ hasText: "为我留出练习空间" }).getByRole("button", { name: "调整这项要求", exact: true }).click();
    for (const [key, value] of Object.entries({ x: "4.8", z: "2", width: "1", depth: "1" }))
      await guest.locator('#context-dialog [name="' + key + '"]').fill(value);
    await guest.locator("#context-save").click();
    await guest.locator("#context-dialog").waitFor({ state: "hidden" });
    await owner.waitForFunction(id => window.__space.state.requirements.find(r => r.id === id).source_version === 2, req.id);
    assert.equal(await guest.evaluate(() => window.__space.state.violations.length), 0);
    assert.deepEqual(await owner.evaluate(() => window.__space.diagnostics().object_uuids), uuid);
    passed.push("stale editor keeps draft and rejects outdated source on retry; cancel refreshes context; explicit new review updates zone only");

    // Disagreement stays a separate person's account and marks its linked requirement.
    await guest.locator('[data-tab="story"]').click();
    const reply = guest.locator('form[data-reply="' + memory.id + '"]');
    await reply.locator("textarea").fill("测试回应：我记得我们只是聊天，还没约好时间");
    await reply.getByRole("button", { name: "我记得不同", exact: true }).click();
    await owner.waitForFunction(id => window.__space.state.memories.find(m => m.id === id).replies.bo?.status === "different", memory.id);
    await owner.locator('[data-tab="needs"]').click();
    await owner.locator(".requirement").filter({ hasText: "为我留出练习空间" }).getByText("阿博：有不同记忆", { exact: true }).waitFor();
    await owner.locator(".requirement").filter({ hasText: "为我留出练习空间" }).scrollIntoViewIfNeeded();
    await owner.screenshot({ path: path.join(out, "context-desktop.png"), fullPage: true });

    await owner.locator('[data-tab="story"]').click();
    await owner.locator('[data-withdraw="' + memory.id + '"]').click();
    await guest.waitForFunction(id => window.__space.state.memories.find(m => m.id === id).withdrawn, memory.id);
    await guest.locator('[data-tab="needs"]').click();
    const afterWithdrawal = guest.locator(".requirement").filter({ hasText: "为我留出练习空间" });
    await afterWithdrawal.getByText(/关联经历已撤回/).waitFor();
    await afterWithdrawal.getByRole("button", { name: "调整这项要求", exact: true }).click();
    assert.equal(await guest.locator('#context-dialog [name="source_id"] option[value="' + memory.id + '"]').count(), 0);
    await guest.locator('#context-dialog [name="source_id"]').selectOption("");
    await guest.locator("#context-save").click();
    await guest.locator("#context-dialog").waitFor({ state: "hidden" });
    await owner.waitForFunction(id => window.__space.state.requirements.find(r => r.id === id).source_id === null, req.id);
    await guest.reload();
    await guest.locator("#identity").filter({ hasText: "阿博" }).waitFor();
    await guest.locator(".requirement").filter({ hasText: "为我留出练习空间" }).getByText("本人独立提出，不引用经历。", { exact: true }).waitFor();
    assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await guest.screenshot({ path: path.join(out, "independent-requirement-mobile.png"), fullPage: true });
    const dl = guest.waitForEvent("download");
    await guest.locator("#export").click();
    await (await dl).saveAs(path.join(out, "summary.md"));
    const text = fs.readFileSync(path.join(out, "summary.md"), "utf8");
    assert.ok(!text.includes("测试经历已纠正"));
    assert.ok(text.includes("参与者录入"));
    passed.push("separate disagreement visible; withdrawn source hidden and cannot be relinked; independent requirement survives refresh/export");

    // Verify a former side-panel conflict has an explicit way back to current versions.
    await owner.locator('[data-tab="story"]').click();
    const office = owner.locator('form[data-memory="office"]');
    await office.locator("textarea").fill("测试并发草稿，保留后重新核对");
    await guest.locator('[data-tab="decide"]').click();
    await guest.getByRole("button", { name: "暂不决定", exact: true }).click();
    await guest.waitForFunction(() => window.__space.state.decisions.bo?.status === "defer");
    await office.getByRole("button", { name: "保存这段变化", exact: true }).click();
    await owner.locator("#panel-refresh").waitFor({ state: "visible" });
    assert.equal(await office.locator("textarea").inputValue(), "测试并发草稿，保留后重新核对");
    await owner.locator("#refresh-discussion").click();
    assert.notEqual(await owner.locator('form[data-memory="office"] textarea').inputValue(), "测试并发草稿，保留后重新核对");
    passed.push("inline conflict keeps draft, explicit refresh restores current editable panel");
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify({ passed, errors }, null, 2));
    console.log(out);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
