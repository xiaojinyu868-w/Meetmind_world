"""三视图生成接口（FR-1.5 前置步骤）。

目的：定义"人物照片列表 → 三视图（front/side/back）"的稳定接口，真实算法
     （生图模型多视角生成）后续在本模块内替换，调用方（person_builder）不变。
输入：photo_paths（人物照片路径列表，至少 1 张）、out_dir（输出目录）。
输出：{"front": path, "side": path, "back": path}。
验收：mock 实现下任意非空照片列表都能产出三个存在的文件。

⚠ 当前为 mock 实现：直接复制输入图作为占位输出。
TODO(算法待打磨)：接入生图 provider（LLMProvider.image_gen）做真实三视图生成。
"""

import shutil
from pathlib import Path

VIEWS = ("front", "side", "back")


def generate_three_views(photo_paths: list, out_dir) -> dict:
    if not photo_paths:
        raise ValueError("三视图生成至少需要 1 张输入照片")
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    result = {}
    for index, view in enumerate(VIEWS):
        source = Path(photo_paths[index % len(photo_paths)])
        if not source.exists():
            raise FileNotFoundError(f"输入照片不存在：{source}")
        target = out_dir / f"{view}{source.suffix or '.png'}"
        # TODO(算法待打磨)：这里应调用生图模型生成对应视角；mock 直接复制
        shutil.copyfile(source, target)
        result[view] = str(target)
    return result
