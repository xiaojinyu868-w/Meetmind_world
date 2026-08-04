"""Deterministic fallback summarizer for committed room events."""

from app.agents.tools.base import ToolResult, ToolSpec


class EventSummaryTool:
    spec = ToolSpec(
        name="event-summary", version="1.0.0",
        description="Summarize committed event types without changing state.",
    )

    async def invoke(self, context, arguments):
        events = arguments.get("events") or []
        types = [str(item.get("type")) for item in events if isinstance(item, dict)]
        return ToolResult(data={
            "text": "、".join(types[:10]) if types else "暂无新事件",
            "event_count": len(types),
        })
