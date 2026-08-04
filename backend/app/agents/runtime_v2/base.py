"""Agent protocol for the event-driven MVP 2 runtime."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.agents.contracts import AgentContext, AgentDecision, EventEnvelope


@runtime_checkable
class BaseAgent(Protocol):
    """An Agent observes events and proposes intents; it has no write API."""

    agent_id: str
    subscriptions: frozenset[str]

    async def handle(
        self, event: EventEnvelope, context: AgentContext
    ) -> AgentDecision:
        """Return action proposals for one activation."""
