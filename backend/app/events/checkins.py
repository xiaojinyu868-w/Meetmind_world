"""活动签到存储：一次碰卡 = 一条有序、可回放的入场事件。

目录（<ECHO_DATA_DIR>/events/<event_id>/）：
  event.json            可选：标题、分区与容量；缺省用 DEFAULT_ZONES
  checkins.v1.jsonl     追加式事件流（echo-event-checkin.v1），seq 严格递增，只增不改
  atlas/<checkin_id>.png  分身 128×128 像素皮肤——由手机本地生成，服务器从不接收原始照片

约束：
  - 幂等：同一 tag_id 再次碰卡不重复建人，返回原记录（可更新姓名/介绍/皮肤，写 update 行）
  - 槽位：服务端按分区容量分配 zone_id + slot；前端用同一套布局把 slot 变成坐标
  - 大屏轮询 GET ?since=<seq> 只拿 updated_seq 更大的记录，前端按 checkin_id upsert
"""

from __future__ import annotations

import base64
import json
import re
import secrets
import struct
import threading
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "echo-event-checkin.v1"
EVENT_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,39}$")
TAG_ID_PATTERN = re.compile(r"^[A-Za-z0-9:_-]{2,64}$")
ATLAS_SIZE = 128
ATLAS_MAX_BYTES = 64 * 1024
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

DEFAULT_TITLE = "MeetMind × 阿里巴巴 · 活动模式"
DEFAULT_ZONES: tuple[dict, ...] = (
    {"zone_id": "ai-apps", "title": "AI 应用", "capacity": 24, "color": "#e0b15a"},
    {"zone_id": "dev", "title": "开发者工坊", "capacity": 24, "color": "#6fb3a0"},
    {"zone_id": "founders", "title": "创业者角", "capacity": 24, "color": "#e06f5f"},
    {"zone_id": "design", "title": "设计与内容", "capacity": 24, "color": "#c98ad6"},
    {"zone_id": "ecosystem", "title": "生态与投资", "capacity": 24, "color": "#7fa7e0"},
    {"zone_id": "campfire", "title": "自由篝火", "capacity": 24, "color": "#f2a05a"},
)


class EventNotFound(KeyError):
    """活动 ID 非法。"""


class EventFull(RuntimeError):
    """所有分区都满了。"""


