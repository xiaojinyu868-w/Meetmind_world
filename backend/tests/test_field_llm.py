"""关系场域 LLM 艺术化生成单测（FR-2.11 / TBD-F3；provider 全部 mock）。

覆盖：prompt 材料注入、合法 JSON 接受并记录模型名、畸形/部分 JSON 回退
规则模板、数值钳制、字符串截断、echo-field.v1 前端契约键稳定、缓存与
regenerate 语义（regenerate 注入变化种子）。
"""

import json

from fastapi.testclient import TestClient

from app.agents.llm.base import LLMResponse
from app.fields import llm as field_llm
from app.fields.generator import FIELD_INFERENCE_NAME, FIELD_SCHEMA, generate_field
from app.main import create_app


class _FakeProvider:
    """可控 chat provider：预设输出文本，记录收到的 messages。"""

    def __init__(self, text: str, *, mock: bool = False, model: str = "deepseek-chat"):
        self.text = text
        self.mock = mock
        self.model = model
        self.messages: list = []

    def chat(self, messages, tools=None, response_format=None):
        self.messages = messages
        return LLMResponse(text=self.text, model=self.model, mock=self.mock)


def _client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def _package(store, person_id="lin-che"):
    return store.load_package(person_id)


def _valid_payload() -> dict:
    return {
        "title": "你与谢淯琪 · 回声场域",
        "metaphor": "一间把混乱讨论收成清问的临水工坊",
        "summary": "科技展咖啡摊借同一支记号笔的半小时，成了这里的地基。",
        "parameters": {
            "sky": "#7fa8b8", "horizon": "#d8c9a8", "ground": "#6f7f5a",
            "accent": "#d9903f", "fog": "#cfd8ce",
            "openness": 0.62, "warmth": 0.71, "motion": 0.4,
            "weather": "摊位的蒸汽刚散开",
        },
        "entities": {
            "threshold": "同一支记号笔递过来的瞬间",
            "memory": "2025 年秋，科技展咖啡摊的半小时",
            "thread": "把混乱讨论收束成清晰问题的共同课题",
            "echo": "下一次收束之前，先在这里坐一会儿",
        },
    }


