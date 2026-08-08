"""全局配置：读取 .env / 环境变量。

目的：集中管理按角色分组的 LLM 配置（chat=deepseek 决策、vision=dashscope qwen-vl
      多模态）、Blender 路径、数据目录，避免散落各模块。
输入：环境变量；.env 文件（优先级：ECHO_ENV_FILE 指定 > backend/.env > 仓库根 .env；
      已存在的真实环境变量永远优先，文件只补空缺）。
输出：get_role_config(role) / get_llm_config()（旧接口保留）/ get_blender_path() / get_data_dir()。
验收：未配置任何环境变量时全部返回安全默认值（configured=False），不抛异常。

安全红线：根 .env 含真实 API key，只准本模块程序读取；任何代码/测试/日志
不得打印其内容。根 .env 变量命名与本文件 _ROLE_ENV_MAP 做映射。
"""

import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_ROOT.parent
BACKEND_ENV_FILE = BACKEND_ROOT / ".env"
ROOT_ENV_FILE = REPO_ROOT / ".env"

DEFAULT_BLENDER_PATH = "/root/meetmind_go/blender-4.5.12-linux-x64/blender"
DEFAULT_LLM_MODEL = "qwen3.7plus"
DEFAULT_CHAT_MODEL = "deepseek-chat"
DEFAULT_CHAT_API_BASE = "https://api.deepseek.com"
DEFAULT_VISION_MODEL = "qwen-vl-plus"
DEFAULT_VISION_API_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1"
DEFAULT_IMAGE_MODEL = "openai/gpt-image-2"
DEFAULT_IMAGE_API_BASE = "https://api.commonstack.ai/v1"
DEFAULT_WORLDGEN_BASE_URL = "https://api.worldlabs.ai/marble/v1"
DEFAULT_WORLDGEN_MODEL = "marble-1.1"

# 角色 → 环境变量映射：第一个非空的生效。CHAT_*/VISION_* 为本后端约定名，
# DEEPSEEK_*/DASHSCOPE_* 为根 .env 的实际命名（以其为准做映射）。
_ROLE_ENV_MAP = {
    "chat": {
        "api_base": ("CHAT_API_BASE", "DEEPSEEK_BASE_URL"),
        "api_key": ("CHAT_API_KEY", "DEEPSEEK_API_KEY"),
        "model": ("CHAT_MODEL", "LLM_MODEL"),
        "default_base": DEFAULT_CHAT_API_BASE,
        "default_model": DEFAULT_CHAT_MODEL,
    },
    "vision": {
        "api_base": ("VISION_API_BASE", "DASHSCOPE_BASE_URL"),
        "api_key": ("VISION_API_KEY", "DASHSCOPE_API_KEY"),
        "model": ("VISION_MODEL",),
        "default_base": DEFAULT_VISION_API_BASE,
        "default_model": DEFAULT_VISION_MODEL,
    },
    "image": {
        "api_base": ("IMAGE_API_BASE", "COMMONSTACK_ECHO_BASE_URL"),
        "api_key": ("IMAGE_API_KEY", "COMMONSTACK_ECHO_API_KEY"),
        # 注意：COMMONSTACK_ECHO_MODEL 是聊天模型，生图模型独立用
        # COMMONSTACK_ECHO_IMAGE_MODEL 登记，缺省 openai/gpt-image-2。
        "model": ("IMAGE_MODEL", "COMMONSTACK_ECHO_IMAGE_MODEL"),
        "default_base": DEFAULT_IMAGE_API_BASE,
        "default_model": DEFAULT_IMAGE_MODEL,
    },
}


def _load_env_file(path: Path) -> None:
    """把 .env 中的 key=value 写入环境变量（不覆盖已有环境变量）。"""
    if not path or not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def _load_dotenv() -> None:
    """加载 .env：ECHO_ENV_FILE 指定时只读它；否则 backend/.env 优先、根 .env 补空缺。"""
    override = os.environ.get("ECHO_ENV_FILE", "").strip()
    if override:
        _load_env_file(Path(override))
        return
    _load_env_file(BACKEND_ENV_FILE)
    _load_env_file(ROOT_ENV_FILE)


_load_dotenv()


def _first_env(names: tuple) -> str:
    for name in names:
        value = os.environ.get(name, "").strip()
        if value:
            return value
    return ""


