"""模型接口层：抽象可替换（ARCHITECTURE.md §6）。

导入本包即完成 provider 登记：chat→deepseek、vision→qwen、image→commonstack。
取用时一律 `from app.agents.llm import base; base.get_provider(role)`。
"""

from app.agents.llm import commonstack, deepseek, qwen  # noqa: F401  导入即注册 provider
from app.agents.llm.base import get_provider, register_provider, reset_providers  # noqa: F401
