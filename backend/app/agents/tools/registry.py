"""Static Tool registry; side-effecting tools are rejected by construction."""

import asyncio

from app.agents.tools.base import ToolResult


class ToolRegistry:
    def __init__(self):
        self._tools = {}

    def register(self, tool) -> None:
        spec = getattr(tool, "spec", None)
        if spec is None or not spec.read_only:
            raise ValueError("Agent tools must declare read_only=true")
        key = f"{spec.name}@{spec.version}"
        if key in self._tools:
            raise ValueError(f"tool already registered: {key}")
        self._tools[key] = tool

    def get(self, name: str, version: str) -> object:
        try:
            return self._tools[f"{name}@{version}"]
        except KeyError as exc:
            raise KeyError(f"unknown tool: {name}@{version}") from exc

    async def invoke(self, name: str, version: str, context, arguments: dict) -> ToolResult:
        tool = self.get(name, version)
        result = await asyncio.wait_for(
            tool.invoke(context, arguments), timeout=tool.spec.timeout_seconds,
        )
        if not isinstance(result, ToolResult):
            raise TypeError("Tool must return ToolResult")
        hidden = set(result.source_refs) - context.visible_fact_refs
        if hidden:
            raise PermissionError("Tool returned source refs outside Agent context")
        return result

    def list(self) -> tuple:
        return tuple(tool.spec for _, tool in sorted(self._tools.items()))
