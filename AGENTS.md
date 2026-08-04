# AGENTS.md

面向 AI 编码代理的项目说明。阅读本文件即可了解 EchoWorld 前端的结构、命令与约定。

## 项目概述

EchoWorld Three.js 咖啡厅原型（包名 `echoworld-lowpoly-walk`）：一个纯前端的三维"关系咖啡厅"演示。玩家在 3D 咖啡厅中用 `W/A/S/D`（桌面）或虚拟摇杆（触屏）走动，观察 6 个 NPC Agent 在普通桌随机入座、同桌交谈；可以点选人物查看资料、靠近中央六人圆桌发起会议、并切换到关系 Map 视图。

体验闭环：标题页 → 3D Echo Cafe → Agent 自主交谈 → 点选人物看资料 → 圆桌会议 → 关系 Map → 从节点返回咖啡厅定位人物。

- 前端为静态站点（Vite 构建）；世界动态由 `backend/`（FastAPI）的世界快照驱动，LiveWorld 轮询 `/api/v0/world/snapshot`，后端不可用时自动降级本地 mock/内置快照（见"数据流"节）。
- UI 语言为简体中文（`index.html` 为 `lang="zh-CN"`），文档与界面文案使用中文。
- 场景：1 个玩家 + 6 个占位人物。人物形象方向（2026-08-03，PRD P-6）为 MC 体素 + AI 生成图片贴图；当前启用 voxel 方案（固定体素身体 + 照片特征贴图），无脸 GLB（`character.faceless-prototype.v1`）仅作历史占位；暂无骨骼动画，移动/入座为刚性模型的轻量表现。
- 中央六人圆桌只接受用户发起的会议邀请，普通 Agent 调度不会占用它。

## 技术栈

- **Three.js `^0.185.1`**：WebGL 渲染，`GLTFLoader` 加载 GLB，`SkeletonUtils.clone` 克隆人物。
- **Vite `^8.2.0`**（devDependency，基于 rolldown）：开发服务器与构建。
- **lucide `^1.28.0`**：UI 图标（`createIcons`）。
- 原生 ES Module JavaScript（`"type": "module"`），无框架、无 TypeScript、无 JSX。

## 构建与运行命令

```bash
npm install
npm run dev       # vite --host 0.0.0.0 --port 5173 --strictPort，打开 http://127.0.0.1:5173/
npm run build     # 输出到 dist/
npm run preview   # 预览生产构建，--host 0.0.0.0
```

- 没有配置 lint、格式化或类型检查工具。
- **没有测试**：`package.json` 中没有 test 脚本，也没有 vitest/jest/playwright 依赖。验证方式为 `npm run build` 成功 + 浏览器手动走查体验闭环。
- `dist/` 已提交进 Git（构建产物随仓库分发）。修改源码后如需更新分发产物，重新 `npm run build` 并提交 `dist/`。

## 目录结构

```
index.html                  入口页面（#world canvas、#ui-root、加载层、虚拟摇杆、fatal-error）
src/main.js                 应用装配：Three.js 场景/灯光/阴影、第三人称相机、WASD+触屏移动、
                            圆形桌面碰撞（TABLE_BLOCKERS）、射线选择、会议编排（约 800 行）
src/data/demoPeople.js      mock 数据：currentUser、6 个 NPC（含 palette 调色板、资料、关系图坐标）、relationships
src/runtime/
  WorldSpec.js              world-spec.json 的加载与 schema 校验（echo-world.v1）、publicUrl() 处理 BASE_URL
  AssetCatalog.js           asset-catalog.json 白名单加载与校验（echo-assets.v1）
  AssetStore.js             GLTF 场景与 JSON 的 Promise 缓存
  CafeLayout.js             咖啡厅边界、5 张桌、18 个 Blender 座位锚点（全部 Object.freeze）
  CharacterSystem.js        人物 GLB 缓存、克隆、按调色板换材质色、实例生命周期
  NpcAgentSystem.js         普通桌随机分配、入座、同桌对话与会议调度（本地 mock；live 模式下由 main.js 注入开关停用）
  LiveWorld.js              世界快照轮询器（echo-snapshot.v1）：优先 /api/v0/world/snapshot，
                            降级 data/mock/snapshot.demo.json，再兜底内置快照；非 live 源由内置演化器驱动；
                            visibilitychange 时暂停；提供 onSnapshot/onEvent 订阅
  SnapshotAdapter.js        快照 agent → 渲染结构映射（状态归一化 walking|seated|talking|in-meeting|at-booth、
                            CafeLayout 座位锚点对齐、事件 camelCase 归一化、modules 透传，纯函数可在 node 下自测）
  WalkSlide.js              live 插值轻量避障：位移将进入阻挡圆时投影到切线滑动（纯函数，圆键 r/radius 兼容）
  ColliderRegistry.js       环境静态碰撞壳注册表（按环境资产 id 返回 bounds + 静态圆；摊位圆由 BoothSystem
                            动态注入；NPC↔NPC 分离权威在后端；loadFromManifest 为 COLLIDER_* 导出预留桩）
  WorldSwitch.js            两级世界切换（?world=hall|cafe，默认 hall）+ HALL_LAYOUT 大厅布局常量
  BoothSystem.js            展位系统：模板 GLB（module.booth-template.v1，未到货降级简易占位展位）→
                            按快照 modules 克隆、MESH_* 展示面贴图/CanvasTexture 名牌与标签、增量同步、
                            展位圆形阻挡与射线点选、0.3s 缩放入场
  mock/MockApi.js           API v0 契约客户端（IF-1~IF-5），`?api=live` 切真实后端
src/bootstrap/
  integrations.js           统一集成层：MockApi → 各 UI 模块的 api 适配（getPackages 缓存 + confirm 失效）、
                            挂载 PipelineFlow/PackagePanel/SearchBar、「记录相遇」入口按钮、模块联动
src/ui/
  CafeShell.js              当前使用的 UI 壳：intro -> cafe -> map 流程、人物侧栏、圆桌会议 UI
  RelationshipGraph.js      关系 Map：7 个节点 + 12 条边的 SVG/DOM 渲染
  pipeline/PipelineFlow.js  相遇「录入 → 处理 → 确认」三屏流程（IF-1/2/3，自带 pipeline.css）
  package-panel/            资料包面板 + 顶部检索条（IF-5，自带 panel.css）
  AppShell.js               ⚠ 未被任何文件引用（历史遗留，疑似 CafeShell 的早期版本），改动前先确认
src/cafe.css                当前使用的样式（由 main.js import）
src/style.css               ⚠ 未被引用（index.html 无 link、无 import），改动前先确认
public/
  models/                   咖啡厅环境 GLB、无脸人物 GLB
  portraits/                7 张人物头像 PNG（同一无脸角色的统一渲染）
  data/world-spec.json      世界描述（characters 目前为空数组，人物由 demoPeople.js 提供）
  data/asset-catalog.json   环境/人物/资料资产白名单
  data/people/              人物 profile.json
dist/                       构建产物（已提交 Git）
```

