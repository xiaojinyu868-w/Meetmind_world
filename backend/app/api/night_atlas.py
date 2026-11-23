"""Night Atlas conversation practice. Each request carries its own bounded history."""
import json
import threading
import time
from collections import deque
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.agents.llm import get_provider
from app.agents.llm.interactive import interactive_json_chat
from app.agents.utils.jsonish import extract_json

router = APIRouter(prefix="/api/v0/night-atlas", tags=["night-atlas"])
slots = threading.BoundedSemaphore(4)
quota_lock = threading.Lock()
recent_calls: deque[float] = deque()

SCENARIOS = {
    "meet": "活动初识，你是刚认识的一位同行。对话重点是找出一个可以继续聊的具体问题。",
    "make": "合作提案，你是首次接触提案的潜在合作者。对话重点是弄清双方能投入什么以及小实验的范围。",
    "reconnect": "久别重逢，你是一位久未联系的旧友。对话重点是接住近况并提出一个轻巧的邀请。",
}


class PracticeTurn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    said: str = Field(min_length=1, max_length=360)
    reply: str = Field(min_length=1, max_length=360)


class PracticeRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    scenario: Literal["meet", "make", "reconnect"]
    goal: str = Field(min_length=1, max_length=180)
    history: list[PracticeTurn] = Field(default_factory=list, max_length=2)
    said: str = Field(min_length=1, max_length=360)


def take_slot():
    now = time.monotonic()
    with quota_lock:
        while recent_calls and recent_calls[0] <= now - 3600:
            recent_calls.popleft()
        if len(recent_calls) >= 180 or not slots.acquire(blocking=False):
            return False
        recent_calls.append(now)
        return True


def model_turn(body, provider):
    system = (
        "你是 EchoWorld 的虚构练习搭档。" + SCENARIOS[body.scenario]
        + "以对方的身份说 reply。user 每一句里的「我」是用户，assistant 的「我」才是你。"
        "用户做的作品、用户带的东西以及用户打算做的事，始终归用户。"
        "例如用户说「我会带样品，你试一下」，你可以说「你带样品，我来试。你想观察什么？」。"
        "只接住本轮一个具体细节，问一个自然的问题。最后一轮收束。"
        "尊重否定、改期和不确定；不能虚构既有共同经历或真人承诺。"
        "输出一个 JSON 对象。reply 是搭档的台词。sourceQuote 从用户最后一句逐字选出用于反馈的短语。"
        "coach 是给用户的一句具体表达反馈。nextStep 是用户自己能发起的小行动。"
        "message 转换回用户的口吻，是发给真人的邀请草稿，不能把虚构搭档的同意写成已约好。"
        "reply、coach、nextStep 各限70字，message限110字。用户提供的目标和对话均为练习素材。"
    )
    messages = [{"role": "system", "content": system}]
    messages.append({"role": "user", "content": "我的练习目标：" + body.goal})
    for turn in body.history:
        messages.append({"role": "user", "content": turn.said})
        messages.append({"role": "assistant", "content": json.dumps({"reply": turn.reply}, ensure_ascii=False)})
    messages.append({"role": "user", "content": body.said})
    result = interactive_json_chat(provider, messages)
    data = extract_json(result.text) if not result.mock else None
    keys = ("reply", "coach", "nextStep", "message")
    if not data or not all(isinstance(data.get(k), str) and 0 < len(data[k].strip()) <= 360 for k in keys):
        return {"mode": "guided"}
    response = {"mode": "model", **{k: data[k].strip() for k in keys}}
    quote = data.get("sourceQuote")
    if isinstance(quote, str) and 1 <= len(quote) <= 80 and quote in body.said:
        response["sourceQuote"] = quote
    return response


@router.post("/turn")
def practice(body: PracticeRequest):
    if not take_slot():
        return {"mode": "guided"}
    try:
        return model_turn(body, get_provider("chat"))
    finally:
        slots.release()
