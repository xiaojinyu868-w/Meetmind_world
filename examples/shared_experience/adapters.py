"""Normalize authorized calendar and check-in DTOs into meetmind.event.v1."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import re
from typing import Mapping
from urllib.parse import quote


_TIMESTAMP = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$"
)


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def _iso(value, name="occurred_at"):
    if not isinstance(value, str) or _TIMESTAMP.fullmatch(value) is None:
        raise ValueError(f"{name} must be an ISO-8601 timestamp with a timezone")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except (ValueError, OverflowError) as exc:
        raise ValueError(f"{name} must be an ISO-8601 timestamp with a timezone") from exc


def _unique_ids(value, name):
    if (
        not isinstance(value, list)
        or not value
        or not all(_text(item) for item in value)
        or len(set(value)) != len(value)
    ):
        raise ValueError(f"{name} must be a non-empty list of unique IDs")


def _identity(dto, actor_id):
    if not _text(actor_id):
        raise ValueError("actor_id is required")
    if "actor_id" in dto and dto["actor_id"] != actor_id:
        raise ValueError("DTO actor must match the authenticated actor")


def _source_key(kind, provider, actor_id, record_id):
    # Encode every component before joining so embedded separators cannot collide.
    return ":".join(quote(part, safe="") for part in (kind, provider, actor_id, record_id))


def _envelope(*, source_key, sequence, room_id, actor_id, payload, audience, source_ref, occurred_at):
    if not _text(room_id):
        raise ValueError("room_id is required")
    if type(sequence) is not int or sequence < 1:
        raise ValueError("sequence must be a positive integer")
    _unique_ids(audience, "audience")
    if actor_id not in audience:
        raise ValueError("audience must contain the actor")
    if not _text(source_ref):
        raise ValueError("source_ref is required for an external event")
    return {
        "schema": "meetmind.event.v1",
        "event_id": f"source:{source_key}",
        "sequence": sequence,
        "room_id": room_id,
        "actor_id": actor_id,
        "subject_id": f"experience:{source_key}",
        "type": "experience.confirmed",
        "payload": deepcopy(payload),
        "audience": list(audience),
        "source_refs": [source_ref],
        "occurred_at": occurred_at,
    }


def calendar_event_to_envelope(dto: Mapping, *, sequence: int, room_id: str, actor_id: str,
                               audience: list[str], source_ref: str) -> dict:
    """Convert the actor's explicitly confirmed attendance into one experience."""
    if not isinstance(dto, Mapping):
        raise ValueError("calendar DTO must be an object")
    _identity(dto, actor_id)
    record_id, title, provider = dto.get("event_id"), dto.get("title"), dto.get("provider")
    if not all(_text(value) for value in (record_id, title, provider)):
        raise ValueError("calendar event_id, title and provider are required")
    if dto.get("attendance_confirmed") is not True:
        raise ValueError("calendar attendance must be explicitly confirmed")
    starts_at = _iso(dto.get("starts_at"), "starts_at")
    ends_at = _iso(dto.get("ends_at"), "ends_at")
    if datetime.fromisoformat(ends_at.replace("Z", "+00:00")) < datetime.fromisoformat(starts_at.replace("Z", "+00:00")):
        raise ValueError("calendar interval is reversed")
    participants = dto.get("participant_ids")
    _unique_ids(participants, "participant_ids")
    if actor_id not in participants:
        raise ValueError("calendar actor must be an explicit participant")
    source = {
        "kind": "calendar",
        "provider": provider,
        "record_id": record_id,
        "occurred_at": ends_at,
        "report_kind": "self_report",
        "starts_at": starts_at,
        "ends_at": ends_at,
    }
    return _envelope(
        source_key=_source_key("calendar", provider, actor_id, record_id),
        sequence=sequence, room_id=room_id, actor_id=actor_id,
        payload={"title": title, "participant_ids": list(participants), "source": source},
        audience=audience, source_ref=source_ref, occurred_at=ends_at,
    )


def checkin_to_envelope(dto: Mapping, *, sequence: int, room_id: str, actor_id: str,
                        audience: list[str], source_ref: str) -> dict:
    """Convert an explicitly confirmed self-report; it only reports the actor."""
    if not isinstance(dto, Mapping):
        raise ValueError("check-in DTO must be an object")
    _identity(dto, actor_id)
    record_id, location = dto.get("event_id"), dto.get("location")
    provider = dto.get("provider", "explicit")
    if not all(_text(value) for value in (record_id, location, provider)):
        raise ValueError("check-in event_id, location and provider are required")
    if dto.get("confirmed") is not True:
        raise ValueError("check-in must be explicitly confirmed")
    at = _iso(dto.get("occurred_at"))
    source = {
        "kind": "checkin",
        "provider": provider,
        "record_id": record_id,
        "occurred_at": at,
        "report_kind": "self_report",
        "location": location,
    }
    return _envelope(
        source_key=_source_key("checkin", provider, actor_id, record_id),
        sequence=sequence, room_id=room_id, actor_id=actor_id,
        payload={"title": f"在 {location} 的签到", "participant_ids": [actor_id], "source": source},
        audience=audience, source_ref=source_ref, occurred_at=at,
    )
