"""体素贴图生成：照片 → CharacterSpec → i2i 像素瓦片 → 固定 UV atlas → 表情（FR-1.5/P-6）。

目的：ARCHITECTURE.md §5a 人物生成线的第一段。主路径（2026-08-04 决策）为
      i2i 图生图：真实人脸裁剪直接作参考图，由 image 角色（commonstack
      gpt-image-2）按"视角 + 像素风锁定 + 纯色背景"提示词直出头部五面
      16x16 瓦片，面部辨识度来自像素本身；输出经背景检测/内容裁剪/BOX 重采样/
      定色量化/色度键控/最近邻填充，保证硬边像素、无半透明渗色。
      CharacterSpec 改由照片像素采样得出（肤色/发色/服装主色），只承担元数据、
      调色板与程序化兜底，不再承担面部辨识度。确定性合成器把瓦片 + spec 色块
      拼进 128x128 固定 UV atlas（布局与 blender/build_photo_character_modes.py
      的 VOXEL_REGIONS 完全一致）；表情 atlas 由程序像素编辑派生（复刻
      blender/build_character_expression_textures.py 的 delta，参数化锚点）。
输入：generate(photos, person_id) —— 人物照片路径列表 + 槽位 id。
输出：TextureSet（spec / 128x128 neutral atlas / 4 张表情 atlas / palette /
      生成溯源）。降级链：i2i 失败 → 文本 t2i（头正面/背面）→ 全程序化 atlas
      （model="mock"），绝不抛异常。
验收：tests/test_voxel_pipeline.py —— i2i 请求构造、背景键控边缘情况、
      缓存键含参考图哈希、降级链、atlas 布局不变量、表情 delta 只触脸部区域。

坐标约定：VOXEL_REGIONS 沿用 Blender 画布坐标（y 向上）；PNG 落盘为 PIL 坐标
（y 向下），经 _to_pil_rect 翻转，与既有 public/textures/characters/voxel/*_atlas.png
逐像素同布局（脸部 = PIL (16,16)-(32,32)）。身体区域纯调色板驱动（可靠性优先），
AI 生成只负责头部五面 16x16 瓦片。
"""

from __future__ import annotations

import hashlib
import io
import json
import time
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw

from app.agents.llm import base as llm_base

SCHEMA_VERSION = "echo-character-spec.v1"
ATLAS_SIZE = 128
EXPRESSIONS = ("neutral", "happy", "surprised", "thinking")
TILE_SIZE = 16
_TILE_COLORS = 16  # 生成瓦片量化色数上限（锁像素风）

# 固定 UV 区域（Blender 画布坐标，x/y/w/h；与 build_photo_character_modes.py 一致）
VOXEL_REGIONS = {
    "head_left": (0, 96, 16, 16),
    "head_front": (16, 96, 16, 16),
    "head_right": (32, 96, 16, 16),
    "head_back": (48, 96, 16, 16),
    "head_top": (16, 112, 16, 16),
    "head_bottom": (32, 112, 16, 16),
    "torso_left": (0, 64, 8, 24),
    "torso_front": (8, 64, 16, 24),
    "torso_right": (24, 64, 8, 24),
    "torso_back": (32, 64, 16, 24),
    "torso_top": (8, 88, 16, 8),
    "torso_bottom": (24, 88, 16, 8),
    "arm_left": (0, 32, 8, 24),
    "arm_front": (8, 32, 8, 24),
    "arm_right": (16, 32, 8, 24),
    "arm_back": (24, 32, 8, 24),
    "arm_top": (8, 56, 8, 8),
    "arm_bottom": (16, 56, 8, 8),
    "leg_left": (32, 32, 8, 24),
    "leg_front": (40, 32, 8, 24),
    "leg_right": (48, 32, 8, 24),
    "leg_back": (56, 32, 8, 24),
    "leg_top": (40, 56, 8, 8),
    "leg_bottom": (48, 56, 8, 8),
}

# 脸部区域（PIL 坐标）：head_front 翻转后 = (16,16)-(32,32)，
# 与 build_character_expression_textures.py 的 VOXEL_FACE_BOX 一致
FACE_BOX_PIL = (16, 16, 32, 32)

DEFAULT_SKIN = "#D59B78"
DEFAULT_HAIR_COLOR = "#2C2A29"
# 服装色按角色兜底（上装/内搭/下装）：vision 只给到 1-2 色时按位补齐，
# 避免错位（旧做法整体拼接会把"上装默认色"补到内搭位）
DEFAULT_TOP = "#5B7A8C"
DEFAULT_INNER = "#E8E2D2"
DEFAULT_PANTS = "#3E4A52"


def outfit_colors(traits: dict) -> tuple[str, str, str, str]:
    """outfitPalette → (上装, 内搭, 下装, accent)，按位兜底。"""
    palette = list(traits.get("outfitPalette") or [])
    top = palette[0] if len(palette) > 0 else DEFAULT_TOP
    inner = palette[1] if len(palette) > 1 else DEFAULT_INNER
    pants = palette[2] if len(palette) > 2 else DEFAULT_PANTS
    accent = palette[3] if len(palette) > 3 else shade(top, 0.22)
    return top, inner, pants, accent

# 敏感属性红线：可见特征之外的身份/健康/民族等一律拒绝（P-6/P-8）
_FORBIDDEN_TRAIT_KEYS = {"ethnicity", "race", "health", "age", "identity",
                         "religion", "gender_identity", "姓名", "身份", "民族", "健康"}
_REQUIRED_TRAITS = ("hair", "hairColor", "glasses", "skinTone",
                    "bodyTemplate", "outfitPalette", "signatureItem")
_BODY_TEMPLATES = ("regular", "tall")


class CharacterSpecError(ValueError):
    """CharacterSpec 校验失败时抛出。"""


def _stable_seed(*parts: str) -> int:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big")


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def rgb_hex(rgb: tuple[int, int, int]) -> str:
    return "#" + "".join(f"{max(0, min(255, round(c))):02X}" for c in rgb)


def shade(hex_color: str, amount: float) -> str:
    """amount>0 向白混合，<0 向黑压暗（与 blender 脚本同名函数一致）。"""
    rgb = hex_rgb(hex_color)
    if amount >= 0:
        mixed = tuple(c + (255 - c) * amount for c in rgb)
    else:
        mixed = tuple(c * (1.0 + amount) for c in rgb)
    return rgb_hex(mixed)


def _is_hex_color(value) -> bool:
    if not isinstance(value, str) or len(value) != 7 or not value.startswith("#"):
        return False
    try:
        hex_rgb(value)
    except ValueError:
        return False
    return True


def mute_garish(hex_color: str, max_saturation: float = 0.72,
                max_value: float = 0.92) -> str:
    """把霓虹色压回像素风调色板（vision 可能把荧光物件当服装色，如 #00FF00）。

    只动服装色：HSV 饱和度/明度封顶，色相保持不变。
    """
    import colorsys

    r, g, b = (c / 255.0 for c in hex_rgb(hex_color))
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    s, v = min(s, max_saturation), min(v, max_value)
    return rgb_hex(tuple(round(c * 255) for c in colorsys.hsv_to_rgb(h, s, v)))


def _clean_outfit_palette(colors: list) -> list:
    """服装色清洗：极端霓虹色（多为物件误检，如荧光靠垫）直接丢弃，其余抑制。"""
    import colorsys

    cleaned = []
    for color in colors:
        r, g, b = (c / 255.0 for c in hex_rgb(color))
        _h, s, v = colorsys.rgb_to_hsv(r, g, b)
        if s > 0.9 and v > 0.9:
            continue  # 纯荧光色不可能是真实服装主色
        cleaned.append(mute_garish(color).upper())
    return cleaned[:4]


