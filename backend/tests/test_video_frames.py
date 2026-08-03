"""视频抽帧测试：ffmpeg 真实抽帧（本机可用）、cv2 兜底、双不可用降级、pipeline 联动。"""

import shutil
import subprocess
import sys
import types

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.pipeline.video_frames import extract_keyframes

FFMPEG = shutil.which("ffmpeg")

# 与 pipeline 占位图相同的 1x1 JPEG
import base64
TINY_JPEG = base64.b64decode(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////"
    "////////////////////////////////////////2wBDAf//////////////////////////////////"
    "////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAA"
    "AAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAT//xAAUEAEAAA"
    "AAAAAAAAAAAAAAAAAA/9oACAEBAAEFAl//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AV"
    "//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AV//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9"
    "oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP"
    "/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2g"
    "AIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z"
)


def _make_test_video(path):
    """用 ffmpeg 生成 1 秒测试视频（本机实测 ffmpeg 可用）。"""
    subprocess.run(
        [FFMPEG, "-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=64x64:rate=10",
         "-pix_fmt", "yuv420p", str(path)],
        check=True, capture_output=True)


@pytest.mark.skipif(not FFMPEG, reason="需要系统 ffmpeg")
def test_extract_keyframes_with_ffmpeg(tmp_path):
    video = tmp_path / "clip.mp4"
    _make_test_video(video)
    frames = extract_keyframes(video, count=3, out_dir=tmp_path / "out")
    assert frames is not None and len(frames) == 3
    for frame in frames:
        assert frame.read_bytes()[:2] == b"\xff\xd8"  # 真实 JPEG


def test_extract_keyframes_cv2_fallback(tmp_path, monkeypatch):
    """ffmpeg 不存在时走 cv2 兜底（fake cv2 模块，不依赖真实 opencv）。"""
    monkeypatch.setattr(shutil, "which", lambda _name: None)

    class _FakeCapture:
        def __init__(self, _path):
            self._index = 0

        def isOpened(self):
            return True

        def get(self, _prop):
            return 30

        def set(self, _prop, value):
            self._index = value

        def read(self):
            return True, b"fake-frame"

        def release(self):
            pass

    def _fake_imwrite(path, _frame):
        with open(path, "wb") as fh:
            fh.write(TINY_JPEG)
        return True

    fake_cv2 = types.ModuleType("cv2")
    fake_cv2.CAP_PROP_FRAME_COUNT = 7
    fake_cv2.CAP_PROP_POS_FRAMES = 1
    fake_cv2.VideoCapture = _FakeCapture
    fake_cv2.imwrite = _fake_imwrite
    monkeypatch.setitem(sys.modules, "cv2", fake_cv2)

    frames = extract_keyframes(tmp_path / "clip.mp4", count=3, out_dir=tmp_path / "out")
    assert frames is not None and len(frames) == 3
    assert all(f.read_bytes() == TINY_JPEG for f in frames)


def test_extract_keyframes_unavailable(tmp_path, monkeypatch):
    """ffmpeg 与 cv2 都不可用 → None（调用方退回 stub 分支）。"""
    monkeypatch.setattr(shutil, "which", lambda _name: None)
    monkeypatch.setitem(sys.modules, "cv2", None)  # import cv2 将抛 ImportError
    assert extract_keyframes(tmp_path / "clip.mp4", out_dir=tmp_path / "out") is None


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


@pytest.mark.skipif(not FFMPEG, reason="需要系统 ffmpeg")
def test_pipeline_video_input_extracts_real_frames(client, tmp_path):
    video = tmp_path / "clip.mp4"
    _make_test_video(video)
    resp = client.post(
        "/api/v0/ingest",
        data={"captured_at": "2026-08-03T14:00:00+08:00", "device": "phone",
              "note": "黑客松展位", "place_hint": "XX 黑客松"},
        files=[("media", ("clip.mp4", video.read_bytes(), "video/mp4"))],
    )
    assert resp.status_code == 201, resp.text
    input_id = resp.json()["input_id"]
    payload = client.post("/api/v0/pipeline",
                          json={"input_id": input_id, "mode": "once"}).json()
    # 均匀抽 3 帧真实帧（不再是占位图）
    keyframes = payload["steps"]["preprocess"]["keyframes"]
    assert len(keyframes) == 3
    store = client.app.state.store
    for ref in keyframes:
        assert store.read_fact(ref)[:2] == b"\xff\xd8"
    assert "占位" not in str(payload["steps"]["preprocess"].get("note", ""))
    # faces 步骤照常消费真实帧（vision 未配置走降级候选，但不再 skipped）
    assert payload["steps"]["faces"]["status"] == "done"
    assert payload["steps"]["faces"]["face_candidates"]


def test_pipeline_stub_branch_when_extraction_fails(client, monkeypatch):
    """抽帧整体不可用/失败：退回占位帧 + faces skipped（流程不断）。"""
    monkeypatch.setattr("app.api.pipeline.extract_keyframes", lambda *a, **k: None)
    resp = client.post(
        "/api/v0/ingest",
        data={"captured_at": "2026-08-03T14:00:00+08:00", "device": "phone"},
        files=[("media", ("clip.mp4", b"fake-video", "video/mp4"))],
    )
    input_id = resp.json()["input_id"]
    payload = client.post("/api/v0/pipeline",
                          json={"input_id": input_id, "mode": "once"}).json()
    assert "占位" in payload["steps"]["preprocess"]["note"]
    assert payload["steps"]["faces"]["status"] == "skipped"
