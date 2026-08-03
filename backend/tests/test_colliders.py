"""NPC 碰撞体积与服务端分离解算测试（world/colliders.py + service 接入点）。"""

import math

from app.world.colliders import (
    BOOTH_SHELL_RADIUS,
    CAFE_COLLIDERS,
    SEPARATION_DISTANCE,
)
from app.world.hall import HALL_BOUNDS
from app.world.service import WorldService


def make_cafe_world():
    return WorldService({"agents": [
        {"id": "a", "name": "甲", "position": {"x": -2.0, "z": 2.0, "yaw": 0.0},
         "state": "walking", "palette": {}},
        {"id": "b", "name": "乙", "position": {"x": -2.0, "z": 0.0, "yaw": 0.0},
         "state": "walking", "palette": {}},
    ], "modules": []})


def make_hall_world():
    world = WorldService({"agents": [], "modules": []},
                         blockers=(), bounds=HALL_BOUNDS)
    world.register_person("p1", {"name": "摊主"})
    world.register_person("p2", {"name": "路人"})
    return world


def pos_of(world, agent_id):
    return next(a for a in world.snapshot()["agents"] if a["id"] == agent_id)["position"]


def test_two_agents_cannot_overlap_same_target():
    world = make_cafe_world()
    world.apply_event({"type": "agent-move", "agent_id": "a",
                       "position": {"x": 2.0, "z": 2.0, "yaw": 0.0}, "state": "walking"})
    world.apply_event({"type": "agent-move", "agent_id": "b",
                       "position": {"x": 2.0, "z": 2.0, "yaw": 0.0}, "state": "walking"})
    pa, pb = pos_of(world, "a"), pos_of(world, "b")
    assert (pa["x"], pa["z"]) == (2.0, 2.0)  # 先到者占据目标点
    distance = math.hypot(pa["x"] - pb["x"], pa["z"] - pb["z"])
    assert distance >= SEPARATION_DISTANCE - 1e-9  # 后到者被推出到恰好不重叠
    # 缓冲的 move 事件携带解算后最终位置
    moves = [e for e in world.snapshot()["events"] if e["type"] == "agent-move"]
    assert moves[-1]["position"] == {"x": pb["x"], "z": pb["z"], "yaw": pb["yaw"]}


def test_separation_respects_static_shells_after_push():
    world = make_cafe_world()
    # a 站在离圆桌外沿仅 0.6 的位置；b 从对面冲向 a，会被推向圆桌一侧
    world.apply_event({"type": "agent-move", "agent_id": "a",
                       "position": {"x": 2.17, "z": 0.0, "yaw": 0.0}, "state": "walking"})
    world.apply_event({"type": "agent-move", "agent_id": "b",
                       "position": {"x": 2.0, "z": 0.0, "yaw": 0.0}, "state": "walking"})
    pb = pos_of(world, "b")
    # b 不与 a 重叠，且不被挤进圆桌壳（1.27+0.3）
    pa = pos_of(world, "a")
    assert math.hypot(pa["x"] - pb["x"], pa["z"] - pb["z"]) >= SEPARATION_DISTANCE - 1e-9
    assert math.hypot(pb["x"], pb["z"]) >= 1.27 + 0.3 - 1e-6


def test_hall_booth_shell_blocks_walking_target():
    world = make_hall_world()
    booth = next(m for m in world.snapshot()["modules"] if m.get("person_id") == "p1")
    # p2 以 walking 状态直闯 p1 的摊位圆心 → 被推到壳外（r=0.9 + 0.3）
    world.apply_event({"type": "agent-move", "agent_id": "p2",
                       "position": dict(booth["position"]), "state": "walking"})
    p2 = pos_of(world, "p2")
    distance = math.hypot(p2["x"] - booth["position"]["x"],
                          p2["z"] - booth["position"]["z"])
    assert distance >= BOOTH_SHELL_RADIUS + 0.3 - 1e-6


def test_at_booth_return_is_legal_inside_own_booth():
    world = make_hall_world()
    own = next(m for m in world.snapshot()["modules"] if m.get("person_id") == "p1")
    # p1 先走出去，再以 at-booth 返回：锚点在自己摊位壳内，合法吸附
    world.apply_event({"type": "agent-move", "agent_id": "p1",
                       "position": {"x": 0.0, "z": 0.0, "yaw": 0.0}, "state": "walking"})
    world.apply_event({"type": "agent-move", "agent_id": "p1",
                       "position": dict(own["position"]), "state": "at-booth"})
    p1 = pos_of(world, "p1")
    assert (p1["x"], p1["z"]) == (own["position"]["x"], own["position"]["z"])
    assert next(a for a in world.snapshot()["agents"]
                if a["id"] == "p1")["state"] == "at-booth"


def test_at_booth_rejected_without_booth():
    world = make_cafe_world()  # 咖啡厅没有 booth modules
    world.apply_event({"type": "agent-state", "agent_id": "a", "state": "at-booth"})
    agent = next(a for a in world.snapshot()["agents"] if a["id"] == "a")
    assert agent["state"] == "walking"  # 无展位：拒绝 at-booth，保持原状态
    assert not any(e["type"] == "agent-state" and e.get("state") == "at-booth"
                   for e in world.snapshot()["events"])


def test_bounds_clamp_cafe_and_hall():
    world = make_cafe_world()
    world.apply_event({"type": "agent-move", "agent_id": "a",
                       "position": {"x": 99.0, "z": -99.0, "yaw": 0.0}, "state": "walking"})
    pa = pos_of(world, "a")
    assert (pa["x"], pa["z"]) == (5.35, -4.45)  # 咖啡厅边界
    hall = make_hall_world()
    hall.apply_event({"type": "agent-move", "agent_id": "p2",
                      "position": {"x": 99.0, "z": -99.0, "yaw": 0.0}, "state": "walking"})
    p2 = pos_of(hall, "p2")
    assert (p2["x"], p2["z"]) == (5.5, -10.5)  # 街道边界


def test_cafe_colliders_registry_values():
    assert len(CAFE_COLLIDERS.circles) == 5  # 与 tables.TABLE_BLOCKERS 同源
    assert (CAFE_COLLIDERS.bounds.min_x, CAFE_COLLIDERS.bounds.max_x) == (-5.35, 5.35)
