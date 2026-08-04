"""MVP2 现场房间、第一印象与“谁写的？”闭环测试。"""

import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    return TestClient(create_app())


def _create_room(client):
    response = client.post(
        "/api/v0/group/sessions",
        json={
            "title": "周五工作坊",
            "host": {"person_id": "host", "display_name": "小满"},
            "participants": [
                {"person_id": "alice", "display_name": "阿澄", "avatar_ref": "avatars/a.glb"},
                {"person_id": "bob", "display_name": "柏舟", "avatar_ref": "avatars/b.glb"},
            ],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _fill_impressions(client, room):
    names = {"host": "小满", "alice": "阿澄", "bob": "柏舟"}
    for author_id in names:
        for subject_id in names:
            kind = "自评" if author_id == subject_id else "印象"
            response = client.put(
                f"/api/v0/group/sessions/{room['session_id']}/impressions",
                json={
                    "author_id": author_id,
                    "subject_id": subject_id,
                    "value": f"{kind}-{author_id}-写给-{subject_id}",
                },
            )
            assert response.status_code == 200, response.text
    return response.json()


def test_room_create_join_and_viewer_snapshot(client):
    room = _create_room(client)
    assert room["schema"] == "echo-group-room.v1"
    assert len(room["code"]) == 6
    assert room["phase"] == "impressions"
    assert room["impression_progress"] == {
        "submitted": 0,
        "required": 9,
        "complete": False,
        "by_author": {
            "host": {"submitted": 0, "required": 3},
            "alice": {"submitted": 0, "required": 3},
            "bob": {"submitted": 0, "required": 3},
        },
    }

    joined = client.post(
        "/api/v0/group/sessions/join",
        json={
            "code": room["code"].lower(),
            "participant": {"person_id": "guest", "display_name": "新同伴"},
        },
    )
    assert joined.status_code == 200, joined.text
    assert len(joined.json()["participants"]) == 4
    assert joined.json()["impression_progress"]["required"] == 16

    missing = client.get("/api/v0/group/sessions/not-found")
    assert missing.status_code == 404

    unsafe = client.post(
        "/api/v0/group/sessions",
        json={
            "title": "非法 ID",
            "host": {"person_id": "../host", "display_name": "越界"},
            "participants": [{"person_id": "ok", "display_name": "正常"}],
        },
    )
    assert unsafe.status_code == 422
    assert "person_id" in unsafe.json()["detail"]


def test_presence_rejects_stale_sequence_and_clamps_venue_bounds(client):
    room = _create_room(client)
    path = f"/api/v0/group/sessions/{room['session_id']}/presence"
    response = client.put(
        path,
        json={
            "person_id": "alice",
            "seq": 1,
            "position": {"x": 99, "z": -99, "yaw": 10},
        },
    )
    assert response.status_code == 200
    alice = next(item for item in response.json()["participants"] if item["person_id"] == "alice")
    assert alice["presence"]["x"] == 7.0
    assert alice["presence"]["z"] == -5.0
    assert -3.1416 <= alice["presence"]["yaw"] <= 3.1416

    stale = client.put(
        path,
        json={
            "person_id": "alice",
            "seq": 1,
            "position": {"x": 0, "z": 0, "yaw": 0},
        },
    )
    assert stale.status_code == 409
    assert "序号已过期" in stale.json()["detail"]


def test_impressions_are_attributed_and_persisted_in_inference_layer(client, tmp_path):
    room = _create_room(client)
    path = f"/api/v0/group/sessions/{room['session_id']}/impressions"
    response = client.put(
        path,
        json={"author_id": "host", "subject_id": "alice", "value": "安静但会照顾每个人"},
    )
    assert response.status_code == 200
    assert response.json()["impression_progress"]["submitted"] == 1
    assert "actor_id" not in response.json()["events"][-1]
    assert "subject_id" not in response.json()["events"][-1]

    late_join = client.post(
        "/api/v0/group/sessions/join",
        json={
            "code": room["code"],
            "participant": {"person_id": "late", "display_name": "迟到同伴"},
        },
    )
    assert late_join.status_code == 409
    assert "不能再改变现场名单" in late_join.json()["detail"]

    inference_path = (
        tmp_path
        / "inferences"
        / "alice"
        / f"group-impression-{room['session_id']}-host.json"
    )
    payload = json.loads(inference_path.read_text(encoding="utf-8"))
    assert payload["schema"] == "echo-group-impression.v1"
    assert payload["generated"] is False
    assert payload["impression"]["author_id"] == "host"
    assert payload["impression"]["subject_id"] == "alice"
    assert payload["impression"]["kind"] == "peer"
    assert payload["impression"]["source"] == {
        "type": "group-session",
        "session_id": room["session_id"],
        "room_code": room["code"],
    }

    duplicate = client.put(
        path,
        json={"author_id": "host", "subject_id": "alice", "value": "试图覆盖"},
    )
    assert duplicate.status_code == 409
    assert "不能重复覆盖" in duplicate.json()["detail"]


def test_impression_batch_validates_the_whole_group_before_writing(client):
    room = _create_room(client)
    path = f"/api/v0/group/sessions/{room['session_id']}/impressions/batch"
    invalid = client.put(
        path,
        json={
            "author_id": "host",
            "impressions": [
                {"subject_id": "host", "value": "先听完"},
                {"subject_id": "host", "value": "重复对象"},
            ],
        },
    )
    assert invalid.status_code == 422
    snapshot = client.get(
        f"/api/v0/group/sessions/{room['session_id']}",
        params={"viewer_id": "host"},
    ).json()
    assert snapshot["impression_progress"]["submitted"] == 0

    incomplete = client.put(
        path,
        json={
            "author_id": "host",
            "impressions": [
                {"subject_id": "host", "value": "会先听完"},
                {"subject_id": "alice", "value": "很有耐心"},
            ],
        },
    )
    assert incomplete.status_code == 422
    assert "每一位参与者" in incomplete.json()["detail"]

    valid = client.put(
        path,
        json={
            "author_id": "host",
            "impressions": [
                {"subject_id": "host", "value": "会先听完"},
                {"subject_id": "alice", "value": "很有耐心"},
                {"subject_id": "bob", "value": "行动很快"},
            ],
        },
    )
    assert valid.status_code == 200, valid.text
    assert valid.json()["impression_progress"]["submitted"] == 3
    assert valid.json()["impression_progress"]["by_author"]["host"] == {
        "submitted": 3,
        "required": 3,
    }


def test_who_wrote_it_hides_answer_then_returns_results_to_inferences(client, tmp_path):
    room = _create_room(client)
    complete = _fill_impressions(client, room)
    assert complete["impression_progress"]["complete"] is True

    started = client.post(
        f"/api/v0/group/sessions/{room['session_id']}/game/start",
        json={"actor_id": "host"},
    )
    assert started.status_code == 200, started.text
    game = started.json()["game"]
    assert game["status"] == "playing"
    assert game["round_count"] == 3
    assert game["current_round"]["guesser_id"] == "host"
    assert "author_id" not in game["current_round"]

    expected_by_text = {
        f"印象-{author_id}-写给-{subject_id}": author_id
        for author_id in ("host", "alice", "bob")
        for subject_id in ("host", "alice", "bob")
        if author_id != subject_id
    }
    for index in range(3):
        snapshot = client.get(
            f"/api/v0/group/sessions/{room['session_id']}",
            params={"viewer_id": "host"},
        ).json()
        current = snapshot["game"]["current_round"]
        guesser_id = current["guesser_id"]
        expected = expected_by_text[current["text"]]
        guessed = client.post(
            f"/api/v0/group/sessions/{room['session_id']}/game/guess",
            json={"player_id": guesser_id, "author_id": expected},
        )
        assert guessed.status_code == 200, guessed.text
        revealed = guessed.json()["game"]["current_round"]
        assert revealed["author_id"] == expected
        assert revealed["guess"]["correct"] is True

        advanced = client.post(
            f"/api/v0/group/sessions/{room['session_id']}/game/next",
            json={"actor_id": "host"},
        )
        assert advanced.status_code == 200, advanced.text
        if index < 2:
            assert advanced.json()["phase"] == "game"
        else:
            assert advanced.json()["phase"] == "results"

    result = advanced.json()
    assert result["game"]["status"] == "finished"
    assert result["game"]["scores"] == {"host": 1, "alice": 1, "bob": 1}
    assert result["events"][-1]["type"] == "game-finished"

    for person_id in ("host", "alice", "bob"):
        inference_path = (
            tmp_path
            / "inferences"
            / person_id
            / f"group-game-result-{room['session_id']}.json"
        )
        payload = json.loads(inference_path.read_text(encoding="utf-8"))
        assert payload["schema"] == "echo-group-game-result.v1"
        assert payload["score"] == 1
        assert payload["source"]["session_id"] == room["session_id"]
