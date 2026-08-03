"""IF-5 检索接口测试（docs/API.md，FR-1.9）：name/keyword 真实匹配，face 为 stub。"""

import base64

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def test_search_by_name_hits_seed(client):
    resp = client.post("/api/v0/search", json={"by": "name", "query": "谢淯琪"})
    assert resp.status_code == 200, resp.text
    results = resp.json()["results"]
    assert results, "种子数据应命中"
    top = results[0]
    assert top["person_id"] == "lin-che"
    assert top["name"] == "谢淯琪"
    assert top["score"] == 1.0
    assert top["last_encounter"]["place"] == "2025 年秋 · 科技展咖啡摊"


def test_search_by_name_substring(client):
    resp = client.post("/api/v0/search", json={"by": "name", "query": "黄"})
    names = {r["name"] for r in resp.json()["results"]}
    assert "黄月胜" in names


def test_search_by_keyword(client):
    resp = client.post("/api/v0/search", json={"by": "keyword", "query": "咖啡"})
    ids = {r["person_id"] for r in resp.json()["results"]}
    assert "lin-che" in ids  # 种子推断标签含"咖啡"


def test_search_by_face_is_stub(client):
    photo = base64.b64encode(b"fake-photo").decode()
    resp = client.post("/api/v0/search", json={"by": "face", "photo": photo})
    assert resp.status_code == 200
    assert resp.json()["results"] == []  # TODO(算法待打磨)：face embedding 检索


def test_search_requires_query(client):
    resp = client.post("/api/v0/search", json={"by": "name", "query": ""})
    assert resp.status_code == 400
