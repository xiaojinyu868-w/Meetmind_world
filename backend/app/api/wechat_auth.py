"""EchoWorld 自建微信网页授权（snsapi_userinfo）登录。

为什么自建：扫码/登录后落地必须是 EchoWorld 自己的移动产品页
（/echoworld/api/mobile/），而不是教育产品流程。公众号 AppID 与主产品共用
（网页授权域名按 capture.meetmind.online 校验，路径无关），回调指到我们
自己的 /api/v0/auth/wechat/callback。

流程：
  GET /api/v0/auth/wechat/login   → 302 到微信 authorize（state 一次性、10 分钟 TTL）
  GET /api/v0/auth/wechat/url     → JSON {url, state}（前端自取跳转）
  GET /api/v0/auth/wechat/callback → code 换 openid+access_token → sns/userinfo 拉昵称头像
    → 本地补注册 data/users/wechat_<openid>.json → sign_echo_token 签 MeetMind 兼容 JWT
    → 302 /echoworld/api/mobile/?token=<jwt>

安全：secret 只从环境变量读取；state 一次性、落盘带 TTL；微信侧 errcode 不携带
secret 信息原样透出 errmsg。
"""

from __future__ import annotations

import json
import os
import secrets
import time
from pathlib import Path
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from app.security.meetmind_jwt import sign_echo_token

router = APIRouter(prefix="/api/v0/auth/wechat", tags=["auth-wechat"])

AUTHORIZE_URL = "https://open.weixin.qq.com/connect/oauth2/authorize"
TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token"
USERINFO_URL = "https://api.weixin.qq.com/sns/userinfo"
STATE_TTL_SECONDS = 600
TOKEN_EXPIRES_IN = 30 * 24 * 3600  # 移动端免频繁重登：30 天
MOBILE_PAGE_PATH = "/echoworld/api/mobile/"


def _app_id() -> str:
    return os.environ.get("WECHAT_APP_ID", "").strip()


def _app_secret() -> str:
    return os.environ.get("WECHAT_APP_SECRET", "").strip()


def _public_base() -> str:
    domain = os.environ.get("PUBLIC_DOMAIN", "").strip()
    if domain:
        protocol = os.environ.get("PUBLIC_PROTOCOL", "https").strip() or "https"
        return f"{protocol}://{domain}"
    base = os.environ.get("WECHAT_MP_PUBLIC_BASE_URL", "").strip().rstrip("/")
    return base or "https://capture.meetmind.online"


def _callback_url() -> str:
    return f"{_public_base()}/echoworld/api/v0/auth/wechat/callback"


def _states_path(request: Request) -> Path:
    directory = Path(request.app.state.store.root) / "users"
    directory.mkdir(parents=True, exist_ok=True)
    return directory / "oauth_states.json"


def _load_states(request: Request) -> dict:
    path = _states_path(request)
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_states(request: Request, states: dict) -> None:
    _states_path(request).write_text(
        json.dumps(states, ensure_ascii=False, indent=2), encoding="utf-8")


def _issue_state(request: Request) -> str:
    states = _load_states(request)
    now = time.time()
    states = {key: ts for key, ts in states.items() if now - float(ts) < STATE_TTL_SECONDS}
    state = secrets.token_urlsafe(16)
    states[state] = now
    _save_states(request, states)
    return state


def _consume_state(request: Request, state: str) -> bool:
    states = _load_states(request)
    created = states.pop(state, None)
    _save_states(request, states)
    return created is not None and time.time() - float(created) < STATE_TTL_SECONDS


def _authorize_url(state: str) -> str:
    query = urlencode({
        "appid": _app_id(),
        "redirect_uri": _callback_url(),
        "response_type": "code",
        "scope": "snsapi_userinfo",
        "state": state,
    })
    return f"{AUTHORIZE_URL}?{query}#wechat_redirect"


def _error_page(title: str, detail: str) -> HTMLResponse:
    return HTMLResponse(
        f"""<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · EchoWorld</title>
<body style="font-family:-apple-system,'PingFang SC',sans-serif;background:#f6f3ea;
color:#333415;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
<div style="max-width:320px;text-align:center">
<h2 style="margin:0 0 12px">{title}</h2>
<p style="color:#6b6a4e;font-size:14px;line-height:1.7">{detail}</p>
<a href="{MOBILE_PAGE_PATH}" style="display:inline-block;margin-top:16px;padding:12px 28px;
background:#4a7c59;color:#fff;border-radius:999px;text-decoration:none">返回 EchoWorld</a>
</div></body></html>""",
        status_code=400,
    )


@router.get("/login")
def wechat_login(request: Request):
    """直接 302 到微信授权页（移动端「微信一键登录」按钮的 href）。"""
    if not _app_id():
        return _error_page("微信登录未配置", "服务器缺少 WECHAT_APP_ID，请联系管理员。")
    return RedirectResponse(_authorize_url(_issue_state(request)))


@router.get("/url")
def wechat_url(request: Request):
    """JSON 形式取授权链接（前端自行跳转 / 生成二维码用）。"""
    if not _app_id():
        return JSONResponse(status_code=503, content={"detail": "WECHAT_APP_ID 未配置"})
    state = _issue_state(request)
    return {"url": _authorize_url(state), "state": state, "expires_in": STATE_TTL_SECONDS}


@router.get("/callback")
def wechat_callback(request: Request, code: str = "", state: str = ""):
    if not state or not _consume_state(request, state):
        return _error_page("登录状态已过期", "请回到 EchoWorld 重新发起登录。")
    if not code:
        return _error_page("未完成授权", "微信没有返回授权码，可能取消了授权，请重试。")
    try:
        token_resp = httpx.get(TOKEN_URL, params={
            "appid": _app_id(), "secret": _app_secret(),
            "code": code, "grant_type": "authorization_code",
        }, timeout=8).json()
    except httpx.HTTPError:
        return _error_page("网络异常", "与微信服务器通信失败，请稍后重试。")
    if token_resp.get("errcode"):
        return _error_page("微信授权失败",
                           f"微信返回：{token_resp.get('errmsg', '未知错误')}，请重试。")
    openid = token_resp.get("openid", "")
    access_token = token_resp.get("access_token", "")
    if not openid or not access_token:
        return _error_page("微信授权失败", "微信未返回有效的身份信息，请重试。")

    nickname, avatar = "", ""
    try:
        info = httpx.get(USERINFO_URL, params={
            "access_token": access_token, "openid": openid, "lang": "zh_CN",
        }, timeout=8).json()
        if not info.get("errcode"):
            nickname = str(info.get("nickname") or "").strip()
            avatar = str(info.get("headimgurl") or "").strip()
    except httpx.HTTPError:
        pass  # 昵称头像拉取失败不阻塞登录

    user_id = f"wechat_{openid}"
    users_dir = Path(request.app.state.store.root) / "users"
    users_dir.mkdir(parents=True, exist_ok=True)
    user_path = users_dir / f"{user_id}.json"
    user = None
    if user_path.is_file():
        try:
            user = json.loads(user_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            user = None
    if user is None:
        user = {
            "schema": "echo-user.v1",
            "user_id": user_id,
            "source": "wechat-oauth",
            "first_seen_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    user["nickname"] = nickname or user.get("nickname") or "微信朋友"
    user["avatar"] = avatar or user.get("avatar")
    user["last_login_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    user_path.write_text(json.dumps(user, ensure_ascii=False, indent=2), encoding="utf-8")

    token = sign_echo_token(user_id, user["nickname"], expires_in=TOKEN_EXPIRES_IN)
    return RedirectResponse(f"{MOBILE_PAGE_PATH}?token={token}")
