"""大厅调度器：有目的的稀疏活动（MVP1.5 产品决策——访问必须由推断层共同点驱动）。

目的：让展位大厅"活而不闹"——每 tick 低概率（默认 1/8）触发一场"串门"，
      否则安静。串门配对必须有理由：双方 ≥L2 推断 tags 有交集，或 relations.md
      有关联；找不到交集对则本 tick 不触发（无共同点不演化，P-1）。
输入：大厅 World Service 快照（agents at-booth + booth modules）；memory 层的
      授权上下文视图（authorized_agent_view，≥L2，绝不携带 self-only）。
输出：agent-move / agent-state / agent-talk 事件（全部先过 guard 事件白名单）。
验收：tests/test_hall_runtime.py —— 配对只在有共同点时发生；串门事件序列完整
      （move→talk→return）；无交集长时间安静；对话 prompt 无 self-only。

串门状态机：going（访问者走向对方展位前方）→ talking（一问一答，每 tick 一句，
间隔 1 tick）→ returning（回到自己展位锚点，state=at-booth）→ 冷却 2 tick。
对话围绕共同标签生成：deepseek 产出 1-2 句中文（prompt 只含授权视图），
失败降级模板且只用授权字段。
"""

import logging
import math
import random

from app.agents.dialogue import (
    build_pair_context,
    llm_dialogue,
    tag_set as _tag_set,
    template_dialogue,
)
from app.harness.permissions.guard import DEFAULT_GUARD

logger = logging.getLogger(__name__)

VISIT_PROBABILITY = 1 / 8      # 每 tick 触发串门的概率（10s 轮询 ≈ 每分钟上限一场）
VISIT_COOLDOWN_TICKS = 2       # 一场结束后的冷却
MEET_POINT_OFFSET = 0.9        # 展位前方站位点距离（米）
TALK_LINE_GAP_TICKS = 1        # 两句对话之间的 tick 间隔


