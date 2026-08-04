"""Conversion of untrusted Agent intents into trusted application commands."""

from __future__ import annotations

from copy import deepcopy

from app.agents.contracts import AgentContext, Command, Intent
from app.security.policy import PolicyEngine


class CommandValidator:
    """Apply static policy, then bind a command to authoritative context."""

    def __init__(self, policy: PolicyEngine | None = None) -> None:
        self._policy = policy or PolicyEngine()

    def validate(self, intent: Intent, context: AgentContext) -> Command:
        if not isinstance(intent, Intent):
            raise TypeError("CommandValidator accepts Intent only")
        rule = self._policy.authorize(intent, context)
        revision = context.room_state.get("revision", context.room_state.get("sequence"))
        if not isinstance(revision, int) or isinstance(revision, bool) or revision < 0:
            revision = None
        return Command(
            command_id=f"cmd_{intent.intent_id}",
            type=rule.command_type,
            actor_id=context.agent_id,
            room_id=context.room_id,
            target_id=intent.target_id,
            payload=deepcopy(intent.payload),
            privacy_level=intent.privacy_level,
            source_intent_id=intent.intent_id,
            evidence_refs=intent.evidence_refs,
            idempotency_key=intent.intent_id,
            expected_revision=revision,
            causation_id=context.trigger_event.event_id,
            correlation_id=(
                context.trigger_event.correlation_id or context.trigger_event.event_id
            ),
        )

    def validate_many(
        self, intents: tuple[Intent, ...] | list[Intent], context: AgentContext
    ) -> tuple[Command, ...]:
        return tuple(self.validate(intent, context) for intent in intents)
