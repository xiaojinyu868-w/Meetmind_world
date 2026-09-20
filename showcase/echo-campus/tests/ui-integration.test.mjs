import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { Window } from "happy-dom";
import { WebSocket } from "ws";
import { createEventServer } from "../server/index.mjs";
import { EventClient } from "../src/runtime/EventClient.js";
import { resolveStartupVenue } from "../src/runtime/VenueCatalog.js";

const bundle = await build({
  stdin: { contents: 'export {AppUI} from "./src/ui/AppUI.js"; export {registerScene} from "./src/runtime/SceneRegistry.js";', resolveDir: new URL("..",import.meta.url).pathname, sourcefile:"ui-test-entry.mjs" },
  bundle: true, write: false, format: "esm", platform: "browser",
  loader: { ".css": "empty" }, logLevel: "silent",
});
const { AppUI, registerScene } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const A = {name:"测试林予",role:"AI 产品创始人",offer:"AI 产品研发、快速原型",need:"品牌设计、用户访谈",avatarColor:"#778879",consent:true};
const B = {name:"测试周澈",role:"品牌设计师",offer:"品牌设计、用户访谈",need:"AI 产品研发、快速原型",avatarColor:"#b98878",consent:true};
const nativeGlobals = Object.fromEntries(["window","document","location","localStorage","FormData","navigator","requestAnimationFrame"].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
function activate(win) {
  for (const [k,v] of Object.entries({window:win,document:win.document,location:win.location,localStorage:win.localStorage,FormData:win.FormData,navigator:win.navigator,requestAnimationFrame:fn=>setTimeout(fn,0)})) Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
}
function restore() {
  for(const [k,descriptor] of Object.entries(nativeGlobals)) if(descriptor) Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];
}
async function fixture(t) {
  const dir=mkdtempSync(join(tmpdir(),"echo-ui-"));
  const app=createEventServer({dataFile:join(dir,"event.json")});
  const address=await app.listen(0); const base="http://127.0.0.1:"+address.port+"/";
  const sessions=[];
  t.after(async()=>{
    for(const s of sessions){s.client.dispose();s.ui.dispose();await s.win.happyDOM.abort();}
    await app.close();rmSync(dir,{recursive:true,force:true});restore();
  });
  async function session(query="",callbacks={},sharedStorage=null) {
    const win=new Window({url:base+query});if(sharedStorage)Object.defineProperty(win,"localStorage",{value:sharedStorage,configurable:true});win.document.body.innerHTML='<canvas id="world"></canvas><div id="ui"></div>';
    activate(win);
    const client=new EventClient({baseUrl:base,storage:EventClient.storageFor(win.location.search,win),WebSocketImpl:WebSocket});
    const ui=new AppUI({client,...callbacks});
    client.addEventListener("snapshot",event=>ui.setSnapshot(event.detail));
    client.addEventListener("me",event=>ui.setMe(event.detail));
    client.addEventListener("status",event=>ui.setOnline(event.detail.online));
    const s={win,client,ui};sessions.push(s);await client.start();return s;
  }
  return {app,session};
}
function fillJoin(s,values) {
  activate(s.win);s.ui.openOnboarding();const form=s.ui.root.querySelector('[data-form="join"]');
  for(const key of ["name","role","offer","need"])form.elements[key].value=values[key];
  form.elements.consent.checked=values.consent;
  const radio=form.querySelector('input[name="avatarColor"][value="'+values.avatarColor+'"]');if(radio)radio.checked=true;
  return form;
}
async function submitJoin(s,values) {
  const form=fillJoin(s,values);
  await s.ui.onSubmit({target:form,preventDefault(){}});
  return form;
}

