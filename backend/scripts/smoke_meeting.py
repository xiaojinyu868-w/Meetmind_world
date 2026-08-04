"""真实 DeepSeek 冒烟：用户发起的圆桌会议（IF-6 会议端点的 runtime 内核）。

用法：cd backend && .venv/bin/python scripts/smoke_meeting.py \
    [--topic "帮谢淯琪的摄影展想想宣传点子"] [--ticks 8]

真实调用 chat provider（读取 .env 的 DeepSeek key）；数据目录用临时目录并播种
demo Package，不污染 backend/data。流程：发起带议题的用户会议 → 逐 tick 推进
（中途注入一条玩家发言）→ 打印每轮会议对话（agent-talk，带 meeting_id）。
人工质量门槛：发言扣题、引用真实关系/授权标签、对玩家发言有直接回应。
"""

from __future__ import annotations

import argparse
import os
import random
import sys
import tempfile
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("ECHO_DATA_DIR", tempfile.mkdtemp(prefix="echoworld-meeting-smoke-"))

from app.agents.llm import base as llm_base  # noqa: E402
from app.agents.memory.store import MemoryStore  # noqa: E402
from app.agents.runtime import AgentRuntime, EventBus  # noqa: E402
from app.packages.store import PackageStore  # noqa: E402
from app.world.seed import seed_demo_packages, seed_world  # noqa: E402
from app.world.service import WorldService  # noqa: E402

DEFAULT_PARTICIPANTS = ["lin-che", "zhou-ning", "chen-mo"]
DEFAULT_TOPIC = "帮谢淯琪的摄影展想想宣传点子"
PLAYER_MESSAGE = "能不能结合城市漫步路线，做一次户外快闪摄影展？"

# 与会者名字映射（打印用；世界快照里只有 id）
NAME_BY_ID = {
    "lin-che": "谢淯琪", "zhou-ning": "曾英杰", "chen-mo": "黄月胜",
    "xu-an": "徐安", "su-he": "苏禾", "tang-ke": "唐可",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--participants", nargs="*", default=list(DEFAULT_PARTICIPANTS))
    parser.add_argument("--topic", default=DEFAULT_TOPIC)
    parser.add_argument("--ticks", type=int, default=8)
    parser.add_argument("--player-message", default=PLAYER_MESSAGE)
    parser.add_argument("--player-at-tick", type=int, default=3,
                        help="在第几个 tick 前注入玩家发言（0 表示不注入）")
    args = parser.parse_args()

    provider = llm_base.get_provider("chat")
    print(f"chat provider：configured={provider.config.get('configured')} "
          f"model={provider.model}")
    if not provider.config.get("configured"):
        print("!! 未配置 chat key，输出将全部是模板兜底；请检查 .env")

    store = PackageStore()
    seed_demo_packages(store)
    memory = MemoryStore(store)
    world = WorldService(seed_world())
    bus = EventBus()
    bus.subscribe(world.apply_event)
    runtime = AgentRuntime(bus, rng=random.Random(42),
                           chat_provider=provider, memory=memory)

    meeting = runtime.start_user_meeting(args.participants, topic=args.topic,
                                         tick=world.tick)
    assert meeting is not None, "会议发起失败（已有会议进行中？）"
    names = "、".join(NAME_BY_ID.get(pid, pid) for pid in meeting["participants"])
    print(f"\n===== 会议开始：{meeting['meeting_id']} =====")
    print(f"议题：{meeting['topic']}")
    print(f"与会者：{names}")
    if world.current_meeting is None:
        print("!! 世界侧入座失败（圆桌无空位）")
        return

    seen_keys = set()
    total = 0
    for tick_index in range(args.ticks):
        if args.player_at_tick and tick_index == args.player_at_tick:
            accepted = runtime.post_player_message(args.player_message)
            print(f"\n----- 玩家发言（accepted={bool(accepted)}）-----")
            print(f"发起人：{args.player_message}")
        runtime.tick(world.snapshot())
        world.step()
        events = world.snapshot()["events"]
        # 滚动缓冲会逐出旧事件：按 (tick, speaker, text) 去重打印，不按下标切片
        for talk in events:
            if (talk["type"] != "agent-talk"
                    or talk.get("meeting_id") != meeting["meeting_id"]):
                continue
            key = (talk["tick"], talk["agent_id"], talk["text"])
            if key in seen_keys:
                continue
            seen_keys.add(key)
            total += 1
            speaker = NAME_BY_ID.get(talk["agent_id"], talk["agent_id"])
            print(f"  [tick {talk['tick']:>2}] {speaker}：{talk['text']}")
        if world.current_meeting is None:
            print(f"\n===== 会议结束（tick {world.tick}）=====")
            break
    else:
        print(f"\n===== {args.ticks} 个 tick 走完，会议仍在进行 "
              f"（ticks_left={runtime._meeting and runtime._meeting['ticks_left']}）=====")

    print(f"\n会议对话总数：{total}")
    if total == 0:
        print("!! 整场会议没有任何对话产出")


if __name__ == "__main__":
    main()
