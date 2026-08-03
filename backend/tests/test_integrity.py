"""事实层完整性自检测试（1.D.3）：manifest 维护、篡改检出、admin 端点。"""

import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.packages.store import PackageStore


def test_manifest_maintained_on_write(tmp_path):
    store = PackageStore(tmp_path)
    ref = store.write_fact("person_x", "enc_01", "note.v1.md", b"hello")
    manifest = json.loads(
        (tmp_path / "facts" / "person_x" / "enc_01" / "manifest.v1.json").read_text())
    assert manifest["schema"] == "echo-facts-manifest.v1"
    assert ref in manifest["files"]


def test_verify_detects_tamper_and_missing(tmp_path):
    store = PackageStore(tmp_path)
    ref_a = store.write_fact("person_x", "enc_01", "a.md", b"aaa")
    ref_b = store.write_fact("person_x", "enc_01", "b.md", b"bbb")
    assert store.verify_facts_integrity()["ok"] is True
    # 篡改一个字节 → 报 sha256 不符
    target = tmp_path / "facts" / "person_x" / "enc_01" / "a.md"
    target.write_bytes(b"aaX")
    report = store.verify_facts_integrity()
    assert report["ok"] is False
    assert report["corrupted"] == [
        {"ref": ref_a, "reason": "sha256 不符（内容已变更）"}]
    # 删除文件 → 报缺失
    (tmp_path / "facts" / "person_x" / "enc_01" / "b.md").unlink()
    report = store.verify_facts_integrity()
    reasons = {c["ref"]: c["reason"] for c in report["corrupted"]}
    assert reasons[ref_b] == "文件缺失"


def test_verify_person_filter_and_unregistered(tmp_path):
    store = PackageStore(tmp_path)
    store.write_fact("person_x", "enc_01", "a.md", b"aaa")
    store.write_fact("person_y", "enc_01", "b.md", b"bbb")
    report = store.verify_facts_integrity("person_x")
    assert report["ok"] and report["checked"] == 1
    # 未登记文件（手工拷入，绕过 write_fact）→ unregistered 名单
    (tmp_path / "facts" / "person_x" / "enc_01" / "smuggled.md").write_bytes(b"x")
    report = store.verify_facts_integrity("person_x")
    assert report["unregistered"] == ["facts/person_x/enc_01/smuggled.md"]
    assert report["ok"] is True  # 未登记不算损坏，但可见


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def test_admin_integrity_endpoint_ok_then_corrupted(client):
    # 种子事实完好：总体 ok
    report = client.get("/api/v0/admin/integrity").json()
    assert report["ok"] is True
    assert report["checked"] > 0
    assert report["corrupted"] == []
    # 篡改一个种子事实字节 → 端点报出损坏
    store = client.app.state.store
    target = store.root / "facts" / "seed" / "lin-che" / "note.v1.md"
    target.write_bytes(target.read_bytes() + b"x")
    report = client.get("/api/v0/admin/integrity").json()
    assert report["ok"] is False
    assert any(c["ref"] == "facts/seed/lin-che/note.v1.md"
               for c in report["corrupted"])
    # 单人过滤：查别人不受影响
    report = client.get("/api/v0/admin/integrity",
                        params={"person_id": "zhou-ning"}).json()
    assert report["ok"] is True
    assert report["checked"] > 0
