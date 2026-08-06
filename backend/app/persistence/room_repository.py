"""SQLite snapshot repository for rooms and command idempotency receipts."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from threading import RLock

from app.domain.rooms.models import Hotspot, Member, RoomState


class SQLiteRoomRepository:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = RLock()
        self._db = sqlite3.connect(self.path, check_same_thread=False)
        self._db.execute("PRAGMA journal_mode=WAL")
        self._db.execute("""
            CREATE TABLE IF NOT EXISTS room_states (
                room_id TEXT PRIMARY KEY,
                state_json TEXT NOT NULL
            )
        """)
        self._db.commit()

    @staticmethod
    def _dump(room: RoomState) -> dict:
        return {
            "room_id": room.room_id, "name": room.name,
            "hotspots": [item.as_dict() for item in room.hotspots.values()],
            "members": [item.as_dict() for item in room.members.values()],
            "invitations": room.invitations,
            "active_meeting": room.active_meeting,
            "icebreaker": room.icebreaker,
            "bulletins": room.bulletins,
            "conversations": room.conversations,
            "relationships": room.relationships,
            "agent_runtime": room.agent_runtime,
            "sequence": room.sequence,
            "command_receipts": room.command_receipts,
        }

    @staticmethod
    def _load(payload: dict) -> RoomState:
        hotspots = {}
        for raw in payload.get("hotspots", []):
            position = raw["position"]
            hotspot = Hotspot(
                hotspot_id=raw["hotspot_id"], label=raw["label"],
                x=float(position["x"]), z=float(position["z"]),
                radius=float(raw["radius"]),
                allowed_actions=tuple(raw["allowed_actions"]),
            )
            hotspots[hotspot.hotspot_id] = hotspot
        members = {}
        for raw in payload.get("members", []):
            position = raw["position"]
            member = Member(
                raw["member_id"], raw["display_name"],
                float(position["x"]), float(position["z"]),
            )
            members[member.member_id] = member
        return RoomState(
            room_id=payload["room_id"], name=payload["name"], hotspots=hotspots,
            members=members, invitations=payload.get("invitations") or {},
            active_meeting=payload.get("active_meeting"),
            icebreaker=payload.get("icebreaker"),
            bulletins=payload.get("bulletins") or [],
            conversations=payload.get("conversations") or {},
            relationships=payload.get("relationships") or {},
            agent_runtime=payload.get("agent_runtime") or {},
            sequence=int(payload.get("sequence") or 0),
            # 历史超大回执表在加载时收敛到最近 200 条（JSON 保序，末尾最新）
            command_receipts=dict(
                list((payload.get("command_receipts") or {}).items())[-200:]
            ),
        )

    def save(self, room: RoomState) -> None:
        payload = json.dumps(self._dump(room), ensure_ascii=False, separators=(",", ":"))
        with self._lock:
            self._db.execute(
                "INSERT INTO room_states(room_id, state_json) VALUES (?, ?) "
                "ON CONFLICT(room_id) DO UPDATE SET state_json=excluded.state_json",
                (room.room_id, payload),
            )
            self._db.commit()

    def load_all(self) -> tuple[RoomState, ...]:
        with self._lock:
            rows = self._db.execute(
                "SELECT state_json FROM room_states ORDER BY room_id"
            ).fetchall()
        return tuple(self._load(json.loads(row[0])) for row in rows)

    def close(self) -> None:
        with self._lock:
            self._db.close()
