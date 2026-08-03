"""场景应用入口：把已就绪的关系场域挂到展位/小屋模块。"""

SCENE_APP_SCHEMA = "echo-scene-app.v1"


def build_field_app_entry(package: dict) -> dict | None:
    """从 Package 的 FieldAsset 生成应用入口；不负责生成场域本身。"""
    field = package.get("field")
    if not isinstance(field, dict) or field.get("status") not in ("queued", "ready"):
        return None
    ready = field["status"] == "ready"
    person_id = package["person_id"]
    return {
        "schema": SCENE_APP_SCHEMA,
        "app_id": "relationship-field",
        "kind": "field",
        "label": "进入关系场域" if ready else "场域准备中",
        "status": field["status"],
        "target": {
            "person_id": person_id,
            "field_ref": f"people/{person_id}/profile.json#field",
        },
        "capabilities": ["walk", "interact"] if ready else [],
    }
