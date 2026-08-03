"""从 LLM 输出中宽容提取 JSON（决策/对话/视觉分析共用）。

目的：LLM 输出常带代码围栏或前后噪声，解析必须宽容且绝不抛异常。
输入：raw（LLM 原始文本）。
输出：首个合法 JSON 对象 dict；解析失败返回 None。
验收：tests/test_runtime.py —— 纯 JSON / 带围栏 / 带噪声 / 非法输入四种形态。
"""

import json


def extract_json(raw: str) -> dict | None:
    if not raw:
        return None
    candidate = raw.strip()
    if "```" in candidate:
        for part in candidate.split("```")[1:]:
            part = part.strip()
            if part.lower().startswith("json"):
                part = part[4:].strip()
            if part:
                candidate = part
                break
    start, end = candidate.find("{"), candidate.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        data = json.loads(candidate[start:end + 1])
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None
