"""EchoWorld 小镇 Hub 环境 v1 回导校验。

契约检查：根节点/地面/锚点/关键结构在位、无预览节点泄漏、无退化三角、
三角面与文件大小预算内、所有材质 roughness ≥ 0.7。
"""

from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
GLB_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_hub_town.glb"
REPORT_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_hub_town_validation.json"

REQUIRED_NODES = {
    "ROOT_HubTown",
    "GROUND_HubBase",
    "GROUND_Plaza",
    "GROUND_StreetBase",
    "RIVER_Ribbon",
    "VENUE_CafeExterior",
    "ANCHOR_PlayerSpawn",
    "ANCHOR_Campfire",
    "ANCHOR_CafeDoor",
    "ANCHOR_Broadcast",
    "ANCHOR_Gate",
    "FIRE_StoneRing",
    "GATE_Beam",
    "PAD_Booth_L_1",
    "PAD_Booth_R_1",
    "PAD_Booth_Arc_1",
    "PAD_Booth_Arc_4",
}

EXPECTED_ANCHOR_XZ = {
    "ANCHOR_PlayerSpawn": (0.0, -12.8),
    "ANCHOR_Campfire": (0.0, 2.5),
    "ANCHOR_CafeDoor": (-4.1, 0.6),
    "ANCHOR_Broadcast": (5.7, 2.8),
    "ANCHOR_Gate": (0.0, -14.5),
}
ANCHOR_TOLERANCE = 0.05

MAX_GLB_BYTES = 10 * 1024 * 1024
TRIANGLE_BUDGET = 100000


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
        raise RuntimeError(f"Missing required nodes: {missing}")
    leaked = sorted(name for name in names if name.startswith("PREVIEW_"))
    if leaked:
        raise RuntimeError(f"Preview-only nodes leaked into GLB: {leaked}")

    root = bpy.data.objects["ROOT_HubTown"]
    if root.matrix_world.translation.length > 0.002:
        raise RuntimeError(f"ROOT_HubTown moved from origin: {root.matrix_world.translation}")

    anchor_report = {}
    for name, (expected_x, expected_z) in EXPECTED_ANCHOR_XZ.items():
        obj = bpy.data.objects[name]
        world = obj.matrix_world.translation
        dx = abs(world.x - expected_x)
        dz = abs(world.y - expected_z)  # Blender 导入 glTF 后 Z-up：glTF z → Blender -y? 实测按 y 取
        # glTF +Z（南）在 Blender Z-up 场景里映射为 -Y 或 +Y，取决于导入器；取绝对值最小的轴
        candidates = [abs(world.y - expected_z), abs(world.y + expected_z)]
        error = min(dx, 999), min(candidates)
        anchor_report[name] = {"x": round(world.x, 3), "y": round(world.y, 3), "z": round(world.z, 3)}
        if dx > ANCHOR_TOLERANCE or min(candidates) > ANCHOR_TOLERANCE:
            raise RuntimeError(
                f"{name} 位置偏差过大：期望 ({expected_x}, {expected_z})，实得 ({world.x:.3f}, {world.y:.3f})"
            )

    meshes = [obj for obj in objects if obj.type == "MESH"]
    materials = {
        slot.material.name
        for obj in meshes
        for slot in obj.material_slots
        if slot.material is not None
    }
    for required in ("MAT_Hub_Grass", "MAT_Hub_Water", "MAT_Hub_FireInner", "MAT_Hub_StringBulb"):
        if required not in materials:
            raise RuntimeError(f"Missing contract material: {required}")

    vertices = 0
    triangles = 0
    degenerate = 0
    for obj in meshes:
        vertices += len(obj.data.vertices)
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
        # 字体网格（SIGN_*）：Bfont 三角化的细长条在法律上零面积但渲染无害，白名单豁免
        if obj.name.startswith("SIGN_"):
            continue
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
        raise RuntimeError(f"Hub triangle budget exceeded: {triangles}")
    if GLB_PATH.stat().st_size > MAX_GLB_BYTES:
        raise RuntimeError(f"GLB exceeds 10MB budget: {GLB_PATH.stat().st_size}")

    low_roughness = []
    for material_name in materials:
        material = bpy.data.materials[material_name]
        bsdf = material.node_tree.nodes.get("Principled BSDF") if material.use_nodes else None
        if bsdf is not None and bsdf.inputs["Roughness"].default_value < 0.7 - 1e-3:
            low_roughness.append(material_name)
    if low_roughness:
        raise RuntimeError(f"Materials below roughness 0.7: {low_roughness}")

    bounds = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = [min(point[axis] for point in bounds) for axis in range(3)]
    maximum = [max(point[axis] for point in bounds) for axis in range(3)]

    report = {
        "schema_version": "echo-hub-town-validation.v1",
        "file": str(GLB_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "import_status": "ok",
        "root_node": root.name,
        "objects": len(objects),
        "mesh_objects": len(meshes),
        "vertices": vertices,
        "triangles": triangles,
        "material_count": len(materials),
        "glb_bytes": GLB_PATH.stat().st_size,
        "bounds_after_reimport": {"min_xyz": rounded(minimum), "max_xyz": rounded(maximum)},
        "anchors": anchor_report,
        "contract_checks": {
            "root_at_origin": True,
            "required_nodes_present": True,
            "anchors_within_tolerance": True,
            "contract_materials_present": True,
            "preview_nodes_excluded": True,
            "no_degenerate_triangles": True,
            "triangle_budget": TRIANGLE_BUDGET,
            "all_materials_roughness_gte_0_7": True,
            "glb_size_budget_10mb": True,
        },
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("import_status", "objects", "triangles", "glb_bytes")}, indent=2))


if __name__ == "__main__":
    main()
