"""World Service stub：世界状态权威（ARCHITECTURE.md §1 铁律）。

目的：维护"世界里有什么、角色在哪里"；消费 Agent 事件、推进 tick、
      生成 echo-snapshot.v1 快照。Agent 不直接写世界状态，只发事件。
输入：seed_world() 种子数据；EventBus 派发的 agent-move / agent-state /
      agent-talk / meeting-start / meeting-end 事件。
输出：snapshot() -> 通过 echo-snapshot.v1 硬校验的 dict，events 字段为
      最近 N=20 条世界事件缓冲（前端轮询渲染气泡/会议提示）。
验收：tests/test_snapshot.py —— 快照含 schema/tick/agents/events 且通过校验；
      tests/test_runtime.py —— 会议调度与 talk 事件进缓冲。

会议约定：中央六人圆桌与前端 CafeLayout.roundtable 对齐（圆心 (0,0)，
座位用真实锚点 ROUNDTABLE_SEATS）；in-meeting 中的 Agent 不被日常调度打扰。

防穿模：agent-move 目标点与种子位置统一过 tables.clamp_to_walkable()
（边界 + 圆形阻挡体外扩 0.3 投影）；seated 必须吸附最近座位锚点
（阈值 0.9m，否则拒绝并保持 standing/walking）。
"""

import math
from collections import deque

from app.schemas.snapshot_schema import build_snapshot
from app.world.colliders import (
    BOOTH_SHELL_RADIUS,
    CAFE_COLLIDERS,
    Bounds,
    Circle,
    WorldColliders,
    clamp_static,
    resolve_move,
)
from app.world.hall import HallRegistry
from app.world.tables import (
    ROUNDTABLE_SEATS,
    SEATS,
    SEAT_SNAP_DISTANCE,
    WALK_BOUNDS,
)

EVENT_BUFFER_SIZE = 20


