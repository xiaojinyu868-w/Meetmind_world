"""阶段 3：skill 化 runtime、LLM 决策解析、权限过滤、会议调度测试。"""

import random

import pytest

from app.agents.llm.base import LLMProvider, LLMResponse
from app.agents.memory.store import MemoryStore
from app.agents.runtime import AgentRuntime, EventBus
from app.agents.runtime import MEETING_DURATION_TICKS  # noqa: F401  确认常量存在
import app.agents.runtime as runtime_mod
from app.agents.skills import load_skill
from app.agents.utils.jsonish import extract_json
from app.harness.permissions.guard import DEFAULT_GUARD, PermissionDenied
from app.packages.store import PackageStore
from app.schemas.snapshot_schema import SnapshotSchemaError, validate_snapshot
from app.world.seed import seed_world
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


def make_world(agent_specs=None):
    specs = agent_specs or [
        {"id": "agent-a", "name": "甲", "position": {"x": 0.0, "z": 0.0, "yaw": 0.0},
         "state": "walking", "palette": {}},
        {"id": "agent-b", "name": "乙", "position": {"x": 1.0, "z": 0.0, "yaw": 0.0},
         "state": "walking", "palette": {}},
    ]
    world = WorldService({"agents": specs, "modules": []})
    bus = EventBus()
    bus.subscribe(world.apply_event)
    return world, bus


def make_package(store: PackageStore, person_id: str, name: str,
                 public_tag: str, secret_tag: str | None = None):
    encounters = [{
        "encounter_id": "enc_public", "time": "2026-08-01T10:00:00+08:00",
        "place": "公开展位",
        "facts": {"media": [], "transcript": None, "photos": []},
        "inferences": [{"id": "inf_1", "type": "interest-tag", "value": public_tag,
                        "source_facts": [f"facts/{person_id}/enc_public/note.v1.md"],
                        "model": "seed.v0", "confidence": 0.9,
                        "created_at": "2026-08-01T10:00:00+08:00"}],
        "privacy": "agent-usable",
    }]
    if secret_tag:
        encounters.append({
            "encounter_id": "enc_secret", "time": "2026-08-02T10:00:00+08:00",
            "place": "秘密地点",
            "facts": {"media": [], "transcript": None, "photos": []},
            "inferences": [{"id": "inf_2", "type": "interest-tag", "value": secret_tag,
                            "source_facts": [f"facts/{person_id}/enc_secret/note.v1.md"],
                            "model": "seed.v0", "confidence": 0.9,
                            "created_at": "2026-08-02T10:00:00+08:00"}],
            "privacy": "self-only",
        })
    store.save_package({
        "schema": "echo-package.v0", "person_id": person_id,
        "identity": {"confirmed": True, "name": name, "face_ref": None, "voiceprint_ref": None},
        "encounters": encounters,
        "avatar": {"type": "lowpoly-faceless-v1", "palette": {}, "real_face_ref": None},
        "relations": [],
    })


# ---------- skill 加载与 JSON 提取 ----------

def test_skills_loadable():
    assert "权限边界" in load_skill("cafe_daily")
    assert "圆桌" in load_skill("meeting")
    with pytest.raises(FileNotFoundError):
        load_skill("no_such_skill")


def test_extract_json_forms():
    assert extract_json('{"a": 1}') == {"a": 1}
    assert extract_json('前言 ```json\n{"a": 2}\n``` 后记') == {"a": 2}
    assert extract_json("not json") is None
    assert extract_json("") is None


# ---------- LLM 决策解析（合法/非法/越权） ----------

def test_llm_decision_applied(tmp_path):
    world, bus = make_world()
    fake = FakeChatProvider([
        '{"actions": [{"agent_id": "agent-a", "action": "sit"},'
        ' {"agent_id": "agent-b", "action": "move"}]}'
    ])
    runtime = AgentRuntime(bus, rng=random.Random(1), chat_provider=fake)
    snapshot = world.snapshot()
    before = dict(snapshot["agents"][0]["position"])
    runtime.tick(snapshot)
    after = world.snapshot()
    states = {a["id"]: a["state"] for a in after["agents"]}
    assert states["agent-a"] == "seated"
    assert after["agents"][1]["position"] != before or states["agent-b"] == "walking"


