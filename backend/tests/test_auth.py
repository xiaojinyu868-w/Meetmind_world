"""登录态与世界归属（MeetMind 共享 JWT + owner 过滤）契约测试。

验收：验签（有效/过期/错签/缺 sub）；/auth/me 补注册幂等；packages 列表与
详情按 owner 过滤；世界快照与房间快照归属过滤。
"""

import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def make_token(secret: str, sub: str = "u-test-1", *, exp: float | None = None,
               username: str = "tester") -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(json.dumps({
        "sub": sub, "username": username, "role": "student",
        "iat": time.time(), "exp": exp or time.time() + 3600,
    }).encode())
    signature = _b64url(hmac.new(secret.encode(), f"{header}.{payload}".encode(),
                                 hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


SECRET = "test-secret-0123456789"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("JWT_SECRET", SECRET)
    return TestClient(create_app())


def test_jwt_verify_roundtrip(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", SECRET)
    from app.security.meetmind_jwt import verify_meetmind_token

    assert verify_meetmind_token(make_token(SECRET))["sub"] == "u-test-1"
    assert verify_meetmind_token(make_token("wrong-secret")) is None
    assert verify_meetmind_token(make_token(SECRET, exp=time.time() - 10)) is None
    assert verify_meetmind_token("not-a-token") is None
    assert verify_meetmind_token("") is None


def test_auth_me_provisions_user(client):
    token = make_token(SECRET, sub="u-abc", username="haru")
    unauthorized = client.get("/api/v0/auth/me")
    assert unauthorized.status_code == 401
    me = client.get("/api/v0/auth/me", headers={"authorization": f"Bearer {token}"})
    assert me.status_code == 200
    body = me.json()
    assert body["authenticated"] is True
    assert body["user_id"] == "u-abc"
    # 幂等：再次调用仍是同一人
    again = client.get("/api/v0/auth/me", headers={"authorization": f"Bearer {token}"})
    assert again.json()["user_id"] == "u-abc"


def test_packages_filter_by_owner(client):
    store = client.app.state.store
    mine = store.create_draft_package("person_mine", {})
    mine["owner_id"] = "u-abc"
    store.save_package(mine)
    others = store.create_draft_package("person_other", {})
    others["owner_id"] = "u-other"
    store.save_package(others)

    # 未登录：只见 system（种子卡司），不见任何人的私有包
    guests = client.get("/api/v0/packages").json()["packages"]
    ids = {pkg["person_id"] for pkg in guests}
    assert "person_mine" not in ids and "person_other" not in ids
    assert "lin-che" in ids

    # 登录（u-abc）：system + 自己的
    token = make_token(SECRET, sub="u-abc")
    mine_list = client.get("/api/v0/packages",
                           headers={"authorization": f"Bearer {token}"}).json()["packages"]
    mine_ids = {pkg["person_id"] for pkg in mine_list}
    assert "person_mine" in mine_ids and "person_other" not in mine_ids

    # 详情：他人包 404
    assert client.get("/api/v0/packages/person_other",
                      headers={"authorization": f"Bearer {token}"}).status_code == 404
    assert client.get("/api/v0/packages/person_mine",
                      headers={"authorization": f"Bearer {token}"}).status_code == 200


def test_room_snapshot_filters_members_by_owner(client):
    store = client.app.state.store
    mine = store.create_draft_package("person_mine", {})
    mine["owner_id"] = "u-abc"
    store.save_package(mine)
    rooms = client.app.state.room_service
    rooms.create_room(room_id="demo-room", name="Demo")
    rooms.join_room("demo-room", member_id="person_mine", display_name="Mine")
    rooms.join_room("demo-room", member_id="lin-che", display_name="谢淯琪")

    guests = client.get("/api/v1/rooms/demo-room/snapshot").json()
    guest_ids = {m["member_id"] for m in guests["members"]}
    assert "person_mine" not in guest_ids and "lin-che" in guest_ids

    token = make_token(SECRET, sub="u-abc")
    mine_view = client.get("/api/v1/rooms/demo-room/snapshot",
                           headers={"authorization": f"Bearer {token}"}).json()
    mine_ids = {m["member_id"] for m in mine_view["members"]}
    assert "person_mine" in mine_ids and "lin-che" in mine_ids
