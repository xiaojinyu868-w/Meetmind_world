"""Thread-safe in-memory outbox and ordered dispatcher."""

from __future__ import annotations

from enum import Enum
from threading import RLock

from pydantic import BaseModel, ConfigDict

from app.agents.contracts import EventEnvelope
from app.eventing.dispatcher import EventDispatcher
from app.eventing.store import EventStore


class OutboxStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    FAILED = "failed"
    DELIVERED = "delivered"


class OutboxMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    message_id: str
    event: EventEnvelope
    status: OutboxStatus = OutboxStatus.PENDING
    attempts: int = 0
    last_error: str | None = None


class InMemoryOutbox:
    def __init__(self) -> None:
        self._lock = RLock()
        self._messages: dict[str, OutboxMessage] = {}
        self._order: list[str] = []

    def enqueue(
        self, event: EventEnvelope, *, message_id: str | None = None
    ) -> OutboxMessage:
        if event.sequence is not None:
            raise ValueError("outbox events must not provide sequence")
        key = message_id or event.event_id
        with self._lock:
            existing = self._messages.get(key)
            if existing is not None:
                if existing.event.model_dump(exclude={"occurred_at"}) != event.model_dump(
                    exclude={"occurred_at"}
                ):
                    raise ValueError(f"outbox message id conflict: {key}")
                return existing.model_copy(deep=True)
            message = OutboxMessage(
                message_id=key, event=event.model_copy(deep=True)
            )
            self._messages[key] = message
            self._order.append(key)
            return message.model_copy(deep=True)

    def pending(self, *, limit: int | None = None) -> tuple[OutboxMessage, ...]:
        if limit is not None and limit < 0:
            raise ValueError("limit must be non-negative")
        with self._lock:
            messages = tuple(
                self._messages[key].model_copy(deep=True)
                for key in self._order
                if self._messages[key].status in (OutboxStatus.PENDING, OutboxStatus.FAILED)
            )
            return messages if limit is None else messages[:limit]

    def claim_pending(self, *, limit: int | None = None) -> tuple[OutboxMessage, ...]:
        """Atomically claim messages so concurrent dispatchers cannot duplicate work."""

        if limit is not None and limit < 0:
            raise ValueError("limit must be non-negative")
        with self._lock:
            keys = [
                key
                for key in self._order
                if self._messages[key].status
                in (OutboxStatus.PENDING, OutboxStatus.FAILED)
            ]
            if limit is not None:
                keys = keys[:limit]
            claimed: list[OutboxMessage] = []
            for key in keys:
                current = self._messages[key]
                updated = current.model_copy(
                    update={
                        "status": OutboxStatus.PROCESSING,
                        "attempts": current.attempts + 1,
                        "last_error": None,
                    },
                    deep=True,
                )
                self._messages[key] = updated
                claimed.append(updated.model_copy(deep=True))
            return tuple(claimed)

    def mark_delivered(self, message_id: str) -> OutboxMessage:
        return self._update(message_id, OutboxStatus.DELIVERED, None)

    def mark_failed(self, message_id: str, error: str) -> OutboxMessage:
        return self._update(message_id, OutboxStatus.FAILED, error)

    def _update(
        self, message_id: str, status: OutboxStatus, error: str | None
    ) -> OutboxMessage:
        with self._lock:
            current = self._messages[message_id]
            updated = current.model_copy(
                update={
                    "status": status,
                    "last_error": error,
                },
                deep=True,
            )
            self._messages[message_id] = updated
            return updated.model_copy(deep=True)

    def get(self, message_id: str) -> OutboxMessage | None:
        with self._lock:
            message = self._messages.get(message_id)
            return None if message is None else message.model_copy(deep=True)


class OutboxDispatcher:
    """Persist outbox events, then notify projectors/broadcasters in order."""

    def __init__(
        self,
        outbox: InMemoryOutbox,
        event_store: EventStore,
        dispatcher: EventDispatcher,
    ) -> None:
        self._outbox = outbox
        self._event_store = event_store
        self._dispatcher = dispatcher

    async def dispatch_pending(
        self, *, limit: int | None = None
    ) -> tuple[EventEnvelope, ...]:
        delivered: list[EventEnvelope] = []
        for message in self._outbox.claim_pending(limit=limit):
            try:
                stored = self._event_store.append(message.event)
                await self._dispatcher.dispatch(stored)
            except Exception as exc:
                self._outbox.mark_failed(message.message_id, str(exc))
                continue
            self._outbox.mark_delivered(message.message_id)
            delivered.append(stored)
        return tuple(delivered)