test("DOM + real server: onboarding, evidence recommendations, invitation, peer confirmation and persistent identity",async t=>{
  const {session}=await fixture(t);
  const a=await session(),b=await session();
  await submitJoin(a,A);await submitJoin(b,B);
  assert.equal(a.client.me.attendee.name,A.name);
  assert.equal(b.client.me.attendee.name,B.name);
  assert.notEqual(a.client.me.attendee.id,b.client.me.attendee.id);
  assert.ok(a.win.localStorage.getItem("echo-campus-token"));
  activate(a.win);await a.client.refreshMe();
  a.ui.setSnapshot(await a.client.request("event"));
  await a.ui.openMatches();
  const matchText=a.ui.root.querySelector(".ec-match-list").textContent;
  assert.ok(matchText.includes(B.name));
  assert.ok(matchText.includes("品牌设计"));
  const evidence=a.ui.root.querySelector(".ec-match-evidence");
  assert.ok(evidence);assert.ok(evidence.textContent.includes("你的"));assert.ok(evidence.textContent.includes("TA 的"));
  assert.equal(matchText.includes("undefined"),false);
  a.ui.setSelectedPerson(b.client.me.attendee);
  const requestButton=a.ui.root.querySelector('[data-action="encounter"]');
  assert.ok(requestButton);
  await a.ui.requestEncounter(b.client.me.attendee.id,requestButton);
  assert.ok(a.ui.root.textContent.includes("等待对方确认"));
  activate(b.win);await b.ui.openInbox();
  const confirm=b.ui.root.querySelector('[data-action="confirm"]');
  assert.ok(confirm,"real pending request is rendered for recipient");
  await b.ui.confirmEncounter(confirm.dataset.id,confirm);
  assert.ok(b.ui.root.textContent.includes("已确认"));
  activate(a.win);await a.client.refreshMe();
  a.ui.setSnapshot(await a.client.request("event"));
  const connection=a.ui.snapshot.connections.find(c=>c.fromId===a.client.me.attendee.id&&c.toId===b.client.me.attendee.id);
  assert.equal(connection.status,"confirmed");
  a.ui.setSelectedPerson(b.client.me.attendee);
  assert.ok(a.ui.root.querySelector(".ec-confirmed"));
  assert.equal(a.ui.root.querySelector('[data-action="encounter"]'),null);
  const token=a.client.token;await a.client.refreshMe();assert.equal(a.client.token,token);
});

test("one-laptop visitor mode isolates identity, survives refresh and completes an encounter",async t=>{
  const {session}=await fixture(t);
  const a=await session();await submitJoin(a,A);
  const normalToken=a.client.token;
  const b=await session("?entry=nfc&persona=02&demoSession=tab",{},a.win.localStorage);
  assert.equal(b.client.token,"");assert.equal(b.client.me,null);
  await submitJoin(b,B);
  assert.notEqual(b.client.me.attendee.id,a.client.me.attendee.id);
  assert.equal(a.win.localStorage.getItem("echo-campus-token"),normalToken);
  assert.equal(b.win.sessionStorage.getItem("echo-campus-token"),b.client.token);
  const resumed=new EventClient({baseUrl:b.client.baseUrl,storage:EventClient.storageFor(b.win.location.search,b.win),WebSocketImpl:null});
  t.after(()=>resumed.dispose());await resumed.refreshMe();
  assert.equal(resumed.me.attendee.id,b.client.me.attendee.id);
  const ordinaryTab=await session("",{},a.win.localStorage);
  assert.equal(ordinaryTab.client.me.attendee.id,a.client.me.attendee.id);
  await a.client.encounter(b.client.me.attendee.id);
  await b.client.refreshMe();const incoming=b.client.me.encounters.find(item=>item.canConfirm);
  assert.ok(incoming);await b.client.confirm(incoming.id);await a.client.refreshMe();
  assert.ok(a.client.me.encounters.some(item=>item.id===incoming.id&&item.status==="confirmed"));
});

