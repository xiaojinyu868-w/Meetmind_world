"""Roundtable facilitator adapts Room v1 events to the original meeting runtime."""

import asyncio

from app.agents.contracts import AgentDecision, Intent


class RoundtableFacilitatorAgent:
    agent_id = "system.facilitator"
    subscriptions = frozenset({"meeting.started", "meeting.message-requested"})

    def __init__(self, *, meeting_runtime=None):
        self._meeting_runtime = meeting_runtime

    async def handle(self, event, context):
        meeting = context.room_state.get("meeting") or {}
        meeting_id = event.payload.get("meeting_id") or meeting.get("meeting_id")
        topic = str(event.payload.get("topic") or meeting.get("topic") or "本次圆桌").strip()[:120]
        organizer_id = meeting.get("organizer_id") or event.actor_id
        participants = list(event.payload.get("participant_ids") or meeting.get("participant_ids") or [])
        agent_ids = [person_id for person_id in participants if person_id != organizer_id]
        intents = []

        if event.type == "meeting.started":
            intents.append(Intent(
                type="propose_topic", actor_id=self.agent_id,
                room_id=event.room_id,
                payload={
                    "meeting_id": meeting_id,
                    "text": f"本场议题：{topic}",
                    "participant_count": len(participants),
                },
            ))

        result = None
        if not agent_ids:
            unavailable_reason = "圆桌里至少需要两位可发言的关系 Agent。"
        elif self._meeting_runtime is None:
            unavailable_reason = "原圆桌运行时不可用，已停止生成。"
        elif len(agent_ids) < 2:
            unavailable_reason = "圆桌里至少需要两位可发言的关系 Agent。"
        else:
            messages = list(meeting.get("messages", []))
            player_message = None
            if event.type == "meeting.message-requested":
                player_message = str(event.payload.get("text") or "").strip()
                # RoomService 已先把玩家消息写入 active_meeting；原链路则把它
                # 单独放在 player_message 中。本轮剔除最后一条，避免 prompt 重复。
                if messages and (
                    messages[-1].get("speaker_id") == event.payload.get("speaker_id")
                    and messages[-1].get("text") == player_message
                ):
                    messages.pop()
            transcript = [
                (item.get("speaker_id"), item.get("text"))
                for item in messages
                if item.get("speaker_id") and item.get("text")
            ]
            result = await asyncio.to_thread(
                self._meeting_runtime.generate_user_meeting_turn,
                agent_ids,
                topic=topic,
                transcript=transcript,
                player_message=player_message,
                round_index=len(messages),
            )
            unavailable_reason = None if result["lines"] else "原圆桌链路没有生成有效发言。"

        if result and result["lines"]:
            for speaker_id, text in result["lines"]:
                intents.append(Intent(
                    type="speak_roundtable", actor_id=self.agent_id,
                    room_id=event.room_id,
                    payload={
                        "meeting_id": meeting_id,
                        "speaker_id": speaker_id,
                        "text": text,
                        "generated_by": result["generated_by"],
                        "model": result["model"],
                    },
                ))
        elif unavailable_reason:
            intents.append(Intent(
                type="report_roundtable_status", actor_id=self.agent_id,
                room_id=event.room_id,
                payload={
                    "meeting_id": meeting_id,
                    "status": "generation-unavailable",
                    "text": unavailable_reason,
                },
            ))

        return AgentDecision(
            intents=tuple(intents),
            model_metadata={
                "model": result["model"] if result else "roundtable-runtime.v1",
                "mock": bool(result and result["generated_by"] == "template"),
                "generated": bool(result and result["lines"]),
                "generated_by": result["generated_by"] if result else "none",
            },
        )
