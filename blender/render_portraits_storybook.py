from __future__ import annotations

import json
import math
import os
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
STORYBOOK_DIR = PROJECT_ROOT / "public" / "models" / "characters" / "photo-derived" / "storybook"
STAGING_DIR = PROJECT_ROOT / "renders" / "portraits_storybook"
PORTRAIT_DIR = PROJECT_ROOT / "public" / "portraits"
LEGACY_DIR = PORTRAIT_DIR / "legacy"
MANIFEST_PATH = STAGING_DIR / "portraits_storybook_manifest.json"

RESOLUTION = 1024
SAMPLES = 64

# person-self 固定用 host.glb（任务约定）。person_01..06 与 6 个具名人物之间
# 仓库中没有显式映射（exports/photo_character_modes_manifest.json 只记录匿名
# source_alias A-F），因此先渲染到 staging 目检，再按胸像可见的 发型/夹克色
# 与 src/data/demoPeople.js 的 palette 对齐，结果固化在下表：
#   person_01 淡紫夹克+暗紫内搭 ≈ su-he  #8b4a62（乌梅色，最接近）
#   person_02 珊瑚粉衬衫+圆眼镜 ≈ zhou-ning #b85f50（珊瑚红夹克，最接近）
#   person_03 雾蓝灰夹克+方眼镜 ≈ lin-che  #315d83（蓝色系，最接近）
#   person_04 深炭夹克+青色口袋 ≈ tang-ke  #2f7d7b（青色点缀，最接近）
#   person_05 白色夹克+长发    → xu-an   #c18b39（无近似色，按排除法；长发自由气质给摄影师）
#   person_06 深炭夹克+方眼镜  → chen-mo  #667443（无近似色，按排除法；男性角色）
PORTRAIT_MAP = {
    "host": "person-self",
    "person_01": "su-he",
    "person_02": "zhou-ning",
    "person_03": "lin-che",
    "person_04": "tang-ke",
    "person_05": "xu-an",
    "person_06": "chen-mo",
}

ALL_SUBJECTS = ["host", *(f"person_{index:02d}" for index in range(1, 7))]

# Per-subject bust framing tweaks: (camera_y, camera_z, target_z).
FRAME_OVERRIDES = {
    # person_04 的头位置明显偏高，标准机位会切掉头顶。
    "person_04": (-1.95, 1.62, 1.44),
}
DEFAULT_FRAME = (-1.85, 1.52, 1.33)


