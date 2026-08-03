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
座位半径 1.6m，六等分朝向圆心）；in-meeting 中的 Agent 不被日常调度打扰。
"""

import math
from collections import deque

from app.schemas.snapshot_schema import build_snapshot

EVENT_BUFFER_SIZE = 20
ROUNDTABLE_CENTER = (0.0, 0.0)
ROUNDTABLE_SEAT_RADIUS = 1.6


def roundtable_seat(index: int, count: int) -> dict:
    """圆桌第 index 个座位（共 count 个），朝向圆心（与前端 MODEL_FORWARD +Z 一致）。"""
    angle = index * 2 * math.pi / max(count, 1)
    x = ROUNDTABLE_CENTER[0] + ROUNDTABLE_SEAT_RADIUS * math.cos(angle)
    z = ROUNDTABLE_CENTER[1] + ROUNDTABLE_SEAT_RADIUS * math.sin(angle)
    return {"x": x, "z": z, "yaw": math.atan2(-x, -z)}


class WorldService:
    """世界状态的唯一权威；唯一输出通道是版本化快照（ADR-3）。"""

    def __init__(self, seed: dict):
        self.tick = 0
        # agent 内部状态：id -> {name, position, state, palette}
        self._agents = {
            agent["id"]: {
                "name": agent["name"],
                "position": dict(agent["position"]),
                "state": agent["state"],
                "palette": dict(agent["palette"]),
            }
            for agent in seed.get("agents", [])
        }
        self._modules = [dict(module) for module in seed.get("modules", [])]
        # 最近 N 条世界事件滚动缓冲（快照 events 字段，前端轮询渲染）
        self._events: deque = deque(maxlen=EVENT_BUFFER_SIZE)
        # 当前进行中的圆桌会议：{"id", "participants", "started_tick"} | None
        self.current_meeting: dict | None = None
        # TODO(座位调度预留)：普通桌位表（table_id -> seat_id -> agent_id），
        # 入座/离座事件在这里结算；MVP1 暂由 Agent Runtime mock 直接给坐标。

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
            agent["position"].update(
                {axis: float(position[axis]) for axis in ("x", "z", "yaw") if axis in position}
            )
        if event.get("state"):
            agent["state"] = event["state"]
        self._events.append(
            {"type": "agent-move", "agent_id": event["agent_id"], "tick": self.tick}
        )

    def _on_agent_state(self, event: dict) -> None:
        agent = self._agents.get(event.get("agent_id"))
        if agent is None or not event.get("state"):
            return
        agent["state"] = event["state"]
        self._events.append(
            {"type": "agent-state", "agent_id": event["agent_id"],
             "state": event["state"], "tick": self.tick}
        )

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
            agent["position"] = roundtable_seat(index, len(participants))
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
