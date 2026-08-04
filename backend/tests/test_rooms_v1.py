"""Acceptance tests for the MVP 2.0 room/meeting/bulletin vertical slice."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.rooms import router
from app.domain.rooms import RoomService


def _client() -> TestClient:
    app = FastAPI()
    app.state.room_service = RoomService()
    app.include_router(router)
    return TestClient(app)


def _create_and_join(client: TestClient) -> None:
    response = client.post(
        "/api/v1/rooms",
        json={"room_id": "demo", "name": "MVP2 demo"},
    )
    assert response.status_code == 201
    assert response.json()["sequence"] == 1
    for member_id, x in (("alice", 0.0), ("bob", 0.5)):
        response = client.post(
            "/api/v1/rooms/demo/join",
            json={
                "member_id": member_id,
                "display_name": member_id.title(),
                "position": {"x": x, "z": 0.0},
            },
        )
        assert response.status_code == 200


def _command(
    client: TestClient, command_id: str, command_type: str, payload: dict,
    *, actor_id: str = "alice",
):
    return client.post(
        "/api/v1/rooms/demo/commands",
        json={
            "command_id": command_id,
            "actor_id": actor_id,
            "type": command_type,
            "payload": payload,
        },
    )


def test_meeting_lifecycle_is_ordered_idempotent_and_publishes_bulletin():
    client = _client()
    _create_and_join(client)

    invite = _command(
        client,
        "cmd-invite",
        "meeting.invite",
        {
            "invitation_id": "invite-1",
            "participant_ids": ["bob"],
            "topic": "Agent architecture",
        },
    )
    assert invite.status_code == 200
    assert invite.json()["events"][0]["type"] == "meeting.invited"

    replay = _command(
        client,
        "cmd-invite",
        "meeting.invite",
        {
            "invitation_id": "invite-1",
            "participant_ids": ["bob"],
            "topic": "Agent architecture",
        },
    )
    assert replay.status_code == 200
    assert replay.json()["replayed"] is True
    assert replay.json()["sequence"] == invite.json()["sequence"]

    conflict = _command(client, "cmd-invite", "member.move", {"x": 1, "z": 1})
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == "command_id_conflict"

    response = _command(
        client, "cmd-accept", "meeting.respond",
        {"invitation_id": "invite-1", "response": "accepted"},
        actor_id="bob",
    )
    assert response.status_code == 200
    assert response.json()["events"][0]["type"] == "meeting.invitation-responded"

    start = _command(
        client,
        "cmd-start",
        "meeting.start",
        {"invitation_id": "invite-1", "meeting_id": "meeting-1"},
    )
    assert start.status_code == 200
    assert start.json()["events"][0]["type"] == "meeting.started"

    end = _command(
        client,
        "cmd-end",
        "meeting.end",
        {"meeting_id": "meeting-1"},
    )
    assert [event["type"] for event in end.json()["events"]] == [
        "meeting.ended",
        "bulletin.published",
    ]
    snapshot = client.get("/api/v1/rooms/demo/snapshot").json()
    assert snapshot["meeting"] is None
    assert snapshot["bulletins"][0]["meeting_id"] == "meeting-1"

    replayed_events = client.get(
        "/api/v1/rooms/demo/events", params={"after_sequence": 3}
    ).json()["events"]
    sequences = [event["sequence"] for event in replayed_events]
    assert sequences == list(range(4, snapshot["sequence"] + 1))


def test_hotspot_actions_and_meeting_start_are_distance_guarded():
    client = _client()
    _create_and_join(client)

    move = _command(client, "move-away", "member.move", {"x": 10, "z": 10})
    assert move.status_code == 200
    denied = _command(
        client,
        "interact-away",
        "hotspot.interact",
        {"hotspot_id": "roundtable", "action": "invite_meeting"},
    )
    assert denied.status_code == 409
    assert denied.json()["detail"]["code"] == "outside_hotspot"

    invite_denied = _command(
        client,
        "invite-away",
        "meeting.invite",
        {"participant_ids": ["bob"]},
    )
    assert invite_denied.status_code == 409

    malformed = _command(
        client,
        "start-malformed",
        "meeting.start",
        {"invitation_id": ["not", "a", "string"]},
    )
    assert malformed.status_code == 422
    assert malformed.json()["detail"]["code"] == "invalid_command"


def test_stale_room_revision_is_rejected_before_state_change():
    client = _client()
    _create_and_join(client)
    current = client.get("/api/v1/rooms/demo/snapshot").json()["sequence"]
    stale = client.post(
        "/api/v1/rooms/demo/commands",
        json={
            "command_id": "stale-move", "actor_id": "alice", "type": "member.move",
            "payload": {"x": 1, "z": 1}, "expected_revision": current - 1,
        },
    )
    assert stale.status_code == 409
    assert stale.json()["detail"]["code"] == "revision_conflict"
    assert client.get("/api/v1/rooms/demo/snapshot").json()["sequence"] == current


def test_websocket_replays_ordered_events_from_requested_cursor():
    client = _client()
    _create_and_join(client)

    with client.websocket_connect(
        "/api/v1/rooms/demo/stream?after_sequence=1"
    ) as websocket:
        first = websocket.receive_json()
        second = websocket.receive_json()

    assert first["protocol"] == "meetmind.rooms.v1"
    assert first["event"]["type"] == "member.joined"
    assert [first["event"]["sequence"], second["event"]["sequence"]] == [2, 3]


def test_icebreaker_state_machine_requires_submissions_and_emits_feedback_event():
    class FeedbackRecorder:
        def record(self, room_id, session):
            return {"session_id": session["session_id"], "updates": ["persisted"]}

    app = FastAPI()
    app.state.room_service = RoomService(icebreaker_feedback=FeedbackRecorder())
    app.include_router(router)
    client = TestClient(app)
    _create_and_join(client)

    start = _command(client, "game-start", "icebreaker.start", {})
    assert start.status_code == 200
    incomplete = _command(client, "game-finish-early", "icebreaker.finish", {})
    assert incomplete.status_code == 409
    assert incomplete.json()["detail"]["code"] == "icebreaker_incomplete"

    assert _command(
        client, "game-a", "icebreaker.submit", {"answer": "耐心，清晰，有趣"}
    ).status_code == 200
    assert _command(
        client, "game-b", "icebreaker.submit", {"answer": "热情，合作，专注"},
        actor_id="bob",
    ).status_code == 200
    finish = _command(client, "game-finish", "icebreaker.finish", {})
    assert [event["type"] for event in finish.json()["events"]] == [
        "icebreaker.finished", "bulletin.published", "memory.updated",
    ]
