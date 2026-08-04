"""Stateless Person Agent; identity lives in context, not a Python process."""

from app.agents.contracts import AgentDecision, Intent


class PersonAgent:
    def __init__(self, person_id: str):
        self.agent_id = person_id
        self.subscriptions = frozenset({"person.message-requested"})

    async def handle(self, event, context):
        if event.subject_id != self.agent_id or not event.actor_id:
            return AgentDecision()
        prompt = str(event.payload.get("prompt") or "你好").strip()[:160]
        return AgentDecision(intents=(Intent(
            type="talk", actor_id=self.agent_id, room_id=event.room_id,
            target_id=event.actor_id,
            payload={"text": f"关于“{prompt}”，很高兴和你聊聊。"},
        ),))
