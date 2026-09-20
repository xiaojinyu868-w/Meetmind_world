const { chromium } = require('C:/Users/Li Hao/Documents/ChatGPT/meetmind_edu_gpt6/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const out = __dirname + '/ui-acceptance';
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], errors: [], failed: [], screenshots: [] };
const base = 'https://capture.meetmind.online/echo-campus/';
const pause = ms => new Promise(r => setTimeout(r, ms));
function ok(name, detail) { report.checks.push({ name, detail }); console.log('PASS ' + name); }
async function ready(p, venue, view) {
  await p.waitForFunction(({venue,view}) => {
    const a = window.__ECHO_CAMPUS__;
    return a?.client.snapshot && document.documentElement.dataset.ready === 'true' &&
      (!venue || a.diagnostics().venue === venue) && (!view || a.diagnostics().venueView === view);
  }, {venue,view}, {timeout:150000});
}
async function snapshot(p, name) {
  const path = out + '/' + name + '.png'; await p.screenshot({path}); report.screenshots.push(name + '.png');
}
async function buttons(p, ids, prefix) {
  for (const id of ids) {
    const before = await p.evaluate(() => __ECHO_CAMPUS__.camera.position.toArray());
    const container = ['towers','hub','commercial'].includes(id) ? '[data-campus-regions]' : '.ec-camera-dock';
    const button = p.locator(container + ' [data-action="camera"][data-id="' + id + '"]');
    assert.equal(await button.count(), 1);
    if(prefix === 'mobile') await button.tap(); else await button.click();
    await p.waitForTimeout(2300);
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    const after = await p.evaluate(() => __ECHO_CAMPUS__.camera.position.toArray());
    assert.ok(after.some((v,i) => Math.abs(v-before[i])>.05), id + ' camera must move');
    assert.equal(new URL(p.url()).searchParams.get('camera'), id);
    ok(prefix + ' camera ' + id, { position: after });
  }
}
(async () => {
  const b = await chromium.launch({headless:true,executablePath:'C:/Users/Li Hao/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
  try {
    let ctx = await b.newContext({viewport:{width:1440,height:900}});
    let p = await ctx.newPage();
    function observe(page) { page.on('pageerror', e=>report.errors.push(e.message)); page.on('requestfailed',r=>report.failed.push({url:r.url(),reason:r.failure()})); }
    observe(p);
    await p.goto(base+'?debug=1&welcome=0&rev=full-campus-acceptance'); await ready(p,'venue-campus','event');
    ok('default opens complete campus', {url:p.url()});
    await buttons(p, ['towers','hub','commercial','aerial','arrival','garden','hero'], 'desktop');
    await snapshot(p,'desktop-hero');
    await p.locator('[data-action="venue-view"][data-id="source"]').click(); await ready(p,'venue-campus','source');
    assert.equal(await p.locator('[data-campus-regions]').isVisible(),true); ok('campus source layer retains region navigation');
    await p.locator('[data-action="venue-view"][data-id="event"]').click(); await ready(p,'venue-campus','event');
    assert.ok(await p.evaluate(()=>__ECHO_CAMPUS__.diagnostics().gardenItems>0)); ok('campus event restores garden');
    await p.goto(base+'?debug=1&welcome=0&venue=venue-ab-canopy&view=event&camera=garden'); await ready(p,'venue-campus','event');
    assert.equal(new URL(p.url()).searchParams.get('camera'),'garden'); ok('legacy event link migrates to campus and keeps garden view');
    await snapshot(p,'legacy-garden');
    await p.goto(base+'?debug=1&welcome=0&venue=venue-ab-canopy&view=source'); await ready(p,'venue-ab-canopy','source');
    ok('explicit source link preserves canopy');
    await p.locator('[data-action="venue-view"][data-id="event"]').click(); await ready(p,'venue-ab-canopy','event');
    assert.equal(new URL(p.url()).searchParams.get('scope'),'building'); ok('source to event records explicit building intent');
    await p.reload(); await ready(p,'venue-ab-canopy','event'); ok('building event survives refresh');
    await p.locator('[data-action="demo"]').first().click();
    const links = await p.locator('.ec-panel a[href]').evaluateAll(els=>els.map(a=>a.href));
    const demoLinks=links.filter(u=>new URL(u).searchParams.has('persona')||new URL(u).searchParams.get('mode')==='stage');
    assert.equal(demoLinks.length,4,JSON.stringify(links));
    for(const url of demoLinks) assert.equal(new URL(url).searchParams.get('scope'),'building');
    ok('visible mobile and stage share links preserve building', {links:demoLinks});
    await p.locator('.ec-panel [data-action="close"]').first().click();
    await p.locator('[data-campus-return]').click(); await ready(p,'venue-campus','event');
    assert.equal(new URL(p.url()).searchParams.has('scope'),false);ok('return to campus clears building scope');
    await ctx.close();
    ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});p=await ctx.newPage();observe(p);
    await p.goto(base+'?debug=1&welcome=0&venue=venue-campus&view=event&camera=hero');await ready(p,'venue-campus','event');
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),390);ok('mobile has no horizontal overflow');
    await snapshot(p,'mobile-hero');
    await buttons(p,['towers','hub','commercial','aerial','arrival','garden','hero'],'mobile');
    await snapshot(p,'mobile-final');
    report.mobileDiagnostics=await p.evaluate(()=>__ECHO_CAMPUS__.diagnostics());
    await ctx.close();
    assert.deepEqual(report.errors,[]);
    if(report.failed.length) console.log('Requests requiring review: '+JSON.stringify(report.failed));
  } finally {fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await b.close();}
})().catch(e=>{report.failure=e.stack;fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});
