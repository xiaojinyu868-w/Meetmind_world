"""MVP2 group onboarding, first impressions and relationship Fields."""

from __future__ import annotations

import io
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener
from pydantic import BaseModel, Field

from app.security.meetmind_jwt import caller_user_id

from app.packages.store import PackageNotFound

router = APIRouter(prefix="/api/v1", tags=["mvp2-workflows"])

logger = logging.getLogger(__name__)

MAX_GROUP_PHOTO_BYTES = 25 * 1024 * 1024
MAX_GROUP_PHOTO_PIXELS = 80_000_000
GROUP_IMAGE_FORMATS = {
    "AVIF", "BMP", "DIB", "GIF", "HEIC", "HEIF", "JPEG", "PNG", "TIFF", "WEBP",
}
GROUP_IMAGE_FORMAT_LABEL = "HEIC/HEIF、AVIF、JPEG、PNG、WebP、BMP、TIFF 或 GIF"

register_heif_opener()


def _parse_names(raw: str) -> list[str]:
    raw = raw.strip()
    if not raw:
        return []
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        value = [part.strip() for part in raw.split(",")]
    if not isinstance(value, list):
        raise HTTPException(status_code=422, detail="participant_names 必须是 JSON 数组或逗号列表")
    return [str(name).strip() for name in value if str(name).strip()]


@router.post("/group-onboarding", status_code=201)
async def group_onboarding(
    request: Request,
    photo: UploadFile = File(...),
    participant_names: str = Form("[]"),
    expected_count: int = Form(0),
    confirm_participants: bool = Form(True),
):
    content, filename = _normalize_group_photo(await photo.read())
    try:
        return request.app.state.group_onboarding.run(
            content, filename, _parse_names(participant_names),
            expected_count=expected_count,
            confirm_participants=confirm_participants,
            owner_id=caller_user_id(request),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _normalize_group_photo(content: bytes) -> tuple[bytes, str]:
    """按真实文件内容解码常见照片格式，并统一为纠正方向后的 JPEG。"""
    if not content:
        raise HTTPException(status_code=400, detail="合照为空")
    if len(content) > MAX_GROUP_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="合照超过 25MB")
    try:
        with Image.open(io.BytesIO(content)) as source:
            image_format = str(source.format or "").upper()
            if image_format not in GROUP_IMAGE_FORMATS:
                raise HTTPException(
                    status_code=415,
                    detail=f"合照只支持 {GROUP_IMAGE_FORMAT_LABEL}",
                )
            width, height = source.size
            if width <= 0 or height <= 0 or width * height > MAX_GROUP_PHOTO_PIXELS:
                raise HTTPException(status_code=413, detail="合照像素尺寸过大，请缩小后重试")
            source.seek(0)
            image = ImageOps.exif_transpose(source)
            image.load()
            if "A" in image.getbands():
                rgba = image.convert("RGBA")
                canvas = Image.new("RGB", rgba.size, "white")
                canvas.paste(rgba, mask=rgba.getchannel("A"))
                image = canvas
            else:
                image = image.convert("RGB")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(
            status_code=415,
            detail=f"无法读取这张照片；支持 {GROUP_IMAGE_FORMAT_LABEL}",
        ) from exc

    output = io.BytesIO()
    image.save(output, format="JPEG", quality=92, optimize=True)
    return output.getvalue(), "group.jpg"


