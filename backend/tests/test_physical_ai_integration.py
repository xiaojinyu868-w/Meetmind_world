import hashlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


TOKEN = "integration-token"
SESSION_ID = "session-integration-001"
ASSET_ID = "asset-headshot-001"
SPEAKER_ASSET_ID = "asset-speaker-segment-001"
RECORDING_ASSET_ID = "asset-conversation-recording-001"
PACKAGE_ID = "package-integration-001"
IDEMPOTENCY_KEY = "a" * 64
IMAGE_BYTES = b"\xff\xd8\xff\xe0physical-ai-test-jpeg\xff\xd9"
OBJECT_ID = hashlib.sha256(IMAGE_BYTES).hexdigest()
SPEAKER_BYTES = b"RIFFspeaker-segment-test-WAVE"
SPEAKER_OBJECT_ID = hashlib.sha256(SPEAKER_BYTES).hexdigest()
RECORDING_BYTES = b"RIFFfull-conversation-test-WAVE"
RECORDING_OBJECT_ID = hashlib.sha256(RECORDING_BYTES).hexdigest()


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    with TestClient(create_app()) as test_client:
        yield test_client


def _auth_headers(**extra):
    return {"Authorization": f"Bearer {TOKEN}", **extra}


def _upload(client, body=IMAGE_BYTES, object_id=OBJECT_ID, asset_id=ASSET_ID):
    return _upload_asset(client, body, object_id, asset_id, "image/jpeg")


def _upload_asset(client, body, object_id, asset_id, content_type):
    return client.put(
        f"/v1/physical-ai/assets/{object_id}",
        content=body,
        headers=_auth_headers(
            **{
                "Content-Type": content_type,
                "X-Physical-AI-Asset-Id": asset_id,
                "X-Physical-AI-Session-Id": SESSION_ID,
                "X-Content-SHA256": object_id,
            }
        ),
    )


def _upload_required_assets(client):
    responses = [_upload(client)]
    responses.append(_upload_asset(
        client, SPEAKER_BYTES, SPEAKER_OBJECT_ID, SPEAKER_ASSET_ID, "audio/wav",
    ))
    responses.append(_upload_asset(
        client, RECORDING_BYTES, RECORDING_OBJECT_ID, RECORDING_ASSET_ID, "audio/wav",
    ))
    return responses


