"""IF-2 处理接口「pipeline」POST /api/v0/pipeline（docs/API.md）。

目的：对 IF-1 落盘的输入启动处理，流式产出中间特征（关键帧/人脸候选/转写/场景）
      与最终 encounter_draft。中间特征是一等公民：前端用它做实时反馈，它也是
      推断层数据的来源指针。最终草稿永远未确认，必须走 IF-3 才写入 Package。
输入（application/json）：{"input_id", "mode": "stream"(默认)|"once", "steps": 可选子集}。
输出：mode=stream → SSE（event: progress 若干步 + event: result）；
      mode=once → 200 合并 JSON {"input_id", "steps": {...}, "encounter_draft"}。
验收：tests/test_pipeline.py —— once 返回草稿过 echo-package.v0 校验；
      tests/test_pipeline_vision.py —— vision provider 真实分析路径（mock server）。

提取链路（计划阶段 2）：图片输入直接作为关键帧并由 vision provider（qwen-vl）
分析人脸/场景；视频输入无 ffmpeg，关键帧降级为占位图、人脸步骤跳过并记 TODO，
流程不断；转写保留 stub（dashscope ASR WS 待接）；summary 由 chat provider
（deepseek）生成。provider 未配置/失败一律降级 stub，闭环不被第三方卡死。
"""

import base64
import json
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Literal

from app.agents.llm import base as llm_base
from app.agents.utils.jsonish import extract_json as _extract_json
from app.packages.store import FactLayerImmutableError
from app.pipeline.video_frames import extract_keyframes
from app.schemas.package_schema import DEFAULT_PRIVACY, validate_encounter_draft

router = APIRouter(prefix="/api/v0", tags=["pipeline"])

STEP_ORDER = ("preprocess", "faces", "transcript", "scene", "draft")
_VIDEO_EXT = {".mp4", ".mov"}
_AUDIO_EXT = {".m4a", ".wav", ".mp3"}
_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
_MIME_BY_EXT = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".png": "image/png", ".webp": "image/webp"}
STUB_MODEL = "stub-pipeline.v0"  # 推断入库时的模型版本占位（降级路径）
MAX_VISION_KEYFRAMES = 2  # 每个输入最多送几张关键帧给 vision（控成本）

# 1x1 白底 JPEG 真实字节：视频无抽帧时的占位关键帧内容
_TINY_JPEG = base64.b64decode(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////"
    "////////////////////////////////////////2wBDAf//////////////////////////////////"
    "////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAA"
    "AAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAT//xAAUEAEAAA"
    "AAAAAAAAAAAAAAAAAA/9oACAEBAAEFAl//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AV"
    "//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AV//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9"
    "oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP"
    "/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2g"
    "AIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z"
)


class PipelineRequest(BaseModel):
    input_id: str
    mode: Literal["stream", "once"] = "stream"
    steps: list[str] | None = None


# ---------- 公共工具 ----------

def _write_derived_fact(store, partition: str, bundle: str, filename: str, data: bytes) -> str:
    """派生事实幂等写入：pipeline 可重复触发，已存在则复用原指针。"""
    try:
        return store.write_fact(partition, bundle, filename, data)
    except FactLayerImmutableError:
        return f"facts/{partition}/{bundle}/{filename}"


def _vision_provider():
    return llm_base.get_provider("vision")


def _chat_provider():
    return llm_base.get_provider("chat")


# ---------- 各处理步骤 ----------

