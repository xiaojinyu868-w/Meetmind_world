"""持久世界事件与晨报（FR-2.9）。"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import get_data_dir

EVENT_SCHEMA = "echo-world-event.v1"


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

    def morning_brief(self) -> dict:
        events = self.list_recent(6)
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
