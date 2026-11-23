import "./atlas.css";
import {
  Aperture, ArrowUpRight, AudioLines, BookOpen, Check, ChevronDown, Compass, Copy,
  Download, Feather, Flower2, Globe2, Landmark, Mail, Map, Menu, Navigation,
  Orbit, RotateCcw, Send, Telescope, VolumeX, Waves, X, createIcons
} from "lucide";
import { draftKey, freshDraft, journal, journalKey, persist, places, practice, restoreDraft, routes } from "./voyage.js";

const icons = {Aperture, ArrowUpRight, AudioLines, BookOpen, Check, ChevronDown, Compass, Copy,
  Download, Feather, Globe2, Map, Menu, Navigation, Orbit, RotateCcw, Send, Telescope, VolumeX, Waves, X,
  Sprout:Flower2, Lamp:Landmark, Mail};
const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const ink = value => String(value??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]));
const chart = {garden:"I",forum:"II",post:"III"};
const base = import.meta.env.BASE_URL;
const $ = selector => document.querySelector(selector);
let draft=restoreDraft(), page=null, entry=null, harbor=null, panorama=false, busy=false, sound=null;
let announceTimer, storageWarning=false, sailingEntry=null;
document.body.dataset.view="atlas";
document.body.innerHTML=`
<main id="night-atlas">
  <div class="sky" aria-hidden="true"><div class="star-chart"></div><div class="chart-orbit"></div></div>
  <div id="harbor" aria-label="夜航群岛三维微缩场景"></div>
  <div class="harbor-labels">${Object.entries(places).map(([id,p])=>`<button class="map-pin" data-place="${id}" aria-label="前往${p.name}"><b></b><span>${p.name}</span></button>`).join("")}</div>
  <div class="letter-stars" aria-label="已封存的来信"></div>
  <header class="masthead">
    <button class="brand" data-action="home" aria-label="EchoWorld 群岛首页"><span class="brand-orbit" aria-hidden="true"><i></i></span><b>EchoWorld</b></button>
    <div class="mast-actions"><button class="log-button" data-action="journal">${icon("book-open")}<span>航海日志</span><small id="letter-count"></small></button>
      <span class="mast-rule"></span><button class="plain-icon" data-action="menu" aria-label="更多场所" title="更多场所">${icon("menu")}</button></div>
  </header>
  <section class="cover" aria-label="夜航群岛">
    <div class="cover-kicker"><i></i> THE NIGHT ATLAS</div>
    <h1>夜航群岛<span class="title-star" aria-hidden="true">✦</span></h1>
    <p>为下一次见面，<br>练习一句真正想说的话。</p>
    <button class="depart" data-action="depart">${icon("navigation")}<strong id="depart-label">开始夜航</strong></button>
  </section>
  <div class="view-tools" aria-label="场景工具">
    <button data-action="panorama" class="sea-tool" aria-label="纯观景模式" title="纯观景">${icon("aperture")}<span>观景</span></button>
    <button data-action="sound" class="sea-tool" aria-label="开启海岛环境音" title="海岛环境音" aria-pressed="false">${icon("volume-x")}<span>环境音</span></button>
  </div>
  <footer class="dock">
    <div class="dock-line"><span class="route-label">${icon("compass")} 群岛航线</span><span class="gesture">${icon("orbit")} 拖动环看 <i>·</i> 点选登岛</span></div>
    <nav class="stops" aria-label="岛上场所">${Object.entries(places).map(([id,p])=>`
      <button class="stop" data-place="${id}"><span class="place-seal seal-${id}">${icon(p.icon)}</span>
        <span class="stop-words"><strong>${p.name}</strong><small>${p.verb}</small></span><span class="stop-direction">${icon("arrow-up-right")}</span>
      </button>`).join("")}</nav>
  </footer>
  <button class="return-view" data-action="panorama">${icon("map")} 返回航线</button>
  <section class="sail-screen" aria-label="纸船启航"><small>回声邮局 · 信已启航</small><p id="sail-quote"></p>
    <div><button data-action="read-sailed">查看我的来信</button><button data-action="end-sail">返回群岛</button></div></section>
  <div id="atlas-toast" role="status" aria-live="polite"></div>
  <dialog class="folio" aria-labelledby="folio-title"><div class="folio-inner">
    <header class="folio-head"><span class="folio-code"></span><button class="sheet-close" data-action="close" aria-label="关闭面板">${icon("x")}</button></header>
    <div id="folio-content"></div>
  </div></dialog>
</main>`;

