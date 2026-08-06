# AGENTS.md

面向 AI 编码代理的项目说明。阅读本文件即可了解 EchoWorld 前端的结构、命令与约定。

## 开发与部署规范（2026-08-06，先读再动手）

- **权威代码 = GitHub `main` = `/root/meetmind_wt_main`**（生产检出）。所有改动在这里做、
  在这里构建、从这里推送（SSH：`git@github.com:xiaojinyu868-w/Meetmind_world.git`）。
- `/root/meetmind_go` 是**共享工作区**（用户与其他代理都在里面）：不在那里做 git 操作
  和构建；它的 `backend/data/` 是线上数据目录（`ECHO_DATA_DIR`），不要动数据结构。
- 合并协作者分支：fetch 后在 wt_main 里 merge，**临时 worktree 用完即删**
  （`git worktree remove` + 删分支），不留第二个长期工作区。
- 部署流程：改代码 → `npm run build` → 提交推送 →（改过后端才）重启 uvicorn
  （127.0.0.1:8000，日志 `/var/log/echoworld-uvicorn.log`）→
  `rm -rf /var/www/echoworld && cp -a dist /var/www/echoworld`。
- 后端测试：`cd backend && PHYSICAL_AI_PACKAGE_SCHEMA="" .venv/bin/python -m pytest tests/ -q`。
- `.env` 不进 git：线上后端读 `/root/meetmind_wt_main/.env`（chat 已切 DashScope
  qwen3.7-plus；DeepSeek 402 余额不足，恢复后改回 CHAT_* 即可）。
- 梳理文档：`docs/AGENT-RUNTIME.md`（Agent 运行机制）、`docs/PRODUCT-STATUS.md`
  （Mock/未实现清单）——改动涉及这些结论时同步更新。

## 并行协作分工（2026-08-04，先读再动手）

本仓库有两条并行代理工作流，为避免互相覆盖：

- **场景组（另一协作者）**：`blender/`、`renders/`、`exports/`、`public/models/`（环境 GLB）、`public/textures/`（环境贴图）、`src/runtime/SceneVariants.js`、`src/runtime/VisualProfiles.js`、以及各环境场景的视觉效果。**其他代理不要改这些路径。**
- **主线组（本仓其余一切）**：`backend/`、`src/`（除上述两个场景文件）、`docs/`、人物管线与 `public/models/characters/`、`public/portraits/`。
- 公共区域（`src/main.js`、`src/bootstrap/integrations.js`、`docs/ROADMAP.md`、根 `AGENTS.md`）：改动保持最小、只增量不重构，提交信息写清所属组。

## 项目概述

EchoWorld Three.js 关系世界原型（包名 `echoworld-lowpoly-walk`）：包含关系集市、熟人咖啡厅与“我和 TA”的关系场域。玩家用 `W/A/S/D`（桌面）或虚拟摇杆（触屏）走动，使用 E/F 或点击提示进入情境菜单；可查看资料包、邀请熟人、发起圆桌并让事件进入世界播报。

体验闭环：标题页 → 3D Echo Cafe → Agent 自主交谈 → 点选人物看资料 → 圆桌会议 → 关系 Map → 从节点返回咖啡厅定位人物。

- 前端为静态站点（Vite 构建）；世界动态由 `backend/`（FastAPI）的世界快照驱动，LiveWorld 轮询 `/api/v0/world/snapshot`，后端不可用时自动降级本地 mock/内置快照（见"数据流"节）。
- UI 语言为简体中文（`index.html` 为 `lang="zh-CN"`），文档与界面文案使用中文。
- 场景：1 个玩家 + 6 个占位人物。人物形象方向（2026-08-03，PRD P-6）为 MC 体素 + AI 生成图片贴图；当前启用 voxel 方案（固定体素身体 + 照片特征贴图），无脸 GLB（`character.faceless-prototype.v1`）仅作历史占位。Voxel GLB 使用 7 骨刚性骨架并内置 `Idle / Walk / Talk / SitDown / Sit / SitTalk / RaiseRightHand / RaiseBothHands`；入座由 Root 局部下沉和双腿旋转完成，不得再缩放角色根节点。
- 中央六人圆桌承载两类会议：后端 runtime 自动调度（周期性）与用户发起（2026-08-04 起为真实 LLM 会议对话，`POST /api/v0/agents/meeting`，agent-talk 带 meeting_id 回流前端会议线程；非 live 模式保留本地轮播台词演示）。