def test_llm_decision_invalid_json_falls_back(tmp_path):
    world, bus = make_world()
    fake = FakeChatProvider(["这不是 JSON，模型走神了"])
    runtime = AgentRuntime(bus, rng=random.Random(2), chat_provider=fake)
    runtime.tick(world.snapshot())  # 不抛异常，规则兜底接管
    validate_snapshot(world.snapshot())


def test_llm_decision_overreach_discarded(tmp_path):
    world, bus = make_world()
    runtime = AgentRuntime(bus, rng=random.Random(3),
                           chat_provider=FakeChatProvider([]))
    parsed = runtime._parse_decisions(
        '{"actions": ['
        '{"agent_id": "agent-a", "action": "delete-package"},'
        '{"agent_id": "ghost", "action": "move"},'
        '{"agent_id": "agent-a", "action": "talk", "target": "ghost"}]}',
        {"agent-a", "agent-b"})
    assert parsed == []  # 越权/未知条目全部丢弃
    with pytest.raises(PermissionDenied):
        DEFAULT_GUARD.check_event("delete-package")
    with pytest.raises(PermissionDenied):
        DEFAULT_GUARD.check_event("world-reset")


# ---------- 对话生成的权限过滤（self-only 不泄漏） ----------

def _make_secret_setup(tmp_path):
    world, bus = make_world()
    store = PackageStore(tmp_path)
    make_package(store, "agent-a", "甲", public_tag="公开标签PUBLIC", secret_tag="秘密标签SECRET")
    make_package(store, "agent-b", "乙", public_tag="咖啡")
    memory = MemoryStore(store)
    memory.append_memory("agent-a", "公开记忆条目", source="facts/agent-a/enc_public/note.v1.md",
                         confidence=0.8)
    memory.append_memory("agent-a", "秘密记忆条目", source="facts/agent-a/enc_secret/note.v1.md",
                         confidence=0.8)
    return world, bus, store, memory


def test_authorized_view_full_first_version(tmp_path):
    # 首版不过滤（TBD-P3）：self-only 内容同样进入上下文视图
    _, _, _, memory = _make_secret_setup(tmp_path)
    view = memory.authorized_agent_view("agent-a")
    assert "公开标签PUBLIC" in view["tags"]
    assert "秘密标签SECRET" in view["tags"]  # 全量视图（授权机制重议后恢复过滤）
    assert "秘密地点" in view["places"]
    assert any("秘密记忆" in line for line in view["memory_lines"])
    assert any("公开记忆" in line for line in view["memory_lines"])


def test_authorized_view_none_when_unconfirmed(tmp_path):
    # 未确认身份仍返回 None（FR-1.3 可靠性闸，与隐私过滤无关）
    store = PackageStore(tmp_path)
    store.save_package({
        "schema": "echo-package.v0", "person_id": "agent-u",
        "identity": {"confirmed": False, "name": "未确认者", "face_ref": None,
                     "voiceprint_ref": None},
        "encounters": [],
        "avatar": {"type": "lowpoly-faceless-v1", "palette": {}, "real_face_ref": None},
        "relations": [],
    })
    memory = MemoryStore(store)
    assert memory.authorized_agent_view("agent-u") is None


