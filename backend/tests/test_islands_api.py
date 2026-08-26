"""每人一岛 API 契约测试（/api/v1/islands）。

验收：创建→me→卡片→spec 全链路；未授权 401；404/409 分支；
spec 缺 base/avatar 键 422；upsert 保留 created_at。
"""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.security.meetmind_jwt import sign_echo_token

SECRET = "test-secret-islands-0123456789"

VALID_SPEC = {
    "base": {"ground": "/me/worlds/person_a/ground.glb", "size": [64, 64]},
    "avatar": {"model": "/me/worlds/person_a/avatar.glb"},
    "sky": {"color": "#88ccff"},
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("JWT_SECRET", SECRET)
    return TestClient(create_app())


def _auth(sub: str = "u-island-owner") -> dict:
    return {"authorization": f"Bearer {sign_echo_token(sub, 'tester')}"}


def _create(client, person_id="person_a", **overrides):
    body = {"person_id": person_id, "spec": VALID_SPEC, "theme_prompt": "海边小屋"}
    body.update(overrides)
    return client.post("/api/v1/islands", json=body, headers=_auth())


def test_island_full_chain(client):
    created = _create(client, objects=[{"id": "o1", "name": "灯塔", "at": [3, 4], "story": "第一次旅行"}],
                      bridges=[{"to_person_id": "person_b", "at": [10, 0]}])
    assert created.status_code == 200
    island = created.json()
    assert island["person_id"] == "person_a"
    assert island["owner_id"] == "u-island-owner"  # 缺省取 caller
    assert island["assets_base"] == "/me/worlds/person_a"
    assert island["build_status"] == "ready"  # spec 已提供默认 ready
    assert island["created_at"] and island["updated_at"]

    mine = client.get("/api/v1/islands/me", headers=_auth())
    assert mine.status_code == 200
    islands = mine.json()["islands"]
    assert [i["person_id"] for i in islands] == ["person_a"]

    # 他人名下看不到
    other = client.get("/api/v1/islands/me", headers=_auth("u-someone-else"))
    assert other.json()["islands"] == []

    # 公开卡片：不含 spec
    card = client.get("/api/v1/islands/person_a")
    assert card.status_code == 200
    body = card.json()
    assert body["person_id"] == "person_a"
    assert body["build_status"] == "ready"
    assert body["object_count"] == 1
    assert body["bridge_count"] == 1
    assert "spec" not in body

    spec = client.get("/api/v1/islands/person_a/spec")
    assert spec.status_code == 200
    # Island.bridges（权威）serve 时合并进 spec 给引擎消费（P2 桥）
    assert spec.json() == {**VALID_SPEC, "bridges": [{"to_person_id": "person_b", "at": [10.0, 0.0], "name": None}]}


def test_island_requires_auth(client):
    assert client.post("/api/v1/islands", json={"person_id": "person_a"}).status_code == 401
    assert client.get("/api/v1/islands/me").status_code == 401
    bad = {"authorization": "Bearer not-a-token"}
    assert client.post("/api/v1/islands", json={"person_id": "person_a"}, headers=bad).status_code == 401


def test_island_404(client):
    assert client.get("/api/v1/islands/person_ghost").status_code == 404
    assert client.get("/api/v1/islands/person_ghost/spec").status_code == 404


def test_island_spec_not_ready_409(client):
    created = _create(client, spec=None, build_status=None)
    assert created.json()["build_status"] == "pending"  # 无 spec 默认 pending
    response = client.get("/api/v1/islands/person_a/spec")
    assert response.status_code == 409
    assert response.json()["detail"]["build_status"] == "pending"
    # 卡片仍可公开访问
    assert client.get("/api/v1/islands/person_a").json()["build_status"] == "pending"


def test_island_spec_missing_keys_422(client):
    response = _create(client, spec={"base": {}})
    assert response.status_code == 422
    response = _create(client, spec={"avatar": {}})
    assert response.status_code == 422
    # 非法 person_id 也 422
    assert _create(client, person_id="../evil").status_code == 422


def test_island_upsert_preserves_created_at(client):
    first = _create(client).json()
    second = _create(client, theme_prompt="雪山顶").json()
    assert second["created_at"] == first["created_at"]
    assert second["theme_prompt"] == "雪山顶"
    assert second["updated_at"] >= first["updated_at"]
    # 仍是一条记录
    mine = client.get("/api/v1/islands/me", headers=_auth()).json()["islands"]
    assert len(mine) == 1
