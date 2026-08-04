"""IF-6 玩家与 Agent 单聊 + 用户发起的圆桌会议接口（docs/API.md，INTERACTION-DESIGN.md §2）。

目的：
  - POST /api/v0/agents/{person_id}/chat：玩家与人物数字分身 1:1 对话，
    返回 {reply, cited_facts, suggestions, generated_by}；对话不自动入库，
    history 由客户端回显（上限 10 轮）。
  - POST /api/v0/agents/{person_id}/chat/save-note：用户把选中的对话要点
    手动沉淀进推断层（type=player-note，标注"来自玩家转述"）。
  - POST /api/v0/agents/meeting：用户发起圆桌会议（2..5 人 + 可选议题），
    runtime 每个世界 tick 产出真实 LLM 会议对话（agent-talk 带 meeting_id）；
    已有会议进行中或参与者在会上 → 409。
  - POST /api/v0/agents/meeting/current/message：玩家对进行中的会议发言，
    下一轮 Agent 发言必须回应；玩家发言 ephemeral，不进任何 Package。
输入：person_id 路径参数 / JSON body（pydantic 校验）。
输出：见 docs/API.md IF-6；人物不存在 404，身份未确认 403（FR-1.3 可靠性闸）。
验收：tests/test_player_chat.py、tests/test_user_meeting.py。

provider 未配置时 chat 返回确定性 mock 回复（generated_by="mock"），不报错；
会议对话未配置时走模板兜底，会议照常推进。
"""

from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.agents import player_chat
from app.agents.llm import get_provider
from app.packages.store import PackageNotFound

router = APIRouter(prefix="/api/v0/agents", tags=["agents"])


class ChatTurn(BaseModel):
    """客户端回显的一轮历史（role 只认 user/assistant，content 截断对齐单条上限）。"""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=player_chat.MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=player_chat.MAX_MESSAGE_CHARS)
    history: list[ChatTurn] = Field(default_factory=list,
                                    max_length=player_chat.MAX_HISTORY_TURNS)


class SaveNoteRequest(BaseModel):
    text: str = Field(min_length=1, max_length=player_chat.MAX_MESSAGE_CHARS)
    source: Literal["player-chat"] = "player-chat"


@router.post("/{person_id}/chat")
def chat_with_agent(request: Request, person_id: str, body: ChatRequest):
    store = request.app.state.store
    memory = request.app.state.memory
    try:
        package = store.load_package(person_id)
    except PackageNotFound:
        raise HTTPException(status_code=404, detail=f"人物不存在：{person_id}")
    # FR-1.3：未确认身份不进 Agent 上下文（数据可靠性闸，与隐私过滤无关）
    if not package["identity"].get("confirmed"):
        raise HTTPException(status_code=403, detail="身份未确认，不进入 Agent 上下文")
    result = player_chat.chat_with_player(
        memory, store, get_provider("chat"), person_id,
        body.message.strip(), [turn.model_dump() for turn in body.history],
    )
    if result is None:  # 理论不可达（上方已校验），保底
        raise HTTPException(status_code=404, detail=f"人物不存在：{person_id}")
    return {"person_id": person_id, **result}


@router.post("/{person_id}/chat/save-note", status_code=201)
def save_chat_note(request: Request, person_id: str, body: SaveNoteRequest):
    store = request.app.state.store
    try:
        store.load_package(person_id)
    except PackageNotFound:
        raise HTTPException(status_code=404, detail=f"人物不存在：{person_id}")
    return player_chat.save_chat_note(store, person_id, body.text)


# ---------- IF-6 用户发起的圆桌会议（真实 LLM 会议对话） ----------


class MeetingStartRequest(BaseModel):
    """发起用户圆桌会议：2..5 名在场人物 + 可选议题（≤80 字）。"""

    participant_ids: list[str] = Field(min_length=2, max_length=5)
    topic: str | None = Field(default=None, max_length=80)


class MeetingMessageRequest(BaseModel):
    """玩家（会议发起人）对进行中的会议说的话。"""

    text: str = Field(min_length=1, max_length=200)


@router.post("/meeting")
def start_meeting(request: Request, body: MeetingStartRequest):
    """用户发起圆桌会议：世界侧入座圆桌 + runtime 按 tick 产出真实会议对话
    （agent-talk 带 meeting_id）。会议进行中或有参与者已在会上 → 409。"""
    world = request.app.state.world
    runtime = request.app.state.runtime
    if world.current_meeting is not None or runtime.meeting_in_progress:
        raise HTTPException(status_code=409, detail="圆桌已有一场会议在进行")
    participant_ids = list(dict.fromkeys(body.participant_ids))  # 去重保序
    if len(participant_ids) < 2:
        raise HTTPException(status_code=422, detail="圆桌会议至少需要 2 位参与者")
    agents = {agent["id"]: agent for agent in world.snapshot()["agents"]}
    unknown = [pid for pid in participant_ids if pid not in agents]
    if unknown:
        raise HTTPException(status_code=404, detail=f"人物不在世界里：{', '.join(unknown)}")
    busy = [pid for pid in participant_ids if agents[pid].get("state") == "in-meeting"]
    if busy:
        raise HTTPException(status_code=409, detail=f"已在会议中：{', '.join(busy)}")
    meeting = runtime.start_user_meeting(
        participant_ids, topic=body.topic, tick=world.tick,
    )
    if meeting is None:  # 理论不可达（上方已查冲突），保底
        raise HTTPException(status_code=409, detail="圆桌已有一场会议在进行")
    if world.current_meeting is None:
        # 世界侧入座失败（圆桌座位不足）：回滚 runtime 记账，不留下半截会议
        runtime.cancel_meeting(meeting["meeting_id"])
        raise HTTPException(status_code=409, detail="圆桌暂时没有足够空位，请稍后再试")
    return {"state": "running", **meeting}


@router.post("/meeting/current/message")
def post_meeting_message(request: Request, body: MeetingMessageRequest):
    """玩家对进行中的用户会议发言：存为当前讨论点，下一轮 Agent 发言必须回应。
    玩家发言只活在会议记账里，不写入任何 Package。无用户会议进行中 → 409。"""
    result = request.app.state.runtime.post_player_message(body.text)
    if result is None:
        raise HTTPException(status_code=409, detail="当前没有进行中的圆桌会议")
    return result
