"""deepseek provider：chat/决策角色的默认实现（计划 §1.2）。

目的：世界决策、对话生成、摘要等文本任务走 deepseek（OpenAI 兼容
      https://api.deepseek.com），配置按角色读取（CHAT_* 或根 .env 的 DEEPSEEK_*）。
输入：同 base.LLMProvider.chat（messages/tools/response_format）。
输出：LLMResponse；未配置或异常时降级 mock（mock=True），不报错。
验收：tests/test_providers.py —— mock server 下 chat 非 mock 且解析正确；
      真实联通冒烟见 tests/test_live_smoke.py（RUN_LIVE_TESTS=1 才跑）。

支持 response_format={"type": "json_object"}（deepseek JSON 约束输出），
供 runtime 决策与对话生成的结构化解析。
"""

from app.agents.llm.base import LLMProvider, register_provider


class DeepseekProvider(LLMProvider):
    role = "chat"
    name = "deepseek"


register_provider("chat", DeepseekProvider)
