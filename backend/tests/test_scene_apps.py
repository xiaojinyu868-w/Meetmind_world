"""FR-2.10 场景应用入口契约。"""

from app.world.scene_apps import build_field_app_entry


def test_ready_field_becomes_walkable_scene_app_entry():
    package = {"person_id": "person_1", "field": {"status": "ready"}}
    entry = build_field_app_entry(package)
    assert entry == {
        "schema": "echo-scene-app.v1",
        "app_id": "relationship-field",
        "kind": "field",
        "label": "进入关系场域",
        "status": "ready",
        "target": {
            "person_id": "person_1",
            "field_ref": "people/person_1/profile.json#field",
        },
        "capabilities": ["walk", "interact"],
    }


def test_missing_field_does_not_create_fake_entry():
    assert build_field_app_entry({"person_id": "person_1"}) is None
