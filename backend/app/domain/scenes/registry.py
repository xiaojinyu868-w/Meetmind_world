"""Static scene-module registry; modules never execute arbitrary code."""

from app.domain.scenes.models import SceneModuleDefinition


def default_scene_modules() -> tuple[SceneModuleDefinition, ...]:
    return (
        SceneModuleDefinition(
            module_id="market-street", module_type="environment", label="市集街道",
            entry_action="scene.enter", capabilities=("walk", "visit-booth"),
            asset_id="environment.expo-hall.v1",
        ),
        SceneModuleDefinition(
            module_id="person-booth", module_type="booth", label="人物摊位",
            entry_action="booth.open", capabilities=("photo", "audio", "project", "work"),
            asset_id="module.booth-template.v1",
        ),
        SceneModuleDefinition(
            module_id="cafe-house", module_type="interior", label="关系咖啡厅",
            entry_action="scene.enter", capabilities=("hotspot", "roundtable", "memory"),
            asset_id="environment.cafe.v1",
        ),
        SceneModuleDefinition(
            module_id="relationship-field", module_type="field", label="个人场域",
            entry_action="field.enter", capabilities=("shared-memory", "impression-wall"),
        ),
    )


class SceneModuleRegistry:
    def __init__(self, modules=()):
        self._modules = {}
        for module in modules:
            self.register(module)

    def register(self, module: SceneModuleDefinition) -> None:
        if module.module_id in self._modules:
            raise ValueError(f"scene module already registered: {module.module_id}")
        self._modules[module.module_id] = module

    def get(self, module_id: str) -> SceneModuleDefinition:
        try:
            return self._modules[module_id]
        except KeyError as exc:
            raise KeyError(f"unknown scene module: {module_id}") from exc

    def list(self) -> tuple[SceneModuleDefinition, ...]:
        return tuple(self._modules[key] for key in sorted(self._modules))
