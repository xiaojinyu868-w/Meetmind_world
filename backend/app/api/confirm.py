"""IF-3 确认接口 POST /api/v0/confirm（docs/API.md，FR-1.3）。

目的：用户对「pipeline」产出的草稿做确认/修正，确认后才写入 Package ——
      一切人物数据写入都必须经过本接口（P-3：事实层只能由采集管线 + 用户确认写入）。
输入：{"encounter_draft": {...}, "identity": {"name", "match_person_id"}, "privacy"}；
      match_person_id 为 null 时新建 Person，否则并入已有。
输出：200 {"person_id", "encounter_id", "package_ref", "avatar_status"}。
验收：tests/test_api.py —— 新建与并入两条路径均可走通，Package 过校验。

长期记忆（人物事实层）写入复用 PackageStore.confirm_identity() 这一唯一入口；
avatar_status 在 person_builder 生成过模型时为 "ready"，否则 "placeholder"。
"""

import copy
import time
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.packages.store import PackageNotFound
from app.pipeline.person_builder import _default_palette_for
from app.schemas.package_schema import (
    DEFAULT_PRIVACY,
    PRIVACY_LEVELS,
    PackageSchemaError,
    validate_encounter_draft,
)

router = APIRouter(prefix="/api/v0", tags=["confirm"])


class ConfirmIdentity(BaseModel):
    name: str | None = None
    match_person_id: str | None = None  # null=新建 Person，否则并入已有


class ConfirmRequest(BaseModel):
    encounter_draft: dict
    identity: ConfirmIdentity
    privacy: str = DEFAULT_PRIVACY


@router.post("/confirm")
def confirm(request: Request, body: ConfirmRequest):
    store = request.app.state.store
    if body.privacy not in PRIVACY_LEVELS:
        raise HTTPException(status_code=400,
                            detail=f"privacy 必须是 {list(PRIVACY_LEVELS)} 之一")

    # 草稿入库前强制回到未确认语义做校验（confirmed 只能由服务端确认流程置真）
    draft = copy.deepcopy(body.encounter_draft)
    draft["privacy"] = body.privacy
    identity_block = dict(draft.get("identity") or {})
    identity_block["confirmed"] = False
    draft["identity"] = identity_block
    try:
        validate_encounter_draft(draft)
    except PackageSchemaError as exc:
        raise HTTPException(status_code=422, detail=f"encounter_draft 不符合 echo-package.v0：{exc}")

    # match_person_id 为 null 时新建 Person，否则并入已有
    if body.identity.match_person_id:
        person_id = body.identity.match_person_id
        try:
            package = store.load_package(person_id)
        except PackageNotFound:
            raise HTTPException(status_code=404, detail=f"人物不存在：{person_id}")
    else:
        person_id = f"person_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        package = store.create_draft_package(person_id, _default_palette_for(person_id))

    encounter = {key: value for key, value in draft.items() if key != "identity"}
    package["encounters"].append(encounter)
    photos = (encounter.get("facts") or {}).get("photos") or []
    if photos and not package["identity"].get("face_ref"):
        # 资料包内保留真实人脸指针（P-6）
        package["identity"]["face_ref"] = photos[0]
    store.save_package(package)

    # 用户确认 = 长期记忆唯一写入入口（FR-1.3，权限矩阵）
    package = store.confirm_identity(person_id, name=body.identity.name)
    avatar_status = "ready" if package["avatar"].get("model_ref") else "placeholder"
    return {
        "person_id": person_id,
        "encounter_id": encounter["encounter_id"],
        "package_ref": f"people/{person_id}/profile.json",
        "avatar_status": avatar_status,
    }
