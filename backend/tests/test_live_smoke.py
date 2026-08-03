"""真实 LLM 联通冒烟（默认 skip；RUN_LIVE_TESTS=1 才运行，消耗真实额度）。

安全红线：只断言"非 mock 且有内容"，不打印/不断言任何 key、base 或请求头。
"""

import os

import pytest

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(os.environ.get("RUN_LIVE_TESTS") != "1",
                       reason="真实 LLM 冒烟：RUN_LIVE_TESTS=1 才跑"),
]


def test_chat_live_non_mock():
    from app.agents.llm import get_provider, reset_providers

    reset_providers()
    provider = get_provider("chat")
    assert provider.config["configured"], "chat 角色未配置（检查根 .env 映射）"
    response = provider.chat([{"role": "user", "content": "只回复两个字：你好"}])
    assert response.mock is False
    assert response.text.strip()
    assert provider.call_log[-1].mock is False