function drawIcons(){createIcons({icons,attrs:{"stroke-width":1.55}});}
function notify(msg) {
  const toast=$("#atlas-toast");
  ($(".folio").open ? $(".folio") : $("#night-atlas")).append(toast);
  toast.textContent=msg;toast.classList.add("on");
  clearTimeout(announceTimer);announceTimer=setTimeout(()=>toast.classList.remove("on"),3200);
}
function saveDraft(){
  if (!persist(draftKey,draft) && !storageWarning) {storageWarning=true;notify("浏览器当前无法保留草稿，可下载信笺留存。");}
}
function homeLabels() {
  $("#depart-label").textContent=(draft.goal||draft.gardenInput||draft.letterEdited)?"继续夜航":"开始夜航";
  const records=journal(),n=records.length;
  const sky=$(".letter-stars");
  sky.replaceChildren();
  for(const [i,letter] of records.slice(0,5).entries()){
    const star=document.createElement("button");
    star.type="button";star.dataset.skyLetter=letter.id;star.textContent="✦";
    star.title=letter.date+"的夜航来信";star.setAttribute("aria-label","阅读"+star.title);
    star.style.setProperty("--star-x",[43,49,54,59,65][i]+"%");
    star.style.setProperty("--star-y",[17,13,16,12,15][i]+"%");sky.append(star);
  }
  $("#letter-count").textContent=n || "";
}
function closeSheet(){
  if ($(".folio").open) $(".folio").close();
}
function closeState(){
  page=null;entry=null;document.body.classList.remove("panel-open");if(!sailingEntry)harbor?.focus(null);homeLabels();
}
$(".folio").addEventListener("close",closeState);
$(".folio").addEventListener("click",event=>{
  if(event.target!==event.currentTarget) return;
  const rect=event.currentTarget.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) closeSheet();
});

