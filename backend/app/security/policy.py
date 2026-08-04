"""Deterministic authorization policy for Agent-proposed intents."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass

from app.agents.contracts import AgentContext, Intent, PrivacyLevel


class PolicyDenied(PermissionError):
    """An intent failed a static authorization rule."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True, slots=True)
class PolicyRule:
    intent_type: str
    command_type: str
    allowed_privacy_levels: frozenset[PrivacyLevel]
    target_required: bool = False


def _rule(
    intent_type: str,
    command_type: str,
    *,
    target_required: bool = False,
    privacy: Iterable[PrivacyLevel] = (
        PrivacyLevel.PUBLIC,
        PrivacyLevel.ROOM,
    ),
) -> PolicyRule:
    return PolicyRule(
        intent_type=intent_type,
        command_type=command_type,
        allowed_privacy_levels=frozenset(privacy),
        target_required=target_required,
    )


DEFAULT_RULES: tuple[PolicyRule, ...] = (
    _rule("move", "agent.move"),
    _rule("visit", "agent.visit", target_required=True),
    _rule("sit", "agent.sit"),
    _rule("talk", "agent.talk", target_required=True),
    _rule("initiate_talk", "person.message", target_required=True),
    _rule("respond_meeting", "meeting.respond"),
    _rule("invite", "room.invite", target_required=True),
    _rule("join_roundtable", "roundtable.join"),
    _rule("leave_roundtable", "roundtable.leave"),
    _rule("propose_topic", "roundtable.propose-topic"),
    _rule("publish_bulletin", "bulletin.publish"),
    _rule("start_icebreaker", "icebreaker.start"),
    _rule("submit_icebreaker", "icebreaker.submit"),
)

_PRIVACY_RANK = {
    PrivacyLevel.PUBLIC: 0,
    PrivacyLevel.ROOM: 1,
    PrivacyLevel.RELATIONSHIP: 2,
    PrivacyLevel.PRIVATE: 3,
}


class PolicyEngine:
    """Pure, static policy checks with no LLM or storage access."""

    def __init__(self, rules: Iterable[PolicyRule] = DEFAULT_RULES) -> None:
        indexed: dict[str, PolicyRule] = {}
        for rule in rules:
            if rule.intent_type in indexed:
                raise ValueError(f"duplicate policy rule: {rule.intent_type}")
            indexed[rule.intent_type] = rule
        self._rules: Mapping[str, PolicyRule] = indexed

    def rule_for(self, intent_type: str) -> PolicyRule:
        try:
            return self._rules[intent_type]
        except KeyError as exc:
            raise PolicyDenied(
                "intent_type_denied", f"intent type is not allowed: {intent_type}"
            ) from exc

    def authorize(self, intent: Intent, context: AgentContext) -> PolicyRule:
        """Authorize an intent or raise ``PolicyDenied`` with a stable code."""

        if not isinstance(intent, Intent):
            raise PolicyDenied("invalid_boundary_type", "only Intent can be authorized")
        rule = self.rule_for(intent.type)
        if intent.room_id != context.room_id:
            raise PolicyDenied("room_mismatch", "intent cannot cross room boundaries")
        if intent.actor_id != context.agent_id:
            raise PolicyDenied(
                "actor_mismatch", "Agent cannot issue an intent for another actor"
            )
        if intent.privacy_level not in context.allowed_privacy_levels:
            raise PolicyDenied(
                "privacy_not_granted",
                f"privacy level is not in Agent context: {intent.privacy_level.value}",
            )
        if intent.privacy_level not in rule.allowed_privacy_levels:
            raise PolicyDenied(
                "privacy_not_allowed_for_intent",
                f"privacy level is not allowed for {intent.type}",
            )
        if rule.target_required and not intent.target_id:
            raise PolicyDenied("target_required", f"{intent.type} requires target_id")
        if (
            intent.target_id is not None
            and context.allowed_target_ids is not None
            and intent.target_id not in context.allowed_target_ids
        ):
            raise PolicyDenied(
                "target_not_visible", "intent target is outside the authorized context"
            )
        hidden_refs = set(intent.evidence_refs) - context.visible_fact_refs
        if hidden_refs:
            raise PolicyDenied(
                "evidence_not_visible",
                "intent references facts that are absent from authorized context",
            )
        facts_by_ref = {fact.source_ref: fact for fact in context.facts}
        if any(
            _PRIVACY_RANK[facts_by_ref[source_ref].privacy_level]
            > _PRIVACY_RANK[intent.privacy_level]
            for source_ref in intent.evidence_refs
        ):
            raise PolicyDenied(
                "privacy_downgrade",
                "intent visibility is lower than one or more evidence facts",
            )
        return rule
