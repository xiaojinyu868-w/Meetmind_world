"""玩家与 Agent 单聊接口测试（IF-6，docs/API.md；INTERACTION-DESIGN.md §2）。

覆盖：chat happy path（cited_facts 白名单过滤）/ JSON 解析宽容（围栏、噪声、
彻底损坏）/ provider 未配置 mock 兜底 / 404 与 403 / message 长度校验 /
save-note 推断形状（player-note + 来自玩家转述）/ 首轮结构化开场。
provider 一律注入 fake，不消耗真实额度（conftest 已清空 LLM 环境变量）。
"""

import pytest
from fastapi.testclient import TestClient

from app.agents.llm import base as llm_base
from app.agents.llm.base import LLMProvider, LLMResponse
from app.main import create_app


class FakeChatProvider(LLMProvider):
    """测试注入的 chat provider：按预设文本返回，mock=False。"""

    role = "chat"
    name = "fake"

    def __init__(self, text: str):
        super().__init__(config={"configured": True, "model": "fake-chat-v0"})
        self._text = text
        self.seen_messages = None

    def chat(self, messages, tools=None, response_format=None, model=None):
        self.seen_messages = messages
        return LLMResponse(text=self._text, model="fake-chat-v0", mock=False)


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def _inject_provider(client, monkeypatch, provider):
    """把 fake provider 塞进注册表单例缓存（路由在请求期 get_provider("chat")）。"""
    monkeypatch.setitem(llm_base._INSTANCES, "chat", provider)
    return provider


def test_chat_happy_path_filters_cited_facts(client, monkeypatch):
    _inject_provider(client, monkeypatch, FakeChatProvider(
        '{"reply": "那次在科技展咖啡摊借记号笔认识的。", '
        '"cited_facts": ["facts/seed/lin-che/note.v1.md", "facts/hallucinated/x.md", 42], '
        '"suggestions": ["后来那支笔呢？", "再聊聊咖啡"]}'
    ))
    resp = client.post("/api/v0/agents/lin-che/chat",
                       json={"message": "我们怎么认识的？"})
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["person_id"] == "lin-che"
    assert "记号笔" in payload["reply"]
    # 幻觉指针与非字符串项被白名单过滤
    assert payload["cited_facts"] == ["facts/seed/lin-che/note.v1.md"]
    # 首轮（无 history）：suggestions 由系统基于资料生成，不采用模型输出
    assert payload["suggestions"] != ["后来那支笔呢？", "再聊聊咖啡"]
    assert any("咖啡" in item or "产品" in item for item in payload["suggestions"])
    assert payload["generated_by"] == "fake-chat-v0"


def test_chat_history_is_echoed_to_model(client, monkeypatch):
    provider = _inject_provider(client, monkeypatch, FakeChatProvider(
        '{"reply": "接着上次说。", "cited_facts": [], "suggestions": ["然后呢？"]}'
    ))
    history = [
        {"role": "user", "content": "你好"},
        {"role": "assistant", "content": "你好呀"},
    ]
    resp = client.post("/api/v0/agents/lin-che/chat",
                       json={"message": "继续", "history": history})
    assert resp.status_code == 200
    roles = [message["role"] for message in provider.seen_messages]
    assert roles == ["system", "user", "assistant", "user"]
    assert provider.seen_messages[1]["content"] == "你好"
    # 非首轮：suggestions 采用模型输出
    assert resp.json()["suggestions"] == ["然后呢？"]


def test_chat_first_turn_suggestions_are_system_generated(client, monkeypatch):
    _inject_provider(client, monkeypatch, FakeChatProvider(
        '{"reply": "你好。", "cited_facts": [], "suggestions": []}'
    ))
    resp = client.post("/api/v0/agents/lin-che/chat", json={"message": "在吗"})
    assert resp.status_code == 200
    suggestions = resp.json()["suggestions"]
    assert 1 <= len(suggestions) <= 3
    # 首轮结构化开场基于授权资料（种子标签：创作伙伴/产品/咖啡）
    assert any("咖啡" in item or "产品" in item or "创作" in item for item in suggestions)


