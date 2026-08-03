"""MVP2 现场房间 API：状态同步、第一印象与“谁写的？”游戏。"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.group.service import GroupSessionError

router = APIRouter(prefix="/api/v0/group", tags=["group"])


class ParticipantInput(BaseModel):
    person_id: str = Field(min_length=1, max_length=80)
    display_name: str = Field(min_length=1, max_length=40)
    avatar_ref: str | None = Field(default=None, max_length=500)


class CreateSessionRequest(BaseModel):
    title: str = Field(default="今晚的第一印象", min_length=1, max_length=60)
    host: ParticipantInput
    participants: list[ParticipantInput] = Field(min_length=1, max_length=7)


class JoinSessionRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)
    participant: ParticipantInput


class PositionInput(BaseModel):
    x: float
    z: float
    yaw: float = 0.0


class PresenceRequest(BaseModel):
    person_id: str = Field(min_length=1, max_length=80)
    seq: int = Field(ge=1)
    position: PositionInput


class ImpressionRequest(BaseModel):
    author_id: str = Field(min_length=1, max_length=80)
    subject_id: str = Field(min_length=1, max_length=80)
    value: str = Field(min_length=1, max_length=80)


class ImpressionItem(BaseModel):
    subject_id: str = Field(min_length=1, max_length=80)
    value: str = Field(min_length=1, max_length=80)


class ImpressionBatchRequest(BaseModel):
    author_id: str = Field(min_length=1, max_length=80)
    impressions: list[ImpressionItem] = Field(min_length=1, max_length=8)


class ActorRequest(BaseModel):
    actor_id: str = Field(min_length=1, max_length=80)


class GuessRequest(BaseModel):
    player_id: str = Field(min_length=1, max_length=80)
    author_id: str = Field(min_length=1, max_length=80)


def _call(action):
    try:
        return action()
    except GroupSessionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.post("/sessions", status_code=201)
def create_session(request: Request, body: CreateSessionRequest):
    return _call(
        lambda: request.app.state.group_sessions.create_session(
            body.title,
            body.host.model_dump(),
            [item.model_dump() for item in body.participants],
        )
    )


@router.post("/sessions/join")
def join_session(request: Request, body: JoinSessionRequest):
    return _call(
        lambda: request.app.state.group_sessions.join_session(
            body.code, body.participant.model_dump()
        )
    )


@router.get("/sessions/{session_id}")
def get_session(request: Request, session_id: str, viewer_id: str | None = None):
    return _call(
        lambda: request.app.state.group_sessions.get_session(session_id, viewer_id)
    )


@router.put("/sessions/{session_id}/presence")
def update_presence(request: Request, session_id: str, body: PresenceRequest):
    return _call(
        lambda: request.app.state.group_sessions.update_presence(
            session_id, body.person_id, body.seq, body.position.model_dump()
        )
    )


@router.put("/sessions/{session_id}/impressions")
def write_impression(request: Request, session_id: str, body: ImpressionRequest):
    return _call(
        lambda: request.app.state.group_sessions.write_impression(
            session_id, body.author_id, body.subject_id, body.value
        )
    )


@router.put("/sessions/{session_id}/impressions/batch")
def write_impressions(request: Request, session_id: str, body: ImpressionBatchRequest):
    return _call(
        lambda: request.app.state.group_sessions.write_impressions(
            session_id,
            body.author_id,
            [item.model_dump() for item in body.impressions],
        )
    )


@router.post("/sessions/{session_id}/game/start")
def start_game(request: Request, session_id: str, body: ActorRequest):
    return _call(
        lambda: request.app.state.group_sessions.start_game(session_id, body.actor_id)
    )


@router.post("/sessions/{session_id}/game/guess")
def submit_guess(request: Request, session_id: str, body: GuessRequest):
    return _call(
        lambda: request.app.state.group_sessions.submit_guess(
            session_id, body.player_id, body.author_id
        )
    )


@router.post("/sessions/{session_id}/game/next")
def next_round(request: Request, session_id: str, body: ActorRequest):
    return _call(
        lambda: request.app.state.group_sessions.next_round(session_id, body.actor_id)
    )