def _package():
    return {
        "schema_version": "1.1",
        "package_id": PACKAGE_ID,
        "idempotency_key": IDEMPOTENCY_KEY,
        "created_at": "2026-08-04T03:00:00Z",
        "session": {
            "session_id": SESSION_ID,
            "wearer_person_id": "person-self",
        },
        "media": {
            "assets": [
                {
                    "id": ASSET_ID,
                    "kind": "image",
                    "role": "face_headshot",
                    "availability": "local_pending_upload",
                    "object_id": OBJECT_ID,
                    "content_type": "image/jpeg",
                },
                {
                    "id": SPEAKER_ASSET_ID,
                    "kind": "audio",
                    "role": "speaker_segment",
                    "availability": "local_pending_upload",
                    "object_id": SPEAKER_OBJECT_ID,
                    "content_type": "audio/wav",
                    "subjects": [{"person_id": "person-k3-xiaoman", "relation": "speaker"}],
                },
                {
                    "id": RECORDING_ASSET_ID,
                    "kind": "audio",
                    "role": "conversation_recording",
                    "availability": "local_pending_upload",
                    "object_id": RECORDING_OBJECT_ID,
                    "content_type": "audio/wav",
                    "subjects": [],
                },
            ]
        },
        "agent_view": {
            "time": {
                "session_id": SESSION_ID,
                "started_at": "2026-08-04T02:58:00Z",
                "ended_at": "2026-08-04T03:00:00Z",
                "duration_ms": 120000,
            },
            "asr": {
                "plain_text": "小满：我们在做具身智能。",
                "turns": [
                    {
                        "speaker_id": "person-k3-xiaoman",
                        "text": "我们在做具身智能。",
                        "start_ms": 1200,
                        "end_ms": 3400,
                        "language": "zh",
                        "confidence": 0.96,
                        "identity_score": 0.91,
                        "identity_margin": 0.18,
                        "audio_asset_ids": [SPEAKER_ASSET_ID],
                    },
                    {
                        "speaker_id": "person-k3-liqing",
                        "text": "我负责把感知数据送进 Package。",
                        "start_ms": 3600,
                        "end_ms": 6100,
                        "language": "zh",
                        "confidence": 0.93,
                    }
                ],
            },
            "scene": {
                "caption": "黑客松硬件展位",
                "confidence": 0.92,
                "model": "k3-scene-test",
                "source_frame_asset_ids": [ASSET_ID],
            },
            "images": {
                "original_frame_asset_ids": [ASSET_ID],
                "people": [
                    {
                        "person_id": "person-k3-xiaoman",
                        "headshot_asset_ids": [ASSET_ID],
                        "best_headshot_asset_id": ASSET_ID,
                    }
                ],
            },
        },
        "persons": [
            {
                "person": {
                    "person_id": "person-k3-xiaoman",
                    "display_name": "小满",
                    "role": "interlocutor",
                    "identity_state": "confirmed",
                },
                "face": {
                    "observations": [{
                        "track_id": "track-001",
                        "recognition_state": "confirmed",
                        "confidence": 0.94,
                        "bbox": [120, 80, 240, 260],
                    }],
                },
                "voice": {
                    "identity_state": "confirmed",
                    "identity_score": 0.91,
                    "identity_margin": 0.18,
                    "turns": [{
                        "speaker_id": "person-k3-xiaoman",
                        "text": "我们在做具身智能。",
                        "audio_asset_ids": [SPEAKER_ASSET_ID],
                    }],
                },
                "media_asset_ids": [ASSET_ID, SPEAKER_ASSET_ID],
            },
            {
                "person": {
                    "person_id": "person-k3-liqing",
                    "display_name": "李青",
                    "role": "interlocutor",
                    "identity_state": "resolved",
                },
                "voice": {"turns": []},
                "media_asset_ids": [],
            },
            {
                "person": {
                    "person_id": "person-self",
                    "display_name": "我",
                    "role": "wearer",
                    "identity_state": "confirmed",
                },
                "physiology": {
                    "summary": {"heart_rate_bpm_avg": 78, "spo2_percent_avg": 98},
                    "samples": [{"offset_ms": 1300, "heart_rate_bpm": 80}],
                },
                "media_asset_ids": [],
            },
        ],
        "shared_context": {
            "conversation_recording_asset_ids": [RECORDING_ASSET_ID],
            "scene_frame_asset_ids": [ASSET_ID],
        },
        "unassigned": {},
        "data_policy": {"excluded": ["face_embedding", "voice_embedding"]},
    }


def _post_package(client, payload=None, *, package_id=PACKAGE_ID, key=IDEMPOTENCY_KEY):
    return client.post(
        "/v1/physical-ai/packages",
        json=payload or _package(),
        headers=_auth_headers(
            **{
                "X-Idempotency-Key": key,
                "X-Physical-AI-Package-Id": package_id,
            }
        ),
    )


