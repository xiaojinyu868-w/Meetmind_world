# MeetMind / EchoWorld Backend

本文面向后端、前端、算法和硬件开发人员，说明 `backend/` 当前真实实现、目录职责、数据契约和联调边界。

后端基于 FastAPI，当前同时保留两代运行链路：

- **API v0 / MVP1 兼容链路**：采集、处理、人工确认、人物 Package、旧世界快照和旧 Agent Runtime。
- **API v1 / MVP2 房间链路**：现场房间、有序事件、WebSocket、圆桌、破冰、Agent Intent/Command、安全策略和 SQLite 恢复。

两条链路目前尚未完全合并。尤其是 Three.js 前端仍主要消费 v0 世界快照，v1 房间状态还没有正式接入 3D UI。开发前请先阅读“前端联调”与“当前限制”。

## 1. 整体架构

### 1.1 采集、人物资料与旧世界链路

```text
眼镜 / 手机 / K3
  -> POST /api/v0/ingest              原始媒体和采集元数据只增不改地落盘
  -> POST /api/v0/pipeline            抽帧、人脸候选、转写、场景和草稿
  -> POST /api/v0/confirm             人工确认身份
  -> PackageStore                     事实、推断、人物目录和生成物
  -> WorldService + AgentRuntime      旧咖啡厅/大厅状态和稀疏 Agent 活动
  -> GET /api/v0/world/snapshot       echo-snapshot.v1
  -> Three.js                         纯渲染
```

### 1.2 MVP2 房间与 Agent 链路

```text
前端 / 现场设备
  -> HTTP Command                     member.move / meeting.* / icebreaker.*
  -> RoomService                      距离、热点、会议和游戏状态机
  -> SQLite EventStore + Room State   sequence、幂等、重启恢复
  -> committed meetmind.event.v1
  -> AgentRouter + ContextBuilder
  -> AgentDecision(Intent)            Agent 只能提出意图
  -> PolicyEngine + CommandValidator  权限与可信命令边界
  -> RoomService                      执行系统命令并产生新事件
  -> HTTP replay / WebSocket          前端按 sequence 消费
```

### 1.3 必须遵守的边界

1. Agent 不能直接修改房间、世界或长期事实，只能返回 `Intent`。
2. `PolicyEngine` 和 `CommandValidator` 把合法 Intent 转成可信 `Command`。
3. 房间位置、热点距离、邀请、会议、破冰、事件顺序和幂等都由确定性代码负责，不能交给 LLM。
4. 前端不读取 Agent 内部记忆，只消费授权后的 Package DTO、快照和事件。
5. 原始照片、音频、embedding、声纹和连续生理信号不得进入前端静态目录。
6. 确认事实与 AI 推断物理分层；推断必须保留来源指针、模型版本和置信度。

## 2. 应用装配与当前运行方式

[`app/main.py`](app/main.py) 是组合根，启动时会装配：

- v0 咖啡厅和大厅 `WorldService`。
- 旧 `AgentRuntime`、`HallRuntime` 和服务端 `WorldScheduler`。
- `PackageStore` 与 `MemoryStore`。
- v1 `RoomService`、SQLite 事件存储和房间状态仓库。
- v2 `AgentRouter`、`ContextBuilder`、`AgentCoordinator`、Policy、Tool 和 Skill registry。
- 合照入场、破冰回流、Field 生成和场景模块服务。
- HTTP、SSE 和 WebSocket routers。

当前需要特别注意：

- v0 `WorldService` 与 v1 `RoomService` 是两套状态源，v1 成员移动或开会不会自动更新 `/api/v0/world/snapshot`。
- v1 Agent 当前在一次 HTTP command 提交成功后同步处理已提交事件。
- `EventDispatcher` 和内存 Outbox 已提供基础设施，但当前房间主链路没有通过后台 worker 异步分发。
- v0 世界由服务端 heartbeat 推进；GET snapshot 默认纯读，`advance=1` 只保留给旧测试和兼容客户端。

## 3. 目录职责

