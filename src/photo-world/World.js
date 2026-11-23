import './world.css';
import { createPairSession, LOGIN_TOKEN_KEY } from '../ui/pairLogin.js';
import { booths, boothNumber, bulletinText, connectWorldStream, sampleWork } from './Market.js';
import { icebreakerView } from './Icebreaker.js';
import { downloadKeepsake } from './Keepsake.js';

const $ = s => document.querySelector(s);
const base = import.meta.env.BASE_URL;
const api = base+'api/v1/photo-worlds';
const params = new URLSearchParams(location.search);
const id = params.get('album');
const sample = params.has('sample')&&!id;
const display = !!id&&params.get('display')==='1';
const screenSecret=display ? (new URLSearchParams(location.hash.slice(1)).get('stage')||sessionStorage.getItem('mm-stage-'+id)) : '';
if(display&&screenSecret){sessionStorage.setItem('mm-stage-'+id,screenSecret);history.replaceState(null,'',location.pathname+location.search);}
const home = !id && !sample;
const withSeat=!display && (id||sample) && /^\d+$/.test(params.get('with')||'')?Number(params.get('with')):null;
const place=withSeat!==null?'field':!home&&params.get('place')==='cafe'?'cafe':'hall';
let field=null;
function venueLink(target,seat=null){const u=new URL(location.href);u.hash='';u.searchParams.delete('with');u.searchParams.delete('place');if(target==='cafe')u.searchParams.set('place','cafe');if(target==='field')u.searchParams.set('with',String(seat));return u.href;}
const cache = 'meetmind.photo-world.v1';
let library;
try {library=JSON.parse(localStorage.getItem(cache)||'{}') || {};} catch {library={};}
function saveLibrary(){
  try {
    const prior=JSON.parse(localStorage.getItem(cache)||'{}')||{};
    for(const [wid,record] of Object.entries(library))prior[wid]={...prior[wid],...record};
    localStorage.setItem(cache,JSON.stringify(prior));
  }
  catch {notice('浏览器没有保存访问凭证。请保留这个页面。');}
}
const viaAccount=!!id&&!display&&params.get('account')==='1';
const loginToken=()=>localStorage.getItem(LOGIN_TOKEN_KEY)||'';
const creds = id&&!display&&!viaAccount ? (library[id] ||= {}) : {};
const invite = new URLSearchParams(location.hash.slice(1)).get('join');
if(id && invite){creds.invite=invite; saveLibrary();history.replaceState(null,'',location.pathname+location.search);}
const enc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const samplePhoto=base+'encounter/group.webp';
const kinds={meeting:'相遇',trip:'旅行',birthday:'生日',pet:'宠物',daily:'日常',project:'市集作品'};
const boxes=[{x:.17,y:.15,width:.15,height:.24},{x:.426,y:.18,width:.15,height:.24},{x:.685,y:.15,width:.15,height:.24}];
const example={id:'sample',title:'那天，在庭院',created:'2026-08-04',me:0,boxes,
  people:[['林舟','喜欢拍下旅途中的建筑。','#415c4a',-2.6,1.1],['陈禾','喜欢做蛋糕，也喜欢约朋友喝咖啡。','#be7460',1.8,.5],['顾宁','出门总带着一本小本子。','#455571',2.7,3.3]].map(([name,about,color,x,z],i)=>({seat:i,name,about,color,x,z,box:boxes[i],posture:'stand'})),
  moments:[{id:'first-meeting',seat:0,kind:'meeting',title:'庭院里的初见',happened:'2026-08-04',body:'第一次见面，我们在庭院门口拍下这张合照。',with_people:[1,2],has_photo:true},{id:'summer-trip',seat:2,kind:'trip',title:'一起走过的山路',happened:'2026-09-12',body:'走到半山腰时，三个人停下来等同一片云。',with_people:[0,1]} ,sampleWork],impressions:[],activity:[{kind:'exhibited',seat:0,created:'2026-08-05T09:00:00Z'}]};
