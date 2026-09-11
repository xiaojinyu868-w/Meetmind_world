const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
(async()=>{
  const out=process.env.LAB_EVIDENCE_DIR||path.join(require("node:os").tmpdir(),"meetmind-persistence-evidence");
  fs.mkdirSync(out,{recursive:true});
  const phase=process.env.PERSISTENCE_PHASE||"prepare";
  const browser=await chromium.launch({...process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{},headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1060},
      ...(phase==="resume"?{storageState:path.join(out,"browser-storage.json")}:{})});
    const page=await context.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto(process.env.LAB_URL||"http://127.0.0.1:4191/");
    await page.locator("#session-status").filter({hasText:"历史已保存"}).waitFor();
    const state=async()=>JSON.parse(await page.locator("#json").textContent());
    if(phase==="prepare"){
      await page.getByLabel("作品标题",{exact:true}).fill("重启后仍然属于我们的纸桥");
      await page.getByRole("button",{name:"保存纠正",exact:true}).click();
      await page.getByRole("heading",{name:"重启后仍然属于我们的纸桥",exact:true}).waitFor();
      await page.getByRole("button",{name:"生成视觉提案",exact:true}).click();
      await page.getByRole("button",{name:"应用这个提案",exact:true}).click();
      await page.getByRole("button",{name:"生成局部修改提案",exact:true}).click();
      await page.getByRole("button",{name:"应用这个提案",exact:true}).click();
      await page.locator("#sequence").filter({hasText:"事件 #11"}).waitFor();
      await page.locator('#entities [data-entity-id="action-1"]').click();
      await page.getByRole("button",{name:"我愿意参加",exact:true}).click();
      await page.getByLabel("现实结果说明",{exact:true}).fill("这是重启恢复的合成结果，不是真人实验。");
      await page.getByRole("button",{name:"自报已完成",exact:true}).click();
      await page.getByRole("button",{name:"撤回我的结果报告",exact:true}).waitFor();
      await page.getByLabel("查看身份",{exact:true}).selectOption("bo");
      await page.getByRole("button",{name:"这次不参加",exact:true}).click();
      await page.locator(".decision").filter({hasText:"阿博"}).filter({hasText:"这次不参加"}).waitFor();
      await page.getByLabel("呈现模式",{exact:true}).selectOption("2d");
      const expected=await state();
      fs.writeFileSync(path.join(out,"expected-state.json"),JSON.stringify(expected,null,2));
      await page.reload();
      await page.locator("#session-status").filter({hasText:"历史已保存"}).waitFor();
      assert.deepEqual(await state(),expected);
      assert.equal(await page.getByLabel("查看身份",{exact:true}).inputValue(),"bo");
      assert.equal(await page.getByLabel("呈现模式",{exact:true}).inputValue(),"2d");
      await context.storageState({path:path.join(out,"browser-storage.json")});
      fs.writeFileSync(path.join(out,"prepare.json"),JSON.stringify({errors,through:expected.basis.through_sequence,passed:["persist title recipe patch choices and outcome","reload preserves world and viewer/mode"]},null,2));
      console.log("PREPARED "+out);
    }else{
      const expected=JSON.parse(fs.readFileSync(path.join(out,"expected-state.json"),"utf8"));
      assert.deepEqual(await state(),expected);
      assert.equal(await page.getByLabel("查看身份",{exact:true}).inputValue(),"bo");
      await page.getByLabel("查看身份",{exact:true}).selectOption("alice");
      await page.locator('#entities [data-entity-id="artifact-1"]').click();
      await page.getByRole("heading",{name:"重启后仍然属于我们的纸桥",exact:true}).waitFor();
      await page.getByLabel("呈现模式",{exact:true}).selectOption("3d");
      await page.waitForFunction(()=>JSON.parse(document.querySelector("#diagnostic").textContent).objects.find(o=>o.id==="artifact-1").recipeParts===15);
      await page.screenshot({path:path.join(out,"desktop-restored.png"),fullPage:true});
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:path.join(out,"mobile-restored.png"),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const originalSession=await page.evaluate(()=>JSON.parse(localStorage.getItem("meetmind.lab.session.v1")).sessionId);
      await page.getByRole("button",{name:"新建独立实验",exact:true}).click();
      await page.locator("#sequence").filter({hasText:"事件 #8"}).waitFor();
      const newSession=await page.evaluate(()=>JSON.parse(localStorage.getItem("meetmind.lab.session.v1")).sessionId);
      assert.notEqual(newSession,originalSession);
      const old=await page.request.get(new URL("/lab-api/state?"+new URLSearchParams({session_id:originalSession,viewer:"bo"}),page.url()).href);
      assert.deepEqual(await old.json(),expected);
      await page.evaluate(()=>{
        localStorage.setItem("meetmind.lab.session.v1",JSON.stringify({sessionId:"ffffffffffffffffffffffffffffffff",viewer:"alice",mode:"3d"}));
      });
      await page.reload();
      await page.locator("#session-status").filter({hasText:"恢复失败"}).waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("meetmind.lab.session.v1")).sessionId),
        "ffffffffffffffffffffffffffffffff");
      assert.deepEqual(errors,[]);
      fs.writeFileSync(path.join(out,"report.json"),JSON.stringify({mode:"fixture-no-model",errors,passed:["separate server process restart","full state restored","viewer/mode restored","recipe and patch reconstructed","mobile no overflow","new experiment isolated; old data retained","missing session not silently replaced"]},null,2));
      console.log("RESTORED "+out);
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