## 技术栈

- **Three.js `^0.185.1`**：WebGL 渲染，`GLTFLoader` 加载 GLB，`SkeletonUtils.clone` 克隆带骨骼人物，`AnimationMixer` 播放动作。
- **Vite `^8.2.0`**（devDependency，基于 rolldown）：开发服务器与构建。
- **lucide `^1.28.0`**：UI 图标（`createIcons`）。
- 原生 ES Module JavaScript（`"type": "module"`），无框架、无 TypeScript、无 JSX。

## 构建与运行命令

```bash
npm install
npm run dev       # vite --host 0.0.0.0 --port 5173 --strictPort，打开 http://127.0.0.1:5173/
npm run build     # 输出到 dist/
npm run preview   # 预览生产构建，--host 0.0.0.0
npm run test:animation  # Node 内置测试：Idle/Walk/坐姿状态机、动作重入、单次 gesture、恢复与 animation-cue
npm run test:controls   # Node 内置测试：第三人称相机/输入/胶囊滑动
node --test tests/booth-layout.test.mjs  # 展位槽位/交互半径（未挂 npm script）
```

- 没有配置 lint、格式化或类型检查工具。
- 没有通用测试框架；角色动作使用 Node 内置测试，其他验证仍为 `npm run build` 成功 + 浏览器手动走查体验闭环。
- `dist/` 已提交进 Git（构建产物随仓库分发）。修改源码后如需更新分发产物，重新 `npm run build` 并提交 `dist/`。

## 目录结构

