"""IF-6 用户发起的圆桌会议 + 晨报 LLM 润色测试。

覆盖：runtime 用户会议生命周期（meeting-start 带 topic、agent-talk 带 meeting_id、
玩家发言注入下一轮 prompt、倒数散场、自动调度抑制）、HTTP 端点（happy path /
409 冲突 / 404 未知人物 / 422 参数校验 / 玩家发言 409 与受理）、晨报 LLM 润色
（生效 / 缓存 / 回退）。
"""

import random

import pytest
from fastapi.testclient import TestClient

from app.agents.llm.base import LLMProvider, LLMResponse
from app.agents.memory.store import MemoryStore
from app.agents.runtime import AgentRuntime, EventBus
import app.agents.runtime as runtime_mod
from app.main import create_app
from app.packages.store import PackageStore
from app.world.brief import polish_brief
from app.world.event_store import WorldEventStore, runtime_event_entry
from app.world.seed import seed_demo_packages, seed_world
from app.world.service import WorldService


class FakeChatProvider(LLMProvider):
    """脚本化 chat provider：按队列返回预设响应，记录所有调用消息。"""

    role = "chat"
    name = "fake"

    def __init__(self, responses: list):
        super().__init__(config={"role": "chat", "api_base": "https://mock.local",
                                 "api_key": "x", "model": "fake-chat", "configured": True})
        self.responses = list(responses)
        self.calls = []

    def chat(self, messages, tools=None, response_format=None):
        self.calls.append(messages)
        text = self.responses.pop(0) if self.responses else ""
        return LLMResponse(text=text, model="fake-chat", mock=not bool(text))


def _make_cafe(tmp_path, agent_ids=("lin-che", "zhou-ning", "chen-mo")):
    """播种指定人物的咖啡厅世界 + memory（真实 demo Package 授权上下文）。

    只放与会者：会议期间没有空闲 Agent，日常调度不会额外消耗
    FakeChatProvider 的响应队列（测试断言只数会议发言）。
    """
    store = PackageStore(tmp_path)
    seed_demo_packages(store)
    memory = MemoryStore(store)
    seeds = {agent["id"]: agent for agent in seed_world()["agents"]}
    world = WorldService({"agents": [seeds[pid] for pid in agent_ids], "modules": []})
    bus = EventBus()
    bus.subscribe(world.apply_event)
    return world, bus, memory


MEETING_LINE = ('{"lines": [{"speaker": "%s", "text": "围绕主题我先说一点。"}]}')


# ---------- runtime：用户会议生命周期 ----------

def test_user_meeting_lifecycle_with_real_dialogue(tmp_path, monkeypatch):
    monkeypatch.setattr(runtime_mod, "USER_MEETING_DURATION_TICKS", 3)
    world, bus, memory = _make_cafe(tmp_path)
    participants = ["lin-che", "zhou-ning", "chen-mo"]
    fake = FakeChatProvider([
        MEETING_LINE % "lin-che",
        MEETING_LINE % "zhou-ning",
        MEETING_LINE % "chen-mo",
    ])
    runtime = AgentRuntime(bus, rng=random.Random(11), chat_provider=fake, memory=memory)

    meeting = runtime.start_user_meeting(participants, topic="宣传点子", tick=world.tick)
    assert meeting["meeting_id"].startswith("user_meeting_")
    assert meeting["topic"] == "宣传点子"
    assert runtime.meeting_in_progress
    # 会议进行中：自动调度被抑制（_tick_meeting 直接早退，不再发起新会议）
    assert runtime.start_user_meeting(["su-he", "tang-ke"]) is None

    snapshot = world.snapshot()
    assert snapshot["meeting"]["id"] == meeting["meeting_id"]
    assert snapshot["meeting"]["topic"] == "宣传点子"
    started = [e for e in snapshot["events"] if e["type"] == "meeting-started"]
    assert started and started[-1]["topic"] == "宣传点子"

    for _ in range(3):
        runtime.tick(world.snapshot())
        world.step()
    snapshot = world.snapshot()
    talks = [e for e in snapshot["events"]
             if e["type"] == "agent-talk" and e.get("meeting_id") == meeting["meeting_id"]]
    assert len(talks) == 3  # 每 tick 一条，且全部归属本场会议
    assert {t["agent_id"] for t in talks} <= set(participants)
    assert snapshot["meeting"] is None  # 倒数结束已散场
    assert any(e["type"] == "meeting-ended" and e["meeting_id"] == meeting["meeting_id"]
               for e in snapshot["events"])
    assert not runtime.meeting_in_progress
    # 会议 prompt 注入了主题
    assert "宣传点子" in str(fake.calls[0])


