"""Sparse server-owned activations for v1 room PersonAgents."""

from __future__ import annotations

from app.agents.contracts import EventEnvelope


class RoomAutonomyService:
    """Activate one NPC per room and heartbeat through the normal Agent boundary."""

    def __init__(self, room_service, coordinator):
        self._rooms = room_service
        self._coordinator = coordinator
        self._cycle = 0

    async def tick_once(self) -> list[dict]:
        self._cycle += 1
        produced = []
        for room_id in self._rooms.room_ids():
            snapshot = self._rooms.snapshot(room_id)
            agents = [
                item["agent_id"] for item in snapshot.get("agent_runtime", [])
                if item.get("agent_id") in {
                    member["member_id"] for member in snapshot.get("members", [])
                }
            ]
            if len(agents) < 2 or snapshot.get("meeting") is not None:
                continue
            agent_id = sorted(agents)[(self._cycle - 1) % len(agents)]
            raw = self._rooms.request_agent_turn(
                room_id, agent_id, cycle=self._cycle,
            )
            produced.extend(await self._coordinator.process(
                EventEnvelope.model_validate(raw)
            ))
        return produced
