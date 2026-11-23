import './style.css';
import { makeStage } from './stage.js';

const $ = id => document.getElementById(id);
const api = import.meta.env.BASE_URL+'api/v0/encounter-studio';
const root = location.origin+location.pathname;
const sample = import.meta.env.BASE_URL+'encounter/group.webp';
const names = ['林舟','陈禾','顾宁'];
const defaultPoints = [[.24,.235],[.494,.30],[.759,.235]];
const demoNeed = '我手里有一台硬件样机，想找能先做二十件样件的工厂。';
let points=defaultPoints, picking=false, uploaded=false, stage=null, roster=[], current=null;
let requestBusy=false, qrUrl='', refreshTimer=null, sequence=0;
const content=$('content');
const photo=$('group-photo');
photo.src=sample;

function el(tag,text,cls) {
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(cls)node.className=cls;
  return node;
}
function button(text,handler,cls='primary') {
  const b=el('button',text,cls);
  b.type='button';b.addEventListener('click',handler);return b;
}
function link(text,href) {
  const a=el('a',text,'tiny-link');a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function notice(msg='') {$('notice').textContent=msg;$('notice').hidden=!msg;}
async function call(path,token,body,options={}) {
  const resp=await fetch(api+path,{method:body===undefined?'GET':'POST',cache:'no-store',signal:AbortSignal.timeout(45000),
    headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},
    body:body===undefined?undefined:JSON.stringify(body)});
  if(!resp.ok){let detail;try{detail=(await resp.json()).detail;}catch{}throw Error(typeof detail==='string'?detail:'连接未完成，请重试。');}
  return options.blob?resp.blob():resp.json();
}
async function run(fn,b) {
  if(requestBusy)return;
  requestBusy=true;notice();if(b)b.disabled=true;
  try{await fn();}catch(e){notice(e.name==='TimeoutError'?'现场网络响应较慢，请重试。':e.message);}
  finally{requestBusy=false;if(b)b.disabled=false;}
}
function header(kicker,title){content.replaceChildren(el('p',kicker,'small'),el('h3',title));}
function quote(label,value) {
  const box=el('div',undefined,'quote');box.append(el('strong',label),el('p',value));return box;
}
function lookupRole(){
  const [role,room,token]=location.hash.slice(1).split('/');
  return {role,room,token};
}
function saveRole(role,room,token) {
  history.replaceState(null,'',root+'#'+[role,room,token].filter(Boolean).join('/'));
}
function drawFaces() {
  if(!photo.complete||!photo.naturalWidth||points.length!==3)return [];
  return points.map(([x,y])=>{
    const size=Math.min(photo.naturalWidth,photo.naturalHeight)*.25;
    const cv=document.createElement('canvas');cv.width=cv.height=120;
    cv.getContext('2d').drawImage(photo,x*photo.naturalWidth-size/2,y*photo.naturalHeight-size/2,size,size,0,0,120,120);
    return cv;
  });
}
function resetPhoto() {
  points=defaultPoints;picking=false;uploaded=false;photo.src=sample;
  document.body.classList.remove('picking');$('calibrate').hidden=true;$('markers').replaceChildren();
  $('photo-caption').textContent='相遇之庭 · 来宾合照';$('photo-note').textContent='虚构演示人物';
  $('enter').disabled=false;$('file').value='';
}
$('reset-photo').onclick=resetPhoto;
$('file').onchange=async()=>{
  const file=$('file').files[0];if(!file)return;
  if(!['image/webp','image/png','image/jpeg'].includes(file.type)||file.size>12*1024*1024){notice('请选择 12 MB 以内的 JPG、PNG 或 WebP 合照。');return;}
  const url=URL.createObjectURL(file);
  try {
    const img=new Image();img.src=url;await img.decode();
    const scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight));
    const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(img.naturalWidth*scale));cv.height=Math.max(1,Math.round(img.naturalHeight*scale));
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);photo.src=cv.toDataURL('image/jpeg',.86);
    points=[];picking=true;uploaded=true;notice();document.body.classList.add('picking');
    $('calibrate').hidden=false;$('enter').disabled=true;$('markers').replaceChildren();
    $('photo-caption').textContent='指定三位演示角色';$('photo-note').textContent='照片仅在此设备处理';
    $('pick-hint').textContent='在合照上点选扮演林舟（硬件创业者）的人。';
  }catch{resetPhoto();notice('这张照片未能读取，请重新选择。');}finally{URL.revokeObjectURL(url);}
};
$('photo-wrap').onclick=e=>{
  if(!picking)return;
  const r=photo.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  if(x<0||x>1||y<0||y>1)return;
  const mark=el('span',names[points.length],'marker');mark.style.left=x*100+'%';mark.style.top=y*100+'%';$('markers').append(mark);points.push([x,y]);
  if(points.length===3){
    picking=false;$('enter').disabled=false;$('pick-hint').textContent='三个位置已选好，可以入场。';
  }else{$('pick-hint').textContent=points.length===1?'点选扮演陈禾（制造服务方）的人。':'点选扮演顾宁（用户研究员）的人。';}
};
async function roomView(projection=false) {
  $('welcome').hidden=true;$('calibrate').hidden=true;$('studio').hidden=false;
  $('panel').hidden=projection;$('room-grid').classList.toggle('stage-only',projection);
  if(!stage) {
    if(!uploaded)await photo.decode().catch(()=>{});
    stage=makeStage($('scene'),$('labels'),drawFaces());
  }
}
function updateStage(id,confirmed,caption) {
  stage?.update(id,confirmed);$('scene-caption').textContent=caption;
}
function startForm() {
  current=null;updateStage(null,false,'本场三位演示来宾');
  header('林舟 · 创业者席','你希望在会上找到谁？');
  const form=el('form'),label=el('label','这次参会的公开需求'),task=el('textarea');
  task.id='need';label.htmlFor='need';task.maxLength=180;task.required=true;task.value=demoNeed;
  const submit=el('button','寻找匹配来宾　→','primary');submit.type='submit';
  const wait=el('p','','meta');form.append(label,task,submit,wait);
  form.onsubmit=evt=>{
    evt.preventDefault();run(async()=>{
      wait.textContent='正在对照本场公开名片…';
      try{
        const result=await call('/sessions',null,{need:task.value});
        if(result.status==='no_match'){
          header('本场公开名片','暂未找到有依据的人选');
          content.append(quote('本次需求',result.need),el('p',result.method+' · 当前名片未提供足够依据。','meta'),button('调整需求',()=>{startForm();$('need').value=result.need;}));
          return;
        }
        saveRole('owner',result.id,result.owner);showRecord(result,'owner',result.owner);
      }finally{wait.textContent='';}
    },submit);
  };
  content.append(form);
  const details=el('details');details.append(el('summary','查看本场三张公开名片','tiny-link'));
  roster.forEach(p=>details.append(quote(p.name+' · '+p.role,p.offer)));
  content.append(details);
}
$('enter').onclick=()=>run(async()=>{
  const result=await call('/roster');roster=result.people;
  await roomView();startForm();window.scrollTo(0,0);
},$('enter'));

