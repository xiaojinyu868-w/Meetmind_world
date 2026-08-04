"""Thread-safe in-memory event store with per-room ordering and replay."""

from __future__ import annotations

from threading import RLock

from app.agents.contracts import EventEnvelope


class DuplicateEventConflict(ValueError):
    """An event id was reused with different immutable content."""


def _logical_event(event: EventEnvelope) -> dict:
    # Sequence is assigned by the store and wall-clock time may differ on an
    # HTTP retry.  Every identity-, routing- and payload-bearing field remains.
    return event.model_dump(exclude={"sequence", "occurred_at"})


class EventStore:
    """In-memory implementation suitable for development and deterministic tests."""

    def __init__(self) -> None:
        self._lock = RLock()
        self._streams: dict[str, list[EventEnvelope]] = {}
        self._by_id: dict[tuple[str, str], EventEnvelope] = {}

    def append(self, event: EventEnvelope) -> EventEnvelope:
        return self.append_many((event,))[0]

    def append_many(
        self, events: tuple[EventEnvelope, ...] | list[EventEnvelope]
    ) -> tuple[EventEnvelope, ...]:
        incoming = tuple(events)
        if not all(isinstance(event, EventEnvelope) for event in incoming):
            raise TypeError("EventStore accepts EventEnvelope values only")

        with self._lock:
            provisional: dict[tuple[str, str], EventEnvelope] = {}
            for event in incoming:
                key = (event.room_id, event.event_id)
                existing = self._by_id.get(key) or provisional.get(key)
                if existing is not None:
                    if _logical_event(existing) != _logical_event(event):
                        raise DuplicateEventConflict(
                            f"event id reused with different content: {event.event_id}"
                        )
                    continue
                if event.sequence is not None:
                    raise ValueError("new events must not provide sequence")
                provisional[key] = event.model_copy(deep=True)

            result: list[EventEnvelope] = []
            batch_seen: dict[tuple[str, str], EventEnvelope] = {}
            for event in incoming:
                key = (event.room_id, event.event_id)
                existing = self._by_id.get(key) or batch_seen.get(key)
                if existing is not None:
                    result.append(existing.model_copy(deep=True))
                    continue
                stream = self._streams.setdefault(event.room_id, [])
                stored = event.model_copy(
                    update={"sequence": len(stream) + 1}, deep=True
                )
                stream.append(stored)
                self._by_id[key] = stored
                batch_seen[key] = stored
                result.append(stored.model_copy(deep=True))
            return tuple(result)

    def get(self, room_id: str, event_id: str) -> EventEnvelope | None:
        with self._lock:
            event = self._by_id.get((room_id, event_id))
            return None if event is None else event.model_copy(deep=True)

    def replay(
        self, room_id: str, *, after_sequence: int = 0, limit: int | None = None
    ) -> tuple[EventEnvelope, ...]:
        if after_sequence < 0:
            raise ValueError("after_sequence must be non-negative")
        if limit is not None and limit < 0:
            raise ValueError("limit must be non-negative")
        with self._lock:
            stream = self._streams.get(room_id, ())
            events = tuple(
                event.model_copy(deep=True)
                for event in stream
                if event.sequence > after_sequence
            )
            return events if limit is None else events[:limit]

    def latest_sequence(self, room_id: str) -> int:
        with self._lock:
            return len(self._streams.get(room_id, ()))

    def rooms(self) -> tuple[str, ...]:
        with self._lock:
            return tuple(sorted(self._streams))


InMemoryEventStore = EventStore
