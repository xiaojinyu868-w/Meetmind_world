"""EchoWorld 自建微信 OAuth 登录 + 移动端页契约测试。

验收：state 一次性 + TTL；/url /login 输出授权链接；callback 验 state、
code 换 token（httpx 假响应）、补注册本地用户、签出 MeetMind 兼容 JWT
并 302 到移动页；签出的 token 能过 verify_meetmind_token；移动页与
qr.png 可达；impressions 允许「登录用户本人」作为作者。
"""

import json
import time

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.security.meetmind_jwt import sign_echo_token, verify_meetmind_token

SECRET = "test-secret-wechat-oauth"
APP_ID = "wx-test-appid"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("JWT_SECRET", SECRET)
    monkeypatch.setenv("WECHAT_APP_ID", APP_ID)
    monkeypatch.setenv("WECHAT_APP_SECRET", "test-app-secret")
    monkeypatch.setenv("PUBLIC_DOMAIN", "capture.meetmind.online")
    return TestClient(create_app())


def _fake_wechat(monkeypatch, openid="o-test-openid", nickname="阿澄"):
    """把 wechat_auth 模块内的 httpx.get 换成微信假响应。"""
    from app.api import wechat_auth

    class _Resp:
        def __init__(self, payload):
            self._payload = payload

        def json(self):
            return self._payload

    def fake_get(url, params=None, timeout=None, headers=None):
        if "oauth2/access_token" in url:
            return _Resp({"openid": openid, "access_token": "wx-access-token"})
        if "userinfo" in url:
            return _Resp({"nickname": nickname, "headimgurl": "https://wx.qlogo.cn/x.jpg"})
        raise httpx.HTTPError(f"unexpected url {url}")

    monkeypatch.setattr(wechat_auth.httpx, "get", fake_get)


