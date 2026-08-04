"""EchoWorld 市集摊位 v2 —— 旅行商人推车（参考 docs/9f93aac8ae425a272ffd2a2f859bf6a9.jpg）。

风格：手绘绘本感的旅行商车。赤陶/奶油条纹布篷 + 扇形檐边、铺蓝布与
锯齿织边的售货车台、wagon 车轮、悬挂灯笼、木桶书篮、台面展示架与盆栽。

与 v1 的契约保持一致（前端 BoothSystem 按名替换贴图）：
  ROOT_MarketStall / MESH_BackWall / MESH_CounterTop / ANCHOR_PersonStand /
  AWNING_Stripe_01..07 / 5 个 MESH_* 展示面（独立材质、干净 0-1 UV、面朝街道）。
只增不改：v1 文件保留，本脚本产出 echo_world_market_stall_20260804.glb。
"""

from __future__ import annotations

import json
import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = PROJECT_ROOT / "blender" / "echo_world_market_stall_v2.blend"
GLB_PATH = PROJECT_ROOT / "public" / "models" / "modules" / "echo_world_market_stall_20260804.glb"
RENDER_PATH = PROJECT_ROOT / "renders" / "echo_world_market_stall_v2_preview.png"
MANIFEST_PATH = PROJECT_ROOT / "public" / "models" / "modules" / "echo_world_market_stall_20260804_manifest.json"

SEED = 26080504

# 展示面契约：前端按名定位并替换贴图；尺寸为展示平面 宽 x 高（米）。
DISPLAY_SURFACES = {
    "MESH_NamePlate": {"width": 1.2, "height": 0.30, "kind": "name_plate"},
    "MESH_Portrait": {"width": 0.7, "height": 0.90, "kind": "portrait"},
    "MESH_PhotoFrame_01": {"width": 0.6, "height": 0.45, "kind": "photo_frame"},
    "MESH_PhotoFrame_02": {"width": 0.6, "height": 0.45, "kind": "photo_frame"},
    "MESH_Backdrop": {"width": 1.6, "height": 0.24, "kind": "tag_strip"},
}


def srgb(hex_value: str) -> tuple[float, float, float, float]:
    # 调色板 hex 是显示端 sRGB；glTF baseColorFactor 与 Blender 节点为线性空间，
    # 需要正确转换（否则 three.js 里会发白）。
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
    metallic: float = 0.0,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = max(0.7, roughness)
    bsdf.inputs["Metallic"].default_value = metallic
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
        modifier = obj.modifiers.new(name="StallBevel", type="BEVEL")
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


def add_torus(
    name: str,
    major_radius: float,
    minor_radius: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    major_segments: int = 12,
    minor_segments: int = 6,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
    )
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


