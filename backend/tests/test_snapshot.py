"""echo-snapshot.v1 快照生成与校验测试（对应 ARCHITECTURE.md §4）。"""

import random

from app.agents.runtime import AgentRuntime, EventBus
from app.schemas.snapshot_schema import SCHEMA_VERSION, validate_snapshot
from app.world.seed import seed_world
from app.world.service import WorldService


def make_world():
    world = WorldService(seed_world())
    bus = EventBus()
    bus.subscribe(world.apply_event)
    runtime = AgentRuntime(bus, rng=random.Random(7))  # 无 LLM：纯规则驱动
    return world, runtime


def test_snapshot_has_schema_tick_agents_and_validates():
    world, _ = make_world()
    snapshot = world.snapshot()
    assert snapshot["schema"] == SCHEMA_VERSION
    assert isinstance(snapshot["tick"], int)
    assert len(snapshot["agents"]) == 6
    assert snapshot["modules"][0]["id"] == "cafe-main"
    assert snapshot["events"] == []  # 缺省空数组（向后兼容）
    assert validate_snapshot(snapshot) is snapshot


def test_runtime_events_keep_snapshot_valid():
    world, runtime = make_world()
    for _ in range(5):
        runtime.tick(world.snapshot())
        world.step()
        snapshot = world.snapshot()
        validate_snapshot(snapshot)
    assert snapshot["tick"] == 5
    assert snapshot["events"]  # 规则驱动下世界持续产出事件
