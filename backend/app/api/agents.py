"""IF-6 玩家与 Agent 单聊接口（docs/API.md，INTERACTION-DESIGN.md §2，M1.3）。

目的：
  - POST /api/v0/agents/{person_id}/chat：玩家与人物数字分身 1:1 对话，
    返回 {reply, cited_facts, suggestions, generated_by}；对话不自动入库，
    history 由客户端回显（上限 10 轮）。
  - POST /api/v0/agents/{person_id}/chat/save-note：用户把选中的对话要点
    手动沉淀进推断层（type=player-note，标注"来自玩家转述"）。
输入：person_id 路径参数 + JSON body（pydantic 校验：message 1..500 字）。
输出：见 docs/API.md IF-6；人物不存在 404，身份未确认 403（FR-1.3 可靠性闸）。
验收：tests/test_player_chat.py。

provider 未配置时 chat 返回确定性 mock 回复（generated_by="mock"），不报错。
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
