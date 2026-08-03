"""CharacterAsset handoff contract: validation, revisioning, Package and snapshot propagation."""

import json

import pytest
from fastapi.testclient import TestClient

from app.config import REPO_ROOT
from app.main import create_app
from app.schemas.character_asset import (
    CharacterAssetSchemaError,
    validate_character_asset,
)


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


@pytest.fixture()
def character_asset():
    return json.loads(
        (REPO_ROOT / "fixtures" / "character-assets" / "demo.voxel.v1.json")
        .read_text(encoding="utf-8")
    )


def test_character_asset_validator_sanitizes_browser_dto(character_asset):
    character_asset["internal_source_uri"] = "s3://private-bucket/raw/person.jpg"
    character_asset["runtime"]["animations"] = {"idle": "Idle"}
    asset = validate_character_asset(character_asset)
    assert asset["schema_version"] == "character-asset.v1"
    assert asset["qa"] == {"status": "passed"}
    assert asset["runtime"]["animations"] == {"idle": "Idle"}
    assert "internal_source_uri" not in asset


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("glb_url", "http://unsafe.example/model.glb", "only allows HTTPS"),
        ("glb_url", "../private/model.glb", "traverse"),
        ("content_hash", "bad", "SHA-256"),
    ],
)
def test_character_asset_validator_rejects_unsafe_delivery(
    character_asset, field, value, message
):
    character_asset[field] = value
    with pytest.raises(CharacterAssetSchemaError, match=message):
        validate_character_asset(character_asset)


def test_character_asset_validator_rejects_non_clip_animation_metadata(character_asset):
    character_asset["runtime"]["animations"] = {"idle": "s3://private/idle.glb"}
    with pytest.raises(CharacterAssetSchemaError, match="GLB clip name"):
        validate_character_asset(character_asset)


def test_attach_character_asset_propagates_to_package_and_worlds(client, character_asset):
    response = client.put("/api/v0/packages/lin-che/character-asset", json=character_asset)
    assert response.status_code == 200, response.text
    assert response.json()["avatar_status"] == "ready"

    package = client.get("/api/v0/packages/lin-che").json()
    assert package["avatar"]["type"] == "voxel-photo-v1"
    assert package["avatar"]["character_asset"]["content_hash"] == character_asset["content_hash"]

    for world in ("hall", "cafe"):
        snapshot = client.get("/api/v0/world/snapshot", params={"world": world, "advance": 0}).json()
        agent = next(item for item in snapshot["agents"] if item["id"] == "lin-che")
        assert agent["avatar"]["character_asset"]["character_id"] == character_asset["character_id"]


def test_attach_is_idempotent_and_revision_is_monotonic(client, character_asset):
    first = client.put("/api/v0/packages/lin-che/character-asset", json=character_asset)
    assert first.status_code == 200
    repeat = client.put("/api/v0/packages/lin-che/character-asset", json=character_asset)
    assert repeat.status_code == 200

    conflicting = {**character_asset, "content_hash": "c" * 64}
    assert client.put(
        "/api/v0/packages/lin-che/character-asset", json=conflicting
    ).status_code == 409

    revision_two = {
        **character_asset,
        "revision": 2,
        "glb_url": "models/characters/photo-derived/voxel/person_01.glb",
        "content_hash": "d" * 64,
    }
    upgraded = client.put("/api/v0/packages/lin-che/character-asset", json=revision_two)
    assert upgraded.status_code == 200
    assert upgraded.json()["character_asset"]["revision"] == 2


def test_unconfirmed_person_cannot_publish_character_asset(client, character_asset):
    store = client.app.state.store
    store.create_draft_package("person-pending", {"hair": "#111111"})
    response = client.put("/api/v0/packages/person-pending/character-asset", json=character_asset)
    assert response.status_code == 409
    assert "未确认" in response.json()["detail"]
