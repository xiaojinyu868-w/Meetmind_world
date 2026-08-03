const CAPABILITIES_SCHEMA = "echo-capabilities.v1";

/** 前端只消费服务端能力快照，不自行复制 Package 阈值规则。 */
export class CapabilityStore {
  constructor(api) {
    if (!api || typeof api.getCapabilities !== "function") {
      throw new TypeError("CapabilityStore 需要 api.getCapabilities");
    }
    this.api = api;
    this.snapshot = null;
    this.ready = false;
  }

  async refresh(context = {}) {
    const snapshot = await this.api.getCapabilities(context);
    if (snapshot?.schema !== CAPABILITIES_SCHEMA || !snapshot.capabilities) {
      throw new Error(`不支持的 capabilities schema：${snapshot?.schema}`);
    }
    this.snapshot = snapshot;
    this.ready = true;
    return snapshot;
  }

  get(capabilityId) {
    return this.snapshot?.capabilities?.[capabilityId] ?? null;
  }

  isEnabled(capabilityId) {
    return this.get(capabilityId)?.enabled === true;
  }
}
