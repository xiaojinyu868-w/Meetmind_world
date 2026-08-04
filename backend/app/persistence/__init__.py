"""Local persistence adapters for the MVP2 single-node deployment."""

from app.persistence.room_repository import SQLiteRoomRepository
from app.persistence.sqlite_event_store import SQLiteEventStore

__all__ = ["SQLiteEventStore", "SQLiteRoomRepository"]