```
index.html                  入口页面（#world canvas、#ui-root、加载层、虚拟摇杆、fatal-error）
src/main.js                 应用装配：Three.js 场景/灯光/阴影、第三人称相机、WASD+触屏移动、
                            圆形桌面碰撞（TABLE_BLOCKERS）、射线选择、会议编排（约 800 行）；
                            场域：splat 加载后 worldBounds/cameraBounds 重设为实测边界，field companion
                            同伴随行（updateFieldCompanion），场域内世界快照不驱动站位也不生成新面孔
src/data/demoPeople.js      mock 数据：currentUser、6 个 NPC（含 palette 调色板、资料、关系图坐标）、relationships
src/runtime/
  WorldSpec.js              world-spec.json 的加载与 schema 校验（echo-world.v1）、publicUrl() 处理 BASE_URL
  AssetCatalog.js           asset-catalog.json 白名单加载与校验（echo-assets.v1）
  AssetStore.js             完整 GLTF（scene + animations）与 JSON 的 Promise 缓存
  CafeLayout.js             咖啡厅边界、5 张桌、18 个 Blender 座位锚点（全部 Object.freeze）
  CharacterSystem.js        人物 GLB 克隆、换材质、AnimationMixer、状态/动作映射与实例生命周期
  CharacterCapsule.js       角色竖直胶囊碰撞体（站/坐双高度）与 capsule 纯函数（footprint/penetration/fits）
  CafeVariants.js           咖啡厅场景版本（?world=cafe&scene=original|reference|storybook，默认 storybook）
  SceneVariants.js          大厅场景版本（?world=hall&scene=original|v1）：original=木屋夜集 hub-town（默认）、
                            v1=村落市集（environment.village-market.v1，视觉层环境 + y=0 行走平面契约）
  VillageMarketEnvironment.js 村落市集视觉层包装：GLB 整体上移对齐 y=0、透明行走平面为唯一地面射线目标、咖啡厅门锚点
  HubBlockout.js            大厅几何 blockout 占位环境（environment.hub-blockout.v1，开发调试用）
  ThirdPersonCamera.js      第三人称相机控制器（轨道/跟随、边界钳制、指针锁定视角）
  Input.js                  键盘/触屏/指针输入统一采集
  CameraRelativeMovement.js 相机相对移动向量解算（纯函数）
  NpcAgentSystem.js         普通桌随机分配、入座、同桌对话与会议调度（本地 mock；live 模式下由 main.js 注入开关停用）
  LiveWorld.js              世界快照轮询器（echo-snapshot.v1）：优先 /api/v0/world/snapshot，
                            降级 data/mock/snapshot.demo.json，再兜底内置快照；非 live 源由内置演化器驱动；
                            visibilitychange 时暂停；提供 onSnapshot/onEvent 订阅
  SnapshotAdapter.js        快照 agent → 渲染结构映射（状态归一化 walking|seated|talking|in-meeting|at-booth、
                            CafeLayout 座位锚点对齐、animation-cue/事件归一化、modules 透传，纯函数可在 node 下自测）
  WalkSlide.js              live 插值轻量避障：位移将进入阻挡圆时投影到切线滑动（纯函数，圆键 r/radius 兼容）
  ColliderRegistry.js       环境静态碰撞壳注册表（按环境资产 id 返回 bounds + 静态圆；hub-town 壳含建筑/
                            篝火/大树/河带（桥与汀步留口）；摊位圆由 BoothSystem 动态注入；NPC↔NPC 分离权威在后端）
  WorldSwitch.js            三级世界切换（?world=hall|cafe|field，默认 hall）+ 场域 person 参数；
                            hall 的环境资产/摊位模板/镜头由 SceneVariants 场景版本独立选择（切换 world 时清掉 scene 参数）
  BoothSystem.js            展位系统：模板 GLB（module.market-stall.v2 商人推车，未到货降级简易占位展位）→
                            按快照 modules 克隆、MESH_* 展示面贴图/CanvasTexture 名牌与标签、增量同步、
                            每摊位按 personId 稳定配色变体（雨篷/车台布）、展位圆形阻挡与射线点选、0.3s 缩放入场
  RelationshipFieldSystem.js  `echo-field.v1` 关系场域程序化地形、实体、热点与动画（splat 模式下 decorations=false 只搭实体）
  FieldSplatWorld.js          场域 Marble splat 世界（FR-2.11 升级）：field.world.status=ready 时 Spark 渲染 .spz
                              （metric_scale_factor/ground_plane_offset 换算 + X 轴 180° 轴系转换；Spark 走动态 import 不进主包），
                              地面用 SplatHeightmap 从 splat 位置自证（collider GLB 仅隐藏诊断）；返回实测 bounds/spawnHint
                              供 main.js 重设活动边界与出生点；world 缺失/加载失败返回 null，回退程序化场域
  SplatHeightmap.js           SPZ v2 位置解码 + 稀疏中值高程图（所见即所踩；buildHeightmapMesh 生成不可见地面网格）
  WorldModuleRegistry.js    `echo-world-modules.v1` 挂载契约加载和严格校验
  WorldBroadcastSystem.js   咖啡厅 3D 播报屏与 DOM 晨报摘要
  RoomClient.js             v1 现场房间客户端（docs/MVP2-BACKEND.md）：REST join/commands/snapshot +
                            WS 有序事件流（after_sequence cursor 重放、sequence 去重/空洞 HTTP 补拉、
                            指数退避重连），WS 不可用自动降级 events 轮询；member.move 约 4.5Hz 幂等上报；
                            纯逻辑可在 node 下自测（scripts/room-client.test.mjs）
  mock/MockApi.js           API v0 契约客户端（IF-1~IF-6 含会议端点），`?api=live` 切真实后端
src/bootstrap/
  integrations.js           统一集成层：MockApi → 各 UI 模块的 api 适配（getPackages 缓存 + confirm 失效）、
                            挂载 PipelineFlow/PackagePanel/SearchBar、「记录相遇」入口按钮、模块联动
src/ui/
  CafeShell.js              当前使用的 UI 壳：intro -> cafe -> map 流程、人物侧栏、圆桌会议 UI
                            （live 模式会议线程消费快照 agent-talk[meeting_id]，玩家发言 POST 后端；
                            旧的 #roundtable-prompt 悬浮入口已退役，圆桌统一走 SceneInteraction 热点；
                            大面板互斥：会议 sheet 与资料包经 echoworld:panel-focus 事件互关，同屏只开一个）
  SceneInteraction.js       统一 E/F 与触屏情境互动（一键一动作，E 主/F 次即时触发；
                            模态 sheet 为右下单例卡片，JS 与 scene-interaction.css 类名必须成套对齐——
                            2026-08-05 曾因 JS/CSS 分属两套设计导致 sheet 裸奔堆叠，改一侧必须同步另一侧）
  RelationshipGraph.js      关系 Map：7 个节点 + 12 条边的 SVG/DOM 渲染
  pipeline/PipelineFlow.js  相遇「录入 → 处理 → 确认」三屏流程（IF-1/2/3，自带 pipeline.css）
  onboarding/OnboardingFlow.js  合照入场三屏流程（FR-2.12，/api/v1/group-onboarding 两段式，自带 onboarding.css）
  package-panel/            资料包面板 + 顶部检索条（IF-5，自带 panel.css）
  group/GroupPlay.js        v0 现场房间（700ms 轮询试点 + “谁写的？”游戏，echo-group-room.v1）
  group/RoomPanel.js        v1 联机房间面板（RoomClient 驱动：创建/加入、名册、meeting.* 命令、
                            有序事件条；探测 /api/v1/scenes/modules 失败时隐藏并回落 v0；自带 room.css）
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
tests/                      Node 内置测试（*.test.mjs）：character-animation / player-controls / booth-layout
scripts/                    node 自测与冒烟：room-client.test.mjs（RoomClient 纯逻辑/状态机）、
                            smoke-room-client.mjs（真实后端双端 WS 冒烟，自动拉起本地 uvicorn）
```

