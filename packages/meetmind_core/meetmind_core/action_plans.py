"""Validated personal action plans and offline RFC 5545 calendar export.

Callers must supply a viewer-authorized action DTO. Export records only that
viewer's accepted plan; it does not invite others or verify anyone's attendance.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import re
from typing import Mapping


_PLAN_FIELDS = frozenset({"scheduled_at", "duration_minutes", "location", "success_criteria"})
_TIMESTAMP = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?"
    r"(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$"
)


def _text(value, name, maximum=None):
    if not isinstance(value, str) or not value.strip() or (maximum and len(value) > maximum):
        raise ValueError(f"{name} must be nonempty text" + (f" of at most {maximum} characters" if maximum else ""))
    if any(ord(char) < 32 and char not in "\t\r\n" for char in value) or "\x7f" in value:
        raise ValueError(f"{name} contains unsupported control characters")
    try:
        value.encode("utf-8")
    except UnicodeError as exc:
        raise ValueError(f"{name} must be valid UTF-8 text") from exc
    return value


def _datetime(value):
    if not isinstance(value, str) or _TIMESTAMP.fullmatch(value) is None:
        raise ValueError("scheduled_at must be an ISO datetime with a timezone")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except (ValueError, OverflowError) as exc:
        raise ValueError("scheduled_at must be an ISO datetime with a timezone") from exc


def validate_action_plan(value):
    """Return an independent, normalized plan; reject missing or extra fields."""
    if not isinstance(value, Mapping) or set(value) != _PLAN_FIELDS:
        raise ValueError("action plan requires exactly scheduled_at, duration_minutes, location and success_criteria")
    scheduled = _datetime(value["scheduled_at"])
    minutes = value["duration_minutes"]
    if type(minutes) is not int or not 5 <= minutes <= 1440:
        raise ValueError("duration_minutes must be an integer between 5 and 1440")
    try:
        scheduled + timedelta(minutes=minutes)
    except OverflowError as exc:
        raise ValueError("action plan end time exceeds the supported date range") from exc
    return {
        "scheduled_at": scheduled.isoformat().replace("+00:00", "Z"),
        "duration_minutes": minutes,
        "location": _text(value["location"], "location", 160),
        "success_criteria": _text(value["success_criteria"], "success_criteria", 500),
    }


def _escape_text(value):
    # Normalize line breaks before escaping so CR cannot inject a content line.
    return (value.replace("\r\n", "\n").replace("\r", "\n")
            .replace("\\", "\\\\").replace("\n", "\\n")
            .replace(";", "\\;").replace(",", "\\,"))


def _fold_line(value):
    """Fold at 75 UTF-8 octets, keeping each Unicode code point intact."""
    lines, line, octets = [], "", 0
    for character in value:
        count = len(character.encode("utf-8"))
        if octets + count > 75:
            lines.append(line)
            line, octets = " ", 1  # RFC continuation space counts toward the limit.
        line += character
        octets += count
    lines.append(line)
    return "\r\n".join(lines)


def _ical_datetime(value):
    # RFC 5545 DATE-TIME has whole-second precision and no numeric UTC offsets.
    utc = value.astimezone(timezone.utc)
    return f"{utc.year:04d}{utc.month:02d}{utc.day:02d}T{utc.hour:02d}{utc.minute:02d}{utc.second:02d}Z"


def action_calendar(action, viewer_id, *, now=None) -> str:
    """Export the viewer's own accepted plan without sending any invitation."""
    if not isinstance(action, Mapping) or action.get("kind") != "action":
        raise ValueError("calendar export requires an action")
    viewer = _text(viewer_id, "viewer_id")
    decisions = action.get("decisions")
    decision = decisions.get(viewer) if isinstance(decisions, Mapping) else None
    if not isinstance(decision, Mapping) or decision.get("status") != "accepted":
        raise ValueError("calendar export requires the viewer's own acceptance")
    action_id = _text(action.get("id"), "action.id")
    title = _text(action.get("title"), "action.title", 160)
    plan = validate_action_plan(action.get("plan"))
    start = _datetime(plan["scheduled_at"])
    end = start + timedelta(minutes=plan["duration_minutes"])
    stamp = datetime.now(timezone.utc) if now is None else now
    if not isinstance(stamp, datetime) or stamp.tzinfo is None or stamp.utcoffset() is None:
        raise ValueError("now must be a timezone-aware datetime")
    try:
        stamp = stamp.astimezone(timezone.utc)
    except (ValueError, OverflowError) as exc:
        raise ValueError("now must be a valid timezone-aware datetime") from exc

    # A JSON pair prevents collisions from separators embedded in either ID.
    uid = sha256(json.dumps([action_id, viewer], ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()
    outcomes = action.get("outcomes")
    own_outcome = outcomes.get(viewer) if isinstance(outcomes, Mapping) else None
    status = "尚未反馈"
    if isinstance(own_outcome, Mapping) and own_outcome.get("report_kind") == "self_report":
        status = {"completed": "已完成（本人自述）", "not_completed": "未完成（本人自述）"}.get(
            own_outcome.get("result"), "尚无有效反馈")
    description = (
        "这是你本人接受的行动计划；日历条目不代表已出席或已完成。\n"
        f"成功标准：{plan['success_criteria']}\n"
        f"本人反馈：{status}。出席和完成情况未经独立核验。"
    )
    lines = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MeetMind//Personal Action Plan//ZH-CN",
        "CALSCALE:GREGORIAN", "BEGIN:VEVENT", f"UID:{uid}@meetmind.local",
        f"DTSTAMP:{_ical_datetime(stamp)}", f"DTSTART:{_ical_datetime(start)}",
        f"DTEND:{_ical_datetime(end)}", f"SUMMARY:{_escape_text(title)}",
        f"LOCATION:{_escape_text(plan['location'])}", f"DESCRIPTION:{_escape_text(description)}",
        "END:VEVENT", "END:VCALENDAR",
    ]
    return "\r\n".join(_fold_line(line) for line in lines) + "\r\n"
