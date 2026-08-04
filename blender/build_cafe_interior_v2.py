"""EchoWorld 咖啡厅室内 v2 —— 单层木质咖啡厅（参考 docs/643e66a9db8bcb96a9c3a1af7a1e5b7e.png 内部透视）。

布局（保留 v1 全部交互契约坐标，前端 CafeLayout.js / 后端 tables.py 零改动）：
  北墙（z=-5.0）：吧台区——长吧台 + 背柜层架 + 黑板菜单 + 高脚凳 + 吊灯
  中央：6 人实木圆桌 (0,0) + 中心绿植 + 圆毯（TABLE_Central6 / SEAT_Central6_01..06）
  西侧：两张双人方桌（-3.65,±1.55，TABLE_2_01/02，临西墙大窗）
  东侧：两张四人桌（3.28,-1.35 / 3.28,1.65，TABLE_4_01/02，临书架与吧台侧）
  西南角：沙发区——L 形沙发 + 圆茶几 + 落地灯 + 书架 + 地毯
  南墙：入口木门（(0,4.45)，ANCHOR_PlayerSpawn 在门内）
契约节点：ROOT_Cafe / GROUND_CafeFloor / ANCHOR_PlayerSpawn / INTERACT_CentralTable /
  TABLE_Central6 / TABLE_2_01..02 / TABLE_4_01..02 / 18 个 SEAT_*（座高 0.46、桌高 0.76）。
风格与 hub-town / cafe-exterior 一致：暖木 + 灰泥 + 绿植 + 黄昏暖灯。
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = PROJECT_ROOT / "blender" / "echo_world_cafe_interior_v2.blend"
GLB_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_cafe_interior_v2.glb"
RENDER_PATH = PROJECT_ROOT / "renders" / "echo_world_cafe_interior_v2_preview.png"
ANCHORS_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_cafe_interior_v2_anchors.json"
MANIFEST_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_cafe_interior_v2_manifest.json"

SEED = 26080504

# 房间：可玩 bounds ±5.35/±4.45（不变），墙体在其外
WALL_X = 5.6
WALL_Z_N = -5.0
WALL_Z_S = 4.9
CEIL_Z = 3.05
SEAT_H = 0.46
TABLE_H = 0.76

# —— 交互契约坐标（与 src/runtime/CafeLayout.js / backend/app/world/tables.py 一致，唯一事实源）——
ROUND_TABLE = {"node": "TABLE_Central6", "center": (0.0, 0.0), "interact_radius": 2.72}
ROUND_SEATS = [
    ("SEAT_Central6_04", 0.0, 1.57, math.pi),
    ("SEAT_Central6_03", 1.36, 0.785, -math.pi * 2 / 3),
    ("SEAT_Central6_02", 1.36, -0.785, -math.pi / 3),
    ("SEAT_Central6_01", 0.0, -1.57, 0.0),
    ("SEAT_Central6_06", -1.36, -0.785, math.pi / 3),
    ("SEAT_Central6_05", -1.36, 0.785, math.pi * 2 / 3),
]
NPC_TABLES = [
    {
        "node": "TABLE_2_01", "label": "窗边双人桌", "center": (-3.65, -1.55), "kind": "two",
        "seats": [("SEAT_2_01_01", -4.53, -1.55, math.pi / 2), ("SEAT_2_01_02", -2.77, -1.55, -math.pi / 2)],
    },
    {
        "node": "TABLE_2_02", "label": "海报双人桌", "center": (-3.65, 1.55), "kind": "two",
        "seats": [("SEAT_2_02_01", -4.53, 1.55, math.pi / 2), ("SEAT_2_02_02", -2.77, 1.55, -math.pi / 2)],
    },
    {
        "node": "TABLE_4_01", "label": "书架四人桌", "center": (3.28, -1.35), "kind": "four",
        "seats": [
            ("SEAT_4_01_01", 2.89, -0.53, math.pi * 0.86), ("SEAT_4_01_02", 3.67, -0.53, -math.pi * 0.86),
            ("SEAT_4_01_03", 2.89, -2.17, math.pi * 0.14), ("SEAT_4_01_04", 3.67, -2.17, -math.pi * 0.14),
        ],
    },
    {
        "node": "TABLE_4_02", "label": "吧台侧四人桌", "center": (3.28, 1.65), "kind": "four",
        "seats": [
            ("SEAT_4_02_01", 2.89, 2.47, math.pi * 0.86), ("SEAT_4_02_02", 3.67, 2.47, -math.pi * 0.86),
            ("SEAT_4_02_03", 2.89, 0.83, math.pi * 0.14), ("SEAT_4_02_04", 3.67, 0.83, -math.pi * 0.14),
        ],
    },
]
PLAYER_SPAWN = (0.0, 4.15, math.pi)
DOOR_POS = (0.0, WALL_Z_S)


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
        modifier = obj.modifiers.new(name="CafeIntBevel", type="BEVEL")
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


def add_materials() -> dict[str, bpy.types.Material]:
    return {
        "floor_a": make_material("MAT_CafeInt_FloorA", srgb("#A87C50"), 0.9),
        "floor_b": make_material("MAT_CafeInt_FloorB", srgb("#96 manufacturing"), 0.9) if False else make_material("MAT_CafeInt_FloorB", srgb("#966B42"), 0.9),
        "plaster": make_material("MAT_CafeInt_Plaster", srgb("#E2D5B8"), 0.94),
        "wainscot": make_material("MAT_CafeInt_Wainscot", srgb("#7A5A3C"), 0.9),
        "timber": make_material("MAT_CafeInt_Timber", srgb("#6B4E36"), 0.9),
        "timber_dark": make_material("MAT_CafeInt_TimberDark", srgb("#4E3826"), 0.88),
        "table_top": make_material("MAT_CafeInt_TableTop", srgb("#8A6242"), 0.86),
        "chair_wood": make_material("MAT_CafeInt_ChairWood", srgb("#7A5A3C"), 0.9),
        "cushion": make_material("MAT_CafeInt_CushionGreen", srgb("#5F7F5A"), 0.96),
        "sofa": make_material("MAT_CafeInt_Sofa", srgb("#8A6E52"), 0.96),
        "sofa_cushion": make_material("MAT_CafeInt_SofaCushion", srgb("#6F8A5A"), 0.96),
        "rug": make_material("MAT_CafeInt_Rug", srgb("#B08C5A"), 0.98),
        "rug_trim": make_material("MAT_CafeInt_RugTrim", srgb("#8A6242"), 0.98),
        "bar_top": make_material("MAT_CafeInt_BarTop", srgb("#5E422C"), 0.84),
        "chalk": make_material("MAT_CafeInt_Chalkboard", srgb("#3E4A42"), 0.94),
        "chalk_line": make_material("MAT_CafeInt_ChalkLine", srgb("#D8D2BC"), 0.9),
        "glass": make_material("MAT_CafeInt_GlassWarm", srgb("#FFE3AE"), 0.7, emission=srgb("#FFC46A"), emission_strength=1.8),
        "lamp_glass": make_material("MAT_CafeInt_LampGlass", srgb("#FFE9C0"), 0.7, emission=srgb("#FFC46A"), emission_strength=2.4),
        "metal": make_material("MAT_CafeInt_Metal", srgb("#4A443E"), 0.8),
        "brass": make_material("MAT_CafeInt_Brass", srgb("#B08C4A"), 0.75),
        "leaf": make_material("MAT_CafeInt_Leaf", srgb("#6F9A5F"), 0.96),
        "pot": make_material("MAT_CafeInt_Pot", srgb("#B06A4A"), 0.94),
        "cup": make_material("MAT_CafeInt_Cup", srgb("#EFE8D8"), 0.85),
        "jar": make_material("MAT_CafeInt_Jar", srgb("#C4B49A"), 0.9),
        "book_red": make_material("MAT_CafeInt_BookRed", srgb("#A6534A"), 0.94),
        "book_green": make_material("MAT_CafeInt_BookGreen", srgb("#6F8A5A"), 0.94),
        "book_blue": make_material("MAT_CafeInt_BookBlue", srgb("#5E7B9C"), 0.94),
        "machine": make_material("MAT_CafeInt_Machine", srgb("#8A8F96"), 0.75),
        "door": make_material("MAT_CafeInt_Door", srgb("#7A4E32"), 0.88),
    }


def add_room_shell(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    # 地板（契约 GROUND_CafeFloor）+ 木条拼色
    add_box("GROUND_CafeFloor", (WALL_X * 2, WALL_Z_S - WALL_Z_N, 0.1), (0.0, (WALL_Z_S + WALL_Z_N) / 2, -0.05), materials["floor_a"], collection, root)
    plank_w = 0.62
    index = 0
    x = -WALL_X + plank_w / 2
    while x < WALL_X - 0.1:
        index += 1
        if index % 2 == 0:
            add_box(
                f"FLOOR_Plank_{index:02d}",
                (plank_w - 0.04, WALL_Z_S - WALL_Z_N - 0.1, 0.015),
                (x, (WALL_Z_S + WALL_Z_N) / 2, 0.008),
                materials["floor_b"], collection, root,
            )
        x += plank_w
    # 四面墙（灰泥 + 护墙板）
    wall_h = CEIL_Z
    add_box("WALL_North", (WALL_X * 2, 0.24, wall_h), (0.0, WALL_Z_N - 0.12, wall_h / 2), materials["plaster"], collection, root)
    add_box("WALL_South_L", (WALL_X - 0.75, 0.24, wall_h), (-(0.75 + WALL_X) / 2, WALL_Z_S + 0.12, wall_h / 2), materials["plaster"], collection, root)
    add_box("WALL_South_R", (WALL_X - 0.75, 0.24, wall_h), ((0.75 + WALL_X) / 2, WALL_Z_S + 0.12, wall_h / 2), materials["plaster"], collection, root)
    add_box("WALL_South_Top", (1.5, 0.24, wall_h - 2.2), (0.0, WALL_Z_S + 0.12, (wall_h + 2.2) / 2), materials["plaster"], collection, root)
    add_box("WALL_West", (0.24, WALL_Z_S - WALL_Z_N, wall_h), (-WALL_X - 0.12, (WALL_Z_S + WALL_Z_N) / 2, wall_h / 2), materials["plaster"], collection, root)
    add_box("WALL_East", (0.24, WALL_Z_S - WALL_Z_N, wall_h), (WALL_X + 0.12, (WALL_Z_S + WALL_Z_N) / 2, wall_h / 2), materials["plaster"], collection, root)
    # 护墙板
    add_box("WAIN_North", (WALL_X * 2, 0.06, 1.0), (0.0, WALL_Z_N + 0.02, 0.5), materials["wainscot"], collection, root)
    add_box("WAIN_West", (0.06, WALL_Z_S - WALL_Z_N, 1.0), (-WALL_X + 0.02, (WALL_Z_S + WALL_Z_N) / 2, 0.5), materials["wainscot"], collection, root)
    add_box("WAIN_East", (0.06, WALL_Z_S - WALL_Z_N, 1.0), (WALL_X - 0.02, (WALL_Z_S + WALL_Z_N) / 2, 0.5), materials["wainscot"], collection, root)
    # 天花 + 横梁
    add_box("CEIL_Slab", (WALL_X * 2 + 0.4, WALL_Z_S - WALL_Z_N + 0.4, 0.14), (0.0, (WALL_Z_S + WALL_Z_N) / 2, CEIL_Z + 0.07), materials["wainscot"], collection, root)
    for index, z in enumerate((-3.4, -1.2, 1.0, 3.2), start=1):
        add_box(f"CEIL_Beam_{index}", (WALL_X * 2, 0.18, 0.2), (0.0, z, CEIL_Z - 0.1), materials["timber_dark"], collection, root, bevel=0.015)
    # 入口木门（南墙中央，微开）
    add_box("DOOR_Frame_L", (0.12, 0.3, 2.2), (-0.81, WALL_Z_S + 0.05, 1.1), materials["timber"], collection, root, bevel=0.012)
    add_box("DOOR_Frame_R", (0.12, 0.3, 2.2), (0.81, WALL_Z_S + 0.05, 1.1), materials["timber"], collection, root, bevel=0.012)
    add_box("DOOR_Frame_Top", (1.74, 0.3, 0.14), (0.0, WALL_Z_S + 0.05, 2.27), materials["timber"], collection, root, bevel=0.012)
    add_box("DOOR_Panel", (0.78, 0.08, 2.1), (-0.55, WALL_Z_S + 0.30, 1.05), materials["door"], collection, root, rotation=(0.0, 0.0, math.radians(24.0)), bevel=0.012)
    add_box("DOOR_Threshold", (1.7, 0.5, 0.05), (0.0, WALL_Z_S + 0.2, 0.025), materials["timber_dark"], collection, root, bevel=0.01)
    # 西墙两扇大窗（暖光夜色）+ 东墙一扇
    for windex, (wall, wz) in enumerate((("West", -1.55), ("West", 1.55)), start=1):
        x = -WALL_X + 0.05
        add_box(f"WINDOW_{windex}_Glass", (0.05, 1.7, 1.3), (x - 0.03, wz, 1.5), materials["glass"], collection, root)
        add_box(f"WINDOW_{windex}_FrameV1", (0.09, 0.07, 1.42), (x, wz - 0.85, 1.5), materials["timber"], collection, root)
        add_box(f"WINDOW_{windex}_FrameV2", (0.09, 0.07, 1.42), (x, wz, 1.5), materials["timber"], collection, root)
        add_box(f"WINDOW_{windex}_FrameV3", (0.09, 0.07, 1.42), (x, wz + 0.85, 1.5), materials["timber"], collection, root)
        add_box(f"WINDOW_{windex}_FrameH1", (0.09, 1.77, 0.07), (x, wz, 2.16), materials["timber"], collection, root)
        add_box(f"WINDOW_{windex}_FrameH2", (0.09, 1.77, 0.07), (x, wz, 1.5), materials["timber"], collection, root)
        add_box(f"WINDOW_{windex}_FrameH3", (0.09, 1.77, 0.07), (x, wz, 0.84), materials["timber"], collection, root)
        add_box(f"WINDOW_{windex}_Sill", (0.16, 1.9, 0.07), (x + 0.06, wz, 0.80), materials["timber"], collection, root, bevel=0.01)
    x = WALL_X - 0.05
    add_box("WINDOW_East_Glass", (0.05, 1.4, 1.1), (x + 0.03, -1.35, 1.55), materials["glass"], collection, root)
    add_box("WINDOW_East_Frame", (0.08, 1.54, 1.24), (x, -1.35, 1.55), materials["timber"], collection, root)
    add_box("WINDOW_East_GlassIn", (0.06, 1.38, 1.08), (x - 0.02, -1.35, 1.55), materials["glass"], collection, root)


def add_chair(
    name: str,
    x: float,
    z: float,
    yaw: float,
    materials: dict,
    collection: bpy.types.Collection,
    root: bpy.types.Object,
) -> None:
    """木椅 + 绿坐垫；座位面中心在 (x, z, SEAT_H)，椅背朝 yaw 反方向。"""
    back_dx = -math.sin(yaw) * 0.20
    back_dz = -math.cos(yaw) * 0.20
    add_box(f"{name}_Seat", (0.42, 0.42, 0.06), (x, z, SEAT_H - 0.03), materials["chair_wood"], collection, root, rotation=(0.0, 0.0, yaw), bevel=0.012)
    add_box(f"{name}_Cushion", (0.38, 0.38, 0.05), (x, z, SEAT_H + 0.025), materials["cushion"], collection, root, rotation=(0.0, 0.0, yaw), bevel=0.015)
    add_box(f"{name}_Back", (0.42, 0.06, 0.5), (x + back_dx, z + back_dz, SEAT_H + 0.30), materials["chair_wood"], collection, root, rotation=(0.0, 0.0, yaw), bevel=0.012)
    add_box(f"{name}_BackSlat", (0.30, 0.04, 0.12), (x + back_dx * 1.05, z + back_dz * 1.05, SEAT_H + 0.38), materials["timber_dark"], collection, root, rotation=(0.0, 0.0, yaw), bevel=0.008)
    for leg, (lx, lz) in enumerate(((-0.17, -0.17), (0.17, -0.17), (-0.17, 0.17), (0.17, 0.17)), start=1):
        # 椅腿随 yaw 旋转
        rx = lx * math.cos(yaw) + lz * math.sin(yaw)
        rz = -lx * math.sin(yaw) + lz * math.cos(yaw)
        add_cylinder(f"{name}_Leg{leg}", 0.028, SEAT_H - 0.05, (x + rx, z + rz, (SEAT_H - 0.05) / 2), materials["timber_dark"], collection, root, vertices=6)


def add_round_table(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    cx, cz = ROUND_TABLE["center"]
    # 圆毯
    add_cylinder("RUG_Round", 2.35, 0.025, (cx, cz, 0.015), materials["rug"], collection, root, vertices=24)
    add_cylinder("RUG_RoundTrim", 1.95, 0.028, (cx, cz, 0.016), materials["rug_trim"], collection, root, vertices=24)
    add_cylinder("RUG_RoundInner", 1.55, 0.030, (cx, cz, 0.017), materials["rug"], collection, root, vertices=24)
    # 实木圆桌：厚面板 + 粗底座
    add_cylinder("TABLE_Round6_Top", 1.12, 0.07, (cx, cz, TABLE_H - 0.035), materials["table_top"], collection, root, vertices=20)
    add_cylinder("TABLE_Round6_Edge", 1.14, 0.045, (cx, cz, TABLE_H - 0.075), materials["timber_dark"], collection, root, vertices=20)
    add_cylinder("TABLE_Round6_Pedestal", 0.16, TABLE_H - 0.2, (cx, cz, (TABLE_H - 0.2) / 2 + 0.12), materials["timber_dark"], collection, root, vertices=10)
    add_cylinder("TABLE_Round6_Base", 0.55, 0.12, (cx, cz, 0.06), materials["timber_dark"], collection, root, vertices=12)
    # 中心绿植
    add_cone("TABLE_Round6_PlantPot", 0.14, 0.10, 0.16, (cx, cz, TABLE_H + 0.08), materials["pot"], collection, root, vertices=9)
    for index, (dx, dz, s) in enumerate(((0.0, 0.0, 0.13), (-0.08, 0.05, 0.10), (0.08, 0.04, 0.11)), start=1):
        add_ico(f"TABLE_Round6_Leaf_{index}", (cx + dx, cz + dz, TABLE_H + 0.22 + s * 0.3), (s, s * 0.8, s * 1.3), materials["leaf"], collection, root)
    # 茶杯两只
    for index, (dx, dz) in enumerate(((0.45, 0.3), (-0.35, 0.45)), start=1):
        add_cylinder(f"TABLE_Round6_Cup_{index}", 0.045, 0.07, (cx + dx, cz + dz, TABLE_H + 0.035), materials["cup"], collection, root, vertices=8)
    # 契约锚点
    add_empty("TABLE_Central6", collection, root, location=(cx, cz, 0.0), display_size=0.2)
    add_empty("INTERACT_CentralTable", collection, root, location=(cx, cz, 0.0), display_size=0.24)["interaction_radius"] = ROUND_TABLE["interact_radius"]
    for name, sx, sz, yaw in ROUND_SEATS:
        add_chair(f"CHAIR_{name}", sx, sz, yaw, materials, collection, root)
        seat = add_empty(name, collection, root, location=(sx, sz, SEAT_H), display_size=0.1)
        seat.rotation_euler = (0.0, 0.0, yaw)
        seat["seat_height"] = SEAT_H


def add_npc_tables(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    for table in NPC_TABLES:
        cx, cz = table["center"]
        node = table["node"]
        if table["kind"] == "two":
            add_box(f"{node}_Top", (0.85, 0.85, 0.06), (cx, cz, TABLE_H - 0.03), materials["table_top"], collection, root, bevel=0.015)
            add_box(f"{node}_Trim", (0.89, 0.89, 0.04), (cx, cz, TABLE_H - 0.075), materials["timber_dark"], collection, root, bevel=0.01)
            add_cylinder(f"{node}_Leg", 0.07, TABLE_H - 0.16, (cx, cz, (TABLE_H - 0.16) / 2 + 0.08), materials["timber_dark"], collection, root, vertices=8)
            add_cylinder(f"{node}_Base", 0.3, 0.08, (cx, cz, 0.04), materials["timber_dark"], collection, root, vertices=10)
            add_cylinder(f"{node}_Cup", 0.04, 0.06, (cx + 0.18, cz + 0.12, TABLE_H + 0.03), materials["cup"], collection, root, vertices=8)
        else:
            add_box(f"{node}_Top", (1.35, 0.95, 0.06), (cx, cz, TABLE_H - 0.03), materials["table_top"], collection, root, bevel=0.015)
            add_box(f"{node}_Trim", (1.39, 0.99, 0.04), (cx, cz, TABLE_H - 0.075), materials["timber_dark"], collection, root, bevel=0.01)
            for leg, (dx, dz) in enumerate(((-0.58, -0.38), (0.58, -0.38), (-0.58, 0.38), (0.58, 0.38)), start=1):
                add_box(f"{node}_Leg{leg}", (0.08, 0.08, TABLE_H - 0.1), (cx + dx, cz + dz, (TABLE_H - 0.1) / 2), materials["timber_dark"], collection, root)
            add_cone(f"{node}_PlantPot", 0.09, 0.065, 0.10, (cx, cz, TABLE_H + 0.05), materials["pot"], collection, root, vertices=8)
            add_ico(f"{node}_PlantLeaf", (cx, cz, TABLE_H + 0.16), (0.09, 0.08, 0.11), materials["leaf"], collection, root)
        add_empty(node, collection, root, location=(cx, cz, 0.0), display_size=0.18)
        for name, sx, sz, yaw in table["seats"]:
            add_chair(f"CHAIR_{name}", sx, sz, yaw, materials, collection, root)
            seat = add_empty(name, collection, root, location=(sx, sz, SEAT_H), display_size=0.1)
            seat.rotation_euler = (0.0, 0.0, yaw)
            seat["seat_height"] = SEAT_H


def add_bar(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    """北墙吧台区：长吧台 + 背柜 + 黑板菜单 + 高脚凳（播报屏位置 x∈[0.4,2.0] 留空）。"""
    bar_z = WALL_Z_N + 0.75
    # 吧台面（播报屏下方留空：分两段 x -4.6..0.3 / 2.1..4.6）
    add_box("BAR_Counter_L", (4.9, 0.6, 0.08), (-2.15, bar_z, 1.02), materials["bar_top"], collection, root, bevel=0.015)
    add_box("BAR_Counter_R", (2.5, 0.6, 0.08), (3.35, bar_z, 1.02), materials["bar_top"], collection, root, bevel=0.015)
    add_box("BAR_Front_L", (4.9, 0.08, 0.95), (-2.15, bar_z + 0.28, 0.52), materials["timber"], collection, root, bevel=0.01)
    add_box("BAR_Front_R", (2.5, 0.08, 0.95), (3.35, bar_z + 0.28, 0.52), materials["timber"], collection, root, bevel=0.01)
    # 铜质脚踏
    add_cylinder("BAR_FootRail", 0.03, 9.0, (0.0, bar_z + 0.34, 0.18), materials["brass"], collection, root, vertices=8, rotation=(0.0, math.radians(90.0), 0.0))
    # 背柜层架（北墙上，左段）
    for shelf, z in enumerate((1.55, 1.95, 2.35), start=1):
        add_box(f"BAR_Shelf_{shelf}", (4.4, 0.3, 0.05), (-2.2, WALL_Z_N + 0.22, z), materials["timber"], collection, root, bevel=0.008)
    rng_items = ["cup", "jar", "book_red", "book_green", "cup", "jar", "book_blue", "cup"]
    for index in range(16):
        shelf_z = 1.55 + (index // 6) * 0.4
        x = -4.2 + (index % 6) * 0.8 + (0.1 if index % 2 else 0.0)
        mat = materials[rng_items[index % len(rng_items)]]
        if "book" in rng_items[index % len(rng_items)]:
            add_box(f"BAR_Item_{index + 1:02d}", (0.12, 0.18, 0.24), (x, WALL_Z_N + 0.22, shelf_z + 0.15), mat, collection, root, rotation=(0.0, 0.0, math.radians((index % 3 - 1) * 8)), bevel=0.008)
        else:
            add_cylinder(f"BAR_Item_{index + 1:02d}", 0.07, 0.2, (x, WALL_Z_N + 0.22, shelf_z + 0.13), mat, collection, root, vertices=8)
    # 黑板菜单（两块，粉笔线模拟字迹）
    for board, (bx, bz) in enumerate(((-3.2, 2.75), (-1.4, 2.75)), start=1):
        add_box(f"BAR_Chalk_{board}", (1.4, 0.06, 0.7), (bx, WALL_Z_N + 0.05, bz), materials["chalk"], collection, root, bevel=0.02)
        for line in range(3):
            add_box(f"BAR_Chalk_{board}_Line{line + 1}", (1.0 - line * 0.18, 0.02, 0.045), (bx - 0.05 + line * 0.05, WALL_Z_N + 0.005, bz + 0.18 - line * 0.18), materials["chalk_line"], collection, root)
    # 咖啡机
    add_box("BAR_Machine", (0.7, 0.45, 0.5), (-3.6, bar_z - 0.05, 1.32), materials["machine"], collection, root, bevel=0.03)
    add_box("BAR_MachineTop", (0.5, 0.3, 0.12), (-3.6, bar_z - 0.05, 1.62), materials["metal"], collection, root, bevel=0.02)
    add_cylinder("BAR_MachineSpout", 0.03, 0.12, (-3.6, bar_z + 0.16, 1.14), materials["brass"], collection, root, vertices=8)
    # 杯碟与甜点罩
    for index in range(3):
        add_cylinder(f"BAR_CupStack_{index + 1}", 0.05, 0.09, (-2.6 + index * 0.35, bar_z - 0.05, 1.11), materials["cup"], collection, root, vertices=8)
    add_cylinder("BAR_CakeDome", 0.2, 0.18, (3.2, bar_z - 0.05, 1.15), materials["glass"], collection, root, vertices=12)
    add_cylinder("BAR_CakeBase", 0.22, 0.04, (3.2, bar_z - 0.05, 1.08), materials["brass"], collection, root, vertices=12)
    # 高脚凳 ×3（吧台正面）
    for index, x in enumerate((-2.9, -1.9, -0.9), start=1):
        add_cylinder(f"BAR_Stool_{index}_Seat", 0.19, 0.07, (x, bar_z + 0.75, 0.62), materials["chair_wood"], collection, root, vertices=10)
        add_cylinder(f"BAR_Stool_{index}_Leg", 0.04, 0.56, (x, bar_z + 0.75, 0.31), materials["metal"], collection, root, vertices=8)
        add_cylinder(f"BAR_Stool_{index}_Base", 0.16, 0.04, (x, bar_z + 0.75, 0.02), materials["metal"], collection, root, vertices=10)


def add_sofa_corner(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    """西南角沙发区：L 沙发 + 圆茶几 + 落地灯 + 书架 + 地毯。"""
    sx, sz = -4.35, 3.35
    add_cylinder("SOFA_Rug", 1.55, 0.022, (sx + 0.55, sz - 0.15, 0.014), materials["rug_trim"], collection, root, vertices=20)
    # L 形：沿西墙一段 + 沿南墙一段
    add_box("SOFA_SeatW", (0.75, 1.9, 0.4), (sx, sz - 0.35, 0.2), materials["sofa"], collection, root, bevel=0.05)
    add_box("SOFA_BackW", (0.28, 1.9, 0.55), (sx - 0.30, sz - 0.35, 0.62), materials["sofa"], collection, root, bevel=0.05)
    add_box("SOFA_SeatS", (1.5, 0.75, 0.4), (sx + 0.65, sz + 0.62, 0.2), materials["sofa"], collection, root, bevel=0.05)
    add_box("SOFA_BackS", (1.5, 0.28, 0.55), (sx + 0.65, sz + 0.90, 0.62), materials["sofa"], collection, root, bevel=0.05)
    for index, (dx, dz) in enumerate(((0.05, -0.9), (0.05, -0.2), (0.05, 0.35), (0.75, 0.55), (1.25, 0.55)), start=1):
        add_box(f"SOFA_Cushion_{index}", (0.55, 0.55, 0.14), (sx + dx, sz + dz, 0.46), materials["sofa_cushion"], collection, root, rotation=(0.0, 0.0, math.radians(index * 4 - 8)), bevel=0.04)
    # 圆茶几
    add_cylinder("SOFA_TableTop", 0.42, 0.05, (sx + 0.85, sz - 0.45, 0.42), materials["table_top"], collection, root, vertices=14)
    add_cylinder("SOFA_TableLeg", 0.05, 0.38, (sx + 0.85, sz - 0.45, 0.2), materials["timber_dark"], collection, root, vertices=8)
    add_box("SOFA_TableBook", (0.22, 0.16, 0.05), (sx + 0.75, sz - 0.5, 0.47), materials["book_red"], collection, root, rotation=(0.0, 0.0, math.radians(12)), bevel=0.008)
    add_cylinder("SOFA_TableCup", 0.04, 0.06, (sx + 0.98, sz - 0.35, 0.47), materials["cup"], collection, root, vertices=8)
    # 落地灯
    add_cylinder("SOFA_FloorLampPole", 0.035, 1.6, (sx - 0.15, sz + 1.35, 0.8), materials["brass"], collection, root, vertices=8)
    add_cylinder("SOFA_FloorLampBase", 0.16, 0.05, (sx - 0.15, sz + 1.35, 0.025), materials["metal"], collection, root, vertices=10)
    add_cone("SOFA_FloorLampShade", 0.22, 0.13, 0.26, (sx - 0.15, sz + 1.35, 1.68), materials["lamp_glass"], collection, root, vertices=10)
    # 书架（西墙，沙发区与双人桌之间）
    add_box("SHELF_Body", (0.4, 1.5, 2.0), (-WALL_X + 0.24, 0.0, 1.0), materials["timber"], collection, root, bevel=0.015)
    for shelf, z in enumerate((0.5, 1.0, 1.5), start=1):
        add_box(f"SHELF_Board_{shelf}", (0.34, 1.4, 0.05), (-WALL_X + 0.24, 0.0, z), materials["timber_dark"], collection, root)
    book_mats = ["book_red", "book_green", "book_blue", "jar"]
    for index in range(12):
        shelf_z = 0.5 + (index // 4) * 0.5
        y = -0.55 + (index % 4) * 0.36
        add_box(f"SHELF_Book_{index + 1:02d}", (0.2, 0.10, 0.3), (-WALL_X + 0.24, y, shelf_z + 0.18), materials[book_mats[index % 4]], collection, root, rotation=(0.0, (index % 3 - 1) * 0.09, 0.0), bevel=0.006)
    add_ico("SHELF_TopPlant", (-WALL_X + 0.24, 0.3, 2.12), (0.12, 0.11, 0.14), materials["leaf"], collection, root)
    add_cone("SHELF_TopPlantPot", 0.10, 0.075, 0.12, (-WALL_X + 0.24, 0.3, 2.0), materials["pot"], collection, root, vertices=8)


def add_lights_and_plants(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    """吊灯（圆桌大灯 + 各桌小灯 + 吧台一排）+ 墙角绿植。"""
    # 圆桌主吊灯
    add_cylinder("PEND_Round6_Cord", 0.015, 0.7, (0.0, 0.0, CEIL_Z - 0.45), materials["metal"], collection, root, vertices=6)
    add_cone("PEND_Round6_Shade", 0.42, 0.12, 0.3, (0.0, 0.0, CEIL_Z - 0.88), materials["lamp_glass"], collection, root, vertices=12)
    # 小吊灯：四张 NPC 桌 + 沙发区
    spots = [(-3.65, -1.55), (-3.65, 1.55), (3.28, -1.35), (3.28, 1.65), (-3.8, 3.2)]
    for index, (x, z) in enumerate(spots, start=1):
        add_cylinder(f"PEND_{index}_Cord", 0.012, 0.85, (x, z, CEIL_Z - 0.5), materials["metal"], collection, root, vertices=6)
        add_cone(f"PEND_{index}_Shade", 0.2, 0.06, 0.2, (x, z, CEIL_Z - 0.98), materials["lamp_glass"], collection, root, vertices=10)
    # 吧台一排三盏
    for index, x in enumerate((-3.0, -2.0, -1.0), start=1):
        add_cylinder(f"PEND_Bar_{index}_Cord", 0.012, 0.6, (x, WALL_Z_N + 0.75, CEIL_Z - 0.4), materials["metal"], collection, root, vertices=6)
        add_cone(f"PEND_Bar_{index}_Shade", 0.16, 0.05, 0.16, (x, WALL_Z_N + 0.75, CEIL_Z - 0.76), materials["lamp_glass"], collection, root, vertices=10)
    # 大型盆栽（东北角 + 门边）
    for index, (x, z, s) in enumerate(((4.9, -4.2, 1.2), (1.15, 4.35, 0.9), (-1.15, 4.35, 0.9)), start=1):
        add_cone(f"PLANT_{index}_Pot", 0.22 * s, 0.16 * s, 0.3 * s, (x, z, 0.15 * s), materials["pot"], collection, root, vertices=9)
        add_cylinder(f"PLANT_{index}_Stem", 0.03 * s, 0.6 * s, (x, z, 0.55 * s), materials["timber_dark"], collection, root, vertices=6)
        for leaf in range(3):
            add_ico(
                f"PLANT_{index}_Leaf_{leaf + 1}",
                (x + (leaf - 1) * 0.16 * s, z + (leaf % 2) * 0.1 * s, (0.9 + leaf * 0.18) * s),
                (0.22 * s, 0.18 * s, 0.26 * s),
                materials["leaf"], collection, root,
            )
    # 北墙装饰画（播报屏右侧一幅小画）
    add_box("DECOR_Frame_1", (0.5, 0.05, 0.65), (3.4, WALL_Z_N + 0.04, 2.2), materials["timber"], collection, root, bevel=0.015)
    add_box("DECOR_Paint_1", (0.4, 0.03, 0.55), (3.4, WALL_Z_N + 0.015, 2.2), materials["leaf"], collection, root)
    add_box("DECOR_Frame_2", (0.65, 0.05, 0.5), (4.4, WALL_Z_N + 0.04, 2.3), materials["timber"], collection, root, bevel=0.015)
    add_box("DECOR_Paint_2", (0.55, 0.03, 0.4), (4.4, WALL_Z_N + 0.015, 2.3), materials["rug"], collection, root)


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection) -> None:
    world = bpy.data.worlds.new("PREVIEW_CafeIntWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#2E3A5C")
    background.inputs["Strength"].default_value = 0.25
    bpy.context.scene.world = world

    camera_data = bpy.data.cameras.new("PREVIEW_CafeIntCamera")
    camera = bpy.data.objects.new("PREVIEW_CafeIntCamera", camera_data)
    collection.objects.link(camera)
    camera.location = (4.6, 3.9, 2.35)
    camera_data.lens = 32.0
    look_at(camera, Vector((-1.2, -1.6, 0.75)))
    bpy.context.scene.camera = camera

    sun_data = bpy.data.lights.new("PREVIEW_WarmSun", type="SUN")
    sun_data.energy = 0.7
    sun_data.angle = math.radians(18.0)
    sun_data.color = srgb("#FFCFA0")[:3]
    sun = bpy.data.objects.new("PREVIEW_WarmSun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(55.0), math.radians(-12.0), math.radians(-35.0))

    for index, (x, z, energy) in enumerate(((0.0, 0.0, 220), (-3.0, -3.9, 160), (-3.8, 3.2, 140)), start=1):
        light_data = bpy.data.lights.new(f"PREVIEW_PendantGlow_{index}", type="POINT")
        light_data.energy = energy
        light_data.color = srgb("#FFC98A")[:3]
        light_data.shadow_soft_size = 0.5
        light = bpy.data.objects.new(f"PREVIEW_PendantGlow_{index}", light_data)
        collection.objects.link(light)
        light.location = (x, z, 2.0)

    scene = bpy.context.scene
    engine_override = os.environ.get("ECHO_RENDER_ENGINE")
    if engine_override:
        scene.render.engine = engine_override
    else:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 48
        scene.cycles.use_denoising = True
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 1000
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
    bpy.context.view_layer.objects.active = bpy.data.objects["ROOT_Cafe"]
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
    runtime = make_collection("CAFE_InteriorRuntime")
    preview = make_collection("CAFE_InteriorPreviewOnly")
    materials = add_materials()

    root = add_empty("ROOT_Cafe", runtime, display_size=0.4)
    root["asset_type"] = "EchoWorld cafe interior environment"
    root["style_version"] = "cafe-interior-v2"
    root["unit"] = "meter"
    root["reference"] = "docs/643e66a9db8bcb96a9c3a1af7a1e5b7e.png"
    root["seed"] = SEED

    add_room_shell(runtime, root, materials)
    add_round_table(runtime, root, materials)
    add_npc_tables(runtime, root, materials)
    add_bar(runtime, root, materials)
    add_sofa_corner(runtime, root, materials)
    add_lights_and_plants(runtime, root, materials)

    spawn = add_empty("ANCHOR_PlayerSpawn", runtime, root, location=(PLAYER_SPAWN[0], PLAYER_SPAWN[1], 0.0), display_size=0.2)
    spawn.rotation_euler = (0.0, 0.0, PLAYER_SPAWN[2])
    exit_anchor = add_empty("FIXTURE_CafeExitDoor", runtime, root, location=(DOOR_POS[0], DOOR_POS[1] - 0.55, 0.0), display_size=0.2)
    exit_anchor["anchor_kind"] = "venue_exit"

    configure_preview(preview)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene["echo_world_asset"] = "cafe interior environment v2"

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_runtime(runtime)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    anchors = {
        "player_spawn": {"x": PLAYER_SPAWN[0], "z": PLAYER_SPAWN[1], "yaw": PLAYER_SPAWN[2]},
        "roundtable": {
            "node": "TABLE_Central6", "center": ROUND_TABLE["center"],
            "seats": [{"node": n, "x": x, "z": z, "yaw": yaw, "height": SEAT_H} for n, x, z, yaw in ROUND_SEATS],
        },
        "npc_tables": [
            {
                "node": t["node"], "kind": t["kind"], "center": t["center"],
                "seats": [{"node": n, "x": x, "z": z, "yaw": yaw, "height": SEAT_H} for n, x, z, yaw in t["seats"]],
            }
            for t in NPC_TABLES
        ],
    }
    ANCHORS_PATH.write_text(json.dumps(anchors, indent=2), encoding="utf-8")
    manifest = {
        "schema_version": "echo-cafe-interior.v2",
        "name": "EchoWorld Cafe Interior v2 (Wooden Cafe, Single Floor)",
        "style": "warm timber cafe interior; bar along north wall, central 6-seat round table, 2/4-seat tables, sofa corner, pendant lamps",
        "reference_image": "docs/643e66a9db8bcb96a9c3a1af7a1e5b7e.png",
        "generator": "blender/build_cafe_interior_v2.py",
        "seed": SEED,
        "blend": str(BLEND_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "glb": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "preview": str(RENDER_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "anchors_json": str(ANCHORS_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "root_node": "ROOT_Cafe",
        "ground_node": "GROUND_CafeFloor",
        "contract": {
            "seat_count": 18,
            "seat_height_m": SEAT_H,
            "table_height_m": TABLE_H,
            "playable_bounds": {"minX": -5.35, "maxX": 5.35, "minZ": -4.45, "maxZ": 4.45},
            "broadcast_screen_spot": {"x": 1.2, "z": -4.7, "note": "北墙吧台留空段"},
        },
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"schema": manifest["schema_version"], "seats": 18, "glb": manifest["glb"]}, indent=2))


if __name__ == "__main__":
    build_scene()
