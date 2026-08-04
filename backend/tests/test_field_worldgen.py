"""场域世界生成（FR-2.11 升级 / ROADMAP 2.G）：Marble provider、world 块契约、
202 流程、一人一次守卫、P-8 prompt 禁名、媒体白名单——全部 mock，不耗真实额度。
"""

import time

import httpx
import pytest
from fastapi.testclient import TestClient

from app.fields.generator import FIELD_INFERENCE_NAME, generate_field
from app.fields import world_gen
from app.fields.world_gen import (
    FieldWorldBusyError,
    MarbleWorldGen,
    WorldGenError,
    build_world_prompt,
    get_world_block,
    request_field_world,
    world_prompt_hash,
)
from app.main import create_app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


class FakeWorldGen:
    """脚本化 provider：generate 返回固定 operation，poll/download 按脚本回放。"""

    def __init__(self, operations, *, assets_payload=None, download_size=64):
        self.operations = list(operations)
        self.assets_payload = assets_payload or {}
        self.download_size = download_size
        self.model = "marble-1.1"
        self.config = {
            "configured": True,
            "model": "marble-1.1",
            "poll_interval_seconds": 0.01,
            "poll_timeout_seconds": 5.0,
        }
        self.generated_prompts: list[str] = []

    def generate_world(self, prompt, display_name):
        self.generated_prompts.append(prompt)
        return {"operation_id": "op-fake-1", "mock": False, "model": self.model}

    def get_operation(self, operation_id):
        if self.operations:
            return self.operations.pop(0)
        return {"operation_id": operation_id, "done": True,
                "response": {"world_id": "world-fake-1",
                             "assets": self.assets_payload}}

    def download_asset(self, url):
        return b"asset-bytes:" + url[-8:].encode("utf-8") + b":" * self.download_size


READY_ASSETS = {
    "caption": "一座手绘迷你花园",
    "splats": {
        "spz_urls": {"100k": "https://cdn.example/x_100k.spz",
                     "500k": "https://cdn.example/x_500k.spz"},
        "semantics_metadata": {"metric_scale_factor": 0.42,
                               "ground_plane_offset": 0.46},
    },
    "mesh": {"collider_mesh_url": "https://cdn.example/collider.glb"},
    "imagery": {"pano_url": "https://cdn.example/pano.png"},
}


