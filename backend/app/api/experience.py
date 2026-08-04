"""MVP2 场域、空间互动与世界播报接口（IF-9）。"""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.fields import ensure_field
from app.packages.store import PackageNotFound
from app.world.event_store import runtime_event_entry

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
    # 晨报 = 持久化用户互动事件 + 各世界 runtime 滚动缓冲里的 agent 自主事件
    runtime_events = []
    for world_name in ("world", "hall"):
        service = getattr(request.app.state, world_name, None)
        recent_events = getattr(service, "recent_events", None)
        if not callable(recent_events):
            continue
        for event in recent_events():
            entry = runtime_event_entry(event, world_name)
            if entry is not None:
                runtime_events.append(entry)
    return request.app.state.world_events.morning_brief(runtime_events)


@router.post("/world/interactions")
def record_interaction(request: Request, body: InteractionRequest):
    return request.app.state.world_events.append(
        body.type,
        body.summary,
        person_ids=body.person_ids,
        source=body.source,
        payload=body.payload,
    )
