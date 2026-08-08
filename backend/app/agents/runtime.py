"""Agent Runtime：skill 驱动的轻量运行时（计划 §3.2，ADR-1 不破）。

目的：让咖啡厅"活"起来 —— 每 tick 读 skill + 世界快照，调 chat provider
      （deepseek）以受约束 JSON 决策各 Agent 动作（move/visit/sit/talk），
      解析失败或未配置时回退规则驱动；所有动作只经 EventBus 发事件，
      且先过 harness 事件白名单（guard.check_event）。
输入：World Service 快照；skills/cafe_daily.md、meeting.md；memory 层过滤为
      L2 及以上的 authorized_agent_view。
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

from app.agents.dialogue import (
    build_meeting_context,
    build_pair_context,
    llm_dialogue,
    llm_meeting_turn,
    template_dialogue,
    template_meeting_turn,
)
from app.agents.skills import load_skill
from app.agents.utils.jsonish import extract_json
from app.harness.permissions.guard import DEFAULT_GUARD

logger = logging.getLogger(__name__)

DECISION_ACTIONS = ("move", "visit", "sit", "talk")
# LLM 输出动作名的同义词归一表（小写后查表；未命中视为未知动作丢弃）
DECISION_ACTION_ALIASES = {
    "move": "move", "walk": "move", "wander": "move", "stroll": "move",
    "visit": "visit",
    "sit": "sit", "seat": "sit", "sitdown": "sit", "sit-down": "sit",
    "talk": "talk", "chat": "talk", "converse": "talk",
}
TALK_DISTANCE = 2.5        # 触发交谈的最大距离
TALK_COOLDOWN_TICKS = 3    # 同一 Agent 两次交谈的最小间隔（避免演出感过重）
VISIT_STEP = 0.8           # visit 单步接近距离
WALK_STEP = 0.6            # 随机走动步长
WORLD_BOUND = 6.0          # 咖啡厅边界（与前端 CafeLayout 同一量级）

MEETING_INTERVAL_TICKS = 20   # 两场圆桌会议的最小间隔
MEETING_DURATION_TICKS = 6    # 一场会议持续的 tick 数
MEETING_START_PROBABILITY = 0.5  # 间隔满足后每 tick 发起会议的概率

USER_MEETING_DURATION_TICKS = 8   # 用户发起会议的持续 tick 数（心跳 15s ≈ 2 分钟）
MEETING_TRANSCRIPT_KEEP = 8       # 注入 prompt 的会议发言记录条数上限


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
        # runtime 侧会议记账：{id, participants, ticks_left}；
        # 用户发起会议额外带 {initiator: "user", topic, transcript, player_message}
        self._meeting: dict | None = None

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

    @property
    def meeting_in_progress(self) -> bool:
        """runtime 记账中是否有进行中的会议（自动或用户发起）。"""
        return self._meeting is not None

    def start_user_meeting(self, participant_ids: list, *, topic: str | None = None,
                           tick: int = 0) -> dict | None:
        """用户发起的圆桌会议（IF-6）：发 meeting-start（带 topic），随后每个世界
        tick 由 dialogue 机制产出围绕主题/发起人发言的真实对话；进行期间自动
        调度器被抑制（_tick_meeting 早退）。已有会议进行中返回 None（调用方 409）。

        注意：发事件不代表世界一定入座成功（圆桌可能坐满）；调用方需在世界侧
        确认 current_meeting 已建立，否则用 cancel_meeting 回滚本记账。
        """
        if self._meeting is not None:
            return None
        participants = [str(pid) for pid in participant_ids]
        topic = (topic or "").strip() or None
        meeting_id = f"user_meeting_{tick}"
        event = {"type": "meeting-start", "meeting_id": meeting_id,
                 "participants": participants}
        if topic:
            event["topic"] = topic
        self._emit(event)
        self._meeting = {
            "id": meeting_id, "participants": participants,
            "ticks_left": USER_MEETING_DURATION_TICKS,
            "initiator": "user", "topic": topic,
            "transcript": [],       # [(显示名, 文本)]，含发起人发言
            "player_message": None, # 发起人的最新发言：下一轮 Agent 发言必须回应
        }
        return {
            "meeting_id": meeting_id,
            "participants": participants,
            "topic": topic,
            "duration_ticks": USER_MEETING_DURATION_TICKS,
        }

    def cancel_meeting(self, meeting_id: str) -> bool:
        """回滚 runtime 侧会议记账（世界侧入座失败时由调用方触发，不发事件）。"""
        if self._meeting is None or self._meeting["id"] != meeting_id:
            return False
        self._meeting = None
        return True

    def end_current_meeting(self, *, tick: int = 0) -> dict | None:
        """玩家（发起人）提前结束当前会议：立即发 meeting-end 并清账，不等倒数
        （世界侧经事件总线同步散场，meeting-ended 进事件流）。无会议进行中返回
        None（调用方 409）。"""
        if self._meeting is None:
            return None
        meeting_id = self._meeting["id"]
        self._emit({"type": "meeting-end", "meeting_id": meeting_id})
        self._last_meeting_end = tick
        self._meeting = None
        return {"meeting_id": meeting_id, "ended": True}

    def post_player_message(self, text: str) -> dict | None:
        """玩家（会议发起人）向进行中的用户会议发言：存为当前讨论点，
        下一轮 Agent 发言的 prompt 必须带上并直接回应；无用户会议进行中返回 None。

        发言只活在会议记账里（ephemeral world eventing），不写入任何 Package。
        """
        if self._meeting is None or self._meeting.get("initiator") != "user":
            return None
        message = str(text).strip()[:200]
        if not message:
            return None
        self._meeting["player_message"] = message
        return {"meeting_id": self._meeting["id"], "accepted": True}

    def _tick_meeting(self, tick_no: int, agents: dict) -> bool:
        if self._meeting is not None:
            # 进行中：与会者轮流发言，倒数结束
            participants = [p for p in self._meeting["participants"] if p in agents]
            if self._meeting.get("initiator") == "user":
                self._tick_user_meeting(agents, participants)
            elif len(participants) >= 2:
                pair = self.rng.sample(participants, 2)
                self._talk(tick_no, agents[pair[0]], agents[pair[1]],
                           meeting_id=self._meeting["id"])
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

    # ---------- 用户发起的圆桌会议（IF-6：真实对话，围绕主题与发言人） ----------

    def generate_user_meeting_turn(
        self,
        participant_ids: list,
        *,
        topic: str | None = None,
        transcript: list | None = None,
        player_message: str | None = None,
        round_index: int = 0,
    ) -> dict:
        """通过原有会议链路生成一轮发言，供 legacy 与 Room v1 共用。

        这里是会议模型调用的唯一编排入口：授权记忆组装、chat provider、
        JSON 解析以及原有模板兜底都继续复用 dialogue 模块。调用方只负责
        把返回的发言写入各自的事件模型，不得另建一套 prompt/provider 链路。
        """
        participants = [str(person_id) for person_id in participant_ids]
        if len(participants) < 2:
            return {
                "lines": [],
                "generated_by": "none",
                "model": "meeting-runtime.v1",
            }
        context = build_meeting_context(
            self._memory,
            participants,
            topic=topic,
            transcript=transcript,
            player_message=player_message,
        )
        if self._chat is not None and self._chat.config.get("configured"):
            result = llm_meeting_turn(self._chat, context)
            if result is not None and result.get("lines"):
                return {
                    "lines": result["lines"],
                    "generated_by": "llm",
                    "model": self._chat.model,
                }
        return {
            "lines": template_meeting_turn(context, round_index),
            "generated_by": "template",
            "model": "meeting-template.v1",
        }

    def _tick_user_meeting(self, agents: dict, participants: list) -> None:
        """用户会议的一轮：与会者围绕 topic + 发起人发言产出真实对话（dialogue
        机制），agent-talk 事件带 meeting_id 供前端归到会议线程；玩家发言在
        本轮 prompt 消费后转入 transcript（后续轮次仍可见）。"""
        if len(participants) < 2:
            return
        meeting = self._meeting
        round_index = USER_MEETING_DURATION_TICKS - meeting["ticks_left"]
        result = self.generate_user_meeting_turn(
            participants,
            topic=meeting.get("topic"),
            transcript=meeting["transcript"],
            player_message=meeting.get("player_message"),
            round_index=round_index,
        )
        # 发起人发言已进入本轮 prompt：无论 LLM 成败都消费掉，转入发言记录
        if meeting.get("player_message"):
            meeting["transcript"].append(("发起人（玩家）", meeting["player_message"]))
            meeting["player_message"] = None
        meeting["transcript"] = meeting["transcript"][-MEETING_TRANSCRIPT_KEEP:]
        for speaker_id, text in result["lines"]:
            if speaker_id not in participants:
                continue  # 越权 speaker 一律丢弃
            speaker = agents[speaker_id]
            listener = agents[participants[(participants.index(speaker_id) + 1)
                                           % len(participants)]]
            self._emit({"type": "agent-talk", "agent_id": speaker_id,
                        "to_agent_id": listener["id"], "text": text,
                        "meeting_id": meeting["id"]})
            meeting["transcript"].append((speaker.get("name") or speaker_id, text))

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
            agent_id, target = item.get("agent_id"), item.get("target")
            # 同义词归一：模型常输出 walk/chat/seat 等自然语言近义词（deepseek-v4-flash
            # 实测），不归一就白白丢弃有效决策
            action = DECISION_ACTION_ALIASES.get(str(item.get("action") or "").strip().lower())
            if agent_id not in idle_ids or action is None:
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

    # ---------- 对话生成（共同上下文驱动 + 信息量闸门，INTERACTION-DESIGN §3） ----------

    def _talk(self, tick_no: int, agent: dict, target: dict,
              meeting_id: str | None = None) -> None:
        last = max(self._last_talk_tick.get(agent["id"], -99),
                   self._last_talk_tick.get(target["id"], -99))
        if tick_no - last < TALK_COOLDOWN_TICKS:
            return
        pair = build_pair_context(self._memory, agent["id"], target["id"])
        lines = self._generate_dialogue(agent, target, pair)
        if not lines:
            return  # 信息量闸门拦下：世界保持安静，不发任何事件
        if self._memory is not None:
            self._memory.record_interaction(agent["id"], target["id"])
        self._last_talk_tick[agent["id"]] = tick_no
        self._last_talk_tick[target["id"]] = tick_no
        for speaker_id, listener_id, text in lines:
            event = {"type": "agent-talk", "agent_id": speaker_id,
                     "to_agent_id": listener_id, "text": text}
            if meeting_id:
                event["meeting_id"] = meeting_id  # 前端据此把台词归到会议线程
            self._emit(event)
        self._emit({"type": "agent-state", "agent_id": agent["id"], "state": "talking"})
        self._emit({"type": "agent-state", "agent_id": target["id"], "state": "talking"})

    def _generate_dialogue(self, agent: dict, target: dict, pair: dict) -> list:
        """LLM 生成（含 informative 自评）；被拦返回 []；兜底模板视为 informative=true。"""
        raw_lines = None
        if self._chat is not None and self._chat.config.get("configured"):
            result = llm_dialogue(self._chat, pair, max_lines=3)
            if result is not None:
                if not result["informative"]:
                    logger.info("咖啡厅对话被信息量闸门拦下：%s ↔ %s",
                                agent["id"], target["id"])
                    return []
                raw_lines = result["lines"]
        if not raw_lines:
            raw_lines = template_dialogue(pair, agent["id"], target["id"])
        ids = {"A": (agent["id"], target["id"]), "B": (target["id"], agent["id"])}
        mapped = []
        for item in raw_lines:
            if len(item) == 3:  # 模板兜底已带 id 三元组
                mapped.append(item)
                continue
            speaker, text = item
            if speaker in ids:
                mapped.append((ids[speaker][0], ids[speaker][1], text))
        return mapped

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
