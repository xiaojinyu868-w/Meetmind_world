from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
GLB_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_storybook_cafe.glb"
REPORT_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_storybook_cafe_validation.json"

EXPECTED_POSITIONS = {
    "ANCHOR_PlayerSpawn": (0.0, -4.15, 0.0),
    "SEAT_Central6_01": (0.0, 1.57, 0.46),
    "SEAT_Central6_02": (1.36, 0.785, 0.46),
    "SEAT_Central6_03": (1.36, -0.785, 0.46),
    "SEAT_Central6_04": (0.0, -1.57, 0.46),
    "SEAT_Central6_05": (-1.36, -0.785, 0.46),
    "SEAT_Central6_06": (-1.36, 0.785, 0.46),
    "SEAT_2_01_01": (-4.53, 1.55, 0.46),
    "SEAT_2_01_02": (-2.77, 1.55, 0.46),
    "SEAT_2_02_01": (-4.53, -1.55, 0.46),
    "SEAT_2_02_02": (-2.77, -1.55, 0.46),
    "SEAT_4_01_01": (2.89, 0.53, 0.46),
    "SEAT_4_01_02": (3.67, 0.53, 0.46),
    "SEAT_4_01_03": (2.89, 2.17, 0.46),
    "SEAT_4_01_04": (3.67, 2.17, 0.46),
    "SEAT_4_02_01": (2.89, -2.47, 0.46),
    "SEAT_4_02_02": (3.67, -2.47, 0.46),
    "SEAT_4_02_03": (2.89, -0.83, 0.46),
    "SEAT_4_02_04": (3.67, -0.83, 0.46),
}

REQUIRED_NODES = {
    "ROOT_Cafe",
    "GROUND_CafeFloor",
    "TABLE_Central6",
    "TABLE_2_01",
    "TABLE_2_02",
    "TABLE_4_01",
    "TABLE_4_02",
    "INTERACT_CentralTable",
    "FIXTURE_CoffeeBar",
    "FIXTURE_CoffeeMachine",
    "FIXTURE_MenuBoard",
    "FIXTURE_Window_01",
    "FIXTURE_Window_02",
    "FIXTURE_Entrance",
    "FIXTURE_Pendant_Central",
    "FIXTURE_Pendant_Left",
    "FIXTURE_Pendant_Right",
    *EXPECTED_POSITIONS.keys(),
}


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
    leaked = sorted(name for name in names if name.startswith("PREVIEW_") or name.startswith("STORYBOOK_Preview"))
    if leaked:
        raise RuntimeError(f"Preview-only nodes leaked into GLB: {leaked}")

    root = bpy.data.objects["ROOT_Cafe"]
    if root.matrix_world.translation.length > 0.002:
        raise RuntimeError(f"ROOT_Cafe moved from origin: {root.matrix_world.translation}")
    if bpy.data.objects["GROUND_CafeFloor"].type != "MESH":
        raise RuntimeError("GROUND_CafeFloor must remain a mesh")

    anchor_errors: dict[str, dict[str, list[float] | float]] = {}
    maximum_anchor_error = 0.0
    for name, expected in EXPECTED_POSITIONS.items():
        actual = bpy.data.objects[name].matrix_world.translation
        error = (actual - Vector(expected)).length
        maximum_anchor_error = max(maximum_anchor_error, error)
        if error > 0.012:
            anchor_errors[name] = {
                "expected": rounded(list(expected)),
                "actual": rounded(list(actual)),
                "error_m": round(error, 6),
            }
    if anchor_errors:
        raise RuntimeError(f"Anchor coordinate contract mismatch: {anchor_errors}")

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
    degenerate_by_mesh: dict[str, int] = {}
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
                degenerate_by_mesh[obj.name] = degenerate_by_mesh.get(obj.name, 0) + 1
        bounds.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)

    if not bounds or not meshes or vertices == 0 or triangles == 0:
        raise RuntimeError("Imported GLB contains no usable geometry")
    if degenerate_triangles:
        worst = sorted(degenerate_by_mesh.items(), key=lambda item: item[1], reverse=True)[:30]
        raise RuntimeError(
            f"GLB contains {degenerate_triangles} degenerate triangles; worst meshes: {worst}"
        )
    if triangles > 30000:
        raise RuntimeError(f"Environment triangle budget exceeded: {triangles}")
    if len(materials) > 56:
        raise RuntimeError(f"Environment material budget exceeded: {len(materials)}")

    minimum = [min(point[axis] for point in bounds) for axis in range(3)]
    maximum = [max(point[axis] for point in bounds) for axis in range(3)]
    size = [maximum[index] - minimum[index] for index in range(3)]
    floor = bpy.data.objects["GROUND_CafeFloor"]
    floor_bounds = [floor.matrix_world @ Vector(corner) for corner in floor.bound_box]
    floor_top = max(point.z for point in floor_bounds)
    if abs(floor_top) > 0.002:
        raise RuntimeError(f"Finished floor top must be Z=0: {floor_top:.6f}")

    report = {
        "schema_version": "echo-storybook-cafe-validation.v1",
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
            "all_18_seats_present": True,
            "all_18_seats_at_expected_coordinates": True,
            "maximum_anchor_error_m": round(maximum_anchor_error, 6),
            "player_spawn_present": True,
            "five_tables_present": True,
            "central_interaction_present": True,
            "required_fixtures_present": True,
            "preview_nodes_excluded": True,
            "no_degenerate_triangles": True,
            "triangle_budget_30000": True,
            "material_budget_56": True,
        },
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
