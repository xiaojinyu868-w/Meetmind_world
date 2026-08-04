"""Read-only/content-only Tool boundary for Agent activations."""

from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field


class ToolSpec(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(pattern=r"^[a-z][a-z0-9_-]*$")
    version: str = Field(pattern=r"^[0-9]+(?:\.[0-9]+){0,2}$")
    description: str = Field(min_length=1)
    read_only: bool = True
    timeout_seconds: float = Field(default=2.0, gt=0, le=30)


class ToolResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    data: dict[str, Any] = Field(default_factory=dict)
    source_refs: tuple[str, ...] = ()


class BaseTool(Protocol):
    spec: ToolSpec

    async def invoke(self, context, arguments: dict[str, Any]) -> ToolResult: ...
