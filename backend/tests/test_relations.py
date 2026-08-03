"""§4 关系沉淀测试：互动记录 relations.md 持久化、旧格式兼容、配对优先级。"""

import time

from app.agents.hall_runtime import HallRuntime
from app.agents.memory.store import MemoryStore
from app.agents.runtime import EventBus
from app.packages.store import PackageStore

import random


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


def make_pair(store, memory, id_a, name_a, id_b, name_b, tags_a, tags_b, relate=True):
    make_package(store, id_a, name_a, tags_a)
    make_package(store, id_b, name_b, tags_b)
    if relate:
        memory.append_relation(id_a, name_b, "旧识", ["河堤"], "enc_public")
        memory.append_relation(id_b, name_a, "旧识", ["河堤"], "enc_public")


def relations_text(store, person_id):
    return (store.people_dir / person_id / "relations.md").read_text(encoding="utf-8")


# ---------- 1. 持久化往返（record → 写回 relations.md → 重启恢复） ----------

def test_record_persists_to_relations_md_both_directions(tmp_path):
    store = PackageStore(tmp_path)
    memory = MemoryStore(store)
    make_pair(store, memory, "agent-a", "甲", "agent-b", "乙", ["咖啡"], ["咖啡"])
    memory.record_interaction("agent-a", "agent-b", at="2026-08-03T10:00:00+0800")
    for owner, other in (("agent-a", "乙"), ("agent-b", "甲")):
        text = relations_text(store, owner)
        assert f"{other} | 旧识 | 河堤 | enc_public | last:2026-08-03T10:00:00+0800 | count:1" in text
    # 第二次记录：行内 count 递增而不是追加新行
    memory.record_interaction("agent-a", "agent-b")
    text = relations_text(store, "agent-a")
    assert "count:2" in text
    assert text.count("乙 | 旧识") == 1


def test_restore_from_relations_md_on_restart(tmp_path):
    store = PackageStore(tmp_path)
    memory = MemoryStore(store)
    make_pair(store, memory, "agent-a", "甲", "agent-b", "乙", ["咖啡"], ["咖啡"])
    memory.record_interaction("agent-a", "agent-b", at="2026-08-03T10:00:00+0800")
    memory.record_interaction("agent-a", "agent-b", at="2026-08-03T11:00:00+0800")
    # 模拟重启：新建 MemoryStore（进程内存清空），从 relations.md 恢复
    restarted = MemoryStore(store)
    entry = restarted.last_interaction("agent-a", "agent-b")
    assert entry is not None
    assert entry["count"] == 2
    assert entry["last_interaction_at"] == "2026-08-03T11:00:00+0800"


def test_old_format_relations_md_compatible(tmp_path):
    store = PackageStore(tmp_path)
    make_package(store, "agent-a", "甲", ["咖啡"])
    make_package(store, "agent-b", "乙", ["音乐"])
    # 手写一条旧格式行（四段，无 last:/count:）
    relations_md = store.ensure_person_dir("agent-a") / "relations.md"
    with relations_md.open("a", encoding="utf-8") as fh:
        fh.write("乙 | 旧识 | 河堤 | enc_public\n")
    memory = MemoryStore(store)  # 恢复不得报错、不得产出假条目
    assert memory.last_interaction("agent-a", "agent-b") is None
    # 第一次记录：旧行升级为新格式，原四段保留
    memory.record_interaction("agent-a", "agent-b", at="2026-08-03T12:00:00+0800")
    text = relations_text(store, "agent-a")
    assert "乙 | 旧识 | 河堤 | enc_public | last:2026-08-03T12:00:00+0800 | count:1" in text


def test_no_relation_line_pair_not_forced(tmp_path):
    store = PackageStore(tmp_path)
    memory = MemoryStore(store)
    make_pair(store, memory, "agent-a", "甲", "agent-b", "乙", ["咖啡"], ["咖啡"],
              relate=False)
    before_a = relations_text(store, "agent-a")
    before_b = relations_text(store, "agent-b")
    memory.record_interaction("agent-a", "agent-b")
    # 内存注册表更新，但无既有关系行的配对不强行建行（TODO §4 评审）
    assert memory.last_interaction("agent-a", "agent-b")["count"] == 1
    assert relations_text(store, "agent-a") == before_a
    assert relations_text(store, "agent-b") == before_b


# ---------- 2. 配对优先级（旧识低 count > 旧识高 count 近期 > 破冰共同 tags） ----------

def test_pair_score_ordering(tmp_path):
    store = PackageStore(tmp_path)
    memory = MemoryStore(store)
    # 低 count 旧识
    make_pair(store, memory, "agent-a", "甲", "agent-b", "乙", ["围棋"], ["象棋"])
    # 高 count 且近期互动过的旧识
    make_pair(store, memory, "agent-c", "丙", "agent-d", "丁", ["书法"], ["篆刻"])
    now = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    for _ in range(5):
        memory.record_interaction("agent-c", "agent-d", at=now)
    # 无关系但有共同 tags 的破冰对
    make_pair(store, memory, "agent-e", "戊", "agent-f", "己", ["咖啡"], ["咖啡"],
              relate=False)
    runtime = HallRuntime(EventBus(), rng=random.Random(1), memory=memory)

    fresh = runtime._pair_score("agent-a", "agent-b", [], True)
    tired = runtime._pair_score("agent-c", "agent-d", [], True)
    strangers = runtime._pair_score("agent-e", "agent-f", ["咖啡"], False)
    assert fresh > tired > strangers
    assert fresh == (1, 10)        # 10 - 0 - 0
    assert tired == (1, 10 - 3 - 5)  # 近期 -3，count=5 封顶 -5
    assert strangers == (0, 1)       # 破冰层：共同 tag 数


def test_find_pair_picks_best_candidate(tmp_path):
    store = PackageStore(tmp_path)
    memory = MemoryStore(store)
    make_pair(store, memory, "agent-a", "甲", "agent-b", "乙", ["围棋"], ["象棋"])
    make_pair(store, memory, "agent-e", "戊", "agent-f", "己", ["咖啡"], ["咖啡"],
              relate=False)
    runtime = HallRuntime(EventBus(), rng=random.Random(1), memory=memory)
    # 旧识对与破冰对同时候选：旧识胜
    pair = runtime._find_pair(["agent-a", "agent-b", "agent-e", "agent-f"])
    assert {pair[0], pair[1]} == {"agent-a", "agent-b"}
    # 没有旧识候选时才轮到破冰对
    pair = runtime._find_pair(["agent-e", "agent-f"])
    assert {pair[0], pair[1]} == {"agent-e", "agent-f"}
    assert pair[2] == ["咖啡"]
