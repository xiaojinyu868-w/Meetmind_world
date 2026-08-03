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

from collections import deque

from app.schemas.snapshot_schema import build_snapshot
from app.world.hall import HallRegistry
from app.world.tables import ROUNDTABLE_SEATS, clamp_to_walkable, nearest_seat

EVENT_BUFFER_SIZE = 20


class WorldService:
    """世界状态的唯一权威；唯一输出通道是版本化快照（ADR-3）。"""

    def __init__(self, seed: dict, *, blockers=None, bounds=None):
        self.tick = 0
        # 可行走约束：None 表示用 tables 的咖啡厅默认值；大厅实例传空阻挡 + 大厅边界
        self._blockers = blockers
        self._bounds = bounds
        # agent 内部状态：id -> {name, position, state, palette}
        # 种子位置同样过可行走钳制（防止初始就站进桌子）
        self._agents = {}
        for agent in seed.get("agents", []):
            clamped = clamp_to_walkable(agent["position"], self._blockers, self._bounds)
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
        # TODO(座位占用登记)：普通桌位表（seat_node -> agent_id），
        # 目前 seated 只做锚点吸附，不做一人一座的占用互斥。

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
            # 统一钳制：任何来源（规则兜底/LLM 决策/外部注入）的目标点
            # 都不允许落入阻挡圆或走出边界（防穿模的唯一闸口）
            clamped = clamp_to_walkable(position, self._blockers, self._bounds)
            clamped["yaw"] = float(position.get("yaw", agent["position"]["yaw"]))
            agent["position"] = clamped
        if event.get("state"):
            self._apply_state(agent, event["state"])
        self._events.append(
            {"type": "agent-move", "agent_id": event["agent_id"], "tick": self.tick}
        )

    def _on_agent_state(self, event: dict) -> None:
        agent = self._agents.get(event.get("agent_id"))
        if agent is None or not event.get("state"):
            return
        if not self._apply_state(agent, event["state"]):
            return  # 状态被拒绝（如无座位强行 seated）：不入缓冲
        self._events.append(
            {"type": "agent-state", "agent_id": event["agent_id"],
             "state": event["state"], "tick": self.tick}
        )

    def _apply_state(self, agent: dict, state: str) -> bool:
        """应用状态切换。seated 必须吸附最近座位锚点（阈值内），否则拒绝并保持原状态。"""
        if state != "seated":
            agent["state"] = state
            return True
        seat = nearest_seat(agent["position"])
        if seat is None:
            return False
        agent["position"] = {"x": seat["x"], "z": seat["z"], "yaw": seat["yaw"]}
        agent["state"] = "seated"
        return True

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
        """发起圆桌会议：参与者入座圆桌坐标，状态 in-meeting。"""
        if self.current_meeting is not None:
            return  # 圆桌同时只容纳一场会议
        participants = [
            pid for pid in (event.get("participants") or [])
            if pid in self._agents and self._agents[pid]["state"] != "in-meeting"
        ]
        if len(participants) < 2:
            return
        meeting_id = str(event.get("meeting_id") or f"meeting_{self.tick}")
        for index, pid in enumerate(participants):
            agent = self._agents[pid]
            # 入座圆桌真实锚点（与前端 CafeLayout.roundtable.seats 同源）
            seat = ROUNDTABLE_SEATS[index % len(ROUNDTABLE_SEATS)]
            agent["position"] = {"x": seat["x"], "z": seat["z"], "yaw": seat["yaw"]}
            agent["state"] = "in-meeting"
        self.current_meeting = {
            "id": meeting_id, "participants": participants, "started_tick": self.tick,
        }
        self._events.append(
            {"type": "meeting-started", "meeting_id": meeting_id,
             "participants": participants, "tick": self.tick}
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
             "participants": list(self.current_meeting["participants"])}
            if self.current_meeting else None
        )
        return snapshot
