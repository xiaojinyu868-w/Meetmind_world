const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const size = item => [item.width, item.depth, item.height].join(" × ") + " 米";

export class MeasurementPanel {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.previewing = false;
    this.proposal = null;
    this.waiting = false;
    this.sessionId = null;
    container.innerHTML = '<div class="panel-heading"><p class="eyebrow">把测量带回共同空间</p><h2>量过以后，再一起看看。</h2><p>在“一起决定”提交本人完成报告后，可把家具宽深高记录在这里。先预览影响，再应用尺寸。</p></div>' +
      '<form id="measurement-form"><div class="measurement-grid"><label>来自哪项已完成行动<select id="measurement-action" required></select></label><label>测量的家具<select id="measurement-object" required></select></label>' +
      ["width", "depth", "height"].map((key, i) => '<label>' + ["实测宽（米）", "实测深（米）", "实测高（米）"][i] + '<input id="measurement-' + key + '" type="number" min="0.05" max="10" step="any" required></label>').join("") +
      '<label>测量日期<input id="measurement-date" type="date" required></label></div><label>测量来源<input id="measurement-source" maxlength="240" required placeholder="例如：本人用卷尺测量最宽处"></label><button id="measurement-record">记录测量，暂不改尺寸</button><p id="measurement-hint" class="subtle"></p></form>' +
      '<p id="measurement-error" class="warning" role="status" aria-live="polite"></p><div id="measurement-preview-result"></div><div id="measurement-records"></div><details class="measurement-history"><summary>查看测量与方案变化记录</summary><ol id="measurement-history"></ol></details>';
    this.$ = selector => container.querySelector(selector);
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    this.$("#measurement-date").value = today.toISOString().slice(0, 10);
    this.$("#measurement-object").onchange = () => this.fillDimensions();
    this.$("#measurement-form").onsubmit = e => { e.preventDefault(); this.record(); };
    container.addEventListener("click", e => {
      const preview = e.target.closest("[data-measurement-preview]");
      const withdraw = e.target.closest("[data-measurement-withdraw]");
      if (preview) this.prepare(preview.dataset.measurementPreview);
      if (withdraw) this.withdraw(withdraw.dataset.measurementWithdraw);
      if (e.target.id === "measurement-exit") this.clearPreview();
      if (e.target.id === "measurement-apply") this.apply();
    });
  }
  update(state) {
    this.state = state;
    const session = this.options.getSession();
    const identityChanged = this.sessionId !== session?.session_id;
    if (identityChanged) {
      this.sessionId = session?.session_id;
      this.$("#measurement-source").value = "";
      this.$("#measurement-error").textContent = "";
    }
    if (this.proposal && (!state || identityChanged || this.proposal.basis_sequence !== state.sequence)) {
      this.clearPreview();
      this.$("#measurement-error").textContent = "共同记录有变化，原测量预览已退出；请重新预览。";
    }
    const actionSelect = this.$("#measurement-action"), objectSelect = this.$("#measurement-object");
    const previousAction = actionSelect.value, previousObject = objectSelect.value;
    const actions = (state?.actions || []).filter(a => a.owner === session?.viewer && a.status === "done");
    actionSelect.innerHTML = actions.length ? actions.map(a => '<option value="' + escape(a.id) + '">' + escape(a.text) + "</option>").join("") : '<option value="">先提交本人完成报告</option>';
    objectSelect.innerHTML = (state?.objects || []).map(o => '<option value="' + escape(o.id) + '">' + escape(o.label) + "</option>").join("");
    if (actions.some(a => a.id === previousAction)) actionSelect.value = previousAction;
    if (state?.objects.some(o => o.id === previousObject)) objectSelect.value = previousObject;
    if (identityChanged || !previousObject) this.fillDimensions();
    this.$("#measurement-record").disabled = !actions.length || this.waiting || !state;
    this.$("#measurement-hint").textContent = actions.length
      ? "这是参与者提供的测量，尚未独立核验。宽深高按家具本身方向填写；只更新所选家具。"
      : "还没有你的完成报告。可以先在“一起决定”记录测量行动，再回来填写结果。";
    this.renderRecords();
    this.renderPreview();
  }
  fillDimensions() {
    const item = this.state?.objects.find(o => o.id === this.$("#measurement-object").value);
    if (item) for (const key of ["width", "depth", "height"]) this.$("#measurement-" + key).value = item[key];
  }
  async record() {
    if (this.waiting || !this.state) return;
    const command = { type: "measurement.record", action_id: this.$("#measurement-action").value,
      object_id: this.$("#measurement-object").value, source: this.$("#measurement-source").value,
      measured_on: this.$("#measurement-date").value };
    for (const key of ["width", "depth", "height"]) command[key] = Number(this.$("#measurement-" + key).value);
    this.waiting = true;
    this.$("#measurement-error").textContent = "";
    this.$("#measurement-record").disabled = true;
    try {
      if (!await this.options.send(command)) this.$("#measurement-error").textContent = "测量未保存，请查看页面提示后重试。";
    } finally { this.waiting = false; this.update(this.options.getState()); }
  }
  async prepare(id) {
    if (this.waiting || !this.state) return;
    const state = this.options.getState(), token = this.options.getSession()?.token;
    this.clearPreview();
    this.options.beforePreview();
    this.waiting = true;
    this.$("#measurement-error").textContent = "";
    try {
      const result = await this.options.request("/space-api/measurement/preview", { measurement_id: id, expected_sequence: state.sequence });
      if (this.options.getSession()?.token !== token) return;
      if (this.options.getState()?.sequence !== result.basis_sequence) throw new Error("共同记录已变化，请重新预览。");
      this.proposal = result;
      this.previewing = true;
      this.options.preview({ ...result.preview, violations: result.violations });
      this.renderPreview();
    } catch (e) {
      this.$("#measurement-error").textContent = e.message;
      this.options.notify(e.message, true);
    } finally { this.waiting = false; this.update(this.options.getState()); }
  }
  clearPreview() {
    const wasPreviewing = this.previewing;
    this.proposal = null;
    this.previewing = false;
    if (wasPreviewing) this.options.preview(null);
    this.renderPreview();
  }
  renderPreview() {
    const result = this.proposal;
    if (!result) { this.$("#measurement-preview-result").replaceChildren(); return; }
    const measurement = result.preview.measurements.find(m => m.id === result.measurement_id);
    const previous = this.state.objects.find(o => o.id === measurement.object_id);
    this.$("#measurement-preview-result").innerHTML = '<article class="measurement-comparison"><h3>预览：' + escape(previous.label) + '</h3><p>当前 ' + size(previous) + ' → 测量 ' + size(measurement) + '</p><p class="subtle">目前只有你看到尺寸变化，对方的空间保持原样。</p>' +
      (result.violations.length ? '<p class="warning">' + result.violations.map(v => escape(v.message)).join("<br>") + '</p><p>测量可以暴露原先没发现的冲突。应用尺寸后，需调整到可行方案才能接受。</p>' : '<p>当前简化几何检查通过；不代表现实安装已验收。</p>') +
      '<div class="button-row"><button id="measurement-exit">退出测量预览</button><button id="measurement-apply" class="primary"' + (this.waiting ? " disabled" : "") + '>应用测量尺寸，重新决定</button></div></article>';
  }
  async apply() {
    if (!this.proposal || this.waiting) return;
    const proposal = this.proposal;
    this.waiting = true;
    try {
      const ok = await this.options.send({ type: "measurement.apply", measurement_id: proposal.measurement_id,
        basis_revision: proposal.basis_revision });
      if (ok) this.$("#measurement-error").textContent = "";
      else this.$("#measurement-error").textContent = "尚未应用；请查看最新状态，再重新预览。";
    } finally { this.waiting = false; this.update(this.options.getState()); }
  }
  async withdraw(id) {
    if (this.waiting) return;
    this.waiting = true;
    try {
      if (!await this.options.send({ type: "measurement.withdraw", measurement_id: id }))
        this.$("#measurement-error").textContent = "撤回未保存，请查看页面提示。";
    } finally { this.waiting = false; this.update(this.options.getState()); }
  }
  renderRecords() {
    const state = this.state, viewer = this.options.getSession()?.viewer;
    this.$("#measurement-records").innerHTML = (state?.measurements || []).slice().reverse().map(m => {
      const action = state.actions.find(a => a.id === m.action_id), item = state.objects.find(o => o.id === m.object_id);
      const current = !m.withdrawn && action?.status === "done" && action?.report_version === m.report_version;
      const applied = item?.measurement_id === m.id;
      return '<article class="measurement-record"><h3>' + escape(item?.label) + ' · ' + size(m) + '</h3><p>' + escape(state.members[m.owner]) + ' · ' + escape(m.measured_on) + ' · ' + escape(m.source) + '</p><p class="subtle">来自行动“' + escape(action?.text) + '”第 ' + m.report_version + ' 份报告 · 未独立核验</p><p class="' + (current ? "" : "warning") + '">' +
        (applied ? "用于当前尺寸" : "未用于当前尺寸") + ' · ' + (current ? "来源未撤回" : m.withdrawn ? "测量已撤回" : "行动报告已变化，请重新测量") + '</p><div class="button-row">' +
        (current && !applied ? '<button data-measurement-preview="' + escape(m.id) + '">预览测量影响</button>' : "") +
        (!m.withdrawn && m.owner === viewer ? '<button data-measurement-withdraw="' + escape(m.id) + '">撤回这份测量</button>' : "") + '</div></article>';
    }).join("") || '<p class="subtle">还没有测量记录。当前家具使用合成尺寸。</p>';
    this.$("#measurement-history").innerHTML = (state?.history || []).filter(h => h.type.startsWith("measurement.") || h.type === "action.report").slice(-12).reverse()
      .map(h => '<li><small>记录 ' + h.sequence + ' · 方案 ' + h.revision + ' · ' + escape(state.members[h.actor]) + '</small><p>' + escape(h.summary) + '</p></li>').join("") || "<li>尚无变化记录</li>";
  }
}
