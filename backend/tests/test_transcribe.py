"""语音转写测试：dashscope 音频理解（mock server，不耗真实额度）与降级链。"""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agents.llm import base as llm_base
from app.agents.llm.qwen import QwenProvider
from app.main import create_app


def _openai_payload(text: str) -> dict:
    return {"id": "x", "choices": [{"index": 0, "message": {"role": "assistant", "content": text},
                                   "finish_reason": "stop"}], "usage": {}}


def _make_vision_provider(handler):
    return QwenProvider(
        config={"role": "vision", "api_base": "https://mock.local",
                "api_key": "test-key-not-real", "model": "qwen-vl-plus",
                "configured": True},
        transport=httpx.MockTransport(handler),
    )


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


@pytest.fixture()
def vision_mock():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["payload"] = json.loads(request.content)
        return httpx.Response(200, json=_openai_payload(
            "我们在展位聊了教育科技的合作，约定下周再谈。"))

    provider = _make_vision_provider(handler)
    llm_base.register_provider("vision", lambda: provider)
    llm_base.reset_providers()
    yield captured
    llm_base.register_provider("vision", QwenProvider)
    llm_base.reset_providers()


def _ingest_audio(client) -> str:
    resp = client.post(
        "/api/v0/ingest",
        data={"captured_at": "2026-08-03T14:00:00+08:00", "device": "glasses",
              "note": "黑客松 3 号展位"},
        files=[("media", ("voice.m4a", b"fake-audio-bytes", "audio/mp4"))],
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["input_id"]


def test_transcribe_via_dashscope_audio_model(client, vision_mock):
    input_id = _ingest_audio(client)
    payload = client.post("/api/v0/pipeline",
                          json={"input_id": input_id, "mode": "once"}).json()
    step = payload["steps"]["transcript"]
    assert step["transcript_ref"] and step["model"] == "qwen-audio-turbo"
    # 事实层留存真实转写（与原始音频双份）
    store = client.app.state.store
    text = store.read_fact(step["transcript_ref"]).decode("utf-8")
    assert "我们在展位聊了教育科技的合作，约定下周再谈。" in text
    assert "stub" not in text
    # 请求格式：input_audio + format=m4a + 音频理解模型
    sent = vision_mock["payload"]
    assert sent["model"] == "qwen-audio-turbo"
    content = sent["messages"][0]["content"]
    assert content[0]["type"] == "input_audio"
    assert content[0]["input_audio"]["format"] == "m4a"
    assert content[0]["input_audio"]["data"].startswith("data:audio/m4a;base64,")


def test_transcribe_failure_falls_back_to_stub(client):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "boom"})

    provider = _make_vision_provider(handler)
    llm_base.register_provider("vision", lambda: provider)
    llm_base.reset_providers()
    try:
        input_id = _ingest_audio(client)
        payload = client.post("/api/v0/pipeline",
                              json={"input_id": input_id, "mode": "once"}).json()
        step = payload["steps"]["transcript"]
        store = client.app.state.store
        text = store.read_fact(step["transcript_ref"]).decode("utf-8")
        assert "（stub）" in text  # 调用失败降级占位，流程不断
    finally:
        llm_base.register_provider("vision", QwenProvider)
        llm_base.reset_providers()


def test_transcribe_mock_when_unconfigured():
    provider = QwenProvider(config={"role": "vision", "api_base": "", "api_key": "",
                                    "model": "qwen-vl-plus", "configured": False})
    response = provider.transcribe("/tmp/voice.m4a")
    assert response.mock is True
