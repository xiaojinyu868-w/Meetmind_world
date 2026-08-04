"""真实冒烟：用真实 qwen-vl 在 demo.jpg（5 人黑客松合照）上跑人脸检测。

用法：backend/.venv/bin/python scripts/smoke_group_onboarding.py [--image PATH]

读取根 .env 的 DASHSCOPE_API_KEY（app.config 导入时自动加载），调用真实
DashScope qwen-vl；打印检测来源、人脸数与归一化 bbox，裁剪结果写到临时目录
（不入库、不进 git）。背景路人应被提示词 + 尺寸过滤丢弃（预期 ≈5 张前景脸）。
"""

from __future__ import annotations

import argparse
import sys
import tempfile
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.agents.llm import get_provider  # noqa: E402
from app.pipelines.group_onboarding.detect import (  # noqa: E402
    GroupFaceDetector,
    decode_image,
    mime_for_filename,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", default=str(REPO_ROOT / "demo.jpg"))
    parser.add_argument("--save-crops", action="store_true", help="把人脸裁剪写入临时目录并打印路径")
    args = parser.parse_args()

    image_path = Path(args.image)
    image_bytes = image_path.read_bytes()
    _, width, height = decode_image(image_bytes)
    print(f"图片：{image_path.name}（{width}x{height}，{len(image_bytes) / 1024:.0f} KB）")

    provider = get_provider("vision")
    print(f"vision provider：{provider.name}/{provider.model}"
          f"（configured={provider.config.get('configured')}）")
    if not provider.config.get("configured"):
        print("未配置 DASHSCOPE_API_KEY，无法真实冒烟", file=sys.stderr)
        return 2

    detector = GroupFaceDetector(vision_provider=provider)
    print(f"人脸定位模型：{detector.face_model}（FACE_DETECT_MODEL 可调）")
    faces, source = detector.detect(image_bytes, mime_for_filename(image_path.name))
    print(f"检测来源：{source}；检出 {len(faces)} 张前景人脸")
    for index, face in enumerate(faces):
        bbox = face["bbox"]
        px = (round(bbox["x"] * width), round(bbox["y"] * height),
              round(bbox["width"] * width), round(bbox["height"] * height))
        print(f"  face_{index + 1:02d}: 归一化 {bbox} → 像素 x,y,w,h = {px}"
              f"（裁剪 {len(face['bytes']) / 1024:.1f} KB）")

    if args.save_crops and faces:
        out_dir = Path(tempfile.mkdtemp(prefix="group-faces-smoke-"))
        for index, face in enumerate(faces):
            (out_dir / f"face_{index + 1:02d}.jpg").write_bytes(face["bytes"])
        print(f"裁剪已写入临时目录（不进 git）：{out_dir}")
    return 0 if source == "qwen-vl" and faces else 1


if __name__ == "__main__":
    raise SystemExit(main())
