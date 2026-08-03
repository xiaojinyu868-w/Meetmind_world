"""lowpoly GLB 生成：三视图 → 本机 Blender 无头生成。

目的：定义"三视图 → GLB 模型"的稳定接口；真实路径是 subprocess 调用本机
      Blender 无头执行 templates/blender_lowpoly.py（占位人形脚本）。
输入：three_views dict（blender 路径入参预留，当前占位脚本不读图）、out_path；
      Blender 二进制路径从 .env 读 BLENDER_PATH，默认本机 blender-4.5.12。
输出：{"glb_path": str, "mode": "blender" | "mock", "detail": str}。
验收：Blender 可用时产出真实 GLB；不可用时（且 allow_mock_fallback=True）
      写出结构合法的最小 GLB 占位文件，全流程 mock 可跑通，不报错。
"""

import json
import struct
import subprocess
from pathlib import Path

from app.config import get_blender_path

BLENDER_SCRIPT = Path(__file__).resolve().parent / "templates" / "blender_lowpoly.py"


def _write_minimal_glb(out_path: Path) -> None:
    """写出一个结构合法的最小 GLB（空场景），仅作 mock 占位。"""
    json_chunk = json.dumps({"asset": {"version": "2.0"}}).encode("utf-8")
    padding = (4 - len(json_chunk) % 4) % 4
    json_chunk += b" " * padding
    total_length = 12 + 8 + len(json_chunk)
    with out_path.open("wb") as fh:
        fh.write(struct.pack("<III", 0x46546C67, 2, total_length))  # magic "glTF", version 2
        fh.write(struct.pack("<II", len(json_chunk), 0x4E4F534A))  # chunk type "JSON"
        fh.write(json_chunk)


def generate_lowpoly_glb(three_views: dict, out_path, blender_path: str | None = None,
                         allow_mock_fallback: bool = True, timeout: int = 300) -> dict:
    """调用 Blender 无头生成 GLB；失败时按参数降级为 mock 占位。"""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    blender = blender_path or get_blender_path()

    if Path(blender).exists():
        try:
            completed = subprocess.run(
                [blender, "-b", "--python", str(BLENDER_SCRIPT), "--", "--out", str(out_path)],
                capture_output=True, text=True, timeout=timeout,
            )
            if completed.returncode == 0 and out_path.exists():
                return {"glb_path": str(out_path), "mode": "blender",
                        "detail": "Blender 无头生成成功"}
            detail = f"Blender 退出码 {completed.returncode}: {completed.stderr[-300:]}"
        except Exception as exc:  # 超时/启动失败等，降级 mock
            detail = f"Blender 调用异常：{exc!r}"
    else:
        detail = f"Blender 二进制不存在：{blender}"

    if not allow_mock_fallback:
        raise RuntimeError(f"GLB 生成失败且未允许 mock 降级：{detail}")
    # TODO(算法待打磨)：mock 占位为最小空 GLB；真实模型依赖 Blender 路径可用
    _write_minimal_glb(out_path)
    return {"glb_path": str(out_path), "mode": "mock", "detail": detail}
