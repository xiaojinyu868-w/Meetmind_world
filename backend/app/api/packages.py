"""IF-5 资料包查看接口（docs/API.md）：GET /api/v0/packages[/{person_id}]（FR-1.8）。

目的：
  - GET /api/v0/packages：Package 摘要列表；
  - GET /api/v0/packages/{person_id}?viewer=...：按权限圈层过滤的 Package 详情（P-8）；
    事实指针 + 推断视图。资料包内容不走世界快照，由本接口按权限单独拉取（ADR-3）。
输入：路径参数 person_id；query 参数 viewer ∈ {self, agent, org, public}。
输出：package dict（按 viewer 过滤后的副本）。
验收：tests/test_api.py —— agent 视角只见 ≥ L2 的 encounter，非 self 不见人脸指针。

人物身份确认走 IF-3（POST /api/v0/confirm，见 api/confirm.py）。
"""

import copy

from fastapi import APIRouter, Query, Request
from fastapi import HTTPException

from app.packages.store import PackageNotFound

router = APIRouter(prefix="/api/v0/packages", tags=["packages"])

# 权限圈层 → 可见的 privacy 级别集合（CONTEXT-AND-MEMORY.md §5）
VIEWER_VISIBLE_PRIVACY = {
    "self": {"self-only", "agent-usable", "org-shared", "public-approved"},
    "agent": {"agent-usable", "org-shared", "public-approved"},  # Agent 只能携带 ≥ L2
    "org": {"org-shared", "public-approved"},
    "public": {"public-approved"},
}


def _filter_for_viewer(package: dict, viewer: str) -> dict:
    """按权限圈层过滤 encounter，并对非 self 隐藏真实人脸指针（人脸永不 L4）。"""
    visible = VIEWER_VISIBLE_PRIVACY[viewer]
    filtered = copy.deepcopy(package)
    filtered["encounters"] = [
        encounter
        for encounter in filtered["encounters"]
        if encounter.get("privacy", "self-only") in visible
    ]
    if viewer != "self":
        filtered["identity"]["face_ref"] = None
        filtered["avatar"]["real_face_ref"] = None
    return filtered


@router.get("")
def list_packages(request: Request):
    return {"packages": request.app.state.store.list_packages()}


@router.get("/{person_id}")
def get_package(request: Request, person_id: str,
                viewer: str = Query("self", pattern="^(self|agent|org|public)$")):
    store = request.app.state.store
    try:
        package = store.load_package(person_id)
    except PackageNotFound:
        raise HTTPException(status_code=404, detail=f"人物不存在：{person_id}")
    # FR-1.3：未确认身份不进 Agent 上下文
    if viewer == "agent" and not package["identity"]["confirmed"]:
        raise HTTPException(status_code=403, detail="身份未确认，不进入 Agent 上下文")
    return _filter_for_viewer(package, viewer)
