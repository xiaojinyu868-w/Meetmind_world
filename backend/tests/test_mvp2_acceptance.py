"""Executable Roadmap 2.I acceptance walk-through."""

import json
import time

from fastapi.testclient import TestClient

from app.api.pipeline import _TINY_JPEG
from app.main import create_app


def _command(client, room_id, command_id, actor_id, command_type, payload=None):
    response = client.post(
        f"/api/v1/rooms/{room_id}/commands",
        json={
            "command_id": command_id, "actor_id": actor_id,
            "type": command_type, "payload": payload or {},
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_roadmap_2i_group_roundtable_bulletin_and_feedback(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    client = TestClient(create_app())
    started_at = time.monotonic()

    modules = client.get("/api/v1/scenes/modules").json()["modules"]
    assert {item["module_id"] for item in modules} >= {
        "market-street", "person-booth", "cafe-house", "relationship-field",
    }

    onboarding = client.post(
        "/api/v1/group-onboarding",
        data={
            "participant_names": json.dumps(["甲", "乙", "丙", "丁", "戊"]),
            "expected_count": "5", "confirm_participants": "true",
        },
        files={"photo": ("group.jpg", _TINY_JPEG, "image/jpeg")},
    )
    assert onboarding.status_code == 201, onboarding.text
    people = onboarding.json()["participants"]
    assert len(people) >= 5
    assert time.monotonic() - started_at < 600

    room_id = "roadmap-2i"
    assert client.post(
        "/api/v1/rooms", json={"room_id": room_id, "name": "MVP2 验收现场"},
    ).status_code == 201
    ids = [person["person_id"] for person in people]
    for index, person in enumerate(people):
        joined = client.post(
            f"/api/v1/rooms/{room_id}/join",
            json={
                "member_id": person["person_id"], "display_name": person["name"],
                "position": {"x": index * 0.25, "z": 0},
            },
        )
        assert joined.status_code == 200

    organizer = ids[0]
    hotspot = _command(
        client, room_id, "hotspot-e", organizer, "hotspot.interact",
        {"hotspot_id": "roundtable", "action": "invite_meeting"},
    )
    assert hotspot["events"][0]["type"] == "hotspot.interacted"
    invitation_id = "acceptance-invite"
    _command(
        client, room_id, "invite", organizer, "meeting.invite",
        {"invitation_id": invitation_id, "participant_ids": ids[1:3],
         "topic": "如何让现场关系更快建立"},
    )
    for index, person_id in enumerate(ids[1:3]):
        _command(
            client, room_id, f"accept-{index}", person_id, "meeting.respond",
            {"invitation_id": invitation_id, "response": "accepted"},
        )
    started = _command(
        client, room_id, "meeting-start", organizer, "meeting.start",
        {"invitation_id": invitation_id, "meeting_id": "acceptance-meeting"},
    )
    assert [event["type"] for event in started["events"]] == [
        "meeting.started", "meeting.topic-proposed",
    ]
    replayed_start = _command(
        client, room_id, "meeting-start", organizer, "meeting.start",
        {"invitation_id": invitation_id, "meeting_id": "acceptance-meeting"},
    )
    assert replayed_start["replayed"] is True
    assert replayed_start["events"] == started["events"]
    ended = _command(
        client, room_id, "meeting-end", organizer, "meeting.end",
        {"meeting_id": "acceptance-meeting"},
    )
    assert [event["type"] for event in ended["events"]] == [
        "meeting.ended", "bulletin.published",
    ]

    requested = _command(
        client, room_id, "icebreaker-request", organizer, "icebreaker.request",
        {"participant_ids": ids, "prompt": "用三个词描述今天的自己"},
    )
    assert [event["type"] for event in requested["events"]] == [
        "icebreaker.requested", "icebreaker.started",
    ]
    for index, person_id in enumerate(ids):
        _command(
            client, room_id, f"icebreaker-{index}", person_id,
            "icebreaker.submit", {"answer": f"合作、好奇、专注-{index}"},
        )
    finished = _command(
        client, room_id, "icebreaker-finish", organizer, "icebreaker.finish", {},
    )
    assert [event["type"] for event in finished["events"]] == [
        "icebreaker.finished", "bulletin.published", "memory.updated",
    ]
    updates = finished["events"][-1]["payload"]["updates"]
    assert {item["person_id"] for item in updates} == set(ids)
    for person_id in ids:
        assert any(
            item.get("type") == "icebreaker-behavior"
            for item in client.app.state.store.read_inferences(person_id).values()
        )

    snapshot = client.get(f"/api/v1/rooms/{room_id}/snapshot").json()
    assert len(snapshot["members"]) == 5
    assert len(snapshot["bulletins"]) == 2
    event_types = [event["type"] for event in client.get(
        f"/api/v1/rooms/{room_id}/events", params={"after_sequence": 0},
    ).json()["events"]]
    assert "hotspot.interacted" in event_types
    assert "meeting.started" in event_types
    assert "memory.updated" in event_types
    brief = client.get(f"/api/v1/rooms/{room_id}/brief").json()
    assert brief["schema"] == "meetmind.morning-brief.v1"
    assert brief["event_count"] >= 5
    assert any(item["type"] == "memory.updated" for item in brief["items"])