# ---------- CharacterSpec：校验 / 归一化 / 兜底 ----------


def validate_character_spec(spec: dict) -> dict:
    """硬校验 echo-character-spec.v1；通过返回原对象，否则抛 CharacterSpecError。"""
    if not isinstance(spec, dict):
        raise CharacterSpecError("CharacterSpec 必须是 object")
    if spec.get("schema") != SCHEMA_VERSION:
        raise CharacterSpecError(f"未知 CharacterSpec schema: {spec.get('schema')}")
    if not isinstance(spec.get("personId"), str) or not spec["personId"]:
        raise CharacterSpecError("CharacterSpec.personId 必须是非空字符串")
    traits = spec.get("visibleTraits")
    if not isinstance(traits, dict):
        raise CharacterSpecError("CharacterSpec.visibleTraits 必须是 object")
    bad_keys = _FORBIDDEN_TRAIT_KEYS & {str(k) for k in traits}
    if bad_keys:
        raise CharacterSpecError(f"visibleTraits 含敏感属性，拒绝入库：{sorted(bad_keys)}")
    for key in _REQUIRED_TRAITS:
        if key not in traits:
            raise CharacterSpecError(f"visibleTraits 缺字段：{key}")
    if not isinstance(traits["hair"], str) or not traits["hair"]:
        raise CharacterSpecError("visibleTraits.hair 必须是非空字符串")
    if not _is_hex_color(traits["hairColor"]):
        raise CharacterSpecError("visibleTraits.hairColor 必须是 #RRGGBB")
    if not isinstance(traits["glasses"], bool):
        raise CharacterSpecError("visibleTraits.glasses 必须是 bool")
    if not _is_hex_color(traits["skinTone"]):
        raise CharacterSpecError("visibleTraits.skinTone 必须是 #RRGGBB")
    if traits["bodyTemplate"] not in _BODY_TEMPLATES:
        raise CharacterSpecError(
            f"visibleTraits.bodyTemplate 必须是 {_BODY_TEMPLATES} 之一")
    palette = traits["outfitPalette"]
    if not isinstance(palette, list) or not 1 <= len(palette) <= 4 \
            or not all(_is_hex_color(c) for c in palette):
        raise CharacterSpecError("visibleTraits.outfitPalette 必须是 1-4 个 #RRGGBB")
    if traits["signatureItem"] is not None and not isinstance(traits["signatureItem"], str):
        raise CharacterSpecError("visibleTraits.signatureItem 必须是字符串或 null")
    confidence = spec.get("confidence", {})
    if not isinstance(confidence, dict):
        raise CharacterSpecError("CharacterSpec.confidence 必须是 object")
    for key, value in confidence.items():
        if not isinstance(value, (int, float)) or not 0.0 <= value <= 1.0:
            raise CharacterSpecError(f"confidence.{key} 必须在 [0,1]：{value!r}")
    design = spec.get("designCompletion", [])
    if not isinstance(design, list) or not all(isinstance(k, str) for k in design):
        raise CharacterSpecError("CharacterSpec.designCompletion 必须是字符串数组")
    unknown = set(design) - set(_REQUIRED_TRAITS)
    if unknown:
        raise CharacterSpecError(f"designCompletion 含未知字段：{sorted(unknown)}")
    return spec


def _design_defaults(person_id: str) -> dict:
    """设计补全默认值：按 person_id 哈希定色，保证可复现且人物间有差异。"""
    seed = _stable_seed("character-spec", person_id)
    tops = ["#5B7A8C", "#715474", "#4A8170", "#8C6A4A", "#66717f", "#7A5B8C"]
    inners = ["#E8E2D2", "#D8E0E8", "#E8CF88", "#DAD5C8"]
    pants = ["#3E4A52", "#46545A", "#465F5B", "#4A4640"]
    return {
        "hair": "short_side_swept",
        "hairColor": DEFAULT_HAIR_COLOR,
        "glasses": False,
        "skinTone": DEFAULT_SKIN,
        "bodyTemplate": "regular",
        "outfitPalette": [tops[seed % len(tops)],
                          inners[(seed >> 3) % len(inners)],
                          pants[(seed >> 5) % len(pants)]],
        "signatureItem": None,
    }


