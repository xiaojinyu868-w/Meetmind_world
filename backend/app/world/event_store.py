"""持久世界事件与晨报（FR-2.9）。"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import get_data_dir
from app.world.brief import polish_brief

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
        topic = str(event.get("topic") or "").strip()
        summary = (f"{len(person_ids)} 人围桌讨论「{topic}」" if topic
                   else f"{len(person_ids)} 人的会议开始")
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
        # 晨报 LLM 润色缓存：{"key": (event_count, 分钟级时间戳), "result": {...}}
        # 避免前端轮询（秒级）每帧都打一次 LLM
        self._brief_polish_cache: dict | None = None

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

    def morning_brief(self, extra_events: list[dict] | None = None,
                      chat_provider=None) -> dict:
        """今日播报：持久化世界事件（用户互动）优先占位，agent 自主事件
        （runtime 滚动缓冲，经 runtime_event_entry 归一后传入）补充剩余空位；
        event_id 跨源去重、各源内按 created_at 倒序、封顶 6 条。
        用户真实的互动永远比 agent 闲聊更接近头条。

        chat_provider 可用时 headline/summary 经 LLM 润色（只引用真实事件，
        不编造；按 (event_count, 分钟) 缓存避免轮询期重复调用）；
        未配置/失败一律回退模板拼接。generated_by 标记文案来源（llm/template）。
        """
        persisted = merge_brief_events(self.list_recent(6), limit=6)
        runtime = merge_brief_events(list(extra_events or ()), limit=6)
        seen = {event.get("event_id") for event in persisted}
        events = persisted + [event for event in runtime if event.get("event_id") not in seen]
        events = events[:6]
        if events:
            headline = events[0]["summary"]
            summary = "；".join(event["summary"] for event in events[:3])
        else:
            headline = "集市今天安静开门"
            summary = "还没有新事件。走近一个摊位，或邀请一位朋友到圆桌坐下。"
        generated_by = "template"
        if events and chat_provider is not None:
            polished = self._cached_polish(chat_provider, events)
            if polished is not None:
                headline, summary = polished["headline"], polished["summary"]
                generated_by = "llm"
        return {
            "schema": "echo-world-brief.v1",
            "date": datetime.now(timezone.utc).date().isoformat(),
            "headline": headline,
            "summary": summary,
            "event_count": len(events),
            "events": events,
            "generated_by": generated_by,
        }

    def _cached_polish(self, chat_provider, events: list[dict]) -> dict | None:
        """按 (event_count, 分钟) 缓存的晨报润色：同一分钟内事件数不变就直接
        复用上次结果（含失败结果 None——失败这一分钟不再重试，下一分钟再试）。"""
        minute_key = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M")
        cache_key = (len(events), minute_key)
        if self._brief_polish_cache and self._brief_polish_cache["key"] == cache_key:
            return self._brief_polish_cache["result"]
        result = polish_brief(chat_provider, events)
        self._brief_polish_cache = {"key": cache_key, "result": result}
        return result