def test_dialogue_prompt_carries_full_view_first_version(tmp_path):
    world, bus, _, memory = _make_secret_setup(tmp_path)
    fake = FakeChatProvider([
        '{"actions": [{"agent_id": "agent-a", "action": "talk", "target": "agent-b"}]}',
        '{"lines": [{"speaker": "A", "text": "乙，最近还在忙咖啡的事吗？"},'
        ' {"speaker": "B", "text": "是啊，改天细聊。"}]}',
    ])
    runtime = AgentRuntime(bus, rng=random.Random(4), chat_provider=fake, memory=memory)
    runtime.tick(world.snapshot())
    # 首版不过滤（TBD-P3）：prompt 携带全量视图，公开与曾经的 self-only 都在
    dialogue_prompt = str(fake.calls[1])
    assert "公开标签PUBLIC" in dialogue_prompt
    assert "秘密标签SECRET" in dialogue_prompt
    assert "秘密记忆" in dialogue_prompt
    # agent-talk 事件进世界缓冲
    events = world.snapshot()["events"]
    talks = [e for e in events if e["type"] == "agent-talk"]
    assert len(talks) == 2
    assert talks[0]["text"] == "乙，最近还在忙咖啡的事吗？"
    validate_snapshot(world.snapshot())


def test_dialogue_rule_fallback_uses_full_view(tmp_path):
    world, bus, _, memory = _make_secret_setup(tmp_path)
    runtime = AgentRuntime(bus, rng=random.Random(5), chat_provider=None, memory=memory)
    runtime._talk(10, world.snapshot()["agents"][0], world.snapshot()["agents"][1])
    talks = [e for e in world.snapshot()["events"] if e["type"] == "agent-talk"]
    assert talks and "咖啡" in talks[0]["text"]


# ---------- 圆桌会议调度 ----------

def test_meeting_lifecycle(monkeypatch):
    monkeypatch.setattr(runtime_mod, "MEETING_INTERVAL_TICKS", 2)
    monkeypatch.setattr(runtime_mod, "MEETING_DURATION_TICKS", 2)
    monkeypatch.setattr(runtime_mod, "MEETING_START_PROBABILITY", 1.0)
    world = WorldService(seed_world())
    bus = EventBus()
    bus.subscribe(world.apply_event)
    runtime = AgentRuntime(bus, rng=random.Random(6))

    runtime.tick(world.snapshot())  # tick0：发起会议
    snapshot = world.snapshot()
    assert snapshot["meeting"] is not None
    participants = snapshot["meeting"]["participants"]
    assert 3 <= len(participants) <= 4
    seated = {a["id"]: a for a in snapshot["agents"] if a["id"] in participants}
    assert all(a["state"] == "in-meeting" for a in seated.values())
    # 入座圆桌真实锚点：半径 ≈1.57，圆心 (0,0)（与前端 CafeLayout.roundtable.seats 同源）
    for agent in seated.values():
        assert abs((agent["position"]["x"] ** 2 + agent["position"]["z"] ** 2) ** 0.5 - 1.57) < 5e-3

    world.step()
    runtime.tick(world.snapshot())  # tick1：会议中发言
    world.step()
    runtime.tick(world.snapshot())  # tick2：散场
    snapshot = world.snapshot()
    assert snapshot["meeting"] is None
    types = [e["type"] for e in snapshot["events"]]
    assert "meeting-started" in types and "meeting-ended" in types
    assert all(a["state"] != "in-meeting" for a in snapshot["agents"])
    validate_snapshot(snapshot)


# ---------- 快照 events 字段校验 ----------

def test_snapshot_events_validation():
    world, _ = make_world()
    world.apply_event({"type": "agent-talk", "agent_id": "agent-a",
                       "to_agent_id": "agent-b", "text": "你好"})
    snapshot = world.snapshot()
    validate_snapshot(snapshot)
    assert snapshot["events"][-1]["type"] == "agent-talk"
    # agent-talk 缺 text → 校验拒绝
    snapshot["events"].append({"type": "agent-talk", "agent_id": "agent-a",
                               "to_agent_id": "agent-b"})
    with pytest.raises(SnapshotSchemaError):
        validate_snapshot(snapshot)


def test_events_buffer_rolling_and_default_empty():
    world, _ = make_world()
    assert world.snapshot()["events"] == []  # 缺省空数组（向后兼容）
    for i in range(30):
        world.apply_event({"type": "agent-state", "agent_id": "agent-a",
                           "state": "walking" if i % 2 else "seated"})
    assert len(world.snapshot()["events"]) == 20  # 滚动缓冲上限
