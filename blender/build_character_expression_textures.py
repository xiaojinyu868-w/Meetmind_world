from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parents[1]
VOXEL_SOURCE_ROOT = PROJECT_ROOT / "public" / "textures" / "characters" / "voxel"
VOXEL_OUTPUT_ROOT = VOXEL_SOURCE_ROOT / "expressions"
EXPORT_PATH = PROJECT_ROOT / "exports" / "character_expression_assets_manifest.json"

SLOTS = ("host", *(f"person_{index:02d}" for index in range(1, 7)))
EXPRESSIONS = ("neutral", "happy", "surprised", "thinking")
VOXEL_FACE_BOX = (16, 16, 32, 32)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def skin_color(image: Image.Image) -> tuple[int, int, int, int]:
    face = image.crop(VOXEL_FACE_BOX).convert("RGBA")
    candidates = [
        pixel
        for pixel in face.get_flattened_data()
        if pixel[3] > 0 and max(pixel[:3]) - min(pixel[:3]) > 8
    ]
    if not candidates:
        return (213, 155, 120, 255)
    return Counter(candidates).most_common(1)[0][0]


def paint_voxel_expression(source: Image.Image, expression: str) -> Image.Image:
    image = source.copy().convert("RGBA")
    if expression == "neutral":
        return image

    draw = ImageDraw.Draw(image)
    skin = skin_color(image)
    ink = (68, 48, 47, 255)
    accent = (126, 70, 76, 255)

    draw.rectangle((21, 26, 27, 30), fill=skin)
    if expression == "happy":
        draw.point((22, 27), fill=ink)
        draw.point((26, 27), fill=ink)
        draw.point((23, 28), fill=accent)
        draw.point((25, 28), fill=accent)
        draw.point((24, 29), fill=accent)
    elif expression == "surprised":
        draw.rectangle((23, 27, 25, 29), fill=ink)
        draw.point((24, 28), fill=(190, 105, 99, 255))
        draw.point((20, 23), fill=(255, 239, 185, 255))
        draw.point((28, 23), fill=(255, 239, 185, 255))
    elif expression == "thinking":
        draw.line((22, 28, 26, 27), fill=accent, width=1)
        draw.line((25, 21, 28, 20), fill=ink, width=1)
        draw.point((29, 19), fill=(235, 192, 82, 255))
    return image


def save_png(image: Image.Image, path: Path) -> dict[str, object]:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)
    return {
        "path": str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "size": list(image.size),
    }


def build_voxel_assets() -> list[dict[str, object]]:
    records = []
    for slot in SLOTS:
        source_path = VOXEL_SOURCE_ROOT / f"{slot}_atlas.png"
        if not source_path.is_file():
            raise FileNotFoundError(f"Voxel atlas is missing: {source_path}")
        source = Image.open(source_path).convert("RGBA")
        if source.size != (128, 128):
            raise ValueError(f"Voxel atlas must be 128x128: {source_path}")
        for expression in EXPRESSIONS:
            output_path = VOXEL_OUTPUT_ROOT / f"{slot}_{expression}.png"
            records.append({
                "slot": slot,
                "expression": expression,
                **save_png(paint_voxel_expression(source, expression), output_path),
            })
    return records


def main() -> None:
    voxel = build_voxel_assets()
    manifest = {
        "schema_version": "echo-character-expressions.v1",
        "generator": "blender/build_character_expression_textures.py",
        "expressions": list(EXPRESSIONS),
        "mapping": {"voxel": "方案 1：每人完整像素 atlas，运行时 nearest 切换"},
        "counts": {
            "slots": len(SLOTS),
            "expressions_per_slot": len(EXPRESSIONS),
            "voxel_textures": len(voxel),
        },
        "assets": {"voxel": voxel},
    }
    EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    EXPORT_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest["counts"], ensure_ascii=False))


if __name__ == "__main__":
    main()
