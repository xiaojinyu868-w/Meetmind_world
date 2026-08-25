"""「每人一岛」构建触发测试（P1）：POST /build 状态机、幂等、confirm 自动触发。

全部用例 monkeypatch 构建器函数（app.pipelines.island_builder.run_island_build），
绝不真的起 build.py 子进程。
"""

import json
import subprocess
import threading
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.pipelines import island_builder

# conftest 的 autouse stub 会在每个用例里替换模块级 run_island_build；
# 适配层单元测试要测真身，这里在导入期（fixture 生效前）保留原始引用。
REAL_RUN_ISLAND_BUILD = island_builder.run_island_build
from app.pipelines.group_onboarding import GroupFaceDetector
from app.security.meetmind_jwt import sign_echo_token

from test_group_onboarding_twophase import PHOTO, FakeVision

SECRET = "test-secret-island-build-0123456789"

READY_SPEC = {
    "base": {"day": "/me/worlds/person_a/day.webp"},
    "avatar": {"start": [100, 100], "sprites": {}},
}

TWO_FACES_JSON = json.dumps({"faces": [
    {"x": 0.10, "y": 0.10, "width": 0.10, "height": 0.13},
    {"x": 0.50, "y": 0.10, "width": 0.10, "height": 0.13},
]})


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("JWT_SECRET", SECRET)
    app = create_app()
    app.state.group_onboarding._face_detector = GroupFaceDetector(
        FakeVision(TWO_FACES_JSON)
    )
    # 构建产物/工作目录隔离到 tmp
    app.state.island_builds.publish_root = tmp_path / "publish"
    app.state.island_builds.workdir_root = tmp_path / "build-work"
    return TestClient(app)


def _auth(sub: str = "u-island-builder") -> dict:
    return {"authorization": f"Bearer {sign_echo_token(sub, 'tester')}"}


def _ready_runner(calls: list):
    """模拟构建成功：写 spec.json 到 publish 目录。"""
    def run(photo, person_id, workdir, publish_root):
        calls.append({"photo": photo, "person_id": person_id})
        target = Path(publish_root) / person_id
        target.mkdir(parents=True, exist_ok=True)
        (target / "spec.json").write_text(json.dumps(READY_SPEC))
    return run


def test_build_trigger_success_path(client, monkeypatch):
    calls = []
    monkeypatch.setattr(island_builder, "run_island_build", _ready_runner(calls))
    response = client.post("/api/v1/islands/build",
                           json={"person_id": "person_a"}, headers=_auth())
    assert response.status_code == 200
    body = response.json()
    assert body["build_status"] == "building"  # 触发即 building
    assert body["owner_id"] == "u-island-builder"

    client.app.state.island_builds.wait_idle()
    assert len(calls) == 1

    card = client.get("/api/v1/islands/person_a").json()
    assert card["build_status"] == "ready"
    assert card["build_error"] is None
    spec = client.get("/api/v1/islands/person_a/spec")
    assert spec.status_code == 200
    assert spec.json() == READY_SPEC


def test_build_requires_auth(client):
    response = client.post("/api/v1/islands/build", json={"person_id": "person_a"})
    assert response.status_code == 401


def test_build_idempotent_while_building(client, monkeypatch):
    calls = []
    entered = threading.Event()
    release = threading.Event()

    def blocking_runner(photo, person_id, workdir, publish_root):
        calls.append(person_id)
        entered.set()
        assert release.wait(10), "测试卡住：未等到释放信号"
        target = Path(publish_root) / person_id
        target.mkdir(parents=True, exist_ok=True)
        (target / "spec.json").write_text(json.dumps(READY_SPEC))

    monkeypatch.setattr(island_builder, "run_island_build", blocking_runner)
    first = client.post("/api/v1/islands/build",
                        json={"person_id": "person_a"}, headers=_auth())
    assert first.json()["build_status"] == "building"
    assert entered.wait(10), "worker 未开始构建"

    # building 中重复触发：直接返回当前状态，不重复入队
    second = client.post("/api/v1/islands/build",
                         json={"person_id": "person_a"}, headers=_auth())
    assert second.status_code == 200
    assert second.json()["build_status"] == "building"

    release.set()
    client.app.state.island_builds.wait_idle()
    assert len(calls) == 1  # 只构建了一次
    assert client.get("/api/v1/islands/person_a").json()["build_status"] == "ready"


def test_build_failure_marks_failed(client, monkeypatch):
    def boom_runner(photo, person_id, workdir, publish_root):
        raise RuntimeError("build.py 退出码 3：[sheet] 投影切带失败 boom-tail")

    monkeypatch.setattr(island_builder, "run_island_build", boom_runner)
    response = client.post("/api/v1/islands/build",
                           json={"person_id": "person_a"}, headers=_auth())
    assert response.json()["build_status"] == "building"
    client.app.state.island_builds.wait_idle()

    card = client.get("/api/v1/islands/person_a").json()
    assert card["build_status"] == "failed"
    assert "boom-tail" in card["build_error"]
    spec = client.get("/api/v1/islands/person_a/spec")
    assert spec.status_code == 409
    assert spec.json()["detail"]["build_status"] == "failed"


def test_build_timeout_marks_failed(client, monkeypatch):
    def timeout_runner(photo, person_id, workdir, publish_root):
        raise RuntimeError("构建超时（20 分钟）")

    monkeypatch.setattr(island_builder, "run_island_build", timeout_runner)
    client.post("/api/v1/islands/build", json={"person_id": "person_a"},
                headers=_auth())
    client.app.state.island_builds.wait_idle()
    card = client.get("/api/v1/islands/person_a").json()
    assert card["build_status"] == "failed"
    assert "超时" in card["build_error"]