let state=home||sample?structuredClone(example):null,photo=null,plaza=null,photoUrl='',dialogVersion=0;
if(sample){
  try{const old=sessionStorage.getItem('mm-sample-session.v1');if(old)state=JSON.parse(old);}catch{}
  state.people[state.me].place=place==='cafe'?'cafe':'hall';
}
let polling=false,moveSerial=Promise.resolve(),claimChoice=null,posting=false;
const spriteUrls=new Map();
const key = () => screenSecret || (viaAccount?loginToken():creds.member || creds.host || creds.invite) || '';
const newKey = () => [...crypto.getRandomValues(new Uint8Array(24))].map(v=>v.toString(16).padStart(2,'0')).join('');
async function request(path='',{method='GET',body,secret=key(),blob=false,headers:extra={}}={}){
  const headers={...extra};if(secret)headers.Authorization='Bearer '+secret;
  if(body && !(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body);}
  const result=await fetch(api+path,{method,headers,body,cache:'no-store'});
  if(!result.ok){let m;try{m=(await result.json()).detail;}catch{}
    throw new Error(typeof m==='string'?m:'请求未完成，请稍后重试');}
  return blob?result.blob():result.json();
}
function notice(text){const n=$('#world-status');if(!n)return;n.textContent=text;n.classList.add('show');clearTimeout(notice.timer);notice.timer=setTimeout(()=>n.classList.remove('show'),4100);}
const brand=`<a class="brand" href="${base}" aria-label="MeetMind World 首页"><span class="brand-symbol" aria-hidden="true">✺</span>MeetMind <i>World</i></a>`;
const venues=`<details class="venues"><summary>其他场所 <span>⌄</span></summary><div><a href="${base}?world=hall">关系集市</a><a href="${base}?world=cafe">熟人咖啡厅</a><a href="${base}encounter.html">相遇之庭 · 活动引荐</a><a href="/me/">我的浮岛</a></div></details>`;
document.body.className='photo-world '+(home?'home':'inside');
document.body.removeAttribute('data-view');
document.body.dataset.place=place;
document.body.innerHTML=`<header class="top">${brand}<nav>${display?'':'<button data-act="library">我的世界</button>'}${venues}</nav></header>
<main class="layout">
${home?`<article class="cover">
 <div class="pretitle"><span></span>一张合照 · 一个共同世界</div>
 <h1>让相遇<br><em>不止于相遇</em><b>。</b></h1>
 <p class="lead">从一张合照出发，和照片里的人住进同一个世界。后来一起经历的事，也会在这里留下来。</p>
 <div class="cover-actions"><button class="primary" data-act="create">用合照创建世界 <span>↗</span></button><a class="under" href="?sample=1">先逛逛示例 <span>→</span></a></div>
 <div class="photo-caption"><img src="${samplePhoto}" alt="庭院合照示例"><span><small>世界的第一张照片</small>那天，在庭院</span></div>
 </article>`:`<div class="room-heading"><div class="pretitle"><span></span>${sample?'可操作示例 · 虚构人物':display?'活动现场 · 只读大屏':'我们的合照世界'}</div><h1 id="room-title">正在打开世界…</h1><p id="room-info"></p><button hidden class="activity-line" data-act="bulletin"></button><button hidden class="claim-entry" data-act="claim">认领照片里的我</button></div>`}
<section class="theatre" aria-label="立体关系集市"><div class="sky"><div id="plaza" tabindex="0" aria-label="可拖动旋转的三维集市"></div></div>
${home?`<div class="stage-cap"><span><i></i> 关系集市</span><div class="stage-tools"><button data-act="light">看日光</button><small id="gesture">拖动旋转 · 滚动缩放</small></div></div>`:
`<div class="camera">${display?`<button data-act="screen-venue">${place==='cafe'?'看集市':'看咖啡厅'}</button>`:`<button data-act="venue">${place==='hall'?'进咖啡厅':'回集市'}</button>`}<button data-act="overview" title="广场全景">全景</button>${place==='field'?'<button data-act="pair-notes">两人记录</button>':`<button data-act="fire" title="围坐圆桌">${place==='cafe'?'圆桌':'篝火'}</button>`}<button data-act="light">看日光</button></div>`}
</section>
${home?'':`<nav hidden class="dock" aria-label="世界操作"><button data-act="roster">照片里的人</button><button data-act="moments">共同经历</button><button class="primary" data-act="add">＋ 留下经历</button><button data-act="invite">邀请朋友 ↗</button></nav>`}
</main><footer class="colophon"><span>MeetMind World</span><span>${home?'从真实相遇开始':'点选人物或物件 · 点地面走过去'}</span></footer>
<dialog id="sheet"><div class="sheet-top"><span class="sheet-brand">MeetMind World</span><button aria-label="关闭" data-act="close">×</button></div><div id="sheet-content"></div></dialog><div id="world-status" role="status" aria-live="polite"></div>`;
const sheet=$('#sheet'),content=$('#sheet-content');
let pairing=null;
function endPairing(){pairing?.stop();pairing=null;}
sheet.addEventListener('close',endPairing);
function openPanel(title,html){
  endPairing();++dialogVersion;posting=false;content.innerHTML=`<h2>${enc(title)}</h2>${html}<p class="form-error" role="alert"></p>`;
  if(!sheet.open)sheet.showModal();
  sheet.scrollTop=0;
}
function close(){if(posting)return;sheet.close();dialogVersion++;}
sheet.addEventListener('cancel',e=>{if(posting)e.preventDefault();});
sheet.addEventListener('click',e=>{if(e.target===sheet&&!posting){const r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
const errorLine=msg=>{const p=content.querySelector('.form-error');if(p)p.textContent=msg;};
function dateInput(){const n=new Date();return [n.getFullYear(),String(n.getMonth()+1).padStart(2,'0'),String(n.getDate()).padStart(2,'0')].join('-');}
function createPanel(){
  openPanel('从哪张合照开始？',`<p>选一张大家同意分享的照片。每个人用邀请链接找到自己，认领后才出现在广场。</p>
  <form id="create-form"><label>给世界起个名字<input name="title" maxlength="64" required placeholder="比如，那年夏天的我们"></label>
  <label class="file-slot">选择合照<input type="file" name="photo" accept="image/*,.heic,.heif" required></label>
  <label class="check"><input type="checkbox" name="consent" required value="true">我已获得照片中人物同意，可将合照用于人脸定位并展示给持有邀请链接的人。</label>
  <label class="check"><input type="checkbox" name="model_detection" value="true">使用百炼视觉模型辅助定位人脸，会把缩小的合照发送给该服务。也可以使用服务器本地检测或手动点选。</label>
  <button class="primary" type="submit">从合照开始 →</button></form>`);
}
function myWorld(){
  if(home||state?.me==null)return savedWorlds();
  openPanel('这个世界',`<p>${enc(state.title)} · ${state.people.length} 位成员 · ${state.moments.length} 段共同经历</p><div class="list"><button data-act="market">市集里的作品 <span>→</span></button><button data-act="bulletin">世界播报 <span>→</span></button><button data-act="souvenir">下载世界留影 <span>PNG ↧</span></button>${sample?'':`<button data-act="${viaAccount?'cloud-list':'bind-seat'}">${viaAccount?'账号里的世界':'把角色存到我的账号'} <span>→</span></button>`}<button data-act="all-worlds">我的其他世界 <span>→</span></button>${viaAccount?'<button data-act="unlink-seat">解除这个角色的账号关联 <span>→</span></button>':''}</div>`);
}
function pairLogin(next){
  openPanel('用微信打开个人世界',`<p>用微信扫一扫，再在手机上确认。已保存到账号的合照世界，可以在新设备上用原来的角色回来。</p><img class="account-qr" alt="微信登录二维码" hidden><p id="pair-status" role="status">正在准备二维码…</p><a class="under" id="pair-mobile" hidden target="_blank" rel="noopener">用这台手机确认 →</a>`);
  const version=dialogVersion;
  pairing=createPairSession({
    onChallenge(id){
      if(version!==dialogVersion||!sheet.open)return;
      const qr=$('.account-qr'),mobile=$('#pair-mobile');
      qr.src=base+'api/mobile/qr.png?pair='+encodeURIComponent(id);qr.hidden=false;
      mobile.href=base+'api/mobile/?pair='+encodeURIComponent(id);mobile.hidden=false;
    },
    onStatus(line){if(version===dialogVersion&&sheet.open)$('#pair-status').textContent=line;},
    onAuthorized(token){
      if(version!==dialogVersion||!sheet.open)return;
      localStorage.setItem(LOGIN_TOKEN_KEY,token);next().catch(err=>errorLine(err.message));
    }
  });
}
async function cloudLibrary(){
  if(!loginToken())return pairLogin(cloudLibrary);
  const result=await request('/library/mine',{secret:loginToken()}).catch(()=>{
    openPanel('账号暂时无法打开',`<p>请检查网络，或重新登录这个账号。</p><button class="secondary" data-act="relogin">重新登录</button>`);
  });
  if(!result)return;
  const rows=result.worlds.map(w=>`<a href="?album=${encodeURIComponent(w.id)}&account=1"><strong>${enc(w.title)}</strong><span>以 ${enc(w.name)} 回访 →</span></a>`).join('');
  openPanel('账号里的世界',`${rows?`<div class="list">${rows}</div>`:'<p>在认领过的世界里，打开「我的世界」，选择「把角色存到我的账号」。</p>'}<div class="list"><a href="${base}?world=hall">进入个人资料包与相遇采集 <span>→</span></a><a href="/me/">我的个人浮岛 <span>→</span></a></div>`);
}
async function bindSeat(){
  if(!loginToken())return pairLogin(bindSeat);
  await request('/'+id+'/library',{method:'PUT',secret:loginToken(),headers:{'X-World-Seat':creds.member}});
  return cloudLibrary();
}
function savedWorlds(){
  const rows=Object.entries(library).filter(([,v])=>v.title);
  openPanel('我的世界',rows.length?`<p>在这台设备上认领或创建的世界。</p><div class="list">${rows.reverse().map(([i,v])=>`<a href="?album=${encodeURIComponent(i)}"><strong>${enc(v.title)}</strong><span>回到世界 →</span></a>`).join('')}</div>`:`<p>你在这台设备上还没有认领过世界。可以上传合照，或者打开朋友发来的邀请。</p><button class="primary" data-act="create">用合照创建世界</button>`);
  content.insertAdjacentHTML('beforeend','<div class="list"><button data-act="cloud-list">从我的账号找回世界 <span>→</span></button></div>');
}
function update(){
  if(!state)return;
  if(sample){try{sessionStorage.setItem('mm-sample-session.v1',JSON.stringify(state));}catch{notice('浏览器暂时无法保存示例改动');}}
  if(sample&&field){
    field.moments=state.moments.filter(m=>(m.seat===state.me&&m.with_people?.includes(withSeat))||(m.seat===withSeat&&m.with_people?.includes(state.me))).map(m=>m.id);
  }
  if(display){$('#room-title').textContent=state.title;$('#room-info').textContent=state.people.length+' 位成员已认领';document.querySelector('.dock').hidden=true;}
  else if(!home){$('#room-title').textContent=place==='cafe'?state.title+' · 咖啡厅':place==='field'?(field?.scene.title||'关系场域'):state.title;$('#room-info').textContent=state.me===null?'找到合照里的自己，就能进入广场。':place==='field' ? `两个人的空间 · ${field?.moments.length||0} 段共同经历` : `${state.people.length} 位已认领 · ${state.moments.length} 段共同经历`;
    document.querySelector('.dock').hidden=state.me===null;document.querySelector('.claim-entry').hidden=state.me!==null;}
  const activityButton=$('.activity-line');
  if(activityButton){
    const latest=state.activity?.[0];
    activityButton.hidden=place==='field'||!latest;
    if(latest)activityButton.textContent=bulletinText(latest,state.people)+' ›';
  }
  if(place==='field')plaza?.setField?.(field);
  plaza?.update(state,photo,home);
  if($('#plaza').dataset.fallback==='true')return;
  if(!plaza||display||(!home&&state.me===null))return;
  for(const p of state.people){
    if(!p.name)continue;
    if(sample||home){plaza.portrait(p.seat,base+'photo-world/role-'+p.seat+'.webp');continue;}
    const version=p.portrait==='ready'?'generated':'local';
    const previous=spriteUrls.get(p.seat);
    if(previous?.version===version){
      if(previous.url)plaza.portrait(p.seat,previous.url);
      continue;
    }
    const record={version,url:null};
    spriteUrls.set(p.seat,record);
    request('/'+id+'/people/'+p.seat+'/portrait',{blob:true}).then(blob=>{
      if(spriteUrls.get(p.seat)!==record)return;
      record.url=URL.createObjectURL(blob);plaza.portrait(p.seat,record.url);
      if(previous?.url)URL.revokeObjectURL(previous.url);
    }).catch(()=>{if(spriteUrls.get(p.seat)===record)spriteUrls.delete(p.seat);});
  }
}
async function getPhoto(){
  photoUrl=sample||home?samplePhoto:URL.createObjectURL(await request('/'+id+'/photo',{blob:true}));
  const img=new Image();img.src=photoUrl;await img.decode();photo=img;update();
}
async function refresh(){state=await request('/'+id+(display?'/screen':''));if(!display&&!viaAccount&&creds.title!==state.title){creds.title=state.title;saveLibrary();}update();}
async function load(){
  if(!home&&!sample){
    if(viaAccount&&!loginToken()){pairLogin(async()=>location.reload());return;}
    if(!key())throw new Error('这个世界需要朋友发来的完整邀请链接。');
    await refresh();
  }
  if(place==='field'&&state.me!==null){
    if(sample){
      const answer=await fetch(base+'photo-world/demo-fields.json');
      field=(await answer.json())[withSeat];
      if(!field)throw new Error('请选择照片里的另一位朋友。');
    }else field=await request('/'+id+'/fields/'+withSeat);
  }
  if(id&&!display&&place!=='field'&&state.me!==null){
    const me=state.people.find(p=>p.seat===state.me);
    if(me&&(me.place||'hall')!==place){await move(0,place==='cafe'?3.7:-2.6);await refresh();}
  }
  update();if(display)return;await getPhoto();
  if(state.me===null)claimPanel();
}
function claimPanel(){
  claimChoice=null;
  const used=new Set(state.people.map(p=>p.seat));
  openPanel('哪一位是你？',`<p>点自己的脸框。没有框到时，直接点照片里自己的脸。</p>
  <div id="claim-image" class="claim-image"><img src="${enc(photoUrl)}" alt="用来认领角色的原始合照">${state.boxes.map((b,i)=>`<button type="button" data-seat="${i}" aria-label="认领第 ${i+1} 位" ${used.has(i)?'disabled':''} style="left:${b.x*100}%;top:${b.y*100}%;width:${b.width*100}%;height:${b.height*100}%"><span>${used.has(i)?'已认领':i+1}</span></button>`).join('')}</div>
  <form id="claim-form"><label>大家怎么称呼你<input required name="name" maxlength="40" autocomplete="given-name"></label><label>我想让大家知道 <small>选填 · 同世界成员可见</small><textarea name="about" maxlength="200" rows="2" placeholder="用自己的话介绍自己"></textarea></label>
  <button class="primary" type="submit">认领自己，走进广场 →</button></form>`);
}
function roster(){
  if(!state)return;if(state.me===null)return claimPanel();
  openPanel('照片里的人',`<img class="source-photo" src="${enc(photoUrl)}" alt="这个世界的第一张合照">${sample?'':'<button class="secondary" data-source="group">下载合照原件</button>'}<div class="list">${state.people.map(p=>`<button data-person="${p.seat}"><strong>${enc(p.name)}${p.seat===state.me?' · 我':''}</strong><span>走近看看 →</span></button>`).join('')}</div>`);
}
function person(seat){
  const p=state.people.find(p=>p.seat===seat);if(!p)return;
  plaza?.focus('p'+seat);
  const entries=state.impressions.filter(i=>i.subject===seat);
  openPanel(p.name,`<div class="person-head"><canvas id="portrait" width="160" height="160"></canvas><div><small>合照中的第 ${seat+1} 位</small><p>${enc(p.about||'这位朋友还没有写下自我介绍。')}</p></div></div>
  ${seat===state.me&&!sample?`<details class="own-settings"><summary>编辑自述、形象与 Agent</summary><form id="introduction-form"><label>我想让大家知道<textarea name="about" maxlength="200" rows="2">${enc(p.about)}</textarea></label><small>改动后，可以重新选择是否让圆桌引用。</small><button class="secondary">保存自述</button></form><p>当前体素角色从本人认领位置与衣着取色。也可以让图像模型绘制五个头部视角。</p><button class="secondary" data-act="draw" ${p.portrait==='ready'?'disabled':''}>${p.portrait==='ready'?'五面贴图已完成':p.portrait==='building'?'查看绘制状态':p.portrait==='unavailable'?'绘制暂未完成 · 重试':'绘制我的五面体素贴图'}</button><p>篝火主持人可引用你的自述生成提问。私下印象与照片不会传给圆桌模型。</p><button class="secondary" data-act="agent">${p.agent_enabled?'收回圆桌自述授权':'允许圆桌使用我的自述'}</button></details>`:''}
  ${seat!==state.me&&place!=='field'?`<a class="secondary" href="${enc(venueLink('field',seat))}">走进我与 TA 的关系场域 →</a>`:''}
  ${state.moments.filter(m=>m.seat===seat||(m.with_people||[]).includes(seat)).length?`<h3>一起留下的记录</h3><div class="list">${state.moments.filter(m=>m.seat===seat||(m.with_people||[]).includes(seat)).map(m=>`<button data-moment="${enc(m.id)}"><strong>${enc(m.title)}</strong><span>${enc(m.happened)}</span></button>`).join('')}</div>`:''}
  <h3>${seat===state.me?'我的自评与收到的印象':'我留给 TA 的印象'}</h3>
  ${entries.map(v=>`<blockquote>${enc(v.text)}<cite>${enc(state.people.find(w=>w.seat===v.author)?.name||'成员')} 写下的印象</cite></blockquote>`).join('')}
  <form id="impression-form" data-seat="${seat}"><label>${seat===state.me?'写给自己':'写给 '+enc(p.name)}<textarea name="text" required maxlength="300" rows="2"></textarea></label><small>只有作者和收件人可见。</small><button class="secondary">保存印象</button></form>`);
  if(photo&&p.box){const b=p.box;$('#portrait').getContext('2d').drawImage(photo,b.x*photo.naturalWidth,b.y*photo.naturalHeight,b.width*photo.naturalWidth,b.height*photo.naturalHeight,0,0,160,160);}
}
function moments(){
  const records=place==='field'?state.moments.filter(m=>field?.moments.includes(m.id)):state.moments;
  openPanel(place==='field'?'两人的共同经历':'共同经历',`${records.length?'':'<p>这里会留下你们亲手记录的第一件事。</p>'}<div class="list">${records.slice().reverse().map(v=>`<button data-moment="${enc(v.id)}"><strong>${enc(v.title)}</strong><span>${enc(v.happened)} · ${kinds[v.kind]}</span></button>`).join('')}</div><button class="primary" data-act="add">＋ 留下经历</button>`);
}
async function moment(mid){
  const v=state.moments.find(m=>m.id===mid);if(!v)return;
  plaza?.focus(mid);
  openPanel(v.title,`<p class="metadata">${enc(v.happened)} · ${kinds[v.kind]} · ${enc(state.people.find(p=>p.seat===v.seat)?.name)} 记录</p><p class="story">${enc(v.body||'留下了这一天。')}</p>${v.has_photo?'<img class="source-photo" id="moment-photo" alt="这段经历附带的照片">':''}<button class="secondary" data-act="close">在广场看这件物品</button>`);
  const version=dialogVersion;
  if(v.has_photo){const url=sample?(v.localPhoto||samplePhoto):URL.createObjectURL(await request('/'+id+'/moments/'+mid+'/photo',{blob:true}));
    if(version===dialogVersion){const img=$('#moment-photo');if(!sample)img.onload=()=>URL.revokeObjectURL(url);img.src=url;}else if(!sample)URL.revokeObjectURL(url);}
}
function fieldNotes(){
  if(!field)return;
  const generated=field.model!=='relationship-field-rules.v1';
  const moments=state.moments.filter(m=>field.moments.includes(m.id));
  openPanel('两人的共同经历',`<p>${enc(field.scene.metaphor)}。${enc(field.scene.parameters.weather)}。</p>
    <small>${generated?'模型演绎 · '+enc(field.model):'根据双方素材布置的规则场域'}</small>
    <div class="list">${moments.map(m=>`<button data-moment="${enc(m.id)}">${enc(m.title)} <span>${enc(m.happened)}</span></button>`).join('')}<button data-act="roster">回看最初的合照 →</button></div>
    ${sample?'':`<details class="record"><summary>让 AI 演绎这个空间</summary><p>双方分别同意后，可将彼此互写的印象、两人共同经历的标题和日期交给文本模型设计光色、天气和物件。原始照片保留在这里。</p><button class="secondary" data-act="field-consent">${field.my_permission?'收回我的授权':'允许引用我的这段资料'}</button><small>${field.permissions} / 2 人已授权</small>${field.permissions===2?'<button class="primary" data-act="interpret">生成空间诠释</button>':''}</details>`}`);
}
function market(slot=null){
  if(!state||state.me==null)return;
  const works=state.moments.filter(m=>m.kind==='project'&&(slot===null||boothNumber(m.seat)===slot));
  const own=slot===null||boothNumber(state.me)===slot;
  openPanel(slot===null?'市集里的作品':'街边作品摊',`<p>${works.length?'点开作品，看看制作者留下的照片和原话。':'这个摊位正在等第一件作品。'}</p><div class="list">${works.slice().reverse().map(m=>`<button data-moment="${enc(m.id)}"><strong>${enc(m.title)}</strong><span>${enc(state.people.find(p=>p.seat===m.seat)?.name)}</span></button>`).join('')}</div>${own?'<button class="primary" data-act="exhibit">展出我的作品 →</button>':''}${slot===null?'':' <button class="secondary" data-act="market">逛全部摊位</button>'}`);
}
function bulletin(){
  const events=state?.activity||[];
  openPanel('世界播报',events.length?`<ol class="bulletin">${events.map(e=>`<li><time>${enc(new Date(e.created).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))}</time>${enc(bulletinText(e,state.people))}</li>`).join('')}</ol>`:'<p>成员入场、展出作品或发起破冰后，会在这里留下一条记录。</p>');
}
function addPanel(kind='meeting'){
  openPanel(kind==='project'?'在市集展出作品':'把这段经历留在这里',`<form id="moment-form" data-mid="${newKey()}"><label>${kind==='project'?'作品名称':'发生了什么'}<input name="title" required maxlength="64" placeholder="比如，我们第一次一起过生日"></label>
  <div class="pair"><label>经历类型<select name="kind">${Object.entries(kinds).map(([k,t])=>`<option value="${k}" ${k===kind?'selected':''}>${t}</option>`).join('')}</select></label><label>发生日期<input type="date" name="happened" value="${dateInput()}" required></label></div>
  ${state.people.length>1?`<fieldset class="with-people"><legend>当时一起的人 · 选填</legend>${state.people.filter(p=>p.seat!==state.me).map(p=>`<label class="check"><input type="checkbox" name="with_people" value="${p.seat}" ${place==='field'&&p.seat===withSeat?'checked':''}>${enc(p.name)}</label>`).join('')}</fieldset>`:''}
  <label>你记得的细节<textarea name="body" rows="3" maxlength="1600" placeholder="写下当时的一件小事"></textarea></label>
  <label class="file-slot">附上一张现场照片 <small>选填</small><input name="photo" type="file" accept="image/*,.heic,.heif"></label>
  <small>${sample?'示例中的改动只保留到页面关闭。':'将显示给这个世界已认领的成员。'}</small><button class="primary">${kind==='project'?'放到我的摊位':'放进我们的世界'} →</button></form>`);
}
const sampleIce=[{id:'demo-ice',text:'第一次见面就聊起了手工蛋糕。',own:false,pick:null,votes:0,subject:1}];
async function ice(){
 const cards=sample?sampleIce:(await request('/'+id+'/ice')).cards;
 openPanel('印象速配',icebreakerView(state,cards,enc));
}
function fireside(){
  const mine=state.people.find(p=>p.seat===state.me);
  const rows=(state.discussions||[]).map(d=>`<details class="record"><summary>${enc(d.topic)}</summary><small>${d.method==='model'?'AI 主持提问 · 已核对自述原文':'已授权自述摘录 · 模型未生成提问'}</small>${d.turns.map(v=>`<blockquote>${enc(v.quote)}<cite>${enc(state.people.find(p=>p.seat===v.seat)?.name)} 的自述</cite></blockquote>${v.question?`<p>${enc(v.question)}</p>`:''}`).join('')}</details>`).join('');
  openPanel(place==='cafe'?'咖啡厅圆桌':'篝火圆桌',`<button class="secondary" data-act="ice">一起玩印象速配 →</button><p>你已在圆桌旁坐下。朋友可以在自己的设备上入座；主持人根据大家各自开放的自述，为这个议题准备有出处的问题。</p>
    ${sample?'<p>示例展示三个人的围坐位置。正式世界里，成员可以分别授权自己的自述。</p>':`<p>${state.people.filter(p=>p.agent_enabled).length} 位成员已开放自述。</p><button class="secondary" data-act="agent">${mine.agent_enabled?'收回我的圆桌授权':'允许主持人引用我的自述'}</button>
    <form id="campfire-form"><label>我们想一起聊什么<input name="topic" required minlength="2" maxlength="160" placeholder="比如，下次见面想一起做什么"></label><button class="primary">请主持人开场</button></form>`}${rows}`);
}
async function share(){
  if(sample)return openPanel('邀请照片里的朋友',`<p>你正在参观示例。用自己的合照创建世界后，就能把同一个广场发给照片里的人。</p><button class="primary" data-act="create">用合照创建世界</button>`);
  const invite=creds.invite||(await request('/'+id+'/invitations',{method:'POST'})).invite;
  const u=new URL(base,location.origin);u.searchParams.set('album',id);u.hash=new URLSearchParams({join:invite}).toString();
  openPanel('邀请照片里的朋友',`<p>把这个链接发给当时在场的人。打开就能看到合照，每个人各自认领自己的角色。</p><label>认领邀请<input readonly id="invite-link" value="${enc(u.href)}"></label><button class="primary" data-act="copy">复制邀请链接</button><details class="record"><summary>活动现场大屏</summary><p>展示称呼、位置、入场与圆桌等动态。照片、作品内容和私人印象仅在成员端展示。</p><button class="secondary" data-act="screen">生成只读大屏链接</button></details>`);
}
async function enterVenue(target){
  if(!state||state.me===null){if(!display&&photo)claimPanel();return;}
  const dest=target==='cafe'?{x:0,z:3.7}:{x:0,z:-2.6};
  if(!sample)await request('/'+id+'/presence',{method:'PUT',body:{...dest,posture:'stand',place:target}});
  else{Object.assign(state.people[state.me],dest,{place:target});sessionStorage.setItem('mm-sample-session.v1',JSON.stringify(state));}
  location.assign(venueLink(target));
}
async function move(x,z,posture='stand'){
  if(!state||display||state.me===null)return;
  const p=state.people.find(p=>p.seat===state.me);if(!p)return;
  Object.assign(p,{x,z,posture});update();
  if(!sample){moveSerial=moveSerial.catch(()=>{}).then(()=>request('/'+id+'/presence',{method:'PUT',body:{x,z,posture,place:place==='cafe'?'cafe':'hall'}}));await moveSerial;}
}
function sit(){
  if(place==='field')return;
  const a=state.me*2.399,r=place==='cafe'?1.59:2.35,z=place==='cafe'?0:2.5;
  return move(Math.cos(a)*r,z+Math.sin(a)*r,'sit');
}
document.addEventListener('click',async e=>{
  const el=e.target.closest('button, a, #claim-image');if(!el)return;
  try{
    if(el.matches('[data-seat]')||el.id==='claim-image'){
      const frame=$('#claim-image'),r=frame.getBoundingClientRect();
      frame.querySelectorAll('.selected').forEach(n=>n.classList.remove('selected'));
      frame.querySelector('.manual')?.remove();
      if(el.hasAttribute('data-seat')){claimChoice={seat:Number(el.dataset.seat)};el.classList.add('selected');}
      else{const x=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));claimChoice={x,y};const dots=document.createElement('i');dots.className='manual';dots.style.left=x*100+'%';dots.style.top=y*100+'%';frame.append(dots);}
      errorLine('');return;
    }
    if(el.dataset.source){const blob=await request('/'+id+'/sources/'+el.dataset.source,{blob:true});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=el.dataset.source+'-原始照片';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);return;}
    if(!state&&!home && ['fire','roster','add','moments','venue'].includes(el.dataset.act))return;
    if(el.dataset.person!==undefined)return person(Number(el.dataset.person));
    if(el.dataset.moment)return await moment(el.dataset.moment);
    switch(el.dataset.act){
      case 'screen-venue':location.assign(venueLink(place==='hall'?'cafe':'hall'));return;
      case 'unlink-seat':return openPanel('解除账号关联？',`<p>这个账号将无法在新设备恢复此角色。最初认领的设备仍可用原凭证回访。</p><button class="secondary" data-act="close">保留关联</button> <button class="primary" data-act="unlink-confirm">解除关联</button>`);
      case 'unlink-confirm':await request('/'+id+'/library',{method:'DELETE',secret:loginToken()});location.assign(base);return;
      case 'cloud-list':return await cloudLibrary();
      case 'bind-seat':return await bindSeat();
      case 'relogin':return pairLogin(cloudLibrary);
      case 'bulletin':return bulletin();
      case 'market':return market();
      case 'exhibit':return addPanel('project');
      case 'pair-notes':return fieldNotes();
      case 'field-consent':{await request('/'+id+'/fields/'+withSeat+'/consent',{method:'PUT',body:{consent:!field.my_permission}});field=await request('/'+id+'/fields/'+withSeat);update();return fieldNotes();}
      case 'interpret':{
        el.disabled=true;el.textContent='正在演绎…';const version=dialogVersion;
        try{await request('/'+id+'/fields/'+withSeat+'/interpret',{method:'POST'});field=await request('/'+id+'/fields/'+withSeat);update();if(sheet.open&&version===dialogVersion)fieldNotes();}
        catch(err){if(version===dialogVersion)errorLine(err.message);}
        finally{el.disabled=false;el.textContent='生成空间诠释';}
        return;
      }
      case 'ice':return await ice();
      case 'screen':{el.disabled=true;const version=dialogVersion;let data;try{data=await request('/'+id+'/screen',{method:'POST'});}finally{el.disabled=false;}if(version!==dialogVersion||!sheet.open)return;const u=new URL(base,location.origin);u.searchParams.set('album',id);u.searchParams.set('display','1');u.hash=new URLSearchParams({stage:data.key}).toString();return openPanel('活动现场大屏',`<label>只读链接<input readonly id="invite-link" value="${enc(u.href)}"></label><button class="primary" data-act="copy">复制大屏链接</button> <a class="secondary" href="${enc(u.href)}" target="_blank" rel="noopener">打开大屏</a>`);}
      case 'close':return close(); case 'create':return createPanel();case 'library':return myWorld();case 'all-worlds':return savedWorlds();
      case 'souvenir':await downloadKeepsake(state,photo,plaza);return notice('世界留影已生成');
      case 'light':if(plaza && !$('#plaza').dataset.fallback){const day=plaza.light();el.textContent=day?'看黄昏':'看日光';}return;
      case 'agent':{const version=dialogVersion;el.disabled=true;const me=state.people.find(p=>p.seat===state.me);await request('/'+id+'/agent-consent',{method:'PUT',body:{consent:!me.agent_enabled}}).finally(()=>{el.disabled=false;});await refresh();if(version===dialogVersion&&sheet.open){if(content.querySelector('#impression-form'))person(state.me);else fireside();}return;}
      case 'draw':{const me=state.people.find(p=>p.seat===state.me);if(me.portrait==='building')return notice('仍在绘制，可以先回广场');return openPanel('绘制我的形象',`<p>将本人认领位置的脸部裁图发送给 CommonStack，为同一体素模型绘制正面、背面、两侧与顶部贴图。绘制期间可以继续使用当前角色。</p><button class="primary" data-act="confirm-draw">同意并开始绘制</button>`);}
      case 'confirm-draw':{el.disabled=true;try{await request('/'+id+'/portrait',{method:'POST',body:{consent:true}});await refresh();close();notice('已提交形象绘制');}finally{el.disabled=false;}return;}
      case 'venue':return await enterVenue(place==='hall'?'cafe':'hall');
      case 'overview':return plaza?.overview();case 'fire':plaza?.fire();if(state?.me!=null){await sit();fireside();}return;
      case 'roster':return roster();case 'moments':return moments();case 'add':return addPanel();case 'invite':return await share();
      case 'claim':return claimPanel();
      case 'copy':{const input=$('#invite-link');input.select();try{await navigator.clipboard.writeText(input.value);notice('邀请链接已复制');}catch{notice('链接已选中，可以手动复制');}return;}
    }
  }catch(err){notice(err.message);}
});
document.addEventListener('submit',async e=>{
  e.preventDefault();if(posting)return;
  const form=e.target,fd=new FormData(form),submit=form.querySelector('button[type=submit],button.primary,button.secondary');
  const old=submit.textContent,version=dialogVersion;posting=true;submit.disabled=true;
  errorLine('');submit.textContent=form.id==='create-form'?'正在读取合照，寻找照片中的人…':'正在保存…';
  try{
    if(form.id==='create-form'){
      const result=await request('',{method:'POST',body:fd,secret:''});
      library[result.id]={host:result.host,invite:result.invite,title:fd.get('title')};saveLibrary();
      location.assign('?album='+encodeURIComponent(result.id));return;
    }
    if(form.id==='claim-form'){
      if(!claimChoice)throw new Error('请先在合照上点选自己。');
      creds.pending ||= newKey();saveLibrary();
      await request('/'+id+'/claim',{method:'POST',secret:creds.host||creds.invite,body:{...claimChoice,name:fd.get('name'),about:fd.get('about'),member_key:creds.pending}});
      creds.member=creds.pending;delete creds.pending;saveLibrary();await refresh();posting=false;close();plaza?.fire();notice('你已住进这个世界');return;
    }
    if(form.id==='moment-form'){
      fd.set('id',form.dataset.mid);const attachment=fd.get('photo');if(!attachment?.size)fd.delete('photo');
      if(sample){
        let attachmentPreview=null;
        if(attachment?.size){
          const bitmap=await createImageBitmap(attachment);
          const canvas=document.createElement('canvas');
          const scale=Math.min(1,850/Math.max(bitmap.width,bitmap.height));
          canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
          canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
          attachmentPreview=canvas.toDataURL('image/jpeg',.78);
        }
        if(fd.get('kind')==='project')(state.activity||=[]).unshift({kind:'exhibited',seat:state.me,created:new Date().toISOString()});
        state.moments.push({...Object.fromEntries(fd),seat:state.me,with_people:fd.getAll('with_people').map(Number),has_photo:!!attachment?.size,localPhoto:attachmentPreview});update();}
      else{await request('/'+id+'/moments',{method:'POST',body:fd});if(place==='field')field=await request('/'+id+'/fields/'+withSeat);await refresh();}
      posting=false;close();plaza?.focus(form.dataset.mid);notice('这段经历已留在广场');return;
    }
    if(form.id==='ice-form'){
      const data={subject:Number(fd.get('subject')),text:fd.get('text')};
      if(sample)sampleIce.unshift({...data,own:true,id:newKey(),pick:null,votes:0});
      else await request('/'+id+'/ice',{method:'POST',body:data});
      await ice();return;
    }
    if(form.dataset.iceVote){
      const seat=Number(fd.get('seat'));
      if(sample){const c=sampleIce.find(c=>c.id===form.dataset.iceVote);c.pick=seat;c.votes++;}
      else await request('/'+id+'/ice/'+form.dataset.iceVote+'/vote',{method:'PUT',body:{seat}});
      await ice();return;
    }
    if(form.id==='campfire-form'){
      await request('/'+id+'/campfire',{method:'POST',body:{topic:fd.get('topic')}});
      await refresh();fireside();return;
    }
    if(form.id==='introduction-form'){
      await request('/'+id+'/me/introduction',{method:'PUT',body:{about:fd.get('about')}});
      await refresh();person(state.me);notice('自述已保存');return;
    }
    if(form.id==='impression-form'){
      const seat=Number(form.dataset.seat),text=fd.get('text');
      if(sample){state.impressions=state.impressions.filter(i=>i.author!==state.me||i.subject!==seat);state.impressions.push({author:state.me,subject:seat,text});update();}
      else{await request('/'+id+'/people/'+seat+'/impression',{method:'PUT',body:{text}});await refresh();}
      person(seat);notice('印象已保存');return;
    }
  }catch(err){errorLine(err.message);}
  finally{if(version===dialogVersion){posting=false;submit.disabled=false;submit.textContent=old;}}
});
function pick(kind,item){if(display)return;
 if(kind==='booth')return market(Number(item));
 if(kind==='field'){if(item==='first-encounter')return roster();if(item==='echo-well')return person(withSeat);
   const entry=field.scene.entities.find(e=>e.id===item);return openPanel(entry.label,`<p>${enc(entry.detail)}</p><small>根据你们的合照、双方印象和记录中提及彼此的经历布置。</small><div class="list">${state.moments.filter(m=>field.moments.includes(m.id)).map(m=>`<button data-moment="${enc(m.id)}">${enc(m.title)} →</button>`).join('')}</div>`);}
 if(kind==='photo')return roster();if(kind==='person')person(Number(item.slice(1)));else moment(item).catch(e=>notice(e.message));}
