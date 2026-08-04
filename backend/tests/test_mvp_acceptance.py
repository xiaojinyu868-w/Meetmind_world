"""MVP1 持久化闭环验收：采集、确认、入世界、重启恢复。"""

import hashlib
import shutil
import subprocess
import time

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def _tree_digest(root):
    return {
        str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def test_record_is_browsable_and_byte_identical_after_restart(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    client = TestClient(create_app())
    started_at = time.monotonic()

    ingest = client.post(
        "/api/v0/ingest",
        data={
            "captured_at": "2026-08-04T14:20:00+08:00",
            "device": "phone",
            "note": "在产品工作坊聊到关系空间",
            "place_hint": "上海产品工作坊",
        },
        files=[("media", ("scene.jpg", b"mvp-acceptance-image-bytes", "image/jpeg"))],
    )
    assert ingest.status_code == 201
    input_id = ingest.json()["input_id"]

    pipeline = client.post(
        "/api/v0/pipeline", json={"input_id": input_id, "mode": "once"},
    )
    assert pipeline.status_code == 200
    draft = pipeline.json()["encounter_draft"]
    confirmed = client.post("/api/v0/confirm", json={
        "encounter_draft": draft,
        "identity": {"name": "验收访客", "match_person_id": None},
        "privacy": "self-only",
    })
    assert confirmed.status_code == 200
    person_id = confirmed.json()["person_id"]
    assert confirmed.json()["field_status"] == "ready"

    package_before = client.get(f"/api/v0/packages/{person_id}").json()
    field_before = client.get(f"/api/v0/fields/{person_id}").json()
    hall_before = client.get(
        "/api/v0/world/snapshot", params={"world": "hall"},
    ).json()
    assert any(module.get("person_id") == person_id for module in hall_before["modules"])
    assert field_before["person_id"] == person_id
    assert time.monotonic() - started_at < 300

    facts_before = _tree_digest(tmp_path / "facts")
    profile_path = tmp_path / "people" / person_id / "profile.json"
    profile_before = profile_path.read_bytes()

    restarted = TestClient(create_app())
    package_after = restarted.get(f"/api/v0/packages/{person_id}").json()
    field_after = restarted.get(f"/api/v0/fields/{person_id}").json()
    hall_after = restarted.get(
        "/api/v0/world/snapshot", params={"world": "hall"},
    ).json()

    assert package_after == package_before
    assert field_after == field_before
    assert profile_path.read_bytes() == profile_before
    assert _tree_digest(tmp_path / "facts") == facts_before
    assert restarted.get("/api/v0/admin/integrity").json()["ok"] is True
    assert any(module.get("person_id") == person_id for module in hall_after["modules"])


def test_one_minute_recording_becomes_browsable_within_five_minutes(tmp_path, monkeypatch):
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        pytest.skip("需要 ffmpeg 生成 60 秒验收视频")
    video_path = tmp_path / "one-minute.mp4"
    subprocess.run([
        ffmpeg, "-loglevel", "error", "-y",
        "-f", "lavfi", "-i", "color=c=#315d59:s=160x90:r=1",
        "-t", "60", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        str(video_path),
    ], check=True)
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path / "data"))
    client = TestClient(create_app())
    started_at = time.monotonic()

    with video_path.open("rb") as media:
        ingest = client.post("/api/v0/ingest", data={
            "captured_at": "2026-08-04T15:00:00+08:00",
            "device": "phone",
            "note": "60 秒本地验收记录",
            "place_hint": "验收空间",
        }, files=[("media", (video_path.name, media, "video/mp4"))])
    draft = client.post("/api/v0/pipeline", json={
        "input_id": ingest.json()["input_id"], "mode": "once",
    }).json()["encounter_draft"]
    confirmed = client.post("/api/v0/confirm", json={
        "encounter_draft": draft,
        "identity": {"name": "一分钟访客", "match_person_id": None},
        "privacy": "self-only",
    })

    assert confirmed.status_code == 200
    person_id = confirmed.json()["person_id"]
    assert client.get(f"/api/v0/packages/{person_id}").status_code == 200
    assert time.monotonic() - started_at < 300