```text
backend/
├─app/                       Python 应用源码
│  ├─main.py                 FastAPI 组合根与生命周期
│  ├─config.py               .env、LLM、Blender、数据目录和 heartbeat 配置
│  ├─api/                    v0 HTTP/SSE 接口与 v1 路由
│  │  └─v1/                  房间、工作流和场景模块接口
│  ├─agents/                 旧 Runtime、v2 Agent 契约、角色、LLM、记忆和工具
│  │  ├─llm/                 chat/vision Provider 适配层
│  │  ├─memory/              授权后的 Agent 记忆读取
│  │  ├─roles/               Person、圆桌主持、破冰主持、公告角色
│  │  ├─runtime_v2/          Context、Router、Coordinator、超时和预算
│  │  ├─skills/              旧 v0 Runtime 使用的 Markdown skills
│  │  ├─tools/               只读 Tool 协议、registry 与实现
│  │  └─utils/               LLM JSON 等通用辅助代码
│  ├─application/            Intent -> Command 的应用层边界
│  ├─domain/                 不依赖 HTTP 的确定性业务模型
│  │  ├─rooms/               房间、热点、邀请、圆桌、破冰和公告状态机
│  │  └─scenes/              版本化场景模块 registry
│  ├─eventing/               内存 EventStore、Outbox 和 Dispatcher 基础设施
│  ├─persistence/            SQLite WAL 事件与房间状态适配器
│  ├─packages/               文件型 Person Package 存储
│  ├─pipeline/               旧人物媒体/模型生成管线
│  ├─pipelines/              MVP2 合照、破冰数据回流和 Field 工作流
│  ├─realtime/               WebSocket wire protocol
│  ├─schemas/                Package 与 v0 世界快照校验
│  ├─security/               v2 静态 PolicyEngine
│  ├─skills/                 v2 版本化 YAML Skill 定义与 registry
│  ├─world/                  v0 世界状态、碰撞、桌位、大厅、种子和 scheduler
│  └─harness/                旧 v0 guard/权限文件；未接入 v2 自进化
├─scripts/                   可直接执行的验收脚本
├─tests/                     pytest 单元、契约、持久化和端到端测试
├─data/                      默认运行期数据根目录，不提交业务数据
├─requirements.txt           Python 依赖
└─.env.example               环境变量示例，不包含真实密钥
```

### 容易混淆的目录

| 目录 | 含义 |
|---|---|
| `app/pipeline/` | MVP1 遗留的单人媒体、三视图和 Blender 人物生成管线 |
| `app/pipelines/` | MVP2 业务工作流：群体入场、破冰回流、关系 Field |
| `app/agents/skills/` | 旧 Runtime 每 tick 读取的 Markdown 指引 |
| `app/skills/` | v2 只读、版本化 YAML Skill registry |
| `app/eventing/` | 通用内存事件基础设施 |
| `app/persistence/` | 当前房间链路使用的 SQLite 实现 |
| `app/harness/` | v0 兼容权限 guard；v2 没有启用自进化 |

## 4. Agent 框架

### 4.1 类型化边界

[`app/agents/contracts.py`](app/agents/contracts.py) 定义：

- `EventEnvelope`：已提交的 `meetmind.event.v1` 观察事件。
- `AgentContext`：当前房间、世界、授权事实和可见目标的只读上下文。
- `Intent`：Agent 提出的不可信动作建议。
- `AgentDecision`：Agent 唯一允许返回的结果。
- `Command`：通过策略校验后才能执行的可信命令。

处理顺序如下：

```text
EventEnvelope
  -> AgentRouter 按 subscription 路由
  -> ContextBuilder 注入授权上下文
  -> Agent.handle()
  -> AgentDecision(Intent[])
  -> PolicyEngine
  -> CommandValidator
  -> RoomService.execute()
  -> 新的 committed Events
```

Runtime 对链深、单事件 Intent 数量、超时和重复 intent ID 有硬限制，用于避免反馈循环和无限调用。

### 4.2 当前 Agent 角色

| 角色 | 触发 | 当前作用 | 当前实现状态 |
|---|---|---|---|
| `RoundtableFacilitatorAgent` | `meeting.started`、`meeting.message-requested` | 生成圆桌开场与回应 | 真实 chat provider；失败时报告不可用，不生成 Mock 正文 |
| `IcebreakerHostAgent` | `icebreaker.requested` | 生成并启动破冰内容 | 模板生成，状态机在 RoomService |
| `BulletinComposerAgent` | `meeting.ended` | 生成房间公告 | 模板生成，只基于已提交事件 |
| `PersonAgent` | `person.message-requested` | 人物回复 | 类已定义，但主应用尚未动态注册人物实例 |

旧 [`app/agents/runtime.py`](app/agents/runtime.py) 可调用 chat provider 驱动 v0 咖啡厅行为，失败时回退规则；这与 v2 Intent-only Runtime 不是同一个执行器。

