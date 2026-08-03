from __future__ import annotations

import json
import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = PROJECT_ROOT / "blender" / "echo_world_market_stall.blend"
GLB_PATH = PROJECT_ROOT / "public" / "models" / "modules" / "echo_world_market_stall.glb"
RENDER_PATH = PROJECT_ROOT / "renders" / "echo_world_market_stall_preview.png"
MANIFEST_PATH = PROJECT_ROOT / "public" / "models" / "modules" / "echo_world_market_stall_manifest.json"

SEED = 26080502

# Display surface contract: frontend locates these meshes by name and replaces
# their textures. Sizes in meters (width x height of the display plane).
DISPLAY_SURFACES = {
    "MESH_NamePlate": {"width": 1.2, "height": 0.30, "kind": "name_plate"},
    "MESH_Portrait": {"width": 0.7, "height": 0.90, "kind": "portrait"},
    "MESH_PhotoFrame_01": {"width": 0.6, "height": 0.45, "kind": "photo_frame"},
    "MESH_PhotoFrame_02": {"width": 0.6, "height": 0.45, "kind": "photo_frame"},
    "MESH_Backdrop": {"width": 1.6, "height": 0.24, "kind": "tag_strip"},
}


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


def add_display_plane(
    name: str,
    width: float,
    height: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    # Primitive plane keeps clean 0-1 UVs; rotated 90 deg about X it stands
    # vertical and faces -Y (glTF +Z, toward the street).
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
    obj.rotation_euler = (math.radians(90.0), 0.0, 0.0)
    return obj


def add_materials() -> dict[str, bpy.types.Material]:
    materials = {
        "wood_log": make_material("MAT_Stall_WoodLog", srgb("#B0895A"), 0.9),
        "wood_dark": make_material("MAT_Stall_WoodDark", srgb("#7A5A3C"), 0.9),
        "wood_plank": make_material("MAT_Stall_WoodPlank", srgb("#C49A6A"), 0.92),
        "awning_red": make_material("MAT_Stall_AwningRed", srgb("#C95A4D"), 0.94),
        "awning_white": make_material("MAT_Stall_AwningWhite", srgb("#F2EAD8"), 0.96),
        "cord": make_material("MAT_Stall_Cord", srgb("#6B5640"), 0.92),
        "basket": make_material("MAT_Stall_Basket", srgb("#A87F4E"), 0.95),
        "sack": make_material("MAT_Stall_Sack", srgb("#C4A97E"), 0.98),
        "fruit_red": make_material("MAT_Stall_FruitRed", srgb("#C2503E"), 0.85),
        "fruit_orange": make_material("MAT_Stall_FruitOrange", srgb("#D88A3E"), 0.85),
        "jar": make_material("MAT_Stall_Jar", srgb("#CFC4B2"), 0.9),
        "bolt_blue": make_material("MAT_Stall_BoltBlue", srgb("#7FA3C4"), 0.9),
        "bolt_green": make_material("MAT_Stall_BoltGreen", srgb("#8FB87F"), 0.9),
        "bolt_yellow": make_material("MAT_Stall_BoltYellow", srgb("#E8C96A"), 0.9),
    }
    # One dedicated material per display surface: near-white with a touch of
    # emission so replaced textures read clearly under warm lighting.
    for mesh_name in DISPLAY_SURFACES:
        materials[f"display_{mesh_name}"] = make_material(
            f"MAT_Display_{mesh_name.removeprefix('MESH_')}",
            srgb("#FDFBF4"),
            0.72,
            emission=srgb("#FFFFFF"),
            emission_strength=0.25,
        )
    return materials


def add_frame(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    # Street side is -Y: front posts are shorter so the awning slopes down.
    for label, y, height in (("Front", -1.0, 2.15), ("Back", 1.0, 2.75)):
        for side, x in (("L", -1.1), ("R", 1.1)):
            add_cylinder(
                f"STALL_Post_{label}_{side}",
                0.09,
                height,
                (x, y, height / 2.0),
                materials["wood_log"],
                collection,
                root,
                vertices=8,
            )
    # Cross beams tying each pair together.
    add_cylinder(
        "STALL_Beam_Front",
        0.055,
        2.35,
        (0.0, -1.0, 2.08),
        materials["wood_dark"],
        collection,
        root,
        vertices=8,
        rotation=(0.0, math.radians(90.0), 0.0),
    )
    add_cylinder(
        "STALL_Beam_Back",
        0.055,
        2.35,
        (0.0, 1.0, 2.68),
        materials["wood_dark"],
        collection,
        root,
        vertices=8,
        rotation=(0.0, math.radians(90.0), 0.0),
    )
    # Back plank wall carries the portrait / photo frames / tag strip.
    add_box(
        "MESH_BackWall",
        (2.2, 0.08, 2.0),
        (0.0, 1.05, 1.0),
        materials["wood_dark"],
        collection,
        root,
        bevel=0.01,
    )
    # Counter at the front.
    add_box(
        "MESH_CounterTop",
        (1.9, 0.62, 0.08),
        (0.0, -0.55, 0.85),
        materials["wood_plank"],
        collection,
        root,
        bevel=0.015,
    )
    add_box(
        "MESH_CounterFront",
        (1.9, 0.06, 0.70),
        (0.0, -0.83, 0.45),
        materials["wood_plank"],
        collection,
        root,
        bevel=0.01,
    )
    for side, x in (("L", -0.82), ("R", 0.82)):
        add_box(
            f"MESH_CounterLeg_{side}",
            (0.07, 0.5, 0.81),
            (x, -0.55, 0.405),
            materials["wood_dark"],
            collection,
            root,
            bevel=0.01,
        )


def add_awning(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    # Red/white striped canvas sloping from the back beam down over the street.
    width = 2.6
    stripes = 7
    stripe_w = width / stripes
    theta = math.radians(15.0)
    slope_len = 2.25
    mid_y, mid_z = -0.1, 2.365
    for index in range(stripes):
        offset = -width / 2.0 + stripe_w * (index + 0.5)
        material = materials["awning_red"] if index % 2 == 0 else materials["awning_white"]
        add_box(
            f"AWNING_Stripe_{index + 1:02d}",
            (stripe_w + 0.012, slope_len, 0.045),
            (offset, mid_y, mid_z),
            material,
            collection,
            root,
            rotation=(theta, 0.0, 0.0),
            bevel=0.008,
        )
    # Scalloped valance along the lower front edge, facing the street (-Y).
    front_y = mid_y - (slope_len / 2.0) * math.cos(theta)
    front_z = mid_z - (slope_len / 2.0) * math.sin(theta)
    for index in range(stripes):
        offset = -width / 2.0 + stripe_w * (index + 0.5)
        material = materials["awning_white"] if index % 2 == 0 else materials["awning_red"]
        add_triangle(
            f"AWNING_Valance_{index + 1:02d}",
            stripe_w * 0.9,
            0.26,
            (offset, front_y, front_z - 0.01),
            material,
            collection,
            root,
            rotation=(0.0, 0.0, math.radians(180.0)),
        )


def add_display_surfaces(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    face_y = 1.05 - 0.04 - 0.003  # just off the back wall's street-facing side
    specs = {
        "MESH_Portrait": (-0.42, face_y, 1.55),
        "MESH_PhotoFrame_01": (0.50, face_y, 1.76),
        "MESH_PhotoFrame_02": (0.50, face_y, 1.31),
        "MESH_Backdrop": (0.0, face_y, 0.94),
    }
    for mesh_name, surface in DISPLAY_SURFACES.items():
        if mesh_name == "MESH_NamePlate":
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

    # Name plate hangs from the front beam under the awning.
    plate = DISPLAY_SURFACES["MESH_NamePlate"]
    obj = add_display_plane(
        "MESH_NamePlate",
        plate["width"],
        plate["height"],
        (0.0, -1.02, 1.92),
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
            0.14,
            (x, -1.0, 2.02),
            materials["cord"],
            collection,
            root,
            vertices=6,
        )


def add_goods_and_props(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict,
) -> None:
    top = 0.89  # counter top surface
    add_cone(
        "GOODS_Basket",
        0.19,
        0.14,
        0.17,
        (-0.55, -0.55, top + 0.085),
        materials["basket"],
        collection,
        root,
        vertices=8,
    )
    for index, (dx, dy, mat) in enumerate(
        (
            (-0.06, 0.02, "fruit_red"),
            (0.05, -0.03, "fruit_orange"),
            (0.0, 0.06, "fruit_red"),
            (0.03, 0.03, "fruit_orange"),
        ),
        start=1,
    ):
        add_ico(
            f"GOODS_Fruit_{index}",
            (-0.55 + dx, -0.55 + dy, top + 0.19),
            (0.05, 0.05, 0.05),
            materials[mat],
            collection,
            root,
        )
    add_ico(
        "GOODS_Sack",
        (0.08, -0.52, top + 0.12),
        (0.15, 0.13, 0.14),
        materials["sack"],
        collection,
        root,
    )
    for index, x in enumerate((0.42, 0.62), start=1):
        add_cylinder(
            f"GOODS_Jar_{index}",
            0.065,
            0.19,
            (x, -0.56, top + 0.095),
            materials["jar"],
            collection,
            root,
            vertices=8,
        )
    # Fabric bolts leaning against the right side post.
    for index, mat in enumerate(("bolt_blue", "bolt_green", "bolt_yellow"), start=1):
        add_cylinder(
            f"PROP_Bolt_{index:02d}",
            0.075,
            1.35,
            (1.28 + index * 0.09, -0.35, 0.62),
            materials[mat],
            collection,
            root,
            vertices=9,
            rotation=(0.0, math.radians(16.0), 0.0),
        )


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection) -> None:
    world = bpy.data.worlds.new("PREVIEW_StallWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#9CD2EA")
    background.inputs["Strength"].default_value = 0.28
    bpy.context.scene.world = world

    add_box(
        "PREVIEW_GroundCard",
        (7.0, 7.0, 0.05),
        (0.0, 0.0, -0.025),
        make_material("MAT_Preview_Ground", srgb("#CBA77C"), 0.98),
        collection,
    )

    camera_data = bpy.data.cameras.new("PREVIEW_StallCamera")
    camera = bpy.data.objects.new("PREVIEW_StallCamera", camera_data)
    collection.objects.link(camera)
    camera.location = (2.4, -4.6, 1.9)
    camera_data.lens = 50.0
    look_at(camera, Vector((0.0, 0.1, 1.25)))
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
    fill.location = (-1.8, -2.4, 3.4)
    look_at(fill, Vector((0.0, 0.0, 1.1)))

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
    root["asset_type"] = "EchoWorld market stall template module"
    root["style_version"] = "market-stall-v1"
    root["unit"] = "meter"
    root["front_side"] = "-Y (glTF +Z, toward the street)"
    root["seed"] = SEED

    add_frame(runtime, root, materials)
    add_awning(runtime, root, materials)
    add_display_surfaces(runtime, root, materials)
    add_goods_and_props(runtime, root, materials)

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
    scene["echo_world_asset"] = "market stall template module v1"

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_runtime(runtime)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    manifest = {
        "schema_version": "echo-market-stall.v1",
        "name": "EchoWorld Market Stall Template",
        "style": "storybook low-poly matte stall; log frame, red-white striped awning, goods on counter",
        "generator": "blender/build_market_stall.py",
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
            "footprint_m": [2.6, 2.3],
            "awning_peak_z_m": 2.75,
            "counter_top_z_m": 0.89,
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