def test_user_meeting_player_message_enters_next_prompt(tmp_path, monkeypatch):
    monkeypatch.setattr(runtime_mod, "USER_MEETING_DURATION_TICKS", 4)
    world, bus, memory = _make_cafe(tmp_path, ("lin-che", "zhou-ning"))
    fake = FakeChatProvider([
        MEETING_LINE % "lin-che",
        MEETING_LINE % "zhou-ning",
        MEETING_LINE % "lin-che",
        MEETING_LINE % "zhou-ning",
    ])
    runtime = AgentRuntime(bus, rng=random.Random(12), chat_provider=fake, memory=memory)
    runtime.start_user_meeting(["lin-che", "zhou-ning"], topic="摄影展", tick=0)

    runtime.tick(world.snapshot())
    world.step()
    accepted = runtime.post_player_message("试试城市漫步快闪")
    assert accepted and accepted["accepted"] is True
    runtime.tick(world.snapshot())  # 这一轮 prompt 必须带上玩家发言
    prompt_text = str(fake.calls[-1])
    assert "试试城市漫步快闪" in prompt_text
    assert "player_message" in prompt_text
    # 消费后转入 transcript：再下一轮 prompt 里以发言记录形式可见
    world.step()
    runtime.tick(world.snapshot())
    assert "试试城市漫步快闪" in str(fake.calls[-1])
    assert "发起人" in str(fake.calls[-1])


def test_user_meeting_template_fallback_without_llm(tmp_path, monkeypatch):
    monkeypatch.setattr(runtime_mod, "USER_MEETING_DURATION_TICKS", 2)
    world, bus, memory = _make_cafe(tmp_path, ("lin-che", "zhou-ning"))
    runtime = AgentRuntime(bus, rng=random.Random(13), chat_provider=None, memory=memory)
    meeting = runtime.start_user_meeting(["lin-che", "zhou-ning"], topic="宣传", tick=0)
    runtime.tick(world.snapshot())
    talks = [e for e in world.snapshot()["events"]
             if e["type"] == "agent-talk" and e.get("meeting_id") == meeting["meeting_id"]]
    assert talks and "宣传" in talks[0]["text"]  # 模板兜底围绕主题
    runtime.post_player_message("加个户外快闪")
    world.step()
    runtime.tick(world.snapshot())
    talks = [e for e in world.snapshot()["events"]
             if e["type"] == "agent-talk" and e.get("meeting_id") == meeting["meeting_id"]]
    assert "户外快闪" in talks[-1]["text"]  # 模板兜底也会回应发起人


def test_post_player_message_requires_user_meeting(tmp_path):
    world, bus, memory = _make_cafe(tmp_path)
    runtime = AgentRuntime(bus, rng=random.Random(14), memory=memory)
    assert runtime.post_player_message("有人在吗") is None  # 没有会议


# ---------- HTTP 端点 ----------

