from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = PROJECT_ROOT.parent
SOURCE_SPEC_PATH = WORKSPACE_ROOT / "scenes" / "data" / "character_specs.json"
MODEL_ROOT = PROJECT_ROOT / "public" / "models" / "characters" / "photo-derived"
TEXTURE_ROOT = PROJECT_ROOT / "public" / "textures" / "characters"
EXPORT_ROOT = PROJECT_ROOT / "exports"
RENDER_ROOT = PROJECT_ROOT / "renders"
BLENDER_ROOT = PROJECT_ROOT / "blender"

STORYBOOK_SIZE = 256
VOXEL_SIZE = 128
STORY_TILE_SIZE = 64
BASE_HEIGHT_M = 1.65
ROOT_NODE_NAME = "ROOT_PhotoCharacter"

STORY_TILES = {
    "skin": (0, 0, 64, 64),
    "hair": (64, 0, 64, 64),
    "top": (128, 0, 64, 64),
    "inner": (192, 0, 64, 64),
    "accent": (0, 64, 64, 64),
    "pants": (64, 64, 64, 64),
    "shoes": (128, 64, 64, 64),
    "sole": (192, 64, 64, 64),
    "glasses": (0, 128, 64, 64),
    "face_dark": (64, 128, 64, 64),
    "skin_shadow": (128, 128, 64, 64),
    "cloth_light": (192, 128, 64, 64),
    "accent2": (0, 192, 64, 64),
    "host_mark": (64, 192, 64, 64),
    "unused_1": (128, 192, 64, 64),
    "unused_2": (192, 192, 64, 64),
}

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


def hex_rgb(value: str) -> tuple[float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) / 255.0 for index in (0, 2, 4))


def rgb_hex(rgb: tuple[float, float, float]) -> str:
    return "#" + "".join(f"{max(0, min(255, round(channel * 255))):02X}" for channel in rgb)


def shade(value: str, amount: float) -> str:
    color = hex_rgb(value)
    if amount >= 0:
        mixed = tuple(channel + (1.0 - channel) * amount for channel in color)
    else:
        mixed = tuple(channel * (1.0 + amount) for channel in color)
    return rgb_hex(mixed)


def color_value(container: dict | None, key: str, default: str) -> str:
    if not container:
        return default
    item = container.get(key)
    if not item:
        return default
    value = item.get("value", item) if isinstance(item, dict) else item
    if isinstance(value, dict):
        primary = value.get("primary_color") or value.get("color")
        if isinstance(primary, dict) and primary.get("srgb"):
            return primary["srgb"]
    return default


def nested_value(container: dict | None, key: str, default=None):
    if not container:
        return default
    item = container.get(key)
    if item is None:
        return default
    if isinstance(item, dict) and "value" in item:
        return item["value"]
    return item


@dataclass(frozen=True)
class PersonSpec:
    person_id: str
    source_alias: str
    source_kind: str
    head_shape: str
    head_ratio: float
    jaw_ratio: float
    chin: str
    hair: str
    hair_color: str
    glasses: bool
    glasses_style: str
    build: str
    height_scale: float
    shoulder_scale: float
    outerwear: str
    upper: str
    top_color: str
    inner_color: str
    accent_color: str
    accent2_color: str
    lower: str
    pants_color: str
    shoe_color: str
    sole_color: str


def load_person_specs(source_spec_path: Path) -> list[PersonSpec]:
    source = json.loads(source_spec_path.read_text(encoding="utf-8"))
    specs: list[PersonSpec] = []
    for character in source["characters"]:
        outfit = character.get("outfit", {})
        outer = nested_value(outfit, "outerwear") or {}
        upper = nested_value(outfit, "upper") or {}
        lower = nested_value(outfit, "lower") or {}
        shoes = nested_value(outfit, "shoes") or {}
        top_color = (
            (outer.get("primary_color") or {}).get("srgb")
            or (upper.get("primary_color") or {}).get("srgb")
            or "#627B70"
        )
        inner_color = (upper.get("primary_color") or {}).get("srgb") or top_color
        accent_color = (
            (upper.get("secondary_color") or {}).get("srgb")
            or (upper.get("collar_color") or {}).get("srgb")
            or shade(top_color, 0.18)
        )
        optional_accent = upper.get("optional_nonsemantic_accent") or {}
        optional_colors = optional_accent.get("colors") or []
        accent2 = optional_colors[1] if len(optional_colors) > 1 else shade(accent_color, 0.22)
        hair_color = nested_value(character.get("hair"), "color", {})
        if isinstance(hair_color, dict):
            hair_color = hair_color.get("srgb", "#20201F")
        glasses_present = bool(nested_value(character.get("glasses"), "present", False))
        frame = nested_value(character.get("glasses"), "frame_preset", "none") or "none"
        specs.append(
            PersonSpec(
                person_id=character["person_id"],
                source_alias=character.get("v01_implementation_alias", character["person_id"]),
                source_kind="photo-derived-anonymous",
                head_shape=str(nested_value(character.get("head"), "shape_preset", "soft_oval")),
                head_ratio=float(nested_value(character.get("head"), "length_to_width", 1.08)),
                jaw_ratio=float(nested_value(character.get("head"), "jaw_width_ratio", 0.8)),
                chin=str(nested_value(character.get("head"), "chin_preset", "soft_round")),
                hair=str(nested_value(character.get("hair"), "preset", "short_tousled")),
                hair_color=str(hair_color),
                glasses=glasses_present,
                glasses_style=str(frame),
                build=str(nested_value(character.get("body"), "build_preset", "average_straight")),
                height_scale=float(nested_value(character.get("body"), "height_scale", 1.0)),
                shoulder_scale=float(nested_value(character.get("body"), "shoulder_scale", 1.0)),
                outerwear=str(outer.get("preset", "none")),
                upper=str(upper.get("preset", "crewneck_tee")),
                top_color=str(top_color),
                inner_color=str(inner_color),
                accent_color=str(accent_color),
                accent2_color=str(accent2),
                lower=str(lower.get("preset", "straight_trousers")),
                pants_color=str((lower.get("primary_color") or {}).get("srgb", "#46545A")),
                shoe_color=str((shoes.get("primary_color") or {}).get("srgb", "#DAD5C8")),
                sole_color=str(
                    (shoes.get("sole_color") or shoes.get("secondary_color") or {}).get(
                        "srgb", "#D8D5CB"
                    )
                ),
            )
        )

    specs.append(
        PersonSpec(
            person_id="host",
            source_alias="GENERIC_HOST",
            source_kind="design-default-non-photo",
            head_shape="soft_oval",
            head_ratio=1.06,
            jaw_ratio=0.80,
            chin="soft_round",
            hair="short_side_swept",
            hair_color="#2C342F",
            glasses=False,
            glasses_style="none",
            build="average_straight",
            height_scale=1.0,
            shoulder_scale=1.0,
            outerwear="lightweight_open_jacket",
            upper="crewneck_tee",
            top_color="#4A8170",
            inner_color="#E8CF88",
            accent_color="#C86E52",
            accent2_color="#5A9FA5",
            lower="straight_trousers",
            pants_color="#465F5B",
            shoe_color="#72503B",
            sole_color="#D9D5C6",
        )
    )
    return specs


