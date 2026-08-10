/** 微信扫码登录面板（EchoWorld 自建配对登录，不经过 MeetMind 服务号会话）。
 *
 * 流程（与教育产品零交互）：
 * 1. POST /api/v0/auth/pair 建配对挑战（pairLogin.js 统一处理，过期自动轮换）；
 * 2. 展示 /api/mobile/qr.png?pair=<id>（纯网址码 → 我们自己的移动页）；
 * 3. 手机扫码 → 移动页微信授权登录 → 点「确认登录到电脑」→ /pair/confirm；
 * 4. 轮询拿到 authorized 后写 localStorage.meetmind_access_token 并整页刷新
 *    （boot 时身份水合生效，token 为 EchoWorld 自签的兼容 JWT）。
 */

import { createPairSession, LOGIN_TOKEN_KEY } from "./pairLogin.js";

const API_BASE = `${import.meta.env?.BASE_URL ?? "/"}api`;
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
  const token = localStorage.getItem(LOGIN_TOKEN_KEY);
  if (token) return null;  // 已登录：身份水合由 main.js 负责

  const chip = createChip();
  document.body.append(chip);

  let panel = null;
  let session = null;
  const closePanel = () => {
    session?.stop();
    session = null;
    panel?.remove();
    panel = null;
  };

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
    session = createPairSession({
      onChallenge(challengeId) {
        imgEl.src = `${API_BASE}/mobile/qr.png?pair=${encodeURIComponent(challengeId)}`;
        imgEl.nextElementSibling?.remove();
      },
      onStatus(text) {
        statusEl.textContent = text;
      },
      onAuthorized(authToken, nickname) {
        statusEl.textContent = `欢迎，${nickname ?? "朋友"}！正在进入你的世界…`;
        localStorage.setItem(LOGIN_TOKEN_KEY, authToken);
        window.setTimeout(() => window.location.reload(), 600);
      },
    });
  });

  // 首次访问且未主动关过：自动展开一次引导
  if (!localStorage.getItem(DISMISS_KEY)) {
    chip.click();
  }
  return { close: closePanel };
}
