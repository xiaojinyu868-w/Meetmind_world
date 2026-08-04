# EchoWorld 对外接口契约（API v0 + MVP2 v1）

> 地位：前后端之间的**唯一契约**。开发顺序为**先前端、后后端**：前端先用 mock 数据把效果做出来并对齐，后端再按本契约实现到一致。契约变更 = 改本文件 + 版本号递进 + 变更记录，不接受口头变更。
>
> 对应架构：ARCHITECTURE.md（分层）、CONTEXT-AND-MEMORY.md（事实/推断、权限圈层）。

## 接口地图（按产品闭环排列，IF = Interface 组）

一次完整闭环：`IF-1 输入 → IF-2 处理（pipeline）→ IF-3 确认 → IF-5 检索/查看`；世界渲染持续走 `IF-4`；MVP2 增加 `IF-6 互动 / IF-7 推送与回填 / IF-8 现场群体房间`。

| 组 | 接口 | 阶段 | 职责 |
|---|---|---|---|
| IF-1 | `POST /api/v0/ingest` | MVP1 | 输入：接收视频/音频数据（眼镜/手机/K3 开发板） |
| IF-2 | `POST /api/v0/pipeline` | MVP1 | 处理：预处理 + 流式产出中间特征 → 相遇草稿 |
| IF-3 | `POST /api/v0/confirm` | MVP1 | 确认：用户确认人物身份绑定（FR-1.3） |
| IF-4 | `GET /api/v0/world/snapshot` | MVP1 | 世界：快照 `echo-snapshot.v1`，前端唯一渲染数据源 |
| IF-5 | `GET /api/v0/packages/...` `POST /api/v0/search` | MVP1 | 资料包查看 + 人脸/姓名/关键词检索（FR-1.8/1.9） |
| IF-6 | `POST /api/v0/agents/meeting` 等（预留）；`/api/v1/rooms/...` | MVP2 | 互动：圆桌、Agent 事件流；v1 现场房间、热点、破冰、有序事件/WebSocket（目标架构，docs/MVP2-BACKEND.md） |
| IF-7 | `GET /api/v0/notifications` `POST /api/v0/feedback` `POST /api/v0/refill`（预留）；`/api/v1/group-onboarding` `/impressions` `/fields/generations` | MVP2 | 推送与回填（暂缓）；v1 群体冷启动、数据回流、关系场域生成 |
| IF-8 | `/api/v0/group/sessions/...` | MVP2 | 现场房间 v0 过渡实现：位置同步、第一印象互写、"谁写的？"破冰游戏（服务当前前端，v1 成熟后迁移） |
| IF-9 | `/api/v0/fields/...` `/api/v0/world/events` | MVP2 | 关系场域 `echo-field.v1`、空间互动事件与世界晨报 |
| IF-10 | 授权/组织/网络接口 | MVP3 | 本人确认、权限级别变更、组织空间、网络互联（届时另立详节） |

设计要点：

- **IF-1 与 IF-2 分离**：输入可能长时间持续（眼镜常开），处理按需触发；输入只管可靠落盘（事实层，只增不改），处理只管从事实层提取特征。
- **中间特征是一等公民**：IF-2 不只产出最终结果，还有关键帧、人脸候选、转写片段——前端用它们做实时反馈（"拍到了谁、正在识别什么"），它们也是推断层数据的来源指针。
- **人物身份与相遇事实写入必须经过 IF-3 用户确认**（P-3：事实层只能由采集管线 + 用户确认写入）；IF-8 的现场文字与游戏结果只进入可重算推断层，并强制记录作者和房间来源。

---

## IF-1 输入接口 `POST /api/v0/ingest`

接收一段视频/音频输入。数据落盘即只读。

### 请求（multipart/form-data）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `media` | file[] | 是 | 视频（mp4/mov）或音频（m4a/wav/mp3），可多文件 |
| `captured_at` | ISO8601 | 是 | 采集时间（设备本地时间） |
| `device` | string | 是 | `glasses` / `phone` / `k3-board`（预留） |
| `note` | string | 否 | 用户手动备注（"黑客松 3 号展位"） |
| `place_hint` | string | 否 | 地点提示 |

### 响应 `201`

```jsonc
{
  "input_id": "in_01JXXX",
  "facts_refs": ["facts/2026-08-03/in_01JXXX/clip.mp4"],
  "status": "stored"          // stored = 已落盘，未处理
}
```

错误：`400` 格式不支持 / `413` 超限（MVP：单文件 ≤ 500MB）。

## IF-2 处理接口「pipeline」`POST /api/v0/pipeline`