@router.post("/group-onboarding/detect", status_code=201)
async def group_onboarding_detect(
    request: Request,
    photo: UploadFile = File(...),
    expected_count: int = Form(0),
):
    """两段式第一段：合照落事实层 + 人脸候选（bbox + face_ref），不建 Package。"""
    content, filename = _normalize_group_photo(await photo.read())
    try:
        return request.app.state.group_onboarding.detect(
            content, filename, expected_count=expected_count,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


class GroupAssignment(BaseModel):
    face_id: str | None = None
    face_ref: str | None = None
    bbox: dict | None = None
    name: str = Field(min_length=1, max_length=80)
    impression: str | None = Field(default=None, max_length=300)


class GroupConfirmRequest(BaseModel):
    group_id: str = Field(min_length=1, max_length=80)
    assignments: list[GroupAssignment] = Field(min_length=1, max_length=50)


@router.post("/group-onboarding/confirm", status_code=201)
def group_onboarding_confirm(request: Request, body: GroupConfirmRequest):
    """两段式第二段：按确认的人脸-姓名指派批量建档 + 注册展位大厅。"""
    try:
        result = request.app.state.group_onboarding.confirm(
            body.group_id, [item.model_dump() for item in body.assignments],
            owner_id=caller_user_id(request),
        )
    except ValueError as exc:
        detail = str(exc)
        status = 404 if detail.startswith("未知的 group_id") else 422
        raise HTTPException(status_code=status, detail=detail) from exc
    _trigger_island_builds(request, body.group_id, result,
                           owner_id=caller_user_id(request))
    return result


def _trigger_island_builds(request: Request, group_id: str, result: dict,
                           owner_id: str | None) -> None:
    """confirm 成功后为每位人物自动触发岛屿构建；任何失败都不阻断 confirm。"""
    queue = getattr(request.app.state, "island_builds", None)
    if queue is None:
        return
    store = request.app.state.store
    photo_ref = result.get("source_ref")
    photo = str(store.root / photo_ref) if photo_ref else None
    for i, participant in enumerate(result.get("participants", [])):
        try:
            queue.trigger(
                participant["person_id"],
                owner_id=owner_id or "system",
                group_id=group_id,
                photo=photo,
                person_index=i,  # assignments 顺序 == detect 人脸顺序 == sheet 行序
            )
        except Exception:
            logger.exception(
                "岛屿构建触发失败：person_id=%s group_id=%s",
                participant.get("person_id"), group_id,
            )


class ImpressionRequest(BaseModel):
    author_id: str
    subject_id: str
    text: str = Field(min_length=1, max_length=300)
    kind: Literal["self-assessment", "peer-impression"] = "peer-impression"
    privacy: str = "agent-usable"
    room_id: str | None = None


@router.post("/impressions", status_code=201)
def submit_impression(request: Request, body: ImpressionRequest):
    if body.privacy not in {"self-only", "agent-usable"}:
        raise HTTPException(status_code=422, detail="MVP2 第一印象只允许 self-only/agent-usable")
    if body.kind == "peer-impression" and body.author_id == body.subject_id:
        raise HTTPException(status_code=422, detail="互评的作者和对象不能相同")
    store = request.app.state.store
    caller = caller_user_id(request)
    # 移动端「记录相遇」：作者可以是登录用户本人（Bearer sub == author_id），
    # 此时不要求作者有已确认 Package——用户本人是事实来源，不是 Agent 人物。
    author_is_user = bool(caller) and body.author_id == caller
    try:
        if not author_is_user:
            author = store.load_package(body.author_id)
        subject = store.load_package(body.subject_id)
    except PackageNotFound as exc:
        raise HTTPException(status_code=404, detail=f"人物不存在：{exc.args[0]}") from exc
    if not author_is_user and not author["identity"]["confirmed"]:
        raise HTTPException(status_code=409, detail="第一印象只能由已确认人物提交")
    if not subject["identity"]["confirmed"]:
        raise HTTPException(status_code=409, detail="第一印象只能提交给已确认人物")

    impression_id = f"impression_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
    submission = {
        "schema": "meetmind.impression-submission.v1", "impression_id": impression_id,
        "author_id": body.author_id, "subject_id": body.subject_id,
        "kind": body.kind, "text": body.text.strip(), "privacy": body.privacy,
        "room_id": body.room_id, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    source_ref = store.write_fact(
        body.subject_id, impression_id, "submission.json",
        json.dumps(submission, ensure_ascii=False, indent=2).encode("utf-8"),
    )
    inference = {
        "schema": "meetmind.inference.v1", "id": impression_id,
        "type": "first-impression", "value": body.text.strip(),
        "author_id": body.author_id, "subject_id": body.subject_id,
        "privacy": body.privacy, "source_refs": [source_ref],
        "model": "human-authored.v1", "confidence": 1.0,
        "created_at": submission["created_at"], "regenerable": False,
    }
    store.write_inference(body.subject_id, impression_id, inference)
    return {**inference, "source_ref": source_ref}


class FieldGenerationRequest(BaseModel):
    owner_id: str
    counterpart_id: str
    source_refs: list[str] = Field(min_length=1)
    notes: list[str] = Field(default_factory=list)
    privacy: str = "self-only"


@router.post("/fields/generations", status_code=201)
def generate_field(request: Request, body: FieldGenerationRequest):
    if body.privacy not in {"self-only", "agent-usable"}:
        raise HTTPException(status_code=422, detail="MVP2 场域只允许 self-only/agent-usable")
    store = request.app.state.store
    try:
        store.load_package(body.owner_id)
        store.load_package(body.counterpart_id)
        return request.app.state.field_generation.generate(
            body.owner_id, body.counterpart_id, body.source_refs,
            notes=body.notes, privacy=body.privacy,
        )
    except PackageNotFound as exc:
        raise HTTPException(status_code=404, detail=f"人物不存在：{exc.args[0]}") from exc
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
