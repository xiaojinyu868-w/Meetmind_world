from __future__ import annotations

import hashlib
import json
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_ROOT = PROJECT_ROOT / "public" / "models" / "characters" / "photo-derived"
TEXTURE_ROOT = PROJECT_ROOT / "public" / "textures" / "characters"
VOXEL_PORTRAIT_ROOT = PROJECT_ROOT / "public" / "portraits" / "photo-derived" / "voxel"
EXPORT_ROOT = PROJECT_ROOT / "exports"
RENDER_ROOT = PROJECT_ROOT / "renders"
MANIFEST_PATH = EXPORT_ROOT / "photo_character_modes_manifest.json"
REPORT_PATH = EXPORT_ROOT / "photo_character_modes_validation.json"
ROOT_NODE_NAME = "ROOT_PhotoCharacter"
PERSON_IDS = tuple(f"person_{index:02d}" for index in range(1, 7)) + ("host",)
MODES = {
    "storybook": {
        "texture_size": 256,
        "max_triangles": 2500,
        "min_meshes": 18,
        "required_nodes": ("GEO_Head", "GEO_Hair_Cap", "GEO_Torso", "GEO_Shoe_L", "GEO_Shoe_R"),
    },
    "voxel": {
        "texture_size": 128,
        "max_triangles": 120,
        "min_meshes": 6,
        "required_nodes": ("GEO_Head", "GEO_Torso", "GEO_Arm_L", "GEO_Arm_R", "GEO_Leg_L", "GEO_Leg_R"),
    },
}
VOXEL_HEAD_REGIONS = {
    "left": (0, 96, 16, 16),
    "front": (16, 96, 16, 16),
    "right": (32, 96, 16, 16),
    "back": (48, 96, 16, 16),
    "top": (16, 112, 16, 16),
    "bottom": (32, 112, 16, 16),
}


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    result = [root]
    for child in root.children:
        result.extend(descendants(child))
    return result


def world_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector((
        min(point.x for point in points),
        min(point.y for point in points),
        min(point.z for point in points),
    ))
    maximum = Vector((
        max(point.x for point in points),
        max(point.y for point in points),
        max(point.z for point in points),
    ))
    return minimum, maximum


def triangle_count(meshes: list[bpy.types.Object]) -> int:
    count = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        count += len(obj.data.loop_triangles)
    return count


def texture_nodes(materials: list[bpy.types.Material]) -> list[bpy.types.ShaderNodeTexImage]:
    nodes: list[bpy.types.ShaderNodeTexImage] = []
    for material in materials:
        if not material.use_nodes or not material.node_tree:
            continue
        nodes.extend(node for node in material.node_tree.nodes if node.type == "TEX_IMAGE")
    return nodes


def region_has_opaque_pixels(
    image: bpy.types.Image,
    rect: tuple[int, int, int, int],
    minimum_ratio: float = 0.8,
) -> bool:
    width, height = image.size
    pixels = image.pixels
    x, y, region_width, region_height = rect
    opaque = 0
    total = region_width * region_height
    for py in range(y, y + region_height):
        for px in range(x, x + region_width):
            index = (py * width + px) * 4
            if pixels[index + 3] >= 0.99:
                opaque += 1
    return opaque / max(total, 1) >= minimum_ratio


def head_uv_region_counts(head: bpy.types.Object) -> dict[str, int]:
    uv_layer = head.data.uv_layers.active
    if uv_layer is None:
        return {name: 0 for name in VOXEL_HEAD_REGIONS}
    counts = {name: 0 for name in VOXEL_HEAD_REGIONS}
    for polygon in head.data.polygons:
        values = [uv_layer.data[index].uv for index in polygon.loop_indices]
        center_u = sum(value.x for value in values) / len(values)
        center_v = sum(value.y for value in values) / len(values)
        for name, (x, y, width, height) in VOXEL_HEAD_REGIONS.items():
            if x / 128 <= center_u <= (x + width) / 128 and y / 128 <= center_v <= (y + height) / 128:
                counts[name] += 1
                break
    return counts


