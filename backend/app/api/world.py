"""IF-4 世界接口 GET /api/v0/world/snapshot（docs/API.md，ADR-3）。

目的：返回 echo-snapshot.v1 世界快照。两级世界（MVP1.5）：?world=cafe 为
      咖啡厅（活动与互动，维持现状），?world=hall 为展位大厅（静态陈列 +
      有目的的稀疏串门：agents 以 at-booth 站位为主，events 返回大厅事件
      滚动缓冲——串门期间可见 agent-move/agent-talk）。
输入：query 参数 world（hall|cafe，默认 cafe）、advance（默认 1，推进一个
      tick 并驱动对应世界的调度器；advance=0 只读当前快照）。
输出：通过 snapshot_schema 硬校验的 dict。
验收：tests/test_hall.py、tests/test_hall_runtime.py。
"""

from fastapi import APIRouter, Query, Request

from app.schemas.snapshot_schema import validate_snapshot

router = APIRouter(prefix="/api/v0/world", tags=["world"])


@router.get("/snapshot")
def world_snapshot(request: Request, advance: int = 1,
                   world: str = Query("cafe", pattern="^(hall|cafe)$")):
    if world == "hall":
        hall = request.app.state.hall
        if advance:
            request.app.state.hall_runtime.tick(hall.snapshot())
            hall.step()
        return validate_snapshot(request.app.state.broadcast.enrich(hall.snapshot(), "hall"))
    cafe = request.app.state.world
    runtime = request.app.state.runtime
    if advance:
        runtime.tick(cafe.snapshot())
        cafe.step()
    return validate_snapshot(request.app.state.broadcast.enrich(cafe.snapshot(), "cafe"))
