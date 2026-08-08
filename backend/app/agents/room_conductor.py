"""v1 咖啡厅房间的生活指挥（RoomConductor）：让世界符合常识。

产品意图（2026-08-06）：正常的咖啡厅里大部分人围桌入座、与同桌交谈，
少数人走动或站着聊天；圆桌会议时与会者真的坐到圆桌座位上；会议不可能
永远挂着（超时自动散会，杜绝 stale meeting 把圆桌锁死成 409）。

分层：本模块只做**策略**（读快照 + 自己的意图记忆，产出计划 dict，纯函数
式、可单测）；**机制**（锁、事件、持久化）在 RoomService.apply_conductor_plan。
座位几何与碰撞与前端同源（app/world/tables.py，数值同步 CafeLayout.js）。

节拍：由 WorldScheduler 每个心跳（默认 15s）调用一次 tick_once()。
"""

from __future__ import annotations

import logging
import math
import random
import re
import time

from app.world.tables import (
    NPC_TABLE_SEATS,
    ROUNDTABLE_SEATS,
    WALK_BOUNDS,
    clamp_to_walkable,
)

logger = logging.getLogger(__name__)

STEP = 2.4                    # 每 tick 走位步长（米）：15s 心跳下横跨咖啡厅约 45 秒
ARRIVE_DISTANCE = 0.12        # 到点判定（米）
VISIT_OFFSET = 0.95           # 站着聊天时与对方保持的距离（米）
MIN_SEPARATION = 0.62         # NPC-NPC 最小间距（前端胶囊半径 0.28×2=0.56 + 余量；
                              # 低于此值前端的胶囊滑动与快照目标互搏——两人原地互挤死锁）
MEETING_TTL_SECONDS = 10 * 60  # 会议最长存续：超时自动散会（防 stale 锁死圆桌）

# 意图权重：大部分人就座是「咖啡厅常识」的核心
INTENT_WEIGHTS = (("seated", 0.60), ("visit", 0.22), ("wander", 0.18))
INTENT_TICKS = {"seated": (6, 16), "visit": (3, 6), "wander": (2, 4)}

_MEETING_ID_TS = re.compile(r"^meeting-(\d{10,13})$")


def _meeting_started_at(meeting: dict, now: float) -> float:
    """会议开始时间：优先已记的时间戳；否则从 meeting-<epoch_ms> 解析
    （前端生成的 id 带毫秒时间戳，可识别昨天挂死的 stale meeting）；再退化为 now。"""
    recorded = meeting.get("started_at")
    if recorded is not None:
        return float(recorded)
    match = _MEETING_ID_TS.match(str(meeting.get("meeting_id") or ""))
    if match:
        raw = int(match.group(1))
        return raw / 1000.0 if raw > 1e12 else float(raw)
    return now


