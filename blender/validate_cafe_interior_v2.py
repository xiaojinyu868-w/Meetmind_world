"""EchoWorld 咖啡厅室内 v2 回导校验。

契约检查（与 src/runtime/CafeLayout.js / backend/app/world/tables.py 同源）：
  ROOT_Cafe / GROUND_CafeFloor / ANCHOR_PlayerSpawn / INTERACT_CentralTable /
  TABLE_Central6 / TABLE_2_01..02 / TABLE_4_01..02 / 18 个 SEAT_* 节点全部在位，
  且位置与契约坐标误差 ≤ 0.01m、座高 0.46m；无预览泄漏；预算内。
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
GLB_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_cafe_interior_v2.glb"
REPORT_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_cafe_interior_v2_validation.json"

SEAT_H = 0.46
SEAT_TOLERANCE = 0.01

EXPECTED_SEATS = {
    "SEAT_Central6_04": (0.0, 1.57),
    "SEAT_Central6_03": (1.36, 0.785),
    "SEAT_Central6_02": (1.36, -0.785),
    "SEAT_Central6_01": (0.0, -1.57),
    "SEAT_Central6_06": (-1.36, -0.785),
    "SEAT_Central6_05": (-1.36, 0.785),
    "SEAT_2_01_01": (-4.53, -1.55),
    "SEAT_2_01_02": (-2.77, -1.55),
    "SEAT_2_02_01": (-4.53, 1.55),
    "SEAT_2_02_02": (-2.77, 1.55),
    "SEAT_4_01_01": (2.89, -0.53),
    "SEAT_4_01_02": (3.67, -0.53),
    "SEAT_4_01_03": (2.89, -2.17),
    "SEAT_4_01_04": (3.67, -2.17),
    "SEAT_4_02_01": (2.89, 2.47),
    "SEAT_4_02_02": (3.67, 2.47),
    "SEAT_4_02_03": (2.89, 0.83),
    "SEAT_4_02_04": (3.67, 0.83),
}

REQUIRED_NODES = {
    "ROOT_Cafe", "GROUND_CafeFloor", "ANCHOR_PlayerSpawn", "INTERACT_CentralTable",
    "TABLE_Central6", "TABLE_2_01", "TABLE_2_02", "TABLE_4_01", "TABLE_4_02",
    "WALL_North", "BAR_FootRail", "DOOR_Panel", "FIXTURE_CafeExitDoor",
}

MAX_GLB_BYTES = 8 * 1024 * 1024
TRIANGLE_BUDGET = 60000


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    result = bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF reimport failed: {result}")

    objects = list(bpy.context.scene.objects)
    names = {obj.name for obj in objects}
    missing = sorted((REQUIRED_NODES | set(EXPECTED_SEATS)) - names)
    if missing:
        raise RuntimeError(f"Missing required nodes: {missing}")
    leaked = sorted(name for name in names if name.startswith("PREVIEW_"))
    if leaked:
        raise RuntimeError(f"Preview-only nodes leaked into GLB: {leaked}")

    seat_report = {}
    max_error = 0.0
    for name, (expected_x, expected_z) in EXPECTED_SEATS.items():
        obj = bpy.data.objects[name]
        world = obj.matrix_world.translation
        # glTF→Blender 导入：高度进 Blender z；glTF z（南北）进 Blender ±y（取两种符号中较小的误差）
        error_xz = min(
            math.hypot(world.x - expected_x, world.y - expected_z),
            math.hypot(world.x - expected_x, world.y + expected_z),
        )
        error_h = abs(world.z - SEAT_H)
        seat_report[name] = {"x": round(world.x, 4), "y_blender": round(world.y, 4), "height": round(world.z, 4)}
        max_error = max(max_error, error_xz)
        if error_xz > SEAT_TOLERANCE:
            raise RuntimeError(f"{name} 位置误差 {error_xz:.4f}m 超差（期望 x={expected_x} z={expected_z}）")
        if error_h > SEAT_TOLERANCE:
            raise RuntimeError(f"{name} 座高 {world.z:.4f} ≠ {SEAT_H}")

    meshes = [obj for obj in objects if obj.type == "MESH"]
    vertices = sum(len(obj.data.vertices) for obj in meshes)
    triangles = 0
    degenerate = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
        for triangle in obj.data.loop_triangles:
            points = [obj.matrix_world @ obj.data.vertices[index].co for index in triangle.vertices]
            area = (points[1] - points[0]).cross(points[2] - points[0]).length * 0.5
            if area < 1e-10:
                degenerate += 1
    if not meshes or vertices == 0 or triangles == 0:
        raise RuntimeError("Imported GLB contains no usable geometry")
    if degenerate:
        raise RuntimeError(f"GLB contains {degenerate} degenerate triangles")
    if triangles > TRIANGLE_BUDGET:
        raise RuntimeError(f"Cafe interior triangle budget exceeded: {triangles}")
    if GLB_PATH.stat().st_size > MAX_GLB_BYTES:
        raise RuntimeError(f"GLB exceeds 8MB budget: {GLB_PATH.stat().st_size}")

    report = {
        "schema_version": "echo-cafe-interior-validation.v2",
        "file": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "import_status": "ok",
        "objects": len(objects),
        "mesh_objects": len(meshes),
        "vertices": vertices,
        "triangles": triangles,
        "glb_bytes": GLB_PATH.stat().st_size,
        "seat_count": len(EXPECTED_SEATS),
        "seat_max_error_m": round(max_error, 5),
        "seats": seat_report,
        "contract_checks": {
            "required_nodes_present": True,
            "all_18_seats_within_0_01m": True,
            "seat_height_0_46": True,
            "preview_nodes_excluded": True,
            "no_degenerate_triangles": True,
            "triangle_budget": TRIANGLE_BUDGET,
            "glb_size_budget_8mb": True,
        },
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("import_status", "seat_count", "seat_max_error_m", "triangles", "glb_bytes")}, indent=2))


if __name__ == "__main__":
    main()
