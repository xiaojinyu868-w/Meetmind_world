from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
GLB_PATH = PROJECT_ROOT / "public" / "models" / "modules" / "echo_world_booth_template.glb"
REPORT_PATH = PROJECT_ROOT / "public" / "models" / "modules" / "echo_world_booth_template_validation.json"

REQUIRED_NODES = {
    "ROOT_Booth",
    "MESH_TableTop",
    "MESH_BackdropBoard",
    "ANCHOR_PersonStand",
}

# Display surface contract: name -> expected (width, height) of the plane in
# meters. Photo frames lean back 10 degrees, so their world Z extent is
# cos(10deg) * height; tolerance absorbs that.
DISPLAY_SURFACES = {
    "MESH_NamePlate": (1.4, 0.32),
    "MESH_Portrait": (0.8, 1.0),
    "MESH_PhotoFrame_01": (0.7, 0.5),
    "MESH_PhotoFrame_02": (0.7, 0.5),
    "MESH_Backdrop": (1.7, 0.45),
}

TABLE_WIDTH = 1.6
TABLE_DEPTH = 0.7
TABLE_HEIGHT = 0.9
BACKDROP_WIDTH = 2.0
BACKDROP_HEIGHT = 2.2
SIZE_TOLERANCE = 0.07
MAX_GLB_BYTES = 2 * 1024 * 1024
TRIANGLE_BUDGET = 15000


def rounded(values: list[float]) -> list[float]:
    return [round(value, 4) for value in values]


