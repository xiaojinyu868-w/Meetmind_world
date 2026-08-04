"""合照人脸检测：qwen-vl 优先、OpenCV haar 兜底（FR-2.12 检测层）。

目的：haar 级联在真实合照上漏检/重复严重；qwen-vl 直接理解画面，能稳定框出
      前景主要人物。检测器可注入（测试用假 provider），解析对坐标系防御性归一。
链路：qwen-vl（vision provider 已配置且返回可解析 JSON）→ OpenCV haar → 空
      （上层转 needs-review）。任何模型异常都不上抛。
输入：image_bytes + mime；输出 [(bbox 归一化 xywh, crop jpg bytes)], 检测来源。
安全：照片字节只进模型调用与本地裁剪，不进日志/异常消息。
"""

from __future__ import annotations

import io
import json
import os
import re
from pathlib import Path

# qwen-vl 提示词：实测（2026-08-04，demo.jpg 5 人合照）qwen-vl-max + 像素整数
# 坐标 + 只框头部 能稳定给出紧凑人脸框；归一化小数坐标会让模型退回"上半身框"。
def build_face_detect_prompt(image_width: int, image_height: int) -> str:
    return (
        f"这张合照宽 {image_width} 像素、高 {image_height} 像素。"
        "请框出每一位前景主要人物（一起合影的那群人）的头部："
        "上缘到头顶发际、下缘到下巴，左右到脸颊，不要框脖子和肩膀；"
        "忽略远处背景里的路人，以及海报、屏幕、照片里的人脸。\n"
        "只输出单行 JSON，不要输出任何其他字段或解释：\n"
        '{"faces": [{"bbox_2d": [x1, y1, x2, y2]}]}\n'
        "bbox_2d 是这张图片的像素整数坐标（左上角和右下角），每个人脸一个对象。"
        "没有可辨人脸时输出 {\"faces\": []}。"
    )


# 人脸定位默认走 qwen-vl-max（vl-plus 定位松散，实测退回上半身框）；
# 环境变量 FACE_DETECT_MODEL 可调。
DEFAULT_FACE_DETECT_MODEL = "qwen-vl-max"

MAX_FACES = 50
# 前景/背景过滤：归一化脸框宽度或面积低于阈值视为背景路人（demo 合照实测
# 前景脸宽 ≥ 4% 画面宽，背景路人脸宽 ≤ 2%）
MIN_FACE_WIDTH_RATIO = 0.025
MIN_FACE_AREA_RATIO = 0.002
CROP_MARGIN_RATIO = 0.18

_MIME_BY_SUFFIX = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                   ".png": "image/png", ".webp": "image/webp"}


def mime_for_filename(filename: str) -> str:
    return _MIME_BY_SUFFIX.get(Path(filename or "").suffix.lower(), "image/jpeg")


def decode_image(image_bytes: bytes):
    """PIL 解码 → (Image, width, height)；失败返回 (None, 0, 0)。"""
    try:
        from PIL import Image
    except ImportError:
        return None, 0, 0
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except Exception:
        return None, 0, 0
    return image.convert("RGB"), image.width, image.height


# 发给模型的图片先降采样：全尺寸 base64 会让 dashscope 兼容端点读超时（实测
# 1922px/791KB 原图 120s ReadTimeout，降采样到 ~1280px 后 ~2s 返回）。bbox 是
# 归一化坐标，降采样不影响定位精度。
MODEL_IMAGE_MAX_EDGE = 1280
MODEL_IMAGE_JPEG_QUALITY = 85


def prepare_model_image(image) -> bytes:
    """PIL Image → 降采样 JPEG 字节（供模型调用，不改动原始事实层数据）。"""
    preview = image.copy()
    preview.thumbnail((MODEL_IMAGE_MAX_EDGE, MODEL_IMAGE_MAX_EDGE))
    buffer = io.BytesIO()
    preview.save(buffer, format="JPEG", quality=MODEL_IMAGE_JPEG_QUALITY)
    return buffer.getvalue()


def crop_face_jpeg(image, bbox: dict, margin: float = CROP_MARGIN_RATIO) -> bytes | None:
    """按归一化 bbox（含 margin 外扩，调用方负责）裁剪并编码 JPEG。"""
    width, height = image.width, image.height
    x0 = max(0, int(bbox["x"] * width))
    y0 = max(0, int(bbox["y"] * height))
    x1 = min(width, int(round((bbox["x"] + bbox["width"]) * width)))
    y1 = min(height, int(round((bbox["y"] + bbox["height"]) * height)))
    if x1 - x0 < 4 or y1 - y0 < 4:
        return None
    buffer = io.BytesIO()
    image.crop((x0, y0, x1, y1)).save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


