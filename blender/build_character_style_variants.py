from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BLENDER_DIR = PROJECT_ROOT / "blender"
EXPORT_DIR = PROJECT_ROOT / "exports"
RUNTIME_DIR = PROJECT_ROOT / "public" / "models" / "characters"
RENDER_DIR = PROJECT_ROOT / "renders"


VARIANTS = (
    {
        "id": "reference-lowpoly",
        "title": "Reference Low-poly Character",
        "glb": "echo_world_faceless_reference.glb",
        "blend": "echo_world_faceless_reference.blend",
        "preview": "echo_world_faceless_reference_preview.png",
        "palette": {
            "skin": "#C78F67",
            "hair": "#24382B",
            "jacket": "#315D43",
            "shirt": "#E2C76E",
            "pants": "#334A45",
            "shoes": "#B86F37",
            "accent": "#708F45",
            "outline": "#20352B",
        },
    },
    {
        "id": "painterly-adventure",
        "title": "Painterly Adventure Character",
        "glb": "echo_world_faceless_painterly.glb",
        "blend": "echo_world_faceless_painterly.blend",
        "preview": "echo_world_faceless_painterly_preview.png",
        "palette": {
            "skin": "#D59A72",
            "hair": "#41362D",
            "jacket": "#4A8170",
            "shirt": "#E8CF88",
            "pants": "#465F5B",
            "shoes": "#72503B",
            "accent": "#C86E52",
            "outline": "#313A32",
        },
    },
)


def srgb(hex_value: str) -> tuple[float, float, float, float]:
    value = hex_value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


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


def make_material(name: str, color: str, roughness: float = 0.9) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    rgba = srgb(color)
    material.diffuse_color = rgba
    material.use_nodes = True
    material.use_backface_culling = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.append(material)
    if hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = False


def parent_object(obj: bpy.types.Object, parent: bpy.types.Object) -> bpy.types.Object:
    obj.parent = parent
    return obj


