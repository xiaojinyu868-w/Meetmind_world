"""Small versioned wire protocol for room WebSocket streams."""

from typing import Any

STREAM_POLL_SECONDS = 0.05


def event_frame(event: dict[str, Any]) -> dict[str, Any]:
    return {"type": "event", "protocol": "meetmind.rooms.v1", "event": event}


def error_frame(code: str, message: str) -> dict[str, Any]:
    return {
        "type": "error",
        "protocol": "meetmind.rooms.v1",
        "error": {"code": code, "message": message},
    }
