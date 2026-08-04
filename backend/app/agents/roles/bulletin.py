"""Compose room-visible summaries from committed semantic events only."""

from app.agents.contracts import AgentDecision, Intent


class BulletinComposerAgent:
    agent_id = "system.bulletin"
    subscriptions = frozenset({"meeting.ended"})

    async def handle(self, event, context):
        participants = event.payload.get("participant_ids") or []
        topic = str(event.payload.get("topic") or "圆桌交流").strip()[:120]
        meeting_id = event.payload.get("meeting_id")
        text = f"圆桌“{topic}”已结束，共 {len(participants)} 人参与。"
        return AgentDecision(
            intents=(Intent(
                type="publish_bulletin", actor_id=self.agent_id,
                room_id=event.room_id,
                payload={
                    "bulletin_id": f"bulletin-{meeting_id}",
                    "meeting_id": meeting_id, "topic": topic,
                    "participant_ids": participants, "text": text,
                    "source_event_ids": [event.event_id],
                },
            ),),
            evidence_refs=(),
            model_metadata={"model": "bulletin-template.v1", "mock": True},
        )
