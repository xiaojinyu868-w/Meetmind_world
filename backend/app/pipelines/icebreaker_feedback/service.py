"""Persist icebreaker actions as immutable facts and sourced inferences."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from app.packages.store import FactLayerImmutableError, PackageNotFound


class IcebreakerFeedbackService:
    def __init__(self, store):
        self.store = store

    def record(self, room_id: str, session: dict) -> dict:
        session_id = str(session["session_id"])
        submissions = session.get("submissions") or {}
        updates = []
        for person_id, answer in sorted(submissions.items()):
            try:
                package = self.store.load_package(person_id)
            except PackageNotFound:
                continue
            if not package["identity"].get("confirmed"):
                continue
            submission = {
                "schema": "meetmind.icebreaker-submission.v1",
                "session_id": session_id,
                "room_id": room_id,
                "person_id": person_id,
                "game_type": session.get("game_type"),
                "prompt": session.get("prompt"),
                "answer": str(answer),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            try:
                source_ref = self.store.write_fact(
                    person_id, session_id, "submission.json",
                    json.dumps(submission, ensure_ascii=False, indent=2).encode("utf-8"),
                )
            except FactLayerImmutableError:
                source_ref = f"facts/{person_id}/{session_id}/submission.json"
            inference_id = f"icebreaker_{session_id.replace('-', '_')}"
            inference = {
                "schema": "meetmind.inference.v1", "id": inference_id,
                "type": "icebreaker-behavior", "value": str(answer),
                "author_id": person_id, "subject_id": person_id,
                "privacy": "agent-usable", "source_refs": [source_ref],
                "model": "human-action.v1", "confidence": 1.0,
                "created_at": submission["created_at"], "regenerable": False,
            }
            inference_ref = self.store.write_inference(person_id, inference_id, inference)
            updates.append({
                "person_id": person_id, "inference_id": inference_id,
                "source_ref": source_ref, "inference_ref": inference_ref,
            })
        return {"session_id": session_id, "updates": updates}