class HallRuntime:
    """展位大厅的稀疏串门调度器。"""

    def __init__(self, bus, rng: random.Random | None = None, chat_provider=None,
                 memory=None, guard=None, visit_probability: float = VISIT_PROBABILITY):
        self.bus = bus
        self.rng = rng or random.Random(7)
        self._chat = chat_provider
        self._memory = memory
        self._guard = guard or DEFAULT_GUARD
        self.visit_probability = visit_probability
        self._visit: dict | None = None   # 进行中的串门（状态机）
        self._cooldown = 0

    # ---------- 主循环 ----------

    def tick(self, world_snapshot: dict) -> None:
        agents = {a["id"]: a for a in world_snapshot.get("agents", [])}
        booths = {m["person_id"]: m for m in world_snapshot.get("modules", [])
                  if m.get("type") == "booth" and m.get("person_id") in agents}
        if self._visit is not None:
            self._advance_visit()
            return
        if self._cooldown > 0:
            self._cooldown -= 1
            return
        if self.rng.random() >= self.visit_probability:
            return  # 稀疏：大多数 tick 安静
        pair = self._find_pair(sorted(booths.keys()))
        if pair is None:
            return  # 无共同点：本 tick 不触发（有原则的安静）
        visitor_id, host_id, common_tags = pair
        self._start_visit(booths, visitor_id, host_id, common_tags)

    # ---------- 配对（有理由才成行；旧识深聊优先于破冰复读，§4） ----------

    # 配对打分公式（可解释）：
    #   硬门槛：双方有共同 tags（破冰）或 relations.md 关联（旧识），否则不候选；
    #   层优先：旧识永远优先于破冰（大厅是关系网络，熟人深聊是核心体验）；
    #   旧识层内：score = 10 - (3 若近 RECENT_HOURS 小时内互动过) - min(count, 5)
    #     —— count 越低、越久未互动得分越高（深聊优先于复读）；
    #   破冰层内：score = 共同 tag 数。
    RECENT_HOURS = 6

    def _find_pair(self, person_ids: list) -> tuple | None:
        """返回 (visitor_id, host_id, common_tags)；无合格对返回 None。"""
        views = {}
        for pid in person_ids:
            view = self._authorized_view(pid)
            if view is not None:
                views[pid] = view
        ids = [pid for pid in person_ids if pid in views]
        self.rng.shuffle(ids)  # 同分时的随机次序
        best = None  # ((tier_rank, score), a, b, common)
        for i, first in enumerate(ids):
            for second in ids[i + 1:]:
                common = sorted(_tag_set(views[first]) & _tag_set(views[second]))
                related = self._related(views[first], views[second])
                if not common and not related:
                    continue
                rank = self._pair_score(first, second, common, related)
                if best is None or rank > best[0]:
                    best = (rank, first, second, common)
        if best is None:
            return None
        return (best[1], best[2], best[3])

    def _pair_score(self, id_a: str, id_b: str, common_tags: list,
                    related: bool) -> tuple:
        """返回排序键 (tier_rank, score)：tier_rank 1=旧识、0=破冰，越大越优先。"""
        if not related:
            return (0, len(common_tags))
        count, recent = 0, False
        if self._memory is not None:
            entry = self._memory.last_interaction(id_a, id_b)
            if entry:
                count = entry.get("count", 0)
                recent = self._is_recent(entry.get("last_interaction_at"))
        return (1, 10 - (3 if recent else 0) - min(count, 5))

    def _is_recent(self, iso_timestamp: str | None) -> bool:
        """最近一次互动是否在 RECENT_HOURS 小时内（解析失败按不近期）。"""
        if not iso_timestamp:
            return False
        try:
            from datetime import datetime

            interacted_at = datetime.strptime(iso_timestamp, "%Y-%m-%dT%H:%M:%S%z")
            now = datetime.now(interacted_at.tzinfo)
            return (now - interacted_at).total_seconds() < self.RECENT_HOURS * 3600
        except (ValueError, TypeError):
            return False

    def _related(self, view_a: dict, view_b: dict) -> bool:
        """relations.md 关联：对方姓名出现在任一方的关系网络里。"""
        if self._memory is None:
            return False
        try:
            rel_a = self._memory.read_relations_md(view_a["person_id"])
            rel_b = self._memory.read_relations_md(view_b["person_id"])
        except Exception:
            return False
        name_a, name_b = view_a.get("name") or "", view_b.get("name") or ""
        return bool((name_b and name_b in rel_a) or (name_a and name_a in rel_b))

    # ---------- 串门状态机 ----------

    def _start_visit(self, booths: dict, visitor_id: str, host_id: str,
                     common_tags: list) -> None:
        host_booth = booths[host_id]["position"]
        # 对方展位前方站位点（面向展位，即朝向与展位 yaw 相反）
        meet = {
            "x": host_booth["x"] + math.sin(host_booth["yaw"]) * MEET_POINT_OFFSET,
            "z": host_booth["z"] + math.cos(host_booth["yaw"]) * MEET_POINT_OFFSET,
            "yaw": host_booth["yaw"] + math.pi,
        }
        lines = self._dialogue(visitor_id, host_id, common_tags)
        if not lines:
            # 信息量闸门拦下：本次串门取消，世界保持安静（不进任何事件）
            self._cooldown = VISIT_COOLDOWN_TICKS
            return
        if self._memory is not None:
            self._memory.record_interaction(visitor_id, host_id)
        self._visit = {
            "visitor": visitor_id, "host": host_id, "common_tags": common_tags,
            "meet": meet, "anchor": dict(booths[visitor_id]["position"]),
            "phase": "going", "lines": lines, "gap": 0,
        }
        # a. 访问者离开展位，走向对方展位前方
        self._emit({"type": "agent-move", "agent_id": visitor_id,
                    "position": meet, "state": "walking"})

    def _advance_visit(self) -> None:
        visit = self._visit
        if visit["phase"] == "going":
            # b. 到达：双方进入交谈，发出第一句话
            visit["phase"] = "talking"
            self._emit({"type": "agent-state", "agent_id": visit["visitor"],
                        "state": "talking"})
            self._emit({"type": "agent-state", "agent_id": visit["host"],
                        "state": "talking"})
            self._emit_next_line()
        elif visit["phase"] == "talking":
            if visit["lines"] and visit["gap"] >= TALK_LINE_GAP_TICKS:
                self._emit_next_line()  # c. 隔 1 tick 的第二句（一问一答）
            elif visit["lines"]:
                visit["gap"] += 1
            else:
                visit["phase"] = "returning"
        elif visit["phase"] == "returning":
            # d. 访问者返回自己展位锚点，双方恢复 at-booth
            self._emit({"type": "agent-move", "agent_id": visit["visitor"],
                        "position": visit["anchor"], "state": "at-booth"})
            self._emit({"type": "agent-state", "agent_id": visit["host"],
                        "state": "at-booth"})
            self._visit = None
            self._cooldown = VISIT_COOLDOWN_TICKS

    def _emit_next_line(self) -> None:
        visit = self._visit
        speaker, listener, text = visit["lines"].pop(0)
        visit["gap"] = 0
        self._emit({"type": "agent-talk", "agent_id": speaker,
                    "to_agent_id": listener, "text": text})

    # ---------- 对话生成（共同上下文驱动 + 信息量闸门，INTERACTION-DESIGN §3） ----------

    def _dialogue(self, visitor_id: str, host_id: str, common_tags: list) -> list:
        """生成串门对话，返回 [(speaker_id, listener_id, text)]；被信息量闸门
        拦下（informative=false）时返回 []（调用方取消本次串门，保持安静）。"""
        pair = build_pair_context(self._memory, visitor_id, host_id)
        raw_lines = None
        if self._chat is not None and self._chat.config.get("configured"):
            result = llm_dialogue(self._chat, pair, max_lines=2)
            if result is not None:
                if not result["informative"]:
                    logger.info("大厅对话被信息量闸门拦下：%s ↔ %s", visitor_id, host_id)
                    return []
                raw_lines = result["lines"]
        if not raw_lines:
            raw_lines = template_dialogue(pair, visitor_id, host_id)  # 兜底视为 informative=true
        return self._map_lines(raw_lines, visitor_id, host_id)

    @staticmethod
    def _map_lines(raw_lines: list, id_a: str, id_b: str) -> list:
        """把 ("A"|"B", text) 或 (speaker_id, listener_id, text) 统一成三元组。"""
        ids = {"A": (id_a, id_b), "B": (id_b, id_a)}
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

    def _authorized_view(self, person_id: str) -> dict | None:
        if self._memory is None:
            return None
        return self._memory.authorized_agent_view(person_id)

    def _emit(self, event: dict) -> bool:
        """事件过白名单后才上总线；越权事件丢弃并记日志。"""
        try:
            self._guard.check_event(event["type"])
        except Exception:
            logger.warning("大厅事件被白名单拦截并丢弃：%r", event)
            return False
        self.bus.publish(event)
        return True
