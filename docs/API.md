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
| IF-5 | `GET /api/v0/packages/...` `PATCH .../privacy` `GET /api/v0/people/.../signal` `POST /api/v0/search` | MVP1 | 资料包查看、L1/L2 Agent 授权、生理聚合 + 检索（FR-1.8/1.9） |
| IF-6 | `POST /api/v0/agents/meeting` 等（预留）；`/api/v1/rooms/...` | MVP2 | 互动：圆桌、Agent 事件流；v1 现场房间、热点、破冰、有序事件/WebSocket（目标架构，docs/MVP2-BACKEND.md） |
| IF-7 | `GET /api/v0/notifications` `POST /api/v0/feedback` `POST /api/v0/refill`（预留）；`/api/v1/group-onboarding` `/impressions` `/fields/generations` | MVP2 | 推送与回填（暂缓）；v1 群体冷启动、数据回流、关系场域生成 |
| IF-8 | `/api/v0/group/sessions/...` | MVP2 | 现场房间 v0 过渡实现：位置同步、第一印象互写、"谁写的？"破冰游戏（服务当前前端，v1 成熟后迁移） |
| IF-9 | `/api/v0/fields/...` `/api/v0/world/events` | MVP2 | 关系场域 `echo-field.v1`、空间互动事件与世界晨报 |
| IF-10 | 授权/组织/网络接口 | MVP3 | 本人确认、权限级别变更、组织空间、网络互联（届时另立详节） |
| IF-K3 | `PUT /v1/physical-ai/assets/{object_id}` `POST /v1/physical-ai/packages` | MVP1 实机联调 | K3 Context Hub 内容寻址媒体上传、Agent package 幂等接收与世界入库 |

设计要点：

- **IF-1 与 IF-2 分离**：输入可能长时间持续（眼镜常开），处理按需触发；输入只管可靠落盘（事实层，只增不改），处理只管从事实层提取特征。
- **中间特征是一等公民**：IF-2 不只产出最终结果，还有关键帧、人脸候选、转写片段——前端用它们做实时反馈（"拍到了谁、正在识别什么"），它们也是推断层数据的来源指针。
- **人物身份与相遇事实写入必须经过 IF-3 用户确认**（P-3：事实层只能由采集管线 + 用户确认写入）；IF-8 的现场文字与游戏结果只进入可重算推断层，并强制记录作者和房间来源。
- **K3 是已确认身份的上游采集管线**：IF-K3 只把带全局 `person_id`、姓名且身份状态为 `confirmed|resolved` 的人物注册进世界；未确认人物仅保留原始事实。媒体必须先 PUT，package 后 POST，重复提交按幂等键去重。完整部署与验收见 `K3-SERVER-INTEGRATION.md`。

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

媒体文件服务（v0.3 加性）：`GET /api/v0/media/{ref}` —— 事实层图片/音视频/Markdown与派生 GLB/PNG 的 HTTP 出口，路径穿越防护 + 扩展名白名单；原始 package JSON、embedding 和 Ring 样本不经此路由公开。

## IF-5 资料包与检索接口

- `GET /api/v0/packages`：列表（按 `viewer` 权限过滤字段）。
- `GET /api/v0/packages/{person_id}`：单个资料包（事实指针 + 推断视图）。

### `POST /api/v0/search` — 检索（FR-1.9）

```jsonc
// 请求（三种方式互斥）
{ "by": "face",  "photo": "<base64>" }
{ "by": "name",  "query": "陈" }
{ "by": "keyword", "query": "教育 投资" }
// 响应 200
{ "results": [ { "person_id": "person_01JXXX", "name": "陈某", "score": 0.93, "last_encounter": { "time": "...", "place": "..." } } ] }
```

### `PATCH /api/v0/packages/{person_id}/encounters/{encounter_id}/privacy`

可信单机下由资料所有者在 `self-only` 与 `agent-usable` 间切换。只有 L2 相遇的推断、
地点和带事实指针的 `memory.md` 条目能进入 PersonAgent 上下文。

### `GET /api/v0/people/{person_id}/signal`

返回 `person-signal.v1` 聚合 DTO。K3 Ring 原始样本归佩戴者并留在会话事实层；接口只
返回心率摘要、趋势、非因果解释、置信度与审计 ID，缺数据返回 `404`。

## IF-6 现场房间与 Agent 互动（MVP2 `/api/v1`）

- `POST /api/v1/rooms`：创建房间和热点。
- `POST /api/v1/rooms/{room_id}/join`：成员进入。
- `GET /api/v1/rooms/{room_id}/snapshot`：纯读当前状态。
- `POST /api/v1/rooms/{room_id}/commands`：提交带 `command_id` 的幂等命令。
- `GET /api/v1/rooms/{room_id}/events?after_sequence=N`：断线补拉。
- `WS /api/v1/rooms/{room_id}/stream?after_sequence=N`：实时有序事件。
- `GET /api/v1/rooms/{room_id}/brief`：从已提交语义事件生成晨报。

`meetmind.room-snapshot.v1` 除成员、热点、会议、破冰和播报外，还包含：

- `conversations[]`：参与者、状态、最近消息和最多 40 条有序消息。
- `relationships[]`：可观察的互动轮数、共同会议次数与最后事件序号，不输出虚构的情感分。
- `agent_runtime[]`：PersonAgent 当前目标、状态、最近动作与目标人物。

前端可提交 `person.message`，但 `agent.visit`、`agent.talk` 和 Agent 的
`meeting.respond` 只能由服务端 Intent -> Policy -> Command 链生成。可信单机前端
固定使用当前玩家 `actor_id`，不再替 NPC 发送命令。

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

