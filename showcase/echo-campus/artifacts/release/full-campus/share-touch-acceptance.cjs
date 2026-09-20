const {chromium}=require('C:/Users/Li Hao/Documents/ChatGPT/meetmind_edu_gpt6/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:/Users/Li Hao/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
 const r={errors:[],checks:[]};
 try {
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});p.on('pageerror',e=>r.errors.push(e.message));
  await p.goto('https://capture.meetmind.online/echo-campus/?debug=1&welcome=0&venue=venue-ab-canopy&view=event&scope=building');
  await p.waitForFunction(()=>__ECHO_CAMPUS__?.diagnostics().venue==='venue-ab-canopy'&&document.documentElement.dataset.ready==='true',null,{timeout:150000});
  await p.locator('[data-action="demo"]').first().tap();
  r.links=await p.locator('.ec-demo-links a').evaluateAll(a=>a.map(v=>v.href));assert.equal(r.links.length,4);
  for(const u of r.links)assert.equal(new URL(u).searchParams.get('scope'),'building');
  assert.ok(r.links.some(u=>new URL(u).searchParams.get('mode')==='stage'));r.checks.push('All four rendered share links, including stage, preserve scope=building');
  await p.locator('.ec-panel [data-action="close"]').tap();await p.locator('[data-campus-return]').tap();
  await p.waitForFunction(()=>__ECHO_CAMPUS__?.diagnostics().venue==='venue-campus',null,{timeout:150000});
  for(const id of ['towers','hub','commercial','aerial','arrival','garden','hero']){
   const parent=['towers','hub','commercial'].includes(id)?'[data-campus-regions]':'.ec-camera-dock';
   const target=p.locator(parent+' [data-action="camera"][data-id="'+id+'"]');
   const before=await p.evaluate(()=>__ECHO_CAMPUS__.camera.position.toArray());await target.tap();await p.waitForTimeout(2200);
   const after=await p.evaluate(()=>__ECHO_CAMPUS__.camera.position.toArray());assert.ok(after.some((v,i)=>Math.abs(v-before[i])>.05));
   assert.equal(await target.getAttribute('aria-pressed'),'true');r.checks.push('touch '+id);console.log('PASS touch '+id);
  }
  const cdp=await p.context().newCDPSession(p);const before=await p.evaluate(()=>__ECHO_CAMPUS__.camera.position.toArray());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:450}]});
  for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160+i*13,y:450+i*5}]});await p.waitForTimeout(60);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(600);
  const after=await p.evaluate(()=>__ECHO_CAMPUS__.camera.position.toArray());assert.ok(after.some((v,i)=>Math.abs(v-before[i])>.05));r.checks.push('touch drag rotates the campus');
  assert.deepEqual(r.errors,[]);r.passed=true;
 }finally{fs.writeFileSync(__dirname+'/ui-acceptance/share-touch-report.json',JSON.stringify(r,null,2));await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
