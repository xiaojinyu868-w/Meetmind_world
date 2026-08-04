"""持久世界事件与晨报（FR-2.9）。"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import get_data_dir

EVENT_SCHEMA = "echo-world-event.v1"

# 晨报会合并的 agent 自主事件类型（agent-move/agent-state 太密，不进播报）
BRIEF_RUNTIME_TYPES = ("agent-talk", "meeting-started", "meeting-ended")


def runtime_event_entry(event: dict, source: str) -> dict | None:
    """把 WorldService 滚动缓冲里的 agent 自主事件归一成晨报条目（纯函数）。

    只转换 agent-talk / meeting-started / meeting-ended；其余类型返回 None。
    条目形状与 echo-world-event.v1 对齐，event_id 带 source 前缀供跨世界去重。
    """
    event_type = str(event.get("type") or "")
    if event_type not in BRIEF_RUNTIME_TYPES:
        return None
    if event_type == "agent-talk":
        summary = str(event.get("text") or "").strip()
        person_ids = [event.get("agent_id"), event.get("to_agent_id")]
    elif event_type == "meeting-started":
        person_ids = [str(pid) for pid in (event.get("participants") or [])]
        summary = f"{len(person_ids)} 人的会议开始"
    else:
        person_ids = [str(pid) for pid in (event.get("participants") or [])]
        summary = "一场会议结束，大家回到各自的位置"
    if not summary:
        return None
    dedupe_key = event.get("meeting_id") or event.get("agent_id") or ""
    return {
        "schema": EVENT_SCHEMA,
        "event_id": f"runtime-{source}-{event_type}-{event.get('tick', 0)}-{dedupe_key}",
        "type": event_type,
        "summary": summary,
        "person_ids": [str(pid) for pid in person_ids if pid],
        "source": str(source),
        "created_at": str(event.get("created_at") or ""),
        "payload": {},
    }


def merge_brief_events(*groups: list[dict], limit: int = 6) -> list[dict]:
    """合并多来源晨报事件（纯函数）：event_id 去重 → created_at 倒序
    （缺时间戳的排后并保持原相对顺序）→ 截断到 limit。"""
    merged: dict[str, dict] = {}
    anonymous = []
    for group in groups:
        for event in group:
            key = str(event.get("event_id") or "")
            if not key:
                anonymous.append(event)
            elif key not in merged:
                merged[key] = event
    entries = [*merged.values(), *anonymous]

    # sorted 稳定：ISO 时间戳可直接比较，空串最小——缺时间戳的排在最后，
    # 时间戳相同（或都缺失）时保持合并前的先后
    ordered = sorted(
        entries, key=lambda item: str(item.get("created_at") or ""), reverse=True
    )
    return ordered[: max(1, int(limit))]


class WorldEventStore:
    """追加式 JSONL 世界事件存储；损坏单行不会阻断其余历史读取。"""

    def __init__(self, path: Path | None = None):
        self.path = Path(path) if path else get_data_dir() / "world-events.v1.jsonl"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.touch(exist_ok=True)
        self._lock = threading.Lock()

    def append(self, event_type: str, summary: str, *, person_ids=(), source="world",
               payload: dict | None = None) -> dict:
        event = {
            "schema": EVENT_SCHEMA,
            "event_id": uuid.uuid4().hex[:16],
            "type": str(event_type).strip(),
            "summary": str(summary).strip(),
            "person_ids": [str(value) for value in person_ids if str(value).strip()],
            "source": str(source).strip() or "world",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payload": dict(payload or {}),
        }
        if not event["type"] or not event["summary"]:
            raise ValueError("世界事件 type 与 summary 不能为空")
        encoded = json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n"
        with self._lock, self.path.open("a", encoding="utf-8") as handle:
            handle.write(encoded)
            handle.flush()
        return event

    def list_recent(self, limit: int = 20) -> list[dict]:
        limit = max(1, min(int(limit), 100))
        events = []
        with self._lock:
            lines = self.path.read_text(encoding="utf-8").splitlines()
        for line in reversed(lines):
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("schema") == EVENT_SCHEMA:
                events.append(event)
            if len(events) >= limit:
                break
        return events

    def morning_brief(self, extra_events: list[dict] | None = None) -> dict:
        """今日播报：持久化世界事件（用户互动）合并 agent 自主事件
        （runtime 滚动缓冲，经 runtime_event_entry 归一后传入），
        按 created_at 倒序、event_id 去重、封顶 6 条。"""
        events = merge_brief_events(self.list_recent(6), list(extra_events or ()), limit=6)
        if events:
            headline = events[0]["summary"]
            summary = "；".join(event["summary"] for event in events[:3])
        else:
            headline = "集市今天安静开门"
            summary = "还没有新事件。走近一个摊位，或邀请一位朋友到圆桌坐下。"
        return {
            "schema": "echo-world-brief.v1",
            "date": datetime.now(timezone.utc).date().isoformat(),
            "headline": headline,
            "summary": summary,
            "event_count": len(events),
            "events": events,
        }