def _formal_package():
    package_id = f"package-{'c' * 24}"
    occurred_at = "2026-08-04T03:00:01Z"
    person = {
        "id": "person-formal-contract",
        "display_name": "正式合约",
        "state": "known",
        "is_self": 0,
        "role": "interlocutor",
        "identity_bindings": [],
    }
    wearer = {
        "id": "person-self",
        "display_name": "我",
        "state": "known",
        "is_self": 1,
        "role": "wearer",
        "identity_bindings": [],
    }
    dialogue_turn = {
        "occurred_at_ms": 1000,
        "occurred_at": occurred_at,
        "source_turn_id": "turn-formal-001",
        "person_id": person["id"],
        "speaker_kind": "person",
        "identity_state": "confirmed",
        "identity_score": 0.94,
        "identity_margin": 0.2,
        "text": "这是正式 schema 生成的会话。",
        "language": "zh",
        "start_ms": 1000,
        "end_ms": 3200,
        "wearer_physiology_near_turn": [],
    }
    agent_turn = {
        "turn_id": "turn-formal-001",
        "occurred_at": occurred_at,
        "speaker_id": person["id"],
        "speaker_label": person["display_name"],
        "identity_state": "confirmed",
        "start_ms": 1000,
        "end_ms": 3200,
        "text": dialogue_turn["text"],
        "language": "zh",
        "audio_asset_ids": [],
    }
    physiology_samples = [
        {
            "occurred_at_ms": offset,
            "occurred_at": occurred_at,
            "person_id": "person-self",
            "device_id": "ring-formal",
            "metric": "heart_rate",
            "value": value,
            "unit": "bpm",
            "quality_state": "trusted",
        }
        for offset, value in ((0, 74), (1000, 80))
    ]
    empty_face = {
        "observation_count": 0,
        "observations": [],
        "sampling": {"strategy": "all", "total": 0, "returned": 0, "maximum": 20},
    }
    empty_physiology = {
        "summary": [], "samples": [],
        "quality_counts": {"trusted": 0, "rejected": 0},
        "interpretation": "No wearer data belongs to this interlocutor.",
    }
    return {
        "schema_version": "1.1",
        "package_id": package_id,
        "idempotency_key": "d" * 64,
        "generated_at": "2026-08-04T03:01:00Z",
        "package_type": "physical_ai.conversation",
        "scope": {"type": "session", "person_id": None},
        "session": {
            "id": "session-formal-contract",
            "state": "ended",
            "wearer_person_id": "person-self",
            "started_at": "2026-08-04T03:00:00Z",
            "ended_at": "2026-08-04T03:01:00Z",
            "metadata": {},
            "duration_ms": 60000,
        },
        "identity": {"policy": "context-hub", "unresolved_conflicts": []},
        "agent_view": {
            "time": {
                "session_id": "session-formal-contract",
                "started_at": "2026-08-04T03:00:00Z",
                "ended_at": "2026-08-04T03:01:00Z",
                "duration_ms": 60000,
                "timezone": "UTC",
            },
            "asr": {"format": "speaker_id: text", "plain_text": dialogue_turn["text"], "turns": [agent_turn]},
            "scene": {
                "caption": "正式合约联调现场",
                "latest_analysis_id": None,
                "captured_at_start": None,
                "captured_at_end": None,
                "provider": None,
                "model": None,
                "confidence": None,
                "source_frame_asset_ids": [],
                "history": [],
            },
            "images": {"original_frame_asset_ids": [], "people": []},
        },
        "persons": [
            {
                "person": person,
                "face": empty_face,
                "voice": {"turn_count": 1, "speech_duration_ms": 2200, "turns": [dialogue_turn]},
                "physiology": empty_physiology,
                "media_asset_ids": [],
            },
            {
                "person": wearer,
                "face": empty_face,
                "voice": {"turn_count": 0, "speech_duration_ms": 0, "turns": []},
                "physiology": {
                    "summary": [{"metric": "heart_rate", "unit": "bpm", "count": 2, "min": 74, "mean": 77, "max": 80}],
                    "samples": physiology_samples,
                    "quality_counts": {"trusted": 2, "rejected": 0},
                    "interpretation": "Wearer-only physiology.",
                },
                "media_asset_ids": [],
            },
        ],
        "shared_context": {
            "scene": {"analyses": [], "frame_count": 0, "limitations": "none"},
            "timeline": [],
            "media_asset_ids": [],
        },
        "unassigned": {"dialogue_turns": [], "face_observations": [], "media_asset_ids": []},
        "media": {
            "assets": [],
            "transfer": {
                "mode": "separate_binary_upload",
                "asset_endpoint": "/v1/physical-ai/assets/{object_id}",
                "package_endpoint": "/v1/physical-ai/packages",
                "embedded_base64": False,
            },
        },
        "counts": {
            "persons": 2, "face_observations": 0, "speaker_turns": 1,
            "physiology_samples": 2, "physiology_trusted_samples": 2,
            "physiology_rejected_samples": 0, "media_assets": 0, "scene_analyses": 0,
        },
        "data_policy": {
            "identity_owner": "context-hub",
            "physiology_attribution": "wearer-only",
            "media_delivery": "separate-binary-upload",
            "excluded": ["face_embedding", "voice_embedding"],
        },
        "provenance": {"context_hub_schema": 1, "privacy": "local-owner"},
    }


