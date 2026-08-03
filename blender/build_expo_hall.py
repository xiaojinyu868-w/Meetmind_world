from __future__ import annotations

import json
import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = PROJECT_ROOT / "blender" / "echo_world_expo_hall.blend"
GLB_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_expo_hall.glb"
RENDER_PATH = PROJECT_ROOT / "renders" / "echo_world_expo_hall_preview.png"
MANIFEST_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_expo_hall_manifest.json"

HALL_WIDTH = 16.0   # X extent, meters
HALL_DEPTH = 12.0   # Y extent, meters
WALL_HEIGHT = 1.05  # low parapet walls, diorama style
COLUMN_HEIGHT = 3.35
DOOR_WIDTH = 2.0    # "to cafe" doorway opening, >= 1.2m accessibility contract
DOOR_HEIGHT = 2.6
SEED = 26080401


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
    roughness: float = 0.9,
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
        modifier = obj.modifiers.new(name="ExpoBevel", type="BEVEL")
        # Clamp against the smallest axis so thin panels keep valid side faces.
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
        "floor": make_material("MAT_Expo_Floor", srgb("#D9BE93"), 0.94),
        "floor_inlay": make_material("MAT_Expo_FloorInlay", srgb("#C49A6C"), 0.96),
        "wall": make_material("MAT_Expo_Wall", srgb("#E4D3B3"), 0.97),
        "wall_trim": make_material("MAT_Expo_WallTrim", srgb("#B98A5E"), 0.92),
        "column": make_material("MAT_Expo_Column", srgb("#C9A27A"), 0.93),
        "beam": make_material("MAT_Expo_Beam", srgb("#8F6B4A"), 0.88),
        "door_frame": make_material("MAT_Expo_DoorFrame", srgb("#7A5A3E"), 0.86),
        "door_glow": make_material(
            "MAT_Expo_DoorGlow",
            srgb("#FFD9A0"),
            0.7,
            emission=srgb("#FFC978"),
            emission_strength=2.0,
        ),
        "light_strip": make_material(
            "MAT_Expo_LightStrip",
            srgb("#FFE2AC"),
            0.7,
            emission=srgb("#FFD17A"),
            emission_strength=2.4,
        ),
        "string_light": make_material(
            "MAT_Expo_StringLight",
            srgb("#FFC46B"),
            0.7,
            emission=srgb("#FFB85C"),
            emission_strength=3.0,
        ),
        "string_cord": make_material("MAT_Expo_StringCord", srgb("#5C4A38"), 0.9),
        "pot": make_material("MAT_Expo_Pot", srgb("#A95F43"), 0.97),
        "soil": make_material("MAT_Expo_Soil", srgb("#3A2F26"), 1.0),
        "leaf": make_material("MAT_Expo_Leaf", srgb("#4C7A4E"), 0.99),
        "leaf_light": make_material("MAT_Expo_LeafLight", srgb("#6E9B52"), 0.99),
        "sign": make_material("MAT_Expo_Sign", srgb("#3F5F58"), 0.95),
    }


