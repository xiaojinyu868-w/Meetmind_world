const MAX_MANIFEST_BYTES = 65536;
async function readBoundedText(response) {
  const advertised = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(advertised) && advertised > MAX_MANIFEST_BYTES) throw new Error("场景配置超过 64 KB");
  if (!response.body?.getReader) {
    const raw = await response.text();
    if (new TextEncoder().encode(raw).length > MAX_MANIFEST_BYTES) throw new Error("场景配置超过 64 KB");
    return raw;
  }
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let size = 0, text = "";
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MANIFEST_BYTES) { await reader.cancel(); throw new Error("场景配置超过 64 KB"); }
      text += decoder.decode(value,{stream:true});
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
export async function readSceneStartup({search = "", baseUrl, fetchImpl = globalThis.fetch} = {}) {
  const params = new URLSearchParams(search), explicit = params.get("sceneManifest");
  if (params.has("scene") && !explicit) return {scene: params.get("scene")};
  const target = new URL(explicit || "./scene-startup.json", baseUrl);
  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) throw new Error("场景配置须使用 HTTP(S) 地址");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(target, {signal:controller.signal, cache:"no-store", credentials:"omit"});
    if (!response.ok) {if (!explicit && response.status===404) return {scene:"campus"};throw new Error("场景启动配置读取失败");}
    const raw = await readBoundedText(response);
    let data; try { data = JSON.parse(raw); } catch { throw new Error("场景启动配置不是有效 JSON"); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("启动配置缺少场景清单");
    if (!explicit && data.enabled !== true) return {scene:data.scene || "campus"};
    const manifest = explicit ? data : data.manifest;
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("启动配置缺少场景清单");
    const normalized = {...manifest};
    if (normalized.url) normalized.url = new URL(normalized.url, target).href;
    return {scene:"import",manifest:normalized};
  } finally {clearTimeout(timeout);}
}
