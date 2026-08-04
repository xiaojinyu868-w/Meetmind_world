"""真实 DeepSeek 冒烟：玩家与 Agent 单聊（IF-6 / M1.3）。

用法：cd backend && .venv/bin/python scripts/smoke_agent_chat.py [--person lin-che]

真实调用 chat provider（读取 .env 的 DeepSeek key）；数据目录用临时目录并播种
demo Package，不污染 backend/data。默认跑两轮对话（第二轮带 history 回显），
打印 reply / cited_facts / suggestions / generated_by 与耗时，人工判断
"指得回事实、有温度、不编造"的质量门槛。
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

os.environ.setdefault("ECHO_DATA_DIR", tempfile.mkdtemp(prefix="echoworld-chat-smoke-"))

from app.agents import player_chat  # noqa: E402
from app.agents.llm import base as llm_base  # noqa: E402
from app.agents.memory.store import MemoryStore  # noqa: E402
from app.packages.store import PackageStore  # noqa: E402
from app.world.seed import seed_demo_packages  # noqa: E402

# 两轮冒烟脚本：第一轮无 history（看系统结构化开场），第二轮带 history（看接续）
DEFAULT_TURNS = (
    "我们当初是怎么认识的？",
    "哦对，那件事我记岔了。你最近在忙什么？有什么我能帮上忙的吗？",
)


def _print_turn(index: int, message: str, result: dict, elapsed_ms: float) -> None:
    print(f"\n----- 第 {index} 轮（generated_by={result['generated_by']} "
          f"耗时={elapsed_ms:.0f}ms）-----")
    print(f"玩家        : {message}")
    print(f"分身回复    : {result['reply']}")
    print(f"cited_facts : {result['cited_facts']}")
    print(f"suggestions : {result['suggestions']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--person", default="lin-che")
    parser.add_argument("--turns", nargs="*", default=list(DEFAULT_TURNS))
    args = parser.parse_args()

    provider = llm_base.get_provider("chat")
    print(f"chat provider：configured={provider.config.get('configured')} "
          f"model={provider.model}")
    if not provider.config.get("configured"):
        print("!! 未配置 chat key，输出将全部是 mock 兜底；请检查 .env")

    store = PackageStore()
    seed_demo_packages(store)
    memory = MemoryStore(store)

    history: list[dict] = []
    for index, message in enumerate(args.turns, start=1):
        started = time.monotonic()
        result = player_chat.chat_with_player(
            memory, store, provider, args.person, message, history,
        )
        elapsed_ms = (time.monotonic() - started) * 1000
        if result is None:
            print(f"!! 人物不存在或未确认：{args.person}")
            return
        _print_turn(index, message, result, elapsed_ms)
        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": result["reply"]})


if __name__ == "__main__":
    main()
