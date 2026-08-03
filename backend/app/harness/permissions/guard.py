"""自进化权限校验器：harness 写入请求 → 检查目标在允许清单内，违反抛 PermissionDenied。

目的：落实 docs/ARCHITECTURE.md §5 的自进化权限矩阵（ADR-4：自进化只能改"状态"，
      不能改"规则"）。所有自进化写数据的路径必须先过 guard.check()。
输入：permissions.yaml（allow/deny 清单）；写入目标字符串（如 "agent.position"）。
输出：check() 通过返回 True；违反抛 PermissionDenied。
验收：tests/test_permissions.py —— 允许项放行、长期记忆/工具实现/权限本身被拒绝。
"""

from pathlib import Path

import yaml

CONFIG_PATH = Path(__file__).resolve().parent / "permissions.yaml"


class PermissionDenied(PermissionError):
    """写入目标不在自进化允许清单内时抛出。"""


def _matches(entry: str, target: str) -> bool:
    """精确匹配或前缀匹配（"tool.implementation" 覆盖 "tool.implementation.x"）。"""
    return target == entry or target.startswith(entry + ".")


class PermissionGuard:
    """默认拒绝：目标必须命中 allow 且不命中 deny 才放行。"""

    def __init__(self, config_path: Path | None = None):
        path = Path(config_path) if config_path else CONFIG_PATH
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        self.allow = list(raw.get("allow") or [])
        self.deny = list(raw.get("deny") or [])
        runtime_events = raw.get("runtime_events") or {}
        self.allowed_events = list(runtime_events.get("allow") or [])

    def is_allowed(self, target: str) -> bool:
        if any(_matches(entry, target) for entry in self.deny):
            return False
        return any(_matches(entry, target) for entry in self.allow)

    def check(self, target: str) -> bool:
        if not self.is_allowed(target):
            raise PermissionDenied(
                f"自进化写入被拒绝：目标 '{target}' 不在允许清单内（见 harness/permissions/permissions.yaml）"
            )
        return True

    def is_event_allowed(self, event_type: str) -> bool:
        """runtime 事件白名单（LLM 决策输出与规则事件都过此闸）。"""
        return any(_matches(entry, event_type) for entry in self.allowed_events)

    def check_event(self, event_type: str) -> bool:
        if not self.is_event_allowed(event_type):
            raise PermissionDenied(
                f"Agent 事件被拒绝：类型 '{event_type}' 不在 runtime 事件白名单内"
            )
        return True


# 模块级默认实例：permissions.yaml 随仓库分发，加载失败应在启动时暴露
DEFAULT_GUARD = PermissionGuard()
