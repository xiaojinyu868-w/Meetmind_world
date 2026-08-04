"""Stateless Person Agent; all usable identity and memory arrives via context."""

import math

from app.agents.contracts import AgentDecision, Intent
from app.agents.dialogue import llm_dialogue, template_dialogue


class PersonAgent:
    def __init__(self, person_id: str, *, chat_provider=None):
        self.agent_id = person_id
        self.subscriptions = frozenset({
            "person.message-requested", "meeting.invited",
            "agent.autonomy-requested",
        })
        self._chat = chat_provider

    async def handle(self, event, context):
        if event.type == "meeting.invited":
            if self.agent_id == event.actor_id or self.agent_id not in (
                event.payload.get("participant_ids") or []
            ):
                return AgentDecision()
            return AgentDecision(intents=(Intent(
                type="respond_meeting", actor_id=self.agent_id,
                room_id=event.room_id,
                payload={
                    "invitation_id": event.payload.get("invitation_id"),
                    "response": "accepted",
                },
            ),), model_metadata={"model": "meeting-rsvp-policy.v1", "mock": True})

        if event.type == "agent.autonomy-requested":
            return self._autonomy_decision(context)

        if event.subject_id != self.agent_id or not event.actor_id:
            return AgentDecision()
        prompt = str(event.payload.get("prompt") or "你好").strip()[:500]
        pair, evidence_refs = self._pair_context(context, event.actor_id)
        pair["current_message"] = prompt
        conversation_id = event.payload.get("conversation_id")
        conversation = next((item for item in context.room_state.get("conversations", [])
                             if item.get("conversation_id") == conversation_id), None)
        history = list((conversation or {}).get("messages") or [])
        if history and history[-1].get("sequence") == event.sequence:
            history.pop()
        pair["conversation_history"] = history[-8:]
        text = None
        model_metadata = {"model": "person-template.v1", "mock": True}
        if self._chat is not None and self._chat.config.get("configured"):
            generated = llm_dialogue(self._chat, pair, max_lines=1)
            if generated and generated["lines"]:
                speaker, text = generated["lines"][0]
                if speaker == "B":
                    text = None
                else:
                    model_metadata = {"model": self._chat.model, "mock": False}
        if not text:
            lines = template_dialogue(pair, self.agent_id, event.actor_id)
            text = next((line[2] for line in lines if line[0] == self.agent_id), None)
        if not text:
            text = f"关于“{prompt[:80]}”，我想再听你多说一点。"
        return AgentDecision(intents=(Intent(
            type="talk", actor_id=self.agent_id, room_id=event.room_id,
            target_id=event.actor_id,
            payload={
                "text": text,
                "target_id": event.actor_id,
                "conversation_id": event.payload.get("conversation_id"),
            },
            evidence_refs=evidence_refs,
        ),), model_metadata=model_metadata)

    def _autonomy_decision(self, context):
        if context.room_state.get("meeting") is not None:
            return AgentDecision()
        members = context.room_state.get("members") or []
        actor = next((item for item in members if item.get("member_id") == self.agent_id), None)
        candidates = [item for item in members
                      if item.get("member_id") not in {self.agent_id, "person-self"}]
        if actor is None or not candidates:
            return AgentDecision()
        relationships = context.room_state.get("relationships") or []
        counts = {}
        for relation in relationships:
            participants = relation.get("participant_ids") or []
            if self.agent_id in participants:
                other = next((item for item in participants if item != self.agent_id), None)
                if other:
                    counts[other] = int(relation.get("interaction_count") or 0)
        origin = actor.get("position") or {}
        candidates.sort(key=lambda item: (
            counts.get(item.get("member_id"), 0),
            math.hypot(float((item.get("position") or {}).get("x") or 0) - float(origin.get("x") or 0),
                       float((item.get("position") or {}).get("z") or 0) - float(origin.get("z") or 0)),
            item.get("member_id") or "",
        ))
        target = candidates[0]
        target_id = target["member_id"]
        target_position = target.get("position") or {}
        distance = math.hypot(
            float(target_position.get("x") or 0) - float(origin.get("x") or 0),
            float(target_position.get("z") or 0) - float(origin.get("z") or 0),
        )
        if distance > 2.4:
            return AgentDecision(intents=(Intent(
                type="visit", actor_id=self.agent_id, room_id=context.room_id,
                target_id=target_id, payload={"target_id": target_id},
            ),), model_metadata={"model": "social-goal-policy.v1", "mock": True})

        pair, evidence_refs = self._pair_context(context, target_id)
        lines = template_dialogue(pair, self.agent_id, target_id)
        text = next((line[2] for line in lines if line[0] == self.agent_id),
                    "最近怎么样？")
        return AgentDecision(intents=(Intent(
            type="initiate_talk", actor_id=self.agent_id, room_id=context.room_id,
            target_id=target_id,
            payload={"target_id": target_id, "text": text},
            evidence_refs=evidence_refs,
        ),), model_metadata={"model": "social-goal-policy.v1", "mock": True})

    @staticmethod
    def _pair_context(context, counterpart_id):
        for fact in context.facts:
            payload = fact.payload
            if payload.get("kind") == "authorized-pair" and (
                payload.get("counterpart_id") == counterpart_id
            ):
                return dict(payload.get("pair_context") or {}), (fact.source_ref,)
        return {
            "A": {"person_id": context.agent_id, "name": context.agent_id, "tags": []},
            "B": {"person_id": counterpart_id, "name": counterpart_id, "tags": []},
            "shared_context": {
                "common_tags": [], "relation_note": None,
                "relation_keywords": [], "last_interaction_at": None,
            },
        }, ()