def normalize_character_spec(raw: dict | None, person_id: str,
                             source_photos: list[str] | None = None,
                             provenance: dict | None = None) -> dict:
    """把 vision 输出的松散 JSON 归一化成合法 CharacterSpec。

    缺失/非法/低置信字段一律落入 designCompletion（设计补全），绝不猜测。
    """
    raw = raw if isinstance(raw, dict) else {}
    traits_in = raw.get("visibleTraits", raw)  # 容忍模型直接平铺字段
    defaults = _design_defaults(person_id)
    traits, confidence, design = {}, {}, []
    for key in _REQUIRED_TRAITS:
        value = traits_in.get(key)
        # 字段缺失 = 不可见/未知 → 设计补全；显式 null 仅 signatureItem 合法
        # （表示"看得见，没有配饰"），其余字段显式 null 同样视为未知。
        ok = key in traits_in and value is not None
        if key == "signatureItem" and key in traits_in and value is None:
            ok = True
        if ok:
            if key in ("hairColor", "skinTone"):
                ok = _is_hex_color(value)
            elif key == "glasses":
                ok = isinstance(value, bool)
            elif key == "bodyTemplate":
                ok = value in _BODY_TEMPLATES
            elif key == "outfitPalette":
                if isinstance(value, list) and value and \
                        all(_is_hex_color(c) for c in value):
                    value = _clean_outfit_palette(value)
                ok = isinstance(value, list) and bool(value)
            elif key == "hair":
                ok = isinstance(value, str) and bool(value.strip())
            elif key == "signatureItem":
                ok = value is None or (isinstance(value, str) and bool(value.strip()))
                if ok and isinstance(value, str):
                    value = value.strip()
        if not ok:
            value = defaults[key]
            design.append(key)
            confidence[key] = 0.0
        else:
            if isinstance(value, str) and key in ("hairColor", "skinTone"):
                value = value.upper()
            confidence[key] = round(float(
                (raw.get("confidence") or {}).get(key, 0.8)), 2)
            if confidence[key] < 0.4:  # 低置信度视为不可见 → 设计补全
                value = defaults[key]
                design.append(key)
                confidence[key] = 0.0
        traits[key] = value
    spec = {
        "schema": SCHEMA_VERSION,
        "personId": person_id,
        "sourcePhotos": [str(p) for p in (source_photos or [])],
        "visibleTraits": traits,
        "confidence": confidence,
        "designCompletion": sorted(design),
        "provenance": provenance or {},
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    return validate_character_spec(spec)


def _dominant_rgb(image: Image.Image, exclude: list[tuple] | None = None,
                  exclude_tol: int = 90, predicate=None) -> str | None:
    """区域主色（量化后最高频）；exclude 丢弃相近色，predicate 过滤像素类别
    （如肤色过滤 r>g>b 且足够亮）。"""
    from collections import Counter

    small = image.resize((24, 24), Image.BOX)
    if predicate is not None:
        pixels = [p for p in small.convert("RGB").getdata() if predicate(p)]
        if len(pixels) < 8:  # 符合条件的像素太少，不可信
            return None
        # 对过滤后的像素直接聚类取主色
        quantized_colors = Counter(
            tuple(c // 24 * 24 for c in p) for p in pixels)
        return rgb_hex(quantized_colors.most_common(1)[0][0])
    quantized = small.quantize(colors=6, method=Image.Quantize.MEDIANCUT,
                               dither=Image.Dither.NONE).convert("RGB")
    for color, _count in Counter(quantized.getdata()).most_common():
        if exclude and any(
                sum(abs(c - e) for c, e in zip(color, ex)) <= exclude_tol
                for ex in exclude):
            continue
        return rgb_hex(color)
    return None


def _is_skin_like(pixel: tuple) -> bool:
    r, g, b = pixel
    return r > 120 and r >= g >= b and (r - b) > 15


def spec_from_photo(photo_path: str, person_id: str,
                    source_photos: list[str] | None = None) -> dict:
    """i2i 主路径的 CharacterSpec：直接像素采样（比 vision 文本描述更准更稳）。

    采样分区（头+上半身裁剪约定）：肤色 = 中区肤色过滤主色；发色 = 顶部区域
    最暗主色；服装 = 胸部中央条带主色（排除肤色）。发型/眼镜/体型不可靠采样
    → 设计补全（这些字段不再承担面部辨识度，相似度由 i2i 像素保证）。
    """
    image = Image.open(photo_path).convert("RGB")
    w, h = image.size

    def box(x0, y0, x1, y1):
        return image.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))

    skin = _dominant_rgb(box(0.30, 0.15, 0.70, 0.60),
                         predicate=_is_skin_like) or DEFAULT_SKIN
    hair_region = box(0.30, 0.0, 0.70, 0.18)
    hair = _dominant_rgb(hair_region,
                         predicate=lambda p: sum(p) < 240) \
        or _dominant_rgb(hair_region) or DEFAULT_HAIR_COLOR
    # 服装：胸部中央条带主色，丢弃与肤色相近的（露肤），最多取 2 个
    outfit = []
    region = box(0.30, 0.62, 0.70, 0.98)
    first = _dominant_rgb(region, exclude=[hex_rgb(skin)])
    if first:
        outfit.append(first)
        second = _dominant_rgb(region, exclude=[hex_rgb(skin), hex_rgb(first)])
        if second:
            outfit.append(second)
    raw = {
        "visibleTraits": {
            "hair": None,            # 设计补全（i2i 像素已携带发型）
            "hairColor": hair,
            "glasses": None,         # 设计补全（i2i 像素已携带眼镜）
            "skinTone": skin,
            "bodyTemplate": None,    # 设计补全
            "outfitPalette": outfit,
            "signatureItem": None,
        },
        "confidence": {"hairColor": 0.6, "skinTone": 0.6, "outfitPalette": 0.6},
    }
    return normalize_character_spec(
        raw, person_id, source_photos or [str(photo_path)],
        provenance={"vision": "photo-sampling", "sourcePhoto": str(photo_path)})


def fallback_character_spec(person_id: str,
                            source_photos: list[str] | None = None) -> dict:
    """vision 不可用时的全设计补全 spec（确定可复现）。"""
    return normalize_character_spec(None, person_id, source_photos,
                                    provenance={"vision": "mock"})


# ---------- 步骤 1：vision 总结可见特征 ----------

_VISION_PROMPT = """请观察这张人物照片，只总结可见外观特征，输出 JSON（不要输出其他内容）：
{"hair": 发型一句话简述（如 short_tousled/long_straight/pulled_back/center_part/full_fringe）,
 "hairColor": "#RRGGBB", "glasses": true/false, "skinTone": "#RRGGBB",
 "bodyTemplate": "regular" 或 "tall",
 "outfitPalette": ["#RRGGBB", ...]（上装/内搭/下装主色，1-4 个，不含文字图案）,
 "signatureItem": 显著配饰一句话（如 挂绳/帽子）或 null}
规则：只写看得见的；看不清的字段填 null；禁止猜测身份、年龄、民族、健康等敏感属性；
outfitPalette 只取穿在身上的服装主色，手中/桌上/背景物件（靠垫、挂绳、瓶子等）的颜色不要报；
荧光霓虹色大概率是物件而非衣服；服装只取色块，不复刻品牌/Logo/文字。"""


def summarize_visible_traits(photo_paths: list[str], person_id: str, vision=None,
                             cache_dir=None) -> dict:
    """vision 角色（qwen-vl）总结可见特征 → 校验过的 CharacterSpec；失败走兜底。

    每张照片最多尝试 2 次（多模态调用偶发超时/限流），失败原因记入
    provenance.vision_error 便于排查；全部失败回退全设计补全 spec。
    cache_dir 提供时按照片内容哈希缓存 spec —— vision 输出有抖动，不缓存会导致
    下游生图 prompt 变化、瓦片缓存白白失效（生图才是贵的那个）。
    """
    photos = [str(p) for p in photo_paths]
    cache_path = None
    photo_digest = None
    existing = [p for p in photos if Path(p).is_file()]
    if cache_dir is not None and existing:
        photo_digest = hashlib.sha256(
            b"".join(Path(p).read_bytes() for p in existing)).hexdigest()
        cache_path = Path(cache_dir) / f"spec_{photo_digest[:16]}.json"
        if cache_path.exists():
            try:
                cached = json.loads(cache_path.read_text(encoding="utf-8"))
                return validate_character_spec(cached)
            except (json.JSONDecodeError, CharacterSpecError):
                pass  # 缓存损坏则重新生成
    try:
        provider = vision or llm_base.get_provider("vision")
    except KeyError:
        return fallback_character_spec(person_id, photos)
    # 多模态推理慢，默认 30s 超时容易误降级；管线场景放宽到 120s
    provider.timeout = max(getattr(provider, "timeout", 30.0), 120.0)
    last_error = ""
    for photo in photos:
        path = Path(photo)
        if not path.exists():
            last_error = f"照片不存在：{photo}"
            continue
        for _attempt in range(2):
            try:
                response = provider.analyze_image(
                    path.read_bytes(), _VISION_PROMPT,
                    mime="image/png" if path.suffix.lower() == ".png" else "image/jpeg")
            except Exception as exc:
                last_error = f"vision 调用异常：{type(exc).__name__}"
                continue
            if getattr(response, "mock", False):
                last_error = response.text[:120]
                continue
            raw = _parse_json_object(response.text)
            if raw is None:
                last_error = "vision 输出不是 JSON"
                continue
            spec = normalize_character_spec(
                raw, person_id, photos,
                provenance={"vision": getattr(response, "model", "vision"),
                            "sourcePhoto": photo})
            if cache_path is not None:
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                cache_path.write_text(
                    json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")
            return spec
    spec = fallback_character_spec(person_id, photos)
    if last_error:
        spec["provenance"]["vision_error"] = last_error
    return spec


def _parse_json_object(text: str) -> dict | None:
    """从模型输出里抠第一个 JSON object（容忍 ```json 围栏与前后废话）。"""
    if not text:
        return None
    cleaned = text.strip()
    if "```" in cleaned:
        for block in cleaned.split("```")[1:]:
            block = block.lstrip("json").strip()
            if block.startswith("{"):
                cleaned = block
                break
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(cleaned[start:end + 1])
    except json.JSONDecodeError:
        return None


# ---------- 步骤 2：AI 像素瓦片（头正面/背面） ----------


def _hair_prompt_text(spec: dict) -> str:
    traits = spec["visibleTraits"]
    hair = traits["hair"]
    if spec["designCompletion"] and "hair" in spec["designCompletion"]:
        hair = f"short neat hair (design default), color {traits['hairColor']}"
    return hair


def build_tile_prompts(spec: dict) -> dict[str, str]:
    """按 CharacterSpec 组合生图 prompt（风格词锁定 ART-BRIEF：MC 体素、平色、
    禁抗锯齿/渐变/文字/Logo；正面相似度优先：眼睛必须露出、刘海不过眉）。"""
    traits = spec["visibleTraits"]
    hair = _hair_prompt_text(spec)
    glasses = ("wearing thin dark-framed pixel glasses clearly drawn around the eyes"
               if traits["glasses"] else "no glasses")
    style_rules = (
        "Drawn on an exact 16x16 pixel grid. Chunky visible pixels, at most 16 flat "
        "colors, strictly no anti-aliasing, no gradients, no shading, no outline "
        "glow, no text, no logo, no watermark. The tile fills the entire square "
        "canvas edge to edge: no background, no border, no margin, flat "
        "orthographic front view.")
    front = (
        "A single 16x16 retro pixel-art game skin texture tile: the FRONT face of a "
        "Minecraft-style voxel character head. "
        f"Skin tone {traits['skinTone']}; hair: {hair}, hair color "
        f"{traits['hairColor']}; {glasses}. "
        "Composition rules: hair occupies ONLY the top 4 pixel rows as a fringe and "
        "must never cover the eyes; the bare skin face occupies the lower "
        "two-thirds of the tile; two small dark square eyes sit side by side in the "
        "vertical middle of the tile, clearly visible on skin; one tiny mouth line "
        "a few pixels below the eyes; calm neutral expression. " + style_rules)
    back = (
        "A single 16x16 retro pixel-art game skin texture tile: the BACK of the same "
        "Minecraft-style voxel character head, same person. "
        f"Mostly hair covering the whole tile: {hair}, hair color "
        f"{traits['hairColor']}; optionally a thin strip of neck skin "
        f"{traits['skinTone']} along the bottom edge. No face features. "
        + style_rules)
    return {"head_front": front, "head_back": back}


def postprocess_tile(png_bytes: bytes) -> Image.Image:
    """生图结果 → 16x16 像素瓦片：居中裁方 → BOX 重采样 → 定色量化（无抖动）。

    量化保证输出是有限平色块（无 AA 涂抹），BOX 重采样在大图→16px 时比
    单点最近邻更稳（等价于先平均再锁色，最终仍是硬边像素）。
    """
    image = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    image = image.resize((TILE_SIZE, TILE_SIZE), Image.BOX)
    quantized = image.quantize(colors=_TILE_COLORS, method=Image.Quantize.MEDIANCUT,
                               dither=Image.Dither.NONE)
    tile = quantized.convert("RGBA")
    # 锁死 alpha：atlas 不允许半透明渗色
    tile.putalpha(255)
    return tile


# ---------- 步骤 2b：i2i 图生图瓦片（主路径，2026-08-04 决策：放弃两步文本路径） ----------

# i2i 头部五面视角描述（同一张参考人脸 + 视角提示词；相似度来自像素本身）
_I2I_VIEWS = {
    "head_front": "the FRONT face of the head, facing the viewer (keep the "
                  "person's hairstyle, hair color, glasses and face shape)",
    "head_back": "the BACK of the same person's head, same hairstyle and hair "
                 "color, hair only, no face features",
    "head_left": "the flat LEFT side of the same person's cube head: mostly "
                 "hair and one ear, strictly no eyes, no nose, no mouth, "
                 "no profile face",
    "head_right": "the flat RIGHT side of the same person's cube head: mostly "
                  "hair and one ear, strictly no eyes, no nose, no mouth, "
                  "no profile face",
    "head_top": "the TOP of the same person's head viewed from directly above, "
                "same hair color and texture, hair whorl only, no face",
}

# 背景键控：提示词指定纯色背景；边框主色占比低于该阈值视为"无纯色背景"不键控
_KEY_MIN_BORDER_SHARE = 0.6
# 键控后有效像素低于该比例视为退化输出（如全背景），抛错走降级链
_KEY_MIN_CONTENT_SHARE = 0.3


def build_i2i_prompt(view: str) -> str:
    """i2i 像素瓦片提示词：参考人脸 + 视角 + 像素风锁定 + 可键控纯色背景。

    审美锚点（2026-08-06 视觉 QA 后的重写）：16x16 的好看 = 大而深的眼睛、
    干净的发形剪影、两档平色皮肤、高对比高饱和——提示词必须显式锁定这些
    结构，否则模型输出软糊的"印象派"脸。"""
    if view not in _I2I_VIEWS:
        raise ValueError(f"未知 i2i 视角：{view!r}（支持 {sorted(_I2I_VIEWS)}）")
    aesthetic = (
        " Aesthetic rules for a beautiful result: two big bold near-black square "
        "eyes (each 2x3 pixels) with clear separation, readable at a glance; "
        "skin in exactly two flat tones (light base + one warm shadow); hair as "
        "one bold clean silhouette mass with a crisp edge; high contrast, rich "
        "but flat colors, kawaii Minecraft-skin cuteness. Absolutely no soft "
        "blending, no painterly blur, no photographic detail.")
    rules = (
        "Drawn on an exact 16x16 pixel grid: chunky visible pixels, at most 10 "
        "flat colors, strictly no anti-aliasing, no gradients, no shading glow, "
        "no text, no logo, no watermark. The head is centered and fills most of "
        "the frame, isolated on a solid flat magenta background (#FF00FF) with "
        "no shadow and no border.")
    base = (
        "Take the person in the reference photo and draw "
        f"{_I2I_VIEWS[view]}, as a single 16x16 retro pixel-art game skin "
        "texture tile for a Minecraft-style voxel character head. ")
    return base + (aesthetic if view == "head_front" else "") + rules


def _border_dominant_color(image: Image.Image) -> tuple[tuple, float]:
    """四条边框像素的主色及其占比（判断是否存在纯色背景）。

    像素风背景有轻微抖动（品红会在 241/246/250 间跳），精确匹配会碎票，
    先按 16 级色桶聚类再对桶中心计占比。
    """
    from collections import Counter

    width, height = image.size
    pixels = image.load()
    border = ([pixels[x, 0] for x in range(width)]
              + [pixels[x, height - 1] for x in range(width)]
              + [pixels[0, y] for y in range(height)]
              + [pixels[width - 1, y] for y in range(height)])
    bucket = Counter(tuple(c // 16 for c in p) for p in border).most_common(1)[0][0]
    center = tuple(c * 16 + 8 for c in bucket)
    share = sum(1 for p in border
                if sum(abs(p[c] - center[c]) for c in range(3)) <= 96) / len(border)
    return center, share


def _content_bbox(image: Image.Image, bg: tuple, tol: int = 60):
    """非背景像素的包围盒；没有内容返回 None。"""
    pixels = image.load()
    xs, ys = [], []
    for y in range(0, image.height, 4):  # 大步长扫描足够定位头部轮廓
        for x in range(0, image.width, 4):
            if sum(abs(pixels[x, y][c] - bg[c]) for c in range(3)) > tol:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    pad = 6
    return (max(0, min(xs) - pad), max(0, min(ys) - pad),
            min(image.width, max(xs) + pad), min(image.height, max(ys) + pad))


def _chroma_key(tile: Image.Image, bg: tuple, hue_tol: float = 0.08,
                min_saturation: float = 0.22, min_value: float = 0.1) -> int:
    """色度键控：严格条件全图键 + 宽松条件从边缘洪水填充，返回不透明像素数。

    用 HSV 色相距离而非 RGB 距离：量化会把纯色背景拆出多个明暗变体
    （品红 (248,8,248) 的边缘暗化变体 (173,11,174)），RGB 容差难以兼顾。
    边缘洪水填充处理被背景"污染"的轮廓暗像素（紧贴背景的过渡色，hue 偏
    背景但饱和度/明度偏低）——只有与边框连通的才键，头发内部的紫棕色调
    （不与边框连通）不会被误伤。
    """
    import colorsys
    from collections import deque

    bg_h, bg_s, _bg_v = colorsys.rgb_to_hsv(*(c / 255 for c in bg))
    pixels = tile.load()
    keyed = [[False] * tile.width for _ in range(tile.height)]

    def hsv(x, y):
        r, g, b = pixels[x, y][:3]
        return colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)

    def hue_dist(h):
        return min(abs(h - bg_h), 1.0 - abs(h - bg_h))

    # 第一遍：严格条件（高饱和、同 hue），全图任意位置
    for y in range(tile.height):
        for x in range(tile.width):
            h, s, v = hsv(x, y)
            if (bg_s >= min_saturation and hue_dist(h) <= hue_tol
                    and s >= min_saturation and v >= min_value):
                keyed[y][x] = True
    # 第二遍：从边框洪水填充，宽松条件（轮廓污染像素）
    queue = deque()
    for x in range(tile.width):
        queue.extend(((x, 0), (x, tile.height - 1)))
    for y in range(tile.height):
        queue.extend(((0, y), (tile.width - 1, y)))
    while queue:
        x, y = queue.popleft()
        if not (0 <= x < tile.width and 0 <= y < tile.height) or keyed[y][x]:
            continue
        h, s, v = hsv(x, y)
        if not (hue_dist(h) <= hue_tol * 1.5 and s >= 0.2):
            continue
        keyed[y][x] = True
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

    opaque = 0
    for y in range(tile.height):
        for x in range(tile.width):
            if keyed[y][x]:
                r, g, b, _a = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)
            else:
                opaque += 1
    return opaque
    pixels = tile.load()
    opaque = 0
    for y in range(tile.height):
        for x in range(tile.width):
            r, g, b, a = pixels[x, y]
            if sum(abs(c - bc) for c, bc in zip((r, g, b), bg)) <= tol:
                pixels[x, y] = (r, g, b, 0)
            else:
                opaque += 1
    return opaque


def _fill_transparent_nearest(tile: Image.Image) -> None:
    """透明像素最近邻填充：多轮 4 邻域多数表决，最后全局主色兜底。

    保证输出完全不透明（atlas 不允许半透明渗色），且只用已有调色板色，
    不引入任何混合色。
    """
    from collections import Counter

    pixels = tile.load()
    for _round in range(TILE_SIZE * 2):
        fill: list[tuple[int, int, tuple]] = []
        for y in range(tile.height):
            for x in range(tile.width):
                if pixels[x, y][3] != 0:
                    continue
                neighbors = [pixels[nx, ny] for nx, ny in
                             ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                             if 0 <= nx < tile.width and 0 <= ny < tile.height
                             and pixels[nx, ny][3] != 0]
                if neighbors:
                    color = Counter(neighbors).most_common(1)[0][0]
                    fill.append((x, y, color))
        if not fill:
            break
        for x, y, color in fill:
            pixels[x, y] = (color[0], color[1], color[2], 255)
    remaining = [pixels[x, y] for y in range(tile.height)
                 for x in range(tile.width)]
    transparent = [(x, y) for y in range(tile.height) for x in range(tile.width)
                   if pixels[x, y][3] == 0]
    if transparent:
        opaque = [p for p in remaining if p[3] != 0]
        fallback = Counter(opaque).most_common(1)[0][0] if opaque \
            else (*hex_rgb(DEFAULT_SKIN), 255)
        for x, y in transparent:
            pixels[x, y] = (fallback[0], fallback[1], fallback[2], 255)


def _snap_hair_mass(tile: Image.Image) -> None:
    """发团吸附（head_top/head_back 专用）：这两个视角审美上就是一团头发。
    当 ≥55% 像素已是深色发色时，把残留的亮像素（皮肤/背景泄漏）吸附到
    主深色——头顶/后脑勺出现亮斑会一眼出戏。"""
    from collections import Counter

    pixels = list(tile.convert("RGBA").getdata())
    dark = [p for p in pixels if sum(p[:3]) < 360]
    if len(dark) < len(pixels) * 0.55:
        return
    hair = Counter(dark).most_common(1)[0][0]
    rgba = tile.load()
    for y in range(tile.height):
        for x in range(tile.width):
            if sum(rgba[x, y][:3]) > 630:
                rgba[x, y] = (hair[0], hair[1], hair[2], 255)


def _anchor_dark_features(tile: Image.Image) -> None:
    """深色特征锚定（仅 head_front）：把面部中间带最暗 ~4% 像素压到深棕黑，
    保证眼睛在任何生成结果下都可读——16x16 的"好看"首先是眼睛要黑要亮。
    只动中间带（6..11 行），不影响头发与轮廓。"""
    band = [(x, y) for y in range(6, 12) for x in range(tile.width)]
    luminance = sorted(
        ((sum(tile.getpixel((x, y))[:3]), x, y) for x, y in band),
        key=lambda item: item[0],
    )
    if not luminance:
        return
    count = max(4, int(len(luminance) * 0.04))
    dark = (43, 34, 32, 255)
    for _lum, x, y in luminance[:count]:
        tile.putpixel((x, y), dark)


def _purge_magenta_leaks(tile: Image.Image) -> None:
    """品红泄漏清除：色度键控后仍可能残留品红轮廓像素（色相/饱和略偏未被键
    到、又被最近邻填充跳过——非透明）。逐像素检查：色相在品红邻域（290°-330°）
    且高饱和 → 用非泄漏 4 邻域主色替换；无邻域则压成头发深色。"""
    import colorsys
    from collections import Counter

    pixels = tile.load()
    leaks = []
    for y in range(tile.height):
        for x in range(tile.width):
            r, g, b, a = pixels[x, y]
            hue, sat, _val = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 0.80 <= hue <= 0.92 and sat > 0.7 and max(r, b) - g > 80:
                leaks.append((x, y))
    for x, y in leaks:
        neighbors = [pixels[nx, ny] for nx, ny in
                     ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                     if 0 <= nx < tile.width and 0 <= ny < tile.height
                     and (nx, ny) not in leaks]
        color = Counter(neighbors).most_common(1)[0][0] if neighbors \
            else (24, 22, 24, 255)
        pixels[x, y] = (color[0], color[1], color[2], 255)


def _is_keyable_background(bg: tuple) -> bool:
    """背景是否可安全键控：只有品红系高饱和背景才允许 chroma key。

    模型经常不听背景指令（深色/黑色背景照出）。深色背景与黑发同色系，
    色度键控会把头发当背景整片吃掉、再用邻近色乱填——瓦片直接「没有人型」
    （2026-08-06 JRPG 提示词事故的根因）。此时正确做法是全程不裁不键，
    直接下采样（构图本身就让头撑满画面）。"""
    import colorsys

    r, g, b = bg
    hue, sat, _val = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return 0.78 <= hue <= 0.95 and sat > 0.55


def postprocess_i2i_tile(png_bytes: bytes, *, anchor_eyes: bool = False,
                         hair_mass: bool = False) -> Image.Image:
    """i2i 生图结果 → 16x16 像素瓦片：背景检测 → 内容裁剪 → 对比/饱和增强 →
    BOX 重采样 → 定色量化 → 色度键控 → 最近邻填充（输出完全不透明、无混合色）。

    退化输出（键控后有效像素过少，如整幅背景）抛 ValueError，由调用方走
    降级链；无纯色背景（模型没听背景指令）时跳过裁剪/键控，整幅量化兜底。
    anchor_eyes：head_front 专用，深色特征锚定（眼睛必黑）。
    """
    from PIL import ImageEnhance

    image = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    bg, share = _border_dominant_color(image)
    # 只有品红系高饱和背景才走 裁剪+键控；其余背景（深色/杂色）一律不裁不键
    has_background = share >= _KEY_MIN_BORDER_SHARE and _is_keyable_background(bg)
    if has_background:
        bbox = _content_bbox(image, bg)
        if bbox is not None:
            image = image.crop(bbox)
    # 审美增强：生成图偏灰偏淡是常态，量化前提对比与饱和。
    # 注意不能用 autocontrast——它逐通道归一化直方图，品红背景/暗部占比
    # 不等会把黑发拉绿再拉蓝（2026-08-06 发色事故）；ImageEnhance.Contrast
    # 绕均值等比缩放，色相关系不变，才是安全选项
    image = ImageEnhance.Contrast(image).enhance(1.18)
    image = ImageEnhance.Color(image).enhance(1.25)
    # 下采样：BOX 到 32（去 AA 噪点）→ 定色量化 10 色（锁平色、比 16 色更脆）
    # → NEAREST 到 16（保硬边特征：眼/镜框在 16px 下只有 1-2px，直接 BOX 到 16 会糊掉）
    image = image.resize((TILE_SIZE * 2, TILE_SIZE * 2), Image.BOX)
    image = image.quantize(colors=10, method=Image.Quantize.MEDIANCUT,
                           dither=Image.Dither.NONE).convert("RGB")
    tile = image.resize((TILE_SIZE, TILE_SIZE), Image.NEAREST).convert("RGBA")
    if has_background:
        opaque = _chroma_key(tile, bg)
        if opaque < TILE_SIZE * TILE_SIZE * _KEY_MIN_CONTENT_SHARE:
            raise ValueError(f"i2i 瓦片内容退化（有效像素 {opaque}），走降级链")
        _fill_transparent_nearest(tile)
    else:
        tile.putalpha(255)
    _purge_magenta_leaks(tile)
    if hair_mass:
        _snap_hair_mass(tile)
    if anchor_eyes:
        _anchor_dark_features(tile)
    return tile


def _tile_cache_path(cache_dir, model: str, prompt: str,
                     reference: bytes | None) -> Path:
    """瓦片缓存键：模型 + prompt + 参考图内容哈希（i2i 换图即换键）。"""
    material = f"{model}|{prompt}".encode("utf-8")
    if reference:
        material += b"|ref:" + hashlib.sha256(reference).digest()
    return Path(cache_dir) / f"tile_{hashlib.sha256(material).hexdigest()}.png"


def generate_tiles(spec: dict, image=None, cache_dir=None,
                   reference: bytes | None = None) -> tuple[dict, str]:
    """按瓦片计划调 image 角色；逐瓦片走降级链。返回 (tiles, 使用的模型名)。

    计划（有参考图时 i2i 优先，面部辨识度来自像素本身）：
        头部五面 i2i（同一张人脸 + 视角提示词）
        → head_front/head_back 文本提示词 t2i 兜底
        → 程序化瓦片（compose_atlas 内）。
    cache_dir 提供时按 模型+prompt+参考图哈希 缓存原始 PNG（生图贵且慢）。
    """
    try:
        provider = image or llm_base.get_provider("image")
    except KeyError:
        return {}, "mock"
    # (瓦片名, prompt, 参考图, 后处理函数)
    plan: list[tuple[str, str, bytes | None, object]] = []
    if reference:
        for view, _desc in _I2I_VIEWS.items():
            # head_front 额外做深色特征锚定（眼睛必黑，审美锚点）
            postprocess = (lambda b: postprocess_i2i_tile(b, anchor_eyes=True)) \
                if view == "head_front" else postprocess_i2i_tile
            plan.append((view, build_i2i_prompt(view), reference, postprocess))
    for name, prompt in build_tile_prompts(spec).items():
        plan.append((name, prompt, None, postprocess_tile))

    tiles, model_used = {}, "mock"
    for name, prompt, ref, postprocess in plan:
        if name in tiles:
            continue  # 该面已由更优路径产出
        png_bytes = None
        cache_path = None
        if cache_dir is not None:
            cache_path = _tile_cache_path(cache_dir, provider.model, prompt, ref)
            if cache_path.exists():
                png_bytes = cache_path.read_bytes()
        if png_bytes is None:
            png_bytes = provider.generate_image(prompt,
                                                images=[ref] if ref else None)
            record = provider.call_log[-1] if provider.call_log else None
            if record is not None and record.mock:
                continue  # mock 占位图不进 atlas 也不进缓存，走计划下一条
            if cache_path is not None:
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                cache_path.write_bytes(png_bytes)
        try:
            tiles[name] = postprocess(png_bytes)
            model_used = provider.model
        except Exception:
            continue  # 单瓦片解析/键控失败走计划下一条，不拖垮整人
    return tiles, model_used


# ---------- 步骤 3：确定性合成 128x128 固定 UV atlas ----------


def _to_pil_rect(region: str) -> tuple[int, int, int, int]:
    """Blender 画布坐标 → PIL 坐标（y 翻转）。"""
    x, y, w, h = VOXEL_REGIONS[region]
    return (x, ATLAS_SIZE - y - h, w, h)


def _fill(image: Image.Image, region: str, color: str) -> None:
    x, y, w, h = _to_pil_rect(region)
    ImageDraw.Draw(image).rectangle((x, y, x + w - 1, y + h - 1), fill=color)


def _paste_tile(image: Image.Image, region: str, tile: Image.Image) -> None:
    x, y, w, h = _to_pil_rect(region)
    if tile.size != (w, h):
        tile = tile.resize((w, h), Image.NEAREST)
    image.paste(tile.convert("RGBA"), (x, y))


def _dominant_color(tile: Image.Image, box: tuple | None = None) -> str:
    """瓦片（或其子区域）的最高频颜色。"""
    from collections import Counter

    view = tile.crop(box) if box else tile
    colors = Counter(p for p in view.convert("RGBA").getdata() if p[3] > 0)
    if not colors:
        return DEFAULT_HAIR_COLOR
    return rgb_hex(colors.most_common(1)[0][0][:3])


def _hair_band_rows(front_tile: Image.Image | None, hair_color: str) -> int:
    """量正面瓦片顶部连续发色的行数，用于侧面发带高度；量不出给默认 5。"""
    if front_tile is None:
        return 5
    target = hex_rgb(hair_color)
    pixels = front_tile.convert("RGBA").load()
    rows = 0
    for y in range(TILE_SIZE):
        hits = sum(
            1 for x in range(TILE_SIZE)
            if sum(abs(pixels[x, y][c] - target[c]) for c in range(3)) < 90)
        if hits >= TILE_SIZE // 3:
            rows += 1
        else:
            break
    return max(3, min(8, rows))


def _procedural_front_tile(spec: dict) -> Image.Image:
    """无生图时的程序化正面脸（复刻 build_photo_character_modes 的像素规则）。"""
    traits = spec["visibleTraits"]
    skin, hair = traits["skinTone"], traits["hairColor"]
    eye, mouth = "#292524", shade("#7A4A49", 0.0)
    tile = Image.new("RGBA", (TILE_SIZE, TILE_SIZE), hex_rgb(skin) + (255,))
    draw = ImageDraw.Draw(tile)
    hair_style = traits["hair"]
    # 发际线（PIL 坐标：第 0 行 = 头顶）
    if "full_fringe" in hair_style:
        draw.rectangle((0, 0, 15, 4), fill=hair)
        for offset, depth in ((1, 3), (4, 5), (7, 4), (10, 6), (13, 4)):
            draw.rectangle((offset, 5, offset + 2, 5 + depth - 3), fill=hair)
    elif "center_part" in hair_style:
        draw.rectangle((0, 0, 15, 3), fill=hair)
        draw.rectangle((0, 4, 4, 6), fill=hair)
        draw.rectangle((11, 4, 15, 6), fill=hair)
    elif "tousled" in hair_style:
        draw.rectangle((0, 0, 15, 3), fill=hair)
        for offset, depth in ((0, 2), (3, 4), (7, 3), (11, 5), (14, 3)):
            draw.rectangle((offset, 4, offset + 1, 3 + depth), fill=hair)
    else:
        draw.rectangle((0, 0, 15, 3), fill=hair)
        draw.rectangle((0, 4, 6, 5), fill=hair)
    draw.rectangle((4, 7, 5, 8), fill=eye)
    draw.rectangle((10, 7, 11, 8), fill=eye)
    draw.rectangle((7, 12, 8, 12), fill=mouth)
    draw.point((7, 10), fill=shade(skin, -0.12))
    draw.point((8, 10), fill=shade(skin, -0.12))
    if traits["glasses"]:
        frame = "#242A29"
        for gx in (2, 9):
            draw.rectangle((gx, 6, gx + 4, 9), outline=frame, width=1)
        draw.rectangle((7, 7, 8, 7), fill=frame)
    return tile


def compose_atlas(spec: dict, tiles: dict | None = None) -> Image.Image:
    """确定性合成器：生成瓦片 + spec 色块 → 128x128 固定 UV atlas（RGBA，无透明）。"""
    tiles = tiles or {}
    traits = spec["visibleTraits"]
    person_id = spec["personId"]
    skin = traits["skinTone"]
    hair_color = traits["hairColor"]
    top_color, inner_color, pants_color, accent = outfit_colors(traits)
    shoes_color, sole_color = "#DAD5C8", "#B8B2A4"
    # 有内搭层（≥2 个服装色）即按长袖分层上衣处理；否则短袖露肤
    long_sleeve = len(traits["outfitPalette"]) > 1
    hair_style = traits["hair"]

    atlas = Image.new("RGBA", (ATLAS_SIZE, ATLAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(atlas)

    # --- 头部五面（bottom 为设计默认肤色阴影） ---
    front_tile = tiles.get("head_front") or _procedural_front_tile(spec)
    _paste_tile(atlas, "head_front", front_tile)
    if tiles.get("head_front") is not None:
        # 肤色/发色与生成瓦片对齐（侧面/头顶是程序画的，色值必须取自瓦片本身，
        # 否则正面与侧面两个色调）：肤=瓦片底部中区主色，发=顶部两行主色
        skin = _dominant_color(front_tile, (4, 12, 12, 16))
        hair_color = _dominant_color(front_tile, (0, 0, 16, 2))
    skin_shadow = shade(skin, -0.15)
    measured_hair = _hair_band_rows(tiles.get("head_front"), hair_color)

    if tiles.get("head_back") is not None:
        _paste_tile(atlas, "head_back", tiles["head_back"])
    else:
        _fill(atlas, "head_back", skin)
        bx, by, bw, bh = _to_pil_rect("head_back")
        back_hair = 16 if "long" in hair_style else 8
        draw.rectangle((bx, by, bx + bw - 1, by + back_hair - 1), fill=hair_color)

    # 侧面：i2i 侧脸瓦片优先；否则程序化（肤底 + 发带 + 耳，
    # 有正面瓦片时复制边缘列保持鬓角连续）
    for side in ("left", "right"):
        if tiles.get(f"head_{side}") is not None:
            _paste_tile(atlas, f"head_{side}", tiles[f"head_{side}"])
            continue
        _fill(atlas, f"head_{side}", skin)
        sx, sy, sw, sh = _to_pil_rect(f"head_{side}")
        draw.rectangle((sx, sy, sx + sw - 1, sy + measured_hair - 1), fill=hair_color)
        if "long" in hair_style:
            edge = sx if side == "right" else sx + sw - 6
            draw.rectangle((edge, sy, edge + 5, sy + sh - 1), fill=hair_color)
        if tiles.get("head_front") is not None:
            front = tiles["head_front"].convert("RGBA")
            strip = front.crop((0, 0, 2, 16)) if side == "left" \
                else front.crop((14, 0, 16, 16))
            atlas.paste(strip, (sx + 14, sy) if side == "left" else (sx, sy))
        # 耳（肤影 4x4 + 肤芯 2x2），位置复刻参考脚本
        draw.rectangle((sx + 6, sy + 7, sx + 9, sy + 10), fill=skin_shadow)
        draw.rectangle((sx + 7, sy + 8, sx + 8, sy + 9), fill=skin)

    if tiles.get("head_top") is not None:
        _paste_tile(atlas, "head_top", tiles["head_top"])
    else:
        _fill(atlas, "head_top", hair_color)
        tx, ty, _, _ = _to_pil_rect("head_top")
        swirl = shade(hair_color, -0.12)
        ox = 2 + _stable_seed(person_id, "swirl") % 10  # 发旋，确定性
        draw.rectangle((tx + ox, ty + 6, tx + ox + 2, ty + 8), fill=swirl)
    _fill(atlas, "head_bottom", skin_shadow)

    # --- 躯干：外套主色 + 前襟内搭条 + 领口 accent（纯色块，无文字图案） ---
    for face in ("left", "front", "right", "back", "top", "bottom"):
        _fill(atlas, f"torso_{face}", top_color)
    fx, fy, fw, fh = _to_pil_rect("torso_front")
    draw.rectangle((fx + 5, fy + 2, fx + 10, fy + fh - 3), fill=inner_color)
    draw.rectangle((fx + 4, fy, fx + 11, fy + 2), fill=accent)

    # --- 手臂：长袖=上衣色；短袖=肤底 + 袖口上衣色 ---
    for face in ("left", "front", "right", "back", "top", "bottom"):
        _fill(atlas, f"arm_{face}", top_color if long_sleeve else skin)
    if not long_sleeve:
        for face in ("left", "front", "right", "back"):
            ax, ay, aw, _ = _to_pil_rect(f"arm_{face}")
            draw.rectangle((ax, ay, ax + aw - 1, ay + 9), fill=top_color)

    # --- 腿：裤色 + 鞋（底 5 行）+ 鞋底（底 1 行） ---
    for face in ("left", "front", "right", "back", "top", "bottom"):
        _fill(atlas, f"leg_{face}", pants_color)
    for face in ("left", "front", "right", "back"):
        lx, ly, lw, lh = _to_pil_rect(f"leg_{face}")
        draw.rectangle((lx, ly + lh - 5, lx + lw - 1, ly + lh - 1), fill=shoes_color)
        draw.rectangle((lx, ly + lh - 1, lx + lw - 1, ly + lh - 1), fill=sole_color)

    # 最终兜底：任何残留透明像素压成不透明（防渗色）
    _flatten_alpha(atlas)
    return atlas


def _flatten_alpha(image: Image.Image) -> None:
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a != 255:
                pixels[x, y] = (r, g, b, 255)


def palette_from_spec(spec: dict) -> dict:
    """CharacterSpec → 前端 MATERIAL_MODULE_TOKENS 六键调色板。"""
    traits = spec["visibleTraits"]
    top, inner, pants, _accent = outfit_colors(traits)
    return {
        "jacket": top,
        "shirt": inner,
        "pants": pants,
        "hair": traits["hairColor"],
        "skin": traits["skinTone"],
        "shoes": "#DAD5C8",
    }


# ---------- 步骤 4：表情 atlas（参数化像素编辑，只触脸部区域） ----------


def _face_view(atlas: Image.Image) -> Image.Image:
    return atlas.crop(FACE_BOX_PIL).convert("RGBA")


def _face_skin_color(face: Image.Image) -> tuple[int, int, int, int]:
    """脸部最高频的"有色"像素（复刻参考实现的肤色检测）。"""
    from collections import Counter

    candidates = [p for p in face.getdata()
                  if p[3] > 0 and max(p[:3]) - min(p[:3]) > 8]
    if not candidates:
        return hex_rgb(DEFAULT_SKIN) + (255,)
    return Counter(candidates).most_common(1)[0][0]


def _color_close(pixel, target, tolerance: int = 60) -> bool:
    return sum(abs(pixel[c] - target[c]) for c in range(3)) <= tolerance


def _detect_face_anchors(face: Image.Image, skin) -> dict:
    """在 16x16 脸瓦片上定位眼/嘴锚点；检测失败回退参考布局的固定坐标。

    眼 = 上半部（行 5-10）左右半区最暗像素质心；嘴 = 下半部（行 10-14）
    与肤色差异最大的近中线像素质心。
    """
    pixels = face.load()
    eyes = {}
    for name, xr in (("left", range(1, 8)), ("right", range(8, 15))):
        dark = [(x, y) for y in range(5, 11) for x in xr
                if sum(pixels[x, y][:3]) < 300 and pixels[x, y][3] > 0]
        if dark:
            eyes[name] = (sum(p[0] for p in dark) / len(dark),
                          sum(p[1] for p in dark) / len(dark))
    mouth_candidates = [
        (x, y) for y in range(10, 15) for x in range(4, 12)
        if pixels[x, y][3] > 0 and not _color_close(pixels[x, y], skin, 48)
        # 排除镜框/头发的纯黑（sum<120），只认中间调（嘴/唇色）
        and 120 < sum(pixels[x, y][:3]) < 560]
    mouth = None
    if mouth_candidates:
        mouth_candidates.sort(key=lambda p: abs(p[0] - 7.5))
        anchor = mouth_candidates[: max(1, len(mouth_candidates) // 3)]
        mouth = (sum(p[0] for p in anchor) / len(anchor),
                 sum(p[1] for p in anchor) / len(anchor))
    return {
        "eye_left": eyes.get("left", (4.5, 7.5)),
        "eye_right": eyes.get("right", (10.5, 7.5)),
        "mouth": mouth or (7.5, 12.0),
    }


def derive_expression(atlas: Image.Image, expression: str) -> Image.Image:
    """从 neutral atlas 派生表情 atlas：整图复制 + 脸部区域像素编辑。

    delta 复刻 build_character_expression_textures.py 的相对几何（擦嘴区 →
    按表情重画），锚点由 _detect_face_anchors 参数化；编辑严格裁剪在脸区内。
    """
    if expression not in EXPRESSIONS:
        raise ValueError(f"未知表情：{expression!r}（支持 {EXPRESSIONS}）")
    image = atlas.copy().convert("RGBA")
    if expression == "neutral":
        return image

    face = _face_view(atlas)
    skin = _face_skin_color(face)
    anchors = _detect_face_anchors(face, skin)
    mx, my = anchors["mouth"]
    mx, my = max(4.0, min(11.0, mx)), max(10.0, min(14.0, my))
    ink = (68, 48, 47, 255)
    accent = (126, 70, 76, 255)

    patch = face.copy()
    draw = ImageDraw.Draw(patch)
    # 擦除嘴区（以锚点为中心，几何与参考实现的 (5,10)-(11,14) 一致）
    draw.rectangle((round(mx) - 3, round(my) - 2, round(mx) + 3, round(my) + 2),
                   fill=skin)
    if expression == "happy":
        draw.point((round(mx) - 2, round(my) - 1), fill=ink)
        draw.point((round(mx) + 2, round(my) - 1), fill=ink)
        draw.point((round(mx) - 1, round(my)), fill=accent)
        draw.point((round(mx) + 1, round(my)), fill=accent)
        draw.point((round(mx), round(my) + 1), fill=accent)
    elif expression == "surprised":
        draw.rectangle((round(mx) - 1, round(my) - 1, round(mx) + 1, round(my) + 1),
                       fill=ink)
        draw.point((round(mx), round(my)), fill=(190, 105, 99, 255))
        for eye in ("eye_left", "eye_right"):
            ex, ey = anchors[eye]
            draw.point((round(ex), max(2, round(ey) - 3)), fill=(255, 239, 185, 255))
    elif expression == "thinking":
        draw.line((round(mx) - 2, round(my), round(mx) + 2, round(my) - 1),
                  fill=accent, width=1)
        ex, ey = anchors["eye_right"]
        ey = max(3.0, ey)
        draw.line((round(ex) - 1, round(ey) - 2, round(ex) + 2, round(ey) - 3),
                  fill=ink, width=1)
        draw.point((min(15, round(ex) + 3), max(1, round(ey) - 4)),
                   fill=(235, 192, 82, 255))
    # 严格只回贴脸部区域（整图其余像素与 neutral 逐像素一致）
    image.paste(patch, FACE_BOX_PIL[:2])
    return image


# ---------- 编排：generate(photos, person_id) -> TextureSet ----------


@dataclass
class TextureSet:
    """一套人物贴图产物：spec + neutral atlas + 4 表情 + 调色板 + 溯源。"""

    person_id: str
    spec: dict
    neutral: Image.Image
    expressions: dict[str, Image.Image]
    palette: dict
    model: str = "mock"           # 生图模型名；未走真实生图为 "mock"
    vision_model: str = "mock"
    source_photos: list[str] = field(default_factory=list)
    tiles: dict = field(default_factory=dict)  # 生成瓦片（审计/调试用）

    def expression_images(self) -> dict[str, Image.Image]:
        """含 neutral 在内的完整表情映射（键 = neutral/happy/surprised/thinking）。"""
        return dict(self.expressions)


def generate(photo_paths: list, person_id: str, *, vision=None, image=None,
             cache_dir=None, i2i: bool = True) -> TextureSet:
    """照片 → CharacterSpec → AI 像素瓦片 → 固定 UV atlas → 四表情。

    主路径（2026-08-04 决策）：i2i 图生图 —— 真实人脸裁剪直接作参考图生成
    头部五面像素瓦片，面部辨识度来自像素本身；CharacterSpec 由照片像素采样
    得出（肤色/发色/服装主色），只承担元数据/调色板/程序化兜底。
    降级链：i2i 失败 → 文本提示词 t2i（头正面/背面）→ 程序化瓦片；
    任何分支都产出合法 TextureSet，绝不抛异常。
    vision 显式注入时仍走 vision 总结路径（测试/调试用）。
    """
    photos = [str(p) for p in photo_paths]
    first_photo = next((p for p in photos if Path(p).is_file()), None)
    if vision is not None:
        spec = summarize_visible_traits(photos, person_id, vision=vision,
                                        cache_dir=cache_dir)
    elif first_photo:
        spec = spec_from_photo(first_photo, person_id, source_photos=photos)
    else:
        spec = fallback_character_spec(person_id, photos)
    reference = None
    if i2i and first_photo:
        reference = Path(first_photo).read_bytes()
    tiles, image_model = generate_tiles(spec, image=image, cache_dir=cache_dir,
                                        reference=reference)
    if "head_front" in tiles:
        # 生成瓦片比照片分区采样更贴脸：肤色/发色以瓦片实测为准
        front = tiles["head_front"]
        spec["visibleTraits"]["skinTone"] = _dominant_color(front, (4, 12, 12, 16))
        spec["visibleTraits"]["hairColor"] = _dominant_color(front, (0, 0, 16, 2))
        spec["provenance"]["colors"] = "tile-measured"
        validate_character_spec(spec)
    neutral = compose_atlas(spec, tiles)
    expressions = {name: derive_expression(neutral, name) for name in EXPRESSIONS}
    spec["provenance"]["image"] = image_model
    spec["provenance"]["i2i"] = bool(reference)
    return TextureSet(
        person_id=person_id,
        spec=spec,
        neutral=neutral,
        expressions=expressions,
        palette=palette_from_spec(spec),
        model=image_model,
        vision_model=spec["provenance"].get("vision", "mock"),
        source_photos=photos,
        tiles=tiles,
    )
