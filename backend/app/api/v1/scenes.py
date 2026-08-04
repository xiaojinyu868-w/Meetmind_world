"""Discover versioned modules that the frontend may mount as world entrances."""

from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/v1/scenes", tags=["scenes-v1"])


@router.get("/modules")
def list_modules(request: Request):
    return {
        "schema": "meetmind.scene-module-list.v1",
        "modules": [item.model_dump() for item in request.app.state.scene_modules.list()],
    }


@router.get("/modules/{module_id}")
def get_module(module_id: str, request: Request):
    try:
        return request.app.state.scene_modules.get(module_id).model_dump()
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
