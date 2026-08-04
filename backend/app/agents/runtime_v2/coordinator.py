"""Application coordinator from committed events to validated Agent commands."""

from __future__ import annotations

import inspect
import logging
from collections.abc import Callable

from app.agents.contracts import EventEnvelope

logger = logging.getLogger(__name__)


class AgentCoordinator:
    def __init__(self, router, context_builder, command_validator, executor: Callable):
        self._router = router
        self._context_builder = context_builder
        self._validator = command_validator
        self._executor = executor

    async def process(self, event: EventEnvelope) -> list[dict]:
        """Process one event and its bounded Agent-produced descendants."""
        pending = [event]
        produced: list[dict] = []
        while pending:
            current = pending.pop(0)
            routed = await self._router.route(current)
            for intent in routed.intents:
                try:
                    context = await self._context_builder.build(intent.actor_id, current)
                    command = self._validator.validate(intent, context)
                    response = self._executor(command)
                    if inspect.isawaitable(response):
                        response = await response
                except Exception:
                    # The triggering event is already committed. Agent enrichment must
                    # degrade quietly instead of turning a successful user command into 500.
                    logger.exception("Agent intent rejected after event %s", current.event_id)
                    continue
                for raw in response.get("events", []):
                    produced.append(raw)
                    child = EventEnvelope(
                        event_id=raw["event_id"], type=raw["type"],
                        room_id=raw["room_id"], actor_id=raw.get("actor_id"),
                        subject_id=raw.get("subject_id"),
                        payload=raw.get("payload") or {}, sequence=raw["sequence"],
                        causation_id=current.event_id,
                        correlation_id=current.correlation_id or current.event_id,
                        depth=current.depth + 1,
                    )
                    pending.append(child)
        return produced
