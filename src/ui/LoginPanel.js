/** 微信扫码登录面板（EchoWorld 自建配对登录，不经过 MeetMind 服务号会话）。
 *
 * 流程（与教育产品零交互）：
 * 1. POST /api/v0/auth/pair 建配对挑战；
 * 2. 展示 /api/mobile/qr.png?pair=<id>（纯网址码 → 我们自己的移动页）；
 * 3. 手机扫码 → 移动页微信授权登录 → 点「确认登录到电脑」→ /pair/confirm；
 * 4. 面板轮询 GET /pair?id= → authorized 后写 localStorage.meetmind_access_token
 *    并整页刷新（boot 时身份水合生效，token 为 EchoWorld 自签的兼容 JWT）。
 */

const API_BASE = `${import.meta.env?.BASE_URL ?? "/"}api`;
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

  async function startPairFlow(statusEl, imgEl) {
    statusEl.onclick = null;
    statusEl.style.cursor = "";
    const response = await fetch(`${API_BASE}/v0/auth/pair`, { method: "POST" });
    const data = await response.json();
    if (!data?.challenge_id) {
      statusEl.textContent = data?.detail ?? "二维码服务暂不可用";
      return;
    }
    imgEl.src = `${API_BASE}/mobile/qr.png?pair=${encodeURIComponent(data.challenge_id)}`;
    imgEl.nextElementSibling?.remove();
    statusEl.textContent = "请用微信扫码，并在手机上确认登录到电脑";
    stopPolling();
    pollTimer = window.setInterval(async () => {
      try {
        const poll = await fetch(`${API_BASE}/v0/auth/pair?id=${encodeURIComponent(data.challenge_id)}`);
        const result = await poll.json();
        if (result.status === "authorized" && result.token) {
          stopPolling();
          statusEl.textContent = `欢迎，${result.nickname ?? "朋友"}！正在进入你的世界…`;
          localStorage.setItem(TOKEN_KEY, result.token);
          window.setTimeout(() => window.location.reload(), 600);
        } else if (result.status === "scanned") {
          statusEl.textContent = "手机已扫码 ✅ 请在手机上点「确认登录到电脑」";
        } else if (result.status === "expired") {
          stopPolling();
          statusEl.textContent = "二维码已过期，点击重新获取";
          statusEl.style.cursor = "pointer";
          statusEl.onclick = () => startPairFlow(statusEl, imgEl);
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
    void startPairFlow(statusEl, imgEl);
  });

  // 首次访问且未主动关过：自动展开一次引导
  if (!localStorage.getItem(DISMISS_KEY)) {
    chip.click();
  }
  return { close: closePanel };
}