对一次输入（或进行中的输入）启动处理，**流式返回中间特征与最终结果**。

### 请求（application/json）

```jsonc
{
  "input_id": "in_01JXXX",    // 必填，来自 IF-1
  "mode": "stream",           // stream=SSE 流式（默认）| once=处理完一次性返回
  "steps": ["preprocess", "faces", "transcript", "scene", "draft"]  // 可选，默认全量
}
```

### 响应（SSE 事件序列，`mode=stream`）

```
event: progress  data: {"step":"preprocess","status":"done","keyframes":["facts/.../kf_01.jpg"]}
event: progress  data: {"step":"faces","status":"done","face_candidates":[{"face_ref":"facts/.../face_0.jpg","confidence":0.91,"match_person_id":null}]}
event: progress  data: {"step":"transcript","status":"done","transcript_ref":"facts/.../transcript.v1.md","summary_draft":"...(推断层,待确认)"}
event: progress  data: {"step":"scene","status":"done","scene_tags":["booth","demo-pitch"],"photos":["facts/.../booth.jpg"]}
event: result    data: {"encounter_draft": { ... echo-package.v0 的 encounter 结构, "identity.confirmed": false ... }}
```

- `match_person_id`：人脸匹配到已有 Package 时给出（老朋友），否则 `null`（新人）。
- 最终 `encounter_draft` **永远是未确认状态**，必须走 IF-3 才写入 Package。
- 所有 `*_ref` 为事实层指针；`summary_draft`、`scene_tags` 属推断层，入库时补模型版本与置信度。
- `mode=once`：全部完成后一次性返回合并 JSON（`200`）。

## IF-3 确认接口 `POST /api/v0/confirm`

用户对「pipeline」产出的草稿做确认/修正，确认后才写入 Package（FR-1.3）。

```jsonc
// 请求
{
  "encounter_draft": { ... },              // IF-2 的草稿（可被用户编辑过）
  "identity": { "name": "陈某", "match_person_id": null },  // null=新建 Person，否则并入已有
  "privacy": "self-only"                   // 默认 L1
}
// 响应 200
{ "person_id": "person_01JXXX", "encounter_id": "enc_01", "package_ref": "people/person_01JXXX/profile.json", "avatar_status": "placeholder", "booth_id": "booth_person_01JXXX", "field_status": "ready" }
```

- `avatar_status`: `placeholder`（占位模型）| `queued`（生成管线排队中）| `ready`（per-person 模型已生成）。

## IF-4 世界接口 `GET /api/v0/world/snapshot`

返回 `echo-snapshot.v1`（见 ARCHITECTURE.md §4）。MVP1 前端轮询（咖啡厅 2s / 大厅 10s）；MVP2 评估 SSE。资料包内容不走快照，由 IF-5 按权限单独拉取。

参数（v0.3 加性）：

- `?world=hall|cafe`（默认 cafe）：`hall` = 展位大厅快照——agents 只含 `at-booth` 站位（位置=展位锚点），`events` 恒为空数组；modules 含 booth 条目（见下）。`cafe` = 活的世界（现状）。
- 默认纯读；世界由服务端稀疏 heartbeat 推进。`?advance=1` 仅为旧客户端和测试保留。

booth module 结构（快照 modules 内，`type: "booth"`）：

```jsonc
{ "id": "booth_lin-che", "type": "booth", "person_id": "lin-che",
  "position": { "x": 0, "z": -4.2, "yaw": 0 },
  "display": { "name": "林澈", "headline": "一句话身份", "face_ref": "facts/.../face.png",
               "photos": ["facts/.../scene_01.png"], "tags": ["咖啡"] } }
  // display.tags/photos 只取 privacy ≥ agent-usable 的内容（L1 不上墙）
```

媒体文件服务（v0.3 加性）：`GET /api/v0/media/{ref}` —— 事实层文件（face_ref/photos 等指针）的 HTTP 出口，路径穿越防护 + 扩展名白名单。

## IF-5 资料包与检索接口

### `GET /api/v0/packages` — 列表（按 `viewer` 权限过滤字段）
### `GET /api/v0/packages/{person_id}` — 单个资料包（事实指针 + 推断视图）
### `POST /api/v0/search` — 检索（FR-1.9）

```jsonc
// 请求（三种方式互斥）
{ "by": "face",  "photo": "<base64>" }
{ "by": "name",  "query": "陈" }
{ "by": "keyword", "query": "教育 投资" }
// 响应 200
{ "results": [ { "person_id": "person_01JXXX", "name": "陈某", "score": 0.93, "last_encounter": { "time": "...", "place": "..." } } ] }
```

