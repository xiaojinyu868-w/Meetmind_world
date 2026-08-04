"""Hard runtime limits for Agent activations."""

from pydantic import BaseModel, ConfigDict, Field


class AgentRuntimeLimits(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    timeout_seconds: float = Field(default=2.0, gt=0.0)
    max_chain_depth: int = Field(default=8, ge=0)
    max_intents_per_event: int = Field(default=16, ge=0)