function visit(id) {
  if(sailingEntry)endSail();
  page=id;entry=null;if(panorama) setPanorama(false);
  document.body.classList.add("panel-open");
  harbor?.focus(Object.hasOwn(places,id)?id:null);
  render();
  if(!$(".folio").open) $(".folio").showModal();
  $(".folio-inner").scrollTop=0;
}
function heading(title,desc="") {
  return `<h2 id="folio-title" tabindex="-1">${ink(title)}</h2>${desc?`<p class="sheet-desc">${ink(desc)}</p>`:""}`;
}
function primary(action,label,ico="") {
  return `<button type="button" class="action-primary" data-action="${action}">${ico?icon(ico):""}${ink(label)}</button>`;
}
function renderGarden(){
  return heading(places.garden.name,places.garden.description)+`
  <form id="garden-form" class="space-form">
    <fieldset><legend>这次见面是为了</legend><div class="occasion-options">${Object.entries(routes).map(([id,r])=>`<label><input type="radio" name="occasion" value="${id}" ${(draft.gardenScenario||draft.scenario)===id?"checked":""}><span>${r.name}</span></label>`).join("")}</div></fieldset>
    <label for="goal">我想准备的事</label><textarea id="goal" maxlength="180" rows="3" required placeholder="例如，想请刚认识的设计师试试我的纸模型。">${ink(draft.gardenInput??draft.goal)}</textarea>
    <button type="button" class="text-button example" data-action="example">${icon("feather")} 用一个示例</button>
    <button class="action-primary" type="submit">${icon("lamp")} 去灯塔试谈</button>
    <small class="privacy-note">发送练习时，目标和本次对话将交给 AI 处理。</small>
  </form>`;
}
function renderForum(){
  if(!draft.goal) return heading(places.forum.name,places.forum.description)+
    `<div class="empty-note">${icon("compass")}<p>先给这次见面定一个目标，搭档才能接住你的话。</p></div>`+primary("garden","去玻璃花房");
  const r=routes[draft.scenario], last=draft.turns.at(-1), count=draft.turns.length;
  const turnHTML=draft.turns.map(t=>`<div class="turn user"><small>我</small><p>${ink(t.said)}</p></div>
    <div class="turn partner"><small>${t.mode==="model"?"AI 练习搭档":"引导练习 · 预设回应"}</small><p>${ink(t.reply)}</p></div>`).join("");
  return heading(places.forum.name)+`<div class="session-meta"><span>${ink(r.role)} · 模拟练习</span><strong>${count} / 3 轮</strong></div>
    <details class="goal-details"><summary>本次见面目标</summary><p>${ink(draft.goal)}</p></details>
    <div class="turns"><div class="turn partner"><small>练习开场</small><p>${ink(r.opener)}</p></div>${turnHTML}</div>
    ${last?`<div class="coach"><small>表达提示</small><p>${ink(last.coach)}</p></div>`:""}
    ${count<3?`<form id="turn-form" class="space-form"><label for="said">你的回应</label>
      <textarea id="said" maxlength="360" rows="2" placeholder="像面对面一样，试着说一句……" required ${busy?"disabled":""}>${ink(draft.input)}</textarea>
      <button class="action-primary" type="submit" ${busy?"disabled":""}>${icon("send")}${busy?"正在等搭档回应…":"送出这句话"}</button>
    </form>`:primary("post","去邮局写信","mail")}
    ${count>0 && count<3?`<button class="secondary-flat" data-action="post">先把这句带到邮局</button>`:""}`;
}
function renderPost() {
  return heading(places.post.name,places.post.description)+`
    <form id="letter-form" class="space-form">
    ${draft.turns.length?`<fieldset><legend>从练习里挑一句原话</legend><div class="quote-options">${draft.turns.map((t,i)=>`<label>
      <input type="radio" name="quote" value="${i}" ${draft.quote===t.said?"checked":""}><span>${ink(t.said)}</span></label>`).join("")}</div></fieldset>`:""}
    <label for="message">我的来信</label><textarea id="message" rows="4" maxlength="650" required placeholder="想对下一次见面的那个人说什么？">${ink(draft.message)}</textarea>
    <label for="nextStep">我想发起的下一步</label><input id="nextStep" maxlength="260" value="${ink(draft.nextStep)}" placeholder="例如，周五发一份小样，请对方提一个问题。" required>
    <button class="action-primary" type="submit">${icon("mail")}封存这封信</button>
    <small class="privacy-note">保存到此浏览器的航海日志。是否寄给对方，由你决定。</small>
    </form>`;
}
function renderJournal(){
  const records=journal();
  if(entry) return heading("夜航来信")+`<article class="letter-paper"><div class="postmark">${icon("mail")} NIGHT POST</div>
    <small>${ink(entry.date)} · ${ink(entry.occasion)}</small>
    ${entry.opening?`<blockquote>${ink(entry.opening)}</blockquote>`:""}
    <p>${ink(entry.message)}</p><div class="letter-next"><small>下一步</small><p>${ink(entry.nextStep)}</p></div></article>
    <div class="letter-actions">${primary("download","下载明信片","download")}<button class="action-outline" data-action="copy">${icon("copy")}复制来信</button></div>
    <button class="secondary-flat" data-action="replay">重看纸船启航</button><button class="secondary-flat" data-action="journal">返回航海日志</button>`;
  return heading("航海日志",records.length?"保存在这台设备上的来信。":"这里会收好你每一次夜航带回的信。")+
    (records.length?`<ul class="log-list">${records.map(rec=>`<li><button data-letter="${ink(rec.id)}"><small>${ink(rec.date)} · ${ink(rec.occasion)}</small><b>${ink(rec.message)}</b></button>
    <button class="delete-letter" data-delete="${ink(rec.id)}" aria-label="移除这封信">移除</button></li>`).join("")}</ul>`:`<div class="empty-note">${icon("mail")}<p>还没有封存的来信。</p></div>`)+primary("new","开启一段新夜航","navigation");
}
function render() {
  if(!page)return;
  const p=places[page];
  $(".folio-code").innerHTML=p?`<span class="folio-sigil">${chart[page]}</span>${p.en}`:page==="journal"?"SHIP’S LOG":"WORLD DIRECTORY";
  $("#folio-content").innerHTML=page==="garden"?renderGarden():page==="forum"?renderForum():page==="post"?renderPost():page==="journal"?renderJournal():
    heading("更多场所")+`<div class="world-list"><a href="./encounter.html">${icon("compass")}<span><b>相遇之庭</b><small>活动现场 · 双人引荐</small></span></a>
      <a href="?world=hall">${icon("globe-2")}<span><b>关系集市</b><small>探索我的人物与关系</small></span></a>
      <a href="?world=cafe">${icon("lamp")}<span><b>熟人咖啡厅</b><small>漫游与多人圆桌</small></span></a>
      <a href="/me/">${icon("waves")}<span><b>我的浮岛</b><small>个人空间</small></span></a></div>`;
  drawIcons();
  if(page==="forum") {const turns=$(".turns");if(turns)turns.scrollTop=turns.scrollHeight;}
}
function startSail(record){
  sailingEntry=record;
  if(document.visibilityState==="hidden" || !harbor || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    visit("journal");entry=record;render();return;
  }
  closeSheet();document.body.classList.add("sailing");
  const line=record.opening || record.message;
  $("#sail-quote").textContent="“"+Array.from(line).slice(0,62).join("")+(Array.from(line).length>62?"…":"")+"”";
  harbor.launchLetter();$("[data-action=read-sailed]").focus();
}
function endSail(){
  sailingEntry=null;document.body.classList.remove("sailing");harbor?.stopLetter();harbor?.focus(null);
}
function setPanorama(value) {
  panorama=value;document.body.classList.toggle("panorama",value);harbor?.panorama(value);
  if(value)$(".return-view").focus();else $("[data-action=panorama]").focus();
}
const priorFocus=()=>draft.gardenInput!==undefined?"garden":draft.turns.length>=3||draft.letterEdited?"post":draft.goal?"forum":"garden";
document.addEventListener("click",async e=>{
  const target=e.target.closest("button");
  if(!target)return;
  if(target.dataset.place){visit(target.dataset.place);return;}
  if(target.dataset.skyLetter){
    visit("journal");entry=journal().find(record=>record.id===target.dataset.skyLetter);render();return;
  }
  if(target.dataset.letter){entry=journal().find(r=>r.id===target.dataset.letter);render();return;}
  if(target.dataset.delete){
    if(confirm("从本机的航海日志移除这封信？")) {
      if(persist(journalKey,journal().filter(r=>r.id!==target.dataset.delete))) {render();homeLabels();}
      else notify("移除未成功，请再试一次。");
    }
    return;
  }
  const action=target.dataset.action;
  if(["garden","forum","post","journal","menu"].includes(action)){visit(action);return;}
  switch(action) {
    case "read-sailed":{const rec=sailingEntry;visit("journal");entry=rec;render();break;}
    case "end-sail":endSail();$(".depart").focus();break;
    case "replay":startSail(entry);break;
    case "home": closeSheet();setPanorama(false);harbor?.focus(null);break;
    case "close":closeSheet();break;
    case "depart":visit(priorFocus());break;
    case "example":$("#goal").value=routes[$("input[name=occasion]:checked").value].goal;$("#goal").dispatchEvent(new Event("input",{bubbles:true}));$("#goal").focus();break;
    case "panorama":setPanorama(!panorama);break;
    case "sound":{
      if(!sound){sound = new Audio(base+"audio/evening-forest-ambience.mp3");sound.loop=true;sound.volume=.23;}
      try {if(sound.paused) await sound.play();else sound.pause();
        target.setAttribute("aria-pressed",String(!sound.paused));target.setAttribute("aria-label",sound.paused?"开启海岛环境音":"关闭海岛环境音");
        target.innerHTML=icon(sound.paused?"volume-x":"audio-lines")+"<span>环境音</span>";drawIcons();
      } catch {notify("当前设备未能播放环境音。");}break;
    }
    case "new":
      if(!draft.goal||journal().some(r=>r.id===draft.id)||confirm("开启新夜航会替换尚未封存的草稿，继续吗？")){
        draft=freshDraft();saveDraft();visit("garden");
      }break;
    case "download":{
      target.disabled=true;
      try{const {downloadPostcard}=await import("./Postcard.js");await downloadPostcard(entry);notify("明信片已准备下载。");}
      catch{notify("未能生成图片，可先复制来信。");}finally{target.disabled=false;}break;
    }
    case "copy":
      try{await navigator.clipboard.writeText(entry.message+"\n\n下一步 · "+entry.nextStep);notify("来信已复制。");}
      catch{notify("请长按或选中信纸上的文字复制。");}break;
  }
});
document.addEventListener("keydown",e=>{if(e.key==="Escape" && panorama)setPanorama(false);if(e.key==="Escape" && sailingEntry)endSail();});
document.addEventListener("input",e=>{
  if(e.target.id==="goal"){draft.gardenInput=e.target.value;saveDraft();}
  if(e.target.name==="occasion"){draft.gardenScenario=e.target.value;saveDraft();}
  if(e.target.id==="said"){draft.input=e.target.value;saveDraft();}
  if(e.target.id==="message"||e.target.id==="nextStep"){draft[e.target.id]=e.target.value;draft.letterEdited=true;saveDraft();}
  if(e.target.name==="quote"){draft.quote=draft.turns[Number(e.target.value)]?.said||"";saveDraft();}
});
document.addEventListener("submit",async e=>{
  e.preventDefault();
  if(e.target.id==="garden-form") {
    const goal=$("#goal").value.trim(),scenario=$("input[name=occasion]:checked").value;
    if(!goal){$("#goal").focus();return;}
    if(draft.goal && (draft.goal!==goal || draft.scenario!==scenario)){
      if((draft.turns.length||draft.letterEdited) && !confirm("更换目标会开始一份新草稿，继续吗？")) return;
      draft=freshDraft();
    }
    delete draft.gardenInput;delete draft.gardenScenario;draft.goal=goal;draft.scenario=scenario;saveDraft();visit("forum");return;
  }
  if(e.target.id==="turn-form") {
    if(busy || draft.turns.length>=3)return;
    const said=$("#said").value.trim();if(!said)return;
    const current=draft;current.input=said;saveDraft();busy=true;render();
    const result=await practice(current,said);
    busy=false;
    if(draft!==current){if(page==="forum")render();return;}
    current.turns.push({said,...result});current.input="";
    if(!current.quote)current.quote=said;
    if(!current.letterEdited){current.nextStep=result.nextStep;current.message=result.message;}
    saveDraft();if(page==="forum") render();return;
  }
  if(e.target.id==="letter-form") {
    const message=$("#message").value.trim(), nextStep=$("#nextStep").value.trim();
    if(!message||!nextStep){notify("请写下来信和下一步。");return;}
    const date=new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"short",day:"numeric"}).format(new Date());
    const rec={id:draft.id,title:"夜航来信",occasion:draft.goal?routes[draft.scenario].name:"岛上手记",opening:draft.quote,message,nextStep,date};
    const records=[rec,...journal().filter(r=>r.id!==rec.id)];
    if(!persist(journalKey,records)){notify("此浏览器未能保存，请下载明信片。");}
    draft.message=message;draft.nextStep=nextStep;draft.letterEdited=true;saveDraft();
    homeLabels();startSail(rec);
  }
});