def _wait_world_status(client, person_id, wanted, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        world = get_world_block(client.get(f"/api/v0/fields/{person_id}").json())
        if world.get("status") == wanted:
            return world
        time.sleep(0.02)
    raise AssertionError(f"等待 world.status={wanted} 超时，当前：{world}")


# ---------- P-8：prompt 只含视觉描述，禁人名 ----------

def test_prompt_builder_never_contains_person_names(client):
    store = client.app.state.store
    field = client.get("/api/v0/fields/lin-che").json()
    names = [s["name"] for s in store.list_packages() if s.get("name")]
    assert names, "种子资料包应有人名"
    forbidden = [name for s in store.list_packages()
                 if s.get("name") and s["person_id"] != "lin-che"
                 for name in [s["name"]]]
    prompt = build_world_prompt(field, forbidden_names=forbidden)
    for name in names:  # 包括本人姓名：prompt 只允许视觉描述
        assert name not in prompt, f"prompt 泄露人名：{name}"
    assert "relationship" not in prompt.lower()
    assert world_prompt_hash(prompt) == world_prompt_hash(prompt)


def test_prompt_builder_rejects_forbidden_name_injection(client):
    field = client.get("/api/v0/fields/lin-che").json()
    poisoned = {**field, "scene": {**field["scene"], "metaphor": "和黄月胜一起的山丘"}}
    with pytest.raises(ValueError):
        build_world_prompt(poisoned, forbidden_names=["黄月胜"])


# ---------- world 块契约与向后兼容 ----------

def test_field_without_world_block_stays_compatible(client):
    field = client.get("/api/v0/fields/lin-che").json()
    assert "world" not in field  # 未请求世界生成时 schema 不变
    assert get_world_block(field) == {"status": "none"}
    assert get_world_block({**field, "world": {"status": "bogus"}}) == {"status": "none"}


def test_legacy_cached_field_still_loads(client):
    store = client.app.state.store
    legacy = generate_field(store.load_package("lin-che"))
    store.write_inference("lin-che", FIELD_INFERENCE_NAME, legacy)
    field = client.get("/api/v0/fields/lin-che").json()
    assert field["schema"] == "echo-field.v1"
    assert get_world_block(field)["status"] == "none"


# ---------- mock 模式：未配置 key 确定性 pending→none ----------

def test_mock_mode_deterministic_pending_to_none(client):
    world_gen.reset_worldgen_provider()  # conftest 已清空 WORLDLABS_API_KEY
    response = client.post("/api/v0/fields/lin-che/world")
    assert response.status_code == 202
    world = response.json()["world"]
    assert world["status"] == "none"
    assert "WORLDLABS_API_KEY" in world["reason"]
    # GET 场域立即反映 none（同步完成，无悬挂线程）
    assert get_world_block(client.get("/api/v0/fields/lin-che").json())["status"] == "none"


# ---------- 202 流程：queued → ready，资产落派生存储 ----------

def test_world_generation_flow_queued_to_ready(client):
    provider = FakeWorldGen(
        operations=[{"operation_id": "op-fake-1", "done": False}],
        assets_payload=READY_ASSETS,
    )
    world_gen.reset_worldgen_provider(provider)

    response = client.post("/api/v0/fields/lin-che/world")
    assert response.status_code == 202
    assert response.json()["world"]["status"] == "queued"
    assert provider.generated_prompts, "应发起一次真实生成"

    world = _wait_world_status(client, "lin-che", "ready")
    assert world["world_id"] == "world-fake-1"
    assert world["model"] == "marble-1.1"
    assert world["metric_scale_factor"] == 0.42
    assert world["ground_plane_offset"] == 0.46
    assert world["caption"] == "一座手绘迷你花园"
    assert world["source_prompt_hash"]
    for ref in (world["spz"]["100k"], world["spz"]["500k"],
                world["collider_ref"], world["pano_ref"]):
        assert ref.startswith("derived/field-world-lin-che/world-fake-1/")
        fetched = client.get(f"/api/v0/media/{ref}")
        assert fetched.status_code == 200, ref

    # prompt 指纹未变时重复请求直接 200 返回现状，不再生成
    again = client.post("/api/v0/fields/lin-che/world")
    assert again.status_code == 200
    assert again.json()["world"]["world_id"] == "world-fake-1"
    assert len(provider.generated_prompts) == 1

    # regenerate=true 强制重算
    regenerated = client.post("/api/v0/fields/lin-che/world?regenerate=true")
    assert regenerated.status_code == 202
    assert len(provider.generated_prompts) == 2
    _wait_world_status(client, "lin-che", "ready")


def test_world_generation_missing_assets_marks_failed(client):
    provider = FakeWorldGen(operations=[], assets_payload={})
    world_gen.reset_worldgen_provider(provider)
    assert client.post("/api/v0/fields/lin-che/world").status_code == 202
    world = _wait_world_status(client, "lin-che", "failed")
    assert "缺少" in world["reason"]


def test_unknown_person_world_request_404(client):
    assert client.post("/api/v0/fields/nobody/world").status_code == 404


# ---------- 一人一次守卫：queued 期间 409 ----------

def test_one_active_generation_per_person_409(client):
    provider = FakeWorldGen(
        operations=[{"operation_id": "op-fake-1", "done": False}] * 60,
        assets_payload=READY_ASSETS,
    )
    provider.config["poll_timeout_seconds"] = 0.3  # 守卫验证后让线程自行退出
    world_gen.reset_worldgen_provider(provider)

    assert client.post("/api/v0/fields/lin-che/world").status_code == 202
    conflict = client.post("/api/v0/fields/lin-che/world")
    assert conflict.status_code == 409
    _wait_world_status(client, "lin-che", "failed")  # 轮询超时收尾，不泄漏忙标记
    provider.config["poll_timeout_seconds"] = 5.0  # 第二轮生成给足轮询窗口
    assert client.post("/api/v0/fields/lin-che/world").status_code == 202
    world = _wait_world_status(client, "lin-che", "ready")
    assert world["world_id"] == "world-fake-1"


def test_request_field_world_busy_raises(client):
    store = client.app.state.store
    provider = FakeWorldGen(operations=[{"done": False}] * 60,
                            assets_payload=READY_ASSETS)
    provider.config["poll_timeout_seconds"] = 0.2
    world, status = request_field_world(store, "lin-che", provider=provider)
    assert status == 202 and world["status"] == "queued"
    with pytest.raises(FieldWorldBusyError):
        request_field_world(store, "lin-che", provider=provider)
    _wait_world_status(client, "lin-che", "failed")


# ---------- provider 状态机：5xx 重试 / 4xx 不重试 / mock 降级 ----------

def test_provider_retries_on_5xx_then_succeeds():
    calls = {"generate": 0}

    def handler(request):
        calls["generate"] += 1
        if calls["generate"] == 1:
            return httpx.Response(503, json={"error": "busy"})
        return httpx.Response(200, json={"operation_id": "op-1", "done": False})

    provider = MarbleWorldGen(
        config={"api_base": "https://api.worldlabs.ai/marble/v1",
                "api_key": "test-key", "model": "marble-1.1", "configured": True},
        transport=httpx.MockTransport(handler),
    )
    result = provider.generate_world("a garden", "echo-field-test")
    assert result == {"operation_id": "op-1", "mock": False, "model": "marble-1.1"}
    assert calls["generate"] == 2
    record = provider.call_log[-1]
    assert record.provider == "worldlabs-marble" and not record.mock
    assert "test-key" not in record.input_summary + record.output_summary


def test_provider_4xx_does_not_retry():
    calls = {"n": 0}

    def handler(request):
        calls["n"] += 1
        return httpx.Response(402, json={"error": "no credits"})

    provider = MarbleWorldGen(
        config={"api_base": "https://api.worldlabs.ai/marble/v1",
                "api_key": "test-key", "model": "marble-1.1", "configured": True},
        transport=httpx.MockTransport(handler),
    )
    with pytest.raises(WorldGenError):
        provider.generate_world("a garden", "echo-field-test")
    assert calls["n"] == 1


def test_provider_mock_mode_never_calls_network():
    provider = MarbleWorldGen(config={"api_base": "", "api_key": "",
                                      "model": "marble-1.1", "configured": False})
    assert provider.generate_world("a garden", "x")["mock"] is True
    operation = provider.get_operation("op-mock")
    assert operation["done"] is True and operation["mock"] is True
    assert all(record.mock for record in provider.call_log)


# ---------- 媒体白名单：spz / glb ----------

def test_media_whitelist_serves_spz_and_glb(client):
    store = client.app.state.store
    spz_ref = store.write_derived_asset(
        "field-world-lin-che", "gen-1", "world_100k.spz", b"spz-bytes")
    glb_ref = store.write_derived_asset(
        "field-world-lin-che", "gen-1", "collider.glb", b"glb-bytes")
    spz = client.get(f"/api/v0/media/{spz_ref}")
    assert spz.status_code == 200
    assert spz.headers["content-type"] == "application/octet-stream"
    glb = client.get(f"/api/v0/media/{glb_ref}")
    assert glb.status_code == 200
    assert glb.headers["content-type"] == "model/gltf-binary"
