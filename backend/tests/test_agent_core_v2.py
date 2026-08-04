"""Acceptance tests for the isolated MVP 2 Agent/event core."""

import asyncio
from dataclasses import dataclass

import pytest

from app.agents.contracts import (
    AgentDecision,
    Command,
    ContextFact,
    EventEnvelope,
    Intent,
    PrivacyLevel,
)
from app.agents.runtime_v2 import AgentRouter, AgentRuntimeLimits, ContextBuilder
from app.application import CommandValidator
from app.eventing import (
    DuplicateEventConflict,
    EventDispatcher,
    EventStore,
    InMemoryOutbox,
    OutboxDispatcher,
    OutboxStatus,
)
from app.security import PolicyDenied, PolicyEngine, PolicyRule
from app.skills import SkillDefinition, SkillRegistry


def _event(room_id="room-a", **changes):
    values = {"type": "person.nearby", "room_id": room_id, "actor_id": "user-1"}
    values.update(changes)
    return EventEnvelope(**values)


def test_event_store_assigns_room_sequences_and_replays_after_cursor():
    store = EventStore()
    first = store.append(_event(event_id="e1"))
    second = store.append(_event(event_id="e2"))
    other_room = store.append(_event("room-b", event_id="e3"))

    assert (first.sequence, second.sequence, other_room.sequence) == (1, 2, 1)
    assert first.model_dump()["schema"] == "meetmind.event.v1"
    assert [event.event_id for event in store.replay("room-a", after_sequence=1)] == [
        "e2"
    ]
    assert store.latest_sequence("room-a") == 2


def test_event_store_is_idempotent_and_rejects_id_reuse():
    store = EventStore()
    original = _event(event_id="same", payload={"value": 1})
    stored = store.append(original)

    assert store.append(original) == stored
    assert store.latest_sequence("room-a") == 1
    stored.payload["value"] = 99
    assert store.get("room-a", "same").payload == {"value": 1}
    with pytest.raises(DuplicateEventConflict):
        store.append(_event(event_id="same", payload={"value": 2}))
    assert store.latest_sequence("room-a") == 1


def test_context_filter_and_policy_reject_private_or_hidden_evidence():
    facts = (
        ContextFact(source_ref="public:1", payload={"name": "Ada"}),
        ContextFact(
            source_ref="private:1",
            privacy_level=PrivacyLevel.PRIVATE,
            payload={"secret": "not for this agent"},
        ),
    )
    builder = ContextBuilder(
        memory_provider=lambda _agent, _event: facts,
        privacy_resolver=lambda _agent, _event: {PrivacyLevel.PUBLIC},
        targets_provider=lambda _agent, _event: {"person-2"},
    )
    context = asyncio.run(builder.build("person-1", _event()))
    policy = PolicyEngine(
        (
            PolicyRule(
                intent_type="talk",
                command_type="agent.talk",
                allowed_privacy_levels=frozenset(
                    {PrivacyLevel.PUBLIC, PrivacyLevel.PRIVATE}
                ),
                target_required=True,
            ),
        )
    )

    assert context.visible_fact_refs == frozenset({"public:1"})
    private_intent = Intent(
        type="talk",
        actor_id="person-1",
        room_id="room-a",
        target_id="person-2",
        privacy_level=PrivacyLevel.PRIVATE,
    )
    with pytest.raises(PolicyDenied, match="privacy level") as private_error:
        policy.authorize(private_intent, context)
    assert private_error.value.code == "privacy_not_granted"

    hidden_intent = private_intent.model_copy(
        update={
            "privacy_level": PrivacyLevel.PUBLIC,
            "evidence_refs": ("private:1",),
        }
    )
    with pytest.raises(PolicyDenied) as hidden_error:
        policy.authorize(hidden_intent, context)
    assert hidden_error.value.code == "evidence_not_visible"

    private_context = asyncio.run(
        ContextBuilder(
            memory_provider=lambda _agent, _event: facts,
            privacy_resolver=lambda _agent, _event: {
                PrivacyLevel.PUBLIC,
                PrivacyLevel.PRIVATE,
            },
            targets_provider=lambda _agent, _event: {"person-2"},
        ).build("person-1", _event())
    )
    with pytest.raises(PolicyDenied) as downgrade_error:
        policy.authorize(hidden_intent, private_context)
    assert downgrade_error.value.code == "privacy_downgrade"