def world_size(obj: bpy.types.Object) -> Vector:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return Vector(
        max(corner[axis] for corner in corners) - min(corner[axis] for corner in corners)
        for axis in range(3)
    )


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    result = bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF reimport failed: {result}")

    objects = list(bpy.context.scene.objects)
    names = {obj.name for obj in objects}
    missing = sorted((REQUIRED_NODES | set(DISPLAY_SURFACES)) - names)
    if missing:
        raise RuntimeError(f"Missing required nodes: {missing}")
    leaked = sorted(name for name in names if name.startswith("PREVIEW_"))
    if leaked:
        raise RuntimeError(f"Preview-only nodes leaked into GLB: {leaked}")

    root = bpy.data.objects["ROOT_Booth"]
    if root.matrix_world.translation.length > 0.002:
        raise RuntimeError(f"ROOT_Booth moved from origin: {root.matrix_world.translation}")

    # Display surfaces: world-space size, dedicated material, clean UVs.
    measured: dict[str, dict[str, float | str]] = {}
    display_materials: set[str] = set()
    for name, (expected_w, expected_h) in DISPLAY_SURFACES.items():
        obj = bpy.data.objects[name]
        if obj.type != "MESH":
            raise RuntimeError(f"{name} must be a mesh")
        size = world_size(obj)
        # Front-facing planes keep width on X and height on (tilted) Z.
        width_error = abs(size.x - expected_w)
        height_error = abs(size.z - expected_h)
        if width_error > SIZE_TOLERANCE:
            raise RuntimeError(f"{name} width {size.x:.3f} outside {expected_w}+-{SIZE_TOLERANCE}")
        if height_error > SIZE_TOLERANCE:
            raise RuntimeError(f"{name} height {size.z:.3f} outside {expected_h}+-{SIZE_TOLERANCE}")
        slots = [slot.material for slot in obj.material_slots if slot.material is not None]
        if len(slots) != 1:
            raise RuntimeError(f"{name} must carry exactly one material, got {len(slots)}")
        display_materials.add(slots[0].name)
        if not obj.data.uv_layers:
            raise RuntimeError(f"{name} has no UV layer for texture replacement")
        measured[name] = {
            "width_m": round(size.x, 4),
            "height_m": round(size.z, 4),
            "material": slots[0].name,
        }
    if len(display_materials) != len(DISPLAY_SURFACES):
        raise RuntimeError(f"Display surfaces must use distinct materials: {sorted(display_materials)}")

    # Structural size contract.
    table = bpy.data.objects["MESH_TableTop"]
    table_size = world_size(table)
    table_top_z = max((table.matrix_world @ Vector(corner)).z for corner in table.bound_box)
    if abs(table_size.x - TABLE_WIDTH) > SIZE_TOLERANCE or abs(table_size.y - TABLE_DEPTH) > SIZE_TOLERANCE:
        raise RuntimeError(f"Table size off contract: {rounded(list(table_size))}")
    if abs(table_top_z - TABLE_HEIGHT) > 0.02:
        raise RuntimeError(f"Table top must be Z={TABLE_HEIGHT}: {table_top_z:.4f}")
    backdrop = bpy.data.objects["MESH_BackdropBoard"]
    backdrop_size = world_size(backdrop)
    if abs(backdrop_size.x - BACKDROP_WIDTH) > SIZE_TOLERANCE or abs(backdrop_size.z - BACKDROP_HEIGHT) > SIZE_TOLERANCE:
        raise RuntimeError(f"Backdrop size off contract: {rounded(list(backdrop_size))}")

    meshes = [obj for obj in objects if obj.type == "MESH"]
    materials = {
        slot.material.name
        for obj in meshes
        for slot in obj.material_slots
        if slot.material is not None
    }
    vertices = 0
    triangles = 0
    degenerate_triangles = 0
    bounds: list[Vector] = []
    for obj in meshes:
        vertices += len(obj.data.vertices)
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
        for triangle in obj.data.loop_triangles:
            points = [obj.matrix_world @ obj.data.vertices[index].co for index in triangle.vertices]
            area = (points[1] - points[0]).cross(points[2] - points[0]).length * 0.5
            if area < 1e-10:
                degenerate_triangles += 1
        bounds.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)

    if not bounds or not meshes or vertices == 0 or triangles == 0:
        raise RuntimeError("Imported GLB contains no usable geometry")
    if degenerate_triangles:
        raise RuntimeError(f"GLB contains {degenerate_triangles} degenerate triangles")
    if triangles > TRIANGLE_BUDGET:
        raise RuntimeError(f"Booth triangle budget exceeded: {triangles}")
    if GLB_PATH.stat().st_size > MAX_GLB_BYTES:
        raise RuntimeError(f"GLB exceeds 2MB budget: {GLB_PATH.stat().st_size}")

    low_roughness = []
    for material_name in materials:
        material = bpy.data.materials[material_name]
        bsdf = material.node_tree.nodes.get("Principled BSDF") if material.use_nodes else None
        if bsdf is not None and bsdf.inputs["Roughness"].default_value < 0.7 - 1e-3:
            low_roughness.append(material_name)
    if low_roughness:
        raise RuntimeError(f"Materials below roughness 0.7: {low_roughness}")

    minimum = [min(point[axis] for point in bounds) for axis in range(3)]
    maximum = [max(point[axis] for point in bounds) for axis in range(3)]
    size = [maximum[index] - minimum[index] for index in range(3)]

    report = {
        "schema_version": "echo-booth-template-validation.v1",
        "file": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "import_status": "ok",
        "root_node": root.name,
        "objects": len(objects),
        "mesh_objects": len(meshes),
        "vertices": vertices,
        "triangles": triangles,
        "degenerate_triangles": degenerate_triangles,
        "material_count": len(materials),
        "glb_bytes": GLB_PATH.stat().st_size,
        "bounds_after_reimport": {
            "min_xyz": rounded(minimum),
            "max_xyz": rounded(maximum),
            "size_xyz": rounded(size),
        },
        "display_surfaces": measured,
        "contract_checks": {
            "root_at_origin": True,
            "all_5_display_meshes_present": True,
            "display_sizes_within_tolerance": True,
            "display_materials_distinct": True,
            "display_meshes_have_uvs": True,
            "table_size_1_6x0_7x0_9": True,
            "backdrop_size_2_0x2_2": True,
            "person_stand_anchor_present": True,
            "preview_nodes_excluded": True,
            "no_degenerate_triangles": True,
            "triangle_budget": TRIANGLE_BUDGET,
            "all_materials_roughness_gte_0_7": True,
            "glb_size_budget_2mb": True,
        },
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
