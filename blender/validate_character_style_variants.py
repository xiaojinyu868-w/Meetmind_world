from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXPORT_DIR = PROJECT_ROOT / "exports"
RUNTIME_DIR = PROJECT_ROOT / "public" / "models" / "characters"
VARIANTS = (
    ("reference-lowpoly", "echo_world_faceless_reference.glb"),
    ("painterly-adventure", "echo_world_faceless_painterly.glb"),
)
FORBIDDEN_FACE_TOKENS = ("eye", "brow", "nose", "mouth", "lip", "beard", "mustache")


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    result = [root]
    for child in root.children:
        result.extend(descendants(child))
    return result


def validate(style_id: str, filename: str) -> dict[str, object]:
    reset_scene()
    glb_path = RUNTIME_DIR / filename
    if not glb_path.exists():
        raise FileNotFoundError(glb_path)
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    root = bpy.data.objects.get("ROOT_FacelessCharacter")
    if root is None:
        raise RuntimeError(f"Missing ROOT_FacelessCharacter: {filename}")

    objects = descendants(root)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    world_points = [
        obj.matrix_world @ Vector(corner)
        for obj in meshes
        for corner in obj.bound_box
    ]
    minimum = Vector((
        min(point.x for point in world_points),
        min(point.y for point in world_points),
        min(point.z for point in world_points),
    ))
    maximum = Vector((
        max(point.x for point in world_points),
        max(point.y for point in world_points),
        max(point.z for point in world_points),
    ))
    triangles = sum(
        len(polygon.vertices) - 2
        for obj in meshes
        for polygon in obj.data.polygons
    )
    forbidden = sorted(
        obj.name
        for obj in objects
        if any(token in obj.name.lower() for token in FORBIDDEN_FACE_TOKENS)
    )
    materials = sorted({
        slot.material.name
        for obj in meshes
        for slot in obj.material_slots
        if slot.material is not None
    })
    height = maximum.z - minimum.z
    report = {
        "style_variant": style_id,
        "file": str(glb_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "root_node": root.name,
        "face_mode": root.get("face_mode"),
        "declared_height_m": root.get("height_m"),
        "bounds_m": {
            "min_xyz": [round(value, 5) for value in minimum],
            "max_xyz": [round(value, 5) for value in maximum],
            "height": round(height, 5),
        },
        "mesh_objects": len(meshes),
        "triangles": triangles,
        "materials": materials,
        "checks": {
            "root_present": True,
            "featureless_metadata": root.get("face_mode") == "featureless",
            "no_face_feature_nodes": not forbidden,
            "forbidden_nodes": forbidden,
            "height_in_range": 1.60 <= height <= 1.72,
            "triangle_budget": triangles <= 2500,
        },
    }
    report["ok"] = all(
        value
        for key, value in report["checks"].items()
        if key != "forbidden_nodes"
    )
    return report


reports = [validate(style_id, filename) for style_id, filename in VARIANTS]
output_path = EXPORT_DIR / "echo_world_character_style_variants_validation.json"
output_path.write_text(json.dumps({"variants": reports}, ensure_ascii=False, indent=2), encoding="utf-8")
if not all(report["ok"] for report in reports):
    raise RuntimeError(json.dumps(reports, ensure_ascii=False, indent=2))
print(json.dumps({"output": str(output_path), "variants": reports}, ensure_ascii=False, indent=2))
