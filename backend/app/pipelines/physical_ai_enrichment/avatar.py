"""K3 头像证据 -> 可发布体素 atlas 与固定身体 GLB。"""

from __future__ import annotations

import hashlib
import io
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw

from app.agents.llm import get_provider
from app.agents.utils.jsonish import extract_json

ATLAS_SIZE = 128
EXPRESSIONS = ("neutral", "happy", "surprised", "thinking")
HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
REPO_ROOT = Path(__file__).resolve().parents[4]
TEMPLATE_GLB = REPO_ROOT / "public/models/characters/photo-derived/voxel/host.glb"

# Blender UV 使用左下原点；Pillow 使用左上原点，_box() 负责转换。
UV_REGIONS = {
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

DEFAULT_TRAITS = {
    "hair_color": "#2A2928",
    "skin_tone": "#D59B78",
    "top_color": "#4A8170",
    "inner_color": "#E8CF88",
    "pants_color": "#465F5B",
    "shoe_color": "#72503B",
    "hair_style": "short",
    "glasses": False,
}


def _box(region: str) -> tuple[int, int, int, int]:
    x, y, width, height = UV_REGIONS[region]
    top = ATLAS_SIZE - y - height
    return x, top, x + width - 1, top + height - 1


def _color(value, fallback: str) -> str:
    return value.upper() if isinstance(value, str) and HEX_COLOR.fullmatch(value) else fallback


def _shade(value: str, factor: float) -> str:
    rgb = [int(value[index:index + 2], 16) for index in (1, 3, 5)]
    if factor >= 0:
        rgb = [round(channel + (255 - channel) * factor) for channel in rgb]
    else:
        rgb = [round(channel * (1 + factor)) for channel in rgb]
    return "#" + "".join(f"{max(0, min(255, channel)):02X}" for channel in rgb)


def _image_palette(image_bytes: bytes) -> dict:
    """只提取低维配色，不把照片像素投影到最终贴图。"""
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image.thumbnail((48, 48))
        colors = image.quantize(colors=8).convert("RGB").getcolors(48 * 48) or []
        ranked = [color for _count, color in sorted(colors, reverse=True)]
    except Exception:
        return {}
    if not ranked:
        return {}
    luminance = lambda rgb: sum(rgb) / 3
    darkest = min(ranked, key=luminance)
    brightest = max(ranked, key=luminance)
    middle = min(ranked, key=lambda rgb: abs(luminance(rgb) - 130))
    as_hex = lambda rgb: "#" + "".join(f"{channel:02X}" for channel in rgb)
    return {
        "hair_color": as_hex(darkest),
        "top_color": as_hex(middle),
        "inner_color": as_hex(brightest),
    }


def _vision_traits(image_bytes: bytes, mime: str, provider) -> dict:
    prompt = (
        "分析这张已授权人物头像，只总结制作 MC 像素角色所需的可见外观。"
        "禁止推断身份、民族、健康或性格。只输出 JSON："
        '{"hair_color":"#RRGGBB","skin_tone":"#RRGGBB",'
        '"top_color":"#RRGGBB","inner_color":"#RRGGBB",'
        '"pants_color":"#RRGGBB","shoe_color":"#RRGGBB",'
        '"hair_style":"short|center-part|long|pulled-back|tousled","glasses":false}'
    )
    try:
        response = provider.analyze_image(image_bytes, prompt, mime)
    except Exception:
        return {}
    if response.mock:
        return {}
    payload = extract_json(response.text)
    return payload if isinstance(payload, dict) else {}


def _traits(image_bytes: bytes, mime: str, provider) -> tuple[dict, str]:
    extracted = _vision_traits(image_bytes, mime, provider)
    fallback = {**DEFAULT_TRAITS, **_image_palette(image_bytes)}
    traits = {
        key: _color(extracted.get(key), fallback[key])
        for key in (
            "hair_color", "skin_tone", "top_color", "inner_color",
            "pants_color", "shoe_color",
        )
    }
    style = str(extracted.get("hair_style") or fallback["hair_style"]).lower()
    traits["hair_style"] = style if style in {
        "short", "center-part", "long", "pulled-back", "tousled",
    } else "short"
    traits["glasses"] = bool(extracted.get("glasses", fallback["glasses"]))
    return traits, response_model(provider, bool(extracted))


def response_model(provider, used_vision: bool) -> str:
    return provider.model if used_vision else "voxel-palette-rules.v1"


def _fill(draw: ImageDraw.ImageDraw, region: str, color: str) -> None:
    draw.rectangle(_box(region), fill=color)


def _paint_neutral(traits: dict) -> Image.Image:
    image = Image.new("RGBA", (ATLAS_SIZE, ATLAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    skin = traits["skin_tone"]
    shadow = _shade(skin, -0.16)
    hair = traits["hair_color"]
    ink = "#292524"
    mouth = "#7A4A49"

    for face in ("left", "front", "right", "back"):
        _fill(draw, f"head_{face}", skin)
    _fill(draw, "head_top", hair)
    _fill(draw, "head_bottom", shadow)

    fx, fy, _, _ = _box("head_front")
    draw.rectangle((fx, fy, fx + 15, fy + 3), fill=hair)
    style = traits["hair_style"]
    if style == "center-part":
        draw.rectangle((fx, fy + 3, fx + 4, fy + 6), fill=hair)
        draw.rectangle((fx + 11, fy + 3, fx + 15, fy + 6), fill=hair)
    elif style == "tousled":
        for offset, depth in ((0, 2), (3, 4), (7, 3), (11, 5), (14, 3)):
            draw.rectangle((fx + offset, fy + 3, fx + min(15, offset + 1), fy + depth), fill=hair)
    elif style in {"long", "pulled-back"}:
        draw.rectangle((fx, fy + 3, fx + 2, fy + 12), fill=hair)
        draw.rectangle((fx + 13, fy + 3, fx + 15, fy + 12), fill=hair)
    draw.rectangle((fx + 4, fy + 7, fx + 5, fy + 8), fill=ink)
    draw.rectangle((fx + 10, fy + 7, fx + 11, fy + 8), fill=ink)
    draw.rectangle((fx + 7, fy + 12, fx + 8, fy + 12), fill=mouth)
    if traits["glasses"]:
        frame = "#242A29"
        draw.rectangle((fx + 2, fy + 5, fx + 6, fy + 9), outline=frame)
        draw.rectangle((fx + 9, fy + 5, fx + 13, fy + 9), outline=frame)
        draw.line((fx + 6, fy + 7, fx + 9, fy + 7), fill=frame)

    for side in ("left", "right"):
        sx, sy, ex, _ = _box(f"head_{side}")
        draw.rectangle((sx, sy, ex, sy + 4), fill=hair)
        if style == "long":
            draw.rectangle((sx, sy + 4, sx + 4, sy + 15), fill=hair)
    bx, by, bex, _ = _box("head_back")
    back_bottom = by + 15 if style == "long" else by + 8
    draw.rectangle((bx, by, bex, back_bottom), fill=hair)
    if style == "pulled-back":
        draw.rectangle((bx + 5, by + 8, bx + 10, by + 13), fill=hair)

    top = traits["top_color"]
    inner = traits["inner_color"]
    pants = traits["pants_color"]
    shoes = traits["shoe_color"]
    for face in ("left", "front", "right", "back", "top", "bottom"):
        _fill(draw, f"torso_{face}", top)
        _fill(draw, f"arm_{face}", top)
        _fill(draw, f"leg_{face}", pants)
    tx, ty, _, tey = _box("torso_front")
    draw.rectangle((tx + 5, ty + 2, tx + 10, tey - 2), fill=inner)
    for face in ("left", "front", "right", "back"):
        lx, ly, lex, _ = _box(f"leg_{face}")
        draw.rectangle((lx, ly + 19, lex, ly + 23), fill=shoes)
    return image


def _expression(neutral: Image.Image, state: str, traits: dict) -> Image.Image:
    image = neutral.copy()
    if state == "neutral":
        return image
    draw = ImageDraw.Draw(image)
    fx, fy, _, _ = _box("head_front")
    skin = traits["skin_tone"]
    ink = "#44302F"
    accent = "#7E464C"
    draw.rectangle((fx + 3, fy + 10, fx + 12, fy + 14), fill=skin)
    if state == "happy":
        draw.point((fx + 6, fy + 12), fill=accent)
        draw.point((fx + 7, fy + 13), fill=accent)
        draw.point((fx + 8, fy + 13), fill=accent)
        draw.point((fx + 9, fy + 12), fill=accent)
    elif state == "surprised":
        draw.rectangle((fx + 7, fy + 11, fx + 8, fy + 13), fill=ink)
    elif state == "thinking":
        draw.line((fx + 6, fy + 12, fx + 10, fy + 11), fill=accent)
        draw.line((fx + 9, fy + 5, fx + 12, fy + 4), fill=ink)
    return image


def _png_bytes(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue()


class VoxelAvatarGenerator:
    def __init__(self, store, vision_provider=None, template_glb: Path = TEMPLATE_GLB):
        self.store = store
        self.vision_provider = vision_provider or get_provider("vision")
        self.template_glb = Path(template_glb)

    def generate(
        self, *, person_id: str, image_bytes: bytes, mime: str, source_ref: str,
    ) -> dict:
        digest = hashlib.sha256(image_bytes).hexdigest()[:16]
        generation_id = f"{person_id}-{digest}"
        traits, model = _traits(image_bytes, mime, self.vision_provider)
        neutral = _paint_neutral(traits)
        expression_refs = {}
        for state in EXPRESSIONS:
            expression_refs[state] = self.store.write_derived_asset(
                "characters", generation_id, f"{state}.png",
                _png_bytes(_expression(neutral, state, traits)),
            )
        if not self.template_glb.is_file():
            raise FileNotFoundError(f"体素模板不存在：{self.template_glb}")
        model_ref = self.store.write_derived_asset(
            "characters", generation_id, "avatar.glb", self.template_glb.read_bytes(),
        )
        manifest = {
            "schema": "echo-character-asset.v1",
            "person_id": person_id,
            "generation_id": generation_id,
            "model_ref": model_ref,
            "texture_ref": expression_refs["neutral"],
            "expression_refs": expression_refs,
            "source_facts": [source_ref],
            "traits": traits,
            "model": model,
            "template": "character.photo.host.voxel.v1",
        }
        manifest_ref = self.store.write_derived_asset(
            "characters", generation_id, "manifest.json",
            json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8"),
        )
        return {**manifest, "manifest_ref": manifest_ref}
