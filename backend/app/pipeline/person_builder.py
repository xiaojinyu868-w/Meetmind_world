"""人物构建编排：照片 → 三视图 → GLB → 登记 Package avatar + 资产条目（FR-1.5）。

目的：把 three_view / blender_gen 两个稳定接口串成"照片进、Package avatar 出"的
      确定性管线（MVP1 为固定流程编排，非自由 Agent，ARCHITECTURE.md §3）。
输入：photo_paths（人物照片列表）、可选 person_id / PackageStore / 调色板。
输出：登记完成的 package dict（identity 未确认，等待 FR-1.3 用户确认）；
      生成物落在 data/derived/<person_id>/（派生资产，不属于事实层）。
验收：全流程 mock 可跑通 —— 无 Blender、无生图模型的环境下也能产出
      合法 echo-package.v0 并通过校验。
"""

import time
from pathlib import Path

from app.packages.store import PackageStore
from app.pipeline.blender_gen import generate_lowpoly_glb
from app.pipeline.three_view import generate_three_views
from app.world.seed import SEED_AGENTS

DEFAULT_PALETTE = SEED_AGENTS[0]["palette"]


def _default_palette_for(person_id: str) -> dict:
    """按 person_id 哈希从种子调色板里挑一个，保证 demo 差异化且可复现。"""
    index = sum(ord(ch) for ch in person_id) % len(SEED_AGENTS)
    return dict(SEED_AGENTS[index]["palette"])


def build_person_package(photo_paths: list, person_id: str | None = None,
                         store: PackageStore | None = None,
                         palette: dict | None = None) -> dict:
    """全流程编排；mock 环境下各步骤自动降级，最终 package 通过硬校验。"""
    store = store or PackageStore()
    person_id = person_id or f"person_{int(time.time())}"
    derived_dir = Path(store.root) / "derived" / person_id

    # 1) 三视图（mock：复制输入图）
    three_views = generate_three_views([str(p) for p in photo_paths], derived_dir / "three_view")

    # 2) lowpoly GLB（Blender 可用则真实生成，否则 mock 占位 GLB）
    glb = generate_lowpoly_glb(three_views, derived_dir / "avatar.glb")

    # 3) 登记为 Package avatar + 资产条目（事实指针不动，生成物为派生资产）
    package = store.load_or_create_draft(person_id, palette or _default_palette_for(person_id))
    package["avatar"].update(
        {
            "type": "lowpoly-faceless-v1",
            "model_ref": Path(glb["glb_path"]).relative_to(store.root).as_posix(),
            "model_mode": glb["mode"],
            "three_views": {
                view: Path(path).relative_to(store.root).as_posix()
                for view, path in three_views.items()
            },
        }
    )
    if photo_paths and not package["avatar"].get("real_face_ref"):
        # 真实人脸保留在资料包内（P-6）；这里登记指针而非复制内容
        package["avatar"]["real_face_ref"] = str(photo_paths[0])
    store.save_package(package)
    return package
