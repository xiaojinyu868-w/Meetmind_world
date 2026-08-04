"""Versioned mount contract for market booths, interiors and Fields."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SceneModuleDefinition(BaseModel):
    model_config = ConfigDict(
        extra="forbid", frozen=True, populate_by_name=True, serialize_by_alias=True,
    )

    schema_version: Literal["meetmind.scene-module.v1"] = Field(
        default="meetmind.scene-module.v1", alias="schema",
    )
    module_id: str = Field(pattern=r"^[a-z][a-z0-9-]*$")
    module_type: Literal["environment", "booth", "interior", "field", "game"]
    label: str = Field(min_length=1, max_length=120)
    entry_action: str = Field(min_length=1, max_length=80)
    capabilities: tuple[str, ...]
    asset_id: str | None = None
    version: str = "1.0.0"
