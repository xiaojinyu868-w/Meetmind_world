"""最小化生理聚合视图；不返回原始 Ring 样本。"""

from fastapi import APIRouter, HTTPException, Request

from app.packages.store import PackageNotFound
from app.signals import PersonSignalProjector

router = APIRouter(prefix="/api/v0/people", tags=["signals"])


@router.get("/{person_id}/signal")
def get_person_signal(request: Request, person_id: str):
    try:
        package = request.app.state.store.load_package(person_id)
    except PackageNotFound:
        raise HTTPException(status_code=404, detail=f"人物不存在：{person_id}")
    signal = PersonSignalProjector(request.app.state.store).load(package)
    if signal is None:
        raise HTTPException(status_code=404, detail=f"人物暂无生理聚合：{person_id}")
    return signal