class Canvas:
    def __init__(self, width: int, height: int, background: str = "#000000", alpha: float = 0.0):
        self.width = width
        self.height = height
        rgb = hex_rgb(background)
        self.pixels = [*rgb, alpha] * (width * height)

    def blend(self, x: int, y: int, color: str, alpha: float = 1.0) -> None:
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        index = (y * self.width + x) * 4
        source = hex_rgb(color)
        target_alpha = self.pixels[index + 3]
        output_alpha = alpha + target_alpha * (1.0 - alpha)
        if output_alpha <= 0:
            return
        for channel in range(3):
            self.pixels[index + channel] = (
                source[channel] * alpha
                + self.pixels[index + channel] * target_alpha * (1.0 - alpha)
            ) / output_alpha
        self.pixels[index + 3] = output_alpha

    def rect(self, x: int, y: int, width: int, height: int, color: str, alpha: float = 1.0) -> None:
        for py in range(y, y + height):
            for px in range(x, x + width):
                self.blend(px, py, color, alpha)

    def ellipse(self, cx: float, cy: float, rx: float, ry: float, color: str, alpha: float = 1.0) -> None:
        min_x = math.floor(cx - rx)
        max_x = math.ceil(cx + rx)
        min_y = math.floor(cy - ry)
        max_y = math.ceil(cy + ry)
        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                if ((x - cx) / max(rx, 0.001)) ** 2 + ((y - cy) / max(ry, 0.001)) ** 2 <= 1:
                    self.blend(x, y, color, alpha)

    def line(self, x0: int, y0: int, x1: int, y1: int, color: str, width: int = 1) -> None:
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for step in range(steps + 1):
            t = step / steps
            x = round(x0 + (x1 - x0) * t)
            y = round(y0 + (y1 - y0) * t)
            half = width // 2
            self.rect(x - half, y - half, width, width, color)


def stable_seed(*parts: str) -> int:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big")


def paint_story_tile(canvas: Canvas, rect: tuple[int, int, int, int], color: str, seed: int) -> None:
    x, y, width, height = rect
    canvas.rect(x, y, width, height, color)
    rng = random.Random(seed)
    light = shade(color, 0.16)
    dark = shade(color, -0.13)
    for index in range(12):
        cx = rng.uniform(x - 4, x + width + 4)
        cy = rng.uniform(y - 4, y + height + 4)
        rx = rng.uniform(6, 22)
        ry = rng.uniform(2, 7)
        angle_color = light if index % 2 == 0 else dark
        canvas.ellipse(cx, cy, rx, ry, angle_color, rng.uniform(0.08, 0.18))
    for _ in range(18):
        sx = rng.randrange(x, x + width)
        sy = rng.randrange(y, y + height)
        canvas.line(
            sx,
            sy,
            min(x + width - 1, sx + rng.randrange(5, 18)),
            min(y + height - 1, sy + rng.randrange(-2, 3)),
            light if rng.random() > 0.5 else dark,
            1,
        )


def save_canvas(canvas: Canvas, path: Path, image_name: str, interpolation: str) -> bpy.types.Image:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = bpy.data.images.new(image_name, width=canvas.width, height=canvas.height, alpha=True)
    image.colorspace_settings.name = "sRGB"
    image.pixels.foreach_set(canvas.pixels)
    image.update()
    image.filepath_raw = str(path)
    image.file_format = "PNG"
    image.save()
    image.pack()
    image["sampler_interpolation"] = interpolation
    return image


def build_storybook_atlas(spec: PersonSpec) -> tuple[Path, bpy.types.Image]:
    canvas = Canvas(STORYBOOK_SIZE, STORYBOOK_SIZE, "#F0E9D8", 1.0)
    colors = {
        "skin": "#D59B78",
        "hair": spec.hair_color,
        "top": spec.top_color,
        "inner": spec.inner_color,
        "accent": spec.accent_color,
        "pants": spec.pants_color,
        "shoes": spec.shoe_color,
        "sole": spec.sole_color,
        "glasses": "#242A29",
        "face_dark": "#302B2A",
        "skin_shadow": "#B9785D",
        "cloth_light": shade(spec.top_color, 0.24),
        "accent2": spec.accent2_color,
        "host_mark": "#E7C968",
        "unused_1": "#789372",
        "unused_2": "#C8785F",
    }
    for semantic, rect in STORY_TILES.items():
        paint_story_tile(
            canvas,
            rect,
            colors[semantic],
            stable_seed(spec.person_id, "storybook", semantic),
        )
    texture_path = TEXTURE_ROOT / "storybook" / f"{spec.person_id}_atlas.png"
    image = save_canvas(
        canvas,
        texture_path,
        f"IMG_{spec.person_id}_StorybookAtlas",
        "Linear",
    )
    return texture_path, image


def region_rect(canvas: Canvas, region_name: str, color: str) -> None:
    x, y, width, height = VOXEL_REGIONS[region_name]
    canvas.rect(x, y, width, height, color)