def test_chat_json_parse_tolerance_fenced(client, monkeypatch):
    _inject_provider(client, monkeypatch, FakeChatProvider(
        '好的，以下是回复：\n```json\n{"reply": "围栏里的回复。", '
        '"cited_facts": [], "suggestions": ["再聊聊"]}\n```\n以上是 JSON。'
    ))
    resp = client.post("/api/v0/agents/lin-che/chat", json={"message": "test"})
    assert resp.status_code == 200
    assert resp.json()["reply"] == "围栏里的回复。"


def test_chat_json_parse_broken_falls_back_to_raw_text(client, monkeypatch):
    _inject_provider(client, monkeypatch, FakeChatProvider("这不是 JSON，就是一句话。"))
    resp = client.post("/api/v0/agents/lin-che/chat", json={"message": "test"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["reply"] == "这不是 JSON，就是一句话。"
    assert payload["cited_facts"] == []
    assert payload["generated_by"] == "fake-chat-v0"


def test_chat_mock_fallback_when_provider_unconfigured(client):
    # conftest 已清空 LLM key：provider 未配置 → 确定性 mock 回复
    resp = client.post("/api/v0/agents/lin-che/chat", json={"message": "咖啡最近怎么样"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["generated_by"] == "mock"
    assert payload["reply"]
    # 消息命中授权标签「咖啡」→ mock 回复围绕它并引用真实推断 id
    assert "咖啡" in payload["reply"]
    assert payload["cited_facts"] == ["enc_seed/inf_seed_tags"]


def test_chat_person_not_found(client):
    resp = client.post("/api/v0/agents/no-such-person/chat", json={"message": "hi"})
    assert resp.status_code == 404


def test_chat_message_length_validation(client):
    assert client.post("/api/v0/agents/lin-che/chat", json={"message": ""}).status_code == 422
    assert client.post(
        "/api/v0/agents/lin-che/chat", json={"message": "长" * 501}
    ).status_code == 422
    # history 超 10 轮同样拒绝
    history = [{"role": "user", "content": "x"}] * 11
    assert client.post(
        "/api/v0/agents/lin-che/chat", json={"message": "hi", "history": history}
    ).status_code == 422


def test_save_note_writes_player_note_inference(client):
    resp = client.post("/api/v0/agents/lin-che/chat/save-note",
                       json={"text": "TA 说想再办一次校园地图展", "source": "player-chat"})
    assert resp.status_code == 201, resp.text
    payload = resp.json()
    assert payload["inference_ref"].startswith("inferences/lin-che/player-note-")
    note = payload["note"]
    assert note["type"] == "player-note"
    assert note["author"] == "来自玩家转述"
    assert note["confidence"] == 1.0
    assert note["source"] == {"type": "player-chat"}
    # 落盘可读回（推断层，可重算目录）
    store = client.app.state.store
    stored = store.read_inferences("lin-che")
    match = [p for p in stored.values()
             if p.get("note", {}).get("id") == note["id"]]
    assert len(match) == 1
    assert match[0]["schema"] == "echo-player-note.v1"
    assert match[0]["generated"] is False


def test_save_note_person_not_found(client):
    resp = client.post("/api/v0/agents/no-such-person/chat/save-note",
                       json={"text": "hello"})
    assert resp.status_code == 404


def test_save_note_enters_later_chat_context(client, monkeypatch):
    """手动沉淀的 player-note 进入后续对话的授权上下文（prompt 注入）。"""
    client.post("/api/v0/agents/lin-che/chat/save-note",
                json={"text": "玩家转述：TA 最近在筹备海边摄影展"})
    provider = _inject_provider(client, monkeypatch, FakeChatProvider(
        '{"reply": "我记得你说过。", "cited_facts": [], "suggestions": []}'
    ))
    resp = client.post("/api/v0/agents/lin-che/chat", json={"message": "摄影展呢？"})
    assert resp.status_code == 200
    prompt_text = provider.seen_messages[-1]["content"]
    assert "海边摄影展" in prompt_text