## IF-6 现场房间与 Agent 互动（MVP2 `/api/v1`）

- `POST /api/v1/rooms`：创建房间和热点。
- `POST /api/v1/rooms/{room_id}/join`：成员进入。
- `GET /api/v1/rooms/{room_id}/snapshot`：纯读当前状态。
- `POST /api/v1/rooms/{room_id}/commands`：提交带 `command_id` 的幂等命令。
- `GET /api/v1/rooms/{room_id}/events?after_sequence=N`：断线补拉。
- `WS /api/v1/rooms/{room_id}/stream?after_sequence=N`：实时有序事件。
- `GET /api/v1/rooms/{room_id}/brief`：从已提交语义事件生成晨报。

事件统一为 `meetmind.event.v1`，至少包含 `event_id / room_id / sequence / type /
actor_id / command_id / payload / occurred_at / correlation_id / causation_id`。

客户端命令：`member.move`、`hotspot.interact`、`meeting.invite`、
`meeting.respond`、`meeting.start`、`meeting.end`、`icebreaker.request`、
`icebreaker.submit`、`icebreaker.finish`。Agent 只能提出 Intent；主持议题、破冰启动和
播报在 Policy/CommandValidator 校验后才由 RoomService 执行。

## IF-7 群体冷启动、回流与场域（MVP2 `/api/v1`）

- `POST /api/v1/group-onboarding`：multipart 合照、姓名数组、预期人数和确认标志；
  返回独立 `person_id`、bbox/face_ref、程序化 voxel 状态和人工复核状态。
- `POST /api/v1/impressions`：自评/互评；原始提交进入 facts，推断记录保留作者和来源。
- `POST /api/v1/fields/generations`：共同事实 + 关系备注映射为版本化、可重算 Field。
- `GET /api/v1/scenes/modules`：市集、摊位、咖啡厅、Field 的模块挂载契约。

详细请求、测试和限制见 `MVP2-BACKEND.md`。

## IF-8 现场群体房间（MVP2）

现场房间使用独立的 `echo-group-room.v1` 状态权威，不修改 `echo-snapshot.v1`。首版面向同一场地部署，以约 700ms 的房间轮询和带单调 `seq` 的位置上报验证多设备协作；这不是云端联机协议，见 ARCHITECTURE.md ADR-7 / TBD-ARCH-4。

本组接口只消费上游已建档的参与者 DTO（`person_id / display_name / avatar_ref`）。照片分割、人脸匹配、人物贴图、音视频处理及其上下文抽取均不在 IF-8 内。

### 房间与位置

```jsonc
// POST /api/v0/group/sessions
{
  "title": "周五工作坊",
  "host": {"person_id": "p1", "display_name": "小满", "avatar_ref": "assets/p1.glb"},
  "participants": [
    {"person_id": "p2", "display_name": "阿澄", "avatar_ref": "assets/p2.glb"}
  ]
}

// POST /api/v0/group/sessions/join
{"code": "7KQ9FM", "participant": {"person_id": "p3", "display_name": "柏舟"}}

// PUT /api/v0/group/sessions/{session_id}/presence
{"person_id": "p1", "seq": 1740000000001, "position": {"x": 1.2, "z": -0.8, "yaw": 0.4}}
```

- `GET /api/v0/group/sessions/{session_id}?viewer_id=p1` 返回观察者视角房间快照。
- 位置限制在现场空间 `x ∈ [-7, 7] / z ∈ [-5, 5]`；旧 `seq` 返回 `409`，避免乱序包把玩家拉回旧位置。
- 返回 `participants[].avatar_ref` 仅是上游授权资源引用，服务不读取或加工其内容。

### 第一印象

```jsonc
// PUT /api/v0/group/sessions/{session_id}/impressions/batch
{
  "author_id": "p1",
  "impressions": [
    {"subject_id": "p1", "value": "会先听完再给判断"},
    {"subject_id": "p2", "value": "安静，但总能照顾到别人"}
  ]
}
```

每个作者必须提交 `1 条自评 + 每位同伴 1 条互评`。落盘为 `echo-group-impression.v1`，包含 `author_id / subject_id / kind / source.session_id / created_at`；重复的作者-对象组合返回 `409`，不可静默覆盖。

### “谁写的？”

- `POST /api/v0/group/sessions/{session_id}/game/start`：房主在全部印象收齐后开始。
- `POST /api/v0/group/sessions/{session_id}/game/guess`：轮到的参与者猜一条关于自己的印象由谁写下。
- `POST /api/v0/group/sessions/{session_id}/game/next`：房主在答案揭晓后推进。
- 作答前的 `current_round` 不包含 `author_id`；作答后才揭晓。游戏结束写入每人的 `echo-group-game-result.v1`，并在房间 `events` 产生可见 `game-finished` 事件。