def paint_voxel_head(canvas: Canvas, spec: PersonSpec) -> None:
    skin = "#D59B78"
    skin_shadow = "#B9785D"
    hair = spec.hair_color
    eye = "#292524"
    mouth = "#7A4A49"

    for face in ("left", "front", "right", "back"):
        region_rect(canvas, f"head_{face}", skin)
    region_rect(canvas, "head_top", hair)
    region_rect(canvas, "head_bottom", skin_shadow)

    fx, fy, _, _ = VOXEL_REGIONS["head_front"]
    if "full_fringe" in spec.hair:
        canvas.rect(fx, fy + 11, 16, 5, hair)
        for offset, depth in ((1, 3), (4, 5), (7, 4), (10, 6), (13, 4)):
            canvas.rect(fx + offset, fy + 16 - depth, 3, depth - 2, hair)
    elif "center_part" in spec.hair:
        canvas.rect(fx, fy + 12, 16, 4, hair)
        canvas.rect(fx, fy + 9, 5, 4, hair)
        canvas.rect(fx + 11, fy + 9, 5, 4, hair)
        canvas.rect(fx + 7, fy + 13, 2, 3, shade(skin, -0.02))
    elif "tousled" in spec.hair:
        canvas.rect(fx, fy + 12, 16, 4, hair)
        for offset, depth in ((0, 2), (3, 4), (7, 3), (11, 5), (14, 3)):
            canvas.rect(fx + offset, fy + 12 - depth, 2, depth, hair)
    else:
        canvas.rect(fx, fy + 12, 16, 4, hair)
        canvas.rect(fx, fy + 10, 7, 2, hair)

    canvas.rect(fx + 4, fy + 7, 2, 2, eye)
    canvas.rect(fx + 10, fy + 7, 2, 2, eye)
    canvas.rect(fx + 7, fy + 3, 2, 1, mouth)
    canvas.rect(fx + 7, fy + 5, 2, 1, skin_shadow)

    if spec.glasses:
        frame = "#242A29"
        for gx in (fx + 2, fx + 9):
            canvas.rect(gx, fy + 6, 5, 4, frame)
            canvas.rect(gx + 1, fy + 7, 3, 2, skin)
            canvas.rect(gx + 2, fy + 7, 1, 1, eye)
        canvas.rect(fx + 7, fy + 8, 2, 1, frame)

    for side_name, direction in (("left", -1), ("right", 1)):
        sx, sy, _, _ = VOXEL_REGIONS[f"head_{side_name}"]
        canvas.rect(sx, sy + 11, 16, 5, hair)
        if "long_straight" in spec.hair:
            canvas.rect(sx + (0 if direction < 0 else 10), sy, 6, 16, hair)
        elif "pulled_back" in spec.hair:
            canvas.rect(sx + (0 if direction < 0 else 12), sy + 6, 4, 6, hair)
        canvas.rect(sx + 6, sy + 5, 4, 4, skin_shadow)
        canvas.rect(sx + 7, sy + 6, 2, 2, skin)

    bx, by, _, _ = VOXEL_REGIONS["head_back"]
    back_height = 16 if "long_straight" in spec.hair else 8
    canvas.rect(bx, by + 16 - back_height, 16, back_height, hair)
    if "pulled_back" in spec.hair:
        canvas.rect(bx + 5, by + 2, 6, 6, hair)
        canvas.rect(bx + 7, by, 2, 3, shade(hair, -0.12))


def paint_voxel_body(canvas: Canvas, spec: PersonSpec) -> None:
    top = spec.top_color
    inner = spec.inner_color
    accent = spec.accent_color
    skin = "#D59B78"
    pants = spec.pants_color
    shoes = spec.shoe_color
    sole = spec.sole_color
    long_sleeve = "jacket" in spec.outerwear or "hood" in spec.outerwear
    has_outer = spec.outerwear != "none"
    is_shorts = "shorts" in spec.lower

    for face in ("left", "front", "right", "back", "top", "bottom"):
        region_rect(canvas, f"torso_{face}", top)
    tx, ty, tw, th = VOXEL_REGIONS["torso_front"]
    if has_outer:
        canvas.rect(tx + 5, ty + 2, 6, th - 4, inner)
        canvas.line(tx + 4, ty + 2, tx + 7, ty + th - 2, accent, 1)
        canvas.line(tx + 11, ty + 2, tx + 8, ty + th - 2, accent, 1)
    if "polo" in spec.upper or "collared" in spec.upper:
        canvas.rect(tx + 4, ty + th - 5, 8, 3, accent)
        canvas.rect(tx + 7, ty + th - 8, 2, 4, shade(accent, -0.12))
    if spec.person_id == "person_02":
        canvas.rect(tx, ty + th - 6, 4, 6, accent)
        canvas.rect(tx + 12, ty + th - 6, 4, 6, accent)
    if spec.person_id == "person_04":
        gold = "#D0A737"
        cyan = "#5A9FA5"
        canvas.rect(tx + 4, ty + 11, 3, 3, gold)
        canvas.rect(tx + 6, ty + 9, 3, 3, gold)
        canvas.rect(tx + 9, ty + 12, 3, 3, cyan)
        canvas.rect(tx + 8, ty + 8, 2, 3, cyan)
    if spec.person_id == "host":
        canvas.rect(tx + 5, ty + 10, 6, 2, "#E7C968")
        canvas.rect(tx + 7, ty + 7, 2, 8, "#E7C968")

    for face in ("left", "front", "right", "back", "top", "bottom"):
        region_rect(canvas, f"arm_{face}", top if long_sleeve else skin)
    if not long_sleeve:
        for face in ("left", "front", "right", "back"):
            x, y, width, _ = VOXEL_REGIONS[f"arm_{face}"]
            canvas.rect(x, y + 14, width, 10, top)

    for face in ("left", "front", "right", "back", "top", "bottom"):
        region_rect(canvas, f"leg_{face}", pants)
    for face in ("left", "front", "right", "back"):
        x, y, width, _ = VOXEL_REGIONS[f"leg_{face}"]
        if is_shorts:
            canvas.rect(x, y + 13, width, 11, pants)
            canvas.rect(x, y + 5, width, 8, skin)
        canvas.rect(x, y, width, 5, shoes)
        canvas.rect(x, y, width, 1, sole)


def build_voxel_atlas(spec: PersonSpec) -> tuple[Path, bpy.types.Image]:
    canvas = Canvas(VOXEL_SIZE, VOXEL_SIZE, "#000000", 0.0)
    paint_voxel_head(canvas, spec)
    paint_voxel_body(canvas, spec)
    texture_path = TEXTURE_ROOT / "voxel" / f"{spec.person_id}_atlas.png"
    image = save_canvas(
        canvas,
        texture_path,
        f"IMG_{spec.person_id}_VoxelAtlas",
        "Closest",
    )
    return texture_path, image


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)