def expand_bbox(bbox: dict, margin: float = CROP_MARGIN_RATIO) -> dict:
    """归一化 bbox 外扩 margin 并夹回 [0,1]（与历史 haar 裁剪口径一致）。"""
    mx, my = bbox["width"] * margin, bbox["height"] * margin
    x0 = max(0.0, bbox["x"] - mx)
    y0 = max(0.0, bbox["y"] - my)
    x1 = min(1.0, bbox["x"] + bbox["width"] + mx)
    y1 = min(1.0, bbox["y"] + bbox["height"] + my)
    return {"x": round(x0, 5), "y": round(y0, 5),
            "width": round(x1 - x0, 5), "height": round(y1 - y0, 5)}


def _iou(a: dict, b: dict) -> float:
    ax1, ay1 = a["x"] + a["width"], a["y"] + a["height"]
    bx1, by1 = b["x"] + b["width"], b["y"] + b["height"]
    ix, iy = max(0.0, min(ax1, bx1) - max(a["x"], b["x"])), max(0.0, min(ay1, by1) - max(a["y"], b["y"]))
    inter = ix * iy
    union = a["width"] * a["height"] + b["width"] * b["height"] - inter
    return inter / union if union > 0 else 0.0


def _extract_json(text: str):
    """从模型输出中取出 JSON（容忍 ```json 围栏与前后杂散文字）；失败返回 None。"""
    if not text:
        return None
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # 前后有杂散文字：从最早出现的 { 或 [ 截到最后一个对应闭括号
    start = min((i for i in (cleaned.find("{"), cleaned.find("[")) if i != -1),
                default=-1)
    if start == -1:
        return None
    end_char = "}" if cleaned[start] == "{" else "]"
    end = cleaned.rfind(end_char)
    if end <= start:
        return None
    try:
        return json.loads(cleaned[start:end + 1])
    except json.JSONDecodeError:
        return None


def _raw_box(item: dict):
    """兼容多种键名约定，统一返回 (x, y, w, h) 原始数值；不认识返回 None。"""
    if not isinstance(item, dict):
        return None
    if isinstance(item.get("bbox_2d"), list) and len(item["bbox_2d"]) == 4:
        x1, y1, x2, y2 = item["bbox_2d"]  # qwen 约定 [x1,y1,x2,y2]
        return x1, y1, x2 - x1, y2 - y1
    if isinstance(item.get("box_2d"), list) and len(item["box_2d"]) == 4:
        y1, x1, y2, x2 = item["box_2d"]  # gemini 约定 [y1,x1,y2,x2]
        return x1, y1, x2 - x1, y2 - y1
    keys = set(item)
    if {"x1", "y1", "x2", "y2"} <= keys:
        return item["x1"], item["y1"], item["x2"] - item["x1"], item["y2"] - item["y1"]
    if {"xmin", "ymin", "xmax", "ymax"} <= keys:
        return (item["xmin"], item["ymin"],
                item["xmax"] - item["xmin"], item["ymax"] - item["ymin"])
    width_key = "width" if "width" in keys else "w" if "w" in keys else None
    height_key = "height" if "height" in keys else "h" if "h" in keys else None
    if {"x", "y"} <= keys and width_key and height_key:
        return item["x"], item["y"], item[width_key], item[height_key]
    return None


_BBOX_2D_PATTERN = re.compile(
    r'"bbox_2d"\s*:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]'
)


def _regex_bbox2d_items(text: str) -> list[dict]:
    """扫描全部 bbox_2d 数组：应对模型重复键（JSON 解析只留一个）或截断输出。"""
    return [{"bbox_2d": [float(x1), float(y1), float(x2), float(y2)]}
            for x1, y1, x2, y2 in _BBOX_2D_PATTERN.findall(text or "")]


def parse_face_boxes(text: str, image_width: int = 0, image_height: int = 0,
                     min_width_ratio: float = MIN_FACE_WIDTH_RATIO,
                     min_area_ratio: float = MIN_FACE_AREA_RATIO) -> list[dict] | None:
    """把模型文本解析为归一化 xywh bbox 列表；完全不可解析返回 None（调用方兜底）。

    坐标系防御：≤1.5 视为 0~1 归一化；落在图像像素范围内视为绝对像素；
    其余按 qwen 的 0~1000 相对坐标处理。解析后夹取、过滤微小背景脸、IoU 去重。
    """
    payload = _extract_json(text)
    items = None
    if payload is not None:
        candidate = payload.get("faces") if isinstance(payload, dict) else payload
        if isinstance(candidate, list):
            items = candidate
    # 模型偶尔重复 bbox_2d 键或截断输出：原文能扫出更多 bbox_2d 时以扫描结果为准
    scanned = _regex_bbox2d_items(text)
    if items is None or len(scanned) > len(items):
        items = scanned or items
    if items is None:
        return None
    boxes = []
    for item in items[:MAX_FACES]:
        raw = _raw_box(item)
        if raw is None:
            continue
        try:
            x, y, w, h = (float(v) for v in raw)
        except (TypeError, ValueError):
            continue
        max_value = max(abs(x), abs(y), abs(x + w), abs(y + h))
        if max_value <= 1.5:
            pass  # 已是 0~1 归一化
        elif (image_width > 0 and image_height > 0
              and abs(x + w) <= image_width * 1.02 and abs(y + h) <= image_height * 1.02):
            x, y, w, h = x / image_width, y / image_height, w / image_width, h / image_height
        elif max_value <= 1020:
            x, y, w, h = x / 1000, y / 1000, w / 1000, h / 1000
        elif image_width > 0 and image_height > 0:
            x, y, w, h = x / image_width, y / image_height, w / image_width, h / image_height
        else:
            continue
        x, y = min(max(x, 0.0), 1.0), min(max(y, 0.0), 1.0)
        w, h = min(w, 1.0 - x), min(h, 1.0 - y)
        if w < min_width_ratio or w * h < min_area_ratio:
            continue  # 背景路人/误检小框
        boxes.append({"x": round(x, 5), "y": round(y, 5),
                      "width": round(w, 5), "height": round(h, 5)})
    deduped = []
    for box in sorted(boxes, key=lambda b: b["width"] * b["height"], reverse=True):
        if any(_iou(box, kept) >= 0.5 for kept in deduped):
            continue  # 重复框：保留更大者
        deduped.append(box)
    deduped.sort(key=lambda b: (b["x"], b["y"]))  # 从左到右，与命名顺序一致
    return deduped


