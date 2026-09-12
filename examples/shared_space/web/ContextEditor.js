const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
export class ContextEditor {
  constructor(options) {
    this.options = options;
    this.busy = false;
    this.draft = null;
    this.dialog = document.createElement("dialog");
    this.dialog.id = "context-dialog";
    this.dialog.setAttribute("aria-labelledby", "context-title");
    document.body.append(this.dialog);
    this.dialog.addEventListener("submit", e => { e.preventDefault(); this.save(); });
    this.dialog.addEventListener("click", e => { if (e.target.id === "context-cancel" && !this.busy) this.dialog.close(); });
    this.dialog.addEventListener("cancel", e => { if (this.busy) e.preventDefault(); });
    this.dialog.addEventListener("close", () => { this.draft = null; this.options.onClose?.(); });
  }
  get open() { return this.dialog.open; }
  close() { this.dialog.close(); this.draft = null; }
  field(name) { return this.dialog.querySelector('[name="' + name + '"]'); }
  show(kind, id = null) {
    const state = this.options.getState(), session = this.options.getSession();
    if (!state || !session || this.busy) return;
    const isMemory = kind === "memory", list = isMemory ? state.memories : state.requirements;
    const item = id ? list.find(value => value.id === id) : null;
    if (id && (!item || item.owner !== session.viewer || (isMemory && item.withdrawn))) return;
    this.draft = { kind, id, token: session.token, basis_version: item?.version, basis_revision: state.revision };
    const sourceOptions = '<option value="" data-version="0">这是本人独立提出的要求</option>' + state.memories.filter(m => !m.withdrawn).map(m =>
      '<option value="' + esc(m.id) + '" data-version="' + m.version + '"' + (item?.source_id === m.id ? " selected" : "") + '>' +
      esc(state.members[m.owner] + " · " + m.text.slice(0, 45)) + '（第' + m.version + '版）</option>').join("");
    const zone = item?.zone || { x: state.room.width / 2, z: state.room.depth / 2, width: 1, depth: 1 };
    const body = isMemory
      ? '<label>发生了什么<textarea name="text" maxlength="600" required placeholder="写下你愿意让另一位看到的一段经历">' + esc(item?.text || "") + '</textarea></label><label>发生日期（可选）<input name="occurred_on" type="date" value="' + esc(item?.occurred_on || "") + '"></label><label>来源说明（可选）<input name="source_note" maxlength="240" value="' + esc(item?.source_note || "") + '" placeholder="例如：我今天的观察；此处只是文字记录"></label><p class="subtle">保存后另一位可以看到、补充或提出不同记忆。记录不会自动生成要求，也不会替另一位认同。</p>'
      : '<label>我需要留下什么空间<input name="label" maxlength="180" required value="' + esc(item?.label || "") + '" placeholder="例如：晚饭后留出拉伸的位置"></label><label>与哪段经历有关<select name="source_id">' + sourceOptions + '</select></label><p class="subtle">引用另一位的经历，表示你用它说明自己的要求，不代表对方确认了这条要求。无关时可选独立提出。</p><div class="context-grid">' +
      ["x", "z", "width", "depth"].map((key, index) => '<label>' + ["中心 X（米）", "中心 Z（米）", "区域宽（米）", "区域深（米）"][index] + '<input name="' + key + '" type="number" step="any" min="' + (index < 2 ? -10 : .1) + '" max="' + (index < 2 ? 20 : 10) + '" required value="' + zone[key] + '"></label>').join("") +
      '</div><p class="subtle">确认后启用这项要求，在平面与3D中标出区域。若与家具冲突，将显示需要调整；两人原先对方案的同意会过期。</p>';
    this.dialog.innerHTML = '<form><p class="eyebrow">' + (isMemory ? "生活里的事，有后文" : "把自己的需要说清楚") + '</p><h2 id="context-title">' +
      (isMemory ? item ? "补充经历的日期与来源" : "带进一段新经历" : item ? "调整我的活动区域" : "添加我的活动区域") +
      '</h2>' + body + '<p id="context-error" class="warning" role="status" aria-live="polite"></p><div class="button-row"><button id="context-cancel" type="button">取消</button><button id="context-save" class="primary" type="submit">' +
      (isMemory ? "保存这段经历" : "确认并启用我的要求") + '</button></div></form>';
    this.dialog.showModal();
  }
  async save() {
    if (!this.draft || this.busy || this.options.getSession()?.token !== this.draft.token) return;
    const draft = this.draft;
    let command;
    if (draft.kind === "memory") {
      command = { type: draft.id ? "memory.edit" : "memory.add", text: this.field("text").value,
        occurred_on: this.field("occurred_on").value || null, source_note: this.field("source_note").value };
      if (draft.id) { command.memory_id = draft.id; command.basis_version = draft.basis_version; }
    } else {
      const source = this.field("source_id");
      command = { type: draft.id ? "requirement.update" : "requirement.add", label: this.field("label").value, basis_revision: draft.basis_revision,
        source_id: source.value || null, source_version: Number(source.selectedOptions[0].dataset.version),
        zone: Object.fromEntries(["x", "z", "width", "depth"].map(key => [key, Number(this.field(key).value)])) };
      if (draft.id) command.requirement_id = draft.id;
    }
    this.busy = true;
    this.dialog.querySelector("#context-save").disabled = this.dialog.querySelector("#context-cancel").disabled = true;
    try {
      if (await this.options.send(command)) this.close();
      else this.dialog.querySelector("#context-error").textContent = (this.options.getError() || "未保存，请重试。") +
        " 输入已保留；如来源版本已变化，请取消并重新打开后核对。";
    } finally {
      this.busy = false;
      for (const button of this.dialog.querySelectorAll("button")) button.disabled = false;
    }
  }
}

export function memoryProvenance(memory) {
  return '<p class="subtle">' + (memory.origin === "participant-entry" ? "参与者录入 · 未独立核验" : "人工合成样例") +
    (!memory.withdrawn && memory.occurred_on ? " · " + esc(memory.occurred_on) : "") + '</p>' +
    (!memory.withdrawn && memory.source_note ? '<p class="subtle">来源说明：' + esc(memory.source_note) + "</p>" : "");
}

export function requirementSource(state, requirement) {
  const source = state.memories.find(m => m.id === requirement.source_id);
  if (!source) return '<p class="subtle">本人独立提出，不引用经历。</p>';
  if (source.withdrawn) return '<p class="warning">关联经历已撤回。本人仍可独立保留这项要求；撤回内容不再作为依据。</p>';
  const replies = Object.entries(source.replies || {}).map(([id, reply]) => state.members[id] + "：" +
    (reply.status === "different" ? "有不同记忆" : "也这样记得")).join("；");
  return '<p class="requirement-source">来自' + esc(state.members[source.owner]) + '的经历：“' + esc(source.text) +
    '”<br><small>要求引用第 ' + requirement.source_version + ' 版；经历当前第 ' + source.version + ' 版</small></p>' +
    (replies ? '<p class="subtle">' + esc(replies) + '</p>' : '<p class="subtle">关联经历不等于双方认可。</p>');
}
