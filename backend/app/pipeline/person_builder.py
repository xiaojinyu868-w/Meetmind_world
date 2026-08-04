"""人物构建编排：照片 → CharacterSpec/像素 atlas → 体素 GLB → Package avatar（FR-1.5）。

目的：把 texture_gen / voxel_gen 两个稳定接口串成"照片进、Package avatar 出"的
      确定性管线（MVP 固定流程编排，非自由 Agent，ARCHITECTURE.md §3/§5a）。
      人物形象方向（P-6/ADR-6）：MC 体素 + AI 生成图片贴图；原"三视图 →
      lowpoly 有脸 GLB"遗留实现（three_view.py/blender_gen.py）已废弃删除。
输入：person_id、照片路径列表、可选 PackageStore / 输出目录 / provider 注入。
输出：{"package", "textures", "glb", "portrait", "spec", "asset_entry", "manifest"}；
      生成物落在 <data>/derived/voxel-pipeline/<person_id>/（派生资产，gitignore，
      评审后才允许手工发布进 public/ 白名单）。
事实/推断边界（P-3）：源照片经 PackageStore.write_fact 登记为 facts 指针
      （append-only，内容哈希命名，重跑幂等）；CharacterSpec/atlas/GLB 是生成物，
      带 source 指针 + 模型 + 时间戳，落在 derived/，不进事实层。
验收：tests/test_voxel_pipeline.py —— 注入假 provider/假 voxel 装配全流程跑通，
      package 过 echo-package.v0 硬校验，manifest 哈希与文件一致。
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

from app.packages.store import FactLayerImmutableError, PackageStore
from app.pipeline import texture_gen, voxel_gen
from app.pipeline.texture_gen import TextureSet
from app.world.seed import SEED_AGENTS

DEFAULT_PALETTE = SEED_AGENTS[0]["palette"]
AVATAR_TYPE = "voxel-textured.v1"
ASSET_STYLE = "photo-pixel-voxel"


def _default_palette_for(person_id: str) -> dict:
    """按 person_id 哈希从种子调色板里挑一个，保证 demo 差异化且可复现。"""
    index = sum(ord(ch) for ch in person_id) % len(SEED_AGENTS)
    return dict(SEED_AGENTS[index]["palette"])


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _file_entry(path: Path, root: Path) -> dict:
    return {
        "path": path.relative_to(root).as_posix() if path.is_relative_to(root)
        else str(path),
        "bytes": path.stat().st_size,
        "sha256": _sha256(path),
    }


def _register_source_photos(store: PackageStore, person_id: str,
                            photo_paths: list) -> list[str]:
    """源照片写入事实层（append-only），返回 facts 指针列表。

    文件名取内容哈希：同一照片重复登记命中既有文件时复用指针（事实层
    只增不改，不能覆盖）。
    """
    refs = []
    for photo in photo_paths:
        source = Path(photo)
        if not source.is_file():
            raise FileNotFoundError(f"输入照片不存在：{source}")
        data = source.read_bytes()
        filename = f"source_{hashlib.sha256(data).hexdigest()[:12]}{source.suffix or '.jpg'}"
        try:
            ref = store.write_fact(person_id, "photo-import", filename, data)
        except FactLayerImmutableError:
            ref = f"facts/{person_id}/photo-import/{filename}"
        refs.append(ref)
    return refs


def _save_textures(textures: TextureSet, out_dir: Path) -> dict:
    """落盘 neutral atlas + 4 张表情 atlas + CharacterSpec，返回相对路径表。"""
    textures_dir = out_dir / "textures"
    expressions_dir = textures_dir / "expressions"
    expressions_dir.mkdir(parents=True, exist_ok=True)
    neutral_path = textures_dir / f"{textures.person_id}_atlas.png"
    textures.neutral.save(neutral_path, format="PNG", optimize=True)
    expression_paths = {}
    for name, image in textures.expressions.items():
        path = expressions_dir / f"{textures.person_id}_{name}.png"
        image.save(path, format="PNG", optimize=True)
        expression_paths[name] = path
    spec_path = out_dir / "character_spec.json"
    spec_path.write_text(
        json.dumps(textures.spec, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"neutral": neutral_path, "expressions": expression_paths,
            "spec": spec_path}


def build(person_id: str, photo_paths: list, *,
          store: PackageStore | None = None,
          out_dir=None,
          palette: dict | None = None,
          style: dict | None = None,
          vision=None, image=None,
          voxel_fn=None,
          skip_blender: bool = False,
          blender_path: str | None = None,
          cache_dir=None) -> dict:
    """全流程编排：贴图 → GLB → 胸像 → Package avatar + 资产条目 + manifest。

    voxel_fn：测试注入的假装配（签名同 voxel_gen.generate）；skip_blender=True
    时跳过 GLB/胸像（离线审贴图用）。Blender 真实失败由 voxel_gen 显式抛错。
    """
    store = store or PackageStore()
    out = Path(out_dir) if out_dir else \
        Path(store.root) / "derived" / "voxel-pipeline" / person_id
    out.mkdir(parents=True, exist_ok=True)

    # 1) 源照片 → 事实层指针（生成物只记指针，不复制进 public/）
    photo_refs = _register_source_photos(store, person_id, photo_paths)

    # 2) 贴图集：CharacterSpec + AI 像素瓦片 + 固定 UV atlas + 四表情
    textures = texture_gen.generate(
        [str(p) for p in photo_paths], person_id,
        vision=vision, image=image,
        cache_dir=cache_dir or out / "cache")
    texture_paths = _save_textures(textures, out)

    # 3) 体素 GLB + 胸像（Blender 显式失败；skip_blender 仅用于离线/测试）
    glb_result = None
    if not skip_blender:
        assemble = voxel_fn or voxel_gen.generate
        glb_result = assemble(
            textures, style=style, out_path=out / f"{person_id}.glb",
            blender_path=blender_path, portrait_path=out / "portrait.png")

    # 4) Package avatar 登记（identity 未确认语义不动，只换 avatar 块）
    package = store.load_or_create_draft(
        person_id, palette or texture_gen.palette_from_spec(textures.spec))
    relative = lambda p: Path(p).relative_to(store.root).as_posix() \
        if Path(p).is_relative_to(store.root) else str(p)
    package["avatar"].update({
        "type": AVATAR_TYPE,
        "palette": textures.palette,
        "model_mode": glb_result["mode"] if glb_result else "skipped",
        "model_ref": relative(glb_result["glb_path"]) if glb_result else None,
        "atlas_ref": relative(texture_paths["neutral"]),
        "expression_refs": {name: relative(p)
                            for name, p in texture_paths["expressions"].items()},
        "portrait_ref": relative(glb_result["portrait_path"])
        if glb_result and glb_result.get("portrait_path") else None,
        "character_spec_ref": relative(texture_paths["spec"]),
        "texture_model": textures.model,
        "vision_model": textures.vision_model,
    })
    if photo_refs and not package["avatar"].get("real_face_ref"):
        # 真实人脸只登记事实层指针（P-6）；内容不进 derived/public
        package["avatar"]["real_face_ref"] = photo_refs[0]
    store.save_package(package)

    # 5) 资产白名单条目（dict 返回，评审后由人手工并入 public 白名单）
    asset_entry = {
        "asset_id": f"character.photo.{person_id}.voxel.v1",
        "kind": "character",
        "url": relative(glb_result["glb_path"]) if glb_result else None,
        "version": 1,
        "style": ASSET_STYLE,
        "root_node": voxel_gen.ROOT_NODE_NAME,
        "height_m": glb_result["validation"]["height_m"] if glb_result else None,
    }

    # 6) manifest：全部产物的路径/尺寸/sha256 + 溯源
    files = {"character_spec": _file_entry(texture_paths["spec"], store.root),
             "atlas": _file_entry(texture_paths["neutral"], store.root),
             "expressions": {name: _file_entry(p, store.root)
                             for name, p in texture_paths["expressions"].items()}}
    if glb_result:
        files["glb"] = _file_entry(Path(glb_result["glb_path"]), store.root)
        if glb_result.get("portrait_path"):
            files["portrait"] = _file_entry(Path(glb_result["portrait_path"]),
                                            store.root)
    manifest = {
        "schema": "echo-voxel-person-manifest.v1",
        "person_id": person_id,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_photo_refs": photo_refs,
        "models": {"vision": textures.vision_model, "image": textures.model,
                   "assembly": glb_result["mode"] if glb_result else "skipped"},
        "validation": glb_result["validation"] if glb_result else None,
        "asset_entry": asset_entry,
        "files": files,
    }
    manifest_path = out / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "person_id": person_id,
        "package": package,
        "textures": textures,
        "texture_paths": texture_paths,
        "glb": glb_result,
        "asset_entry": asset_entry,
        "manifest": manifest,
        "manifest_path": str(manifest_path),
        "out_dir": str(out),
    }
