"""阶段 1：provider 注册表与 OpenAI 兼容调用测试（mock server，不耗真实额度）。"""

import httpx
import pytest

from app.agents.llm import base as llm_base
from app.agents.llm.base import LLMProvider
from app.agents.llm.deepseek import DeepseekProvider
from app.agents.llm.qwen import QwenProvider
from app.config import get_role_config


def _openai_payload(text: str) -> dict:
    return {
        "id": "chatcmpl-test",
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text},
                     "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 1, "completion_tokens": 1},
    }


def _make_provider(cls, handler, model="deepseek-chat"):
    return cls(
        config={"role": cls.role, "api_base": "https://mock.local",
                "api_key": "test-key-not-real", "model": model, "configured": True},
        transport=httpx.MockTransport(handler),
    )


def test_registry_returns_role_providers():
    assert isinstance(llm_base.get_provider("chat"), DeepseekProvider)
    assert isinstance(llm_base.get_provider("vision"), QwenProvider)
    with pytest.raises(KeyError):
        llm_base.get_provider("no-such-role")


def test_chat_model_accepts_legacy_llm_model_and_prefers_chat_model(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key-not-real")
    monkeypatch.setenv("LLM_MODEL", "legacy-chat-model")
    assert get_role_config("chat")["model"] == "legacy-chat-model"

    monkeypatch.setenv("CHAT_MODEL", "role-chat-model")
    assert get_role_config("chat")["model"] == "role-chat-model"


def test_deepseek_chat_non_mock_via_mock_server():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["json"] = __import__("json").loads(request.content)
        return httpx.Response(200, json=_openai_payload("{\"ok\": true}"))

    provider = _make_provider(DeepseekProvider, handler)
    response = provider.chat([{"role": "user", "content": "ping"}],
                             response_format={"type": "json_object"})
    assert response.mock is False
    assert response.text == "{\"ok\": true}"
    assert response.model == "deepseek-chat"
    assert captured["url"] == "https://mock.local/chat/completions"
    assert captured["json"]["model"] == "deepseek-chat"
    assert captured["json"]["response_format"] == {"type": "json_object"}
    # 审计留痕：非 mock、不含 key
    record = provider.call_log[-1]
    assert record.mock is False and "test-key-not-real" not in record.input_summary


def test_chat_falls_back_to_mock_on_http_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "boom"})

    provider = _make_provider(DeepseekProvider, handler)
    response = provider.chat([{"role": "user", "content": "ping"}])
    assert response.mock is True  # 降级链：异常绝不外抛


def test_chat_mock_when_unconfigured():
    provider = DeepseekProvider(config={"role": "chat", "api_base": "", "api_key": "",
                                        "model": "deepseek-chat", "configured": False})
    assert provider.chat([{"role": "user", "content": "ping"}]).mock is True


def test_qwen_analyze_image_sends_multimodal_message():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["json"] = __import__("json").loads(request.content)
        return httpx.Response(200, json=_openai_payload("{\"faces\": []}"))

    provider = _make_provider(QwenProvider, handler, model="qwen-vl-plus")
    response = provider.analyze_image(b"\xff\xd8fake-jpeg", "描述这张图", "image/jpeg")
    assert response.mock is False
    content = captured["json"]["messages"][0]["content"]
    assert content[0]["type"] == "text"
    assert content[1]["type"] == "image_url"
    assert content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_analyze_image_mock_when_unconfigured():
    provider = QwenProvider(config={"role": "vision", "api_base": "", "api_key": "",
                                    "model": "qwen-vl-plus", "configured": False})
    assert provider.analyze_image(b"x", "p").mock is True


def test_base_class_is_extensible():
    """注册表允许第三方替换角色实现（接口级可替换，ARCHITECTURE.md §6）。"""

    class CustomProvider(LLMProvider):
        role = "chat"
        name = "custom"

    llm_base.register_provider("chat", CustomProvider)
    llm_base.reset_providers()
    assert isinstance(llm_base.get_provider("chat"), CustomProvider)
    llm_base.register_provider("chat", DeepseekProvider)  # 还原
    llm_base.reset_providers()
