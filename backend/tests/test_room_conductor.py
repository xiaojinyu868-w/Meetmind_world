"""RoomConductor（v1 咖啡厅生活指挥）契约测试。

验收：大部分空闲 Agent 围桌入座且座位唯一；同桌 ≥2 人进入交谈；会议中与会
NPC 走到圆桌座位；超时会议自动散会；Agent 成员应邀即时 accepted（409 修复）。
"""

import random

from app.agents.room_conductor import MEETING_TTL_SECONDS, RoomConductor
from app.domain.rooms.service import RoomService
from app.world.tables import NPC_TABLE_SEATS, ROUNDTABLE_SEATS, WALK_BOUNDS


def _room_with_members(member_ids=("a1", "a2", "a3", "a4", "a5")):
    service = RoomService()
    service.create_room(room_id="cafe-test", name="Test Cafe")
    service.join_room("cafe-test", member_id="person-self",
                      display_name="玩家", position={"x": 0.0, "z": 4.0})
    for index, member_id in enumerate(member_ids):
        service.join_room(
            "cafe-test", member_id=member_id, display_name=member_id,
            position={"x": -1.0 + index * 0.2, "z": 3.0},
        )
    return service


def _conductor(service):
    return RoomConductor(service, rng=random.Random(42), clock=lambda: 1_000_000.0)


def test_ambient_life_settles_mostly_seated_with_unique_seats():
    service = _room_with_members()
    conductor = _conductor(service)
    for _ in range(12):
        conductor.tick_once()
    snapshot = service.snapshot("cafe-test")
    runtime = {item["agent_id"]: item for item in snapshot["agent_runtime"]}
    seated = [item for item in runtime.values() if item.get("seat")]
    assert len(seated) >= 3  # 大部分人就座（5 人里 ≥3）
    nodes = [item["seat"]["node"] for item in seated]
    assert len(nodes) == len(set(nodes))  # 一座一人
    for member in snapshot["members"]:
        assert WALK_BOUNDS["min_x"] - 0.01 <= member["position"]["x"] <= WALK_BOUNDS["max_x"] + 0.01
        assert WALK_BOUNDS["min_z"] - 0.01 <= member["position"]["z"] <= WALK_BOUNDS["max_z"] + 0.01
    # 人类玩家不被指挥
    player = next(m for m in snapshot["members"] if m["member_id"] == "person-self")
    assert player["position"] == {"x": 0.0, "z": 4.0}


def test_tablemates_end_up_talking():
    service = _room_with_members(("b1", "b2"))
    conductor = _conductor(service)
    # 手动把两人钉到同一桌
    seat_a, seat_b = NPC_TABLE_SEATS[0], NPC_TABLE_SEATS[1]
    assert seat_a["table_id"] == seat_b["table_id"]
    for member_id, seat in (("b1", seat_a), ("b2", seat_b)):
        service.apply_conductor_plan("cafe-test", {
            "moves": {member_id: {"x": seat["x"], "z": seat["z"], "yaw": seat["yaw"]}},
            "statuses": {member_id: {
                "status": "seated", "action": "sit", "yaw": seat["yaw"],
                "seat": {"node": seat["node"], "table_id": seat["table_id"]},
            }},
        })
    conductor._intents.clear()  # 让重启恢复逻辑从持久化座位重建意图
    conductor.tick_once()
    runtime = {item["agent_id"]: item
               for item in service.snapshot("cafe-test")["agent_runtime"]}
    assert runtime["b1"]["status"] == "talking"
    assert runtime["b2"]["status"] == "talking"


def test_meeting_participants_walk_to_roundtable_seats():
    service = _room_with_members(("c1", "c2"))
    conductor = _conductor(service)
    service.execute("cafe-test", command_id="walk-in", actor_id="person-self",
                    command_type="member.move", payload={"x": 0.0, "z": 1.57})
    service.execute(
        "cafe-test", command_id="invite-1", actor_id="person-self",
        command_type="meeting.invite",
        payload={"invitation_id": "inv-1", "participant_ids": ["c1", "c2"],
                 "topic": "测试议题"},
    )
    snapshot = service.snapshot("cafe-test")
    # Agent 成员即时应邀：邀请立即可 start（409 invalid_meeting_state 修复）
    invitation = snapshot["invitations"][0]
    assert invitation["status"] == "accepted"
    service.execute(
        "cafe-test", command_id="start-1", actor_id="person-self",
        command_type="meeting.start",
        payload={"invitation_id": "inv-1", "meeting_id": "meeting-test-1"},
    )
    for _ in range(6):
        conductor.tick_once()
    snapshot = service.snapshot("cafe-test")
    runtime = {item["agent_id"]: item for item in snapshot["agent_runtime"]}
    roundtable_nodes = {seat["node"] for seat in ROUNDTABLE_SEATS}
    for person_id in ("c1", "c2"):
        assert runtime[person_id]["status"] == "meeting"
        assert runtime[person_id]["seat"]["node"] in roundtable_nodes
        seat = next(s for s in ROUNDTABLE_SEATS
                    if s["node"] == runtime[person_id]["seat"]["node"])
        member = next(m for m in snapshot["members"] if m["member_id"] == person_id)
        assert abs(member["position"]["x"] - seat["x"]) < 1e-6
        assert abs(member["position"]["z"] - seat["z"]) < 1e-6


def test_stale_meeting_auto_ends_after_ttl():
    service = _room_with_members(("d1",))
    conductor = RoomConductor(
        service, rng=random.Random(1), clock=lambda: 2_000_000_000.0)
    service.execute("cafe-test", command_id="walk-in", actor_id="person-self",
                    command_type="member.move", payload={"x": 0.0, "z": 1.57})
    service.execute(
        "cafe-test", command_id="invite-1", actor_id="person-self",
        command_type="meeting.invite",
        payload={"invitation_id": "inv-1", "participant_ids": ["d1"], "topic": "t"},
    )
    service.execute(
        "cafe-test", command_id="start-1", actor_id="person-self",
        command_type="meeting.start",
        # meeting-<epoch_ms>：昨天挂死的会议应被立刻识别为超时
        payload={"invitation_id": "inv-1",
                 "meeting_id": f"meeting-{int((2_000_000_000.0 - MEETING_TTL_SECONDS - 60) * 1000)}"},
    )
    assert service.snapshot("cafe-test")["meeting"] is not None
    conductor.tick_once()
    assert service.snapshot("cafe-test")["meeting"] is None


def test_fresh_meeting_is_not_ended():
    service = _room_with_members(("e1",))
    conductor = RoomConductor(
        service, rng=random.Random(1), clock=lambda: 2_000_000_000.0)
    service.execute("cafe-test", command_id="walk-in", actor_id="person-self",
                    command_type="member.move", payload={"x": 0.0, "z": 1.57})
    service.execute(
        "cafe-test", command_id="invite-1", actor_id="person-self",
        command_type="meeting.invite",
        payload={"invitation_id": "inv-1", "participant_ids": ["e1"], "topic": "t"},
    )
    service.execute(
        "cafe-test", command_id="start-1", actor_id="person-self",
        command_type="meeting.start",
        payload={"invitation_id": "inv-1",
                 "meeting_id": f"meeting-{int(2_000_000_000.0 * 1000)}"},
    )
    conductor.tick_once()
    assert service.snapshot("cafe-test")["meeting"] is not None
