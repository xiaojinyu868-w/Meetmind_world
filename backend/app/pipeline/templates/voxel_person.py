"""Blender 无头模板：128x128 像素 atlas → 固定体素身体 GLB（+ 可选胸像渲染）。

用法：
    blender -b --factory-startup --python voxel_person.py -- \
        --atlas /path/atlas.png --out /path/person.glb --person-id person_x \
        [--template regular|tall] [--height-scale 1.0] [--portrait /path/portrait.png]

约定（与 blender/build_photo_character_modes.py 的 voxel 模式逐一对齐，
      即 public/models/characters/photo-derived/voxel/*.glb 的运行时契约）：
    - 根节点导出时改名 ROOT_PhotoCharacter（custom props 经 export_extras 保留）；
    - 脚底原点（z=0 接地），正面朝 Blender -Y（glTF Y-up 导出后面朝 +Z）；
    - 身高 regular=1.65m / tall=1.70m（乘 height-scale）；
    - 六个 GEO_ 盒体（头/躯干/双臂/双腿），每面 UV 指向 VOXEL_REGIONS 固定区域；
    - 材质 MAT_<person>_VoxelAtlas，贴图采样 Closest（glTF NEAREST），像素感不糊。

本脚本只接受"atlas PNG 进、GLB 出"的确定性装配，不生成任何贴图内容。
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ATLAS_SIZE = 128
ROOT_NODE_NAME = "ROOT_PhotoCharacter"
HEIGHTS = {"regular": 1.65, "tall": 1.70}

# 固定 UV 区域（与后端 texture_gen.VOXEL_REGIONS 同一契约，勿单独改）
VOXEL_REGIONS = {
    "head_left": (0, 96, 16, 16),
    "head_front": (16, 96, 16, 16),
    "head_right": (32, 96, 16, 16),
    "head_back": (48, 96, 16, 16),
    "head_top": (16, 112, 16, 16),
    "head_bottom": (32, 112, 16, 16),
    "torso_left": (0, 64, 8, 24),
    "torso_front": (8, 64, 16, 24),
    "torso_right": (24, 64, 8, 24),
    "torso_back": (32, 64, 16, 24),
    "torso_top": (8, 88, 16, 8),
    "torso_bottom": (24, 88, 16, 8),
    "arm_left": (0, 32, 8, 24),
    "arm_front": (8, 32, 8, 24),
    "arm_right": (16, 32, 8, 24),
    "arm_back": (24, 32, 8, 24),
    "arm_top": (8, 56, 8, 8),
    "arm_bottom": (16, 56, 8, 8),
    "leg_left": (32, 32, 8, 24),
    "leg_front": (40, 32, 8, 24),
    "leg_right": (48, 32, 8, 24),
    "leg_back": (56, 32, 8, 24),
    "leg_top": (40, 56, 8, 8),
    "leg_bottom": (48, 56, 8, 8),
}


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--person-id", required=True)
    parser.add_argument("--template", choices=sorted(HEIGHTS), default="regular")
    parser.add_argument("--height-scale", type=float, default=1.0)
    parser.add_argument("--portrait", default="")
    return parser.parse_args(argv)


def rect_uv(rect: tuple[int, int, int, int]) -> list[tuple[float, float]]:
    x, y, width, height = rect
    inset = 0.01
    return [
        ((x + inset) / ATLAS_SIZE, (y + inset) / ATLAS_SIZE),
        ((x + width - inset) / ATLAS_SIZE, (y + inset) / ATLAS_SIZE),
        ((x + width - inset) / ATLAS_SIZE, (y + height - inset) / ATLAS_SIZE),
        ((x + inset) / ATLAS_SIZE, (y + height - inset) / ATLAS_SIZE),
    ]


def regions_for(prefix: str) -> dict[str, str]:
    return {face: f"{prefix}_{face}"
            for face in ("front", "right", "back", "left", "top", "bottom")}


def make_atlas_material(name: str, image: bpy.types.Image) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (1.0, 1.0, 1.0, 1.0)
    material.use_backface_culling = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.94
    bsdf.inputs["Metallic"].default_value = 0.0
    texture = material.node_tree.nodes.new("ShaderNodeTexImage")
    texture.name = "CharacterAtlas"
    texture.image = image
    texture.interpolation = "Closest"
    material.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    material["atlas_size"] = ATLAS_SIZE
    material["sampler_interpolation"] = "Closest"
    return material


def add_uv_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    face_regions: dict[str, str],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    x, y, z = (value * 0.5 for value in dimensions)
    vertices = [
        (-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
        (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z),
    ]
    face_definitions = [
        ("front", (0, 1, 5, 4)),
        ("right", (1, 2, 6, 5)),
        ("back", (2, 3, 7, 6)),
        ("left", (3, 0, 4, 7)),
        ("top", (4, 5, 6, 7)),
        ("bottom", (3, 2, 1, 0)),
    ]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], [face for _, face in face_definitions])
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="VoxelAtlasUV")
    for polygon, (face_name, _) in zip(mesh.polygons, face_definitions):
        uvs = rect_uv(VOXEL_REGIONS[face_regions[face_name]])
        for loop_index, uv in zip(polygon.loop_indices, uvs):
            uv_layer.data[loop_index].uv = uv
    for polygon in mesh.polygons:
        polygon.use_smooth = False
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location = location
    obj.data.materials.append(material)
    obj.parent = parent
    return obj


def build_voxel_body(root: bpy.types.Object, collection: bpy.types.Collection,
                     material: bpy.types.Material, template: str) -> None:
    """固定体素身体：尺寸与 build_photo_character_modes.build_voxel_body 一致。"""
    if template == "tall":
        leg_height, torso_bottom, torso_height, head_size, top = \
            0.71, 0.71, 0.54, 0.43, 1.70
    else:
        leg_height, torso_bottom, torso_height, head_size, top = \
            0.66, 0.66, 0.55, 0.43, 1.65
    torso_top = torso_bottom + torso_height
    head_center = top - head_size * 0.5
    arm_center = torso_bottom + torso_height * 0.5

    add_uv_box("GEO_Head", (0.0, 0.0, head_center),
               (head_size, head_size, head_size),
               regions_for("head"), material, collection, root)
    add_uv_box("GEO_Torso", (0.0, 0.0, torso_bottom + torso_height * 0.5),
               (0.48, 0.25, torso_height),
               regions_for("torso"), material, collection, root)
    for side, x in (("L", -0.32), ("R", 0.32)):
        add_uv_box(f"GEO_Arm_{side}", (x, 0.0, arm_center),
                   (0.16, 0.23, torso_height),
                   regions_for("arm"), material, collection, root)
    for side, x in (("L", -0.12), ("R", 0.12)):
        add_uv_box(f"GEO_Leg_{side}", (x, 0.0, leg_height * 0.5),
                   (0.22, 0.24, leg_height),
                   regions_for("leg"), material, collection, root)


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    result = [root]
    for child in root.children:
        result.extend(descendants(child))
    return result


def export_character(root: bpy.types.Object, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    original_name = root.name
    root.name = ROOT_NODE_NAME
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    result = bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_extras=True,
        export_yup=True,
        export_apply=False,
        export_image_format="AUTO",
    )
    root.name = original_name
    if result != {"FINISHED"}:
        raise RuntimeError(f"glTF export failed: {path} -> {result}")


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_portrait(root: bpy.types.Object, path: Path, height_m: float) -> None:
    """固定机位正面胸像（关系 Map/资料侧栏用），规范同既有 voxel 肖像管线。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    # 无头 CPU 环境用 Cycles（EEVEE 需要 GL/EGL 上下文，headless 会崩）
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = False

    bpy.ops.mesh.primitive_cube_add(location=(0.0, 0.72, 1.28), scale=(2.3, 0.05, 2.3))
    backdrop = bpy.context.object
    backdrop.name = "PORTRAIT_Backdrop"
    backdrop_material = bpy.data.materials.new("MAT_PORTRAIT_Backdrop")
    backdrop_material.use_nodes = True
    backdrop_material.node_tree.nodes["Principled BSDF"].inputs[
        "Base Color"].default_value = (0.86, 0.91, 0.86, 1.0)
    backdrop.data.materials.append(backdrop_material)

    bpy.ops.object.camera_add(location=(1.9, -6.8, height_m * 0.75 + 1.04))
    camera = bpy.context.object
    camera.name = "PORTRAIT_Camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 1.34 * height_m / 1.65
    look_at(camera, (0.0, 0.0, height_m * 0.75))

    bpy.ops.object.light_add(type="AREA", location=(-3.2, -4.2, 5.0))
    key = bpy.context.object
    key.data.energy = 760
    key.data.color = (1.0, 0.88, 0.70)
    key.data.shape = "DISK"
    key.data.size = 4.0
    look_at(key, (0.0, 0.0, 1.3))
    bpy.ops.object.light_add(type="AREA", location=(3.8, -2.8, 3.2))
    fill = bpy.context.object
    fill.data.energy = 500
    fill.data.color = (0.66, 0.85, 0.82)
    fill.data.size = 3.2
    look_at(fill, (0.0, 0.0, 1.3))

    scene.camera = camera
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("PORTRAIT_World")
    scene.world.color = (0.79, 0.85, 0.82)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    atlas_path = Path(args.atlas)
    if not atlas_path.is_file():
        raise SystemExit(f"atlas 不存在：{atlas_path}")
    bpy.ops.wm.read_factory_settings(use_empty=True)

    image = bpy.data.images.load(str(atlas_path))
    image.colorspace_settings.name = "sRGB"
    image.pack()
    image["sampler_interpolation"] = "Closest"

    collection = bpy.data.collections.new("COL_VoxelPerson")
    bpy.context.scene.collection.children.link(collection)
    material = make_atlas_material(f"MAT_{args.person_id}_VoxelAtlas", image)

    height_m = round(HEIGHTS[args.template] * args.height_scale, 4)
    root = bpy.data.objects.new(f"ROOT_{args.person_id}_voxel", None)
    collection.objects.link(root)
    root["asset_kind"] = "photo-character"
    root["character_mode"] = "voxel"
    root["body_template"] = args.template
    root["person_id"] = args.person_id
    root["source_kind"] = "photo-derived-anonymous"
    root["height_m"] = height_m
    root["forward_local"] = "-Y"
    root["texture_policy"] = "ai-readable-pixel-abstraction-no-photo-projection"
    root["head_texture_faces"] = "front,left,right,back,top; bottom=design-default"
    root["atlas_resolution"] = ATLAS_SIZE
    root.scale = (args.height_scale, args.height_scale, args.height_scale)
    build_voxel_body(root, collection, material, args.template)

    export_character(root, Path(args.out))
    print(f"[voxel_person] exported: {args.out}")
    if args.portrait:
        render_portrait(root, Path(args.portrait), height_m)
        print(f"[voxel_person] portrait: {args.portrait}")


main()
