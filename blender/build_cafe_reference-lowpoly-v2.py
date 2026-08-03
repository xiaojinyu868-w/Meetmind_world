from __future__ import annotations

import json
import math
import random
import shutil
from pathlib import Path

import bpy
from mathutils import Vector


SEED = 26080302
random.seed(SEED)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
STEM = "echo_world_cafe_reference-lowpoly-v2"
BLEND_PATH = PROJECT_ROOT / "blender" / f"{STEM}.blend"
GLB_PATH = PROJECT_ROOT / "exports" / f"{STEM}.glb"
RUNTIME_GLB_PATH = PROJECT_ROOT / "public" / "models" / f"{STEM}.glb"
MANIFEST_PATH = PROJECT_ROOT / "exports" / f"{STEM}_manifest.json"
RENDER_PATH = PROJECT_ROOT / "renders" / f"{STEM}_preview.png"

ROOM_WIDTH = 12.0
ROOM_DEPTH = 10.0
WALL_HEIGHT = 3.4
TABLE_HEIGHT = 0.76
SEAT_HEIGHT = 0.46


def srgb(hex_value: str) -> tuple[float, float, float, float]:
    value = hex_value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


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
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission_strength > 0.0:
        for socket_name in ("Emission Color", "Emission"):
            socket = bsdf.inputs.get(socket_name)
            if socket is not None:
                socket.default_value = color
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
    rotation_z: float = 0.0,
    display_size: float = 0.12,
) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = display_size
    obj.location = location
    obj.rotation_euler.z = rotation_z
    if parent is not None:
        obj.parent = parent
    return obj


def add_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add()
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
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
    vertices: int = 8,
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
    vertices: int = 7,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
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


