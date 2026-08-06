"""登录态接口（EchoWorld 侧）：GET /api/v0/auth/me。

流程：Bearer（MeetMind access token）→ 验签 → 本地用户自动补注册
（JSON 落 data/users/<sub>.json，含昵称/头像/首次见到时间；昵称头像顺手
从 MeetMind /api/auth/me 拉一次，拉不到用 token payload）→ 返回当前用户。

前端随后用返回的 user_id 作为「我」（房间 actor / 包 owner / 场域主角）。
未登录（无 token 或验签失败）返回 401，前端按游客模式（只看世界卡司）处理。
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.security.meetmind_jwt import verify_meetmind_token

router = APIRouter(prefix="/api/v0/auth", tags=["auth"])

MEETMIND_ME_URL = "https://capture.meetmind.online/api/auth/me"


def _users_dir(request: Request) -> Path:
    directory = Path(request.app.state.store.root) / "users"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _provision(request: Request, payload: dict, token: str) -> dict:
    """幂等补注册：已有用户文件直接返回（并刷新昵称头像），没有则创建。"""
    sub = payload["sub"]
    path = _users_dir(request) / f"{sub}.json"
    user = None
    if path.is_file():
        try:
            user = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            user = None
    profile = {"nickname": None, "avatar": None}
    try:  # 顺手拉一次主产品资料（失败不阻塞，用 token 里的 username）
        response = httpx.get(MEETMIND_ME_URL,
                             headers={"Authorization": f"Bearer {token}"}, timeout=5)
        if response.status_code == 200:
            data = response.json()
            account = data.get("user") or data.get("data") or data
            profile = {
                "nickname": account.get("nickname") or account.get("username"),
                "avatar": account.get("avatar"),
            }
    except httpx.HTTPError:
        pass
    if user is None:
        user = {
            "schema": "echo-user.v1",
            "user_id": sub,
            "meetmind_username": payload.get("username"),
            "nickname": profile["nickname"] or payload.get("username") or sub,
            "avatar": profile["avatar"],
            "role": payload.get("role"),
            "first_seen_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    else:
        if profile["nickname"]:
            user["nickname"] = profile["nickname"]
        if profile["avatar"]:
            user["avatar"] = profile["avatar"]
    path.write_text(json.dumps(user, ensure_ascii=False, indent=2), encoding="utf-8")
    return user


@router.get("/me")
def auth_me(request: Request):
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        return JSONResponse(status_code=401, content={"detail": "需要 Bearer token"})
    payload = verify_meetmind_token(token)
    if payload is None:
        return JSONResponse(status_code=401, content={"detail": "token 无效或已过期"})
    user = _provision(request, payload, token)
    return {
        "authenticated": True,
        "user_id": user["user_id"],
        "name": user["nickname"],
        "avatar": user.get("avatar"),
        "meetmind_username": user.get("meetmind_username"),
    }
