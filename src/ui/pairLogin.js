/** 桌面↔手机配对登录会话（LoginPanel 与「手机录入」二维码面板共用）。
 *
 * 一个会话 = 一次配对挑战的完整生命周期：建挑战 → 出二维码 → 轮询状态 →
 * authorized 回调。挑战 10 分钟过期后轮询会拿到 expired，此时自动换一个新
 * 挑战继续（二维码原地刷新），保证屏幕上永远不会是一个死码——2026-08-10
 * 前「手机录入」用的是无 pair 的静态码，扫码后桌面零反馈，且永不过期提示。
 *
 * 状态机：pending → scanned（手机 peek 标记）→ authorized（手机 confirm）。
 * expired 由后端 TTL 判定，前端检测到后静默 rotate。
 */

const API_BASE = `${import.meta.env?.BASE_URL ?? "/"}api`;
export const LOGIN_TOKEN_KEY = "meetmind_access_token";

export function createPairSession({ onChallenge, onStatus, onAuthorized }) {
  let pollTimer = null;
  let stopped = false;

  const stopPolling = () => {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
  };

  async function start() {
    stopPolling();
    let data = null;
    try {
      const response = await fetch(`${API_BASE}/v0/auth/pair`, { method: "POST" });
      data = await response.json();
    } catch { /* 网络错误按服务不可用处理 */ }
    if (stopped) return;
    if (!data?.challenge_id) {
      onStatus?.("二维码服务暂不可用，请稍后重试", "error");
      return;
    }
    onChallenge?.(data.challenge_id);
    onStatus?.("请用微信扫码，并在手机上确认登录到电脑", "pending");
    pollTimer = window.setInterval(async () => {
      let result = null;
      try {
        const poll = await fetch(`${API_BASE}/v0/auth/pair?id=${encodeURIComponent(data.challenge_id)}`);
        result = await poll.json();
      } catch { return; /* 网络抖动：下一轮再试 */ }
      if (stopped) return;
      if (result.status === "authorized" && result.token) {
        stopPolling();
        onAuthorized?.(result.token, result.nickname);
      } else if (result.status === "scanned") {
        onStatus?.("手机已扫码 ✅ 请在手机上点「确认登录到电脑」", "scanned");
      } else if (result.status === "expired") {
        // 静默轮换：旧码已死，立刻换一个新挑战，不让面板停在死码上
        void start();
      }
    }, 2000);
  }

  void start();
  return {
    stop() {
      stopped = true;
      stopPolling();
    },
    restart() {
      stopped = false;
      void start();
    },
  };
}