### 4.3 LLM、Tool 和 Skill

- `agents/llm/` 提供 OpenAI 兼容的 chat/vision provider；没有 API key 时走 mock/stub。
- Tool 必须通过 `ToolRegistry` 注册，当前工具是只读查询或内容摘要，不允许直接改房间或事实。
- v2 Skill 从 `app/skills/definitions/*.yaml` 加载，运行时只读。
- LLM 可以生成措辞、议题和摘要，但不能决定事件 sequence、权限、成员资格、距离、计时或胜负。

## 5. 数据与持久化

默认数据根目录为 `backend/data/`，可通过 `ECHO_DATA_DIR` 改写：

```text
data/
├─facts/                    原始媒体、元数据和确认事实；append-only
├─inferences/               AI/人工推断；可重算、可覆盖
├─people/<person_id>/
│  ├─profile.json           版本化人物 Package
│  ├─memory.md              带事实指针的推断记忆
│  └─relations.md           关系索引与互动统计
├─derived/                  Field、头像、人脸裁剪、模型等生成物
└─runtime/mvp2.sqlite3      房间状态、事件和 command receipt
```

数据规则：

- `facts/` 只能新增，已有路径不可覆盖；每个目录维护 `manifest.v1.json` 和 SHA-256。
- `inferences/` 与 `derived/` 必须保留来源引用，并允许在模型升级后重算。
- `person_id` 是人物 Package、Agent、前端实体和硬件归属的稳定关联键，显示名不能作为主键。
- SQLite 使用 WAL，适合单 Uvicorn 进程的现场版；多实例不能直接共享当前内存状态。

## 6. API 概览

完整字段见 [`../docs/API.md`](../docs/API.md)，MVP2 细节见 [`../docs/MVP2-BACKEND.md`](../docs/MVP2-BACKEND.md)。启动后可打开 `http://127.0.0.1:8000/docs`。

### 6.1 v0：采集、Package 与旧世界

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/health` | 服务健康检查 |
| POST | `/api/v0/ingest` | 原始媒体与采集元数据落盘 |
| POST | `/api/v0/pipeline` | once 或 SSE 处理媒体并生成未确认草稿 |
| POST | `/api/v0/confirm` | 人工确认身份并写入人物 Package |
| GET | `/api/v0/packages` | 人物摘要列表 |
| GET | `/api/v0/packages/{person_id}` | 按 viewer 权限读取人物详情 |
| POST | `/api/v0/search` | 姓名、关键词和人脸候选检索；人脸仍为 stub |
| GET | `/api/v0/world/snapshot` | 咖啡厅或大厅纯读快照 |
| GET | `/api/v0/media/{ref}` | 安全读取授权媒体指针 |
| GET | `/api/v0/admin/integrity` | 校验事实文件 manifest 和哈希 |

### 6.2 v1：MVP2 房间与工作流

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/api/v1/rooms` | 创建房间与热点 |
| POST | `/api/v1/rooms/{id}/join` | 成员加入 |
| GET | `/api/v1/rooms/{id}/snapshot` | 获取房间权威快照 |
| POST | `/api/v1/rooms/{id}/commands` | 提交移动、圆桌或破冰命令 |
| GET | `/api/v1/rooms/{id}/events?after_sequence=N` | 断线事件补拉 |
| WS | `/api/v1/rooms/{id}/stream?after_sequence=N` | 有序实时事件流 |
| GET | `/api/v1/rooms/{id}/brief` | 房间晨报 |
| POST | `/api/v1/group-onboarding` | 合照批量识别/建档并进入人工复核 |
| POST | `/api/v1/impressions` | 自评或同伴第一印象 |
| POST | `/api/v1/fields/generations` | 根据来源事实生成可重算关系 Field |
| GET | `/api/v1/scenes/modules` | 查询版本化场景模块 |

客户端可提交的主要房间命令：

```text
member.move              hotspot.interact
meeting.invite           meeting.respond
meeting.start            meeting.end
icebreaker.request       icebreaker.submit
icebreaker.finish
```

`roundtable.propose-topic`、`roundtable.speak`、`roundtable.status`、`bulletin.publish`、
`icebreaker.start` 属于服务端 Agent/系统命令，前端不应直接提交。玩家在进行中的圆桌
发言使用 `meeting.message`，后端会记录原话并触发下一轮模型回应。

