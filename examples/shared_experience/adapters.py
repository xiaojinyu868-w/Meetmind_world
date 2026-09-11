"""Normalize authorized calendar and check-in DTOs into meetmind.event.v1."""
from __future__ import annotations
from datetime import datetime
from typing import Mapping

def _text(value):
    return isinstance(value, str) and bool(value.strip())

def _iso(value):
    if not _text(value):
        raise ValueError("occurred_at must be an ISO-8601 string")
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("occurred_at must be an ISO-8601 string") from exc
    return value

def _parsed_iso(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))

def _unique_ids(value, name):
    if not isinstance(value, list) or not value or len(set(value)) != len(value) or not all(_text(item) for item in value):
        raise ValueError(f"{name} must be a non-empty list of unique IDs")

def _envelope(*, event_id, sequence, room_id, actor_id, subject_id, payload, audience, source_refs, occurred_at):
    if not all(_text(item) for item in (event_id, room_id, actor_id, subject_id)):
        raise ValueError("event IDs and subject are required")
    if type(sequence) is not int or sequence < 1:
        raise ValueError("sequence must be a positive integer")
    if not isinstance(payload, dict):
        raise ValueError("payload must be an object")
    _unique_ids(audience, "audience")
    if not isinstance(source_refs, list) or len(set(source_refs)) != len(source_refs):
        raise ValueError("source_refs must be a unique list")
    return {"schema": "meetmind.event.v1", "event_id": event_id, "sequence": sequence,
            "room_id": room_id, "actor_id": actor_id, "subject_id": subject_id,
            "type": "experience.confirmed", "payload": payload, "audience": audience,
            "source_refs": source_refs, "occurred_at": _iso(occurred_at)}

def calendar_event_to_envelope(dto: Mapping, *, sequence: int, room_id: str, actor_id: str,
                               audience: list[str], source_ref: str | None = None) -> dict:
    """Convert an explicitly authorized calendar event into one experience."""
    if not isinstance(dto, Mapping):
        raise ValueError("calendar DTO must be an object")
    event_id, title, provider = dto.get("event_id"), dto.get("title"), dto.get("provider")
    if not _text(event_id) or not _text(title) or not _text(provider):
        raise ValueError("calendar event_id, title and provider are required")
    starts_at, ends_at = _iso(dto.get("starts_at")), _iso(dto.get("ends_at"))
    if _parsed_iso(ends_at) < _parsed_iso(starts_at):
        raise ValueError("calendar interval is reversed")
    participants = dto.get("participant_ids")
    _unique_ids(participants, "participant_ids")
    return _envelope(event_id=f"source:calendar:{event_id}", sequence=sequence,
        room_id=room_id, actor_id=actor_id, subject_id=f"experience:{event_id}",
        payload={"title": title, "participant_ids": participants, "provider": provider,
                 "starts_at": starts_at, "ends_at": ends_at},
        audience=audience, source_refs=[source_ref] if source_ref else [], occurred_at=ends_at)

def checkin_to_envelope(dto: Mapping, *, sequence: int, room_id: str, actor_id: str,
                        audience: list[str], source_ref: str | None = None) -> dict:
    """Convert a self-reported check-in; it only reports the actor."""
    if not isinstance(dto, Mapping):
        raise ValueError("check-in DTO must be an object")
    event_id, location = dto.get("event_id"), dto.get("location")
    if not _text(event_id) or not _text(location):
        raise ValueError("check-in event_id and location are required")
    at = _iso(dto.get("occurred_at"))
    return _envelope(event_id=f"source:checkin:{event_id}", sequence=sequence,
        room_id=room_id, actor_id=actor_id, subject_id=f"experience:checkin:{event_id}",
        payload={"title": f"在 {location} 的签到", "participant_ids": [actor_id],
                 "location": location, "provider": dto.get("provider", "explicit")},
        audience=audience, source_refs=[source_ref] if source_ref else [], occurred_at=at)