def test_physical_ai_requires_configured_bearer(client, monkeypatch):
    monkeypatch.delenv("PHYSICAL_AI_AGENT_TOKEN", raising=False)
    response = _upload(client)
    assert response.status_code == 503
    monkeypatch.setenv("PHYSICAL_AI_AGENT_TOKEN", TOKEN)
    response = client.put(
        f"/v1/physical-ai/assets/{OBJECT_ID}",
        content=IMAGE_BYTES,
        headers={
            "Authorization": "Bearer wrong",
            "X-Physical-AI-Asset-Id": ASSET_ID,
            "X-Physical-AI-Session-Id": SESSION_ID,
            "X-Content-SHA256": OBJECT_ID,
        },
    )
    assert response.status_code == 401


def test_physical_ai_rejects_hash_mismatch(client, monkeypatch):
    monkeypatch.setenv("PHYSICAL_AI_AGENT_TOKEN", TOKEN)
    response = _upload(client, body=b"different-content")
    assert response.status_code == 422


def test_physical_ai_rejects_package_before_media(client, monkeypatch):
    monkeypatch.setenv("PHYSICAL_AI_AGENT_TOKEN", TOKEN)
    response = _post_package(client)
    assert response.status_code == 409
    assert ASSET_ID in response.json()["detail"]


def test_physical_ai_media_package_world_full_loop(client, monkeypatch):
    monkeypatch.setenv("PHYSICAL_AI_AGENT_TOKEN", TOKEN)
    upload, speaker_upload, recording_upload = _upload_required_assets(client)
    assert upload.status_code == 200, upload.text
    assert speaker_upload.status_code == 200, speaker_upload.text
    assert recording_upload.status_code == 200, recording_upload.text
    assert upload.json()["state"] == "stored"
    repeated_upload = _upload(client)
    assert repeated_upload.status_code == 200
    assert repeated_upload.json()["state"] == "already_present"

    accepted = _post_package(client)
    assert accepted.status_code == 202, accepted.text
    assert accepted.json() == {
        "accepted": True,
        "duplicate": False,
        "package_id": PACKAGE_ID,
        "agent_job_id": f"physical-ai-{PACKAGE_ID}",
    }
    duplicate = _post_package(client)
    assert duplicate.status_code == 200
    assert duplicate.json()["duplicate"] is True

    package = client.get("/api/v0/packages/person-k3-xiaoman")
    assert package.status_code == 200, package.text
    profile = package.json()
    assert profile["identity"]["confirmed"] is True
    assert profile["identity"]["name"] == "小满"
    assert profile["identity"]["face_ref"].endswith(f"{ASSET_ID}.jpg")
    encounter = profile["encounters"][0]
    facts = encounter["facts"]
    assert facts["transcript"].endswith("transcript.v1.md")
    assert len(facts["speaker_audio"]) == 1
    assert len(facts["conversation_recordings"]) == 1
    assert facts["face_observations"].endswith("person-evidence.v1.json")
    assert facts["voice_identity"].endswith("person-evidence.v1.json")
    assert facts["face_summary"] == {"observation_count": 1, "confidence": 0.94}
    assert facts["voice_summary"]["confidence"] == 0.91
    assert facts["voice_summary"]["turn_count"] == 1
    assert encounter["inferences"][0]["type"] == "deep-encounter-summary"

    avatar = profile["avatar"]
    assert avatar["type"] == "voxel-photo-atlas-v1"
    assert avatar["model_ref"].endswith("avatar.glb")
    assert set(avatar["expression_refs"]) == {"neutral", "happy", "surprised", "thinking"}
    assert client.get(f"/api/v0/media/{avatar['model_ref']}").status_code == 200
    neutral = client.get(f"/api/v0/media/{avatar['texture_ref']}")
    assert neutral.status_code == 200
    assert neutral.headers["content-type"].startswith("image/png")
    assert client.get(f"/api/v0/media/{facts['speaker_audio'][0]}").content == SPEAKER_BYTES
    assert client.get(f"/api/v0/media/{facts['conversation_recordings'][0]}").content == RECORDING_BYTES

    store = client.app.state.store
    evidence = store.read_fact(facts["person_evidence"]).decode("utf-8")
    assert "identity_score" in evidence
    assert "track-001" in evidence
    assert "audio_asset_ids" in evidence
    assert "具身智能" in client.app.state.memory.read_memory_md("person-k3-xiaoman")
    xiaoman_relations = client.app.state.memory.read_relations_md("person-k3-xiaoman")
    liqing_relations = client.app.state.memory.read_relations_md("person-k3-liqing")
    assert "我 | 现场相遇" in xiaoman_relations
    assert "李青 | 同场相遇" in xiaoman_relations
    assert "小满 | 同场相遇" in liqing_relations
    assert len(list((store.root / "facts").rglob(f"{RECORDING_ASSET_ID}.wav"))) == 1
    session_context = store.read_fact(facts["session"]).decode("utf-8")
    assert "heart_rate_bpm_avg" in session_context
    assert "wearer_person_id" in session_context

    signal = client.get("/api/v0/people/person-k3-xiaoman/signal")
    assert signal.status_code == 200, signal.text
    signal_payload = signal.json()
    assert signal_payload["schemaVersion"] == "person-signal.v1"
    assert signal_payload["ownerPersonId"] == "person-self"
    assert signal_payload["heart"]["currentBpm"] == 80.0
    assert signal_payload["heart"]["baselineBpm"] == 78.0
    assert "多人共同会话" in signal_payload["heart"]["explanation"]
    assert "samples" not in signal.text
    # K3 导入默认 L1：资料所有者可在资料卡查看，但 Agent prompt 不可读取。
    agent_view = client.app.state.memory.authorized_agent_view("person-k3-xiaoman")
    assert agent_view["tags"] == []
    assert agent_view["places"] == []
    authorized = client.patch(
        f"/api/v0/packages/person-k3-xiaoman/encounters/enc_k3_{PACKAGE_ID}/privacy",
        json={"privacy": "agent-usable"},
    )
    assert authorized.status_code == 200, authorized.text
    agent_view = client.app.state.memory.authorized_agent_view("person-k3-xiaoman")
    assert "具身智能" in " ".join(agent_view["memory_lines"])
    assert agent_view["tags"]
    revoked = client.patch(
        f"/api/v0/packages/person-k3-xiaoman/encounters/enc_k3_{PACKAGE_ID}/privacy",
        json={"privacy": "self-only"},
    )
    assert revoked.status_code == 200
    assert client.app.state.memory.authorized_agent_view("person-k3-xiaoman")["tags"] == []

    hall = client.get("/api/v0/world/snapshot", params={"world": "hall"})
    assert hall.status_code == 200
    hall_ids = {agent["id"] for agent in hall.json()["agents"]}
    assert {"person-k3-xiaoman", "person-k3-liqing"}.issubset(hall_ids)


