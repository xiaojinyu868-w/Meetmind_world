"""合照入场两段式流程 + qwen-vl 检测解析的单元/契约测试（FR-2.12）。

不耗真实额度：vision provider 用假 analyze_image 对象注入；图像用 PIL 现造。
"""

import io
import json

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.agents.llm.base import LLMResponse
from app.main import create_app
from app.packages.store import PackageStore
from app.pipeline.person_builder import _default_palette_for
from app.pipelines.group_onboarding import (
    GroupFaceDetector,
    GroupOnboardingService,
    parse_face_boxes,
)


def _photo_bytes(width: int = 800, height: int = 600) -> bytes:
    image = Image.new("RGB", (width, height), (240, 236, 228))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


PHOTO = _photo_bytes()


class FakeVision:
    """按预置文本应答的 vision provider 替身（mock=False 模拟真实返回）。"""

    def __init__(self, text: str, *, mock: bool = False):
        self.text = text
        self.mock = mock
        self.calls = 0

    def analyze_image(self, image_bytes, prompt, mime="image/jpeg", model=None):
        self.calls += 1
        return LLMResponse(text=self.text, model=model or "qwen-vl-max", mock=self.mock)


FIVE_FACES_JSON = json.dumps({"faces": [
    {"x": 0.05, "y": 0.10, "width": 0.10, "height": 0.13},
    {"x": 0.25, "y": 0.10, "width": 0.10, "height": 0.13},
    {"x": 0.45, "y": 0.10, "width": 0.10, "height": 0.13},
    {"x": 0.65, "y": 0.10, "width": 0.10, "height": 0.13},
    {"x": 0.85, "y": 0.10, "width": 0.10, "height": 0.13},
]})


def _service(tmp_path, detector) -> GroupOnboardingService:
    return GroupOnboardingService(PackageStore(tmp_path), face_detector=detector)


# ---------- parse_face_boxes 解析边界 ----------

def test_parse_normalized_xywh():
    boxes = parse_face_boxes(FIVE_FACES_JSON, 800, 600)
    assert len(boxes) == 5
    assert boxes[0]["x"] == 0.05 and boxes[0]["width"] == 0.10


def test_parse_absolute_pixels_when_within_image():
    text = '{"faces": [{"x": 40, "y": 60, "width": 80, "height": 78}]}'
    boxes = parse_face_boxes(text, 800, 600)
    assert boxes == [{"x": 0.05, "y": 0.1, "width": 0.1, "height": 0.13}]


def test_parse_qwen_1000_relative_scale():
    # 坐标超出图像像素范围（小图）→ 按 qwen 0~1000 相对坐标处理
    text = '{"faces": [{"bbox_2d": [50, 100, 150, 230]}]}'
    boxes = parse_face_boxes(text, 100, 100)
    assert len(boxes) == 1
    assert boxes[0]["x"] == 0.05 and boxes[0]["y"] == 0.1
    assert boxes[0]["width"] == 0.1 and boxes[0]["height"] == 0.13


def test_parse_gemini_box_2d_order():
    text = '[{"box_2d": [0.1, 0.05, 0.23, 0.15]}]'  # [y1,x1,y2,x2]
    boxes = parse_face_boxes(text, 800, 600)
    assert boxes[0]["x"] == 0.05 and boxes[0]["y"] == 0.1


def test_parse_strips_code_fence_and_prose():
    text = '好的，检测结果如下：\n```json\n{"faces": [{"x": 0.5, "y": 0.2, "w": 0.1, "h": 0.13}]}\n```'
    boxes = parse_face_boxes(text, 800, 600)
    assert len(boxes) == 1 and boxes[0]["width"] == 0.1


def test_parse_drops_tiny_background_faces():
    text = json.dumps({"faces": [
        {"x": 0.05, "y": 0.10, "width": 0.10, "height": 0.13},   # 前景
        {"x": 0.50, "y": 0.30, "width": 0.015, "height": 0.02},  # 背景路人
    ]})
    boxes = parse_face_boxes(text, 800, 600)
    assert len(boxes) == 1 and boxes[0]["x"] == 0.05


