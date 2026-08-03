from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
GLB_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_market_street.glb"
REPORT_PATH = PROJECT_ROOT / "public" / "models" / "echo_world_market_street_validation.json"

REQUIRED_NODES = {
    "ROOT_MarketStreet",
    "GROUND_MarketStreet",
    "ANCHOR_PlayerSpawn",
    "ANCHOR_CameraFocus",
    "FIXTURE_CafeDoorway",
    "FIXTURE_PinkTent",
    "FIXTURE_FabricRack",
    "DOOR_Post_L",
    "DOOR_Post_R",
    "DOOR_Lintel",
    "DOOR_GlowSign",
    "TENT_Wall",
    "TENT_Roof",
    *(f"FIXTURE_LampPost_{index:02d}" for index in range(1, 5)),
    *(f"LAMP_{index:02d}_Glow" for index in range(1, 5)),
    *(f"STALL_{side}{index}_Deck" for side in ("L", "R") for index in range(1, 4) if not (side == "R" and index == 3)),
}

EXPECTED_ANCHORS = {
    "ANCHOR_PlayerSpawn": (0.0, -9.0, 0.0),
    "FIXTURE_CafeDoorway": (0.0, 10.4, 0.0),
}

REQUIRED_MATERIALS = {
    "MAT_Market_AwningRed",
    "MAT_Market_AwningWhite",
    "MAT_Market_TentPink",
    "MAT_Market_LampGlow",
    "MAT_Market_StoneA",
    "MAT_Market_LeafDark",
    "MAT_Market_LeafMid",
}

MAX_GLB_BYTES = 10 * 1024 * 1024
TRIANGLE_BUDGET = 60000
MATERIAL_BUDGET = 48


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

    root = bpy.data.objects["ROOT_MarketStreet"]
    if root.matrix_world.translation.length > 0.002:
        raise RuntimeError(f"ROOT_MarketStreet moved from origin: {root.matrix_world.translation}")

    for name, expected in EXPECTED_ANCHORS.items():
        actual = bpy.data.objects[name].matrix_world.translation
        error = (actual - Vector(expected)).length
        if error > 0.012:
            raise RuntimeError(f"{name} at {rounded(list(actual))}, expected {rounded(list(expected))}")

    stone_count = len([name for name in names if name.startswith("STONE_")])
    flag_count = len([name for name in names if name.startswith("FLAG_")])
    tree_count = len([name for name in names if name.startswith("TREE_") and name.endswith("_Trunk")])
    valance_count = len([name for name in names if "Awning_Valance" in name])
    if stone_count < 40:
        raise RuntimeError(f"Too few path stones: {stone_count}")
    if flag_count < 40:
        raise RuntimeError(f"Too few bunting flags: {flag_count}")
    if tree_count < 8:
        raise RuntimeError(f"Too few trees: {tree_count}")
    if valance_count < 30:
        raise RuntimeError(f"Too few awning valance triangles: {valance_count}")

    meshes = [obj for obj in objects if obj.type == "MESH"]
    materials = {
        slot.material.name
        for obj in meshes
        for slot in obj.material_slots
        if slot.material is not None
    }
    missing_materials = sorted(REQUIRED_MATERIALS - materials)
    if missing_materials:
        raise RuntimeError(f"Missing contract materials: {missing_materials}")

    # Lamp bulbs must be emissive.
    glow = bpy.data.materials["MAT_Market_LampGlow"]
    bsdf = glow.node_tree.nodes.get("Principled BSDF")
    strength_socket = bsdf.inputs.get("Emission Strength")
    if strength_socket is None or strength_socket.default_value < 1.0:
        raise RuntimeError("MAT_Market_LampGlow lost its emission strength")

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
        raise RuntimeError(f"Street triangle budget exceeded: {triangles}")
    if len(materials) > MATERIAL_BUDGET:
        raise RuntimeError(f"Street material budget exceeded: {len(materials)}")
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

    minimum = [min(point[axis] for point in bounds) for axis in range(3)]
    maximum = [max(point[axis] for point in bounds) for axis in range(3)]
    size = [maximum[index] - minimum[index] for index in range(3)]
    if size[0] > 24.0 or size[1] > 26.0:
        raise RuntimeError(f"Street footprint larger than expected: {rounded(size)}")
    if size[0] < 12.0 or size[1] < 20.0:
        raise RuntimeError(f"Street footprint smaller than contract: {rounded(size)}")
    if not (4.0 < size[2] < 9.5):
        raise RuntimeError(f"Street height out of expected range: {size[2]:.3f}")

    ground = bpy.data.objects["GROUND_MarketStreet"]
    ground_bounds = [ground.matrix_world @ Vector(corner) for corner in ground.bound_box]
    ground_top = max(point.z for point in ground_bounds)
    if abs(ground_top) > 0.002:
        raise RuntimeError(f"Ground top must be Z=0: {ground_top:.6f}")

    report = {
        "schema_version": "echo-market-street-validation.v1",
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
        "feature_counts": {
            "path_stones": stone_count,
            "bunting_flags": flag_count,
            "trees": tree_count,
            "awning_valance_triangles": valance_count,
        },
        "bounds_after_reimport": {
            "min_xyz": rounded(minimum),
            "max_xyz": rounded(maximum),
            "size_xyz": rounded(size),
        },
        "contract_checks": {
            "root_at_origin": True,
            "ground_top_z_m": round(ground_top, 4),
            "player_spawn_at_south_end": True,
            "cafe_doorway_at_north_end": True,
            "striped_awning_materials_present": True,
            "lamp_glow_emissive": True,
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