def test_physical_ai_rejects_header_mismatch_and_idempotency_conflict(client, monkeypatch):
    monkeypatch.setenv("PHYSICAL_AI_AGENT_TOKEN", TOKEN)
    assert all(response.status_code == 200 for response in _upload_required_assets(client))
    mismatch = _post_package(client, package_id="package-other")
    assert mismatch.status_code == 400

    assert _post_package(client).status_code == 202
    changed = _package()
    changed["agent_view"]["scene"]["caption"] = "不同内容"
    conflict = _post_package(client, changed)
    assert conflict.status_code == 409


def test_physical_ai_accepts_formal_k3_schema_and_metric_arrays(client, monkeypatch):
    schema = Path("/root/AVjoint/agent-ingest-bridge/contracts/agent-package.schema.json")
    if not schema.is_file():
        pytest.skip("K3 formal contract workspace is not mounted")
    monkeypatch.setenv("PHYSICAL_AI_AGENT_TOKEN", TOKEN)
    monkeypatch.setenv("PHYSICAL_AI_PACKAGE_SCHEMA", str(schema))
    payload = _formal_package()
    response = _post_package(
        client, payload, package_id=payload["package_id"], key=payload["idempotency_key"],
    )
    assert response.status_code == 202, response.text
    package = client.get("/api/v0/packages/person-formal-contract")
    assert package.status_code == 200, package.text
    assert package.json()["identity"]["name"] == "正式合约"
    signal = client.get("/api/v0/people/person-formal-contract/signal")
    assert signal.status_code == 200, signal.text
    assert signal.json()["heart"] == {
        "currentBpm": 80.0,
        "baselineBpm": 77.0,
        "peakBpm": 80.0,
        "heartScore": 58,
        "trend": "rising",
        "explanation": "佩戴者在共同会话中的最近心率为 80 bpm。",
    }