### 数据流

`world-spec.json`（schema `echo-world.v1`）→ 引用 `asset-catalog.json`（schema `echo-assets.v1`）→ 白名单内的 GLB/JSON 资产经 `AssetStore` 加载。运行时人物数据来自 `src/data/demoPeople.js`，两个 schema 版本字符串是硬校验，改动 JSON 结构时必须同步更新 `WorldSpec.js` / `AssetCatalog.js` 中的版本常量。

人物动态默认由世界快照驱动（ROADMAP 1.C.2）：`LiveWorld` 纯读轮询 `/api/v0/world/snapshot`（契约见 docs/API.md IF-4、docs/ARCHITECTURE.md §4，schema `echo-snapshot.v1`），旧世界由后端服务端 heartbeat 推进；经 `SnapshotAdapter` 映射后由 main.js 插值渲染，后端不可用时自动降级 `data/mock/snapshot.demo.json` → 内置兜底快照（本地演化保持世界运转）。`window.__ECHOWORLD_OPTIONS__ = { api, onPersonSelected, live, snapshotPollMs }` 可注入真实 api、选人回调或关回 NpcAgentSystem 本地调度（`live: false`）。

三级世界：`?world=hall`（默认）陈列每个 Package 的展位；`?world=cafe` 承载桌边交流、圆桌和世界播报；`?world=field&person=<id>` 消费后端 `echo-field.v1` 表达“我与 TA 的关系”。切换经 `navigateToWorld()` / `navigateToField()` 改 URL 整页刷新；场所入口清单位于 `public/data/world-modules.json`。

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
