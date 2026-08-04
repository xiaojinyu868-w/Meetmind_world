"""MVP2 场域、空间互动与世界播报接口（IF-9）。"""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.fields import ensure_field
from app.packages.store import PackageNotFound

router = APIRouter(prefix="/api/v0", tags=["experience"])


class InteractionRequest(BaseModel):
    type: Literal[
        "booth-viewed", "coffee-shared", "meeting-started", "meeting-ended",
        "memory-recalled", "field-entered", "thread-opened", "echo-left",
        "invitation-sent",
    ]
    summary: str = Field(min_length=1, max_length=180)
    person_ids: list[str] = Field(default_factory=list, max_length=8)
    source: str = Field(default="scene-interaction", min_length=1, max_length=40)
    payload: dict = Field(default_factory=dict)


@router.get("/fields/{person_id}")
def get_field(request: Request, person_id: str):
    try:
        return ensure_field(request.app.state.store, person_id)
    except PackageNotFound:
        raise HTTPException(status_code=404, detail=f"人物不存在：{person_id}")


@router.post("/fields/{person_id}/regenerate")
def regenerate_field(request: Request, person_id: str):
    try:
        return ensure_field(request.app.state.store, person_id, regenerate=True)
    except PackageNotFound:
        raise HTTPException(status_code=404, detail=f"人物不存在：{person_id}")


@router.get("/world/events")
def world_events(request: Request, limit: int = Query(20, ge=1, le=100)):
    return {"events": request.app.state.world_events.list_recent(limit)}


@router.get("/world/brief")
def world_brief(request: Request):
    return request.app.state.world_events.morning_brief()


@router.post("/world/interactions")
def record_interaction(request: Request, body: InteractionRequest):
    return request.app.state.world_events.append(
        body.type,
        body.summary,
        person_ids=body.person_ids,
        source=body.source,
        payload=body.payload,
    )
