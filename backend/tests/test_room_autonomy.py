import asyncio

from app.agents.contracts import EventEnvelope, PrivacyLevel
from app.agents.room_autonomy import RoomAutonomyService
from app.agents.roles.person import PersonAgent
from app.agents.runtime_v2 import AgentCoordinator, AgentRouter, ContextBuilder
from app.application import CommandValidator
from app.domain.rooms import RoomService


def _runtime():
    rooms = RoomService()
    rooms.create_room(room_id="demo", name="Demo")
    builder = ContextBuilder(
        room_provider=lambda _agent, event: rooms.snapshot(event.room_id),
        privacy_resolver=lambda _agent, _event: {
            PrivacyLevel.PUBLIC, PrivacyLevel.ROOM,
        },
        targets_provider=lambda _agent, event: {
            member["member_id"] for member in rooms.snapshot(event.room_id)["members"]
        },
    )

    def factory(event):
        if event.type in {"person.message-requested", "agent.autonomy-requested"}:
            ids = [event.subject_id] if event.subject_id else []
        elif event.type == "meeting.invited":
            ids = [item for item in event.payload["participant_ids"]
                   if item != event.actor_id]
        else:
            ids = []
        return tuple(PersonAgent(item) for item in ids)

    router = AgentRouter(builder, agent_factory=factory)
    coordinator = AgentCoordinator(
        router, builder, CommandValidator(),
        lambda command: rooms.execute(
            command.room_id, command_id=command.command_id,
            actor_id=command.actor_id, command_type=command.type,
            payload=command.payload, expected_revision=command.expected_revision,
        ),
    )
    return rooms, coordinator


def test_server_autonomy_creates_a_two_turn_conversation_and_relationship_projection():
    rooms, coordinator = _runtime()
    rooms.join_room("demo", member_id="agent-a", display_name="甲", position={"x": 0, "z": 0})
    rooms.join_room("demo", member_id="agent-b", display_name="乙", position={"x": 1, "z": 0})

    produced = asyncio.run(RoomAutonomyService(rooms, coordinator).tick_once())
    assert [event["type"] for event in produced] == [
        "person.message-requested", "person.message-created",
    ]
    snapshot = rooms.snapshot("demo")
    conversation = snapshot["conversations"][0]
    assert conversation["turn_count"] == 2
    assert [item["speaker_id"] for item in conversation["messages"]] == [
        "agent-a", "agent-b",
    ]
    relationship = snapshot["relationships"][0]
    assert relationship["conversation_turn_count"] == 2
    assert relationship["interaction_count"] == 2
    runtime = {item["agent_id"]: item for item in snapshot["agent_runtime"]}
    assert runtime["agent-a"]["last_action"] == "initiate-talk"
    assert runtime["agent-b"]["last_action"] == "reply"


def test_invited_person_agent_accepts_and_room_service_moves_it_to_roundtable():
    rooms, coordinator = _runtime()
    rooms.join_room("demo", member_id="person-self", display_name="我", position={"x": 0, "z": 0})
    rooms.join_room("demo", member_id="agent-a", display_name="甲", position={"x": 8, "z": 8})
    result = rooms.execute(
        "demo", command_id="invite", actor_id="person-self",
        command_type="meeting.invite",
        payload={"invitation_id": "invite-1", "participant_ids": ["agent-a"]},
    )
    event = EventEnvelope.model_validate(result["events"][0])
    generated = asyncio.run(coordinator.process(event))

    assert [item["type"] for item in generated] == [
        "meeting.invitation-responded", "member.moved",
    ]
    snapshot = rooms.snapshot("demo")
    assert snapshot["invitations"][0]["status"] == "accepted"
    agent = next(item for item in snapshot["members"] if item["member_id"] == "agent-a")
    assert agent["position"] != {"x": 8.0, "z": 8.0}
