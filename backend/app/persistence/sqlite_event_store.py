"""SQLite WAL implementation of the typed per-room EventStore port."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from threading import RLock

from app.agents.contracts import EventEnvelope
from app.eventing.store import DuplicateEventConflict


def _logical(event: EventEnvelope) -> str:
    payload = event.model_dump(
        mode="json", by_alias=True, exclude={"sequence", "occurred_at"},
    )
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


class SQLiteEventStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = RLock()
        self._db = sqlite3.connect(self.path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA journal_mode=WAL")
        self._db.execute("PRAGMA synchronous=NORMAL")
        self._db.execute("""
            CREATE TABLE IF NOT EXISTS events (
                room_id TEXT NOT NULL,
                sequence INTEGER NOT NULL,
                event_id TEXT NOT NULL,
                envelope_json TEXT NOT NULL,
                logical_json TEXT NOT NULL,
                PRIMARY KEY (room_id, sequence),
                UNIQUE (room_id, event_id)
            )
        """)
        self._db.commit()

    def append(self, event: EventEnvelope) -> EventEnvelope:
        return self.append_many((event,))[0]

    def append_many(self, events) -> tuple[EventEnvelope, ...]:
        incoming = tuple(events)
        if not all(isinstance(event, EventEnvelope) for event in incoming):
            raise TypeError("SQLiteEventStore accepts EventEnvelope values only")
        with self._lock:
            self._db.execute("BEGIN IMMEDIATE")
            try:
                result = []
                next_by_room = {}
                batch = {}
                for event in incoming:
                    key = (event.room_id, event.event_id)
                    existing = self._db.execute(
                        "SELECT envelope_json, logical_json FROM events "
                        "WHERE room_id=? AND event_id=?", key,
                    ).fetchone()
                    if existing is not None:
                        if existing["logical_json"] != _logical(event):
                            raise DuplicateEventConflict(
                                f"event id reused with different content: {event.event_id}"
                            )
                        result.append(EventEnvelope.model_validate_json(existing["envelope_json"]))
                        continue
                    if key in batch:
                        stored = batch[key]
                        if _logical(stored) != _logical(event):
                            raise DuplicateEventConflict(
                                f"event id reused with different content: {event.event_id}"
                            )
                        result.append(stored)
                        continue
                    if event.sequence is not None:
                        raise ValueError("new events must not provide sequence")
                    if event.room_id not in next_by_room:
                        row = self._db.execute(
                            "SELECT COALESCE(MAX(sequence), 0) AS value FROM events WHERE room_id=?",
                            (event.room_id,),
                        ).fetchone()
                        next_by_room[event.room_id] = int(row["value"]) + 1
                    sequence = next_by_room[event.room_id]
                    next_by_room[event.room_id] += 1
                    stored = event.model_copy(update={"sequence": sequence})
                    self._db.execute(
                        "INSERT INTO events(room_id, sequence, event_id, envelope_json, logical_json) "
                        "VALUES (?, ?, ?, ?, ?)",
                        (event.room_id, sequence, event.event_id,
                         stored.model_dump_json(by_alias=True), _logical(stored)),
                    )
                    batch[key] = stored
                    result.append(stored)
                self._db.commit()
                return tuple(result)
            except Exception:
                self._db.rollback()
                raise

    def get(self, room_id: str, event_id: str) -> EventEnvelope | None:
        with self._lock:
            row = self._db.execute(
                "SELECT envelope_json FROM events WHERE room_id=? AND event_id=?",
                (room_id, event_id),
            ).fetchone()
            return EventEnvelope.model_validate_json(row[0]) if row else None

    def replay(self, room_id: str, *, after_sequence: int = 0, limit=None):
        if after_sequence < 0:
            raise ValueError("after_sequence must be non-negative")
        query = "SELECT envelope_json FROM events WHERE room_id=? AND sequence>? ORDER BY sequence"
        params = [room_id, after_sequence]
        if limit is not None:
            if limit < 0:
                raise ValueError("limit must be non-negative")
            query += " LIMIT ?"
            params.append(limit)
        with self._lock:
            return tuple(
                EventEnvelope.model_validate_json(row[0])
                for row in self._db.execute(query, params).fetchall()
            )

    def latest_sequence(self, room_id: str) -> int:
        with self._lock:
            row = self._db.execute(
                "SELECT COALESCE(MAX(sequence), 0) FROM events WHERE room_id=?", (room_id,),
            ).fetchone()
            return int(row[0])

    def rooms(self) -> tuple[str, ...]:
        with self._lock:
            return tuple(row[0] for row in self._db.execute(
                "SELECT DISTINCT room_id FROM events ORDER BY room_id"
            ).fetchall())

    def close(self) -> None:
        with self._lock:
            self._db.close()
