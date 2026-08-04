"""关系场域的 LLM 艺术化生成（FR-2.11 / TBD-F3 首次实现）。

把一段关系的授权材料（姓名、第一印象推断、相遇推断、关系注记、共同地点）
交给 chat provider（DeepSeek），让它以"诗意空间设计师"的角色把关系气质
映射为 echo-field.v1 的场景参数与文案；输出经宽容解析、数值钳制与字符串
截断后，叠加到确定性规则模板产出的骨架上（位置/交互/结构永远由骨架保证）。
任何一步失败都返回 None，由调用方回退规则模板，场域接口契约保持稳定。

场域仍是推断层产物（P-3）：只消费授权 DTO 与推断指针，绝不触碰事实层。
"""

from __future__ import annotations

import colorsys
import json
import logging
import random
import re
import time
import uuid

from app.agents.llm import base as llm_base
from app.agents.utils.jsonish import extract_json

from .generator import _group_impressions, _inference_values, _relation_lines

logger = logging.getLogger(__name__)

_COLOR_KEYS = ("sky", "horizon", "ground", "accent", "fog")
_FLOAT_KEYS = ("openness", "warmth", "motion")
_ENTITY_TYPES = ("threshold", "memory", "thread", "echo")
_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")

# 文案长度上限：宁可截断也不让前端拿到超长字符串
_TEXT_CAPS = {"title": 40, "metaphor": 60, "summary": 220, "weather": 40, "entity": 80}

# regenerate 时注入的视角提示，让重掷真的产生不同诠释（配合随机 nonce）
_VARIATION_LENSES = (
    "清晨光线", "黄昏", "雨后", "起风的午后", "雪夜", "正午树荫", "灯火初上", "潮汐",
)

_SYSTEM_PROMPT = """你是一位诗意的空间设计师，为"关系场域"设计隐喻空间：把两个人相处留下的材料，转译成一个可以在 3D 里走进去的空间气质。

要求：
- 中文，克制不浮夸，具体而不抽象；每一句都要能指回给定材料，禁止编造材料中没有的事实，但允许诗意的隐喻转化。
- 严禁提及材料之外的任何人名、地名或事件；对方面名只可使用材料中的 name，行文中多用"你/你们/TA"。
- 调色板和谐、低饱和、属于同一个光照时刻：sky/horizon/ground/fog 互相协调，accent 是唯一可以稍亮的点缀色；颜色一律用 #RRGGBB。
- openness（空间开阔感）、warmth（相处温度）、motion（流动/生长感）取 0~1 小数，要反映材料气质而非随手给值。
- weather：一句天气或光线短语（≤16 字），须与调色板的光照时刻一致，每次都要为这段关系单独写。
- metaphor：一句空间隐喻（≤28 字），只描述空间本身，不出现"关系"二字。
- summary：两到三句（≤110 字），说明为什么这段关系是这样的空间，必须引用材料里的具体细节（地点、共同课题、第一印象）。
- entities 四句细节（每句 ≤40 字）：
  threshold = 入口：这段关系因何开启；
  memory = 第一次相遇的场景感，须落到材料中的地点或时刻；
  thread = 共同课题在这个空间里如何延续；
  echo = 留给这段关系未来的回声。
- 只输出 JSON，不要任何额外文字：
{"title": "...", "metaphor": "...", "summary": "...", "parameters": {"sky": "#......", "horizon": "#......", "ground": "#......", "accent": "#......", "fog": "#......", "openness": 0.0, "warmth": 0.0, "motion": 0.0, "weather": "..."}, "entities": {"threshold": "...", "memory": "...", "thread": "...", "echo": "..."}}"""


def new_variation() -> str:
    """生成一次重掷的变化种子：随机氛围视角 + nonce，注入 prompt 让输出真的变化。"""
    return f"{random.choice(_VARIATION_LENSES)}·{uuid.uuid4().hex[:6]}"


def build_field_materials(package: dict, *, inferences: dict | None = None,
                          relations_md: str = "") -> dict:
    """从授权 Package/推断/关系注记提取 prompt 材料（不含任何原始媒体字节）。"""
    person_id = package["person_id"]
    encounters = []
    for encounter in (package.get("encounters") or [])[:4]:
        if not isinstance(encounter, dict):
            continue
        entry = {
            key: str(encounter.get(key)).strip()
            for key in ("place", "time")
            if str(encounter.get(key) or "").strip()
        }
        if entry:
            encounters.append(entry)
    return {
        "name": package.get("identity", {}).get("name") or person_id,
        "first_impressions": _group_impressions(inferences or {}),
        "shared_threads": _inference_values(package)[:5],
        "encounters": encounters,
        "relations": _relation_lines(relations_md)[:6],
    }


def _proper_nouns(materials: dict) -> list[str]:
    """汇总材料中允许出现的专有名词（人名/地点/时刻/关系人名），供白名单约束。"""
    nouns: list[str] = []

    def _add(value) -> None:
        text = str(value or "").strip()
        if text and text not in nouns:
            nouns.append(text)

    _add(materials.get("name"))
    for encounter in materials.get("encounters") or []:
        _add(encounter.get("place"))
        _add(encounter.get("time"))
    for line in materials.get("relations") or []:
        _add(line.split("|")[0])  # relations.md 首列是关系人名
    return nouns