def test_command_validator_is_the_only_intent_to_command_boundary():
    event = _event()
    context = asyncio.run(
        ContextBuilder(
            privacy_resolver=lambda _agent, _event: {
                PrivacyLevel.PUBLIC,
                PrivacyLevel.ROOM,
            },
            targets_provider=lambda _agent, _event: {"person-2"},
        ).build("person-1", event)
    )
    intent = Intent(
        intent_id="talk-1",
        type="talk",
        actor_id="person-1",
        room_id="room-a",
        target_id="person-2",
    )
    command = CommandValidator().validate(intent, context)

    assert command == Command(
        command_id="cmd_talk-1",
        type="agent.talk",
        actor_id="person-1",
        room_id="room-a",
        target_id="person-2",
        source_intent_id="talk-1",
        idempotency_key="talk-1",
        causation_id=event.event_id,
        correlation_id=event.event_id,
    )
    with pytest.raises(TypeError, match="Intent only"):
        CommandValidator().validate(command, context)


@dataclass
class _Agent:
    agent_id: str
    subscriptions: frozenset[str]
    count: int

    async def handle(self, event, context):
        return AgentDecision(
            intents=tuple(
                Intent(
                    intent_id=f"{self.agent_id}-{index}",
                    type="move",
                    actor_id=self.agent_id,
                    room_id=event.room_id,
                )
                for index in range(self.count)
            )
        )


class _IllegalAgent:
    agent_id = "illegal"
    subscriptions = frozenset({"person.nearby"})

    async def handle(self, event, context):
        return Command(
            command_id="illegal",
            type="agent.move",
            actor_id=self.agent_id,
            room_id=event.room_id,
            source_intent_id="not-an-intent",
            idempotency_key="not-an-intent",
        )


def test_router_applies_subscription_and_shared_intent_budget():
    router = AgentRouter(
        ContextBuilder(),
        limits=AgentRuntimeLimits(max_intents_per_event=3),
    )
    router.register(_Agent("one", frozenset({"person.*"}), 2))
    router.register(_Agent("two", frozenset({"person.nearby"}), 2))
    router.register(_Agent("not-subscribed", frozenset({"meeting.started"}), 2))
    result = asyncio.run(router.route(_event()))

    assert [intent.intent_id for intent in result.intents] == ["one-0", "one-1", "two-0"]
    assert result.activated_agents == ("one", "two")
    assert result.truncated_intents == 1


def test_router_enforces_chain_depth_timeout_and_intent_only_output():
    class SlowAgent:
        agent_id = "slow"
        subscriptions = frozenset({"*"})

        async def handle(self, event, context):
            await asyncio.sleep(0.05)
            return AgentDecision()

    limits = AgentRuntimeLimits(
        timeout_seconds=0.005,
        max_chain_depth=1,
        max_intents_per_event=5,
    )
    router = AgentRouter(ContextBuilder(), limits=limits)
    router.register(SlowAgent())
    router.register(_IllegalAgent())

    too_deep = asyncio.run(router.route(_event(depth=2)))
    assert too_deep.skipped_reason == "max_chain_depth"

    result = asyncio.run(router.route(_event(depth=1)))
    assert result.timed_out_agents == ("slow",)
    assert result.rejected_agents == ("illegal",)
    assert result.intents == ()
    assert "AgentDecision" in result.errors[-1]


def test_outbox_persists_then_dispatches_ordered_event():
    store = EventStore()
    outbox = InMemoryOutbox()
    bus = EventDispatcher()
    observed = []
    bus.subscribe("person.*", observed.append)
    message = outbox.enqueue(_event(event_id="out-1"))

    worker = OutboxDispatcher(outbox, store, bus)

    async def run_concurrently():
        return await asyncio.gather(worker.dispatch_pending(), worker.dispatch_pending())

    batches = asyncio.run(run_concurrently())
    delivered = tuple(event for batch in batches for event in batch)

    assert delivered[0].sequence == 1
    assert observed == list(delivered)
    assert outbox.get(message.message_id).status == OutboxStatus.DELIVERED
    assert outbox.get(message.message_id).attempts == 1


def test_skill_registry_resolves_latest_version():
    registry = SkillRegistry()
    base = {
        "name": "roundtable",
        "description": "Moderate a roundtable",
        "instructions": "Stay on topic.",
        "subscriptions": ("meeting.started",),
        "allowed_intents": ("propose_topic",),
    }
    registry.register(SkillDefinition(version="1.0.0", **base))
    latest = registry.register(SkillDefinition(version="1.2.0", **base))

    assert registry.get("roundtable") is latest
    assert [skill.version for skill in registry.list()] == ["1.0.0", "1.2.0"]
