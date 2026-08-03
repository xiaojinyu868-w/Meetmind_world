from __future__ import annotations

import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = PROJECT_ROOT / "blender" / "echo_world_storybook_cafe.blend"
GLB_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_storybook_cafe.glb"
RENDER_PATH = PROJECT_ROOT / "renders" / "echo_world_storybook_cafe_preview.png"
MANIFEST_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_storybook_cafe_manifest.json"

ROOM_WIDTH = 12.0
ROOM_DEPTH = 10.0
WALL_HEIGHT = 3.4
SEAT_HEIGHT = 0.46
TABLE_HEIGHT = 0.76
SEED = 26080303


def srgb(hex_value: str) -> tuple[float, float, float, float]:
    value = hex_value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) / 255.0 for index in (0, 2, 4)) + (1.0,)


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
    roughness: float = 0.86,
    metallic: float = 0.0,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
    alpha: float = 1.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color[:3], alpha)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        material.surface_render_method = "DITHERED"
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
    rotation_z: float = 0.0,
    display_size: float = 0.12,
) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = display_size
    if parent is not None:
        obj.parent = parent
    obj.location = location
    obj.rotation_euler.z = rotation_z
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
        modifier = obj.modifiers.new(name="StorybookBevel", type="BEVEL")
        # A bevel wider than half of a thin panel collapses its side faces and
        # exports degenerate glTF triangles. Clamp against the smallest axis.
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
    vertices: int = 12,
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
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
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
    obj.rotation_euler = rotation
    return obj


def add_cylinder_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    vertices: int = 8,
) -> bpy.types.Object:
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    obj = add_cylinder(
        name,
        radius,
        direction.length,
        tuple((start_vector + end_vector) * 0.5),
        material,
        collection,
        parent,
        vertices=vertices,
    )
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0.0, 0.0, 1.0)).rotation_difference(direction.normalized())
    obj.rotation_mode = "XYZ"
    return obj


