"""每人一岛：浮岛小世界的数据模型与 API（MeetMind「每人一岛」P0 接线）。

数据落盘：ECHO_DATA_DIR/islands/<person_id>/island.json，读时 lazy load，
写入走 临时文件 + os.replace 原子替换，单进程内 threading.Lock 串行化写。
spec 即 personal-site v6 world.json schema（2.5D 引擎直接消费），这里只做
宽松校验：必须是 dict 且含 base/avatar 键；资产 URL 约定为 "/me/" 开头的绝对路径。
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator, model_validator

from app.config import get_data_dir
from app.security.meetmind_jwt import caller_user_id

router = APIRouter(prefix="/api/v1/islands", tags=["islands-v1"])

BUILD_STATUSES = ("pending", "building", "ready", "failed")
PERSON_ID_PATTERN = r"^[A-Za-z0-9_\-]{1,80}$"


class IslandObject(BaseModel):
    """岛上的一个物件（展品/纪念物），全部字段可选，由生成管线逐步补全。"""

    id: str | None = None
    name: str | None = None
    at: tuple[float, float] | None = None
    story: str | None = None


class IslandBridge(BaseModel):
    """通往另一座岛的桥。"""

    to_person_id: str | None = None
    at: tuple[float, float] | None = None


class IslandUpsert(BaseModel):
    """POST /api/v1/islands 请求体：按 person_id upsert。"""

    person_id: str = Field(pattern=PERSON_ID_PATTERN)
    owner_id: str | None = None  # 缺省取调用者 sub
    source_group_id: str | None = None
    theme_prompt: str | None = None
    assets_base: str | None = None  # 缺省 "/me/worlds/<person_id>"
    spec: dict | None = None
    objects: list[IslandObject] = Field(default_factory=list)
    bridges: list[IslandBridge] = Field(default_factory=list)
    build_status: Literal["pending", "building", "ready", "failed"] | None = None

    @field_validator("spec")
    @classmethod
    def _spec_must_be_world(cls, value: dict | None) -> dict | None:
        if value is None:
            return value
        missing = [key for key in ("base", "avatar") if key not in value]
        if missing:
            raise ValueError(f"spec 缺少必需键：{', '.join(missing)}")
        return value


class Island(IslandUpsert):
    """落盘模型：upsert 字段 + 归属与时间戳。"""

    owner_id: str
    assets_base: str
    build_status: Literal["pending", "building", "ready", "failed"]
    created_at: str
    updated_at: str

    @model_validator(mode="before")
    @classmethod
    def _default_build_status(cls, data):
        # spec 已提供即视为建成；否则待构建
        if isinstance(data, dict) and data.get("build_status") is None:
            data["build_status"] = "ready" if data.get("spec") else "pending"
        return data


class IslandStore:
    """islands/<person_id>/island.json 的 JSON 文件持久化（lazy load + 原子写）。"""

    def __init__(self, root: Path | None = None):
        self._root = root or get_data_dir() / "islands"
        self._lock = threading.Lock()

    def _path(self, person_id: str) -> Path:
        return self._root / person_id / "island.json"

    def get(self, person_id: str) -> dict | None:
        path = self._path(person_id)
        if not path.is_file():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None

    def upsert(self, body: IslandUpsert, owner_id: str) -> dict:
        with self._lock:
            existing = self.get(body.person_id)
            now = datetime.now(timezone.utc).isoformat()
            payload = body.model_dump()
            payload["owner_id"] = payload.get("owner_id") or owner_id
            payload["assets_base"] = (
                payload.get("assets_base") or f"/me/worlds/{body.person_id}"
            )
            if payload.get("build_status") is None:
                payload["build_status"] = (
                    "ready" if payload.get("spec")
                    else (existing or {}).get("build_status", "pending")
                )
            payload["created_at"] = (existing or {}).get("created_at", now)
            payload["updated_at"] = now
            island = Island.model_validate(payload).model_dump()
            path = self._path(body.person_id)
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_name(
                f"{path.name}.{os.getpid()}.{threading.get_ident()}.tmp"
            )
            tmp.write_text(
                json.dumps(island, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            os.replace(tmp, path)
            return island

    def list_by_owner(self, owner_id: str) -> list[dict]:
        if not self._root.is_dir():
            return []
        islands = []
        for child in sorted(self._root.iterdir()):
            island = self.get(child.name)
            if island and island.get("owner_id") == owner_id:
                islands.append(island)
        return islands


def _store(request: Request) -> IslandStore:
    return request.app.state.islands


@router.post("", status_code=200)
def upsert_island(request: Request, body: IslandUpsert):
    """创建/更新一座岛（upsert by person_id）。现阶段供后台/脚本使用：要求有效 token。"""
    caller = caller_user_id(request)
    if not caller:
        raise HTTPException(status_code=401, detail="需要登录")
    return _store(request).upsert(body, owner_id=caller)


@router.get("/me")
def list_my_islands(request: Request):
    """调用者名下的岛列表。"""
    caller = caller_user_id(request)
    if not caller:
        raise HTTPException(status_code=401, detail="需要登录")
    islands = _store(request).list_by_owner(caller)
    return {"schema": "meetmind.island-list.v1", "islands": islands}


@router.get("/{person_id}")
def get_island_card(person_id: str, request: Request):
    """公开卡片信息（不含 spec 大字段）。"""
    island = _store(request).get(person_id)
    if not island:
        raise HTTPException(status_code=404, detail=f"岛不存在：{person_id}")
    return {
        "schema": "meetmind.island-card.v1",
        "person_id": island["person_id"],
        "build_status": island["build_status"],
        "source_group_id": island.get("source_group_id"),
        "assets_base": island["assets_base"],
        "object_count": len(island.get("objects") or []),
        "bridge_count": len(island.get("bridges") or []),
        "updated_at": island["updated_at"],
    }


@router.get("/{person_id}/spec")
def get_island_spec(person_id: str, request: Request):
    """岛的 spec dict（2.5D 引擎直接消费）。未建成返回 409 + 当前状态。"""
    island = _store(request).get(person_id)
    if not island:
        raise HTTPException(status_code=404, detail=f"岛不存在：{person_id}")
    if island["build_status"] != "ready":
        raise HTTPException(
            status_code=409,
            detail={
                "detail": "岛尚未建成",
                "build_status": island["build_status"],
            },
        )
    return island["spec"]
