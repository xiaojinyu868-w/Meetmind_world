from __future__ import annotations

import json
import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = PROJECT_ROOT / "blender" / "echo_world_booth_template.blend"
GLB_PATH = PROJECT_ROOT / "public" / "models" / "modules" / "echo_world_booth_template.glb"
RENDER_PATH = PROJECT_ROOT / "renders" / "echo_world_booth_template_preview.png"
MANIFEST_PATH = PROJECT_ROOT / "public" / "models" / "modules" / "echo_world_booth_template_manifest.json"

TABLE_WIDTH = 1.6
TABLE_DEPTH = 0.7
TABLE_HEIGHT = 0.9
BACKDROP_WIDTH = 2.0
BACKDROP_HEIGHT = 2.2
TABLE_CENTER_Y = -0.20
BACKDROP_CENTER_Y = 0.65
FACE_Y = BACKDROP_CENTER_Y - 0.035 - 0.003  # display planes float just off the board face
SEED = 26080402

# Display surface contract: frontend locates these meshes by name and replaces
# their textures. Sizes in meters (width x height of the display plane).
DISPLAY_SURFACES = {
    "MESH_NamePlate": {"width": 1.4, "height": 0.32, "kind": "name_plate"},
    "MESH_Portrait": {"width": 0.8, "height": 1.0, "kind": "portrait"},
    "MESH_PhotoFrame_01": {"width": 0.7, "height": 0.5, "kind": "photo_frame"},
    "MESH_PhotoFrame_02": {"width": 0.7, "height": 0.5, "kind": "photo_frame"},
    "MESH_Backdrop": {"width": 1.7, "height": 0.45, "kind": "tag_strip"},
}


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
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
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
    bevel: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add()
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0.0:
        modifier = obj.modifiers.new(name="BoothBevel", type="BEVEL")
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
    return obj


def add_display_plane(
    name: str,
    width: float,
    height: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    tilt_x_degrees: float = 90.0,
) -> bpy.types.Object:
    # Primitive plane keeps clean 0-1 UVs; tilt 90 deg faces -Y (glTF +Z),
    # smaller angles lean the top edge backward like a tabletop stand.
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
    obj.rotation_euler = (math.radians(tilt_x_degrees), 0.0, 0.0)
    return obj


def add_materials() -> dict[str, bpy.types.Material]:
    materials = {
        "table_top": make_material("MAT_Booth_TableTop", srgb("#B9855A"), 0.88),
        "table_leg": make_material("MAT_Booth_TableLeg", srgb("#7A5A3E"), 0.90),
        "table_panel": make_material("MAT_Booth_TablePanel", srgb("#A9714B"), 0.92),
        "backdrop": make_material("MAT_Booth_Backdrop", srgb("#E7D6B4"), 0.96),
        "backdrop_trim": make_material("MAT_Booth_BackdropTrim", srgb("#5F7A6A"), 0.94),
    }
    # One dedicated material per display surface: near-white with a touch of
    # emission so replaced textures read clearly under warm hall lighting.
    for mesh_name in DISPLAY_SURFACES:
        key = f"display_{mesh_name}"
        materials[key] = make_material(
            f"MAT_Display_{mesh_name.removeprefix('MESH_')}",
            srgb("#FDFBF4"),
            0.72,
            emission=srgb("#FFFFFF"),
            emission_strength=0.25,
        )
    return materials


