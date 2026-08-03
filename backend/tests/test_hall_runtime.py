"""大厅串门调度器测试：配对理由、事件序列、稀疏安静、权限过滤、API 联动。"""

import math
import random

import pytest
from fastapi.testclient import TestClient

from app.agents.hall_runtime import HallRuntime, _tag_set
from app.agents.llm.base import LLMProvider, LLMResponse
from app.agents.memory.store import MemoryStore
from app.agents.runtime import EventBus
from app.main import create_app
from app.packages.store import PackageStore
from app.schemas.snapshot_schema import validate_snapshot
from app.world.hall import HALL_BOUNDS, build_display_from_package
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


def make_package(store: PackageStore, person_id: str, name: str, tags: list,
                 secret_tag: str | None = None):
    encounters = [{
        "encounter_id": "enc_public", "time": "2026-08-01T10:00:00+08:00",
        "place": "公开展位",
        "facts": {"media": [], "transcript": None, "photos": []},
        "inferences": [{"id": "inf_1", "type": "interest-tag", "value": "、".join(tags),
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


def make_hall(store: PackageStore, person_ids: list):
    """注册这些人为展位大厅（大厅边界，无阻挡），返回 (world, bus)。"""
    world = WorldService({"agents": [], "modules": []}, blockers=(), bounds=HALL_BOUNDS)
    for pid in person_ids:
        world.register_person(pid, build_display_from_package(store.load_package(pid), store))
    bus = EventBus()
    bus.subscribe(world.apply_event)
    return world, bus


def make_runtime(bus, memory, **kwargs):
    kwargs.setdefault("visit_probability", 1.0)  # 测试默认必触发，安静用例另行构造
    return HallRuntime(bus, rng=random.Random(1), memory=memory, **kwargs)


# ---------- 配对：必须有理由 ----------

def test_pair_requires_common_ground(tmp_path):
    store = PackageStore(tmp_path)
    make_package(store, "agent-a", "甲", tags=["咖啡", "产品"])
    make_package(store, "agent-b", "乙", tags=["咖啡", "音乐"])
    make_package(store, "agent-c", "丙", tags=["围棋"])
    memory = MemoryStore(store)
    runtime = make_runtime(EventBus(), memory)
    pair = runtime._find_pair(["agent-a", "agent-b", "agent-c"])
    assert pair is not None
    first, second, common = pair
    assert {first, second} == {"agent-a", "agent-b"}  # 只有甲乙方有交集
    assert common == ["咖啡"]
    # 全部无交集且无 relations → None（安静）
    assert runtime._find_pair(["agent-a", "agent-c"]) is None


def test_pair_via_relations_md(tmp_path):
    store = PackageStore(tmp_path)
    make_package(store, "agent-a", "甲", tags=["围棋"])
    make_package(store, "agent-b", "乙", tags=["象棋"])
    memory = MemoryStore(store)
    memory.append_relation("agent-a", "乙", "旧识", ["象棋"], "enc_public")
    runtime = make_runtime(EventBus(), memory)
    pair = runtime._find_pair(["agent-a", "agent-b"])
    assert pair is not None and pair[2] == []  # relations 关联，无共同标签


def test_tag_set_splits_joined_values():
    assert _tag_set({"tags": ["创作伙伴、产品、咖啡", "旅行,摄影"]}) == \
        {"创作伙伴", "产品", "咖啡", "旅行", "摄影"}


# ---------- 串门事件序列：move → talk → return ----------

def test_visit_event_sequence_complete(tmp_path):
    store = PackageStore(tmp_path)
    make_package(store, "agent-a", "甲", tags=["咖啡"])
    make_package(store, "agent-b", "乙", tags=["咖啡"])
    memory = MemoryStore(store)
    world, bus = make_hall(store, ["agent-a", "agent-b"])
    runtime = make_runtime(bus, memory)  # chat None → 模板对话，确定性

    anchor = {m["person_id"]: m["position"]
              for m in world.snapshot()["modules"] if m["type"] == "booth"}
    for _ in range(7):  # going→talking(2 句带间隔)→returning
        runtime.tick(world.snapshot())
        world.step()
    snapshot = world.snapshot()
    events = snapshot["events"]

    visitor = events[0]["agent_id"]
    host = "agent-b" if visitor == "agent-a" else "agent-a"
    # 1) 访问者离开展位：move + walking，目标是对方展位前方站位点
    assert events[0]["type"] == "agent-move"
    # 2) 一问一答两条 agent-talk，且围绕共同标签"咖啡"
    talks = [e for e in events if e["type"] == "agent-talk"]
    assert len(talks) == 2
    assert talks[0]["agent_id"] == visitor and talks[0]["to_agent_id"] == host
    assert talks[1]["agent_id"] == host and talks[1]["to_agent_id"] == visitor
    assert "咖啡" in talks[0]["text"]
    # 3) 访问者返回自己展位锚点，双方恢复 at-booth
    assert any(e["type"] == "agent-move" and e["agent_id"] == visitor
               for e in events[3:])
    final = {a["id"]: a for a in snapshot["agents"]}
    assert final[visitor]["state"] == "at-booth"
    assert final[host]["state"] == "at-booth"
    assert abs(final[visitor]["position"]["x"] - anchor[visitor]["x"]) < 1e-9
    assert abs(final[visitor]["position"]["z"] - anchor[visitor]["z"]) < 1e-9
    validate_snapshot(snapshot)


def test_no_common_ground_stays_quiet(tmp_path):
    store = PackageStore(tmp_path)
    make_package(store, "agent-a", "甲", tags=["围棋"])
    make_package(store, "agent-b", "乙", tags=["油画"])
    memory = MemoryStore(store)
    world, bus = make_hall(store, ["agent-a", "agent-b"])
    runtime = make_runtime(bus, memory)  # 概率 1.0 但无交集
    for _ in range(30):
        runtime.tick(world.snapshot())
        world.step()
    snapshot = world.snapshot()
    assert snapshot["events"] == []  # 长时间安静
    assert all(a["state"] == "at-booth" for a in snapshot["agents"])


def test_sparse_probability(tmp_path):
    store = PackageStore(tmp_path)
    make_package(store, "agent-a", "甲", tags=["咖啡"])
    make_package(store, "agent-b", "乙", tags=["咖啡"])
    memory = MemoryStore(store)
    world, bus = make_hall(store, ["agent-a", "agent-b"])
    runtime = make_runtime(bus, memory, visit_probability=0.0)  # 概率闸关闭
    for _ in range(30):
        runtime.tick(world.snapshot())
        world.step()
    assert world.snapshot()["events"] == []


# ---------- 对话权限过滤 ----------

def test_dialogue_prompt_carries_full_view(tmp_path):
    store = PackageStore(tmp_path)
    make_package(store, "agent-a", "甲", tags=["公开标签PUBLIC"], secret_tag="秘密标签SECRET")
    make_package(store, "agent-b", "乙", tags=["公开标签PUBLIC"])
    memory = MemoryStore(store)
    world, bus = make_hall(store, ["agent-a", "agent-b"])
    fake = FakeChatProvider([
        '{"lines": [{"speaker": "A", "text": "乙，原来你也在关注公开标签PUBLIC？"},'
        ' {"speaker": "B", "text": "是啊，回头细聊。"}]}'
    ])
    runtime = make_runtime(bus, memory, chat_provider=fake)
    runtime.tick(world.snapshot())  # 触发串门（概率 1.0），生成对话
    prompt = str(fake.calls[0])
    # 首版不过滤（TBD-P3）：prompt 携带全量视图
    assert "公开标签PUBLIC" in prompt
    assert "秘密标签SECRET" in prompt
    world.step()
    for _ in range(6):
        runtime.tick(world.snapshot())
        world.step()
    talks = [e for e in world.snapshot()["events"] if e["type"] == "agent-talk"]
    assert len(talks) == 2


# ---------- API 联动（?world=hall&advance=1 驱动串门） ----------

@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def test_hall_visit_via_api(client, monkeypatch):
    # 种子熟人经 relations.md 配对；概率拉满保证当场触发
    monkeypatch.setattr(client.app.state.hall_runtime, "visit_probability", 1.0)
    snapshots = []
    for _ in range(8):
        snapshots.append(client.get("/api/v0/world/snapshot",
                                    params={"world": "hall", "advance": 1}).json())
    events = snapshots[-1]["events"]
    validate_snapshot(snapshots[-1])
    # 一场完整串门：move(walking) → talk ×2 → move(at-booth)
    moves = [e for e in events if e["type"] == "agent-move"]
    talks = [e for e in events if e["type"] == "agent-talk"]
    assert moves and len(talks) == 2
    visitor = talks[0]["agent_id"]
    assert any(e["agent_id"] == visitor for e in moves)
    assert talks[0]["to_agent_id"] == talks[1]["agent_id"]  # 一问一答
    # 串门期间快照始终合法；结束后大家回到展位
    assert all(a["state"] == "at-booth" for a in snapshots[-1]["agents"])
