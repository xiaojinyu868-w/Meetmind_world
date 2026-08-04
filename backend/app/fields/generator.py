"""关系场域生成器（FR-2.11 / ROADMAP 2.G.1）。

场域是推断层的视觉化产物，不改写事实层。生成路径为 LLM 优先、规则兜底：
chat provider 可用时由 ``app.fields.llm`` 把关系材料做诗意空间映射并叠加到
本模块的确定性骨架上；provider 未配置或输出不可用时，退回本模块的确定性
艺术模板（model="relationship-field-rules.v1"）。两条路径消费的都是已授权
Package、第一印象推断与关系记录，前端消费的 echo-field.v1 契约保持不变。
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

FIELD_SCHEMA = "echo-field.v1"
FIELD_INFERENCE_NAME = "relationship-field.v1"

_PALETTES = (
    {
        "sky": "#8fc9c3", "horizon": "#d5e5d4", "ground": "#8fa66d",
        "accent": "#f0bd67", "fog": "#dce8dc", "weather": "微风穿过草坡",
        "metaphor": "一座把零散念头编成路径的风丘",
    },
    {
        "sky": "#8db4c7", "horizon": "#ead6b7", "ground": "#9a8266",
        "accent": "#d9775d", "fog": "#e6ddcf", "weather": "远处有缓慢移动的云",
        "metaphor": "一条在黄昏里反复汇合的旧河道",
    },
    {
        "sky": "#769394", "horizon": "#c7c5aa", "ground": "#6f7f6a",
        "accent": "#d8a85d", "fog": "#cbd2c6", "weather": "灯火刚刚亮起",
        "metaphor": "一间向旷野敞开的灯塔工坊",
    },
    {
        "sky": "#9db4bd", "horizon": "#ddd0c4", "ground": "#7f8871",
        "accent": "#b76758", "fog": "#d9d8d0", "weather": "薄雾正在退到边界",
        "metaphor": "一座允许分歧回声停留的石庭",
    },
)


def _stable_fraction(value: str, offset: int = 0) -> float:
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return int.from_bytes(digest[offset:offset + 2], "big") / 65535


def _source_facts(package: dict) -> list[str]:
    refs: list[str] = []
    for encounter in package.get("encounters", []):
        facts = encounter.get("facts") or {}
        for value in [facts.get("transcript"), *(facts.get("media") or []),
                      *(facts.get("photos") or [])]:
            if isinstance(value, str) and value and value not in refs:
                refs.append(value)
        for inference in encounter.get("inferences", []):
            for value in inference.get("source_facts") or []:
                if isinstance(value, str) and value and value not in refs:
                    refs.append(value)
    return refs


def _inference_values(package: dict) -> list[str]:
    values: list[str] = []
    for encounter in package.get("encounters", []):
        for inference in encounter.get("inferences", []):
            value = str(inference.get("value") or "").strip()
            if value and value not in values:
                values.append(value)
    return values


def _group_impressions(inferences: dict) -> list[str]:
    values: list[str] = []
    for payload in inferences.values():
        impression = payload.get("impression") if isinstance(payload, dict) else None
        value = str((impression or {}).get("value") or "").strip()
        if len(value) >= 2 and value not in values:
            values.append(value)
    return values


def _relation_lines(relations_md: str) -> list[str]:
    return [
        line.strip() for line in relations_md.splitlines()
        if "|" in line and not line.lstrip().startswith("格式：")
    ]


def generate_field(package: dict, *, inferences: dict | None = None,
                   relations_md: str = "") -> dict:
    """从已授权 DTO 生成可进入的关系场域描述，不读取原始媒体字节。"""
    person_id = package["person_id"]
    name = package.get("identity", {}).get("name") or person_id
    encounters = package.get("encounters") or []
    first = encounters[0] if encounters else {}
    inference_values = _inference_values(package)
    impressions = _group_impressions(inferences or {})
    relations = _relation_lines(relations_md)
    source_refs = _source_facts(package)
    if not source_refs:
        source_refs = [f"people/{person_id}/relations.md"]

    seed_text = "|".join([person_id, *inference_values, *impressions, *relations])
    palette = _PALETTES[int(_stable_fraction(seed_text) * len(_PALETTES)) % len(_PALETTES)]
    openness = round(0.46 + _stable_fraction(seed_text, 2) * 0.38, 2)
    warmth = round(0.48 + _stable_fraction(seed_text, 4) * 0.38, 2)

    shared_thread = (inference_values[0].replace("、", " · ").replace(",", " · ")
                     if inference_values else "仍在形成的共同课题")
    first_place = first.get("place") or first.get("time") or "第一次留下记录的地方"
    relation_hint = impressions[0] if impressions else (
        relations[0].split("|")[1].strip() if relations else "一段仍在生长的关系"
    )
    summary = (
        f"这里不是 {name} 的肖像，而是你们相处时留下的空间感："
        f"{relation_hint}。沿着场域里的物件，可以回到 {first_place}，也可以继续展开 {shared_thread}。"
    )

    return {
        "schema": FIELD_SCHEMA,
        "status": "ready",
        "person_id": person_id,
        "generated": True,
        "regenerable": True,
        "generated_from": source_refs,
        "model": "relationship-field-rules.v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "relation": {
            "with": name,
            "summary": relation_hint,
            "shared_threads": inference_values[:3],
            "first_impressions": impressions[:4],
        },
        "scene": {
            "title": f"你与{name} · 回声场域",
            "summary": summary,
            "metaphor": palette["metaphor"],
            "parameters": {
                "sky": palette["sky"],
                "horizon": palette["horizon"],
                "ground": palette["ground"],
                "accent": palette["accent"],
                "fog": palette["fog"],
                "openness": openness,
                "warmth": warmth,
                "motion": round(0.25 + _stable_fraction(seed_text, 6) * 0.5, 2),
                "weather": palette["weather"],
            },
            "spawn": {"x": 0.0, "z": 6.2, "yaw": 3.1416},
            "companion": {"person_id": person_id, "x": 0.0, "z": -1.1, "yaw": 0.0},
            "entities": [
                {
                    "id": "threshold", "type": "threshold", "label": "关系入口",
                    "detail": palette["metaphor"], "position": {"x": 0.0, "z": 3.8},
                    "interaction": {"label": "听听这个场域为何出现", "event_type": "field-entered"},
                },
                {
                    "id": "first-encounter", "type": "memory", "label": "第一次相遇",
                    "detail": first_place, "position": {"x": -2.5, "z": 0.4},
                    "interaction": {"label": "调取这段共同记忆", "event_type": "memory-recalled"},
                },
                {
                    "id": "shared-thread", "type": "thread", "label": "共同课题",
                    "detail": shared_thread, "position": {"x": 2.4, "z": -1.6},
                    "interaction": {"label": "继续这条共同线索", "event_type": "thread-opened"},
                },
                {
                    "id": "echo-well", "type": "echo", "label": "回声井",
                    "detail": relation_hint, "position": {"x": -1.1, "z": -3.6},
                    "interaction": {"label": "留下此刻的回声", "event_type": "echo-left"},
                },
            ],
        },
    }


def _normalize_cached_field(field: dict, person_id: str) -> dict:
    """补齐早期 echo-field.v1 缓存缺少的运行时定位信息。"""
    normalized = {**field, "person_id": person_id}
    scene = field.get("scene")
    if isinstance(scene, dict):
        normalized_scene = dict(scene)
        companion = scene.get("companion")
        if not isinstance(companion, dict):
            normalized_scene["companion"] = {
                "person_id": person_id, "x": 0.0, "z": -1.1, "yaw": 0.0,
            }
        elif companion.get("person_id") != person_id:
            normalized_scene["companion"] = {**companion, "person_id": person_id}
        normalized["scene"] = normalized_scene
    return normalized


def _runtime_ready(field: dict) -> bool:
    entities = field.get("scene", {}).get("entities")
    if not isinstance(entities, list):
        return False
    by_type = {
        entity.get("type"): entity
        for entity in entities
        if isinstance(entity, dict)
    }
    required = {"threshold", "memory", "thread", "echo"}
    return required.issubset(by_type) and all(
        isinstance(by_type[kind].get("interaction"), dict) for kind in required
    )


def ensure_field(store, person_id: str, *, regenerate: bool = False) -> dict:
    """读取缓存场域；不存在或明确重算时重新生成并写入推断层。"""
    package = store.load_package(person_id)
    existing = store.read_inferences(person_id).get(FIELD_INFERENCE_NAME)
    if (not regenerate and isinstance(existing, dict)
            and existing.get("schema") == FIELD_SCHEMA and _runtime_ready(existing)):
        normalized = _normalize_cached_field(existing, person_id)
        if normalized != existing:
            store.write_inference(person_id, FIELD_INFERENCE_NAME, normalized)
        return normalized
    legacy = package.get("field")
    if (not regenerate and isinstance(legacy, dict)
            and legacy.get("schema") == FIELD_SCHEMA and _runtime_ready(legacy)):
        normalized = _normalize_cached_field(legacy, person_id)
        store.write_inference(person_id, FIELD_INFERENCE_NAME, normalized)
        return normalized
    relations_path = store.ensure_person_dir(person_id) / "relations.md"
    relations_md = relations_path.read_text(encoding="utf-8")
    inferences = store.read_inferences(person_id)
    field = generate_field(package, inferences=inferences, relations_md=relations_md)
    field = _try_llm_overlay(
        store, field, package, inferences, relations_md, regenerate=regenerate)
    store.write_inference(person_id, FIELD_INFERENCE_NAME, field)
    return field


def _try_llm_overlay(store, field: dict, package: dict, inferences: dict,
                     relations_md: str, *, regenerate: bool) -> dict:
    """LLM 优先：可用时把确定性骨架升级为诗意映射；任何失败都原样返回骨架。"""
    from app.fields.llm import new_variation, try_llm_field

    try:
        # 其他 Package 的姓名是"材料外人物"：出现在文案里即幻觉（relations.md
        # 里被本人记录过的名字除外，那是合法材料）。
        forbidden = [
            summary["name"] for summary in store.list_packages()
            if summary.get("name") and summary["person_id"] != package["person_id"]
            and summary["name"] not in relations_md
        ]
        llm_field = try_llm_field(
            field,
            package,
            inferences=inferences,
            relations_md=relations_md,
            variation=new_variation() if regenerate else "",
            forbidden_names=forbidden,
        )
    except Exception:  # LLM 路径绝不允许拖垮场域接口
        logger.exception("关系场域 LLM 生成异常，回退规则模板：%s", package.get("person_id"))
        return field
    return llm_field if llm_field is not None else field
