"""Offline YuNet candidate boxes. The person still confirms their own seat."""
import io
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.pipelines.group_onboarding.detect import expand_bbox

MODEL = Path(__file__).parent / "yunet" / "face_detection_yunet_2023mar.onnx"


def detect_local_faces(jpeg: bytes) -> list[dict]:
    with Image.open(io.BytesIO(jpeg)) as source:
        source.thumbnail((1280, 1280))
        rgb = np.asarray(source.convert("RGB"))
    h, w = rgb.shape[:2]
    if min(w, h) < 12:
        return []
    # Separate sessions avoid sharing mutable input sizes across concurrent rooms.
    detector = cv2.FaceDetectorYN.create(str(MODEL), "", (w, h), .86, .3, 5000)
    _, faces = detector.detect(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
    if faces is None:
        return []
    boxes = []
    for row in sorted(faces, key=lambda f: float(f[-1]), reverse=True)[:50]:
        x, y, fw, fh = (float(v) for v in row[:4])
        left, top = max(0, x/w), max(0, y/h)
        right, bottom = min(1, (x+fw)/w), min(1, (y+fh)/h)
        if right>left and bottom>top:
            boxes.append(expand_bbox({"x":left,"y":top,"width":right-left,"height":bottom-top}))
    return sorted(boxes,key=lambda b:(b["x"],b["y"]))
