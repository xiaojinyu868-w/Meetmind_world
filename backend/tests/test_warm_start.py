"""启动预热：服务重启后的第一张快照已是"生活中"的世界（不是一排出生点）。"""

from fastapi.testclient import TestClient

from app.main import WARM_TICKS_CAFE, create_app


def test_cafe_snapshot_is_lived_in_after_startup():
    client = TestClient(create_app())
    snapshot = client.get("/api/v0/world/snapshot").json()
    assert snapshot["schema"] == "echo-snapshot.v1"
    # 预热节拍已推进：tick 不是 0
    assert snapshot["tick"] >= WARM_TICKS_CAFE
    # 世界已经"发生过事情"：预热期间的交谈/会议进入事件滚动缓冲
    assert len(snapshot["events"]) >= 1
    # 快照时刻仍有非游走状态的 agent（入座/交谈/会议至少其一）
    active = [
        a for a in snapshot["agents"]
        if a["state"] in ("talking", "seated", "in-meeting")
    ]
    assert len(active) >= 1


def test_hall_snapshot_keeps_booth_layout_after_warmup():
    client = TestClient(create_app())
    snapshot = client.get("/api/v0/world/snapshot", params={"world": "hall"}).json()
    booths = [m for m in snapshot["modules"] if m.get("type") == "booth"]
    assert len(booths) >= 6
    # 预热不破坏大厅陈列：seed 6 人仍以 at-booth 为主
    at_booth = [a for a in snapshot["agents"] if a["state"] == "at-booth"]
    assert len(at_booth) >= 4
