var e={xmlns:`http://www.w3.org/2000/svg`,width:24,height:24,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":2,"stroke-linecap":`round`,"stroke-linejoin":`round`},t=([e,n,r])=>{let i=document.createElementNS(`http://www.w3.org/2000/svg`,e);return Object.keys(n).forEach(e=>{i.setAttribute(e,String(n[e]))}),r?.length&&r.forEach(e=>{let n=t(e);i.appendChild(n)}),i},n=(n,r={})=>t([`svg`,{...e,...r},n]),r=e=>{for(let t in e)if(t.startsWith(`aria-`)||t===`role`||t===`title`)return!0;return!1},i=(...e)=>e.filter((e,t,n)=>!!e&&e.trim()!==``&&n.indexOf(e)===t).join(` `).trim(),a=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,t,n)=>n?n.toUpperCase():t.toLowerCase()),o=e=>{let t=a(e);return t.charAt(0).toUpperCase()+t.slice(1)},s=e=>Array.from(e.attributes).reduce((e,t)=>(e[t.name]=t.value,e),{}),c=e=>typeof e==`string`?e:!e||!e.class?``:e.class&&typeof e.class==`string`?e.class.split(` `):e.class&&Array.isArray(e.class)?e.class:``,l=(t,{nameAttr:a,icons:l,attrs:u})=>{let d=t.getAttribute(a);if(d==null)return;let f=l[o(d)];if(!f)return console.warn(`${t.outerHTML} icon name was not found in the provided icons object.`);let p=s(t),m=r(p)?{}:{"aria-hidden":`true`},h={...e,"data-lucide":d,...m,...u,...p},g=c(p),_=c(u),v=i(`lucide`,`lucide-${d}`,...g,..._);v&&Object.assign(h,{class:v});let y=n(f,h);return t.parentNode?.replaceChild(y,t)},u=[[`path`,{d:`M12 7v6`}],[`path`,{d:`M15 10H9`}],[`path`,{d:`M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z`}]],d=[[`circle`,{cx:`12`,cy:`12`,r:`10`}],[`line`,{x1:`12`,x2:`12`,y1:`8`,y2:`12`}],[`line`,{x1:`12`,x2:`12.01`,y1:`16`,y2:`16`}]],f=[[`circle`,{cx:`12`,cy:`12`,r:`10`}],[`path`,{d:`M12 6v6h4`}]],p=[[`circle`,{cx:`12`,cy:`12`,r:`10`}],[`path`,{d:`M12 16v-4`}],[`path`,{d:`M12 8h.01`}]],m=[[`path`,{d:`M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5`}],[`path`,{d:`M9 18h6`}],[`path`,{d:`M10 22h4`}]],h=[[`path`,{d:`M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0`}],[`circle`,{cx:`12`,cy:`10`,r:`3`}]],g=[[`path`,{d:`M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719`}]],_=[[`path`,{d:`M12 19v3`}],[`path`,{d:`M19 10v2a7 7 0 0 1-14 0v-2`}],[`rect`,{x:`9`,y:`2`,width:`6`,height:`13`,rx:`3`}]],v=[[`path`,{d:`M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z`}],[`path`,{d:`M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z`}]],y=[[`path`,{d:`M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z`}],[`path`,{d:`m21.854 2.147-10.94 10.939`}]],b=[[`path`,{d:`M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z`}],[`path`,{d:`m9 12 2 2 4-4`}]],x=[[`path`,{d:`M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z`}],[`path`,{d:`M20 2v4`}],[`path`,{d:`M22 4h-4`}],[`circle`,{cx:`4`,cy:`20`,r:`2`}]],S=[[`path`,{d:`M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z`}],[`circle`,{cx:`7.5`,cy:`7.5`,r:`.5`,fill:`currentColor`}]],C=[[`path`,{d:`M2 21a8 8 0 0 1 13.292-6`}],[`circle`,{cx:`10`,cy:`8`,r:`5`}],[`path`,{d:`m16 19 2 2 4-4`}]],w=[[`path`,{d:`M2 21a8 8 0 0 1 11.873-7`}],[`circle`,{cx:`10`,cy:`8`,r:`5`}],[`path`,{d:`m17 17 5 5`}],[`path`,{d:`m22 17-5 5`}]],T=[[`path`,{d:`M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2`}],[`path`,{d:`M16 3.128a4 4 0 0 1 0 7.744`}],[`path`,{d:`M22 21v-2a4 4 0 0 0-3-3.87`}],[`circle`,{cx:`9`,cy:`7`,r:`4`}]],E=[[`path`,{d:`M18 6 6 18`}],[`path`,{d:`m6 6 12 12`}]],D=({icons:e={},nameAttr:t=`data-lucide`,attrs:n={},root:r=document,inTemplates:i}={})=>{if(!Object.values(e).length)throw Error(`Please provide an icons object.
If you want to use all the icons you can import it like:
 \`import { createIcons, icons } from 'lucide';
lucide.createIcons({icons});\``);if(r===void 0)throw Error("`createIcons()` only works in a browser environment.");if(Array.from(r.querySelectorAll(`[${t}]`)).forEach(r=>l(r,{nameAttr:t,icons:e,attrs:n})),i&&Array.from(r.querySelectorAll(`template`)).forEach(r=>D({icons:e,nameAttr:t,attrs:n,root:r.content,inTemplates:i})),t===`data-lucide`){let t=r.querySelectorAll(`[icon-name]`);t.length>0&&(console.warn(`[Lucide] Some icons were found with the now deprecated icon-name attribute. These will still be replaced for backwards compatibility, but will no longer be supported in v1.0 and you should switch to data-lucide`),Array.from(t).forEach(t=>l(t,{nameAttr:`icon-name`,icons:e,attrs:n})))}},ee={BookmarkPlus:u,CircleAlert:d,Clock3:f,Info:p,Lightbulb:m,MapPin:h,MessageCircle:g,Mic:_,Quote:v,Send:y,ShieldCheck:b,Sparkles:x,Tag:S,UserRoundCheck:C,UserRoundX:w,Users:T,X:E},O={"self-only":{level:`L1`,label:`仅自己可见`},"agent-usable":{level:`L2`,label:`Agent 可用`},"org-shared":{level:`L3`,label:`组织内共享`},"public-approved":{level:`L4`,label:`已授权公开`}},k=[{key:`interest`,title:`兴趣标签`,icon:`tag`},{key:`need`,title:`需求判断`,icon:`lightbulb`},{key:`relation`,title:`关系推测`,icon:`users`},{key:`other`,title:`其他认知`,icon:`sparkles`}],A=[`周日`,`周一`,`周二`,`周三`,`周四`,`周五`,`周六`];function j(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function M(e,t=``){return`<i data-lucide="${e}"${t?` class="${t}"`:``}></i>`}function N(e){return String(e).padStart(2,`0`)}function P(e){let t=new Date(e);return Number.isNaN(t.getTime())?String(e??`时间未知`):`${t.getFullYear()} 年 ${t.getMonth()+1} 月 ${t.getDate()} 日 · ${A[t.getDay()]} ${N(t.getHours())}:${N(t.getMinutes())}`}function te(e){let t=new Date(e);return Number.isNaN(t.getTime())?`时间未知`:`${t.getFullYear()}.${N(t.getMonth()+1)}.${N(t.getDate())}`}function ne(e){let t=String(e??``).toLowerCase();return t.includes(`interest`)?`interest`:t.includes(`need`)?`need`:t.includes(`relation`)?`relation`:`other`}function F(e,t){let n=document.createElement(`div`);n.className=`package-panel-layer`,n.setAttribute(`aria-hidden`,`true`),n.innerHTML=`
    <div class="pp-backdrop" data-pp-close aria-hidden="true"></div>
    <aside class="package-panel" role="dialog" aria-modal="true" aria-label="人物资料包" tabindex="-1">
      <button class="pp-close" type="button" data-pp-close title="关闭" aria-label="关闭资料包">${M(`x`)}</button>
      <div class="pp-body"></div>
    </aside>
    <div class="pp-toast" role="status" aria-live="polite"></div>`,e.append(n);let r=n.querySelector(`.package-panel`),i=n.querySelector(`.pp-body`),a=n.querySelector(`.pp-toast`),o=!1,s=null,c=0,l=null,u=new Map,d=new Map,f=!1,p=!1,m={"at-booth":`在自己的展位`,walking:`走动中`,seated:`已入座`,talking:`与人交谈中`,"in-meeting":`圆桌会议中`},h=null,g=!1,_=!1,v=null;function y(){let e=i.querySelector(`[data-pp-presence]`);if(!e)return;let t=o&&s&&typeof h==`function`?h(s):null,n=t?m[t.status??t.state]:null;if(!n){e.hidden=!0;return}e.hidden=!1,e.querySelector(`[data-pp-presence-text]`).textContent=n}function b(){x(),typeof h==`function`&&(v=window.setInterval(y,2e3))}function x(){window.clearInterval(v),v=null}function S(e){return e?typeof t?.resolveMediaUrl==`function`?t.resolveMediaUrl(e):String(e):``}let C=`onerror="this.onerror=null;this.src='${j(S(`portraits/person-self.png`))}'"`;function w(){D({icons:ee,root:n,attrs:{"stroke-width":1.8}})}function T(e){window.clearTimeout(l),a.textContent=e,a.classList.add(`is-visible`),l=window.setTimeout(()=>a.classList.remove(`is-visible`),2400)}function E(){return`
      <div class="pp-skeleton" aria-label="资料包加载中">
        <div class="pp-sk-hero"><i></i><span><b></b><b></b><b></b></span></div>
        <div class="pp-sk-card"></div>
        <div class="pp-sk-card short"></div>
        <div class="pp-sk-card"></div>
      </div>`}function A(){return`
      <div class="pp-error">
        <strong>资料包暂时无法打开</strong>
        <p>网络或数据源出了点问题，请稍后重试。</p>
        <button type="button" data-pp-retry>重新加载</button>
      </div>`}function F(e,n,r){let i=e.facts??{},a=Array.isArray(i.photos)?i.photos:[],o=Array.isArray(i.media)?i.media:[],s=Array.isArray(i.speaker_audio)?i.speaker_audio:[],c=Array.isArray(i.conversation_recordings)?i.conversation_recordings:[],l=[...new Set([...s,...c,...o.filter(e=>/\.(m4a|wav|mp3|aac|ogg|flac)(\?|#|$)/i.test(String(e)))])],u=[...new Set(o.filter(e=>/\.(mp4|mov|webm)(\?|#|$)/i.test(String(e))))],d=i.face_summary??{},f=i.voice_summary??{},p=[].concat(e.highlights??e.key_points??e.talking_points??[]).filter(Boolean),m=O[e.privacy],h=e.privacy===`agent-usable`,g=typeof t?.setEncounterPrivacy==`function`&&String(e.encounter_id??``).startsWith(`enc_k3_`);return`
      <article class="pp-encounter">
        <header class="pp-encounter-head">
          <span class="pp-encounter-no">${N(r-n)}</span>
          <div class="pp-encounter-title">
            <strong>${j(e.place??`未知地点`)}</strong>
            <small>${M(`clock-3`)}${j(P(e.time))}</small>
          </div>
          ${m?`<span class="pp-encounter-privacy" title="${m.level} · ${m.label}">${m.level}</span>`:``}
        </header>
        ${g?`<label class="pp-agent-toggle">
                <span>${M(`user-round-check`)}Agent 记忆</span>
                <input type="checkbox" data-pp-agent-memory="${j(e.encounter_id)}"${h?` checked`:``} />
                <i aria-hidden="true"></i>
              </label>`:``}
        ${a.length?`<div class="pp-photos">${a.map(e=>`<img src="${j(S(e))}" alt="相遇现场照片" loading="lazy" ${C} />`).join(``)}</div>`:``}
        ${p.length?`<ul class="pp-points">${p.map(e=>`<li>${j(e)}</li>`).join(``)}</ul>`:``}
        ${d.observation_count||f.turn_count?`<dl class="pp-evidence-summary">
                ${d.observation_count?`<div><dt>人脸观测</dt><dd>${j(d.observation_count)} 条${Number.isFinite(d.confidence)?` · ${Math.round(d.confidence*100)}%`:``}</dd></div>`:``}
                ${f.turn_count?`<div><dt>声纹归属</dt><dd>${j(f.identity_state??`已归属`)} · ${Number.isFinite(f.confidence)?`${Math.round(f.confidence*100)}%`:`待评估`}</dd></div>`:``}
              </dl>`:``}
        ${l.length||u.length||i.transcript?`<div class="pp-media">
                ${l.map(e=>{let t=c.includes(e);return`<figure class="pp-audio"><figcaption>${M(`mic`)}${t?`整段会话录音`:`说话人分段音频`}</figcaption><audio controls preload="metadata" src="${j(S(e))}"></audio></figure>`}).join(``)}
                ${u.map(e=>`<video class="pp-video" controls preload="metadata" src="${j(S(e))}"></video>`).join(``)}
                ${i.transcript?`<button type="button" class="pp-media-button" data-pp-open-media="${j(S(i.transcript))}">${M(`info`)}<span>转写全文</span></button>`:``}
              </div>`:``}
      </article>`}function I(e,t){let n=[];for(let t of Array.isArray(e.inferences)?e.inferences:[])n.push({inf:t,context:`来自人物综合视图`});for(let e of t)for(let t of Array.isArray(e.inferences)?e.inferences:[])n.push({inf:t,context:`来自相遇「${e.place??e.encounter_id??`未知地点`}」`});return n}function L({inf:e,context:t}){let n=Math.max(0,Math.min(100,Math.round((Number(e.confidence)||0)*100))),r=[`来源：${[].concat(e.source_facts??e.source??[]).filter(Boolean).join(`、`)||`相遇记录`}`,`模型：${e.model??`未知模型`} · 置信度 ${n}%`,`生成于：${P(e.created_at)}`,t].join(`
`);return`
      <li class="pp-inf-item" tabindex="0">
        <span class="pp-inf-main">
          <span class="pp-inf-value">${j(e.value??`未命名推断`)}</span>
          <i class="pp-inf-bar" style="--conf:${n}%"></i>
        </span>
        <span class="pp-inf-conf">${n}%</span>
        <span class="pp-inf-tip" role="tooltip">${j(r)}</span>
      </li>`}function R(e,t){let n=I(e,t),r=k.map(e=>({...e,items:n.filter(t=>ne(t.inf.type)===e.key)})).filter(e=>e.items.length>0);return`
      <section class="pp-section pp-inference-section" aria-label="系统认知（AI 推断）">
        <div class="pp-section-head">
          <h3>${M(`sparkles`)}系统认知</h3>
          <span class="pp-section-tag pp-section-tag-ai">AI 推断 · 可随时重算</span>
        </div>
        <p class="pp-inference-note">${M(`info`)}<span>以下为模型推断，不属于事实记录，不会回写污染原始相遇；每条都标注置信度，悬停可查看来源与依据。</span></p>
        ${r.length?r.map(e=>`
              <div class="pp-inf-group">
                <h4>${M(e.icon)}${e.title}</h4>
                <ul class="pp-inf-list">${e.items.map(L).join(``)}</ul>
              </div>`).join(``):`<p class="pp-empty">推断层还没有内容。系统会在积累更多相遇后生成认知。</p>`}
      </section>`}function z(){return typeof t?.chatWithAgent==`function`}function B(e){return d.has(e)||d.set(e,[]),d.get(e)}function V(e,t){try{window.__echoWorld?.setExpression?.(e,t)}catch{}}function re(e,t){if(e.role===`user`)return`<div class="pp-chat-msg is-user"><p>${j(e.content)}</p></div>`;let n=(Array.isArray(e.cited_facts)?e.cited_facts:[]).filter(Boolean);return`
      <div class="pp-chat-msg is-assistant">
        <p>${j(e.content)}</p>
        <div class="pp-chat-msg-foot">
          ${n.length?`<span class="pp-chat-source" tabindex="0" title="来源：${j(n.join(`
`))}">${M(`quote`)}来源 ${n.length}</span>`:``}
          <button type="button" class="pp-chat-save" data-pp-chat-save="${t}" title="把这条记进 TA 的资料包（标注：来自玩家转述）">${M(`bookmark-plus`)}<span>记进资料包</span></button>
        </div>
      </div>`}function H(){if(!f)return`<button type="button" class="pp-chat-open" data-pp-chat-open>${M(`message-circle`)}<span>和 TA 聊聊</span></button>`;let e=B(s),t=[...e].reverse().find(e=>e.role===`assistant`),n=p?[]:t?.suggestions??[];return`
      <div class="pp-chat-thread" data-pp-chat-thread aria-live="polite">
        ${e.length?e.map(re).join(``):`<p class="pp-chat-hint">挑一条下面的开场，或直接输入。</p>`}
        ${p?`<div class="pp-chat-msg is-assistant is-pending"><span class="pp-chat-dots" aria-hidden="true"><i></i><i></i><i></i></span><small>TA 正在想…</small></div>`:``}
      </div>
      ${n.length?`<div class="pp-chat-suggestions">${n.map(e=>`<button type="button" data-pp-chat-suggestion>${j(e)}</button>`).join(``)}</div>`:``}
      <form class="pp-chat-form" data-pp-chat-form>
        <input type="text" name="message" maxlength="500" placeholder="和 TA 说点什么…"
          autocomplete="off" ${p?`disabled`:``} />
        <button type="submit" aria-label="发送" title="发送" ${p?`disabled`:``}>${M(`send`)}</button>
      </form>`}function U(){let e=i.querySelector(`[data-pp-chat]`);if(!e)return;e.innerHTML=H(),w();let t=e.querySelector(`[data-pp-chat-thread]`);t&&(t.scrollTop=t.scrollHeight)}async function W(e){let n=s,r=String(e??``).trim();if(!n||!r||p)return;let i=B(n),a=i.slice(-10).map(e=>({role:e.role,content:e.content}));i.push({role:`user`,content:r}),p=!0,V(n,`thinking`),U();try{let e=await t.chatWithAgent(n,r,a);i.push({role:`assistant`,content:String(e?.reply??``).trim()||`……`,cited_facts:Array.isArray(e?.cited_facts)?e.cited_facts:[],suggestions:Array.isArray(e?.suggestions)?e.suggestions:[]}),V(n,`happy`)}catch(e){console.error(`[package-panel] 单聊失败`,e),s===n&&T(`对话暂时连不上，稍后再试`)}finally{p=!1,s===n&&o&&U()}}async function G(e){let n=s,r=B(n)[e];if(!(!r||r.role!==`assistant`)){if(typeof t?.saveChatNote!=`function`){T(`当前数据源不支持沉淀`);return}try{await t.saveChatNote(n,r.content),u.delete(n),T(`已记进资料包 · 标注：来自玩家转述`)}catch(e){console.error(`[package-panel] 沉淀失败`,e),T(`没存进去，稍后再试`)}}}function K(){return z()?`
      <section class="pp-section pp-chat-section" aria-label="和 TA 聊聊">
        <div class="pp-section-head">
          <h3>${M(`message-circle`)}和 TA 聊聊</h3>
          <span class="pp-section-tag pp-section-tag-ai">模拟分身 · 非真人</span>
        </div>
        <p class="pp-chat-note">${M(`info`)}<span>基于 TA 授权信息的模拟，不是真人；对话不会自动写入资料包，值得留的可以手动「记进资料包」。</span></p>
        <div class="pp-chat" data-pp-chat></div>
      </section>`:``}function q(e){if(typeof t?.deactivatePackage!=`function`)return``;let n=e.person_id??e.identity?.person_id;return!n||n===`person-self`?``:e.identity?.deactivated?`
        <section class="pp-section pp-danger" aria-label="注销状态">
          <p class="pp-danger-note">${M(`user-round-x`)}<span>TA 已被注销，不再出现在世界里；相遇事实仍按只增不改保留。</span></p>
        </section>`:`
      <section class="pp-section pp-danger" aria-label="危险操作">
        ${g?`<p class="pp-danger-note">${M(`circle-alert`)}<span>确认注销？TA 会立刻从广场、咖啡厅和名册里消失（相遇事实保留）。</span></p>
             <div class="pp-danger-actions">
               <button type="button" class="pp-danger-confirm" data-pp-deactivate-confirm>${M(`user-round-x`)}<span>确认注销</span></button>
               <button type="button" class="pp-danger-cancel" data-pp-deactivate-cancel>再想想</button>
             </div>`:`<button type="button" class="pp-danger-open" data-pp-deactivate>${M(`user-round-x`)}<span>注销此人</span><small>录错了或重复录入时</small></button>`}
      </section>`}function J(e){let t=e.identity??{},n=(Array.isArray(e.encounters)?[...e.encounters]:[]).sort((e,t)=>new Date(t.time)-new Date(e.time)),r=t.name??e.name??`未命名的人`,i=S(t.face_ref??e.avatar?.real_face_ref??e.portrait),a=t.confirmed!==!1,o=O[e.privacy]??O[n[0]?.privacy]??O[`self-only`],s=t.headline??e.headline??e.bio??(n.length?`相识于 ${n[n.length-1].place??`一次现场相遇`}`:`一段等待被想起的关系`),c=n.reduce((e,t)=>e+(t.facts?.photos?.length??0),0),l=n.length?te(n[n.length-1].time):null,u=[`相遇 ${n.length} 次`,c?`现场照片 ${c} 张`:null,l?`首次相见 ${l}`:null].filter(Boolean).join(` · `);return`
      <header class="pp-hero">
        <div class="pp-hero-face">
          ${i?`<img src="${j(i)}" alt="${j(r)}的真实人脸照片" ${C} />`:`<span class="pp-hero-face-fallback">${j(r.slice(0,1))}</span>`}
          <span class="pp-hero-face-tag">真实人脸</span>
        </div>
        <div class="pp-hero-info">
          <span class="pp-eyebrow">人物资料包 · PERSON PACKAGE</span>
          <h2>${j(r)}</h2>
          <p class="pp-headline">${j(s)}</p>
          <p class="pp-presence" data-pp-presence hidden>
            <span class="pp-presence-dot" aria-hidden="true"></span>
            <span data-pp-presence-text></span>
          </p>
          <div class="pp-badges">
            <span class="pp-badge pp-badge-privacy">${M(`shield-check`)}${o.level} · ${o.label}</span>
            <span class="pp-badge ${a?`pp-badge-ok`:`pp-badge-warn`}">${a?`身份已确认`:`身份待确认`}</span>
          </div>
          <p class="pp-meta">${j(u)}</p>
        </div>
      </header>
      <section class="pp-section" aria-label="相遇时间线">
        <div class="pp-section-head">
          <h3>${M(`map-pin`)}相遇</h3>
          <span class="pp-section-tag">事实层 · 只增不改</span>
        </div>
        ${n.length?n.map((e,t)=>F(e,t,n.length)).join(``):`<p class="pp-empty">还没有相遇记录。</p>`}
      </section>
      ${R(e,n)}
      ${K()}
      ${q(e)}`}function Y(e){i.innerHTML=J(e),i.scrollTop=0,w(),y(),U()}function ie(){o=!0,n.setAttribute(`aria-hidden`,`false`),r.focus({preventScroll:!0}),b(),window.dispatchEvent(new CustomEvent(Z,{detail:{id:`package`}}))}function X(){o&&(o=!1,s=null,c+=1,p=!1,x(),n.setAttribute(`aria-hidden`,`true`))}let Z=`echoworld:panel-focus`;window.addEventListener(Z,e=>{e.detail?.id!==`package`&&X()});function Q(){U(),i.querySelector(`[data-pp-chat]`)?.scrollIntoView({block:`nearest`}),i.querySelector(`.pp-chat-form input`)?.focus({preventScroll:!0})}async function $(e,{focusChat:n=!1,refresh:r=!1}={}){s=e,f=n&&z(),g=!1,_=!1,ie();let a=f?Q:null;if(!r&&u.has(e)){Y(u.get(e)),a?.();return}let o=++c;i.innerHTML=E(),i.scrollTop=0;try{let n=await t.getPackage(e);if(!n||typeof n!=`object`)throw Error(`empty package`);if(u.set(e,n),o!==c||s!==e)return;Y(n),a?.()}catch(e){if(console.error(`[package-panel] 加载资料包失败`,e),o!==c)return;i.innerHTML=A()}}return n.addEventListener(`click`,e=>{if(e.target.closest(`[data-pp-close]`)){X();return}let n=e.target.closest(`[data-pp-open-media]`);if(n){window.open(n.dataset.ppOpenMedia,`_blank`,`noopener,noreferrer`);return}if(e.target.closest(`[data-pp-chat-open]`)){f=!0,Q();return}let r=e.target.closest(`[data-pp-chat-suggestion]`);if(r){W(r.textContent);return}let i=e.target.closest(`[data-pp-chat-save]`);if(i){G(Number(i.dataset.ppChatSave));return}if(e.target.closest(`[data-pp-retry]`)&&s){u.delete(s),$(s,{focusChat:f});return}if(e.target.closest(`[data-pp-deactivate]`)){g=!0;let e=s?u.get(s):null;e&&Y(e);return}if(e.target.closest(`[data-pp-deactivate-cancel]`)){g=!1;let e=s?u.get(s):null;e&&Y(e);return}if(e.target.closest(`[data-pp-deactivate-confirm]`)&&s&&!_){_=!0;let e=s;t.deactivatePackage(e).then(()=>{u.delete(e),X()}).catch(e=>{console.error(`[PackagePanel] 注销失败:`,e),g=!1,window.alert?.(`注销失败：${e.message}`)}).finally(()=>{_=!1})}}),n.addEventListener(`submit`,e=>{let t=e.target.closest(`[data-pp-chat-form]`);if(!t)return;e.preventDefault();let n=t.elements.message,r=n.value;n.value=``,W(r)}),n.addEventListener(`change`,async e=>{let n=e.target.closest(`[data-pp-agent-memory]`);if(!n||!s)return;let r=n.dataset.ppAgentMemory;n.disabled=!0;try{let e=await t.setEncounterPrivacy(s,r,n.checked?`agent-usable`:`self-only`);u.set(s,e),Y(e),T(n.checked?`这次相遇已加入 Agent 记忆`:`这次相遇已退出 Agent 记忆`)}catch(e){console.error(`[package-panel] 更新 Agent 记忆授权失败`,e),n.checked=!n.checked,n.disabled=!1,T(`授权更新失败，请稍后重试`)}}),document.addEventListener(`keydown`,e=>{o&&e.key===`Escape`&&(e.stopPropagation(),X())}),w(),{openPerson:$,close:X,setPresenceProvider(e){h=typeof e==`function`?e:null,o&&(b(),y())},get isOpen(){return o}}}export{x as a,g as c,p as d,f,T as i,h as l,D as n,b as o,d as p,E as r,y as s,F as t,m as u};