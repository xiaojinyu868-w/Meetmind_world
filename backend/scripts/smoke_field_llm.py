"""真实 DeepSeek 冒烟：为种子人物生成 LLM 关系场域并打印结果（2.G.1 / TBD-F3）。

用法：cd backend && .venv/bin/python scripts/smoke_field_llm.py [--people lin-che su-he]

真实调用 chat provider（读取 .env 的 DeepSeek key）；数据写入临时目录，
不污染 backend/data。每个人物强制 regenerate 走 LLM 路径，打印模型名、
参数、文案与耗时，人工判断"诗意且可渲染、人与人可区分"的质量门槛。
"""

from __future__ import annotations

import argparse
import os
import sys
import tempfile
import time
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("ECHO_DATA_DIR", tempfile.mkdtemp(prefix="echoworld-field-smoke-"))

from app.agents.llm import base as llm_base  # noqa: E402
from app.fields import ensure_field  # noqa: E402
from app.packages.store import PackageStore  # noqa: E402
from app.world.seed import seed_demo_packages  # noqa: E402

DEFAULT_PEOPLE = ("lin-che", "su-he", "chen-mo")


def _print_field(person_id: str, field: dict, elapsed_ms: float) -> None:
    scene = field["scene"]
    params = scene["parameters"]
    print(f"\n===== {person_id}（{field['relation']['with']}） "
          f"model={field['model']} 耗时={elapsed_ms:.0f}ms =====")
    print(f"title    : {scene['title']}")
    print(f"metaphor : {scene['metaphor']}")
    print(f"summary  : {scene['summary']}")
    print("params   : " + " ".join(
        f"{key}={params[key]}" for key in
        ("sky", "horizon", "ground", "accent", "fog", "openness", "warmth", "motion")))
    print(f"weather  : {params['weather']}")
    for entity in scene["entities"]:
        print(f"  [{entity['type']:9s}] {entity['detail']}")
    print(f"sources  : {len(field['generated_from'])} 个事实指针")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--people", nargs="*", default=list(DEFAULT_PEOPLE))
    args = parser.parse_args()

    provider = llm_base.get_provider("chat")
    print(f"chat provider：configured={provider.config.get('configured')} "
          f"model={provider.model}")
    if not provider.config.get("configured"):
        print("!! 未配置 chat key，输出将全部是规则模板兜底；请检查 .env")
    store = PackageStore()
    seed_demo_packages(store)
    for person_id in args.people:
        started = time.monotonic()
        field = ensure_field(store, person_id, regenerate=True)
        _print_field(person_id, field, (time.monotonic() - started) * 1000)


if __name__ == "__main__":
    main()
