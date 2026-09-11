const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
(async()=>{
 const out=process.env.LAB_EVIDENCE_DIR||path.join(require("node:os").tmpdir(),"meetmind-pair-evidence");
 fs.mkdirSync(out,{recursive:true});
 const base=process.env.LAB_URL||"http://127.0.0.1:4196/";
 const browser=await chromium.launch({...process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{},headless:true});
 try{
  const a=await browser.newContext({viewport:{width:1440,height:1060}}),b=await browser.newContext({viewport:{width:390,height:844}});
  const owner=await a.newPage(),guest=await b.newPage(),errors=[];
  for(const p of [owner,guest])p.on("pageerror",e=>errors.push(e.message));
  const state=async p=>JSON.parse(await p.locator("#json").textContent());
  await owner.goto(base);
  await owner.locator("#pair-status").filter({hasText:"小满"}).waitFor();
  assert.ok(await owner.locator("#viewer").isDisabled());
  assert.ok(await owner.locator(".replay").isHidden());
  await owner.getByRole("button",{name:"创建另一位参与者的加入链接",exact:true}).click();
  await owner.locator("#pair-link").waitFor({state:"visible"});
  const invitation=await owner.locator("#pair-link").inputValue();
  await guest.goto(invitation);
  await guest.getByRole("button",{name:"以阿博加入这个共同世界",exact:true}).waitFor();
  assert.equal(await guest.locator("#json").textContent(),"");
  await guest.getByRole("button",{name:"以阿博加入这个共同世界",exact:true}).click();
  await guest.locator("#pair-status").filter({hasText:"阿博"}).waitFor();
  assert.equal(new URL(guest.url()).hash,"");
  assert.ok(await guest.locator("#viewer").isDisabled());
  const aSession=await owner.evaluate(()=>JSON.parse(localStorage.getItem("meetmind.lab.session.v1")));
  const bSession=await guest.evaluate(()=>JSON.parse(localStorage.getItem("meetmind.lab.session.v1")));
  assert.equal(aSession.sessionId,bSession.sessionId);
  assert.notEqual(aSession.token,bSession.token);
  const inviteToken=new URLSearchParams(new URL(invitation).hash.slice(1)).get("join");
  assert.equal((await b.request.post(new URL("/lab-api/pair/join",base).href,{data:{invite:inviteToken}})).status(),403);
  assert.equal((await b.request.post(new URL("/lab-api/commands",base).href,{headers:{Authorization:"Bearer "+bSession.token},
   data:{viewer:"alice",command:"action.accepted",subject_id:"action-1",expected_sequence:8}})).status(),403);
  await owner.locator('#entities [data-entity-id="action-1"]').click();
  await owner.getByRole("button",{name:"我愿意参加",exact:true}).click();
  await owner.getByLabel("现实结果说明",{exact:true}).waitFor();
  await guest.locator('#entities [data-entity-id="action-1"]').click();
  await guest.locator(".decision").filter({hasText:"小满"}).filter({hasText:"愿意参加"}).waitFor({timeout:10000});
  await guest.getByRole("button",{name:"这次不参加",exact:true}).click();
  await owner.locator(".decision").filter({hasText:"阿博"}).filter({hasText:"这次不参加"}).waitFor({timeout:10000});
  await owner.getByLabel("现实结果说明",{exact:true}).fill("双端合成验收：我完成了，阿博没有参与。");
  await owner.getByRole("button",{name:"自报已完成",exact:true}).click();
  await guest.locator(".decision").filter({hasText:"小满"}).filter({hasText:"本人自报：已完成"}).waitFor({timeout:10000});
  const synced=await state(guest);
  assert.deepEqual(Object.keys(synced.entities.find(e=>e.id==="action-1").outcomes),["alice"]);
  await owner.locator(".import-panel summary").click();
  await owner.getByRole("button",{name:"载入合成签到示例",exact:true}).click();
  await owner.locator("#checkin-confirm").check();
  await owner.getByRole("button",{name:"确认并导入签到",exact:true}).click();
  await owner.waitForFunction(()=>JSON.parse(document.querySelector("#json").textContent).basis.through_sequence===12);
  await guest.waitForFunction(()=>JSON.parse(document.querySelector("#json").textContent).basis.through_sequence===12,undefined,{timeout:10000});
  assert.ok((await state(owner)).entities.some(e=>e.source));
  assert.ok(!(await state(guest)).entities.some(e=>e.source));
  await owner.screenshot({path:path.join(out,"owner.png"),fullPage:true,mask:[owner.locator("#pair-link")]});
  await guest.screenshot({path:path.join(out,"guest-mobile.png"),fullPage:true});
  assert.equal(await guest.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await guest.reload();
  await guest.locator("#pair-status").filter({hasText:"阿博"}).waitFor();
  assert.ok(!(await state(guest)).entities.some(e=>e.source));
  await guest.locator(".import-panel summary").click();
  await guest.getByLabel("签到记录 JSON",{exact:true}).focus();
  await owner.getByRole("button",{name:"撤销另一位参与者的访问",exact:true}).click();
  await guest.locator("#session-status").filter({hasText:"访问已失效"}).waitFor({timeout:10000});
  assert.equal(await guest.locator("#json").textContent(),"");
  assert.equal((await b.request.get(new URL("/lab-api/state",base).href,{headers:{Authorization:"Bearer "+bSession.token}})).status(),403);
  // Fault injection: a previous world's poll fails after a new world has connected.
  await guest.getByRole("button",{name:"新建独立实验",exact:true}).click();
  await guest.locator("#pair-status").filter({hasText:"小满"}).waitFor();
  await guest.locator(".import-panel summary").click();
  let releasePoll, sawPoll, sawLaterPoll, blockedOnce=false, released=false;
  const held=new Promise(resolve=>{sawPoll=resolve;});
  const release=new Promise(resolve=>{releasePoll=resolve;});
  const later=new Promise(resolve=>{sawLaterPoll=resolve;});
  await guest.route("**/lab-api/state?*",async route=>{
   if(!blockedOnce){
    blockedOnce=true;sawPoll();await release;
    released=true;
    await route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({error:"delayed old-session denial"})});
   }else{
    if(released)sawLaterPoll();
    await route.continue();
   }
  });
  await Promise.race([held,new Promise((_,reject)=>setTimeout(()=>reject(new Error("old poll did not start")),10000))]);
  const prior=await guest.evaluate(()=>JSON.parse(localStorage.getItem("meetmind.lab.session.v1")).sessionId);
  await guest.getByRole("button",{name:"新建独立实验",exact:true}).click();
  await guest.waitForFunction(old=>JSON.parse(localStorage.getItem("meetmind.lab.session.v1")).sessionId!==old,prior);
  releasePoll();
  await Promise.race([later,new Promise((_,reject)=>setTimeout(()=>reject(new Error("new world polling stopped")),10000))]);
  assert.ok((await state(guest)).entities.length>0);
  assert.ok(!(await guest.locator("#session-status").textContent()).includes("访问已失效"));
  await guest.unroute("**/lab-api/state?*");
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,"report.json"),JSON.stringify({mode:"synthetic-two-browser-no-model",errors,passed:["explicit one-use join","server bound roles","forged role denied","separate browser contexts","choices/outcome synced","private record filtered","mobile layout","role survives reload","revocation clears guest view and blocks requests","late old-session denial preserves new world and polling"],synced},null,2));
  console.log(out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
