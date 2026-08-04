"""In-memory domain records used by the room service.

These records deliberately contain no FastAPI or LLM dependencies. The room
service is the authority for ordering, distance checks, and meeting state.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Member:
    member_id: str
    display_name: str
    x: float = 0.0
    z: float = 0.0

    def as_dict(self) -> dict[str, Any]:
        return {
            "member_id": self.member_id,
            "display_name": self.display_name,
            "position": {"x": self.x, "z": self.z},
        }


@dataclass(frozen=True)
class Hotspot:
    hotspot_id: str
    label: str
    x: float
    z: float
    radius: float
    allowed_actions: tuple[str, ...]

    def contains(self, x: float, z: float) -> bool:
        return (x - self.x) ** 2 + (z - self.z) ** 2 <= self.radius ** 2

    def as_dict(self) -> dict[str, Any]:
        return {
            "hotspot_id": self.hotspot_id,
            "label": self.label,
            "position": {"x": self.x, "z": self.z},
            "radius": self.radius,
            "allowed_actions": list(self.allowed_actions),
        }


@dataclass
class RoomState:
    room_id: str
    name: str
    hotspots: dict[str, Hotspot]
    members: dict[str, Member] = field(default_factory=dict)
    invitations: dict[str, dict[str, Any]] = field(default_factory=dict)
    active_meeting: dict[str, Any] | None = None
    icebreaker: dict[str, Any] | None = None
    bulletins: list[dict[str, Any]] = field(default_factory=list)
    sequence: int = 0
    command_receipts: dict[str, dict[str, Any]] = field(default_factory=dict)
