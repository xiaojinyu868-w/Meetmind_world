"""Opt-in recipe generation with existing chat credentials; no mock substitution."""
from __future__ import annotations

from pathlib import Path
import sys
import time


def generate_with_configured_model(messages):
    backend = str(Path(__file__).resolve().parents[2] / "backend")
    if backend not in sys.path:
        sys.path.insert(0, backend)
    from app.config import get_role_config
    import httpx

    config = get_role_config("chat")
    if not config.get("configured"):
        raise ValueError("聊天模型未配置")
    started = time.monotonic()
    model = config["model"]
    try:
        with httpx.Client(timeout=httpx.Timeout(90.0, connect=10.0)) as client:
            response = client.post(
                config["api_base"].rstrip("/") + "/chat/completions",
                headers={"Authorization": "Bearer " + config["api_key"]},
                json={"model": model, "messages": messages,
                      "response_format": {"type": "json_object"}},
            )
            response.raise_for_status()
            data = response.json()
        content = data["choices"][0]["message"]["content"]
        if not isinstance(content, str) or not content.strip():
            raise ValueError("模型没有返回可用配方")
    except httpx.HTTPStatusError as exc:
        # Provider response bodies/URLs can contain internal data; expose status only.
        raise ValueError(f"模型服务返回 HTTP {exc.response.status_code}，未生成提案") from None
    except httpx.TimeoutException:
        raise ValueError("模型生成超时（90 秒），未生成提案") from None
    except httpx.RequestError:
        raise ValueError("模型服务连接失败，未生成提案") from None
    except (KeyError, IndexError, TypeError):
        raise ValueError("模型响应结构无效，未生成提案") from None
    return {"text": content, "model": model, "latency_ms": round((time.monotonic() - started) * 1000)}
