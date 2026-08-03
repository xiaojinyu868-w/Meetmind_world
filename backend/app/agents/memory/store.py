"""记忆分层存储：场景记忆 / 短期工作记忆 / 长期记忆（只读）/ 推断记忆。

目的：落地 CONTEXT-AND-MEMORY.md §6 的记忆分层与写权限矩阵：
      - 场景记忆（相遇）：只能新增；
      - 短期工作记忆：会话级，可写可丢弃；
      - 长期记忆（人物事实层 = PersonPackage）：**只读**，写入只能走
        packages.confirm 用户确认流程（P-3/P-8，权限矩阵禁止自进化触碰）；
      - 推断记忆 memory.md / relations.md：可写，但每条必须带事实指针。
输入：PackageStore（持久层）、PermissionGuard（自进化写边界）。
输出：各层读写接口；越权写入抛 PermissionDenied。
验收：tests/test_permissions.py —— write_long_term 直接调用抛 PermissionDenied。

本模块的写入方是 Agent/自进化流程，因此每个写接口都先过 guard.check()；
packages/store.py 属于用户确认流程，不经过本模块。
"""

import re
import time
from pathlib import Path

from app.harness.permissions.guard import DEFAULT_GUARD, PermissionGuard

# Agent 互动时只能携带 ≥ L2 的信息（CONTEXT-AND-MEMORY.md §5）
AGENT_VISIBLE_PRIVACY = ("agent-usable", "org-shared", "public-approved")

# memory.md 条目格式：- 内容 (source: facts/<pid>/<enc>/..., conf: 0.7)
_MEMORY_SOURCE_RE = re.compile(r"\(source:\s*facts/[^/]+/([^/\s]+)/")


class MemoryStore:
    def __init__(self, packages_store, guard: PermissionGuard | None = None):
        self._packages = packages_store
        self._guard = guard or DEFAULT_GUARD
        # 短期工作记忆：进程内、会话级、可丢弃
        self._short_term: dict = {}

    # ---------- 场景记忆（某次相遇的完整上下文）：只能新增 ----------

    def append_scene_memory(self, person_id: str, encounter_id: str, note: str) -> Path:
        """向 memory.md 追加一条场景记忆（不允许修改历史条目）。"""
        self._guard.check("encounter_memory.append")
        line = f"- [{encounter_id}] {note} (source: facts/{person_id}/{encounter_id}/, conf: 1.0)\n"
        memory_md = self._packages.ensure_person_dir(person_id) / "memory.md"
        with memory_md.open("a", encoding="utf-8") as fh:
            fh.write(line)
        return memory_md

    # ---------- 短期工作记忆：会话级 ----------

    def write_short_term(self, key: str, value) -> None:
        self._guard.check("short_term_memory")
        self._short_term[key] = {"value": value, "updated_at": time.time()}

    def read_short_term(self, key: str, default=None):
        entry = self._short_term.get(key)
        return entry["value"] if entry else default

    def clear_short_term(self) -> None:
        self._short_term.clear()

    # ---------- 长期记忆（人物事实层）：只读 ----------

    def read_long_term(self, person_id: str) -> dict:
        """读取 PersonPackage（事实层）。这是自进化流程唯一被允许的方向。"""
        return self._packages.load_package(person_id)

    def write_long_term(self, *args, **kwargs):
        """长期记忆禁止自进化写入：只能经 packages.confirm 用户确认流程（FR-1.3）。"""
        self._guard.check("long_term_memory")  # 命中 deny，必然抛 PermissionDenied
        raise PermissionError("unreachable")  # pragma: no cover

    # ---------- Agent 授权上下文视图（对话/决策的唯一信息来源，P-8） ----------

    def authorized_agent_view(self, person_id: str) -> dict | None:
        """返回 Agent 可携带的信息：仅 privacy ≥ agent-usable 的内容。

        - 未确认身份（identity.confirmed=false）返回 None：不进 Agent 上下文（FR-1.3）；
        - tags/places 只来自 ≥ L2 的 encounter 推断与地点；
        - memory.md 条目逐行按事实指针反查 encounter 权限，指不到 ≥ L2 的剔除；
        - self-only 内容绝不出现在返回值里（对话生成的红线）。
        """
        try:
            package = self._packages.load_package(person_id)
        except Exception:
            return None
        if not package["identity"].get("confirmed"):
            return None
        visible_encounters = {}  # encounter_id -> encounter（≥ L2）
        tags, places = [], []
        for encounter in package.get("encounters", []):
            if encounter.get("privacy") not in AGENT_VISIBLE_PRIVACY:
                continue
            visible_encounters[encounter.get("encounter_id")] = encounter
            if encounter.get("place"):
                places.append(encounter["place"])
            for inference in encounter.get("inferences", []):
                value = str(inference.get("value") or "").strip()
                if value:
                    tags.append(value)
        memory_lines = []
        for line in self.read_memory_md(person_id).splitlines():
            match = _MEMORY_SOURCE_RE.search(line)
            if match and match.group(1) in visible_encounters:
                memory_lines.append(line.strip())
        return {
            "person_id": person_id,
            "name": package["identity"].get("name"),
            "tags": tags,
            "places": places,
            "memory_lines": memory_lines,
        }

    # ---------- 推断记忆：memory.md / relations.md（可写，必须带事实指针） ----------

    def append_memory(self, person_id: str, content: str, source: str, confidence: float) -> Path:
        """追加一条推断记忆。source 必须是 facts/ 指针，否则拒绝入库（防线 #4）。"""
        self._guard.check("encounter_memory.append")
        if not isinstance(source, str) or not source.startswith("facts/"):
            raise ValueError(f"推断记忆必须携带 facts/ 事实指针，收到：{source!r}")
        if not 0.0 <= confidence <= 1.0:
            raise ValueError(f"confidence 必须在 [0,1]：{confidence!r}")
        line = f"- {content} (source: {source}, conf: {confidence:.2f})\n"
        memory_md = self._packages.ensure_person_dir(person_id) / "memory.md"
        with memory_md.open("a", encoding="utf-8") as fh:
            fh.write(line)
        return memory_md

    def read_memory_md(self, person_id: str) -> str:
        return (self._packages.ensure_person_dir(person_id) / "memory.md").read_text(
            encoding="utf-8"
        )

    def append_relation(self, person_id: str, name: str, relation: str,
                        keywords: list, source_event: str) -> Path:
        """追加一条关系记录，格式：`人名 | 关系 | 关键词1, 关键词2 | 来源事件`。"""
        self._guard.check("encounter_memory.append")
        line = f"{name} | {relation} | {', '.join(keywords)} | {source_event}\n"
        relations_md = self._packages.ensure_person_dir(person_id) / "relations.md"
        with relations_md.open("a", encoding="utf-8") as fh:
            fh.write(line)
        return relations_md

    def read_relations_md(self, person_id: str) -> str:
        return (self._packages.ensure_person_dir(person_id) / "relations.md").read_text(
            encoding="utf-8"
        )
