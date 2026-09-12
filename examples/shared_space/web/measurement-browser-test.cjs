const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
(async () => {
  const out = process.env.LAB_EVIDENCE_DIR || path.join(require("node:os").tmpdir(), "meetmind-space-measurements");
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
    assert.equal(await owner.locator("#measurement-record").isDisabled(), true);
    await owner.locator("#invite").click();
    await owner.locator("#invite-dialog").waitFor({ state: "visible" });
    const invitation = await owner.locator("#invite-link").inputValue();
    await owner.getByRole("button", { name: "关闭", exact: true }).click();
    await guest.goto(invitation);
    await guest.locator("#join").click();
    await guest.locator("#identity").filter({ hasText: "阿博" }).waitFor();
    for (const page of [owner, guest]) await page.locator('[data-tab="decide"]').click();
    await owner.getByRole("button", { name: "我接受这个版本", exact: true }).click();
    await guest.waitForFunction(() => window.__space.state.decisions.alice?.status === "accepted");
    await guest.getByRole("button", { name: "我接受这个版本", exact: true }).click();
    await owner.waitForFunction(() => window.__space.state.decisions.bo?.status === "accepted");
    await owner.getByLabel("我的下一步", { exact: true }).fill("复测沙发外沿");
    await owner.getByRole("button", { name: "留下我的行动", exact: true }).click();
    await owner.getByRole("button", { name: "自报完成", exact: true }).click();
    await owner.getByLabel("结果说明", { exact: true }).fill("测量了沙发宽深高");
    await owner.locator("#report-submit").click();
    await owner.locator("#report-dialog").waitFor({ state: "hidden" });
    assert.equal(await owner.locator("#measurement-record").isEnabled(), true);
    await owner.getByRole("button", { name: "把测量带回空间", exact: true }).click();
    const initial = await owner.evaluate(() => ({ state: window.__space.state, diagnostic: window.__space.diagnostics() }));
    await owner.locator("#measurement-object").selectOption("sofa");
    await owner.locator("#measurement-width").fill("4");
    await owner.locator("#measurement-depth").fill("0.9");
    await owner.locator("#measurement-height").fill("0.85");
    await owner.locator("#measurement-date").fill("2026-09-12");
    await owner.locator("#measurement-source").fill("测试数据：卷尺复测外沿");
    await owner.locator("#measurement-record").click();
    await guest.waitForFunction(() => window.__space.state.measurements.length === 1);
    assert.equal(await owner.evaluate(() => window.__space.state.objects.find(o => o.id === "sofa").width), 2);
    assert.equal(await owner.evaluate(() => window.__space.state.revision), initial.state.revision);
    passed.push("completed personal action required; recording observation leaves geometry and decisions unchanged");
    await owner.locator("[data-measurement-preview]").click();
    await owner.locator("#measurement-apply").waitFor();
    await owner.waitForFunction(() => window.__space.diagnostics().object_scales.sofa[0] === 2);
    assert.equal(await guest.evaluate(() => window.__space.diagnostics().object_scales.sofa[0]), 1);
    assert.deepEqual(await owner.evaluate(() => window.__space.diagnostics().mesh_uuids), initial.diagnostic.mesh_uuids);
    await owner.locator("#measurement-exit").click();
    await owner.waitForFunction(() => window.__space.diagnostics().object_scales.sofa[0] === 1);
    await owner.locator("[data-measurement-preview]").click();
    await owner.locator("#measurement-apply").waitFor();
    await owner.locator("#measurement-apply").click();
    await guest.waitForFunction(() => window.__space.state.objects.find(o => o.id === "sofa").width === 4);
    assert.equal(await guest.getByRole("button", { name: "我接受这个版本", exact: true }).isDisabled(), true);
    assert.ok(await guest.evaluate(() => window.__space.state.decisions.bo.revision < window.__space.state.revision));
    assert.deepEqual(await owner.evaluate(() => window.__space.diagnostics().object_uuids), initial.diagnostic.object_uuids);
    await owner.locator("#mode2d").click();
    assert.equal(await owner.evaluate(() => window.__space.diagnostics().object_scales.sofa[0]), 2);
    await owner.screenshot({ path: path.join(out, "applied-conflict-desktop.png"), fullPage: true });
    passed.push("preview local-only, exit restores scale; applied dimensions synchronize; conflicts invalidate acceptance; IDs preserved in 2D/3D");
    // Rotate a resized object through the real command API; renderer keeps identity.
    const os = await owner.evaluate(() => JSON.parse(localStorage.getItem("meetmind.shared-space.session.v1")));
    const afterApply = await owner.evaluate(() => window.__space.state);
    const sofa = afterApply.objects.find(o => o.id === "sofa");
    const rotated = await a.request.post(base + "space-api/command", { headers: { Authorization: "Bearer " + os.token },
      data: { expected_sequence: afterApply.sequence, request_id: "rotate-measured-sofa", command:
        { type: "object.move", object_id: "sofa", x: sofa.x, z: sofa.z, rotation: 90 } } });
    assert.equal(rotated.status(), 200);
    await owner.waitForFunction(() => window.__space.state.objects.find(o => o.id === "sofa").rotation === 90);
    await owner.locator("#mode3d").click();
    assert.deepEqual(await owner.evaluate(() => window.__space.diagnostics().mesh_uuids), initial.diagnostic.mesh_uuids);
    assert.equal(await owner.evaluate(() => window.__space.diagnostics().object_scales.sofa[0]), 2);
    // Restore rotation so the replacement dimensions become feasible again.
    const restoreState = await owner.evaluate(() => window.__space.state);
    const restored = await a.request.post(base + "space-api/command", { headers: { Authorization: "Bearer " + os.token },
      data: { expected_sequence: restoreState.sequence, request_id: "restore-measured-sofa", command:
        { type: "object.move", object_id: "sofa", x: sofa.x, z: sofa.z, rotation: 0 } } });
    assert.equal(restored.status(), 200);
    await owner.waitForFunction(() => window.__space.state.objects.find(o => o.id === "sofa").rotation === 0);
    passed.push("90-degree rotation and 2D/3D switches retain resized mesh identity");
    // Withdrawal keeps coordinates/dimensions but visibly removes their usable source.
    await owner.locator("[data-measurement-withdraw]").click();
    await guest.waitForFunction(() => window.__space.state.violations.some(v => v.id === "measurement-stale:sofa"));
    assert.equal(await guest.evaluate(() => window.__space.state.objects.find(o => o.id === "sofa").width), 4);
    assert.equal(await guest.locator("[data-measurement-withdraw]").count(), 0);
    // Record replacement and allow the other participant to explicitly apply it.
    await owner.locator("#measurement-width").fill("2");
    await owner.locator("#measurement-source").fill("测试数据：复核净尺寸");
    await owner.locator("#measurement-record").click();
    await guest.waitForFunction(() => window.__space.state.measurements.length === 2);
    await guest.locator("[data-measurement-preview]").click();
    await guest.locator("#measurement-apply").waitFor();
    await owner.getByRole("button", { name: "暂不决定", exact: true }).click();
    await owner.waitForFunction(() => window.__space.state.decisions.alice?.status === "defer");
    await guest.locator("#measurement-error").filter({ hasText: "原测量预览已退出" }).waitFor();
    assert.equal(await guest.locator("#measurement-apply").count(), 0);
    await guest.locator("[data-measurement-preview]").click();
    await guest.locator("#measurement-apply").waitFor();
    await guest.locator("#measurement-apply").click();
    await owner.waitForFunction(() => window.__space.state.violations.length === 0);
    assert.equal(await owner.evaluate(() => window.__space.state.objects.find(o => o.id === "sofa").width), 2);
    passed.push("withdrawn applied measurement remains visible and unusable; shared update expires preview; new measurement repairs provenance; other member applies without impersonating source");

    // Changing the originating report invalidates a measurement already in use.
    await owner.getByRole("button", { name: "撤回报告", exact: true }).click();
    await guest.waitForFunction(() => window.__space.state.violations.some(v => v.id === "measurement-stale:sofa"));
    await guest.reload();
    await guest.locator("#identity").filter({ hasText: "阿博" }).waitFor();
    assert.equal(await guest.evaluate(() => window.__space.state.objects.find(o => o.id === "sofa").width), 2);
    assert.ok(await guest.evaluate(() => window.__space.state.violations.some(v => v.id === "measurement-stale:sofa")));
    assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await guest.locator(".measurement-history summary").click();
    await guest.screenshot({ path: path.join(out, "source-withdrawn-mobile.png"), fullPage: true });
    const download = guest.waitForEvent("download");
    await guest.locator("#export").click();
    await (await download).saveAs(path.join(out, "summary.md"));
    const summary = fs.readFileSync(path.join(out, "summary.md"), "utf8");
    assert.ok(summary.includes("依据已失效"));
    assert.ok(summary.includes("测试数据：复核净尺寸"));
    passed.push("report retraction invalidates source; refresh recovery, timeline, export and mobile no overflow");
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify({ passed, errors }, null, 2));
    console.log(out);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