def test_parse_clamps_out_of_range():
    text = '{"faces": [{"x": -0.2, "y": 0.9, "width": 0.4, "height": 0.3}]}'
    boxes = parse_face_boxes(text, 800, 600)
    assert boxes[0]["x"] == 0.0
    assert boxes[0]["y"] + boxes[0]["height"] <= 1.0


def test_parse_dedupes_overlapping_boxes():
    text = json.dumps({"faces": [
        {"x": 0.10, "y": 0.10, "width": 0.10, "height": 0.13},
        {"x": 0.11, "y": 0.11, "width": 0.12, "height": 0.15},  # 与上一个 IoU>0.5
    ]})
    boxes = parse_face_boxes(text, 800, 600)
    assert len(boxes) == 1
    assert boxes[0]["width"] == 0.12  # 保留更大者


def test_parse_invalid_json_returns_none():
    assert parse_face_boxes("完全不是 JSON", 800, 600) is None
    assert parse_face_boxes("", 800, 600) is None


def test_parse_empty_faces():
    assert parse_face_boxes('{"faces": []}', 800, 600) == []


def test_parse_duplicate_bbox2d_keys_recovered_by_scan():
    # qwen-vl-max 偶发在一个对象里重复 bbox_2d 键（JSON 解析只剩一个）
    text = ('{"faces":[{"bbox_2d":[230,356,351,488],"bbox_2d":[397,356,478,458],'
            '"bbox_2d":[665,356,740,458]}]}')
    boxes = parse_face_boxes(text, 1280, 852)
    assert len(boxes) == 3


def test_parse_truncated_output_recovered_by_scan():
    text = '{"faces":[{"bbox_2d":[230,356,351,488]},{"bbox_2d":[397,356,478,458]},{"bb'
    boxes = parse_face_boxes(text, 1280, 852)
    assert len(boxes) == 2


# ---------- GroupFaceDetector 降级链 ----------

def test_detector_qwen_path_crops_faces():
    detector = GroupFaceDetector(vision_provider=FakeVision(FIVE_FACES_JSON))
    faces, source = detector.detect(PHOTO)
    assert source == "qwen-vl"
    assert len(faces) == 5
    for face in faces:
        assert face["bytes"][:2] == b"\xff\xd8"  # JPEG SOI
        # bbox 外扩了 margin，仍在 [0,1]
        assert 0 <= face["bbox"]["x"] < face["bbox"]["x"] + face["bbox"]["width"] <= 1


def test_detector_falls_back_when_provider_mock_or_broken():
    # mock=True（未配置）→ 不走 qwen；本环境无 cv2 → none
    faces, source = GroupFaceDetector(vision_provider=FakeVision("[]", mock=True)).detect(PHOTO)
    assert source in {"opencv", "none"}
    # 解析失败同样降级，绝不上抛
    faces2, source2 = GroupFaceDetector(vision_provider=FakeVision("乱码")).detect(PHOTO)
    assert source2 in {"opencv", "none"}


def test_detector_undecodable_image():
    faces, source = GroupFaceDetector(vision_provider=FakeVision(FIVE_FACES_JSON)).detect(b"nope")
    assert faces == [] and source == "none"


# ---------- 两段式服务 ----------

def test_detect_stores_fact_and_crops_without_packages(tmp_path):
    store = PackageStore(tmp_path)
    before = len(store.list_packages())
    service = GroupOnboardingService(store, face_detector=GroupFaceDetector(FakeVision(FIVE_FACES_JSON)))
    result = service.detect(PHOTO, "group.jpg", expected_count=5)
    assert result["schema"] == "meetmind.group-detection.v1"
    assert result["status"] == "ready"
    assert result["detector"] == "qwen-vl"
    assert result["detected_count"] == 5
    assert result["source_ref"].startswith("facts/")
    assert all(face["face_ref"].startswith("derived/group-faces/") for face in result["faces"])
    assert len(store.list_packages()) == before  # detect 不建 Package