def test_prompt_includes_relationship_materials(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    package = _package(client.app.state.store)
    messages = field_llm.build_field_prompt(
        package,
        inferences={"group-one": {"impression": {"value": "让复杂讨论慢慢变清楚"}}},
        relations_md="黄月胜 | 旧识 | 原型, 产品 | enc_seed\n",
        variation="雨后·abc123",
    )
    assert messages[0]["role"] == "system" and "JSON" in messages[0]["content"]
    user = messages[1]["content"]
    assert "谢淯琪" in user
    assert "让复杂讨论慢慢变清楚" in user
    assert "科技展咖啡摊" in user  # 相遇地点/时刻
    assert "创作伙伴" in user  # 相遇推断（共同线索）
    assert "黄月胜 | 旧识" in user  # relations.md 行
    assert "雨后·abc123" in user  # regenerate 变化种子


def test_valid_llm_json_is_accepted_and_records_model(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    store = client.app.state.store
    package = _package(store)
    base = generate_field(package)
    provider = _FakeProvider(json.dumps(_valid_payload(), ensure_ascii=False))

    field = field_llm.try_llm_field(base, package, provider=provider)

    assert field is not None
    assert field["model"] == "deepseek-chat"
    assert field["regenerable"] is True and field["generated_from"]
    params = field["scene"]["parameters"]
    assert params["sky"] == "#7fa8b8"
    assert params["openness"] == 0.62 and params["weather"] == "摊位的蒸汽刚散开"
    assert field["scene"]["metaphor"] == _valid_payload()["metaphor"]
    by_type = {e["type"]: e for e in field["scene"]["entities"]}
    assert by_type["memory"]["detail"] == "2025 年秋，科技展咖啡摊的半小时"
    assert provider.messages  # 确实调用了 provider


def test_fenced_and_noisy_llm_output_is_tolerated(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    package = _package(client.app.state.store)
    base = generate_field(package)
    raw = "好的，这是设计：\n```json\n" + json.dumps(_valid_payload(), ensure_ascii=False) + "\n```"
    field = field_llm.try_llm_field(base, package, provider=_FakeProvider(raw))
    assert field is not None and field["scene"]["parameters"]["accent"] == "#d9903f"


def test_malformed_json_falls_back_to_deterministic(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    store = client.app.state.store
    package = _package(store)
    base = generate_field(package)
    assert field_llm.try_llm_field(
        base, package, provider=_FakeProvider("这不是 JSON")) is None
    # mock 响应（provider 未配置/调用失败）同样回退
    assert field_llm.try_llm_field(
        base, package, provider=_FakeProvider("[mock] 占位", mock=True)) is None
    # ensure_field 端到端：provider 输出垃圾时落回规则模板
    monkeypatch.setattr(field_llm.llm_base, "get_provider",
                        lambda role="chat": _FakeProvider("垃圾输出"))
    field = client.get("/api/v0/fields/lin-che").json()
    assert field["model"] == "relationship-field-rules.v1"
    assert store.read_inferences("lin-che")[FIELD_INFERENCE_NAME] == field


def test_partial_parameters_merge_with_skeleton(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    package = _package(client.app.state.store)
    base = generate_field(package)
    original_weather = base["scene"]["parameters"]["weather"]
    payload = {"parameters": {"sky": "#112233", "openness": 0.9}}
    field = field_llm.try_llm_field(base, package, provider=_FakeProvider(json.dumps(payload)))
    assert field is not None
    params = field["scene"]["parameters"]
    assert params["sky"] == "#112233" and params["openness"] == 0.9
    assert params["weather"] == original_weather  # 缺失字段保留骨架原值
    # parameters 整个缺失/全非法则整单判废
    assert field_llm.apply_llm_scene(generate_field(package), {"summary": "x"}) is None
    assert field_llm.apply_llm_scene(
        generate_field(package), {"parameters": {"sky": "red", "openness": "高"}}) is None


def test_numbers_clamped_and_strings_capped(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    package = _package(client.app.state.store)
    payload = _valid_payload()
    payload["parameters"]["openness"] = 5.0
    payload["parameters"]["warmth"] = -1
    payload["parameters"]["motion"] = "0.33"
    payload["parameters"]["sky"] = "#ABCDEF"
    payload["summary"] = "长" * 500
    payload["entities"]["echo"] = "回" * 200
    field = field_llm.try_llm_field(
        generate_field(package), package, provider=_FakeProvider(json.dumps(payload)))
    params = field["scene"]["parameters"]
    assert params["openness"] == 1.0 and params["warmth"] == 0.0
    assert params["motion"] == 0.33  # 数字字符串可解析
    assert params["sky"] == "#abcdef"  # 合法 hex 归一化为小写
    assert len(field["scene"]["summary"]) == 220
    by_type = {e["type"]: e for e in field["scene"]["entities"]}
    assert len(by_type["echo"]["detail"]) == 80


def test_garish_colors_fall_back_to_skeleton_values(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    package = _package(client.app.state.store)
    base = generate_field(package)
    original_accent = base["scene"]["parameters"]["accent"]
    payload = _valid_payload()
    payload["parameters"]["accent"] = "#95f727"  # 荧光绿，品味门槛拒绝
    payload["parameters"]["sky"] = "#ff00ff"  # 纯品红，低饱和要求拒绝
    field = field_llm.try_llm_field(
        base, package, provider=_FakeProvider(json.dumps(payload)))
    params = field["scene"]["parameters"]
    assert params["accent"] == original_accent  # 非法色保留骨架原值
    assert params["sky"] != "#ff00ff"
    assert params["openness"] == 0.62  # 其余合法字段仍被接受


def test_fabricated_names_are_rejected(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    package = _package(client.app.state.store)
    payload = _valid_payload()
    payload["summary"] = "你和黄月胜在这里坐了很久。"  # 材料外人物 = 幻觉
    assert field_llm.try_llm_field(
        generate_field(package), package,
        provider=_FakeProvider(json.dumps(payload)),
        forbidden_names=["黄月胜"]) is None
    # 同一份输出不查禁名单则正常接受（禁名单由 ensure_field 注入）
    assert field_llm.try_llm_field(
        generate_field(package), package,
        provider=_FakeProvider(json.dumps(payload))) is not None
    # 端到端：种子六人互为他者，lin-che 的场域提及杨璐即回退规则模板
    leaked = _valid_payload()
    leaked["summary"] = "杨璐也在场。"
    monkeypatch.setattr(field_llm.llm_base, "get_provider",
                        lambda role="chat": _FakeProvider(json.dumps(leaked)))
    field = client.get("/api/v0/fields/lin-che").json()
    assert field["model"] == "relationship-field-rules.v1"
    assert "杨璐" not in field["scene"]["summary"]  # 骨架未被污染


def test_schema_surface_stays_stable_for_frontend(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    package = _package(client.app.state.store)
    field = field_llm.try_llm_field(
        generate_field(package), package,
        provider=_FakeProvider(json.dumps(_valid_payload(), ensure_ascii=False)))
    assert field["schema"] == FIELD_SCHEMA
    for key in ("status", "person_id", "generated", "regenerable",
                "generated_from", "model", "created_at", "relation", "scene"):
        assert key in field
    scene = field["scene"]
    for key in ("title", "summary", "metaphor", "parameters", "spawn",
                "companion", "entities"):
        assert key in scene
    params = scene["parameters"]
    for key in ("sky", "horizon", "ground", "accent", "fog",
                "openness", "warmth", "motion", "weather"):
        assert key in params
    by_type = {e["type"]: e for e in scene["entities"]}
    assert {"threshold", "memory", "thread", "echo"}.issubset(by_type)
    assert all(
        by_type[kind]["interaction"]["label"] and by_type[kind]["interaction"]["event_type"]
        for kind in ("threshold", "memory", "thread", "echo")
    )


def test_regenerate_rerolls_llm_and_cache_otherwise(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    provider = _FakeProvider(json.dumps(_valid_payload(), ensure_ascii=False))
    monkeypatch.setattr(field_llm.llm_base, "get_provider", lambda role="chat": provider)

    first = client.get("/api/v0/fields/lin-che").json()
    assert first["model"] == "deepseek-chat"
    assert "这是一次重新生成" not in provider.messages[1]["content"]  # 首轮无变化种子
    provider.text = "垃圾输出"  # 缓存命中时不应再调 LLM
    cached = client.get("/api/v0/fields/lin-che").json()
    assert cached == first
    provider.text = json.dumps(_valid_payload(), ensure_ascii=False)
    rerolled = client.post("/api/v0/fields/lin-che/regenerate").json()
    assert rerolled["model"] == "deepseek-chat"
    assert "这是一次重新生成" in provider.messages[1]["content"]  # 重掷注入变化种子
