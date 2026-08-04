#!/usr/bin/env python
"""CLI：照片 → 体素人物（CharacterSpec/像素 atlas/GLB/胸像/manifest）（FR-1.5）。

用法（backend/ 目录下）：
    .venv/bin/python scripts/build_person_from_photo.py \
        --person-id person_x --photos /path/a.jpg [/path/b.jpg ...] \
        [--out-dir backend/data/derived/voxel-pipeline/person_x] \
        [--crop x,y,w,h ...] [--template regular|tall] [--height-scale 1.0] \
        [--skip-blender] [--mock]

--crop 与 --photos 一一对应（先裁再入管线）；--mock 强制 vision/image 走
未配置降级（不耗真实额度，用于离线联调）。
产物默认落 <data>/derived/voxel-pipeline/<person_id>/（gitignore 暂存区），
不写 public/；评审通过后由人手工发布。
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.pipeline.person_builder import build  # noqa: E402


def _parse_box(raw: str) -> tuple[int, int, int, int]:
    parts = [int(v) for v in raw.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("--crop 格式：x,y,w,h")
    return tuple(parts)


def _crop_photos(photo_paths: list[str], boxes: list[tuple] | None,
                 work_dir: Path) -> list[str]:
    """按 --crop 裁剪（PIL），产出落在输出目录的 _crops/（暂存，不入库）。"""
    if not boxes:
        return [str(p) for p in photo_paths]
    if len(boxes) != len(photo_paths):
        raise SystemExit("--crop 数量必须与 --photos 一致")
    from PIL import Image

    crop_dir = work_dir / "_crops"
    crop_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for index, (photo, (x, y, w, h)) in enumerate(zip(photo_paths, boxes)):
        image = Image.open(photo).convert("RGB")
        cropped = image.crop((x, y, x + w, y + h))
        target = crop_dir / f"crop_{index:02d}.png"
        cropped.save(target, format="PNG")
        results.append(str(target))
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="照片 → 体素人物生成管线")
    parser.add_argument("--person-id", required=True)
    parser.add_argument("--photos", nargs="+", required=True)
    parser.add_argument("--out-dir", default=None)
    parser.add_argument("--crop", nargs="*", type=_parse_box, default=None,
                        help="与 --photos 一一对应的 x,y,w,h 裁剪框")
    parser.add_argument("--template", choices=["regular", "tall"], default=None)
    parser.add_argument("--height-scale", type=float, default=None)
    parser.add_argument("--skip-blender", action="store_true")
    parser.add_argument("--mock", action="store_true", help="强制模型走 mock 降级")
    args = parser.parse_args()

    out_dir = Path(args.out_dir) if args.out_dir else None
    work_dir = out_dir or Path(tempfile.mkdtemp(prefix="voxel_build_"))
    photos = _crop_photos(args.photos, args.crop, work_dir)

    style = {k: v for k, v in (("body_template", args.template),
                               ("height_scale", args.height_scale)) if v is not None}
    vision = image = None
    if args.mock:
        from app.agents.llm.commonstack import CommonStackProvider
        from app.agents.llm.qwen import QwenProvider
        unconfigured = {"api_base": "", "api_key": "", "model": "mock",
                        "configured": False}
        vision = QwenProvider(config={**unconfigured, "role": "vision"})
        image = CommonStackProvider(config={**unconfigured, "role": "image"})

    result = build(person_id=args.person_id, photo_paths=photos,
                   out_dir=out_dir, style=style or None,
                   vision=vision, image=image, skip_blender=args.skip_blender)
    summary = {
        "person_id": result["person_id"],
        "out_dir": result["out_dir"],
        "manifest": result["manifest_path"],
        "models": result["manifest"]["models"],
        "design_completion": result["textures"].spec["designCompletion"],
        "glb_validation": (result["glb"] or {}).get("validation"),
        "asset_entry": result["asset_entry"],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
