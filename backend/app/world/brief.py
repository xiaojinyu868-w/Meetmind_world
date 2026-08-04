"""晨报 LLM 润色（FR-2.9 增强）：把合并后的真实世界事件改写成温暖的晨报文案。

目的：事件合并（持久化用户互动 + runtime 滚动缓冲）产出的 headline/summary
      是原文拼接，可读性差；chat provider 可用时由 LLM 改写成
      headline ≤ 20 字 + summary ≤ 80 字（2-3 句）的晨报，只准引用给出的
      真实事件、禁止编造；任何失败一律回退模板拼接（调用方负责回退）。
输入：chat provider（chat 角色）、合并后的 echo-world-event.v1 条目列表。
输出：polish_brief() -> {"headline", "summary"} 或 None（mock/解析失败/约束不满足）。
验收：tests/test_user_meeting.py —— 润色生效、超限截断、mock 回退、按
      (event_count, minute) 缓存。
"""

import json
import logging

from app.agents.utils.jsonish import extract_json

logger = logging.getLogger(__name__)

HEADLINE_MAX_CHARS = 20
SUMMARY_MAX_CHARS = 80


def polish_brief(chat_provider, events: list) -> dict | None:
    """LLM 改写晨报文案。未配置/mock/解析失败/缺字段返回 None（调用方回退模板）。

    长度约束在本地兜底执行（截断而非丢弃）：宁可保留一条略生硬的 LLM 文案，
    也不让一次超长的模型输出浪费掉整次调用。
    """
    if chat_provider is None or not chat_provider.config.get("configured"):
        return None
    if not events:
        return None
    material = [
        {"type": str(event.get("type") or ""), "summary": str(event.get("summary") or "")}
        for event in events
        if str(event.get("summary") or "").strip()
    ]
    if not material:
        return None
    messages = [
        {"role": "system", "content": (
            "你是 EchoWorld 的晨报编辑。根据给定的真实世界事件写一条晨报："
            f"headline 不超过 {HEADLINE_MAX_CHARS} 字，summary 为 2-3 句、"
            f"不超过 {SUMMARY_MAX_CHARS} 字；只能引用事件里的事实，禁止编造新事件；"
            "语气温暖克制，像写给主人的清晨便签。"
            "只输出 JSON：{\"headline\": \"...\", \"summary\": \"...\"}。"
        )},
        {"role": "user", "content": "今日真实世界事件（JSON）："
         + json.dumps(material, ensure_ascii=False)},
    ]
    response = chat_provider.chat(messages, response_format={"type": "json_object"})
    if response.mock:
        return None
    data = extract_json(response.text)
    if not data:
        logger.warning("晨报润色解析失败，回退模板：%.80s", response.text)
        return None
    headline = str(data.get("headline") or "").strip()
    summary = str(data.get("summary") or "").strip()
    if not headline or not summary:
        return None
    return {
        "headline": headline[:HEADLINE_MAX_CHARS],
        "summary": summary[:SUMMARY_MAX_CHARS],
    }
