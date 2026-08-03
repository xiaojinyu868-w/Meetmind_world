"""echo-package.v0 手写校验器（模仿前端 src/runtime/WorldSpec.js 的硬校验风格）。

目的：保证 PersonPackage 落盘前符合 docs/CONTEXT-AND-MEMORY.md §4 的 schema 草案，
      版本字符串硬校验，推断层条目必须可指回事实层（防上下文腐烂防线 #4）。
输入：dict（待校验的 package 数据）。
输出：校验通过返回原 dict；失败抛 PackageSchemaError。
验收：tests/test_package_schema.py —— 合法 package 通过、缺 source_facts 的推断被拒、
      错误 privacy 被拒、错误 schema 版本被拒。
"""

SCHEMA_VERSION = "echo-package.v0"

# 权限圈层（CONTEXT-AND-MEMORY.md §5）：L1~L4，默认 L1 self-only
PRIVACY_LEVELS = ("self-only", "agent-usable", "org-shared", "public-approved")
DEFAULT_PRIVACY = "self-only"
FIELD_SCHEMA_VERSION = "echo-field.v1"
FIELD_STATUSES = ("none", "queued", "ready", "failed")


class PackageSchemaError(ValueError):
    """package 不符合 echo-package.v0 时抛出。"""


def _require_string(value, field: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise PackageSchemaError(f"Package field must be a non-empty string: {field}")


def _validate_inference(inference, field: str) -> None:
    if not isinstance(inference, dict):
        raise PackageSchemaError(f"Package inference must be an object: {field}")
    _require_string(inference.get("id"), f"{field}.id")
    _require_string(inference.get("type"), f"{field}.type")
    # 推断必须能指回事实层原始片段，指不回去的推断不允许入库
    source_facts = inference.get("source_facts")
    if not isinstance(source_facts, list) or not source_facts:
        raise PackageSchemaError(f"Package inference requires non-empty source_facts: {field}")
    for i, pointer in enumerate(source_facts):
        _require_string(pointer, f"{field}.source_facts[{i}]")
    _require_string(inference.get("model"), f"{field}.model")
    confidence = inference.get("confidence")
    if not isinstance(confidence, (int, float)) or isinstance(confidence, bool):
        raise PackageSchemaError(f"Package inference confidence must be numeric: {field}.confidence")
    if not 0.0 <= confidence <= 1.0:
        raise PackageSchemaError(f"Package inference confidence out of range [0,1]: {field}.confidence")
    _require_string(inference.get("created_at"), f"{field}.created_at")


def _validate_encounter(encounter, index: int) -> None:
    prefix = f"encounters[{index}]"
    if not isinstance(encounter, dict):
        raise PackageSchemaError(f"Package encounter must be an object: {prefix}")
    _require_string(encounter.get("encounter_id"), f"{prefix}.encounter_id")
    _require_string(encounter.get("time"), f"{prefix}.time")
    if not isinstance(encounter.get("facts"), dict):
        raise PackageSchemaError(f"Package encounter requires facts pointers: {prefix}.facts")
    inferences = encounter.get("inferences")
    if not isinstance(inferences, list):
        raise PackageSchemaError(f"Package encounter inferences must be an array: {prefix}.inferences")
    for i, inference in enumerate(inferences):
        _validate_inference(inference, f"{prefix}.inferences[{i}]")
    privacy = encounter.get("privacy", DEFAULT_PRIVACY)
    if privacy not in PRIVACY_LEVELS:
        raise PackageSchemaError(
            f"Package encounter privacy must be one of {PRIVACY_LEVELS}: {prefix}.privacy"
        )


def _validate_field(field) -> None:
    if not isinstance(field, dict):
        raise PackageSchemaError("Package field must be an object: field")
    status = field.get("status")
    if status not in FIELD_STATUSES:
        raise PackageSchemaError(f"Package field.status must be one of {FIELD_STATUSES}")
    if field.get("generated") is not True:
        raise PackageSchemaError("Package field.generated must be true")
    if field.get("regenerable") is not True:
        raise PackageSchemaError("Package field.regenerable must be true")
    generated_from = field.get("generated_from")
    if not isinstance(generated_from, list) or not all(
            isinstance(pointer, str) and pointer.strip() for pointer in generated_from):
        raise PackageSchemaError("Package field.generated_from must be an array of fact pointers")
    if status != "ready":
        return
    if field.get("schema") != FIELD_SCHEMA_VERSION:
        raise PackageSchemaError(f"Unsupported field schema: {field.get('schema')}")
    if not generated_from:
        raise PackageSchemaError("Ready field requires non-empty generated_from")
    _require_string(field.get("model"), "field.model")
    _require_string(field.get("created_at"), "field.created_at")
    scene = field.get("scene")
    if not isinstance(scene, dict):
        raise PackageSchemaError("Ready field requires a scene object: field.scene")
    _require_string(scene.get("title"), "field.scene.title")
    _require_string(scene.get("summary"), "field.scene.summary")
    parameters = scene.get("parameters")
    if not isinstance(parameters, dict):
        raise PackageSchemaError("Field scene requires parameters: field.scene.parameters")
    for key in ("sky", "ground", "accent", "fog"):
        _require_string(parameters.get(key), f"field.scene.parameters.{key}")
    for key in ("openness", "warmth"):
        value = parameters.get(key)
        if (not isinstance(value, (int, float)) or isinstance(value, bool)
                or not 0 <= value <= 1):
            raise PackageSchemaError(
                f"Field scene parameter must be numeric in [0,1]: field.scene.parameters.{key}")
    entities = scene.get("entities")
    if not isinstance(entities, list) or len(entities) > 8:
        raise PackageSchemaError("Field scene entities must contain at most 8 items")
    for index, entity in enumerate(entities):
        prefix = f"field.scene.entities[{index}]"
        if not isinstance(entity, dict):
            raise PackageSchemaError(f"Field entity must be an object: {prefix}")
        for key in ("id", "type", "label", "detail"):
            _require_string(entity.get(key), f"{prefix}.{key}")
        position = entity.get("position")
        if not isinstance(position, dict):
            raise PackageSchemaError(f"Field entity requires position: {prefix}.position")
        for axis in ("x", "z"):
            value = position.get(axis)
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                raise PackageSchemaError(f"Field entity position must be numeric: {prefix}.position.{axis}")


def validate_encounter_draft(draft) -> dict:
    """校验 IF-2 产出的相遇草稿：encounter 结构合规且 identity.confirmed=false。

    草稿在 IF-3 用户确认前不允许进入 Package（docs/API.md IF-2/IF-3）。
    """
    if not isinstance(draft, dict):
        raise PackageSchemaError("encounter_draft must be an object")
    _validate_encounter(draft, 0)
    identity = draft.get("identity")
    if not isinstance(identity, dict) or identity.get("confirmed") is not False:
        raise PackageSchemaError(
            "encounter_draft.identity.confirmed 必须为 false（未确认，须走 IF-3 确认流程）"
        )
    return draft


def validate_package(package) -> dict:
    """硬校验 echo-package.v0；通过则返回原对象，否则抛 PackageSchemaError。"""
    if not isinstance(package, dict):
        raise PackageSchemaError("Package must be an object")
    if package.get("schema") != SCHEMA_VERSION:
        raise PackageSchemaError(f"Unsupported package schema: {package.get('schema')}")
    _require_string(package.get("person_id"), "person_id")
    identity = package.get("identity")
    if not isinstance(identity, dict):
        raise PackageSchemaError("Package identity must be an object: identity")
    if not isinstance(identity.get("confirmed"), bool):
        raise PackageSchemaError("Package identity.confirmed must be a boolean")
    encounters = package.get("encounters")
    if not isinstance(encounters, list):
        raise PackageSchemaError("Package encounters must be an array")
    for i, encounter in enumerate(encounters):
        _validate_encounter(encounter, i)
    avatar = package.get("avatar")
    if not isinstance(avatar, dict) or not isinstance(avatar.get("palette"), dict):
        raise PackageSchemaError("Package avatar requires a palette object: avatar.palette")
    if package.get("field") is not None:
        _validate_field(package["field"])
    # 人脸/声纹永不允许 L4（P-8，MVP1/2 直接禁止）
    for i, encounter in enumerate(encounters):
        if encounter.get("privacy") == "public-approved" and identity.get("face_ref"):
            raise PackageSchemaError(
                f"Face/voice data can never be public-approved: encounters[{i}].privacy"
            )
    return package