test("DOM validation requires explicit consent, recovers submit button after error and prevents duplicate input",async t=>{
  const {session}=await fixture(t);const a=await session();
  const noConsent=fillJoin(a,{...A,consent:false});
  await a.ui.onSubmit({target:noConsent,preventDefault(){}});
  assert.equal(a.client.me,null);
  const form=fillJoin(a,{...A,name:"<invalid>"});
  await a.ui.onSubmit({target:form,preventDefault(){}});
  assert.equal(form.querySelector(".ec-form-error").hidden,false);
  assert.equal(form.querySelector('[type="submit"]').disabled,false);
  assert.equal(a.client.me,null);
  form.elements.name.value=A.name;
  await a.ui.onSubmit({target:form,preventDefault(){}});
  assert.equal(a.client.me.attendee.name,A.name);
});

test("fresh persona links stay reusable and preserve private badge path compatibility",async t=>{
  const {session}=await fixture(t);const a=await session("?entry=nfc&persona=02");
  activate(a.win);a.ui.openOnboarding();
  assert.equal(a.ui.root.querySelector('[name="name"]').value,"");
  assert.equal(a.ui.root.querySelector('[name="badgeId"]').value,"");
  const first=new URL(a.ui.demoUrl("01")),second=new URL(a.ui.demoUrl("02"));
  assert.equal(first.searchParams.get("entry"),"nfc");
  assert.equal(second.searchParams.get("persona"),"02");
  assert.equal(first.searchParams.has("badge"),false);
  assert.equal(first.searchParams.has("code"),false);
  const badge=await session("?badge=demo-visitor-01&code=ECHO-DEMO-01");
  activate(badge.win);badge.ui.openOnboarding();
  assert.equal(badge.ui.root.querySelector('[name="badgeId"]').value,"demo-visitor-01");
});

test("late recommendation failure cannot overwrite a newer successful panel",async t=>{
  const {session}=await fixture(t);const a=await session();await submitJoin(a,A);activate(a.win);
  let rejectOld;let calls=0;
  a.client.matches=()=>{calls++;return calls===1?new Promise((_resolve,reject)=>{rejectOld=reject;}):Promise.resolve({matches:[]});};
  const old=a.ui.openMatches();await a.ui.openMatches();const successful=a.ui.root.querySelector(".ec-panel").innerHTML;
  rejectOld(new Error("old request failed"));await old;
  assert.equal(a.ui.root.querySelector(".ec-panel").innerHTML,successful);
});

test("profile refresh uses new own name and avoids stale selected-person DTO",async t=>{
  const {session}=await fixture(t);const a=await session();await submitJoin(a,A);activate(a.win);
  a.ui.setSelectedPerson(a.client.me.attendee);
  const updated={...a.client.me,attendee:{...a.client.me.attendee,name:"更新后的林予"},version:a.client.me.version+1};
  a.ui.setMe(updated);
  assert.equal(a.ui.root.querySelector(".ec-person-header h2").textContent,"更新后的林予");
});

test("scene import failure preserves panel, clears busy state and does not issue a success toast",async t=>{
  const {session}=await fixture(t);
  const a=await session("",{onImport:async()=>{throw new Error("SPZ 数据无效");}});
  activate(a.win);a.ui.openScenePanel();
  const input=a.ui.root.querySelector("[data-manifest-url]");input.value="https://example.com/model.spz";a.ui.updateManifestFromControls();
  const button=a.ui.root.querySelector('[data-action="apply-manifest"]');await a.ui.applyManifest(button);
  assert.equal(a.ui.panel,"scenes");assert.equal(button.disabled,false);
  assert.equal(a.ui.root.querySelector(".ec-busy").hidden,true);
  assert.ok(a.ui.root.querySelector("[data-scene-error]").textContent.includes("SPZ 数据无效"));
  assert.equal(a.ui.root.textContent.includes("场景已替换，相遇继续"),false);
});