def test_confirm_creates_confirmed_people_booths_and_impression(tmp_path):
    store = PackageStore(tmp_path)

    class FakeHall:
        def __init__(self):
            self.registered = []

        def register_person(self, person_id, display):
            self.registered.append((person_id, display))
            return {"id": f"booth_{person_id}"}

    hall = FakeHall()
    service = GroupOnboardingService(store, hall=hall,
                                     face_detector=GroupFaceDetector(FakeVision(FIVE_FACES_JSON)))
    detection = service.detect(PHOTO, "group.jpg")
    names = ["甲", "乙", "丙", "丁", "戊"]
    assignments = [
        {"face_id": face["face_id"], "name": names[index],
         "impression": "很靠谱" if index == 0 else None}
        for index, face in enumerate(detection["faces"])
    ]
    result = service.confirm(detection["group_id"], assignments)
    assert result["schema"] == "meetmind.group-onboarding.v1"
    assert result["status"] == "ready"
    assert len(result["participants"]) == 5
    assert len(hall.registered) == 5  # 确认后全部进展位大厅
    for index, participant in enumerate(result["participants"]):
        package = store.load_package(participant["person_id"])
        assert package["identity"]["confirmed"] is True
        assert package["identity"]["name"] == names[index]
        assert package["identity"]["face_ref"] == participant["face_ref"]
        assert participant["booth_id"] == f"booth_{participant['person_id']}"
    first = result["participants"][0]
    inferences = store.read_inferences(first["person_id"])
    assert any(item["type"] == "first-impression" and item["value"] == "很靠谱"
               for item in inferences.values())
    # 第一印象也进 encounter 推断（展位 display tags 来源）
    package = store.load_package(first["person_id"])
    assert package["encounters"][0]["inferences"][0]["value"] == "很靠谱"
    assert package["encounters"][0]["inferences"][0]["source_facts"] == [detection["source_ref"]]


def test_confirm_unknown_group_id(tmp_path):
    service = _service(tmp_path, GroupFaceDetector(FakeVision(FIVE_FACES_JSON)))
    with pytest.raises(ValueError, match="未知的 group_id"):
        service.confirm("group_nope", [{"name": "甲"}])
    with pytest.raises(ValueError, match="不合法"):
        service.confirm("../etc", [{"name": "甲"}])


def test_run_oneshot_still_works_with_faces(tmp_path):
    service = _service(tmp_path, GroupFaceDetector(FakeVision(FIVE_FACES_JSON)))
    result = service.run(PHOTO, "group.jpg", ["甲", "乙", "丙", "丁", "戊"], expected_count=5)
    assert result["status"] == "ready"
    assert result["detected_count"] == 5
    assert all(p["avatar_status"] == "ready" and p["face_ref"] for p in result["participants"])


# ---------- API 契约 ----------

@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    app = create_app()
    # 注入假 vision：五张人脸
    app.state.group_onboarding._face_detector = GroupFaceDetector(FakeVision(FIVE_FACES_JSON))
    return TestClient(app)


def test_two_phase_api_flow(client):
    before = len(client.app.state.store.list_packages())
    detect = client.post("/api/v1/group-onboarding/detect",
                         files={"photo": ("group.jpg", PHOTO, "image/jpeg")})
    assert detect.status_code == 201, detect.text
    payload = detect.json()
    assert payload["status"] == "ready" and payload["detected_count"] == 5
    assert len(client.app.state.store.list_packages()) == before  # 检测不建档

    assignments = [
        {"face_id": face["face_id"], "name": name}
        for face, name in zip(payload["faces"], ["甲", "乙", "丙", "丁", "戊"])
    ]
    confirm = client.post("/api/v1/group-onboarding/confirm",
                          json={"group_id": payload["group_id"], "assignments": assignments})
    assert confirm.status_code == 201, confirm.text
    result = confirm.json()
    assert result["status"] == "ready"
    assert all(item["booth_id"] for item in result["participants"])
    # 展位进入大厅快照（前端下一轮轮询可见）
    snapshot = client.get("/api/v0/world/snapshot?world=hall").json()
    booth_people = {m.get("person_id") for m in snapshot["modules"] if m.get("type") == "booth"}
    for participant in result["participants"]:
        assert participant["person_id"] in booth_people
    agent_ids = {a["id"] for a in snapshot["agents"]}
    for participant in result["participants"]:
        assert participant["person_id"] in agent_ids


