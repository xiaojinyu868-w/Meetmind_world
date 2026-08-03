"""API 冒烟与闭环测试（docs/API.md v0.1 契约）。

覆盖：/api/health、IF-4 快照、IF-1 ingest → IF-2 pipeline → IF-3 confirm → IF-5 查看
的完整闭环（含权限圈层过滤）。
"""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.snapshot_schema import SCHEMA_VERSION, validate_snapshot


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # 每个用例独立数据目录，互不影响
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def _ingest(client) -> dict:
    resp = client.post(
        "/api/v0/ingest",
        data={
            "captured_at": "2026-08-03T10:30:00+08:00",
            "device": "phone",
            "note": "黑客松 3 号展位",
            "place_hint": "XX 黑客松",
        },
        files=[("media", ("clip.mp4", b"\x00\x00\x00\x18ftypmp42fake-video", "video/mp4"))],
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_world_snapshot(client):
    resp = client.get("/api/v0/world/snapshot")
    assert resp.status_code == 200
    snapshot = resp.json()
    assert snapshot["schema"] == SCHEMA_VERSION
    assert isinstance(snapshot["tick"], int)
    assert len(snapshot["agents"]) == 6
    validate_snapshot(snapshot)


def test_old_unversioned_routes_removed(client):
    assert client.get("/api/world/snapshot").status_code == 404
    assert client.get("/api/packages").status_code == 404


def test_ingest_contract(client):
    payload = _ingest(client)
    assert payload["status"] == "stored"
    assert payload["input_id"].startswith("in_")
    assert payload["facts_refs"]
    for ref in payload["facts_refs"]:
        assert ref.startswith(f"facts/2026-08-03/{payload['input_id']}/")


def test_ingest_rejects_bad_input(client):
    base = {"captured_at": "2026-08-03T10:30:00+08:00", "device": "phone"}
    # 不支持的媒体格式 → 400
    resp = client.post("/api/v0/ingest", data=base,
                       files=[("media", ("note.txt", b"hello", "text/plain"))])
    assert resp.status_code == 400
    # 不支持的 device → 400
    resp = client.post("/api/v0/ingest",
                       data={**base, "device": "watch"},
                       files=[("media", ("clip.mp4", b"fake", "video/mp4"))])
    assert resp.status_code == 400
    # 非法 captured_at → 400
    resp = client.post("/api/v0/ingest",
                       data={**base, "captured_at": "昨天"},
                       files=[("media", ("clip.mp4", b"fake", "video/mp4"))])
    assert resp.status_code == 400


def test_full_loop_ingest_pipeline_confirm(client):
    # IF-1 输入
    input_id = _ingest(client)["input_id"]
    # IF-2 处理（once 模式拿草稿）
    draft = client.post("/api/v0/pipeline",
                        json={"input_id": input_id, "mode": "once"}).json()["encounter_draft"]
    # IF-3 确认（新建 Person）
    resp = client.post("/api/v0/confirm", json={
        "encounter_draft": draft,
        "identity": {"name": "陈某", "match_person_id": None},
        "privacy": "self-only",
    })
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    person_id = payload["person_id"]
    assert payload["encounter_id"] == draft["encounter_id"]
    assert payload["package_ref"] == f"people/{person_id}/profile.json"
    assert payload["avatar_status"] == "placeholder"

    # IF-5 查看：self 视角可见全部（L1）
    package = client.get(f"/api/v0/packages/{person_id}").json()
    assert package["identity"]["confirmed"] is True
    assert package["identity"]["name"] == "陈某"
    assert len(package["encounters"]) == 1
    # agent 视角：L1 被过滤，且不见真实人脸指针
    agent_view = client.get(f"/api/v0/packages/{person_id}", params={"viewer": "agent"}).json()
    assert agent_view["encounters"] == []
    assert agent_view["identity"]["face_ref"] is None
    # 列表含新人与 6 个种子
    summaries = client.get("/api/v0/packages").json()["packages"]
    ids = {s["person_id"] for s in summaries}
    assert person_id in ids and "lin-che" in ids

    # IF-3 并入已有 Person（match_person_id 非空）
    resp = client.post("/api/v0/pipeline",
                       json={"input_id": input_id, "mode": "once"})
    draft2 = resp.json()["encounter_draft"]
    resp = client.post("/api/v0/confirm", json={
        "encounter_draft": draft2,
        "identity": {"name": None, "match_person_id": person_id},
        "privacy": "agent-usable",
    })
    assert resp.status_code == 200
    assert resp.json()["person_id"] == person_id
    package = client.get(f"/api/v0/packages/{person_id}").json()
    assert len(package["encounters"]) == 2
    # 第二条 encounter 是 L2，agent 视角可见
    agent_view = client.get(f"/api/v0/packages/{person_id}", params={"viewer": "agent"}).json()
    assert len(agent_view["encounters"]) == 1