class WorldService:
    """世界状态的唯一权威；唯一输出通道是版本化快照（ADR-3）。"""

    def __init__(self, seed: dict, *, blockers=None, bounds=None, colliders=None):
        self.tick = 0
        # 碰撞注册：colliders 显式传入优先；否则由 blockers/bounds 构造；
        # 都缺省为咖啡厅静态壳（CAFE_COLLIDERS）。大厅的摊位壳在此之外
        # 由 booth modules 动态派生（r=0.9，新展位自动成壳）。
        if colliders is not None:
            self._colliders = colliders
        elif blockers is not None or bounds is not None:
            effective = bounds or WALK_BOUNDS
            self._colliders = WorldColliders(
                bounds=Bounds(effective["min_x"], effective["max_x"],
                              effective["min_z"], effective["max_z"]),
                circles=tuple(Circle(b["x"], b["z"], b["radius"]) for b in (blockers or ())),
            )
        else:
            self._colliders = CAFE_COLLIDERS
        # agent 内部状态：id -> {name, position, state, palette}
        # 种子位置同样过静态钳制（防止初始就站进桌子）
        self._agents = {}
        for agent in seed.get("agents", []):
            clamped = self._clamp(agent["position"])
            clamped["yaw"] = agent["position"].get("yaw", 0.0)
            self._agents[agent["id"]] = {
                "name": agent["name"],
                "position": clamped,
                "state": agent["state"],
                "palette": dict(agent["palette"]),
            }
        self._modules = [dict(module) for module in seed.get("modules", [])]
        # 最近 N 条世界事件滚动缓冲（快照 events 字段，前端轮询渲染）
        self._events: deque = deque(maxlen=EVENT_BUFFER_SIZE)
        # 当前进行中的圆桌会议：{"id", "participants", "started_tick"} | None
        self.current_meeting: dict | None = None
        # 展位大厅注册表（person_id ↔ booth，幂等；大厅实例使用，咖啡厅实例空置）
        self._hall = HallRegistry()
        # 座位占用表（seat_node -> agent_id，M1.8 一座一人）。
        # 易失状态：不持久化，重启即重建（世界运行时随事件自然恢复一致）。
        self._seat_owners: dict = {}

    # ---------- 展位大厅：人员注册（系统/确认流程驱动，非自进化写入） ----------

    def register_person(self, person_id: str, display: dict) -> dict:
        """把一个人注册进展位大厅（幂等）：分配展位锚点 → agents 增员
        （state="at-booth"，位置=展位锚点，yaw 朝展位前方/大厅中心）→
        modules 增加 booth 条目。重复注册只刷新 display，不重复分配展位。
        """
        display = dict(display or {})
        booth_id = self._hall.booth_of(person_id)
        if booth_id is None:
            anchor = self._hall.assign(person_id)
            booth_id = anchor["booth_id"]
            booth = {
                "id": booth_id,
                "type": "booth",
                "person_id": person_id,
                "position": dict(anchor["position"]),
                "display": display,
                "interaction": {
                    "label": display.get("name") or "人物展位",
                    "radius": 2.0,
                    "primary": {"key": "E", "action": "open-package", "label": "查看资料"},
                    "secondary": {"key": "F", "action": "invite-to-cafe", "label": "去咖啡厅"},
                },
            }
            self._modules.append(booth)
        else:
            booth = next(m for m in self._modules if m["id"] == booth_id)
            booth["display"] = display
        if person_id not in self._agents:
            self._agents[person_id] = {
                "name": display.get("name") or person_id,
                "position": dict(booth["position"]),
                "state": "at-booth",
                "palette": dict(display.get("palette") or {}),
            }
        return booth

    # ---------- 事件消费（Agent 改变世界的唯一方式） ----------

    def apply_event(self, event: dict) -> None:
        """消费一个 Agent 事件并更新世界状态。未知事件类型直接忽略（stub）。"""
        if not isinstance(event, dict):
            return
        handler = {
            "agent-move": self._on_agent_move,
            "agent-state": self._on_agent_state,
            "agent-talk": self._on_agent_talk,
            "meeting-start": self._on_meeting_start,
            "meeting-end": self._on_meeting_end,
        }.get(event.get("type"))
        if handler:
            handler(event)

    def _on_agent_move(self, event: dict) -> None:
        agent = self._agents.get(event.get("agent_id"))
        if agent is None:
            return
        position = event.get("position")
        if isinstance(position, dict):
            # 服务端权威解算：静态壳钳制 + 与其他 agent 的圆形分离。
            # 任何来源（咖啡厅 runtime/大厅串门/外部注入）都过这唯一闸口。
            resolved = self._resolve_position(event["agent_id"], agent["position"], position)
            resolved["yaw"] = float(position.get("yaw", agent["position"]["yaw"]))
            agent["position"] = resolved
        if event.get("state"):
            self._apply_state(event["agent_id"], agent, event["state"])
        self._events.append(
            {"type": "agent-move", "agent_id": event["agent_id"],
             "position": dict(agent["position"]), "tick": self.tick}
        )

    def _on_agent_state(self, event: dict) -> None:
        agent = self._agents.get(event.get("agent_id"))
        if agent is None or not event.get("state"):
            return
        if not self._apply_state(event["agent_id"], agent, event["state"]):
            return  # 状态被拒绝（如无座位强行 seated）：不入缓冲
        self._events.append(
            {"type": "agent-state", "agent_id": event["agent_id"],
             "state": event["state"], "tick": self.tick}
        )

    # ---------- 碰撞与位置解算（服务端权威） ----------

    def _clamp(self, position: dict) -> dict:
        return clamp_static(position, self._colliders)

    def _booth_circles(self, exclude_agent: str | None = None) -> tuple:
        """大厅摊位壳：由 booth modules 动态派生（新展位自动成壳；
        自己的摊位不算自己的壳——回展位是合法目的地）。"""
        return tuple(
            Circle(m["position"]["x"], m["position"]["z"], BOOTH_SHELL_RADIUS)
            for m in self._modules
            if m.get("type") == "booth" and m.get("person_id") != exclude_agent
        )

    def _resolve_position(self, agent_id: str, from_pos: dict, to_pos: dict) -> dict:
        others = [(pid, state["position"]) for pid, state in self._agents.items()
                  if pid != agent_id]
        colliders = WorldColliders(self._colliders.bounds,
                                   self._colliders.circles
                                   + self._booth_circles(exclude_agent=agent_id))
        return resolve_move(agent_id, from_pos, to_pos, others, colliders)

    def _apply_state(self, agent_id: str, agent: dict, state: str) -> bool:
        """应用状态切换（M1.8 一座一人）。seated 吸附最近的**空闲**座位锚点
        （阈值内；被占选次近，无空闲拒绝）；at-booth 必须有自己的展位；
        离开 seated 的任何状态切换都释放座位占用。"""
        if state == "seated":
            seat = self._nearest_free_seat(agent_id, agent["position"])
            if seat is None:
                return False
            self._occupy_seat(agent_id, seat)
            agent["position"] = {"x": seat["x"], "z": seat["z"], "yaw": seat["yaw"]}
            agent["state"] = "seated"
            return True
        if state == "at-booth":
            booth = next((m for m in self._modules
                          if m.get("type") == "booth" and m.get("person_id") == agent_id),
                         None)
            if booth is None:
                return False
            self._release_seat(agent_id)
            agent["position"] = dict(booth["position"])
            agent["state"] = "at-booth"
            return True
        if agent.get("state") == "seated":
            self._release_seat(agent_id)  # walking/talking/in-meeting…：离座释放
        agent["state"] = state
        return True

    # ---------- 座位占用（seat_node -> agent_id，易失不持久化） ----------

    def _occupy_seat(self, agent_id: str, seat: dict) -> None:
        self._release_seat(agent_id)  # 先释放旧座（一人一座）
        self._seat_owners[seat["node"]] = agent_id

    def _release_seat(self, agent_id: str) -> None:
        for node in [node for node, owner in self._seat_owners.items()
                     if owner == agent_id]:
            del self._seat_owners[node]

    def _nearest_free_seat(self, agent_id: str, position: dict) -> dict | None:
        """阈值内最近的空闲座位；目标座位被他人占用时取次近空闲，无空闲返回 None。"""
        candidates = sorted(
            SEATS,
            key=lambda s: math.hypot(position["x"] - s["x"], position["z"] - s["z"]),
        )
        for seat in candidates:
            distance = math.hypot(position["x"] - seat["x"], position["z"] - seat["z"])
            if distance > SEAT_SNAP_DISTANCE:
                break  # 已按距离排序，后面更远
            owner = self._seat_owners.get(seat["node"])
            if owner is None or owner == agent_id:  # 空闲或本就是自己的座
                return seat
        return None

    def _on_agent_talk(self, event: dict) -> None:
        speaker = self._agents.get(event.get("agent_id"))
        listener = self._agents.get(event.get("to_agent_id"))
        text = event.get("text")
        if speaker is None or listener is None or not isinstance(text, str) or not text.strip():
            return
        self._events.append(
            {"type": "agent-talk", "agent_id": event["agent_id"],
             "to_agent_id": event["to_agent_id"], "text": text.strip()[:200],
             "tick": self.tick}
        )

    def _on_meeting_start(self, event: dict) -> None:
        """发起圆桌会议：参与者按占用分配入座圆桌锚点（6 座不重复，
        座位已满的候选人无法入座；Agent 自主发起至少 2 人，用户发起至少 1 个
        Agent（用户自己占前端保留座）即可成立。"""
        if self.current_meeting is not None:
            return  # 圆桌同时只容纳一场会议
        candidates = [
            pid for pid in (event.get("participants") or [])
            if pid in self._agents and self._agents[pid]["state"] != "in-meeting"
        ]
        meeting_id = str(event.get("meeting_id") or f"meeting_{self.tick}")
        participants = []
        for pid in candidates:
            seat = next((s for s in ROUNDTABLE_SEATS
                         if self._seat_owners.get(s["node"]) is None), None)
            if seat is None:
                continue  # 圆桌满员：该候选人无法入座
            self._release_seat(pid)  # 离开原座位（若原本 seated）
            self._seat_owners[seat["node"]] = pid
            agent = self._agents[pid]
            agent["position"] = {"x": seat["x"], "z": seat["z"], "yaw": seat["yaw"]}
            agent["state"] = "in-meeting"
            participants.append(pid)
        minimum = 1 if event.get("initiated_by") == "self" else 2
        if len(participants) < minimum:
            # 会议流产：回退已入座者的状态与座位占用
            for pid in participants:
                self._release_seat(pid)
                self._agents[pid]["state"] = "walking"
            return
        self.current_meeting = {
            "id": meeting_id, "participants": participants, "started_tick": self.tick,
            "topic": str(event.get("topic") or "围桌聊聊")[:120],
            "initiated_by": event.get("initiated_by") or "agent",
        }
        self._events.append(
            {"type": "meeting-started", "meeting_id": meeting_id,
             "participants": participants, "topic": self.current_meeting["topic"],
             "initiated_by": self.current_meeting["initiated_by"], "tick": self.tick}
        )

    def _on_meeting_end(self, event: dict) -> None:
        """结束会议：参与者散场（保持入座，状态回 seated）。"""
        meeting = self.current_meeting
        if meeting is None:
            return
        if event.get("meeting_id") and event["meeting_id"] != meeting["id"]:
            return
        for pid in meeting["participants"]:
            if pid in self._agents:
                self._agents[pid]["state"] = "seated"
        self._events.append(
            {"type": "meeting-ended", "meeting_id": meeting["id"],
             "participants": meeting["participants"], "tick": self.tick}
        )
        self.current_meeting = None

    def step(self) -> int:
        """推进一个 tick。事件由 EventBus 在 step 前同步派发完毕。"""
        self.tick += 1
        return self.tick

    # ---------- 快照生成 ----------

    def snapshot(self) -> dict:
        agents = [
            {
                "id": agent_id,
                "position": dict(state["position"]),
                "state": state["state"],
                "avatar": {"palette": dict(state["palette"])},
            }
            for agent_id, state in sorted(self._agents.items())
        ]
        snapshot = build_snapshot(
            tick=self.tick,
            agents=agents,
            modules=[dict(module) for module in self._modules],
            events=list(self._events),
        )
        # 进行中的圆桌会议（附加信息，校验器对额外字段宽容）
        snapshot["meeting"] = (
            {"id": self.current_meeting["id"],
             "participants": list(self.current_meeting["participants"]),
             "topic": self.current_meeting["topic"],
             "initiated_by": self.current_meeting["initiated_by"]}
            if self.current_meeting else None
        )
        return snapshot