def build_field_prompt(package: dict, *, inferences: dict | None = None,
                       relations_md: str = "", variation: str = "") -> list[dict]:
    """组装 chat messages：system 设计规则 + user 关系材料（JSON）+ 专有名词白名单。"""
    materials = build_field_materials(
        package, inferences=inferences, relations_md=relations_md)
    whitelist = "；".join(_proper_nouns(materials)) or "（无）"
    note = (f"\n\n允许出现的专有名词白名单：{whitelist}。"
            "除此之外严禁出现任何具体人名、地名或事件名；指代对方用\"TA\"或\"你\"。")
    if variation:
        note += ("\n\n这是一次重新生成。请换一个与惯常不同的诠释角度，"
                 f"可从「{variation}」的氛围出发，但仍须忠于材料"
                 "（「」内只是氛围提示与随机编号，严禁把编号写进任何输出文本）。")
    return [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": (
            "这段关系的授权材料（JSON）："
            + json.dumps(materials, ensure_ascii=False) + note
        )},
    ]


def _tasteful_color(value: str, *, accent: bool) -> bool:
    """调色板品味门槛：天空/地平/地面/雾须低饱和，点缀色可亮但不许荧光。"""
    try:
        rgb = tuple(int(value[i:i + 2], 16) / 255 for i in (1, 3, 5))
    except ValueError:
        return False
    _, lightness, saturation = colorsys.rgb_to_hls(*rgb)
    if accent:
        return saturation <= 0.9 and 0.25 <= lightness <= 0.8
    return saturation <= 0.7 and 0.12 <= lightness <= 0.92


def _clean_text(value, cap: int) -> str | None:
    """字符串消毒：折叠空白、去空、截断到上限；非字符串/空串返回 None。"""
    if not isinstance(value, str):
        return None
    text = " ".join(value.split())
    return text[:cap] if text else None


def apply_llm_scene(base_field: dict, data) -> dict | None:
    """把解析后的 LLM JSON 叠加到确定性骨架上（原地修改 base_field 并返回）。

    parameters 必须是 dict 且至少有一个可用值，否则视为结构不符返回 None；
    单个非法字段静默保留骨架原值（宽容合并，而不是整单判废）。
    """
    if not isinstance(data, dict):
        return None
    params = data.get("parameters")
    if not isinstance(params, dict):
        return None
    scene = base_field["scene"]
    target = scene["parameters"]
    accepted = False
    for key in _COLOR_KEYS:
        value = params.get(key)
        if (isinstance(value, str) and _HEX_COLOR.match(value.strip())
                and _tasteful_color(value.strip(), accent=key == "accent")):
            target[key] = value.strip().lower()
            accepted = True
    for key in _FLOAT_KEYS:
        try:
            number = float(params.get(key))
        except (TypeError, ValueError):
            continue
        target[key] = round(min(1.0, max(0.0, number)), 2)
        accepted = True
    weather = _clean_text(params.get("weather"), _TEXT_CAPS["weather"])
    if weather:
        target["weather"] = weather
        accepted = True
    if not accepted:
        return None
    for key in ("title", "metaphor", "summary"):
        text = _clean_text(data.get(key), _TEXT_CAPS[key])
        if text:
            scene[key] = text
    entities = data.get("entities")
    if isinstance(entities, dict):
        by_type = {
            entity.get("type"): entity
            for entity in scene["entities"]
            if isinstance(entity, dict)
        }
        for entity_type in _ENTITY_TYPES:
            text = _clean_text(entities.get(entity_type), _TEXT_CAPS["entity"])
            if text and entity_type in by_type:
                by_type[entity_type]["detail"] = text
    return base_field


def _mentions_forbidden_name(data: dict, forbidden_names: list[str]) -> str | None:
    """事后校验：LLM 文案提及材料之外的人物姓名（幻觉）时返回该姓名。"""
    if not forbidden_names:
        return None
    texts: list[str] = []
    for key in ("title", "metaphor", "summary"):
        value = data.get(key)
        if isinstance(value, str):
            texts.append(value)
    params = data.get("parameters")
    if isinstance(params, dict) and isinstance(params.get("weather"), str):
        texts.append(params["weather"])
    entities = data.get("entities")
    if isinstance(entities, dict):
        texts.extend(v for v in entities.values() if isinstance(v, str))
    for name in forbidden_names:
        if any(name in text for text in texts):
            return name
    return None


def try_llm_field(base_field: dict, package: dict, *, inferences: dict | None = None,
                  relations_md: str = "", variation: str = "", provider=None,
                  forbidden_names: list[str] | None = None) -> dict | None:
    """LLM 路径：成功返回叠加后的场域（model 记为真实模型名），失败返回 None。

    mock 响应（provider 未配置/调用失败降级）直接返回 None，走规则兜底；
    forbidden_names 为材料之外的人物姓名（其他 Package 的名字），文案提及
    即视为幻觉整单判废——判废发生在叠加之前，骨架不会被污染。
    """
    provider = provider or llm_base.get_provider("chat")
    messages = build_field_prompt(
        package, inferences=inferences, relations_md=relations_md, variation=variation)
    attempts = 3 if getattr(provider, "config", {}).get("configured") else 1
    response = None
    for attempt in range(attempts):  # 偶发 5xx 允许重试；未配置直接走兜底
        if attempt:
            time.sleep(1.0)  # 避开网关瞬时抖动
        response = provider.chat(messages, response_format={"type": "json_object"})
        if not response.mock:
            break
    if response is None or response.mock:
        return None
    data = extract_json(response.text)
    if data is None:
        logger.warning("关系场域 LLM 输出无法解析，回退规则模板：%.80s", response.text)
        return None
    leaked = _mentions_forbidden_name(data, forbidden_names or [])
    if leaked:
        logger.warning("关系场域 LLM 输出提及材料外人物「%s」，回退规则模板", leaked)
        return None
    field = apply_llm_scene(base_field, data)
    if field is None:
        logger.warning("关系场域 LLM 输出结构不符，回退规则模板：%.80s", response.text)
        return None
    field["model"] = response.model
    return field
