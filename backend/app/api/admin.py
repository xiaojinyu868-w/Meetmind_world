"""管理端点：事实层完整性自检（1.D.3）。

目的：GET /api/v0/admin/integrity 返回 facts/ 全量（或 ?person_id= 单人）的
      manifest sha256 复核报告 —— 事实层零损耗的机器证据（NFR-1.1）。
输入：query 参数 person_id（可选）。
输出：{"ok", "checked", "corrupted": [...], "unregistered": [...]}。
验收：tests/test_integrity.py —— 篡改一个事实字节后报告损坏。

安全注记：单用户 MVP 不做鉴权（与 /api/health 同级）；多用户/公网部署时
必须加访问控制或仅内网暴露（P-8）。
"""

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v0/admin", tags=["admin"])


@router.get("/integrity")
def facts_integrity(request: Request, person_id: str | None = None):
    return request.app.state.store.verify_facts_integrity(person_id)