def test_build_with_group_id_resolves_photo(client, monkeypatch):
    detect = client.post("/api/v1/group-onboarding/detect",
                         files={"photo": ("group.jpg", PHOTO, "image/jpeg")})
    group_id = detect.json()["group_id"]

    calls = []
    monkeypatch.setattr(island_builder, "run_island_build", _ready_runner(calls))
    response = client.post(
        "/api/v1/islands/build",
        json={"person_id": "person_a", "group_id": group_id}, headers=_auth())
    assert response.status_code == 200
    assert response.json()["source_group_id"] == group_id
    client.app.state.island_builds.wait_idle()
    assert len(calls) == 1
    photo = calls[0]["photo"]
    assert photo and photo.endswith("group.jpg") and Path(photo).is_file()

    # 未知 group_id → 404
    missing = client.post("/api/v1/islands/build",
                          json={"person_id": "person_b", "group_id": "group_none"},
                          headers=_auth())
    assert missing.status_code == 404


def _detect_and_confirm(client, names=("甲", "乙")):
    detect = client.post("/api/v1/group-onboarding/detect",
                         files={"photo": ("group.jpg", PHOTO, "image/jpeg")})
    payload = detect.json()
    assignments = [
        {"face_id": face["face_id"], "name": name}
        for face, name in zip(payload["faces"], names)
    ]
    confirm = client.post("/api/v1/group-onboarding/confirm",
                          json={"group_id": payload["group_id"],
                                "assignments": assignments})
    assert confirm.status_code == 201, confirm.text
    return payload["group_id"], confirm.json()


def test_confirm_auto_triggers_island_builds(client, monkeypatch):
    calls = []
    monkeypatch.setattr(island_builder, "run_island_build", _ready_runner(calls))
    group_id, result = _detect_and_confirm(client)
    client.app.state.island_builds.wait_idle()

    person_ids = [p["person_id"] for p in result["participants"]]
    assert sorted(c["person_id"] for c in calls) == sorted(person_ids)
    for call in calls:
        assert call["photo"].endswith("group.jpg")  # 该 group 的合照
    for person_id in person_ids:
        card = client.get(f"/api/v1/islands/{person_id}").json()
        assert card["build_status"] == "ready"
        assert card["source_group_id"] == group_id


def test_confirm_not_blocked_by_build_failure(client, monkeypatch):
    def boom_runner(photo, person_id, workdir, publish_root):
        raise RuntimeError("构建爆炸")

    monkeypatch.setattr(island_builder, "run_island_build", boom_runner)
    group_id, result = _detect_and_confirm(client)  # confirm 本身 201 不受影响
    client.app.state.island_builds.wait_idle()
    for participant in result["participants"]:
        card = client.get(f"/api/v1/islands/{participant['person_id']}").json()
        assert card["build_status"] == "failed"
        assert "构建爆炸" in card["build_error"]


def test_confirm_not_blocked_by_trigger_error(client, monkeypatch):
    def broken_trigger(*args, **kwargs):
        raise RuntimeError("队列挂了")

    monkeypatch.setattr(client.app.state.island_builds, "trigger", broken_trigger)
    _group_id, result = _detect_and_confirm(client)  # 触发抛异常也不阻断 confirm
    assert result["status"] == "ready"


# ---------- run_island_build 适配层单元测试（mock subprocess） ----------

def _real_photo(tmp_path) -> str:
    photo = tmp_path / "group.jpg"
    photo.write_bytes(PHOTO)
    return str(photo)


def test_run_build_missing_script(tmp_path, monkeypatch):
    monkeypatch.setattr(island_builder, "BUILD_SCRIPT", tmp_path / "no-build.py")
    with pytest.raises(RuntimeError, match="构建脚本不存在"):
        REAL_RUN_ISLAND_BUILD(
            _real_photo(tmp_path), "person_a", tmp_path / "wd", tmp_path / "pub")


def test_run_build_missing_photo(tmp_path, monkeypatch):
    script = tmp_path / "build.py"
    script.write_text("# stub")
    monkeypatch.setattr(island_builder, "BUILD_SCRIPT", script)
    with pytest.raises(RuntimeError, match="合照不存在"):
        REAL_RUN_ISLAND_BUILD(
            str(tmp_path / "ghost.jpg"), "person_a", tmp_path / "wd", tmp_path / "pub")


def test_run_build_nonzero_exit_tail(tmp_path, monkeypatch):
    script = tmp_path / "build.py"
    script.write_text("# stub")
    monkeypatch.setattr(island_builder, "BUILD_SCRIPT", script)

    def fake_run(cmd, **kwargs):
        return SimpleNamespace(returncode=3, stdout="x" * 2000, stderr="boom-stderr")

    monkeypatch.setattr(island_builder.subprocess, "run", fake_run)
    with pytest.raises(RuntimeError) as excinfo:
        REAL_RUN_ISLAND_BUILD(
            _real_photo(tmp_path), "person_a", tmp_path / "wd", tmp_path / "pub")
    message = str(excinfo.value)
    assert "退出码 3" in message and "boom-stderr" in message
    assert len(message) < 1200  # 只留尾部，不整段进记录


def test_run_build_timeout_conversion(tmp_path, monkeypatch):
    script = tmp_path / "build.py"
    script.write_text("# stub")
    monkeypatch.setattr(island_builder, "BUILD_SCRIPT", script)

    def fake_run(cmd, **kwargs):
        raise subprocess.TimeoutExpired(cmd=cmd, timeout=1200, stderr=b"half-way")

    monkeypatch.setattr(island_builder.subprocess, "run", fake_run)
    with pytest.raises(RuntimeError, match="构建超时"):
        REAL_RUN_ISLAND_BUILD(
            _real_photo(tmp_path), "person_a", tmp_path / "wd", tmp_path / "pub")
