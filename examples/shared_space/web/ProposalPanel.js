const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
export class ProposalPanel {
  constructor(container, options) {
    this.options=options;this.proposal=null;this.previewing=false;this.generating=false;this.modelEnabled=false;
    container.innerHTML='<div class="proposal-heading"><div><small>一起比较一个修改提议</small><h3>先看变化，再作决定。</h3></div><span id="proposal-source">人工示例可用</span></div><label>希望调整什么<textarea id="proposal-instruction" maxlength="1000" placeholder="例如：保留工作桌和纸桥，尽量给运动留出连续空间。"></textarea></label><div class="proposal-tools"><button id="demo-proposal">查看人工修改示例</button><button id="model-proposal" disabled>让模型提出修改</button></div><p id="proposal-model-note" class="subtle">当前未启用模型。人工示例是固定布局示范，不理解输入要求。</p><div id="proposal-result"></div>';
    this.container=container;
    this.result=container.querySelector("#proposal-result");
    container.querySelector("#demo-proposal").onclick=()=>this.generate("demo");
    container.querySelector("#model-proposal").onclick=()=>this.generate("model");
    this.result.addEventListener("click",e=>{
      if(e.target.id==="preview-proposal")this.preview();
      if(e.target.id==="exit-preview")this.clearPreview();
      if(e.target.id==="apply-proposal")this.apply();
    });
  }
  update(state,modelEnabled) {
    this.state=state;
    if(modelEnabled!==undefined)this.modelEnabled=modelEnabled;
    const live=this.modelEnabled;
    this.container.querySelector("#model-proposal").disabled=!live||this.generating||!state;
    this.container.querySelector("#demo-proposal").disabled=this.generating||!state;
    this.container.querySelector("#proposal-model-note").textContent=live?
      "模型会收到当前房间、家具、已确认要求和此处文字；不发送经历原文、个人决定或行动记录。人工示例仍是固定布局。":
      "当前未启用模型。人工示例是固定布局示范，不理解输入要求。";
    this.container.querySelector("#proposal-source").textContent=this.generating?"正在准备提案…":live?"模型按需调用":"人工示例可用";
    if(this.proposal&&this.proposal.basis_revision!==state?.revision){
      this.clearPreview();this.proposal=null;
      this.result.innerHTML='<p class="warning">布局或要求已经变化，之前的提案已过期。请查看新方案后重新提出修改。</p>';
    }
    this.render();
  }
  async generate(mode) {
    const state=this.options.getState(),session=this.options.getSession();
    if(!state||!session||this.generating)return;
    const instruction=this.container.querySelector("#proposal-instruction").value.trim()||"保留已确认的用途，调整家具位置，给两个人留出各自的空间。";
    this.generating=true;this.clearPreview();this.proposal=null;this.result.replaceChildren();this.render();this.update(state);
    try {
      const value=await this.options.request("/space-api/proposal",{mode,instruction,expected_sequence:state.sequence});
      if(this.options.getSession()?.token!==session.token)return;
      if(this.options.getState()?.revision!==value.basis_revision)throw new Error("空间已更新，此提案已过期，请重新生成。");
      this.proposal=value;this.options.notify(mode==="demo"?"这是人工编写的布局示例，可以检查变化后预览。":"模型提案已返回，请检查变更与空间冲突。");
    }catch(e){this.options.notify(e.message,true);}
    finally{this.generating=false;this.update(this.options.getState());}
  }
  render() {
    const p=this.proposal;if(!p)return;
    const objectNames=Object.fromEntries((this.state?.objects||[]).map(o=>[o.id,o.label]));
    const reqNames=Object.fromEntries((this.state?.requirements||[]).map(r=>[r.id,r.label]));
    const blocked=p.violations.length>0||p.review_required;
    this.result.innerHTML='<article class="proposal-card"><div class="proposal-heading"><h3>'+escape(p.proposal.title)+'</h3><small>'+ (p.provenance.kind==="manual-demo"?"人工编写 · 非AI":escape(p.provenance.model)+" · "+Math.round(p.latency_ms/1000)+"秒")+'</small></div><p>'+escape(p.proposal.rationale)+'</p><ol>'+p.proposal.operations.map(op=>'<li><strong>'+escape(objectNames[op.object_id]||op.object_id)+'</strong> → ('+op.x+', '+op.z+') 米，'+op.rotation+'°<p>'+escape(op.reason)+'</p><small>'+(op.requirement_ids.length?"参考要求："+op.requirement_ids.map(id=>escape(reqNames[id]||id)).join("、"):"未引用已确认要求")+'</small></li>').join("")+'</ol><p class="subtle">保持位置：'+p.preserved.map(id=>escape(objectNames[id]||id)).join("、")+'。应用后，每个人仍需重新决定。</p>'+
      (p.violations.length?'<div class="warning"><strong>该提案仍有冲突，不能应用</strong>'+p.violations.map(v=>'<p>'+escape(v.message)+'</p>').join("")+'</div>':p.review_required?'<p class="warning">有要求等待本人重新核对，暂不能应用。</p>':'<p class="proposal-valid">简化空间检查通过，仍需现实测量。</p>')+
      '<div class="proposal-tools"><button id="preview-proposal">在空间中预览</button><button id="exit-preview" '+(!this.previewing?"hidden":"")+'>退出预览</button><button id="apply-proposal" class="primary" '+(blocked?"disabled":"")+'>应用这个修改</button></div><p class="subtle">预览仅对你可见；应用会更新共同方案，不表示两个人已经同意。</p></article>';
  }
  preview() {
    if(!this.proposal)return;
    this.previewing=true;this.options.preview({...this.proposal.preview,violations:this.proposal.violations});
    this.render();
  }
  clearPreview() {
    if(this.previewing){this.previewing=false;this.options.preview(null);}
    this.render();
  }
  async apply() {
    if(!this.proposal||this.generating)return;
    const p=this.proposal,token=this.options.getSession()?.token;
    this.generating=true;this.clearPreview();this.update(this.options.getState());
    try {
      const value=await this.options.request("/space-api/proposal/apply",{proposal_id:p.id,expected_sequence:this.options.getState().sequence,request_id:crypto.randomUUID()});
      if(this.options.getSession()?.token!==token)return;
      this.proposal=null;this.result.innerHTML="";this.options.receive(value);
      this.options.notify("修改已保存为新方案。请两个人分别查看并决定。");
    }catch(e){this.options.notify(e.message,true);}
    finally{this.generating=false;this.update(this.options.getState());}
  }
  reset() {this.clearPreview();this.proposal=null;this.result.replaceChildren();this.update(null);}
}