test("scene URL and name input events apply immediately without blur",async t=>{
  const {session}=await fixture(t);let received;
  const a=await session("",{onImport:async payload=>{received=payload;}});
  activate(a.win);a.ui.openScenePanel();
  const input=a.ui.root.querySelector("[data-manifest-url]");
  input.value="./scenes/import-test.glb";
  input.dispatchEvent(new a.win.Event("input",{bubbles:true}));
  const name=a.ui.root.querySelector("[data-manifest-name]");
  name.value="即时输入的新场景";
  name.dispatchEvent(new a.win.Event("input",{bubbles:true}));
  await a.ui.onClick({target:a.ui.root.querySelector('[data-action="apply-manifest"]')});
  assert.ok(received,"input events must synchronize the manifest before Apply reads it");
  assert.equal(received.manifest.url,"./scenes/import-test.glb");
  assert.equal(received.manifest.name,"即时输入的新场景");
  assert.equal(a.ui.panel,null);
});

test("advanced scene JSON remains authoritative for save and apply",async t=>{
  const {session}=await fixture(t);let received;
  const a=await session("",{onImport:async payload=>{received=payload;}});
  activate(a.win);a.ui.openScenePanel();
  const input=a.ui.root.querySelector("[data-manifest-url]");
  input.value="./scenes/controls.glb";
  input.dispatchEvent(new a.win.Event("input",{bubbles:true}));
  const json=a.ui.root.querySelector("[data-manifest-json]");
  const advanced={...JSON.parse(json.value),name:"高级 JSON 场景",url:"./scenes/advanced.glb",scale:2};
  json.value=JSON.stringify(advanced);
  json.dispatchEvent(new a.win.Event("input",{bubbles:true}));
  a.ui.saveManifest(false);
  const saved=JSON.parse(a.win.localStorage.getItem("echo-campus-scene-manifest"));
  assert.equal(saved.url,advanced.url);
  assert.equal(saved.scale,2);
  await a.ui.onClick({target:a.ui.root.querySelector('[data-action="apply-manifest"]')});
  assert.equal(received.manifest.url,advanced.url);
  assert.equal(received.manifest.name,advanced.name);
  assert.equal(received.manifest.scale,2);
});

test("onboarding response does not steal a panel opened while submission is pending",async t=>{
  const {session}=await fixture(t);const a=await session();activate(a.win);
  let release;const original=a.client.join.bind(a.client);
  a.client.join=async data=>{await new Promise(resolve=>{release=resolve;});return original(data);};
  const form=fillJoin(a,A);const submitting=a.ui.onSubmit({target:form,preventDefault(){}});
  a.ui.openScenePanel();release();await submitting;
  assert.equal(a.ui.panel,"scenes");
  assert.ok(a.ui.root.querySelector("[data-manifest-json]"));
});

test("repeat submit during pending join creates one attendee and keeps submit state recoverable",async t=>{
  const {session}=await fixture(t);const a=await session();activate(a.win);
  let release;let calls=0;const original=a.client.join.bind(a.client);
  a.client.join=async data=>{calls++;await new Promise(resolve=>{release=resolve;});return original(data);};
  const form=fillJoin(a,A),button=form.querySelector('[type="submit"]');
  const first=a.ui.onSubmit({target:form,preventDefault(){}});
  assert.equal(button.disabled,true);
  await a.ui.onSubmit({target:form,preventDefault(){}});
  assert.equal(calls,1);
  release();await first;
  assert.equal(button.disabled,false);
  const event=await a.client.request("event");
  assert.equal(event.attendees.length,16);
});
test("late successful import does not close a different panel opened meanwhile",async t=>{
  const {session}=await fixture(t);let release;
  const a=await session("",{onImport:()=>new Promise(resolve=>{release=resolve;})});activate(a.win);
  a.ui.openScenePanel();a.ui.root.querySelector("[data-manifest-url]").value="https://example.com/model.glb";a.ui.updateManifestFromControls();
  const button=a.ui.root.querySelector('[data-action="apply-manifest"]'),pending=a.ui.applyManifest(button);
  a.ui.openOnboarding();release();await pending;
  assert.equal(a.ui.panel,"join");assert.ok(a.ui.root.querySelector('[data-form="join"]'));
  assert.equal(a.ui.root.querySelector(".ec-busy").hidden,true);
});

