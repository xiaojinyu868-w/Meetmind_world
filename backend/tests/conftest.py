"""pytest 共享夹具：导入路径、数据目录隔离、LLM 环境隔离。

安全红线：测试默认清空所有 LLM key/base 环境变量（autouse），任何用例都不会
意外消耗真实额度或外发请求；只有标 @pytest.mark.live 且 RUN_LIVE_TESTS=1 的
冒烟用例保留真实环境（真实 key 只被 provider 程序读取，不进断言/日志）。
"""

import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# 任何 app 导入之前，把运行期数据目录指到临时位置，避免污染 backend/data
os.environ.setdefault("ECHO_DATA_DIR", tempfile.mkdtemp(prefix="echoworld-test-"))

# 按角色分组的 key/base + 根 .env 的实际命名（映射源），测试一律清空
LLM_ENV_KEYS = (
    "CHAT_API_BASE", "CHAT_API_KEY", "CHAT_MODEL",
    "VISION_API_BASE", "VISION_API_KEY", "VISION_MODEL",
    "IMAGE_API_BASE", "IMAGE_API_KEY", "IMAGE_MODEL",
    "DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL",
    "DASHSCOPE_API_KEY", "DASHSCOPE_BASE_URL",
    "COMMONSTACK_ECHO_API_KEY", "COMMONSTACK_ECHO_BASE_URL",
    "COMMONSTACK_ECHO_IMAGE_MODEL",
    "LLM_API_BASE", "LLM_API_KEY",
)


@pytest.fixture(autouse=True)
def _isolate_llm_env(request, monkeypatch):
    """非 live 用例：清空 LLM 环境变量并重置 provider 单例（测试间隔离）。"""
    from app.agents.llm import base as llm_base

    if request.node.get_closest_marker("live"):
        llm_base.reset_providers()
        yield
        llm_base.reset_providers()
        return
    for key in LLM_ENV_KEYS:
        monkeypatch.setenv(key, "")
    llm_base.reset_providers()
    yield
    llm_base.reset_providers()