function fallback(){
  $("#harbor").classList.add("still");
  $(".harbor-labels").hidden=true;
  $(".gesture").textContent="选择下方场所登岛";
}
const stars=$(".star-chart");
let seed=129;
for(let i=0;i<88;i++){
  seed=(1664525*seed+1013904223)>>>0;const x=seed/4294967296;
  seed=(1664525*seed+1013904223)>>>0;const y=seed/4294967296;
  const star=document.createElement("i");
  star.style.cssText=`left:${100*x}%;top:${92*y}%;opacity:${.20+(i%5)*.085};width:${i%11===0?2.2:1}px;height:${i%11===0?2.2:1}px`;
  stars.append(star);
}
homeLabels();drawIcons();
if(location.hash==="#garden"){
  visit("garden");
  try{
    const name=sessionStorage.getItem("echo-atlas:meeting-name");
    if(name){$("#goal").value="我想和"+name.slice(0,48)+"再见一面，聊聊";sessionStorage.removeItem("echo-atlas:meeting-name");}
  }catch{ /* No session storage on this device. */ }
}
$("#harbor").addEventListener("harbor-lost",fallback);
import("./Harbor.js").then(({createHarbor})=>{
  const markers=Object.fromEntries(Object.keys(places).map(id=>[id,$(".map-pin[data-place="+id+"]")]));
  harbor=createHarbor($("#harbor"),visit,markers);
  if(page&&Object.hasOwn(places,page))harbor.focus(page);
}).catch(error=>{console.warn("Night Atlas renderer unavailable",error);fallback();});
