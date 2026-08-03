"""Visual-pipeline handoff: attach a QA-passed CharacterAsset to a confirmed person."""

from fastapi import APIRouter, Body, HTTPException, Request

from app.packages.store import PackageNotFound
from app.schemas.character_asset import CharacterAssetSchemaError, validate_character_asset


router = APIRouter(prefix="/api/v0/packages", tags=["character-assets"])


@router.put("/{person_id}/character-asset")
def attach_character_asset(request: Request, person_id: str, body: dict = Body(...)):
    try:
        asset = validate_character_asset(body)
    except CharacterAssetSchemaError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    store = request.app.state.store
    try:
        package = store.load_package(person_id)
    except PackageNotFound as exc:
        raise HTTPException(status_code=404, detail=f"人物不存在：{person_id}") from exc
    if not package["identity"]["confirmed"]:
        raise HTTPException(status_code=409, detail="身份未确认，不能发布人物资产")

    current = (package.get("avatar") or {}).get("character_asset")
    if current:
        same_delivery = (
            current.get("character_id") == asset["character_id"]
            and current.get("revision") == asset["revision"]
            and current.get("content_hash") == asset["content_hash"]
        )
        if same_delivery:
            return {
                "person_id": person_id,
                "avatar_status": "ready",
                "character_asset": current,
            }
        if current.get("character_id") != asset["character_id"]:
            raise HTTPException(status_code=409, detail="character_id 不能在同一人物上静默替换")
        if asset["revision"] <= current.get("revision", 0):
            raise HTTPException(status_code=409, detail="CharacterAsset revision 必须单调递增")

    package = store.attach_character_asset(person_id, asset)
    for world_name in ("world", "hall"):
        world = getattr(request.app.state, world_name, None)
        if world is not None:
            world.set_character_asset(person_id, asset)

    return {
        "person_id": person_id,
        "avatar_status": "ready",
        "character_asset": package["avatar"]["character_asset"],
    }
