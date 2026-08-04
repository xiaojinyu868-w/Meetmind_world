#!/usr/bin/env python
"""真实冒烟：从 demo.jpg（五人黑客松合照）裁两位前景人物，跑完整体素管线。

用法（backend/ 目录下）：
    .venv/bin/python scripts/smoke_voxel_pipeline_demo.py [--skip-blender]

- 人脸裁剪框为手工标注（1922x1279 原图坐标），裁剪产物只落在
  data/derived/voxel-pipeline/（gitignore 暂存区），不进 git、不进 public/；
- 走真实 vision（qwen-vl）与 image（gpt-image via CommonStack）模型，
  生图结果按 prompt 哈希缓存在各人 cache/ 下，复跑不重复耗额度。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_data_dir  # noqa: E402
from app.pipeline.person_builder import build  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
DEMO_PHOTO = REPO_ROOT / "demo.jpg"
STAGING = get_data_dir() / "derived" / "voxel-pipeline"

# 手工标注的上半身裁剪框（x, y, w, h，原图 1922x1279 坐标）：
# 左前浅蓝 T 恤戴眼镜男生 / 右前黑 T 恤戴眼镜男生（两位最清晰的前景人物）
DEMO_PEOPLE = {
    "photo_demo_01": (295, 390, 300, 470),
    "photo_demo_02": (1560, 400, 360, 520),
}


def crop(photo: Path, box: tuple[int, int, int, int], out_dir: Path) -> Path:
    from PIL import Image

    out_dir.mkdir(parents=True, exist_ok=True)
    x, y, w, h = box
    target = out_dir / "source_crop.png"
    Image.open(photo).convert("RGB").crop((x, y, x + w, y + h)).save(target)
    return target


def main() -> None:
    skip_blender = "--skip-blender" in sys.argv
    if not DEMO_PHOTO.is_file():
        raise SystemExit(f"缺 demo 合照：{DEMO_PHOTO}")
    summaries = {}
    for person_id, box in DEMO_PEOPLE.items():
        out_dir = STAGING / person_id
        crop_path = crop(DEMO_PHOTO, box, out_dir / "_crops")
        result = build(person_id=person_id, photo_paths=[str(crop_path)],
                       out_dir=out_dir, skip_blender=skip_blender)
        manifest = result["manifest"]
        summaries[person_id] = {
            "out_dir": result["out_dir"],
            "models": manifest["models"],
            "visible_traits": result["textures"].spec["visibleTraits"],
            "design_completion": result["textures"].spec["designCompletion"],
            "glb_ok": (manifest.get("validation") or {}).get("ok"),
            "glb_issues": (manifest.get("validation") or {}).get("issues"),
        }
    print(json.dumps(summaries, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
