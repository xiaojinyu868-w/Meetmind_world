from __future__ import annotations

import json
import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = PROJECT_ROOT / "blender" / "echo_world_market_street.blend"
GLB_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_market_street.glb"
RENDER_PATH = PROJECT_ROOT / "renders" / "echo_world_market_street_preview.png"
MANIFEST_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_market_street_manifest.json"

STREET_HALF_WIDTH = 3.0    # main passage x in [-3, 3]
STREET_HALF_LENGTH = 10.0  # glTF z in [-10, 10]; Blender Y = -z
SEED = 26080501


def srgb(hex_value: str) -> tuple[float, float, float, float]:
    # Palette hexes are display-referred sRGB; glTF baseColorFactor and
    # Blender node sockets are linear, so convert properly (three.js would
    # otherwise render the raw byte fractions washed out).
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
    bsdf.inputs["Roughness"].default_value = roughness
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
        modifier = obj.modifiers.new(name="MarketBevel", type="BEVEL")
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
    # Downward-pointing triangle in the local XZ plane, normal toward +Y.
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


def add_materials() -> dict[str, bpy.types.Material]:
    return {
        "earth": make_material("MAT_Market_Earth", srgb("#CBA77C"), 0.98),
        "grass_dark": make_material("MAT_Market_GrassDark", srgb("#7A9A5C"), 1.0),
        "grass_light": make_material("MAT_Market_GrassLight", srgb("#93B06A"), 1.0),
        "stone_a": make_material("MAT_Market_StoneA", srgb("#D8CFC0"), 0.97),
        "stone_b": make_material("MAT_Market_StoneB", srgb("#E4DCD0"), 0.97),
        "stone_c": make_material("MAT_Market_StoneC", srgb("#CFC4B2"), 0.97),
        "wood_log": make_material("MAT_Market_WoodLog", srgb("#B0895A"), 0.9),
        "wood_dark": make_material("MAT_Market_WoodDark", srgb("#7A5A3C"), 0.9),
        "wood_plank": make_material("MAT_Market_WoodPlank", srgb("#C49A6A"), 0.92),
        "awning_red": make_material("MAT_Market_AwningRed", srgb("#C95A4D"), 0.94),
        "awning_white": make_material("MAT_Market_AwningWhite", srgb("#F2EAD8"), 0.96),
        "tent_pink": make_material("MAT_Market_TentPink", srgb("#D97B7F"), 0.95),
        "tent_roof": make_material("MAT_Market_TentRoof", srgb("#C95A5E"), 0.95),
        "streamer": make_material("MAT_Market_Streamer", srgb("#EFC85A"), 0.9),
        "flag_mint": make_material("MAT_Market_FlagMint", srgb("#A8CBA8"), 0.95),
        "flag_yellow": make_material("MAT_Market_FlagYellow", srgb("#F0D98A"), 0.95),
        "flag_blue": make_material("MAT_Market_FlagBlue", srgb("#9AB8CC"), 0.95),
        "flag_coral": make_material("MAT_Market_FlagCoral", srgb("#E8A0A0"), 0.95),
        "flag_white": make_material("MAT_Market_FlagWhite", srgb("#F2EAD8"), 0.95),
        "cord": make_material("MAT_Market_Cord", srgb("#6B5640"), 0.92),
        "iron": make_material("MAT_Market_IronDark", srgb("#33302E"), 0.72, metallic=0.25),
        "lamp_glow": make_material(
            "MAT_Market_LampGlow",
            srgb("#FFD98A"),
            0.7,
            emission=srgb("#FFCF70"),
            emission_strength=3.2,
        ),
        "trunk": make_material("MAT_Market_Trunk", srgb("#8A6A48"), 0.95),
        "leaf_dark": make_material("MAT_Market_LeafDark", srgb("#4F6F4A"), 0.99),
        "leaf_mid": make_material("MAT_Market_LeafMid", srgb("#6E8F5E"), 0.99),
        "leaf_light": make_material("MAT_Market_LeafLight", srgb("#86A66C"), 0.99),
        "crate": make_material("MAT_Market_Crate", srgb("#B9935E"), 0.93),
        "barrel": make_material("MAT_Market_Barrel", srgb("#96703F"), 0.9),
        "sack": make_material("MAT_Market_Sack", srgb("#C4A97E"), 0.98),
        "basket": make_material("MAT_Market_Basket", srgb("#A87F4E"), 0.95),
        "bolt_blue": make_material("MAT_Market_BoltBlue", srgb("#7FA3C4"), 0.9),
        "bolt_green": make_material("MAT_Market_BoltGreen", srgb("#8FB87F"), 0.9),
        "bolt_yellow": make_material("MAT_Market_BoltYellow", srgb("#E8C96A"), 0.9),
        "bolt_pink": make_material("MAT_Market_BoltPink", srgb("#DDA0A8"), 0.9),
        "fruit_red": make_material("MAT_Market_FruitRed", srgb("#C2503E"), 0.85),
        "fruit_orange": make_material("MAT_Market_FruitOrange", srgb("#D88A3E"), 0.85),
        "fruit_green": make_material("MAT_Market_FruitGreen", srgb("#8FA64E"), 0.85),
        "door_glow": make_material(
            "MAT_Market_DoorGlow",
            srgb("#FFD9A0"),
            0.7,
            emission=srgb("#FFC978"),
            emission_strength=2.2,
        ),
    }


