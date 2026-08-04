"""Pluggable, privacy-filtering Agent context construction."""

from __future__ import annotations

import inspect
from copy import deepcopy
from collections.abc import Awaitable, Callable, Iterable
from typing import Any, Protocol, runtime_checkable

from app.agents.contracts import (
    AgentContext,
    ContextFact,
    EventEnvelope,
    PrivacyLevel,
)

StateProvider = Callable[[str, EventEnvelope], dict[str, Any] | Awaitable[dict[str, Any]]]
MemoryProvider = Callable[
    [str, EventEnvelope],
    Iterable[ContextFact | dict[str, Any]]
    | Awaitable[Iterable[ContextFact | dict[str, Any]]],
]
PrivacyResolver = Callable[
    [str, EventEnvelope],
    Iterable[PrivacyLevel | str] | Awaitable[Iterable[PrivacyLevel | str]],
]
TargetsProvider = Callable[
    [str, EventEnvelope],
    Iterable[str] | None | Awaitable[Iterable[str] | None],
]


async def _resolve(value):
    if inspect.isawaitable(value):
        return await value
    return value


def _empty_state(_agent_id: str, _event: EventEnvelope) -> dict[str, Any]:
    return {}


def _empty_memory(
    _agent_id: str, _event: EventEnvelope
) -> tuple[ContextFact, ...]:
    return ()


def _public_only(
    _agent_id: str, _event: EventEnvelope
) -> frozenset[PrivacyLevel]:
    return frozenset({PrivacyLevel.PUBLIC})


def _no_targets(
    _agent_id: str, _event: EventEnvelope
) -> tuple[str, ...]:
    return ()


@runtime_checkable
class AgentContextBuilder(Protocol):
    """Minimal interface accepted by ``AgentRouter``."""

    async def build(self, agent_id: str, event: EventEnvelope) -> AgentContext:
        """Build one authorized activation context."""


class ContextBuilder:
    """Compose independent world, room, memory and privacy adapters.

    Providers may be synchronous or asynchronous.  Facts above the resolved
    privacy clearance are removed before any Agent code runs.
    """

    def __init__(
        self,
        *,
        world_provider: StateProvider = _empty_state,
        room_provider: StateProvider = _empty_state,
        memory_provider: MemoryProvider = _empty_memory,
        privacy_resolver: PrivacyResolver = _public_only,
        targets_provider: TargetsProvider = _no_targets,
    ) -> None:
        self._world_provider = world_provider
        self._room_provider = room_provider
        self._memory_provider = memory_provider
        self._privacy_resolver = privacy_resolver
        self._targets_provider = targets_provider

    async def build(self, agent_id: str, event: EventEnvelope) -> AgentContext:
        world_state = await _resolve(self._world_provider(agent_id, event))
        room_state = await _resolve(self._room_provider(agent_id, event))
        raw_levels = await _resolve(self._privacy_resolver(agent_id, event))
        levels = frozenset(PrivacyLevel(level) for level in raw_levels)
        raw_facts = await _resolve(self._memory_provider(agent_id, event))
        raw_targets = await _resolve(self._targets_provider(agent_id, event))

        facts: list[ContextFact] = []
        seen_refs: set[str] = set()
        for raw_fact in raw_facts:
            fact = raw_fact if isinstance(raw_fact, ContextFact) else ContextFact.model_validate(raw_fact)
            if fact.privacy_level not in levels:
                continue
            if fact.source_ref in seen_refs:
                raise ValueError(f"duplicate context fact source_ref: {fact.source_ref}")
            seen_refs.add(fact.source_ref)
            facts.append(fact.model_copy(deep=True))

        return AgentContext(
            agent_id=agent_id,
            room_id=event.room_id,
            trigger_event=event,
            world_state=deepcopy(dict(world_state)),
            room_state=deepcopy(dict(room_state)),
            facts=tuple(facts),
            allowed_privacy_levels=levels,
            allowed_target_ids=(
                None if raw_targets is None else frozenset(raw_targets)
            ),
        )