def add_table(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    add_box(
        "MESH_TableTop",
        (TABLE_WIDTH, TABLE_DEPTH, 0.07),
        (0.0, TABLE_CENTER_Y, TABLE_HEIGHT - 0.035),
        materials["table_top"],
        collection,
        root,
        bevel=0.02,
    )
    leg_h = TABLE_HEIGHT - 0.07
    for index, (x, y) in enumerate(
        (
            (-(TABLE_WIDTH / 2.0 - 0.08), TABLE_CENTER_Y - (TABLE_DEPTH / 2.0 - 0.08)),
            (TABLE_WIDTH / 2.0 - 0.08, TABLE_CENTER_Y - (TABLE_DEPTH / 2.0 - 0.08)),
            (-(TABLE_WIDTH / 2.0 - 0.08), TABLE_CENTER_Y + (TABLE_DEPTH / 2.0 - 0.08)),
            (TABLE_WIDTH / 2.0 - 0.08, TABLE_CENTER_Y + (TABLE_DEPTH / 2.0 - 0.08)),
        ),
        start=1,
    ):
        add_box(
            f"MESH_TableLeg_{index:02d}",
            (0.07, 0.07, leg_h),
            (x, y, leg_h / 2.0),
            materials["table_leg"],
            collection,
            root,
            bevel=0.01,
        )
    add_box(
        "MESH_TablePanel",
        (TABLE_WIDTH - 0.14, 0.04, 0.52),
        (0.0, TABLE_CENTER_Y - TABLE_DEPTH / 2.0 + 0.02, 0.56),
        materials["table_panel"],
        collection,
        root,
        bevel=0.01,
    )


def add_backdrop(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    add_box(
        "MESH_BackdropBoard",
        (BACKDROP_WIDTH, 0.07, BACKDROP_HEIGHT),
        (0.0, BACKDROP_CENTER_Y, BACKDROP_HEIGHT / 2.0),
        materials["backdrop"],
        collection,
        root,
        bevel=0.02,
    )
    add_box(
        "MESH_BackdropTopTrim",
        (BACKDROP_WIDTH + 0.08, 0.10, 0.08),
        (0.0, BACKDROP_CENTER_Y, BACKDROP_HEIGHT + 0.04),
        materials["backdrop_trim"],
        collection,
        root,
        bevel=0.015,
    )
    for side, x in (("L", -0.72), ("R", 0.72)):
        add_box(
            f"MESH_BackdropFoot_{side}",
            (0.42, 0.52, 0.06),
            (x, BACKDROP_CENTER_Y, 0.03),
            materials["backdrop_trim"],
            collection,
            root,
            bevel=0.01,
        )


def add_display_surfaces(
    collection: bpy.types.Collection,
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> None:
    specs = {
        "MESH_NamePlate": (0.0, FACE_Y, 2.00, 90.0),
        "MESH_Portrait": (0.0, FACE_Y, 1.32, 90.0),
        "MESH_Backdrop": (0.0, FACE_Y, 0.50, 90.0),
        # Tabletop standing frames: bottom edge rests on the table top,
        # leaning back 10 degrees against the backdrop direction.
        "MESH_PhotoFrame_01": (-0.45, -0.22, TABLE_HEIGHT + 0.25 * math.sin(math.radians(80.0)), 80.0),
        "MESH_PhotoFrame_02": (0.45, -0.22, TABLE_HEIGHT + 0.25 * math.sin(math.radians(80.0)), 80.0),
    }
    for mesh_name, surface in DISPLAY_SURFACES.items():
        x, y, z, tilt = specs[mesh_name]
        obj = add_display_plane(
            mesh_name,
            surface["width"],
            surface["height"],
            (x, y, z),
            materials[f"display_{mesh_name}"],
            collection,
            root,
            tilt_x_degrees=tilt,
        )
        obj["display_surface"] = surface["kind"]
        obj["texture_contract"] = "frontend replaces material texture at runtime"


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection) -> None:
    world = bpy.data.worlds.new("PREVIEW_BoothWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#86A3AC")
    background.inputs["Strength"].default_value = 0.32
    bpy.context.scene.world = world

    # Simple ground card so the booth does not float in the preview.
    ground = add_box(
        "PREVIEW_GroundCard",
        (6.0, 6.0, 0.05),
        (0.0, 0.0, -0.025),
        make_material("MAT_Preview_Ground", srgb("#CBB489"), 0.95),
        collection,
    )
    ground.hide_render = False

    camera_data = bpy.data.cameras.new("PREVIEW_BoothCamera")
    camera = bpy.data.objects.new("PREVIEW_BoothCamera", camera_data)
    collection.objects.link(camera)
    camera.location = (2.6, -3.9, 2.2)
    camera_data.lens = 52.0
    look_at(camera, Vector((0.0, 0.1, 1.05)))
    bpy.context.scene.camera = camera

    sun_data = bpy.data.lights.new("PREVIEW_SoftSun", type="SUN")
    sun_data.energy = 2.6
    sun_data.angle = math.radians(14.0)
    sun_data.color = srgb("#FFD49A")[:3]
    sun = bpy.data.objects.new("PREVIEW_SoftSun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(32.0), math.radians(-16.0), math.radians(-28.0))

    fill_data = bpy.data.lights.new("PREVIEW_BoothFill", type="AREA")
    fill_data.energy = 320.0
    fill_data.shape = "DISK"
    fill_data.size = 4.0
    fill_data.color = srgb("#FFE0B0")[:3]
    fill = bpy.data.objects.new("PREVIEW_BoothFill", fill_data)
    collection.objects.link(fill)
    fill.location = (-1.6, -2.2, 3.4)
    look_at(fill, Vector((0.0, 0.0, 1.0)))

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
    bpy.context.view_layer.objects.active = bpy.data.objects["ROOT_Booth"]
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
    runtime = make_collection("EXPO_BoothRuntime")
    preview = make_collection("EXPO_BoothPreviewOnly")
    materials = add_materials()

    root = add_empty("ROOT_Booth", runtime, display_size=0.3)
    root["asset_type"] = "EchoWorld expo booth template module"
    root["style_version"] = "booth-template-v1"
    root["unit"] = "meter"
    root["front_side"] = "-Y (glTF +Z)"
    root["seed"] = SEED

    add_table(runtime, root, materials)
    add_backdrop(runtime, root, materials)
    add_display_surfaces(runtime, root, materials)

    stand = add_empty(
        "ANCHOR_PersonStand",
        runtime,
        root,
        location=(0.0, 0.38, 0.0),
        display_size=0.18,
    )
    stand["anchor_kind"] = "person_stand"
    stand["forward_local"] = "-Y toward booth front (glTF +Z)"

    configure_preview(preview)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene["echo_world_asset"] = "expo booth template module v1"

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_runtime(runtime)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    manifest = {
        "schema_version": "echo-booth-template.v1",
        "name": "EchoWorld Expo Booth Template",
        "style": "warm low-poly matte booth; display planes carry placeholder emissive materials",
        "generator": "blender/build_booth_template.py",
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
            "table_width_m": TABLE_WIDTH,
            "table_depth_m": TABLE_DEPTH,
            "table_height_m": TABLE_HEIGHT,
            "backdrop_width_m": BACKDROP_WIDTH,
            "backdrop_height_m": BACKDROP_HEIGHT,
        },
        "coordinate_contract": {
            "origin": "booth center on floor",
            "front_side": "-Y in Blender, +Z after glTF export",
            "up_axis_export": "+Y via glTF",
        },
        "export_excludes": ["EXPO_BoothPreviewOnly collection", "preview camera", "preview lights", "preview ground card"],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    build_scene()