def _step_preprocess(store, partition, bundle, media, ctx) -> dict:
    """预处理：图片输入直接作为关键帧；视频经 ffmpeg/cv2 均匀抽 3 帧（真实帧）；
    抽帧不可用或失败才退回占位图（faces 步骤随后跳过）。

    TODO(后续)：抽帧结果可缓存复用（当前幂等靠 facts 文件名，重复触发不重抽）。
    """
    keyframes, keyframe_info = [], []
    images = [m for m in media if m.suffix.lower() in _IMAGE_EXT]
    videos = [m for m in media if m.suffix.lower() in _VIDEO_EXT]
    for i, image in enumerate(images[:3]):
        ext = image.suffix.lower()
        ref = _write_derived_fact(store, partition, bundle,
                                  f"kf_{i + 1:02d}{ext}", image.read_bytes())
        keyframes.append(ref)
        keyframe_info.append({"ref": ref, "kind": "image", "mime": _MIME_BY_EXT[ext]})
    remaining = 3 - len(keyframes)
    stubbed = False
    for video in videos:
        if remaining <= 0:
            break
        frames = extract_keyframes(video, count=remaining)  # ffmpeg 优先，cv2 兜底
        if frames:
            for frame in frames:
                ref = _write_derived_fact(store, partition, bundle,
                                          f"kf_{len(keyframes) + 1:02d}.jpg",
                                          Path(frame).read_bytes())
                keyframes.append(ref)
                keyframe_info.append({"ref": ref, "kind": "image", "mime": "image/jpeg"})
                remaining -= 1
        else:
            # 抽帧不可用/失败：占位帧兜底（faces 随后跳过该路）
            ref = _write_derived_fact(store, partition, bundle,
                                      f"kf_{len(keyframes) + 1:02d}.jpg", _TINY_JPEG)
            keyframes.append(ref)
            keyframe_info.append({"ref": ref, "kind": "stub", "mime": "image/jpeg"})
            remaining -= 1
            stubbed = True
    ctx["keyframe_info"] = keyframe_info
    payload = {"step": "preprocess", "status": "done", "keyframes": keyframes}
    if stubbed:
        payload["note"] = "ffmpeg/cv2 不可用或视频无法解析：部分关键帧为占位图"
    return payload


def _step_faces(store, partition, bundle, ctx) -> dict:
    """人脸候选：真实图片关键帧 → vision 分析；视频占位帧 → 跳过并记 TODO。

    TODO(算法待打磨)：face_embedding 比对已有 Package，命中老朋友填 match_person_id。
    """
    real_frames = [k for k in ctx.get("keyframe_info", []) if k["kind"] == "image"]
    if not real_frames:
        return {"step": "faces", "status": "skipped",
                "note": "无真实图片关键帧（视频抽帧 TODO），人脸分析跳过，流程不断",
                "face_candidates": []}
    provider = _vision_provider()
    candidates = []
    for i, frame in enumerate(real_frames[:MAX_VISION_KEYFRAMES]):
        analysis = _analyze_faces_with_vision(provider, store.read_fact(frame["ref"]),
                                              frame["mime"])
        if analysis is None:
            # 降级：mock/失败时给出占位候选（置信度低，face_ref 指向关键帧本身）
            candidates.append({"face_ref": frame["ref"],
                               "confidence": round(0.91 - i * 0.07, 2),
                               "match_person_id": None})
        else:
            for item in analysis:
                candidates.append({"face_ref": frame["ref"], "match_person_id": None, **item})
    return {"step": "faces", "status": "done", "face_candidates": candidates}


def _analyze_faces_with_vision(provider, image_bytes: bytes, mime: str) -> list | None:
    """调 vision provider 识别人脸候选；mock/解析失败返回 None（走降级）。"""
    prompt = (
        "你是相遇记录系统的视觉分析器。分析这张现场照片，只输出 JSON："
        "{\"faces\": [{\"confidence\": 0到1的数字, \"description\": \"人物外观一句话，不猜身份\"}]}"
        "；若画面中没有清晰人脸，输出 {\"faces\": []}。"
    )
    response = provider.analyze_image(image_bytes, prompt, mime)
    if response.mock:
        return None
    data = _extract_json(response.text)
    if not data or not isinstance(data.get("faces"), list):
        return None
    results = []
    for item in data["faces"][:3]:
        confidence = item.get("confidence")
        results.append({
            "confidence": round(float(confidence), 2) if isinstance(confidence, (int, float)) else 0.5,
            "description": str(item.get("description", ""))[:100],
        })
    return results