def test_confirm_unknown_group_returns_404(client):
    response = client.post("/api/v1/group-onboarding/confirm",
                           json={"group_id": "group_missing", "assignments": [{"name": "甲"}]})
    assert response.status_code == 404


def test_confirm_validates_assignments(client):
    response = client.post("/api/v1/group-onboarding/confirm",
                           json={"group_id": "group_x", "assignments": []})
    assert response.status_code == 422
    response = client.post("/api/v1/group-onboarding/confirm",
                           json={"group_id": "group_x", "assignments": [{"face_id": "f"}]})
    assert response.status_code == 422  # name 必填


def test_detect_rejects_non_image(client):
    response = client.post("/api/v1/group-onboarding/detect",
                           files={"photo": ("a.txt", b"hi", "text/plain")})
    assert response.status_code == 415


def test_confirm_booth_capacity_full_still_onboards(tmp_path):
    """展位容量满：人物照常建档确认，展位标记 queued 并写入 issues，不再整体 422。"""
    store = PackageStore(tmp_path)

    class FullHall:
        def register_person(self, person_id, display):
            raise ValueError("展位容量已满（12 个），等待美术扩容街道")

    service = GroupOnboardingService(store, hall=FullHall(),
                                     face_detector=GroupFaceDetector(FakeVision(FIVE_FACES_JSON)))
    detection = service.detect(PHOTO, "group.jpg")
    assignments = [
        {"face_id": face["face_id"], "name": f"朋友{index + 1}"}
        for index, face in enumerate(detection["faces"])
    ]
    result = service.confirm(detection["group_id"], assignments)
    assert result["status"] == "ready"
    assert len(result["participants"]) == 5
    for participant in result["participants"]:
        assert participant["booth_id"] is None
        assert participant["booth_status"] == "queued"
        # 人物本身完整建档并确认
        package = store.load_package(participant["person_id"])
        assert package["identity"]["confirmed"] is True
    assert any("排队" in issue for issue in result["issues"])


def test_confirm_flags_possible_duplicate_names(tmp_path):
    """去重检测：同名已确认人物存在时，新参与者带 possible_duplicate_of + issues 提示（不拦截）。"""
    store = PackageStore(tmp_path)
    # 预置一个已确认的「甲」
    existing = store.create_draft_package("person_existing_jia", _default_palette_for("person_existing_jia"))
    store.save_package(existing)
    store.confirm_identity("person_existing_jia", name="甲")

    class FakeHall:
        def register_person(self, person_id, display):
            return {"id": f"booth_{person_id}"}

    service = GroupOnboardingService(store, hall=FakeHall(),
                                     face_detector=GroupFaceDetector(FakeVision(FIVE_FACES_JSON)))
    detection = service.detect(PHOTO, "group.jpg")
    assignments = [
        {"face_id": face["face_id"], "name": name}
        for face, name in zip(detection["faces"], ["甲", "乙", "丙", "丁", "戊"])
    ]
    result = service.confirm(detection["group_id"], assignments)
    flagged = [p for p in result["participants"] if p.get("possible_duplicate_of")]
    assert len(flagged) == 1
    assert flagged[0]["name"] == "甲"
    assert flagged[0]["possible_duplicate_of"] == "person_existing_jia"
    assert any("重复" in issue for issue in result["issues"])
    # 不拦截：新人物照常创建
    assert len(result["participants"]) == 5