class AtlasInvalid(ValueError):
    """皮肤 PNG 不符合 128×128 契约。"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def decode_atlas_png(value: str | None) -> bytes | None:
    """接受 base64 或 data URL；校验 PNG 签名、128×128 尺寸与体积上限。"""
    if value is None or value == "":
        return None
    raw = value
    if raw.startswith("data:"):
        _, _, raw = raw.partition(",")
    try:
        data = base64.b64decode(raw, validate=True)
    except Exception as exc:  # noqa: BLE001 - 统一转成契约错误
        raise AtlasInvalid("皮肤不是合法的 base64") from exc
    if len(data) > ATLAS_MAX_BYTES:
        raise AtlasInvalid(f"皮肤超过 {ATLAS_MAX_BYTES // 1024}KB")
    if len(data) < 24 or not data.startswith(PNG_SIGNATURE):
        raise AtlasInvalid("皮肤必须是 PNG")
    width, height = struct.unpack(">II", data[16:24])
    if width != ATLAS_SIZE or height != ATLAS_SIZE:
        raise AtlasInvalid(f"皮肤必须是 {ATLAS_SIZE}×{ATLAS_SIZE}，收到 {width}×{height}")
    return data


class _EventState:
    def __init__(self, event_id: str, config: dict):
        self.event_id = event_id
        self.config = config
        self.checkins: dict[str, dict] = {}
        self.by_tag: dict[str, str] = {}
        self.slots: dict[str, set[int]] = {zone["zone_id"]: set() for zone in config["zones"]}
        self.last_seq = 0

    def zone(self, zone_id: str) -> dict | None:
        for zone in self.config["zones"]:
            if zone["zone_id"] == zone_id:
                return zone
        return None

    def apply(self, record: dict) -> None:
        """回放一行事件到内存索引。"""
        self.last_seq = max(self.last_seq, int(record["seq"]))
        if record.get("kind") == "update":
            current = self.checkins.get(record["checkin_id"])
            if current is None:
                return
            for key in ("display_name", "intro", "atlas", "style"):
                if key in record and record[key] is not None:
                    current[key] = record[key]
            current["updated_seq"] = record["seq"]
            current["updated_at"] = record["created_at"]
            current["visits"] = int(current.get("visits", 1)) + 1
            return
        entry = dict(record)
        entry.setdefault("updated_seq", record["seq"])
        entry.setdefault("updated_at", record["created_at"])
        entry.setdefault("visits", 1)
        entry.pop("kind", None)
        self.checkins[entry["checkin_id"]] = entry
        self.by_tag[entry["tag_id"]] = entry["checkin_id"]
        self.slots.setdefault(entry["zone_id"], set()).add(int(entry["slot"]))


class EventCheckinStore:
    def __init__(self, root: Path):
        self.root = Path(root)
        self._lock = threading.Lock()
        self._events: dict[str, _EventState] = {}

    # ---- 路径与配置 -------------------------------------------------------

    @staticmethod
    def validate_event_id(event_id: str) -> str:
        if not EVENT_ID_PATTERN.match(event_id or ""):
            raise EventNotFound(event_id)
        return event_id

    def _event_dir(self, event_id: str) -> Path:
        return self.root / event_id

    def _load_config(self, event_id: str) -> dict:
        path = self._event_dir(event_id) / "event.json"
        config = {"title": DEFAULT_TITLE, "zones": [dict(zone) for zone in DEFAULT_ZONES]}
        if path.is_file():
            try:
                loaded = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                loaded = {}
            if isinstance(loaded.get("title"), str) and loaded["title"].strip():
                config["title"] = loaded["title"].strip()
            zones = loaded.get("zones")
            if isinstance(zones, list) and zones:
                cleaned = []
                for zone in zones:
                    if not isinstance(zone, dict) or not zone.get("zone_id"):
                        continue
                    cleaned.append({
                        "zone_id": str(zone["zone_id"]),
                        "title": str(zone.get("title") or zone["zone_id"]),
                        "capacity": max(1, int(zone.get("capacity", 24))),
                        "color": str(zone.get("color") or "#e0b15a"),
                    })
                if cleaned:
                    config["zones"] = cleaned
            if isinstance(loaded.get("subtitle"), str):
                config["subtitle"] = loaded["subtitle"]
        return config

    def _state(self, event_id: str) -> _EventState:
        """惰性加载：第一次访问时回放 JSONL。调用方须持锁。"""
        state = self._events.get(event_id)
        if state is not None:
            return state
        state = _EventState(event_id, self._load_config(event_id))
        log_path = self._event_dir(event_id) / "checkins.v1.jsonl"
        if log_path.is_file():
            with log_path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if record.get("schema") == SCHEMA:
                        state.apply(record)
        self._events[event_id] = state
        return state

    def _append(self, event_id: str, record: dict) -> None:
        event_dir = self._event_dir(event_id)
        event_dir.mkdir(parents=True, exist_ok=True)
        with (event_dir / "checkins.v1.jsonl").open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    # ---- 查询 -------------------------------------------------------------

    def summary(self, event_id: str) -> dict:
        self.validate_event_id(event_id)
        with self._lock:
            state = self._state(event_id)
            by_zone = {zone["zone_id"]: 0 for zone in state.config["zones"]}
            for entry in state.checkins.values():
                by_zone[entry["zone_id"]] = by_zone.get(entry["zone_id"], 0) + 1
            zones = [
                {**zone, "count": by_zone.get(zone["zone_id"], 0)}
                for zone in state.config["zones"]
            ]
            return {
                "schema": "echo-event.v1",
                "event_id": event_id,
                "title": state.config["title"],
                "subtitle": state.config.get("subtitle"),
                "zones": zones,
                "total": len(state.checkins),
                "last_seq": state.last_seq,
            }

    def list_checkins(self, event_id: str, since: int = 0, limit: int = 500) -> dict:
        self.validate_event_id(event_id)
        with self._lock:
            state = self._state(event_id)
            items = sorted(
                (dict(entry) for entry in state.checkins.values()
                 if int(entry.get("updated_seq", entry["seq"])) > since),
                key=lambda entry: int(entry.get("updated_seq", entry["seq"])),
            )
            truncated = len(items) > limit
            items = items[:limit]
            return {
                "schema": "echo-event-checkins.v1",
                "event_id": event_id,
                "items": items,
                "last_seq": state.last_seq,
                "truncated": truncated,
            }

    def get_checkin(self, event_id: str, checkin_id: str) -> dict | None:
        self.validate_event_id(event_id)
        with self._lock:
            state = self._state(event_id)
            entry = state.checkins.get(checkin_id)
            return dict(entry) if entry else None

    def atlas_path(self, event_id: str, checkin_id: str) -> Path | None:
        entry = self.get_checkin(event_id, checkin_id)
        if not entry or not entry.get("atlas"):
            return None
        path = self._event_dir(event_id) / entry["atlas"]
        return path if path.is_file() else None

    # ---- 写入 -------------------------------------------------------------

    def _assign_zone(self, state: _EventState, preferred: str | None) -> tuple[str, int]:
        """优先用户选的分区；满了就去人最少的分区；全满抛 EventFull。"""
        order = list(state.config["zones"])
        if preferred:
            order.sort(key=lambda zone: 0 if zone["zone_id"] == preferred else 1)
        else:
            order.sort(key=lambda zone: len(state.slots.get(zone["zone_id"], ())))
        for zone in order:
            used = state.slots.setdefault(zone["zone_id"], set())
            if len(used) >= int(zone["capacity"]):
                continue
            slot = next(index for index in range(int(zone["capacity"])) if index not in used)
            return zone["zone_id"], slot
        raise EventFull(state.event_id)

    def check_in(
        self,
        event_id: str,
        *,
        tag_id: str,
        display_name: str,
        intro: str | None = None,
        zone_id: str | None = None,
        atlas_png: str | None = None,
        style: dict | None = None,
        source: str = "nfc",
        owner_id: str | None = None,
    ) -> tuple[dict, bool]:
        """返回 (记录, 是否新建)。同一 tag 再来 = 回访：更新资料并追加 update 行。"""
        self.validate_event_id(event_id)
        if not TAG_ID_PATTERN.match(tag_id or ""):
            raise ValueError("tag_id 只允许字母、数字、冒号、下划线与连字符（2–64 位）")
        name = (display_name or "").strip()
        if not 1 <= len(name) <= 24:
            raise ValueError("display_name 需为 1–24 个字符")
        intro_text = (intro or "").strip()[:60] or None
        atlas_bytes = decode_atlas_png(atlas_png)
        clean_style = {k: v for k, v in (style or {}).items()
                       if isinstance(k, str) and isinstance(v, (str, int, float, bool))}
        with self._lock:
            state = self._state(event_id)
            existing_id = state.by_tag.get(tag_id)
            if existing_id and existing_id in state.checkins:
                current = state.checkins[existing_id]
                atlas_ref = current.get("atlas")
                if atlas_bytes is not None:
                    atlas_ref = f"atlas/{existing_id}.png"
                    self._write_atlas(event_id, atlas_ref, atlas_bytes)
                record = {
                    "schema": SCHEMA,
                    "kind": "update",
                    "seq": state.last_seq + 1,
                    "checkin_id": existing_id,
                    "event_id": event_id,
                    "tag_id": tag_id,
                    "display_name": name,
                    "intro": intro_text if intro_text is not None else current.get("intro"),
                    "atlas": atlas_ref,
                    "style": clean_style or current.get("style") or {},
                    "source": source,
                    "created_at": _now(),
                }
                self._append(event_id, record)
                state.apply(record)
                return dict(state.checkins[existing_id]), False

            assigned_zone, slot = self._assign_zone(state, zone_id)
            checkin_id = f"ck_{secrets.token_hex(6)}"
            atlas_ref = None
            if atlas_bytes is not None:
                atlas_ref = f"atlas/{checkin_id}.png"
                self._write_atlas(event_id, atlas_ref, atlas_bytes)
            record = {
                "schema": SCHEMA,
                "kind": "checkin",
                "seq": state.last_seq + 1,
                "checkin_id": checkin_id,
                "event_id": event_id,
                "tag_id": tag_id,
                "display_name": name,
                "intro": intro_text,
                "zone_id": assigned_zone,
                "zone_requested": zone_id,
                "slot": slot,
                "atlas": atlas_ref,
                "style": clean_style,
                "source": source,
                "owner_id": owner_id,
                "created_at": _now(),
            }
            self._append(event_id, record)
            state.apply(record)
            return dict(state.checkins[checkin_id]), True

    def _write_atlas(self, event_id: str, atlas_ref: str, data: bytes) -> None:
        path = self._event_dir(event_id) / atlas_ref
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
