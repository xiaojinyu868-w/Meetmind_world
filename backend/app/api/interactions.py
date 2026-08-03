"""用户触发的场景交互 API；状态写入仍经 Agent Runtime 事件与 World Service。"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

router = APIRouter(prefix="/api/v0/agents", tags=["interactions"])


class MeetingRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=120)
    participants: list[str] = Field(min_length=1, max_length=5)

    @field_validator("topic")
    @classmethod
    def normalize_topic(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("topic cannot be blank")
        return value

    @field_validator("participants")
    @classmethod
    def validate_participants(cls, value: list[str]) -> list[str]:
        normalized = [item.strip() for item in value if isinstance(item, str) and item.strip()]
        if not normalized or len(normalized) != len(set(normalized)):
            raise ValueError("participants must be non-empty and unique")
        return normalized


@router.post("/meeting", status_code=201)
def start_meeting(payload: MeetingRequest, request: Request):
    world = request.app.state.world
    runtime = request.app.state.runtime
    known = {agent["id"] for agent in world.snapshot()["agents"]}
    unknown = [person_id for person_id in payload.participants if person_id not in known]
    if unknown:
        raise HTTPException(status_code=404, detail=f"Unknown participants: {', '.join(unknown)}")
    try:
        attempted = runtime.request_meeting(world.snapshot(), payload.topic, payload.participants)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    meeting = world.current_meeting
    if meeting is None or meeting["id"] != attempted["meeting_id"]:
        runtime.end_requested_meeting(attempted["meeting_id"])
        raise HTTPException(status_code=409, detail="圆桌座位暂不可用")
    return {"accepted": True, "meeting_id": meeting["id"],
            "participants": meeting["participants"], "topic": meeting["topic"]}


@router.post("/meeting/{meeting_id}/end")
def end_meeting(meeting_id: str, request: Request):
    world = request.app.state.world
    if world.current_meeting is None or world.current_meeting["id"] != meeting_id:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if not request.app.state.runtime.end_requested_meeting(meeting_id):
        raise HTTPException(status_code=409, detail="Meeting is not user-controlled")
    return {"ended": True, "meeting_id": meeting_id}
