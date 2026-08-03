"""对话质量测试（INTERACTION-DESIGN §3）：共同上下文 prompt、信息量闸门、互动记录。"""

import random

import pytest

from app.agents.hall_runtime import HallRuntime
from app.agents.llm.base import LLMProvider, LLMResponse
from app.agents.memory.store import MemoryStore
from app.agents.runtime import AgentRuntime, EventBus
from app.packages.store import PackageStore
from app.world.hall import HALL_BOUNDS, build_display_from_package
from app.world.service import WorldService


class FakeChatProvider(LLMProvider):
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


def make_package(store: PackageStore, person_id: str, name: str, tags: list):
    store.save_package({
        "schema": "echo-package.v0", "person_id": person_id,
        "identity": {"confirmed": True, "name": name, "face_ref": None, "voiceprint_ref": None},
        "encounters": [{
            "encounter_id": "enc_public", "time": "2026-08-01T10:00:00+08:00",
            "place": "公开展位",
            "facts": {"media": [], "transcript": None, "photos": []},
            "inferences": [{"id": "inf_1", "type": "interest-tag", "value": "、".join(tags),
                            "source_facts": [f"facts/{person_id}/enc_public/note.v1.md"],
                            "model": "seed.v0", "confidence": 0.9,
                            "created_at": "2026-08-01T10:00:00+08:00"}],
            "privacy": "agent-usable",
        }],
        "avatar": {"type": "lowpoly-faceless-v1", "palette": {}, "real_face_ref": None},
        "relations": [],
    })


def make_setup(tmp_path, tags_a=("咖啡",), tags_b=("咖啡",), relate=True):
    store = PackageStore(tmp_path)
    make_package(store, "agent-a", "甲", list(tags_a))
    make_package(store, "agent-b", "乙", list(tags_b))
    memory = MemoryStore(store)
    if relate:
        memory.append_relation("agent-a", "乙", "旧识", ["河堤"], "enc_public")
    world = WorldService({"agents": [], "modules": []}, blockers=(), bounds=HALL_BOUNDS)
    for pid in ("agent-a", "agent-b"):
        world.register_person(pid, build_display_from_package(store.load_package(pid), store))
    bus = EventBus()
    bus.subscribe(world.apply_event)
    return store, memory, world, bus


def make_cafe_world(bus):
    world = WorldService({"agents": [
        {"id": "agent-a", "name": "甲", "position": {"x": 0.0, "z": 0.0, "yaw": 0.0},
         "state": "walking", "palette": {}},
        {"id": "agent-b", "name": "乙", "position": {"x": 1.0, "z": 0.0, "yaw": 0.0},
         "state": "walking", "palette": {}},
    ], "modules": []})
    bus.subscribe(world.apply_event)
    return world


# ---------- 1. prompt 注入共同上下文 ----------

def test_prompt_contains_shared_context(tmp_path):
    _, memory, _, _ = make_setup(tmp_path)
    memory.record_interaction("agent-a", "agent-b", at="2026-08-03T10:00:00+08:00")
    fake = FakeChatProvider([
        '{"lines": [{"speaker": "A", "text": "乙，上次说的咖啡，后来有进展吗？"}],'
        ' "informative": true}'
    ])
    runtime = HallRuntime(EventBus(), rng=random.Random(1), chat_provider=fake,
                          memory=memory, visit_probability=1.0)
    runtime._dialogue("agent-a", "agent-b", ["咖啡"])
    prompt = str(fake.calls[0])
    assert '"common_tags": ["咖啡"]' in prompt          # 共同 tags
    assert "旧识·河堤" in prompt                             # relations.md 关系备注
    assert "2026-08-03T10:00:00+08:00" in prompt             # 最近一次互动时间
    assert "informative" in prompt                           # 自评要求在同一调用链


# ---------- 2. 信息量闸门 ----------

def test_informative_false_blocked_and_world_stays_quiet(tmp_path):
    _, memory, world, bus = make_setup(tmp_path)
    fake = FakeChatProvider([
        '{"lines": [{"speaker": "A", "text": "吃了吗？"}], "informative": false}'
    ])
    runtime = HallRuntime(bus, rng=random.Random(1), chat_provider=fake,
                          memory=memory, visit_probability=1.0)
    runtime.tick(world.snapshot())
    world.step()
    assert world.snapshot()["events"] == []                 # 不进事件缓冲
    assert memory.last_interaction("agent-a", "agent-b") is None  # 也不算一次互动


