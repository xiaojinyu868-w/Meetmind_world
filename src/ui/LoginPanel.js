/** 微信登录面板（MeetMind 共享登录态）。
 *
 * 同源复用 MeetMind 的公众号带参二维码流程（/api/auth/wechat/qr）：
 * POST 建挑战 → <img> 展示二维码 → 轮询 GET ?id= → authenticated 后写
 * localStorage.meetmind_access_token 并整页刷新（boot 时身份水合生效）。
 * 微信内浏览器直接给主站登录页链接（snsapi_userinfo 授权后回主站，
 * token 同样落在同域 localStorage，回到 EchoWorld 自动识别）。
 */

const MEETMIND_QR_URL = "/api/auth/wechat/qr";
const MEETMIND_LOGIN_URL = "/login";
const TOKEN_KEY = "meetmind_access_token";
const DISMISS_KEY = "echo-login-dismissed";

function createPanel() {
  const host = document.createElement("div");
  host.className = "login-panel glass-panel";
  host.innerHTML = `
    <button class="login-panel-close" type="button" aria-label="关闭">×</button>
    <div class="login-panel-body">
      <h2>微信扫码登录</h2>
      <p>登录后你的世界会带上你录入的人；游客模式只看常驻居民。</p>
      <div class="login-qr"><img alt="微信登录二维码" /><span>正在获取二维码…</span></div>
      <p class="login-status" data-status>请用微信扫码</p>
      <a class="login-alt" href="${MEETMIND_LOGIN_URL}" target="_blank" rel="noopener">在微信中打开登录页 →</a>
    </div>`;
  return host;
}

function createChip() {
  const chip = document.createElement("button");
  chip.className = "login-chip glass-control";
  chip.type = "button";
  chip.innerHTML = `<span><small>Account</small><strong>登录</strong></span>`;
  return chip;
}

export function mountLoginPanel() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return null;  // 已登录：身份水合由 main.js 负责

  const chip = createChip();
  document.body.append(chip);

  let panel = null;
  let pollTimer = null;
  const stopPolling = () => {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
  };
  const closePanel = () => {
    stopPolling();
    panel?.remove();
    panel = null;
  };

  async function startQrFlow(statusEl, imgEl) {
    const response = await fetch(MEETMIND_QR_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "login" }),
    });
    const data = await response.json();
    if (!data?.success || !data.challengeId) {
      statusEl.textContent = data?.error ?? "二维码服务暂不可用";
      return;
    }
    imgEl.src = data.imageUrl;
    imgEl.nextElementSibling?.remove();
    statusEl.textContent = "请用微信扫码（扫码后在微信里确认）";
    stopPolling();
    pollTimer = window.setInterval(async () => {
      try {
        const poll = await fetch(`${MEETMIND_QR_URL}?id=${encodeURIComponent(data.challengeId)}`);
        const result = await poll.json();
        if (result.status === "authenticated" && result.accessToken) {
          stopPolling();
          statusEl.textContent = `欢迎，${result.nickname ?? "朋友"}！正在进入你的世界…`;
          localStorage.setItem(TOKEN_KEY, result.accessToken);
          window.setTimeout(() => window.location.reload(), 600);
        } else if (result.status === "scanned") {
          statusEl.textContent = "已扫码，请在微信里确认登录";
        } else if (result.status === "expired" || result.status === "failed") {
          stopPolling();
          statusEl.textContent = "二维码已过期，点击重新获取";
          statusEl.style.cursor = "pointer";
          statusEl.onclick = () => startQrFlow(statusEl, imgEl);
        }
      } catch { /* 网络抖动：下一轮再试 */ }
    }, 2000);
  }

  chip.addEventListener("click", () => {
    if (panel) {
      closePanel();
      return;
    }
    panel = createPanel();
    document.body.append(panel);
    panel.querySelector(".login-panel-close").addEventListener("click", () => {
      localStorage.setItem(DISMISS_KEY, "1");
      closePanel();
    });
    const statusEl = panel.querySelector("[data-status]");
    const imgEl = panel.querySelector(".login-qr img");
    void startQrFlow(statusEl, imgEl);
  });

  // 首次访问且未主动关过：自动展开一次引导
  if (!localStorage.getItem(DISMISS_KEY)) {
    chip.click();
  }
  return { close: closePanel };
}