def _detect_faces_opencv(image_bytes: bytes, min_width_ratio: float,
                         min_area_ratio: float) -> list[dict] | None:
    """OpenCV haar 兜底；cv2 不可用或解码失败返回 None。"""
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except ImportError:
        return None
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return None
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(
        str(Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml")
    )
    if cascade.empty():
        return None
    raw = cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4, minSize=(32, 32))
    boxes = []
    for bx, by, bw, bh in raw:
        box = {"x": bx / width, "y": by / height, "width": bw / width, "height": bh / height}
        if box["width"] < min_width_ratio or box["width"] * box["height"] < min_area_ratio:
            continue
        boxes.append(expand_bbox(box))
    boxes.sort(key=lambda b: (b["x"], b["y"]))
    return boxes[:MAX_FACES]


class GroupFaceDetector:
    """可注入的合照人脸检测器：qwen-vl → OpenCV → 空（needs-review）。

    vision_provider：具备 analyze_image(image_bytes, prompt, mime, model=) 的对象；
    缺省惰性取 get_provider("vision")（未登记/未配置时自动降级）。
    face_model：人脸定位专用模型（默认 qwen-vl-max，环境变量 FACE_DETECT_MODEL
    可调；注入的 provider 不支持 model 参数时自动忽略）。
    """

    def __init__(self, vision_provider=None, *,
                 face_model: str | None = None,
                 min_width_ratio: float = MIN_FACE_WIDTH_RATIO,
                 min_area_ratio: float = MIN_FACE_AREA_RATIO):
        self._provider = vision_provider
        self.face_model = (face_model
                           or os.environ.get("FACE_DETECT_MODEL", "").strip()
                           or DEFAULT_FACE_DETECT_MODEL)
        self.min_width_ratio = min_width_ratio
        self.min_area_ratio = min_area_ratio

    def _vision_provider(self):
        if self._provider is not None:
            return self._provider
        try:
            from app.agents.llm import get_provider
            return get_provider("vision")
        except Exception:
            return None

    def _detect_qwen(self, image) -> list[dict] | None:
        """qwen-vl 检测：成功返回 bbox 列表（可为空）；不可用/失败返回 None。

        发给模型的是降采样预览图；bbox 为预览图像素坐标，按预览图尺寸归一化
        （归一化后对原图同样有效）。
        """
        provider = self._vision_provider()
        if provider is None:
            return None
        preview_bytes = prepare_model_image(image)
        preview, preview_width, preview_height = decode_image(preview_bytes)
        if preview is None:
            return None
        try:
            response = provider.analyze_image(
                preview_bytes,
                build_face_detect_prompt(preview_width, preview_height),
                mime="image/jpeg", model=self.face_model)
        except Exception:
            return None
        if getattr(response, "mock", False):
            return None
        return parse_face_boxes(getattr(response, "text", ""),
                                preview_width, preview_height,
                                self.min_width_ratio, self.min_area_ratio)

    def detect(self, image_bytes: bytes, mime: str = "image/jpeg") -> tuple[list[dict], str]:
        """→ ([{"bbox", "bytes"}], source)；source ∈ qwen-vl | opencv | none。"""
        image, width, height = decode_image(image_bytes)
        if image is None:
            return [], "none"
        boxes = self._detect_qwen(image)
        source = "qwen-vl"
        if boxes is not None:
            boxes = [expand_bbox(box) for box in boxes]  # 外扩 margin，与 haar 口径一致
        if boxes is None:
            boxes = _detect_faces_opencv(image_bytes, self.min_width_ratio,
                                         self.min_area_ratio)
            source = "opencv"
        if boxes is None:
            return [], "none"
        faces = []
        for box in boxes[:MAX_FACES]:
            crop = crop_face_jpeg(image, box)
            if crop is None:
                continue
            faces.append({"bbox": box, "bytes": crop})
        return faces, source
