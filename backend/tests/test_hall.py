"""展位大厅测试（MVP1.5 §2）：布局、注册幂等、快照 booth 校验、confirm 联动、权限过滤。"""

import math

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.snapshot_schema import validate_snapshot
from app.world.hall import (
    BOOTH_COLUMNS,
    BOOTH_ROW_STEP,
    HALL_BOUNDS,
    SPAWN_FREE_Z,
    HallRegistry,
    booth_anchor,
)


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


# ---------- 布局算法 ----------

def test_layout_spacing_bounds_and_facing():
    anchors = [booth_anchor(i) for i in range(12)]  # 两排双排网格
    # 边界内 + 出生区留空
    for anchor in anchors:
        assert HALL_BOUNDS["min_x"] <= anchor["x"] <= HALL_BOUNDS["max_x"]
        assert HALL_BOUNDS["min_z"] <= anchor["z"] <= HALL_BOUNDS["max_z"]
        assert anchor["z"] < SPAWN_FREE_Z
    # 最近邻间距 ≥ 2.2m
    for i, a in enumerate(anchors):
        for b in anchors[i + 1:]:
            assert math.hypot(a["x"] - b["x"], a["z"] - b["z"]) >= 2.2 - 1e-9
    # 面向大厅中心：forward=(sin yaw, cos yaw) 与指向圆心方向一致
    for anchor in anchors:
        to_center_x, to_center_z = -anchor["x"], -anchor["z"]
        length = math.hypot(to_center_x, to_center_z)
        cos_sim = (math.sin(anchor["yaw"]) * to_center_x
                   + math.cos(anchor["yaw"]) * to_center_z) / length
        assert cos_sim > 0.999
    # 列距/行距常量满足间距要求
    assert min(BOOTH_COLUMNS[i + 1] - BOOTH_COLUMNS[i]
               for i in range(len(BOOTH_COLUMNS) - 1)) >= 2.2
    assert BOOTH_ROW_STEP >= 2.2


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

def test_hall_snapshot_has_six_booths_and_no_events(client):
    snapshot = client.get("/api/v0/world/snapshot", params={"world": "hall"}).json()
    validate_snapshot(snapshot)
    # agents 只含 at-booth 站位
    assert len(snapshot["agents"]) == 6
    assert all(a["state"] == "at-booth" for a in snapshot["agents"])
    # events 恒为空（大厅无对话）
    assert snapshot["events"] == []
    # 6 个 booth module，display 结构完整
    booths = [m for m in snapshot["modules"] if m["type"] == "booth"]
    assert len(booths) == 6
    lin = next(m for m in booths if m["person_id"] == "lin-che")
    assert lin["display"]["name"] == "林澈"
    assert lin["display"]["headline"].startswith("擅长把混乱的讨论")  # bio 首句
    assert lin["display"]["face_ref"] == "facts/seed/lin-che/face.png"
    assert lin["display"]["photos"]  # 相框有真实现场照指针
    assert any("咖啡" in tag for tag in lin["display"]["tags"])  # ≥L2 推断标签
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
    agent = next(a for a in snapshot["agents"] if a["id"] == person_id)
    assert agent["state"] == "at-booth"
    assert agent["position"]["x"] == booth["position"]["x"]
    validate_snapshot(snapshot)


def test_confirm_display_excludes_self_only(client):
    payload = _confirm_new_person(client, privacy="self-only")
    snapshot = client.get("/api/v0/world/snapshot", params={"world": "hall"}).json()
    booth = next(m for m in snapshot["modules"]
                 if m.get("person_id") == payload["person_id"])
    assert booth["display"]["tags"] == []  # L1 内容绝不上展位背景墙
    assert booth["display"]["photos"] == []


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
