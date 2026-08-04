"""Declarative, immutable Skill metadata for Agent roles."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SkillDefinition(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        populate_by_name=True,
        serialize_by_alias=True,
    )

    schema_version: Literal["echo-skill.v1"] = Field(
        default="echo-skill.v1", alias="schema"
    )
    name: str = Field(min_length=1, pattern=r"^[a-z][a-z0-9_-]*$")
    version: str = Field(min_length=1, pattern=r"^[0-9]+(?:\.[0-9]+){0,2}$")
    description: str = Field(min_length=1)
    instructions: str = Field(min_length=1)
    subscriptions: tuple[str, ...]
    allowed_intents: tuple[str, ...]
    tools: tuple[str, ...] = ()
    max_intents: int = Field(default=4, ge=0)

    @field_validator("subscriptions", "allowed_intents", "tools")
    @classmethod
    def require_unique_values(cls, value: tuple[str, ...], info) -> tuple[str, ...]:
        if info.field_name != "tools" and not value:
            raise ValueError(f"{info.field_name} must not be empty")
        if len(value) != len(set(value)):
            raise ValueError(f"{info.field_name} must contain unique values")
        if any(not item for item in value):
            raise ValueError(f"{info.field_name} values must not be empty")
        return value

    @property
    def skill_id(self) -> str:
        return f"{self.name}@{self.version}"
