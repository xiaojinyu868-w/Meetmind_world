"""In-process event dispatcher for projectors and realtime broadcasters."""

from __future__ import annotations

import inspect
from collections.abc import Awaitable, Callable

from app.agents.contracts import EventEnvelope

EventHandler = Callable[[EventEnvelope], None | Awaitable[None]]


def _matches(subscription: str, event_type: str) -> bool:
    if subscription == "*" or subscription == event_type:
        return True
    if subscription.endswith(".*"):
        prefix = subscription[:-2]
        return event_type == prefix or event_type.startswith(prefix + ".")
    return False


class EventDispatcher:
    """Dispatch ordered events to subscribed sync or async handlers."""

    def __init__(self) -> None:
        self._subscriptions: list[tuple[str, EventHandler]] = []

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        if not event_type:
            raise ValueError("event_type must not be empty")
        self._subscriptions.append((event_type, handler))

    def unsubscribe(self, handler: EventHandler) -> int:
        before = len(self._subscriptions)
        self._subscriptions = [item for item in self._subscriptions if item[1] is not handler]
        return before - len(self._subscriptions)

    async def dispatch(self, event: EventEnvelope) -> int:
        delivered = 0
        for subscription, handler in tuple(self._subscriptions):
            if not _matches(subscription, event.type):
                continue
            result = handler(event)
            if inspect.isawaitable(result):
                await result
            delivered += 1
        return delivered
