"""阶段 2：pipeline 提取真实化测试（vision/chat 走 mock server，不耗真实额度）。

覆盖：图片输入 → vision 真实分析人脸/场景（模型版本与置信度落推断层）；
音频输入 → chat 生成谈话要点草稿；视频输入 → faces 跳过（TODO），流程不断。
"""

import base64
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agents.llm import base as llm_base
from app.agents.llm.deepseek import DeepseekProvider
from app.agents.llm.qwen import QwenProvider
from app.main import create_app
from app.schemas.package_schema import validate_encounter_draft

# 与 pipeline 占位图相同的 1x1 JPEG（内容不重要，mock server 不读图）
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


def _openai_payload(text: str) -> dict:
    return {"id": "x", "choices": [{"index": 0, "message": {"role": "assistant", "content": text},
                                   "finish_reason": "stop"}], "usage": {}}


def _provider(cls, handler, model):
    return cls(
        config={"role": cls.role, "api_base": "https://mock.local",
                "api_key": "test-key-not-real", "model": model, "configured": True},
        transport=httpx.MockTransport(handler),
    )


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


@pytest.fixture()
def vision_mock():
    """把 vision 角色换成 mock server 的 QwenProvider（测后还原）。"""

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        prompt = payload["messages"][0]["content"][0]["text"]
        if "场景分析器" in prompt:
            return httpx.Response(200, json=_openai_payload(
                '{"scene_tags": ["booth", "ai-hardware"], "description": "黑客松展位"}'))
        return httpx.Response(200, json=_openai_payload(
            '{"faces": [{"confidence": 0.88, "description": "戴眼镜的男士"}]}'))

    provider = _provider(QwenProvider, handler, "qwen-vl-plus")
    llm_base.register_provider("vision", lambda: provider)
    llm_base.reset_providers()
    yield provider
    llm_base.register_provider("vision", QwenProvider)
    llm_base.reset_providers()


@pytest.fixture()
def chat_mock():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_openai_payload(
            "要点一：对方在做教育科技；要点二：展位在 3 号。"))

    provider = _provider(DeepseekProvider, handler, "deepseek-chat")
    llm_base.register_provider("chat", lambda: provider)
    llm_base.reset_providers()
    yield provider
    llm_base.register_provider("chat", DeepseekProvider)
    llm_base.reset_providers()


def _ingest(client, filename: str, data: bytes, mime: str) -> str:
    resp = client.post(
        "/api/v0/ingest",
        data={"captured_at": "2026-08-03T14:00:00+08:00", "device": "phone",
              "note": "黑客松 3 号展位", "place_hint": "XX 黑客松"},
        files=[("media", (filename, data, mime))],
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["input_id"]


def test_image_input_faces_and_scene_use_vision(client, vision_mock):
    input_id = _ingest(client, "photo.jpg", TINY_JPEG, "image/jpeg")
    payload = client.post("/api/v0/pipeline",
                          json={"input_id": input_id, "mode": "once"}).json()
    # 图片直接成为关键帧（真实内容）
    assert payload["steps"]["preprocess"]["keyframes"] == [
        f"facts/2026-08-03/{input_id}/kf_01.jpg"]
    # vision 真实分析：人脸候选带置信度与描述
    faces = payload["steps"]["faces"]["face_candidates"]
    assert faces[0]["confidence"] == 0.88
    assert faces[0]["description"] == "戴眼镜的男士"
    assert faces[0]["match_person_id"] is None  # 人脸比对仍是 TODO
    # vision 真实分析：场景标签来自模型而非关键词
    assert payload["steps"]["scene"]["scene_tags"] == ["booth", "ai-hardware"]
    # 推断层带真实模型版本与置信度
    draft = payload["encounter_draft"]
    validate_encounter_draft(draft)
    scene_inf = next(i for i in draft["inferences"] if i["id"] == "inf_scene")
    assert scene_inf["model"] == "qwen-vl-plus"
    assert scene_inf["confidence"] == 0.8


def test_audio_input_summary_uses_chat(client, chat_mock):
    input_id = _ingest(client, "voice.m4a", b"fake-audio", "audio/mp4")
    payload = client.post("/api/v0/pipeline",
                          json={"input_id": input_id, "mode": "once"}).json()
    transcript = payload["steps"]["transcript"]
    assert transcript["summary_draft"] == "要点一：对方在做教育科技；要点二：展位在 3 号。"
    draft = payload["encounter_draft"]
    validate_encounter_draft(draft)
    summary_inf = next(i for i in draft["inferences"] if i["id"] == "inf_summary")
    assert summary_inf["model"] == "deepseek-chat"
    assert summary_inf["confidence"] == 0.6
    assert summary_inf["source_facts"] == [transcript["transcript_ref"]]


def test_video_input_faces_skipped_but_flow_continues(client):
    input_id = _ingest(client, "clip.mp4", b"fake-video", "video/mp4")
    payload = client.post("/api/v0/pipeline",
                          json={"input_id": input_id, "mode": "once"}).json()
    faces = payload["steps"]["faces"]
    assert faces["status"] == "skipped"  # 视频抽帧 TODO：跳过人脸分析，流程不断
    assert faces["face_candidates"] == []
    validate_encounter_draft(payload["encounter_draft"])  # 草稿仍合规产出
