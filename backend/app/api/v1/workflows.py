"""MVP2 group onboarding, first impressions and relationship Fields."""

from __future__ import annotations

import json
import time
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field

from app.packages.store import PackageNotFound

router = APIRouter(prefix="/api/v1", tags=["mvp2-workflows"])

MAX_GROUP_PHOTO_BYTES = 25 * 1024 * 1024
GROUP_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


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
    content = await photo.read()
    _validate_group_photo(photo, content)
    try:
        return request.app.state.group_onboarding.run(
            content, photo.filename or "group.jpg", _parse_names(participant_names),
            expected_count=expected_count,
            confirm_participants=confirm_participants,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _validate_group_photo(photo: UploadFile, content: bytes) -> None:
    if photo.content_type not in GROUP_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="合照只支持 JPEG、PNG 或 WebP")
    if not content:
        raise HTTPException(status_code=400, detail="合照为空")
    if len(content) > MAX_GROUP_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="合照超过 25MB")


@router.post("/group-onboarding/detect", status_code=201)
async def group_onboarding_detect(
    request: Request,
    photo: UploadFile = File(...),
    expected_count: int = Form(0),
):
    """两段式第一段：合照落事实层 + 人脸候选（bbox + face_ref），不建 Package。"""
    content = await photo.read()
    _validate_group_photo(photo, content)
    try:
        return request.app.state.group_onboarding.detect(
            content, photo.filename or "group.jpg", expected_count=expected_count,
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
        return request.app.state.group_onboarding.confirm(
            body.group_id, [item.model_dump() for item in body.assignments],
        )
    except ValueError as exc:
        detail = str(exc)
        status = 404 if detail.startswith("未知的 group_id") else 422
        raise HTTPException(status_code=status, detail=detail) from exc


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
    try:
        author = store.load_package(body.author_id)
        subject = store.load_package(body.subject_id)
    except PackageNotFound as exc:
        raise HTTPException(status_code=404, detail=f"人物不存在：{exc.args[0]}") from exc
    if not author["identity"]["confirmed"] or not subject["identity"]["confirmed"]:
        raise HTTPException(status_code=409, detail="第一印象只能由已确认人物提交给已确认人物")

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
