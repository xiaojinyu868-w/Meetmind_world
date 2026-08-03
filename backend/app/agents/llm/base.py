"""LLMProvider 统一抽象 + 按角色注册的 provider 注册表（ARCHITECTURE.md §6）。

目的：chat(messages, tools) -> response 统一接口；多模态（图像理解/人脸 embedding/
      生图/转写）各自独立接口占位；所有模型调用留痕（输入摘要、输出、耗时、费用）。
      provider 按角色登记（chat=deepseek 决策、vision=qwen-vl 图像理解），
      调用方一律经 get_provider(role) 获取，接口级可替换。
输入：messages（OpenAI 风格）、可选 tools、response_format（JSON 约束）。
输出：LLMResponse（text/model/mock/latency_ms/cost）；analyze_image 返回 LLMResponse。
验收：未配置 API 时任何 provider 调用返回 mock 且不报错（降级链保留）；
      tests/test_providers.py —— 注册表按角色取到正确 provider。

安全：api_key 只存在于 config dict 与请求头，绝不进入日志/异常消息/审计留痕。
"""

import time
from abc import ABC
from dataclasses import dataclass, field

import httpx

from app.config import get_role_config


@dataclass
class LLMResponse:
    text: str
    model: str
    mock: bool = False
    latency_ms: float = 0.0
    cost: float = 0.0
    raw: dict = field(default_factory=dict)


@dataclass
class ModelCallRecord:
    """一次模型调用的审计记录（推断层对账用，CONTEXT-AND-MEMORY.md §1 防线 #5）。"""

    provider: str
    model: str
    input_summary: str
    output_summary: str
    latency_ms: float
    cost: float
    mock: bool
    created_at: float


class LLMProvider(ABC):
    """所有 LLM provider 的基类；实现类必须保证未配置时降级 mock 而非报错。

    role：登记角色（chat/vision）；子类以此从 config 取按角色分组的配置。
    transport：可选 httpx transport，测试注入 MockTransport 用，不耗真实额度。
    """

    role = "base"
    name = "base"

    def __init__(self, config: dict | None = None, timeout: float = 30.0, transport=None):
        self.config = config or get_role_config(self.role)
        self.timeout = timeout
        self._transport = transport
        self.call_log: list[ModelCallRecord] = []

    @property
    def model(self) -> str:
        return self.config.get("model") or "unknown"

    # ---------- 统一对话接口（OpenAI 兼容 /chat/completions 模板方法） ----------

    def chat(self, messages: list, tools: list | None = None,
             response_format: dict | None = None) -> LLMResponse:
        """统一对话接口。未配置或调用异常一律降级 mock，绝不上抛。"""
        started_at = time.monotonic()
        if not self.config.get("configured"):
            response = self._mock_response(messages, reason="未配置 LLM API 中转")
        else:
            try:
                response = self._chat_http(messages, tools, response_format)
            except Exception as exc:  # 网络/协议任何异常都降级 mock，绝不上抛
                response = self._mock_response(messages, reason=f"调用失败已降级：{type(exc).__name__}")
        response.latency_ms = (time.monotonic() - started_at) * 1000
        self._record(self.model, messages, response, started_at)
        return response

    def _chat_http(self, messages: list, tools: list | None,
                   response_format: dict | None) -> LLMResponse:
        payload = {"model": self.model, "messages": messages}
        if tools:
            payload["tools"] = tools
        if response_format:
            payload["response_format"] = response_format
        with httpx.Client(timeout=self.timeout, transport=self._transport) as client:
            resp = client.post(
                f"{self.config['api_base'].rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {self.config['api_key']}"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
        text = data["choices"][0]["message"]["content"] or ""
        return LLMResponse(text=text, model=self.model, mock=False, raw=data)

    def _mock_response(self, messages: list, reason: str) -> LLMResponse:
        last = ""
        if messages:
            last = str(messages[-1].get("content", ""))[:50]
        return LLMResponse(
            text=f"[mock:{self.model}] {reason}，返回占位回复。最后一条消息摘要：{last}",
            model=self.model,
            mock=True,
        )

    # ---------- 多模态接口（抽象占位，各自独立 provider，配置登记在 .env） ----------

    def analyze_image(self, image_bytes: bytes, prompt: str, mime: str = "image/jpeg") -> LLMResponse:
        """图像理解（关键帧分析/人脸候选/场景标签）。基类默认未接入，返回 mock。"""
        return LLMResponse(
            text=f"[mock:{self.model}] analyze_image 未接入 provider",
            model=self.model, mock=True,
        )

    def face_embedding(self, image_path: str) -> list:
        """人脸 embedding。MVP1 只做存储不做匹配（voiceprint 同理），接口预留。"""
        raise NotImplementedError("face_embedding 尚未接入 provider")

    def image_gen(self, prompt: str, out_path: str) -> str:
        """生图（三视图生成等用途）。接口预留。"""
        raise NotImplementedError("image_gen 尚未接入 provider")

    def transcribe(self, audio_path: str) -> str:
        """语音转写。转写文本与原始音频双份留存（防线 #2）。接口预留。"""
        raise NotImplementedError("transcribe 尚未接入 provider")

    # ---------- 调用留痕（不含 key 与请求头） ----------

    def _record(self, model: str, messages: list, response: LLMResponse,
                started_at: float) -> None:
        input_summary = str(messages)[:200]
        self.call_log.append(
            ModelCallRecord(
                provider=self.name,
                model=model,
                input_summary=input_summary,
                output_summary=response.text[:200],
                latency_ms=(time.monotonic() - started_at) * 1000,
                cost=response.cost,
                mock=response.mock,
                created_at=time.time(),
            )
        )


# ---------- provider 注册表：按角色取 provider（lazy 单例） ----------

_FACTORIES: dict = {}
_INSTANCES: dict = {}


def register_provider(role: str, factory) -> None:
    """登记某角色的 provider 工厂（在 provider 模块导入时调用）。"""
    _FACTORIES[role] = factory


def get_provider(role: str = "chat") -> LLMProvider:
    if role not in _FACTORIES:
        raise KeyError(f"没有登记角色的 provider：{role!r}（已登记：{sorted(_FACTORIES)}）")
    if role not in _INSTANCES:
        _INSTANCES[role] = _FACTORIES[role]()
    return _INSTANCES[role]


def reset_providers() -> None:
    """清空单例缓存（测试隔离用）。"""
    _INSTANCES.clear()
