"""体素贴图生成：照片 → CharacterSpec → AI 像素瓦片 → 固定 UV atlas → 表情（FR-1.5/P-6）。

目的：ARCHITECTURE.md §5a 人物生成线的第一段。可见特征由 vision 角色（qwen-vl）
      总结为受校验的 CharacterSpec（PHOTO_CHARACTER_PIPELINES.md「所需数据」）；
      头部正面/背面像素瓦片由 image 角色（commonstack gpt-image）按 spec 生成，
      PIL BOX 重采样 + 定色量化锁像素风（无抖动、无 AA 涂抹）；确定性合成器把
      瓦片 + spec 色块拼进 128x128 固定 UV atlas（布局与
      blender/build_photo_character_modes.py 的 VOXEL_REGIONS 完全一致）；
      表情 atlas 由程序像素编辑派生（复刻
      blender/build_character_expression_textures.py 的 delta，参数化锚点）。
输入：generate(photos, person_id) —— 人物照片路径列表 + 槽位 id。
输出：TextureSet（spec / 128x128 neutral atlas / 4 张表情 atlas / palette /
      生成溯源）。任何外部模型不可用都降级为全程序化 atlas（model="mock"），
      绝不抛异常。
验收：tests/test_voxel_pipeline.py —— spec 校验、atlas 布局不变量（128x128、
      区域不重叠、无透明渗色）、表情 delta 只触脸部区域、mock 确定性。

坐标约定：VOXEL_REGIONS 沿用 Blender 画布坐标（y 向上）；PNG 落盘为 PIL 坐标
（y 向下），经 _to_pil_rect 翻转，与既有 public/textures/characters/voxel/*_atlas.png
逐像素同布局（脸部 = PIL (16,16)-(32,32)）。身体区域纯调色板驱动（可靠性优先），
AI 生成只负责头部正面/背面两块 16x16 瓦片。
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


def generate_tiles(spec: dict, image=None, cache_dir=None) -> tuple[dict, str]:
    """对头正面/背面调用 image 角色；逐瓦片降级。返回 (tiles, 使用的模型名)。

    cache_dir 提供时按 prompt+model 的 sha256 缓存原始 PNG（生图贵且慢，
    复跑/调 prompt 时省钱）。
    """
    try:
        provider = image or llm_base.get_provider("image")
    except KeyError:
        return {}, "mock"
    prompts = build_tile_prompts(spec)
    tiles, model_used = {}, "mock"
    for name, prompt in prompts.items():
        png_bytes = None
        cache_path = None
        if cache_dir is not None:
            key = hashlib.sha256(f"{provider.model}|{prompt}".encode()).hexdigest()
            cache_path = Path(cache_dir) / f"tile_{key}.png"
            if cache_path.exists():
                png_bytes = cache_path.read_bytes()
        if png_bytes is None:
            png_bytes = provider.generate_image(prompt)
            if cache_path is not None:
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                cache_path.write_bytes(png_bytes)
        record = provider.call_log[-1] if provider.call_log else None
        if record is not None and record.mock:
            continue  # mock 占位图不进 atlas，宁可走程序化瓦片
        try:
            tiles[name] = postprocess_tile(png_bytes)
            model_used = provider.model
        except Exception:
            continue  # 单瓦片解析失败不拖垮整人
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

    # 侧面：肤底 + 发带（高度取正面实测）+ 耳；有正面瓦片时复制边缘列保持鬓角连续
    for side in ("left", "right"):
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
             cache_dir=None) -> TextureSet:
    """照片 → CharacterSpec → AI 像素瓦片 → 固定 UV atlas → 四表情。

    全流程降级链：vision 失败 → 设计补全 spec；生图失败 → 程序化瓦片；
    任何分支都产出合法 TextureSet，绝不抛异常。
    """
    photos = [str(p) for p in photo_paths]
    spec = summarize_visible_traits(photos, person_id, vision=vision,
                                    cache_dir=cache_dir)
    tiles, image_model = generate_tiles(spec, image=image, cache_dir=cache_dir)
    neutral = compose_atlas(spec, tiles)
    expressions = {name: derive_expression(neutral, name) for name in EXPRESSIONS}
    spec["provenance"]["image"] = image_model
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