test("new registered scene appears in selector and dispatches its exact factory id",async t=>{
 const {session}=await fixture(t);
 registerScene({id:"custom-dom-test",displayName:"第三场景",helper:"新增试验空间",factory:()=>({})});
 const selected=[];const a=await session("",{onScene:id=>selected.push(id)});activate(a.win);
 a.ui.openScenePanel();const button=a.ui.root.querySelector('[data-action="scene"][data-id="custom-dom-test"]');
 assert.ok(button);assert.ok(button.textContent.includes("第三场景"));
 await a.ui.onClick({target:button});
 assert.deepEqual(selected,["custom-dom-test"]);
});

test("entry and stage URLs preserve only shared scene selection and strip capture/auth parameters",async t=>{
 const {session}=await fixture(t);
 const a=await session("?sceneManifest=./scenes/custom.json&scene=gallery&persona=02&code=private&badge=private&capture=1&debug=1&mode=stage&quality=low&demoSession=tab#camera");
 activate(a.win);
 for(const [serial,stage] of [["01",false],["02",false],[null,false],["01",true]]){
  const url=new URL(a.ui.demoUrl(serial,stage));
  assert.equal(url.searchParams.get("sceneManifest"),"./scenes/custom.json");
  assert.equal(url.searchParams.get("scene"),"gallery");
  for(const key of ["code","badge","capture","debug","quality","demoSession"])assert.equal(url.searchParams.has(key),false);
  assert.equal(url.hash,"");
  assert.equal(url.searchParams.get("mode"),stage?"stage":null);
  assert.equal(url.searchParams.get("persona"),stage?null:serial);
 }
});

test("NFC panel offers an isolated tab visitor without changing phone or stage links",async t=>{
 const {session}=await fixture(t);
 const a=await session("?scene=gallery&capture=1&demoSession=tab");activate(a.win);a.ui.openDemoPanel();
 const links=[...a.ui.root.querySelectorAll(".ec-demo-links a")];
 const visitor=links.find(link=>link.textContent.includes("同机演示：独立访客窗口"));
 assert.ok(visitor);assert.equal(visitor.target,"_blank");assert.equal(visitor.rel,"noopener");
 const url=new URL(visitor.href);assert.equal(url.searchParams.get("demoSession"),"tab");
 assert.equal(url.searchParams.get("entry"),"nfc");assert.equal(url.searchParams.get("persona"),"02");
 assert.equal(url.searchParams.get("scene"),"gallery");assert.equal(url.searchParams.has("capture"),false);
 for(const link of links.filter(link=>link!==visitor))assert.equal(new URL(link.href).searchParams.has("demoSession"),false);
 assert.ok(a.ui.root.textContent.includes("真实双端体验可用两部手机"));
});

test("successful import tolerates blocked browser preference storage",async t=>{
 const {session}=await fixture(t);
 const a=await session("",{onImport:async()=>{}});activate(a.win);
 a.ui.openScenePanel();a.ui.root.querySelector("[data-manifest-url]").value="https://example.com/model.glb";a.ui.updateManifestFromControls();
 Object.defineProperty(globalThis,"localStorage",{value:{setItem(){throw new Error("storage blocked");}},configurable:true,writable:true});
 await a.ui.applyManifest(a.ui.root.querySelector('[data-action="apply-manifest"]'));
 assert.equal(a.ui.panel,null);assert.ok(a.ui.root.textContent.includes("场景已替换，相遇继续"));
 assert.equal(a.ui.root.querySelector(".ec-busy").hidden,true);
});


