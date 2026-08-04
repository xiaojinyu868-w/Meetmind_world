# EchoWorld 技术架构

对应 PRD.md 的 MVP 1.0–3.0。本文描述分层原则与目标架构；当前可信单机的真实
组件、K3 输入和数据接通状态以
[`REAL-DATA-WORLD-ARCHITECTURE.md`](./REAL-DATA-WORLD-ARCHITECTURE.md) 为准。

## 1. 分层职责（不可逾越的边界）

```
┌─────────────────────────────────────────────────┐
│ Three.js 前端（frontend/）                        │
│ 职责：把世界快照"画出来"。只读快照，不读 Agent 内部 │
├─────────────────────────────────────────────────┤
│ World Service（backend/）                         │
│ 职责：世界里有什么、角色在哪里。唯一世界状态权威     │
│ 输出：世界快照（World Snapshot）                   │
├─────────────────────────────────────────────────┤
│ Agent Runtime / Harness（backend/agents/）        │
│ 职责："想什么、做什么"。通过事件改变世界，           │
│ 不直接操作世界状态，更不被前端直接读取              │
└─────────────────────────────────────────────────┘
```

**铁律**：
- Agent 通过**事件**改变世界；World Service 消费事件、维护状态、生成快照；Three.js 只渲染快照。
- Three.js **不直接读** Agent 内部记忆；Agent **不直接写**世界状态。
- 这样任何一层可独立替换（如渲染端从 three.js 换成其他引擎，或 Agent 框架从规则驱动换成 LLM 驱动）。

## 2. 目录结构（目标形态）

```
3d-agent/
│
├─ frontend/                  # 前端
│  └─ world-web/              # Three.js 世界渲染（由现有 EchoWorld 原型演进）
│     ├─ src/                 # 场景、人物系统、UI 壳（结构见根 AGENTS.md）
│     ├─ tests/
│     ├─ package.json
│     └─ vite.config.ts       # 原型为纯 JS + vite，迁移 TS 为 TBD-ARCH-1
│
├─ backend/                   # 后端（FastAPI）
│  ├─ api/                    # HTTP API：采集上传、Package CRUD、世界快照、推送
│  ├─ packages/               # 人物资料包存储与版本管理（事实层/推断层分离）
│  ├─ world/                  # World Service：世界状态、座位/位置调度、快照生成
│  ├─ agents/                 # Agent Runtime（Harness）
│  │  ├─ llm/                 # 模型接口层（MVP1 用 qwen3.7PLUS，接口抽象，可替换）
│  │  ├─ memory/              # 记忆系统（见 CONTEXT-AND-MEMORY.md）
│  │  ├─ tools/               # tool1.py / tool2.py / ... 原子工具
│  │  ├─ skills/              # Skill：规定发展方向、agent 权限限制的指引文件
│  │  ├─ mcp/                 # MCP 服务接入
│  │  └─ utils/
│  ├─ people/                 # 人物配置：每人一个目录
│  │  │  └─ <person_id>/
│  │  │     ├─ memory.md          # 相关记忆（推断层，可更新）
│  │  │     ├─ relations.md       # 关系网络（关键词匹配用）
│  │  │     └─ profile.json       # 人物事实与授权级别
│  ├─ harness/                # 自进化管理：实时用户数据更新 → 世界展示
│  │  ├─ prompts/             # 自进化相关 prompt / MD
│  │  └─ permissions/         # harness 圈层权限配置
│  └─ tests/
│
├─ .env                       # API 中转配置（不提交，见 .env.example）
└─ README.md
```

## 3. 主流程（MVP1）

```
用户操作（录制/查看）
  → FastAPI（api/）
  → 固定流程编排（非自由 Agent，MVP1 为确定性管线）
  → 提取（人脸/转写/场景）→ 用户确认（FR-1.3）
  → 写入 Package（事实层只增不改）
  → 更新人物 Markdown（relations.md 关键词索引）
  → World Service 注册场景模块与像素小人
  → 生成世界快照
  → Three.js 渲染
```

