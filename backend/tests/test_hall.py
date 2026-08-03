"""展位大厅测试（MVP1.5 §2）：布局、注册幂等、快照 booth 校验、confirm 联动、权限过滤。"""

import math

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.snapshot_schema import validate_snapshot
from app.world.hall import (
    BOOTH_CAPACITY,
    BOOTH_ROW_STEP,
    BOOTH_ROW_Z_MAX,
    BOOTH_SIDE_X,
    HALL_BOUNDS,
    SPAWN_FREE_Z,
    HallRegistry,
    booth_anchor,
)


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


# ---------- 布局算法（露天集市街道：两侧两排摊位） ----------

def test_layout_two_rows_alternating_and_facing_street():
    anchors = [booth_anchor(i) for i in range(12)]
    # 左右两排交替：偶数左排 x=-3.8，奇数右排 x=+3.8；同侧 z 步进 2.4
    for i, anchor in enumerate(anchors):
        expected_x = -BOOTH_SIDE_X if i % 2 == 0 else BOOTH_SIDE_X
        assert anchor["x"] == expected_x
        assert anchor["z"] == pytest.approx(-9.0 + (i // 2) * 2.4)
    # 朝向街道中心：左排朝 +x（yaw=+90°），右排朝 -x（yaw=-90°）
    for i, anchor in enumerate(anchors):
        forward = (math.sin(anchor["yaw"]), math.cos(anchor["yaw"]))
        toward_street = (1.0, 0.0) if i % 2 == 0 else (-1.0, 0.0)
        cos_sim = forward[0] * toward_street[0] + forward[1] * toward_street[1]
        assert cos_sim > 0.999
    # 边界内 + 出生区留空（z ≤ 8 < 8.5）
    for anchor in anchors:
        assert HALL_BOUNDS["min_x"] <= anchor["x"] <= HALL_BOUNDS["max_x"]
        assert HALL_BOUNDS["min_z"] <= anchor["z"] <= HALL_BOUNDS["max_z"]
        assert anchor["z"] < SPAWN_FREE_Z
    # 任意两摊位间距 ≥ 2.2m（同侧 2.4、对街 7.6、对角更大）
    for i, a in enumerate(anchors):
        for b in anchors[i + 1:]:
            assert math.hypot(a["x"] - b["x"], a["z"] - b["z"]) >= 2.2 - 1e-9
    assert BOOTH_ROW_STEP >= 2.2
    assert 2 * BOOTH_SIDE_X >= 2.2


def test_layout_capacity_and_overflow():
    last = booth_anchor(BOOTH_CAPACITY - 1)
    assert last["z"] <= BOOTH_ROW_Z_MAX  # 最后一个仍在出生区之前
    with pytest.raises(ValueError, match="容量已满"):
        booth_anchor(BOOTH_CAPACITY)  # 超出 z=8 上限，拒绝继续向出生区扩张


def test_hall_registry_idempotent():
    registry = HallRegistry()
    first = registry.assign("lin-che")
    second = registry.assign("lin-che")
    assert first == second  # 幂等：重复分配返回同一展位
    other = registry.assign("zhou-ning")
    assert other["booth_id"] != first["booth_id"]
    assert other["position"] != first["position"]
    assert registry.booth_of("lin-che") == "booth_lin-che"
    assert registry.booth_of("nobody") is None
    assert len(registry) == 2


# ---------- 大厅快照（启动种子注册） ----------

def test_hall_snapshot_has_six_booths(client):
    snapshot = client.get("/api/v0/world/snapshot", params={"world": "hall"}).json()
    validate_snapshot(snapshot)
    # agents 只含 at-booth 站位（未触发串门时）
    assert len(snapshot["agents"]) == 6
    assert all(a["state"] == "at-booth" for a in snapshot["agents"])
    # events 为大厅事件滚动缓冲（静态时为空列表，串门时出现 move/talk）
    assert isinstance(snapshot["events"], list)
    # 6 个 booth module，display 结构完整
    booths = [m for m in snapshot["modules"] if m["type"] == "booth"]
    assert len(booths) == 6
    lin = next(m for m in booths if m["person_id"] == "lin-che")
    assert lin["display"]["name"] == "谢淯琪"
    assert lin["display"]["headline"].startswith("擅长把混乱的讨论")  # bio 首句
    assert lin["display"]["face_ref"] == "facts/seed/lin-che/face.png"
    assert lin["display"]["photos"]  # 相框有真实现场照指针
    assert any("咖啡" in tag for tag in lin["display"]["tags"])  # ≥L2 推断标签
    assert lin["app_entry"]["schema"] == "echo-scene-app.v1"
    assert lin["app_entry"]["app_id"] == "relationship-field"
    assert lin["app_entry"]["status"] == "ready"
    assert lin["app_entry"]["target"]["person_id"] == "lin-che"
    # 展位位置与该人 agent 站位一致
    agent = next(a for a in snapshot["agents"] if a["id"] == "lin-che")
    assert agent["position"]["x"] == lin["position"]["x"]
    assert agent["position"]["z"] == lin["position"]["z"]


def test_cafe_snapshot_unchanged_without_booths(client):
    snapshot = client.get("/api/v0/world/snapshot").json()  # 默认 cafe
    validate_snapshot(snapshot)
    assert len(snapshot["agents"]) == 6
    assert all(a["state"] != "at-booth" for a in snapshot["agents"])
    assert all(m["type"] != "booth" for m in snapshot["modules"])


# ---------- confirm → 大厅联动 ----------

def _confirm_new_person(client, privacy: str) -> dict:
    resp = client.post(
        "/api/v0/ingest",
        data={"captured_at": "2026-08-03T14:00:00+08:00", "device": "phone",
              "note": "黑客松 3 号展位", "place_hint": "XX 黑客松"},
        files=[("media", ("clip.mp4", b"fake-video", "video/mp4"))],
    )
    input_id = resp.json()["input_id"]
    draft = client.post("/api/v0/pipeline",
                        json={"input_id": input_id, "mode": "once"}).json()["encounter_draft"]
    resp = client.post("/api/v0/confirm", json={
        "encounter_draft": draft,
        "identity": {"name": "陈某", "match_person_id": None},
        "privacy": privacy,
    })
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_confirm_registers_seventh_booth(client):
    payload = _confirm_new_person(client, privacy="agent-usable")
    person_id = payload["person_id"]
    assert payload["booth_id"] == f"booth_{person_id}"
    snapshot = client.get("/api/v0/world/snapshot", params={"world": "hall"}).json()
    booths = [m for m in snapshot["modules"] if m["type"] == "booth"]
    assert len(booths) == 7  # 第 7 个展位长出
    booth = next(m for m in booths if m["person_id"] == person_id)
    assert booth["display"]["name"] == "陈某"
    assert booth["display"]["tags"]  # L2：推断标签上墙
    assert "app_entry" not in booth  # 新人的场域需等待上游生成，不在本链路伪造
    agent = next(a for a in snapshot["agents"] if a["id"] == person_id)
    assert agent["state"] == "at-booth"
    assert agent["position"]["x"] == booth["position"]["x"]
    validate_snapshot(snapshot)


def test_confirm_display_includes_self_only_first_version(client):
    # 首版不过滤（TBD-P3）：L1 encounter 的推断与照片同样上墙
    payload = _confirm_new_person(client, privacy="self-only")
    snapshot = client.get("/api/v0/world/snapshot", params={"world": "hall"}).json()
    booth = next(m for m in snapshot["modules"]
                 if m.get("person_id") == payload["person_id"])
    assert booth["display"]["tags"]      # 全量上墙（授权机制重议后恢复过滤）
    assert booth["display"]["photos"]


def test_register_idempotent_on_repeat_confirm(client):
    first = _confirm_new_person(client, privacy="agent-usable")
    person_id = first["person_id"]
    # 同一输入再走一次 pipeline + confirm（并入已有 Person）
    snapshot_before = client.get("/api/v0/world/snapshot", params={"world": "hall"}).json()
    count_before = len([m for m in snapshot_before["modules"] if m["type"] == "booth"])
    # 并入已有（match_person_id 非空）不重复分配展位
    resp = client.post("/api/v0/ingest",
                       data={"captured_at": "2026-08-03T15:00:00+08:00", "device": "phone"},
                       files=[("media", ("clip2.mp4", b"fake2", "video/mp4"))])
    draft = client.post("/api/v0/pipeline",
                        json={"input_id": resp.json()["input_id"],
                              "mode": "once"}).json()["encounter_draft"]
    resp = client.post("/api/v0/confirm", json={
        "encounter_draft": draft,
        "identity": {"name": None, "match_person_id": person_id},
        "privacy": "agent-usable",
    })
    assert resp.status_code == 200
    assert resp.json()["booth_id"] == f"booth_{person_id}"
    snapshot_after = client.get("/api/v0/world/snapshot", params={"world": "hall"}).json()
    booths = [m for m in snapshot_after["modules"] if m["type"] == "booth"]
    assert len(booths) == count_before  # 没有重复展位
    assert len([b for b in booths if b["person_id"] == person_id]) == 1
    assert len(snapshot_after["agents"]) == len(snapshot_before["agents"])