def add_ico(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    subdivisions: int = 1,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.location = location
    obj.rotation_euler = rotation
    assign_material(obj, material)
    move_to_collection(obj, collection)
    return parent_object(obj, parent)


def add_prism(
    name: str,
    location: tuple[float, float, float],
    radii: tuple[float, float],
    depth: float,
    y_scale: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    vertices: int = 6,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radii[0],
        radius2=radii[1],
        depth=depth,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale.y = y_scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.location = location
    obj.rotation_euler = rotation
    assign_material(obj, material)
    move_to_collection(obj, collection)
    return parent_object(obj, parent)


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    bevel: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add()
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("SingleFacetBevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.location = location
    obj.rotation_euler = rotation
    assign_material(obj, material)
    move_to_collection(obj, collection)
    return parent_object(obj, parent)


def add_panel(
    name: str,
    vertices: list[tuple[float, float, float]],
    faces: list[tuple[int, ...]],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    return parent_object(obj, parent)


def build_reference_character(
    root: bpy.types.Object,
    collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> None:
    for side, x_value in (("L", -0.12), ("R", 0.12)):
        add_prism(
            f"GEO_PantsLeg_{side}",
            (x_value, 0.0, 0.40),
            (0.105, 0.088),
            0.58,
            0.82,
            materials["pants"],
            collection,
            root,
            vertices=6,
        )
        add_box(
            f"GEO_Shoe_{side}",
            (x_value, -0.035, 0.075),
            (0.22, 0.31, 0.15),
            materials["shoes"],
            collection,
            root,
            rotation=(math.radians(-4), 0.0, math.radians(3 if side == "L" else -3)),
            bevel=0.025,
        )

    add_prism(
        "GEO_Jacket_Torso",
        (0.0, 0.0, 0.93),
        (0.30, 0.245),
        0.54,
        0.68,
        materials["jacket"],
        collection,
        root,
        vertices=6,
    )
    add_panel(
        "GEO_Shirt_Front",
        [(-0.125, -0.205, 0.69), (0.125, -0.205, 0.69), (0.10, -0.175, 1.17), (-0.10, -0.175, 1.17)],
        [(0, 1, 2, 3)],
        materials["shirt"],
        collection,
        root,
    )
    add_panel(
        "GEO_Jacket_Lapels",
        [
            (-0.22, -0.22, 1.16), (0.0, -0.225, 0.91), (-0.035, -0.225, 1.16),
            (0.22, -0.22, 1.16), (0.0, -0.225, 0.91), (0.035, -0.225, 1.16),
        ],
        [(0, 1, 2), (3, 5, 4)],
        materials["accent"],
        collection,
        root,
    )

    for side, x_value, tilt in (("L", -0.335, -0.10), ("R", 0.335, 0.10)):
        add_prism(
            f"GEO_Jacket_Arm_{side}",
            (x_value, 0.0, 0.93),
            (0.10, 0.078),
            0.48,
            0.82,
            materials["jacket"],
            collection,
            root,
            vertices=6,
            rotation=(0.0, tilt, 0.0),
        )
        add_ico(
            f"GEO_Skin_Hand_{side}",
            (x_value + (-0.025 if side == "L" else 0.025), -0.005, 0.67),
            (0.082, 0.07, 0.095),
            materials["skin"],
            collection,
            root,
            subdivisions=1,
        )

    add_prism("GEO_Skin_Neck", (0.0, 0.0, 1.225), (0.085, 0.08), 0.15, 0.9, materials["skin"], collection, root, vertices=7)
    add_ico("GEO_Skin_Head", (0.0, -0.005, 1.43), (0.255, 0.225, 0.235), materials["skin"], collection, root, subdivisions=2)
    add_ico("GEO_Hair_Crown", (0.0, 0.02, 1.515), (0.265, 0.22, 0.155), materials["hair"], collection, root, subdivisions=1)
    add_ico("GEO_Hair_Back", (0.0, 0.16, 1.40), (0.21, 0.10, 0.20), materials["hair"], collection, root, subdivisions=1)
    for index, x_value in enumerate((-0.17, -0.055, 0.06, 0.17), start=1):
        add_prism(
            f"GEO_Hair_FrontLock_{index:02d}",
            (x_value, -0.205, 1.49 - abs(x_value) * 0.18),
            (0.065, 0.018),
            0.19,
            0.45,
            materials["hair"],
            collection,
            root,
            vertices=5,
            rotation=(math.radians(15), 0.0, math.radians(x_value * -28)),
        )


def build_painterly_character(
    root: bpy.types.Object,
    collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> None:
    for side, x_value in (("L", -0.115), ("R", 0.115)):
        add_prism(f"GEO_PantsLeg_{side}", (x_value, 0.01, 0.39), (0.10, 0.082), 0.56, 0.78, materials["pants"], collection, root, vertices=7)
        add_box(f"GEO_Shoe_{side}", (x_value, -0.045, 0.075), (0.22, 0.30, 0.15), materials["shoes"], collection, root, bevel=0.035)
        add_box(f"GEO_ShoeSole_{side}", (x_value, -0.06, 0.025), (0.23, 0.31, 0.045), materials["outline"], collection, root, bevel=0.012)

    add_prism("GEO_Jacket_Tunic", (0.0, 0.0, 0.94), (0.31, 0.235), 0.58, 0.7, materials["jacket"], collection, root, vertices=8)
    add_box("GEO_Accent_Belt", (0.0, -0.015, 0.76), (0.55, 0.31, 0.075), materials["outline"], collection, root, bevel=0.014)
    add_panel(
        "GEO_Shirt_Bib",
        [(-0.13, -0.22, 0.78), (0.13, -0.22, 0.78), (0.095, -0.18, 1.16), (-0.095, -0.18, 1.16)],
        [(0, 1, 2, 3)],
        materials["shirt"],
        collection,
        root,
    )
    add_panel(
        "GEO_Accent_Cape",
        [(-0.27, 0.13, 1.17), (0.27, 0.13, 1.17), (0.22, 0.20, 0.73), (-0.19, 0.21, 0.65)],
        [(0, 1, 2, 3)],
        materials["accent"],
        collection,
        root,
    )

    for side, x_value, tilt in (("L", -0.34, -0.13), ("R", 0.34, 0.13)):
        add_prism(f"GEO_Jacket_Arm_{side}", (x_value, 0.0, 0.94), (0.105, 0.075), 0.48, 0.78, materials["jacket"], collection, root, vertices=7, rotation=(0.0, tilt, 0.0))
        add_box(f"GEO_Accent_Cuff_{side}", (x_value + (-0.018 if side == "L" else 0.018), -0.005, 0.73), (0.15, 0.16, 0.09), materials["accent"], collection, root, bevel=0.018)
        add_ico(f"GEO_Skin_Hand_{side}", (x_value + (-0.035 if side == "L" else 0.035), -0.01, 0.65), (0.085, 0.072, 0.095), materials["skin"], collection, root, subdivisions=1)

    add_prism("GEO_Skin_Neck", (0.0, 0.0, 1.23), (0.09, 0.082), 0.16, 0.9, materials["skin"], collection, root, vertices=8)
    add_ico("GEO_Skin_Head", (0.0, -0.01, 1.43), (0.26, 0.235, 0.235), materials["skin"], collection, root, subdivisions=2)
    add_prism("GEO_Accent_Scarf", (0.0, 0.0, 1.245), (0.145, 0.13), 0.10, 0.75, materials["accent"], collection, root, vertices=8)
    add_panel(
        "GEO_Accent_ScarfTail",
        [(0.07, 0.115, 1.26), (0.18, 0.13, 1.24), (0.20, 0.16, 0.89), (0.08, 0.14, 1.02)],
        [(0, 1, 2, 3)],
        materials["accent"],
        collection,
        root,
    )
    add_ico("GEO_Hair_Crown", (0.0, 0.02, 1.52), (0.272, 0.23, 0.16), materials["hair"], collection, root, subdivisions=2)
    add_ico("GEO_Hair_Back", (0.0, 0.17, 1.39), (0.22, 0.11, 0.21), materials["hair"], collection, root, subdivisions=1)
    for index, (x_value, z_value, angle) in enumerate(((-0.18, 1.50, -8), (-0.07, 1.53, -3), (0.06, 1.52, 4), (0.17, 1.49, 9)), start=1):
        add_prism(f"GEO_Hair_SweptLock_{index:02d}", (x_value, -0.215, z_value), (0.07, 0.018), 0.20, 0.5, materials["hair"], collection, root, vertices=6, rotation=(math.radians(16), 0.0, math.radians(angle)))


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_preview_rig(variant_id: str, materials: dict[str, bpy.types.Material]) -> None:
    preview = make_collection("PREVIEW_ONLY")
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.72, depth=0.10, location=(0.0, 0.0, -0.075))
    pedestal = bpy.context.object
    pedestal.name = "PREVIEW_Pedestal"
    move_to_collection(pedestal, preview)
    assign_material(pedestal, materials["pedestal"])

    bpy.ops.object.camera_add(location=(3.15, -5.8, 2.65))
    camera = bpy.context.object
    camera.name = "PREVIEW_Camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.15
    look_at(camera, (0.0, 0.0, 0.84))
    move_to_collection(camera, preview)
    bpy.context.scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-3.2, -3.8, 5.0))
    key = bpy.context.object
    key.name = "PREVIEW_Key"
    key.data.energy = 700
    key.data.color = srgb("#FFD89B")[:3]
    key.data.shape = "DISK"
    key.data.size = 4.0
    look_at(key, (0.0, 0.0, 0.8))
    move_to_collection(key, preview)

    bpy.ops.object.light_add(type="AREA", location=(3.3, 0.5, 2.8))
    fill = bpy.context.object
    fill.name = "PREVIEW_Fill"
    fill.data.energy = 320
    fill.data.color = srgb("#9ECBD0")[:3]
    fill.data.size = 3.5
    look_at(fill, (0.0, 0.0, 0.9))
    move_to_collection(fill, preview)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(RENDER_DIR / f"echo_world_faceless_{variant_id}_preview.png")
    if scene.world is None:
        scene.world = bpy.data.worlds.new("PREVIEW_World")
    scene.world.color = srgb("#8AA7A7")[:3]
    scene.view_settings.look = "AgX - Medium High Contrast"


def hierarchy(root: bpy.types.Object) -> list[bpy.types.Object]:
    result = [root]
    for child in root.children:
        result.extend(hierarchy(child))
    return result


def export_character(root: bpy.types.Object, path: Path) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in hierarchy(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_extras=True,
        export_yup=True,
        export_apply=False,
    )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_variant(spec: dict[str, object]) -> None:
    reset_scene()
    for directory in (BLENDER_DIR, EXPORT_DIR, RUNTIME_DIR, RENDER_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    collection = make_collection("CHARACTER_ASSET")
    root = bpy.data.objects.new("ROOT_FacelessCharacter", None)
    collection.objects.link(root)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.14
    root["asset_kind"] = "faceless-person"
    root["style_variant"] = spec["id"]
    root["face_mode"] = "featureless"
    root["height_m"] = 1.65
    root["forward_local"] = "-Y"

    palette = spec["palette"]
    materials = {
        key: make_material(f"MAT_{key.title()}", value)
        for key, value in palette.items()
    }
    materials["pedestal"] = make_material("MAT_PREVIEW_Pedestal", "#BBC58C")

    if spec["id"] == "reference-lowpoly":
        build_reference_character(root, collection, materials)
    else:
        build_painterly_character(root, collection, materials)

    add_preview_rig(str(spec["id"]), materials)
    blend_path = BLENDER_DIR / str(spec["blend"])
    export_path = EXPORT_DIR / str(spec["glb"])
    runtime_path = RUNTIME_DIR / str(spec["glb"])
    preview_path = RENDER_DIR / str(spec["preview"])
    bpy.context.scene.render.filepath = str(preview_path)

    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    export_character(root, export_path)
    runtime_path.write_bytes(export_path.read_bytes())
    bpy.ops.render.render(write_still=True)

    mesh_objects = [obj for obj in hierarchy(root) if obj.type == "MESH"]
    triangle_count = sum(
        len(polygon.vertices) - 2
        for obj in mesh_objects
        for polygon in obj.data.polygons
    )
    manifest = {
        "schema_version": "echo-character-asset.v1",
        "asset_id": f"character.faceless-{spec['id']}.v1",
        "style_variant": spec["id"],
        "face_mode": "featureless",
        "height_m": 1.65,
        "root_node": root.name,
        "mesh_objects": len(mesh_objects),
        "triangles": triangle_count,
        "materials": sorted(material.name for key, material in materials.items() if key != "pedestal"),
        "blend": str(blend_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "glb": str(export_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "runtime_glb": str(runtime_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "preview": str(preview_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "sha256": sha256(export_path),
        "runtime_copy_byte_identical": sha256(export_path) == sha256(runtime_path),
    }
    manifest_path = EXPORT_DIR / f"echo_world_faceless_{spec['id']}_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


for variant in VARIANTS:
    build_variant(variant)

print("Built character style variants:", ", ".join(str(variant["id"]) for variant in VARIANTS))
