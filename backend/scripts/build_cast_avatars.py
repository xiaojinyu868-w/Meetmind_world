#!/usr/bin/env python
"""卡司人物构建：真实合照 → 分割人脸 → vision 特征 → i2i 像素头贴 → GLB → Package。

用法（在 backend/ 下）：
    PHYSICAL_AI_PACKAGE_SCHEMA="" .venv/bin/python scripts/build_cast_avatars.py [--only lin-che]

输入：/tmp/cast-faces/face_NN.jpg（分割人脸）+ /tmp/cast-body/<person>.jpg（半身）。
映射表 CAST_ORDER 按合照从左到右（2026-08-06 人工核对特征：眼镜/发型/服装）。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.agents.llm import base as llm_base  # noqa: E402
from app.packages.store import PackageStore  # noqa: E402
from app.pipeline import texture_gen, voxel_gen  # noqa: E402
from app.pipeline.texture_gen import TextureSet  # noqa: E402

# 合照从左到右 → 卡司（2026-08-06 按 眼镜/发型/服装 人工核对）
CAST_ORDER = ["lin-che", "zhou-ning", "chen-mo", "xu-an", "su-he", "tang-ke"]
FACES_DIR = Path("/tmp/cast-faces")
BODY_DIR = Path("/tmp/cast-body")
AVATAR_TYPE = "voxel-textured.v1"

# 人工校准配色（对照合照逐人核对，2026-08-06）：vision 会把挂绳/肤色误报进
# outfitPalette，卡司是长期固定 NPC，人工 ground truth 一次到位。
# 键对应 palette 六键中的 jacket/shirt/pants/shoes（hex）。
PALETTE_OVERRIDES = {
    "lin-che":   {"jacket": "#655A73", "shirt": "#2B2B30", "pants": "#2E3A54", "shoes": "#E8E8E8"},
    "zhou-ning": {"jacket": "#F2F2F0", "shirt": "#F2F2F0", "pants": "#24262B", "shoes": "#B3453F"},
    "chen-mo":   {"jacket": "#9BA1A6", "shirt": "#9BA1A6", "pants": "#8F959B", "shoes": "#6B5CA8"},
    "xu-an":     {"jacket": "#1D1D20", "shirt": "#1D1D20", "pants": "#1D1D20", "shoes": "#2A2A2E"},
    "su-he":     {"jacket": "#F5F2EA", "shirt": "#FFFFFF", "pants": "#B8A88C", "shoes": "#F0F0EC"},
    "tang-ke":   {"jacket": "#1F1F22", "shirt": "#1F1F22", "pants": "#A8B8C8", "shoes": "#F0F0EC"},
}
# 合照中戴眼镜的卡司（16x16 瓦片生图极易丢眼镜——它是辨识度第一特征，
# 由程序化叠加兜底保证必现）
GLASSES_CAST = {"zhou-ning", "chen-mo", "xu-an", "tang-ke"}
GLASSES_COLOR = (38, 38, 44, 255)  # 深灰细框（不用纯黑，避免与眼睛糊成一团）
# 个别人的 i2i 瓦片刘海遮住自动暗行定位（眼镜叠到头发上隐身），人工指定行
GLASSES_ROW_OVERRIDE = {"chen-mo": 9}


def _eye_row(tile, columns) -> int:
    """在 6..10 行里找指定列范围最暗的一行（眼睛所在行）。"""
    darkest_row, darkest_value = 8, None
    for y in range(6, 11):
        value = sum(sum(tile.getpixel((x, y))[:3]) for x in columns)
        if darkest_value is None or value < darkest_value:
            darkest_row, darkest_value = y, value
    return darkest_row


def apply_glasses_overlay(front_tile, row_override: int | None = None):
    """在 head_front 瓦片上画细框像素眼镜：双眼定位 → 镜片框 + 鼻梁 + 镜腿。"""
    tile = front_tile.convert("RGBA")
    if row_override is not None:
        row = row_override
    else:
        left_row = _eye_row(tile, range(2, 8))
        right_row = _eye_row(tile, range(8, 14))
        row = round((left_row + right_row) / 2)
    c = GLASSES_COLOR
    for lens_x in (3, 10):  # 左/右镜片（4x3 框）
        for x in range(lens_x, lens_x + 4):
            tile.putpixel((x, row - 1), c)
            tile.putpixel((x, row + 1), c)
        tile.putpixel((lens_x, row), c)
        tile.putpixel((lens_x + 3, row), c)
    for x in (7, 8):  # 鼻梁
        tile.putpixel((x, row - 1), c)
    tile.putpixel((2, row - 1), c)   # 左镜腿
    tile.putpixel((13, row - 1), c)  # 右镜腿
    return tile


def build_one(person_id: str, face_path: Path, body_path: Path, store: PackageStore,
              out_root: Path) -> dict:
    vision = llm_base.get_provider("vision")
    image = llm_base.get_provider("image")
    out_dir = out_root / person_id
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = out_dir / "cache"

    # 1) vision 特征来自半身照（含服装）；i2i 参考用更紧致的人脸裁剪（相似度优先）
    spec = texture_gen.summarize_visible_traits(
        [str(body_path)], person_id, vision=vision, cache_dir=cache_dir)
    tiles, image_model = texture_gen.generate_tiles(
        spec, image=image, cache_dir=cache_dir,
        reference=face_path.read_bytes())
    if person_id in GLASSES_CAST and "head_front" in tiles:
        tiles["head_front"] = apply_glasses_overlay(
            tiles["head_front"], GLASSES_ROW_OVERRIDE.get(person_id))
        spec["visibleTraits"]["glasses"] = True
        spec["provenance"]["glasses"] = "procedural-overlay"
    if "head_front" in tiles:
        front = tiles["head_front"]
        spec["visibleTraits"]["skinTone"] = texture_gen._dominant_color(front, (4, 12, 12, 16))
        spec["visibleTraits"]["hairColor"] = texture_gen._dominant_color(front, (0, 0, 16, 2))
        spec["provenance"]["colors"] = "tile-measured"
        texture_gen.validate_character_spec(spec)
    # 人工校准配色覆盖（vision 易把挂绳/肤色误报进服装色）
    overrides = PALETTE_OVERRIDES.get(person_id)
    if overrides:
        spec["visibleTraits"]["outfitPalette"] = [
            overrides["jacket"], overrides["shirt"], overrides["pants"]]
        spec["provenance"]["outfit"] = "manual-ground-truth"
    neutral = texture_gen.compose_atlas(spec, tiles)
    expressions = {name: texture_gen.derive_expression(neutral, name)
                   for name in texture_gen.EXPRESSIONS}
    spec["provenance"]["image"] = image_model
    spec["provenance"]["i2i"] = True

    textures = TextureSet(
        person_id=person_id, spec=spec, neutral=neutral,
        expressions=expressions,
        palette=texture_gen.palette_from_spec(spec) | (overrides or {}),
        model=image_model,
        vision_model=spec["provenance"].get("vision", "mock"),
        source_photos=[str(body_path), str(face_path)],
        tiles=tiles,
    )
    neutral.save(out_dir / f"{person_id}_atlas.png", format="PNG", optimize=True)
    for name, img in expressions.items():
        img.save(out_dir / f"{person_id}_{name}.png", format="PNG", optimize=True)
    (out_dir / "character_spec.json").write_text(
        json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")

    # 2) Blender 装配 GLB + 胸像
    glb = voxel_gen.generate(
        textures, out_path=out_dir / f"{person_id}.glb",
        portrait_path=out_dir / "portrait.png")

    # 3) Package avatar 登记（相对 data 根的 ref，前端经 /api/v0/media/ 读取）
    package = store.load_or_create_draft(
        person_id, texture_gen.palette_from_spec(spec))

    def relative(p):
        p = Path(p)
        return p.relative_to(store.root).as_posix() if p.is_relative_to(store.root) else str(p)

    package["avatar"].update({
        "type": AVATAR_TYPE,
        "palette": textures.palette,
        "model_mode": glb["mode"],
        "model_ref": relative(glb["glb_path"]),
        "atlas_ref": relative(out_dir / f"{person_id}_atlas.png"),
        "expression_refs": {
            name: relative(out_dir / f"{person_id}_{name}.png")
            for name in texture_gen.EXPRESSIONS
        },
        "portrait_ref": relative(glb.get("portrait_path"))
        if glb.get("portrait_path") else None,
        "character_spec_ref": relative(out_dir / "character_spec.json"),
        "texture_model": image_model,
        "vision_model": textures.vision_model,
    })
    store.save_package(package)
    return {
        "person_id": person_id,
        "tiles": sorted(tiles),
        "image_model": image_model,
        "vision_model": textures.vision_model,
        "glb": glb["mode"],
        "out_dir": str(out_dir),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="只构建某一位（如 lin-che）")
    args = parser.parse_args()
    store = PackageStore()
    out_root = Path(store.root) / "derived" / "voxel-pipeline"
    targets = CAST_ORDER if not args.only else [args.only]
    for index, person_id in enumerate(CAST_ORDER, 1):
        if person_id not in targets:
            continue
        face_path = FACES_DIR / f"face_{index:02d}.jpg"
        body_path = BODY_DIR / f"{person_id}.jpg"
        assert face_path.is_file() and body_path.is_file(), f"缺裁剪：{person_id}"
        result = build_one(person_id, face_path, body_path, store, out_root)
        print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
