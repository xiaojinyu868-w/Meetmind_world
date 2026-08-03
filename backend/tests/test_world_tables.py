"""问题 1 修复：桌位阻挡钳制与 seated 吸附测试（数值与前端 TABLE_BLOCKERS/CafeLayout 同源）。"""

import math

from app.world.seed import seed_world
from app.world.service import WorldService
from app.world.tables import TABLE_BLOCKERS, clamp_to_walkable, nearest_seat


def make_world():
    return WorldService(seed_world())


def agent_pos(world, agent_id):
    return next(a for a in world.snapshot()["agents"] if a["id"] == agent_id)["position"]


def test_move_into_table_center_is_pushed_out():
    world = make_world()
    # 注入目标点为圆桌桌心的 move 事件
    world.apply_event({"type": "agent-move", "agent_id": "lin-che",
                       "position": {"x": 0.0, "z": 0.0, "yaw": 0.0}, "state": "walking"})
    pos = agent_pos(world, "lin-che")
    blocker = TABLE_BLOCKERS[0]
    distance = math.hypot(pos["x"] - blocker["x"], pos["z"] - blocker["z"])
    assert distance >= blocker["radius"] + 0.3 - 1e-6  # 被投影到圆外（含 0.3 安全边）


def test_move_respects_bounds_and_each_blocker():
    world = make_world()
    world.apply_event({"type": "agent-move", "agent_id": "lin-che",
                       "position": {"x": 99.0, "z": -99.0, "yaw": 0.0}, "state": "walking"})
    pos = agent_pos(world, "lin-che")
    assert pos["x"] == 5.35 and pos["z"] == -4.45
    # 每张普通桌的桌心都不可站立
    for blocker in TABLE_BLOCKERS[1:]:
        world.apply_event({"type": "agent-move", "agent_id": "lin-che",
                           "position": {"x": blocker["x"], "z": blocker["z"], "yaw": 0.0},
                           "state": "walking"})
        pos = agent_pos(world, "lin-che")
        assert math.hypot(pos["x"] - blocker["x"], pos["z"] - blocker["z"]) \
            >= blocker["radius"] + 0.3 - 1e-6


def test_clamp_to_walkable_pure_function():
    # 恰好落在圆心：也要被推出（方向任选）
    clamped = clamp_to_walkable({"x": -3.65, "z": -1.55, "yaw": 1.0})
    assert math.hypot(clamped["x"] + 3.65, clamped["z"] + 1.55) >= 0.72 + 0.3 - 1e-6
    assert clamped["yaw"] == 1.0  # yaw 透传


def test_seated_snaps_to_nearest_seat_anchor():
    world = make_world()
    # 先把 agent 挪到圆桌 SEAT_Central6_04 (0, 1.57) 附近（会被钳制到阻挡环上，仍在阈值内）
    world.apply_event({"type": "agent-move", "agent_id": "lin-che",
                       "position": {"x": 0.1, "z": 1.5, "yaw": 0.0}, "state": "walking"})
    world.apply_event({"type": "agent-state", "agent_id": "lin-che", "state": "seated"})
    pos = agent_pos(world, "lin-che")
    assert pos["x"] == 0.0 and pos["z"] == 1.57  # 精确吸附锚点
    assert pos["yaw"] == math.pi  # 锚点朝向
    assert next(a for a in world.snapshot()["agents"] if a["id"] == "lin-che")["state"] == "seated"


def test_seated_rejected_without_nearby_seat():
    world = make_world()
    world.apply_event({"type": "agent-move", "agent_id": "lin-che",
                       "position": {"x": 0.0, "z": 4.0, "yaw": 0.0}, "state": "walking"})
    before = next(a for a in world.snapshot()["agents"] if a["id"] == "lin-che")["state"]
    world.apply_event({"type": "agent-state", "agent_id": "lin-che", "state": "seated"})
    after = next(a for a in world.snapshot()["agents"] if a["id"] == "lin-che")["state"]
    assert after == before == "walking"  # 无座位：保持 standing/walking
    # 被拒绝的状态切换不进事件缓冲
    assert not any(e["type"] == "agent-state" and e.get("state") == "seated"
                   for e in world.snapshot()["events"])


def test_nearest_seat_threshold():
    assert nearest_seat({"x": 0.1, "z": 1.5}) is not None  # 距锚点 ~0.2
    assert nearest_seat({"x": 0.0, "z": 4.0}) is None      # 距最近锚点 > 0.9
