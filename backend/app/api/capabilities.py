"""上下文量能能力快照 API（ROADMAP X.6）。"""

from fastapi import APIRouter, Query, Request

router = APIRouter(prefix="/api/v0/capabilities", tags=["capabilities"])


@router.get("")
def capability_snapshot(
    request: Request,
    group_participants: int = Query(0, ge=0, le=8),
):
    """返回前端可消费的能力状态；现场人数只用于当前群体房间上下文。"""
    return request.app.state.capabilities.snapshot(
        group_participants=group_participants,
    )
