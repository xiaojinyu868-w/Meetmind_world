"""Subscription router that collects bounded Agent intents."""

from __future__ import annotations

import asyncio
import inspect
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.agents.contracts import AgentContext, AgentDecision, EventEnvelope, Intent
from app.agents.runtime_v2.base import BaseAgent
from app.agents.runtime_v2.context import AgentContextBuilder
from app.agents.runtime_v2.limits import AgentRuntimeLimits


class AgentBoundaryError(TypeError):
    """Raised internally when Agent code crosses the Intent-only boundary."""


class RouteResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    event_id: str
    intents: tuple[Intent, ...] = ()
    activated_agents: tuple[str, ...] = ()
    timed_out_agents: tuple[str, ...] = ()
    rejected_agents: tuple[str, ...] = ()
    skipped_agents: tuple[str, ...] = ()
    errors: tuple[str, ...] = ()
    truncated_intents: int = 0
    skipped_reason: str | None = None


def _matches(subscription: str, event_type: str) -> bool:
    if subscription == "*" or subscription == event_type:
        return True
    if subscription.endswith(".*"):
        prefix = subscription[:-2]
        return event_type == prefix or event_type.startswith(prefix + ".")
    return False


async def _maybe_await(value: Any) -> Any:
    if inspect.isawaitable(value):
        return await value
    return value


class AgentRouter:
    """Activate subscribed Agents in deterministic registration order.

    Depths from zero through ``max_chain_depth`` are accepted.  Deeper events
    are ignored, preventing feedback loops.  The intent budget is shared by
    all Agents activated for one event.
    """

    def __init__(
        self,
        context_builder: AgentContextBuilder,
        *,
        limits: AgentRuntimeLimits | None = None,
        agent_factory=None,
    ) -> None:
        self._context_builder = context_builder
        self._limits = limits or AgentRuntimeLimits()
        self._agents: list[BaseAgent] = []
        self._agent_ids: set[str] = set()
        self._agent_factory = agent_factory

    def register(self, agent: BaseAgent) -> None:
        agent_id = getattr(agent, "agent_id", None)
        subscriptions = getattr(agent, "subscriptions", None)
        if not isinstance(agent_id, str) or not agent_id:
            raise TypeError("Agent must expose a non-empty agent_id")
        if agent_id in self._agent_ids:
            raise ValueError(f"Agent already registered: {agent_id}")
        if not isinstance(subscriptions, (set, frozenset, tuple, list)):
            raise TypeError("Agent subscriptions must be a collection of event types")
        if not subscriptions or not all(isinstance(item, str) and item for item in subscriptions):
            raise ValueError("Agent subscriptions must not be empty")
        self._agents.append(agent)
        self._agent_ids.add(agent_id)

    def unregister(self, agent_id: str) -> bool:
        for index, agent in enumerate(self._agents):
            if agent.agent_id == agent_id:
                self._agents.pop(index)
                self._agent_ids.remove(agent_id)
                return True
        return False

    async def _activate(
        self, agent: BaseAgent, event: EventEnvelope
    ) -> tuple[AgentContext, AgentDecision]:
        context = await _maybe_await(
            self._context_builder.build(agent.agent_id, event)
        )
        if not isinstance(context, AgentContext):
            raise AgentBoundaryError("ContextBuilder must return AgentContext")
        if context.agent_id != agent.agent_id or context.room_id != event.room_id:
            raise AgentBoundaryError("ContextBuilder returned a mismatched Agent context")
        decision = await _maybe_await(agent.handle(event, context))
        if not isinstance(decision, AgentDecision):
            raise AgentBoundaryError(
                "Agent must return AgentDecision containing only Intent values"
            )
        return context, decision

    async def route(self, event: EventEnvelope) -> RouteResult:
        if not isinstance(event, EventEnvelope):
            raise TypeError("AgentRouter accepts EventEnvelope observations only")
        if event.depth > self._limits.max_chain_depth:
            return RouteResult(event_id=event.event_id, skipped_reason="max_chain_depth")

        candidates = [
            agent
            for agent in self._agents
            if any(_matches(item, event.type) for item in agent.subscriptions)
        ]
        if self._agent_factory is not None:
            dynamic = await _maybe_await(self._agent_factory(event))
            for agent in dynamic or ():
                if any(_matches(item, event.type) for item in agent.subscriptions):
                    candidates.append(agent)
        if not candidates:
            return RouteResult(event_id=event.event_id, skipped_reason="no_subscribers")

        intents: list[Intent] = []
        activated: list[str] = []
        timed_out: list[str] = []
        rejected: list[str] = []
        skipped: list[str] = []
        errors: list[str] = []
        truncated = 0
        seen_intent_ids: set[str] = set()

        for index, agent in enumerate(candidates):
            remaining = self._limits.max_intents_per_event - len(intents)
            if remaining <= 0:
                skipped.extend(item.agent_id for item in candidates[index:])
                break
            try:
                _context, decision = await asyncio.wait_for(
                    self._activate(agent, event),
                    timeout=self._limits.timeout_seconds,
                )
            except TimeoutError:
                timed_out.append(agent.agent_id)
                errors.append(f"{agent.agent_id}: activation timed out")
                continue
            except Exception as exc:
                rejected.append(agent.agent_id)
                errors.append(f"{agent.agent_id}: {type(exc).__name__}: {exc}")
                continue

            activated.append(agent.agent_id)
            unique: list[Intent] = []
            for intent in decision.intents:
                if intent.intent_id in seen_intent_ids:
                    errors.append(
                        f"{agent.agent_id}: duplicate intent_id {intent.intent_id}"
                    )
                    continue
                seen_intent_ids.add(intent.intent_id)
                unique.append(intent)
            intents.extend(unique[:remaining])
            truncated += max(0, len(unique) - remaining)

        return RouteResult(
            event_id=event.event_id,
            intents=tuple(intents),
            activated_agents=tuple(activated),
            timed_out_agents=tuple(timed_out),
            rejected_agents=tuple(rejected),
            skipped_agents=tuple(skipped),
            errors=tuple(errors),
            truncated_intents=truncated,
        )
