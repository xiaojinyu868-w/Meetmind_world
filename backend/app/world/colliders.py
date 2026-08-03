"""碰撞注册表与分离解算（XZ 平面 2D 碰撞，服务端权威）。

目的：NPC 碰撞体积的服务端解算 —— 目标点先过静态壳钳制（沿用
      clamp_to_walkable 的"点 vs 静态圆 + 边界"），再与其他 agent 做圆形分离，
      任何来源的 agent-move（咖啡厅 runtime / 大厅串门 / 外部注入）一视同仁。
输入：agent_id、from_pos、to_pos、其他 agent 位置、WorldColliders（边界 + 圆壳）。
输出：resolve_move() -> 解算后的最终位置 {x, z, yaw}。
验收：tests/test_colliders.py —— 两 agent 对向移动到同点不重叠；推到摊位/桌外；
      seated/at-booth 例外不破；边界钳制。

注册约定：cafe = tables.py 现有 TABLE_BLOCKERS + WALK_BOUNDS（CAFE_COLLIDERS）；
hall 的摊位壳不由本模块静态登记，而由 WorldService 从 booth modules 动态派生
（r=0.9，新展位自动成壳），街道边界由实例化处传入（x∈[-5.5,5.5]，摊位后方
由摊位圆覆盖）。

TODO(玩家入册)：玩家位置暂不入册（前端上报通道未建），玩家与 NPC 的碰撞
暂由前端自理；通道建立后把玩家作为第 N+1 个动态壳加入 others 即可。
"""

import math
from dataclasses import dataclass

from app.world.tables import TABLE_BLOCKERS, WALK_BOUNDS, clamp_to_walkable

# agent 碰撞半径（每人 0.3m，分离距离 = 两人半径和 0.6m）
AGENT_RADIUS = 0.3
SEPARATION_DISTANCE = AGENT_RADIUS * 2
# 大厅摊位壳半径（由 booth modules 动态派生）
BOOTH_SHELL_RADIUS = 0.9


@dataclass(frozen=True)
class Bounds:
    min_x: float
    max_x: float
    min_z: float
    max_z: float


@dataclass(frozen=True)
class Circle:
    x: float
    z: float
    r: float


@dataclass(frozen=True)
class WorldColliders:
    bounds: Bounds
    circles: tuple = ()  # tuple[Circle, ...]


# 咖啡厅静态壳：5 张桌 + 世界边界（与 tables.py 同源）
CAFE_COLLIDERS = WorldColliders(
    bounds=Bounds(WALK_BOUNDS["min_x"], WALK_BOUNDS["max_x"],
                  WALK_BOUNDS["min_z"], WALK_BOUNDS["max_z"]),
    circles=tuple(Circle(b["x"], b["z"], b["radius"]) for b in TABLE_BLOCKERS),
)


def clamp_static(position: dict, colliders: WorldColliders) -> dict:
    """静态壳钳制（委托 clamp_to_walkable 的既有数学：边界 + 圆外投影）。"""
    return clamp_to_walkable(
        position,
        blockers=[{"x": c.x, "z": c.z, "radius": c.r} for c in colliders.circles],
        bounds={"min_x": colliders.bounds.min_x, "max_x": colliders.bounds.max_x,
                "min_z": colliders.bounds.min_z, "max_z": colliders.bounds.max_z},
    )


def resolve_move(agent_id: str, from_pos: dict, to_pos: dict,
                 others: list, colliders: WorldColliders) -> dict:
    """分离解算：静态钳制 → 与其他 agent 单次迭代圆形分离 → 再静态钳制。

    others：[(agent_id, position), ...]（含 seated/at-booth——站立的人也占体积）。
    重叠（距离 < 0.6）时沿连心线把移动方推出到恰好不重叠；目标与他人重合
    （零向量）时沿来向退回；仍重合则任选一方向。seated/at-booth 吸附的壳内
    合法位置由调用方（WorldService._apply_state）例外处理，不走本函数。
    """
    final = clamp_static(to_pos, colliders)
    fx, fz = final["x"], final["z"]
    for _other_id, other_pos in others:
        dx, dz = fx - other_pos["x"], fz - other_pos["z"]
        distance = math.hypot(dx, dz)
        if distance >= SEPARATION_DISTANCE:
            continue
        if distance < 1e-9:  # 目标点与他人重合：沿来向退回
            dx, dz = from_pos["x"] - other_pos["x"], from_pos["z"] - other_pos["z"]
            distance = math.hypot(dx, dz)
            if distance < 1e-9:
                dx, dz, distance = 1.0, 0.0, 1.0
        scale = SEPARATION_DISTANCE / distance
        fx = other_pos["x"] + dx * scale
        fz = other_pos["z"] + dz * scale
    # 分离后再过静态壳：最终位置保证不侵桌/出界
    # （已知限制：单次迭代，密集连锁挤压下可能仍有轻微重叠，稀疏场景够用）
    return clamp_static({"x": fx, "z": fz, "yaw": final.get("yaw", 0.0)}, colliders)