MVP2（2026-08-03 重设后）增加三条线：场景语言（点位交互/播报，前端交互层）、场域生成管线（§5a 第三条生成线）、群体冷启动（合照分割 → 批量 confirm → 批量注册进世界 → 现场联机共享空间，实时同步方案见 TBD-ARCH-4）。原"Agent 价值分析 → 推送"编排整体暂缓，重议后再回本节。

## 4. 世界快照协议（前端唯一数据契约）

快照是 World Service 到前端的**唯一**通道，版本化 schema（沿用原型 `echo-world.v1` 风格，版本号硬校验）：

```jsonc
{
  "schema": "echo-snapshot.v1",
  "tick": 12345,
  "agents": [
    {
      "id": "person_xxx",
      "position": { "x": 0, "z": 0, "yaw": 1.57 },
      "state": "walking | seated | talking | in-meeting",
      "avatar": { "palette": { "jacket": "#...", "hair": "#..." } }
    }
  ],
  "modules": [ { "id": "booth_xxx", "type": "booth", "position": {} } ],
  "events": [ { "type": "agent-talk", "agent_id": "person_x", "to_agent_id": "person_y", "text": "...", "tick": 12340 }, { "type": "meeting-start", "meeting_id": "meeting_1", "participants": [] } ]
  // events 为最近 N=20 条滚动缓冲；类型枚举：agent-move / agent-state / agent-talk / meeting-start / meeting-end
}
```

- 前端不推断状态，只渲染；快照未包含的信息前端无权知道。
- 资料包内容（人脸照片、谈话记录）**不走快照**，由用户点击后经 API 按权限单独拉取。
- 场景语言（FR-2.8/2.9）分为两类契约：动态角色/展位仍走快照；稳定场所入口走静态 `echo-world-modules.v1` 挂载清单。用户触发的邀请、圆桌和场域事件写入 append-only 世界事件存储，由 `/world/events` 与 `/world/brief` 提供可恢复播报。前端不把本地动画当作已发生事件。

## 5. 自进化权限矩阵（harness 圈层管理）

| 允许自进化更新 | 禁止自进化更新 |
|---|---|
| Agent 的位置和状态 | Skill 工作流 |
| 当前任务状态 | Tool 全部实现 |
| 相遇记忆（新增条目） | 权限要求本身 |
| 短期工作记忆 | 长期记忆（人物事实层） |
| 用户反馈记录 | API 配置 / 密钥 |

- 长期记忆（人物事实）只能经由**用户确认流程**写入，自进化流程无权触碰（对应 P-3）。
- 权限配置在 `backend/harness/permissions/`，修改权限配置 = 代码评审级变更。

## 5a. 生成管线（照片 → 体素人物 / 场景模块 / 个人场域）

**人物形象方向（2026-08-03 定，P-6）**：MC 体素（voxel）人物 + AI 生成图片贴图。原"照片 → 三视图 → lowpoly 有脸 GLB"方向废弃。三条生成线，**人/场景/场域解耦**：人是可动的 Agent 模型，场景是静态模块，场域是推断层的视觉化空间，只在世界快照中按坐标组合。

**目标硬件链路**（Demo 阶段用手机摄像头替代眼镜，K3 开发板环节先由手机/服务器代行）：

```
眼镜摄像头 + 麦克风（日常拍摄/录音）
  → K3 开发板处理整理 → 形成以个人为单位的 Package（事实层）
  → AI 生成图片贴图（头部五面 + 身体 atlas，输入为真实照片）
  → 体素 GLB 组装（固定体素身体 + 动态贴图）
  → 登记入资产白名单 → 部署到 three.js 世界
```

**场域生成链路（FR-2.11，多模态情感可视化）**：场域表达"我与 TA 的关系"，而非 TA 这个人本身（2026-08-03 决策，TBD-F2）——输入以双方共同事件、互写印象与关系状态为主，而非对方全部素材。

