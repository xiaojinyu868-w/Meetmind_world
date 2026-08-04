"""Versioned, regenerable relationship-Field generation workflow."""

from __future__ import annotations

import hashlib
import json
import time
import uuid
from datetime import datetime, timezone


POSITIVE_WORDS = ("信任", "温暖", "支持", "默契", "开心", "合作", "有趣")
ENERGY_WORDS = ("活跃", "热情", "冒险", "游戏", "挑战", "快速")


class FieldGenerationService:
    def __init__(self, store):
        self.store = store

    def generate(
        self,
        owner_id: str,
        counterpart_id: str,
        source_refs: list[str],
        *,
        notes: list[str] | None = None,
        privacy: str = "self-only",
    ) -> dict:
        if owner_id == counterpart_id:
            raise ValueError("Field requires two different people")
        if not source_refs:
            raise ValueError("Field requires at least one immutable source reference")
        for ref in source_refs:
            self.store.read_fact(ref)
        combined = " ".join(str(note) for note in (notes or []))
        warmth = min(1.0, 0.45 + sum(word in combined for word in POSITIVE_WORDS) * 0.07)
        energy = min(1.0, 0.35 + sum(word in combined for word in ENERGY_WORDS) * 0.09)
        trust = min(1.0, 0.4 + min(len(source_refs), 6) * 0.08)
        novelty = min(1.0, 0.5 + (0.1 if len(notes or []) >= 3 else 0.0))
        features = {key: round(value, 3) for key, value in {
            "warmth": warmth, "energy": energy, "trust": trust, "novelty": novelty,
        }.items()}
        generation_id = f"field_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        relation_key = hashlib.sha256(
            "\0".join(sorted((owner_id, counterpart_id))).encode("utf-8")
        ).hexdigest()[:16]
        payload = {
            "schema": "meetmind-field.v1",
            "generation_id": generation_id,
            "relation_id": f"relation_{relation_key}",
            "owner_id": owner_id,
            "counterpart_id": counterpart_id,
            "features": features,
            "environment": {
                "light": "sunset" if warmth >= 0.65 else "daylight",
                "weather": "clear" if trust >= 0.65 else "mist",
                "soundscape": "lively" if energy >= 0.65 else "quiet",
                "density": round(0.35 + novelty * 0.45, 3),
                "interactive_points": ["shared-memory", "impression-wall", "return-gate"],
            },
            "source_refs": list(dict.fromkeys(source_refs)),
            "privacy": privacy,
            "generated_by": {"model": "deterministic-field-mapper.v1", "confidence": 0.65},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "regenerable": True,
        }
        asset_ref = self.store.write_derived_asset(
            "fields", generation_id, "field.json",
            json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
        )
        payload["asset_ref"] = asset_ref
        self.store.write_inference(owner_id, f"field_{relation_key}", payload)
        return payload
