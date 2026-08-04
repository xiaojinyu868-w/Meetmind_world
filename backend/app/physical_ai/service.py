"""K3 Context Hub 接收存储与 EchoWorld Package 导入。"""

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from app.agents.memory.store import MemoryStore
from app.config import get_physical_ai_package_schema
from app.packages.store import FactLayerImmutableError, PackageNotFound
from app.pipeline.person_builder import _default_palette_for
from app.pipelines.physical_ai_enrichment import (
    PhysicalAIEnrichmentService,
    VoxelAvatarGenerator,
)
from app.signals import PersonSignalProjector
from app.world.hall import build_display_from_package

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
SUPPORTED_SCHEMA_VERSIONS = {"1.0", "1.1"}

EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "audio/wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "video/mp4": ".mp4",
}


class PhysicalAIError(ValueError):
    def __init__(self, detail: str, status_code: int = 422):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def _canonical_bytes(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def _nonempty_id(value, field: str) -> str:
    if not isinstance(value, str) or not ID_RE.fullmatch(value):
        raise PhysicalAIError(f"{field} 格式不合法")
    return value


def _session_id(payload: dict) -> str:
    candidates = [
        payload.get("session_id"),
        (payload.get("session") or {}).get("session_id"),
        (payload.get("session") or {}).get("id"),
        ((payload.get("agent_view") or {}).get("time") or {}).get("session_id"),
    ]
    for value in candidates:
        if isinstance(value, str) and value:
            return _nonempty_id(value, "session_id")
    raise PhysicalAIError("package 缺少 session_id")


class PhysicalAIReceiver:
    def __init__(
        self, store, hall=None, memory=None, enrichment=None, avatar_generator=None,
        signal_projector=None,
    ):
        self.store = store
        self.hall = hall
        self.memory = memory or MemoryStore(store)
        self.enrichment = enrichment or PhysicalAIEnrichmentService(store, self.memory)
        self.avatar_generator = avatar_generator or VoxelAvatarGenerator(store)
        self.signal_projector = signal_projector or PersonSignalProjector(store)
        self.root = store.root / "physical-ai"
        self.objects = self.root / "objects"
        self.assets = self.root / "assets"
        self.packages = self.root / "packages"
        self.receipts = self.root / "receipts"
        for directory in (self.objects, self.assets, self.packages, self.receipts):
            directory.mkdir(parents=True, exist_ok=True)

    def object_path(self, object_id: str) -> Path:
        if not SHA256_RE.fullmatch(object_id):
            raise PhysicalAIError("object_id 必须是 64 位小写 SHA-256")
        return self.objects / object_id

    def asset_metadata(self, asset_id: str) -> dict | None:
        _nonempty_id(asset_id, "asset_id")
        path = self.assets / f"{asset_id}.json"
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None

    def register_asset(
        self, *, object_id: str, asset_id: str, session_id: str,
        content_type: str, size_bytes: int,
    ) -> str:
        object_path = self.object_path(object_id)
        _nonempty_id(asset_id, "asset_id")
        _nonempty_id(session_id, "session_id")
        if not object_path.is_file():
            raise PhysicalAIError("媒体对象尚未写入")
        target = self.assets / f"{asset_id}.json"
        metadata = {
            "asset_id": asset_id,
            "session_id": session_id,
            "object_id": object_id,
            "content_type": content_type,
            "size_bytes": size_bytes,
        }
        if target.exists():
            existing = json.loads(target.read_text(encoding="utf-8"))
            if existing != metadata:
                raise PhysicalAIError(f"asset_id 已关联其他对象：{asset_id}", 409)
            return "already_present"
        target.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
        return "stored"

    def validate_package(self, payload: dict, package_id: str, idempotency_key: str) -> str:
        if not isinstance(payload, dict):
            raise PhysicalAIError("package 请求体必须是 JSON object")
        if payload.get("schema_version") not in SUPPORTED_SCHEMA_VERSIONS:
            raise PhysicalAIError(
                f"不支持的 schema_version：{payload.get('schema_version')!r}"
            )
        if payload.get("package_id") != package_id:
            raise PhysicalAIError("X-Physical-AI-Package-Id 与 body.package_id 不一致", 400)
        if payload.get("idempotency_key") != idempotency_key:
            raise PhysicalAIError("X-Idempotency-Key 与 body.idempotency_key 不一致", 400)
        _nonempty_id(package_id, "package_id")
        if not SHA256_RE.fullmatch(idempotency_key):
            raise PhysicalAIError("idempotency_key 必须是 64 位小写十六进制")
        session_id = _session_id(payload)
        media = payload.get("media")
        if not isinstance(media, dict) or not isinstance(media.get("assets"), list):
            raise PhysicalAIError("package.media.assets 必须是数组")
        if not isinstance(payload.get("agent_view"), dict):
            raise PhysicalAIError("package.agent_view 必须是 object")
        if not isinstance(payload.get("persons"), list):
            raise PhysicalAIError("package.persons 必须是数组")

        schema_path = get_physical_ai_package_schema()
        if schema_path:
            if not schema_path.is_file():
                raise PhysicalAIError(f"PHYSICAL_AI_PACKAGE_SCHEMA 不存在：{schema_path}", 500)
            try:
                import jsonschema
                from referencing import Registry, Resource
            except ImportError as exc:
                raise PhysicalAIError("配置了正式 schema，但服务未安装 jsonschema", 500) from exc
            try:
                registry = Registry()
                schemas = {}
                for candidate in schema_path.parent.glob("*.schema.json"):
                    document = json.loads(candidate.read_text(encoding="utf-8"))
                    resource = Resource.from_contents(document)
                    registry = registry.with_resource(candidate.resolve().as_uri(), resource)
                    if isinstance(document.get("$id"), str):
                        registry = registry.with_resource(document["$id"], resource)
                    schemas[candidate.resolve()] = document
                schema = schemas[schema_path.resolve()]
                validator_class = jsonschema.validators.validator_for(schema)
                validator_class.check_schema(schema)
                validator_class(schema, registry=registry).validate(payload)
            except jsonschema.ValidationError as exc:
                raise PhysicalAIError(f"agent-package schema 校验失败：{exc.message}") from exc
            except Exception as exc:
                raise PhysicalAIError(f"agent-package schema 无法加载：{exc}", 500) from exc

        seen_assets = set()
        for index, asset in enumerate(media["assets"]):
            if not isinstance(asset, dict):
                raise PhysicalAIError(f"media.assets[{index}] 必须是 object")
            asset_id = _nonempty_id(asset.get("id"), f"media.assets[{index}].id")
            if asset_id in seen_assets:
                raise PhysicalAIError(f"media.assets 中 asset_id 重复：{asset_id}")
            seen_assets.add(asset_id)
            availability = asset.get("availability")
            if availability == "remote":
                if not asset.get("remote_uri"):
                    raise PhysicalAIError(f"remote 媒体缺少 remote_uri：{asset_id}")
                continue
            if availability == "missing":
                continue
            object_id = asset.get("object_id")
            if not isinstance(object_id, str) or not self.object_path(object_id).is_file():
                raise PhysicalAIError(f"package 引用了未上传媒体：{asset_id}", 409)
            metadata = self.asset_metadata(asset_id)
            if not metadata or metadata["object_id"] != object_id:
                raise PhysicalAIError(f"媒体登记与 package 不一致：{asset_id}", 409)
            if metadata["session_id"] != session_id:
                raise PhysicalAIError(f"媒体 session_id 与 package 不一致：{asset_id}", 409)
        return session_id

    def accept_package(self, payload: dict, package_id: str, idempotency_key: str) -> tuple[bool, str | None]:
        session_id = self.validate_package(payload, package_id, idempotency_key)
        body = _canonical_bytes(payload)
        body_sha = hashlib.sha256(body).hexdigest()
        receipt_path = self.receipts / f"{idempotency_key}.json"
        if receipt_path.exists():
            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            if receipt["body_sha256"] != body_sha or receipt["package_id"] != package_id:
                raise PhysicalAIError("同一 idempotency_key 对应了不同 package 内容", 409)
            return True, receipt.get("agent_job_id")

        package_path = self.packages / f"{package_id}.json"
        if package_path.exists() and package_path.read_bytes() != body:
            raise PhysicalAIError("package_id 已存在但内容不同", 409)
        package_path.write_bytes(body)
        imported = self._import_into_echoworld(payload, session_id, package_id)
        job_id = f"physical-ai-{package_id}"
        receipt = {
            "package_id": package_id,
            "session_id": session_id,
            "body_sha256": body_sha,
            "agent_job_id": job_id,
            "imported_person_ids": imported,
            "accepted_at": datetime.now(timezone.utc).isoformat(),
        }
        receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
        return False, job_id

    def _write_fact(self, partition: str, bundle: str, filename: str, data: bytes) -> str:
        try:
            return self.store.write_fact(partition, bundle, filename, data)
        except FactLayerImmutableError:
            ref = f"facts/{partition}/{bundle}/{filename}"
            if self.store.read_fact(ref) != data:
                raise PhysicalAIError(f"事实层已有不同内容：{ref}", 409)
            return ref

    def _copy_asset_fact(self, asset: dict, partition: str, bundle: str) -> str | None:
        object_id = asset.get("object_id")
        if not isinstance(object_id, str) or not self.object_path(object_id).is_file():
            return None
        content_type = str(asset.get("content_type") or "application/octet-stream").split(";", 1)[0]
        extension = EXTENSIONS.get(content_type, ".bin")
        filename = f"{asset['id']}{extension}"
        return self._write_fact(
            partition, bundle, filename, self.object_path(object_id).read_bytes(),
        )

    @staticmethod
    def _referenced_asset_ids(value, known: set[str]) -> list[str]:
        found = []

        def visit(item):
            if isinstance(item, str) and item in known and item not in found:
                found.append(item)
            elif isinstance(item, dict):
                for nested in item.values():
                    visit(nested)
            elif isinstance(item, list):
                for nested in item:
                    visit(nested)

        visit(value)
        return found

    @staticmethod
    def _person_identity(person: dict) -> tuple[str | None, str, bool]:
        identity = person.get("identity") if isinstance(person.get("identity"), dict) else {}
        name = (
            person.get("display_name") or person.get("name")
            or identity.get("display_name") or identity.get("name")
        )
        state = str(
            person.get("identity_state") or person.get("status") or person.get("state")
            or identity.get("state") or identity.get("status") or ""
        ).lower()
        confirmed = bool(person.get("confirmed") or identity.get("confirmed"))
        bindings = person.get("identity_bindings") or identity.get("bindings") or []
        binding_confirmed = any(
            isinstance(item, dict) and item.get("binding_state") == "confirmed"
            for item in bindings
        )
        confirmed = confirmed or binding_confirmed or state in {"confirmed", "resolved", "known"}
        clean_name = str(name).strip() if isinstance(name, str) else ""
        return (clean_name or None), state, bool(confirmed and clean_name)

    @staticmethod
    def _avatar_allowed(asset: dict) -> bool:
        scope = asset.get("consent_scope")
        if not isinstance(scope, list) or not scope:
            return True
        allowed = {"character_model", "character_texture", "pixel_texture"}
        return bool(allowed.intersection(str(item) for item in scope))

    @staticmethod
    def _best_confidence(value) -> float | None:
        found = []

        def visit(item):
            if isinstance(item, dict):
                for key, nested in item.items():
                    if key in {"confidence", "identity_score", "score"}:
                        try:
                            numeric = float(nested)
                        except (TypeError, ValueError):
                            numeric = -1
                        if 0 <= numeric <= 1:
                            found.append(numeric)
                    visit(nested)
            elif isinstance(item, list):
                for nested in item:
                    visit(nested)

        visit(value)
        return max(found) if found else None

    def _store_session_facts(
        self, payload: dict, session_id: str, package_id: str, assets: dict,
    ) -> tuple[str, dict[str, str], list[str]]:
        raw_ref = self._write_fact(
            "sessions", session_id, f"{package_id}.agent-package.json",
            _canonical_bytes(payload),
        )
        context = {
            "schema": "echo-physical-ai-session.v1",
            "package_id": package_id,
            "session_id": session_id,
            "session": payload.get("session") or {},
            "time": (payload.get("agent_view") or {}).get("time") or {},
            "shared_context": payload.get("shared_context") or {},
            "unassigned": payload.get("unassigned") or {},
            "data_policy": payload.get("data_policy") or {},
            "wearer": [
                entry for entry in (payload.get("persons") or [])
                if isinstance(entry, dict)
                and isinstance(entry.get("person"), dict)
                and (
                    entry["person"].get("person_id") == "person-self"
                    or str(entry["person"].get("role") or "").lower()
                    in {"self", "wearer", "owner"}
                )
            ],
        }
        context_ref = self._write_fact(
            "sessions", session_id, f"{package_id}.shared-context.json",
            json.dumps(context, ensure_ascii=False, indent=2).encode("utf-8"),
        )
        known = set(assets)
        view = payload.get("agent_view") or {}
        shared_ids = self._referenced_asset_ids(
            {
                "shared_context": payload.get("shared_context") or {},
                "scene": view.get("scene") or {},
                "original_frames": (view.get("images") or {}).get("original_frame_asset_ids") or [],
            },
            known,
        )
        for asset_id, asset in assets.items():
            if asset.get("role") in {"scene_frame", "conversation_recording"}:
                if asset_id not in shared_ids:
                    shared_ids.append(asset_id)
            if asset.get("subjects") == [] and asset_id not in shared_ids:
                shared_ids.append(asset_id)
        refs = [raw_ref, context_ref]
        refs_by_asset = {}
        for asset_id in shared_ids:
            asset = assets.get(asset_id)
            if not asset:
                continue
            ref = self._copy_asset_fact(asset, "sessions", session_id)
            if ref:
                refs_by_asset[asset_id] = ref
                refs.append(ref)
        return context_ref, refs_by_asset, refs

    def _import_into_echoworld(self, payload: dict, session_id: str, package_id: str) -> list[str]:
        assets = {item["id"]: item for item in payload["media"]["assets"]}
        view = payload["agent_view"]
        view_people = {
            item.get("person_id"): item
            for item in ((view.get("images") or {}).get("people") or [])
            if isinstance(item, dict) and item.get("person_id")
        }
        scene = view.get("scene") or {}
        scene_asset_ids = list(scene.get("source_frame_asset_ids") or [])
        all_turns = list((view.get("asr") or {}).get("turns") or [])
        session_ref, shared_refs_by_asset, shared_refs = self._store_session_facts(
            payload, session_id, package_id, assets,
        )
        captured_at = ((view.get("time") or {}).get("started_at")
                       or payload.get("created_at")
                       or datetime.now(timezone.utc).isoformat())
        wearer_entry = next((
            entry for entry in (payload.get("persons") or [])
            if isinstance(entry, dict)
            and isinstance(entry.get("person"), dict)
            and (
                entry["person"].get("person_id") == "person-self"
                or str(entry["person"].get("role") or "").lower()
                in {"self", "wearer", "owner"}
            )
        ), None)
        wearer_physiology = (wearer_entry or {}).get("physiology") or {}
        participant_count = sum(
            1 for entry in (payload.get("persons") or [])
            if isinstance(entry, dict)
            and isinstance(entry.get("person"), dict)
            and entry["person"].get("person_id") != "person-self"
            and str(entry["person"].get("role") or "").lower()
            not in {"self", "wearer", "owner"}
        )
        imported = []
        relationship_records = []
        for entry in payload.get("persons") or []:
            person = entry.get("person") if isinstance(entry, dict) else None
            if not isinstance(person, dict):
                continue
            person_id = person.get("person_id") or person.get("id")
            if not isinstance(person_id, str) or not ID_RE.fullmatch(person_id):
                continue
            role = str(person.get("role") or "").lower()
            if person_id == "person-self" or role in {"self", "wearer", "owner"}:
                continue
            name, identity_state, confirmed = self._person_identity(person)
            encounter_id = f"enc_k3_{package_id}"
            try:
                package = self.store.load_package(person_id)
            except PackageNotFound:
                package = self.store.create_draft_package(person_id, _default_palette_for(person_id))
            if any(item.get("encounter_id") == encounter_id for item in package["encounters"]):
                continue

            person_view = view_people.get(person_id) or {}
            asset_ids = list(entry.get("media_asset_ids") or [])
            headshot_ids = list(person_view.get("headshot_asset_ids") or [])
            best_headshot = person_view.get("best_headshot_asset_id")
            if best_headshot:
                headshot_ids.insert(0, best_headshot)
            turns = list((entry.get("voice") or {}).get("turns") or [])
            if not turns:
                turns = [turn for turn in all_turns if turn.get("speaker_id") == person_id]
            turn_asset_ids = self._referenced_asset_ids(turns, set(assets))
            ordered_ids = list(dict.fromkeys([*headshot_ids, *asset_ids, *turn_asset_ids]))
            refs, photos, audio_segments = list(shared_refs), [], []
            ref_by_asset = {}
            for asset_id in ordered_ids:
                asset = assets.get(asset_id)
                if not asset:
                    continue
                ref = self._copy_asset_fact(asset, person_id, encounter_id)
                if not ref:
                    continue
                refs.append(ref)
                ref_by_asset[asset_id] = ref
                if asset.get("kind") == "image" or str(asset.get("content_type", "")).startswith("image/"):
                    photos.append(ref)
                if asset.get("role") == "speaker_segment" or asset_id in turn_asset_ids:
                    audio_segments.append(ref)
            for asset_id in scene_asset_ids:
                ref = shared_refs_by_asset.get(asset_id)
                if ref and ref not in photos:
                    photos.append(ref)

            evidence = {
                "schema": "echo-physical-ai-person-evidence.v1",
                "package_id": package_id,
                "session_id": session_id,
                "person": person,
                "identity_state": identity_state,
                "face": entry.get("face") or {},
                "voice": entry.get("voice") or {},
                "physiology": entry.get("physiology") or {},
                "turns": turns,
                "scene": scene,
                "person_view": person_view,
                "media_asset_ids": ordered_ids,
                "session_fact": session_ref,
            }
            evidence_ref = self._write_fact(
                person_id, encounter_id, "person-evidence.v1.json",
                json.dumps(evidence, ensure_ascii=False, indent=2).encode("utf-8"),
            )
            refs.append(evidence_ref)
            transcript_ref = None
            text_parts = [str(turn.get("text") or "").strip() for turn in turns]
            text_parts = [text for text in text_parts if text]
            if text_parts:
                transcript_json_ref = self._write_fact(
                    person_id, encounter_id, "transcript.v1.json",
                    json.dumps({"turns": turns}, ensure_ascii=False, indent=2).encode("utf-8"),
                )
                transcript = "# K3 会话转写\n\n" + "\n\n".join(text_parts) + "\n"
                transcript_ref = self._write_fact(
                    person_id, encounter_id, "transcript.v1.md", transcript.encode("utf-8"),
                )
                refs.append(transcript_json_ref)
                refs.append(transcript_ref)

            analysis = self.enrichment.analyze(evidence)
            self.store.write_inference(
                person_id, f"physical-ai-{package_id}", {
                    "schema": "echo-physical-ai-analysis.v1",
                    "source_facts": [evidence_ref],
                    **analysis,
                },
            )
            inferences = self.enrichment.inference_records(
                analysis=analysis, package_id=package_id, source_ref=evidence_ref,
            )
            caption = str(scene.get("caption") or "").strip()
            face_observations = (evidence["face"].get("observations") or []) \
                if isinstance(evidence["face"], dict) else []
            voice_summary = evidence["voice"] if isinstance(evidence["voice"], dict) else {}
            package["encounters"].append({
                "encounter_id": encounter_id,
                "time": captured_at,
                "place": caption[:80] if caption else "K3 现场会话",
                "facts": {
                    "media": list(dict.fromkeys(refs)),
                    "transcript": transcript_ref,
                    "photos": photos[:2],
                    "session": session_ref,
                    "person_evidence": evidence_ref,
                    "speaker_audio": audio_segments,
                    "conversation_recordings": [
                        ref for asset_id, ref in shared_refs_by_asset.items()
                        if assets[asset_id].get("role") == "conversation_recording"
                    ],
                    "face_observations": evidence_ref if evidence["face"] else None,
                    "voice_identity": evidence_ref if evidence["voice"] else None,
                    "physiology": evidence_ref if evidence["physiology"] else None,
                    "face_summary": {
                        "observation_count": len(face_observations),
                        "confidence": self._best_confidence(evidence["face"]),
                    },
                    "voice_summary": {
                        "identity_state": voice_summary.get("identity_state"),
                        "confidence": self._best_confidence(voice_summary),
                        "turn_count": len(turns),
                    },
                },
                "inferences": inferences,
                "privacy": "self-only",
            })
            signal = self.signal_projector.project(
                person_id=person_id,
                physiology=wearer_physiology,
                package_id=package_id,
                encounter_id=encounter_id,
                captured_at=captured_at,
                source_ref=session_ref,
                participant_count=participant_count,
            )
            if signal:
                package["signal"] = signal
            if headshot_ids:
                package["identity"]["face_ref"] = ref_by_asset.get(headshot_ids[0]) or (photos[0] if photos else None)
                package["avatar"]["real_face_ref"] = package["identity"]["face_ref"]
                headshot_asset = next((assets.get(item) for item in headshot_ids if assets.get(item)), None)
                headshot_ref = next((ref_by_asset.get(item) for item in headshot_ids if ref_by_asset.get(item)), None)
                if headshot_asset and headshot_ref and self._avatar_allowed(headshot_asset):
                    object_id = headshot_asset.get("object_id")
                    if isinstance(object_id, str) and self.object_path(object_id).is_file():
                        generated = self.avatar_generator.generate(
                            person_id=person_id,
                            image_bytes=self.object_path(object_id).read_bytes(),
                            mime=str(headshot_asset.get("content_type") or "image/jpeg"),
                            source_ref=headshot_ref,
                        )
                        package["avatar"].update({
                            "type": "voxel-photo-atlas-v1",
                            "model_ref": generated["model_ref"],
                            "texture_ref": generated["texture_ref"],
                            "expression_refs": generated["expression_refs"],
                            "manifest_ref": generated["manifest_ref"],
                            "generation_id": generated["generation_id"],
                            "generation_model": generated["model"],
                            "source_facts": generated["source_facts"],
                        })
            self.store.save_package(package)
            if confirmed:
                package = self.store.confirm_identity(person_id, name=name)
                self.enrichment.persist_memory(person_id, analysis, evidence_ref)
                if self.hall is not None:
                    try:
                        self.hall.register_person(person_id, build_display_from_package(package, self.store))
                    except ValueError:
                        pass
                imported.append(person_id)
                relationship_records.append({
                    "person_id": person_id,
                    "name": name,
                    "topics": analysis.get("topics") or [],
                    "relation_keywords": analysis.get("relation_keywords") or [],
                })
        if relationship_records:
            self.enrichment.persist_relationships(
                relationship_records, f"enc_k3_{package_id}",
            )
        return imported
