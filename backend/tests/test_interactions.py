"""场景热点契约与用户主动圆桌 API。"""

from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.snapshot_schema import SnapshotSchemaError, validate_snapshot


def test_snapshot_exposes_validated_scene_hotspots():
    client = TestClient(create_app())
    snapshot = client.get("/api/v0/world/snapshot?advance=0&world=cafe").json()
    hotspots = [module for module in snapshot["modules"] if module.get("interaction")]
    assert len(hotspots) == 5
    roundtable = next(module for module in hotspots if module["id"] == "roundtable-six")
    assert roundtable["interaction"]["primary"] == {
        "key": "E", "action": "context-menu", "label": "坐下",
    }
    assert roundtable["interaction"]["secondary"]["action"] == "meeting"
    assert validate_snapshot(snapshot) is snapshot


def test_invalid_hotspot_action_is_rejected():
    client = TestClient(create_app())
    snapshot = client.get("/api/v0/world/snapshot?advance=0").json()
    snapshot["modules"][1]["interaction"]["primary"]["action"] = "delete-world"
    try:
        validate_snapshot(snapshot)
    except SnapshotSchemaError as error:
        assert "Unsupported hotspot action" in str(error)
    else:
        raise AssertionError("invalid action should be rejected")


def test_user_can_start_and_end_roundtable():
    client = TestClient(create_app())
    response = client.post("/api/v0/agents/meeting", json={
        "topic": "下一次一起做什么",
        "participants": ["lin-che", "zhou-ning"],
    })
    assert response.status_code == 201
    body = response.json()
    assert body["accepted"] is True
    assert body["participants"] == ["lin-che", "zhou-ning"]

    snapshot = client.get("/api/v0/world/snapshot?advance=0").json()
    assert snapshot["meeting"]["topic"] == "下一次一起做什么"
    assert snapshot["meeting"]["initiated_by"] == "self"
    assert all(
        agent["state"] == "in-meeting"
        for agent in snapshot["agents"] if agent["id"] in body["participants"]
    )
    assert snapshot["events"][-1]["type"] == "meeting-started"

    conflict = client.post("/api/v0/agents/meeting", json={
        "topic": "另一场", "participants": ["chen-mo"],
    })
    assert conflict.status_code == 409

    ended = client.post(f"/api/v0/agents/meeting/{body['meeting_id']}/end")
    assert ended.status_code == 200
    snapshot = client.get("/api/v0/world/snapshot?advance=0").json()
    assert snapshot["meeting"] is None
    assert snapshot["events"][-1]["type"] == "meeting-ended"

    restarted = client.post("/api/v0/agents/meeting", json={
        "topic": "紧接着再聊", "participants": ["lin-che"],
    })
    assert restarted.status_code == 201
    assert restarted.json()["meeting_id"] != body["meeting_id"]
    client.post(f"/api/v0/agents/meeting/{restarted.json()['meeting_id']}/end")


def test_user_meeting_request_validation():
    client = TestClient(create_app())
    duplicate = client.post("/api/v0/agents/meeting", json={
        "topic": "测试", "participants": ["lin-che", "lin-che"],
    })
    assert duplicate.status_code == 422
    unknown = client.post("/api/v0/agents/meeting", json={
        "topic": "测试", "participants": ["missing-person"],
    })
    assert unknown.status_code == 404