### 数据流

`world-spec.json`（schema `echo-world.v1`）→ 引用 `asset-catalog.json`（schema `echo-assets.v1`）→ 白名单内的 GLB/JSON 资产经 `AssetStore` 加载。运行时人物数据来自 `src/data/demoPeople.js`，两个 schema 版本字符串是硬校验，改动 JSON 结构时必须同步更新 `WorldSpec.js` / `AssetCatalog.js` 中的版本常量。

人物动态默认由世界快照驱动（ROADMAP 1.C.2）：`LiveWorld` 纯读轮询 `/api/v0/world/snapshot`（契约见 docs/API.md IF-4、docs/ARCHITECTURE.md §4，schema `echo-snapshot.v1`），旧世界由后端服务端 heartbeat 推进；经 `SnapshotAdapter` 映射后由 main.js 插值渲染，后端不可用时自动降级 `data/mock/snapshot.demo.json` → 内置兜底快照（本地演化保持世界运转）。`window.__ECHOWORLD_OPTIONS__ = { api, onPersonSelected, live, snapshotPollMs }` 可注入真实 api、选人回调或关回 NpcAgentSystem 本地调度（`live: false`）。

两级世界（MVP1.5）：`?world=hall`（默认，展位大厅）陈列每个 Package 一个展位、人物 at-booth 站位不走动、气泡/Toast/tick 静默、轮询 10s、展位即点击入口开资料包；`?world=cafe` 为现有活的世界（2s 轮询、对话气泡、圆桌会议）。切换经 `navigateToWorld()` 改 URL 整页刷新；大厅环境资产 `environment.expo-hall.v1`、展位模板 `module.booth-template.v1`，未到货时前端自动降级占位场地/占位展位。

### 不纳入版本控制的本地内容

- `blender-4.5.12-linux-x64/`（约 1.2 GB）：本地 Blender 安装，用于离线生成 GLB 模型与头像渲染；不是运行时依赖，也没有调用它的脚本。
- `EchoWorld-threejs-frontend-20260803.zip`：交付归档。

## 代码约定

- 原生 ESM，双引号、分号、2 空格缩进；模块级常量用 `SCREAMING_SNAKE_CASE`，布局/数据对象普遍 `Object.freeze`。
- 无状态管理库：UI 通过 DOM 模板字符串渲染 + `data-*` 属性事件委托；图标统一在模块顶部 `ICONS` 表登记后 `createIcons`。
- 3D 坐标约定：座位/出生点用 `{x, z, yaw}`；模型朝向 `MODEL_FORWARD = (0,0,1)`；碰撞为运行时圆形阻挡（`TABLE_BLOCKERS`），尚未从 Blender 导出碰撞壳。
- 人物换色通过材质名匹配（`MATERIAL_MODULE_TOKENS`：jacket/hair/skin/pants/shoes/shirt），新增调色板键需与 GLB 材质命名对应。
- 变更体验流程时同步更新 `README.md` 的"体验闭环/代码边界/当前限制"小节。

## 安全与数据边界

- 原始照片、声音、embedding、内部记忆和安全存储地址**不得**复制到 `public/`。前端只消费授权过滤后的 DTO、`CharacterAsset` 和实时 `AgentEvent`（见 README"代码边界"）。
- `public/data/asset-catalog.json` 是资产白名单：只加载其中登记的资产。
- 无密钥、无网络 API 调用；所有数据为本地静态 JSON。