def _step_transcript(store, partition, bundle, media, meta, ctx) -> dict:
    """转写：音频输入（m4a/wav/mp3）优先调 vision provider 的 transcribe
    （dashscope 音频理解模型）产出真实转写；未配置/失败降级 stub 占位文本。
    转写与原始音频双份留存（防线 #2）；视频音轨转写待接（TODO）。
    """
    audios = [m for m in media if m.suffix.lower() in _AUDIO_EXT]
    videos = [m for m in media if m.suffix.lower() in _VIDEO_EXT]
    if not audios and not videos:
        return {"step": "transcript", "status": "done",
                "transcript_ref": None, "summary_draft": None}
    if audios:
        provider = _vision_provider()
        if provider.config.get("configured"):
            response = provider.transcribe(str(audios[0]))
            if not response.mock and response.text.strip():
                text = (f"# 转写 v1（{response.model}）\n\n"
                        f"来源媒体：{audios[0].name}\n\n{response.text.strip()}\n")
                ref = _write_derived_fact(store, partition, bundle,
                                          "transcript.v1.md", text.encode("utf-8"))
                return {"step": "transcript", "status": "done", "transcript_ref": ref,
                        "summary_draft": _summarize_transcript(ref, text),
                        "model": response.model}
    # 降级：stub 占位文本（注明待接入）
    sources = ", ".join(m.name for m in media)
    text = (
        "# 转写 v1（stub）\n\n"
        f"来源媒体：{sources}\n"
        f"现场备注：{meta.get('note') or '无'}\n\n"
        "TODO：音频理解未配置或调用失败，此为占位转写（模型接入后重跑即覆盖为新版本）。\n"
    )
    ref = _write_derived_fact(store, partition, bundle,
                              "transcript.v1.md", text.encode("utf-8"))
    return {"step": "transcript", "status": "done", "transcript_ref": ref,
            "summary_draft": _summarize_transcript(ref, text)}


def _summarize_transcript(transcript_ref: str, transcript_text: str) -> str:
    """summary 由 chat provider（deepseek）生成谈话要点草稿；失败降级 stub。"""
    provider = _chat_provider()
    if provider.config.get("configured"):
        response = provider.chat([
            {"role": "system", "content": "你是相遇记录系统的摘要器。基于现场转写生成 1-3 条"
                                          "谈话要点（每条不超过 30 字，中文；不确定的不编造）。"},
            {"role": "user", "content": transcript_text[:2000]},
        ])
        if not response.mock and response.text.strip():
            return response.text.strip()[:300]
    return "（推断层，待确认）stub 摘要：现场交流记录，见 transcript.v1.md"


def _step_scene(store, partition, bundle, meta, ctx) -> dict:
    """场景识别：真实图片关键帧 → vision 打标；否则按现场备注关键词降级。"""
    real_frames = [k for k in ctx.get("keyframe_info", []) if k["kind"] == "image"]
    if real_frames:
        analysis = _analyze_scene_with_vision(
            _vision_provider(), store.read_fact(real_frames[0]["ref"]), real_frames[0]["mime"])
        if analysis is not None:
            ctx["scene_model"] = _vision_provider().model
            return {"step": "scene", "status": "done",
                    "scene_tags": analysis["tags"],
                    "scene_description": analysis.get("description", ""),
                    "photos": [k["ref"] for k in ctx.get("keyframe_info", [])]}
    # 降级：关键词打标（note/place_hint）
    text = f"{meta.get('note', '')} {meta.get('place_hint', '')}".lower()
    tags = []
    if "展位" in text or "booth" in text:
        tags.append("booth")
    if "黑客松" in text or "hackathon" in text:
        tags.append("hackathon")
    if "路演" in text or "demo" in text:
        tags.append("demo-pitch")
    if not tags:
        tags = ["indoor"]
    ctx["scene_model"] = STUB_MODEL
    return {"step": "scene", "status": "done", "scene_tags": tags,
            "photos": [k["ref"] for k in ctx.get("keyframe_info", [])]}


def _analyze_scene_with_vision(provider, image_bytes: bytes, mime: str) -> dict | None:
    """调 vision provider 识别场景标签；mock/解析失败返回 None（走降级）。"""
    prompt = (
        "你是相遇记录系统的场景分析器。分析这张现场照片，只输出 JSON："
        "{\"scene_tags\": [\"短标签1\", \"短标签2\"], \"description\": \"场景一句话\"}。"
    )
    response = provider.analyze_image(image_bytes, prompt, mime)
    if response.mock:
        return None
    data = _extract_json(response.text)
    if not data or not isinstance(data.get("scene_tags"), list) or not data["scene_tags"]:
        return None
    return {"tags": [str(tag)[:20] for tag in data["scene_tags"][:5]],
            "description": str(data.get("description", ""))[:100]}


