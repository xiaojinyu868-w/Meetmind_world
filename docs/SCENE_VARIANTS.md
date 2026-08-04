# EchoWorld 场景多版本说明

## 版本入口

各版本共用同一套玩法、桌位、Agent 和碰撞契约，只替换环境资产和渲染配置。人物资产现在由独立的人物方案参数决定。

| 版本 | 地址参数 | 环境 | 视觉目标 |
| --- | --- | --- | --- |
| V1 原始 | `?scene=v1` | `echo_world_lowpoly_cafe.glb` | 保留此前粉彩咖啡厅 |
| V2 几何（归档） | 前端隐藏 | `echo_world_cafe_reference-lowpoly-v2.glb` | 对齐 `examples/scence` 的硬切面微缩景观 |
| V3 绘本（归档） | 前端隐藏 | `echo_world_storybook_cafe.glb` | 原创手绘幻想冒险氛围 |
| V4 木屋（默认） | `?scene=v4` | `echo_world_cafe_interior_v2.glb` | 参考 643e66a9 的木质咖啡厅：北墙吧台、中央六人圆桌、双人/四人桌、沙发区、黄昏暖灯 |

未提供参数时默认进入 V4。界面顶部提供 V1 与 V4；旧 `?scene=v2/v3` 地址会规范为默认版。切换会刷新页面，避免旧场景的地面射线、NPC、灯光和材质缓存残留。人物生成方案当前只启用 `?character=voxel`，详见 [`PHOTO_CHARACTER_PIPELINES.md`](PHOTO_CHARACTER_PIPELINES.md)。

## 小镇 Hub 环境（hall 世界，2026-08-04 起）

大厅（`?world=hall`，默认）自 2026-08-04 起使用箱庭夜集市 `echo_world_hub_town.glb`（`blender/build_hub_town.py`，布局参考 `docs/84a074ecf6a20c847a41b64a0cdb7d9b.png`）：入口木门（北）→ 市集街道（两侧摊位垫）→ 篝火广场（中央篝火 + 5 木凳，联机入口）→ 咖啡厅外观（西侧，模块追加自 `build_cafe_exterior.py`）→ 花园/小河（南侧，汀步 + 木桥）。视觉为黄昏夜集（VisualProfiles `hubDusk`）：深蓝夜空 + 暖点光（篝火/串灯/门灯）。
配套资产：摊位 `module.market-stall.v2`（旅行商人推车，`build_market_stall_v2.py`，每摊位按 personId 稳定配色变体）、咖啡厅外观 `venue.cafe-exterior.v1`。
旧 `environment.market-street.v1`（`build_market_street.py`）保留在库，不再被引用。

## 视觉策略

### V2 几何 Low-poly

- 三角块面草地和硬边轮廓，不依赖圆角盒体表达低多边形。
- 草绿、芥黄、木色和深绿组成有限色板。
- 单一暖色主光形成清楚的长阴影，辅以较弱天光。
- 家具、植物、发型和服装均使用低边数切面。
- 环境为 `3,157` 三角面，人物为 `440` 三角面。

### V3 绘本冒险

- 开放木梁、拱形入口、室内树、藤蔓、草坡和手绘式光斑组成更具叙事性的空间。
- Blender 环境材质以 PBR 色块导出，Three.js 保留这些底色；人物在浏览器中使用四级 Toon 明暗。
- 人物增加围巾、披肩、束腰和深色结构边，头部仍没有眼、鼻、嘴等五官。
- 环境为 `17,786` 三角面，人物为 `794` 三角面。

Blender 可以实现这类效果，但 Freestyle、Grease Pencil、Shader to RGB 和合成器效果不会随 GLB 自动进入 Three.js。因此本项目把可移植的颜色、几何和结构边固化到 GLB，在 Three.js 中重建色调映射和人物 Toon 光照。V3 是原创视觉方案，不包含或复刻商业游戏、动画的模型、贴图或角色资产。

## 玩法空间契约

所有咖啡厅室内版本（含 V4 木屋）必须保留：

- `ROOT_Cafe`
- `GROUND_CafeFloor`
- `ANCHOR_PlayerSpawn`
- `INTERACT_CentralTable`
- `TABLE_Central6`
- `TABLE_2_01..02`
- `TABLE_4_01..02`
- 18 个原名 `SEAT_*` 节点

场地仍按 `12m x 10m` 的主要游玩范围布置，地面高度为 `0`，座高为 `0.46m`，桌高为 `0.76m`。V4 的回导检查（`blender/validate_cafe_interior_v2.py`）为 18/18 座位、误差 0.0000m；Hub 环境校验见 `blender/validate_hub_town.py`。

## Blender 重建

在仓库根目录执行（本机 Blender 位于 `blender-4.5.12-linux-x64/blender`）：

```bash
./blender-4.5.12-linux-x64/blender --background --factory-startup --python blender/build_hub_town.py
./blender-4.5.12-linux-x64/blender --background --factory-startup --python blender/validate_hub_town.py

./blender-4.5.12-linux-x64/blender --background --factory-startup --python blender/build_cafe_exterior.py
./blender-4.5.12-linux-x64/blender --background --factory-startup --python blender/build_cafe_interior_v2.py
./blender-4.5.12-linux-x64/blender --background --factory-startup --python blender/validate_cafe_interior_v2.py

./blender-4.5.12-linux-x64/blender --background --factory-startup --python blender/build_market_stall_v2.py
./blender-4.5.12-linux-x64/blender --background --factory-startup --python blender/validate_market_stall_v2.py
```

注意：`build_hub_town.py` 依赖 `blender/echo_world_cafe_exterior.blend`，需先运行 `build_cafe_exterior.py`。脚本会更新 `blender/` 中的源场景、`public/models/` 中的 Three.js 资产、`renders/` 中的预览图以及验证报告。

## 性能边界

V3 视觉丰富版包含 `626` 个环境 Mesh 节点，适合作为黑客松桌面展示版，但移动端正式发布前应合并同材质静态网格并实例化植物。V1 和 V2 更适合当前移动端预算。V4 室内约 1.1 万三角面（0.97MB）；Hub 小镇为户外大场景，预算 10 万三角面 / 10MB（实际见验证报告）。

## 变更记录

- 2026-08-04 | V4 木屋室内（643e66a9 参考，契约零改动）成为默认；V2/V3 归档；大厅切换为小镇 Hub 夜集市环境（84a074 布局）+ hubDusk 视觉 + 摊位 v2 配色变体 | AI
