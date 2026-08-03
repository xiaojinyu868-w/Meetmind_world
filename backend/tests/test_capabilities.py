"""上下文量能功能开关：阈值、暂缓状态、API 与运行时强制执行。"""

from fastapi.testclient import TestClient

from app.capabilities import CapabilityService
from app.main import create_app
from app.packages.store import PackageStore


def add_confirmed_package(store: PackageStore, person_id: str, *, inferred: bool = False) -> None:
    store.create_draft_package(person_id, {})
    store.confirm_identity(person_id, person_id)
    if not inferred:
        return
    fact_ref = store.write_fact(person_id, "enc_01", "note.v1.md", b"context")
    package = store.load_package(person_id)
    package["encounters"].append({
        "encounter_id": "enc_01",
        "time": "2026-08-04T10:00:00+08:00",
        "facts": {"media": [], "transcript": None, "photos": []},
        "inferences": [{
            "id": "inf_01",
            "type": "interest-tag",
            "value": "产品",
            "source_facts": [fact_ref],
            "model": "test.v1",
            "confidence": 0.9,
            "created_at": "2026-08-04T10:00:00+08:00",
        }],
        "privacy": "agent-usable",
    })
    store.save_package(package)


def test_package_thresholds_and_deferred_rollout(tmp_path):
    store = PackageStore(tmp_path)
    service = CapabilityService(store)

    empty = service.snapshot()
    assert empty["schema"] == "echo-capabilities.v1"
    assert empty["capabilities"]["base.world_browse"]["enabled"] is False
    assert service.enabled("unknown.capability") is False

    for index in range(10):
        add_confirmed_package(store, f"person-{index}", inferred=True)
    ready = service.snapshot()
    assert ready["metrics"]["confirmed_package_count"] == 10
    assert ready["metrics"]["inference_coverage"] == 1.0
    assert ready["capabilities"]["agent.interaction"]["enabled"] is True
    assert ready["capabilities"]["agent.roundtable"]["enabled"] is True
    # 达到数据条件也不能越过产品暂缓状态。
    matching = ready["capabilities"]["value.matching"]
    assert matching["eligible"] is True
    assert matching["enabled"] is False
    assert matching["status"] == "deferred"


def test_drafts_do_not_unlock_and_group_context_is_independent(tmp_path):
    store = PackageStore(tmp_path)
    for index in range(10):
        store.create_draft_package(f"draft-{index}", {})
    service = CapabilityService(store)
    snapshot = service.snapshot(group_participants=4)
    assert snapshot["metrics"]["total_package_count"] == 10
    assert snapshot["metrics"]["confirmed_package_count"] == 0
    assert snapshot["capabilities"]["agent.interaction"]["enabled"] is False
    assert snapshot["capabilities"]["group.icebreaker"]["enabled"] is False

    group_ready = service.snapshot(group_participants=5)
    assert group_ready["capabilities"]["group.impressions"]["enabled"] is True
    assert group_ready["capabilities"]["group.presence"]["enabled"] is True
    assert group_ready["capabilities"]["group.icebreaker"]["enabled"] is True
    assert group_ready["capabilities"]["network.cross_user"]["enabled"] is False


def test_capabilities_api_and_runtime_enforcement(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    client = TestClient(create_app())

    response = client.get("/api/v0/capabilities")
    assert response.status_code == 200
    snapshot = response.json()
    assert snapshot["metrics"]["confirmed_package_count"] == 6
    assert snapshot["capabilities"]["base.package_view"]["enabled"] is True
    assert snapshot["capabilities"]["agent.interaction"]["enabled"] is False

    group = client.get("/api/v0/capabilities", params={"group_participants": 5}).json()
    assert group["capabilities"]["group.icebreaker"]["enabled"] is True
    assert client.get(
        "/api/v0/capabilities", params={"group_participants": 9}
    ).status_code == 422

    # 6 个种子 Package 时即使概率拉满，也不能发生 Agent 间访问或会议。
    client.app.state.hall_runtime.visit_probability = 1.0
    for _ in range(8):
        hall = client.get(
            "/api/v0/world/snapshot",
            params={"world": "hall", "advance": 1},
        ).json()
    assert hall["events"] == []
    for _ in range(24):
        cafe = client.get("/api/v0/world/snapshot", params={"advance": 1}).json()
    forbidden = {"agent-talk", "meeting-started", "meeting-ended"}
    assert not forbidden.intersection(event["type"] for event in cafe["events"])

    # 累积到 10 个已确认 Package 后，服务与调度器在下一 tick 自动解锁。
    for index in range(4):
        add_confirmed_package(client.app.state.store, f"extra-{index}")
    unlocked = client.get("/api/v0/capabilities").json()
    assert unlocked["capabilities"]["agent.interaction"]["enabled"] is True
    for _ in range(8):
        hall = client.get(
            "/api/v0/world/snapshot",
            params={"world": "hall", "advance": 1},
        ).json()
    assert any(event["type"] == "agent-talk" for event in hall["events"])
