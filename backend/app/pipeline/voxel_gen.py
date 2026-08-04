"""体素 GLB 组装：atlas → 本机 Blender 无头 → GLB + 校验（FR-1.5，ARCHITECTURE §5a）。

目的：定义"TextureSet → GLB"的稳定接口。真实路径是 subprocess 调本机 Blender
      无头执行 templates/voxel_person.py（固定体素身体 + 固定 UV + Closest 采样），
      产物经 validate_glb 硬校验（根节点/朝向/脚底原点/身高/贴图/采样器）。
输入：TextureSet（或 128x128 RGBA Image）+ style（body_template/height_scale）、
      out_path；Blender 二进制路径从 .env 读 BLENDER_PATH，默认仓库自带 4.5.12。
输出：{"glb_path", "portrait_path", "mode": "blender", "validation": {...}}。
验收：validate_glb 对既有 public/models/characters/photo-derived/voxel/*.glb
      判定 ok；Blender 缺失/失败/校验不过一律显式 RuntimeError，不做静默 mock。
"""

from __future__ import annotations

import json
import struct
import subprocess
import tempfile
from pathlib import Path

from app.config import get_blender_path

BLENDER_SCRIPT = Path(__file__).resolve().parent / "templates" / "voxel_person.py"
ROOT_NODE_NAME = "ROOT_PhotoCharacter"
EXPECTED_GEO = {"GEO_Head", "GEO_Torso", "GEO_Arm_L", "GEO_Arm_R",
                "GEO_Leg_L", "GEO_Leg_R"}
_HEIGHT_RANGE = (1.2, 2.2)  # 乘过 height_scale 后的合理身高区间


