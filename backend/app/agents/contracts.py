"""Typed contracts at the Agent/application boundary for the MVP 2 runtime.

Agents may only return :class:`Intent` values.  Events are observations and
commands are created by the trusted application layer after policy checks.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, JsonValue, field_validator, model_validator

JsonObject = dict[str, JsonValue]


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


class PrivacyLevel(str, Enum):
    """Visibility labels understood by the deterministic policy layer."""

    PUBLIC = "public"
    ROOM = "room"
    RELATIONSHIP = "relationship"
    PRIVATE = "private"


class ContractModel(BaseModel):
    """Base model for immutable, strict runtime contracts."""

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class ContextFact(ContractModel):
    """One authorized fact exposed to an Agent.

    ``source_ref`` is retained on generated intents so policy and audit code
    can prove that a decision did not depend on a hidden memory record.
    """

    source_ref: str = Field(min_length=1)
    privacy_level: PrivacyLevel = PrivacyLevel.PUBLIC
    owner_id: str | None = None
    payload: JsonObject = Field(default_factory=dict)


class EventEnvelope(ContractModel):
    """Ordered domain event envelope.

    ``sequence`` is always assigned by ``EventStore``.  Producers leave it
    unset, making room ordering a server-owned concern.
    """

    schema_version: Literal["meetmind.event.v1"] = Field(
        default="meetmind.event.v1", alias="schema"
    )
    event_id: str = Field(default_factory=lambda: _new_id("evt"), min_length=1)
    type: str = Field(min_length=1, pattern=r"^[A-Za-z0-9][A-Za-z0-9_.-]*$")
    room_id: str = Field(min_length=1)
    actor_id: str | None = None
    subject_id: str | None = None
    command_id: str | None = None
    payload: JsonObject = Field(default_factory=dict)
    privacy_level: PrivacyLevel = PrivacyLevel.ROOM
    source_refs: tuple[str, ...] = ()
    correlation_id: str | None = None
    causation_id: str | None = None
    sequence: int | None = Field(default=None, ge=1)
    depth: int = Field(default=0, ge=0)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("occurred_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("occurred_at must be timezone-aware")
        return value

    @field_validator("source_refs")
    @classmethod
    def unique_source_refs(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if len(value) != len(set(value)):
            raise ValueError("source_refs must be unique")
        return value


class AgentContext(ContractModel):
    """The complete, already-authorized view available to one activation."""

    agent_id: str = Field(min_length=1)
    room_id: str = Field(min_length=1)
    trigger_event: EventEnvelope
    world_state: JsonObject = Field(default_factory=dict)
    room_state: JsonObject = Field(default_factory=dict)
    facts: tuple[ContextFact, ...] = ()
    allowed_privacy_levels: frozenset[PrivacyLevel] = Field(
        default_factory=lambda: frozenset({PrivacyLevel.PUBLIC})
    )
    allowed_target_ids: frozenset[str] | None = None
    metadata: JsonObject = Field(default_factory=dict)

    @model_validator(mode="after")
    def require_authorized_unique_facts(self) -> "AgentContext":
        refs = [fact.source_ref for fact in self.facts]
        if len(refs) != len(set(refs)):
            raise ValueError("AgentContext facts must have unique source_ref values")
        unauthorized = [
            fact.source_ref
            for fact in self.facts
            if fact.privacy_level not in self.allowed_privacy_levels
        ]
        if unauthorized:
            raise ValueError("AgentContext contains facts above its privacy grant")
        if self.trigger_event.room_id != self.room_id:
            raise ValueError("AgentContext trigger event belongs to another room")
        return self

    @property
    def visible_fact_refs(self) -> frozenset[str]:
        return frozenset(fact.source_ref for fact in self.facts)


class Intent(ContractModel):
    """Untrusted action proposal emitted by an Agent."""

    intent_id: str = Field(default_factory=lambda: _new_id("int"), min_length=1)
    type: str = Field(min_length=1, pattern=r"^[A-Za-z0-9][A-Za-z0-9_.-]*$")
    actor_id: str = Field(min_length=1)
    room_id: str = Field(min_length=1)
    target_id: str | None = None
    payload: JsonObject = Field(default_factory=dict)
    privacy_level: PrivacyLevel = PrivacyLevel.ROOM
    evidence_refs: tuple[str, ...] = ()
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)

    @field_validator("evidence_refs")
    @classmethod
    def unique_evidence_refs(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if len(value) != len(set(value)):
            raise ValueError("evidence_refs must be unique")
        return value


class AgentDecision(ContractModel):
    """Only legal return value of ``BaseAgent.handle``."""

    intents: tuple[Intent, ...] = ()
    evidence_refs: tuple[str, ...] = ()
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    model_metadata: JsonObject = Field(default_factory=dict)


class Command(ContractModel):
    """Trusted application command created from an authorized Intent."""

    command_id: str = Field(min_length=1)
    type: str = Field(min_length=1, pattern=r"^[A-Za-z0-9][A-Za-z0-9_.-]*$")
    actor_id: str = Field(min_length=1)
    room_id: str = Field(min_length=1)
    target_id: str | None = None
    payload: JsonObject = Field(default_factory=dict)
    privacy_level: PrivacyLevel = PrivacyLevel.ROOM
    source_intent_id: str = Field(min_length=1)
    evidence_refs: tuple[str, ...] = ()
    idempotency_key: str = Field(min_length=1)
    expected_revision: int | None = Field(default=None, ge=0)
    causation_id: str | None = None
    correlation_id: str | None = None
