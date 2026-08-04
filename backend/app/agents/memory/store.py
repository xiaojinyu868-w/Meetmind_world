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

# Agent 互动可携带的信息圈层。L1/self-only 只供资料所有者查看，绝不进入
# Agent prompt；L2 及以上仍须经 ContextBuilder 再做运行时授权。
AGENT_VISIBLE_PRIVACY = ("agent-usable", "org-shared", "public-approved")

# memory.md 条目格式：- 内容 (source: facts/<pid>/<enc>/..., conf: 0.7)
_MEMORY_SOURCE_RE = re.compile(r"\(source:\s*facts/[^/]+/([^/\s]+)/")

# relations.md 互动字段（§4 关系沉淀，追加在原四段之后，旧行无此字段兼容）：
# 人名 | 关系 | 关键词 | 来源事件 | last:2026-08-03T20:54:54+0800 | count:3
_INTERACTION_LAST_RE = re.compile(r"\blast:([^\s|]+)")
_INTERACTION_COUNT_RE = re.compile(r"\bcount:(\d+)")


class MemoryStore:
    def __init__(self, packages_store, guard: PermissionGuard | None = None):
        self._packages = packages_store
        self._guard = guard or DEFAULT_GUARD
        # 短期工作记忆：进程内、会话级、可丢弃
        self._short_term: dict = {}
        # 互动注册表（frozenset({a,b}) -> {last_interaction_at, count}）：
        # 持久化在 relations.md 行尾字段（last:/count:），启动时恢复；
        # hall/cafe 两个 runtime 共享本实例即共享互动历史。
        self._interactions: dict = {}
        try:
            self._restore_interactions()
        except Exception:  # 恢复是尽力而为，不阻断启动
            self._interactions = {}

    # ---------- 互动记录（对话/串门/会议发生时更新，relations.md 持久化） ----------

    def record_interaction(self, person_a: str, person_b: str, at: str | None = None) -> dict:
        """记录一次互动（发布时间默认当前），并回写双方 relations.md 的关系行。"""
        key = frozenset((person_a, person_b))
        entry = dict(self._interactions.get(key) or {"count": 0})
        entry["count"] += 1
        entry["last_interaction_at"] = at or time.strftime("%Y-%m-%dT%H:%M:%S%z")
        self._interactions[key] = entry
        self._persist_interaction(person_a, person_b, entry)
        return entry

    def last_interaction(self, person_a: str, person_b: str) -> dict | None:
        entry = self._interactions.get(frozenset((person_a, person_b)))
        return dict(entry) if entry else None

    def _restore_interactions(self) -> None:
        """启动时从 relations.md 恢复注册表（容错：无 last:/count: 的旧行跳过；
        双向两行不一致时取 count 大者）。"""
        name_to_id = {}
        for summary in self._packages.list_packages():
            try:
                package = self._packages.load_package(summary["person_id"])
            except Exception:
                continue
            name = package["identity"].get("name")
            if name:
                name_to_id[name] = summary["person_id"]
        for summary in self._packages.list_packages():
            person_id = summary["person_id"]
            relations_md = self._packages.ensure_person_dir(person_id) / "relations.md"
            for line in relations_md.read_text(encoding="utf-8").splitlines():
                parts = [part.strip() for part in line.split("|")]
                if len(parts) < 4:
                    continue
                other_id = name_to_id.get(parts[0])
                if other_id is None:
                    continue
                last = _INTERACTION_LAST_RE.search(line)
                count = _INTERACTION_COUNT_RE.search(line)
                if not last and not count:
                    continue
                entry = {
                    "last_interaction_at": last.group(1) if last else None,
                    "count": int(count.group(1)) if count else 0,
                }
                key = frozenset((person_id, other_id))
                existing = self._interactions.get(key)
                if existing and existing.get("count", 0) >= entry["count"]:
                    continue
                self._interactions[key] = entry

    def _persist_interaction(self, person_a: str, person_b: str, entry: dict) -> None:
        """把 last/count 写回双方 relations.md 中对方的关系行（双向两行）。
        没有既有关系行的配对不强行建行
        （TODO：破冰关系的建行规则待 INTERACTION-DESIGN §4 评审）。"""
        try:
            name_a = self._packages.load_package(person_a)["identity"].get("name")
            name_b = self._packages.load_package(person_b)["identity"].get("name")
        except Exception:
            return
        if not name_a or not name_b:
            return
        self._update_relation_line(person_a, name_b, entry)
        self._update_relation_line(person_b, name_a, entry)

    def _update_relation_line(self, owner_id: str, other_name: str, entry: dict) -> None:
        """把 owner 的 relations.md 中 other_name 那一行更新为新格式：
        保留原四段（人名|关系|关键词|来源），重写 last:/count: 两段。"""
        relations_md = self._packages.ensure_person_dir(owner_id) / "relations.md"
        lines = relations_md.read_text(encoding="utf-8").splitlines(keepends=True)
        for index, line in enumerate(lines):
            parts = [part.strip() for part in line.split("|")]
            if len(parts) < 4 or parts[0] != other_name:
                continue
            base = " | ".join(parts[:4])
            lines[index] = (f"{base} | last:{entry['last_interaction_at']}"
                            f" | count:{entry['count']}\n")
            relations_md.write_text("".join(lines), encoding="utf-8")
            return

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
        """返回已确认人物的 Agent 授权视图，只包含 L2 及以上相遇。"""
        try:
            package = self._packages.load_package(person_id)
        except Exception:
            return None
        if not package["identity"].get("confirmed"):
            return None
        encounter_ids = set()
        tags, places = [], []
        for encounter in package.get("encounters", []):
            if encounter.get("privacy", "self-only") not in AGENT_VISIBLE_PRIVACY:
                continue
            encounter_ids.add(encounter.get("encounter_id"))
            if encounter.get("place"):
                places.append(encounter["place"])
            for inference in encounter.get("inferences", []):
                value = str(inference.get("value") or "").strip()
                if value:
                    tags.append(value)
        memory_lines = []
        for line in self.read_memory_md(person_id).splitlines():
            match = _MEMORY_SOURCE_RE.search(line)
            if match and match.group(1) in encounter_ids:
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
