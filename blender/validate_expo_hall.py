from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
GLB_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_expo_hall.glb"
REPORT_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_expo_hall_validation.json"

REQUIRED_NODES = {
    "ROOT_ExpoHall",
    "GROUND_ExpoHallFloor",
    "FLOOR_Inlay",
    "WALL_Back",
    "WALL_Left",
    "WALL_Right",
    "WALL_FrontLeft",
    "WALL_FrontRight",
    "FIXTURE_CafeDoorway",
    "DOOR_Post_L",
    "DOOR_Post_R",
    "DOOR_Lintel",
    "DOOR_GlowSign",
    "BEAM_Back",
    "BEAM_Front",
    "BEAM_Left",
    "BEAM_Right",
    "LIGHTSTRIP_01",
    "LIGHTSTRIP_02",
    "LIGHTSTRIP_03",
    "ANCHOR_PlayerSpawn",
    "ANCHOR_CameraFocus",
}

EXPECTED_ANCHORS = {
    "ANCHOR_PlayerSpawn": (0.0, -4.35, 0.0),
    "FIXTURE_CafeDoorway": (0.0, -6.0, 0.0),
}

HALL_WIDTH = 16.0
HALL_DEPTH = 12.0
DOOR_WIDTH = 2.0
MAX_GLB_BYTES = 10 * 1024 * 1024
TRIANGLE_BUDGET = 30000
MATERIAL_BUDGET = 40


def rounded(values: list[float]) -> list[float]:
    return [round(value, 4) for value in values]


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    result = bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF reimport failed: {result}")

    objects = list(bpy.context.scene.objects)
    names = {obj.name for obj in objects}
    missing = sorted(REQUIRED_NODES - names)
    if missing:
        raise RuntimeError(f"Missing required runtime nodes: {missing}")
    leaked = sorted(name for name in names if name.startswith("PREVIEW_"))
    if leaked:
        raise RuntimeError(f"Preview-only nodes leaked into GLB: {leaked}")

    root = bpy.data.objects["ROOT_ExpoHall"]
    if root.matrix_world.translation.length > 0.002:
        raise RuntimeError(f"ROOT_ExpoHall moved from origin: {root.matrix_world.translation}")

    for name, expected in EXPECTED_ANCHORS.items():
        actual = bpy.data.objects[name].matrix_world.translation
        error = (actual - Vector(expected)).length
        if error > 0.012:
            raise RuntimeError(f"{name} at {rounded(list(actual))}, expected {rounded(list(expected))}")

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
        raise RuntimeError(f"Environment triangle budget exceeded: {triangles}")
    if len(materials) > MATERIAL_BUDGET:
        raise RuntimeError(f"Environment material budget exceeded: {len(materials)}")
    if GLB_PATH.stat().st_size > MAX_GLB_BYTES:
        raise RuntimeError(f"GLB exceeds 10MB budget: {GLB_PATH.stat().st_size}")

    # Matte contract: every material keeps roughness >= 0.7.
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
    if abs(size[0] - HALL_WIDTH) > 0.35:
        raise RuntimeError(f"Hall width off contract: {size[0]:.3f} != {HALL_WIDTH}")
    if abs(size[1] - HALL_DEPTH) > 0.35:
        raise RuntimeError(f"Hall depth off contract: {size[1]:.3f} != {HALL_DEPTH}")
    if not (2.5 < size[2] < 4.2):
        raise RuntimeError(f"Hall height out of expected range: {size[2]:.3f}")

    floor = bpy.data.objects["GROUND_ExpoHallFloor"]
    floor_bounds = [floor.matrix_world @ Vector(corner) for corner in floor.bound_box]
    floor_top = max(point.z for point in floor_bounds)
    if abs(floor_top) > 0.002:
        raise RuntimeError(f"Finished floor top must be Z=0: {floor_top:.6f}")

    # Doorway must stay open: front wall segments keep clear of the opening.
    for name, side in (("WALL_FrontLeft", -1), ("WALL_FrontRight", 1)):
        wall = bpy.data.objects[name]
        xs = [(wall.matrix_world @ Vector(corner)).x for corner in wall.bound_box]
        inner_edge = max(xs) if side < 0 else min(xs)
        if abs(inner_edge) < DOOR_WIDTH / 2.0 - 0.01:
            raise RuntimeError(f"{name} intrudes into doorway opening: inner edge x={inner_edge:.3f}")

    report = {
        "schema_version": "echo-expo-hall-validation.v1",
        "file": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "import_status": "ok",
        "root_node": root.name,
        "objects": len(objects),
        "empty_nodes": len([obj for obj in objects if obj.type == "EMPTY"]),
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
        "contract_checks": {
            "root_at_origin": True,
            "ground_mesh_present": True,
            "floor_top_z_m": round(floor_top, 4),
            "hall_footprint_16x12m": True,
            "doorway_opening_clear": True,
            "player_spawn_present": True,
            "cafe_doorway_fixture_present": True,
            "preview_nodes_excluded": True,
            "no_degenerate_triangles": True,
            "triangle_budget": TRIANGLE_BUDGET,
            "material_budget": MATERIAL_BUDGET,
            "all_materials_roughness_gte_0_7": True,
            "glb_size_budget_10mb": True,
        },
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
