"""Snapshot reads are pure; legacy simulation advances on server heartbeat."""

from fastapi.testclient import TestClient

from app.main import create_app


def test_snapshot_is_pure_by_default_and_explicit_legacy_advance_remains(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    client = TestClient(create_app())

    first = client.get("/api/v0/world/snapshot").json()
    second = client.get("/api/v0/world/snapshot").json()
    assert second["tick"] == first["tick"]

    advanced = client.get("/api/v0/world/snapshot", params={"advance": 1}).json()
    assert advanced["tick"] == first["tick"] + 1


def test_server_scheduler_advances_cafe_and_sparsely_advances_hall(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    app = create_app()
    scheduler = app.state.world_scheduler
    cafe_tick = app.state.world.tick
    hall_tick = app.state.hall.tick

    for _ in range(scheduler.hall_every):
        scheduler.tick_once()

    assert app.state.world.tick == cafe_tick + scheduler.hall_every
    assert app.state.hall.tick == hall_tick + 1
