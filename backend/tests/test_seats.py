"""M1.8 座位占用互斥测试：一座一人、次近分配、离座释放、圆桌满员。"""

import pytest

from app.schemas.snapshot_schema import validate_snapshot
from app.world.service import WorldService

SEAT_A = (2.89, -0.53)  # SEAT_4_01_01（书架四人桌）
SEAT_B = (3.67, -0.53)  # SEAT_4_01_02（同桌对侧，距 SEAT_A 0.78m）
ROUNDTABLE_SEAT_04 = (0.0, 1.57)  # SEAT_Central6_04

# 每个 agent 的独立接近点（从各自方向走近桌子，避免初始重叠触发分离）
APPROACH = {"a": (2.5, -0.53), "b": (4.1, -0.53), "c": (3.28, -0.53),
            "x": (0.1, 1.5)}


def make_world(agent_ids=("a", "b", "c")):
    return WorldService({"agents": [
        {"id": pid, "name": pid,
         "position": {"x": APPROACH[pid][0], "z": APPROACH[pid][1], "yaw": 0.0},
         "state": "walking", "palette": {}}
        for pid in agent_ids
    ], "modules": []})


def seat_and_state(world, pid):
    agent = next(a for a in world.snapshot()["agents"] if a["id"] == pid)
    return agent["position"], agent["state"]


def sit(world, pid):
    x, z = APPROACH[pid]
    world.apply_event({"type": "agent-move", "agent_id": pid,
                       "position": {"x": x, "z": z, "yaw": 0.0}, "state": "walking"})
    world.apply_event({"type": "agent-state", "agent_id": pid, "state": "seated"})


def test_two_agents_compete_same_seat_second_gets_next_free():
    world = make_world()
    sit(world, "a")
    sit(world, "b")
    (pa, sa), (pb, sb) = seat_and_state(world, "a"), seat_and_state(world, "b")
    assert sa == "seated" and (pa["x"], pa["z"]) == SEAT_A       # 先到先得
    assert sb == "seated" and (pb["x"], pb["z"]) == SEAT_B       # 次近空闲座位


def test_third_agent_rejected_when_no_free_seat_in_range():
    world = make_world()
    sit(world, "a")
    sit(world, "b")
    sit(world, "c")  # 两个座位都被占：阈值内无空闲 → 拒绝
    _, sc = seat_and_state(world, "c")
    assert sc == "walking"
    seated_events = [e for e in world.snapshot()["events"]
                     if e["type"] == "agent-state" and e.get("state") == "seated"]
    assert len(seated_events) == 2  # 第三次 seated 未入缓冲


def test_seat_released_after_leaving_and_reusable():
    world = make_world(("a", "b"))
    sit(world, "a")
    world.apply_event({"type": "agent-state", "agent_id": "a", "state": "walking"})
    # a 释放后，b 从同侧走近可以坐上同一个座位
    world.apply_event({"type": "agent-move", "agent_id": "b",
                       "position": {"x": 2.5, "z": -0.53, "yaw": 0.0}, "state": "walking"})
    world.apply_event({"type": "agent-state", "agent_id": "b", "state": "seated"})
    (pb, sb) = seat_and_state(world, "b")
    assert sb == "seated" and (pb["x"], pb["z"]) == SEAT_A


def test_leaving_to_at_booth_or_meeting_also_releases():
    world = make_world(("a", "b"))
    sit(world, "a")
    # a 被卷入圆桌会议（占圆桌座位）：原普通座位应释放
    world.apply_event({"type": "meeting-start", "meeting_id": "m1",
                       "participants": ["a", "b"]})
    assert seat_and_state(world, "a")[1] == "in-meeting"
    world.apply_event({"type": "meeting-end", "meeting_id": "m1"})
    # 散会后 a 保持 seated（坐在圆桌锚点上），其普通桌旧座早已释放
    assert seat_and_state(world, "a")[1] == "seated"


def test_meeting_seven_agents_six_seats_one_left_out():
    world = WorldService({"agents": [
        {"id": f"p{i}", "name": f"p{i}",
         "position": {"x": i * 1.0 - 3.0, "z": 3.5, "yaw": 0.0},
         "state": "walking", "palette": {}}
        for i in range(7)
    ], "modules": []})
    world.apply_event({"type": "meeting-start", "meeting_id": "m_full",
                       "participants": [f"p{i}" for i in range(7)]})
    snapshot = world.snapshot()
    seated = [a for a in snapshot["agents"] if a["state"] == "in-meeting"]
    assert len(seated) == 6                                   # 圆桌 6 座全满
    assert len(snapshot["meeting"]["participants"]) == 6
    left_out = [a for a in snapshot["agents"] if a["state"] != "in-meeting"]
    assert len(left_out) == 1                                 # 1 人无法入座
    started = [e for e in snapshot["events"] if e["type"] == "meeting-started"]
    assert len(started[0]["participants"]) == 6
    validate_snapshot(snapshot)


def test_meeting_respects_already_occupied_seat():
    world = make_world(("x", "a", "b", "c"))
    # x 先坐上 SEAT_Central6_04
    world.apply_event({"type": "agent-move", "agent_id": "x",
                       "position": {"x": 0.1, "z": 1.5, "yaw": 0.0}, "state": "walking"})
    world.apply_event({"type": "agent-state", "agent_id": "x", "state": "seated"})
    assert seat_and_state(world, "x")[0]["z"] == 1.57
    # 会议入座不得重复使用 x 的座位
    world.apply_event({"type": "meeting-start", "meeting_id": "m2",
                       "participants": ["a", "b", "c"]})
    for pid in ("a", "b", "c"):
        pos, state = seat_and_state(world, pid)
        assert state == "in-meeting"
        assert (pos["x"], pos["z"]) != ROUNDTABLE_SEAT_04
