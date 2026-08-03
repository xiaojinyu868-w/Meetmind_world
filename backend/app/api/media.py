"""媒体路由 GET /api/v0/media/{ref:path}：从数据目录安全提供 facts 文件。

目的：live 模式下资料包里的图片/音视频/转写（facts/ 指针）可直接被前端
      经本路由取到真实字节；只读，不写。
输入：ref 路径参数（如 facts/seed/lin-che/face.png）。
输出：200 文件字节（正确 Content-Type）；404 不存在/类型不允许；403 路径穿越。
验收：tests/test_media.py —— 200/404/穿越拒绝；packages 返回的 face_ref 可取到字节。

安全：路径段拒绝 ".."，resolve 后必须落在数据目录内；扩展名白名单；
不列出目录、不跟随数据目录外的符号链接（resolve 后仍在 root 内才放行）。
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/v0", tags=["media"])

_CONTENT_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "m4a": "audio/mp4",
    "wav": "audio/wav",
    "mp3": "audio/mpeg",
    "md": "text/markdown; charset=utf-8",
}


@router.get("/media/{ref:path}")
def get_media(request: Request, ref: str):
    store = request.app.state.store
    parts = [part for part in ref.replace("\\", "/").split("/") if part not in ("", ".")]
    if not parts or any(part == ".." for part in parts):
        raise HTTPException(status_code=403, detail="路径穿越被拒绝")
    root = store.root.resolve()
    target = (root / Path(*parts)).resolve()
    if target != root and root not in target.parents:
        raise HTTPException(status_code=403, detail="路径穿越被拒绝")
    if not target.is_file():
        raise HTTPException(status_code=404, detail=f"媒体不存在：{ref}")
    media_type = _CONTENT_TYPES.get(target.suffix.lower().lstrip("."))
    if media_type is None:
        raise HTTPException(status_code=404, detail=f"不允许的媒体类型：{target.suffix}")
    return FileResponse(target, media_type=media_type)
