"""Run the Roadmap 2.I acceptance walk-through against a live backend."""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from pathlib import Path

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.api.pipeline import _TINY_JPEG


def require(response: httpx.Response, expected: int = 200) -> dict:
    if response.status_code != expected:
        raise RuntimeError(f"{response.request.method} {response.request.url}: "
                           f"{response.status_code} {response.text}")
    return response.json()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    started = time.monotonic()
    room_id = f"acceptance-{uuid.uuid4().hex[:8]}"
    with httpx.Client(base_url=args.base_url.rstrip("/"), timeout=30) as client:
        require(client.get("/api/health"))
        onboarding = require(client.post(
            "/api/v1/group-onboarding",
            data={
                "participant_names": json.dumps(["甲", "乙", "丙", "丁", "戊"]),
                "expected_count": "5", "confirm_participants": "true",
            },
            files={"photo": ("group.jpg", _TINY_JPEG, "image/jpeg")},
        ), 201)
        people = onboarding["participants"]
        if len(people) != 5:
            raise RuntimeError(f"expected 5 people, received {len(people)}")
        ids = [item["person_id"] for item in people]

        require(client.post("/api/v1/rooms", json={
            "room_id": room_id, "name": "MVP2 live acceptance",
        }), 201)
        for index, person in enumerate(people):
            require(client.post(f"/api/v1/rooms/{room_id}/join", json={
                "member_id": person["person_id"], "display_name": person["name"],
                "position": {"x": index * 0.25, "z": 0},
            }))

        def command(command_id: str, actor_id: str, kind: str, payload=None) -> dict:
            return require(client.post(f"/api/v1/rooms/{room_id}/commands", json={
                "command_id": command_id, "actor_id": actor_id,
                "type": kind, "payload": payload or {},
            }))

        organizer = ids[0]
        command("hotspot", organizer, "hotspot.interact", {
            "hotspot_id": "roundtable", "action": "invite_meeting",
        })
        command("invite", organizer, "meeting.invite", {
            "invitation_id": "live-invite", "participant_ids": ids[1:3],
            "topic": "现场关系冷启动",
        })
        for index, person_id in enumerate(ids[1:3]):
            command(f"accept-{index}", person_id, "meeting.respond", {
                "invitation_id": "live-invite", "response": "accepted",
            })
        meeting = command("meeting-start", organizer, "meeting.start", {
            "invitation_id": "live-invite", "meeting_id": "live-meeting",
        })
        if [event["type"] for event in meeting["events"]] != [
            "meeting.started", "meeting.topic-proposed",
        ]:
            raise RuntimeError("roundtable Agent did not produce a topic")
        ended = command("meeting-end", organizer, "meeting.end", {
            "meeting_id": "live-meeting",
        })
        if "bulletin.published" not in [event["type"] for event in ended["events"]]:
            raise RuntimeError("meeting bulletin was not published")

        requested = command("game-request", organizer, "icebreaker.request", {
            "participant_ids": ids, "prompt": "用三个词描述今天的自己",
        })
        if "icebreaker.started" not in [event["type"] for event in requested["events"]]:
            raise RuntimeError("icebreaker Agent did not start the game")
        for index, person_id in enumerate(ids):
            command(f"game-{index}", person_id, "icebreaker.submit", {
                "answer": f"合作、好奇、专注-{index}",
            })
        finished = command("game-finish", organizer, "icebreaker.finish")
        memory_event = next(
            event for event in finished["events"] if event["type"] == "memory.updated"
        )
        updates = memory_event["payload"]["updates"]
        if len(updates) != 5:
            raise RuntimeError(f"expected 5 memory updates, received {len(updates)}")

        field = require(client.post("/api/v1/fields/generations", json={
            "owner_id": ids[0], "counterpart_id": ids[1],
            "source_refs": [updates[0]["source_ref"]],
            "notes": ["合作、好奇、专注"],
        }), 201)
        brief = require(client.get(f"/api/v1/rooms/{room_id}/brief"))
        events = require(client.get(f"/api/v1/rooms/{room_id}/events"))["events"]

    report = {
        "status": "PASS", "room_id": room_id,
        "elapsed_seconds": round(time.monotonic() - started, 3),
        "people": len(people), "events": len(events),
        "memory_updates": len(updates), "field_generation_id": field["generation_id"],
        "brief_items": brief["event_count"],
        "group_photo_status": onboarding["status"],
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