def _client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def test_meeting_endpoint_happy_path_and_conflicts(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    response = client.post("/api/v0/agents/meeting", json={
        "participant_ids": ["lin-che", "zhou-ning", "chen-mo"],
        "topic": "帮谢淯琪的摄影展想想宣传点子",
    })
    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "running"
    assert body["meeting_id"].startswith("user_meeting_")
    assert body["topic"] == "帮谢淯琪的摄影展想想宣传点子"
    assert body["duration_ticks"] >= 2
    assert set(body["participants"]) == {"lin-che", "zhou-ning", "chen-mo"}

    # 世界侧已入座圆桌
    snapshot = client.get("/api/v0/world/snapshot").json()
    assert snapshot["meeting"]["id"] == body["meeting_id"]
    assert snapshot["meeting"]["topic"] == "帮谢淯琪的摄影展想想宣传点子"

    # 会议进行中：再次发起 409；参与者在会上也 409
    conflict = client.post("/api/v0/agents/meeting", json={
        "participant_ids": ["su-he", "tang-ke"],
    })
    assert conflict.status_code == 409
    # 玩家发言受理
    message = client.post("/api/v0/agents/meeting/current/message",
                          json={"text": "能不能结合城市漫步做一次快闪？"})
    assert message.status_code == 200
    assert message.json() == {"meeting_id": body["meeting_id"], "accepted": True}


def test_meeting_endpoint_validation(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    # 人数不足 / 超过上限 / 议题过长 → 422
    assert client.post("/api/v0/agents/meeting", json={
        "participant_ids": ["lin-che"],
    }).status_code == 422
    assert client.post("/api/v0/agents/meeting", json={
        "participant_ids": ["lin-che", "zhou-ning", "chen-mo", "xu-an", "su-he", "tang-ke"],
    }).status_code == 422
    assert client.post("/api/v0/agents/meeting", json={
        "participant_ids": ["lin-che", "zhou-ning"], "topic": "长" * 81,
    }).status_code == 422
    # 未知人物 → 404
    missing = client.post("/api/v0/agents/meeting", json={
        "participant_ids": ["lin-che", "ghost-person"],
    })
    assert missing.status_code == 404
    # 无会议时玩家发言 → 409
    assert client.post("/api/v0/agents/meeting/current/message",
                       json={"text": "有人在吗"}).status_code == 409


def test_meeting_endpoint_409_when_participant_in_meeting(tmp_path, monkeypatch):
    monkeypatch.setattr(runtime_mod, "USER_MEETING_DURATION_TICKS", 30)
    client = _client(tmp_path, monkeypatch)
    first = client.post("/api/v0/agents/meeting", json={
        "participant_ids": ["lin-che", "zhou-ning"],
    })
    assert first.status_code == 200
    overlap = client.post("/api/v0/agents/meeting", json={
        "participant_ids": ["lin-che", "su-he"],
    })
    assert overlap.status_code == 409  # lin-che 已在会上（且圆桌占用先触发）


# ---------- 晨报 LLM 润色 ----------

def _brief_events(store: WorldEventStore, count: int = 2) -> list:
    return [
        store.append("agent-talk", f"第{index}条真实事件", source="world")
        for index in range(count)
    ]


def test_brief_llm_polish_applies_and_caches(tmp_path):
    store = WorldEventStore(tmp_path / "events.jsonl")
    events = _brief_events(store)
    fake = FakeChatProvider([
        '{"headline": "咖啡厅里的新对话", "summary": "今天世界里发生了两段真实对话，'
        '关系又往前走了一步。"}'
    ])
    brief = store.morning_brief(events, chat_provider=fake)
    assert brief["generated_by"] == "llm"
    assert brief["headline"] == "咖啡厅里的新对话"
    assert brief["summary"].startswith("今天世界里发生了两段真实对话")
    assert len(fake.calls) == 1
    # 同一 (event_count, 分钟) 内复用缓存：不再调 LLM
    again = store.morning_brief(events, chat_provider=fake)
    assert again["headline"] == brief["headline"]
    assert len(fake.calls) == 1
    # 事件数变化 → 缓存失效，重新调用（无剩余响应 → mock → 回退模板）
    more = events + _brief_events(store, 1)
    third = store.morning_brief(more, chat_provider=fake)
    assert third["generated_by"] == "template"
    assert len(fake.calls) == 2


def test_brief_polish_fallback_when_unconfigured_or_invalid(tmp_path):
    store = WorldEventStore(tmp_path / "events.jsonl")
    events = _brief_events(store)
    # 未配置 provider：纯模板
    assert polish_brief(None, events) is None
    # LLM 返回非法 JSON：回退模板，generated_by 保持 template
    fake = FakeChatProvider(["这不是 JSON"])
    brief = store.morning_brief(events, chat_provider=fake)
    assert brief["generated_by"] == "template"
    assert brief["headline"] in [event["summary"] for event in events]
    # LLM 超长输出：本地截断而非丢弃
    long_fake = FakeChatProvider([
        '{"headline": "' + "标" * 30 + '", "summary": "' + "文" * 100 + '"}'
    ])
    polished = polish_brief(long_fake, events)
    assert polished is not None
    assert len(polished["headline"]) == 20
    assert len(polished["summary"]) == 80


def test_brief_endpoint_includes_generated_by(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    client.post("/api/v0/world/interactions", json={
        "type": "coffee-shared", "summary": "你在吧台点了一杯今日手冲",
    })
    brief = client.get("/api/v0/world/brief").json()
    assert brief["schema"] == "echo-world-brief.v1"
    assert brief["generated_by"] == "template"  # 测试环境无 chat key
    assert brief["event_count"] >= 1


def test_runtime_event_entry_meeting_topic():
    entry = runtime_event_entry(
        {"type": "meeting-started", "meeting_id": "user_meeting_3",
         "participants": ["lin-che", "zhou-ning"], "topic": "宣传点子", "tick": 3},
        "world",
    )
    assert "宣传点子" in entry["summary"]
