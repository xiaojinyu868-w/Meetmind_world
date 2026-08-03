"""把上下文量能表计算成服务端权威的功能开关快照。

规则来源：docs/CONTEXT-AND-MEMORY.md §8。Package 数量只统计已确认身份；
推断覆盖率统计其中至少有一条可追溯推断的人物比例。现场人数由群体房间服务
以可信上下文传入，本模块不处理合照、人脸、贴图、音频或视频。
"""

import json
from pathlib import Path


CONFIG_SCHEMA = "echo-capability-config.v1"
SNAPSHOT_SCHEMA = "echo-capabilities.v1"
ROLLOUT_STATES = {"enabled", "deferred", "future"}
RULE_KEYS = {
    "min_packages",
    "min_inference_coverage",
    "high_inference_coverage",
    "min_group_participants",
    "multi_user",
    "owner_confirmation",
}


class CapabilityConfigError(ValueError):
    """功能开关配置不符合版本化契约。"""


class CapabilityService:
    """根据当前 Package 存储与可信运行上下文计算能力开关。"""

    def __init__(self, store, config_path: Path | None = None):
        self.store = store
        path = config_path or Path(__file__).with_name("flags.v1.json")
        self.config = self._load_config(path)
        self._definitions = {item["id"]: item for item in self.config["flags"]}

    @staticmethod
    def _load_config(path: Path) -> dict:
        try:
            config = json.loads(Path(path).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise CapabilityConfigError(f"功能开关配置无法读取：{path}") from exc
        if config.get("schema") != CONFIG_SCHEMA:
            raise CapabilityConfigError(f"不支持的功能开关配置：{config.get('schema')}")
        threshold = config.get("high_inference_coverage")
        if not isinstance(threshold, (int, float)) or isinstance(threshold, bool):
            raise CapabilityConfigError("high_inference_coverage 必须是 0-1 数字")
        if not 0 <= threshold <= 1:
            raise CapabilityConfigError("high_inference_coverage 必须位于 0-1")
        flags = config.get("flags")
        if not isinstance(flags, list) or not flags:
            raise CapabilityConfigError("flags 必须是非空数组")
        seen = set()
        for item in flags:
            if not isinstance(item, dict) or not isinstance(item.get("id"), str):
                raise CapabilityConfigError("每个 flag 必须包含字符串 id")
            if item["id"] in seen:
                raise CapabilityConfigError(f"功能开关 id 重复：{item['id']}")
            seen.add(item["id"])
            if item.get("rollout") not in ROLLOUT_STATES:
                raise CapabilityConfigError(f"未知 rollout：{item.get('rollout')}")
            requires = item.get("requires", {})
            if not isinstance(requires, dict) or set(requires) - RULE_KEYS:
                raise CapabilityConfigError(f"功能开关规则不受支持：{item['id']}")
            for key in ("min_packages", "min_group_participants"):
                value = requires.get(key, 0)
                if not isinstance(value, int) or isinstance(value, bool) or value < 0:
                    raise CapabilityConfigError(f"{item['id']}.{key} 必须是非负整数")
            coverage = requires.get("min_inference_coverage", 0)
            if (not isinstance(coverage, (int, float)) or isinstance(coverage, bool)
                    or not 0 <= coverage <= 1):
                raise CapabilityConfigError(
                    f"{item['id']}.min_inference_coverage 必须位于 0-1"
                )
            for key in ("high_inference_coverage", "multi_user", "owner_confirmation"):
                if key in requires and not isinstance(requires[key], bool):
                    raise CapabilityConfigError(f"{item['id']}.{key} 必须是布尔值")
        return config

    @staticmethod
    def _package_has_inference(package: dict, persisted: dict) -> bool:
        if persisted:
            return True
        return any(
            encounter.get("inferences")
            for encounter in package.get("encounters", [])
            if isinstance(encounter, dict)
        )

    def _metrics(self, group_participants: int, multi_user: bool,
                 owner_confirmation: bool) -> dict:
        summaries = self.store.list_packages()
        confirmed_ids = [item["person_id"] for item in summaries if item.get("confirmed")]
        covered = 0
        for person_id in confirmed_ids:
            package = self.store.load_package(person_id)
            persisted = self.store.read_inferences(person_id)
            if self._package_has_inference(package, persisted):
                covered += 1
        count = len(confirmed_ids)
        coverage = covered / count if count else 0.0
        return {
            "total_package_count": len(summaries),
            "confirmed_package_count": count,
            "inferred_package_count": covered,
            "inference_coverage": round(coverage, 3),
            "high_inference_coverage": self.config["high_inference_coverage"],
            "group_participant_count": max(0, int(group_participants)),
            "multi_user_enabled": bool(multi_user),
            "owner_confirmation_enabled": bool(owner_confirmation),
        }

    @staticmethod
    def _unmet_requirements(requires: dict, metrics: dict) -> list[str]:
        unmet = []
        if metrics["confirmed_package_count"] < requires.get("min_packages", 0):
            unmet.append("package-count")
        if metrics["inference_coverage"] < requires.get("min_inference_coverage", 0):
            unmet.append("inference-coverage")
        if (requires.get("high_inference_coverage")
                and metrics["inference_coverage"] < metrics["high_inference_coverage"]
                and "inference-coverage" not in unmet):
            unmet.append("inference-coverage")
        if metrics["group_participant_count"] < requires.get("min_group_participants", 0):
            unmet.append("group-participants")
        if requires.get("multi_user") and not metrics["multi_user_enabled"]:
            unmet.append("multi-user")
        if requires.get("owner_confirmation") and not metrics["owner_confirmation_enabled"]:
            unmet.append("owner-confirmation")
        return unmet

    @staticmethod
    def _reason(status: str, unmet: list[str]) -> str | None:
        if status == "enabled":
            return None
        if status == "deferred":
            return "能力已暂缓，MVP2 验收后重新评审"
        if status == "future":
            return "能力属于多用户后续阶段"
        labels = {
            "package-count": "已确认 Package 数量不足",
            "inference-coverage": "推断层覆盖率不足",
            "group-participants": "现场已建档参与者不足 5 人",
            "multi-user": "多用户能力尚未上线",
            "owner-confirmation": "本人确认流程尚未上线",
        }
        return "；".join(labels[item] for item in unmet)

    def snapshot(self, *, group_participants: int = 0, multi_user: bool = False,
                 owner_confirmation: bool = False) -> dict:
        """返回无敏感上下文的 echo-capabilities.v1 能力快照。"""
        metrics = self._metrics(group_participants, multi_user, owner_confirmation)
        capabilities = {}
        for capability_id, definition in self._definitions.items():
            unmet = self._unmet_requirements(definition.get("requires", {}), metrics)
            rollout = definition["rollout"]
            eligible = not unmet
            status = "enabled" if rollout == "enabled" and eligible else (
                rollout if rollout != "enabled" else "locked"
            )
            capabilities[capability_id] = {
                "enabled": status == "enabled",
                "eligible": eligible,
                "status": status,
                "label": definition["label"],
                "scope": definition["scope"],
                "requires": dict(definition.get("requires", {})),
                "unmet": unmet,
                "reason": self._reason(status, unmet),
            }
        return {
            "schema": SNAPSHOT_SCHEMA,
            "metrics": metrics,
            "capabilities": capabilities,
        }

    def enabled(self, capability_id: str, **context) -> bool:
        """供后端业务调度器调用；未知能力默认拒绝，避免误开。"""
        if capability_id not in self._definitions:
            return False
        return self.snapshot(**context)["capabilities"][capability_id]["enabled"]
