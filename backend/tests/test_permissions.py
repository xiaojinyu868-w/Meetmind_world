"""自进化权限矩阵与事实层只增不改的边界测试（ARCHITECTURE.md §5 / NFR-1.1）。"""

import pytest

from app.agents.memory.store import MemoryStore
from app.harness.permissions.guard import DEFAULT_GUARD, PermissionDenied
from app.packages.store import FactLayerImmutableError, PackageStore


def test_guard_allows_state_writes():
    for target in ("agent.position", "agent.state", "agent.current_task",
                   "encounter_memory.append", "short_term_memory", "user_feedback"):
        assert DEFAULT_GUARD.check(target) is True


def test_guard_denies_rule_writes():
    for target in ("skill.workflow", "tool.implementation", "permissions.self",
                   "long_term_memory", "api.config", "tool.implementation.sub"):
        with pytest.raises(PermissionDenied):
            DEFAULT_GUARD.check(target)


def test_guard_default_denies_unknown_target():
    with pytest.raises(PermissionDenied):
        DEFAULT_GUARD.check("package.facts")


def test_long_term_memory_write_forbidden(tmp_path):
    memory = MemoryStore(PackageStore(tmp_path))
    with pytest.raises(PermissionDenied):
        memory.write_long_term("person_x", {"identity": {"confirmed": True}})


def test_fact_layer_append_only(tmp_path):
    store = PackageStore(tmp_path)
    store.write_fact("person_x", "enc_01", "transcript.v1.md", b"v1")
    with pytest.raises(FactLayerImmutableError):
        store.write_fact("person_x", "enc_01", "transcript.v1.md", b"v2")
    # 编辑 = 新版本文件名，允许写入
    store.write_fact("person_x", "enc_01", "transcript.v2.md", b"v2")
    assert store.read_fact("facts/person_x/enc_01/transcript.v1.md") == b"v1"


def test_inference_memory_requires_fact_pointer(tmp_path):
    memory = MemoryStore(PackageStore(tmp_path))
    with pytest.raises(ValueError, match="facts/"):
        memory.append_memory("person_x", "喜欢咖啡", source="模型瞎猜", confidence=0.6)
    memory.append_memory("person_x", "喜欢咖啡",
                         source="facts/person_x/enc_01/note.v1.md", confidence=0.6)
    assert "喜欢咖啡" in memory.read_memory_md("person_x")
