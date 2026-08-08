# Agent 运行时与架构（2026-08-06 梳理）

本文回答一个问题：世界里的 Agent 此刻"为什么在这么做"，由哪段代码决定。

## 总览：三条并存的 Agent 驱动线

| 线 | 世界 | 权威 | 节拍 | 用途 |
| --- | --- | --- | --- | --- |
| legacy cafe world | `?world=cafe`（降级路径） | `world/service.py` + `agents/runtime.py` | 15s 心跳 | 旧咖啡厅世界；v1 房间激活时**冻结**（见 scheduler） |
| hall（广场） | `?world=hall`（默认） | `world/hall.py`（布局）+ `agents/hall_runtime.py`（串门） | 每 4 个心跳一次 | 广场站位 + 有理由的稀疏串门 |
| v1 rooms | `?world=cafe`（线上路径） | `domain/rooms/service.py` + `agents/room_conductor.py` + `agents/room_autonomy.py` | 15s 心跳 | 咖啡厅真人房间：入座/交谈/会议/对话 |

前端两条消费通道：`LiveWorld` 轮询 `/api/v0/world/snapshot`（legacy/hall），
`CafeRoomClient`（WS 事件 + 6s 快照轮询，v1 房间）。咖啡厅里房间快照优先于
legacy 快照（`applyLiveSnapshot` → `applyRoomSnapshot`）。

## v1 房间（当前线上咖啡厅）的三个角色

- **RoomService（机制）**：房间状态、事件顺序、命令幂等、会议规则的**唯一权威**。
  状态持久化在 `data/runtime/mvp2.sqlite3`，重启后完整恢复。
- **RoomConductor（行为策略）**：每个心跳读快照、推进每个 NPC 的"意图"
  （seated 60% / visit 22% / wander 18%，粘性 2-16 tick），产出走位/状态计划，
  由 `RoomService.apply_conductor_plan` 原子落地。职责边界：**让人处于符合
  常识的位置与状态**（大部分围桌入座、同桌 ≥2 人自动"交谈中"、会议时与会者
  真的走到圆桌座位、会议超 10 分钟自动散会）。人类成员（不在 agent_runtime
  里的 member）永远不被指挥。
- **RoomAutonomyService + PersonAgent（语言）**：每心跳激活一个 NPC 走
  Agent 边界（ContextBuilder 授权视图 → PersonAgent → coordinator），
  产出对话/记忆类事件。座位几何与碰撞与前端同源（`world/tables.py` ↔
  `CafeLayout.js`，改动必须两边同步）。

会议生命周期：`meeting.invite`（Agent 成员**即时自动应邀**并走向圆桌站位环
——MVP 产品决策，应邀不阻塞用户发起的会议）→ `meeting.start`（要求全员在
hotspot 内）→ `meeting.start` 触发 RoundtableFacilitatorAgent 调用真实 chat provider
→ `meeting.message-created` 有序回流；玩家发言走 `meeting.message`，并触发下一轮模型
回应 → `meeting.end` 或 conductor TTL 散会。模型不可用时只发
`meeting.generation-unavailable` 状态事件，禁止模板冒充讨论正文。stale meeting 不再
可能锁死圆桌（409 修复，2026-08-06）。

## 广场（hall）的哲学：无增量信息不演化

`hall_runtime` 每 tick 只有 1/8 概率触发一场"串门"，且配对**必须有理由**
（推断 tags 交集或 relations.md 关联），找不到就保持安静。对话过"信息量闸门"
（LLM 判定 informative=false 则取消）。这是刻意的产品哲学，不是 bug；
要提高活跃度请先改产品决策，不要直接调频率。

## 记忆与授权

- 事实层只增不改（K3 Package → facts/ 归档）；推断层带原始事实指针 + 置信度。
- K3 人物默认 L1（仅自己可见）；资料包"Agent 记忆"开关升级 L2 后，
  摘要/话题/长期记忆才进入 PersonAgent 上下文（`authorized_agent_view`）。
- 注销（DELETE /api/v0/packages/{id}）是软删除：世界/名册/房间移除，事实保留。

## 前端渲染

快照/房间状态 → `liveTargets`（位置 + state + seat）→ 插值移动 +
`CharacterSystem` 动作状态机（Idle/Walk/Talk/Sit…）。座位由后端 conductor
写入 `agent_runtime[*].seat.node`，前端映射回 `CAFE_LAYOUT` 锚点播放坐姿。
名牌行为行（"在桌边小坐/与人交谈/圆桌会议中"）由 `HeartSignalSystem.setActivity`
驱动，是观察 Agent 意图的第一入口。
