from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import night_atlas


def client():
    app = FastAPI()
    app.include_router(night_atlas.router)
    return TestClient(app)


def test_turn_modes_and_limits(monkeypatch):
    url = "/api/v0/night-atlas/turn"
    body = {"scenario": "make", "goal": "约一次试做", "said": "可以先做一个纸模型吗？"}
    api = client()
    assert api.post(url, json=body).json() == {"mode": "guided"}
    assert api.post(url, json={**body, "said": "  "}).status_code == 422
    assert api.post(url, json={**body, "history": [{"said": "好", "reply": "好"}] * 3}).status_code == 422

    def chat(messages, response_format):
        assert messages[-1]["role"] == "user"
        return SimpleNamespace(mock=False, text='{"reply":"多大？","coach":"说明尺寸","nextStep":"画草稿","message":"一起试做吗？","sourceQuote":"纸模型"}')

    monkeypatch.setattr(night_atlas, "get_provider", lambda role: SimpleNamespace(chat=chat))
    output = api.post(url, json=body).json()
    assert output["reply"] == "多大？" and output["sourceQuote"] == "纸模型"
    assert "sourceQuote" not in api.post(url, json={**body, "said": "试灯吗？"}).json()
    monkeypatch.setattr(night_atlas, "take_slot", lambda: False)
    assert api.post(url, json=body).json() == {"mode": "guided"}