```
照片（外貌/穿着/姿态）+ 音频（语气/节奏/情绪）+ 自我描述 + 他人第一印象
  + 共同经历 + 关系状态（亲密/紧张/信任/冲突）
  → 总结人物特质与关系特征（推断层，带事实指针）
  → 艺术化空间映射（隐喻/夸张/超现实，非机械映射；映射规则 TBD-F3）
  → 环境参数：空间开阔/封闭、天气/光线/色彩、声音与音乐、
    建筑地形材质、动植物实体、可触发的动作与互动点
  → FieldScene（标注生成物、带来源素材指针、可重算）
```

软件接口（`backend/pipeline/`，算法 mock、接口先行，逐个打磨）：

| 模块 | 接口 | MVP 实现 |
|---|---|---|
| `pipelines/physical_ai_enrichment/avatar.py` | `generate(person_id, image_bytes, source_ref) -> CharacterAsset` | 已实现：安全可见特征/规则配色 → 128 atlas + 四表情 + 固定身体 GLB，版本化写入 `derived/` |
| `physical_ai/service.py` | `agent-package -> session facts + PersonPackage[]` | 已实现：共享事实只存一次，专属媒体按 `person_id` 分区，未确认与 unassigned 不误归人 |
| `pipelines/physical_ai_enrichment/service.py` | `person evidence -> summary/memory/relations` | 已实现：结构化 LLM + 规则降级，推断全部带事实指针 |
| `signals/service.py` | `wearer physiology -> person-signal.v1` | 已实现会话后聚合；原始 Ring 样本不进入浏览器 |
| `app/fields/generator.py` | `generate_field(package, inferences, relations_md) -> echo-field.v1`（关系场域，FR-2.11） | 确定性艺术参数 + 4 类互动实体；产物标注生成物、来源素材指针、可重算（P-3） |

注：旧 `pipeline/person_builder.py` 的三视图/lowpoly 路径仅供历史 IF-1 流程兼容；K3
真实入口使用 `physical_ai_enrichment`，不再等待 per-person Blender 作业。

Agent 行为按场景半规则驱动（走动/访问/圆桌），由 Agent Runtime 发事件改变世界状态，前端只渲染快照（ADR-1）；世界的动态演化只允许 Agent 通过事件完成（见 §5 权限矩阵）。

## 6. 模型接口（backend/agents/llm/）

- 统一抽象：`chat(messages, tools) -> response`，MVP1 默认实现为 qwen3.7PLUS，接口级可替换。
- 多模态（人脸 embedding、生图、语音转写）各自独立 provider 接口，配置文件登记在 `.env`（API 中转）。
- 所有模型调用记录：输入摘要、输出、耗时、费用，供推断层审计。

## 7. 关键架构决策（ADR 简表）

| ID | 决策 | 理由 |
|---|---|---|
| ADR-1 | Agent/World/Render 三层严格分离，事件驱动 | 可替换性；前端永远不需要理解 Agent 内部 |
| ADR-2 | 人物事实保留 Markdown + JSON；MVP2 房间事件/状态用 SQLite WAL | 原媒体保持不可变文件；多人命令需要顺序、幂等和重启恢复 |
| ADR-3 | v0 渲染走纯读快照；v1 房间走快照初始化 + 有序事件增量 | 防止前端读取 Agent 内部，同时支持实时多人 |
| ADR-4 | 自进化只能改"状态"，不能改"规则" | 权限失控是最大的产品风险（P-8） |
| ADR-5 | 沿用现有 three.js 咖啡厅原型演进，不重写 | 原型已验证渲染与交互闭环 |
| ADR-6 | 人物形象走"体素 + AI 图片贴图"，不走 per-person 高模管线（2026-08-03） | 现场场景下生成速度与成本优先；辨识度由照片贴图保证；P-6 |
| ADR-7 | 现场群体玩法使用独立 `GroupSessionService`，不叠加到单人 `WorldService`；MVP2 场地试点采用 HTTP 轮询 + 单调位置序号 | 房间/印象/游戏有自己的生命周期；先验证同场多设备与玩法节奏，避免把一次性试点协议固化成未来云联机架构 |
| ADR-8 | 稳定场所入口使用 `echo-world-modules.v1`，用户场景事件使用 append-only `echo-world-event.v1` | 后续小屋/应用可按 mount/entry/interaction 挂载；播报与重启恢复不依赖前端瞬时状态 |
| ADR-9 | Agent 只产 Intent，Policy/CommandValidator 后由确定性服务执行（v2 runtime） | LLM 不掌握事件顺序、权限、碰撞、会议或游戏状态 |