def validate_texture_file(mode: str, person_id: str) -> dict[str, object]:
    expected_size = MODES[mode]["texture_size"]
    path = TEXTURE_ROOT / mode / f"{person_id}_atlas.png"
    if not path.exists():
        return {"path": str(path), "exists": False, "checks": {"exists": False}, "passed": False}
    image = bpy.data.images.load(str(path), check_existing=False)
    width, height = image.size
    checks: dict[str, object] = {
        "exists": True,
        "power_of_two_expected_size": width == expected_size and height == expected_size,
        "png_extension": path.suffix.lower() == ".png",
    }
    head_face_coverage: dict[str, bool] | None = None
    if mode == "voxel":
        head_face_coverage = {
            name: region_has_opaque_pixels(image, rect)
            for name, rect in VOXEL_HEAD_REGIONS.items()
            if name != "bottom"
        }
        checks["five_head_faces_have_pixels"] = all(head_face_coverage.values())
        pixels = image.pixels
        alpha_values = {
            round(pixels[index] * 255)
            for index in range(3, len(pixels), 4)
        }
        checks["hard_alpha_only"] = alpha_values.issubset({0, 255})
    result = {
        "path": str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "exists": True,
        "size": [width, height],
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "head_face_coverage": head_face_coverage,
        "checks": checks,
    }
    result["passed"] = all(bool(value) for value in checks.values())
    bpy.data.images.remove(image)
    return result


def validate_voxel_portrait(person_id: str) -> dict[str, object]:
    path = VOXEL_PORTRAIT_ROOT / f"{person_id}.png"
    if not path.exists():
        return {
            "person_id": person_id,
            "path": str(path),
            "exists": False,
            "checks": {"exists": False},
            "passed": False,
        }
    image = bpy.data.images.load(str(path), check_existing=False)
    width, height = image.size
    pixels = image.pixels
    color_bins = {
        tuple(round(pixels[index + channel] * 15) for channel in range(3))
        for index in range(0, len(pixels), 4 * 64)
    }
    checks = {
        "exists": True,
        "square_512": width == 512 and height == 512,
        "png_extension": path.suffix.lower() == ".png",
        "nontrivial_file_size": path.stat().st_size > 5_000,
        "nonblank_color_variation": len(color_bins) >= 12,
    }
    result = {
        "person_id": person_id,
        "path": str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "exists": True,
        "size": [width, height],
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "sampled_color_bins": len(color_bins),
        "checks": checks,
        "passed": all(checks.values()),
    }
    bpy.data.images.remove(image)
    return result