## IF-9 关系场域与世界事件（MVP2）

本组接口只消费已确认 Package、关系记录、第一印象等授权 DTO。照片、人脸、贴图与音视频上下文的提取由上游工作流负责。

- `GET /api/v0/fields/{person_id}`：读取或生成 `echo-field.v1`。产物位于推断层，包含 `generated_from / model / regenerable`、艺术参数与 4 类互动实体。
- `POST /api/v0/fields/{person_id}/regenerate`：从现有来源重算场域，不修改 facts。
- `GET /api/v0/world/events?limit=20`：读取最近的 `echo-world-event.v1` 持久化事件。
- `GET /api/v0/world/brief`：返回 `echo-world-brief.v1` 晨报摘要。
- `POST /api/v0/world/interactions`：记录场景行为；类型白名单包含摊位查看、邀请、咖啡、圆桌开始/结束、共同记忆与场域触发。

```jsonc
// POST /api/v0/world/interactions
{
  "type": "meeting-started",
  "summary": "你邀请谢淯琪在中央圆桌坐下",
  "person_ids": ["lin-che"],
  "source": "scene-interaction",
  "payload": {"table_id": "roundtable-six"}
}
```

事件使用 append-only JSONL 保存，服务重启后仍可生成晨报；用户输入文本只通过 `textContent` 渲染到 DOM。

## 前端 mock 约定（先前端阶段）

- mock 数据放 `public/data/mock/`：`ingest.response.json`、`pipeline.stream.jsonl`（按行模拟 SSE 事件，前端定时器逐条播放模拟流式）、`snapshot.demo.json`、`packages.demo.json`、`search.demo.json`。
- 前端 mock 只准消费本契约字段；对齐效果后，后端实现到"前端零改动切 baseURL 即可用"。
- mock 场景素材两条核心路径：黑客松展位（新人，`match_person_id: null`）+ 老朋友重逢（非空）。

## 版本与兼容

- 路径带主版本 `/api/v0/`；契约内字段只增不改，破坏性变更升 `/api/v1/`。
- 与 schema 版本（`echo-package.v0`、`echo-snapshot.v1`）独立演进。

## 变更记录

- 2026-08-03 | v0：定义输入/处理接口与 mock 约定 | 人（接口定义）+ AI（成文）
- 2026-08-03 | v0.1：扩展为全量接口地图（IF-1~IF-8，按 MVP 阶段分组），IF-1~IF-5 出详节，IF-6/7/8 先行登记 | 人（指正接口不止两个）+ AI（补全）
- 2026-08-03 | v0.2：IF-2 接口更名为 `pipeline`（原 paipai 为语音转写错误） | 人 + AI
- 2026-08-03 | v0.3（加性）：IF-4 增加 `?world=hall|cafe` 参数与 booth module 结构；新增媒体路由 `GET /api/v0/media/{ref}`；IF-3 confirm 响应增加 `booth_id` | AI
- 2026-08-04 | v0.4（加性）：原预留授权/组织接口顺延为 IF-9；IF-8 落地现场房间、第一印象与“谁写的？”协议，明确只消费上游参与者/资产 DTO，不处理视觉与音视频 | 人（边界）+ AI（实现）
- 2026-08-04 | v0.5（加性）：授权/组织接口顺延为 IF-10；新增 IF-9 `echo-field.v1` 关系场域、持久化世界事件与晨报；confirm 响应增加 `field_status` | AI
- 2026-08-03 | v1：现场房间、WebSocket、Agent Intent/Command、圆桌/破冰、合照入场、第一印象、Field 和场景模块契约落地 | AI
- 2026-08-04 | 合并 codex/agent 两线：IF-6/7 同时登记 v0 预留项与 v1 rooms/group-onboarding 目标架构，IF-8 标注为 v0 过渡实现；v0 快照改为纯读（advance 默认 0，tick 由服务端 scheduler 心跳推进，advance=1 仅兼容旧客户端） | AI
- 2026-08-04 | 行为变更（契约不变）：IF-9 关系场域生成升级为 LLM 艺术化映射（chat provider 把关系材料译为诗意空间参数，model 记为实际模型名）；provider 未配置或输出不合规时回退确定性规则模板（model="relationship-field-rules.v1"），echo-field.v1 schema 与缓存/regenerate 语义不变 | AI
