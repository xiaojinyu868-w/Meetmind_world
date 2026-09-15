"""活动模式：碰卡入场事件流契约（幂等、分区槽位、皮肤校验、回放、二维码）。"""

import base64
import json
import struct
import zlib

from fastapi.testclient import TestClient

from app.main import create_app


def _client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def _png(width=128, height=128) -> str:
    """最小合法 PNG（单色 RGBA），返回 data URL。"""
    def chunk(kind: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + kind + data
                + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF))

    raw = b"".join(b"\x00" + b"\xd5\x9b\x78\xff" * width for _ in range(height))
    payload = (b"\x89PNG\r\n\x1a\n"
               + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
               + chunk(b"IDAT", zlib.compress(raw, 9))
               + chunk(b"IEND", b""))
    return "data:image/png;base64," + base64.b64encode(payload).decode("ascii")


def _check_in(client, event="ali-demo", tag="04:A1:B2:C3", name="林澈", **extra):
    body = {"tag_id": tag, "display_name": name, "intro": "做 AI 硬件的",
            "atlas_png": _png(), **extra}
    return client.post(f"/api/v0/events/{event}/checkins", json=body)


def test_first_tap_creates_checkin_with_zone_slot_and_atlas(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    response = _check_in(client, zone_id="dev")
    assert response.status_code == 201
    payload = response.json()
    assert payload["returning"] is False
    record = payload["checkin"]
    assert record["schema"] == "echo-event-checkin.v1"
    assert record["seq"] == 1 and record["updated_seq"] == 1
    assert record["zone_id"] == "dev" and record["slot"] == 0
    assert record["display_name"] == "林澈" and record["intro"] == "做 AI 硬件的"
    assert record["checkin_id"].startswith("ck_")
    assert record["atlas"] == f"atlas/{record['checkin_id']}.png"

    atlas = client.get(f"/api/v0/events/ali-demo/checkins/{record['checkin_id']}/atlas.png")
    assert atlas.status_code == 200
    assert atlas.headers["content-type"] == "image/png"
    assert atlas.content.startswith(b"\x89PNG")

    summary = client.get("/api/v0/events/ali-demo").json()
    assert summary["schema"] == "echo-event.v1"
    assert summary["total"] == 1 and summary["last_seq"] == 1
    assert {zone["zone_id"]: zone["count"] for zone in summary["zones"]}["dev"] == 1
    assert summary["title"]


def test_same_tag_is_a_return_visit_not_a_duplicate(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    first = _check_in(client, zone_id="dev").json()["checkin"]
    again = _check_in(client, name="林澈 · 回来了", intro="第二次进场", zone_id="founders")
    assert again.status_code == 200
    payload = again.json()
    assert payload["returning"] is True
    record = payload["checkin"]
    assert record["checkin_id"] == first["checkin_id"]
    assert record["zone_id"] == "dev" and record["slot"] == 0  # 回访不换位
    assert record["display_name"] == "林澈 · 回来了" and record["intro"] == "第二次进场"
    assert record["seq"] == 1 and record["updated_seq"] == 2 and record["visits"] == 2

    listing = client.get("/api/v0/events/ali-demo/checkins").json()
    assert len(listing["items"]) == 1 and listing["last_seq"] == 2


def test_incremental_polling_returns_only_newer_records(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    _check_in(client, tag="tag-a", name="甲")
    second = _check_in(client, tag="tag-b", name="乙").json()["checkin"]
    listing = client.get("/api/v0/events/ali-demo/checkins", params={"since": 1}).json()
    assert [item["checkin_id"] for item in listing["items"]] == [second["checkin_id"]]
    assert listing["last_seq"] == 2
    # 回访更新会把旧记录带回增量结果
    _check_in(client, tag="tag-a", name="甲·更新")
    listing = client.get("/api/v0/events/ali-demo/checkins", params={"since": 2}).json()
    assert [item["display_name"] for item in listing["items"]] == ["甲·更新"]
    assert client.get("/api/v0/events/ali-demo/checkins", params={"since": 3}).json()["items"] == []


def test_zone_assignment_balances_and_falls_back_when_full(tmp_path, monkeypatch):
    event_dir = tmp_path / "events" / "tiny"
    event_dir.mkdir(parents=True)
    (event_dir / "event.json").write_text(json.dumps({
        "title": "小活动",
        "zones": [
            {"zone_id": "a", "title": "A 区", "capacity": 1},
            {"zone_id": "b", "title": "B 区", "capacity": 1},
        ],
    }), encoding="utf-8")
    client = _client(tmp_path, monkeypatch)
    first = _check_in(client, event="tiny", tag="t1", name="一", zone_id="a").json()["checkin"]
    second = _check_in(client, event="tiny", tag="t2", name="二", zone_id="a").json()["checkin"]
    assert first["zone_id"] == "a"
    assert second["zone_id"] == "b" and second["zone_requested"] == "a"
    full = _check_in(client, event="tiny", tag="t3", name="三")
    assert full.status_code == 409
    summary = client.get("/api/v0/events/tiny").json()
    assert summary["title"] == "小活动" and summary["total"] == 2


def test_atlas_and_identity_validation(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    wrong_size = _check_in(client, atlas_png=_png(64, 64))
    assert wrong_size.status_code == 422 and "128" in wrong_size.json()["detail"]
    not_png = _check_in(client, atlas_png=base64.b64encode(b"GIF89a....").decode())
    assert not_png.status_code == 422
    bad_tag = _check_in(client, tag="bad tag!")
    assert bad_tag.status_code == 422
    blank_name = _check_in(client, name="   ")
    assert blank_name.status_code == 422
    bad_event = client.get("/api/v0/events/Not_Valid!")
    assert bad_event.status_code == 404
    # 没有皮肤也允许入场（前端用程序化兜底），但 atlas 接口 404
    no_atlas = client.post("/api/v0/events/ali-demo/checkins",
                           json={"tag_id": "plain", "display_name": "素人"})
    assert no_atlas.status_code == 201
    record = no_atlas.json()["checkin"]
    assert record["atlas"] is None
    missing = client.get(f"/api/v0/events/ali-demo/checkins/{record['checkin_id']}/atlas.png")
    assert missing.status_code == 404


def test_checkins_survive_service_restart(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    created = _check_in(client, tag="persist", name="持久").json()["checkin"]
    _check_in(client, tag="persist", name="持久·二次")
    restarted = TestClient(create_app())
    listing = restarted.get("/api/v0/events/ali-demo/checkins").json()
    assert len(listing["items"]) == 1
    item = listing["items"][0]
    assert item["checkin_id"] == created["checkin_id"]
    assert item["display_name"] == "持久·二次" and item["visits"] == 2
    assert listing["last_seq"] == 2
    # 重启后同一 tag 仍是回访，且新签到的 slot 不与旧记录冲突
    again = _check_in(restarted, tag="persist", name="持久·三次")
    assert again.status_code == 200
    newcomer = _check_in(restarted, tag="new", name="新人", zone_id=item["zone_id"]).json()["checkin"]
    assert newcomer.get("zone_id") != item["zone_id"] or newcomer["slot"] != item["slot"]
    log = (tmp_path / "events" / "ali-demo" / "checkins.v1.jsonl").read_text(encoding="utf-8")
    assert len([line for line in log.splitlines() if line.strip()]) == 4


def test_event_qr_points_to_tap_page(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    response = client.get("/api/v0/events/ali-demo/qr.png")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG")
