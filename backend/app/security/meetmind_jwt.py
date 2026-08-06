"""MeetMind 共享 JWT 验签（方案 1：共享 JWT_SECRET 互认，docs/LOGIN-AND-OWNERSHIP.md）。

MeetMind 主产品的 access token 是自实现 HS256（auth-service.ts）：
header.payload.signature，payload = {sub, username, role, permissions, iat, exp}。
本模块零依赖复刻验签（hmac + base64url），只做 验签 + exp 检查，
payload 其余字段（permissions 等 MeetMind 私有契约）原样透传不解释。

安全：JWT_SECRET 只从环境变量读取，不进日志/异常消息。
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time


def _b64url_decode(segment: str) -> bytes:
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))


def _jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "").strip()


def verify_meetmind_token(token: str) -> dict | None:
    """验签 + 过期检查；有效返回 payload dict，否则 None。未配置 secret 返回 None。"""
    secret = _jwt_secret()
    if not secret or not token:
        return None
    parts = token.split(".")
    if len(parts) != 3:
        return None
    header_b64, payload_b64, signature_b64 = parts
    try:
        header = json.loads(_b64url_decode(header_b64))
        if header.get("alg") != "HS256":
            return None
        expected = hmac.new(
            secret.encode(), f"{header_b64}.{payload_b64}".encode(), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(expected, _b64url_decode(signature_b64)):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
    except (ValueError, json.JSONDecodeError):
        return None
    if not isinstance(payload.get("sub"), str) or not payload["sub"]:
        return None
    exp = payload.get("exp")
    if not isinstance(exp, (int, float)) or exp <= time.time():
        return None
    return payload


def caller_user_id(request) -> str | None:
    """从请求 Authorization 头解析调用者 sub；未登录/无效返回 None（不抛异常）。"""
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        return None
    payload = verify_meetmind_token(token)
    return payload["sub"] if payload else None
