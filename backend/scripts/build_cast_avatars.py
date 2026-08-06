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
    if "head_front" in tiles:
        front = tiles["head_front"]
        spec["visibleTraits"]["skinTone"] = texture_gen._dominant_color(front, (4, 12, 12, 16))
        spec["visibleTraits"]["hairColor"] = texture_gen._dominant_color(front, (0, 0, 16, 2))
        spec["provenance"]["colors"] = "tile-measured"
        texture_gen.validate_character_spec(spec)
    neutral = texture_gen.compose_atlas(spec, tiles)
    expressions = {name: texture_gen.derive_expression(neutral, name)
                   for name in texture_gen.EXPRESSIONS}
    spec["provenance"]["image"] = image_model
    spec["provenance"]["i2i"] = True

    textures = TextureSet(
        person_id=person_id, spec=spec, neutral=neutral,
        expressions=expressions,
        palette=texture_gen.palette_from_spec(spec),
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
