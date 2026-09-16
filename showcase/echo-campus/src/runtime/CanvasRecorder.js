const MAX_DURATION_MS = 35000;
const MIME_TYPES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

export function installCanvasRecorder(canvas, diagnostics = () => ({})) {
  if (!new URLSearchParams(location.search).has("capture")) return null;
  const doc = canvas.ownerDocument;
  const bar = doc.createElement("aside");
  bar.dataset.captureToolbar = "";
  bar.setAttribute("aria-label", "3D 画面录制工具");
  bar.style.cssText = "position:fixed;left:12px;bottom:100px;z-index:10000;max-width:calc(100vw - 24px);padding:10px 12px;border:1px solid #d9dfd2;border-radius:12px;background:rgba(248,250,244,.96);color:#25382e;font:12px/1.45 system-ui,sans-serif;box-shadow:0 4px 22px #13261722;pointer-events:auto;display:flex;flex-direction:column;gap:5px";
  bar.innerHTML = '<strong>场景录制 · 仅 3D 画面</strong><div style="display:flex;align-items:center;gap:10px"><button type="button" data-capture-toggle style="cursor:pointer;border:0;border-radius:7px;padding:7px 12px;background:#294a3a;color:white;font:inherit">开始录制</button><output data-capture-time>00:00 / 00:35</output><a data-capture-download hidden style="color:#294a3a;font-weight:600">下载 WebM</a></div><output data-capture-status role="status">30 FPS · 最长 35 秒 · 不含界面与声音</output><output data-capture-diagnostics style="font:10px/1.4 ui-monospace,monospace;max-width:430px;overflow-wrap:anywhere"></output>';
  doc.body.append(bar);
  const button = bar.querySelector("[data-capture-toggle]");
  const elapsed = bar.querySelector("[data-capture-time]");
  const download = bar.querySelector("[data-capture-download]");
  const status = bar.querySelector("[data-capture-status]");
  const metrics = bar.querySelector("[data-capture-diagnostics]");
  let recorder = null;
  let stream = null;
  let blobUrl = null;
  let chunks = [];
  let started = 0;
  let durationTimer = null;
  let stopping = false;
  let disposed = false;
  let recordingError = false;
  const mimeType = typeof MediaRecorder === "function" ? MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) : null;
  const supported = typeof canvas.captureStream === "function" && mimeType;

  function releaseTracks() {
    for (const track of stream?.getTracks() || []) track.stop();
    stream = null;
  }
  function clearDurationTimer() {
    clearTimeout(durationTimer);
    durationTimer = null;
  }
  function revokeDownload() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = null;
    download.hidden = true;
    download.removeAttribute("href");
  }
  function updateMetrics() {
    if (disposed) return;
    if (recorder?.state === "recording") {
      const seconds = Math.min(35, Math.floor((performance.now() - started) / 1000));
      elapsed.textContent = "00:" + String(seconds).padStart(2, "0") + " / 00:35";
    }
    try {
      const data = diagnostics();
      metrics.textContent = JSON.stringify({scene:data.scene, fps:data.fps, calls:data.renderer?.calls, triangles:data.renderer?.triangles, people:data.people, quality:data.quality, width:canvas.width, height:canvas.height});
    } catch {
      metrics.textContent = "渲染诊断暂不可用";
    }
  }
  function resetControls() {
    button.textContent = "开始录制";
    button.disabled = !supported;
    stopping = false;
  }
  function stop() {
    if (!recorder || recorder.state === "inactive" || stopping) return;
    stopping = true;
    clearDurationTimer();
    button.disabled = true;
    button.textContent = "正在保存…";
    status.textContent = "正在整理 WebM 文件…";
    try { recorder.stop(); }
    catch (error) {
      releaseTracks();
      recorder = null;
      resetControls();
      status.textContent = "停止录制失败：" + error.message;
    }
  }
  function start() {
    if (!supported || disposed || stopping || recorder?.state === "recording") return;
    releaseTracks();
    revokeDownload();
    chunks = [];
    recordingError = false;
    elapsed.textContent = "00:00 / 00:35";
    try {
      stream = canvas.captureStream(30);
      const active = new MediaRecorder(stream, {mimeType, videoBitsPerSecond:8000000});
      recorder = active;
      active.addEventListener("dataavailable", event => { if (event.data.size > 0 && !disposed) chunks.push(event.data); });
      active.addEventListener("error", event => {
        recordingError = true;
        status.textContent = "录制失败：" + (event.error?.message || "浏览器编码器不可用");
        clearDurationTimer();
        releaseTracks();
        button.disabled = true;
      });
      active.addEventListener("stop", () => {
        clearDurationTimer();
        releaseTracks();
        if (recorder === active) recorder = null;
        resetControls();
        if (disposed) return;
        if (!chunks.length || recordingError) {
          status.textContent = recordingError ? "录制失败，请重新录制" : "没有捕获到有效画面，请重新录制";
          chunks = [];
          return;
        }
        const blob = new Blob(chunks, {type:active.mimeType || mimeType});
        chunks = [];
        blobUrl = URL.createObjectURL(blob);
        download.href = blobUrl;
        download.download = "Echo-Campus-3D-" + new Date().toISOString().replace(/[:.]/g, "-") + ".webm";
        download.hidden = false;
        status.textContent = "录制完成 · " + (blob.size / 1048576).toFixed(1) + " MB · 仅 3D 画面";
      });
      active.start(1000);
      started = performance.now();
      button.textContent = "停止录制";
      status.textContent = "正在录制实际 3D 画面 · 35 秒后自动停止";
      durationTimer = setTimeout(stop, MAX_DURATION_MS);
    } catch (error) {
      clearDurationTimer();
      releaseTracks();
      recorder = null;
      resetControls();
      status.textContent = "无法开始录制：" + error.message;
    }
  }
  function toggle() { if (recorder?.state === "recording") stop(); else start(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearInterval(metricsTimer);
    clearDurationTimer();
    if (recorder?.state === "recording") {
      try { recorder.stop(); } catch { /* Browser is already closing. */ }
    }
    releaseTracks();
    revokeDownload();
    chunks = [];
    button.removeEventListener("click", toggle);
    window.removeEventListener("pagehide", dispose);
    bar.remove();
  }
  if (!supported) {
    button.disabled = true;
    status.textContent = "当前浏览器不支持 WebM 画面录制，请使用 Chrome 或 Edge";
  }
  button.addEventListener("click", toggle);
  window.addEventListener("pagehide", dispose);
  const metricsTimer = setInterval(updateMetrics, 1000);
  updateMetrics();
  return {dispose};
}