def get_role_config(role: str) -> dict:
    """按角色返回 LLM 配置；缺 key 时 configured=False，provider 走 mock 降级。"""
    if role not in _ROLE_ENV_MAP:
        raise KeyError(f"未知 LLM 角色：{role!r}（已登记：{sorted(_ROLE_ENV_MAP)}）")
    mapping = _ROLE_ENV_MAP[role]
    api_key = _first_env(mapping["api_key"])
    api_base = _first_env(mapping["api_base"]) or mapping["default_base"]
    return {
        "role": role,
        "api_base": api_base,
        "api_key": api_key,
        "model": _first_env(mapping["model"]) or mapping["default_model"],
        "configured": bool(api_key),
    }


def get_llm_config() -> dict:
    """旧版通用 LLM 配置（LLM_API_BASE/LLM_API_KEY/LLM_MODEL），保留向后兼容。"""
    api_base = os.environ.get("LLM_API_BASE", "").strip()
    api_key = os.environ.get("LLM_API_KEY", "").strip()
    return {
        "api_base": api_base,
        "api_key": api_key,
        "model": os.environ.get("LLM_MODEL", DEFAULT_LLM_MODEL).strip() or DEFAULT_LLM_MODEL,
        "configured": bool(api_base and api_key),
    }


def _float_env(name: str, default: float) -> float:
    raw = os.environ.get(name, "").strip()
    try:
        return float(raw)
    except ValueError:
        return default


def get_worldgen_config() -> dict:
    """World Labs Marble 世界生成配置（WORLDLABS_*，ARCHITECTURE.md §5a）。

    未配置 WORLDLABS_API_KEY 时 configured=False，world_gen provider 走 mock
    降级（场域世界保持 status="none"，前端继续用程序化场域），不抛异常。
    key 只被程序读取进请求头，绝不进日志/审计留痕。
    """
    return {
        "api_base": os.environ.get("WORLDLABS_BASE_URL", "").strip()
        or DEFAULT_WORLDGEN_BASE_URL,
        "api_key": os.environ.get("WORLDLABS_API_KEY", "").strip(),
        "model": os.environ.get("WORLDLABS_MODEL", "").strip() or DEFAULT_WORLDGEN_MODEL,
        "configured": bool(os.environ.get("WORLDLABS_API_KEY", "").strip()),
        "poll_interval_seconds": max(
            0.1, _float_env("WORLDLABS_POLL_INTERVAL_SECONDS", 15.0)),
        "poll_timeout_seconds": max(
            1.0, _float_env("WORLDLABS_POLL_TIMEOUT_SECONDS", 1200.0)),
    }


def get_blender_path() -> str:
    """Blender 无头二进制：BLENDER_PATH 显式指定优先；否则优先仓库自带的
    blender-4.5.12（worktree/软链场景也能命中），最后回退历史默认绝对路径。"""
    override = os.environ.get("BLENDER_PATH", "").strip()
    if override:
        return override
    local = REPO_ROOT / "blender-4.5.12-linux-x64" / "blender"
    if local.exists():
        return str(local)
    return DEFAULT_BLENDER_PATH


def get_data_dir() -> Path:
    """运行期数据目录（facts/ inferences/ people/ derived/ 的根）。"""
    raw = os.environ.get("ECHO_DATA_DIR", "").strip()
    return Path(raw) if raw else BACKEND_ROOT / "data"


def get_world_heartbeat_seconds() -> float:
    """Legacy cafe/hall heartbeat; v1 rooms remain event-driven."""
    raw = os.environ.get("ECHO_WORLD_HEARTBEAT_SECONDS", "15").strip()
    try:
        value = float(raw)
    except ValueError:
        return 15.0
    return max(0.25, value)


def get_physical_ai_token() -> str:
    """K3 Context Hub 接收接口使用的 Bearer token。"""
    return os.environ.get("PHYSICAL_AI_AGENT_TOKEN", "").strip()


def get_physical_ai_package_schema() -> Path | None:
    """返回联调负责人提供的 agent-package JSON Schema 路径（可选）。"""
    raw = os.environ.get("PHYSICAL_AI_PACKAGE_SCHEMA", "").strip()
    return Path(raw) if raw else None
