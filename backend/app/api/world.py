"""IF-4 世界接口 GET /api/v0/world/snapshot（docs/API.md，ADR-3）。

目的：返回 echo-snapshot.v1 世界快照。两级世界（MVP1.5）：?world=cafe 为
      咖啡厅（活动与互动，维持现状），?world=hall 为展位大厅（静态陈列：
      agents 只含 at-booth 站位数据，events 恒为空数组——大厅无对话）。
输入：query 参数 world（hall|cafe，默认 cafe）、advance（默认 1，推进一个
      tick；advance=0 只读当前快照）。
输出：通过 snapshot_schema 硬校验的 dict。
验收：tests/test_hall.py —— hall 快照 6 展位/at-booth/events 为空；
      tests/test_api.py —— cafe 快照 schema 正确、agents 非空。
"""

from fastapi import APIRouter, Query, Request

router = APIRouter(prefix="/api/v0/world", tags=["world"])


@router.get("/snapshot")
def world_snapshot(request: Request, advance: int = 1,
                   world: str = Query("cafe", pattern="^(hall|cafe)$")):
    if world == "hall":
        hall = request.app.state.hall
        if advance:
            hall.step()  # 大厅无 runtime 调度，仅推进 tick 计数（语义不变）
        snapshot = hall.snapshot()
        snapshot["events"] = []  # 大厅静态陈列：无对话/事件流
        return snapshot
    cafe = request.app.state.world
    runtime = request.app.state.runtime
    if advance:
        runtime.tick(cafe.snapshot())
        cafe.step()
    return cafe.snapshot()
