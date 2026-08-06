"""IF-4 世界接口 GET /api/v0/world/snapshot（docs/API.md，ADR-3）。

目的：返回 echo-snapshot.v1 世界快照。两级世界（MVP1.5）：?world=cafe 为
      咖啡厅（活动与互动，维持现状），?world=hall 为展位大厅（静态陈列 +
      有目的的稀疏串门：agents 以 at-booth 站位为主，events 返回大厅事件
      滚动缓冲——串门期间可见 agent-move/agent-talk）。
输入：query 参数 world（hall|cafe，默认 cafe）、advance（默认 0，只读；
      advance=1 仅为旧客户端/测试保留，正式运行由服务端 scheduler 推进）。
输出：通过 snapshot_schema 硬校验的 dict。
验收：tests/test_hall.py、tests/test_hall_runtime.py。
"""

from fastapi import APIRouter, Query, Request

from app.security.meetmind_jwt import caller_user_id

router = APIRouter(prefix="/api/v0/world", tags=["world"])


def _visible_owners(request: Request) -> set[str]:
    caller = caller_user_id(request)
    return {"system"} | ({caller} if caller else set())


def _filter_snapshot_by_owner(request: Request, snapshot: dict) -> dict:
    """世界快照按归属过滤（LOGIN-AND-OWNERSHIP）：agent/booth module 的
    person 归属不在 常驻居民+自己 集合里的不返回。"""
    visible = _visible_owners(request)
    owners = {p["person_id"]: p.get("owner_id") or "system"
              for p in request.app.state.store.list_packages(include_deactivated=True)}
    snapshot["agents"] = [
        agent for agent in snapshot.get("agents", [])
        if owners.get(agent["id"], "system") in visible
    ]
    snapshot["modules"] = [
        module for module in snapshot.get("modules", [])
        if module.get("type") != "booth"
        or owners.get(module.get("person_id"), "system") in visible
    ]
    return snapshot


@router.get("/snapshot")
def world_snapshot(request: Request, advance: int = 0,
                   world: str = Query("cafe", pattern="^(hall|cafe)$")):
    if world == "hall":
        hall = request.app.state.hall
        if advance:
            request.app.state.hall_runtime.tick(hall.snapshot())
            hall.step()
        return _filter_snapshot_by_owner(request, hall.snapshot())
    cafe = request.app.state.world
    runtime = request.app.state.runtime
    if advance:
        runtime.tick(cafe.snapshot())
        cafe.step()
    return _filter_snapshot_by_owner(request, cafe.snapshot())
