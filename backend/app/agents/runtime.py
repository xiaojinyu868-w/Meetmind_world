"""Agent Runtime：skill 驱动的轻量运行时（计划 §3.2，ADR-1 不破）。

目的：让咖啡厅"活"起来 —— 每 tick 读 skill + 世界快照，调 chat provider
      （deepseek）以受约束 JSON 决策各 Agent 动作（move/visit/sit/talk），
      解析失败或未配置时回退规则驱动；所有动作只经 EventBus 发事件，
      且先过 harness 事件白名单（guard.check_event）。
输入：World Service 快照；skills/cafe_daily.md、meeting.md；memory 层的
      授权上下文视图（authorized_agent_view，≥ L2，绝不携带 self-only）。
输出：agent-move / agent-state / agent-talk / meeting-start / meeting-end 事件。
验收：tests/test_runtime.py —— 决策解析（合法/非法/越权）、对话权限过滤、
      会议调度、快照 events 校验；LLM 不可用时规则兜底保持世界活跃。

⚠ 决策与对话的"质量"待打磨（prompt、频率、话题深度），但权限边界与事件
纪律不妥协：LLM 只能挑动作，坐标/座位由 runtime 结算，越权输出一律丢弃。
"""

import json
import logging
import math
import random

from app.agents.llm.base import LLMResponse
from app.agents.skills import load_skill
from app.agents.utils.jsonish import extract_json
from app.harness.permissions.guard import DEFAULT_GUARD

logger = logging.getLogger(__name__)

DECISION_ACTIONS = ("move", "visit", "sit", "talk")
TALK_DISTANCE = 2.5        # 触发交谈的最大距离
TALK_COOLDOWN_TICKS = 3    # 同一 Agent 两次交谈的最小间隔（避免演出感过重）
VISIT_STEP = 0.8           # visit 单步接近距离
WALK_STEP = 0.6            # 随机走动步长
WORLD_BOUND = 6.0          # 咖啡厅边界（与前端 CafeLayout 同一量级）

MEETING_INTERVAL_TICKS = 20   # 两场圆桌会议的最小间隔
MEETING_DURATION_TICKS = 6    # 一场会议持续的 tick 数
MEETING_START_PROBABILITY = 0.5  # 间隔满足后每 tick 发起会议的概率


class EventBus:
    """极简同步事件总线：Agent 发布，World Service 订阅消费。"""

    def __init__(self):
        self._subscribers = []

    def subscribe(self, handler) -> None:
        self._subscribers.append(handler)

    def publish(self, event: dict) -> None:
        for handler in self._subscribers:
            handler(event)


