"""IF-2「pipeline」处理接口测试（docs/API.md）：SSE 流式与 once 合并两种模式。"""

import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.package_schema import validate_encounter_draft


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


@pytest.fixture()
def input_id(client) -> str:
    resp = client.post(
        "/api/v0/ingest",
        data={
            "captured_at": "2026-08-03T14:00:00+08:00",
            "device": "glasses",
            "note": "黑客松 3 号展位聊教育科技",
            "place_hint": "XX 黑客松",
        },
        files=[("media", ("clip.mp4", b"\x00\x00\x00\x18ftypmp42fake", "video/mp4"))],
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["input_id"]


def test_pipeline_once_returns_valid_draft(client, input_id):
    resp = client.post("/api/v0/pipeline", json={"input_id": input_id, "mode": "once"})
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    draft = payload["encounter_draft"]
    # 草稿符合 echo-package.v0 且 identity.confirmed=false
    validate_encounter_draft(draft)
    assert draft["identity"]["confirmed"] is False
    # 中间特征是真实派生指针，不是静态字符串
    assert draft["facts"]["media"] == [f"facts/2026-08-03/{input_id}/clip.mp4"]
    assert draft["facts"]["transcript"] == f"facts/2026-08-03/{input_id}/transcript.v1.md"
    assert draft["facts"]["photos"] == [f"facts/2026-08-03/{input_id}/kf_01.jpg"]
    # 推断条目携带事实指针与置信度
    assert all(inf["source_facts"] for inf in draft["inferences"])
    # 场景标签来自现场备注（黑客松/展位 → hackathon/booth 的关键词降级路径）
    assert payload["steps"]["scene"]["scene_tags"] == ["booth", "hackathon"]
    # 视频输入无抽帧（TODO）：faces 跳过，流程不断
    faces_step = payload["steps"]["faces"]
    assert faces_step["status"] == "skipped"
    assert faces_step["face_candidates"] == []


def test_pipeline_stream_emits_progress_and_result(client, input_id):
    resp = client.post("/api/v0/pipeline", json={"input_id": input_id})  # 默认 stream
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    body = resp.text
    assert body.count("event: progress") >= 4  # preprocess/faces/transcript/scene
    assert "event: result" in body
    # 解析 SSE 事件块：progress 各步 + result 草稿过校验
    steps_seen, result_draft = set(), None
    for block in body.strip().split("\n\n"):
        event_line, data_line = block.split("\n", 1)
        event = event_line.removeprefix("event: ").strip()
        data = json.loads(data_line.removeprefix("data: ").strip())
        if event == "progress":
            steps_seen.add(data["step"])
        elif event == "result":
            result_draft = data["encounter_draft"]
    assert steps_seen == {"preprocess", "faces", "transcript", "scene"}
    assert result_draft is not None
    validate_encounter_draft(result_draft)


def test_pipeline_unknown_input_404(client):
    resp = client.post("/api/v0/pipeline", json={"input_id": "in_not_exist", "mode": "once"})
    assert resp.status_code == 404


def test_pipeline_steps_subset(client, input_id):
    resp = client.post("/api/v0/pipeline", json={
        "input_id": input_id, "mode": "once", "steps": ["preprocess", "faces"]})
    assert resp.status_code == 200
    payload = resp.json()
    assert set(payload["steps"].keys()) == {"preprocess", "faces"}
    assert payload["encounter_draft"] is None
