"""HTTP and WebSocket adapters for the deterministic room service."""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.agents.contracts import EventEnvelope
from app.domain.rooms import RoomError, RoomService
from app.realtime.protocol import STREAM_POLL_SECONDS, error_frame, event_frame
from app.security.meetmind_jwt import caller_user_id

router = APIRouter(prefix="/api/v1/rooms", tags=["rooms-v1"])


class PositionInput(BaseModel):
    x: float
    z: float


class HotspotInput(BaseModel):
    hotspot_id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    position: PositionInput
    radius: float = Field(gt=0, le=50)
    allowed_actions: list[str]


class CreateRoomInput(BaseModel):
    room_id: str | None = Field(default=None, min_length=1, max_length=80)
    name: str = Field(default="Meetmind room", min_length=1, max_length=120)
    hotspots: list[HotspotInput] | None = None


class JoinRoomInput(BaseModel):
    member_id: str = Field(min_length=1, max_length=80)
    display_name: str = Field(min_length=1, max_length=120)
    position: PositionInput = Field(default_factory=lambda: PositionInput(x=0, z=0))


class CommandInput(BaseModel):
    command_id: str = Field(min_length=1, max_length=120)
    actor_id: str = Field(min_length=1, max_length=80)
    type: str = Field(min_length=1, max_length=80)
    payload: dict[str, Any] = Field(default_factory=dict)
    expected_revision: int | None = Field(default=None, ge=0)


def _service(app) -> RoomService:
    service = getattr(app.state, "room_service", None)
    if service is None:
        service = RoomService()
        app.state.room_service = service
    return service


def _raise_http(exc: RoomError) -> None:
    if exc.code in {"room_not_found", "member_not_found", "hotspot_not_found",
                    "invitation_not_found", "meeting_not_found"}:
        status = 404
    elif exc.code in {"meeting_forbidden"}:
        status = 403
    elif exc.code in {"unknown_command", "invalid_command", "invalid_position",
                      "invalid_hotspot", "position_out_of_bounds"}:
        status = 422
    else:
        status = 409
    raise HTTPException(status_code=status, detail={"code": exc.code, "message": exc.message})


@router.post("", status_code=201)
def create_room(body: CreateRoomInput, request: Request):
    hotspots = None
    if body.hotspots is not None:
        hotspots = [item.model_dump() for item in body.hotspots]
    try:
        return _service(request.app).create_room(
            room_id=body.room_id,
            name=body.name,
            hotspots=hotspots,
        )
    except RoomError as exc:
        _raise_http(exc)


@router.post("/{room_id}/join")
def join_room(room_id: str, body: JoinRoomInput, request: Request):
    try:
        return _service(request.app).join_room(
            room_id,
            member_id=body.member_id,
            display_name=body.display_name,
            position=body.position.model_dump(),
        )
    except RoomError as exc:
        _raise_http(exc)


@router.get("/{room_id}/snapshot")
def room_snapshot(room_id: str, request: Request):
    try:
        snapshot = _service(request.app).snapshot(room_id)
    except RoomError as exc:
        _raise_http(exc)
    # 房间成员按归属过滤（LOGIN-AND-OWNERSHIP）：常驻居民 + 自己 + 本人
    store = getattr(request.app.state, "store", None)
    if store is None:
        return snapshot  # 独立 RoomService 宿主（无 PackageStore）不过滤
    caller = caller_user_id(request)
    visible = {"system"} | ({caller} if caller else set())
    owners = {p["person_id"]: p.get("owner_id") or "system"
              for p in request.app.state.store.list_packages(include_deactivated=True)}

    def member_visible(member_id: str) -> bool:
        if member_id == caller or owners.get(member_id, "system") in visible:
            return True
        return caller is None and member_id == "person-self"  # 未登录开发模式

    snapshot["members"] = [
        member for member in snapshot["members"] if member_visible(member["member_id"])
    ]
    snapshot["agent_runtime"] = [
        item for item in snapshot.get("agent_runtime", [])
        if member_visible(item["agent_id"])
    ]
    return snapshot


@router.post("/{room_id}/commands")
async def execute_command(room_id: str, body: CommandInput, request: Request):
    try:
        service = _service(request.app)
        result = service.execute(
            room_id,
            command_id=body.command_id,
            actor_id=body.actor_id,
            command_type=body.type,
            payload=body.payload,
            expected_revision=body.expected_revision,
        )
        coordinator = getattr(request.app.state, "agent_coordinator", None)
        if coordinator is not None and not result.get("replayed"):
            generated = []
            for raw in tuple(result["events"]):
                generated.extend(await coordinator.process(EventEnvelope(
                    event_id=raw["event_id"], type=raw["type"],
                    room_id=raw["room_id"], actor_id=raw.get("actor_id"),
                    subject_id=raw.get("subject_id"),
                    payload=raw.get("payload") or {}, sequence=raw["sequence"],
                    correlation_id=raw["event_id"],
                )))
            if generated:
                latest = service.snapshot(room_id)["sequence"]
                result["events"].extend(generated)
                result["sequence"] = latest
                service.attach_generated_events(room_id, body.command_id, generated, latest)
        # A user-started roundtable must be visible immediately. Waiting for the
        # 15-second world heartbeat (plus the client's snapshot poll) made the UI
        # time out while every participant still looked seated at their old table.
        if (
            not result.get("replayed")
            and any(event.get("type") == "meeting.started" for event in result.get("events", []))
        ):
            conductor = getattr(request.app.state, "room_conductor", None)
            if conductor is not None:
                conductor.tick_room(room_id)
        return result
    except RoomError as exc:
        _raise_http(exc)


@router.get("/{room_id}/events")
def replay_events(
    room_id: str,
    request: Request,
    after_sequence: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
):
    try:
        events = _service(request.app).events_after(
            room_id, after_sequence=after_sequence, limit=limit
        )
        return {"room_id": room_id, "events": events}
    except RoomError as exc:
        _raise_http(exc)


@router.get("/{room_id}/brief")
def morning_brief(
    room_id: str, request: Request,
    after_sequence: int = Query(default=0, ge=0),
):
    try:
        return _service(request.app).brief(room_id, after_sequence=after_sequence)
    except RoomError as exc:
        _raise_http(exc)


@router.websocket("/{room_id}/stream")
async def room_stream(
    websocket: WebSocket,
    room_id: str,
    after_sequence: int = Query(default=0, ge=0),
):
    service = _service(websocket.app)
    await websocket.accept()
    try:
        service.snapshot(room_id)
    except RoomError as exc:
        await websocket.send_json(error_frame(exc.code, exc.message))
        await websocket.close(code=4404)
        return
    cursor = after_sequence
    try:
        while True:
            events = service.events_after(room_id, after_sequence=cursor, limit=500)
            for event in events:
                await websocket.send_json(event_frame(event))
                cursor = event["sequence"]
            await asyncio.sleep(STREAM_POLL_SECONDS)
    except (WebSocketDisconnect, asyncio.CancelledError):
        return