class AgentRuntime:
    """skill + LLM 决策、规则兜底的 Agent 运行时。"""

    def __init__(self, bus: EventBus, rng: random.Random | None = None,
                 chat_provider=None, memory=None, guard=None):
        self.bus = bus
        self.rng = rng or random.Random(42)  # 固定种子，demo 可复现
        self._chat = chat_provider           # None 或未配置 → 纯规则驱动
        self._memory = memory                # MemoryStore（授权上下文视图来源）
        self._guard = guard or DEFAULT_GUARD
        self._last_talk_tick: dict = {}      # agent_id -> 最近交谈 tick
        self._last_meeting_end = -MEETING_INTERVAL_TICKS
        self._meeting: dict | None = None    # runtime 侧会议记账 {id, participants, ticks_left}

    # ---------- 主循环 ----------

    def tick(self, world_snapshot: dict) -> None:
        tick_no = world_snapshot.get("tick", 0)
        agents = {a["id"]: a for a in world_snapshot.get("agents", [])}
        if not agents:
            return
        self._tick_meeting(tick_no, agents)
        # 会议事件已被 World 同步消费，但本 tick 的快照是会前拍的：
        # 日常调度必须按 runtime 记账跳过与会者，不能凭过期快照
        skip = set(self._meeting["participants"]) if self._meeting else set()
        self._tick_daily(tick_no, agents, skip)

    # ---------- 圆桌会议调度（skills/meeting.md） ----------

    def _tick_meeting(self, tick_no: int, agents: dict) -> bool:
        if self._meeting is not None:
            # 进行中：与会者轮流发言，倒数结束
            participants = [p for p in self._meeting["participants"] if p in agents]
            if len(participants) >= 2:
                pair = self.rng.sample(participants, 2)
                self._talk(tick_no, agents[pair[0]], agents[pair[1]])
            self._meeting["ticks_left"] -= 1
            if self._meeting["ticks_left"] <= 0:
                self._emit({"type": "meeting-end", "meeting_id": self._meeting["id"]})
                self._last_meeting_end = tick_no
                self._meeting = None
            return True
        idle = [a for a in agents.values() if a.get("state") != "in-meeting"]
        if (tick_no - self._last_meeting_end >= MEETING_INTERVAL_TICKS
                and len(idle) >= 3
                and self.rng.random() < MEETING_START_PROBABILITY):
            count = self.rng.randint(3, min(4, len(idle)))
            participants = [a["id"] for a in self.rng.sample(idle, count)]
            meeting_id = f"meeting_{tick_no}"
            self._emit({"type": "meeting-start", "meeting_id": meeting_id,
                        "participants": participants})
            self._meeting = {"id": meeting_id, "participants": participants,
                             "ticks_left": MEETING_DURATION_TICKS}
            return True
        return False

    # ---------- 咖啡厅日常（skills/cafe_daily.md） ----------

    def _tick_daily(self, tick_no: int, agents: dict, skip: set | None = None) -> None:
        skip = skip or set()
        idle = [a for a in agents.values()
                if a["id"] not in skip and a.get("state") != "in-meeting"]
        if not idle:
            return
        actions = self._decide_with_llm(idle) or self._decide_with_rules(tick_no, idle)
        for action in actions:
            self._apply_action(tick_no, agents, action)

    def _decide_with_llm(self, idle_agents: list) -> list | None:
        """读 skill + 快照调 deepseek 决策；未配置/失败/解析失败返回 None（走兜底）。"""
        if self._chat is None or not self._chat.config.get("configured"):
            return None
        roster = [
            {"id": a["id"], "state": a["state"],
             "x": round(a["position"]["x"], 2), "z": round(a["position"]["z"], 2)}
            for a in idle_agents
        ]
        messages = [
            {"role": "system", "content": load_skill("cafe_daily")},
            {"role": "user", "content": (
                "当前空闲 Agent（JSON）：" + json.dumps(roster, ensure_ascii=False) + "\n"
                "为每个 Agent 决定下一步动作，只输出 JSON："
                "{\"actions\": [{\"agent_id\": \"...\", \"action\": \"move|visit|sit|talk\","
                " \"target\": \"（visit/talk 时填对方 agent_id）\"}]}。"
                "动作数量不超过 Agent 数；不确定就 move。"
            )},
        ]
        response = self._chat.chat(messages, response_format={"type": "json_object"})
        if response.mock:
            return None
        return self._parse_decisions(response.text, {a["id"] for a in idle_agents})

    def _parse_decisions(self, text: str, idle_ids: set) -> list | None:
        """解析 LLM 决策 JSON：结构非法返回 None；条目越权/未知一律丢弃。"""
        data = extract_json(text)
        if data is None or not isinstance(data.get("actions"), list):
            logger.warning("LLM 决策解析失败，回退规则驱动：%.80s", text)
            return None
        actions = []
        for item in data["actions"]:
            if not isinstance(item, dict):
                continue
            agent_id, action, target = item.get("agent_id"), item.get("action"), item.get("target")
            if agent_id not in idle_ids or action not in DECISION_ACTIONS:
                logger.warning("丢弃越权/未知决策条目：%r", item)
                continue
            if action in ("visit", "talk") and target not in idle_ids:
                logger.warning("丢弃目标非法的决策条目：%r", item)
                continue
            actions.append({"agent_id": agent_id, "action": action, "target": target})
        return actions

    def _decide_with_rules(self, tick_no: int, idle_agents: list) -> list:
        """规则兜底（无 LLM 时世界仍然活跃）：走动/探望/入座/邻近攀谈。"""
        actions = []
        for agent in idle_agents:
            roll = self.rng.random()
            if roll < 0.45:
                actions.append({"agent_id": agent["id"], "action": "move", "target": None})
            elif roll < 0.80:
                target = self._nearest_idle(agent, idle_agents)
                if target is None:
                    actions.append({"agent_id": agent["id"], "action": "move", "target": None})
                elif self._distance(agent, target) <= TALK_DISTANCE:
                    actions.append({"agent_id": agent["id"], "action": "talk",
                                    "target": target["id"]})
                else:
                    actions.append({"agent_id": agent["id"], "action": "visit",
                                    "target": target["id"]})
            else:
                actions.append({"agent_id": agent["id"], "action": "sit", "target": None})
        return actions

    # ---------- 动作结算（LLM 只能挑动作，坐标由 runtime 算） ----------

    def _apply_action(self, tick_no: int, agents: dict, action: dict) -> None:
        agent = agents.get(action["agent_id"])
        if agent is None or agent.get("state") == "in-meeting":
            return
        kind = action["action"]
        if kind == "move":
            self._random_walk(agent)
        elif kind == "visit":
            target = agents.get(action["target"])
            if target is not None:
                self._step_toward(agent, target)
        elif kind == "sit":
            self._emit({"type": "agent-state", "agent_id": agent["id"], "state": "seated"})
        elif kind == "talk":
            target = agents.get(action["target"])
            if target is not None and target.get("state") != "in-meeting":
                self._talk(tick_no, agent, target)

    def _random_walk(self, agent: dict) -> None:
        position = agent["position"]
        x = position["x"] + self.rng.uniform(-WALK_STEP, WALK_STEP)
        z = position["z"] + self.rng.uniform(-WALK_STEP, WALK_STEP)
        x = max(-WORLD_BOUND, min(WORLD_BOUND, x))
        z = max(-WORLD_BOUND, min(WORLD_BOUND, z))
        self._emit({
            "type": "agent-move", "agent_id": agent["id"],
            "position": {"x": x, "z": z, "yaw": self.rng.uniform(-math.pi, math.pi)},
            "state": "walking",
        })

    def _step_toward(self, agent: dict, target: dict) -> None:
        position, goal = agent["position"], target["position"]
        dx, dz = goal["x"] - position["x"], goal["z"] - position["z"]
        distance = math.hypot(dx, dz) or 1.0
        step = min(VISIT_STEP, distance)
        x = position["x"] + dx / distance * step
        z = position["z"] + dz / distance * step
        self._emit({
            "type": "agent-move", "agent_id": agent["id"],
            "position": {"x": x, "z": z, "yaw": math.atan2(dx, dz)},
            "state": "walking",
        })

    # ---------- 对话生成（授权上下文 ≥ L2，绝不携带 self-only） ----------

    def _talk(self, tick_no: int, agent: dict, target: dict) -> None:
        last = max(self._last_talk_tick.get(agent["id"], -99),
                   self._last_talk_tick.get(target["id"], -99))
        if tick_no - last < TALK_COOLDOWN_TICKS:
            return
        view_a = self._authorized_view(agent["id"])
        view_b = self._authorized_view(target["id"])
        lines = self._generate_dialogue(agent, target, view_a, view_b)
        if not lines:
            return
        self._last_talk_tick[agent["id"]] = tick_no
        self._last_talk_tick[target["id"]] = tick_no
        for speaker_id, listener_id, text in lines:
            self._emit({"type": "agent-talk", "agent_id": speaker_id,
                        "to_agent_id": listener_id, "text": text})
        self._emit({"type": "agent-state", "agent_id": agent["id"], "state": "talking"})
        self._emit({"type": "agent-state", "agent_id": target["id"], "state": "talking"})

    def _authorized_view(self, person_id: str) -> dict | None:
        if self._memory is None:
            return None
        return self._memory.authorized_agent_view(person_id)

    def _generate_dialogue(self, agent: dict, target: dict,
                           view_a: dict | None, view_b: dict | None) -> list:
        """生成 1-3 句简短中文对话，返回 [(speaker_id, listener_id, text)]。

        LLM 路径：prompt 只含授权视图（name/tags/places/memory_lines）；
        兜底路径：模板拼装，同样只用授权视图里的字段。
        """
        if self._chat is not None and self._chat.config.get("configured"):
            lines = self._dialogue_with_llm(agent, target, view_a, view_b)
            if lines:
                return lines
        return self._dialogue_with_rules(agent, target, view_a, view_b)

    def _dialogue_with_llm(self, agent, target, view_a, view_b) -> list:
        context = {
            "A": view_a or {"name": agent["id"], "tags": []},
            "B": view_b or {"name": target["id"], "tags": []},
        }
        messages = [
            {"role": "system", "content": (
                "你在为咖啡厅里的两个 Agent 写偶遇对话。规则：1-3 句简短中文，自然、克制；"
                "只能使用给定授权上下文里的信息，禁止编造对方的未授权信息；"
                "不知道就聊咖啡/天气/咖啡厅。只输出 JSON："
                "{\"lines\": [{\"speaker\": \"A|B\", \"text\": \"...\"}]}。"
            )},
            {"role": "user", "content": "授权上下文（≥ agent-usable）："
             + json.dumps(context, ensure_ascii=False)},
        ]
        response = self._chat.chat(messages, response_format={"type": "json_object"})
        if response.mock:
            return []
        data = extract_json(response.text)
        if not data or not isinstance(data.get("lines"), list):
            logger.warning("对话生成解析失败，回退模板：%.80s", response.text)
            return []
        ids = {"A": (agent["id"], target["id"]), "B": (target["id"], agent["id"])}
        lines = []
        for item in data["lines"][:3]:
            if not isinstance(item, dict):
                continue
            speaker = ids.get(item.get("speaker"))
            text = str(item.get("text") or "").strip()
            if speaker and text:
                lines.append((speaker[0], speaker[1], text[:120]))
        return lines

    def _dialogue_with_rules(self, agent, target, view_a, view_b) -> list:
        tags_a = (view_a or {}).get("tags") or []
        tags_b = (view_b or {}).get("tags") or []
        name_a = (view_a or {}).get("name") or agent["id"]
        name_b = (view_b or {}).get("name") or target["id"]
        if tags_a and tags_b:
            return [
                (agent["id"], target["id"], f"{name_b}，最近还在忙{tags_b[0]}的事吗？"),
                (target["id"], agent["id"], f"是啊。你呢，{tags_a[0]}那边有什么新动静？"),
            ]
        return [
            (agent["id"], target["id"], "今天咖啡厅人不少。"),
            (target["id"], agent["id"], f"是啊，{name_a}，坐会儿吗？"),
        ]

    # ---------- 工具 ----------

    def _nearest_idle(self, agent: dict, idle_agents: list) -> dict | None:
        others = [a for a in idle_agents if a["id"] != agent["id"]]
        if not others:
            return None
        return min(others, key=lambda a: self._distance(agent, a))

    @staticmethod
    def _distance(a: dict, b: dict) -> float:
        return math.hypot(a["position"]["x"] - b["position"]["x"],
                          a["position"]["z"] - b["position"]["z"])

    def _emit(self, event: dict) -> bool:
        """事件过白名单后才上总线；越权事件丢弃并记日志。"""
        try:
            self._guard.check_event(event["type"])
        except Exception:
            logger.warning("事件被白名单拦截并丢弃：%r", event)
            return False
        self.bus.publish(event)
        return True