test("source venue picker invokes real load and failure preserves prior scene label and controls",async t=>{
 const {session}=await fixture(t);const calls=[];
 const a=await session("",{onVenue:async id=>{calls.push(id);throw new Error("GLB 404");}});activate(a.win);
 a.ui.setSceneLabel("白庭校园");a.ui.openScenePanel();
 a.ui.root.querySelector(".ec-panel").scrollTop=240;a.ui.closePanel();a.ui.openScenePanel();assert.equal(a.ui.root.querySelector(".ec-panel").scrollTop,0);
 const button=a.ui.root.querySelector('[data-action="venue"][data-id="venue-c"]');
 assert.ok(button);assert.equal(a.ui.root.querySelectorAll('.ec-venue-card [data-action="venue"]').length,4);
 assert.equal(a.ui.root.querySelector('.ec-venue-card [data-action="venue"]').dataset.id,"venue-campus");
 assert.equal(a.ui.root.querySelectorAll('.ec-site-art').length,0,"no invented CSS buildings");
 await a.ui.onClick({target:button});
 assert.deepEqual(calls,["venue-c"]);assert.equal(a.ui.sceneLabel,"白庭校园");assert.equal(a.ui.panel,"scenes");assert.equal(button.disabled,false);
 assert.match(a.ui.root.querySelector('[data-venue-error]').textContent,/当前场景保留/);
 assert.ok(a.ui.root.querySelector('[data-venue-thumbnail]').getAttribute("src").includes("scenes/venue/"));
});
test("source/event control follows runtime visibility and direct NFC URLs retain venue",async t=>{
 const {session}=await fixture(t);const views=[];
 const a=await session("?venue=venue-c&view=source&camera=aerial&code=private",{onView:view=>views.push(view)});activate(a.win);
 a.ui.setVenueState({candidate:{id:"venue-c",source:"0831 Podium.3dm"},view:"source",eventReady:true});
 assert.ok(a.ui.root.classList.contains("ec-source-view"));
 const event=a.ui.root.querySelector('[data-action="venue-view"][data-id="event"]');
 assert.equal(event.disabled,false);await a.ui.onClick({target:event});assert.deepEqual(views,["event"]);
 a.ui.setVenueState({candidate:{id:"venue-c",source:"0831 Podium.3dm"},view:"event",eventReady:true});
 assert.equal(a.ui.root.classList.contains("ec-source-view"),false);
 const share=new URL(a.ui.demoUrl());assert.equal(share.searchParams.get("venue"),"venue-c");assert.equal(share.searchParams.get("camera"),"aerial");assert.equal(share.searchParams.has("code"),false);
 a.ui.setVenueState({candidate:{id:"venue-c",source:"0831 Podium.3dm"},view:"source",eventReady:false});assert.equal(event.disabled,true);
});


test("blank onboarding enters as guest only after consent and edits require fresh consent", async t => {
  const { session } = await fixture(t);
  const a = await session("?entry=nfc&persona=02");
  activate(a.win); a.ui.openOnboarding();
  const form = a.ui.root.querySelector('[data-form="join"]');
  for (const key of ["name", "role", "offer", "need", "organization", "contact", "bio"]) {
    assert.equal(form.elements[key].value, "", key + " starts empty");
    assert.equal(form.elements[key].required, false, key + " is optional");
  }
  assert.equal(form.elements.category.value, "guest");
  assert.equal(form.elements.publicContact.checked, false);
  assert.equal(form.elements.consent.checked, false);
  assert.equal(form.elements.consent.required, true);
  await a.ui.onSubmit({ target: form, preventDefault() {} });
  assert.equal(a.client.me, null);
  form.elements.consent.checked = true;
  await a.ui.onSubmit({ target: form, preventDefault() {} });
  assert.match(a.client.me.attendee.name, /^访客[0-9A-F]{6}$/);
  assert.equal(a.client.me.attendee.role, "来宾");
  await a.ui.openMatches();
  assert.ok(a.ui.root.querySelector(".ec-empty-state"));
  assert.equal(a.ui.root.querySelectorAll(".ec-match-card").length, 0);
  a.ui.openOnboarding();
  const update = a.ui.root.querySelector('[data-form="join"]');
  assert.equal(update.elements.consent.checked, false);
  update.elements.name.value = "自愿补充";
  await a.ui.onSubmit({ target: update, preventDefault() {} });
  assert.notEqual(a.client.me.attendee.name, "自愿补充");
  update.elements.consent.checked = true;
  await a.ui.onSubmit({ target: update, preventDefault() {} });
  assert.equal(a.client.me.attendee.name, "自愿补充");
});

