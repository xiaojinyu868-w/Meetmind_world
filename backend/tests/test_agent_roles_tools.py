"""Role activation, read-only Tool boundary, and declarative Skill loading."""

import asyncio
from pathlib import Path

import pytest

from app.agents.contracts import AgentContext, ContextFact, EventEnvelope, PrivacyLevel
from app.agents.llm.base import LLMResponse
from app.agents.roles import BulletinComposerAgent, IcebreakerHostAgent, RoundtableFacilitatorAgent
from app.agents.runtime import AgentRuntime, EventBus
from app.agents.tools import EventSummaryTool, ToolRegistry, ToolResult, ToolSpec
from app.skills import SkillRegistry


def _context(event, facts=()):
    return AgentContext(
        agent_id="system.bulletin", room_id=event.room_id, trigger_event=event,
        facts=facts,
        allowed_privacy_levels=frozenset({PrivacyLevel.PUBLIC, PrivacyLevel.ROOM}),
    )


def test_bulletin_and_icebreaker_agents_emit_intents_not_commands():
    ended = EventEnvelope(
        type="meeting.ended", room_id="room-a",
        payload={"meeting_id": "m1", "topic": "关系", "participant_ids": ["a", "b"]},
    )
    decision = asyncio.run(BulletinComposerAgent().handle(ended, _context(ended)))
    assert decision.intents[0].type == "publish_bulletin"
    assert decision.intents[0].payload["source_event_ids"] == [ended.event_id]

    requested = EventEnvelope(
        type="icebreaker.requested", room_id="room-a", actor_id="a",
        payload={"participant_ids": ["a", "b"]},
    )
    host_context = _context(requested).model_copy(
        update={"agent_id": IcebreakerHostAgent.agent_id}
    )
    hosted = asyncio.run(IcebreakerHostAgent().handle(requested, host_context))
    assert hosted.intents[0].type == "start_icebreaker"
    assert hosted.intents[0].payload["requested_by"] == "a"


def test_tool_registry_rejects_side_effects_and_hidden_sources():
    class WriteTool:
        spec = ToolSpec(
            name="write", version="1.0.0", description="forbidden", read_only=False,
        )

    registry = ToolRegistry()
    with pytest.raises(ValueError, match="read_only"):
        registry.register(WriteTool())

    class HiddenTool:
        spec = ToolSpec(name="hidden", version="1.0.0", description="test")

        async def invoke(self, context, arguments):
            return ToolResult(data={}, source_refs=("facts/hidden",))

    registry.register(HiddenTool())
    event = EventEnvelope(type="test", room_id="room-a")
    context = _context(event, facts=(ContextFact(source_ref="facts/visible"),))
    with pytest.raises(PermissionError, match="outside Agent context"):
        asyncio.run(registry.invoke("hidden", "1.0.0", context, {}))

    registry.register(EventSummaryTool())
    summary = asyncio.run(registry.invoke(
        "event-summary", "1.0.0", context,
        {"events": [{"type": "meeting.started"}, {"type": "meeting.ended"}]},
    ))
    assert summary.data["event_count"] == 2


def test_all_versioned_skill_manifests_load():
    registry = SkillRegistry()
    definitions = Path(__file__).parents[1] / "app" / "skills" / "definitions"
    loaded = registry.load_directory(definitions)
    assert {item.name for item in loaded} == {"bulletin", "icebreaker", "roundtable"}
    assert registry.get("roundtable").allowed_intents == (
        "propose_topic", "speak_roundtable", "report_roundtable_status",
    )


def test_roundtable_reuses_original_meeting_runtime_chain():
    class FakeChat:
        config = {"configured": True}
        model = "test-chat"

        def chat(self, _messages, **_kwargs):
            return LLMResponse(
                text='{"lines":[{"speaker":"bob","text":"我先分享一个具体进展。"}]}',
                model=self.model,
                mock=False,
            )

    event = EventEnvelope(
        type="meeting.started", room_id="room-a", actor_id="alice",
        payload={
            "meeting_id": "meeting-1", "topic": "下一步",
            "participant_ids": ["alice", "bob", "carol"],
        },
    )
    context = AgentContext(
        agent_id="system.facilitator", room_id="room-a", trigger_event=event,
        room_state={"meeting": {
            "meeting_id": "meeting-1", "organizer_id": "alice",
            "topic": "下一步", "participant_ids": ["alice", "bob", "carol"],
            "messages": [],
        }},
        allowed_privacy_levels=frozenset({PrivacyLevel.PUBLIC, PrivacyLevel.ROOM}),
    )
    runtime = AgentRuntime(EventBus(), chat_provider=FakeChat(), memory=None)
    decision = asyncio.run(RoundtableFacilitatorAgent(
        meeting_runtime=runtime,
    ).handle(event, context))
    assert [intent.type for intent in decision.intents] == [
        "propose_topic", "speak_roundtable",
    ]
    assert decision.intents[1].payload == {
        "meeting_id": "meeting-1", "speaker_id": "bob",
        "text": "我先分享一个具体进展。",
        "generated_by": "llm", "model": "test-chat",
    }
    assert decision.model_metadata["mock"] is False
    assert decision.model_metadata["generated_by"] == "llm"

    class UnconfiguredChat:
        config = {"configured": False}
        model = "not-configured"

    fallback_runtime = AgentRuntime(
        EventBus(), chat_provider=UnconfiguredChat(), memory=None,
    )
    fallback = asyncio.run(RoundtableFacilitatorAgent(
        meeting_runtime=fallback_runtime,
    ).handle(event, context))
    assert [intent.type for intent in fallback.intents] == [
        "propose_topic", "speak_roundtable", "speak_roundtable",
    ]
    assert fallback.model_metadata["generated_by"] == "template"
    assert fallback.model_metadata["mock"] is True
