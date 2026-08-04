# EchoWorld 场景版本说明

## 当前入口

Hub 和咖啡厅使用两套独立的场景契约：

- `?world=hall&scene=v1`：默认进入 Hub 1.0，占位阶段只搭建市集与广场。
- `?world=hall&scene=original`：保留“木屋夜集”场景，作为回看与对照版本。
- `?world=cafe`：默认进入绘本咖啡厅，可在右上角切换三套咖啡厅场景。

界面中的 Hub 版本选择只显示“原始版本”和“1.0”。旧的咖啡厅“原始 / 木屋”选择已经移除。

## Hub 1.0

1.0 是重新构建场景的工作版本，当前采用程序化 Three.js 几何，不依赖 Blender GLB：

- 一块长条矩形地面表示市集区域。
- 一块圆形地面表示广场区域。
- 市集两侧使用基础 Box 标记摊位位置。
- 红、黄、蓝色基础几何分别标记咖啡厅入口、广场活动点和广播点。
- 人物、数据面板、移动与热点逻辑继续由现有运行时驱动，方便在占位阶段验证完整交互。

相关代码：

- `src/runtime/HubBlockout.js`：1.0 空间、占位物和交互锚点。
- `src/runtime/SceneVariants.js`：Hub 版本、渲染配置与开场镜头。
- `src/runtime/ColliderRegistry.js`：不同环境的边界与静态碰撞。
- `src/runtime/BoothSystem.js`：1.0 使用基础 Box 摊位，原始版本继续加载完整摊位资产。

## 原始版本

“原始版本”保留当前木屋夜集 Hub：

- 环境：`environment.hub-town.v1`
- 摊位：`module.market-stall.v2`
- 渲染：`hubDusk`

该版本只作为保留版本，不在本轮重构中修改。

## 咖啡厅版本

咖啡厅的三个版本共享人物、18 个座位、中央圆桌、出生点、碰撞与互动锚点，只切换环境资产与渲染配置：

| 选项 | URL | 环境资产 | 渲染配置 |
| --- | --- | --- | --- |
| 原版 | `?world=cafe&scene=original` | `environment.cafe.v1` | `current` |
| 几何 | `?world=cafe&scene=reference` | `environment.cafe.reference.v1` | `referenceLowpoly` |
| 绘本（默认） | `?world=cafe&scene=storybook` | `environment.cafe.painterly.v1` | `painterlyAdventure` |

木屋 `environment.cafe.interior.v2` 不进入本次选择器。人物仍使用当前像素角色方案。

## 版本约束

- `scene` 参数根据 `world` 分别解析：Hub 使用 `original/v1`，咖啡厅使用 `original/reference/storybook`。
- Hub 未提供或提供无效的 `scene` 时回退到 `v1`；咖啡厅回退到 `storybook`。
- 从一个世界进入另一个世界时会清理 `scene`，避免同名版本在 Hub 与咖啡厅之间串场。
- 切换 Hub 版本会刷新页面，避免环境网格、材质、灯光和碰撞缓存串场。
- 后续重构应只修改 `v1`，除非明确要求同步更新保留版本。

## 构建与验证

```bash
npm run build
```

浏览器至少验证以下地址：

```text
/?world=hall&scene=v1
/?world=hall&scene=original
/?world=cafe&scene=original
/?world=cafe&scene=reference
/?world=cafe&scene=storybook
```
