"""FR-2.9 世界播报与每日晨报。"""

from copy import deepcopy
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.packages.store import PackageStore
from app.schemas.snapshot_schema import SnapshotSchemaError, validate_snapshot
from app.world.broadcast import BroadcastService
from app.world.seed import seed_demo_packages


def test_broadcast_persists_events_and_builds_next_day_report(tmp_path):
    store = PackageStore(tmp_path / "data")
    seed_demo_packages(store)
    now = [datetime(2026, 8, 3, 1, tzinfo=UTC)]
    service = BroadcastService(store, tmp_path / "journal.jsonl", clock=lambda: now[0])
    snapshot = {
        "events": [{"type": "agent-talk", "agent_id": "lin-che",
                    "to_agent_id": "zhou-ning", "text": "周末一起看展吗？", "tick": 7}],
    }
    first = service.enrich(snapshot, "cafe")
    assert first["broadcast"]["ticker"][0]["text"] == "谢淯琪 和 曾英杰 聊起了「周末一起看展吗？」"
    service.enrich(snapshot, "cafe")
    assert len((tmp_path / "journal.jsonl").read_text(encoding="utf-8").splitlines()) == 1

    now[0] = datetime(2026, 8, 4, 1, tzinfo=UTC)
    morning = service.enrich({"events": []}, "cafe")["broadcast"]["morning"]
    assert morning["date"] == "2026-08-04"
    assert morning["period"] == "2026-08-03"
    assert morning["world_events"] == 1
    assert morning["new_encounters"] == 0
    assert "周末一起看展吗" in morning["items"][0]


def test_new_confirmed_encounter_enters_ticker_and_following_report(tmp_path):
    store = PackageStore(tmp_path / "data")
    seed_demo_packages(store)
    now = [datetime(2026, 8, 4, 2, tzinfo=UTC)]
    service = BroadcastService(store, tmp_path / "journal.jsonl", clock=lambda: now[0])

    package = deepcopy(store.load_package("lin-che"))
    package["person_id"] = "new-person"
    package["identity"]["name"] = "新朋友"
    package["encounters"][0]["encounter_id"] = "enc_new"
    store.save_package(package)
    broadcast = service.enrich({"events": []}, "hall")["broadcast"]
    assert broadcast["ticker"][-1]["type"] == "encounter-confirmed"
    assert broadcast["ticker"][-1]["text"] == "新相遇已进入世界：新朋友"

    now[0] = datetime(2026, 8, 5, 2, tzinfo=UTC)
    morning = service.enrich({"events": []}, "hall")["broadcast"]["morning"]
    assert morning["new_encounters"] == 1
    assert morning["world_events"] == 0


def test_world_api_returns_valid_broadcast_contract():
    client = TestClient(create_app())
    snapshot = client.get("/api/v0/world/snapshot?advance=1&world=cafe").json()
    assert snapshot["broadcast"]["schema"] == "echo-broadcast.v1"
    assert validate_snapshot(snapshot) is snapshot


def test_invalid_broadcast_contract_is_rejected():
    client = TestClient(create_app())
    snapshot = client.get("/api/v0/world/snapshot?advance=0").json()
    snapshot["broadcast"]["ticker"] = [{"id": "bad"}]
    with pytest.raises(SnapshotSchemaError):
        validate_snapshot(snapshot)