document.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||sheet.open||home||display||state?.me==null||place!=='hall'||!['e','f'].includes(e.key.toLowerCase()))return;
  const me=state.people.find(p=>p.seat===state.me);
  const slot=booths.findIndex(b=>Math.hypot(b.x-me.x,b.z-me.z)<3.6);
  if(slot!==-1){e.preventDefault();market(slot);}
  else if(Math.hypot(me.x,me.z-2.5)<4){e.preventDefault();document.querySelector('[data-act=fire]')?.click();}
});
const loaded=load().catch(e=>{openPanel('暂时无法打开世界',`<p>${enc(e.message)}</p><a class="secondary" href="${base}">回到首页</a>`);});
import('./Plaza.js').then(async({mountPlaza})=>{if(place==='field')await loaded;return mountPlaza($('#plaza'),{pick,place,field,withSeat,workPhoto:async(m)=>{
    const url=sample||home?m.localPhoto:URL.createObjectURL(await request('/'+id+'/moments/'+m.id+'/photo',{blob:true}));
    try{const img=new Image();img.src=url;await img.decode();return img;}finally{if(!sample&&!home)URL.revokeObjectURL(url);}
  },walk:(x,z)=>move(x,z).catch(e=>notice(e.message))});}).then(p=>{plaza=p;update();if(!home&&!display&&place==='hall')plaza.fire();}).catch(()=>{
  $('#plaza').dataset.fallback='true';
  $('#plaza').dataset.place=place;
  if(!home)document.querySelector('.colophon span:last-child').textContent=display?'现场成员位置 · 平面视图':'平面视图 · 点选人物或物件';import('./Exhibit.js').then(({fallbackMap})=>{const map=fallbackMap($('#plaza'),pick,{place,field,withSeat,display});plaza={...map,fire(){},overview(){},focus(){},portrait(){},light(){return false;}};update();});const hint=$('#gesture');if(hint)hint.textContent='集市实景留影';document.querySelectorAll('[data-act=light]').forEach(b=>b.hidden=true);});

if(id){
  let stream=null,dirty=false,lastRead=0;
  const sync=async()=>{
    if(document.hidden||!state||!key())return;
    if(polling||posting){dirty=true;return;}
    polling=true;dirty=false;
    try{
      await moveSerial.catch(()=>{});await refresh();
      if(place==='field'&&state.me!==null){field=await request('/'+id+'/fields/'+withSeat);update();}
      lastRead=Date.now();
    }catch{notice('同步暂时中断，正在重连');}
    finally{polling=false;if(dirty&&!posting)queueMicrotask(sync);}
  };
  loaded.then(()=>{
    if(!state||!key())return;
    const path=new URL(api+'/'+id+'/stream',location.href);
    path.protocol=location.protocol==='https:'?'wss:':'ws:';
    stream=connectWorldStream(path,key,sync);
  });
  setInterval(()=>{if(dirty||Date.now()-lastRead>(stream?.connected()?19000:2600))sync();},1000);
}