def validate_glb(mode: str, person_id: str) -> dict[str, object]:
    reset_scene()
    path = MODEL_ROOT / mode / f"{person_id}.glb"
    if not path.exists():
        return {"path": str(path), "exists": False, "checks": {"exists": False}, "passed": False}
    result = bpy.ops.import_scene.gltf(filepath=str(path))
    if result != {"FINISHED"}:
        raise RuntimeError(f"glTF import failed: {path} -> {result}")
    root = bpy.data.objects.get(ROOT_NODE_NAME)
    if root is None:
        return {
            "path": str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
            "exists": True,
            "checks": {"root_present": False},
            "passed": False,
        }
    objects = descendants(root)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    names = {obj.name for obj in objects}
    materials = sorted(
        {
            slot.material
            for obj in meshes
            for slot in obj.material_slots
            if slot.material is not None
        },
        key=lambda item: item.name,
    )
    image_nodes = texture_nodes(materials)
    minimum, maximum = world_bounds(meshes)
    height = maximum.z - minimum.z
    triangles = triangle_count(meshes)
    expected = MODES[mode]
    expected_interpolation = "Closest" if mode == "voxel" else "Linear"
    interpolation_values = sorted({node.interpolation for node in image_nodes})
    embedded_sizes = sorted({tuple(node.image.size) for node in image_nodes if node.image})
    required_missing = [name for name in expected["required_nodes"] if name not in names]
    root_location = tuple(round(value, 6) for value in root.location)
    uv_counts = None
    if mode == "voxel":
        head = bpy.data.objects.get("GEO_Head")
        uv_counts = head_uv_region_counts(head) if head is not None else {name: 0 for name in VOXEL_HEAD_REGIONS}
    checks: dict[str, object] = {
        "root_present": True,
        "root_at_origin": max(abs(value) for value in root.location) <= 0.001,
        "mode_metadata": root.get("character_mode") == mode,
        "person_metadata": root.get("person_id") == person_id,
        "forward_is_minus_y": root.get("forward_local") == "-Y",
        "photo_projection_forbidden": "no-photo-projection" in str(root.get("texture_policy", "")),
        "source_kind_valid": root.get("source_kind")
        == ("design-default-non-photo" if person_id == "host" else "photo-derived-anonymous"),
        "required_nodes_present": not required_missing,
        "mesh_count": len(meshes) >= expected["min_meshes"],
        "triangle_budget": triangles <= expected["max_triangles"],
        "height_range": 1.50 <= height <= 1.90,
        "feet_on_ground": abs(minimum.z) <= 0.015,
        "single_atlas_material": len(materials) == 1,
        "embedded_texture_present": bool(image_nodes),
        "embedded_texture_size": embedded_sizes == [(expected["texture_size"], expected["texture_size"])],
        "sampler_interpolation": interpolation_values == [expected_interpolation],
        "no_runtime_camera_or_light": not any(obj.type in {"CAMERA", "LIGHT"} for obj in objects),
    }
    if person_id == "person_04":
        checks["abstract_mark_no_logo"] = root.get("special_mark") == "abstract-gold-cyan-no-logo"
        if mode == "storybook":
            checks["two_color_mark_geometry"] = {
                "GEO_Chest_AbstractGold",
                "GEO_Chest_AbstractCyan",
            }.issubset(names)
    if mode == "voxel":
        checks["fixed_body_template"] = root.get("body_template") in {"regular", "tall"}
        checks["head_six_cube_sides_uv_mapped"] = all(value >= 2 for value in uv_counts.values())
        checks["head_declares_five_generated_faces"] = str(root.get("head_texture_faces", "")).startswith(
            "front,left,right,back,top"
        )
    record = {
        "asset_id": f"character.photo.{person_id}.{mode}.v1",
        "path": str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "exists": True,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "root_location": root_location,
        "bounds": {
            "min": [round(value, 5) for value in minimum],
            "max": [round(value, 5) for value in maximum],
            "height": round(height, 5),
        },
        "meshes": len(meshes),
        "triangles": triangles,
        "materials": [material.name for material in materials],
        "embedded_texture_sizes": [list(size) for size in embedded_sizes],
        "sampler_interpolation": interpolation_values,
        "voxel_head_uv_region_triangles": uv_counts,
        "missing_nodes": required_missing,
        "checks": checks,
    }
    record["passed"] = all(bool(value) for value in checks.values())
    return record