test("campus navigation exposes every region, highlights cameras and returns from a single building",async t=>{
 const {session}=await fixture(t),venues=[],cameras=[];
 const a=await session("?venue=venue-campus&view=event",{onVenue:async(...args)=>venues.push(args),onCamera:id=>cameras.push(id)});activate(a.win);
 const campus={id:"venue-campus",source:"以原始工程坐标组合塔楼、T6主楼、HUB中庭及C地块"};
 a.ui.setVenueState({candidate:campus,view:"event",eventReady:true});
 assert.equal(a.ui.root.querySelector("[data-campus-regions]").hidden,false);
 assert.equal(a.ui.root.querySelector("[data-campus-return]").hidden,true);
 assert.deepEqual([...a.ui.root.querySelectorAll(".ec-camera-dock button")].map(b=>b.dataset.id),["hero","arrival","garden","aerial"]);
 for(const id of ["towers","hub","commercial"]){
  const button=a.ui.root.querySelector(`[data-campus-regions] [data-id="${id}"]`);await a.ui.onClick({target:button});
  assert.equal(button.getAttribute("aria-pressed"),"true");
  assert.equal(a.ui.root.querySelectorAll('.ec-camera-dock [aria-pressed="true"], [data-campus-regions] [aria-pressed="true"]').length,1);
 }
 assert.deepEqual(cameras,["towers","hub","commercial"]);
 a.ui.setCameraSelection("hero");assert.equal(a.ui.root.querySelector('.ec-camera-dock [data-id="hero"]').getAttribute("aria-pressed"),"true");
 a.ui.openScenePanel();const card=a.ui.root.querySelector('.ec-venue-card [data-id="venue-campus"]');await a.ui.onClick({target:card});
 assert.deepEqual(venues[0],["venue-campus",{view:"event",camera:"hero"}]);
 a.ui.setVenueState({candidate:{id:"venue-c",source:"C 地块"},view:"source",eventReady:true});
 assert.equal(a.ui.root.querySelector("[data-campus-regions]").hidden,true);
 const back=a.ui.root.querySelector("[data-campus-return]");assert.equal(back.hidden,false);await a.ui.onClick({target:back});
 assert.deepEqual(venues[1],["venue-campus",{view:"event",camera:"hero"}]);
 assert.equal(a.ui.root.querySelectorAll(".ec-camera-dock button").length,4);
});

test("single-building intent survives phone, stage, QR and isolated-tab share routes",async t=>{
 const {session}=await fixture(t);
 const a=await session("?venue=venue-ab-canopy&view=event&scope=building&camera=garden&code=private&capture=1");activate(a.win);
 const urls=[a.ui.demoUrl("01"),a.ui.demoUrl("02"),a.ui.demoUrl(null),a.ui.demoUrl("01",true),a.ui.tabDemoUrl()];
 a.ui.openDemoPanel();urls.push(...[...a.ui.root.querySelectorAll(".ec-demo-links a")].map(link=>link.href));
 for(const href of urls){
  const url=new URL(href);
  assert.equal(url.searchParams.get("scope"),"building");assert.equal(url.searchParams.get("view"),"event");assert.equal(url.searchParams.get("camera"),"garden");
  assert.equal(resolveStartupVenue(url.search),"venue-ab-canopy","each shared URL must reopen the same single building");
  assert.equal(url.searchParams.has("code"),false);assert.equal(url.searchParams.has("capture"),false);
 }
 for(const scope of ["internal-token","Building",""]){
  a.win.history.replaceState(null,"",`?venue=venue-ab-canopy&view=event&scope=${scope}&camera=garden`);
  const shared=new URL(a.ui.demoUrl());assert.equal(shared.searchParams.has("scope"),false,"only the supported building scope is shareable");
  assert.equal(resolveStartupVenue(shared.search),"venue-campus","unsupported scope cannot disable legacy campus migration");
 }
});
