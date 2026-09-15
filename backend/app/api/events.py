"""活动模式 HTTP 契约（/api/v0/events）：碰卡入场 → 分身进入活动地图。

GET  /api/v0/events/{event_id}                     活动概要（标题、分区、在场人数、last_seq）
GET  /api/v0/events/{event_id}/checkins?since=N    增量拉取（updated_seq > N），大屏 2s 轮询
POST /api/v0/events/{event_id}/checkins            碰卡签到：201 新建 / 200 回访（同 tag 幂等）
GET  /api/v0/events/{event_id}/checkins/{id}/atlas.png  分身皮肤（128×128，手机本地生成）
GET  /api/v0/events/{event_id}/qr.png              指向手机碰卡页的二维码（NFC 之外的兜底入口）

服务器只保存像素皮肤与文字，不接收原始照片；活动 ID 在合法字符范围内即可使用（原型阶段）。
"""

from __future__ import annotations

import io
import os
import re

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, Field

from app.events import AtlasInvalid, EventFull, EventNotFound
from app.security.meetmind_jwt import caller_user_id

router = APIRouter(prefix="/api/v0/events", tags=["event-mode"])

CHECKIN_ID_PATTERN = re.compile(r"^ck_[0-9a-f]{12}$")


class CheckInRequest(BaseModel):
    tag_id: str = Field(min_length=2, max_length=64)
    display_name: str = Field(min_length=1, max_length=24)
    intro: str | None = Field(default=None, max_length=60)
    zone_id: str | None = Field(default=None, max_length=40)
    atlas_png: str | None = Field(default=None, max_length=120_000)
    style: dict | None = None
    source: str = Field(default="nfc", pattern=r"^(nfc|qr|manual|demo)$")


def _store(request: Request):
    return request.app.state.event_checkins


def _public_event_url(event_id: str) -> str:
    domain = os.environ.get("PUBLIC_DOMAIN", "").strip()
    if domain:
        protocol = os.environ.get("PUBLIC_PROTOCOL", "https").strip() or "https"
        base = f"{protocol}://{domain}"
    else:
        base = os.environ.get("WECHAT_MP_PUBLIC_BASE_URL", "").strip().rstrip("/") \
            or "https://capture.meetmind.online"
    return f"{base}/echoworld/event.html?event={event_id}&mode=tap"


@router.get("/{event_id}")
def get_event(request: Request, event_id: str):
    try:
        return _store(request).summary(event_id)
    except EventNotFound:
        raise HTTPException(status_code=404, detail=f"活动 ID 非法：{event_id}")


@router.get("/{event_id}/checkins")
def list_checkins(request: Request, event_id: str,
                  since: int = Query(0, ge=0), limit: int = Query(500, ge=1, le=2000)):
    try:
        return _store(request).list_checkins(event_id, since=since, limit=limit)
    except EventNotFound:
        raise HTTPException(status_code=404, detail=f"活动 ID 非法：{event_id}")


@router.post("/{event_id}/checkins")
def check_in(request: Request, event_id: str, body: CheckInRequest):
    try:
        record, created = _store(request).check_in(
            event_id,
            tag_id=body.tag_id,
            display_name=body.display_name,
            intro=body.intro,
            zone_id=body.zone_id,
            atlas_png=body.atlas_png,
            style=body.style,
            source=body.source,
            owner_id=caller_user_id(request),
        )
    except EventNotFound:
        raise HTTPException(status_code=404, detail=f"活动 ID 非法：{event_id}")
    except AtlasInvalid as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except EventFull:
        raise HTTPException(status_code=409, detail="活动分区已满，请联系现场工作人员")
    payload = {"checkin": record, "returning": not created}
    return JSONResponse(status_code=201 if created else 200, content=payload)


@router.get("/{event_id}/checkins/{checkin_id}/atlas.png")
def get_atlas(request: Request, event_id: str, checkin_id: str):
    if not CHECKIN_ID_PATTERN.match(checkin_id):
        raise HTTPException(status_code=404, detail="签到不存在")
    try:
        path = _store(request).atlas_path(event_id, checkin_id)
    except EventNotFound:
        raise HTTPException(status_code=404, detail=f"活动 ID 非法：{event_id}")
    if path is None:
        raise HTTPException(status_code=404, detail="该分身没有上传皮肤")
    return FileResponse(path, media_type="image/png",
                        headers={"Cache-Control": "public, max-age=60"})


@router.get("/{event_id}/qr.png")
def event_qr(request: Request, event_id: str):
    import segno

    try:
        _store(request).validate_event_id(event_id)
    except EventNotFound:
        raise HTTPException(status_code=404, detail=f"活动 ID 非法：{event_id}")
    buffer = io.BytesIO()
    segno.make(_public_event_url(event_id), error="m").save(
        buffer, kind="png", scale=8, border=2, dark="#1f2a24", light="#f6f3ea")
    return Response(content=buffer.getvalue(), media_type="image/png",
                    headers={"Cache-Control": "no-store"})
