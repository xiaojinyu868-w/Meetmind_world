"""问题 2 修复：media 路由与种子资料包真实图片指针测试（TestClient 验证）。"""

import pytest
from fastapi.testclient import TestClient

from app.config import REPO_ROOT
from app.main import create_app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def test_media_serves_seed_face_with_correct_type(client):
    resp = client.get("/api/v0/media/facts/seed/lin-che/face.png")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    # 内容与前端仓库肖像逐字节一致
    assert resp.content == (REPO_ROOT / "public" / "portraits" / "photo-derived" / "voxel" / "person_01.png").read_bytes()


def test_media_404_for_missing_ref(client):
    assert client.get("/api/v0/media/facts/seed/lin-che/nope.png").status_code == 404
    assert client.get("/api/v0/media/facts/seed/lin-che/face.exe").status_code == 404


def test_media_rejects_path_traversal(client):
    for crafted in (
        "/api/v0/media/..%2F..%2F..%2Fetc%2Fpasswd",
        "/api/v0/media/%2e%2e/%2e%2e/app/main.py",
        "/api/v0/media/facts/../../../etc/passwd",
    ):
        resp = client.get(crafted)
        assert resp.status_code in (403, 404), f"{crafted} -> {resp.status_code}"


def test_packages_face_ref_and_photos_fetchable(client):
    package = client.get("/api/v0/packages/lin-che").json()
    face_ref = package["identity"]["face_ref"]
    assert face_ref == "facts/seed/lin-che/face.png"
    assert package["avatar"]["real_face_ref"] == face_ref
    resp = client.get(f"/api/v0/media/{face_ref}")
    assert resp.status_code == 200 and len(resp.content) > 100
    # encounter photos：1-2 张真实存在、经 media 路由可取
    photos = package["encounters"][0]["facts"]["photos"]
    assert 1 <= len(photos) <= 2
    for ref in photos:
        resp = client.get(f"/api/v0/media/{ref}")
        assert resp.status_code == 200, ref
        assert resp.headers["content-type"] == "image/png"