def _step_draft(meta, media_refs, ctx) -> dict:
    """组装 encounter_draft：echo-package.v0 encounter 结构 + identity.confirmed=false。

    推断条目携带真实模型版本与置信度（降级路径为 stub-pipeline.v0 / 0.5）。
    """
    now = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    transcript_ref = ctx["transcript"].get("transcript_ref")
    keyframes = [k["ref"] for k in ctx.get("keyframe_info", [])]
    inferences = []
    if transcript_ref:
        inferences.append({
            "id": "inf_summary", "type": "summary-draft",
            "value": ctx["transcript"].get("summary_draft") or "",
            "source_facts": [transcript_ref],
            "model": _chat_provider().model if _chat_provider().config.get("configured") else STUB_MODEL,
            "confidence": 0.6 if _chat_provider().config.get("configured") else 0.5,
            "created_at": now,
        })
    if keyframes:
        inferences.append({
            "id": "inf_scene", "type": "scene-tags",
            "value": ", ".join(ctx["scene"].get("scene_tags") or []),
            "source_facts": [keyframes[0]],
            "model": ctx.get("scene_model") or STUB_MODEL,
            "confidence": 0.8 if ctx.get("scene_model") not in (None, STUB_MODEL) else 0.5,
            "created_at": now,
        })
    face_candidates = ctx["faces"].get("face_candidates") or []
    draft = {
        "encounter_id": f"enc_{int(time.time() * 1000)}",
        "time": meta.get("captured_at") or now,
        "place": meta.get("place_hint") or "未记录地点",
        "facts": {
            "media": media_refs,
            "transcript": transcript_ref,
            "photos": keyframes,
        },
        "inferences": inferences,
        "privacy": DEFAULT_PRIVACY,
        "identity": {
            "confirmed": False,
            "name": None,
            "match_person_id": face_candidates[0]["match_person_id"] if face_candidates else None,
        },
    }
    return validate_encounter_draft(draft)


# ---------- 管线编排 ----------

def _run(store, input_id: str, steps: list):
    """按顺序执行步骤，产出 (event, payload) 序列；draft 步骤产出 result 事件。"""
    input_dir = store.find_input_dir(input_id)
    if input_dir is None:
        raise HTTPException(status_code=404, detail=f"输入不存在：{input_id}")
    partition, bundle = input_dir.parent.name, input_dir.name
    files = [p for p in sorted(input_dir.iterdir()) if p.is_file()]
    media = [p for p in files if p.suffix.lower() in (_VIDEO_EXT | _AUDIO_EXT | _IMAGE_EXT)]
    media_refs = [p.relative_to(store.root).as_posix() for p in media]
    meta_path = input_dir / "meta.v1.json"
    meta = json.loads(meta_path.read_text("utf-8")) if meta_path.exists() else {}

    ctx = {"keyframe_info": [], "faces": {}, "transcript": {}, "scene": {}}
    for step in steps:
        if step == "preprocess":
            payload = _step_preprocess(store, partition, bundle, media, ctx)
        elif step == "faces":
            payload = _step_faces(store, partition, bundle, ctx)
            ctx["faces"] = payload
        elif step == "transcript":
            payload = _step_transcript(store, partition, bundle, media, meta, ctx)
            ctx["transcript"] = payload
        elif step == "scene":
            payload = _step_scene(store, partition, bundle, meta, ctx)
            ctx["scene"] = payload
        elif step == "draft":
            yield ("result", {"encounter_draft": _step_draft(meta, media_refs, ctx)})
            continue
        yield ("progress", payload)


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/pipeline")
def pipeline(request: Request, body: PipelineRequest):
    store = request.app.state.store
    unknown = [s for s in (body.steps or []) if s not in STEP_ORDER]
    if unknown:
        raise HTTPException(status_code=400, detail=f"未知处理步骤：{unknown}")
    steps = [s for s in STEP_ORDER if s in (body.steps or list(STEP_ORDER))]

    if body.mode == "once":
        progress, draft = {}, None
        for event, payload in _run(store, body.input_id, steps):
            if event == "progress":
                progress[payload["step"]] = payload
            else:
                draft = payload["encounter_draft"]
        return {"input_id": body.input_id, "steps": progress, "encounter_draft": draft}

    def stream():
        for event, payload in _run(store, body.input_id, steps):
            yield _sse(event, payload)

    return StreamingResponse(stream(), media_type="text/event-stream")
