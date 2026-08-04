"""commonstack provider：image 角色实现（CommonStack 网关，OpenAI 兼容生图）。

目的：体素人物贴图生成（FR-1.5/P-6，ARCHITECTURE.md §5a）走 CommonStack 网关
      （https://api.commonstack.ai/v1，OpenAI chat 兼容）。该网关没有
      /images/generations 端点，生图经 /chat/completions：
      messages=[{"role":"user","content":"Generate an image: <prompt>"}]，
      图片在 choices[0].message.images[0]（data-URL / b64 / http-url 三种形态
      都做防御性解析）。配置按角色读取（IMAGE_* 或根 .env 的 COMMONSTACK_ECHO_*，
      注意 COMMONSTACK_ECHO_MODEL 是聊天模型，生图模型用 COMMONSTACK_ECHO_IMAGE_MODEL）。
输入：generate_image(prompt) / image_gen(prompt, out_path)（基类占位接口的落地）。
输出：generate_image -> PNG 字节；未配置或调用失败返回 deterministic mock PNG
      （PIL 色块，按 prompt 哈希定色），绝不抛异常 —— 与 chat/vision 降级链一致。
验收：tests/test_voxel_pipeline.py —— data-URL/b64/url/错误分支解析与 mock 确定性。

安全：api_key 只存在于 config 与请求头，不进日志/异常/审计留痕（沿用 base 约定）。
生图延迟约 60-120s，默认 timeout 180s，5xx 重试 1 次；调用方应缓存结果省钱。
"""

import base64
import hashlib
import io
import time
from pathlib import Path

import httpx

from app.agents.llm.base import (
    LLMProvider,
    LLMResponse,
    ModelCallRecord,
    register_provider,
)

DEFAULT_TIMEOUT = 180.0
_MAX_RETRIES_5XX = 1


def _decode_data_url(url: str) -> bytes:
    """解析 data:image/png;base64,... 形态；也容忍非 base64 的 data-URL。"""
    header, _, payload = url.partition(",")
    if not payload:
        raise ValueError("data-URL 缺少载荷")
    if ";base64" in header:
        return base64.b64decode(payload)
    from urllib.parse import unquote_to_bytes

    return unquote_to_bytes(payload)


def _extract_image_bytes(message: dict, client: httpx.Client) -> bytes:
    """从 chat completion 的 message 里防御性取图：images[].url / b64_json /
    content 数组内嵌 image_url 都认；http(s) url 则跟随下载一次。"""
    candidates: list[dict] = []
    images = message.get("images")
    if isinstance(images, list):
        candidates.extend(item for item in images if isinstance(item, dict))
    content = message.get("content")
    if isinstance(content, list):  # 部分网关把图放在 content 数组里
        candidates.extend(
            item for item in content
            if isinstance(item, dict) and item.get("type") in ("image_url", "image")
        )
    for item in candidates:
        if isinstance(item.get("image_url"), dict):
            url = item["image_url"].get("url")
        else:
            url = item.get("url")
        if isinstance(url, str) and url:
            if url.startswith("data:"):
                return _decode_data_url(url)
            if url.startswith("http://") or url.startswith("https://"):
                resp = client.get(url)
                resp.raise_for_status()
                return resp.content
        b64 = item.get("b64_json") or item.get("b64")
        if isinstance(b64, str) and b64:
            return base64.b64decode(b64)
    raise ValueError(f"响应中找不到图片载荷（message keys: {sorted(message)}）")


def _mock_png(prompt: str) -> bytes:
    """确定性占位 PNG：按 prompt 哈希铺 8x8 大色块（128x128），离线/测试用。"""
    from PIL import Image

    digest = hashlib.sha256(prompt.encode("utf-8")).digest()
    image = Image.new("RGB", (128, 128))
    pixels = image.load()
    block = 16
    for by in range(128 // block):
        for bx in range(128 // block):
            seed = digest[(bx + by * 8) % len(digest)]
            color = (seed, digest[(bx * 7 + by) % len(digest)],
                     digest[(bx + by * 13) % len(digest)])
            for y in range(by * block, by * block + block):
                for x in range(bx * block, bx * block + block):
                    pixels[x, y] = color
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class CommonStackProvider(LLMProvider):
    """image 角色：CommonStack 网关生图（chat 兼容端点内联图片返回）。"""

    role = "image"
    name = "commonstack"

    def __init__(self, config: dict | None = None, timeout: float = DEFAULT_TIMEOUT,
                 transport=None):
        super().__init__(config=config, timeout=timeout, transport=transport)

    # ---------- 生图接口 ----------

    def generate_image(self, prompt: str) -> bytes:
        """生成一张图，返回 PNG 字节。未配置/失败返回 deterministic mock PNG。"""
        started_at = time.monotonic()
        mock = False
        detail = ""
        if not self.config.get("configured"):
            image_bytes = _mock_png(prompt)
            mock = True
            detail = "未配置 image API（COMMONSTACK_ECHO_API_KEY），返回占位 PNG"
        else:
            try:
                image_bytes = self._generate_http(prompt)
            except Exception as exc:  # 网络/协议任何异常都降级 mock，绝不上抛
                image_bytes = _mock_png(prompt)
                mock = True
                detail = f"生图调用失败已降级：{type(exc).__name__}"
        latency_ms = (time.monotonic() - started_at) * 1000
        # 复用审计结构：output_summary 只记字节数与形态，不落图片内容
        self.call_log.append(
            ModelCallRecord(
                provider=self.name,
                model=self.model,
                input_summary=str([{"role": "user", "content": prompt}])[:200],
                output_summary=f"image_png bytes={len(image_bytes)} {detail}".strip(),
                latency_ms=latency_ms,
                cost=0.0,
                mock=mock,
                created_at=time.time(),
            )
        )
        return image_bytes

    def generate_image_result(self, prompt: str) -> LLMResponse:
        """带 mock 标记的生图（管线需要知道产物是否来自真实模型）。"""
        before = len(self.call_log)
        image_bytes = self.generate_image(prompt)
        record = self.call_log[-1] if len(self.call_log) > before else None
        return LLMResponse(
            text=base64.b64encode(image_bytes).decode("ascii"),
            model=self.model,
            mock=bool(record.mock) if record else False,
            latency_ms=record.latency_ms if record else 0.0,
        )

    def image_gen(self, prompt: str, out_path: str) -> str:
        """基类占位接口落地：生成并写盘，返回 out_path。"""
        image_bytes = self.generate_image(prompt)
        path = Path(out_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(image_bytes)
        return str(path)

    def _generate_http(self, prompt: str) -> bytes:
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": f"Generate an image: {prompt}"}],
        }
        url = f"{self.config['api_base'].rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {self.config['api_key']}"}
        attempts = _MAX_RETRIES_5XX + 1
        last_error: Exception | None = None
        with httpx.Client(timeout=self.timeout, transport=self._transport) as client:
            for attempt in range(attempts):
                try:
                    resp = client.post(url, headers=headers, json=payload)
                    if resp.status_code >= 500 and attempt < attempts - 1:
                        continue  # 5xx 重试一次
                    resp.raise_for_status()
                    data = resp.json()
                    message = data["choices"][0]["message"]
                    return _extract_image_bytes(message, client)
                except httpx.HTTPStatusError as exc:
                    last_error = exc
                    if exc.response.status_code < 500 or attempt >= attempts - 1:
                        raise
            raise RuntimeError(f"生图请求失败：{last_error!r}")


register_provider("image", CommonStackProvider)
