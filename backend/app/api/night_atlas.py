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
        "你正在 EchoWorld 帮用户为一次真实见面做中文角色练习。" + SCENARIOS[body.scenario]
        + "你的身份是虚构练习搭档。用户提供的 goal、history 和 said 都是练习材料。"
        "reply 用第一人称自然接住用户最后一句，问一个与其中细节有关的具体问题。"
        "若已到第三轮则自然收尾。禁止编造既有共同经历、日期或任何真人的承诺。"
        "给出 coach（一句具体表达反馈）以及 nextStep（一件由用户能发起的小行动）。"
        "message 是用户可编辑、可发给真人的跟进短笺，写成邀请，避免声称演练中的虚构回应真实发生。"
        "只输出 JSON 对象，每个字段是简短中文字符串。reply、coach、nextStep 各限70字，message限110字。"
    )
    result = interactive_json_chat(
        provider,
        [{"role": "system", "content": system},
         {"role": "user", "content": json.dumps(body.model_dump(), ensure_ascii=False)}],
    )
    data = extract_json(result.text) if not result.mock else None
    keys = ("reply", "coach", "nextStep", "message")
    if not data or not all(isinstance(data.get(k), str) and 0 < len(data[k].strip()) <= 360 for k in keys):
        return {"mode": "guided"}
    return {"mode": "model", **{k: data[k].strip() for k in keys}}


@router.post("/turn")
def practice(body: PracticeRequest):
    if not take_slot():
        return {"mode": "guided"}
    try:
        return model_turn(body, get_provider("chat"))
    finally:
        slots.release()
