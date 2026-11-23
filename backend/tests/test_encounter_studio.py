from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.encounter_studio import choose
from app.main import create_app

BASE = "/api/v0/encounter-studio"


def bearer(token):
    return {"Authorization": "Bearer " + token}


def test_two_distinct_roles_public_stage_and_idempotence(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    with TestClient(create_app()) as c:
        result = c.post(BASE + "/sessions", json={"need": "想先做二十件样件"}).json()
        room = result["id"]
        detail = f"{BASE}/sessions/{room}"
        owner = bearer(result["owner"])
        assert result["candidate"]["id"] == "maker"
        assert result["method"] == "词表匹配"
        assert c.get(detail).status_code == 404
        assert not c.get(f"{BASE}/stage/{room}").json()["confirmed"]
        guest_key = c.post(detail + "/invite", headers=owner).json()["guest"]
        guest = bearer(guest_key)
        assert c.post(detail + "/invite", headers=owner).json()["guest"] == guest_key
        assert c.post(detail + "/accept", headers=owner).status_code == 403
        assert c.post(detail + "/invite", headers=guest).status_code == 403
        assert c.get(f"{BASE}/stage/{room}").json()["candidate_id"] is None
        assert c.post(f"{BASE}/qr/{room}", headers=owner, json={"page": "https://example.org/encounter.html"}).content.startswith(b"\x89PNG")
        accepted = c.post(detail + "/accept", headers=guest).json()
        assert c.post(detail + "/accept", headers=guest).json()["updated"] == accepted["updated"]
        assert c.post(detail + "/decline", headers=guest).status_code == 409
        assert c.get(detail, headers=owner).json()["status"] == "confirmed"
        assert c.get(detail, headers=guest).json()["id"] == room
        assert c.get(f"{BASE}/stage/{room}").json() == {"confirmed": True, "candidate_id": "maker"}


def test_no_match_and_decline(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    with TestClient(create_app()) as c:
        for goal in ("我要找声乐老师", "不需要小批量试产"):
            assert c.post(BASE+"/sessions", json={"need": goal}).json()["status"] == "no_match"
        data = c.post(BASE+"/sessions", json={"need": "需要招募种子用户"}).json()
        assert data["candidate"]["id"] == "research"
        path = BASE+"/sessions/"+data["id"]
        guest = c.post(path+"/invite", headers=bearer(data["owner"])).json()["guest"]
        assert c.post(path+"/decline", headers=bearer(guest)).json()["status"] == "declined"
        assert c.post(path+"/accept", headers=bearer(guest)).status_code == 409
        assert c.get(BASE+"/stage/"+data["id"]).json()["confirmed"] is False


def test_model_source_and_invalid_quotes():
    def provider(text):
        return SimpleNamespace(chat=lambda *args, **kwargs: SimpleNamespace(text=text, mock=False))
    match = choose("需要样件", provider('{"id":"maker","quote":"小批量试产工厂"}'))
    assert match[0]["id"] == "maker" and match[1] == "小批量试产工厂"
    assert "模型" in match[2]
    assert choose("需要板材", provider('{"id":"maker","quote":"免费做钢板"}')) == (None, "", "词表匹配")
    assert choose("声乐老师", provider('{"id":null}')) == (None, "", "模型研判")