# ---------------------------------------------------------------- ground + path


def add_ground(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> None:
    add_box(
        "GROUND_MarketStreet",
        (22.0, 23.0, 0.12),
        (0.0, 0.0, -0.06),
        materials["earth"],
        collection,
        root,
        bevel=0.02,
    )
    # Grass verges under the stalls and trees.
    for side, x in (("L", -6.4), ("R", 6.4)):
        add_box(
            f"GROUND_Grass_{side}",
            (8.0, 22.6, 0.10),
            (x, 0.0, -0.045),
            materials["grass_dark"],
            collection,
            root,
            bevel=0.02,
        )


def add_stone_path(collection: bpy.types.Collection, root: bpy.types.Object, materials: dict) -> int:
    stones = [materials["stone_a"], materials["stone_b"], materials["stone_c"]]
    count = 0
    y = -9.6
    while y < 9.8:
        lane_x = -1.7
        while lane_x < 1.9:
            if random.random() < 0.82:
                radius = random.uniform(0.38, 0.72)
                count += 1
                add_cylinder(
                    f"STONE_{count:03d}",
                    radius,
                    random.uniform(0.03, 0.05),
                    (
                        lane_x + random.uniform(-0.25, 0.25),
                        y + random.uniform(-0.22, 0.22),
                        0.02,
                    ),
                    random.choice(stones),
                    collection,
                    root,
                    vertices=random.choice((5, 6, 7)),
                    rotation=(0.0, 0.0, random.uniform(0.0, math.pi)),
                )
            lane_x += random.uniform(0.85, 1.25)
        y += random.uniform(0.62, 0.85)
    # Grass tufts along the path edges and tucked between stones.
    tuft = 0
    for _ in range(46):
        tuft += 1
        if random.random() < 0.6:
            x = random.choice((-1.0, 1.0)) * random.uniform(1.7, 2.6)
        else:
            x = random.uniform(-1.8, 1.8)
        gy = random.uniform(-9.6, 9.6)
        height = random.uniform(0.12, 0.24)
        add_cone(
            f"GRASSTUFT_{tuft:02d}",
            random.uniform(0.05, 0.09),
            0.008,
            height,
            (x, gy, height / 2.0),
            random.choice((materials["grass_dark"], materials["grass_light"])),
            collection,
            root,
            vertices=5,
            rotation=(random.uniform(-0.12, 0.12), random.uniform(-0.12, 0.12), 0.0),
        )
    return count


# ------------------------------------------------------------------ stalls


def add_goods(
    prefix: str,
    base: tuple[float, float, float],
    materials: dict,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    seed_scale: float = 1.0,
) -> None:
    x0, y0, z0 = base
    # Basket with fruit.
    add_cone(
        f"{prefix}_Basket",
        0.20 * seed_scale,
        0.15 * seed_scale,
        0.18,
        (x0 - 0.55, y0, z0 + 0.09),
        materials["basket"],
        collection,
        parent,
        vertices=8,
    )
    fruit_mats = [materials["fruit_red"], materials["fruit_orange"], materials["fruit_green"]]
    for index in range(4):
        add_ico(
            f"{prefix}_Fruit_{index + 1}",
            (
                x0 - 0.55 + random.uniform(-0.08, 0.08),
                y0 + random.uniform(-0.06, 0.06),
                z0 + 0.20,
            ),
            (0.05, 0.05, 0.05),
            random.choice(fruit_mats),
            collection,
            parent,
        )
    # Slouchy sack and a pair of jars.
    add_ico(
        f"{prefix}_Sack",
        (x0 + 0.05, y0 + 0.02, z0 + 0.13),
        (0.16, 0.14, 0.15),
        materials["sack"],
        collection,
        parent,
    )
    for index, jx in enumerate((0.38, 0.60), start=1):
        add_cylinder(
            f"{prefix}_Jar_{index}",
            0.07,
            0.20,
            (x0 + jx, y0, z0 + 0.10),
            random.choice((materials["stone_c"], materials["bolt_blue"])),
            collection,
            parent,
            vertices=8,
        )


def add_stall(
    prefix: str,
    center: tuple[float, float],
    face_sign: float,
    materials: dict,
    collection: bpy.types.Collection,
    root: bpy.types.Object,
) -> None:
    # face_sign +1: stall on the left (-X) facing +X street; -1: right facing -X.
    cx, cy = center
    fixture = add_empty(
        f"ANCHOR_{prefix}",
        collection,
        root,
        location=(cx, cy, 0.0),
        display_size=0.25,
    )
    fixture["anchor_kind"] = "stall_base"
    fixture["facing"] = "+X" if face_sign > 0 else "-X"

    # Foundation deck.
    add_box(
        f"{prefix}_Deck",
        (2.6, 3.0, 0.14),
        (cx, cy, 0.07),
        materials["wood_plank"],
        collection,
        root,
        bevel=0.015,
    )
    # Log posts: street-side pair shorter, back pair taller (awning slope).
    post_r = 0.09
    sx = 1.05  # half width along the street
    depth = 1.15
    street_x = cx + face_sign * depth
    back_x = cx - face_sign * depth
    for label, px, pz_h in (
        ("StreetA", street_x, 2.15),
        ("BackA", back_x, 2.75),
    ):
        for side, py in (("S", cy - sx), ("N", cy + sx)):
            add_cylinder(
                f"{prefix}_Post_{label}_{side}",
                post_r,
                pz_h,
                (px, py, pz_h / 2.0),
                materials["wood_log"],
                collection,
                root,
                vertices=8,
            )
    # Counter facing the street.
    add_box(
        f"{prefix}_Counter",
        (0.62, 2.2, 0.08),
        (street_x - face_sign * 0.35, cy, 0.86),
        materials["wood_plank"],
        collection,
        root,
        bevel=0.015,
    )
    add_box(
        f"{prefix}_CounterFront",
        (0.06, 2.2, 0.72),
        (street_x - face_sign * 0.06, cy, 0.45),
        materials["wood_dark"],
        collection,
        root,
        bevel=0.01,
    )
    # Back plank wall.
    add_box(
        f"{prefix}_BackWall",
        (0.08, 2.3, 1.7),
        (back_x - face_sign * 0.05, cy, 0.85),
        materials["wood_dark"],
        collection,
        root,
        bevel=0.01,
    )
    # Awning slopes from the tall back posts down toward the street; stripes
    # run along the street axis so each panel rotates about Y.
    slope_len = 1.9
    angle = 24.0
    mid_x = (street_x + back_x) / 2.0
    top_z = 2.62
    mid_z = top_z - (slope_len / 2.0) * math.sin(math.radians(angle)) + 0.05
    stripe_w = 2.6 / 7
    theta = math.radians(angle)
    for index in range(7):
        offset = -2.6 / 2.0 + stripe_w * (index + 0.5)
        material = materials["awning_red"] if index % 2 == 0 else materials["awning_white"]
        add_box(
            f"{prefix}_Awning_Stripe_{index + 1:02d}",
            (slope_len, stripe_w + 0.012, 0.045),
            (mid_x, cy + offset, mid_z),
            material,
            collection,
            root,
            rotation=(0.0, face_sign * theta, 0.0),
            bevel=0.008,
        )
    front_x = mid_x + face_sign * (slope_len / 2.0) * math.cos(theta)
    front_z = mid_z - (slope_len / 2.0) * math.sin(theta)
    for index in range(7):
        offset = -2.6 / 2.0 + stripe_w * (index + 0.5)
        material = materials["awning_white"] if index % 2 == 0 else materials["awning_red"]
        add_triangle(
            f"{prefix}_Awning_Valance_{index + 1:02d}",
            stripe_w * 0.9,
            0.26,
            (front_x, cy + offset, front_z - 0.01),
            material,
            collection,
            root,
            rotation=(0.0, 0.0, math.radians(-90.0) if face_sign > 0 else math.radians(90.0)),
        )
    add_goods(
        prefix,
        (street_x - face_sign * 0.35, cy - 0.35, 0.90),
        materials,
        collection,
        root,
    )


# ------------------------------------------------------------------ pink tent


def add_pink_tent(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    cx, cy = 4.6, 6.6
    fixture = add_empty(
        "FIXTURE_PinkTent",
        collection,
        root,
        location=(cx, cy, 0.0),
        display_size=0.3,
    )
    fixture["anchor_kind"] = "landmark_tent"
    add_cylinder(
        "TENT_Wall",
        1.55,
        1.7,
        (cx, cy, 0.85),
        materials["tent_pink"],
        collection,
        root,
        vertices=10,
    )
    add_cone(
        "TENT_Roof",
        1.95,
        0.06,
        1.7,
        (cx, cy, 2.45),
        materials["tent_roof"],
        collection,
        root,
        vertices=10,
    )
    add_ico(
        "TENT_Finial",
        (cx, cy, 3.38),
        (0.12, 0.12, 0.16),
        materials["streamer"],
        collection,
        root,
    )
    # Entrance flap facing the street with a warm lantern glow inside.
    add_box(
        "TENT_DoorGlow",
        (0.62, 0.10, 0.9),
        (cx - 1.48, cy, 0.95),
        materials["door_glow"],
        collection,
        root,
        bevel=0.04,
    )
    # Yellow streamers hanging from the roof rim.
    for index in range(6):
        angle = math.radians(150 + index * 24)
        sx = cx + 1.78 * math.cos(angle)
        sy = cy + 1.78 * math.sin(angle)
        add_cone(
            f"TENT_Streamer_{index + 1}",
            0.055,
            0.012,
            random.uniform(0.55, 0.8),
            (sx, sy, 1.72),
            materials["streamer"],
            collection,
            root,
            vertices=5,
            rotation=(random.uniform(-0.15, 0.15), random.uniform(-0.15, 0.15), 0.0),
        )


# ------------------------------------------------------------------ bunting


def add_bunting(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> int:
    flag_mats = [
        materials["flag_mint"],
        materials["flag_yellow"],
        materials["flag_blue"],
        materials["flag_coral"],
        materials["flag_white"],
    ]
    total = 0
    lines = (
        (-6.2, 3.35, 0.55, 9.6),
        (-2.1, 3.15, 0.50, 9.2),
        (2.0, 3.30, 0.58, 9.6),
        (6.1, 3.10, 0.48, 8.8),
    )
    for line_index, (y, top_z, sag, span) in enumerate(lines, start=1):
        flags_per_line = 13
        # Sagging cord as thin segments between flag tops.
        prev = None
        for index in range(flags_per_line):
            t = index / (flags_per_line - 1)
            x = -span / 2.0 + t * span
            z = top_z - sag * math.sin(math.pi * t) + random.uniform(-0.03, 0.03)
            if prev is not None:
                mid = ((prev[0] + x) / 2.0, y, (prev[1] + z) / 2.0)
                seg_len = math.dist((prev[0], 0.0, prev[1]), (x, 0.0, z))
                tilt = math.atan2(z - prev[1], x - prev[0])
                add_box(
                    f"BUNTING_{line_index}_Cord_{index:02d}",
                    (seg_len, 0.016, 0.016),
                    mid,
                    materials["cord"],
                    collection,
                    root,
                    rotation=(0.0, -tilt, 0.0),
                )
            prev = (x, z)
            total += 1
            material = flag_mats[(index + line_index) % len(flag_mats)]
            if (index + line_index) % 3 == 2:
                add_triangle(
                    f"FLAG_{total:03d}",
                    0.22,
                    0.30,
                    (x, y, z - 0.02),
                    material,
                    collection,
                    root,
                    rotation=(random.uniform(-0.06, 0.06), 0.0, random.uniform(-0.08, 0.08)),
                )
            else:
                add_box(
                    f"FLAG_{total:03d}",
                    (0.20, 0.012, 0.26),
                    (x, y, z - 0.02 - 0.13),
                    material,
                    collection,
                    root,
                    rotation=(random.uniform(-0.05, 0.05), 0.0, random.uniform(-0.06, 0.06)),
                )
    return total


# ------------------------------------------------------------------ lamp posts


def add_lamp_posts(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    spots = ((-3.6, -5.2), (3.6, -1.4), (-3.6, 2.6), (3.6, 6.4))
    for index, (x, y) in enumerate(spots, start=1):
        fixture = add_empty(
            f"FIXTURE_LampPost_{index:02d}",
            collection,
            root,
            location=(x, y, 0.0),
            display_size=0.2,
        )
        fixture["anchor_kind"] = "lamp_post"
        add_cylinder(
            f"LAMP_{index:02d}_Pole",
            0.075,
            3.1,
            (x, y, 1.55),
            materials["wood_dark"],
            collection,
            root,
            vertices=8,
        )
        # Black iron lantern: cap pyramid, emissive glass body, base ring.
        add_cylinder(
            f"LAMP_{index:02d}_Glow",
            0.13,
            0.30,
            (x, y, 3.22),
            materials["lamp_glow"],
            collection,
            root,
            vertices=6,
        )
        add_cone(
            f"LAMP_{index:02d}_Cap",
            0.24,
            0.03,
            0.20,
            (x, y, 3.47),
            materials["iron"],
            collection,
            root,
            vertices=6,
        )
        add_cylinder(
            f"LAMP_{index:02d}_Base",
            0.17,
            0.05,
            (x, y, 3.045),
            materials["iron"],
            collection,
            root,
            vertices=6,
        )
        for bar in range(3):
            angle = math.radians(bar * 60.0)
            bx = x + 0.135 * math.cos(angle)
            by = y + 0.135 * math.sin(angle)
            add_box(
                f"LAMP_{index:02d}_Bar_{bar + 1}",
                (0.025, 0.025, 0.34),
                (bx, by, 3.22),
                materials["iron"],
                collection,
                root,
            )


# ------------------------------------------------------------------ trees


def add_trees(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> int:
    leaf_mats = [materials["leaf_dark"], materials["leaf_mid"], materials["leaf_light"]]
    spots = []
    for side in (-1, 1):
        y = -9.5
        while y < 10.5:
            spots.append((side * random.uniform(7.2, 9.6), y + random.uniform(-0.6, 0.6)))
            y += random.uniform(2.2, 3.1)
    # Two big trees framing the north portal.
    spots.extend(((-3.4, 11.2), (3.6, 11.4)))
    for index, (x, y) in enumerate(spots, start=1):
        height = random.uniform(3.2, 5.2)
        add_cylinder(
            f"TREE_{index:02d}_Trunk",
            random.uniform(0.14, 0.22),
            height,
            (x, y, height / 2.0),
            materials["trunk"],
            collection,
            root,
            vertices=7,
        )
        canopy_base = height * 0.75
        for blob in range(3):
            scale = random.uniform(0.9, 1.6) * (1.35 if blob == 0 else 1.0)
            add_ico(
                f"TREE_{index:02d}_Leaf_{blob + 1}",
                (
                    x + random.uniform(-0.7, 0.7),
                    y + random.uniform(-0.7, 0.7),
                    canopy_base + blob * random.uniform(0.6, 1.0),
                ),
                (scale, scale, scale * random.uniform(0.8, 1.0)),
                leaf_mats[blob % len(leaf_mats)] if blob else random.choice(leaf_mats),
                collection,
                root,
                subdivisions=random.choice((1, 2)),
            )
    return len(spots)


# ------------------------------------------------------------------ props


def add_props(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    bolt_mats = [materials["bolt_blue"], materials["bolt_green"], materials["bolt_yellow"], materials["bolt_pink"]]
    # A-frame fabric bolt rack, right-hand foreground like the reference.
    rx, ry = 3.7, -6.6
    add_empty("FIXTURE_FabricRack", collection, root, location=(rx, ry, 0.0), display_size=0.2)
    for side, dy in (("F", -0.55), ("B", 0.55)):
        add_box(
            f"RACK_Leg_{side}_L",
            (0.08, 0.08, 1.15),
            (rx - 0.75, ry + dy, 0.55),
            materials["wood_log"],
            collection,
            root,
            rotation=(math.radians(18 if dy < 0 else -18), 0.0, 0.0),
        )
        add_box(
            f"RACK_Leg_{side}_R",
            (0.08, 0.08, 1.15),
            (rx + 0.75, ry + dy, 0.55),
            materials["wood_log"],
            collection,
            root,
            rotation=(math.radians(18 if dy < 0 else -18), 0.0, 0.0),
        )
    for index in range(6):
        add_cylinder(
            f"RACK_Bolt_{index + 1:02d}",
            0.085,
            1.7,
            (rx + random.uniform(-0.06, 0.06), ry - 0.34 + index * 0.135, 0.42 + index * 0.11),
            bolt_mats[index % len(bolt_mats)],
            collection,
            root,
            vertices=9,
            rotation=(math.radians(62.0), 0.0, math.radians(90.0)),
        )
    # Crates, barrels and sacks tucked beside the stalls.
    crate_spots = ((-3.6, -7.6), (-4.9, 1.4), (4.4, -3.4), (3.9, 3.4))
    for index, (x, y) in enumerate(crate_spots, start=1):
        add_box(
            f"PROP_Crate_{index:02d}",
            (0.55, 0.55, 0.5),
            (x, y, 0.25),
            materials["crate"],
            collection,
            root,
            rotation=(0.0, 0.0, random.uniform(-0.15, 0.15)),
            bevel=0.02,
        )
        if index % 2 == 0:
            add_box(
                f"PROP_Crate_{index:02d}_Top",
                (0.42, 0.42, 0.36),
                (x + 0.05, y - 0.04, 0.68),
                materials["crate"],
                collection,
                root,
                rotation=(0.0, 0.0, random.uniform(-0.3, 0.3)),
                bevel=0.02,
            )
    barrel_spots = ((-4.6, -2.6), (4.8, 0.8))
    for index, (x, y) in enumerate(barrel_spots, start=1):
        add_cylinder(
            f"PROP_Barrel_{index:02d}",
            0.30,
            0.72,
            (x, y, 0.36),
            materials["barrel"],
            collection,
            root,
            vertices=10,
        )
        add_cylinder(
            f"PROP_Barrel_{index:02d}_Band",
            0.315,
            0.07,
            (x, y, 0.36),
            materials["iron"],
            collection,
            root,
            vertices=10,
        )
    sack_spots = ((-3.9, 6.9), (4.2, -7.8), (-4.4, 4.4))
    for index, (x, y) in enumerate(sack_spots, start=1):
        add_ico(
            f"PROP_Sack_{index:02d}",
            (x, y, 0.26),
            (0.30, 0.26, 0.28),
            materials["sack"],
            collection,
            root,
        )


# ------------------------------------------------------------------ cafe portal


def add_cafe_doorway(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    y = 10.4
    fixture = add_empty(
        "FIXTURE_CafeDoorway",
        collection,
        root,
        location=(0.0, y, 0.0),
        display_size=0.3,
    )
    fixture["anchor_kind"] = "portal_to_cafe"
    fixture["target_world"] = "cafe"
    fixture["opening_width_m"] = 2.2
    fixture["opening_height_m"] = 2.6
    for side, x in (("L", -1.24), ("R", 1.24)):
        add_cylinder(
            f"DOOR_Post_{side}",
            0.14,
            2.6,
            (x, y, 1.3),
            materials["wood_log"],
            collection,
            root,
            vertices=8,
        )
    add_box(
        "DOOR_Lintel",
        (3.0, 0.30, 0.26),
        (0.0, y, 2.73),
        materials["wood_dark"],
        collection,
        root,
        bevel=0.02,
    )
    add_box(
        "DOOR_GlowSign",
        (1.9, 0.10, 0.36),
        (0.0, y, 3.12),
        materials["door_glow"],
        collection,
        root,
        bevel=0.04,
    )
    add_box(
        "DOOR_Threshold",
        (2.2, 0.5, 0.04),
        (0.0, y, 0.02),
        materials["stone_c"],
        collection,
        root,
        bevel=0.01,
    )


# ------------------------------------------------------------------ preview


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection) -> None:
    world = bpy.data.worlds.new("PREVIEW_MarketWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#9CD2EA")
    background.inputs["Strength"].default_value = 0.30
    bpy.context.scene.world = world

    camera_data = bpy.data.cameras.new("PREVIEW_MarketCamera")
    camera = bpy.data.objects.new("PREVIEW_MarketCamera", camera_data)
    collection.objects.link(camera)
    # Street-level view from the south end, matching the reference framing.
    camera.location = (0.4, -13.6, 1.75)
    camera_data.lens = 30.0
    camera_data.sensor_width = 36.0
    look_at(camera, Vector((0.0, 3.0, 1.35)))
    bpy.context.scene.camera = camera

    sun_data = bpy.data.lights.new("PREVIEW_SoftSun", type="SUN")
    sun_data.energy = 2.2
    sun_data.angle = math.radians(10.0)
    sun_data.color = srgb("#FFE3B0")[:3]
    sun = bpy.data.objects.new("PREVIEW_SoftSun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(38.0), math.radians(-12.0), math.radians(-35.0))

    fill_data = bpy.data.lights.new("PREVIEW_StreetFill", type="AREA")
    fill_data.energy = 260.0
    fill_data.shape = "DISK"
    fill_data.size = 7.0
    fill_data.color = srgb("#CFE4F0")[:3]
    fill = bpy.data.objects.new("PREVIEW_StreetFill", fill_data)
    collection.objects.link(fill)
    fill.location = (4.0, -6.0, 8.0)
    look_at(fill, Vector((0.0, 0.0, 1.0)))

    scene = bpy.context.scene
    # Eevee needs a GPU/GL context that headless machines lack; default to
    # Cycles CPU and allow an explicit override.
    engine_override = os.environ.get("ECHO_RENDER_ENGINE")
    if engine_override:
        scene.render.engine = engine_override
    else:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 64
        scene.cycles.use_denoising = True
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
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
    bpy.context.view_layer.objects.active = bpy.data.objects["ROOT_MarketStreet"]
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
    runtime = make_collection("MARKET_StreetRuntime")
    preview = make_collection("MARKET_PreviewOnly")
    materials = add_materials()

    root = add_empty("ROOT_MarketStreet", runtime, display_size=0.35)
    root["asset_type"] = "EchoWorld open-air market street environment"
    root["style_version"] = "market-street-v1"
    root["unit"] = "meter"
    root["street_axis"] = "Y (glTF -Z from south spawn to north cafe portal)"
    root["character_reference_height_m"] = 1.65
    root["seed"] = SEED

    add_ground(runtime, root, materials)
    stone_count = add_stone_path(runtime, root, materials)
    add_stall("STALL_L1", (-4.3, -5.6), 1.0, materials, runtime, root)
    add_stall("STALL_L2", (-4.3, -0.6), 1.0, materials, runtime, root)
    add_stall("STALL_L3", (-4.3, 4.4), 1.0, materials, runtime, root)
    add_stall("STALL_R1", (4.3, -2.8), -1.0, materials, runtime, root)
    add_stall("STALL_R2", (4.3, 2.2), -1.0, materials, runtime, root)
    add_pink_tent(runtime, root, materials)
    flag_count = add_bunting(runtime, root, materials)
    add_lamp_posts(runtime, root, materials)
    tree_count = add_trees(runtime, root, materials)
    add_props(runtime, root, materials)
    add_cafe_doorway(runtime, root, materials)

    spawn = add_empty(
        "ANCHOR_PlayerSpawn",
        runtime,
        root,
        location=(0.0, -9.0, 0.0),
        display_size=0.22,
    )
    spawn["anchor_kind"] = "player_spawn"
    spawn["forward_local"] = "+Y toward street north (glTF -Z)"
    add_empty(
        "ANCHOR_CameraFocus",
        runtime,
        root,
        location=(0.0, 0.0, 1.2),
        display_size=0.16,
    )

    configure_preview(preview)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene["echo_world_style"] = "storybook open-air market street, warm low-poly matte"
    scene["echo_world_asset"] = "market street environment v1"

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_runtime(runtime)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    manifest = {
        "schema_version": "echo-market-street.v1",
        "name": "EchoWorld Open-air Market Street",
        "style": "storybook low-poly matte; stone path, striped awnings, bunting, pink tent",
        "generator": "blender/build_market_street.py",
        "seed": SEED,
        "blend": str(BLEND_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "glb": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "preview": str(RENDER_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "root_node": root.name,
        "ground_node": "GROUND_MarketStreet",
        "spawn_anchor": "ANCHOR_PlayerSpawn",
        "cafe_doorway": "FIXTURE_CafeDoorway",
        "features": {
            "path_stones": stone_count,
            "baked_stalls": ["STALL_L1", "STALL_L2", "STALL_L3", "STALL_R1", "STALL_R2"],
            "bunting_flags": flag_count,
            "lamp_posts": 4,
            "trees": tree_count,
            "pink_tent": "FIXTURE_PinkTent",
            "fabric_rack": "FIXTURE_FabricRack",
        },
        "scale_contract": {
            "unit": "meter",
            "street_passage_width_m": STREET_HALF_WIDTH * 2.0,
            "street_length_m": STREET_HALF_LENGTH * 2.0,
            "reference_character_height_m": 1.65,
            "ground_top_z": 0.0,
        },
        "coordinate_contract": {
            "origin": "street center on ground",
            "spawn": "south end, Blender (0, -9, 0) = glTF (0, 0, 9), facing glTF -Z",
            "cafe_portal": "north end, Blender y=10.4 = glTF z=-10.4",
            "up_axis_export": "+Y via glTF",
        },
        "export_excludes": ["MARKET_PreviewOnly collection", "preview camera", "preview lights"],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    build_scene()
