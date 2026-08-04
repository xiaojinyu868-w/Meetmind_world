"""Icebreaker host proposes content; RoomService remains the game authority."""

from app.agents.contracts import AgentDecision, Intent


class IcebreakerHostAgent:
    agent_id = "system.icebreaker-host"
    subscriptions = frozenset({"icebreaker.requested"})

    async def handle(self, event, context):
        prompt = str(
            event.payload.get("prompt") or "用三个词描述今天认识的一位伙伴"
        ).strip()[:300]
        return AgentDecision(
            intents=(Intent(
                type="start_icebreaker", actor_id=self.agent_id,
                room_id=event.room_id,
                payload={
                    "session_id": event.payload.get("session_id"),
                    "requested_by": event.actor_id,
                    "participant_ids": event.payload.get("participant_ids") or [],
                    "game_type": event.payload.get("game_type") or "three-words",
                    "prompt": prompt,
                },
            ),),
            model_metadata={"model": "icebreaker-template.v1", "mock": True},
        )
