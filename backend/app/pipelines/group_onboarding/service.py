"""Group-photo onboarding workflow for MVP2 FR-2.12.

两段式流程（ROADMAP 2.H.1）：
1. detect()：合照落事实层 → 人脸检测（qwen-vl 优先，OpenCV 兜底）→ 裁剪人脸
   存生成物 → 返回 group_id + 人脸候选（不建任何 Package）；
2. confirm()：用户逐脸确认姓名后提交 assignments → 批量建档 + 确认身份 +
   展位大厅注册 + 可选第一印象/自评推断。
run() 保留原一次性行为（脚本/测试用），内部即 detect + confirm 的组合。
"""

from __future__ import annotations

import json
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.pipeline.person_builder import _default_palette_for
from app.world.hall import build_display_from_package

from .detect import MAX_FACES, GroupFaceDetector, mime_for_filename

GROUP_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,80}$")


def _safe_filename(filename: str) -> str:
    suffix = Path(filename or "group.jpg").suffix.lower()
    return "group" + (suffix if suffix in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg")


class GroupOnboardingService:
    """Stores one immutable group photo and creates reviewable Person packages."""

    def __init__(self, store, hall=None, face_detector: GroupFaceDetector | None = None):
        self.store = store
        self.hall = hall
        self._face_detector = face_detector  # None → 惰性构建（qwen-vl → OpenCV）

    # ---------- 检测（第一段：不建 Package） ----------

    def _detect(self, image_bytes: bytes, mime: str) -> tuple[list[dict], str]:
        detector = self._face_detector or GroupFaceDetector()
        return detector.detect(image_bytes, mime)

    def detect(self, image_bytes: bytes, filename: str, *,
               expected_count: int = 0) -> dict:
        """合照落事实层 + 人脸候选（bbox + face_ref），不创建任何 Package。"""
        if not image_bytes:
            raise ValueError("group photo must not be empty")
        if expected_count < 0 or expected_count > MAX_FACES:
            raise ValueError(f"expected_count must be between 0 and {MAX_FACES}")
        group_id = f"group_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        date = datetime.now(timezone.utc).date().isoformat()
        photo_ref = self.store.write_fact(date, group_id, _safe_filename(filename), image_bytes)

        detected, detector_source = self._detect(image_bytes, mime_for_filename(filename))
        faces = []
        for index, face in enumerate(detected):
            face_id = f"face_{index + 1:02d}"
            face_ref = self.store.write_derived_asset(
                "group-faces", group_id, f"{face_id}.jpg", face["bytes"]
            )
            faces.append({"face_id": face_id, "bbox": face["bbox"], "face_ref": face_ref})

        payload = {
            "schema": "meetmind.group-detection.v1",
            "group_id": group_id,
            "source_ref": photo_ref,
            "detector": detector_source,
            "detected_count": len(faces),
            "expected_count": expected_count,
            "faces": faces,
        }
        self.store.write_derived_asset(
            "group-onboarding", group_id, "detect.json",
            json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
        )
        issues = []
        if not faces:
            issues.append("未检测到清晰人脸，可重新上传更清晰的合照")
        elif expected_count and len(faces) != expected_count:
            issues.append(f"检测到 {len(faces)} 张人脸，与预期 {expected_count} 人不一致，请逐一核对")
        return {**payload, "status": "ready" if faces else "needs-review", "issues": issues}

    def _load_detection(self, group_id: str) -> dict:
        """读取 detect 阶段的生成物清单；group_id 非法或不存在抛 ValueError。"""
        if not GROUP_ID_PATTERN.match(str(group_id or "")):
            raise ValueError("group_id 格式不合法")
        target = (self.store.derived_dir / "group-onboarding" / group_id / "detect.json")
        if not target.is_file():
            raise ValueError(f"未知的 group_id（请先调用 detect）：{group_id}")
        return json.loads(target.read_text(encoding="utf-8"))

    # ---------- 确认（第二段：批量建档 + 展位） ----------

    @staticmethod
    def _match_face(assignment: dict, faces: list[dict]) -> dict | None:
        """按 face_id → face_ref → bbox 近似，把 assignment 对回检测到的人脸。"""
        face_id = assignment.get("face_id")
        if face_id:
            for face in faces:
                if face["face_id"] == face_id:
                    return face
        face_ref = assignment.get("face_ref")
        if face_ref:
            for face in faces:
                if face["face_ref"] == face_ref:
                    return face
        bbox = assignment.get("bbox")
        if isinstance(bbox, dict) and {"x", "y"} <= set(bbox):
            try:
                ax, ay = float(bbox["x"]), float(bbox["y"])
            except (TypeError, ValueError):
                return None
            for face in faces:
                if (abs(face["bbox"]["x"] - ax) < 0.03
                        and abs(face["bbox"]["y"] - ay) < 0.03):
                    return face
        return None

    def confirm(self, group_id: str, assignments: list[dict], *,
                confirm_participants: bool = True) -> dict:
        """按用户确认的人脸-姓名指派批量建档；可选 impression 写第一印象推断。"""
        detection = self._load_detection(group_id)
        faces = detection.get("faces", [])
        photo_ref = detection["source_ref"]
        assignments = list(assignments or [])
        if not assignments:
            raise ValueError("assignments 至少包含一位人物")
        if len(assignments) > MAX_FACES:
            raise ValueError(f"assignments 最多 {MAX_FACES} 人")

        participants = []
        now = datetime.now(timezone.utc).isoformat()
        for index, assignment in enumerate(assignments):
            name = str(assignment.get("name") or "").strip()[:80] or None
            person_id = f"person_{uuid.uuid4().hex[:16]}"
            face = self._match_face(assignment, faces)
            face_ref = face["face_ref"] if face else None
            package = self.store.create_draft_package(
                person_id, _default_palette_for(person_id)
            )
            encounter = {
                "encounter_id": f"enc_{group_id}_{index + 1}",
                "time": now,
                "place": "现场群体入场",
                "facts": {"media": [photo_ref], "photos": [photo_ref], "transcript": None},
                "inferences": [],
                "privacy": "self-only",
            }
            package["encounters"].append(encounter)
            package["identity"]["face_ref"] = face_ref
            package["avatar"].update({"type": "voxel-textured.v1", "real_face_ref": face_ref})

            impression = str(assignment.get("impression") or "").strip()[:300]
            if impression:
                inference_id = f"inf_{group_id}_{index + 1}"
                encounter["inferences"].append({
                    "id": inference_id, "type": "first-impression", "value": impression,
                    "source_facts": [photo_ref], "model": "human-authored.v1",
                    "confidence": 1.0, "created_at": now, "privacy": "self-only",
                })
                self.store.write_inference(person_id, inference_id, {
                    "schema": "meetmind.inference.v1", "id": inference_id,
                    "type": "first-impression", "value": impression,
                    "author_id": "group-onboarding", "subject_id": person_id,
                    "privacy": "self-only", "source_refs": [photo_ref],
                    "model": "human-authored.v1", "confidence": 1.0,
                    "created_at": now, "regenerable": False,
                })
            self.store.save_package(package)

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
            "detected_count": len(faces),
            "issues": (["部分人物未匹配到检测人脸，已生成程序化体素形象"]
                       if needs_review else []),
        }

    # ---------- 一次性流程（脚本/测试兼容入口） ----------

    def run(
        self,
        image_bytes: bytes,
        filename: str,
        participant_names: list[str],
        *,
        expected_count: int = 0,
        confirm_participants: bool = True,
    ) -> dict:
        names = [str(name).strip()[:80] for name in participant_names if str(name).strip()]
        if len(names) > MAX_FACES:
            raise ValueError(f"participant_names supports at most {MAX_FACES} people")
        detection = self.detect(image_bytes, filename, expected_count=expected_count)
        faces = detection["faces"]
        count = max(len(faces), len(names), expected_count)
        if count == 0:
            return {
                "schema": "meetmind.group-onboarding.v1", "group_id": detection["group_id"],
                "status": "needs-review", "source_ref": detection["source_ref"],
                "detected_count": 0, "participants": [],
                "issues": ["未检测到清晰人脸，请提交人物姓名或人工裁剪"],
            }
        assignments = [
            {
                "face_id": faces[index]["face_id"] if index < len(faces) else None,
                "name": names[index] if index < len(names) else None,
            }
            for index in range(count)
        ]
        return self.confirm(detection["group_id"], assignments,
                            confirm_participants=confirm_participants)
