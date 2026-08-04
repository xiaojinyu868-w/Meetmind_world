"""Group-photo onboarding workflow for MVP2 FR-2.12."""

from __future__ import annotations

import json
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.pipeline.person_builder import _default_palette_for
from app.world.hall import build_display_from_package


def _safe_filename(filename: str) -> str:
    suffix = Path(filename or "group.jpg").suffix.lower()
    return "group" + (suffix if suffix in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg")


def _detect_faces(image_bytes: bytes) -> list[dict]:
    """Best-effort local face crops; absence of OpenCV is an explicit review state."""
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except ImportError:
        return []
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return []
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(
        str(Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml")
    )
    if cascade.empty():
        return []
    boxes = cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4,
                                     minSize=(32, 32))
    height, width = image.shape[:2]
    results = []
    for x, y, w, h in sorted(boxes, key=lambda box: (box[0], box[1])):
        margin = int(max(w, h) * 0.18)
        x0, y0 = max(0, x - margin), max(0, y - margin)
        x1, y1 = min(width, x + w + margin), min(height, y + h + margin)
        ok, encoded = cv2.imencode(".jpg", image[y0:y1, x0:x1])
        if not ok:
            continue
        results.append({
            "bbox": {
                "x": round(x0 / width, 5), "y": round(y0 / height, 5),
                "width": round((x1 - x0) / width, 5),
                "height": round((y1 - y0) / height, 5),
            },
            "bytes": encoded.tobytes(),
        })
    return results


class GroupOnboardingService:
    """Stores one immutable group photo and creates reviewable Person packages."""

    def __init__(self, store, hall=None):
        self.store = store
        self.hall = hall

    def run(
        self,
        image_bytes: bytes,
        filename: str,
        participant_names: list[str],
        *,
        expected_count: int = 0,
        confirm_participants: bool = True,
    ) -> dict:
        if not image_bytes:
            raise ValueError("group photo must not be empty")
        names = [str(name).strip()[:80] for name in participant_names if str(name).strip()]
        if len(names) > 50:
            raise ValueError("participant_names supports at most 50 people")
        if expected_count < 0 or expected_count > 50:
            raise ValueError("expected_count must be between 0 and 50")
        group_id = f"group_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        date = datetime.now(timezone.utc).date().isoformat()
        photo_ref = self.store.write_fact(date, group_id, _safe_filename(filename), image_bytes)
        detected = _detect_faces(image_bytes)[:50]
        count = max(len(detected), len(names), expected_count)
        if count == 0:
            return {
                "schema": "meetmind.group-onboarding.v1", "group_id": group_id,
                "status": "needs-review", "source_ref": photo_ref,
                "detected_count": 0, "participants": [],
                "issues": ["未检测到清晰人脸，请提交人物姓名或人工裁剪"],
            }

        participants = []
        now = datetime.now(timezone.utc).isoformat()
        for index in range(count):
            person_id = f"person_{uuid.uuid4().hex[:16]}"
            face = detected[index] if index < len(detected) else None
            face_ref = None
            if face is not None:
                face_ref = self.store.write_derived_asset(
                    "group-faces", group_id, f"face_{index + 1:02d}.jpg", face["bytes"]
                )
            package = self.store.create_draft_package(
                person_id, _default_palette_for(person_id)
            )
            package["encounters"].append({
                "encounter_id": f"enc_{group_id}_{index + 1}",
                "time": now,
                "place": "现场群体入场",
                "facts": {"media": [photo_ref], "photos": [photo_ref], "transcript": None},
                "inferences": [],
                "privacy": "self-only",
            })
            package["identity"]["face_ref"] = face_ref
            package["avatar"].update({"type": "voxel-textured.v1", "real_face_ref": face_ref})
            self.store.save_package(package)
            name = names[index] if index < len(names) else None
            if confirm_participants:
                package = self.store.confirm_identity(person_id, name=name)
            booth_id = None
            if confirm_participants and self.hall is not None:
                booth = self.hall.register_person(
                    person_id, build_display_from_package(package, self.store)
                )
                booth_id = booth["id"]
            participants.append({
                "person_id": person_id, "name": name,
                "confirmed": bool(confirm_participants),
                "face_ref": face_ref, "bbox": face["bbox"] if face else None,
                "needs_face_review": face is None, "booth_id": booth_id,
                "avatar_status": "ready" if face_ref else "procedural",
            })

        manifest = {
            "schema": "meetmind.group-onboarding.v1", "group_id": group_id,
            "source_ref": photo_ref, "participants": participants,
        }
        self.store.write_derived_asset(
            "group-onboarding", group_id, "manifest.json",
            json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8"),
        )
        needs_review = any(item["needs_face_review"] for item in participants)
        return {
            **manifest,
            "status": "needs-review" if needs_review else "ready",
            "detected_count": len(detected),
            "issues": (["部分人物未获得独立人脸裁剪，已生成程序化体素形象"]
                       if needs_review else []),
        }
