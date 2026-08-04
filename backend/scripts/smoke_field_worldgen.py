"""真实 World Labs Marble 冒烟：把 smoke 世界资产落库到种子人物（FR-2.11）。

用法：cd backend && .venv/bin/python scripts/smoke_field_worldgen.py [--person lin-che]

默认流程（不消耗额度）：轮询已完成的 smoke 操作
f1f0134f-a6bf-4474-8647-9bb36e63eede（storybook diorama garden），下载
100k/500k spz + collider GLB + pano 写入 derived/ 派生存储，把 ready world
块写进该人物的 echo-field.v1 推断，并打印 world 块与资产清单。

--generate 才发起一次新的真实生成（消耗额度、约 5 分钟，预算内慎用）。

安全：WORLDLABS_API_KEY 只被 provider 程序读取进请求头，本脚本不打印、不落盘。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.fields import ensure_field  # noqa: E402
from app.fields.world_gen import (  # noqa: E402
    MarbleWorldGen,
    _persist_assets,
    _persist_world_block,
    build_world_prompt,
    request_field_world,
    world_prompt_hash,
)
from app.packages.store import PackageStore  # noqa: E402
from app.world.seed import seed_demo_packages  # noqa: E402

SMOKE_OPERATION_ID = "f1f0134f-a6bf-4474-8647-9bb36e63eede"


def _print_world_block(person_id: str, store: PackageStore) -> None:
    field = ensure_field(store, person_id)
    world = field.get("world") or {}
    print(f"\n===== {person_id} world 块 =====")
    print(json.dumps(world, ensure_ascii=False, indent=2))
    for label, ref in [
        ("spz.100k", (world.get("spz") or {}).get("100k")),
        ("spz.500k", (world.get("spz") or {}).get("500k")),
        ("collider", world.get("collider_ref")),
        ("pano", world.get("pano_ref")),
    ]:
        if not ref:
            continue
        target = store.root / ref
        size = target.stat().st_size if target.exists() else -1
        print(f"  {label:9s} {ref}  ({size:,} bytes)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--person", default="lin-che")
    parser.add_argument("--operation", default=SMOKE_OPERATION_ID,
                        help="要落库的已完成操作 id（默认复用 smoke 世界）")
    parser.add_argument("--generate", action="store_true",
                        help="发起一次新的真实生成（消耗额度，约 5 分钟）")
    args = parser.parse_args()

    provider = MarbleWorldGen()
    print(f"Marble provider：configured={provider.configured} model={provider.model}")
    if not provider.configured:
        print("!! 未配置 WORLDLABS_API_KEY，冒烟退出"); return

    store = PackageStore()
    seed_demo_packages(store)
    field = ensure_field(store, args.person)
    prompt = build_world_prompt(field)
    print(f"scene prompt（{len(prompt)} 字符，hash={world_prompt_hash(prompt)}）：")
    print(f"  {prompt}")

    if args.generate:
        print("发起真实生成（同步轮询至完成，约 5 分钟）……")
        world, status = request_field_world(
            store, args.person, provider=provider, background=False)
        print(f"受理：HTTP {status} status={world.get('status')}")
    else:
        operation = provider.get_operation(args.operation)
        if not operation.get("done"):
            print(f"!! 操作 {args.operation} 尚未完成，稍后再试"); return
        assets = (operation.get("response") or {}).get("assets") or {}
        block = _persist_assets(store, args.person, operation, assets,
                                world_prompt_hash(prompt), provider)
        _persist_world_block(store, args.person, block)
        print(f"落库：status={block.get('status')} world_id={block.get('world_id')}")

    _print_world_block(args.person, store)


if __name__ == "__main__":
    main()
