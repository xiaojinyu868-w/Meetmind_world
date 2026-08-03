# EchoWorld 场景多版本说明

## 版本入口

三套版本共用同一套玩法、桌位、Agent 和碰撞契约，只替换环境资产和渲染配置。人物资产现在由独立的人物方案参数决定。

| 版本 | 地址参数 | 环境 | 视觉目标 |
| --- | --- | --- | --- |
| V1 原始 | `?scene=v1` | `echo_world_lowpoly_cafe.glb` | 保留此前粉彩咖啡厅 |
| V2 几何（归档） | 前端隐藏 | `echo_world_cafe_reference-lowpoly-v2.glb` | 对齐 `examples/scence` 的硬切面微缩景观 |
| V3 绘本 | `?scene=v3` | `echo_world_storybook_cafe.glb` | 原创手绘幻想冒险氛围 |

未提供参数时默认进入 V3。界面顶部只提供 V1 与 V3；旧 `?scene=v2` 地址会规范为 V3。切换会刷新页面，避免旧场景的地面射线、NPC、灯光和材质缓存残留。人物生成方案当前只启用 `?character=voxel`，详见 [`PHOTO_CHARACTER_PIPELINES.md`](PHOTO_CHARACTER_PIPELINES.md)。

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

三个环境必须保留：

- `ROOT_Cafe`
- `GROUND_CafeFloor`
- `ANCHOR_PlayerSpawn`
- `INTERACT_CentralTable`
- `TABLE_Central6`
- `TABLE_2_01..02`
- `TABLE_4_01..02`
- 18 个原名 `SEAT_*` 节点

场地仍按 `12m x 10m` 的主要游玩范围布置，地面高度为 `0`，座高为 `0.46m`，桌高为 `0.76m`。V2 和 V3 的浏览器回导检查均达到 `18/18` 座位，最大运行时锚点误差约 `0.0003m`。

## Blender 重建

在仓库根目录执行：

```powershell
$blender = 'E:\SteamLibrary\steamapps\common\Blender\blender.exe'

& $blender --background --factory-startup --python '.\blender\build_cafe_reference-lowpoly-v2.py'
& $blender --background --factory-startup --python '.\blender\validate_cafe_reference-lowpoly-v2.py'

& $blender --background --factory-startup --python '.\blender\build_storybook_cafe.py'
& $blender --background --factory-startup --python '.\blender\validate_storybook_cafe.py'

& $blender --background --factory-startup --python '.\blender\build_character_style_variants.py'
& $blender --background --factory-startup --python '.\blender\validate_character_style_variants.py'
```

脚本会更新 `blender/` 中的源场景、`public/models/` 中的 Three.js 资产、`renders/` 中的预览图以及验证报告。

## 性能边界

V3 视觉丰富版包含 `626` 个环境 Mesh 节点，适合作为黑客松桌面展示版，但移动端正式发布前应合并同材质静态网格并实例化植物。V1 和 V2 更适合当前移动端预算。
