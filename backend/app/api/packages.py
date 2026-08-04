"""IF-5 资料包查看接口（docs/API.md）：GET /api/v0/packages[/{person_id}]（FR-1.8）。

目的：
  - GET /api/v0/packages：Package 摘要列表；
  - GET /api/v0/packages/{person_id}?viewer=...：Package 详情（事实指针 + 推断视图）。
    首版不执行权限过滤（2026-08-03 产品决策，TBD-P3）：单用户世界全量返回，
    viewer 参数保留兼容（不再隐藏 face_ref/事实指针）；授权机制重议后恢复过滤。
输入：路径参数 person_id；query 参数 viewer ∈ {self, agent, org, public}（兼容保留）。
输出：package dict（全量）。
验收：tests/test_api.py —— viewer 兼容不过滤；agent 视角未确认仍 403
      （FR-1.3 可靠性闸，与隐私过滤无关）。

人物身份确认走 IF-3（POST /api/v0/confirm，见 api/confirm.py）。
"""

from fastapi import APIRouter, Query, Request
from fastapi import HTTPException
from pydantic import BaseModel

from app.packages.store import PackageNotFound

router = APIRouter(prefix="/api/v0/packages", tags=["packages"])


class EncounterPrivacyUpdate(BaseModel):
    privacy: str


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
    # FR-1.3：未确认身份不进 Agent 上下文（数据可靠性，与隐私过滤无关，保留）
    if viewer == "agent" and not package["identity"]["confirmed"]:
        raise HTTPException(status_code=403, detail="身份未确认，不进入 Agent 上下文")
    # 首版不过滤（TBD-P3）：viewer 参数保留兼容，全量返回
    return package


@router.patch("/{person_id}/encounters/{encounter_id}/privacy")
def update_encounter_privacy(
    request: Request, person_id: str, encounter_id: str, body: EncounterPrivacyUpdate,
):
    """本机资料所有者显式决定一段相遇是否进入 PersonAgent 上下文。"""
    if body.privacy not in {"self-only", "agent-usable"}:
        raise HTTPException(status_code=400, detail="这里只允许 L1 或 L2")
    store = request.app.state.store
    try:
        package = store.load_package(person_id)
    except PackageNotFound:
        raise HTTPException(status_code=404, detail=f"人物不存在：{person_id}")
    if not package["identity"].get("confirmed"):
        raise HTTPException(status_code=409, detail="身份确认后才能授权 Agent 使用")
    encounter = next((
        item for item in package.get("encounters", [])
        if item.get("encounter_id") == encounter_id
    ), None)
    if encounter is None:
        raise HTTPException(status_code=404, detail=f"相遇不存在：{encounter_id}")
    encounter["privacy"] = body.privacy
    store.save_package(package)
    return package