def parent_object(obj: bpy.types.Object, parent: bpy.types.Object) -> bpy.types.Object:
    obj.parent = parent
    return obj


def make_atlas_material(name: str, image: bpy.types.Image, interpolation: str) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (1.0, 1.0, 1.0, 1.0)
    material.use_backface_culling = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.94
    bsdf.inputs["Metallic"].default_value = 0.0
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "CharacterAtlas"
    texture.image = image
    texture.interpolation = interpolation
    links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    material["atlas_size"] = image.size[0]
    material["sampler_interpolation"] = interpolation
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.append(material)
    if hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = False


def apply_rect_uv(
    obj: bpy.types.Object,
    rect: tuple[int, int, int, int],
    atlas_size: int,
) -> None:
    mesh = obj.data
    uv_layer = mesh.uv_layers.active or mesh.uv_layers.new(name="CharacterAtlasUV")
    coordinates = [vertex.co for vertex in mesh.vertices]
    mins = Vector((
        min(co.x for co in coordinates),
        min(co.y for co in coordinates),
        min(co.z for co in coordinates),
    ))
    maxs = Vector((
        max(co.x for co in coordinates),
        max(co.y for co in coordinates),
        max(co.z for co in coordinates),
    ))
    size = maxs - mins
    x, y, width, height = rect
    inset = 1.0

    def normalize(value: float, minimum: float, span: float) -> float:
        return 0.5 if span < 1e-7 else (value - minimum) / span

    for polygon in mesh.polygons:
        normal = polygon.normal
        axis = max(range(3), key=lambda index: abs(normal[index]))
        for loop_index in polygon.loop_indices:
            co = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            if axis == 0:
                u = normalize(co.y, mins.y, size.y)
                v = normalize(co.z, mins.z, size.z)
                if normal.x > 0:
                    u = 1.0 - u
            elif axis == 1:
                u = normalize(co.x, mins.x, size.x)
                v = normalize(co.z, mins.z, size.z)
                if normal.y > 0:
                    u = 1.0 - u
            else:
                u = normalize(co.x, mins.x, size.x)
                v = normalize(co.y, mins.y, size.y)
                if normal.z < 0:
                    v = 1.0 - v
            uv_layer.data[loop_index].uv = (
                (x + inset + u * max(1.0, width - inset * 2)) / atlas_size,
                (y + inset + v * max(1.0, height - inset * 2)) / atlas_size,
            )


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    semantic: str,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    bevel: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add()
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("SingleFacetBevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.location = location
    obj.rotation_euler = rotation
    assign_material(obj, material)
    apply_rect_uv(obj, STORY_TILES[semantic], STORYBOOK_SIZE)
    move_to_collection(obj, collection)
    return parent_object(obj, parent)


def add_ico(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    semantic: str,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    subdivisions: int = 1,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.location = location
    assign_material(obj, material)
    apply_rect_uv(obj, STORY_TILES[semantic], STORYBOOK_SIZE)
    move_to_collection(obj, collection)
    return parent_object(obj, parent)


def add_prism(
    name: str,
    location: tuple[float, float, float],
    radius_bottom: float,
    radius_top: float,
    depth: float,
    y_scale: float,
    semantic: str,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    vertices: int = 7,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale.y = y_scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.location = location
    obj.rotation_euler = rotation
    assign_material(obj, material)
    apply_rect_uv(obj, STORY_TILES[semantic], STORYBOOK_SIZE)
    move_to_collection(obj, collection)
    return parent_object(obj, parent)


def add_tapered_box(
    name: str,
    bottom_z: float,
    top_z: float,
    bottom_width: float,
    top_width: float,
    bottom_depth: float,
    top_depth: float,
    semantic: str,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    vertices = [
        (-bottom_width / 2, -bottom_depth / 2, bottom_z),
        (bottom_width / 2, -bottom_depth / 2, bottom_z),
        (bottom_width / 2, bottom_depth / 2, bottom_z),
        (-bottom_width / 2, bottom_depth / 2, bottom_z),
        (-top_width / 2, -top_depth / 2, top_z),
        (top_width / 2, -top_depth / 2, top_z),
        (top_width / 2, top_depth / 2, top_z),
        (-top_width / 2, top_depth / 2, top_z),
    ]
    faces = [
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
        (4, 5, 6, 7),
        (3, 2, 1, 0),
    ]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    apply_rect_uv(obj, STORY_TILES[semantic], STORYBOOK_SIZE)
    return parent_object(obj, parent)


def add_triangle_prism(
    name: str,
    points_xz: tuple[tuple[float, float], tuple[float, float], tuple[float, float]],
    front_y: float,
    back_y: float,
    semantic: str,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    vertices = [(x, front_y, z) for x, z in points_xz] + [(x, back_y, z) for x, z in points_xz]
    faces = [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    apply_rect_uv(obj, STORY_TILES[semantic], STORYBOOK_SIZE)
    return parent_object(obj, parent)


def build_storybook_head(
    spec: PersonSpec,
    root: bpy.types.Object,
    collection: bpy.types.Collection,
    material: bpy.types.Material,
) -> None:
    head_center = 1.43
    face_width = 0.245 * (1.08 / max(spec.head_ratio, 0.9))
    face_height = 0.23 * (spec.head_ratio / 1.08)
    face_depth = 0.215
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0)
    head = bpy.context.object
    head.name = "GEO_Head"
    for vertex in head.data.vertices:
        if vertex.co.z < 0:
            t = min(1.0, abs(vertex.co.z))
            vertex.co.x *= (1.0 - t) + t * spec.jaw_ratio
            if vertex.co.z < -0.55:
                chin_scale = 0.68 if "narrow" in spec.chin else 0.80
                vertex.co.x *= chin_scale
    head.scale = (face_width, face_depth, face_height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    head.location = (0.0, 0.0, head_center)
    assign_material(head, material)
    apply_rect_uv(head, STORY_TILES["skin"], STORYBOOK_SIZE)
    move_to_collection(head, collection)
    parent_object(head, root)

    for side in (-1, 1):
        add_ico(
            f"GEO_Ear_{'L' if side < 0 else 'R'}",
            (side * face_width * 0.97, 0.0, head_center),
            (0.027, 0.018, 0.042),
            "skin",
            material,
            collection,
            root,
            1,
        )
    front_y = -face_depth * 0.96
    for side in (-1, 1):
        add_ico(
            f"GEO_Eye_{'L' if side < 0 else 'R'}",
            (side * face_width * 0.41, front_y - 0.008, head_center + 0.016),
            (0.016, 0.009, 0.012),
            "face_dark",
            material,
            collection,
            root,
            1,
        )
    add_prism(
        "GEO_Nose",
        (0.0, front_y - 0.018, head_center - 0.025),
        0.018,
        0.012,
        0.042,
        0.65,
        "skin_shadow",
        material,
        collection,
        root,
        vertices=4,
        rotation=(math.pi / 2, 0.0, 0.0),
    )
    add_box(
        "GEO_Mouth",
        (0.0, front_y - 0.012, head_center - 0.083),
        (0.052, 0.009, 0.008),
        "face_dark",
        material,
        collection,
        root,
    )

    cap_scale = (face_width * 1.08, face_depth * 0.98, face_height * 0.78)
    if "tousled" in spec.hair:
        cap_scale = (cap_scale[0] * 1.08, cap_scale[1] * 1.06, cap_scale[2] * 1.12)
    add_ico(
        "GEO_Hair_Cap",
        (0.0, 0.025, head_center + face_height * 0.50),
        cap_scale,
        "hair",
        material,
        collection,
        root,
        2,
    )
    front = -face_depth - 0.018
    back = front + 0.038
    if "center_part" in spec.hair:
        add_triangle_prism(
            "GEO_Hair_Fringe_L",
            ((-face_width, head_center + 0.12), (-0.01, head_center + 0.16), (-0.055, head_center + 0.01)),
            front,
            back,
            "hair",
            material,
            collection,
            root,
        )
        add_triangle_prism(
            "GEO_Hair_Fringe_R",
            ((0.01, head_center + 0.16), (face_width, head_center + 0.12), (0.055, head_center + 0.01)),
            front,
            back,
            "hair",
            material,
            collection,
            root,
        )
    else:
        divisions = (-0.98, -0.48, -0.05, 0.38, 0.76, 0.98)
        for index in range(len(divisions) - 1):
            x0 = face_width * divisions[index]
            x1 = face_width * divisions[index + 1]
            tip = head_center + (0.00 if index % 2 else 0.035)
            add_triangle_prism(
                f"GEO_Hair_Fringe_{index + 1:02d}",
                ((x0, head_center + 0.135), (x1, head_center + 0.14), ((x0 + x1) * 0.5, tip)),
                front,
                back,
                "hair",
                material,
                collection,
                root,
            )
    if "long_straight" in spec.hair:
        for side in (-1, 1):
            add_ico(
                f"GEO_Hair_Long_{'L' if side < 0 else 'R'}",
                (side * face_width * 0.78, 0.055, head_center - 0.20),
                (face_width * 0.44, face_depth * 0.62, 0.32),
                "hair",
                material,
                collection,
                root,
                1,
            )
        add_ico(
            "GEO_Hair_Long_Back",
            (0.0, face_depth * 0.66, head_center - 0.19),
            (face_width * 0.9, face_depth * 0.48, 0.33),
            "hair",
            material,
            collection,
            root,
            1,
        )
    elif "pulled_back" in spec.hair:
        add_ico(
            "GEO_Hair_Tie",
            (0.0, face_depth * 1.03, head_center - 0.045),
            (0.078, 0.06, 0.082),
            "hair",
            material,
            collection,
            root,
            1,
        )
    elif "tousled" in spec.hair:
        for index, (x, z, scale) in enumerate(((-0.1, 1.62, 0.064), (0.0, 1.64, 0.072), (0.1, 1.61, 0.06))):
            add_ico(
                f"GEO_Hair_Volume_{index + 1:02d}",
                (x, -0.01, z),
                (scale, scale * 0.82, scale * 0.9),
                "hair",
                material,
                collection,
                root,
                1,
            )

    if spec.glasses:
        eye_x = face_width * 0.42
        y = front_y - 0.03
        z = head_center + 0.016
        if "round" in spec.glasses_style and "rectangle" not in spec.glasses_style:
            for side in (-1, 1):
                bpy.ops.mesh.primitive_torus_add(
                    major_segments=8,
                    minor_segments=4,
                    major_radius=0.052,
                    minor_radius=0.006,
                    location=(side * eye_x, y, z),
                    rotation=(math.pi / 2, 0.0, 0.0),
                )
                frame = bpy.context.object
                frame.name = f"GEO_Glasses_{'L' if side < 0 else 'R'}"
                frame.scale.z = 0.9
                bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
                assign_material(frame, material)
                apply_rect_uv(frame, STORY_TILES["glasses"], STORYBOOK_SIZE)
                move_to_collection(frame, collection)
                parent_object(frame, root)
        else:
            for side in (-1, 1):
                x = side * eye_x
                for suffix, dims, loc in (
                    ("Top", (0.10, 0.012, 0.008), (x, y, z + 0.031)),
                    ("Bottom", (0.10, 0.012, 0.008), (x, y, z - 0.031)),
                    ("Outer", (0.008, 0.012, 0.064), (x + side * 0.05, y, z)),
                    ("Inner", (0.008, 0.012, 0.064), (x - side * 0.05, y, z)),
                ):
                    add_box(
                        f"GEO_Glasses_{suffix}_{'L' if side < 0 else 'R'}",
                        loc,
                        dims,
                        "glasses",
                        material,
                        collection,
                        root,
                    )
        add_box(
            "GEO_Glasses_Bridge",
            (0.0, y, z),
            (max(0.03, eye_x * 2 - 0.10), 0.012, 0.007),
            "glasses",
            material,
            collection,
            root,
        )


def build_storybook_character(
    spec: PersonSpec,
    collection: bpy.types.Collection,
) -> tuple[bpy.types.Object, Path]:
    texture_path, image = build_storybook_atlas(spec)
    material = make_atlas_material(
        f"MAT_{spec.person_id}_StorybookAtlas",
        image,
        "Linear",
    )
    root = bpy.data.objects.new(f"ROOT_{spec.person_id}_storybook", None)
    collection.objects.link(root)
    root["asset_kind"] = "photo-character"
    root["character_mode"] = "storybook"
    root["person_id"] = spec.person_id
    root["source_kind"] = spec.source_kind
    root["source_alias"] = spec.source_alias
    root["height_m"] = round(BASE_HEIGHT_M * spec.height_scale, 4)
    root["forward_local"] = "-Y"
    root["texture_policy"] = "stylized-generated-atlas-no-photo-projection"
    root["face_mode"] = "minimal-landmarks"
    if spec.person_id == "person_04":
        root["special_mark"] = "abstract-gold-cyan-no-logo"

    shoulder = 0.45 * spec.shoulder_scale
    torso_bottom = 0.68
    torso_top = 1.20
    for side, x in (("L", -0.115), ("R", 0.115)):
        add_prism(
            f"GEO_PantsLeg_{side}",
            (x, 0.01, 0.37),
            0.10,
            0.085,
            0.60,
            0.80,
            "pants",
            material,
            collection,
            root,
            vertices=7,
        )
        add_box(
            f"GEO_Shoe_{side}",
            (x, -0.05, 0.075),
            (0.22, 0.31, 0.15),
            "shoes",
            material,
            collection,
            root,
            bevel=0.025,
        )
        add_box(
            f"GEO_Sole_{side}",
            (x, -0.055, 0.018),
            (0.225, 0.315, 0.036),
            "sole",
            material,
            collection,
            root,
            bevel=0.008,
        )

    has_outer = spec.outerwear != "none"
    torso_semantic = "top"
    add_tapered_box(
        "GEO_Torso",
        torso_bottom,
        torso_top,
        0.34 * spec.shoulder_scale,
        shoulder,
        0.23,
        0.27,
        torso_semantic,
        material,
        collection,
        root,
    )
    add_box(
        "GEO_Waist",
        (0.0, 0.01, 0.72),
        (0.35 * spec.shoulder_scale, 0.24, 0.16),
        "pants",
        material,
        collection,
        root,
        bevel=0.02,
    )
    if has_outer:
        add_box(
            "GEO_Inner_Shirt",
            (0.0, -0.143, 0.95),
            (0.17, 0.025, 0.39),
            "inner",
            material,
            collection,
            root,
        )
        for side in (-1, 1):
            add_triangle_prism(
                f"GEO_Jacket_Lapel_{'L' if side < 0 else 'R'}",
                ((side * 0.04, 1.18), (side * 0.20, 1.16), (side * 0.12, 0.78)),
                -0.17,
                -0.135,
                "accent",
                material,
                collection,
                root,
            )
    if "polo" in spec.upper or "collared" in spec.upper:
        for side in (-1, 1):
            add_triangle_prism(
                f"GEO_Collar_{'L' if side < 0 else 'R'}",
                ((0.0, 1.19), (side * 0.13, 1.20), (side * 0.065, 1.08)),
                -0.17,
                -0.135,
                "accent",
                material,
                collection,
                root,
            )
    if spec.person_id == "person_02":
        for side in (-1, 1):
            add_box(
                f"GEO_ShoulderColorBlock_{'L' if side < 0 else 'R'}",
                (side * shoulder * 0.28, -0.005, 1.15),
                (0.16, 0.275, 0.14),
                "accent",
                material,
                collection,
                root,
                bevel=0.012,
            )
    if spec.person_id == "person_04":
        add_box(
            "GEO_Chest_AbstractGold",
            (-0.035, -0.153, 1.00),
            (0.10, 0.018, 0.09),
            "accent",
            material,
            collection,
            root,
            rotation=(0.0, 0.0, math.radians(-18)),
            bevel=0.006,
        )
        add_box(
            "GEO_Chest_AbstractCyan",
            (0.045, -0.156, 1.04),
            (0.08, 0.018, 0.105),
            "accent2",
            material,
            collection,
            root,
            rotation=(0.0, 0.0, math.radians(22)),
            bevel=0.006,
        )
    if spec.person_id == "host":
        add_box(
            "GEO_Host_Mark",
            (0.0, -0.154, 1.0),
            (0.12, 0.018, 0.12),
            "host_mark",
            material,
            collection,
            root,
            bevel=0.008,
        )

    long_sleeve = has_outer
    for side, x, tilt in (("L", -shoulder * 0.72, -0.10), ("R", shoulder * 0.72, 0.10)):
        add_prism(
            f"GEO_UpperArm_{side}",
            (x, 0.0, 1.00),
            0.09,
            0.075,
            0.42,
            0.80,
            "top",
            material,
            collection,
            root,
            vertices=7,
            rotation=(0.0, tilt, 0.0),
        )
        add_prism(
            f"GEO_Forearm_{side}",
            (x + (-0.025 if side == "L" else 0.025), 0.0, 0.77),
            0.07,
            0.06,
            0.23,
            0.82,
            "top" if long_sleeve else "skin",
            material,
            collection,
            root,
            vertices=7,
            rotation=(0.0, tilt * 0.8, 0.0),
        )
        add_ico(
            f"GEO_Hand_{side}",
            (x + (-0.045 if side == "L" else 0.045), -0.005, 0.63),
            (0.076, 0.065, 0.09),
            "skin",
            material,
            collection,
            root,
            1,
        )
    add_prism(
        "GEO_Neck",
        (0.0, 0.0, 1.255),
        0.085,
        0.08,
        0.16,
        0.9,
        "skin",
        material,
        collection,
        root,
        vertices=8,
    )
    build_storybook_head(spec, root, collection, material)
    root.scale = (spec.height_scale, spec.height_scale, spec.height_scale)
    return root, texture_path


def rect_uv(rect: tuple[int, int, int, int], atlas_size: int) -> list[tuple[float, float]]:
    x, y, width, height = rect
    inset = 0.01
    return [
        ((x + inset) / atlas_size, (y + inset) / atlas_size),
        ((x + width - inset) / atlas_size, (y + inset) / atlas_size),
        ((x + width - inset) / atlas_size, (y + height - inset) / atlas_size),
        ((x + inset) / atlas_size, (y + height - inset) / atlas_size),
    ]


def add_uv_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    face_regions: dict[str, str],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    x, y, z = (value * 0.5 for value in dimensions)
    vertices = [
        (-x, -y, -z),
        (x, -y, -z),
        (x, y, -z),
        (-x, y, -z),
        (-x, -y, z),
        (x, -y, z),
        (x, y, z),
        (-x, y, z),
    ]
    face_definitions = [
        ("front", (0, 1, 5, 4)),
        ("right", (1, 2, 6, 5)),
        ("back", (2, 3, 7, 6)),
        ("left", (3, 0, 4, 7)),
        ("top", (4, 5, 6, 7)),
        ("bottom", (3, 2, 1, 0)),
    ]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], [face for _, face in face_definitions])
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="VoxelAtlasUV")
    for polygon, (face_name, _) in zip(mesh.polygons, face_definitions):
        uvs = rect_uv(VOXEL_REGIONS[face_regions[face_name]], VOXEL_SIZE)
        for loop_index, uv in zip(polygon.loop_indices, uvs):
            uv_layer.data[loop_index].uv = uv
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location = location
    assign_material(obj, material)
    return parent_object(obj, parent)


def regions_for(prefix: str) -> dict[str, str]:
    return {face: f"{prefix}_{face}" for face in ("front", "right", "back", "left", "top", "bottom")}


def build_voxel_body(
    spec: PersonSpec,
    root: bpy.types.Object,
    collection: bpy.types.Collection,
    material: bpy.types.Material,
    template: str,
) -> None:
    if template == "tall":
        leg_height = 0.71
        torso_bottom = 0.71
        torso_height = 0.54
        head_size = 0.43
        top = 1.70
    else:
        leg_height = 0.66
        torso_bottom = 0.66
        torso_height = 0.55
        head_size = 0.43
        top = 1.65
    torso_top = torso_bottom + torso_height
    head_center = top - head_size * 0.5
    arm_height = torso_height
    arm_center = torso_bottom + torso_height * 0.5

    add_uv_box(
        "GEO_Head",
        (0.0, 0.0, head_center),
        (head_size, head_size, head_size),
        regions_for("head"),
        material,
        collection,
        root,
    )
    add_uv_box(
        "GEO_Torso",
        (0.0, 0.0, torso_bottom + torso_height * 0.5),
        (0.48, 0.25, torso_height),
        regions_for("torso"),
        material,
        collection,
        root,
    )
    for side, x in (("L", -0.32), ("R", 0.32)):
        add_uv_box(
            f"GEO_Arm_{side}",
            (x, 0.0, arm_center),
            (0.16, 0.23, arm_height),
            regions_for("arm"),
            material,
            collection,
            root,
        )
    for side, x in (("L", -0.12), ("R", 0.12)):
        add_uv_box(
            f"GEO_Leg_{side}",
            (x, 0.0, leg_height * 0.5),
            (0.22, 0.24, leg_height),
            regions_for("leg"),
            material,
            collection,
            root,
        )


def build_voxel_character(
    spec: PersonSpec,
    collection: bpy.types.Collection,
) -> tuple[bpy.types.Object, Path]:
    texture_path, image = build_voxel_atlas(spec)
    material = make_atlas_material(
        f"MAT_{spec.person_id}_VoxelAtlas",
        image,
        "Closest",
    )
    root = bpy.data.objects.new(f"ROOT_{spec.person_id}_voxel", None)
    collection.objects.link(root)
    template = "tall" if "tall" in spec.build else "regular"
    root["asset_kind"] = "photo-character"
    root["character_mode"] = "voxel"
    root["body_template"] = template
    root["person_id"] = spec.person_id
    root["source_kind"] = spec.source_kind
    root["source_alias"] = spec.source_alias
    root["height_m"] = round((1.70 if template == "tall" else 1.65) * spec.height_scale, 4)
    root["forward_local"] = "-Y"
    root["texture_policy"] = "ai-readable-pixel-abstraction-no-photo-projection"
    root["head_texture_faces"] = "front,left,right,back,top; bottom=design-default"
    root["atlas_resolution"] = 128
    if spec.person_id == "person_04":
        root["special_mark"] = "abstract-gold-cyan-no-logo"
    build_voxel_body(spec, root, collection, material, template)
    root.scale = (spec.height_scale, spec.height_scale, spec.height_scale)
    return root, texture_path


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    result = [root]
    for child in root.children:
        result.extend(descendants(child))
    return result


def select_only(objects: Iterable[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)


def export_character(root: bpy.types.Object, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    original_name = root.name
    original_location = root.location.copy()
    root.name = ROOT_NODE_NAME
    root.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()
    objects = descendants(root)
    select_only(objects)
    bpy.context.view_layer.objects.active = root
    result = bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_extras=True,
        export_yup=True,
        export_apply=False,
        export_image_format="AUTO",
    )
    root.name = original_name
    root.location = original_location
    if result != {"FINISHED"}:
        raise RuntimeError(f"glTF export failed: {path} -> {result}")


def make_simple_material(name: str, color: str, roughness: float = 0.95) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    rgba = (*hex_rgb(color), 1.0)
    material.diffuse_color = rgba
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    return material


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_preview_scene(mode: str, roots: list[bpy.types.Object]) -> None:
    preview = make_collection("PREVIEW_ONLY")
    floor_material = make_simple_material(
        f"MAT_PREVIEW_{mode}_Floor",
        "#D9C997" if mode == "storybook" else "#698078",
    )
    backdrop_material = make_simple_material(
        f"MAT_PREVIEW_{mode}_Backdrop",
        "#789E99" if mode == "storybook" else "#39504B",
    )
    bpy.ops.mesh.primitive_cube_add(location=(0.0, 0.18, -0.06), scale=(4.6, 1.25, 0.06))
    floor = bpy.context.object
    floor.name = "PREVIEW_Floor"
    move_to_collection(floor, preview)
    assign_material(floor, floor_material)
    bpy.ops.mesh.primitive_cube_add(location=(0.0, 0.82, 1.55), scale=(4.6, 0.06, 1.6))
    backdrop = bpy.context.object
    backdrop.name = "PREVIEW_Backdrop"
    move_to_collection(backdrop, preview)
    assign_material(backdrop, backdrop_material)

    spacing = 1.12 if mode == "storybook" else 0.92
    for index, root in enumerate(roots):
        root.location = ((index - (len(roots) - 1) * 0.5) * spacing, 0.0, 0.0)

    bpy.ops.object.camera_add(location=(4.6, -10.5, 3.2))
    camera = bpy.context.object
    camera.name = "PREVIEW_Camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 7.7 if mode == "storybook" else 6.5
    look_at(camera, (0.0, 0.0, 0.88))
    move_to_collection(camera, preview)
    bpy.context.scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-4.0, -4.5, 6.0))
    key = bpy.context.object
    key.name = "PREVIEW_Key"
    key.data.energy = 850
    key.data.color = hex_rgb("#FFD8A0")
    key.data.shape = "DISK"
    key.data.size = 5.0
    look_at(key, (0.0, 0.0, 0.9))
    move_to_collection(key, preview)

    bpy.ops.object.light_add(type="AREA", location=(4.5, -1.0, 3.5))
    fill = bpy.context.object
    fill.name = "PREVIEW_Fill"
    fill.data.energy = 420
    fill.data.color = hex_rgb("#9BC9C2")
    fill.data.size = 4.0
    look_at(fill, (0.0, 0.0, 1.0))
    move_to_collection(fill, preview)

    scene = bpy.context.scene
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.film_transparent = False
    scene.render.filepath = str(RENDER_ROOT / f"photo_characters_{mode}_lineup.png")
    if scene.world is None:
        scene.world = bpy.data.worlds.new("PREVIEW_World")
    scene.world.color = hex_rgb("#6F918D" if mode == "storybook" else "#30433F")
    scene.view_settings.look = "AgX - Medium High Contrast"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def mesh_triangle_count(root: bpy.types.Object) -> int:
    count = 0
    for obj in descendants(root):
        if obj.type != "MESH":
            continue
        obj.data.calc_loop_triangles()
        count += len(obj.data.loop_triangles)
    return count


def build_mode(mode: str, specs: list[PersonSpec]) -> list[dict[str, object]]:
    reset_scene()
    mode_collection = make_collection(f"CHARACTERS_{mode.upper()}")
    roots: list[bpy.types.Object] = []
    records: list[dict[str, object]] = []
    for spec in specs:
        character_collection = bpy.data.collections.new(f"CHAR_{spec.person_id}_{mode}")
        mode_collection.children.link(character_collection)
        if mode == "storybook":
            root, texture_path = build_storybook_character(spec, character_collection)
        else:
            root, texture_path = build_voxel_character(spec, character_collection)
        glb_path = MODEL_ROOT / mode / f"{spec.person_id}.glb"
        export_character(root, glb_path)
        # Free the semantic object names before constructing the next character.
        # Each exported GLB keeps clean names such as GEO_Head and GEO_Torso,
        # while the combined authoring .blend uses namespaced lineup copies.
        for obj in descendants(root):
            if obj is not root:
                obj.name = f"{spec.person_id}_{mode}_{obj.name}"
        roots.append(root)
        records.append(
            {
                "asset_id": f"character.photo.{spec.person_id}.{mode}.v1",
                "person_id": spec.person_id,
                "mode": mode,
                "source_kind": spec.source_kind,
                "source_alias": spec.source_alias,
                "glb": str(glb_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
                "texture": str(texture_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
                "root_node": ROOT_NODE_NAME,
                "height_m": root["height_m"],
                "forward_local_blender": "-Y",
                "triangles": mesh_triangle_count(root),
                "glb_bytes": glb_path.stat().st_size,
                "texture_bytes": texture_path.stat().st_size,
                "glb_sha256": sha256(glb_path),
                "texture_sha256": sha256(texture_path),
                "body_template": root.get("body_template", "feature-driven-lowpoly"),
            }
        )
    add_preview_scene(mode, roots)
    blend_path = BLENDER_ROOT / f"echo_world_photo_characters_{mode}.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.render.render(write_still=True)
    return records


def parse_script_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build EchoWorld photo-derived characters")
    parser.add_argument(
        "--spec",
        type=Path,
        default=SOURCE_SPEC_PATH,
        help="Path to the validated, privacy-filtered CharacterSpec JSON",
    )
    script_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(script_args)


def source_spec_label(source_spec_path: Path) -> str:
    try:
        return str(source_spec_path.relative_to(WORKSPACE_ROOT)).replace("\\", "/")
    except ValueError:
        return source_spec_path.name


def main() -> None:
    args = parse_script_args()
    source_spec_path = args.spec.resolve()
    if not source_spec_path.is_file():
        raise FileNotFoundError(f"CharacterSpec does not exist: {source_spec_path}")
    for path in (MODEL_ROOT, TEXTURE_ROOT, EXPORT_ROOT, RENDER_ROOT, BLENDER_ROOT):
        path.mkdir(parents=True, exist_ok=True)
    specs = load_person_specs(source_spec_path)
    if [spec.person_id for spec in specs[:-1]] != [f"person_{index:02d}" for index in range(1, 7)]:
        raise RuntimeError("Expected anonymous photo subjects person_01 through person_06")
    records = build_mode("storybook", specs) + build_mode("voxel", specs)
    manifest = {
        "schema_version": "echo-photo-character-modes.v1",
        "generator": "blender/build_photo_character_modes.py",
        "source_spec": source_spec_label(source_spec_path),
        "source_spec_sha256": sha256(source_spec_path),
        "identity_policy": {
            "raw_photos_copied_to_public": False,
            "photo_projection": False,
            "storybook": "structured visible features plus generated painterly swatches",
            "voxel": "fixed body template plus abstract pixel atlas",
            "unknown_side_and_back_views": "shared design defaults",
            "logos_and_readable_text": "omitted",
        },
        "counts": {
            "photo_subjects": 6,
            "generic_hosts": 1,
            "modes": 2,
            "character_glbs": len(records),
        },
        "modes": {
            "storybook": {
                "atlas_size": [256, 256],
                "sampler": "linear",
                "geometry": "feature-driven low-poly head, hair, glasses, and outfit silhouette",
            },
            "voxel": {
                "atlas_size": [128, 128],
                "sampler": "nearest",
                "geometry": "regular or tall fixed cuboid body",
                "head_faces": ["front", "left", "right", "back", "top"],
                "head_bottom": "design-default solid color",
            },
        },
        "assets": records,
        "previews": [
            "renders/photo_characters_storybook_lineup.png",
            "renders/photo_characters_voxel_lineup.png",
        ],
        "blend_sources": [
            "blender/echo_world_photo_characters_storybook.blend",
            "blender/echo_world_photo_characters_voxel.blend",
        ],
    }
    manifest_path = EXPORT_ROOT / "photo_character_modes_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"manifest": str(manifest_path), "assets": len(records)}, indent=2))


if __name__ == "__main__":
    main()