function downloadRecord(data) {
  const lines=['MeetMind World · 相遇之庭','演示场 · 已由双方确认的引荐记录','',
    '记录编号　'+data.id,'需求方　林舟 · 硬件创业者','资源方　'+data.candidate.name+' · '+data.candidate.role,
    '需求原文　'+data.need,'对方名片　'+data.candidate.offer,'推荐依据　'+data.quote,'研判方式　'+data.method,
    '提出时间　'+new Date(data.created).toLocaleString('zh-CN'),'确认时间　'+new Date(data.updated).toLocaleString('zh-CN'),
    '建议下一步　'+(data.candidate.id==='maker'?'交流样机规格、试产数量和排期。':'交流目标用户画像和试用安排。'),
    '本记录仅代表演示席位双方接受本次引荐。'];
  const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));
  const a=el('a');a.href=url;a.download='相遇之庭-引荐记录-'+data.id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function showRecord(data,role,token) {
  const version=++sequence;clearTimeout(refreshTimer);current=data;
  if(qrUrl){URL.revokeObjectURL(qrUrl);qrUrl='';}
  const candidate=data.candidate, confirmed=data.status==='confirmed',guest=role==='guest';
  const statuses={proposed:'找到一位值得聊的人',pending:guest?'你愿意接受这次引荐吗？':'等待对方接受引荐',confirmed:'你们的引荐已确认',declined:'对方已婉拒这次引荐'};
  header(guest?candidate.name+' · 受邀者席':'林舟 · 创业者席',statuses[data.status]);
  updateStage(data.status==='declined'?null:candidate.id,confirmed,confirmed?'双方已确认 · 1 条引荐':data.status==='declined'?'本次引荐已结束':'来宾个人视角 · 仅推荐对象高亮');
  const pairs=el('div',undefined,'pairs');
  pairs.append(quote('林舟 · 硬件创业者的需求',data.need),quote(candidate.name+' · '+candidate.role+'的供给',data.quote));
  content.append(pairs,el('p',data.method+'　·　用时 '+(data.elapsed_ms/1000).toFixed(2)+' 秒','meta'));
  const actions=el('div',undefined,'actions');content.append(actions);
  const act=async(action,b)=>run(async()=>{
    const updated=await call('/sessions/'+data.id+'/'+action,token,{});showRecord(updated,role,token);
  },b);
  if(data.status==='proposed'){
    actions.append(button('向'+candidate.name+'发起引荐',e=>act('invite',e.currentTarget)));
  }else if(data.status==='pending'&&guest){
    actions.append(button('接受引荐',e=>act('accept',e.currentTarget)),button('婉拒',e=>act('decline',e.currentTarget),'secondary'));
  }else if(data.status==='pending'&&!guest&&data.guest){
    const target=root+'#guest/'+data.id+'/'+data.guest;
    content.append(el('p','请让扮演'+candidate.name+'的搭档用另一台手机扫码，亲自决定是否接受。'));
    const qr=el('img',undefined,'qr');qr.alt='受邀者入口二维码';qr.hidden=true;content.append(qr);
    call('/qr/'+data.id,token,{page:root},{blob:true}).then(blob=>{
      if(version!==sequence)return;qrUrl=URL.createObjectURL(blob);qr.src=qrUrl;qr.hidden=false;
    }).catch(()=>{});
    content.append(link('打开受邀者入口',target));
  }else if(confirmed){
    content.append(el('p','记录 '+data.id+'　·　双方均可保存','meta'));
    actions.append(button('下载引荐记录',()=>downloadRecord(data)));
  }
  if(!guest){
    const stageLink=link('打开独立会场大屏',root+'#stage/'+data.id);
    stageLink.style.display='flex';content.append(stageLink);
  }
  if(data.status==='pending')poll(data,role,token,version);
  if(confirmed||data.status==='declined'){const home=el('a','返回入场页','tiny-link');home.href=root;content.append(home);}
}
function poll(data,role,token,version) {
  refreshTimer=setTimeout(async()=>{
    if(version!==sequence)return;
    try{
      const updated=await call('/sessions/'+data.id,token);
      if(version!==sequence)return;
      notice();
      if(updated.status!==data.status){showRecord(updated,role,token);return;}
    }catch(e){if(version===sequence)notice('同步暂缓。'+e.message);}
    if(version===sequence)poll(data,role,token,version);
  },2000);
}
async function projection(room) {
  await roomView(true);
  const read=async()=>{
    try{
      const state=await call('/stage/'+room);
      updateStage(state.candidate_id,state.confirmed,state.confirmed?'双方已确认 · 1 条引荐':'会场大屏 · 等待双方确认');notice();
      if(state.confirmed)return;
    }catch(e){notice(e.message);}
    refreshTimer=setTimeout(read,2000);
  };await read();
}
async function boot(){
  const {role,room,token}=lookupRole();
  if(role==='stage'&&room){await projection(room);return;}
  if((role==='guest'||role==='owner')&&token&&room){
    await roomView();
    try{const record=await call('/sessions/'+room,token);showRecord(record,record.role,token);}
    catch(e){header('相遇之庭','未能打开这次引荐');content.append(el('p',e.message));const a=el('a','重新入场','tiny-link');a.href=root;content.append(a);}
    return;
  }
  $('welcome').hidden=false;
}
window.addEventListener('hashchange',()=>location.reload());
boot().catch(e=>notice(e.message));