def srgb(hex_value: str) -> tuple[float, float, float, float]:
    # Display-referred sRGB hex -> linear for Blender/glTF color sockets.
    value = hex_value.lstrip("#")

    def to_linear(channel: int) -> float:
        c = channel / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return tuple(to_linear(int(value[index : index + 2], 16)) for index in (0, 2, 4)) + (1.0,)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_studio(subject: str) -> None:
    scene = bpy.context.scene
    cam_y, cam_z, target_z = FRAME_OVERRIDES.get(subject, DEFAULT_FRAME)

    world = bpy.data.worlds.new("PREVIEW_PortraitWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#E8D3B4")
    background.inputs["Strength"].default_value = 0.35
    scene.world = world

    # Warm two-stop vertical gradient backdrop behind the bust.
    material = bpy.data.materials.new("MAT_Portrait_Backdrop")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.95
    texcoord = nodes.new("ShaderNodeTexCoord")
    separate = nodes.new("ShaderNodeSeparateXYZ")
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = srgb("#E2C39A")
    ramp.color_ramp.elements[1].color = srgb("#F4E7CE")
    links.new(texcoord.outputs["Generated"], separate.inputs["Vector"])
    links.new(separate.outputs["Z"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bpy.ops.mesh.primitive_plane_add(size=2.0)
    backdrop = bpy.context.object
    backdrop.name = "PREVIEW_Backdrop"
    backdrop.scale = (3.2, 2.6, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    backdrop.data.materials.append(material)
    backdrop.location = (0.0, 1.15, 1.35)
    backdrop.rotation_euler = (math.radians(90.0), 0.0, 0.0)

    camera_data = bpy.data.cameras.new("PREVIEW_PortraitCamera")
    camera = bpy.data.objects.new("PREVIEW_PortraitCamera", camera_data)
    scene.collection.objects.link(camera)
    # Character faces -Y; camera sits in front at chest-head height.
    camera.location = (0.0, cam_y, cam_z)
    camera_data.lens = 78.0
    camera_data.sensor_width = 36.0
    look_at(camera, Vector((0.0, 0.0, target_z)))
    scene.camera = camera

    key_data = bpy.data.lights.new("PREVIEW_KeyTop", type="AREA")
    key_data.energy = 320.0
    key_data.shape = "DISK"
    key_data.size = 2.4
    key_data.color = srgb("#FFF0D8")[:3]
    key = bpy.data.objects.new("PREVIEW_KeyTop", key_data)
    scene.collection.objects.link(key)
    key.location = (0.9, -1.1, 3.4)
    look_at(key, Vector((0.0, 0.0, 1.25)))

    fill_data = bpy.data.lights.new("PREVIEW_Fill", type="AREA")
    fill_data.energy = 130.0
    fill_data.shape = "DISK"
    fill_data.size = 2.0
    fill_data.color = srgb("#F4E2C8")[:3]
    fill = bpy.data.objects.new("PREVIEW_Fill", fill_data)
    scene.collection.objects.link(fill)
    fill.location = (-1.3, -1.4, 1.5)
    look_at(fill, Vector((0.0, 0.0, 1.25)))

    rim_data = bpy.data.lights.new("PREVIEW_Rim", type="AREA")
    rim_data.energy = 200.0
    rim_data.shape = "DISK"
    rim_data.size = 1.6
    rim_data.color = srgb("#FFE8C0")[:3]
    rim = bpy.data.objects.new("PREVIEW_Rim", rim_data)
    scene.collection.objects.link(rim)
    rim.location = (0.4, 0.9, 2.9)
    look_at(rim, Vector((0.0, 0.0, 1.45)))

    engine_override = os.environ.get("ECHO_RENDER_ENGINE")
    if engine_override:
        scene.render.engine = engine_override
    else:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = SAMPLES
        scene.cycles.use_denoising = True
    scene.render.resolution_x = RESOLUTION
    scene.render.resolution_y = RESOLUTION
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 100
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    for look in ("AgX - Medium High Contrast", "AgX - Medium Low Contrast", "Medium High Contrast"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0


def import_character(subject: str) -> list[bpy.types.Object]:
    glb_path = STORYBOOK_DIR / f"{subject}.glb"
    before = set(bpy.context.scene.objects)
    result = bpy.ops.import_scene.gltf(filepath=str(glb_path))
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF import failed for {subject}: {result}")
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def box_blur3(img: "object", passes: int = 2) -> "object":
    # Separable 3x3 box blur on an HxWx3 float array; two passes approximate a
    # gaussian. Pre-smoothing kills Cycles/atlas grain so palette indices stop
    # flipping per-pixel (which was inflating the PNG IDAT).
    import numpy as np

    out = img.astype(np.float32)
    for _ in range(passes):
        padded = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode="edge")
        acc = np.zeros_like(out)
        for dy in range(3):
            for dx in range(3):
                acc += padded[dy : dy + out.shape[0], dx : dx + out.shape[1]]
        out = acc / 9.0
    return out


def quantize_to_palette_png(source: Path, target: Path, colors: int = 256) -> int:
    # Cycles output + painted atlas grain makes RGB PNGs exceed the 500KB
    # portrait budget; flat low-poly art survives a 256-color palette almost
    # losslessly. Median-cut via numpy (bundled with Blender), stdlib PNG write.
    import struct
    import zlib

    import numpy as np

    image = bpy.data.images.load(str(source))
    width, height = image.size
    pixels = np.asarray(image.pixels[:], dtype=np.float32).reshape(height, width, 4)[:, :, :3]
    bpy.data.images.remove(image)
    # 8-bit sRGB PNGs load with display-referred float values (colorspace
    # sRGB); no linear conversion needed — blur and quantize in sRGB space.
    smooth = box_blur3(pixels, passes=2)
    rgb = np.clip(np.rint(smooth.reshape(-1, 3) * 255.0), 0, 255).astype(np.uint8)

    boxes = [rgb]
    while len(boxes) < colors:
        # Split the box with the widest channel range at its median.
        ranges = [(box.max(axis=0) - box.min(axis=0)).max() if len(box) else -1 for box in boxes]
        index = int(np.argmax(ranges))
        if ranges[index] <= 0:
            break
        box = boxes.pop(index)
        channel = int(np.argmax(box.max(axis=0) - box.min(axis=0)))
        order = np.argsort(box[:, channel], kind="stable")
        median = len(box) // 2
        boxes.append(box[order[:median]])
        boxes.append(box[order[median:]])

    palette = np.zeros((len(boxes), 3), dtype=np.uint8)
    indexed = np.zeros(len(rgb), dtype=np.uint8)
    for slot, box in enumerate(boxes):
        palette[slot] = np.rint(box.mean(axis=0)).astype(np.uint8)
    # Nearest-palette assignment (chunked to bound memory). Distances must be
    # int32: three squared channel deltas can reach ~196k and wrap int16.
    for start in range(0, len(rgb), 65536):
        chunk = rgb[start : start + 65536].astype(np.int32)
        distances = ((chunk[:, None, :] - palette[None, :, :].astype(np.int32)) ** 2).sum(axis=2)
        indexed[start : start + 65536] = distances.argmin(axis=1).astype(np.uint8)

    # Blender pixel buffers are bottom-up; PNG rows are top-down.
    rows = indexed.reshape(height, width)[::-1]
    raw = b"".join(b"\x00" + rows[y].tobytes() for y in range(height))

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 3, 0, 0, 0)
    plte = palette.tobytes().ljust(colors * 3, b"\x00")
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"PLTE", plte)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    target.write_bytes(png)
    return len(png)


def quantize_master(subject: str) -> int:
    return quantize_to_palette_png(
        STAGING_DIR / f"{subject}_rgb.png",
        STAGING_DIR / f"{subject}.png",
    )


def render_all(subjects: list[str]) -> None:
    STAGING_DIR.mkdir(parents=True, exist_ok=True)
    report: dict[str, dict[str, int | str]] = {}
    for subject in subjects:
        reset_scene()
        configure_studio(subject)
        imported = import_character(subject)
        scene = bpy.context.scene
        # Keep the RGB master so quantization can be re-run without re-rendering.
        master = STAGING_DIR / f"{subject}_rgb.png"
        scene.render.filepath = str(master)
        bpy.ops.render.render(write_still=True)
        size_bytes = quantize_master(subject)
        meshes = [obj for obj in imported if obj.type == "MESH"]
        vertices = sum(len(obj.data.vertices) for obj in meshes)
        report[subject] = {
            "glb": f"public/models/characters/photo-derived/storybook/{subject}.glb",
            "meshes": len(meshes),
            "vertices": vertices,
            "staging_png": f"renders/portraits_storybook/{subject}.png",
            "png_bytes": size_bytes,
        }
        print(f"[portrait] {subject} rendered ({size_bytes // 1024}KB)")
    MANIFEST_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


def requantize_all() -> None:
    for subject in ALL_SUBJECTS:
        size_bytes = quantize_master(subject)
        print(f"[portrait] {subject} requantized ({size_bytes // 1024}KB)")


def apply_portraits() -> None:
    # Backup old placeholders once, then overwrite with storybook renders.
    LEGACY_DIR.mkdir(parents=True, exist_ok=True)
    readme = LEGACY_DIR / "README.md"
    if not readme.exists():
        readme.write_text(
            "# 旧占位头像（停用）\n\n"
            "M1.4 风格对齐前的占位头像。2026-08 已由\n"
            "`blender/render_portraits_storybook.py` 用 storybook 人物 GLB 重渲染替换，\n"
            "本目录仅作历史备份，不要再被前端引用。\n",
            encoding="utf-8",
        )
    applied: dict[str, str] = {}
    for subject, portrait_name in PORTRAIT_MAP.items():
        staged = STAGING_DIR / f"{subject}.png"
        if not staged.exists():
            raise RuntimeError(f"staging render missing for {subject}: {staged}")
        target = PORTRAIT_DIR / f"{portrait_name}.png"
        legacy = LEGACY_DIR / f"{portrait_name}.png"
        if target.exists() and not legacy.exists():
            shutil.copy2(target, legacy)
        shutil.copy2(staged, target)
        size_kb = target.stat().st_size / 1024.0
        if size_kb > 500.0:
            raise RuntimeError(f"{target} exceeds 500KB budget: {size_kb:.0f}KB")
        applied[subject] = f"public/portraits/{portrait_name}.png ({size_kb:.0f}KB)"
        print(f"[portrait] {subject} -> {portrait_name}.png")
    print(json.dumps(applied, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if "--apply-only" in argv:
        apply_portraits()
    elif "--requantize" in argv:
        requantize_all()
    else:
        subjects = ALL_SUBJECTS
        if "--subjects" in argv:
            wanted = argv[argv.index("--subjects") + 1].split(",")
            subjects = [subject for subject in ALL_SUBJECTS if subject in wanted]
        render_all(subjects)
        if "--apply" in argv:
            apply_portraits()