## 7. 前端联调

### 7.1 当前状态

- Three.js 咖啡厅优先接入 `/api/v1/rooms`，由 RoomClient 消费 WebSocket 有序事件，
  WebSocket 不可用时降级 HTTP 事件补拉。
- Room v1 成功连接后，圆桌邀请、入座、玩家发言和模型回复都走后端命令/事件；
  不再使用浏览器本地预置台词。
- 后端完全不可达时仍可进入显式离线演示链，画面正常不代表已经连到后端。

因此，联调时应检查画布的 `data-room-source="v1"` 与会议事件，而不是仅凭画面判断。

### 7.2 推荐的本地连接方式

开发环境使用同源 Vite proxy，生产环境使用 Nginx/网关同源反代：

```js
// 仓库根 vite.config.js（待加入前端工程）
export default {
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
};
```

不要在浏览器代码里散落硬编码的 `127.0.0.1:8000`。同源代理可以同时覆盖 HTTP、SSE、媒体和 WebSocket，也不需要开放宽泛 CORS。

### 7.3 v1 前端客户端必须实现

1. 创建/读取房间并加入当前人物。
2. 先 GET snapshot，保存 `sequence`，再连接 `stream?after_sequence=N`。
3. 命令响应和 WebSocket 可能包含同一事件，按 `sequence` 和 `event_id` 去重。
4. 断线后先使用 `/events?after_sequence=N` 补拉，再恢复 WebSocket。
5. `member.move` 应节流提交，不能按 Three.js 每帧写 SQLite。
6. 房间 snapshot 的 `members` 需要显式适配成现有渲染 `agents` DTO。
7. 收到 `meeting.started`、`meeting.topic-proposed`、`bulletin.published` 等事件后再改变 UI，不能先在本地伪造成功。
8. live 模式断线必须显式显示错误，不能静默切回 mock。

WebSocket frame：

```json
{
  "type": "event",
  "protocol": "meetmind.rooms.v1",
  "event": {
    "schema": "meetmind.event.v1",
    "room_id": "demo",
    "sequence": 12,
    "type": "meeting.started",
    "payload": {}
  }
}
```

## 8. 硬件与算法接入

### 8.1 职责划分

```text
眼镜/手机/戒指
  -> 产生带设备时间戳的照片、视频、音频或信号
K3/边缘算法
  -> 时钟校准、质量过滤、人物聚类、去重、授权检查和脱敏
Backend
  -> 可靠落盘、事实指针、处理管线、人工确认、Package 和事件发布
Frontend
  -> 只展示最小化、授权后的 DTO，不接收原始高敏数据
```

Demo 阶段允许手机或服务器代替眼镜/K3，但输出字段和授权语义不能改变。

### 8.2 已实现的采集入口

`POST /api/v0/ingest` 使用 `multipart/form-data`：

| 字段 | 要求 |
|---|---|
| `media` | 一个或多个文件；支持 mp4/mov/m4a/wav/mp3/jpg/jpeg/png/webp；单文件不超过 500MB |
| `captured_at` | 带日期的 ISO 8601 设备采集时间，建议包含时区 |
| `device` | 只能是 `glasses`、`phone` 或 `k3-board` |
| `note` | 可选现场备注 |
| `place_hint` | 可选地点提示 |

PowerShell 示例：

```powershell
curl.exe -X POST http://127.0.0.1:8000/api/v0/ingest `
  -F "media=@D:\capture\encounter.jpg" `
  -F "captured_at=2026-08-04T10:30:00+08:00" `
  -F "device=phone" `
  -F "place_hint=demo-room"
```

成功后返回 `input_id` 和 `facts_refs`。硬件或算法端只保存这些稳定指针，不应自行拼接后端绝对文件路径。

后续处理：

```text
POST /api/v0/pipeline  {input_id, mode:"stream"|"once"}
  -> encounter_draft
  -> 人工确认
POST /api/v0/confirm
  -> person_id + package_ref
```

### 8.3 尚未实现的硬件能力

- 稳定的人脸 embedding 去重与身份识别。
- 视频音轨完整转写和生产级 ASR；当前存在 stub/降级路径。
- 戒指 PPG/HR/HRV/ACC 的正式上传、聚合和实时事件接口。
- 浏览器 `PersonSignal` 的真实后端源；当前前端仍使用演示数据。
- K3 设备认证、断点续传、批次签名和 consent token。

