"""桌位/阻挡配置：与前端同源的可行走区域约束。

目的：修复 agent 穿模 —— 所有位置写入前统一过 clamp_to_walkable()：
      边界内 + 圆形阻挡体外（投影到 radius+0.3）；seated 必须吸附座位锚点。
输入/输出：position dict {x, z, yaw} → 钳制后的 dict；nearest_seat() → 锚点或 None。
验收：tests/test_world_tables.py —— 桌心 move 事件被推到圆外；seated 吸附/拒绝。

数值来源（手写同步，改动必须两边一起改）：
  - 阻挡圆：前端 src/main.js 的 TABLE_BLOCKERS（行 60-66）；
  - 边界：前端 src/runtime/CafeLayout.js 的 CAFE_LAYOUT.bounds；
  - 座位锚点：CafeLayout.js 的 roundtable.seats + npcTables[*].seats（共 18 个）。
TODO(后续)：阻挡壳应由 Blender 导出（AGENTS.md 坐标约定），本文件是过渡方案。
"""

import math

# 阻挡体外扩安全距离（agent 半径）：投影目标 = radius + 0.3
BLOCKER_MARGIN = 0.3
# seated 吸附阈值：离最近座位锚点超过此距离不允许坐下
SEAT_SNAP_DISTANCE = 0.9

# 与 src/main.js TABLE_BLOCKERS 同源（5 张桌的圆形阻挡体）
TABLE_BLOCKERS = (
    {"x": 0.0, "z": 0.0, "radius": 1.27},      # 中央六人圆桌 TABLE_Central6
    {"x": -3.65, "z": -1.55, "radius": 0.72},  # 窗边双人桌 TABLE_2_01
    {"x": -3.65, "z": 1.55, "radius": 0.72},   # 海报双人桌 TABLE_2_02
    {"x": 3.28, "z": -1.35, "radius": 0.94},   # 书架四人桌 TABLE_4_01
    {"x": 3.28, "z": 1.65, "radius": 0.94},    # 吧台侧四人桌 TABLE_4_02
)

# 与 CafeLayout.js CAFE_LAYOUT.bounds 同源
WALK_BOUNDS = {"min_x": -5.35, "max_x": 5.35, "min_z": -4.45, "max_z": 4.45}

# 与 CafeLayout.js 座位锚点同源（node/x/z/yaw；anchorHeight 0.46 前端渲染用，后端不需要）
ROUNDTABLE_SEATS = (
    {"node": "SEAT_Central6_04", "table_id": "roundtable-six", "x": 0.0, "z": 1.57, "yaw": math.pi},
    {"node": "SEAT_Central6_03", "table_id": "roundtable-six", "x": 1.36, "z": 0.785, "yaw": -math.pi * 2 / 3},
    {"node": "SEAT_Central6_02", "table_id": "roundtable-six", "x": 1.36, "z": -0.785, "yaw": -math.pi / 3},
    {"node": "SEAT_Central6_01", "table_id": "roundtable-six", "x": 0.0, "z": -1.57, "yaw": 0.0},
    {"node": "SEAT_Central6_06", "table_id": "roundtable-six", "x": -1.36, "z": -0.785, "yaw": math.pi / 3},
    {"node": "SEAT_Central6_05", "table_id": "roundtable-six", "x": -1.36, "z": 0.785, "yaw": math.pi * 2 / 3},
)

NPC_TABLE_SEATS = (
    {"node": "SEAT_2_01_01", "table_id": "table-window-two", "x": -4.53, "z": -1.55, "yaw": math.pi / 2},
    {"node": "SEAT_2_01_02", "table_id": "table-window-two", "x": -2.77, "z": -1.55, "yaw": -math.pi / 2},
    {"node": "SEAT_2_02_01", "table_id": "table-poster-two", "x": -4.53, "z": 1.55, "yaw": math.pi / 2},
    {"node": "SEAT_2_02_02", "table_id": "table-poster-two", "x": -2.77, "z": 1.55, "yaw": -math.pi / 2},
    {"node": "SEAT_4_01_01", "table_id": "table-library-four", "x": 2.89, "z": -0.53, "yaw": math.pi * 0.86},
    {"node": "SEAT_4_01_02", "table_id": "table-library-four", "x": 3.67, "z": -0.53, "yaw": -math.pi * 0.86},
    {"node": "SEAT_4_01_03", "table_id": "table-library-four", "x": 2.89, "z": -2.17, "yaw": math.pi * 0.14},
    {"node": "SEAT_4_01_04", "table_id": "table-library-four", "x": 3.67, "z": -2.17, "yaw": -math.pi * 0.14},
    {"node": "SEAT_4_02_01", "table_id": "table-counter-four", "x": 2.89, "z": 2.47, "yaw": math.pi * 0.86},
    {"node": "SEAT_4_02_02", "table_id": "table-counter-four", "x": 3.67, "z": 2.47, "yaw": -math.pi * 0.86},
    {"node": "SEAT_4_02_03", "table_id": "table-counter-four", "x": 2.89, "z": 0.83, "yaw": math.pi * 0.14},
    {"node": "SEAT_4_02_04", "table_id": "table-counter-four", "x": 3.67, "z": 0.83, "yaw": -math.pi * 0.14},
)

SEATS = ROUNDTABLE_SEATS + NPC_TABLE_SEATS


def clamp_to_walkable(position: dict, blockers=None, bounds=None) -> dict:
    """把点钳制到可行走区域：先边界，再逐阻挡圆外投影（沿圆心方向推到 radius+0.3）。

    blockers/bounds 缺省为咖啡厅配置；展位大厅传入自己的边界与空阻挡列表
    （展位本身就是站位点，不是阻挡体）。
    """
    blockers = TABLE_BLOCKERS if blockers is None else blockers
    bounds = WALK_BOUNDS if bounds is None else bounds
    x = min(max(float(position.get("x", 0.0)), bounds["min_x"]), bounds["max_x"])
    z = min(max(float(position.get("z", 0.0)), bounds["min_z"]), bounds["max_z"])
    for blocker in blockers:
        dx, dz = x - blocker["x"], z - blocker["z"]
        distance = math.hypot(dx, dz)
        keepout = blocker["radius"] + BLOCKER_MARGIN
        if distance < keepout:
            if distance < 1e-9:  # 恰好落在圆心：任选一个方向推出
                dx, dz, distance = 1.0, 0.0, 1.0
            scale = keepout / distance
            x = blocker["x"] + dx * scale
            z = blocker["z"] + dz * scale
    return {"x": x, "z": z, "yaw": float(position.get("yaw", 0.0))}


def nearest_seat(position: dict, max_distance: float = SEAT_SNAP_DISTANCE) -> dict | None:
    """距离阈值内的最近座位锚点；没有可用座位返回 None（不允许凭空 seated）。"""
    best, best_distance = None, max_distance
    for seat in SEATS:
        distance = math.hypot(position["x"] - seat["x"], position["z"] - seat["z"])
        if distance <= best_distance:
            best, best_distance = seat, distance
    return best
