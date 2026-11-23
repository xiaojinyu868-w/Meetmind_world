export function icebreakerView(state,cards,escape){
  const people=state.people;
  const name=seat=>escape(people.find(p=>p.seat===seat)?.name || '成员');
  const options=(rows)=>rows.map(p=>`<option value="${p.seat}">${escape(p.name)}</option>`).join('');
  if(people.length<2)return '<p>邀请至少一位朋友认领角色，就可以开始。</p>';
  const hands=cards.map(c=>`<section class="ice-card"><blockquote>${escape(c.text)}</blockquote>${c.own||c.pick!==null?`<small>${c.own?'你写给':'写给'} ${name(c.subject)} · ${c.votes} 人已投票</small>`:
    `<form data-ice-vote="${escape(c.id)}"><label>这条印象写给谁？<select name="seat">${options(people)}</select></label><button class="secondary">投一票</button></form>`}</section>`).join('');
  return `<p>写一句可以当众读的第一印象。大家匿名读题，投给自己觉得最符合的人，投票后揭晓。</p>${hands}
  <details class="record" ${cards.length?'':'open'}><summary>写一张匿名印象卡</summary><form id="ice-form"><label>写给谁<select name="subject">${options(people.filter(p=>p.seat!==state.me))}</select></label><label>全组可见的印象<textarea name="text" required minlength="2" maxlength="180" rows="2"></textarea></label><button class="primary">加入破冰游戏</button></form></details>`;
}