def add_mesh(
    name: str,
    vertices: list[tuple[float, float, float]],
    faces: list[tuple[int, ...]],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object | None = None,
    location: tuple[float, float, float] = (0.0, 0.0, 0.0),
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
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


def add_arch_band(
    name: str,
    radius_outer: float,
    radius_inner: float,
    depth: float,
    base_z: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    location: tuple[float, float, float],
    rotation_z: float = 0.0,
    segments: int = 12,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    for y_value in (-depth * 0.5, depth * 0.5):
        for radius in (radius_outer, radius_inner):
            for index in range(segments + 1):
                angle = math.pi * index / segments
                vertices.append(
                    (radius * math.cos(angle), y_value, base_z + radius * math.sin(angle))
                )

    ring = segments + 1
    outer_front = 0
    inner_front = ring
    outer_back = ring * 2
    inner_back = ring * 3
    faces: list[tuple[int, ...]] = []
    for index in range(segments):
        next_index = index + 1
        faces.extend(
            [
                (
                    outer_front + index,
                    outer_front + next_index,
                    inner_front + next_index,
                    inner_front + index,
                ),
                (
                    outer_back + index,
                    inner_back + index,
                    inner_back + next_index,
                    outer_back + next_index,
                ),
                (
                    outer_front + index,
                    outer_back + index,
                    outer_back + next_index,
                    outer_front + next_index,
                ),
                (
                    inner_front + index,
                    inner_front + next_index,
                    inner_back + next_index,
                    inner_back + index,
                ),
            ]
        )
    faces.extend(
        [
            (outer_front, inner_front, inner_back, outer_back),
            (
                outer_front + segments,
                outer_back + segments,
                inner_back + segments,
                inner_front + segments,
            ),
        ]
    )
    return add_mesh(
        name,
        vertices,
        faces,
        material,
        collection,
        parent,
        location=location,
        rotation=(0.0, 0.0, rotation_z),
    )


def add_leaf(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    rotation: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    vertices = [
        (-1.0, 0.0, 0.0),
        (0.0, -0.34, 0.08),
        (1.0, 0.0, 0.0),
        (0.0, 0.34, 0.08),
        (0.0, 0.0, 0.28),
        (0.0, 0.0, -0.06),
    ]
    faces = [
        (0, 1, 4),
        (1, 2, 4),
        (2, 3, 4),
        (3, 0, 4),
        (1, 0, 5),
        (2, 1, 5),
        (3, 2, 5),
        (0, 3, 5),
    ]
    obj = add_mesh(name, vertices, faces, material, collection, parent, location, rotation)
    obj.scale = scale
    return obj


def add_flower(
    name: str,
    location: tuple[float, float, float],
    petal_material: bpy.types.Material,
    center_material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    scale: float = 1.0,
) -> None:
    for index in range(5):
        angle = math.tau * index / 5.0
        add_ico(
            f"{name}_Petal_{index + 1:02d}",
            (
                location[0] + math.cos(angle) * 0.075 * scale,
                location[1] + math.sin(angle) * 0.075 * scale,
                location[2],
            ),
            (0.075 * scale, 0.045 * scale, 0.035 * scale),
            petal_material,
            collection,
            parent,
        )
    add_ico(
        f"{name}_Center",
        location,
        (0.055 * scale, 0.055 * scale, 0.045 * scale),
        center_material,
        collection,
        parent,
    )


def add_grass_tuft(
    name: str,
    location: tuple[float, float, float],
    scale: float,
    materials: dict[str, bpy.types.Material],
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    seed: int,
) -> None:
    rng = random.Random(seed)
    tuft = add_empty(name, collection, parent, location=location, display_size=0.05)
    for index in range(7):
        angle = math.tau * index / 7.0 + rng.uniform(-0.25, 0.25)
        height = rng.uniform(0.28, 0.56) * scale
        spread = rng.uniform(0.08, 0.22) * scale
        end = (math.cos(angle) * spread, math.sin(angle) * spread, height)
        add_cylinder_between(
            f"GEO_{name}_Blade_{index + 1:02d}",
            (0.0, 0.0, 0.0),
            end,
            rng.uniform(0.012, 0.022) * scale,
            materials["leaf_light" if index % 3 == 0 else "leaf"],
            collection,
            tuft,
            vertices=5,
        )
        if index % 2 == 0:
            add_leaf(
                f"GEO_{name}_Leaf_{index + 1:02d}",
                (end[0] * 0.65, end[1] * 0.65, end[2] * 0.65),
                (0.09 * scale, 0.09 * scale, 0.08 * scale),
                (0.0, math.radians(24.0), angle),
                materials["leaf_gold" if index == 6 else "leaf_light"],
                collection,
                tuft,
            )


def add_potted_plant(
    name: str,
    location: tuple[float, float, float],
    scale: float,
    materials: dict[str, bpy.types.Material],
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    seed: int,
) -> bpy.types.Object:
    rng = random.Random(seed)
    root = add_empty(name, collection, parent, location=location, display_size=0.08)
    add_cone(
        f"GEO_{name}_Pot",
        0.23 * scale,
        0.18 * scale,
        0.34 * scale,
        (0.0, 0.0, 0.17 * scale),
        materials["terracotta"],
        collection,
        root,
        vertices=10,
    )
    add_cylinder(
        f"GEO_{name}_Soil",
        0.18 * scale,
        0.025 * scale,
        (0.0, 0.0, 0.335 * scale),
        materials["soil"],
        collection,
        root,
        vertices=10,
    )
    for index in range(7):
        angle = math.tau * index / 7.0 + rng.uniform(-0.18, 0.18)
        height = rng.uniform(0.50, 0.88) * scale
        end = (
            math.cos(angle) * rng.uniform(0.14, 0.30) * scale,
            math.sin(angle) * rng.uniform(0.14, 0.30) * scale,
            height,
        )
        add_cylinder_between(
            f"GEO_{name}_Stem_{index + 1:02d}",
            (0.0, 0.0, 0.32 * scale),
            end,
            0.018 * scale,
            materials["stem"],
            collection,
            root,
            vertices=6,
        )
        leaf_material = materials["leaf_light"] if index % 3 == 0 else materials["leaf"]
        add_leaf(
            f"GEO_{name}_Leaf_{index + 1:02d}",
            end,
            (0.21 * scale, 0.21 * scale, 0.21 * scale),
            (rng.uniform(-0.7, 0.7), rng.uniform(-0.5, 0.5), angle),
            leaf_material,
            collection,
            root,
        )
    return root


def add_storybook_tree(
    name: str,
    location: tuple[float, float, float],
    scale: float,
    materials: dict[str, bpy.types.Material],
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    seed: int,
) -> None:
    rng = random.Random(seed)
    root = add_empty(name, collection, parent, location=location, display_size=0.15)
    add_cone(
        f"GEO_{name}_Trunk",
        0.24 * scale,
        0.13 * scale,
        1.8 * scale,
        (0.0, 0.0, 0.9 * scale),
        materials["wood_bark"],
        collection,
        root,
        vertices=8,
    )
    crown_specs = [
        (-0.38, 0.02, 1.75, 0.72, "leaf_dark"),
        (0.28, 0.08, 1.88, 0.78, "leaf"),
        (0.02, -0.20, 2.18, 0.73, "leaf_light"),
        (0.45, -0.04, 2.34, 0.55, "leaf_gold"),
        (-0.45, -0.10, 2.36, 0.50, "leaf"),
    ]
    for index, (x, y, z, radius, material_key) in enumerate(crown_specs, start=1):
        jitter = rng.uniform(0.92, 1.08)
        add_ico(
            f"GEO_{name}_Crown_{index:02d}",
            (x * scale, y * scale, z * scale),
            (radius * scale * jitter, radius * scale, radius * scale * 0.82),
            materials[material_key],
            collection,
            root,
            subdivisions=1,
        )


def add_floor_and_shell(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    floor = add_box(
        "GROUND_CafeFloor",
        (ROOM_WIDTH, ROOM_DEPTH, 0.16),
        (0.0, 0.0, -0.08),
        materials["floor_honey"],
        collection,
        root,
    )
    floor["collision"] = "walkable"
    floor["floor_top_z"] = 0.0

    # Broad color bands suggest hand-painted floorboards without relying on textures.
    for index, y_value in enumerate((-4.1, -3.05, -2.0, -0.95, 0.95, 2.0, 3.05, 4.1), start=1):
        add_box(
            f"DECOR_PaintedFloorJoint_{index:02d}",
            (11.8, 0.028, 0.012),
            (0.0, y_value, 0.006),
            materials["wood_ink"],
            collection,
            root,
        )
    for index, x_value in enumerate((-4.7, -3.2, -1.7, 1.7, 3.2, 4.7), start=1):
        add_box(
            f"DECOR_PaintedFloorHighlight_{index:02d}",
            (0.035, 9.75, 0.009),
            (x_value, 0.0, 0.007),
            materials["floor_light"],
            collection,
            root,
        )

    # Irregular painted light pools keep the floor from reading as a uniform CAD surface.
    sun_patch_vertices = [
        (-1.55, -0.72, 0.0),
        (-0.75, -0.90, 0.0),
        (0.10, -0.72, 0.0),
        (0.55, -0.20, 0.0),
        (0.18, 0.28, 0.0),
        (-0.72, 0.40, 0.0),
        (-1.45, 0.18, 0.0),
    ]
    add_mesh(
        "DECOR_FloorSunPatch_Left",
        sun_patch_vertices,
        [(0, 1, 2, 3, 4, 5, 6)],
        materials["rug_gold"],
        collection,
        root,
        location=(-3.55, -2.85, 0.015),
        rotation=(0.0, 0.0, math.radians(-8.0)),
    )
    add_mesh(
        "DECOR_FloorSunPatch_Right",
        [(x * 0.78, y * 0.72, z) for x, y, z in sun_patch_vertices],
        [(0, 1, 2, 3, 4, 5, 6)],
        materials["rug_peach"],
        collection,
        root,
        location=(4.25, -3.25, 0.016),
        rotation=(0.0, 0.0, math.radians(16.0)),
    )

    add_cylinder(
        "DECOR_CentralMeadowRug_Base",
        1.91,
        0.024,
        (0.0, 0.0, 0.018),
        materials["rug_moss"],
        collection,
        root,
        vertices=24,
    )
    add_cylinder(
        "DECOR_CentralMeadowRug_Inner",
        1.55,
        0.012,
        (0.0, 0.0, 0.034),
        materials["rug_mint"],
        collection,
        root,
        vertices=24,
    )
    for index in range(12):
        angle = math.tau * index / 12.0
        add_leaf(
            f"DECOR_RugLeaf_{index + 1:02d}",
            (math.cos(angle) * 1.68, math.sin(angle) * 1.68, 0.045),
            (0.12, 0.12, 0.055),
            (0.0, 0.0, angle + math.pi * 0.5),
            materials["rug_gold"] if index % 3 == 0 else materials["rug_deep"],
            collection,
            root,
        )

    # Warm plaster half-walls keep the play area readable while the upper room stays open.
    add_box(
        "ARCH_BackWall_Base",
        (12.0, 0.22, 1.12),
        (0.0, 4.88, 0.56),
        materials["plaster_warm"],
        collection,
        root,
        bevel=0.035,
    )
    add_box(
        "ARCH_LeftWall_Base",
        (0.22, 10.0, 1.08),
        (-5.88, 0.0, 0.54),
        materials["plaster_sage"],
        collection,
        root,
        bevel=0.035,
    )
    add_box(
        "ARCH_RightWall_Base",
        (0.22, 10.0, 0.82),
        (5.88, 0.0, 0.41),
        materials["plaster_peach"],
        collection,
        root,
        bevel=0.035,
    )

    # Structural timber frame.
    for index, x_value in enumerate((-5.65, -3.55, -1.45, 0.65, 2.75, 4.85), start=1):
        add_box(
            f"ARCH_BackPost_{index:02d}",
            (0.20, 0.28, 3.32),
            (x_value, 4.78, 1.66),
            materials["wood_beam" if index % 2 else "wood_beam_light"],
            collection,
            root,
            bevel=0.025,
        )
    for index, y_value in enumerate((-4.72, -2.4, -0.05, 2.3, 4.72), start=1):
        add_box(
            f"ARCH_LeftPost_{index:02d}",
            (0.30, 0.20, 3.28),
            (-5.76, y_value, 1.64),
            materials["wood_beam"],
            collection,
            root,
            bevel=0.025,
        )
    add_box(
        "ARCH_BackTopBeam",
        (11.65, 0.34, 0.24),
        (0.0, 4.76, 3.19),
        materials["wood_beam"],
        collection,
        root,
        bevel=0.035,
    )
    add_box(
        "ARCH_LeftTopBeam",
        (0.34, 9.72, 0.24),
        (-5.75, 0.0, 3.17),
        materials["wood_beam"],
        collection,
        root,
        bevel=0.035,
    )
    for index, x_value in enumerate((-4.7, -2.35, 0.0, 2.35, 4.7), start=1):
        add_box(
            f"ARCH_CeilingRafter_{index:02d}",
            (0.16, 9.65, 0.18),
            (x_value, 0.0, 3.23 + (0.08 if index % 2 else 0.0)),
            materials["wood_beam_light"],
            collection,
            root,
            rotation=(0.0, math.radians(1.0 if index % 2 else -1.0), 0.0),
            bevel=0.025,
        )

    # A few fabric canopy panels create soft colored shadow shapes in the preview.
    for index, (x_value, color_key, tilt) in enumerate(
        ((-3.5, "canopy_gold", 2.0), (-1.18, "canopy_mint", -1.5), (1.18, "canopy_sky", 1.2), (3.5, "canopy_peach", -2.0)),
        start=1,
    ):
        add_box(
            f"ARCH_CanopyPanel_{index:02d}",
            (2.00, 2.28, 0.035),
            (x_value, 3.46, 3.04),
            materials[color_key],
            collection,
            root,
            rotation=(math.radians(tilt), 0.0, 0.0),
            bevel=0.08,
        )


def add_arch_windows_and_landscape(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    # Existing fixture names are preserved even though the visual language is now arched timberwork.
    window_centers = (-4.55, -2.45)
    for index, x_value in enumerate(window_centers, start=1):
        fixture = add_empty(
            f"FIXTURE_Window_{index:02d}",
            collection,
            root,
            location=(x_value, 4.73, 0.0),
        )
        add_box(
            f"GEO_Window_{index:02d}_Glass",
            (1.48, 0.035, 1.52),
            (0.0, 0.06, 1.86),
            materials["glass_sky"],
            collection,
            fixture,
            bevel=0.035,
        )
        add_box(
            f"GEO_Window_{index:02d}_Frame_L",
            (0.11, 0.13, 1.10),
            (-0.74, 0.0, 1.52),
            materials["wood_beam_light"],
            collection,
            fixture,
            bevel=0.025,
        )
        add_box(
            f"GEO_Window_{index:02d}_Frame_R",
            (0.11, 0.13, 1.10),
            (0.74, 0.0, 1.52),
            materials["wood_beam_light"],
            collection,
            fixture,
            bevel=0.025,
        )
        add_arch_band(
            f"GEO_Window_{index:02d}_Arch",
            0.80,
            0.67,
            0.13,
            2.05,
            materials["wood_beam_light"],
            collection,
            fixture,
            (0.0, 0.0, 0.0),
            segments=12,
        )
        add_box(
            f"GEO_Window_{index:02d}_Mullion",
            (0.055, 0.15, 1.37),
            (0.0, -0.01, 1.83),
            materials["wood_ink"],
            collection,
            fixture,
            bevel=0.012,
        )

    entrance = add_empty("FIXTURE_Entrance", collection, root, location=(4.42, -4.77, 0.0))
    entrance["interaction"] = "portal"
    add_box(
        "GEO_Entrance_Frame_L",
        (0.18, 0.20, 2.45),
        (-0.72, 0.0, 1.225),
        materials["wood_beam"],
        collection,
        entrance,
        bevel=0.035,
    )
    add_box(
        "GEO_Entrance_Frame_R",
        (0.18, 0.20, 2.45),
        (0.72, 0.0, 1.225),
        materials["wood_beam"],
        collection,
        entrance,
        bevel=0.035,
    )
    add_arch_band(
        "GEO_Entrance_Arch",
        0.82,
        0.64,
        0.22,
        2.25,
        materials["wood_beam"],
        collection,
        entrance,
        (0.0, 0.0, 0.0),
        segments=12,
    )
    add_box(
        "DECOR_EntranceWelcomeMat",
        (1.62, 0.76, 0.028),
        (0.0, 0.44, 0.017),
        materials["rug_peach"],
        collection,
        entrance,
        bevel=0.08,
    )

    # Layered low-poly landscape outside the windows, deliberately original and non-specific.
    landscape = add_empty("SCENERY_GardenBeyond", collection, root, location=(0.0, 0.0, 0.0))
    add_box(
        "SCENERY_MeadowGround",
        (14.5, 5.2, 0.18),
        (0.0, 7.40, -0.09),
        materials["meadow"],
        collection,
        landscape,
        bevel=0.04,
    )
    for index, (x_value, y_value, radius, color_key) in enumerate(
        [
            (-4.8, 5.65, 0.56, "leaf_light"),
            (-2.5, 6.2, 0.74, "leaf_gold"),
            (0.0, 5.75, 0.52, "leaf_light"),
            (2.65, 6.15, 0.68, "leaf_gold"),
            (4.85, 5.7, 0.58, "leaf_light"),
        ],
        start=1,
    ):
        add_cylinder(
            f"SCENERY_MeadowColorPatch_{index:02d}",
            radius,
            0.018,
            (x_value, y_value, 0.015),
            materials[color_key],
            collection,
            landscape,
            vertices=11,
        )
    for index, (x, y, z, scale, material_key) in enumerate(
        [
            (-5.1, 7.6, 1.1, (3.2, 1.2, 1.4), "hill_blue"),
            (-1.0, 8.4, 1.0, (4.0, 1.3, 1.7), "hill_mint"),
            (3.9, 7.9, 0.9, (3.4, 1.2, 1.45), "hill_gold"),
        ],
        start=1,
    ):
        add_ico(
            f"SCENERY_Hill_{index:02d}",
            (x, y, z),
            scale,
            materials[material_key],
            collection,
            landscape,
            subdivisions=2,
        )
    for index, (x, y, scale) in enumerate(
        [(-4.8, 6.05, 0.55), (-2.7, 6.6, 0.62), (-0.2, 6.2, 0.48), (2.2, 6.7, 0.58), (4.7, 6.15, 0.54)],
        start=1,
    ):
        add_storybook_tree(
            f"SCENERY_Tree_{index:02d}",
            (x, y, 0.0),
            scale,
            materials,
            collection,
            landscape,
            seed=SEED + index,
        )
    for index, (x, y, z, scale) in enumerate(
        [(-3.7, 8.8, 3.75, 0.75), (0.1, 9.1, 4.2, 0.62), (3.7, 8.4, 3.55, 0.68)],
        start=1,
    ):
        cloud = add_empty(f"SCENERY_Cloud_{index:02d}", collection, landscape, location=(x, y, z))
        for puff_index, offset in enumerate(((-0.48, 0.0, 0.0), (0.0, 0.0, 0.12), (0.48, 0.0, -0.02)), start=1):
            add_ico(
                f"SCENERY_Cloud_{index:02d}_Puff_{puff_index:02d}",
                offset,
                (0.60 * scale, 0.30 * scale, 0.34 * scale),
                materials["cloud"],
                collection,
                cloud,
                subdivisions=1,
            )


def add_chair(
    name: str,
    location_xy: tuple[float, float],
    target_xy: tuple[float, float],
    color_key: str,
    materials: dict[str, bpy.types.Material],
    collection: bpy.types.Collection,
    root: bpy.types.Object,
) -> bpy.types.Object:
    dx = target_xy[0] - location_xy[0]
    dy = target_xy[1] - location_xy[1]
    rotation_z = math.atan2(dx, -dy)
    chair = add_empty(
        name,
        collection,
        root,
        location=(location_xy[0], location_xy[1], SEAT_HEIGHT),
        rotation_z=rotation_z,
        display_size=0.10,
    )
    chair["anchor_kind"] = "sit"
    chair["seat_height_m"] = SEAT_HEIGHT
    chair["forward_local"] = "-Y"
    add_box(
        f"GEO_{name}_Seat",
        (0.48, 0.43, 0.09),
        (0.0, 0.0, 0.0),
        materials[color_key],
        collection,
        chair,
        bevel=0.055,
    )
    # Three separated slats read as a hand-built storybook chair in silhouette.
    for index, x_value in enumerate((-0.18, 0.0, 0.18), start=1):
        add_box(
            f"GEO_{name}_BackSlat_{index:02d}",
            (0.09, 0.065, 0.51 if index == 2 else 0.46),
            (x_value, 0.19, 0.29),
            materials[color_key if index == 2 else "wood_chair"],
            collection,
            chair,
            rotation=(math.radians(-6.0), 0.0, 0.0),
            bevel=0.025,
        )
    add_box(
        f"GEO_{name}_BackCrown",
        (0.49, 0.07, 0.095),
        (0.0, 0.17, 0.53),
        materials[color_key],
        collection,
        chair,
        rotation=(math.radians(-6.0), 0.0, 0.0),
        bevel=0.035,
    )
    for index, (x_value, y_value) in enumerate(
        ((-0.17, -0.14), (0.17, -0.14), (-0.17, 0.14), (0.17, 0.14)), start=1
    ):
        add_box(
            f"GEO_{name}_Leg_{index:02d}",
            (0.06, 0.06, 0.43),
            (x_value, y_value, -0.255),
            materials["wood_chair"],
            collection,
            chair,
            rotation=(math.radians(2.5 if y_value > 0 else -2.5), 0.0, math.radians(2.0 if x_value > 0 else -2.0)),
            bevel=0.012,
        )
    return chair


def add_round_table(
    name: str,
    center: tuple[float, float],
    radius: float,
    materials: dict[str, bpy.types.Material],
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    light_top: bool,
) -> bpy.types.Object:
    table = add_empty(name, collection, root, location=(center[0], center[1], 0.0), display_size=0.16)
    table["table_kind"] = "round"
    table["table_height_m"] = TABLE_HEIGHT
    add_cylinder(
        f"GEO_{name}_BarkEdge",
        radius,
        0.13,
        (0.0, 0.0, TABLE_HEIGHT - 0.065),
        materials["wood_bark"],
        collection,
        table,
        vertices=18,
    )
    add_cylinder(
        f"GEO_{name}_PaintedTop",
        radius * 0.94,
        0.035,
        (0.0, 0.0, TABLE_HEIGHT + 0.018),
        materials["table_light" if light_top else "table_mint"],
        collection,
        table,
        vertices=18,
    )
    add_cone(
        f"GEO_{name}_TrunkPedestal",
        0.31 if radius > 0.8 else 0.22,
        0.19 if radius > 0.8 else 0.14,
        0.63,
        (0.0, 0.0, 0.39),
        materials["wood_beam"],
        collection,
        table,
        vertices=9,
    )
    for index in range(4):
        angle = math.tau * index / 4.0
        add_cylinder_between(
            f"GEO_{name}_Root_{index + 1:02d}",
            (0.0, 0.0, 0.12),
            (math.cos(angle) * (0.42 if radius > 0.8 else 0.29), math.sin(angle) * (0.42 if radius > 0.8 else 0.29), 0.055),
            0.055 if radius > 0.8 else 0.04,
            materials["wood_beam"],
            collection,
            table,
            vertices=7,
        )
    return table


def add_rect_table(
    name: str,
    center: tuple[float, float],
    size: tuple[float, float],
    materials: dict[str, bpy.types.Material],
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    color_key: str,
) -> bpy.types.Object:
    table = add_empty(name, collection, root, location=(center[0], center[1], 0.0), display_size=0.15)
    table["table_kind"] = "rectangular"
    table["table_height_m"] = TABLE_HEIGHT
    add_box(
        f"GEO_{name}_BarkSlab",
        (size[0], size[1], 0.13),
        (0.0, 0.0, TABLE_HEIGHT - 0.065),
        materials["wood_bark"],
        collection,
        table,
        bevel=0.065,
    )
    add_box(
        f"GEO_{name}_PaintedInset",
        (size[0] - 0.10, size[1] - 0.10, 0.026),
        (0.0, 0.0, TABLE_HEIGHT + 0.012),
        materials[color_key],
        collection,
        table,
        bevel=0.055,
    )
    for index, (x_value, y_value) in enumerate(
        ((-size[0] * 0.37, -size[1] * 0.30), (size[0] * 0.37, -size[1] * 0.30), (-size[0] * 0.37, size[1] * 0.30), (size[0] * 0.37, size[1] * 0.30)),
        start=1,
    ):
        add_cone(
            f"GEO_{name}_Leg_{index:02d}",
            0.075,
            0.055,
            0.66,
            (x_value, y_value, 0.38),
            materials["wood_beam"],
            collection,
            table,
            vertices=7,
        )
    return table


def add_tables_and_seats(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> tuple[list[str], list[str], list[str], list[str], list[str]]:
    central = add_round_table("TABLE_Central6", (0.0, 0.0), 1.03, materials, collection, root, True)
    central["capacity"] = 6
    central["role"] = "primary social table"
    interaction = add_empty(
        "INTERACT_CentralTable",
        collection,
        central,
        location=(0.0, -1.18, 0.92),
        display_size=0.14,
    )
    interaction["interaction"] = "open central table social scene"

    # A small botanical centerpiece, kept low enough not to hide seated characters.
    add_cylinder(
        "DECOR_CentralTable_Pot",
        0.18,
        0.20,
        (0.0, 0.0, 0.88),
        materials["terracotta"],
        collection,
        central,
        vertices=10,
    )
    for index in range(5):
        angle = math.tau * index / 5.0
        add_leaf(
            f"DECOR_CentralTable_Leaf_{index + 1:02d}",
            (math.cos(angle) * 0.12, math.sin(angle) * 0.12, 1.07),
            (0.13, 0.13, 0.13),
            (0.0, math.radians(28.0), angle),
            materials["leaf_light" if index % 2 else "leaf"],
            collection,
            central,
        )

    central_seats: list[str] = []
    central_colors = ("chair_peach", "chair_sky", "chair_mint", "chair_gold", "chair_mint", "chair_sky")
    for index in range(6):
        angle = math.radians(90.0 - index * 60.0)
        location = (1.57 * math.cos(angle), 1.57 * math.sin(angle))
        name = f"SEAT_Central6_{index + 1:02d}"
        add_chair(name, location, (0.0, 0.0), central_colors[index], materials, collection, root)
        central_seats.append(name)

    table_2_names: list[str] = []
    seat_2_names: list[str] = []
    for table_index, center in enumerate(((-3.65, 1.55), (-3.65, -1.55)), start=1):
        table_name = f"TABLE_2_{table_index:02d}"
        table = add_round_table(table_name, center, 0.62, materials, collection, root, table_index == 2)
        table["capacity"] = 2
        table_2_names.append(table_name)
        for seat_index, x_offset in enumerate((-0.88, 0.88), start=1):
            seat_name = f"SEAT_2_{table_index:02d}_{seat_index:02d}"
            add_chair(
                seat_name,
                (center[0] + x_offset, center[1]),
                center,
                "chair_mint" if table_index == 1 else "chair_peach",
                materials,
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
            materials,
            collection,
            root,
            "table_sky" if table_index == 1 else "table_mint",
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
                    "chair_sky" if table_index == 1 else "chair_mint",
                    materials,
                    collection,
                    root,
                )
                seat_4_names.append(seat_name)
                seat_index += 1
    return central_seats, table_2_names, seat_2_names, table_4_names, seat_4_names


def add_bar_and_story_props(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    bar = add_empty("FIXTURE_CoffeeBar", collection, root, location=(1.60, 3.82, 0.0))
    add_box(
        "GEO_CoffeeBar_Base",
        (3.62, 0.86, 1.02),
        (0.0, 0.0, 0.51),
        materials["bar_sage"],
        collection,
        bar,
        bevel=0.07,
    )
    for index, x_value in enumerate((-1.20, -0.40, 0.40, 1.20), start=1):
        add_arch_band(
            f"GEO_CoffeeBar_PanelArch_{index:02d}",
            0.30,
            0.24,
            0.035,
            0.27,
            materials["bar_ink"],
            collection,
            bar,
            (x_value, -0.445, 0.0),
            segments=8,
        )
        add_box(
            f"GEO_CoffeeBar_PanelLegL_{index:02d}",
            (0.06, 0.035, 0.32),
            (x_value - 0.27, -0.445, 0.16),
            materials["bar_ink"],
            collection,
            bar,
        )
        add_box(
            f"GEO_CoffeeBar_PanelLegR_{index:02d}",
            (0.06, 0.035, 0.32),
            (x_value + 0.27, -0.445, 0.16),
            materials["bar_ink"],
            collection,
            bar,
        )
    add_box(
        "GEO_CoffeeBar_LiveEdgeTop",
        (3.88, 1.02, 0.14),
        (0.0, -0.02, 1.06),
        materials["wood_bark"],
        collection,
        bar,
        bevel=0.07,
    )
    add_box(
        "GEO_CoffeeBar_PaintedTop",
        (3.70, 0.90, 0.026),
        (0.0, -0.02, 1.145),
        materials["table_light"],
        collection,
        bar,
        bevel=0.055,
    )

    machine = add_empty("FIXTURE_CoffeeMachine", collection, bar, location=(0.80, -0.02, 1.16))
    add_box(
        "GEO_CoffeeMachine_Body",
        (0.86, 0.50, 0.58),
        (0.0, 0.0, 0.29),
        materials["machine_blue"],
        collection,
        machine,
        bevel=0.08,
    )
    add_arch_band(
        "GEO_CoffeeMachine_ArchFace",
        0.32,
        0.24,
        0.035,
        0.23,
        materials["metal_warm"],
        collection,
        machine,
        (0.0, -0.265, 0.0),
        segments=10,
    )
    for index, x_value in enumerate((-0.21, 0.21), start=1):
        add_cylinder(
            f"GEO_CoffeeMachine_Group_{index:02d}",
            0.065,
            0.13,
            (x_value, -0.30, 0.23),
            materials["wood_ink"],
            collection,
            machine,
            vertices=10,
            rotation=(math.radians(90.0), 0.0, 0.0),
        )

    board = add_empty("FIXTURE_MenuBoard", collection, root, location=(2.7, 4.62, 2.15))
    add_box(
        "GEO_MenuBoard_Frame",
        (2.05, 0.12, 1.18),
        (0.0, 0.0, 0.0),
        materials["wood_bark"],
        collection,
        board,
        bevel=0.07,
    )
    add_box(
        "GEO_MenuBoard_PaintedFace",
        (1.86, 0.025, 0.99),
        (0.0, -0.07, 0.0),
        materials["menu_green"],
        collection,
        board,
        bevel=0.035,
    )
    for index, (width, y_value) in enumerate(((1.36, 0.28), (1.52, 0.04), (1.12, -0.20)), start=1):
        add_box(
            f"DECOR_MenuBrushstroke_{index:02d}",
            (width, 0.018, 0.045),
            (0.0, -0.095, y_value),
            materials["chalk_cream"],
            collection,
            board,
            rotation=(0.0, 0.0, math.radians(1.8 if index % 2 else -1.5)),
            bevel=0.018,
        )

    # Curved-looking story shelf assembled from simple readable silhouettes.
    shelf = add_empty("FIXTURE_StoryShelf", collection, root, location=(4.90, 3.65, 0.0))
    add_box(
        "GEO_StoryShelf_Back",
        (1.32, 0.18, 2.32),
        (0.0, 0.0, 1.16),
        materials["plaster_peach"],
        collection,
        shelf,
        bevel=0.08,
    )
    for index, z_value in enumerate((0.38, 0.92, 1.46, 2.0), start=1):
        add_box(
            f"GEO_StoryShelf_Shelf_{index:02d}",
            (1.38, 0.34, 0.10),
            (0.0, -0.10, z_value),
            materials["wood_beam_light"],
            collection,
            shelf,
            bevel=0.035,
        )
        for book_index in range(4):
            color_key = ("book_blue", "book_coral", "book_gold", "book_green")[(index + book_index) % 4]
            height = 0.22 + 0.04 * ((index + book_index) % 3)
            add_box(
                f"DECOR_StoryShelf_Book_{index:02d}_{book_index + 1:02d}",
                (0.13, 0.17, height),
                (-0.43 + book_index * 0.27, -0.24, z_value + 0.05 + height * 0.5),
                materials[color_key],
                collection,
                shelf,
                rotation=(0.0, math.radians(0.0), math.radians((-4 + book_index * 2))),
                bevel=0.015,
            )


def add_lamps_plants_and_vines(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    lamp_specs = [
        ("FIXTURE_Pendant_Central", (0.0, 0.0, 2.55), 0.42),
        ("FIXTURE_Pendant_Left", (-3.65, 0.0, 2.50), 0.32),
        ("FIXTURE_Pendant_Right", (3.30, 0.0, 2.50), 0.32),
    ]
    for fixture_name, location, scale in lamp_specs:
        lamp = add_empty(fixture_name, collection, root, location=location, display_size=0.12)
        add_cylinder(
            f"GEO_{fixture_name}_Cord",
            0.018,
            0.55,
            (0.0, 0.0, 0.42),
            materials["wood_ink"],
            collection,
            lamp,
            vertices=6,
        )
        add_cone(
            f"GEO_{fixture_name}_PetalShade",
            scale,
            scale * 0.46,
            scale * 0.42,
            (0.0, 0.0, 0.04),
            materials["lamp_shade"],
            collection,
            lamp,
            vertices=10,
        )
        add_ico(
            f"GEO_{fixture_name}_Glow",
            (0.0, 0.0, -scale * 0.14),
            (scale * 0.25, scale * 0.25, scale * 0.22),
            materials["lamp_glow"],
            collection,
            lamp,
            subdivisions=1,
        )

    plant_specs = [
        ("DECOR_Plant_Entry", (5.15, -3.95, 0.0), 1.15),
        ("DECOR_Plant_WindowA", (-5.15, 3.7, 0.0), 1.18),
        ("DECOR_Plant_WindowB", (-5.10, 0.2, 0.0), 1.05),
        ("DECOR_Plant_Bar", (4.55, 2.65, 0.0), 0.86),
        ("DECOR_Plant_Front", (-5.0, -3.75, 0.0), 0.96),
    ]
    for index, (name, location, scale) in enumerate(plant_specs, start=1):
        add_potted_plant(name, location, scale, materials, collection, root, SEED + 80 + index)

    add_storybook_tree(
        "DECOR_IndoorStoryTree",
        (-5.22, 2.72, 0.0),
        0.82,
        materials,
        collection,
        root,
        seed=SEED + 106,
    )

    grass_points = [
        (-5.50, -3.55, 0.78),
        (-5.48, -2.55, 0.62),
        (-5.52, -0.90, 0.74),
        (-5.50, 1.10, 0.64),
        (-4.45, 4.53, 0.62),
        (-2.70, 4.54, 0.72),
        (-0.75, 4.55, 0.58),
        (4.90, 4.46, 0.66),
        (5.47, -3.30, 0.72),
    ]
    for index, (x_value, y_value, scale) in enumerate(grass_points, start=1):
        add_grass_tuft(
            f"DECOR_GrassTuft_{index:02d}",
            (x_value, y_value, 0.0),
            scale,
            materials,
            collection,
            root,
            seed=SEED + 140 + index,
        )

    # Bold wall leaves act like painted mural strokes and survive in standard glTF materials.
    for index, (y_value, z_value, scale, color_key) in enumerate(
        [(-2.6, 1.45, 0.44, "leaf_dark"), (-1.85, 1.78, 0.34, "leaf_light"), (0.85, 1.52, 0.42, "leaf"), (1.55, 1.83, 0.30, "leaf_gold")],
        start=1,
    ):
        add_leaf(
            f"DECOR_WallLeafMural_{index:02d}",
            (-5.72, y_value, z_value),
            (scale, scale, scale),
            (0.0, math.radians(90.0), math.radians(18.0 if index % 2 else -22.0)),
            materials[color_key],
            collection,
            root,
        )

    # Hanging vines follow the timber frame in a deliberately irregular rhythm.
    rng = random.Random(SEED + 120)
    for vine_index, x_value in enumerate((-5.0, -3.95, -2.75, -1.35, 0.3, 1.9, 3.45, 5.05), start=1):
        vine = add_empty(
            f"DECOR_HangingVine_{vine_index:02d}",
            collection,
            root,
            location=(x_value, 4.62, 3.14),
            display_size=0.06,
        )
        length = rng.uniform(0.55, 1.15)
        end_x = rng.uniform(-0.12, 0.12)
        add_cylinder_between(
            f"GEO_HangingVine_{vine_index:02d}_Stem",
            (0.0, 0.0, 0.0),
            (end_x, -0.05, -length),
            0.018,
            materials["stem"],
            collection,
            vine,
            vertices=6,
        )
        for leaf_index in range(4):
            t = (leaf_index + 1) / 5.0
            side = -1.0 if leaf_index % 2 else 1.0
            add_leaf(
                f"GEO_HangingVine_{vine_index:02d}_Leaf_{leaf_index + 1:02d}",
                (end_x * t + side * 0.05, -0.05, -length * t),
                (0.13, 0.13, 0.13),
                (0.0, math.radians(side * 18.0), math.radians(side * 30.0)),
                materials["leaf_light" if (vine_index + leaf_index) % 3 == 0 else "leaf"],
                collection,
                vine,
            )

    # Small flowers soften the room's edge and reinforce the hand-painted color rhythm.
    flower_points = [(-5.0, 3.67, 1.08), (-5.02, 0.18, 0.96), (5.12, -3.95, 1.05), (4.54, 2.66, 0.82)]
    for index, point in enumerate(flower_points, start=1):
        add_flower(
            f"DECOR_Flower_{index:02d}",
            point,
            materials["flower_coral" if index % 2 else "flower_blue"],
            materials["flower_gold"],
            collection,
            root,
            scale=0.9,
        )


def add_materials() -> dict[str, bpy.types.Material]:
    return {
        "floor_honey": make_material("MAT_Story_FloorHoney", srgb("#A9753F"), 0.92),
        "floor_light": make_material("MAT_Story_FloorSunwash", srgb("#C99654"), 0.94),
        "wood_ink": make_material("MAT_Story_WoodInk", srgb("#2F352F"), 0.94),
        "wood_beam": make_material("MAT_Story_WoodBeam", srgb("#59402F"), 0.91),
        "wood_beam_light": make_material("MAT_Story_WoodBeamLight", srgb("#805B3C"), 0.91),
        "wood_bark": make_material("MAT_Story_WoodBark", srgb("#453328"), 0.96),
        "wood_chair": make_material("MAT_Story_ChairWood", srgb("#544235"), 0.94),
        "plaster_warm": make_material("MAT_Story_PlasterWarm", srgb("#D7C596"), 0.98),
        "plaster_sage": make_material("MAT_Story_PlasterSage", srgb("#789372"), 0.98),
        "plaster_peach": make_material("MAT_Story_PlasterPeach", srgb("#C8785F"), 0.98),
        "rug_moss": make_material("MAT_Story_RugMoss", srgb("#385C4C"), 0.99),
        "rug_mint": make_material("MAT_Story_RugMint", srgb("#6F936F"), 0.99),
        "rug_deep": make_material("MAT_Story_RugDeep", srgb("#294E45"), 0.99),
        "rug_gold": make_material("MAT_Story_RugGold", srgb("#D29A37"), 0.99),
        "rug_peach": make_material("MAT_Story_RugPeach", srgb("#BD594A"), 0.99),
        "canopy_gold": make_material("MAT_Story_CanopyGold", srgb("#C59B4A"), 0.95),
        "canopy_mint": make_material("MAT_Story_CanopyMint", srgb("#71956F"), 0.95),
        "canopy_sky": make_material("MAT_Story_CanopySky", srgb("#5E91A0"), 0.95),
        "canopy_peach": make_material("MAT_Story_CanopyPeach", srgb("#C66B55"), 0.95),
        "glass_sky": make_material("MAT_Story_ArchSky", srgb("#75AEB8"), 0.54, alpha=0.48),
        "table_light": make_material("MAT_Story_TableCream", srgb("#D9C184"), 0.94),
        "table_mint": make_material("MAT_Story_TableMint", srgb("#62836A"), 0.94),
        "table_sky": make_material("MAT_Story_TableSky", srgb("#4D8292"), 0.94),
        "chair_peach": make_material("MAT_Story_ChairPeach", srgb("#BA5545"), 0.95),
        "chair_sky": make_material("MAT_Story_ChairSky", srgb("#41758B"), 0.95),
        "chair_mint": make_material("MAT_Story_ChairMint", srgb("#527657"), 0.95),
        "chair_gold": make_material("MAT_Story_ChairGold", srgb("#C28A31"), 0.95),
        "bar_sage": make_material("MAT_Story_BarSage", srgb("#587A5D"), 0.97),
        "bar_ink": make_material("MAT_Story_BarInk", srgb("#284F48"), 0.97),
        "machine_blue": make_material("MAT_Story_MachineBlue", srgb("#3E6D83"), 0.68, metallic=0.08),
        "metal_warm": make_material("MAT_Story_WarmMetal", srgb("#B9A58B"), 0.52, metallic=0.30),
        "menu_green": make_material("MAT_Story_MenuGreen", srgb("#22483F"), 0.98),
        "chalk_cream": make_material("MAT_Story_ChalkCream", srgb("#E8D7A9"), 1.0),
        "terracotta": make_material("MAT_Story_Terracotta", srgb("#A94F3E"), 0.98),
        "soil": make_material("MAT_Story_Soil", srgb("#332B25"), 1.0),
        "stem": make_material("MAT_Story_Stem", srgb("#2E5D44"), 0.98),
        "leaf_dark": make_material("MAT_Story_LeafDark", srgb("#214C3C"), 0.99),
        "leaf": make_material("MAT_Story_Leaf", srgb("#3E714B"), 0.99),
        "leaf_light": make_material("MAT_Story_LeafLight", srgb("#6A984D"), 0.99),
        "leaf_gold": make_material("MAT_Story_LeafGold", srgb("#9D9F3D"), 0.99),
        "flower_coral": make_material("MAT_Story_FlowerCoral", srgb("#D45C4D"), 0.96),
        "flower_blue": make_material("MAT_Story_FlowerBlue", srgb("#5F8DB1"), 0.96),
        "flower_gold": make_material("MAT_Story_FlowerGold", srgb("#E2AC38"), 0.96),
        "lamp_shade": make_material("MAT_Story_LampShade", srgb("#CB743C"), 0.82),
        "lamp_glow": make_material(
            "MAT_Story_LampGlow",
            srgb("#FFE4A0"),
            0.42,
            emission=srgb("#FFD17A"),
            emission_strength=2.2,
        ),
        "meadow": make_material("MAT_Story_Meadow", srgb("#496F43"), 1.0),
        "hill_blue": make_material("MAT_Story_HillBlue", srgb("#547F82"), 1.0),
        "hill_mint": make_material("MAT_Story_HillMint", srgb("#638C68"), 1.0),
        "hill_gold": make_material("MAT_Story_HillGold", srgb("#8B8B4D"), 1.0),
        "cloud": make_material("MAT_Story_Cloud", srgb("#DED9C5"), 1.0),
        "book_blue": make_material("MAT_Story_BookBlue", srgb("#456C86"), 0.98),
        "book_coral": make_material("MAT_Story_BookCoral", srgb("#AD4F45"), 0.98),
        "book_gold": make_material("MAT_Story_BookGold", srgb("#B9822F"), 0.98),
        "book_green": make_material("MAT_Story_BookGreen", srgb("#466A4A"), 0.98),
    }


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection) -> None:
    world = bpy.data.worlds.new("PREVIEW_StorybookWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#78AAB3")
    background.inputs["Strength"].default_value = 0.30
    bpy.context.scene.world = world

    camera_data = bpy.data.cameras.new("PREVIEW_StorybookCamera")
    camera = bpy.data.objects.new("PREVIEW_StorybookCamera", camera_data)
    collection.objects.link(camera)
    camera.location = (9.6, -15.8, 6.45)
    camera_data.lens = 50.0
    camera_data.sensor_width = 36.0
    look_at(camera, Vector((0.0, 0.60, 1.08)))
    bpy.context.scene.camera = camera

    sun_data = bpy.data.lights.new("PREVIEW_SoftSun", type="SUN")
    sun_data.energy = 2.65
    sun_data.angle = math.radians(12.0)
    sun_data.color = srgb("#FFD49A")[:3]
    sun = bpy.data.objects.new("PREVIEW_SoftSun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(28.0), math.radians(-20.0), math.radians(-38.0))

    area_data = bpy.data.lights.new("PREVIEW_WindowFill", type="AREA")
    area_data.energy = 620.0
    area_data.shape = "DISK"
    area_data.size = 7.0
    area = bpy.data.objects.new("PREVIEW_WindowFill", area_data)
    collection.objects.link(area)
    area.location = (-4.5, -5.5, 8.5)
    look_at(area, Vector((0.0, 0.0, 0.9)))

    warm_data = bpy.data.lights.new("PREVIEW_CafeWarmth", type="AREA")
    warm_data.energy = 430.0
    warm_data.shape = "DISK"
    warm_data.size = 4.0
    warm_data.color = srgb("#FFB96F")[:3]
    warm = bpy.data.objects.new("PREVIEW_CafeWarmth", warm_data)
    collection.objects.link(warm)
    warm.location = (2.5, 1.5, 5.2)
    look_at(warm, Vector((0.0, 0.0, 0.6)))

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
    scene.render.image_settings.color_management = "FOLLOW_SCENE"
    scene.view_settings.view_transform = "AgX"
    for look in ("AgX - Medium High Contrast", "AgX - Medium Low Contrast", "Medium High Contrast"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = -0.10
    scene.view_settings.gamma = 1.0

    # Older Eevee builds expose explicit GTAO settings. Blender 5 folds the
    # effect into Eevee's lighting path, so this branch is intentionally optional.
    eevee_settings = getattr(scene, "eevee", None)
    if eevee_settings is not None and hasattr(eevee_settings, "use_gtao"):
        eevee_settings.use_gtao = True
        eevee_settings.gtao_distance = 3.0
        eevee_settings.gtao_factor = 1.15


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
        export_animations=True,
        export_apply=True,
    )
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF export failed: {result}")


def build_scene() -> None:
    random.seed(SEED)
    reset_scene()
    runtime = make_collection("STORYBOOK_CafeRuntime")
    preview = make_collection("STORYBOOK_PreviewOnly")
    materials = add_materials()

    root = add_empty("ROOT_Cafe", runtime, display_size=0.35)
    root["asset_type"] = "EchoWorld original hand-painted fantasy cafe"
    root["style_version"] = "storybook-cafe-v3"
    root["unit"] = "meter"
    root["forward_entry_side"] = "-Y"
    root["character_reference_height_m"] = 1.65
    root["seed"] = SEED

    add_floor_and_shell(runtime, root, materials)
    add_arch_windows_and_landscape(runtime, root, materials)
    central_seats, table_2, seats_2, table_4, seats_4 = add_tables_and_seats(runtime, root, materials)
    add_bar_and_story_props(runtime, root, materials)
    add_lamps_plants_and_vines(runtime, root, materials)

    spawn = add_empty(
        "ANCHOR_PlayerSpawn",
        runtime,
        root,
        location=(0.0, -4.15, 0.0),
        display_size=0.22,
    )
    spawn["anchor_kind"] = "player_spawn"
    spawn["forward_local"] = "+Y toward cafe interior"
    add_empty(
        "ANCHOR_CameraFocus",
        runtime,
        root,
        location=(0.0, 0.15, 0.82),
        display_size=0.16,
    )

    configure_preview(preview)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene["echo_world_style"] = "original storybook fantasy cafe with painted color blocks and open timber greenhouse"
    scene["echo_world_asset"] = "version 3 cafe environment"

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_runtime(runtime)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    manifest = {
        "schema_version": "echo-storybook-cafe.v1",
        "name": "EchoWorld Storybook Fantasy Cafe",
        "style": "original warm hand-painted fantasy cafe; faceted silhouettes, layered plants, timber arches, no copied characters or locations",
        "generator": "blender/build_storybook_cafe.py",
        "seed": SEED,
        "blend": str(BLEND_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "glb": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "preview": str(RENDER_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "root_node": root.name,
        "ground_node": "GROUND_CafeFloor",
        "spawn_anchor": "ANCHOR_PlayerSpawn",
        "central_table": "TABLE_Central6",
        "central_interaction": "INTERACT_CentralTable",
        "tables": {
            "central_6": ["TABLE_Central6"],
            "two_person": table_2,
            "four_person": table_4,
        },
        "seats": {
            "central_6": central_seats,
            "two_person": seats_2,
            "four_person": seats_4,
            "total": len(central_seats) + len(seats_2) + len(seats_4),
            "seat_height_m": SEAT_HEIGHT,
            "seat_forward_axis": "local -Y toward associated table",
        },
        "scale_contract": {
            "unit": "meter",
            "room_width_m": ROOM_WIDTH,
            "room_depth_m": ROOM_DEPTH,
            "wall_height_m": WALL_HEIGHT,
            "table_height_m": TABLE_HEIGHT,
            "seat_height_m": SEAT_HEIGHT,
            "reference_character_height_m": 1.65,
            "floor_top_z": 0.0,
        },
        "coordinate_contract": {
            "origin": "room center on finished floor",
            "entry_side": "-Y",
            "up_axis_export": "+Y via glTF",
        },
        "export_excludes": ["STORYBOOK_PreviewOnly collection", "preview camera", "preview lights"],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    build_scene()
