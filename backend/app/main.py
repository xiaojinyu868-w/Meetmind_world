"""FastAPI 应用装配。

目的：装配三层架构 —— World Service（状态权威）+ Agent Runtime（事件驱动）+
      HTTP API（docs/API.md 的 /api/v0/ 契约）+ /api/health。
输入：环境变量（见 app/config.py，数据目录默认 backend/data）。
输出：create_app() -> FastAPI 实例（模块级 app 供 uvicorn 引用）。
验收：tests/ 全绿；uvicorn 启动后 /api/health 与 /api/v0/world/snapshot 200。
"""

import random
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.agents.hall_runtime import HallRuntime
from app.agents.llm import get_provider
from app.agents.memory.store import MemoryStore
from app.agents.runtime import AgentRuntime, EventBus
from app.agents.roles import (
    BulletinComposerAgent,
    IcebreakerHostAgent,
    RoundtableFacilitatorAgent,
)
from app.agents.contracts import PrivacyLevel
from app.agents.runtime_v2 import AgentCoordinator, AgentRouter, ContextBuilder
from app.agents.tools import EventSummaryTool, MemoryQueryTool, ToolRegistry
from app.application import CommandValidator
from app.api import confirm as confirm_api
from app.api import admin, experience, group, ingest, media, packages, pipeline, search as search_api
from app.api import world as world_api
from app.group.service import GroupSessionService
from app.api.v1 import rooms as rooms_v1_api
from app.api.v1 import workflows as workflows_v1_api
from app.api.v1 import scenes as scenes_v1_api
from app.config import get_data_dir, get_world_heartbeat_seconds
from app.domain.rooms import RoomService
from app.domain.scenes import SceneModuleRegistry, default_scene_modules
from app.eventing import EventDispatcher, InMemoryOutbox
from app.harness.permissions.guard import DEFAULT_GUARD, PermissionDenied
from app.packages.store import PackageStore
from app.pipelines.field_generation import FieldGenerationService
from app.pipelines.group_onboarding import GroupOnboardingService
from app.pipelines.icebreaker_feedback import IcebreakerFeedbackService
from app.persistence import SQLiteEventStore, SQLiteRoomRepository
from app.security import PolicyEngine
from app.skills import SkillRegistry
from app.world.hall import HALL_BOUNDS, build_display_from_package
from app.world.scheduler import WorldScheduler
from app.world.seed import SEED_AGENTS, seed_demo_packages, seed_world
from app.world.service import WorldService
from app.world.event_store import WorldEventStore


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        await application.state.world_scheduler.start()
        try:
            yield
        finally:
            await application.state.world_scheduler.stop()
            application.state.event_store.close()
            application.state.room_repository.close()

    app = FastAPI(title="EchoWorld Backend", version="0.2.0", lifespan=lifespan)

    # 三层装配：Agent --事件--> EventBus --消费--> WorldService --快照--> 前端
    world_service = WorldService(seed_world())
    bus = EventBus()
    bus.subscribe(world_service.apply_event)
    store = PackageStore()  # 数据目录由 ECHO_DATA_DIR 控制，默认 backend/data
    seed_demo_packages(store)  # 6 个 demo Package（幂等），检索/资料包开箱有数据
    memory = MemoryStore(store, guard=DEFAULT_GUARD)

    # 展位大厅（MVP1.5 两级世界）：静态陈列实例 + 稀疏串门调度器；
    # 启动时先按固定顺序恢复 seed 6 人，再从持久化 Package 追加真实新人。
    # 这样既保持演示展位坐标稳定，也保证服务重启后 confirm 产生的展位不丢失。
    hall_world = WorldService({
        "agents": [],
        "modules": [{"id": "expo-hall", "type": "hall",
                     "position": {"x": 0.0, "z": 0.0, "yaw": 0.0}}],
    }, blockers=(), bounds=HALL_BOUNDS)  # 展位不是阻挡体；大厅边界 x∈[-7,7] z∈[-5,5]
    registered_people = set()
    for agent_seed in SEED_AGENTS:
        person_id = agent_seed["id"]
        package = store.load_package(person_id)
        hall_world.register_person(person_id, build_display_from_package(package, store))
        registered_people.add(person_id)
    for summary in store.list_packages():
        person_id = summary["person_id"]
        if person_id in registered_people or not summary["confirmed"]:
            continue
        package = store.load_package(person_id)
        hall_world.register_person(person_id, build_display_from_package(package, store))
    hall_bus = EventBus()
    hall_bus.subscribe(hall_world.apply_event)

    app.state.world = world_service
    app.state.hall = hall_world
    app.state.bus = bus
    # skill + LLM 决策的运行时；chat provider 未配置时自动退化为纯规则驱动
    app.state.runtime = AgentRuntime(
        bus, rng=random.Random(42),
        chat_provider=get_provider("chat"), memory=memory, guard=DEFAULT_GUARD,
    )
    # 大厅串门调度器：有目的的稀疏活动（共同 tags/relations 驱动，默认 1/8 概率）
    app.state.hall_runtime = HallRuntime(
        hall_bus, rng=random.Random(7),
        chat_provider=get_provider("chat"), memory=memory, guard=DEFAULT_GUARD,
    )
    app.state.store = store
    app.state.memory = memory
    app.state.group_sessions = GroupSessionService(store)
    app.state.world_events = WorldEventStore(store.root / "world-events.v1.jsonl")

    # MVP2 typed runtime infrastructure. The local adapters are intentionally
    # dependency-free; PostgreSQL/Redis implementations can replace these ports.
    runtime_db = get_data_dir() / "runtime" / "mvp2.sqlite3"
    app.state.event_store = SQLiteEventStore(runtime_db)
    app.state.room_repository = SQLiteRoomRepository(runtime_db)
    app.state.event_dispatcher = EventDispatcher()
    app.state.outbox = InMemoryOutbox()
    app.state.policy = PolicyEngine()
    app.state.icebreaker_feedback = IcebreakerFeedbackService(store)
    app.state.room_service = RoomService(
        icebreaker_feedback=app.state.icebreaker_feedback,
        auto_bulletin=False,
        event_store=app.state.event_store,
        state_repository=app.state.room_repository,
    )
    context_builder = ContextBuilder(
        world_provider=lambda _agent, _event: world_service.snapshot(),
        room_provider=lambda _agent, event: app.state.room_service.snapshot(event.room_id),
        privacy_resolver=lambda _agent, _event: {
            PrivacyLevel.PUBLIC, PrivacyLevel.ROOM,
        },
        targets_provider=lambda _agent, event: {
            member["member_id"]
            for member in app.state.room_service.snapshot(event.room_id)["members"]
        },
    )
    app.state.agent_router = AgentRouter(context_builder)
    app.state.agent_router.register(RoundtableFacilitatorAgent())
    app.state.agent_router.register(IcebreakerHostAgent())
    app.state.agent_router.register(BulletinComposerAgent())
    app.state.command_validator = CommandValidator(app.state.policy)
    app.state.tool_registry = ToolRegistry()
    app.state.tool_registry.register(MemoryQueryTool(memory))
    app.state.tool_registry.register(EventSummaryTool())
    app.state.skill_registry = SkillRegistry()
    app.state.skill_registry.load_directory(
        Path(__file__).resolve().parent / "skills" / "definitions"
    )
    app.state.agent_coordinator = AgentCoordinator(
        app.state.agent_router,
        context_builder,
        app.state.command_validator,
        lambda command: app.state.room_service.execute(
            command.room_id,
            command_id=command.command_id,
            actor_id=command.actor_id,
            command_type=command.type,
            payload=command.payload,
            expected_revision=command.expected_revision,
        ),
    )
    app.state.group_onboarding = GroupOnboardingService(store, hall=hall_world)
    app.state.field_generation = FieldGenerationService(store)
    app.state.scene_modules = SceneModuleRegistry(default_scene_modules())
    app.state.world_scheduler = WorldScheduler(
        app, interval_seconds=get_world_heartbeat_seconds()
    )

    # 自进化写入越权 → 403（ADR-4：权限失控是最大的产品风险）
    @app.exception_handler(PermissionDenied)
    async def permission_denied_handler(_request: Request, exc: PermissionDenied):
        return JSONResponse(status_code=403, content={"detail": str(exc)})

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "echoworld-backend", "version": "0.2.0"}

    # 对外契约：全部挂载在 /api/v0/ 前缀下（docs/API.md，/api/health 除外）
    app.include_router(ingest.router)
    app.include_router(pipeline.router)
    app.include_router(confirm_api.router)
    app.include_router(search_api.router)
    app.include_router(packages.router)
    app.include_router(world_api.router)
    app.include_router(media.router)
    app.include_router(admin.router)
    # v0 现场房间与场景体验（codex 线，服务当前前端；v1 rooms 成熟后迁移）
    app.include_router(group.router)
    app.include_router(experience.router)
    # v1 类型化房间/工作流/场景模块契约（agent 线，见 docs/MVP2-BACKEND.md）
    app.include_router(rooms_v1_api.router)
    app.include_router(workflows_v1_api.router)
    app.include_router(scenes_v1_api.router)
    return app


app = create_app()