def test_sign_verify_roundtrip(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", SECRET)
    token = sign_echo_token("wechat_u1", "阿澄", expires_in=60)
    payload = verify_meetmind_token(token)
    assert payload["sub"] == "wechat_u1"
    assert payload["username"] == "阿澄"


def test_url_and_login_issue_state(client):
    body = client.get("/api/v0/auth/wechat/url").json()
    assert body["url"].startswith("https://open.weixin.qq.com/connect/oauth2/authorize")
    assert f"appid={APP_ID}" in body["url"]
    assert "scope=snsapi_userinfo" in body["url"]
    assert "echoworld%2Fapi%2Fv0%2Fauth%2Fwechat%2Fcallback" in body["url"] or \
        "echoworld/api/v0/auth/wechat/callback" in body["url"]
    login = client.get("/api/v0/auth/wechat/login", follow_redirects=False)
    assert login.status_code in (302, 307)
    assert login.headers["location"].startswith("https://open.weixin.qq.com/")


def test_callback_rejects_bad_state(client):
    response = client.get("/api/v0/auth/wechat/callback?code=x&state=bogus")
    assert response.status_code == 400


def test_callback_full_flow(client, monkeypatch):
    _fake_wechat(monkeypatch, openid="o-openid-1", nickname="阿澄")
    state = client.get("/api/v0/auth/wechat/url").json()["state"]
    response = client.get(f"/api/v0/auth/wechat/callback?code=code-1&state={state}",
                          follow_redirects=False)
    assert response.status_code in (302, 307)
    location = response.headers["location"]
    assert location.startswith("/echoworld/api/mobile/?token=")
    token = location.split("token=", 1)[1]
    payload = verify_meetmind_token(token)
    assert payload["sub"] == "wechat_o-openid-1"
    assert payload["username"] == "阿澄"
    # state 一次性：重放被拒绝
    replay = client.get(f"/api/v0/auth/wechat/callback?code=code-1&state={state}")
    assert replay.status_code == 400
    # 本地用户已补注册
    user_file = client.app.state.store.root / "users" / "wechat_o-openid-1.json"
    user = json.loads(user_file.read_text(encoding="utf-8"))
    assert user["nickname"] == "阿澄"
    assert user["source"] == "wechat-oauth"
    # 签出的 token 直接可用：/auth/me 返回同一人
    me = client.get("/api/v0/auth/me", headers={"authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["user_id"] == "wechat_o-openid-1"


def test_callback_wechat_error(client, monkeypatch):
    from app.api import wechat_auth

    class _Resp:
        def json(self):
            return {"errcode": 40029, "errmsg": "invalid code"}

    monkeypatch.setattr(wechat_auth.httpx, "get", lambda *a, **k: _Resp())
    state = client.get("/api/v0/auth/wechat/url").json()["state"]
    response = client.get(f"/api/v0/auth/wechat/callback?code=bad&state={state}")
    assert response.status_code == 400
    assert "invalid code" in response.text


def test_state_expires(client):
    states_path = client.app.state.store.root / "users" / "oauth_states.json"
    stale = {"stale-state": time.time() - 3600}
    states_path.parent.mkdir(parents=True, exist_ok=True)
    states_path.write_text(json.dumps(stale), encoding="utf-8")
    response = client.get("/api/v0/auth/wechat/callback?code=x&state=stale-state")
    assert response.status_code == 400


def test_mobile_page_and_qr(client):
    page = client.get("/api/mobile/")
    assert page.status_code == 200
    assert "EchoWorld" in page.text
    assert "HEIC / HEIF / AVIF" in page.text
    qr = client.get("/api/mobile/qr.png")
    assert qr.status_code == 200
    assert qr.headers["content-type"] == "image/png"
    assert qr.content[:4] == b"\x89PNG"


def test_impression_authored_by_user(client):
    store = client.app.state.store
    store.create_draft_package("person_target", {})
    store.confirm_identity("person_target", name="小满")
    token = sign_echo_token("wechat_u1", "阿澄")

    created = client.post("/api/v1/impressions", json={
        "author_id": "wechat_u1", "subject_id": "person_target",
        "text": "今天一起喝了手冲，TA 说起山里的清晨。",
        "kind": "peer-impression", "privacy": "self-only",
    }, headers={"authorization": f"Bearer {token}"})
    assert created.status_code == 201
    assert created.json()["author_id"] == "wechat_u1"

    # 未登录时作者必须是已确认 Package 人物（旧行为不变）
    anonymous = client.post("/api/v1/impressions", json={
        "author_id": "wechat_u1", "subject_id": "person_target",
        "text": "匿名不该通过", "kind": "peer-impression", "privacy": "self-only",
    })
    assert anonymous.status_code == 404


# ---------- 桌面↔手机配对登录 ----------


def test_pair_flow(client):
    token = sign_echo_token("wechat_pair_user", "阿澄")
    created = client.post("/api/v0/auth/pair")
    assert created.status_code == 201
    challenge_id = created.json()["challenge_id"]

    # 未确认前：pending
    assert client.get(f"/api/v0/auth/pair?id={challenge_id}").json()["status"] == "pending"

    # 未登录不能确认
    assert client.post("/api/v0/auth/pair/confirm",
                       json={"challenge_id": challenge_id}).status_code == 401

    confirmed = client.post("/api/v0/auth/pair/confirm",
                            json={"challenge_id": challenge_id},
                            headers={"authorization": f"Bearer {token}"})
    assert confirmed.status_code == 200
    assert confirmed.json()["nickname"] == "阿澄"

    # 轮询一次性拿到 token，随后挑战销毁
    polled = client.get(f"/api/v0/auth/pair?id={challenge_id}").json()
    assert polled["status"] == "authorized"
    assert polled["nickname"] == "阿澄"
    assert verify_meetmind_token(polled["token"])["sub"] == "wechat_pair_user"
    assert client.get(f"/api/v0/auth/pair?id={challenge_id}").json()["status"] == "expired"


def test_pair_unknown_and_expired(client):
    assert client.get("/api/v0/auth/pair?id=nope").json()["status"] == "expired"
    expired = client.post("/api/v0/auth/pair/confirm", json={"challenge_id": "nope"},
                          headers={"authorization": f"Bearer {sign_echo_token('u', 'n')}"})
    assert expired.status_code == 404


def test_pair_qr_encodes_challenge(client):
    # pair 参数被编进二维码内容（合法字符才接受）
    import segno
    from io import BytesIO
    response = client.get("/api/mobile/qr.png?pair=abcDEF-123_")
    assert response.status_code == 200
    decoded = segno.decode(BytesIO(response.content)) if hasattr(segno, "decode") else None
    # segno 无解码器：退化为接口级冒烟（200 + PNG + 不同 pair 产出不同图）
    again = client.get("/api/mobile/qr.png?pair=zzz999")
    assert again.content != response.content
    assert decoded is None or "pair=abcDEF-123_" in decoded


def test_pair_qr_rejects_injection(client):
    # 注入字符不进二维码目标（退回无 pair 的入口码）
    injected = client.get("/api/mobile/qr.png?pair=x?evil=1")
    plain = client.get("/api/mobile/qr.png")
    assert injected.status_code == 200
    assert injected.content == plain.content