def add_triangle(
    name: str,
    width: float,
    height: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    # 本地 XZ 平面内指向 -Z 的三角，法线朝 +Y。
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    half = width / 2.0
    mesh.from_pydata(
        [(-half, 0.0, 0.0), (half, 0.0, 0.0), (0.0, 0.0, -height)],
        [],
        [(0, 1, 2)],
    )
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    set_flat(obj)
    if parent is not None:
        obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
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


def add_display_plane(
    name: str,
    width: float,
    height: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    rotation: tuple[float, float, float] = (math.radians(90.0), 0.0, 0.0),
) -> bpy.types.Object:
    # 原始 plane 自带干净 0-1 UV；绕 X 转 90° 后立面朝 -Y（glTF +Z，朝向街道）。
    bpy.ops.mesh.primitive_plane_add(size=2.0)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (width / 2.0, height / 2.0, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    set_flat(obj)
    move_to_collection(obj, collection)
    obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def add_materials() -> dict[str, bpy.types.Material]:
    materials = {
        # 契约材质名（校验器硬校验）
        "wood_log": make_material("MAT_Stall_WoodLog", srgb("#A87C50"), 0.9),
        "wood_dark": make_material("MAT_Stall_WoodDark", srgb("#6E4F34"), 0.9),
        "wood_plank": make_material("MAT_Stall_WoodPlank", srgb("#C49A6A"), 0.92),
        "awning_red": make_material("MAT_Stall_AwningRed", srgb("#C65F45"), 0.94),
        "awning_white": make_material("MAT_Stall_AwningWhite", srgb("#F3E9D2"), 0.96),
        # v2 新增
        "cloth_blue": make_material("MAT_Stall_ClothBlue", srgb("#5B7BA6"), 0.96),
        "cloth_trim": make_material("MAT_Stall_ClothTrim", srgb("#E9D9A8"), 0.96),
        "cord": make_material("MAT_Stall_Cord", srgb("#6B5640"), 0.92),
        "basket": make_material("MAT_Stall_Basket", srgb("#A87F4E"), 0.95),
        "barrel": make_material("MAT_Stall_Barrel", srgb("#8A6844"), 0.94),
        "barrel_band": make_material("MAT_Stall_BarrelBand", srgb("#4E3B2A"), 0.88),
        "lantern_frame": make_material("MAT_Stall_LanternFrame", srgb("#5A4432"), 0.86),
        "lantern_glass": make_material(
            "MAT_Stall_LanternGlass",
            srgb("#FFE3AE"),
            0.7,
            emission=srgb("#FFC46A"),
            emission_strength=1.6,
        ),
        "pot": make_material("MAT_Stall_Pot", srgb("#B06A4A"), 0.94),
        "leaf": make_material("MAT_Stall_Leaf", srgb("#7F9F5F"), 0.96),
        "book_red": make_material("MAT_Stall_BookRed", srgb("#A6534A"), 0.94),
        "book_green": make_material("MAT_Stall_BookGreen", srgb("#6F8A5A"), 0.94),
        "book_blue": make_material("MAT_Stall_BookBlue", srgb("#5E7B9C"), 0.94),
        "book_pages": make_material("MAT_Stall_BookPages", srgb("#EDE3C8"), 0.96),
        "coin": make_material("MAT_Stall_Coin", srgb("#D8B45A"), 0.74),
        "tray": make_material("MAT_Stall_Tray", srgb("#7A5A3C"), 0.92),
    }
    # 每个展示面一个独立材质：近白 + 微量自发光，替换贴图后在暖光下清晰可读。
    for mesh_name in DISPLAY_SURFACES:
        materials[f"display_{mesh_name}"] = make_material(
            f"MAT_Display_{mesh_name.removeprefix('MESH_')}",
            srgb("#FDFBF4"),
            0.72,
            emission=srgb("#FFFFFF"),
            emission_strength=0.25,
        )
    return materials


def add_cart_body(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    """售货车台：木车身 + 蓝布罩 + 锯齿织边 + wagon 车轮。"""
    # 木车身（前缘 y=-0.72，后缘 y=0.12，摊主站在车身之后）
    add_box(
        "CART_Body",
        (1.9, 0.84, 0.46),
        (0.0, -0.30, 0.52),
        materials["wood_plank"],
        collection,
        root,
        bevel=0.015,
    )
    # 车底横梁
    add_box(
        "CART_UnderBeam",
        (1.6, 0.7, 0.1),
        (0.0, -0.30, 0.26),
        materials["wood_dark"],
        collection,
        root,
        bevel=0.01,
    )
    # 台面（契约节点）：蓝布罩在木台之上
    add_box(
        "MESH_CounterTop",
        (1.9, 0.84, 0.07),
        (0.0, -0.30, 0.785),
        materials["wood_plank"],
        collection,
        root,
        bevel=0.012,
    )
    add_box(
        "CART_ClothTop",
        (2.02, 0.96, 0.045),
        (0.0, -0.32, 0.845),
        materials["cloth_blue"],
        collection,
        root,
        bevel=0.01,
    )
    # 蓝布前垂 + 奶油色锯齿织边（参考图的 chevron 边）
    add_box(
        "CART_ClothDrape",
        (2.02, 0.045, 0.42),
        (0.0, -0.80, 0.64),
        materials["cloth_blue"],
        collection,
        root,
        bevel=0.008,
    )
    for index in range(12):
        offset = -0.92 + index * 0.167
        add_triangle(
            f"CART_ClothZigzag_{index + 1:02d}",
            0.15,
            0.12,
            (offset, -0.825, 0.50),
            materials["cloth_trim"],
            collection,
            root,
        )
    # wagon 车轮：两侧各两个，轮轴沿 X，外移让开蓝布罩边缘
    for side, x in (("L", -1.09), ("R", 1.09)):
        for label, y in (("F", -0.55), ("B", 0.05)):
            prefix = f"CART_Wheel_{side}_{label}"
            add_torus(
                f"{prefix}_Rim",
                0.30,
                0.055,
                (x, y, 0.36),
                materials["wood_dark"],
                collection,
                root,
                rotation=(0.0, math.radians(90.0), 0.0),
            )
            add_cylinder(
                f"{prefix}_Hub",
                0.075,
                0.12,
                (x, y, 0.36),
                materials["wood_log"],
                collection,
                root,
                vertices=8,
                rotation=(0.0, math.radians(90.0), 0.0),
            )
            for spoke in range(6):
                angle = math.radians(spoke * 30.0)
                add_cylinder(
                    f"{prefix}_Spoke_{spoke + 1}",
                    0.022,
                    0.56,
                    (
                        x,
                        y - math.sin(angle) * 0.0,  # 辐条在 YZ 平面内
                        0.36,
                    ),
                    materials["wood_log"],
                    collection,
                    root,
                    vertices=6,
                    rotation=(angle, 0.0, 0.0),
                )


def add_frame(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    """四根撑杆（带手工感微倾）+ 后板墙 + 顶部饰珠。"""
    # 前杆短、后杆高，布篷前低后高
    post_specs = (
        ("Front_L", -1.08, -0.78, 2.28, 1.4, -1.2),
        ("Front_R", 1.08, -0.78, 2.28, -1.6, 1.1),
        ("Back_L", -1.08, 0.58, 2.72, -1.1, -1.5),
        ("Back_R", 1.08, 0.58, 2.72, 1.3, 1.6),
    )
    for label, x, y, height, tilt_x, tilt_y in post_specs:
        add_cylinder(
            f"STALL_Post_{label}",
            0.075,
            height,
            (x, y, height / 2.0),
            materials["wood_log"],
            collection,
            root,
            vertices=8,
            rotation=(math.radians(tilt_x), math.radians(tilt_y), 0.0),
        )
        add_ico(
            f"STALL_PostFinial_{label}",
            (x, y, height + 0.05),
            (0.09, 0.09, 0.11),
            materials["wood_dark"],
            collection,
            root,
        )
    # 后板墙（契约节点）：悬挂海报与标签条
    add_box(
        "MESH_BackWall",
        (2.0, 0.07, 1.35),
        (0.0, 0.60, 1.42),
        materials["wood_dark"],
        collection,
        root,
        bevel=0.01,
    )
    # 板墙顶沿木条
    add_box(
        "STALL_BackWallCap",
        (2.1, 0.1, 0.09),
        (0.0, 0.60, 2.13),
        materials["wood_log"],
        collection,
        root,
        bevel=0.012,
    )


def add_awning(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    """条纹布篷：前低后高单坡 + 扇形檐边（圆碟 scallop）。"""
    width = 2.75
    stripes = 7
    stripe_w = width / stripes
    theta = math.radians(13.0)
    slope_len = 1.95
    mid_y, mid_z = -0.10, 2.44
    for index in range(stripes):
        offset = -width / 2.0 + stripe_w * (index + 0.5)
        material = materials["awning_red"] if index % 2 == 0 else materials["awning_white"]
        add_box(
            f"AWNING_Stripe_{index + 1:02d}",
            (stripe_w + 0.015, slope_len, 0.04),
            (offset, mid_y, mid_z),
            material,
            collection,
            root,
            rotation=(theta, 0.0, 0.0),
            bevel=0.006,
        )
    # 前沿扇形檐边：半圆扇直边对齐布篷前缘、圆弧朝下，拼出连续 scallop 剪影，颜色与所处条纹一致
    front_y = mid_y - (slope_len / 2.0) * math.cos(theta)
    front_z = mid_z - (slope_len / 2.0) * math.sin(theta)
    scallops = 9
    spacing = width / scallops
    for index in range(scallops):
        offset = -width / 2.0 + spacing * (index + 0.5)
        stripe_index = int((offset + width / 2.0) / stripe_w)
        material = materials["awning_red"] if stripe_index % 2 == 0 else materials["awning_white"]
        add_semicircle(
            f"AWNING_Scallop_{index + 1:02d}",
            spacing * 0.5,
            (offset, front_y + 0.005, front_z - 0.012),
            material,
            collection,
            root,
        )


def add_display_surfaces(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    face_y = 0.60 - 0.035 - 0.004  # 后板墙街道侧表面再略前
    specs = {
        "MESH_PhotoFrame_01": (0.46, face_y, 1.80),
        "MESH_PhotoFrame_02": (0.46, face_y, 1.28),
        "MESH_Backdrop": (-0.28, face_y, 1.02),
    }
    for mesh_name, surface in DISPLAY_SURFACES.items():
        if mesh_name in ("MESH_NamePlate", "MESH_Portrait"):
            continue
        obj = add_display_plane(
            mesh_name,
            surface["width"],
            surface["height"],
            specs[mesh_name],
            materials[f"display_{mesh_name}"],
            collection,
            root,
        )
        obj["display_surface"] = surface["kind"]
        obj["texture_contract"] = "frontend replaces material texture at runtime"
        # 海报木背板（略大一圈，营造钉上去的层级感）
        add_box(
            f"FRAME_{mesh_name.removeprefix('MESH_')}",
            (surface["width"] + 0.07, 0.03, surface["height"] + 0.07),
            (specs[mesh_name][0], face_y + 0.028, specs[mesh_name][2]),
            materials["wood_plank"],
            collection,
            root,
            bevel=0.008,
        )

    # 人像展示架：台面上的斜立画板（参考图的货品展示架位置）
    portrait = DISPLAY_SURFACES["MESH_Portrait"]
    tilt = math.radians(-10.0)
    board_loc = (-0.48, -0.18, 1.38)
    add_box(
        "FRAME_PortraitBoard",
        (portrait["width"] + 0.08, 0.045, portrait["height"] + 0.08),
        board_loc,
        materials["wood_dark"],
        collection,
        root,
        rotation=(tilt, 0.0, 0.0),
        bevel=0.01,
    )
    plane = add_display_plane(
        "MESH_Portrait",
        portrait["width"],
        portrait["height"],
        (board_loc[0], board_loc[1] - 0.036, board_loc[2] + 0.006),
        materials["display_MESH_Portrait"],
        collection,
        root,
        rotation=(math.radians(90.0) + tilt, 0.0, 0.0),
    )
    plane["display_surface"] = portrait["kind"]
    plane["texture_contract"] = "frontend replaces material texture at runtime"
    # 画板支脚
    add_cylinder(
        "FRAME_PortraitStand",
        0.028,
        0.55,
        (-0.48, -0.02, 1.12),
        materials["wood_dark"],
        collection,
        root,
        vertices=6,
        rotation=(math.radians(24.0), 0.0, 0.0),
    )

    # 名牌：布篷前沿下垂的木牌，两根皮绳悬挂
    plate = DISPLAY_SURFACES["MESH_NamePlate"]
    add_box(
        "FRAME_NamePlate",
        (plate["width"] + 0.10, 0.05, plate["height"] + 0.08),
        (0.0, -1.085, 1.78),
        materials["wood_log"],
        collection,
        root,
        bevel=0.015,
    )
    obj = add_display_plane(
        "MESH_NamePlate",
        plate["width"],
        plate["height"],
        (0.0, -1.116, 1.78),
        materials["display_MESH_NamePlate"],
        collection,
        root,
    )
    obj["display_surface"] = plate["kind"]
    obj["texture_contract"] = "frontend replaces material texture at runtime"
    for side, x in (("L", -0.5), ("R", 0.5)):
        add_cylinder(
            f"NAMEPLATE_Cord_{side}",
            0.012,
            0.30,
            (x, -1.08, 2.06),
            materials["cord"],
            collection,
            root,
            vertices=6,
        )


def add_props(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    top = 0.8675  # 蓝布罩表面
    # —— 左侧：木桶 + 书篮（参考图左） ——
    add_cylinder(
        "PROP_Barrel",
        0.27,
        0.62,
        (-1.38, -0.55, 0.31),
        materials["barrel"],
        collection,
        root,
        vertices=12,
    )
    for index, z in enumerate((0.14, 0.48), start=1):
        add_torus(
            f"PROP_BarrelBand_{index}",
            0.272,
            0.02,
            (-1.38, -0.55, z),
            materials["barrel_band"],
            collection,
            root,
        )
    add_cone(
        "PROP_BookBasket",
        0.24,
        0.19,
        0.18,
        (-1.38, -0.55, 0.71),
        materials["basket"],
        collection,
        root,
        vertices=10,
    )
    book_specs = (
        ("book_red", -0.05, 0.0, -14.0),
        ("book_green", 0.02, -0.04, 6.0),
        ("book_blue", 0.06, 0.03, 18.0),
        ("book_pages", -0.01, 0.05, -4.0),
    )
    for index, (mat, dx, dy, lean) in enumerate(book_specs, start=1):
        add_box(
            f"PROP_Book_{index:02d}",
            (0.05, 0.15, 0.22),
            (-1.38 + dx, -0.55 + dy, 0.86),
            materials[mat],
            collection,
            root,
            rotation=(math.radians(lean), 0.0, math.radians(lean * 0.3)),
            bevel=0.006,
        )
    # —— 左前杆：悬挂灯笼（参考图左） ——
    add_cylinder(
        "PROP_LanternCord",
        0.01,
        0.30,
        (-1.08, -0.80, 2.02),
        materials["cord"],
        collection,
        root,
        vertices=6,
    )
    add_cone(
        "PROP_LanternCap",
        0.12,
        0.03,
        0.10,
        (-1.08, -0.80, 1.86),
        materials["lantern_frame"],
        collection,
        root,
        vertices=8,
    )
    add_cylinder(
        "PROP_LanternGlass",
        0.085,
        0.16,
        (-1.08, -0.80, 1.74),
        materials["lantern_glass"],
        collection,
        root,
        vertices=8,
    )
    add_cone(
        "PROP_LanternBase",
        0.03,
        0.10,
        0.09,
        (-1.08, -0.80, 1.62),
        materials["lantern_frame"],
        collection,
        root,
        vertices=8,
    )
    # —— 台面右侧：盆栽 + 杂物托盘（参考图台面） ——
    add_cone(
        "PROP_PlantPot",
        0.09,
        0.065,
        0.11,
        (0.42, -0.28, top + 0.055),
        materials["pot"],
        collection,
        root,
        vertices=9,
    )
    for index, (dx, dy, s) in enumerate(((0.0, 0.0, 0.10), (-0.05, 0.03, 0.075), (0.05, 0.02, 0.08)), start=1):
        add_ico(
            f"PROP_PlantLeaf_{index}",
            (0.42 + dx, -0.28 + dy, top + 0.15 + s * 0.4),
            (s, s * 0.7, s * 1.25),
            materials["leaf"],
            collection,
            root,
        )
    add_box(
        "PROP_TrinketTray",
        (0.44, 0.26, 0.045),
        (0.44, -0.62, top + 0.022),
        materials["tray"],
        collection,
        root,
        bevel=0.008,
    )
    for index in range(6):
        add_ico(
            f"PROP_Trinket_{index + 1:02d}",
            (0.30 + (index % 3) * 0.13, -0.67 + (index // 3) * 0.11, top + 0.065),
            (0.032, 0.032, 0.02),
            materials["coin"],
            collection,
            root,
        )
    # —— 右前杆：手写侧挂木牌（纯装饰，参考图右侧挂牌） ——
    add_cylinder(
        "PROP_SideSignCord",
        0.01,
        0.22,
        (1.08, -0.80, 2.12),
        materials["cord"],
        collection,
        root,
        vertices=6,
    )
    add_box(
        "PROP_SideSign",
        (0.34, 0.04, 0.46),
        (1.08, -0.80, 1.86),
        materials["wood_plank"],
        collection,
        root,
        rotation=(0.0, 0.0, math.radians(-2.5)),
        bevel=0.01,
    )
    # —— 右下角：木箱（收纳感） ——
    add_box(
        "PROP_Crate",
        (0.42, 0.36, 0.30),
        (1.30, -0.35, 0.15),
        materials["wood_plank"],
        collection,
        root,
        rotation=(0.0, 0.0, math.radians(6.0)),
        bevel=0.012,
    )


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection) -> None:
    world = bpy.data.worlds.new("PREVIEW_StallWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#A8D4E8")
    background.inputs["Strength"].default_value = 0.30
    bpy.context.scene.world = world

    add_box(
        "PREVIEW_GroundCard",
        (8.0, 8.0, 0.05),
        (0.0, 0.0, -0.025),
        make_material("MAT_Preview_Ground", srgb("#B9C48A"), 0.98),
        collection,
    )

    camera_data = bpy.data.cameras.new("PREVIEW_StallCamera")
    camera = bpy.data.objects.new("PREVIEW_StallCamera", camera_data)
    collection.objects.link(camera)
    camera.location = (3.1, -4.5, 2.0)
    camera_data.lens = 50.0
    look_at(camera, Vector((-0.1, 0.0, 1.15)))
    bpy.context.scene.camera = camera

    sun_data = bpy.data.lights.new("PREVIEW_SoftSun", type="SUN")
    sun_data.energy = 2.2
    sun_data.angle = math.radians(12.0)
    sun_data.color = srgb("#FFE3B0")[:3]
    sun = bpy.data.objects.new("PREVIEW_SoftSun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(35.0), math.radians(-14.0), math.radians(-30.0))

    fill_data = bpy.data.lights.new("PREVIEW_StallFill", type="AREA")
    fill_data.energy = 200.0
    fill_data.shape = "DISK"
    fill_data.size = 4.0
    fill_data.color = srgb("#FFE0B0")[:3]
    fill = bpy.data.objects.new("PREVIEW_StallFill", fill_data)
    collection.objects.link(fill)
    fill.location = (-2.2, -2.6, 3.4)
    look_at(fill, Vector((0.0, 0.0, 1.1)))

    scene = bpy.context.scene
    # Eevee 需要 GL 上下文，无头机器没有；默认 Cycles CPU，可显式覆盖。
    engine_override = os.environ.get("ECHO_RENDER_ENGINE")
    if engine_override:
        scene.render.engine = engine_override
    else:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 64
        scene.cycles.use_denoising = True
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
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
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0


def export_runtime(collection: bpy.types.Collection) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["ROOT_MarketStall"]
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
    random.seed(SEED)
    reset_scene()
    runtime = make_collection("MARKET_StallRuntime")
    preview = make_collection("MARKET_StallPreviewOnly")
    materials = add_materials()

    root = add_empty("ROOT_MarketStall", runtime, display_size=0.3)
    root["asset_type"] = "EchoWorld market stall template module (traveling merchant cart)"
    root["style_version"] = "market-stall-v2"
    root["unit"] = "meter"
    root["front_side"] = "-Y (glTF +Z, toward the street)"
    root["reference"] = "docs/9f93aac8ae425a272ffd2a2f859bf6a9.jpg"
    root["seed"] = SEED

    add_cart_body(runtime, root, materials)
    add_frame(runtime, root, materials)
    add_awning(runtime, root, materials)
    add_display_surfaces(runtime, root, materials)
    add_props(runtime, root, materials)

    stand = add_empty(
        "ANCHOR_PersonStand",
        runtime,
        root,
        location=(0.0, 0.30, 0.0),
        display_size=0.18,
    )
    stand["anchor_kind"] = "person_stand"
    stand["forward_local"] = "-Y toward stall front (glTF +Z)"

    configure_preview(preview)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene["echo_world_asset"] = "market stall template module v2 (merchant cart)"

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_runtime(runtime)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    manifest = {
        "schema_version": "echo-market-stall.v2",
        "name": "EchoWorld Market Stall Template v2 (Traveling Merchant Cart)",
        "style": "storybook hand-painted merchant cart; terracotta/cream striped awning with scalloped edge, blue cloth counter with chevron trim, wagon wheels, lantern, book basket barrel",
        "reference_image": "docs/9f93aac8ae425a272ffd2a2f859bf6a9.jpg",
        "generator": "blender/build_market_stall_v2.py",
        "seed": SEED,
        "blend": str(BLEND_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "glb": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "preview": str(RENDER_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "root_node": root.name,
        "stand_anchor": "ANCHOR_PersonStand",
        "display_surfaces": {
            name: {
                "width_m": surface["width"],
                "height_m": surface["height"],
                "kind": surface["kind"],
                "material": f"MAT_Display_{name.removeprefix('MESH_')}",
            }
            for name, surface in DISPLAY_SURFACES.items()
        },
        "scale_contract": {
            "unit": "meter",
            "footprint_m": [2.75, 2.1],
            "awning_peak_z_m": 2.72,
            "counter_top_z_m": 0.87,
        },
        "coordinate_contract": {
            "origin": "stall center on ground",
            "front_side": "-Y in Blender, +Z after glTF export",
            "up_axis_export": "+Y via glTF",
        },
        "export_excludes": ["MARKET_StallPreviewOnly collection", "preview camera", "preview lights", "preview ground card"],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    build_scene()
