"""关系场域的 Marble 世界生成（FR-2.11 / ROADMAP 2.G 升级）。

把 LLM 艺术层（echo-field.v1 的 metaphor/weather/palette 等视觉描述）转译为
场景 prompt，经 World Labs Marble API 生成高斯泼溅世界（.spz）+ 碰撞网格
（GLB）+ 全景图；资产写入推断层派生存储（derived/，P-3：标记 generated、
记录来源指针、可重算），场域 JSON 以可选 ``world`` 块记录状态与资产指针，
echo-field.v1 保持向后兼容（无 world 块的旧缓存照常工作）。

P-8 红线：发给 World Labs 的 prompt 只含视觉描述（空间隐喻/天气光线/调色板/
氛围数值），绝不包含人名与关系事实；``build_world_prompt`` 输出前做禁名
校验，命中即拒发。

未配置 WORLDLABS_API_KEY 时 provider 走 mock：生成请求确定性地落为
status="none"（pending→none），离线/测试环境绝不悬挂、绝不外发请求。
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from app.config import get_worldgen_config
from app.packages.store import PackageNotFound  # noqa: F401  (re-export 供 api 层捕获)

from .generator import FIELD_INFERENCE_NAME, ensure_field

logger = logging.getLogger(__name__)

# world.status 取值：none（未生成/未配置）| queued（已受理生成中）| ready | failed
WORLD_STATUSES = ("none", "queued", "ready", "failed")

# 派生资产命名空间前缀：derived/field-world-<person_id>/<generation_id>/
WORLD_ASSET_NAMESPACE = "field-world"

# Marble 世界生成的统一风格后缀：与 EchoWorld 故事书低多边形美术方向一致，
# 纯视觉描述，不含任何人物信息。
_WORLD_STYLE_SUFFIX = (
    "Style: cozy hand-painted miniature diorama, storybook aesthetic, soft "
    "low-poly shapes, gentle muted lighting, no people, no text, no watermark."
)


class WorldGenError(RuntimeError):
    """Marble API 调用失败（网络/协议/非 2xx），调用方落 failed 状态。"""


class FieldWorldBusyError(RuntimeError):
    """同一人物已有进行中的世界生成（一人一次，API 层映射 409）。"""


@dataclass
class WorldGenCallRecord:
    """一次世界生成调用的审计记录（不含 key 与请求头）。"""

    provider: str
    model: str
    action: str
    input_summary: str
    output_summary: str
    latency_ms: float
    mock: bool
    created_at: float


class MarbleWorldGen:
    """World Labs Marble API 客户端（generate / poll / download）。

    config：见 config.get_worldgen_config()；transport 供测试注入
    httpx.MockTransport，不耗真实额度。未配置时所有调用返回 mock 结果，
    绝不上抛异常。
    """

    name = "worldlabs-marble"

    def __init__(self, config: dict | None = None, timeout: float = 60.0,
                 transport=None, max_retries: int = 3):
        self.config = config or get_worldgen_config()
        self.timeout = timeout
        self._transport = transport
        self.max_retries = max_retries
        self.call_log: list[WorldGenCallRecord] = []

    @property
    def configured(self) -> bool:
        return bool(self.config.get("configured"))

    @property
    def model(self) -> str:
        return self.config.get("model") or "unknown"

    # ---------- 对外接口 ----------

    def generate_world(self, prompt: str, display_name: str) -> dict:
        """发起文本到世界生成，返回 {"operation_id", "mock", "model"}。"""
        started = time.monotonic()
        if not self.configured:
            record = self._record("generate", prompt, "mock：未配置 WORLDLABS_API_KEY",
                                  started, mock=True)
            logger.info("Marble 世界生成未配置，mock 降级（%s）", record.input_summary)
            return {"operation_id": None, "mock": True, "model": self.model}
        payload = {
            "display_name": display_name[:64],
            "model": self.model,
            # 生成即公开：Marble 网页预览链接默认可打开（产品内渲染不依赖它，
            # 但现场演示/协作查看方便；不开放 id 枚举访问）
            "permission": {"public": True, "allow_id_access": False,
                           "allowed_readers": [], "allowed_writers": []},
            "world_prompt": {"type": "text", "text_prompt": prompt},
        }
        data = self._request("POST", "/worlds:generate", json=payload)
        self._record("generate", prompt, f"operation_id={data.get('operation_id')}",
                     started, mock=False)
        return {"operation_id": data.get("operation_id"), "mock": False,
                "model": self.model}

    def get_operation(self, operation_id: str) -> dict:
        """轮询操作状态；mock 模式确定性地返回 done 且无资产（pending→none）。"""
        started = time.monotonic()
        if not self.configured:
            self._record("poll", operation_id, "mock：done 且无资产", started, mock=True)
            return {"operation_id": operation_id, "done": True, "mock": True,
                    "response": {"assets": {}}}
        data = self._request("GET", f"/operations/{operation_id}")
        self._record("poll", operation_id, f"done={data.get('done')}", started,
                     mock=False)
        return data

    def download_asset(self, url: str) -> bytes:
        """下载资产字节（CDN 签名 URL，无需鉴权头）；5xx/连接错误按次重试。"""
        started = time.monotonic()
        last_exc: Exception | None = None
        for attempt in range(self.max_retries):
            if attempt:
                time.sleep(min(2.0 * attempt, 5.0))
            try:
                with httpx.Client(timeout=max(self.timeout, 300.0),
                                  transport=self._transport,
                                  follow_redirects=True) as client:
                    resp = client.get(url)
                    resp.raise_for_status()
                    data = resp.content
                self._record("download", url[-48:], f"{len(data)} bytes", started,
                             mock=False)
                return data
            except Exception as exc:  # 连接重置/超时/5xx 都允许重试
                last_exc = exc
                if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code < 500:
                    break  # 4xx 不重试
        raise WorldGenError(f"资产下载失败：{type(last_exc).__name__}") from last_exc

    # ---------- 内部 ----------

    def _request(self, method: str, path: str, json: dict | None = None) -> dict:
        """带 5xx 重试的 API 请求；4xx/耗尽重试抛 WorldGenError（不含 key）。"""
        url = f"{self.config['api_base'].rstrip('/')}{path}"
        headers = {"WLT-Api-Key": self.config["api_key"]}
        last_exc: Exception | None = None
        for attempt in range(self.max_retries):
            if attempt:
                time.sleep(min(1.5 * attempt, 4.0))
            try:
                with httpx.Client(timeout=self.timeout,
                                  transport=self._transport) as client:
                    resp = client.request(method, url, headers=headers, json=json)
                if resp.status_code >= 500:
                    last_exc = WorldGenError(f"Marble API {resp.status_code}")
                    continue
                if resp.status_code >= 400:
                    raise WorldGenError(f"Marble API {resp.status_code}")
                return resp.json()
            except httpx.HTTPError as exc:
                last_exc = exc
        raise WorldGenError(
            f"Marble API 调用失败：{type(last_exc).__name__}") from last_exc

    def _record(self, action: str, input_value: str, output_summary: str,
                started: float, *, mock: bool) -> WorldGenCallRecord:
        record = WorldGenCallRecord(
            provider=self.name,
            model=self.model,
            action=action,
            input_summary=str(input_value)[:200],
            output_summary=str(output_summary)[:200],
            latency_ms=(time.monotonic() - started) * 1000,
            mock=mock,
            created_at=time.time(),
        )
        self.call_log.append(record)
        return record


# ---------- provider 单例（仿 app.agents.llm.base 注册表，测试可重置/注入） ----------

_provider: MarbleWorldGen | None = None
_provider_lock = threading.Lock()


def get_worldgen_provider() -> MarbleWorldGen:
    global _provider
    with _provider_lock:
        if _provider is None:
            _provider = MarbleWorldGen()
        return _provider


def reset_worldgen_provider(provider: MarbleWorldGen | None = None) -> None:
    """重置/注入 provider 单例（测试隔离用）。"""
    global _provider
    with _provider_lock:
        _provider = provider


# ---------- 场景 prompt 组装（P-8：只发视觉描述，禁人名/关系事实） ----------

def _clamp01(value, default: float = 0.5) -> float:
    try:
        return min(1.0, max(0.0, float(value)))
    except (TypeError, ValueError):
        return default


def _openness_word(value: float) -> str:
    if value >= 0.72:
        return "wide open"
    if value >= 0.45:
        return "gently open"
    return "intimate enclosed"


def _warmth_word(value: float) -> str:
    if value >= 0.66:
        return "warm golden-hour glow"
    if value >= 0.4:
        return "soft diffused daylight"
    return "cool quiet dusk light"


def _motion_word(value: float) -> str:
    if value >= 0.6:
        return "visible breeze and drifting particles"
    if value >= 0.35:
        return "a faint sense of gentle motion"
    return "a still, held-breath calm"


def build_world_prompt(field: dict, *, forbidden_names: list[str] | None = None) -> str:
    """从 echo-field.v1 的艺术层输出组装 Marble 场景 prompt（纯视觉描述）。

    只取 scene.metaphor / parameters（weather、调色板、openness/warmth/motion），
    不取 title/summary/entities（可能含人名、地名、关系事实）。
    forbidden_names 命中即抛 ValueError 拒发（纵深防御，正常路径不应命中）。
    """
    scene = field.get("scene") or {}
    params = scene.get("parameters") or {}
    metaphor = str(scene.get("metaphor") or "").strip() or "一座安静的微型花园"
    weather = str(params.get("weather") or "").strip() or "柔和的光线"
    colors = [
        str(params.get(key) or "").strip().lower()
        for key in ("sky", "horizon", "ground", "accent", "fog")
    ]
    colors = [value for value in colors if value.startswith("#")]
    openness = _openness_word(_clamp01(params.get("openness")))
    warmth = _warmth_word(_clamp01(params.get("warmth")))
    motion = _motion_word(_clamp01(params.get("motion")))
    parts = [
        f"A walkable 3D world inspired by this spatial metaphor: {metaphor}.",
        f"Atmosphere: {weather}; a {openness} space with {warmth} and {motion}.",
    ]
    if colors:
        parts.append(f"Color palette anchored on: {', '.join(colors)}.")
    parts.append(
        "Layout: a small central clearing connected by winding paths, with three "
        "to four quiet landmark spots (an entrance arch, a memory nook, a woven "
        "thread trellis, a round echo well), walkable ground throughout."
    )
    parts.append(_WORLD_STYLE_SUFFIX)
    prompt = " ".join(parts)
    for name in forbidden_names or []:
        if name and name in prompt:
            raise ValueError(f"世界生成 prompt 命中禁名，拒发：{name!r}")
    return prompt


def world_prompt_hash(prompt: str) -> str:
    """prompt 指纹：判断已生成世界是否仍对应当前艺术层输出。"""
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:16]


# ---------- 场域世界生成编排（一人一次守卫 + 后台轮询落库） ----------

_busy: dict[str, str] = {}  # person_id -> operation_id
_busy_lock = threading.Lock()
_field_lock = threading.Lock()  # world 块读-改-写串行化


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_world_block(field: dict) -> dict:
    """读取场域的 world 块；缺省/非法一律视为 none（向后兼容旧缓存）。"""
    world = field.get("world")
    if isinstance(world, dict) and world.get("status") in WORLD_STATUSES:
        return world
    return {"status": "none"}


def _write_inference_atomic(store, person_id: str, name: str, payload: dict) -> None:
    """原子写推断文件（tmp + rename）：后台轮询线程与 GET 并发时不会读到半写文件。"""
    target = store.inferences_dir / person_id / f"{name}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_name(f"{target.name}.{os.getpid()}.{threading.get_ident()}.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, target)


def _persist_world_block(store, person_id: str, block: dict) -> dict:
    """把 world 块写回场域推断（可重算层）；场域不存在时跳过不报错。"""
    with _field_lock:
        inferences = store.read_inferences(person_id)
        field = inferences.get(FIELD_INFERENCE_NAME)
        if not isinstance(field, dict):
            return block
        field["world"] = block
        _write_inference_atomic(store, person_id, FIELD_INFERENCE_NAME, field)
    return block


def _forbidden_names(store, person_id: str, relations_md: str) -> list[str]:
    """材料外人物姓名清单（与 generator._try_llm_overlay 同口径）。"""
    return [
        summary["name"] for summary in store.list_packages()
        if summary.get("name") and summary["person_id"] != person_id
        and summary["name"] not in relations_md
    ]


def request_field_world(store, person_id: str, *, regenerate: bool = False,
                        provider: MarbleWorldGen | None = None,
                        background: bool = True) -> tuple[dict, int]:
    """受理场域世界生成，返回 (world 块, HTTP 状态码)。

    - 已 ready 且 prompt 指纹未变、未要求重算 → 200 返回现状；
    - 已 queued / 有进行中生成 → 抛 FieldWorldBusyError（409）；
    - provider 未配置（mock）→ 确定性走 queued→none，同步完成，返回 202；
    - 正常路径 → 落 queued 块，后台线程轮询落库，返回 202。
    """
    package = store.load_package(person_id)  # PackageNotFound → API 层 404
    field = ensure_field(store, person_id)
    provider = provider or get_worldgen_provider()
    relations_path = store.ensure_person_dir(person_id) / "relations.md"
    relations_md = relations_path.read_text(encoding="utf-8")
    prompt = build_world_prompt(
        field, forbidden_names=_forbidden_names(store, person_id, relations_md))
    prompt_hash = world_prompt_hash(prompt)

    world = get_world_block(field)
    if (world.get("status") == "ready" and not regenerate
            and world.get("source_prompt_hash") == prompt_hash):
        return world, 200
    with _busy_lock:
        busy = person_id in _busy
    if world.get("status") == "queued":
        if busy:
            raise FieldWorldBusyError(f"场域世界正在生成中：{person_id}")
        # 进程重启后留下的 queued 块：poller 已丢失，若 operation_id 还在
        # 且 provider 可用则重新挂轮询（复用同一操作，不重复计费）。
        operation_id = world.get("operation_id")
        if operation_id and provider.configured:
            with _busy_lock:
                _busy[person_id] = operation_id
            _start_poller(store, person_id, provider, operation_id,
                          world.get("source_prompt_hash") or prompt_hash,
                          background=background)
            return world, 202
        raise FieldWorldBusyError(f"场域世界正在生成中：{person_id}")
    if busy:
        raise FieldWorldBusyError(f"场域世界正在生成中：{person_id}")

    operation = provider.generate_world(prompt, display_name=f"echo-field-{person_id}")
    queued = {
        "status": "queued",
        "operation_id": operation.get("operation_id"),
        "model": operation.get("model"),
        "source_prompt_hash": prompt_hash,
        "queued_at": _utcnow(),
    }
    _persist_world_block(store, person_id, queued)
    if operation.get("mock") or not operation.get("operation_id"):
        # mock/未配置：确定性 pending→none，同步完成，绝不悬挂
        none_block = {
            "status": "none",
            "model": operation.get("model"),
            "source_prompt_hash": prompt_hash,
            "reason": "未配置 WORLDLABS_API_KEY，世界生成走 mock 降级",
        }
        _persist_world_block(store, person_id, none_block)
        return none_block, 202

    with _busy_lock:
        _busy[person_id] = operation["operation_id"]
    _start_poller(store, person_id, provider, operation["operation_id"],
                  prompt_hash, background=background)
    return queued, 202


def _start_poller(store, person_id: str, provider: MarbleWorldGen,
                  operation_id: str, prompt_hash: str, *,
                  background: bool) -> None:
    """挂起轮询：background=True 走守护线程，False 同步执行（测试用）。"""
    if background:
        thread = threading.Thread(
            target=_poll_and_persist,
            args=(store, person_id, provider, operation_id, prompt_hash),
            name=f"field-world-{person_id}",
            daemon=True,
        )
        thread.start()
    else:
        _poll_and_persist(store, person_id, provider, operation_id, prompt_hash)


def _poll_and_persist(store, person_id: str, provider: MarbleWorldGen,
                      operation_id: str, prompt_hash: str) -> None:
    """后台轮询 Marble 操作；完成时下载资产写入派生存储并翻转 world 状态。"""
    interval = float(provider.config.get("poll_interval_seconds", 15.0))
    timeout = float(provider.config.get("poll_timeout_seconds", 1200.0))
    deadline = time.monotonic() + timeout
    try:
        while time.monotonic() < deadline:
            try:
                operation = provider.get_operation(operation_id)
            except WorldGenError as exc:
                logger.warning("场域世界轮询失败（%s）：%s", person_id, exc)
                time.sleep(interval)
                continue
            if not operation.get("done"):
                time.sleep(interval)
                continue
            if operation.get("error"):
                _finish(store, person_id, {
                    "status": "failed", "operation_id": operation_id,
                    "source_prompt_hash": prompt_hash,
                    "reason": "Marble 生成失败",
                })
                return
            assets = (operation.get("response") or {}).get("assets") or {}
            _finish(store, person_id,
                    _persist_assets(store, person_id, operation, assets,
                                    prompt_hash, provider))
            return
        _finish(store, person_id, {
            "status": "failed", "operation_id": operation_id,
            "source_prompt_hash": prompt_hash,
            "reason": f"轮询超时（{int(timeout)}s）",
        })
    except Exception:
        logger.exception("场域世界生成编排异常：%s", person_id)
        _finish(store, person_id, {
            "status": "failed", "operation_id": operation_id,
            "source_prompt_hash": prompt_hash,
            "reason": "生成编排异常",
        })
    finally:
        with _busy_lock:
            _busy.pop(person_id, None)


def _finish(store, person_id: str, block: dict) -> None:
    block.setdefault("finished_at", _utcnow())
    _persist_world_block(store, person_id, block)


def _persist_assets(store, person_id: str, operation: dict, assets: dict,
                    prompt_hash: str, provider: MarbleWorldGen) -> dict:
    """下载 spz/collider/pano 写入 derived/ 派生存储，组装 ready world 块。"""
    response = operation.get("response") or {}
    world_id = response.get("world_id") or response.get("id") or operation.get(
        "operation_id")
    generation_id = str(world_id or operation.get("operation_id") or "unknown")
    namespace = f"{WORLD_ASSET_NAMESPACE}-{person_id}"
    splats = assets.get("splats") or {}
    spz_urls = splats.get("spz_urls") or {}
    semantics = splats.get("semantics_metadata") or {}

    refs: dict[str, str] = {}
    for quality in ("100k", "500k"):
        url = spz_urls.get(quality)
        if not url:
            continue
        refs[quality] = store.write_derived_asset(
            namespace, generation_id, f"world_{quality}.spz",
            provider.download_asset(url))
    collider_url = (assets.get("mesh") or {}).get("collider_mesh_url")
    collider_ref = None
    if collider_url:
        collider_ref = store.write_derived_asset(
            namespace, generation_id, "collider.glb",
            provider.download_asset(collider_url))
    pano_url = (assets.get("imagery") or {}).get("pano_url")
    pano_ref = None
    if pano_url:
        pano_ref = store.write_derived_asset(
            namespace, generation_id, "pano.png", provider.download_asset(pano_url))

    if not refs or not collider_ref:
        return {
            "status": "failed", "operation_id": operation.get("operation_id"),
            "world_id": world_id, "source_prompt_hash": prompt_hash,
            "reason": "生成结果缺少 splat 或 collider 资产",
        }
    return {
        "status": "ready",
        "operation_id": operation.get("operation_id"),
        "world_id": world_id,
        "model": response.get("model") or provider.model,
        "spz": refs,
        "collider_ref": collider_ref,
        "pano_ref": pano_ref,
        "metric_scale_factor": semantics.get("metric_scale_factor"),
        "ground_plane_offset": semantics.get("ground_plane_offset"),
        "caption": assets.get("caption"),
        "generated_at": _utcnow(),
        "source_prompt_hash": prompt_hash,
    }
