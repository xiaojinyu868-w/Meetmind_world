"""视频关键帧抽取：优先系统 ffmpeg，其次 venv 内 cv2（opencv-python-headless）。

目的：IF-2 预处理的真实抽帧 —— 从上传视频均匀抽 3 帧，供 faces/scene 步骤
      消费真实画面；ffmpeg 与 cv2 都不可用时返回 None（调用方退回占位/stub 分支）。
输入：video_path（已落盘的视频文件）、count（默认 3）、out_dir（可选，默认临时目录）。
输出：抽出的 JPEG 路径列表；失败/不可用返回 None。
验收：tests/test_video_frames.py —— ffmpeg 真实抽帧（本机 /usr/bin/ffmpeg）；
      cv2 兜底（fake cv2 模块）；两者不可用返回 None。

实现注记：ffmpeg 用 ffprobe（或解析 stderr 的 Duration）拿时长后按
(i+1)/(count+1) 均匀时间点 `-ss` 快 seek 单帧输出；cv2 用帧号定位。
每次调用时检测可用性（便于测试 monkeypatch，也适应运行期环境变化）。
"""

import shutil
import subprocess
import tempfile
from pathlib import Path

DEFAULT_FRAME_COUNT = 3


def _ffmpeg_path() -> str | None:
    return shutil.which("ffmpeg")


def _ffprobe_path() -> str | None:
    return shutil.which("ffprobe")


def _duration_seconds(video_path: Path) -> float | None:
    """ffprobe 优先；否则解析 ffmpeg -i 的 stderr Duration 行。"""
    ffprobe = _ffprobe_path()
    if ffprobe:
        try:
            out = subprocess.run(
                [ffprobe, "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)],
                capture_output=True, text=True, timeout=30)
            return float(out.stdout.strip())
        except Exception:
            pass
    ffmpeg = _ffmpeg_path()
    if ffmpeg:
        try:
            proc = subprocess.run([ffmpeg, "-i", str(video_path)],
                                  capture_output=True, text=True, timeout=30)
            for line in proc.stderr.splitlines():
                if "Duration:" in line:
                    stamp = line.split("Duration:")[1].split(",")[0].strip()
                    hours, minutes, seconds = stamp.split(":")
                    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
        except Exception:
            pass
    return None


def _extract_with_ffmpeg(video_path: Path, count: int, out_dir: Path) -> list | None:
    ffmpeg = _ffmpeg_path()
    if not ffmpeg:
        return None
    duration = _duration_seconds(video_path)
    if not duration or duration <= 0:
        return None
    frames = []
    for i in range(count):
        timestamp = duration * (i + 1) / (count + 1)
        target = out_dir / f"frame_{i + 1:02d}.jpg"
        try:
            proc = subprocess.run(
                [ffmpeg, "-y", "-ss", f"{timestamp:.3f}", "-i", str(video_path),
                 "-frames:v", "1", "-q:v", "3", str(target)],
                capture_output=True, timeout=60)
        except Exception:
            return None
        if proc.returncode != 0 or not target.exists() or target.stat().st_size == 0:
            return None
        frames.append(target)
    return frames


def _extract_with_cv2(video_path: Path, count: int, out_dir: Path) -> list | None:
    try:
        import cv2  # noqa: 延迟导入：可选依赖（opencv-python-headless）
    except ImportError:
        return None
    try:
        capture = cv2.VideoCapture(str(video_path))
        if not capture.isOpened():
            return None
        total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        if total <= 0:
            capture.release()
            return None
        frames = []
        for i in range(count):
            index = int(total * (i + 1) / (count + 1))
            capture.set(cv2.CAP_PROP_POS_FRAMES, index)
            ok, frame = capture.read()
            if not ok:
                break
            target = out_dir / f"frame_{i + 1:02d}.jpg"
            cv2.imwrite(str(target), frame)
            frames.append(target)
        capture.release()
    except Exception:
        return None
    return frames or None


def extract_keyframes(video_path, count: int = DEFAULT_FRAME_COUNT,
                      out_dir=None) -> list | None:
    """从视频均匀抽 count 帧 JPEG。ffmpeg 优先，cv2 兜底；都不可用返回 None。"""
    video_path = Path(video_path)
    if out_dir is None:
        out_dir = Path(tempfile.mkdtemp(prefix="echoworld-frames-"))
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    return (_extract_with_ffmpeg(video_path, count, out_dir)
            or _extract_with_cv2(video_path, count, out_dir))