## 8. TBD

- TBD-ARCH-1：前端是否/何时迁移 TypeScript。
- TBD-ARCH-2：人物数据何时从文件迁移到数据库（触发条件：单人 Package 数 > 500 或多人协作写入冲突出现）。
- TBD-ARCH-3 已决（2026-08-04）：v0 世界快照维持纯读轮询；v1 现场房间使用 WebSocket + sequence cursor replay。
- TBD-ARCH-4（2026-08-04 现场档双线落地）：**现场联机**（FR-2.14）现有两条实现——v0 `echo-group-room.v1`（内存权威状态 + 约 700ms 轮询 + 单调 `seq`，服务 GroupPlay 同场试点）与 v1 `rooms`（SQLite 持久化 + WebSocket 有序事件 + Intent/Command 架构，已接 Three.js 咖啡厅）；硬件形态与大屏只读视角仍见 TBD-H1。**云端联机**（FR-3.6，远期）仍须重新评审：PostgreSQL 事务/outbox、Redis presence/pub-sub/分片锁、登录与 room token 鉴权，禁止直接扩展进程内或单节点实现。

## 变更记录

- 2026-08-03 | 初始版本 | AI
- 2026-08-03 | 新增 §5a 生成管线（硬件链路：眼镜/K3 → Package → 三视图 → Blender GLB；人/场景解耦；接口先行算法 mock） | 人（输入）+ AI（记录）
- 2026-08-03 | 依 8-03 晚决策：§5a 人物管线改为"照片 → AI 图片贴图 → 体素 GLB 组装"（原三视图/lowpoly 方向废弃），新增场域生成线 `field_gen.py`（推断层视觉化）；§3 主流程补 MVP2 重设说明；§4 补场景语言的快照消费约定；新增 ADR-6 与 TBD-ARCH-4（联机） | 人（决策）+ AI（记录）
- 2026-08-03 | 依 8-03 晚会议纪要：§5a 新增场域生成链路（多模态素材 → 情感/关系特征 → 艺术化环境参数映射，非机械映射）；TBD-ARCH-4 细分为现场联机（MVP2）与云端联机（远期）两档 | 人（会议纪要）+ AI（记录）
- 2026-08-03 | TBD-F2 决策落档：场域 = "我与 TA 的关系"的表达，输入以双方共同事件与关系状态为主 | 人（决策）+ AI（记录）
- 2026-08-04 | ADR-7 落档：现场房间与单人世界状态分离，以轮询 + 单调序号完成 MVP2 同场试点；视觉/音频链路由上游工作流负责，本服务只消费已授权 DTO | 人（边界）+ AI（实现）
- 2026-08-04 | ADR-8 落档：版本化世界模块挂载清单、关系场域推断管线与 append-only 世界事件/晨报接入；视觉和音视频语义继续由上游提供 | AI
- 2026-08-03 | MVP2 后端框架落地：Intent-only Agent、Policy/Command、SQLite EventStore、房间 WebSocket、圆桌/破冰、群体入场与 Field 工作流；现场单节点可验收 | AI
- 2026-08-04 | 合并 codex/agent 两线：ADR-9 落档（Intent-only Agent 架构）；TBD-ARCH-3 已决、TBD-ARCH-4 现场档双线记录（v0 轮询试点 + v1 WS 目标形态）；v0 快照改纯读、tick 由服务端 scheduler 心跳推进 | AI
- 2026-08-04 | v1 Room 接入 Three.js 咖啡厅；新增可信单机真实数据现状图索引 | AI
- 2026-08-04 | K3 package 下游生成线落地：会话/人物事实扇出、深度记忆/关系、动态体素资产、PersonSignal 与显式 Agent 授权 | AI
