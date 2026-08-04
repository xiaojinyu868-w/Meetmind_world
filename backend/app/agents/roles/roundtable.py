"""Roundtable facilitator generates wording, never meeting state."""

from app.agents.contracts import AgentDecision, Intent


class RoundtableFacilitatorAgent:
    agent_id = "system.facilitator"
    subscriptions = frozenset({"meeting.started"})

    async def handle(self, event, context):
        topic = str(event.payload.get("topic") or "本次圆桌").strip()[:120]
        participants = event.payload.get("participant_ids") or []
        prompt = f"围绕“{topic}”，请每位参与者先分享一个真实经历。"
        return AgentDecision(
            intents=(Intent(
                type="propose_topic", actor_id=self.agent_id,
                room_id=event.room_id,
                payload={
                    "meeting_id": event.payload.get("meeting_id"),
                    "text": prompt, "participant_count": len(participants),
                },
            ),),
            model_metadata={"model": "roundtable-template.v1", "mock": True},
        )
