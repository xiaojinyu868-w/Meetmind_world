"""K3 Context Hub 对外接收协议。"""

import hashlib
import hmac
import os
import tempfile

from fastapi import APIRouter, Header, HTTPException, Request, Response

from app.config import get_physical_ai_token
from app.physical_ai.service import PhysicalAIError, SHA256_RE

router = APIRouter(prefix="/v1/physical-ai", tags=["physical-ai"])


def _authorize(authorization: str | None) -> None:
    expected = get_physical_ai_token()
    if not expected:
        raise HTTPException(status_code=503, detail="PHYSICAL_AI_AGENT_TOKEN 未配置")
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="Bearer token 无效")


@router.put("/assets/{object_id}")
async def put_asset(
    request: Request,
    object_id: str,
    authorization: str | None = Header(default=None),
    x_physical_ai_asset_id: str | None = Header(default=None),
    x_physical_ai_session_id: str | None = Header(default=None),
    x_content_sha256: str | None = Header(default=None),
):
    _authorize(authorization)
    receiver = request.app.state.physical_ai
    if not SHA256_RE.fullmatch(object_id) or x_content_sha256 != object_id:
        raise HTTPException(status_code=422, detail="object_id 与 X-Content-SHA256 必须是相同的 SHA-256")
    if not x_physical_ai_asset_id or not x_physical_ai_session_id:
        raise HTTPException(status_code=422, detail="缺少 asset_id 或 session_id header")
    content_length = request.headers.get("content-length")
    if content_length is None or not content_length.isdigit():
        raise HTTPException(status_code=411, detail="必须提供有效 Content-Length")
    expected_size = int(content_length)
    target = receiver.object_path(object_id)
    digest = hashlib.sha256()
    size = 0
    fd, temp_name = tempfile.mkstemp(prefix="upload-", dir=receiver.objects)
    try:
        with os.fdopen(fd, "wb") as output:
            async for chunk in request.stream():
                size += len(chunk)
                digest.update(chunk)
                output.write(chunk)
        actual = digest.hexdigest()
        if size != expected_size or actual != object_id:
            raise HTTPException(status_code=422, detail="媒体长度或 SHA-256 校验失败")
        state = "already_present" if target.exists() else "stored"
        if target.exists():
            if target.stat().st_size != size:
                raise HTTPException(status_code=409, detail="object_id 已存在但内容冲突")
        else:
            os.replace(temp_name, target)
            temp_name = ""
        try:
            receiver.register_asset(
                object_id=object_id,
                asset_id=x_physical_ai_asset_id,
                session_id=x_physical_ai_session_id,
                content_type=request.headers.get("content-type", "application/octet-stream"),
                size_bytes=size,
            )
        except PhysicalAIError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
        return {"object_id": object_id, "state": state, "sha256": actual}
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


@router.post("/packages")
async def post_package(
    request: Request,
    response: Response,
    authorization: str | None = Header(default=None),
    x_idempotency_key: str | None = Header(default=None),
    x_physical_ai_package_id: str | None = Header(default=None),
):
    _authorize(authorization)
    if not x_idempotency_key or not x_physical_ai_package_id:
        raise HTTPException(status_code=400, detail="缺少 package 幂等 header")
    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="请求体不是合法 JSON") from exc
    try:
        duplicate, job_id = request.app.state.physical_ai.accept_package(
            payload, x_physical_ai_package_id, x_idempotency_key
        )
    except PhysicalAIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    response.status_code = 200 if duplicate else 202
    return {
        "accepted": True,
        "duplicate": duplicate,
        "package_id": x_physical_ai_package_id,
        "agent_job_id": job_id,
    }
