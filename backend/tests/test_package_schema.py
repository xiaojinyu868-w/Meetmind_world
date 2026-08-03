"""echo-package.v0 校验器测试（对应 CONTEXT-AND-MEMORY.md §4 schema 草案）。"""

import copy

import pytest

from app.schemas.package_schema import PackageSchemaError, validate_package


def valid_package() -> dict:
    """最小合法 package：1 个 encounter + 1 条带事实指针的推断。"""
    return {
        "schema": "echo-package.v0",
        "person_id": "person_01JXXX",
        "identity": {
            "confirmed": False,
            "name": "陈某",
            "face_ref": None,
            "voiceprint_ref": None,
        },
        "encounters": [
            {
                "encounter_id": "enc_01",
                "time": "2026-08-02T14:30:00+08:00",
                "place": "XX 黑客松 3 号展位",
                "facts": {"media": ["facts/person_01JXXX/enc_01/clip.mp4"],
                          "transcript": None, "photos": []},
                "inferences": [
                    {
                        "id": "inf_01",
                        "type": "interest-tag",
                        "value": "教育科技",
                        "source_facts": ["transcript#L12-L18"],
                        "model": "qwen3.7plus@2026-07",
                        "confidence": 0.72,
                        "created_at": "2026-08-02T15:01:00+08:00",
                    }
                ],
                "privacy": "self-only",
            }
        ],
        "avatar": {
            "type": "lowpoly-faceless-v1",
            "palette": {"jacket": "#3B82F6", "hair": "#1F2937"},
            "real_face_ref": None,
        },
        "relations": [],
    }


def test_valid_package_passes():
    package = valid_package()
    assert validate_package(package) is package


def test_inference_without_source_facts_rejected():
    package = valid_package()
    del package["encounters"][0]["inferences"][0]["source_facts"]
    with pytest.raises(PackageSchemaError, match="source_facts"):
        validate_package(package)


def test_bad_privacy_rejected():
    package = valid_package()
    package["encounters"][0]["privacy"] = "everyone"  # 非 L1-L4 枚举
    with pytest.raises(PackageSchemaError, match="privacy"):
        validate_package(package)


def test_wrong_schema_version_rejected():
    package = valid_package()
    package["schema"] = "echo-package.v9"
    with pytest.raises(PackageSchemaError, match="schema"):
        validate_package(package)


def test_confidence_out_of_range_rejected():
    package = valid_package()
    package["encounters"][0]["inferences"][0]["confidence"] = 1.5
    with pytest.raises(PackageSchemaError, match="confidence"):
        validate_package(package)


def test_face_never_public_approved():
    package = valid_package()
    package["identity"]["face_ref"] = "facts/person_01JXXX/enc_01/face.jpg"
    package["encounters"][0]["privacy"] = "public-approved"
    with pytest.raises(PackageSchemaError, match="public-approved"):
        validate_package(package)
