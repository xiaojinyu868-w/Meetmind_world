"""Authorized PersonPackage memory lookup."""

from app.agents.tools.base import ToolResult, ToolSpec


class MemoryQueryTool:
    spec = ToolSpec(
        name="memory-query", version="1.0.0",
        description="Read the already-authorized memory view for one person.",
    )

    def __init__(self, memory):
        self._memory = memory

    async def invoke(self, context, arguments):
        person_id = str(arguments.get("person_id") or context.agent_id)
        if context.allowed_target_ids is not None and person_id not in (
            context.allowed_target_ids | {context.agent_id}
        ):
            raise PermissionError("person is outside authorized targets")
        return ToolResult(data={"memory": self._memory.authorized_agent_view(person_id)})
