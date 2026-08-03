from __future__ import annotations

import hashlib
import json
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
STEM = "echo_world_cafe_reference-lowpoly-v2"
GLB_PATH = PROJECT_ROOT / "exports" / f"{STEM}.glb"
RUNTIME_GLB_PATH = PROJECT_ROOT / "public" / "models" / f"{STEM}.glb"
REPORT_PATH = PROJECT_ROOT / "exports" / f"{STEM}_validation.json"

EXPECTED_POSITIONS: dict[str, tuple[float, float, float]] = {
    "ROOT_Cafe": (0.0, 0.0, 0.0),
    "ANCHOR_PlayerSpawn": (0.0, -4.15, 0.0),
    "TABLE_Central6": (0.0, 0.0, 0.0),
    "INTERACT_CentralTable": (0.0, -1.18, 0.92),
    "TABLE_2_01": (-3.65, 1.55, 0.0),
    "TABLE_2_02": (-3.65, -1.55, 0.0),
    "TABLE_4_01": (3.28, 1.35, 0.0),
    "TABLE_4_02": (3.28, -1.65, 0.0),
    "SEAT_Central6_01": (0.0, 1.57, 0.46),
    "SEAT_Central6_02": (1.35966, 0.785, 0.46),
    "SEAT_Central6_03": (1.35966, -0.785, 0.46),
    "SEAT_Central6_04": (0.0, -1.57, 0.46),
    "SEAT_Central6_05": (-1.35966, -0.785, 0.46),
    "SEAT_Central6_06": (-1.35966, 0.785, 0.46),
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

REQUIRED_FIXTURES = {
    "GROUND_CafeFloor",
    "FIXTURE_CoffeeBar",
    "FIXTURE_CoffeeMachine",
    "FIXTURE_MenuBoard",
    "FIXTURE_Window_01",
    "FIXTURE_Window_02",
    "FIXTURE_Entrance",
    "FIXTURE_Pendant_Central",
    "FIXTURE_Pendant_Left",
    "FIXTURE_Pendant_Right",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rounded(vector: Vector | list[float]) -> list[float]:
    return [round(float(value), 4) for value in vector]


def main() -> None:
    if not GLB_PATH.exists() or not RUNTIME_GLB_PATH.exists():
        raise RuntimeError("Missing exported or runtime reference-lowpoly-v2 GLB")
    export_hash = sha256(GLB_PATH)
    runtime_hash = sha256(RUNTIME_GLB_PATH)
    if export_hash != runtime_hash:
        raise RuntimeError("Runtime GLB is not byte-identical to the validated export")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    result = bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF import failed: {result}")

    objects = list(bpy.context.scene.objects)
    names = {obj.name for obj in objects}
    meshes = [obj for obj in objects if obj.type == "MESH"]
    materials = {
        slot.material.name
        for obj in meshes
        for slot in obj.material_slots
        if slot.material is not None
    }
    missing = sorted((set(EXPECTED_POSITIONS) | REQUIRED_FIXTURES) - names)
    if missing:
        raise RuntimeError(f"Missing required compatibility nodes: {missing}")
    if bpy.data.objects["GROUND_CafeFloor"].type != "MESH":
        raise RuntimeError("GROUND_CafeFloor must remain a mesh")
    preview_leaks = sorted(name for name in names if "PREVIEW" in name or "PreviewOnly" in name)
    if preview_leaks:
        raise RuntimeError(f"Preview nodes leaked into GLB: {preview_leaks}")

    position_errors: dict[str, dict[str, list[float]]] = {}
    actual_positions: dict[str, list[float]] = {}
    for name, expected_tuple in EXPECTED_POSITIONS.items():
        actual = bpy.data.objects[name].matrix_world.translation
        expected = Vector(expected_tuple)
        actual_positions[name] = rounded(actual)
        if (actual - expected).length > 0.0015:
            position_errors[name] = {"expected": rounded(expected), "actual": rounded(actual)}
    if position_errors:
        raise RuntimeError(f"Cafe v1 anchor compatibility regression: {position_errors}")

    seat_names = sorted(name for name in EXPECTED_POSITIONS if name.startswith("SEAT_"))
    if len(seat_names) != 18:
        raise RuntimeError(f"Expected 18 seat anchors, got {len(seat_names)}")
    invalid_seat_nodes = [name for name in seat_names if bpy.data.objects[name].type != "EMPTY"]
    if invalid_seat_nodes:
        raise RuntimeError(f"Seat anchors must remain empty transform nodes: {invalid_seat_nodes}")

    required_palette = {
        "MAT_V2_Grass",
        "MAT_V2_GrassLight",
        "MAT_V2_Mustard",
        "MAT_V2_Wood",
        "MAT_V2_WoodLight",
    }
    palette_missing = sorted(required_palette - materials)
    if palette_missing:
        raise RuntimeError(f"Reference palette missing from GLB: {palette_missing}")

    vertex_count = 0
    triangle_count = 0
    bounds: list[Vector] = []
    for obj in meshes:
        vertex_count += len(obj.data.vertices)
        obj.data.calc_loop_triangles()
        triangle_count += len(obj.data.loop_triangles)
        bounds.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not bounds:
        raise RuntimeError("Imported reference-lowpoly-v2 GLB contains no renderable geometry")
    minimum = [min(point[axis] for point in bounds) for axis in range(3)]
    maximum = [max(point[axis] for point in bounds) for axis in range(3)]
    size = [maximum[index] - minimum[index] for index in range(3)]
    if not 11.99 <= size[0] <= 12.01 or not 9.99 <= size[1] <= 10.01:
        raise RuntimeError(f"Unexpected room footprint: {size}")
    if not -0.47 <= minimum[2] <= -0.45:
        raise RuntimeError(f"Unexpected diorama base: min Z={minimum[2]:.4f}")
    if not 3.39 <= maximum[2] <= 3.41:
        raise RuntimeError(f"Unexpected room height: max Z={maximum[2]:.4f}")

    report = {
        "version": "reference-lowpoly-v2",
        "file": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "runtime_file": str(RUNTIME_GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "import_status": "ok",
        "sha256": export_hash,
        "runtime_copy_byte_identical": True,
        "anchor_contract": {
            "status": "compatible with cafe v1",
            "positions_tolerance_m": 0.0015,
            "checked_nodes": len(EXPECTED_POSITIONS),
            "seat_anchors": 18,
            "table_anchors": 5,
            "positions_xyz": actual_positions,
        },
        "objects": len(objects),
        "mesh_objects": len(meshes),
        "materials": sorted(materials),
        "material_count": len(materials),
        "vertices": vertex_count,
        "triangles": triangle_count,
        "bounds_blender_after_reimport": {
            "min_xyz": rounded(minimum),
            "max_xyz": rounded(maximum),
            "size_xyz": rounded(size),
        },
        "checks": {
            "ground_mesh_present": True,
            "player_spawn_compatible": True,
            "table_and_seat_names_compatible": True,
            "table_and_seat_positions_compatible": True,
            "seat_height_m": 0.46,
            "table_height_m": 0.76,
            "reference_palette_present": True,
            "preview_nodes_excluded": True,
            "runtime_copy_verified": True,
        },
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