目标信号协议和隐私要求见 [`../docs/PERSON_SIGNAL_PIPELINE.md`](../docs/PERSON_SIGNAL_PIPELINE.md)。在接口落地前，不要把原始连续信号临时塞入房间 event payload。

## 9. 本地运行

推荐 Python 3.11。

### Windows PowerShell

```powershell
cd D:\code\3D-Agent\Meetmind_world\backend
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

也可以使用已有 Conda 环境：

```powershell
conda activate caresagent
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Linux / macOS

```bash
cd backend
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

启动后检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Swagger：<http://127.0.0.1:8000/docs>

### 环境变量

| 变量 | 作用 |
|---|---|
| `CHAT_API_BASE/KEY/MODEL` | 对话、决策和摘要模型 |
| `VISION_API_BASE/KEY/MODEL` | 图片理解和音频能力适配 |
| `LLM_API_BASE/KEY/MODEL` | 旧通用 Provider 兼容配置 |
| `BLENDER_PATH` | Blender 无头可执行文件 |
| `ECHO_DATA_DIR` | 运行期数据根目录 |
| `ECHO_WORLD_HEARTBEAT_SECONDS` | v0 世界推进间隔，默认 15 秒 |
| `ECHO_ENV_FILE` | 指定唯一环境文件 |

没有模型 API key 时服务仍可运行，但会使用 mock/stub/template，不能据此验收真实模型质量。

## 10. 测试与验收

在 `backend/` 下运行：

```powershell
python -m pytest -q
```

MVP2 重点测试：

```powershell
python -m pytest -q tests/test_mvp2_acceptance.py
python -m pytest -q tests/test_rooms_v1.py tests/test_persistence_v2.py
python -m pytest -q tests/test_agent_core_v2.py tests/test_agent_roles_tools.py
```

真实进程验收需要先启动 Uvicorn，再执行：

```powershell
python scripts/mvp2_acceptance.py --base-url http://127.0.0.1:8000
```

成功输出应包含：

- `"status": "PASS"`
- 5 个入场人物
- 有序房间事件
- 5 条破冰记忆更新
- Field generation ID

验收脚本使用的微型合成图片不含真实人脸，因此 `group_photo_status: needs-review` 是预期结果。

## 11. 当前限制与生产化前置条件

- 当前只适合单 Uvicorn 进程现场演示；多实例需要 PostgreSQL 事务/outbox 与 Redis presence/pub-sub。
- v1 房间没有登录和 room token，`actor_id` 仍由客户端提交；不要直接暴露到公网。
- 公共命令入口与 Agent 内部系统命令还需要进一步隔离和鉴权。
- Three.js 已接入 v1 房间/WebSocket，但完全离线时仍可能显示 v0 或 mock 世界。
- v2 圆桌已形成真实模型消息闭环；未配置 chat provider 时会保持安静并报告不可用。
- SQLite 事件和房间快照目前不是同一个数据库事务提交，多实例前需要重构一致性边界。
- OpenCV 是可选裁剪能力，不等于可靠身份识别，最终 `person_id` 绑定必须人工确认。
- Field 当前输出版本化环境参数 JSON，尚未生成最终 Three.js 场景资产。
- `harness` 和自进化没有接入 v2；Policy、Skill 和 Tool 均由代码评审管理。

## 12. 相关文档

- [`../docs/API.md`](../docs/API.md)：完整 HTTP/事件契约。
- [`../docs/MVP2-BACKEND.md`](../docs/MVP2-BACKEND.md)：MVP2 Agent 与现场房间验收。
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)：系统目标架构与 ADR。
- [`../docs/CONTEXT-AND-MEMORY.md`](../docs/CONTEXT-AND-MEMORY.md)：事实、推断与记忆边界。
- [`../docs/PERSON_SIGNAL_PIPELINE.md`](../docs/PERSON_SIGNAL_PIPELINE.md)：眼镜、K3、戒指和 PersonSignal 链路。
- [`../docs/PHOTO_CHARACTER_PIPELINES.md`](../docs/PHOTO_CHARACTER_PIPELINES.md)：照片到人物资产的上下游契约。
- [`../docs/ART-BRIEF.md`](../docs/ART-BRIEF.md)：人物和场景资产规范。
- [`../docs/TEAM_WORKSTREAMS.md`](../docs/TEAM_WORKSTREAMS.md)：前端、后端、算法、硬件分工。