def _read_glb_json(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 20:
        raise ValueError(f"GLB 文件过小：{path}")
    magic, version, _total = struct.unpack("<III", data[:12])
    if magic != 0x46546C67:
        raise ValueError(f"不是合法 GLB（magic 错误）：{path}")
    if version != 2:
        raise ValueError(f"GLB 版本应为 2，实际 {version}：{path}")
    json_length, chunk_type = struct.unpack("<II", data[12:20])
    if chunk_type != 0x4E4F534A:
        raise ValueError(f"GLB 首个 chunk 应为 JSON：{path}")
    return json.loads(data[20:20 + json_length])


def validate_glb(glb_path) -> dict:
    """校验体素人物 GLB 是否满足运行时契约（ART-BRIEF 贴图槽位/根节点/朝向/身高）。

    返回 {"ok", "issues", "nodes", "bounds", "height_m", "textures", "bytes"}；
    ok=False 时 issues 列出全部问题（不遇到第一个就停）。
    """
    path = Path(glb_path)
    issues: list[str] = []
    if not path.is_file():
        return {"ok": False, "issues": [f"GLB 不存在：{path}"]}
    try:
        gltf = _read_glb_json(path)
    except (ValueError, json.JSONDecodeError, struct.error) as exc:
        return {"ok": False, "issues": [str(exc)]}

    nodes = gltf.get("nodes", [])
    by_name = {node.get("name"): node for node in nodes}
    root = by_name.get(ROOT_NODE_NAME)
    if root is None:
        issues.append(f"缺根节点 {ROOT_NODE_NAME}（实际：{sorted(by_name)}）")
        root_scale = (1.0, 1.0, 1.0)
        extras = {}
    else:
        root_scale = tuple(root.get("scale", [1.0, 1.0, 1.0]))
        extras = root.get("extras", {})
        if extras.get("forward_local") != "-Y":
            issues.append(f"根节点 forward_local 应为 -Y，实际 {extras.get('forward_local')!r}")

    geo_names = {name for name in by_name if str(name).startswith("GEO_")}
    missing = EXPECTED_GEO - geo_names
    if missing:
        issues.append(f"缺体素部件：{sorted(missing)}")

    # 世界包围盒：GEO 节点无旋转，root 均匀缩放；glTF Y-up（y=竖直）
    meshes = gltf.get("meshes", [])
    accessors = gltf.get("accessors", [])
    min_y, max_y = float("inf"), float("-inf")
    min_x, max_x = float("inf"), float("-inf")
    for node in nodes:
        if not str(node.get("name", "")).startswith("GEO_") or "mesh" not in node:
            continue
        translation = node.get("translation", [0.0, 0.0, 0.0])
        for primitive in meshes[node["mesh"]].get("primitives", []):
            accessor = accessors[primitive["attributes"]["POSITION"]]
            lo, hi = accessor.get("min"), accessor.get("max")
            if not lo or not hi:
                issues.append(f"{node['name']} POSITION 缺 min/max，无法验包围盒")
                continue
            min_x = min(min_x, (translation[0] + lo[0]) * root_scale[0])
            max_x = max(max_x, (translation[0] + hi[0]) * root_scale[0])
            min_y = min(min_y, (translation[1] + lo[1]) * root_scale[1])
            max_y = max(max_y, (translation[1] + hi[1]) * root_scale[1])
    bounds = None
    height = None
    if min_y != float("inf"):
        bounds = {"min": [round(min_x, 4), round(min_y, 4)],
                  "max": [round(max_x, 4), round(max_y, 4)]}
        height = round(max_y - min_y, 4)
        if min_y < -0.01:
            issues.append(f"脚底未贴地：min_y={min_y:.4f}（应 >= -0.01）")
        if not _HEIGHT_RANGE[0] <= height <= _HEIGHT_RANGE[1]:
            issues.append(f"身高 {height}m 超出 {_HEIGHT_RANGE} 区间")

    images = gltf.get("images", [])
    if not any(img.get("mimeType") == "image/png" for img in images):
        issues.append("缺内嵌 PNG 贴图（atlas 未烘焙进 GLB）")
    samplers = gltf.get("samplers", [])
    if not samplers or any(s.get("magFilter") != 9728 for s in samplers):
        issues.append("贴图采样器应为 NEAREST(9728)（Closest 像素采样）")

    return {
        "ok": not issues,
        "issues": issues,
        "nodes": sorted(by_name),
        "bounds": bounds,
        "height_m": height if height is not None else extras.get("height_m"),
        "textures": len(images),
        "bytes": path.stat().st_size,
    }


def generate(textures, style: dict | None = None, out_path=None,
             blender_path: str | None = None, timeout: int = 300,
             portrait_path=None) -> dict:
    """调 Blender 无头装配体素 GLB；失败显式 RuntimeError（不静默降级）。

    textures：TextureSet（取其 neutral atlas）或 128x128 RGBA Image；
    style：{"body_template": "regular"|"tall", "height_scale": float, "person_id": str}。
    """
    from app.pipeline.texture_gen import TextureSet  # 延迟导入，避免环

    style = dict(style or {})
    if isinstance(textures, TextureSet):
        atlas_image = textures.neutral
        person_id = textures.person_id
        template = textures.spec["visibleTraits"]["bodyTemplate"]
    else:
        atlas_image = textures
        person_id = style.get("person_id", "person")
        template = style.get("body_template", "regular")
    person_id = style.get("person_id", person_id)
    template = style.get("body_template", template)
    height_scale = float(style.get("height_scale", 1.0))

    if atlas_image.size != (128, 128):
        raise ValueError(f"atlas 必须 128x128，实际 {atlas_image.size}")

    out = Path(out_path) if out_path else \
        Path(tempfile.mkdtemp(prefix="voxel_gen_")) / f"{person_id}.glb"
    out.parent.mkdir(parents=True, exist_ok=True)
    portrait = Path(portrait_path) if portrait_path else None
    if portrait:
        portrait.parent.mkdir(parents=True, exist_ok=True)

    blender = blender_path or get_blender_path()
    if not Path(blender).exists():
        raise RuntimeError(f"Blender 二进制不存在：{blender}（BLENDER_PATH 可覆盖）")

    with tempfile.TemporaryDirectory(prefix="voxel_atlas_") as tmp:
        atlas_path = Path(tmp) / f"{person_id}_atlas.png"
        atlas_image.convert("RGBA").save(atlas_path, format="PNG", optimize=True)
        command = [
            blender, "-b", "--factory-startup",
            "--python", str(BLENDER_SCRIPT), "--",
            "--atlas", str(atlas_path),
            "--out", str(out),
            "--person-id", person_id,
            "--template", template,
            "--height-scale", str(height_scale),
        ]
        if portrait:
            command += ["--portrait", str(portrait)]
        try:
            completed = subprocess.run(command, capture_output=True, text=True,
                                       timeout=timeout)
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError(f"Blender 超时（{timeout}s）：{exc}") from exc
    if completed.returncode != 0 or not out.exists():
        raise RuntimeError(
            f"Blender 装配失败（退出码 {completed.returncode}）："
            f"{(completed.stderr or completed.stdout)[-500:]}")

    validation = validate_glb(out)
    if not validation["ok"]:
        raise RuntimeError(f"GLB 校验未过：{validation['issues']}（{out}）")
    if portrait and not portrait.exists():
        raise RuntimeError(f"胸像渲染失败：{portrait} 未产出")
    return {
        "glb_path": str(out),
        "portrait_path": str(portrait) if portrait else None,
        "mode": "blender",
        "validation": validation,
    }
