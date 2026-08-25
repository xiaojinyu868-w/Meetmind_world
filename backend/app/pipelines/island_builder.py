"""「每人一岛」构建触发器：串行队列 + build.py subprocess（P1 接线）。

- IslandBuildQueue：单 worker 守护线程串行消费（服务器 2 核 CPU，绝不并发构建）。
  trigger() 幂等：person_id 已在 building 时直接返回当前记录，不重复入队。
- run_island_build：对 /root/personal-site/scripts/island/build.py 的 subprocess 适配层。
  该脚本由另一项目并行开发，CLI 以其 argparse 实际定义为准（2026-08 读码确认）：
    --photo <合照> --person-id <id> [--workdir DIR] [--publish-root DIR]
    [--dry-run-publish DIR] [--skip-vl] [--redo ...] [--upto ...]
  计划里写的 --dry-run-publish 只是"改发布目录"的调试开关；生产发布根默认即
  /var/www/lihao-me/worlds（与 Island.assets_base="/me/worlds/<id>" 对应），
  所以这里显式传 --publish-root，不用 dry-run。CLI 若再变，只改这一个函数。
- 完成后读 <publish_root>/<person_id>/spec.json 写回 Island（ready）；
  失败/超时置 failed，错误摘要（stdout/stderr 尾部）进 build_error 字段。
"""

from __future__ import annotations

import json
import logging
import os
import queue
import subprocess
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

BUILD_SCRIPT = Path("/root/personal-site/scripts/island/build.py")
# build.py 编排层需要 PIL，约定用 meetmind 后端 venv 的 python 跑（见脚本 docstring）
BUILD_PYTHON = "/root/meetmind_go/backend/.venv/bin/python"
BUILD_TIMEOUT_SECONDS = 20 * 60
ERROR_TAIL_CHARS = 800

DEFAULT_PUBLISH_ROOT = "/var/www/lihao-me/worlds"


def run_island_build(photo: str, person_id: str, workdir: Path,
                     publish_root: Path) -> None:
    """subprocess 调 build.py；失败/超时抛 RuntimeError（含输出尾部摘要）。"""
    if not BUILD_SCRIPT.is_file():
        raise RuntimeError(f"构建脚本不存在：{BUILD_SCRIPT}（personal-site 管线尚未就绪）")
    if not photo or not Path(photo).is_file():
        raise RuntimeError(f"合照不存在：{photo}")
    cmd = [
        BUILD_PYTHON, str(BUILD_SCRIPT),
        "--photo", str(photo),
        "--person-id", person_id,
        "--workdir", str(workdir),
        "--publish-root", str(publish_root),
    ]
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=BUILD_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        def _text(chunk) -> str:
            if isinstance(chunk, bytes):
                return chunk.decode(errors="replace")
            return chunk or ""
        tail = _text(exc.stdout) + _text(exc.stderr)
        raise RuntimeError(
            f"构建超时（{BUILD_TIMEOUT_SECONDS // 60} 分钟）{tail[-ERROR_TAIL_CHARS:]}"
        ) from exc
    if proc.returncode != 0:
        tail = (proc.stdout + "\n" + proc.stderr)[-ERROR_TAIL_CHARS:]
        raise RuntimeError(f"build.py 退出码 {proc.returncode}：{tail}")


class IslandBuildQueue:
    """岛屿构建串行队列：trigger 入队，单 worker 线程依次跑 build.py。"""

    def __init__(self, store, *, publish_root: str | Path | None = None,
                 workdir_root: str | Path | None = None, runner=None):
        self._store = store
        self.publish_root = Path(
            publish_root
            or os.environ.get("ECHO_ISLAND_PUBLISH_ROOT", DEFAULT_PUBLISH_ROOT)
        )
        self.workdir_root = Path(
            workdir_root
            or os.environ.get("ECHO_ISLAND_WORKDIR_ROOT",
                              str(store._root.parent / "island-builds"))
        )
        self._runner = runner  # None → 调用时取模块级 run_island_build（便于测试 patch）
        self._queue: queue.Queue[dict] = queue.Queue()
        self._worker: threading.Thread | None = None
        self._lock = threading.Lock()

    # ---------- 触发 ----------

    def trigger(self, person_id: str, *, owner_id: str,
                group_id: str | None = None, photo: str | None = None) -> dict:
        """建/更新 Island 为 building 并入队；building 中幂等返回当前记录。"""
        existing = self._store.get(person_id)
        if existing:
            if existing.get("build_status") == "building":
                return existing  # 幂等：不重复触发
            island = self._store.update(
                person_id, build_status="building", build_error=None,
                **({"source_group_id": group_id} if group_id else {}),
            )
        else:
            from app.api.v1.islands import IslandUpsert  # 延迟导入避免环
            island = self._store.upsert(
                IslandUpsert(person_id=person_id, source_group_id=group_id,
                             build_status="building"),
                owner_id=owner_id,
            )
        self._queue.put({"person_id": person_id, "photo": photo})
        self._ensure_worker()
        return island

    # ---------- worker ----------

    def _ensure_worker(self) -> None:
        with self._lock:
            if self._worker is None or not self._worker.is_alive():
                self._worker = threading.Thread(
                    target=self._work, name="island-build-worker", daemon=True,
                )
                self._worker.start()

    def wait_idle(self) -> None:
        """等队列清空（测试/脚本用）。单 worker 串行，join 即全部完成。"""
        self._queue.join()

    def _work(self) -> None:
        while True:
            job = self._queue.get()
            try:
                self._run_job(job)
            except Exception:  # worker 线程绝不能死
                logger.exception("岛屿构建任务异常：%s", job.get("person_id"))
            finally:
                self._queue.task_done()

    def _run_job(self, job: dict) -> None:
        person_id = job["person_id"]
        runner = self._runner or run_island_build
        try:
            runner(job.get("photo"), person_id,
                   self.workdir_root / person_id, self.publish_root)
            spec_path = self.publish_root / person_id / "spec.json"
            spec = json.loads(spec_path.read_text(encoding="utf-8"))
            self._store.update(person_id, spec=spec, build_status="ready",
                               build_error=None)
            logger.info("岛屿构建完成：%s", person_id)
        except Exception as exc:
            summary = str(exc)[-ERROR_TAIL_CHARS:]
            logger.warning("岛屿构建失败：%s：%s", person_id, summary)
            self._store.update(person_id, build_status="failed",
                               build_error=summary)
