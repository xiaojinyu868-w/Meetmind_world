"""世界播报：把权威快照事件转成可展示文本，并生成每日晨报。"""

import hashlib
import json
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from app.packages.store import PackageStore

SHANGHAI = ZoneInfo("Asia/Shanghai")
MAX_TICKER_ITEMS = 8
MAX_REPORT_ITEMS = 4


def _parse_datetime(value) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    token = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(token)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=SHANGHAI)
    return parsed.astimezone(UTC)


class BroadcastService:
    """追加式事件日志 + 快照播报视图。前端只消费这里生成的 text。"""

    def __init__(self, store: PackageStore, journal_path: Path | None = None, clock=None):
        self.store = store
        self.journal_path = Path(journal_path or (store.root / "world-events.v1.jsonl"))
        self.journal_path.parent.mkdir(parents=True, exist_ok=True)
        self._clock = clock or (lambda: datetime.now(UTC))
        self._lock = threading.Lock()
        self._entries = self._read_entries()
        self._seen_event_ids = {entry["id"] for entry in self._entries}
        self._known_encounters = self._encounter_keys()

    def enrich(self, snapshot: dict, world_id: str) -> dict:
        now = self._clock().astimezone(UTC)
        with self._lock:
            self._observe_encounters(now)
            for event in snapshot.get("events", []):
                entry = self._entry_for_event(event, world_id, now)
                if entry is not None:
                    self._append_once(entry)
            relevant = [entry for entry in self._entries if entry["world"] in (world_id, "all")]

        enriched = dict(snapshot)
        enriched["broadcast"] = {
            "schema": "echo-broadcast.v1",
            "ticker": [dict(entry) for entry in relevant[-MAX_TICKER_ITEMS:]],
            "morning": self._morning_report(now, world_id),
        }
        return enriched

    def _entry_for_event(self, event: dict, world_id: str, now: datetime) -> dict | None:
        event_type = event.get("type")
        names = self._name_map()
        text = None
        if event_type == "agent-talk":
            speaker_id = event.get("agent_id")
            listener_id = event.get("to_agent_id") or event.get("target_id")
            speaker = names.get(speaker_id, speaker_id or "一位朋友")
            listener = names.get(listener_id, listener_id or "另一位朋友")
            topic = str(event.get("text") or "").strip()[:36]
            text = f"{speaker} 和 {listener} 聊起了「{topic}」" if topic else f"{speaker} 和 {listener} 聊了起来"
        elif event_type in ("meeting-start", "meeting-started"):
            participants = [names.get(pid, pid) for pid in event.get("participants", [])]
            people = "、".join(participants[:4]) or "几位朋友"
            topic = str(event.get("topic") or "").strip()[:36]
            text = f"{people} 围坐到圆桌，话题是「{topic}」" if topic else f"{people} 开始了一场圆桌"
        elif event_type in ("meeting-end", "meeting-ended"):
            text = "圆桌告一段落，大家带着新的想法散场"
        if text is None:
            return None
        identity = json.dumps({"world": world_id, "event": event}, sort_keys=True,
                              ensure_ascii=False, separators=(",", ":"))
        return {
            "id": "evt_" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:16],
            "world": world_id,
            "type": event_type,
            "text": text,
            "tick": snapshot_tick(event),
            "occurred_at": now.isoformat(),
        }

    def _observe_encounters(self, now: datetime) -> None:
        names = self._name_map()
        for package in self._packages():
            person_id = package.get("person_id")
            for encounter in package.get("encounters", []):
                key = f"{person_id}:{encounter.get('encounter_id')}"
                if key in self._known_encounters:
                    continue
                self._known_encounters.add(key)
                identity = f"encounter:{key}"
                self._append_once({
                    "id": "enc_" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:16],
                    "world": "all",
                    "type": "encounter-confirmed",
                    "text": f"新相遇已进入世界：{names.get(person_id, person_id or '新朋友')}",
                    "tick": 0,
                    "occurred_at": now.isoformat(),
                })

    def _morning_report(self, now: datetime, world_id: str) -> dict:
        local_now = now.astimezone(SHANGHAI)
        today_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        previous = []
        for entry in self._entries:
            occurred_at = _parse_datetime(entry.get("occurred_at"))
            if occurred_at is None:
                continue
            local_time = occurred_at.astimezone(SHANGHAI)
            if yesterday_start <= local_time < today_start and entry["world"] in (world_id, "all"):
                previous.append(entry)
        encounters = [entry for entry in previous if entry["type"] == "encounter-confirmed"]
        world_events = [entry for entry in previous if entry["type"] != "encounter-confirmed"]
        if previous:
            summary = f"昨日新增 {len(encounters)} 次相遇，世界发生 {len(world_events)} 件值得留意的事。"
            items = [entry["text"] for entry in previous[-MAX_REPORT_ITEMS:]]
        else:
            summary = "昨日没有新增相遇，世界保持安静。"
            items = ["没有遗漏需要补看的世界事件。"]
        return {
            "date": local_now.date().isoformat(),
            "period": yesterday_start.date().isoformat(),
            "title": "早上好，来看看昨日世界",
            "summary": summary,
            "items": items,
            "new_encounters": len(encounters),
            "world_events": len(world_events),
        }

    def _packages(self) -> list[dict]:
        packages = []
        for summary in self.store.list_packages():
            try:
                packages.append(self.store.load_package(summary["person_id"]))
            except Exception:
                continue
        return packages

    def _name_map(self) -> dict[str, str]:
        return {
            summary["person_id"]: summary.get("name") or summary["person_id"]
            for summary in self.store.list_packages()
        }

    def _encounter_keys(self) -> set[str]:
        return {
            f"{package.get('person_id')}:{encounter.get('encounter_id')}"
            for package in self._packages()
            for encounter in package.get("encounters", [])
        }

    def _append_once(self, entry: dict) -> None:
        if entry["id"] in self._seen_event_ids:
            return
        with self.journal_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n")
        self._entries.append(entry)
        self._seen_event_ids.add(entry["id"])

    def _read_entries(self) -> list[dict]:
        if not self.journal_path.exists():
            return []
        entries = []
        for line in self.journal_path.read_text(encoding="utf-8").splitlines():
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(entry, dict) and all(key in entry for key in ("id", "world", "type", "text", "occurred_at")):
                entries.append(entry)
        return entries


def snapshot_tick(event: dict) -> int:
    """旧事件没有 tick 时保持契约数值字段。"""
    value = event.get("tick", 0)
    return value if isinstance(value, int) and not isinstance(value, bool) else 0
