"""IF-4 世界接口 GET /api/v0/world/snapshot（docs/API.md，ADR-3）。

目的：返回 echo-snapshot.v1 世界快照（含 agents 位置/状态/调色板、modules、
      最近 20 条世界事件缓冲 events）。MVP1 前端轮询（如 2s）；MVP2 评估 SSE。
输入：query 参数 advance（默认 1）：advance=1 时推进一个 tick（Agent Runtime
      发事件 → World Service 消费 → 生成快照），advance=0 只读当前快照。
输出：通过 snapshot_schema 硬校验的 dict。
验收：tests/test_api.py —— 200 且 schema 正确、agents 非空、events 合法。
"""

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v0/world", tags=["world"])


@router.get("/snapshot")
def world_snapshot(request: Request, advance: int = 1):
    world = request.app.state.world
    runtime = request.app.state.runtime
    if advance:
        runtime.tick(world.snapshot())
        world.step()
    return world.snapshot()
