"""Single-node SQLite recovery and command idempotency tests."""

from app.agents.contracts import EventEnvelope
from app.domain.rooms import RoomService
from app.persistence import SQLiteEventStore, SQLiteRoomRepository


def test_sqlite_event_store_persists_order_and_idempotency(tmp_path):
    path = tmp_path / "runtime.sqlite3"
    first_store = SQLiteEventStore(path)
    first = first_store.append(EventEnvelope(event_id="e1", type="room.created", room_id="r"))
    assert first.sequence == 1
    first_store.close()

    second_store = SQLiteEventStore(path)
    assert second_store.latest_sequence("r") == 1
    assert second_store.append(
        EventEnvelope(event_id="e1", type="room.created", room_id="r")
    ).sequence == 1
    assert second_store.append(
        EventEnvelope(event_id="e2", type="member.joined", room_id="r")
    ).sequence == 2
    assert [item.event_id for item in second_store.replay("r")] == ["e1", "e2"]
    second_store.close()


def test_room_snapshot_and_command_receipt_recover_after_restart(tmp_path):
    path = tmp_path / "runtime.sqlite3"
    events = SQLiteEventStore(path)
    states = SQLiteRoomRepository(path)
    service = RoomService(event_store=events, state_repository=states)
    service.create_room(room_id="room-a", name="Persistent room")
    service.join_room("room-a", member_id="alice", display_name="Alice")
    original = service.execute(
        "room-a", command_id="move-1", actor_id="alice",
        command_type="member.move", payload={"x": 1.25, "z": -0.5},
    )
    events.close()
    states.close()

    restored_events = SQLiteEventStore(path)
    restored_states = SQLiteRoomRepository(path)
    restored = RoomService(event_store=restored_events, state_repository=restored_states)
    snapshot = restored.snapshot("room-a")
    assert snapshot["members"][0]["position"] == {"x": 1.25, "z": -0.5}
    assert snapshot["sequence"] == original["sequence"]
    replay = restored.execute(
        "room-a", command_id="move-1", actor_id="alice",
        command_type="member.move", payload={"x": 1.25, "z": -0.5},
    )
    assert replay["replayed"] is True
    assert replay["events"] == original["events"]
    assert len(restored.events_after("room-a")) == snapshot["sequence"]
    restored_events.close()
    restored_states.close()
