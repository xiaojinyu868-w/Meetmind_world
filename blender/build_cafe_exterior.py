"""EchoWorld 咖啡厅外观 v1 —— 木质咖啡厅小屋（参考 docs/643e66a9db8bcb96a9c3a1af7a1e5b7e.png）。

温馨木质咖啡厅：蓝灰石基一层 + 木架灰泥二层、板岩坡屋顶与老虎窗、
绿白条纹雨棚（scallop 檐边，与市集摊位 v2 同语言）、圆形 Cafe 挂牌、
临街露台（木平台 + 围栏 + 小圆桌）与窗花箱。黄昏暖窗（自发光玻璃）。

朝向约定：正面（门/雨棚/露台）朝 -Y（glTF 导出后面向 +Z）。
放置时由场景脚本整体旋转；门前的 ANCHOR_CafeDoor 是交互热点锚。
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = PROJECT_ROOT / "blender" / "echo_world_cafe_exterior.blend"
GLB_PATH = PROJECT_ROOT / "public" / "models" / "modules" / "echo_world_cafe_exterior_20260804.glb"
RENDER_PATH = PROJECT_ROOT / "renders" / "echo_world_cafe_exterior_preview.png"
MANIFEST_PATH = PROJECT_ROOT / "public" / "models" / "modules" / "echo_world_cafe_exterior_20260804_manifest.json"

SEED = 26080504

# 体块尺寸（米）：正面位于 y=-3.0
FOOTPRINT_X = 7.2
FOOTPRINT_Y = 6.0
WALL_FRONT_Y = -3.0
WALL_BACK_Y = 3.0
STONE_TOP_Z = 1.7
WALL_TOP_Z = 3.1
ROOF_PEAK_Z = 5.5
DOOR_X = -1.9


def srgb(hex_value: str) -> tuple[float, float, float, float]:
    value = hex_value.lstrip("#")

    def to_linear(channel: int) -> float:
        c = channel / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return tuple(to_linear(int(value[index : index + 2], 16)) for index in (0, 2, 4)) + (1.0,)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float = 0.92,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = max(0.7, roughness)
    bsdf.inputs["Metallic"].default_value = 0.0
    if emission is not None:
        for socket_name in ("Emission Color", "Emission"):
            socket = bsdf.inputs.get(socket_name)
            if socket is not None:
                socket.default_value = emission
                break
        strength_socket = bsdf.inputs.get("Emission Strength")
        if strength_socket is not None:
            strength_socket.default_value = emission_strength
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.append(material)


def set_flat(obj: bpy.types.Object) -> None:
    if hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = False


def add_empty(
    name: str,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    location: tuple[float, float, float] = (0.0, 0.0, 0.0),
    display_size: float = 0.12,
) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = display_size
    if parent is not None:
        obj.parent = parent
    obj.location = location
    return obj


def add_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    bevel: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add()
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0.0:
        modifier = obj.modifiers.new(name="CafeBevel", type="BEVEL")
        modifier.width = min(bevel, min(abs(value) for value in dimensions) * 0.28)
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    assign_material(obj, material)
    set_flat(obj)
    move_to_collection(obj, collection)
    if parent is not None:
        obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def add_cylinder(
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    vertices: int = 10,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth)
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    set_flat(obj)
    move_to_collection(obj, collection)
    if parent is not None:
        obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def add_cone(
    name: str,
    radius_bottom: float,
    radius_top: float,
    depth: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    vertices: int = 10,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius_bottom, radius2=radius_top, depth=depth)
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    set_flat(obj)
    move_to_collection(obj, collection)
    if parent is not None:
        obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def add_ico(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    subdivisions: int = 1,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    set_flat(obj)
    move_to_collection(obj, collection)
    if parent is not None:
        obj.parent = parent
    obj.location = location
    return obj


def add_prism(
    name: str,
    width: float,
    depth: float,
    height: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    # 三角棱柱：截面在 YZ 平面（底边宽 depth、高 height），沿 X 拉伸 width。
    # 用于山墙填充与小屋顶。底面居中于原点。
    dy = depth / 2.0
    verts = [
        (-width / 2, -dy, 0.0), (-width / 2, dy, 0.0), (-width / 2, 0.0, height),
        (width / 2, -dy, 0.0), (width / 2, dy, 0.0), (width / 2, 0.0, height),
    ]
    faces = [
        (0, 1, 2), (3, 5, 4),
        (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0),
    ]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    set_flat(obj)
    if parent is not None:
        obj.parent = parent
    obj.location = location
    return obj


def add_semicircle(
    name: str,
    radius: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    segments: int = 8,
) -> bpy.types.Object:
    # 本地 XZ 平面内的半圆扇：直边在 z=0（上沿）、圆弧朝 -Z，法线 +Y。
    verts = [(0.0, 0.0, 0.0)]
    for step in range(segments + 1):
        angle = math.radians(180.0 + 180.0 * step / segments)
        verts.append((radius * math.cos(angle), 0.0, radius * math.sin(angle)))
    faces = [(0, index + 1, index + 2) for index in range(segments)]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    set_flat(obj)
    if parent is not None:
        obj.parent = parent
    obj.location = location
    return obj


def add_text(
    name: str,
    body: str,
    size: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    rotation: tuple[float, float, float] = (math.radians(90.0), 0.0, 0.0),
    align: str = "CENTER",
    extrude: float = 0.012,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(f"{name}_Curve", type="FONT")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = extrude
    curve.bevel_depth = 0.0
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    assign_material(obj, material)
    if parent is not None:
        obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    # 字体三角化会产生少量退化面：转网格并用 bmesh 溶解（GLB 回导校验硬指标）
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-6, edges=list(bm.edges))
    bm.to_mesh(obj.data)
    bm.free()
    set_flat(obj)
    obj.select_set(False)
    return obj


def add_materials() -> dict[str, bpy.types.Material]:
    return {
        "stone": make_material("MAT_Cafe_Stone", srgb("#8A8F96"), 0.95),
        "stone_dark": make_material("MAT_Cafe_StoneDark", srgb("#6E747C"), 0.95),
        "plaster": make_material("MAT_Cafe_Plaster", srgb("#DCCFB2"), 0.94),
        "timber": make_material("MAT_Cafe_Timber", srgb("#6B4E36"), 0.9),
        "timber_dark": make_material("MAT_Cafe_TimberDark", srgb("#4E3826"), 0.9),
        "roof": make_material("MAT_Cafe_RoofSlate", srgb("#5B6672"), 0.96),
        "roof_edge": make_material("MAT_Cafe_RoofEdge", srgb("#49525C"), 0.96),
        "awning_green": make_material("MAT_Cafe_AwningGreen", srgb("#4F7A5A"), 0.94),
        "awning_cream": make_material("MAT_Cafe_AwningCream", srgb("#F2EAD8"), 0.96),
        "glass": make_material(
            "MAT_Cafe_GlassWarm",
            srgb("#FFE3AE"),
            0.7,
            emission=srgb("#FFC46A"),
            emission_strength=1.8,
        ),
        "door": make_material("MAT_Cafe_Door", srgb("#7A4E32"), 0.88),
        "deck": make_material("MAT_Cafe_Deck", srgb("#A87C50"), 0.92),
        "leaf": make_material("MAT_Cafe_Leaf", srgb("#6F9A5F"), 0.96),
        "flower_red": make_material("MAT_Cafe_FlowerRed", srgb("#C65F52"), 0.9),
        "flower_yellow": make_material("MAT_Cafe_FlowerYellow", srgb("#E4C46A"), 0.9),
        "sign_board": make_material("MAT_Cafe_SignBoard", srgb("#4E3826"), 0.88),
        "sign_text": make_material(
            "MAT_Cafe_SignText",
            srgb("#F2E4B8"),
            0.8,
            emission=srgb("#E8C96A"),
            emission_strength=0.35,
        ),
        "metal": make_material("MAT_Cafe_Metal", srgb("#3E3A36"), 0.8),
        "pot": make_material("MAT_Cafe_Pot", srgb("#B06A4A"), 0.94),
    }


def add_window(
    name: str,
    width: float,
    height: float,
    location: tuple[float, float, float],
    materials: dict,
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    cols: int = 3,
    rows: int = 2,
    flower_box: bool = True,
) -> None:
    """多格暖窗：木框 + 十字棂 + 自发光玻璃，立面朝 -Y。"""
    x, y, z = location
    add_box(f"{name}_Glass", (width - 0.08, 0.03, height - 0.08), (x, y + 0.02, z), materials["glass"], collection, root)
    # 外框
    frame = 0.055
    add_box(f"{name}_FrameTop", (width, 0.06, frame), (x, y, z + height / 2 - frame / 2), materials["timber"], collection, root)
    add_box(f"{name}_FrameBottom", (width, 0.06, frame), (x, y, z - height / 2 + frame / 2), materials["timber"], collection, root)
    add_box(f"{name}_FrameL", (frame, 0.06, height), (x - width / 2 + frame / 2, y, z), materials["timber"], collection, root)
    add_box(f"{name}_FrameR", (frame, 0.06, height), (x + width / 2 - frame / 2, y, z), materials["timber"], collection, root)
    # 棂条
    for index in range(1, cols):
        bar_x = x - width / 2 + width * index / cols
        add_box(f"{name}_MullionV{index}", (0.035, 0.05, height - 0.06), (bar_x, y - 0.005, z), materials["timber"], collection, root)
    for index in range(1, rows):
        bar_z = z - height / 2 + height * index / rows
        add_box(f"{name}_MullionH{index}", (width - 0.06, 0.05, 0.035), (x, y - 0.005, bar_z), materials["timber"], collection, root)
    if not flower_box:
        return
    # 窗台花箱
    add_box(
        f"{name}_FlowerBox",
        (width * 0.9, 0.16, 0.13),
        (x, y - 0.09, z - height / 2 - 0.09),
        materials["timber_dark"],
        collection,
        root,
        bevel=0.012,
    )
    for index in range(4):
        flower_x = x - width * 0.36 + index * width * 0.24
        add_ico(
            f"{name}_Flower_{index + 1}",
            (flower_x, y - 0.10, z - height / 2 + 0.01),
            (0.055, 0.05, 0.06),
            materials["flower_red"] if index % 2 == 0 else materials["flower_yellow"],
            collection,
            root,
        )
        add_ico(
            f"{name}_Leaf_{index + 1}",
            (flower_x + 0.04, y - 0.08, z - height / 2 - 0.03),
            (0.06, 0.045, 0.04),
            materials["leaf"],
            collection,
            root,
        )


def add_walls(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    half_x = FOOTPRINT_X / 2.0
    # 石基一层（四面围合，正面开门窗洞——用分段墙拼出洞口）
    # 背面与侧面整墙
    add_box("WALL_Back_Stone", (FOOTPRINT_X, 0.24, STONE_TOP_Z), (0.0, WALL_BACK_Y - 0.12, STONE_TOP_Z / 2), materials["stone"], collection, root, bevel=0.01)
    add_box("WALL_Left_Stone", (0.24, FOOTPRINT_Y - 0.4, STONE_TOP_Z), (-half_x + 0.12, 0.0, STONE_TOP_Z / 2), materials["stone"], collection, root, bevel=0.01)
    add_box("WALL_Right_Stone", (0.24, FOOTPRINT_Y - 0.4, STONE_TOP_Z), (half_x - 0.12, 0.0, STONE_TOP_Z / 2), materials["stone"], collection, root, bevel=0.01)
    # 正面：门（x=DOOR_X，宽 0.95）+ 两扇大窗（中心 x=0.5 / 2.55，各宽 1.5）
    front_y = WALL_FRONT_Y + 0.12
    add_box("WALL_Front_Stone_L", (DOOR_X + half_x - 0.5, 0.24, STONE_TOP_Z), ((-half_x + DOOR_X - 0.5) / 2 + 0.0, front_y, STONE_TOP_Z / 2), materials["stone"], collection, root, bevel=0.01)
    add_box("WALL_Front_Stone_Mid", (0.8, 0.24, STONE_TOP_Z), (DOOR_X + 0.475 + 0.4, front_y, STONE_TOP_Z / 2), materials["stone"], collection, root, bevel=0.01)
    add_box("WALL_Front_Stone_Top", (FOOTPRINT_X, 0.24, STONE_TOP_Z - 1.35), (0.0, front_y, (STONE_TOP_Z + 1.35) / 2 + 0.0), materials["stone"], collection, root, bevel=0.01)
    add_box("WALL_Front_Stone_Sill1", (1.5, 0.24, 0.35), (0.5, front_y, 0.175), materials["stone"], collection, root, bevel=0.01)
    add_box("WALL_Front_Stone_Sill2", (1.5, 0.24, 0.35), (2.55, front_y, 0.175), materials["stone"], collection, root, bevel=0.01)
    add_box("WALL_Front_Stone_R", (half_x - 3.3, 0.24, STONE_TOP_Z), ((3.3 + half_x) / 2, front_y, STONE_TOP_Z / 2), materials["stone"], collection, root, bevel=0.01)
    # 石墙裙（外延一圈，更有落地感）
    add_box("WALL_Skirt", (FOOTPRINT_X + 0.3, FOOTPRINT_Y + 0.3, 0.28), (0.0, 0.0, 0.14), materials["stone_dark"], collection, root, bevel=0.02)
    # 木架二层：灰泥填充 + 木骨架
    upper_h = WALL_TOP_Z - STONE_TOP_Z
    upper_z = STONE_TOP_Z + upper_h / 2
    add_box("WALL_Upper_Core", (FOOTPRINT_X - 0.1, FOOTPRINT_Y - 0.1, upper_h), (0.0, 0.0, upper_z), materials["plaster"], collection, root)
    # 木骨架：四角立柱 + 上下圈梁 + 正面竖筋
    for label, x, y in (("FL", -half_x + 0.1, WALL_FRONT_Y + 0.1), ("FR", half_x - 0.1, WALL_FRONT_Y + 0.1), ("BL", -half_x + 0.1, WALL_BACK_Y - 0.1), ("BR", half_x - 0.1, WALL_BACK_Y - 0.1)):
        add_box(f"TIMBER_Post_{label}", (0.16, 0.16, upper_h), (x, y, upper_z), materials["timber"], collection, root)
    add_box("TIMBER_BeamTop_F", (FOOTPRINT_X, 0.14, 0.14), (0.0, WALL_FRONT_Y + 0.07, WALL_TOP_Z - 0.07), materials["timber"], collection, root)
    add_box("TIMBER_BeamTop_B", (FOOTPRINT_X, 0.14, 0.14), (0.0, WALL_BACK_Y - 0.07, WALL_TOP_Z - 0.07), materials["timber"], collection, root)
    add_box("TIMBER_BeamMid_F", (FOOTPRINT_X, 0.12, 0.12), (0.0, WALL_FRONT_Y + 0.06, STONE_TOP_Z + 0.06), materials["timber"], collection, root)
    for index, x in enumerate((-2.9, -2.0, -1.1, -0.2, 0.7, 1.6, 2.5), start=1):
        add_box(f"TIMBER_Stud_{index}", (0.1, 0.1, upper_h), (x, WALL_FRONT_Y + 0.05, upper_z), materials["timber"], collection, root)
    # 二层正面三扇小窗（与一层大开窗形成节奏）
    upper_win_z = STONE_TOP_Z + upper_h * 0.78
    for index, x in enumerate((-1.55, 0.25, 2.05), start=1):
        add_window(f"WINDOW_Upper_{index}", 0.85, 0.62, (x, WALL_FRONT_Y - 0.005, upper_win_z), materials, collection, root, cols=2, rows=2, flower_box=False)


def add_roof(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    half_x = FOOTPRINT_X / 2.0
    slope_run = FOOTPRINT_Y / 2.0 + 0.55  # 含挑檐
    rise = ROOF_PEAK_Z - WALL_TOP_Z
    slope_len = math.hypot(slope_run, rise)
    angle = math.atan2(rise, slope_run)
    mid_z = (WALL_TOP_Z + ROOF_PEAK_Z) / 2
    # 前后两块坡面
    add_box(
        "ROOF_SlopeFront",
        (FOOTPRINT_X + 0.9, slope_len, 0.14),
        (0.0, -(slope_run / 2) + 0.05, mid_z + 0.1),
        materials["roof"],
        collection,
        root,
        rotation=(-angle, 0.0, 0.0),
        bevel=0.015,
    )
    add_box(
        "ROOF_SlopeBack",
        (FOOTPRINT_X + 0.9, slope_len, 0.14),
        (0.0, (slope_run / 2) - 0.05, mid_z + 0.1),
        materials["roof"],
        collection,
        root,
        rotation=(angle, 0.0, 0.0),
        bevel=0.015,
    )
    # 屋脊
    add_box("ROOF_Ridge", (FOOTPRINT_X + 0.95, 0.22, 0.16), (0.0, 0.0, ROOF_PEAK_Z + 0.06), materials["roof_edge"], collection, root, bevel=0.02)
    # 两端山墙（灰泥 + 木架三角）
    for label, x in (("L", -half_x + 0.06), ("R", half_x - 0.06)):
        add_prism(f"GABLE_{label}", 0.18, FOOTPRINT_Y - 1.0, rise - 0.30, (x, 0.0, WALL_TOP_Z), materials["plaster"], collection, root)
        add_prism(f"GABLE_Timber_{label}", 0.2, 0.16, rise - 0.40, (x + (0.02 if label == "L" else -0.02), 0.0, WALL_TOP_Z), materials["timber"], collection, root)
    # 老虎窗两扇（前坡）
    for index, x in enumerate((-1.7, 1.4), start=1):
        y = -slope_run * 0.52
        z = WALL_TOP_Z + rise * 0.42
        add_box(f"DORMER_{index}_Body", (0.85, 0.75, 0.8), (x, y, z), materials["plaster"], collection, root, bevel=0.01)
        add_prism(f"DORMER_{index}_Roof", 0.95, 0.85, 0.42, (x, y - 0.02, z + 0.38), materials["roof"], collection, root)
        add_window(f"DORMER_{index}_Win", 0.5, 0.5, (x, y - 0.40, z), materials, collection, root, cols=2, rows=2, flower_box=False)
    # 烟囱（右侧后坡）
    add_box("ROOF_Chimney", (0.55, 0.55, 1.5), (2.1, 1.3, ROOF_PEAK_Z + 0.35), materials["stone"], collection, root, bevel=0.015)
    add_box("ROOF_ChimneyCap", (0.7, 0.7, 0.14), (2.1, 1.3, ROOF_PEAK_Z + 1.12), materials["stone_dark"], collection, root, bevel=0.015)


def add_awning_and_sign(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    # 绿白条纹雨棚：罩住正面两扇大窗，前低后高 + scallop 檐边（与摊位 v2 同语言）
    width = 4.8
    center_x = 1.2
    stripes = 9
    stripe_w = width / stripes
    theta = math.radians(14.0)
    slope_len = 1.15
    mid_y, mid_z = WALL_FRONT_Y - 0.52, 2.42
    for index in range(stripes):
        offset = center_x - width / 2.0 + stripe_w * (index + 0.5)
        material = materials["awning_green"] if index % 2 == 0 else materials["awning_cream"]
        add_box(
            f"AWNING_Stripe_{index + 1:02d}",
            (stripe_w + 0.012, slope_len, 0.035),
            (offset, mid_y, mid_z),
            material,
            collection,
            root,
            rotation=(theta, 0.0, 0.0),
        )
    front_y = mid_y - (slope_len / 2.0) * math.cos(theta)
    front_z = mid_z - (slope_len / 2.0) * math.sin(theta)
    scallops = 12
    spacing = width / scallops
    for index in range(scallops):
        offset = center_x - width / 2.0 + spacing * (index + 0.5)
        stripe_index = int((offset - (center_x - width / 2.0)) / stripe_w)
        material = materials["awning_green"] if stripe_index % 2 == 0 else materials["awning_cream"]
        add_semicircle(
            f"AWNING_Scallop_{index + 1:02d}",
            spacing * 0.5,
            (offset, front_y + 0.004, front_z - 0.008),
            material,
            collection,
            root,
        )
    # 圆形挂牌：铸铁支架 + 木圆牌 + Cafe 字样
    add_cylinder("SIGN_BracketArm", 0.025, 0.7, (DOOR_X - 0.4, WALL_FRONT_Y - 0.45, 2.86), materials["metal"], collection, root, vertices=6, rotation=(math.radians(90.0), 0.0, 0.0))
    add_cylinder("SIGN_BracketPost", 0.02, 0.5, (DOOR_X - 0.4, WALL_FRONT_Y - 0.06, 2.62), materials["metal"], collection, root, vertices=6)
    add_cylinder("SIGN_Cord", 0.008, 0.16, (DOOR_X - 0.4, WALL_FRONT_Y - 0.72, 2.78), materials["metal"], collection, root, vertices=6)
    add_cylinder("SIGN_Board", 0.34, 0.05, (DOOR_X - 0.4, WALL_FRONT_Y - 0.72, 2.44), materials["sign_board"], collection, root, vertices=16, rotation=(math.radians(90.0), 0.0, 0.0))
    add_cylinder("SIGN_BoardRim", 0.36, 0.035, (DOOR_X - 0.4, WALL_FRONT_Y - 0.72, 2.44), materials["timber"], collection, root, vertices=16, rotation=(math.radians(90.0), 0.0, 0.0))
    add_text("SIGN_Text", "Cafe", 0.22, (DOOR_X - 0.4, WALL_FRONT_Y - 0.755, 2.44), materials["sign_text"], collection, root)
    # 门上方横匾
    add_box("SIGN_HeaderBoard", (1.3, 0.06, 0.34), (DOOR_X, WALL_FRONT_Y - 0.10, 2.62), materials["sign_board"], collection, root, bevel=0.02)
    add_text("SIGN_HeaderText", "Echo Cafe", 0.20, (DOOR_X, WALL_FRONT_Y - 0.145, 2.62), materials["sign_text"], collection, root)


def add_door_and_windows(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    front_face = WALL_FRONT_Y - 0.005
    # 木门（带小窗与门楣灯）
    add_box("DOOR_Panel", (0.95, 0.09, 1.32), (DOOR_X, front_face + 0.03, 0.68), materials["door"], collection, root, bevel=0.015)
    add_box("DOOR_FrameTop", (1.1, 0.12, 0.1), (DOOR_X, front_face + 0.02, 1.40), materials["timber"], collection, root, bevel=0.012)
    add_box("DOOR_FrameL", (0.09, 0.12, 1.42), (DOOR_X - 0.52, front_face + 0.02, 0.71), materials["timber"], collection, root, bevel=0.012)
    add_box("DOOR_FrameR", (0.09, 0.12, 1.42), (DOOR_X + 0.52, front_face + 0.02, 0.71), materials["timber"], collection, root, bevel=0.012)
    add_window("DOOR_Win", 0.5, 0.42, (DOOR_X, front_face - 0.02, 0.98), materials, collection, root, cols=2, rows=2)
    add_ico("DOOR_Knob", (DOOR_X + 0.32, front_face - 0.045, 0.66), (0.035, 0.03, 0.035), materials["sign_text"], collection, root)
    # 门前台阶
    add_box("DOOR_Step_1", (1.5, 0.5, 0.14), (DOOR_X, WALL_FRONT_Y - 0.35, 0.07), materials["stone_dark"], collection, root, bevel=0.015)
    add_box("DOOR_Step_2", (1.8, 0.5, 0.07), (DOOR_X, WALL_FRONT_Y - 0.62, 0.035), materials["stone"], collection, root, bevel=0.012)
    # 两扇临街大窗
    add_window("WINDOW_Front_1", 1.5, 1.0, (0.5, front_face, 0.88), materials, collection, root, cols=3, rows=2)
    add_window("WINDOW_Front_2", 1.5, 1.0, (2.55, front_face, 0.88), materials, collection, root, cols=3, rows=2)
    # 侧墙小窗（左右各一）
    add_box("WINDOW_SideL_Glass", (0.03, 0.9, 0.8), (-FOOTPRINT_X / 2 - 0.005, 0.3, 0.95), materials["glass"], collection, root)
    add_box("WINDOW_SideL_Frame", (0.05, 1.0, 0.9), (-FOOTPRINT_X / 2 + 0.01, 0.3, 0.95), materials["timber"], collection, root)
    add_box("WINDOW_SideR_Glass", (0.03, 0.9, 0.8), (FOOTPRINT_X / 2 + 0.005, -0.6, 0.95), materials["glass"], collection, root)
    add_box("WINDOW_SideR_Frame", (0.05, 1.0, 0.9), (FOOTPRINT_X / 2 - 0.01, -0.6, 0.95), materials["timber"], collection, root)
    # 门两侧壁灯
    for label, x in (("L", DOOR_X - 0.75), ("R", DOOR_X + 0.75)):
        add_cylinder(f"LAMP_{label}_Arm", 0.015, 0.2, (x, front_face - 0.10, 1.62), materials["metal"], collection, root, vertices=6, rotation=(math.radians(65.0), 0.0, 0.0))
        add_cone(f"LAMP_{label}_Cap", 0.09, 0.02, 0.07, (x, front_face - 0.17, 1.58), materials["metal"], collection, root, vertices=8)
        add_cylinder(f"LAMP_{label}_Glass", 0.06, 0.12, (x, front_face - 0.17, 1.48), materials["glass"], collection, root, vertices=8)


def add_terrace(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    # 临街木平台：雨棚窗下整片 + 围栏 + 两套小圆桌 + 盆栽
    deck_front = WALL_FRONT_Y - 1.85
    add_box("TERRACE_Deck", (5.6, 1.85, 0.12), (0.9, WALL_FRONT_Y - 0.925, 0.10), materials["deck"], collection, root, bevel=0.015)
    # 围栏（只围外露三边：前缘 + 右侧 + 左侧局部）
    rail_z = 0.55
    for index in range(8):
        x = -1.75 + index * 0.76
        add_cylinder(f"TERRACE_RailPost_{index + 1:02d}", 0.045, rail_z + 0.12, (x, deck_front, (rail_z + 0.12) / 2 + 0.14), materials["timber"], collection, root, vertices=8)
    add_box("TERRACE_RailTop", (5.6, 0.08, 0.07), (0.9, deck_front, rail_z + 0.16), materials["timber"], collection, root, bevel=0.01)
    add_box("TERRACE_RailMid", (5.6, 0.06, 0.05), (0.9, deck_front, rail_z - 0.08), materials["timber"], collection, root)
    for label, x in (("L", -1.85), ("R", 3.65)):
        add_box(f"TERRACE_SideRail_{label}", (0.07, 1.85, 0.07), (x, WALL_FRONT_Y - 0.925, rail_z + 0.16), materials["timber"], collection, root, bevel=0.01)
        add_cylinder(f"TERRACE_SidePost_{label}_F", 0.045, rail_z + 0.12, (x, deck_front, (rail_z + 0.12) / 2 + 0.14), materials["timber"], collection, root, vertices=8)
    # 两套小圆桌椅
    for index, (tx, ty) in enumerate(((2.1, -3.85), (3.0, -3.6)), start=1):
        add_cylinder(f"TERRACE_Table_{index}_Top", 0.32, 0.045, (tx, ty, 0.68), materials["timber_dark"], collection, root, vertices=12)
        add_cylinder(f"TERRACE_Table_{index}_Leg", 0.04, 0.62, (tx, ty, 0.36), materials["metal"], collection, root, vertices=8)
        add_cylinder(f"TERRACE_Table_{index}_Base", 0.16, 0.04, (tx, ty, 0.16), materials["metal"], collection, root, vertices=10)
        add_ico(f"TERRACE_Table_{index}_Cup", (tx + 0.1, ty + 0.06, 0.74), (0.035, 0.035, 0.05), materials["awning_cream"], collection, root)
        for chair, (cx, cy) in enumerate(((tx - 0.5, ty + 0.15), (tx + 0.42, ty - 0.3)), start=1):
            add_box(f"TERRACE_Chair_{index}_{chair}_Seat", (0.3, 0.3, 0.05), (cx, cy, 0.36), materials["timber"], collection, root, bevel=0.01)
            add_box(f"TERRACE_Chair_{index}_{chair}_Back", (0.3, 0.05, 0.34), (cx, cy + 0.14, 0.55), materials["timber"], collection, root, bevel=0.01)
            for leg, (lx, ly) in enumerate(((cx - 0.12, cy - 0.12), (cx + 0.12, cy - 0.12), (cx - 0.12, cy + 0.12), (cx + 0.12, cy + 0.12)), start=1):
                add_cylinder(f"TERRACE_Chair_{index}_{chair}_Leg{leg}", 0.022, 0.34, (lx, ly, 0.17), materials["timber_dark"], collection, root, vertices=6)
    # 门边盆栽
    for index, x in enumerate((DOOR_X - 0.85, DOOR_X + 0.85), start=1):
        add_cone(f"PLANT_{index}_Pot", 0.14, 0.10, 0.20, (x, WALL_FRONT_Y - 0.42, 0.24), materials["pot"], collection, root, vertices=9)
        add_ico(f"PLANT_{index}_Leaf_1", (x, WALL_FRONT_Y - 0.42, 0.48), (0.14, 0.12, 0.17), materials["leaf"], collection, root)
        add_ico(f"PLANT_{index}_Leaf_2", (x + 0.08, WALL_FRONT_Y - 0.40, 0.40), (0.10, 0.09, 0.12), materials["leaf"], collection, root)


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection) -> None:
    world = bpy.data.worlds.new("PREVIEW_CafeWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#7E96B8")
    background.inputs["Strength"].default_value = 0.30
    bpy.context.scene.world = world

    add_box(
        "PREVIEW_GroundCard",
        (16.0, 16.0, 0.05),
        (0.0, 0.0, -0.025),
        make_material("MAT_Preview_Ground", srgb("#9AAE7E"), 0.98),
        collection,
    )

    camera_data = bpy.data.cameras.new("PREVIEW_CafeCamera")
    camera = bpy.data.objects.new("PREVIEW_CafeCamera", camera_data)
    collection.objects.link(camera)
    camera.location = (7.8, -10.5, 4.6)
    camera_data.lens = 52.0
    look_at(camera, Vector((0.0, -0.6, 1.9)))
    bpy.context.scene.camera = camera

    sun_data = bpy.data.lights.new("PREVIEW_SoftSun", type="SUN")
    sun_data.energy = 1.6
    sun_data.angle = math.radians(14.0)
    sun_data.color = srgb("#FFD9A8")[:3]
    sun = bpy.data.objects.new("PREVIEW_SoftSun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(48.0), math.radians(-10.0), math.radians(-38.0))

    fill_data = bpy.data.lights.new("PREVIEW_CafeFill", type="AREA")
    fill_data.energy = 260.0
    fill_data.shape = "DISK"
    fill_data.size = 5.0
    fill_data.color = srgb("#FFE0B0")[:3]
    fill = bpy.data.objects.new("PREVIEW_CafeFill", fill_data)
    collection.objects.link(fill)
    fill.location = (-3.5, -5.5, 5.2)
    look_at(fill, Vector((0.0, 0.0, 1.6)))

    scene = bpy.context.scene
    engine_override = os.environ.get("ECHO_RENDER_ENGINE")
    if engine_override:
        scene.render.engine = engine_override
    else:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 64
        scene.cycles.use_denoising = True
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = False
    scene.render.filepath = str(RENDER_PATH)
    scene.view_settings.view_transform = "AgX"
    for look in ("AgX - Medium High Contrast", "AgX - Medium Low Contrast", "Medium High Contrast"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue


def export_runtime(collection: bpy.types.Collection) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["ROOT_CafeExterior"]
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    result = bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_animations=False,
        export_apply=True,
    )
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF export failed: {result}")


def build_scene() -> None:
    reset_scene()
    runtime = make_collection("CAFE_ExteriorRuntime")
    preview = make_collection("CAFE_ExteriorPreviewOnly")
    materials = add_materials()

    root = add_empty("ROOT_CafeExterior", runtime, display_size=0.4)
    root["asset_type"] = "EchoWorld cafe exterior venue module"
    root["style_version"] = "cafe-exterior-v1"
    root["unit"] = "meter"
    root["front_side"] = "-Y (glTF +Z, toward the plaza/street)"
    root["reference"] = "docs/643e66a9db8bcb96a9c3a1af7a1e5b7e.png"
    root["seed"] = SEED

    add_walls(runtime, root, materials)
    add_roof(runtime, root, materials)
    add_door_and_windows(runtime, root, materials)
    add_awning_and_sign(runtime, root, materials)
    add_terrace(runtime, root, materials)

    door_anchor = add_empty(
        "ANCHOR_CafeDoor",
        runtime,
        root,
        location=(DOOR_X, WALL_FRONT_Y - 2.1, 0.0),
        display_size=0.2,
    )
    door_anchor["anchor_kind"] = "venue_door"
    door_anchor["interaction"] = "press E to enter cafe interior world"

    configure_preview(preview)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene["echo_world_asset"] = "cafe exterior venue module v1"

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_runtime(runtime)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    manifest = {
        "schema_version": "echo-cafe-exterior.v1",
        "name": "EchoWorld Cafe Exterior (Wooden Cafe House)",
        "style": "storybook timber cafe; blue-grey stone base, plaster+timber upper, slate gable roof with dormers, green-striped awning with scallop valance, terrace, warm windows",
        "reference_image": "docs/643e66a9db8bcb96a9c3a1af7a1e5b7e.png",
        "generator": "blender/build_cafe_exterior.py",
        "seed": SEED,
        "blend": str(BLEND_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "glb": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "preview": str(RENDER_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "root_node": root.name,
        "door_anchor": "ANCHOR_CafeDoor",
        "scale_contract": {
            "unit": "meter",
            "footprint_m": [FOOTPRINT_X, FOOTPRINT_Y],
            "wall_top_z_m": WALL_TOP_Z,
            "roof_peak_z_m": ROOF_PEAK_Z,
            "door_x_m": DOOR_X,
        },
        "coordinate_contract": {
            "origin": "building center on ground",
            "front_side": "-Y in Blender, +Z after glTF export",
            "up_axis_export": "+Y via glTF",
        },
        "export_excludes": ["CAFE_ExteriorPreviewOnly collection", "preview camera", "preview lights", "preview ground card"],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    build_scene()
