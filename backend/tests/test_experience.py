"""MVP2 场域、空间互动与世界播报验收（2.E.3 / 2.G.1）。"""

import hashlib

from fastapi.testclient import TestClient

from app.fields.generator import FIELD_INFERENCE_NAME, generate_field
from app.main import create_app


def _client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def _facts_digest(store):
    result = {}
    for path in sorted(store.facts_dir.rglob("*")):
        if path.is_file():
            result[str(path.relative_to(store.root))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def test_field_is_generated_from_sources_and_cached(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    response = client.get("/api/v0/fields/lin-che")
    assert response.status_code == 200
    field = response.json()
    assert field["schema"] == "echo-field.v1"
    assert field["status"] == "ready"
    assert field["person_id"] == "lin-che"
    assert field["generated"] is True and field["regenerable"] is True
    assert field["generated_from"]
    assert len(field["scene"]["entities"]) >= 4
    assert all(entity.get("interaction") for entity in field["scene"]["entities"])
    cached = client.app.state.store.read_inferences("lin-che")[FIELD_INFERENCE_NAME]
    assert cached == field


def test_field_regeneration_never_changes_facts(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    before = _facts_digest(client.app.state.store)
    response = client.post("/api/v0/fields/lin-che/regenerate")
    assert response.status_code == 200
    assert response.json()["model"] == "relationship-field-rules.v1"
    assert _facts_digest(client.app.state.store) == before
    assert client.get("/api/v0/admin/integrity").json()["ok"] is True


def test_legacy_field_cache_is_migrated_for_runtime_navigation(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    legacy = generate_field(client.app.state.store.load_package("lin-che"))
    legacy.pop("person_id")
    legacy["scene"].pop("companion")
    client.app.state.store.write_inference("lin-che", FIELD_INFERENCE_NAME, legacy)

    field = client.get("/api/v0/fields/lin-che").json()

    assert field["person_id"] == "lin-che"
    assert field["scene"]["companion"]["person_id"] == "lin-che"
    assert client.app.state.store.read_inferences("lin-che")[FIELD_INFERENCE_NAME] == field


def test_incomplete_same_version_field_is_regenerated(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    client.app.state.store.write_inference("lin-che", FIELD_INFERENCE_NAME, {
        "schema": "echo-field.v1",
        "person_id": "lin-che",
        "scene": {
            "entities": [
                {"id": "arrival", "type": "threshold", "position": {"x": 0, "z": 1}},
            ],
        },
    })

    field = client.get("/api/v0/fields/lin-che").json()

    assert field["model"] == "relationship-field-rules.v1"
    assert {entity["type"] for entity in field["scene"]["entities"]} == {
        "threshold", "memory", "thread", "echo",
    }
    assert all(entity["interaction"] for entity in field["scene"]["entities"])


def test_generator_consumes_first_impressions_and_relationship_context(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    package = client.app.state.store.load_package("lin-che")
    field = generate_field(
        package,
        inferences={
            "group-one": {
                "impression": {"value": "让复杂讨论慢慢变清楚"},
            },
        },
        relations_md="黄月胜 | 旧识 | 原型, 产品 | enc_seed\n",
    )
    assert field["relation"]["first_impressions"] == ["让复杂讨论慢慢变清楚"]
    assert "让复杂讨论慢慢变清楚" in field["scene"]["summary"]


def test_world_interaction_persists_and_drives_brief_after_restart(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    created = client.post("/api/v0/world/interactions", json={
        "type": "meeting-started",
        "summary": "李浩邀请谢淯琪在中央圆桌坐下",
        "person_ids": ["xu-an", "lin-che"],
        "payload": {"table_id": "roundtable-six"},
    })
    assert created.status_code == 200
    assert created.json()["schema"] == "echo-world-event.v1"

    restarted = TestClient(create_app())
    events = restarted.get("/api/v0/world/events", params={"limit": 5}).json()["events"]
    assert events[0]["summary"] == "李浩邀请谢淯琪在中央圆桌坐下"
    brief = restarted.get("/api/v0/world/brief").json()
    assert brief["schema"] == "echo-world-brief.v1"
    assert brief["event_count"] >= 1
    assert "李浩邀请谢淯琪" in brief["summary"]


def test_interaction_validation_rejects_unknown_type(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    response = client.post("/api/v0/world/interactions", json={
        "type": "arbitrary-side-effect",
        "summary": "不应写入",
    })
    assert response.status_code == 422
    assert client.get("/api/v0/world/events").json()["events"] == []


def test_confirm_generates_relationship_field(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    ingest = client.post("/api/v0/ingest", data={
        "captured_at": "2026-08-04T10:00:00+08:00",
        "device": "phone",
        "note": "在工作坊第一次见面",
        "place_hint": "上海工作坊",
    }, files=[("media", ("scene.jpg", b"jpeg-bytes", "image/jpeg"))])
    assert ingest.status_code == 201
    draft = client.post("/api/v0/pipeline", json={
        "input_id": ingest.json()["input_id"], "mode": "once",
    }).json()["encounter_draft"]
    confirmed = client.post("/api/v0/confirm", json={
        "encounter_draft": draft,
        "identity": {"name": "新朋友", "match_person_id": None},
        "privacy": "self-only",
    })
    assert confirmed.status_code == 200
    body = confirmed.json()
    assert body["field_status"] == "ready"
    field = client.get(f"/api/v0/fields/{body['person_id']}").json()
    assert field["person_id"] == body["person_id"]
    assert field["generated_from"]