### 合照入场两段式（FR-2.12，v1.1 加性）

一次性 `POST /api/v1/group-onboarding` 保留给脚本/批处理；交互式前端走两段式：

**第一段「认脸」`POST /api/v1/group-onboarding/detect`（multipart/form-data，201）**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `photo` | file | 是 | 合照（JPEG/PNG/WebP，≤25MB），落事实层只增不改 |
| `expected_count` | int | 否 | 预期人数（0 = 不限，仅用于提示不一致） |

```jsonc
{
  "schema": "meetmind.group-detection.v1",
  "group_id": "group_1735..._ab12cd",
  "status": "ready",               // ready | needs-review（没检到人脸）
  "source_ref": "facts/2026-08-04/group_.../group.jpg",
  "detector": "qwen-vl",           // qwen-vl | opencv | none（降级链：qwen-vl → OpenCV → 人工）
  "detected_count": 5,
  "faces": [
    { "face_id": "face_01",
      "bbox": { "x": 0.167, "y": 0.389, "width": 0.122, "height": 0.225 },  // 归一化 xywh
      "face_ref": "derived/group-faces/group_.../face_01.jpg" }
  ],
  "issues": []
}
```

- 检测阶段**不创建任何 Package**；人脸裁剪存生成物层（derived），经 `GET /api/v0/media/{ref}` 可取。
- 检测器只框前景主要人物：提示词约束 + 最小尺寸过滤丢弃背景路人。

**第二段「确认入场」`POST /api/v1/group-onboarding/confirm`（application/json，201）**

```jsonc
// 请求
{
  "group_id": "group_1735..._ab12cd",
  "assignments": [
    { "face_id": "face_01", "name": "小满", "impression": "会先把问题问清楚" }  // impression 可选
    // 也接受 face_ref 或 bbox（近似匹配）替代 face_id
  ]
}
// 响应 201：schema meetmind.group-onboarding.v1，与一次性接口同形
{ "status": "ready", "participants": [
    { "person_id": "person_...", "name": "小满", "confirmed": true,
      "face_ref": "derived/group-faces/...", "booth_id": "booth_person_...",
      "avatar_status": "ready" } ] }
```

- 确认后才批量建档（`identity.confirmed=true`）并注册展位大厅；下一轮 `IF-4 ?world=hall`
  快照即携带新 booth 与 `at-booth` agent，前端免刷新可见。
- `impression` 写入第一印象推断（`human-authored.v1`，confidence 1.0，privacy self-only，
  source 指回合照事实），同时进 inferences 目录与 encounter 推断（展位 tags 来源）。
- 错误：`404` 未知 group_id（须先 detect）；`415/400/413/422` 同一次性接口。

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
- `GET /api/v0/group/sessions/by-code/{code}` 返回加入前的公开名册预览（同一快照结构，`participants[].online` 标记占用状态，不刷新任何 `last_seen`）。
- 身份认领：加入时 `person_id` 对应参与者在线（presence TTL 内）返回 `409 该身份已被占用`；离线则允许回收（设备重连/换机）。新参与者加入仍受"第一印象开始后锁名单"约束。
- 位置限制与大厅世界边界同源（`world/hall.py` HALL_BOUNDS：`x ∈ [-5.5, 5.5] / z ∈ [-10.5, 10.5]`）；旧 `seq` 返回 `409`，避免乱序包把玩家拉回旧位置。
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

## 前端 mock 约定（离线演示）

- mock 数据放 `public/data/mock/`：`ingest.response.json`、`pipeline.stream.jsonl`（按行模拟 SSE 事件，前端定时器逐条播放模拟流式）、`snapshot.demo.json`、`packages.demo.json`、`search.demo.json`、`group-onboarding.detect.demo.json` / `group-onboarding.register.demo.json`（合照入场两段式，face_ref 复用现有 portraits 资产）。
- 前端 mock 只准消费本契约字段；对齐效果后，后端实现到"前端零改动切 baseURL 即可用"。
- mock 场景素材两条核心路径：黑客松展位（新人，`match_person_id: null`）+ 老朋友重逢（非空）。
- 前端默认连接真实后端；只有显式添加 `?api=mock` 才加载上述静态数据。

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
- 2026-08-04 | v1.1（加性）：IF-7 合照入场拆为两段式 `group-onboarding/detect` + `group-onboarding/confirm`（检测不建档、确认才批量建档+注册展位，支持逐脸 impression 推断）；一次性接口保留；人脸检测器升级为 qwen-vl 优先、OpenCV 兜底 | AI
- 2026-08-04 | 合并 codex/agent 两线：IF-6/7 同时登记 v0 预留项与 v1 rooms/group-onboarding 目标架构，IF-8 标注为 v0 过渡实现；v0 快照改为纯读（advance 默认 0，tick 由服务端 scheduler 心跳推进，advance=1 仅兼容旧客户端） | AI
- 2026-08-04 | 行为变更（契约不变）：IF-9 关系场域生成升级为 LLM 艺术化映射（chat provider 把关系材料译为诗意空间参数，model 记为实际模型名）；provider 未配置或输出不合规时回退确定性规则模板（model="relationship-field-rules.v1"），echo-field.v1 schema 与缓存/regenerate 语义不变 | AI
- 2026-08-04 | 新增 IF-K3：实现 K3 Context Hub 媒体内容寻址上传、Bearer 鉴权、Agent package 校验与幂等接收；已确认人物导入 Package/大厅，前端改为默认真实 API | AI