def _seat_table_counts(assignments: dict[str, str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for node in assignments:
        seat = _SEAT_BY_NODE.get(node)
        if seat is not None:
            counts[seat["table_id"]] = counts.get(seat["table_id"], 0) + 1
    return counts


_SEAT_BY_NODE = {seat["node"]: seat for seat in NPC_TABLE_SEATS + ROUNDTABLE_SEATS}
_NPC_TABLE_IDS = tuple(dict.fromkeys(seat["table_id"] for seat in NPC_TABLE_SEATS))


class RoomConductor:
    """每个心跳为每个 v1 房间产出一拍生活计划。"""

    def __init__(self, room_service, *, rng: random.Random | None = None, clock=time.time):
        self._rooms = room_service
        self.rng = rng or random.Random(20260806)
        self._clock = clock
        # member_id -> {"mode", "seat_node", "target", "ticks_left"}（每房间独立命名空间：
        # key 带 room_id，成员离开/换房间时惰性清理）
        self._intents: dict[str, dict[str, dict]] = {}

    def tick_once(self) -> None:
        for room_id in self._rooms.room_ids():
            try:
                self.tick_room(room_id)
            except Exception:
                logger.exception("room conductor tick failed: %s", room_id)

    def tick_room(self, room_id: str) -> None:
        """Apply one room immediately for user-driven transitions such as meeting start."""
        snapshot = self._rooms.snapshot(room_id)
        plan = self.plan(room_id, snapshot, self._clock())
        if plan is not None:
            self._rooms.apply_conductor_plan(room_id, plan)

    # ---------- 策略（纯函数，单测直接打这里） ----------

    def plan(self, room_id: str, snapshot: dict, now: float) -> dict | None:
        members = {m["member_id"]: m for m in snapshot.get("members", [])}
        runtime = {r["agent_id"]: r for r in snapshot.get("agent_runtime", [])}
        # NPC = 除人类玩家外的成员。历史房间（agent_runtime 特性之前持久化的）
        # 缺条目，由 apply_conductor_plan 补建；GroupPlay 多设备人类成员当前没有
        # 标记渠道，是已记录的设计限制（docs/PRODUCT-STATUS.md）。
        npc_ids = sorted(set(members) - {"person-self"})
        if not npc_ids:
            return None
        intents = self._intents.setdefault(room_id, {})
        for gone in set(intents) - set(npc_ids):
            del intents[gone]
        # 重启恢复：conductor 意图是易失的，但房间状态持久化过——座位上的人
        # 保留原座位重建意图，避免重启后全场重新抢座。
        for person_id in npc_ids:
            if person_id in intents:
                continue
            seat_info = (runtime.get(person_id) or {}).get("seat") or {}
            seat = _SEAT_BY_NODE.get(seat_info.get("node"))
            if seat is not None and (runtime[person_id].get("status") in {"seated", "talking"}):
                intents[person_id] = {
                    "mode": "seated", "seat_node": seat["node"], "target": seat,
                    "ticks_left": self.rng.randint(*INTENT_TICKS["seated"]),
                }

    def plan(self, room_id: str, snapshot: dict, now: float) -> dict | None:
        members = {m["member_id"]: m for m in snapshot.get("members", [])}
        runtime = {r["agent_id"]: r for r in snapshot.get("agent_runtime", [])}
        # NPC = 除人类玩家外的成员。历史房间（agent_runtime 特性之前持久化的）
        # 缺条目，由 apply_conductor_plan 补建；GroupPlay 多设备人类成员当前没有
        # 标记渠道，是已记录的设计限制（docs/PRODUCT-STATUS.md）。
        npc_ids = sorted(set(members) - {"person-self"})
        if not npc_ids:
            return None
        intents = self._intents.setdefault(room_id, {})
        for gone in set(intents) - set(npc_ids):
            del intents[gone]
        # 重启恢复：conductor 意图是易失的，但房间状态持久化过——座位上的人
        # 保留原座位重建意图，避免重启后全场重新抢座。
        for person_id in npc_ids:
            if person_id in intents:
                continue
            seat_info = (runtime.get(person_id) or {}).get("seat") or {}
            seat = _SEAT_BY_NODE.get(seat_info.get("node"))
            if seat is not None and (runtime[person_id].get("status") in {"seated", "talking"}):
                intents[person_id] = {
                    "mode": "seated", "seat_node": seat["node"], "target": seat,
                    "ticks_left": self.rng.randint(*INTENT_TICKS["seated"]),
                }

        meeting = snapshot.get("meeting")
        if meeting is not None:
            plan = self._plan_meeting(meeting, members, runtime, npc_ids, intents, now)
        else:
            plan = self._plan_ambient(members, runtime, npc_ids, intents)
        self._separate(members, npc_ids, plan)
        return plan

    # ---------- NPC-NPC 分离（权威在后端，AGENTS.md 约定） ----------

    def _separate(self, members, npc_ids, plan) -> None:
        """对计划后的落点做两两分离：任何两个 NPC 的落点间距不得小于 MIN_SEPARATION。

        没有这一步，两个目标重合的 NPC 会在前端胶囊滑动与快照目标之间互搏
        （你挤我我挤你、原地高频抖动、谁也走不动）。已入座（座位锚点 ≥0.78m）
        与不动的人类成员视为固定桩，只推开 NPC 侧。"""
        moves = plan.get("moves") or {}
        statuses = plan.get("statuses") or {}
        positions = {}
        for person_id in npc_ids:
            anchor = members[person_id]["position"]
            move = moves.get(person_id)
            positions[person_id] = {
                "x": float(move["x"]) if move else float(anchor["x"]),
                "z": float(move["z"]) if move else float(anchor["z"]),
            }
        fixed = {
            person_id
            for person_id, status in statuses.items()
            if status.get("seat") and status.get("status") in {"seated", "talking", "meeting"}
        }
        humans = [pid for pid in members if pid not in npc_ids]
        for _ in range(2):  # 两轮迭代：三团互挤也能解开
            for index, first in enumerate(npc_ids):
                for second in npc_ids[index + 1:]:
                    if first in fixed and second in fixed:
                        continue
                    a, b = positions[first], positions[second]
                    ux, uz, deficit = self._separation_vector(a, b, first)
                    if deficit <= 0:
                        continue
                    if first in fixed:
                        self._nudge(positions, moves, second, ux, uz, deficit)
                    elif second in fixed:
                        self._nudge(positions, moves, first, -ux, -uz, deficit)
                    else:
                        self._nudge(positions, moves, first, -ux, -uz, deficit / 2)
                        self._nudge(positions, moves, second, ux, uz, deficit / 2)
            for human in humans:
                anchor = members[human]["position"]
                for person_id in npc_ids:
                    if person_id in fixed:
                        continue
                    ux, uz, deficit = self._separation_vector(
                        positions[person_id],
                        {"x": float(anchor["x"]), "z": float(anchor["z"])},
                        person_id,
                    )
                    if deficit > 0:  # 人类是固定桩：NPC 全额退让
                        self._nudge(positions, moves, person_id, -ux, -uz, deficit)

    @staticmethod
    def _separation_vector(a, b, seed_id):
        """b-a 方向的单位向量与间距亏空（>=MIN_SEPARATION 时亏空为 0）。"""
        dx, dz = b["x"] - a["x"], b["z"] - a["z"]
        distance = math.hypot(dx, dz)
        if distance >= MIN_SEPARATION:
            return 0.0, 0.0, 0.0
        if distance < 1e-6:  # 完全重合：按 id 决定论方向推开
            angle = (hash(seed_id) % 360) * math.pi / 180
            return math.cos(angle), math.sin(angle), MIN_SEPARATION
        return dx / distance, dz / distance, MIN_SEPARATION - distance

    @staticmethod
    def _nudge(positions, moves, person_id, ux, uz, amount):
        """把 person_id 沿 (ux,uz) 推 amount 米（过可行走壳），并同步进计划 moves。"""
        point = positions[person_id]
        clamped = clamp_to_walkable({
            "x": point["x"] + ux * amount,
            "z": point["z"] + uz * amount,
            "yaw": 0.0,
        })
        point["x"], point["z"] = clamped["x"], clamped["z"]
        previous = moves.get(person_id) or {}
        moves[person_id] = {
            "x": point["x"], "z": point["z"],
            "yaw": previous.get("yaw", 0.0),
        }

    def _plan_meeting(self, meeting, members, runtime, npc_ids, intents, now):
        started_at = _meeting_started_at(meeting, now)
        if now - started_at > MEETING_TTL_SECONDS:
            for participant in meeting.get("participant_ids", []):
                intents.pop(participant, None)
            return {
                "meeting_started_at": started_at,
                "end_meeting": "ttl-expired",
                "statuses": {
                    pid: {"status": "idle", "action": "leave-meeting"}
                    for pid in meeting.get("participant_ids", [])
                    if pid in runtime
                },
            }
        # 与会 NPC 走到圆桌座位：座位按排序后的参与者序号分配（0 号座留给
        # 组织者——通常是人类玩家，自己走过去；NPC 组织者照常用 0 号座）
        participants = list(meeting.get("participant_ids", []))
        moves, statuses = {}, {}
        for person_id in participants:
            if person_id not in npc_ids:
                continue  # 人类参与者自己走
            intents.pop(person_id, None)  # 会议期间清空日常意图
            seat = ROUNDTABLE_SEATS[participants.index(person_id) % len(ROUNDTABLE_SEATS)]
            move, arrived = self._step_toward(members[person_id], seat)
            moves[person_id] = move
            statuses[person_id] = {
                "status": "meeting" if arrived else "moving",
                "action": "join-meeting",
                "target_id": meeting.get("organizer_id"),
                "yaw": seat["yaw"] if arrived else move["yaw"],
                "seat": {"node": seat["node"], "table_id": seat["table_id"]} if arrived else None,
            }
        return {
            "meeting_started_at": None if "started_at" in meeting else started_at,
            "moves": moves,
            "statuses": statuses,
        }

    def _plan_ambient(self, members, runtime, npc_ids, intents):
        # 先退役过期意图并释放其座位，再基于存活意图重建座位占用表
        for person_id in npc_ids:
            intent = intents.get(person_id)
            if intent is not None and intent["ticks_left"] <= 0:
                del intents[person_id]
        seat_assignments = {}
        for person_id in npc_ids:
            intent = intents.get(person_id)
            if intent and intent.get("seat_node"):
                seat_assignments[intent["seat_node"]] = person_id
        moves, statuses = {}, {}
        for person_id in npc_ids:
            intent = intents.get(person_id)
            if intent is None:
                intent = self._new_intent(person_id, npc_ids, members, runtime, seat_assignments)
                intents[person_id] = intent
                if intent.get("seat_node"):
                    seat_assignments[intent["seat_node"]] = person_id
            intent["ticks_left"] -= 1
            self._advance(person_id, intent, members, runtime, seat_assignments, moves, statuses)
        # 同桌 ≥2 人即「交谈中」：在走位结算后统一重算（有人离开就回落「小坐」）
        self._resolve_table_talk(runtime, intents, statuses)
        return {"moves": moves, "statuses": statuses}

    # ---------- 意图 ----------

    def _new_intent(self, person_id, npc_ids, members, runtime, seat_assignments):
        roll = self.rng.random()
        mode = "seated"
        for candidate, weight in INTENT_WEIGHTS:
            if roll < weight:
                mode = candidate
                break
            roll -= weight
        ticks = self.rng.randint(*INTENT_TICKS[mode])
        if mode == "seated":
            seat = self._pick_seat(seat_assignments)
            if seat is None:
                mode, ticks = "wander", self.rng.randint(*INTENT_TICKS["wander"])
            else:
                return {"mode": mode, "seat_node": seat["node"], "target": seat,
                        "ticks_left": ticks}
        if mode == "visit":
            others = [pid for pid in npc_ids if pid != person_id]
            if not others:
                mode, ticks = "wander", self.rng.randint(*INTENT_TICKS["wander"])
            else:
                target_id = self.rng.choice(others)
                return {"mode": mode, "seat_node": None, "target_id": target_id,
                        "target": None, "ticks_left": ticks}
        return {"mode": "wander", "seat_node": None,
                "target": self._random_walkable(), "ticks_left": ticks}

    def _pick_seat(self, seat_assignments):
        """社交聚簇：优先还有人气的桌子（已有 ≥1 人且有空位），其次空桌。"""
        counts = _seat_table_counts(seat_assignments)
        tables = sorted(
            _NPC_TABLE_IDS,
            key=lambda table_id: counts.get(table_id, 0),
            reverse=True,
        )
        for table_id in tables:
            free = [
                seat for seat in NPC_TABLE_SEATS
                if seat["table_id"] == table_id and seat["node"] not in seat_assignments
            ]
            if free and (counts.get(table_id, 0) > 0 or table_id == tables[-1] or self.rng.random() < 0.3):
                return self.rng.choice(free)
        return None

    def _random_walkable(self) -> dict:
        for _ in range(12):
            point = {
                "x": self.rng.uniform(WALK_BOUNDS["min_x"] + 0.4, WALK_BOUNDS["max_x"] - 0.4),
                "z": self.rng.uniform(WALK_BOUNDS["min_z"] + 0.4, WALK_BOUNDS["max_z"] - 0.4),
                "yaw": 0.0,
            }
            clamped = clamp_to_walkable(point)
            if math.hypot(clamped["x"] - point["x"], clamped["z"] - point["z"]) < 0.05:
                return point
        return {"x": 0.0, "z": 3.6, "yaw": math.pi}  # 兜底：出生区附近（必可行走）

    # ---------- 走位结算 ----------

    def _advance(self, person_id, intent, members, runtime, seat_assignments, moves, statuses):
        member = members[person_id]
        mode = intent["mode"]
        if mode == "visit":
            target = members.get(intent["target_id"])
            if target is None:
                intent["ticks_left"] = 0
                return
            goal = {
                "x": target["position"]["x"], "z": target["position"]["z"],
            }
            distance = math.hypot(goal["x"] - member["position"]["x"],
                                  goal["z"] - member["position"]["z"])
            if distance <= VISIT_OFFSET * 1.3:
                yaw = math.atan2(goal["x"] - member["position"]["x"],
                                 goal["z"] - member["position"]["z"])
                statuses[person_id] = {
                    "status": "talking", "action": "chat",
                    "target_id": intent["target_id"], "yaw": yaw,
                }
                return
            move, _ = self._step_toward(member, goal)
            moves[person_id] = move
            statuses[person_id] = {"status": "moving", "action": "visit",
                                   "target_id": intent["target_id"], "yaw": move["yaw"]}
            return
        # seated / wander：走向锚点；seated 到点吸附并记录座位
        move, arrived = self._step_toward(member, intent["target"])
        moves[person_id] = move
        if mode == "seated" and arrived:
            seat = intent["target"]
            moves[person_id] = {"x": seat["x"], "z": seat["z"], "yaw": seat["yaw"]}
            statuses[person_id] = {
                "status": "seated", "action": "sit", "target_id": None,
                "yaw": seat["yaw"],
                "seat": {"node": seat["node"], "table_id": seat["table_id"]},
            }
        elif mode == "wander" and arrived:
            statuses[person_id] = {"status": "idle", "action": "look-around",
                                   "target_id": None, "yaw": move["yaw"]}
        else:
            statuses[person_id] = {"status": "moving", "action": mode,
                                   "target_id": None, "yaw": move["yaw"]}

    def _step_toward(self, member: dict, goal: dict) -> tuple[dict, bool]:
        position = member["position"]
        dx, dz = goal["x"] - position["x"], goal["z"] - position["z"]
        distance = math.hypot(dx, dz)
        yaw = math.atan2(dx, dz) if distance > 1e-6 else float(goal.get("yaw", 0.0))
        if distance <= ARRIVE_DISTANCE:
            return {"x": goal["x"], "z": goal["z"], "yaw": float(goal.get("yaw", yaw))}, True
        step = min(STEP, distance)
        moved = clamp_to_walkable({
            "x": position["x"] + dx / distance * step,
            "z": position["z"] + dz / distance * step,
            "yaw": yaw,
        })
        # 被阻挡壳卡住（步进几乎为零）时视为到达不了：交给上层下个 tick 重排
        progressed = math.hypot(moved["x"] - position["x"], moved["z"] - position["z"])
        return moved, progressed <= ARRIVE_DISTANCE and distance <= STEP * 0.5

    def _resolve_table_talk(self, runtime, intents, statuses):
        counts: dict[str, int] = {}
        for person_id, intent in intents.items():
            if intent["mode"] == "seated" and intent.get("seat_node"):
                seat = _SEAT_BY_NODE.get(intent["seat_node"])
                status = statuses.get(person_id, runtime.get(person_id) or {})
                seated_now = status.get("status") in {"seated", "talking"}
                if seat is not None and seated_now:
                    counts[seat["table_id"]] = counts.get(seat["table_id"], 0) + 1
        for person_id, intent in intents.items():
            if intent["mode"] != "seated" or not intent.get("seat_node"):
                continue
            status = statuses.get(person_id)
            if status is None or status.get("status") not in {"seated", "talking"}:
                continue
            seat = _SEAT_BY_NODE[intent["seat_node"]]
            if counts.get(seat["table_id"], 0) >= 2:
                status["status"] = "talking"
                status["action"] = "table-chat"
