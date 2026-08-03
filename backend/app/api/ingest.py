"""IF-1 输入接口 POST /api/v0/ingest（docs/API.md）。

目的：接收视频/音频输入（眼镜/手机/K3 开发板），数据落盘即只读（事实层，
      只增不改）。IF-1 与 IF-2 分离：输入只管可靠落盘，不做提取。
输入（multipart/form-data）：media[]（mp4/mov/m4a/wav/mp3 + jpg/jpeg/png/webp 现场照片，
      必填，单文件 ≤ 500MB）、captured_at（ISO8601，必填）、device（glasses/phone/k3-board，
      必填）、note（可选）、place_hint（可选）。
输出：201 {"input_id", "facts_refs": ["facts/<date>/<input_id>/<file>"], "status": "stored"}；
      400 格式不支持 / 413 超限。
验收：tests/test_api.py —— 上传后 201 且 facts_refs 为真实落盘指针。

落盘时附带一份 meta.v1.json（captured_at/device/note/place_hint）到同一目录，
供 IF-2「pipeline」从事实层出发驱动提取 stub。
"""

import json
import re
import time
import uuid
from datetime import datetime

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

router = APIRouter(prefix="/api/v0", tags=["ingest"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".m4a", ".wav", ".mp3",
                      ".jpg", ".jpeg", ".png", ".webp"}  # 视频/音频 + 现场照片（IF-2 图片可直接分析）
ALLOWED_DEVICES = {"glasses", "phone", "k3-board"}
MAX_FILE_BYTES = 500 * 1024 * 1024  # 契约：单文件 ≤ 500MB


def _sanitize_filename(name: str | None) -> str:
    """去掉路径成分与非法字符，得到可安全落盘的文件名。"""
    name = (name or "unnamed.bin").replace("\\", "/").rsplit("/", 1)[-1]
    cleaned = re.sub(r"[^\w.\-]", "_", name, flags=re.UNICODE)
    return cleaned or "unnamed.bin"


@router.post("/ingest", status_code=201)
async def ingest(
    request: Request,
    media: list[UploadFile] = File(...),
    captured_at: str = Form(...),
    device: str = Form(...),
    note: str = Form(""),
    place_hint: str = Form(""),
):
    if device not in ALLOWED_DEVICES:
        raise HTTPException(status_code=400, detail=f"不支持的 device：{device!r}")
    try:
        captured = datetime.fromisoformat(captured_at)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"captured_at 不是合法 ISO8601：{captured_at!r}")

    store = request.app.state.store
    input_id = f"in_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
    date_dir = captured.date().isoformat()  # facts/<YYYY-MM-DD>/<input_id>/

    facts_refs = []
    for upload in media:
        filename = _sanitize_filename(upload.filename)
        suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if suffix not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"不支持的媒体格式：{filename}")
        # MVP：整体读入内存后校验大小（500MB 上限内可接受）
        data = await upload.read()
        if len(data) > MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail=f"单文件超过 500MB 上限：{filename}")
        if not data:
            continue
        # 采集即冻结：落盘即只读，永远不被覆盖（防线 #1）
        facts_refs.append(store.write_fact(date_dir, input_id, filename, data))
    if not facts_refs:
        raise HTTPException(status_code=400, detail="media 均为空文件")

    # 输入元数据同样作为事实留存，供 IF-2 从事实层出发提取
    meta = {
        "input_id": input_id,
        "captured_at": captured_at,
        "device": device,
        "note": note,
        "place_hint": place_hint,
        "media_refs": facts_refs,
    }
    store.write_fact(date_dir, input_id, "meta.v1.json",
                     json.dumps(meta, ensure_ascii=False, indent=2).encode("utf-8"))

    return {"input_id": input_id, "facts_refs": facts_refs, "status": "stored"}