def add_floor_and_walls(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    half_w = HALL_WIDTH / 2.0
    half_d = HALL_DEPTH / 2.0

    # Floor slab: top surface exactly at Z=0 (finished floor contract).
    add_box(
        "GROUND_ExpoHallFloor",
        (HALL_WIDTH, HALL_DEPTH, 0.12),
        (0.0, 0.0, -0.06),
        materials["floor"],
        collection,
        root,
        bevel=0.02,
    )
    # Warm inlay marking the central promenade where booths will be placed.
    add_box(
        "FLOOR_Inlay",
        (HALL_WIDTH - 4.4, HALL_DEPTH - 4.0, 0.024),
        (0.0, 0.3, 0.012),
        materials["floor_inlay"],
        collection,
        root,
        bevel=0.02,
    )

    wall_t = 0.18
    wall_z = WALL_HEIGHT / 2.0
    # Back wall (+Y) and side walls are continuous.
    add_box(
        "WALL_Back",
        (HALL_WIDTH, wall_t, WALL_HEIGHT),
        (0.0, half_d - wall_t / 2.0, wall_z),
        materials["wall"],
        collection,
        root,
        bevel=0.02,
    )
    add_box(
        "WALL_Left",
        (wall_t, HALL_DEPTH - 2.0 * wall_t, WALL_HEIGHT),
        (-(half_w - wall_t / 2.0), 0.0, wall_z),
        materials["wall"],
        collection,
        root,
        bevel=0.02,
    )
    add_box(
        "WALL_Right",
        (wall_t, HALL_DEPTH - 2.0 * wall_t, WALL_HEIGHT),
        (half_w - wall_t / 2.0, 0.0, wall_z),
        materials["wall"],
        collection,
        root,
        bevel=0.02,
    )
    # Front wall (-Y) is split to leave the doorway opening to the cafe.
    segment = (HALL_WIDTH - DOOR_WIDTH) / 2.0
    add_box(
        "WALL_FrontLeft",
        (segment, wall_t, WALL_HEIGHT),
        (-(DOOR_WIDTH / 2.0 + segment / 2.0), -(half_d - wall_t / 2.0), wall_z),
        materials["wall"],
        collection,
        root,
        bevel=0.02,
    )
    add_box(
        "WALL_FrontRight",
        (segment, wall_t, WALL_HEIGHT),
        (DOOR_WIDTH / 2.0 + segment / 2.0, -(half_d - wall_t / 2.0), wall_z),
        materials["wall"],
        collection,
        root,
        bevel=0.02,
    )
    # Wooden cap trim on every wall segment.
    for name, dims, loc in (
        ("WALLTRIM_Back", (HALL_WIDTH, 0.24, 0.07), (0.0, half_d - wall_t / 2.0, WALL_HEIGHT + 0.035)),
        ("WALLTRIM_Left", (0.24, HALL_DEPTH - 2.0 * wall_t, 0.07), (-(half_w - wall_t / 2.0), 0.0, WALL_HEIGHT + 0.035)),
        ("WALLTRIM_Right", (0.24, HALL_DEPTH - 2.0 * wall_t, 0.07), (half_w - wall_t / 2.0, 0.0, WALL_HEIGHT + 0.035)),
        ("WALLTRIM_FrontLeft", (segment, 0.24, 0.07), (-(DOOR_WIDTH / 2.0 + segment / 2.0), -(half_d - wall_t / 2.0), WALL_HEIGHT + 0.035)),
        ("WALLTRIM_FrontRight", (segment, 0.24, 0.07), (DOOR_WIDTH / 2.0 + segment / 2.0, -(half_d - wall_t / 2.0), WALL_HEIGHT + 0.035)),
    ):
        add_box(name, dims, loc, materials["wall_trim"], collection, root, bevel=0.015)


def add_doorway(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    half_d = HALL_DEPTH / 2.0
    fixture = add_empty(
        "FIXTURE_CafeDoorway",
        collection,
        root,
        location=(0.0, -half_d, 0.0),
        display_size=0.3,
    )
    fixture["anchor_kind"] = "portal_to_cafe"
    fixture["target_world"] = "cafe"
    fixture["opening_width_m"] = DOOR_WIDTH
    fixture["opening_height_m"] = DOOR_HEIGHT

    post_w = 0.26
    for side, x in (("L", -(DOOR_WIDTH / 2.0 + post_w / 2.0)), ("R", DOOR_WIDTH / 2.0 + post_w / 2.0)):
        add_box(
            f"DOOR_Post_{side}",
            (post_w, 0.34, DOOR_HEIGHT),
            (x, -half_d, DOOR_HEIGHT / 2.0),
            materials["door_frame"],
            collection,
            root,
            bevel=0.02,
        )
    add_box(
        "DOOR_Lintel",
        (DOOR_WIDTH + 2.0 * post_w + 0.15, 0.38, 0.30),
        (0.0, -half_d, DOOR_HEIGHT + 0.15),
        materials["door_frame"],
        collection,
        root,
        bevel=0.02,
    )
    # Warm glow panel above the lintel: reads as "the cafe is that way".
    add_box(
        "DOOR_GlowSign",
        (DOOR_WIDTH - 0.2, 0.10, 0.34),
        (0.0, -half_d, DOOR_HEIGHT + 0.52),
        materials["door_glow"],
        collection,
        root,
        bevel=0.03,
    )
    # Threshold strip on the floor.
    add_box(
        "DOOR_Threshold",
        (DOOR_WIDTH, 0.42, 0.03),
        (0.0, -half_d, 0.015),
        materials["door_frame"],
        collection,
        root,
        bevel=0.01,
    )


def add_columns_and_beams(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> list[tuple[float, float]]:
    half_w = HALL_WIDTH / 2.0 - 0.45
    half_d = HALL_DEPTH / 2.0 - 0.45
    positions = [
        (-half_w, -half_d), (half_w, -half_d),
        (-half_w, half_d), (half_w, half_d),
        (-half_w, 0.0), (half_w, 0.0),
        (-3.4, half_d), (3.4, half_d),
    ]
    size = 0.34
    for index, (x, y) in enumerate(positions, start=1):
        add_box(
            f"COLUMN_{index:02d}",
            (size, size, COLUMN_HEIGHT),
            (x, y, COLUMN_HEIGHT / 2.0),
            materials["column"],
            collection,
            root,
            bevel=0.025,
        )
        add_box(
            f"COLUMNCAP_{index:02d}",
            (size + 0.14, size + 0.14, 0.12),
            (x, y, COLUMN_HEIGHT - 0.06),
            materials["beam"],
            collection,
            root,
            bevel=0.015,
        )

    beam_z = COLUMN_HEIGHT + 0.10
    for name, dims, loc in (
        ("BEAM_Back", (HALL_WIDTH - 0.6, 0.20, 0.20), (0.0, half_d, beam_z)),
        ("BEAM_Front", (HALL_WIDTH - 0.6, 0.20, 0.20), (0.0, -half_d, beam_z)),
        ("BEAM_Left", (0.20, HALL_DEPTH - 0.6, 0.20), (-half_w, 0.0, beam_z)),
        ("BEAM_Right", (0.20, HALL_DEPTH - 0.6, 0.20), (half_w, 0.0, beam_z)),
    ):
        add_box(name, dims, loc, materials["beam"], collection, root, bevel=0.02)
    return positions


def add_light_strips(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    strip_z = 3.02
    for index, y in enumerate((-3.1, 0.0, 3.1), start=1):
        add_box(
            f"LIGHTSTRIP_{index:02d}",
            (11.0, 0.20, 0.10),
            (0.0, y, strip_z),
            materials["light_strip"],
            collection,
            root,
            bevel=0.02,
        )
        for x in (-4.5, 0.0, 4.5):
            add_cylinder(
                f"LIGHTSTRIP_Rod_{index:02d}_{int((x + 4.5) / 4.5)}",
                0.022,
                0.42,
                (x, y, strip_z + 0.26),
                materials["string_cord"],
                collection,
                root,
                vertices=6,
            )


def add_string_lights(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    # Two sagging runs of warm bulbs between corner columns along both sides.
    half_w = HALL_WIDTH / 2.0 - 0.45
    half_d = HALL_DEPTH / 2.0 - 0.45
    bulbs_per_run = 11
    for side, x in (("L", -half_w), ("R", half_w)):
        for index in range(bulbs_per_run):
            t = index / (bulbs_per_run - 1)
            y = -half_d + t * (2.0 * half_d)
            sag = math.sin(t * math.pi) * 0.42
            jitter = random.uniform(-0.012, 0.012)
            add_ico(
                f"STRING_{side}_{index + 1:02d}",
                (x, y, COLUMN_HEIGHT - 0.22 - sag + jitter),
                (0.045, 0.045, 0.055),
                materials["string_light"],
                collection,
                root,
            )


def add_plants(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    spots = [
        (-1.75, -5.25), (1.75, -5.25),       # flanking the doorway inside
        (-7.2, 5.2), (7.2, 5.2),             # back corners
        (-7.2, -2.6), (7.2, 2.6),            # side accents
    ]
    for index, (x, y) in enumerate(spots, start=1):
        add_cylinder(
            f"POT_{index:02d}",
            0.21,
            0.30,
            (x, y, 0.15),
            materials["pot"],
            collection,
            root,
            vertices=10,
        )
        add_cylinder(
            f"SOIL_{index:02d}",
            0.17,
            0.03,
            (x, y, 0.30),
            materials["soil"],
            collection,
            root,
            vertices=10,
        )
        spread = random.uniform(0.85, 1.1)
        add_ico(
            f"LEAF_{index:02d}_A",
            (x, y, 0.62 * spread),
            (0.30 * spread, 0.30 * spread, 0.34 * spread),
            materials["leaf"],
            collection,
            root,
        )
        offset = random.uniform(0.10, 0.16)
        add_ico(
            f"LEAF_{index:02d}_B",
            (x + offset, y - offset * 0.5, 0.86 * spread),
            (0.20 * spread, 0.20 * spread, 0.24 * spread),
            materials["leaf_light"],
            collection,
            root,
        )


def add_welcome_sign(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    # Small hanging sign just inside the entrance.
    add_box(
        "SIGN_Hall",
        (1.7, 0.08, 0.46),
        (0.0, -4.9, 2.42),
        materials["sign"],
        collection,
        root,
        bevel=0.03,
    )
    for x in (-0.7, 0.7):
        add_cylinder(
            f"SIGN_Hall_Rod_{'L' if x < 0 else 'R'}",
            0.018,
            0.7,
            (x, -4.9, 2.95),
            materials["string_cord"],
            collection,
            root,
            vertices=6,
        )


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection) -> None:
    world = bpy.data.worlds.new("PREVIEW_ExpoWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#7E96A0")
    background.inputs["Strength"].default_value = 0.30
    bpy.context.scene.world = world

    camera_data = bpy.data.cameras.new("PREVIEW_ExpoCamera")
    camera = bpy.data.objects.new("PREVIEW_ExpoCamera", camera_data)
    collection.objects.link(camera)
    camera.location = (11.5, -14.5, 7.6)
    camera_data.lens = 46.0
    camera_data.sensor_width = 36.0
    look_at(camera, Vector((0.0, 0.4, 0.9)))
    bpy.context.scene.camera = camera

    sun_data = bpy.data.lights.new("PREVIEW_SoftSun", type="SUN")
    sun_data.energy = 2.4
    sun_data.angle = math.radians(14.0)
    sun_data.color = srgb("#FFD49A")[:3]
    sun = bpy.data.objects.new("PREVIEW_SoftSun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(30.0), math.radians(-18.0), math.radians(-32.0))

    fill_data = bpy.data.lights.new("PREVIEW_HallFill", type="AREA")
    fill_data.energy = 700.0
    fill_data.shape = "DISK"
    fill_data.size = 8.0
    fill = bpy.data.objects.new("PREVIEW_HallFill", fill_data)
    collection.objects.link(fill)
    fill.location = (-4.0, -3.0, 8.5)
    look_at(fill, Vector((0.0, 0.0, 0.6)))

    warm_data = bpy.data.lights.new("PREVIEW_HallWarmth", type="AREA")
    warm_data.energy = 520.0
    warm_data.shape = "DISK"
    warm_data.size = 5.0
    warm_data.color = srgb("#FFB96F")[:3]
    warm = bpy.data.objects.new("PREVIEW_HallWarmth", warm_data)
    collection.objects.link(warm)
    warm.location = (3.0, 2.5, 5.4)
    look_at(warm, Vector((0.0, 0.0, 0.6)))

    scene = bpy.context.scene
    # Eevee needs a GPU/GL context that headless CI machines often lack;
    # default to Cycles CPU and allow an explicit override.
    engine_override = os.environ.get("ECHO_RENDER_ENGINE")
    if engine_override:
        scene.render.engine = engine_override
    else:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 64
        scene.cycles.use_denoising = True
    scene.render.resolution_x = 1280
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
    scene.view_settings.exposure = -0.05
    scene.view_settings.gamma = 1.0


def export_runtime(collection: bpy.types.Collection) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["ROOT_ExpoHall"]
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
    runtime = make_collection("EXPO_HallRuntime")
    preview = make_collection("EXPO_PreviewOnly")
    materials = add_materials()

    root = add_empty("ROOT_ExpoHall", runtime, display_size=0.35)
    root["asset_type"] = "EchoWorld expo hall environment"
    root["style_version"] = "expo-hall-v1"
    root["unit"] = "meter"
    root["doorway_side"] = "-Y"
    root["character_reference_height_m"] = 1.65
    root["seed"] = SEED

    add_floor_and_walls(runtime, root, materials)
    add_doorway(runtime, root, materials)
    add_columns_and_beams(runtime, root, materials)
    add_light_strips(runtime, root, materials)
    add_string_lights(runtime, root, materials)
    add_plants(runtime, root, materials)
    add_welcome_sign(runtime, root, materials)

    spawn = add_empty(
        "ANCHOR_PlayerSpawn",
        runtime,
        root,
        location=(0.0, -4.35, 0.0),
        display_size=0.22,
    )
    spawn["anchor_kind"] = "player_spawn"
    spawn["forward_local"] = "+Y toward hall interior"
    add_empty(
        "ANCHOR_CameraFocus",
        runtime,
        root,
        location=(0.0, 0.2, 1.0),
        display_size=0.16,
    )

    configure_preview(preview)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene["echo_world_style"] = "warm low-poly expo hall, matte storybook-compatible diorama"
    scene["echo_world_asset"] = "expo hall environment v1"

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_runtime(runtime)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    manifest = {
        "schema_version": "echo-expo-hall.v1",
        "name": "EchoWorld Expo Hall",
        "style": "warm low-poly matte diorama; compatible with storybook cafe palette",
        "generator": "blender/build_expo_hall.py",
        "seed": SEED,
        "blend": str(BLEND_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "glb": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "preview": str(RENDER_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "root_node": root.name,
        "ground_node": "GROUND_ExpoHallFloor",
        "spawn_anchor": "ANCHOR_PlayerSpawn",
        "cafe_doorway": "FIXTURE_CafeDoorway",
        "scale_contract": {
            "unit": "meter",
            "hall_width_m": HALL_WIDTH,
            "hall_depth_m": HALL_DEPTH,
            "wall_height_m": WALL_HEIGHT,
            "column_height_m": COLUMN_HEIGHT,
            "door_opening_width_m": DOOR_WIDTH,
            "door_opening_height_m": DOOR_HEIGHT,
            "reference_character_height_m": 1.65,
            "floor_top_z": 0.0,
        },
        "coordinate_contract": {
            "origin": "hall center on finished floor",
            "doorway_side": "-Y",
            "up_axis_export": "+Y via glTF",
        },
        "export_excludes": ["EXPO_PreviewOnly collection", "preview camera", "preview lights"],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    build_scene()
