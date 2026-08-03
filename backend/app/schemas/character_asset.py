"""CharacterAsset v1 validation shared by Package and world snapshot boundaries."""

import re
from urllib.parse import urlparse


SCHEMA_VERSION = "character-asset.v1"
_SHA256 = re.compile(r"^[a-fA-F0-9]{64}$")
_SAFE_RELATIVE_PREFIXES = ("assets/", "models/")
_SAFE_ABSOLUTE_PREFIXES = ("/assets/", "/models/", "/api/v0/assets/")


class CharacterAssetSchemaError(ValueError):
    """Raised when a visual-pipeline delivery is unsafe or incomplete."""


def _string(value, field: str, *, max_length: int = 256) -> str:
    if not isinstance(value, str) or not value.strip():
        raise CharacterAssetSchemaError(f"CharacterAsset {field} must be a non-empty string")
    clean = value.strip()
    if len(clean) > max_length:
        raise CharacterAssetSchemaError(f"CharacterAsset {field} is too long")
    return clean


def _number(value, field: str, minimum: float, maximum: float) -> float:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise CharacterAssetSchemaError(f"CharacterAsset {field} must be numeric")
    number = float(value)
    if not minimum <= number <= maximum:
        raise CharacterAssetSchemaError(
            f"CharacterAsset {field} must be in [{minimum}, {maximum}]"
        )
    return number


def _validate_glb_url(value) -> str:
    url = _string(value, "glb_url", max_length=2048)
    if ".." in url.replace("\\", "/").split("/"):
        raise CharacterAssetSchemaError("CharacterAsset glb_url cannot traverse directories")
    parsed = urlparse(url)
    if parsed.query or parsed.fragment or parsed.username or parsed.password:
        raise CharacterAssetSchemaError(
            "CharacterAsset glb_url must be immutable and cannot contain query, fragment, or credentials"
        )
    if parsed.scheme:
        if parsed.scheme != "https" or not parsed.netloc:
            raise CharacterAssetSchemaError("CharacterAsset glb_url only allows HTTPS")
    elif url.startswith("/"):
        if not url.startswith(_SAFE_ABSOLUTE_PREFIXES):
            raise CharacterAssetSchemaError("CharacterAsset absolute glb_url is outside allowed paths")
    elif not url.startswith(_SAFE_RELATIVE_PREFIXES):
        raise CharacterAssetSchemaError("CharacterAsset relative glb_url is outside allowed paths")
    if not parsed.path.lower().endswith(".glb"):
        raise CharacterAssetSchemaError("CharacterAsset glb_url must point to a .glb file")
    return url


def _validate_animations(value) -> dict[str, str]:
    if not isinstance(value, dict):
        raise CharacterAssetSchemaError("CharacterAsset runtime.animations must be an object")
    if len(value) > 32:
        raise CharacterAssetSchemaError("CharacterAsset runtime.animations has too many entries")
    animations = {}
    for semantic_name, clip_name in value.items():
        semantic = _string(semantic_name, "runtime.animations key", max_length=64)
        clip = _string(clip_name, f"runtime.animations.{semantic}", max_length=128)
        if "/" in clip or "\\" in clip or "://" in clip:
            raise CharacterAssetSchemaError(
                f"CharacterAsset runtime.animations.{semantic} must be a GLB clip name"
            )
        animations[semantic] = clip
    return animations


def validate_character_asset(asset) -> dict:
    """Validate and sanitize the only CharacterAsset fields allowed into browser DTOs."""
    if not isinstance(asset, dict):
        raise CharacterAssetSchemaError("CharacterAsset must be an object")
    if asset.get("schema_version") != SCHEMA_VERSION:
        raise CharacterAssetSchemaError(
            f"Unsupported CharacterAsset schema: {asset.get('schema_version')}"
        )
    character_id = _string(asset.get("character_id"), "character_id", max_length=128)
    revision = asset.get("revision")
    if not isinstance(revision, int) or isinstance(revision, bool) or revision < 1:
        raise CharacterAssetSchemaError("CharacterAsset revision must be an integer >= 1")
    content_hash = _string(asset.get("content_hash"), "content_hash", max_length=64)
    if not _SHA256.fullmatch(content_hash):
        raise CharacterAssetSchemaError("CharacterAsset content_hash must be a SHA-256 hex digest")

    runtime = asset.get("runtime")
    if not isinstance(runtime, dict):
        raise CharacterAssetSchemaError("CharacterAsset runtime must be an object")
    if runtime.get("forward_axis") != "+Z":
        raise CharacterAssetSchemaError("CharacterAsset runtime.forward_axis must be +Z")
    animations = _validate_animations(runtime.get("animations"))

    qa = asset.get("qa")
    if not isinstance(qa, dict) or qa.get("status") != "passed":
        raise CharacterAssetSchemaError("CharacterAsset qa.status must be passed")

    return {
        "schema_version": SCHEMA_VERSION,
        "character_id": character_id,
        "revision": revision,
        "glb_url": _validate_glb_url(asset.get("glb_url")),
        "content_hash": content_hash.lower(),
        "runtime": {
            "scale_meters": _number(runtime.get("scale_meters"), "runtime.scale_meters", 0.01, 3.0),
            "ground_offset": _number(runtime.get("ground_offset"), "runtime.ground_offset", -1.0, 1.0),
            "forward_axis": "+Z",
            "animations": animations,
        },
        "qa": {"status": "passed"},
    }
