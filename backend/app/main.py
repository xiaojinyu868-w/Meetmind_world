"""FastAPI 应用装配。

目的：装配三层架构 —— World Service（状态权威）+ Agent Runtime（事件驱动）+
      HTTP API（docs/API.md 的 /api/v0/ 契约）+ /api/health。
输入：环境变量（见 app/config.py，数据目录默认 backend/data）。
输出：create_app() -> FastAPI 实例（模块级 app 供 uvicorn 引用）。
验收：tests/ 全绿；uvicorn 启动后 /api/health 与 /api/v0/world/snapshot 200。
"""

import random

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.agents.llm import get_provider
from app.agents.memory.store import MemoryStore
from app.agents.runtime import AgentRuntime, EventBus
from app.api import confirm as confirm_api
from app.api import ingest, packages, pipeline, search as search_api
from app.api import world as world_api
from app.harness.permissions.guard import DEFAULT_GUARD, PermissionDenied
from app.packages.store import PackageStore
from app.world.seed import seed_demo_packages, seed_world
from app.world.service import WorldService


def create_app() -> FastAPI:
    app = FastAPI(title="EchoWorld Backend", version="0.1.0")

    # 三层装配：Agent --事件--> EventBus --消费--> WorldService --快照--> 前端
    world_service = WorldService(seed_world())
    bus = EventBus()
    bus.subscribe(world_service.apply_event)
    store = PackageStore()  # 数据目录由 ECHO_DATA_DIR 控制，默认 backend/data
    seed_demo_packages(store)  # 6 个 demo Package（幂等），检索/资料包开箱有数据
    memory = MemoryStore(store, guard=DEFAULT_GUARD)
    app.state.world = world_service
    app.state.bus = bus
    # skill + LLM 决策的运行时；chat provider 未配置时自动退化为纯规则驱动
    app.state.runtime = AgentRuntime(
        bus, rng=random.Random(42),
        chat_provider=get_provider("chat"), memory=memory, guard=DEFAULT_GUARD,
    )
    app.state.store = store
    app.state.memory = memory

    # 自进化写入越权 → 403（ADR-4：权限失控是最大的产品风险）
    @app.exception_handler(PermissionDenied)
    async def permission_denied_handler(_request: Request, exc: PermissionDenied):
        return JSONResponse(status_code=403, content={"detail": str(exc)})

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "echoworld-backend", "version": "0.1.0"}

    # 对外契约：全部挂载在 /api/v0/ 前缀下（docs/API.md，/api/health 除外）
    app.include_router(ingest.router)
    app.include_router(pipeline.router)
    app.include_router(confirm_api.router)
    app.include_router(search_api.router)
    app.include_router(packages.router)
    app.include_router(world_api.router)
    return app


app = create_app()