def add_tapered_prism(
    name: str,
    z_bottom: float,
    z_top: float,
    width_bottom: float,
    width_top: float,
    depth_bottom: float,
    depth_top: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    for z_value, width, depth in (
        (z_bottom, width_bottom, depth_bottom),
        (z_top, width_top, depth_top),
    ):
        vertices.extend(
            (
                (-width / 2, -depth / 2, z_value),
                (width / 2, -depth / 2, z_value),
                (width / 2, depth / 2, z_value),
                (-width / 2, depth / 2, z_value),
            )
        )
    faces = (
        (0, 3, 2, 1),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    )
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
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


def add_triangle_panel(
    name: str,
    points_xz: tuple[tuple[float, float], tuple[float, float], tuple[float, float]],
    y_value: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    vertices = [(x, y_value, z) for x, z in points_xz]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], [(0, 1, 2)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    set_flat(obj)
    obj.parent = parent
    return obj


def build_faceted_floor(
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    materials: list[bpy.types.Material],
) -> bpy.types.Object:
    x_steps = 6
    y_steps = 5
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int]] = []
    face_materials: list[int] = []
    for row in range(y_steps + 1):
        y_value = -ROOM_DEPTH / 2 + ROOM_DEPTH * row / y_steps
        for column in range(x_steps + 1):
            x_value = -ROOM_WIDTH / 2 + ROOM_WIDTH * column / x_steps
            if 0 < column < x_steps:
                x_value += 0.22 * math.sin(column * 1.9 + row * 0.7)
            if 0 < row < y_steps:
                y_value_local = y_value + 0.20 * math.cos(row * 1.6 + column * 0.9)
            else:
                y_value_local = y_value
            vertices.append((x_value, y_value_local, 0.0))
    for row in range(y_steps):
        for column in range(x_steps):
            a = row * (x_steps + 1) + column
            b = a + 1
            d = (row + 1) * (x_steps + 1) + column
            c = d + 1
            if (row + column) % 2:
                faces.extend(((a, b, d), (b, c, d)))
            else:
                faces.extend(((a, b, c), (a, c, d)))
            base_index = (column * 3 + row * 5) % len(materials)
            face_materials.extend((base_index, (base_index + 1 + row % 2) % len(materials)))
    mesh = bpy.data.meshes.new("GROUND_CafeFloor_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("GROUND_CafeFloor", mesh)
    collection.objects.link(obj)
    for material in materials:
        obj.data.materials.append(material)
    for polygon, material_index in zip(obj.data.polygons, face_materials):
        polygon.material_index = material_index
        polygon.use_smooth = False
    obj.parent = parent
    obj["collision"] = "walkable"
    obj["floor_top_z"] = 0.0
    return obj


def add_chair(
    name: str,
    location_xy: tuple[float, float],
    target_xy: tuple[float, float],
    seat_material: bpy.types.Material,
    accent_material: bpy.types.Material,
    wood_material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    x_value, y_value = location_xy
    dx = target_xy[0] - x_value
    dy = target_xy[1] - y_value
    rotation_z = math.atan2(dx, -dy)
    root = add_empty(
        name,
        collection,
        parent,
        (x_value, y_value, SEAT_HEIGHT),
        rotation_z,
        0.10,
    )
    root["anchor_kind"] = "sit"
    root["seat_height_m"] = SEAT_HEIGHT
    root["forward_local"] = "-Y"
    add_tapered_prism(
        f"GEO_{name}_Seat",
        -0.05,
        0.05,
        0.46,
        0.40,
        0.43,
        0.39,
        (0.0, 0.0, 0.0),
        seat_material,
        collection,
        root,
    )
    add_tapered_prism(
        f"GEO_{name}_Back",
        -0.22,
        0.22,
        0.43,
        0.34,
        0.085,
        0.055,
        (0.0, 0.205, 0.31),
        accent_material,
        collection,
        root,
        rotation=(math.radians(-6.0), 0.0, 0.0),
    )
    for index, (leg_x, leg_y) in enumerate(
        ((-0.16, -0.13), (0.16, -0.13), (-0.16, 0.13), (0.16, 0.13)),
        start=1,
    ):
        add_box(
            f"GEO_{name}_Leg_{index:02d}",
            (0.055, 0.055, 0.42),
            (leg_x, leg_y, -0.26),
            wood_material,
            collection,
            root,
            rotation=(math.radians((leg_y / 0.13) * 2.0), math.radians(-(leg_x / 0.16) * 2.0), 0.0),
        )
    return root


def add_round_table(
    name: str,
    center: tuple[float, float],
    radius: float,
    top_material: bpy.types.Material,
    edge_material: bpy.types.Material,
    base_material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    vertices: int,
) -> bpy.types.Object:
    root = add_empty(name, collection, parent, (center[0], center[1], 0.0), display_size=0.16)
    root["table_kind"] = "round"
    root["table_height_m"] = TABLE_HEIGHT
    add_cylinder(
        f"GEO_{name}_Top",
        radius,
        0.10,
        (0.0, 0.0, TABLE_HEIGHT - 0.05),
        top_material,
        collection,
        root,
        vertices=vertices,
    )
    add_cylinder(
        f"GEO_{name}_Edge",
        radius * 0.92,
        0.07,
        (0.0, 0.0, TABLE_HEIGHT - 0.105),
        edge_material,
        collection,
        root,
        vertices=vertices,
    )
    add_cone(
        f"GEO_{name}_Pedestal",
        0.24 if radius > 0.8 else 0.16,
        0.16 if radius > 0.8 else 0.11,
        0.64,
        (0.0, 0.0, 0.37),
        base_material,
        collection,
        root,
        vertices=7,
    )
    add_cylinder(
        f"GEO_{name}_Foot",
        0.47 if radius > 0.8 else 0.32,
        0.08,
        (0.0, 0.0, 0.05),
        base_material,
        collection,
        root,
        vertices=8,
    )
    return root


def add_rect_table(
    name: str,
    center: tuple[float, float],
    size: tuple[float, float],
    top_material: bpy.types.Material,
    edge_material: bpy.types.Material,
    base_material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    root = add_empty(name, collection, parent, (center[0], center[1], 0.0), display_size=0.15)
    root["table_kind"] = "rectangular"
    root["table_height_m"] = TABLE_HEIGHT
    add_tapered_prism(
        f"GEO_{name}_Top",
        -0.055,
        0.055,
        size[0],
        size[0] * 0.96,
        size[1],
        size[1] * 0.93,
        (0.0, 0.0, TABLE_HEIGHT - 0.055),
        top_material,
        collection,
        root,
    )
    add_box(
        f"GEO_{name}_Apron",
        (size[0] * 0.88, size[1] * 0.76, 0.11),
        (0.0, 0.0, TABLE_HEIGHT - 0.14),
        edge_material,
        collection,
        root,
    )
    leg_x = size[0] * 0.36
    leg_y = size[1] * 0.29
    for index, (x_value, y_value) in enumerate(
        ((-leg_x, -leg_y), (leg_x, -leg_y), (-leg_x, leg_y), (leg_x, leg_y)),
        start=1,
    ):
        add_box(
            f"GEO_{name}_Leg_{index:02d}",
            (0.09, 0.09, 0.66),
            (x_value, y_value, 0.36),
            base_material,
            collection,
            root,
        )
    return root


def add_room(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    add_box(
        "ARCH_CafeDioramaBase",
        (ROOM_WIDTH, ROOM_DEPTH, 0.46),
        (0.0, 0.0, -0.23),
        materials["earth"],
        collection,
        root,
    )
    build_faceted_floor(
        collection,
        root,
        [materials["grass"], materials["grass_light"], materials["grass_mid"], materials["mustard"]],
    )
    add_cylinder(
        "DECOR_CentralWoodIsland",
        1.95,
        0.035,
        (0.0, 0.0, 0.018),
        materials["wood_light"],
        collection,
        root,
        vertices=12,
    )
    add_cylinder(
        "DECOR_CentralIslandInset",
        1.70,
        0.012,
        (0.0, 0.0, 0.042),
        materials["mustard_dark"],
        collection,
        root,
        vertices=12,
    )

    # Hard-edged cutaway walls: no front or right wall, so gameplay cameras remain unobstructed.
    add_box(
        "ARCH_BackWall_Left",
        (9.45, 0.20, WALL_HEIGHT),
        (-1.275, 4.90, WALL_HEIGHT / 2),
        materials["cream"],
        collection,
        root,
    )
    add_box(
        "ARCH_BackWall_Right",
        (1.15, 0.20, WALL_HEIGHT),
        (5.425, 4.90, WALL_HEIGHT / 2),
        materials["cream"],
        collection,
        root,
    )
    add_box(
        "ARCH_EntranceHeader",
        (1.40, 0.20, 0.76),
        (4.45, 4.90, 3.02),
        materials["mustard"],
        collection,
        root,
    )
    add_box(
        "ARCH_LeftWall",
        (0.20, ROOM_DEPTH, WALL_HEIGHT),
        (-5.90, 0.0, WALL_HEIGHT / 2),
        materials["grass_dark"],
        collection,
        root,
    )
    add_box(
        "ARCH_BackWoodBand",
        (9.35, 0.05, 0.52),
        (-1.32, 4.785, 0.58),
        materials["wood"],
        collection,
        root,
    )
    add_box(
        "ARCH_LeftMustardBand",
        (0.05, ROOM_DEPTH - 0.2, 0.42),
        (-5.785, 0.0, 0.48),
        materials["mustard"],
        collection,
        root,
    )
    # Oversized triangular wall blocks carry the same readable faceting as the references.
    add_triangle_panel(
        "DECOR_BackFacet_01",
        ((-5.7, 0.72), (-3.7, 3.28), (-1.7, 0.72)),
        4.785,
        materials["mustard_soft"],
        collection,
        root,
    )
    add_triangle_panel(
        "DECOR_BackFacet_02",
        ((-1.6, 0.72), (0.6, 3.28), (2.8, 0.72)),
        4.782,
        materials["grass_soft"],
        collection,
        root,
    )


def add_tables_and_seats(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> dict[str, list[str]]:
    central = (0.0, 0.0)
    central_table = add_round_table(
        "TABLE_Central6",
        central,
        1.03,
        materials["mustard"],
        materials["wood"],
        materials["grass_dark"],
        collection,
        root,
        10,
    )
    central_table["capacity"] = 6
    central_table["role"] = "primary social table"
    interact = add_empty(
        "INTERACT_CentralTable",
        collection,
        central_table,
        (0.0, -1.18, 0.92),
        display_size=0.15,
    )
    interact["interaction"] = "open central table social scene"

    palette = (
        (materials["orange"], materials["mustard"]),
        (materials["grass"], materials["grass_light"]),
        (materials["blue"], materials["cream"]),
        (materials["mustard"], materials["orange"]),
        (materials["grass_light"], materials["grass"]),
        (materials["blue"], materials["mustard_soft"]),
    )
    central_seats: list[str] = []
    for index in range(6):
        angle = math.radians(90.0 - index * 60.0)
        position = (1.57 * math.cos(angle), 1.57 * math.sin(angle))
        name = f"SEAT_Central6_{index + 1:02d}"
        add_chair(
            name,
            position,
            central,
            palette[index][0],
            palette[index][1],
            materials["wood_dark"],
            collection,
            root,
        )
        central_seats.append(name)

    table_2_names: list[str] = []
    seat_2_names: list[str] = []
    for table_index, center in enumerate(((-3.65, 1.55), (-3.65, -1.55)), start=1):
        table_name = f"TABLE_2_{table_index:02d}"
        table = add_round_table(
            table_name,
            center,
            0.62,
            materials["wood_light"],
            materials["mustard_dark"],
            materials["wood_dark"],
            collection,
            root,
            8,
        )
        table["capacity"] = 2
        table_2_names.append(table_name)
        for seat_index, offset in enumerate((-0.88, 0.88), start=1):
            seat_name = f"SEAT_2_{table_index:02d}_{seat_index:02d}"
            add_chair(
                seat_name,
                (center[0] + offset, center[1]),
                center,
                materials["grass"] if table_index == 1 else materials["mustard"],
                materials["mustard"] if table_index == 1 else materials["orange"],
                materials["wood_dark"],
                collection,
                root,
            )
            seat_2_names.append(seat_name)

    table_4_names: list[str] = []
    seat_4_names: list[str] = []
    for table_index, center in enumerate(((3.28, 1.35), (3.28, -1.65)), start=1):
        table_name = f"TABLE_4_{table_index:02d}"
        table = add_rect_table(
            table_name,
            center,
            (1.48, 0.82),
            materials["wood_light"] if table_index == 1 else materials["mustard_soft"],
            materials["wood"],
            materials["grass_dark"],
            collection,
            root,
        )
        table["capacity"] = 4
        table_4_names.append(table_name)
        seat_index = 1
        for y_sign in (-1.0, 1.0):
            for x_offset in (-0.39, 0.39):
                seat_name = f"SEAT_4_{table_index:02d}_{seat_index:02d}"
                add_chair(
                    seat_name,
                    (center[0] + x_offset, center[1] + y_sign * 0.82),
                    center,
                    materials["blue"] if table_index == 1 else materials["grass"],
                    materials["mustard"] if table_index == 1 else materials["grass_light"],
                    materials["wood_dark"],
                    collection,
                    root,
                )
                seat_4_names.append(seat_name)
                seat_index += 1
    return {
        "central": central_seats,
        "table_2": table_2_names,
        "seat_2": seat_2_names,
        "table_4": table_4_names,
        "seat_4": seat_4_names,
    }


def add_window(
    index: int,
    x_value: float,
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    window = add_empty(f"FIXTURE_Window_{index:02d}", collection, root, (x_value, 4.77, 2.12))
    add_box(
        f"GEO_Window_{index:02d}_Sky",
        (1.48, 0.035, 1.32),
        (0.0, 0.0, 0.0),
        materials["blue_sky"],
        collection,
        window,
    )
    for frame_index, (dimensions, location) in enumerate(
        (
            ((1.62, 0.075, 0.09), (0.0, -0.025, 0.70)),
            ((1.62, 0.075, 0.09), (0.0, -0.025, -0.70)),
            ((0.09, 0.075, 1.49), (-0.765, -0.025, 0.0)),
            ((0.09, 0.075, 1.49), (0.765, -0.025, 0.0)),
            ((0.07, 0.075, 1.40), (0.0, -0.035, 0.0)),
        ),
        start=1,
    ):
        add_box(
            f"GEO_Window_{index:02d}_Frame_{frame_index:02d}",
            dimensions,
            location,
            materials["wood_dark"],
            collection,
            window,
        )


def add_architecture_details(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    add_window(1, -4.35, collection, root, materials)
    add_window(2, -2.45, collection, root, materials)

    entrance = add_empty("FIXTURE_Entrance", collection, root, (4.45, 4.76, 0.0))
    entrance["interaction"] = "portal"
    add_box(
        "GEO_Entrance_Door",
        (1.20, 0.06, 2.20),
        (0.0, 0.0, 1.10),
        materials["blue_sky"],
        collection,
        entrance,
    )
    add_box("GEO_Entrance_Frame_L", (0.11, 0.10, 2.48), (-0.66, 0.0, 1.24), materials["orange"], collection, entrance)
    add_box("GEO_Entrance_Frame_R", (0.11, 0.10, 2.48), (0.66, 0.0, 1.24), materials["orange"], collection, entrance)
    add_box("GEO_Entrance_Frame_T", (1.43, 0.10, 0.11), (0.0, 0.0, 2.43), materials["orange"], collection, entrance)
    add_box("GEO_Entrance_Handle", (0.05, 0.11, 0.40), (-0.40, -0.07, 1.12), materials["metal"], collection, entrance)
    add_box("DECOR_EntranceMat", (1.55, 0.75, 0.028), (0.0, -0.68, 0.02), materials["mustard"], collection, entrance)

    bar = add_empty("FIXTURE_CoffeeBar", collection, root, (1.60, 3.82, 0.0))
    add_tapered_prism(
        "GEO_CoffeeBar_Base",
        0.0,
        1.00,
        3.52,
        3.30,
        0.82,
        0.72,
        (0.0, 0.0, 0.0),
        materials["grass_dark"],
        collection,
        bar,
    )
    add_box("GEO_CoffeeBar_WoodPanel", (1.35, 0.05, 0.72), (-0.78, -0.40, 0.48), materials["wood"], collection, bar)
    add_triangle_panel(
        "GEO_CoffeeBar_MustardFacet",
        ((-0.10, 0.14), (1.35, 0.84), (1.35, 0.14)),
        -0.432,
        materials["mustard"],
        collection,
        bar,
    )
    add_box("GEO_CoffeeBar_Top", (3.80, 0.96, 0.12), (0.0, 0.0, 1.05), materials["wood_light"], collection, bar)

    machine = add_empty("FIXTURE_CoffeeMachine", collection, bar, (0.70, -0.02, 1.11))
    add_tapered_prism(
        "GEO_CoffeeMachine_Body",
        0.0,
        0.58,
        0.94,
        0.78,
        0.50,
        0.42,
        (0.0, 0.0, 0.0),
        materials["blue"],
        collection,
        machine,
    )
    add_box("GEO_CoffeeMachine_Face", (0.68, 0.04, 0.30), (0.0, -0.248, 0.30), materials["metal"], collection, machine)
    for index, x_value in enumerate((-0.22, 0.22), start=1):
        add_cylinder(
            f"GEO_CoffeeMachine_Group_{index:02d}",
            0.07,
            0.12,
            (x_value, -0.30, 0.23),
            materials["charcoal"],
            collection,
            machine,
            7,
            (math.radians(90.0), 0.0, 0.0),
        )
        add_box(
            f"GEO_CoffeeMachine_Handle_{index:02d}",
            (0.23, 0.045, 0.045),
            (x_value + 0.10, -0.34, 0.22),
            materials["charcoal"],
            collection,
            machine,
            rotation=(0.0, 0.0, math.radians(-8.0)),
        )
    for index, (x_value, color) in enumerate(
        ((-1.18, materials["cream"]), (-0.95, materials["orange"]), (-0.72, materials["mustard"])),
        start=1,
    ):
        add_cylinder(f"PROP_Cup_{index:02d}", 0.075, 0.13, (x_value, -0.10, 1.18), color, collection, bar, 7)

    menu = add_empty("FIXTURE_MenuBoard", collection, root, (1.15, 4.76, 2.45))
    add_box("GEO_MenuBoard", (2.35, 0.06, 0.88), (0.0, 0.0, 0.0), materials["charcoal"], collection, menu)
    for index, z_value in enumerate((0.25, 0.08, -0.09, -0.26), start=1):
        add_box(
            f"GEO_MenuLine_{index:02d}",
            (1.65 - 0.12 * (index % 2), 0.03, 0.04),
            (0.08, -0.05, z_value),
            materials["mustard_soft"],
            collection,
            menu,
        )
    add_cylinder("GEO_MenuBadge", 0.12, 0.03, (-0.90, -0.05, 0.25), materials["orange"], collection, menu, 8, (math.radians(90), 0, 0))


def add_pendant(
    name: str,
    position: tuple[float, float],
    shade_material: bpy.types.Material,
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    pendant = add_empty(name, collection, root, (position[0], position[1], 0.0))
    add_cylinder(f"GEO_{name}_Cord", 0.018, 0.54, (0.0, 0.0, 3.10), materials["charcoal"], collection, pendant, 6)
    add_cone(f"GEO_{name}_Shade", 0.30, 0.11, 0.30, (0.0, 0.0, 2.73), shade_material, collection, pendant, 7)
    add_ico(f"GEO_{name}_Bulb", (0.0, 0.0, 2.54), (0.085, 0.085, 0.10), materials["lamp"], collection, pendant)


def add_plant(
    name: str,
    position: tuple[float, float, float],
    pot_material: bpy.types.Material,
    scale: float,
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    plant = add_empty(name, collection, root, position)
    add_cone(f"GEO_{name}_Pot", 0.27 * scale, 0.32 * scale, 0.42 * scale, (0.0, 0.0, 0.21 * scale), pot_material, collection, plant, 7)
    add_cylinder(f"GEO_{name}_Stem", 0.045 * scale, 0.56 * scale, (0.0, 0.0, 0.69 * scale), materials["wood_dark"], collection, plant, 6)
    foliage = (
        (-0.14, 0.00, 0.82, 0.27, 0.16, 0.32),
        (0.15, 0.02, 0.92, 0.28, 0.15, 0.36),
        (-0.02, 0.08, 1.09, 0.32, 0.18, 0.40),
        (0.16, 0.04, 1.24, 0.24, 0.14, 0.34),
    )
    for index, values in enumerate(foliage, start=1):
        x_value, y_value, z_value, sx, sy, sz = values
        add_ico(
            f"GEO_{name}_Leaf_{index:02d}",
            (x_value * scale, y_value * scale, z_value * scale),
            (sx * scale, sy * scale, sz * scale),
            materials["grass_dark"] if index % 2 else materials["grass"],
            collection,
            plant,
        )


def add_grass_clusters(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: list[bpy.types.Material],
) -> None:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int]] = []
    material_indices: list[int] = []
    positions: list[tuple[float, float]] = []
    for _ in range(34):
        if random.random() < 0.55:
            positions.append((random.uniform(-5.55, 5.55), random.choice((-4.55, 4.45)) + random.uniform(-0.20, 0.20)))
        else:
            positions.append((random.choice((-5.48, 5.40)) + random.uniform(-0.18, 0.18), random.uniform(-4.2, 4.2)))
    for index, (x_value, y_value) in enumerate(positions):
        height = random.uniform(0.14, 0.32)
        width = random.uniform(0.07, 0.13)
        base = len(vertices)
        angle = random.uniform(0.0, math.pi)
        dx = math.cos(angle) * width
        dy = math.sin(angle) * width
        vertices.extend(
            (
                (x_value - dx, y_value - dy, 0.01),
                (x_value + dx, y_value + dy, 0.01),
                (x_value + random.uniform(-0.03, 0.03), y_value + random.uniform(-0.03, 0.03), height),
            )
        )
        faces.append((base, base + 1, base + 2))
        material_indices.append(index % len(materials))
    mesh = bpy.data.meshes.new("DECOR_GrassClusters_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("DECOR_GrassClusters", mesh)
    collection.objects.link(obj)
    for material in materials:
        obj.data.materials.append(material)
    for polygon, material_index in zip(obj.data.polygons, material_indices):
        polygon.material_index = material_index
        polygon.use_smooth = False
    obj.parent = root


def add_decor(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    add_pendant("FIXTURE_Pendant_Central", (0.0, 0.0), materials["mustard"], collection, root, materials)
    add_pendant("FIXTURE_Pendant_Left", (-3.65, 0.0), materials["grass"], collection, root, materials)
    add_pendant("FIXTURE_Pendant_Right", (3.28, -0.2), materials["orange"], collection, root, materials)
    add_plant("PROP_Plant_BackLeft", (-5.20, 4.12, 0.0), materials["orange"], 1.08, collection, root, materials)
    add_plant("PROP_Plant_FrontLeft", (-5.16, -4.08, 0.0), materials["mustard"], 0.92, collection, root, materials)
    add_plant("PROP_Plant_BackRight", (5.30, 3.92, 0.0), materials["wood_light"], 0.82, collection, root, materials)
    add_grass_clusters(collection, root, [materials["mustard"], materials["grass_light"], materials["grass_dark"]])

    art = add_empty("DECOR_WallTotem", collection, root, (-5.77, -1.55, 2.15))
    for index, (z_value, material, width) in enumerate(
        (
            (0.42, materials["orange"], 1.15),
            (0.05, materials["mustard"], 0.88),
            (-0.32, materials["blue"], 1.08),
        ),
        start=1,
    ):
        add_tapered_prism(
            f"GEO_WallTotem_{index:02d}",
            -0.14,
            0.14,
            0.045,
            0.045,
            width,
            width * 0.82,
            (0.0, 0.0, z_value),
            material,
            collection,
            art,
            rotation=(0.0, math.radians(90.0), 0.0),
        )


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection, focus: bpy.types.Object) -> None:
    world = bpy.data.worlds.new("PREVIEW_reference_lowpoly_v2_World")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#6C8790")
    background.inputs["Strength"].default_value = 0.19

    camera_data = bpy.data.cameras.new("PREVIEW_reference_lowpoly_v2_Camera")
    camera = bpy.data.objects.new("PREVIEW_reference_lowpoly_v2_Camera", camera_data)
    collection.objects.link(camera)
    camera.location = (10.6, -13.5, 9.7)
    camera_data.lens = 58.0
    camera_data.sensor_width = 36.0
    camera_data.dof.use_dof = True
    camera_data.dof.focus_object = focus
    camera_data.dof.aperture_fstop = 6.5
    look_at(camera, Vector((0.0, 0.25, 0.72)))
    bpy.context.scene.camera = camera

    sun_data = bpy.data.lights.new("PREVIEW_reference_lowpoly_v2_KeySun", type="SUN")
    sun_data.energy = 4.4
    sun_data.angle = math.radians(2.4)
    sun_data.color = srgb("#FFD064")[:3]
    sun = bpy.data.objects.new("PREVIEW_reference_lowpoly_v2_KeySun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(31.0), math.radians(-27.0), math.radians(-44.0))

    fill_data = bpy.data.lights.new("PREVIEW_reference_lowpoly_v2_Fill", type="AREA")
    fill_data.energy = 170.0
    fill_data.shape = "DISK"
    fill_data.size = 7.0
    fill_data.color = srgb("#BFD1C2")[:3]
    fill = bpy.data.objects.new("PREVIEW_reference_lowpoly_v2_Fill", fill_data)
    collection.objects.link(fill)
    fill.location = (-6.0, -6.5, 8.0)
    look_at(fill, Vector((0.0, 0.2, 0.5)))

    scene = bpy.context.scene
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = False
    scene.render.filepath = str(RENDER_PATH)
    scene.view_settings.view_transform = "AgX"
    for look in ("AgX - Medium High Contrast", "AgX - Very High Contrast", "Medium High Contrast"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = 0.05
    scene.view_settings.gamma = 1.0


def export_runtime(collection: bpy.types.Collection) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["ROOT_Cafe"]
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_animations=True,
        export_apply=True,
    )
    shutil.copy2(GLB_PATH, RUNTIME_GLB_PATH)


def build_scene() -> None:
    reset_scene()
    runtime = make_collection("CAFE_reference-lowpoly-v2_Runtime")
    preview = make_collection("CAFE_reference-lowpoly-v2_PreviewOnly")

    materials = {
        "grass_dark": make_material("MAT_V2_GrassDark", srgb("#294B2D")),
        "grass": make_material("MAT_V2_Grass", srgb("#568129")),
        "grass_mid": make_material("MAT_V2_GrassMid", srgb("#6F982D")),
        "grass_light": make_material("MAT_V2_GrassLight", srgb("#8DB43A")),
        "grass_soft": make_material("MAT_V2_GrassWallFacet", srgb("#71914B")),
        "mustard": make_material("MAT_V2_Mustard", srgb("#D7A51F")),
        "mustard_dark": make_material("MAT_V2_MustardDark", srgb("#9D701A")),
        "mustard_soft": make_material("MAT_V2_MustardWallFacet", srgb("#D7BD66")),
        "wood_dark": make_material("MAT_V2_WoodDark", srgb("#543522")),
        "wood": make_material("MAT_V2_Wood", srgb("#875026")),
        "wood_light": make_material("MAT_V2_WoodLight", srgb("#B9762C")),
        "orange": make_material("MAT_V2_Orange", srgb("#D85D2D")),
        "cream": make_material("MAT_V2_Cream", srgb("#EEE3B8")),
        "blue": make_material("MAT_V2_Blue", srgb("#315B68")),
        "blue_sky": make_material("MAT_V2_WindowBlue", srgb("#78AFC1"), roughness=0.48),
        "charcoal": make_material("MAT_V2_Charcoal", srgb("#26302D")),
        "metal": make_material("MAT_V2_Metal", srgb("#8C9590"), roughness=0.56, metallic=0.32),
        "earth": make_material("MAT_V2_DioramaEarth", srgb("#3D4930")),
        "lamp": make_material("MAT_V2_Lamp", srgb("#FFE078"), roughness=0.35, emission_strength=1.4),
    }

    root = add_empty("ROOT_Cafe", runtime, display_size=0.35)
    root["asset_type"] = "EchoWorld cafe reference-lowpoly-v2"
    root["style_source"] = "examples/scence pastoral low-poly diorama references"
    root["unit"] = "meter"
    root["character_reference_height_m"] = 1.65
    root["entry_side"] = "-Y"

    add_room(runtime, root, materials)
    anchors = add_tables_and_seats(runtime, root, materials)
    add_architecture_details(runtime, root, materials)
    add_decor(runtime, root, materials)
    spawn = add_empty("ANCHOR_PlayerSpawn", runtime, root, (0.0, -4.15, 0.0), display_size=0.22)
    spawn["anchor_kind"] = "player_spawn"
    spawn["forward_local"] = "+Y toward cafe interior"
    add_empty("ANCHOR_CameraFocus", runtime, root, (0.0, 0.15, 0.82), display_size=0.16)

    configure_preview(preview, bpy.data.objects["TABLE_Central6"])
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene["echo_world_style"] = "reference-lowpoly-v2 faceted pastoral cafe diorama"
    scene["echo_world_anchor_contract"] = "compatible with cafe v1"

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_runtime(runtime)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)

    manifest = {
        "name": "EchoWorld Cafe Reference Lowpoly V2",
        "version": "reference-lowpoly-v2",
        "seed": SEED,
        "style": "faceted pastoral diorama; grass green, mustard, wood; hard sunlight",
        "blend": str(BLEND_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "glb": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "runtime_glb": str(RUNTIME_GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "preview": str(RENDER_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "root": "ROOT_Cafe",
        "ground": "GROUND_CafeFloor",
        "spawn": "ANCHOR_PlayerSpawn",
        "central_table": "TABLE_Central6",
        "interaction": "INTERACT_CentralTable",
        "tables": {
            "central": ["TABLE_Central6"],
            "two_person": anchors["table_2"],
            "four_person": anchors["table_4"],
        },
        "seats": {
            "central": anchors["central"],
            "two_person": anchors["seat_2"],
            "four_person": anchors["seat_4"],
            "total": 18,
        },
        "contract": {
            "unit": "meter",
            "origin": "room center on finished floor",
            "room_m": [ROOM_WIDTH, ROOM_DEPTH, WALL_HEIGHT],
            "floor_top_z": 0.0,
            "seat_height_m": SEAT_HEIGHT,
            "table_height_m": TABLE_HEIGHT,
            "player_spawn_xyz": [0.0, -4.15, 0.0],
            "up_axis_export": "+Y via glTF",
            "anchor_layout": "identical to cafe v1",
        },
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    build_scene()
