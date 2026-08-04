"""MVP2 group onboarding, first-impression and Field acceptance tests."""

import json

import pytest
from fastapi.testclient import TestClient

from app.api.pipeline import _TINY_JPEG
from app.main import create_app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def _onboard_five(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/group-onboarding",
        data={
            "participant_names": json.dumps(["甲", "乙", "丙", "丁", "戊"]),
            "expected_count": "5",
            "confirm_participants": "true",
        },
        files={"photo": ("group.jpg", _TINY_JPEG, "image/jpeg")},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_group_photo_creates_five_confirmed_people_and_hall_entries(client):
    result = _onboard_five(client)

    assert result["schema"] == "meetmind.group-onboarding.v1"
    assert result["status"] == "needs-review"
    assert len(result["participants"]) == 5
    assert all(item["confirmed"] for item in result["participants"])
    assert all(item["avatar_status"] == "procedural" for item in result["participants"])
    for participant in result["participants"]:
        package = client.app.state.store.load_package(participant["person_id"])
        assert package["identity"]["confirmed"] is True
        assert package["avatar"]["type"] == "voxel-textured.v1"
        assert participant["booth_id"] is not None


def test_first_impression_becomes_sourced_inference_and_generates_field(client):
    participants = _onboard_five(client)["participants"]
    author_id, subject_id = participants[0]["person_id"], participants[1]["person_id"]
    impression = client.post(
        "/api/v1/impressions",
        json={
            "author_id": author_id,
            "subject_id": subject_id,
            "kind": "peer-impression",
            "text": "很温暖，也很有合作默契",
            "privacy": "agent-usable",
        },
    )
    assert impression.status_code == 201, impression.text
    impression_data = impression.json()
    assert impression_data["source_ref"].startswith(f"facts/{subject_id}/impression_")
    stored = client.app.state.store.read_inferences(subject_id)
    assert stored[impression_data["id"]]["author_id"] == author_id

    field = client.post(
        "/api/v1/fields/generations",
        json={
            "owner_id": subject_id,
            "counterpart_id": author_id,
            "source_refs": [impression_data["source_ref"]],
            "notes": ["很温暖，也很有合作默契"],
        },
    )
    assert field.status_code == 201, field.text
    payload = field.json()
    assert payload["schema"] == "meetmind-field.v1"
    assert payload["regenerable"] is True
    assert payload["asset_ref"].startswith("derived/fields/")
    assert payload["source_refs"] == [impression_data["source_ref"]]
    assert payload["environment"]["interactive_points"] == [
        "shared-memory", "impression-wall", "return-gate",
    ]


def test_group_onboarding_rejects_non_image(client):
    response = client.post(
        "/api/v1/group-onboarding",
        files={"photo": ("group.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 415
