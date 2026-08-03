# EchoWorld 技术架构

对应 PRD.md 的 MVP 1.0–3.0。本文只描述**目标架构**；现有仓库是 three.js 前端原型（见根目录 AGENTS.md），将逐步演进进 `frontend/`。

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

MVP2 起，编排层引入 Agent Runtime：规则调度（走动/访问/圆桌）产生事件 → World Service 消费事件更新状态 → 大模型分析互动记录 → 推送服务过滤后通知用户。

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

## 5a. 生成管线（照片 → 低多边形人物/场景模型）

每个真实的人和相遇第一现场都由统一管线建模，**人/场景解耦**：人是可动的 Agent 模型，场景是静态模块，只在世界快照中按坐标组合。

**目标硬件链路**（Demo 阶段用手机摄像头替代眼镜，K3 开发板环节先由手机/服务器代行）：

```
眼镜摄像头 + 麦克风（日常拍摄/录音）
  → K3 开发板处理整理 → 形成以个人为单位的 Package（事实层）
  → AI 生成三视图（正面/侧面/背面）
  → AI 调用 Blender 按三视图生成 lowpoly GLB（有脸，per-person）
  → 登记入资产白名单 → 部署到 three.js 世界
```

软件接口（`backend/pipeline/`，算法 mock、接口先行，逐个打磨）：

| 模块 | 接口 | MVP1 实现 |
|---|---|---|
| `three_view.py` | `generate(photos: list[Path]) -> ThreeViews` | mock：透传输入图 |
| `blender_gen.py` | `generate(views: ThreeViews, style: StyleSpec) -> Path(glb)` | 无头 Blender 跑占位脚本（产物必须过 ART-BRIEF 契约：材质槽/根节点/朝向/身高） |
| `person_builder.py` | `build(encounter_facts) -> avatar + asset_entry` | 编排上述两步并登记白名单 |

风格规范（头身比、五官简化规则、调色板提取）由美术在 ART-BRIEF.md 定义，管线读取，不硬编码。

Agent 行为按场景半规则驱动（走动/访问/圆桌），由 Agent Runtime 发事件改变世界状态，前端只渲染快照（ADR-1）；世界的动态演化只允许 Agent 通过事件完成（见 §5 权限矩阵）。

## 6. 模型接口（backend/agents/llm/）

- 统一抽象：`chat(messages, tools) -> response`，MVP1 默认实现为 qwen3.7PLUS，接口级可替换。
- 多模态（人脸 embedding、生图、语音转写）各自独立 provider 接口，配置文件登记在 `.env`（API 中转）。
- 所有模型调用记录：输入摘要、输出、耗时、费用，供推断层审计。

## 7. 关键架构决策（ADR 简表）

| ID | 决策 | 理由 |
|---|---|---|
| ADR-1 | Agent/World/Render 三层严格分离，事件驱动 | 可替换性；前端永远不需要理解 Agent 内部 |
| ADR-2 | 人物数据以 Markdown + JSON 文件组织，而非一开始上数据库 | 人/AI 都可直接读写；关键词匹配够用；MVP3 再评估迁移（TBD-ARCH-2） |
| ADR-3 | 世界快照是前端唯一数据源 | 防止前端与 Agent 状态耦合腐烂 |
| ADR-4 | 自进化只能改"状态"，不能改"规则" | 权限失控是最大的产品风险（P-8） |
| ADR-5 | 沿用现有 three.js 咖啡厅原型演进，不重写 | 原型已验证渲染与交互闭环 |

## 8. TBD

- TBD-ARCH-1：前端是否/何时迁移 TypeScript。
- TBD-ARCH-2：人物数据何时从文件迁移到数据库（触发条件：单人 Package 数 > 500 或多人协作写入冲突出现）。
- TBD-ARCH-3：世界快照传输方式（MVP1 轮询即可；MVP2 评估 SSE/WebSocket）。

## 变更记录

- 2026-08-03 | 初始版本 | AI
- 2026-08-03 | 新增 §5a 生成管线（硬件链路：眼镜/K3 → Package → 三视图 → Blender GLB；人/场景解耦；接口先行算法 mock） | 人（输入）+ AI（记录）
- 2026-08-03 | 两级世界落地：大厅（Expo Hall，静态展位陈列，独立 WorldService 无 runtime）+ 咖啡厅（活的世界）；展位数据流：confirm → register_person → 快照 booth/at-booth → 前端 BoothSystem 渲染 | AI
