"""Thread-safe registry for versioned Skill definitions."""

from __future__ import annotations

from threading import RLock
from pathlib import Path

import yaml

from app.skills.models import SkillDefinition


def _version_key(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split("."))


class SkillRegistry:
    def __init__(self) -> None:
        self._lock = RLock()
        self._skills: dict[tuple[str, str], SkillDefinition] = {}

    def register(
        self, definition: SkillDefinition, *, replace: bool = False
    ) -> SkillDefinition:
        if not isinstance(definition, SkillDefinition):
            raise TypeError("SkillRegistry accepts SkillDefinition values only")
        key = (definition.name, definition.version)
        with self._lock:
            if key in self._skills and not replace:
                raise ValueError(f"skill already registered: {definition.skill_id}")
            self._skills[key] = definition
        return definition

    def get(self, name: str, version: str | None = None) -> SkillDefinition:
        with self._lock:
            if version is not None:
                try:
                    return self._skills[(name, version)]
                except KeyError as exc:
                    raise KeyError(f"unknown skill: {name}@{version}") from exc
            candidates = [
                skill for (skill_name, _), skill in self._skills.items() if skill_name == name
            ]
            if not candidates:
                raise KeyError(f"unknown skill: {name}")
            return max(candidates, key=lambda item: _version_key(item.version))

    def list(self) -> tuple[SkillDefinition, ...]:
        with self._lock:
            return tuple(
                sorted(
                    self._skills.values(),
                    key=lambda item: (item.name, _version_key(item.version)),
                )
            )

    def unregister(self, name: str, version: str) -> bool:
        with self._lock:
            return self._skills.pop((name, version), None) is not None

    def load_directory(self, directory: Path) -> tuple[SkillDefinition, ...]:
        loaded = []
        for path in sorted(Path(directory).glob("*.yaml")):
            raw = yaml.safe_load(path.read_text(encoding="utf-8"))
            definition = SkillDefinition.model_validate(raw)
            self.register(definition)
            loaded.append(definition)
        return tuple(loaded)