def validate_manifest(
    asset_reports: list[dict[str, object]],
    texture_reports: list[dict[str, object]],
    portrait_reports: list[dict[str, object]],
) -> dict[str, object]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest_assets = {item["asset_id"]: item for item in manifest["assets"]}
    textures_by_key = {
        (mode, person_id): report
        for mode in MODES
        for person_id, report in zip(PERSON_IDS, texture_reports[(list(MODES).index(mode) * len(PERSON_IDS)) : ((list(MODES).index(mode) + 1) * len(PERSON_IDS))])
    }
    mismatches: list[str] = []
    for report in asset_reports:
        asset_id = report["asset_id"]
        manifest_asset = manifest_assets.get(asset_id)
        if not manifest_asset:
            mismatches.append(f"missing manifest asset: {asset_id}")
            continue
        if manifest_asset["glb_sha256"] != report["sha256"]:
            mismatches.append(f"GLB hash mismatch: {asset_id}")
        mode = asset_id.split(".")[-2]
        person_id = asset_id.split(".")[2]
        texture_report = textures_by_key[(mode, person_id)]
        if manifest_asset["texture_sha256"] != texture_report["sha256"]:
            mismatches.append(f"texture hash mismatch: {asset_id}")
    portraits_by_person = {report["person_id"]: report for report in portrait_reports}
    for person_id in PERSON_IDS:
        asset_id = f"character.photo.{person_id}.voxel.v1"
        manifest_asset = manifest_assets.get(asset_id)
        portrait_report = portraits_by_person[person_id]
        if not manifest_asset:
            continue
        if manifest_asset.get("portrait") != portrait_report["path"]:
            mismatches.append(f"portrait path mismatch: {asset_id}")
        if manifest_asset.get("portrait_sha256") != portrait_report["sha256"]:
            mismatches.append(f"portrait hash mismatch: {asset_id}")
    checks = {
        "manifest_exists": MANIFEST_PATH.exists(),
        "schema_version": manifest.get("schema_version") == "echo-photo-character-modes.v1",
        "fourteen_assets": len(manifest_assets) == 14,
        "six_photo_plus_host_per_mode": manifest.get("counts", {}).get("character_glbs") == 14,
        "seven_voxel_portraits": manifest.get("counts", {}).get("voxel_portraits") == 7,
        "raw_photos_not_copied": manifest.get("identity_policy", {}).get("raw_photos_copied_to_public") is False,
        "source_photo_crops_forbidden": manifest.get("identity_policy", {}).get("source_photo_crops_in_public") is False,
        "hashes_match": not mismatches,
    }
    return {
        "path": str(MANIFEST_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "mismatches": mismatches,
        "checks": checks,
        "passed": all(checks.values()),
    }


def validate_previews() -> list[dict[str, object]]:
    reports = []
    for mode in MODES:
        path = RENDER_ROOT / f"photo_characters_{mode}_lineup.png"
        if not path.exists():
            reports.append({"mode": mode, "exists": False, "passed": False})
            continue
        image = bpy.data.images.load(str(path), check_existing=False)
        checks = {
            "exists": True,
            "resolution": tuple(image.size) == (1600, 900),
            "nontrivial_file_size": path.stat().st_size > 50_000,
        }
        reports.append(
            {
                "mode": mode,
                "path": str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
                "size": list(image.size),
                "bytes": path.stat().st_size,
                "checks": checks,
                "passed": all(checks.values()),
            }
        )
        bpy.data.images.remove(image)
    return reports


def main() -> None:
    asset_reports: list[dict[str, object]] = []
    texture_reports: list[dict[str, object]] = []
    for mode in MODES:
        for person_id in PERSON_IDS:
            asset_reports.append(validate_glb(mode, person_id))
            texture_reports.append(validate_texture_file(mode, person_id))
    portrait_reports = [validate_voxel_portrait(person_id) for person_id in PERSON_IDS]
    manifest_report = validate_manifest(asset_reports, texture_reports, portrait_reports)
    preview_reports = validate_previews()
    public_photo_names = {
        path.name
        for path in (PROJECT_ROOT / "public").rglob("*")
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg"}
    }
    privacy_check = {
        "jpg_or_jpeg_files_in_public": sorted(public_photo_names),
        "passed": not public_photo_names,
    }
    report = {
        "schema_version": "echo-photo-character-modes-validation.v1",
        "blender_version": bpy.app.version_string,
        "summary": {
            "asset_count": len(asset_reports),
            "asset_passed": sum(report["passed"] for report in asset_reports),
            "texture_count": len(texture_reports),
            "texture_passed": sum(report["passed"] for report in texture_reports),
            "preview_passed": sum(report["passed"] for report in preview_reports),
            "portrait_count": len(portrait_reports),
            "portrait_passed": sum(report["passed"] for report in portrait_reports),
        },
        "manifest": manifest_report,
        "privacy": privacy_check,
        "assets": asset_reports,
        "textures": texture_reports,
        "portraits": portrait_reports,
        "previews": preview_reports,
    }
    report["passed"] = (
        all(item["passed"] for item in asset_reports)
        and all(item["passed"] for item in texture_reports)
        and all(item["passed"] for item in portrait_reports)
        and manifest_report["passed"]
        and privacy_check["passed"]
        and all(item["passed"] for item in preview_reports)
    )
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"report": str(REPORT_PATH), "summary": report["summary"], "passed": report["passed"]}, indent=2))
    if not report["passed"]:
        failures = [
            {"asset_id": item.get("asset_id"), "checks": item.get("checks")}
            for item in asset_reports
            if not item["passed"]
        ]
        raise RuntimeError(json.dumps({"asset_failures": failures, "manifest": manifest_report, "privacy": privacy_check}, indent=2))


if __name__ == "__main__":
    main()
