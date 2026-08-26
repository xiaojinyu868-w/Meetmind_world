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
- 完成后读 <publish_root>/<person_id>/spec.json（及 objects.json，物件层 v1）
  写回 Island（ready）；失败/超时置 failed，build_error = 异常类型+消息 +
  stdout/stderr 尾部（2026-08-26 修复：原实现只留输出尾巴、丢异常消息）。
- 熔断：队列连续 CIRCUIT_BREAKER_THRESHOLD 次失败 → 暂停消费（worker 停等
  新任务，记 ERROR 日志），trigger 直接抛 CircuitOpenError（API 层转 503）；
  resume() 手动恢复并清零计数，任意一次构建成功也会清零连续失败计数。
- workdir 共享：同 source_group_id 的构建复用 workdir_root/<group_id>
  （VL/岛图/sheet/切格产物只做一次），各岛只增量烘焙自己的 persona
  （--person-index）并发布到自己的 publish 目录；无 group_id 时退回
  workdir_root/<person_id>。
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
# 2 核服务器上单个人物烘焙就要 ~20 分钟级，整座岛可能数小时：
# 超时必须环境变量可调，默认 4 小时（2026-08-26 真机事故：20 分钟连零头都不够）。
DEFAULT_BUILD_TIMEOUT_SECONDS = 4 * 3600
TIMEOUT_ENV = "ECHO_ISLAND_BUILD_TIMEOUT"
ERROR_TAIL_CHARS = 1500
# 连续这么多次构建失败即熔断，暂停消费等新任务，需人工 resume
CIRCUIT_BREAKER_THRESHOLD = 2

DEFAULT_PUBLISH_ROOT = "/var/www/lihao-me/worlds"


class CircuitOpenError(RuntimeError):
    """构建队列已熔断（连续失败达阈值），拒绝新任务直到 resume。"""


def build_timeout_seconds() -> int:
    """构建 subprocess 超时：ECHO_ISLAND_BUILD_TIMEOUT 可调，默认 4 小时。"""
    raw = os.environ.get(TIMEOUT_ENV)
    if raw:
        try:
            value = int(raw)
            if value > 0:
                return value
        except ValueError:
            pass
        logger.warning("%s=%r 非法，回退默认 %ds",
                       TIMEOUT_ENV, raw, DEFAULT_BUILD_TIMEOUT_SECONDS)
    return DEFAULT_BUILD_TIMEOUT_SECONDS