def test_informative_true_passes_and_records_interaction(tmp_path):
    _, memory, world, bus = make_setup(tmp_path)
    fake = FakeChatProvider([
        '{"lines": [{"speaker": "A", "text": "乙，河堤那次的书还在吗？"},'
        ' {"speaker": "B", "text": "在，下次带给你。"}], "informative": true}'
    ])
    runtime = HallRuntime(bus, rng=random.Random(1), chat_provider=fake,
                          memory=memory, visit_probability=1.0)
    for _ in range(7):
        runtime.tick(world.snapshot())
        world.step()
    talks = [e for e in world.snapshot()["events"] if e["type"] == "agent-talk"]
    assert len(talks) == 2                                   # 放行
    entry = memory.last_interaction("agent-a", "agent-b")
    assert entry is not None and entry["count"] == 1         # 互动时间已更新


def test_informative_abnormal_defaults_to_pass(tmp_path):
    _, memory, world, bus = make_setup(tmp_path)
    # 自评字段异常（非 bool）→ 默认放行；下一场整体乱码 → 模板兜底也放行
    fake = FakeChatProvider([
        '{"lines": [{"speaker": "A", "text": "第一句"}], "informative": "yes"}',
        "这不是 JSON",
    ])
    runtime = HallRuntime(bus, rng=random.Random(1), chat_provider=fake,
                          memory=memory, visit_probability=1.0)
    for _ in range(9):  # 两场串门（含冷却）都走完
        runtime.tick(world.snapshot())
        world.step()
    talks = [e for e in world.snapshot()["events"] if e["type"] == "agent-talk"]
    assert len(talks) >= 2


def test_gate_in_cafe_runtime(tmp_path):
    _, memory, _, _ = make_setup(tmp_path)
    bus = EventBus()
    world = make_cafe_world(bus)
    fake = FakeChatProvider([
        '{"lines": [{"speaker": "A", "text": "吃了吗？"}], "informative": false}',
        '{"lines": [{"speaker": "A", "text": "乙，河堤的项目书发你了。"}],'
        ' "informative": true}',
    ])
    runtime = AgentRuntime(bus, rng=random.Random(1), chat_provider=fake, memory=memory)
    agents = world.snapshot()["agents"]
    runtime._talk(10, agents[0], agents[1])                # 被拦
    assert [e for e in world.snapshot()["events"] if e["type"] == "agent-talk"] == []
    assert memory.last_interaction("agent-a", "agent-b") is None
    runtime._talk(20, agents[0], agents[1])                # 放行
    talks = [e for e in world.snapshot()["events"] if e["type"] == "agent-talk"]
    assert len(talks) == 1
    assert memory.last_interaction("agent-a", "agent-b")["count"] == 1


# ---------- 3. 模板兜底的关系备注变体 ----------

def test_template_relation_variant(tmp_path):
    _, memory, _, _ = make_setup(tmp_path, tags_a=("围棋",), tags_b=("象棋",))
    runtime = HallRuntime(EventBus(), rng=random.Random(1), chat_provider=None,
                          memory=memory, visit_probability=1.0)
    lines = runtime._dialogue("agent-a", "agent-b", [])
    assert lines and "河堤那次之后好久不见" in lines[0][2]   # 关系备注变体
    assert lines[0][0] == "agent-a" and lines[0][1] == "agent-b"


def test_interaction_count_increments(tmp_path):
    _, memory, world, bus = make_setup(tmp_path)
    runtime = HallRuntime(bus, rng=random.Random(1), chat_provider=None,
                          memory=memory, visit_probability=1.0)
    for _ in range(16):  # 模板对话必放行；冷却 2 tick，两场串门
        runtime.tick(world.snapshot())
        world.step()
    entry = memory.last_interaction("agent-a", "agent-b")
    assert entry is not None and entry["count"] >= 2
    assert entry["last_interaction_at"]
