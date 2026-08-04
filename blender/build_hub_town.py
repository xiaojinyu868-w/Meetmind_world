"""EchoWorld 小镇 Hub 环境 v1 —— 箱庭夜集市（布局参考 docs/84a074ecf6a20c847a41b64a0cdb7d9b.png）。

平面布局（北 = -Z）：
  1 入口木门 (0, -14.5) → 2 市集街道（石板路，z -14.5..-3.5，两侧摊位垫 x=±4）
  → 3 篝火广场（圆心 (0, 2.5)，半径 4.6，中央篝火 + 木凳）
  → 4 咖啡厅（西侧 (-9.2, 2.5)，外观模块追加自 echo_world_cafe_exterior.blend，正面朝广场）
  → 5 花园/小河（南侧 z 8..13，蜿蜒河带 + 汀步 + 木桥 + 长椅 + 花境）
风格与市集摊位 v2 / 咖啡厅外观一致：手绘绘本、平涂哑光、暖色黄昏。
植被参考 docs/scence：层叠锥形松、圆冠树、团块灌木、锥形草丛。

契约：ROOT_HubTown、GROUND_*（地面射线）、ANCHOR_PlayerSpawn / ANCHOR_CafeDoor /
ANCHOR_Campfire / ANCHOR_Broadcast / ANCHOR_Gate；摊位为运行时克隆，本环境只提供
平坦摊位垫（PAD_Booth_*）与锚点数据（manifest + 后端 hall.py 对齐）。
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
CAFE_BLEND = PROJECT_ROOT / "blender" / "echo_world_cafe_exterior.blend"
BLEND_PATH = PROJECT_ROOT / "blender" / "echo_world_hub_town.blend"
GLB_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_hub_town.glb"
RENDER_OVERVIEW = PROJECT_ROOT / "renders" / "echo_world_hub_town_overview.png"
RENDER_PLAZA = PROJECT_ROOT / "renders" / "echo_world_hub_town_plaza.png"
MANIFEST_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_hub_town_manifest.json"

SEED = 26080504

# —— 布局常量（与后端 hall.py / 前端 ColliderRegistry / main.js 热点对齐的唯一事实源）——
GATE_POS = (0.0, -14.5)
SPAWN_POS = (0.0, -12.8)
STREET_HALF_W = 1.8
STREET_Z_MIN = -14.5
STREET_Z_MAX = -3.5
BOOTH_SIDE_X = 4.0
BOOTH_Z_START = -12.6
BOOTH_Z_STEP = 2.9
BOOTH_ROWS = 4                      # 每 z 行左右各一，容量 8（同侧 2.9m 不重叠）
PLAZA_CENTER = (0.0, 2.5)
PLAZA_RADIUS = 4.6
FIRE_POS = (0.0, 2.5)
CAFE_POS = (-9.2, 2.5)
CAFE_ROT_Z = math.radians(90.0)     # 外观正面 -Y 旋转后面朝 +X（广场）
CAFE_DOOR_WORLD = (-4.1, 0.6)       # 旋转后 ANCHOR_CafeDoor 的世界位置
BROADCAST_POS = (5.7, 2.8)
RIVER_BASE_Z = 10.2


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
    display_size: float = 0.15,
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
        modifier = obj.modifiers.new(name="HubBevel", type="BEVEL")
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
    major_segments: int = 16,
    minor_segments: int = 6,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius, minor_radius=minor_radius,
        major_segments=major_segments, minor_segments=minor_segments,
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


def add_materials() -> dict[str, bpy.types.Material]:
    return {
        "grass": make_material("MAT_Hub_Grass", srgb("#7FA05C"), 0.98),
        "grass_dark": make_material("MAT_Hub_GrassDark", srgb("#74A057"), 0.98),
        "earth": make_material("MAT_Hub_Earth", srgb("#8A6F4E"), 0.98),
        "stone": make_material("MAT_Hub_StonePath", srgb("#B9AE96"), 0.96),
        "stone_dark": make_material("MAT_Hub_StoneDark", srgb("#8D8474"), 0.96),
        "plaza": make_material("MAT_Hub_PlazaStone", srgb("#BCAE92"), 0.96),
        "plaza_ring": make_material("MAT_Hub_PlazaRing", srgb("#A89B82"), 0.96),
        "water": make_material("MAT_Hub_Water", srgb("#7FB2CC"), 0.72, emission=srgb("#5E94B4"), emission_strength=0.35),
        "riverbed": make_material("MAT_Hub_Riverbed", srgb("#4E7A94"), 0.9),
        "wood": make_material("MAT_Hub_Wood", srgb("#A87C50"), 0.92),
        "wood_dark": make_material("MAT_Hub_WoodDark", srgb("#6E4F34"), 0.9),
        "rope": make_material("MAT_Hub_Rope", srgb("#5A4A38"), 0.94),
        "pine": make_material("MAT_Hub_Pine", srgb("#4E7350"), 0.98),
        "pine_dark": make_material("MAT_Hub_PineDark", srgb("#3E6244"), 0.98),
        "canopy": make_material("MAT_Hub_Canopy", srgb("#7FA05C"), 0.98),
        "canopy_warm": make_material("MAT_Hub_CanopyWarm", srgb("#D8913E"), 0.96),
        "bush": make_material("MAT_Hub_Bush", srgb("#69914F"), 0.98),
        "flower_red": make_material("MAT_Hub_FlowerRed", srgb("#C65F52"), 0.92),
        "flower_yellow": make_material("MAT_Hub_FlowerYellow", srgb("#E4C46A"), 0.92),
        "flower_white": make_material("MAT_Hub_FlowerWhite", srgb("#EFE8D8"), 0.92),
        "reed": make_material("MAT_Hub_Reed", srgb("#8FA05C"), 0.98),
        "lamp_post": make_material("MAT_Hub_LampPost", srgb("#4E463E"), 0.88),
        "lamp_glass": make_material("MAT_Hub_LampGlass", srgb("#FFE3AE"), 0.7, emission=srgb("#FFB85E"), emission_strength=2.2),
        "bulb": make_material("MAT_Hub_StringBulb", srgb("#FFE9C0"), 0.7, emission=srgb("#FFC46A"), emission_strength=2.6),
        "fire_outer": make_material("MAT_Hub_FireOuter", srgb("#D96A2E"), 0.8, emission=srgb("#D96A2E"), emission_strength=2.6),
        "fire_inner": make_material("MAT_Hub_FireInner", srgb("#FFD98A"), 0.8, emission=srgb("#FFC46A"), emission_strength=3.4),
        "ember": make_material("MAT_Hub_Ember", srgb("#C65F3E"), 0.85, emission=srgb("#C65F3E"), emission_strength=1.6),
        "char": make_material("MAT_Hub_Char", srgb("#3E3228"), 0.96),
        "flag_red": make_material("MAT_Hub_FlagRed", srgb("#C65F45"), 0.94),
        "flag_cream": make_material("MAT_Hub_FlagCream", srgb("#F2EAD8"), 0.96),
        "flag_green": make_material("MAT_Hub_FlagGreen", srgb("#4F7A5A"), 0.94),
    }


# ———————————————————————————— 地形 ————————————————————————————

def add_base(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    # 箱庭底座：草地主体 + 稍深的底沿（俯视有沙盘厚度感）
    add_box("BASE_EarthEdge", (30.0, 34.0, 0.5), (0.0, 0.0, -0.28), materials["earth"], collection, root, bevel=0.1)
    add_box("GROUND_HubBase", (29.4, 33.4, 0.22), (0.0, 0.0, -0.06), materials["grass"], collection, root, bevel=0.06)
    # 草色深浅斑块（打破大平面）
    rng = random.Random(SEED)
    for index in range(14):
        x = rng.uniform(-13, 13)
        y = rng.uniform(-15, 15)
        if abs(x) < 3.2 and STREET_Z_MIN - 1 < y < PLAZA_CENTER[1]:
            continue  # 街道主通道不铺斑块
        scale = rng.uniform(1.2, 2.6)
        add_ico(
            f"GROUND_GrassPatch_{index + 1:02d}",
            (x, y, 0.045),
            (scale, scale * rng.uniform(0.75, 1.0), 0.035),
            materials["grass_dark"], collection, root,
        )


def add_street(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    # 街道石板路：连续路基 + 两行错缝石板，从入口铺到广场
    add_box(
        "GROUND_StreetBase",
        (STREET_HALF_W * 2 + 0.6, STREET_Z_MAX - STREET_Z_MIN + 0.8, 0.05),
        (0.0, (STREET_Z_MIN + STREET_Z_MAX) / 2, 0.045),
        materials["stone_dark"], collection, root,
        bevel=0.02,
    )
    rng = random.Random(SEED + 1)
    index = 0
    y = STREET_Z_MIN + 0.3
    while y < STREET_Z_MAX:
        for lane, x in enumerate((-0.85, 0.85)):
            index += 1
            jitter_x = rng.uniform(-0.08, 0.08)
            add_box(
                f"PATH_Street_{index:03d}",
                (1.55 + rng.uniform(-0.12, 0.12), 1.05 + rng.uniform(-0.1, 0.1), 0.07),
                (x + jitter_x, y + (0.5 if lane else 0.0), 0.075),
                materials["stone"] if index % 3 else materials["stone_dark"],
                collection, root,
                rotation=(0.0, 0.0, rng.uniform(-0.05, 0.05)),
                bevel=0.03,
            )
        y += 1.12


def add_plaza(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    cx, cy = PLAZA_CENTER
    add_cylinder("GROUND_Plaza", PLAZA_RADIUS, 0.09, (cx, cy, 0.075), materials["plaza"], collection, root, vertices=28)
    add_torus("PLAZA_RingOuter", PLAZA_RADIUS - 0.35, 0.09, (cx, cy, 0.125), materials["plaza_ring"], collection, root, major_segments=28)
    add_torus("PLAZA_RingInner", 2.1, 0.07, (cx, cy, 0.125), materials["plaza_ring"], collection, root, major_segments=22)
    # 放射石板：从圆心向外 8 条
    for spoke in range(8):
        angle = spoke * math.pi / 4
        r = 3.1
        add_box(
            f"PLAZA_Spoke_{spoke}",
            (0.5, 0.7, 0.045),
            (cx + math.cos(angle) * r, cy + math.sin(angle) * r, 0.125),
            materials["stone_dark"],
            collection, root,
            rotation=(0.0, 0.0, angle),
            bevel=0.02,
        )


def add_river(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    """南侧蜿蜒河带：正弦中线 + 变化半宽，两岸堆石与芦苇。"""
    segments = 26
    verts = []
    for index in range(segments + 1):
        x = -14.0 + 28.0 * index / segments
        center_z = RIVER_BASE_Z + 1.4 * math.sin(x * 0.30)
        half_w = 1.55 + 0.35 * math.sin(x * 0.47 + 1.0)
        verts.append((x, center_z - half_w, 0.058))
        verts.append((x, center_z + half_w, 0.058))
    faces = [(index * 2, index * 2 + 2, index * 2 + 3, index * 2 + 1) for index in range(segments)]  # 法线朝上（+Z）
    mesh = bpy.data.meshes.new("RIVER_Ribbon_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    river = bpy.data.objects.new("RIVER_Ribbon", mesh)
    collection.objects.link(river)
    assign_material(river, materials["water"])
    river.parent = root
    # 河床衬底（稍大一圈、更低，兜住水面边缘）
    bed_verts = [(x, y, 0.052) for x, y, _ in verts]
    bed_mesh = bpy.data.meshes.new("RIVER_Bed_Mesh")
    bed_mesh.from_pydata(bed_verts, [], faces)
    bed_mesh.update()
    bed = bpy.data.objects.new("RIVER_Bed", bed_mesh)
    collection.objects.link(bed)
    assign_material(bed, materials["riverbed"])
    bed.parent = root
    # 岸石与芦苇
    rng = random.Random(SEED + 2)
    for index in range(20):
        x = rng.uniform(-13, 13)
        center_z = RIVER_BASE_Z + 1.4 * math.sin(x * 0.30)
        half_w = 1.55 + 0.35 * math.sin(x * 0.47 + 1.0)
        side = rng.choice((-1, 1))
        bank_z = center_z + side * (half_w + rng.uniform(0.1, 0.45))
        add_ico(
            f"RIVER_BankStone_{index + 1:02d}",
            (x, bank_z, 0.10),
            (rng.uniform(0.14, 0.3), rng.uniform(0.12, 0.26), rng.uniform(0.08, 0.16)),
            materials["stone_dark"], collection, root,
        )
    for index in range(16):
        x = rng.uniform(-13, 13)
        center_z = RIVER_BASE_Z + 1.4 * math.sin(x * 0.30)
        half_w = 1.55 + 0.35 * math.sin(x * 0.47 + 1.0)
        side = rng.choice((-1, 1))
        add_cone(
            f"RIVER_Reed_{index + 1:02d}",
            0.05, 0.012, rng.uniform(0.35, 0.6),
            (x + rng.uniform(-0.2, 0.2), center_z + side * (half_w + 0.06), 0.28),
            materials["reed"], collection, root,
            vertices=5,
        )
    # 汀步（x≈3.2 处过河）
    center_z = RIVER_BASE_Z + 1.4 * math.sin(3.2 * 0.30)
    for index in range(4):
        z = center_z - 1.55 + index * 1.05
        add_cylinder(
            f"RIVER_StepStone_{index + 1}",
            0.42 + (index % 2) * 0.06, 0.12,
            (3.2 + (index % 2) * 0.25 - 0.12, z, 0.03),
            materials["stone"], collection, root,
            vertices=8,
        )
    # 小木桥（x≈-3.2 处过河）：微拱板面 + 两侧栏杆
    bridge_z = RIVER_BASE_Z + 1.4 * math.sin(-3.2 * 0.30)
    for index in range(7):
        t = index / 6 - 0.5
        add_box(
            f"BRIDGE_Plank_{index + 1}",
            (1.7, 0.55, 0.09),
            (-3.2, bridge_z + t * 3.4, 0.24 + math.cos(t * math.pi) * 0.18),
            materials["wood"], collection, root,
            rotation=(t * 0.18, 0.0, 0.0),
            bevel=0.015,
        )
    for side, dx in (("L", -0.8), ("R", 0.8)):
        for index in range(3):
            t = index / 2 - 0.5
            add_cylinder(
                f"BRIDGE_Post_{side}_{index + 1}",
                0.05, 0.65,
                (-3.2 + dx, bridge_z + t * 3.2, 0.55 + math.cos(t * math.pi) * 0.18),
                materials["wood_dark"], collection, root,
                vertices=7,
            )
        add_box(
            f"BRIDGE_Rail_{side}",
            (0.07, 3.4, 0.08),
            (-3.2 + dx, bridge_z, 0.94),
            materials["wood_dark"], collection, root,
            bevel=0.012,
        )


# ———————————————————————————— 结构 ————————————————————————————

def add_gate(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    gx, gy = GATE_POS
    for side, x in (("L", gx - 2.3), ("R", gx + 2.3)):
        add_cylinder(f"GATE_Post_{side}", 0.16, 3.3, (x, gy, 1.65), materials["wood_dark"], collection, root, vertices=9)
        add_ico(f"GATE_PostTop_{side}", (x, gy, 3.38), (0.2, 0.2, 0.16), materials["wood"], collection, root)
    add_box("GATE_Beam", (5.3, 0.28, 0.3), (gx, gy, 3.16), materials["wood_dark"], collection, root, bevel=0.03)
    add_box("GATE_BeamUpper", (4.2, 0.2, 0.18), (gx, gy, 3.52), materials["wood"], collection, root, bevel=0.025)
    # 门楣挂牌（无字木匾，前端可叠 UI）
    add_cylinder("GATE_SignCordL", 0.015, 0.3, (gx - 0.55, gy, 2.85), materials["rope"], collection, root, vertices=6)
    add_cylinder("GATE_SignCordR", 0.015, 0.3, (gx + 0.55, gy, 2.85), materials["rope"], collection, root, vertices=6)
    add_box("GATE_Sign", (1.5, 0.07, 0.5), (gx, gy - 0.02, 2.45), materials["wood"], collection, root, bevel=0.03)
    # 挂灯
    add_cylinder("GATE_LanternCord", 0.012, 0.35, (gx, gy, 2.95), materials["rope"], collection, root, vertices=6)
    add_cone("GATE_LanternCap", 0.14, 0.04, 0.1, (gx, gy, 2.74), materials["lamp_post"], collection, root, vertices=8)
    add_cylinder("GATE_LanternGlass", 0.1, 0.2, (gx, gy, 2.58), materials["lamp_glass"], collection, root, vertices=8)
    add_cone("GATE_LanternBase", 0.04, 0.12, 0.1, (gx, gy, 2.42), materials["lamp_post"], collection, root, vertices=8)


def add_campfire(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    fx, fy = FIRE_POS
    # 石圈
    add_torus("FIRE_StoneRing", 0.78, 0.14, (fx, fy, 0.16), materials["stone_dark"], collection, root, major_segments=12)
    rng = random.Random(SEED + 3)
    for index in range(9):
        angle = index / 9 * math.tau
        add_ico(
            f"FIRE_RingStone_{index + 1}",
            (fx + math.cos(angle) * 0.82, fy + math.sin(angle) * 0.82, 0.16),
            (0.16, 0.14, 0.12),
            materials["stone"] if index % 2 else materials["stone_dark"],
            collection, root,
        )
    # 柴堆
    for index, rot in enumerate((0.3, 1.3, 2.4)):
        add_cylinder(
            f"FIRE_Log_{index + 1}",
            0.09, 0.85,
            (fx + rng.uniform(-0.05, 0.05), fy + rng.uniform(-0.05, 0.05), 0.24),
            materials["char"], collection, root,
            vertices=7,
            rotation=(math.radians(78.0), 0.0, rot),
        )
    # 火焰（嵌套锥 + 余烬）
    add_cone("FIRE_FlameOuter", 0.36, 0.06, 0.62, (fx, fy, 0.56), materials["fire_outer"], collection, root, vertices=8)
    add_cone("FIRE_FlameInner", 0.16, 0.03, 0.42, (fx, fy, 0.52), materials["fire_inner"], collection, root, vertices=7)
    for index in range(5):
        angle = rng.uniform(0, math.tau)
        add_ico(
            f"FIRE_Ember_{index + 1}",
            (fx + math.cos(angle) * rng.uniform(0.15, 0.4), fy + math.sin(angle) * rng.uniform(0.15, 0.4), 0.20),
            (0.05, 0.05, 0.04),
            materials["ember"], collection, root,
        )
    # 木凳（5 个树桩围坐）
    for index in range(5):
        angle = index / 5 * math.tau + 0.35
        sx = fx + math.cos(angle) * 1.75
        sy = fy + math.sin(angle) * 1.75
        add_cylinder(f"FIRE_Stool_{index + 1}", 0.26, 0.42, (sx, sy, 0.21), materials["wood"], collection, root, vertices=9)
        add_cylinder(f"FIRE_StoolTop_{index + 1}", 0.27, 0.05, (sx, sy, 0.44), materials["wood_dark"], collection, root, vertices=9)


def add_lamp(
    name: str,
    x: float,
    y: float,
    materials: dict,
    collection: bpy.types.Collection,
    root: bpy.types.Object,
) -> None:
    add_cylinder(f"{name}_Post", 0.07, 2.5, (x, y, 1.25), materials["lamp_post"], collection, root, vertices=8)
    add_cylinder(f"{name}_Base", 0.14, 0.14, (x, y, 0.07), materials["lamp_post"], collection, root, vertices=8)
    add_cone(f"{name}_Cap", 0.2, 0.05, 0.16, (x, y, 2.62), materials["lamp_post"], collection, root, vertices=8)
    add_box(f"{name}_Glass", (0.22, 0.22, 0.3), (x, y, 2.38), materials["lamp_glass"], collection, root, bevel=0.02)


def add_lamps(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    positions = [
        ("Street_L1", -2.7, -11.5), ("Street_R1", 2.7, -9.5),
        ("Street_L2", -2.7, -6.0), ("Street_R2", 2.7, -4.3),
        ("Plaza_E", 5.2, 2.5), ("Plaza_S", 1.8, 6.6), ("Plaza_NW", -4.2, -0.6),
        ("Garden_1", 6.8, 8.3), ("Garden_2", -7.6, 8.8),
    ]
    for name, x, y in positions:
        add_lamp(f"LAMP_{name}", x, y, materials, collection, root)


def add_string_lights(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    """串灯：两点间下垂抛物线 + 间隔灯泡。街道两道 + 广场一圈。"""
    spans = [
        # (name, x1, y1, x2, y2, 顶高, 下垂, 灯泡数)
        ("Street_1", -3.9, -11.0, 3.9, -11.0, 3.0, 0.55, 9),
        ("Street_2", -3.9, -7.2, 3.9, -7.2, 3.0, 0.55, 9),
        ("Plaza_1", -4.2, -0.6, 0.0, -2.1, 3.1, 0.5, 6),
        ("Plaza_2", 0.0, -2.1, 5.2, 2.5, 3.1, 0.5, 7),
        ("Plaza_3", 5.2, 2.5, 1.8, 6.6, 3.1, 0.5, 6),
        ("Plaza_4", 1.8, 6.6, -4.2, -0.6, 3.1, 0.7, 8),
    ]
    flags = ["flag_red", "flag_cream", "flag_green"]
    for name, x1, y1, x2, y2, top, sag, bulbs in spans:
        segments = bulbs * 2
        prev = None
        for index in range(segments + 1):
            t = index / segments
            x = x1 + (x2 - x1) * t
            y = y1 + (y2 - y1) * t
            z = top - sag * (1.0 - (2.0 * t - 1.0) ** 2)
            if prev is not None:
                mx, my, mz = (x + prev[0]) / 2, (y + prev[1]) / 2, (z + prev[2]) / 2
                dx, dy, dz = x - prev[0], y - prev[1], z - prev[2]
                length = math.sqrt(dx * dx + dy * dy + dz * dz)
                rope = add_cylinder(
                    f"STRING_{name}_Rope_{index:02d}",
                    0.012, length,
                    (mx, my, mz),
                    materials["rope"], collection, root,
                    vertices=5,
                )
                # 圆柱默认沿 Z：旋到线段方向
                rope.rotation_euler = Vector((0, 0, 1)).rotation_difference(Vector((dx, dy, dz)).normalized()).to_euler()
            if index % 2 == 1:
                add_ico(
                    f"STRING_{name}_Bulb_{index:02d}",
                    (x, y, z - 0.07),
                    (0.05, 0.05, 0.07),
                    materials["bulb"], collection, root,
                )
            elif 0 < index < segments and index % 4 == 0:
                # 相间小旗
                flag = add_cone(
                    f"STRING_{name}_Flag_{index:02d}",
                    0.09, 0.0, 0.22,
                    (x, y, z - 0.13),
                    materials[flags[(index // 4) % 3]], collection, root,
                    vertices=3,
                    rotation=(0.0, 0.0, math.radians(180.0)),
                )
            prev = (x, y, z)


def add_booth_pads(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    """摊位垫：平整天光石台，运行时摊位克隆落在上面（位置与 hall.py 对齐）。"""
    # 广场北弧 4 摊（r=5.0，与 hall.py PLAZA_ARC_ANGLES 一致）
    for index, angle_deg in enumerate((-55.0, -25.0, 25.0, 55.0), start=1):
        angle = math.radians(angle_deg)
        add_box(
            f"PAD_Booth_Arc_{index}",
            (3.0, 2.6, 0.06),
            (
                PLAZA_CENTER[0] + 5.0 * math.sin(angle),
                PLAZA_CENTER[1] - 5.0 * math.cos(angle),
                0.06,
            ),
            materials["stone_dark"],
            collection, root,
            rotation=(0.0, 0.0, angle),
            bevel=0.03,
        )
    for row in range(BOOTH_ROWS):
        z = BOOTH_Z_START + row * BOOTH_Z_STEP
        for side, x in (("L", -BOOTH_SIDE_X), ("R", BOOTH_SIDE_X)):
            add_box(
                f"PAD_Booth_{side}_{row + 1}",
                (3.0, 1.3, 0.06),
                (x, z, 0.06),
                materials["stone_dark"],
                collection, root,
                bevel=0.03,
            )


def add_benches(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    for index, (x, y, yaw) in enumerate(((6.2, 6.9, -0.5), (-6.4, 7.6, 0.6), (5.6, -2.6, 0.9)), start=1):
        add_box(f"BENCH_{index}_Seat", (1.3, 0.4, 0.08), (x, y, 0.42), materials["wood"], collection, root, rotation=(0.0, 0.0, yaw), bevel=0.015)
        add_box(f"BENCH_{index}_Back", (1.3, 0.08, 0.4), (x - math.sin(yaw) * 0.2, y - math.cos(yaw) * 0.2, 0.66), materials["wood"], collection, root, rotation=(0.0, 0.0, yaw), bevel=0.015)
        for leg, offset in (("L", -0.5), ("R", 0.5)):
            add_box(
                f"BENCH_{index}_Leg{leg}",
                (0.09, 0.34, 0.4),
                (x + math.cos(yaw) * offset, y - math.sin(yaw) * offset, 0.2),
                materials["wood_dark"], collection, root,
                rotation=(0.0, 0.0, yaw),
            )


# ———————————————————————————— 植被 ————————————————————————————

def add_pine(
    name: str,
    x: float,
    y: float,
    scale: float,
    materials: dict,
    collection: bpy.types.Collection,
    root: bpy.types.Object,
) -> None:
    add_cylinder(f"{name}_Trunk", 0.12 * scale, 0.7 * scale, (x, y, 0.35 * scale), materials["wood_dark"], collection, root, vertices=7)
    tiers = ((0.95, 1.0, 0.85), (0.72, 0.9, 1.45), (0.48, 0.8, 2.0))
    for index, (radius, depth, z) in enumerate(tiers):
        add_cone(
            f"{name}_Tier_{index + 1}",
            radius * scale, 0.06 * scale, depth * scale,
            (x, y, z * scale + 0.4 * scale),
            materials["pine"] if index % 2 else materials["pine_dark"],
            collection, root,
            vertices=8,
        )


def add_round_tree(
    name: str,
    x: float,
    y: float,
    scale: float,
    warm: bool,
    materials: dict,
    collection: bpy.types.Collection,
    root: bpy.types.Object,
) -> None:
    add_cylinder(f"{name}_Trunk", 0.13 * scale, 1.1 * scale, (x, y, 0.55 * scale), materials["wood_dark"], collection, root, vertices=7)
    mat = materials["canopy_warm"] if warm else materials["canopy"]
    add_ico(f"{name}_Crown_1", (x, y, 1.45 * scale), (0.85 * scale, 0.8 * scale, 0.7 * scale), mat, collection, root, subdivisions=2)
    add_ico(f"{name}_Crown_2", (x + 0.45 * scale, y + 0.2 * scale, 1.2 * scale), (0.5 * scale, 0.45 * scale, 0.4 * scale), mat, collection, root)
    add_ico(f"{name}_Crown_3", (x - 0.4 * scale, y - 0.25 * scale, 1.25 * scale), (0.45 * scale, 0.4 * scale, 0.38 * scale), mat, collection, root)


def add_vegetation(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    # 大树：入口两侧、广场西北地标树、花园沿河、四周散落
    add_pine("TREE_Pine_GateL", -4.6, -14.2, 1.25, materials, collection, root)
    add_pine("TREE_Pine_GateR", 4.8, -14.0, 1.1, materials, collection, root)
    add_round_tree("TREE_Round_PlazaNW", -5.6, -1.8, 1.35, False, materials, collection, root)
    add_round_tree("TREE_Round_GardenE", 8.6, 7.2, 1.2, True, materials, collection, root)
    add_round_tree("TREE_Round_GardenW", -8.8, 12.8, 1.3, False, materials, collection, root)
    add_pine("TREE_Pine_SE", 12.2, 13.4, 1.15, materials, collection, root)
    add_pine("TREE_Pine_SW", -12.6, 6.8, 1.0, materials, collection, root)
    add_pine("TREE_Pine_NE", 12.6, -12.6, 1.2, materials, collection, root)
    add_round_tree("TREE_Round_NE2", 10.8, -6.2, 0.95, False, materials, collection, root)
    add_round_tree("TREE_Round_W1", -12.8, -6.8, 1.05, True, materials, collection, root)
    add_pine("TREE_Pine_W2", -13.0, -11.8, 0.9, materials, collection, root)
    add_round_tree("TREE_Round_S1", 2.8, 14.0, 1.0, False, materials, collection, root)
    add_round_tree("TREE_Round_S2", -5.2, 13.8, 1.1, True, materials, collection, root)
    add_pine("TREE_Pine_S3", 8.2, 13.2, 0.95, materials, collection, root)
    # 灌木与花境
    rng = random.Random(SEED + 4)
    for index in range(22):
        x = rng.uniform(-13.5, 13.5)
        y = rng.uniform(-15, 15)
        # 避开街道/广场/摊位垫/咖啡厅/河面
        if abs(x) < 3.0 and STREET_Z_MIN - 0.5 < y < PLAZA_CENTER[1]:
            continue
        if math.hypot(x - PLAZA_CENTER[0], y - PLAZA_CENTER[1]) < PLAZA_RADIUS + 0.6:
            continue
        if abs(x) > 2.4 and abs(x) < 5.7 and STREET_Z_MIN < y < STREET_Z_MAX + 0.5:
            continue
        if -13.0 < x < -5.5 and -1.5 < y < 6.5:
            continue
        river_z = RIVER_BASE_Z + 1.4 * math.sin(x * 0.30)
        if abs(y - river_z) < 2.2:
            continue
        scale = rng.uniform(0.25, 0.5)
        add_ico(
            f"BUSH_{index + 1:02d}",
            (x, y, scale * 0.55),
            (scale * 1.3, scale * 1.15, scale * 0.8),
            materials["bush"], collection, root,
        )
    flower_mats = ["flower_red", "flower_yellow", "flower_white"]
    for index in range(40):
        x = rng.uniform(-13.5, 13.5)
        y = rng.uniform(-15, 15)
        if abs(x) < 3.0 and STREET_Z_MIN - 0.5 < y < PLAZA_CENTER[1]:
            continue
        if math.hypot(x - PLAZA_CENTER[0], y - PLAZA_CENTER[1]) < PLAZA_RADIUS + 0.4:
            continue
        if abs(x) > 2.4 and abs(x) < 5.7 and STREET_Z_MIN < y < STREET_Z_MAX + 0.5:
            continue
        if -13.0 < x < -5.5 and -1.5 < y < 6.5:
            continue
        river_z = RIVER_BASE_Z + 1.4 * math.sin(x * 0.30)
        if abs(y - river_z) < 1.9:
            continue
        add_cone(
            f"FLOWER_Stem_{index + 1:02d}",
            0.015, 0.006, 0.16,
            (x, y, 0.14),
            materials["reed"], collection, root,
            vertices=5,
        )
        add_ico(
            f"FLOWER_Head_{index + 1:02d}",
            (x, y, 0.24),
            (0.05, 0.05, 0.05),
            materials[flower_mats[index % 3]], collection, root,
        )
    # 草丛（锥形小簇）
    for index in range(36):
        x = rng.uniform(-14, 14)
        y = rng.uniform(-15.5, 15.5)
        if abs(x) < 3.2 and STREET_Z_MIN - 0.5 < y < PLAZA_CENTER[1]:
            continue
        if math.hypot(x - PLAZA_CENTER[0], y - PLAZA_CENTER[1]) < PLAZA_RADIUS + 0.3:
            continue
        add_cone(
            f"GRASS_Tuft_{index + 1:02d}",
            rng.uniform(0.06, 0.11), 0.01, rng.uniform(0.14, 0.3),
            (x, y, 0.12),
            materials["reed"], collection, root,
            vertices=5,
        )


# ———————————————————————————— 咖啡厅外观追加 ————————————————————————————

def append_cafe(collection: bpy.types.Collection, root: bpy.types.Object) -> bpy.types.Object:
    """从咖啡厅外观 .blend 追加运行时集合，放置到广场西侧、正面朝广场。"""
    if not CAFE_BLEND.exists():
        raise RuntimeError(f"缺少咖啡厅外观源文件：{CAFE_BLEND}（先运行 build_cafe_exterior.py）")
    with bpy.data.libraries.load(str(CAFE_BLEND), link=False) as (data_from, data_to):
        data_to.collections = ["CAFE_ExteriorRuntime"]
    cafe_collection = data_to.collections[0]
    # 实例化集合中的对象到当前场景（保留内部父子层级）
    objects = list(cafe_collection.objects)
    cafe_root = None
    for obj in objects:
        collection.objects.link(obj)
        if obj.name == "ROOT_CafeExterior":
            cafe_root = obj
    if cafe_root is None:
        raise RuntimeError("咖啡厅外观 .blend 中未找到 ROOT_CafeExterior")
    cafe_root.location = (CAFE_POS[0], CAFE_POS[1], 0.0)
    cafe_root.rotation_euler = (0.0, 0.0, CAFE_ROT_Z)
    cafe_root.name = "VENUE_CafeExterior"
    # 挂到 Hub 根下（保持 ROOT 层级清晰）
    for obj in objects:
        if obj is cafe_root:
            continue
        if obj.parent is None:
            obj.parent = cafe_root
    cafe_root.parent = root
    return cafe_root


# ———————————————————————————— 预览 / 导出 ————————————————————————————

def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection) -> tuple[bpy.types.Object, bpy.types.Object]:
    world = bpy.data.worlds.new("PREVIEW_HubWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#2E3A5C")
    background.inputs["Strength"].default_value = 0.35
    bpy.context.scene.world = world

    camera_data = bpy.data.cameras.new("PREVIEW_HubCamera")
    camera = bpy.data.objects.new("PREVIEW_HubCamera", camera_data)
    collection.objects.link(camera)
    camera.location = (20.0, -24.0, 26.0)
    camera_data.lens = 46.0
    look_at(camera, Vector((0.0, 0.5, 0.0)))
    bpy.context.scene.camera = camera

    sun_data = bpy.data.lights.new("PREVIEW_DuskSun", type="SUN")
    sun_data.energy = 0.9
    sun_data.angle = math.radians(20.0)
    sun_data.color = srgb("#FFB98A")[:3]
    sun = bpy.data.objects.new("PREVIEW_DuskSun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(62.0), math.radians(-8.0), math.radians(-30.0))

    fill_data = bpy.data.lights.new("PREVIEW_HubFill", type="AREA")
    fill_data.energy = 500.0
    fill_data.shape = "DISK"
    fill_data.size = 8.0
    fill_data.color = srgb("#FFE0B0")[:3]
    fill = bpy.data.objects.new("PREVIEW_HubFill", fill_data)
    collection.objects.link(fill)
    fill.location = (0.0, -6.0, 9.0)
    look_at(fill, Vector((0.0, 0.0, 0.0)))

    garden_data = bpy.data.lights.new("PREVIEW_GardenFill", type="AREA")
    garden_data.energy = 350.0
    garden_data.shape = "DISK"
    garden_data.size = 7.0
    garden_data.color = srgb("#BFD8FF")[:3]
    garden = bpy.data.objects.new("PREVIEW_GardenFill", garden_data)
    collection.objects.link(garden)
    garden.location = (4.0, 10.0, 8.0)
    look_at(garden, Vector((0.0, 9.5, 0.0)))

    fire_light_data = bpy.data.lights.new("PREVIEW_FireGlow", type="POINT")
    fire_light_data.energy = 260.0
    fire_light_data.color = srgb("#FF9A4E")[:3]
    fire_light_data.shadow_soft_size = 0.6
    fire_light = bpy.data.objects.new("PREVIEW_FireGlow", fire_light_data)
    collection.objects.link(fire_light)
    fire_light.location = (FIRE_POS[0], FIRE_POS[1], 1.2)

    scene = bpy.context.scene
    engine_override = os.environ.get("ECHO_RENDER_ENGINE")
    if engine_override:
        scene.render.engine = engine_override
    else:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 48
        scene.cycles.use_denoising = True
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    for look in ("AgX - Medium High Contrast", "AgX - Medium Low Contrast", "Medium High Contrast"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    return camera, fill


def export_runtime(collection: bpy.types.Collection) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["ROOT_HubTown"]
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
    runtime = make_collection("HUB_TownRuntime")
    preview = make_collection("HUB_TownPreviewOnly")
    materials = add_materials()

    root = add_empty("ROOT_HubTown", runtime, display_size=0.5)
    root["asset_type"] = "EchoWorld hub town environment (night market diorama)"
    root["style_version"] = "hub-town-v1"
    root["unit"] = "meter"
    root["reference"] = "docs/84a074ecf6a20c847a41b64a0cdb7d9b.png"
    root["seed"] = SEED

    add_base(runtime, root, materials)
    add_street(runtime, root, materials)
    add_plaza(runtime, root, materials)
    add_river(runtime, root, materials)
    add_gate(runtime, root, materials)
    add_campfire(runtime, root, materials)
    add_lamps(runtime, root, materials)
    add_string_lights(runtime, root, materials)
    add_booth_pads(runtime, root, materials)
    add_benches(runtime, root, materials)
    add_vegetation(runtime, root, materials)
    append_cafe(runtime, root)

    anchors = {
        "ANCHOR_PlayerSpawn": (SPAWN_POS[0], SPAWN_POS[1], 0.0),
        "ANCHOR_Campfire": (FIRE_POS[0], FIRE_POS[1], 0.0),
        "ANCHOR_CafeDoor": (CAFE_DOOR_WORLD[0], CAFE_DOOR_WORLD[1], 0.0),
        "ANCHOR_Broadcast": (BROADCAST_POS[0], BROADCAST_POS[1], 0.0),
        "ANCHOR_Gate": (GATE_POS[0], GATE_POS[1], 0.0),
    }
    for name, location in anchors.items():
        anchor = add_empty(name, runtime, root, location=location, display_size=0.25)
        anchor["anchor_kind"] = name.removeprefix("ANCHOR_").lower()

    configure_preview(preview)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene["echo_world_asset"] = "hub town environment v1"

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_OVERVIEW.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_runtime(runtime)
    # 两张预览：俯瞰全景 + 广场篝火视角
    scene.render.filepath = str(RENDER_OVERVIEW)
    bpy.ops.render.render(write_still=True)
    camera = bpy.data.objects.get("PREVIEW_HubCamera")
    if camera is not None:
        camera.location = (6.5, -5.5, 2.6)
        look_at(camera, Vector((FIRE_POS[0] - 1.5, FIRE_POS[1] + 1.0, 1.2)))
        scene.render.filepath = str(RENDER_PLAZA)
        bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    booth_anchors = []
    for row in range(BOOTH_ROWS):
        z = BOOTH_Z_START + row * BOOTH_Z_STEP
        for side_index, (side, x) in enumerate((("L", -BOOTH_SIDE_X), ("R", BOOTH_SIDE_X))):
            booth_anchors.append({
                "index": row * 2 + side_index,
                "x": x,
                "z": z,
                "yaw": math.pi / 2 if side == "L" else -math.pi / 2,
            })
    for arc_index, angle_deg in enumerate((-55.0, -25.0, 25.0, 55.0)):
        angle = math.radians(angle_deg)
        ax = PLAZA_CENTER[0] + 5.0 * math.sin(angle)
        az = PLAZA_CENTER[1] - 5.0 * math.cos(angle)
        booth_anchors.append({
            "index": 8 + arc_index,
            "x": ax,
            "z": az,
            "yaw": math.atan2(PLAZA_CENTER[0] - ax, PLAZA_CENTER[1] - az),
        })
    colliders = [
        {"x": CAFE_POS[0], "z": CAFE_POS[1], "r": 4.3, "kind": "cafe-building"},
        {"x": FIRE_POS[0], "z": FIRE_POS[1], "r": 1.05, "kind": "campfire"},
        {"x": GATE_POS[0] - 2.3, "z": GATE_POS[1], "r": 0.3, "kind": "gate-post"},
        {"x": GATE_POS[0] + 2.3, "z": GATE_POS[1], "r": 0.3, "kind": "gate-post"},
    ]
    manifest = {
        "schema_version": "echo-hub-town.v1",
        "name": "EchoWorld Hub Town (Night Market Diorama)",
        "style": "storybook hand-painted dusk market town; consistent with market-stall-v2 / cafe-exterior-v1",
        "reference_image": "docs/84a074ecf6a20c847a41b64a0cdb7d9b.png",
        "generator": "blender/build_hub_town.py",
        "seed": SEED,
        "blend": str(BLEND_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "glb": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "previews": [
            str(RENDER_OVERVIEW.relative_to(PROJECT_ROOT)).replace("\\", "/"),
            str(RENDER_PLAZA.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        ],
        "root_node": root.name,
        "ground_nodes": ["GROUND_HubBase", "GROUND_Plaza", "PATH_Street_*", "PAD_Booth_*"],
        "anchors": {name: {"x": loc[0], "z": loc[1]} for name, loc in anchors.items()},
        "layout": {
            "gate": {"x": GATE_POS[0], "z": GATE_POS[1]},
            "spawn": {"x": SPAWN_POS[0], "z": SPAWN_POS[1], "yaw": 0.0},
            "street": {"half_width": STREET_HALF_W, "z_min": STREET_Z_MIN, "z_max": STREET_Z_MAX},
            "plaza": {"x": PLAZA_CENTER[0], "z": PLAZA_CENTER[1], "radius": PLAZA_RADIUS},
            "campfire": {"x": FIRE_POS[0], "z": FIRE_POS[1]},
            "cafe": {"x": CAFE_POS[0], "z": CAFE_POS[1], "rot_z_deg": 90, "door_world": {"x": CAFE_DOOR_WORLD[0], "z": CAFE_DOOR_WORLD[1]}},
            "broadcast": {"x": BROADCAST_POS[0], "z": BROADCAST_POS[1]},
            "river": {"base_z": RIVER_BASE_Z, "bridge_x": -3.2, "step_stones_x": 3.2},
            "bounds": {"minX": -14.2, "maxX": 14.2, "minZ": -15.4, "maxZ": 15.4},
        },
        "booth_anchors": booth_anchors,
        "static_colliders": colliders,
        "coordinate_contract": {
            "origin": "town center on ground",
            "north": "-Z (entrance gate side)",
            "up_axis_export": "+Y via glTF",
        },
        "export_excludes": ["HUB_TownPreviewOnly collection", "preview camera", "preview lights"],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({k: manifest[k] for k in ("schema_version", "name", "anchors", "layout")}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    build_scene()