def run_island_build(photo: str, person_id: str, workdir: Path,
                     publish_root: Path, *, person_index: int | None = None) -> None:
    """subprocess 调 build.py；失败/超时抛 RuntimeError（含输出尾部摘要）。

    person_index：岛主在合照（sheet 行）中的序号（0 起）；给了就只烘焙
    岛主本人的 persona（build.py --person-index），None 则全员（兼容旧行为）。
    """
    if not BUILD_SCRIPT.is_file():
        raise RuntimeError(f"构建脚本不存在：{BUILD_SCRIPT}（personal-site 管线尚未就绪）")
    if not photo or not Path(photo).is_file():
        raise RuntimeError(f"合照不存在：{photo}")
    timeout = build_timeout_seconds()
    cmd = [
        BUILD_PYTHON, str(BUILD_SCRIPT),
        "--photo", str(photo),
        "--person-id", person_id,
        "--workdir", str(workdir),
        "--publish-root", str(publish_root),
    ]
    if person_index is not None:
        cmd += ["--person-index", str(person_index)]
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        def _text(chunk) -> str:
            if isinstance(chunk, bytes):
                return chunk.decode(errors="replace")
            return chunk or ""
        tail = (_text(exc.stdout) + "\n" + _text(exc.stderr))[-ERROR_TAIL_CHARS:]
        raise RuntimeError(
            f"构建超时（{timeout // 60} 分钟）：{tail}"
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
        # 熔断状态：连续失败计数 + 熔断门（置位=放行；熔断时清除，worker 停等）
        self._consecutive_failures = 0
        self._resume_gate = threading.Event()
        self._resume_gate.set()

    # ---------- 触发 ----------

    @property
    def tripped(self) -> bool:
        """队列是否已熔断（连续失败达阈值，暂停消费）。"""
        return not self._resume_gate.is_set()

    @property
    def consecutive_failures(self) -> int:
        return self._consecutive_failures

    def resume(self) -> None:
        """手动恢复熔断：清零连续失败计数，放行 worker 继续消费。"""
        with self._lock:
            self._consecutive_failures = 0
            was_tripped = self.tripped
            self._resume_gate.set()
        if was_tripped:
            logger.warning("岛屿构建队列已手动恢复（resume）")
        self._ensure_worker()

    def trigger(self, person_id: str, *, owner_id: str,
                group_id: str | None = None, photo: str | None = None,
                person_index: int | None = None) -> dict:
        """建/更新 Island 为 building 并入队；building 中幂等返回当前记录。

        熔断状态下拒绝新任务（抛 CircuitOpenError，API 层转 503）。
        person_index：岛主在合照中的序号（0 起），随任务传给 build.py。
        """
        if self.tripped:
            raise CircuitOpenError(
                f"岛屿构建队列已熔断（连续 {self._consecutive_failures} 次失败），"
                "请先排查后调 POST /api/v1/islands/build/resume 恢复"
            )
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
        self._queue.put({"person_id": person_id, "photo": photo,
                         "group_id": group_id, "person_index": person_index})
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
            self._resume_gate.wait()  # 熔断时停在这里，直到 resume()
            job = self._queue.get()
            try:
                self._run_job(job)
            except Exception:  # worker 线程绝不能死
                logger.exception("岛屿构建任务异常：%s", job.get("person_id"))
            finally:
                self._queue.task_done()

    def _workdir_for(self, job: dict) -> Path:
        """同 source_group_id 复用同一 workdir（VL/岛图/sheet 等产物共享，
        已存在即被 build.py 跳过）；无 group 的独立构建退回按 person_id。"""
        return self.workdir_root / (job.get("group_id") or job["person_id"])

    def _run_job(self, job: dict) -> None:
        person_id = job["person_id"]
        runner = self._runner or run_island_build
        try:
            runner(job.get("photo"), person_id,
                   self._workdir_for(job), self.publish_root,
                   person_index=job.get("person_index"))
            spec_path = self.publish_root / person_id / "spec.json"
            spec = json.loads(spec_path.read_text(encoding="utf-8"))
            # 物件层 v1：build.py 发布 objects.json（VL objects → 热点故事卡点位），
            # 随构建完成一并 upsert 进 Island.objects；没有该文件视为无物件。
            objects_path = self.publish_root / person_id / "objects.json"
            objects = []
            if objects_path.is_file():
                objects = json.loads(objects_path.read_text(encoding="utf-8"))
            self._store.update(person_id, spec=spec, objects=objects,
                               build_status="ready", build_error=None)
            if self._consecutive_failures:
                logger.info("岛屿构建成功，连续失败计数清零：%s", person_id)
            self._consecutive_failures = 0
            logger.info("岛屿构建完成：%s", person_id)
        except Exception as exc:
            summary = self._error_summary(exc)
            logger.warning("岛屿构建失败：%s：%s", person_id, summary)
            self._store.update(person_id, build_status="failed",
                               build_error=summary)
            self._consecutive_failures += 1
            if self._consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD:
                self._resume_gate.clear()
                logger.error(
                    "岛屿构建队列熔断：连续 %d 次失败，暂停消费新任务；"
                    "修复后调 POST /api/v1/islands/build/resume 恢复",
                    self._consecutive_failures,
                )

    @staticmethod
    def _error_summary(exc: Exception) -> str:
        """build_error = 异常类型+消息（含 stderr/stdout 尾部），总长 ≤ ERROR_TAIL_CHARS。
        超长时保留开头（异常类型+消息主体）与结尾（输出尾部），中段省略。"""
        text = f"{type(exc).__name__}: {exc}"
        if len(text) <= ERROR_TAIL_CHARS:
            return text
        head = ERROR_TAIL_CHARS // 3
        return text[:head] + " … " + text[-(ERROR_TAIL_CHARS - head):]
