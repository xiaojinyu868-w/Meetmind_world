"""echo-snapshot.v1 世界快照的生成与校验（对应 docs/ARCHITECTURE.md §4）。

目的：世界快照是 World Service 到前端的唯一数据契约，版本号硬校验；
      前端不推断状态，快照未包含的信息前端无权知道。
输入：tick、agents、modules、events（World Service 内部状态）。
输出：build_snapshot() 生成 dict；validate_snapshot() 硬校验，失败抛 SnapshotSchemaError。
验收：tests/test_snapshot.py —— 快照含 schema/tick/agents 且通过校验。
"""

SCHEMA_VERSION = "echo-snapshot.v1"

# ARCHITECTURE.md §4 示例中的状态枚举
AGENT_STATES = ("walking", "seated", "talking", "in-meeting")


class SnapshotSchemaError(ValueError):
    """快照不符合 echo-snapshot.v1 时抛出。"""


def build_snapshot(tick: int, agents: list, modules: list, events: list) -> dict:
    snapshot = {
        "schema": SCHEMA_VERSION,
        "tick": tick,
        "agents": agents,
        "modules": modules,
        "events": events,
    }
    return validate_snapshot(snapshot)


def validate_snapshot(snapshot) -> dict:
    if not isinstance(snapshot, dict):
        raise SnapshotSchemaError("Snapshot must be an object")
    if snapshot.get("schema") != SCHEMA_VERSION:
        raise SnapshotSchemaError(f"Unsupported snapshot schema: {snapshot.get('schema')}")
    if not isinstance(snapshot.get("tick"), int) or isinstance(snapshot.get("tick"), bool):
        raise SnapshotSchemaError("Snapshot tick must be an integer")
    # events 向后兼容：缺省视为空数组（v1 旧快照没有 events 字段）
    snapshot.setdefault("events", [])
    for key in ("agents", "modules", "events"):
        if not isinstance(snapshot.get(key), list):
            raise SnapshotSchemaError(f"Snapshot {key} must be an array")
    for i, agent in enumerate(snapshot["agents"]):
        _validate_agent(agent, f"agents[{i}]")
    for i, module in enumerate(snapshot["modules"]):
        _validate_module(module, f"modules[{i}]")
    for i, event in enumerate(snapshot["events"]):
        _validate_event(event, f"events[{i}]")
    return snapshot


def _validate_event(event, field: str) -> None:
    """世界事件条目（滚动缓冲）：type 必填；agent-talk 必须带对话三要素。"""
    if not isinstance(event, dict):
        raise SnapshotSchemaError(f"Snapshot event must be an object: {field}")
    event_type = event.get("type")
    if not isinstance(event_type, str) or not event_type.strip():
        raise SnapshotSchemaError(f"Snapshot event type must be a non-empty string: {field}.type")
    if event_type == "agent-talk":
        for key in ("agent_id", "to_agent_id", "text"):
            value = event.get(key)
            if not isinstance(value, str) or not value.strip():
                raise SnapshotSchemaError(
                    f"agent-talk event requires non-empty {key}: {field}.{key}")


def _validate_position(position, field: str) -> None:
    if not isinstance(position, dict):
        raise SnapshotSchemaError(f"Snapshot position must be an object: {field}")
    for axis in ("x", "z", "yaw"):
        value = position.get(axis)
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise SnapshotSchemaError(f"Snapshot position axis must be numeric: {field}.{axis}")


def _validate_agent(agent, field: str) -> None:
    if not isinstance(agent, dict):
        raise SnapshotSchemaError(f"Snapshot agent must be an object: {field}")
    agent_id = agent.get("id")
    if not isinstance(agent_id, str) or not agent_id.strip():
        raise SnapshotSchemaError(f"Snapshot agent id must be a non-empty string: {field}.id")
    _validate_position(agent.get("position"), f"{field}.position")
    if agent.get("state") not in AGENT_STATES:
        raise SnapshotSchemaError(
            f"Snapshot agent state must be one of {AGENT_STATES}: {field}.state"
        )
    avatar = agent.get("avatar")
    if not isinstance(avatar, dict) or not isinstance(avatar.get("palette"), dict):
        raise SnapshotSchemaError(f"Snapshot agent avatar requires a palette object: {field}.avatar")


def _validate_module(module, field: str) -> None:
    if not isinstance(module, dict):
        raise SnapshotSchemaError(f"Snapshot module must be an object: {field}")
    module_id = module.get("id")
    if not isinstance(module_id, str) or not module_id.strip():
        raise SnapshotSchemaError(f"Snapshot module id must be a non-empty string: {field}.id")
    module_type = module.get("type")
    if not isinstance(module_type, str) or not module_type.strip():
        raise SnapshotSchemaError(f"Snapshot module type must be a non-empty string: {field}.type")
