# MVP2 后端 Agent 框架与验收

## 已落地范围

本实现采用“确定性事件内核 + 受限 Agent 决策层”。Agent 只返回 `Intent`；
`PolicyEngine + CommandValidator` 将其转换为可信 `Command`，最终由房间、会议、
游戏等确定性服务修改状态。

```text
HTTP/WS command
  -> RoomService（距离、成员、会议/游戏状态机、幂等）
  -> meetmind.event.v1 + SQLite EventStore
  -> ContextBuilder
  -> Roundtable / Icebreaker / Bulletin Agent
  -> Intent
  -> PolicyEngine + CommandValidator
  -> RoomService
  -> 有序事件重放 / WebSocket / Room snapshot
```

已实现：

- 类型化 `EventEnvelope / AgentContext / Intent / AgentDecision / Command`。
- 每房间严格递增 sequence、command_id 幂等、因果链深度和 Agent 调用预算。
- SQLite WAL 事件、房间状态和 command receipt 持久化，进程重启后恢复。
- 热点距离/动作校验、邀请回应、圆桌开始/结束、Agent 议题和世界播报。
- 现场房间 HTTP + WebSocket cursor replay。
- 合照上传、OpenCV 可选人脸裁剪、人工确认兜底、最多 50 人批量建档。
- 第一印象事实/推断分层、作者和事实来源指针。
- 破冰请求、Host Agent、提交/结束状态机、互动数据回流和播报。
- 可重算、带来源和模型元数据的 `meetmind-field.v1` 场域参数。
- 市集、摊位、咖啡厅、关系场域的 `meetmind.scene-module.v1` 挂载契约。
- 服务端稀疏 heartbeat；v0 快照默认纯读，`advance=1` 仅保留兼容。

`harness` 和自进化没有接入 v2。现有旧版 `harness/` 只服务 v0 兼容 runtime；
v2 权限统一位于 `security/policy.py`，Agent 无权修改 Skill、Tool、Policy 或代码。

## API v1

| 方法 | 路径 | 作用 |
|---|---|---|
| POST | `/api/v1/rooms` | 创建现场房间与热点 |
| POST | `/api/v1/rooms/{id}/join` | 成员加入 |
| GET | `/api/v1/rooms/{id}/snapshot` | 纯读房间快照 |
| POST | `/api/v1/rooms/{id}/commands` | 位置、热点、会议、破冰命令 |
| GET | `/api/v1/rooms/{id}/events?after_sequence=N` | 断线补拉 |
| WS | `/api/v1/rooms/{id}/stream?after_sequence=N` | 有序事件流 |
| GET | `/api/v1/rooms/{id}/brief` | 世界晨报 |
| POST | `/api/v1/group-onboarding` | 合照批量建档 |
| POST | `/api/v1/impressions` | 自评/第一印象互写 |
| POST | `/api/v1/fields/generations` | 关系场域生成/重算 |
| GET | `/api/v1/scenes/modules` | 场景模块契约 |

房间命令类型：

```text
member.move              hotspot.interact
meeting.invite           meeting.respond
meeting.start            meeting.end
icebreaker.request       icebreaker.submit
icebreaker.finish
```

`roundtable.propose-topic`、`bulletin.publish` 和 Agent 触发的
`icebreaker.start` 是服务端系统命令，不由普通前端直接决定业务结果。

## 自动验收

在 `backend/` 下执行：

```powershell
python -m pytest -q
python -m pytest -q tests/test_mvp2_acceptance.py
```

第一条是全量回归；第二条对应 Roadmap 2.I，一次性验证：

1. 一张合照生成 5 个确认人物和程序化体素形象。
2. 5 人加入同一房间。
3. 热点交互 -> 邀请 -> 接受 -> 圆桌 -> Facilitator Agent 议题 -> 播报。
4. 破冰 Host Agent -> 5 人提交 -> 结束 -> 5 条带事实来源的推断回流。
5. 使用回流事实生成可重算 Field，并检查晨报和有序事件。

WebSocket cursor replay、SQLite 重启恢复、Agent 越权、Tool 只读、隐私过滤分别由：

```powershell
python -m pytest -q tests/test_rooms_v1.py tests/test_persistence_v2.py
python -m pytest -q tests/test_agent_core_v2.py tests/test_agent_roles_tools.py
```

## Live 验收

启动后端：

```powershell
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

另一个终端执行真实 HTTP 闭环：

```powershell
cd backend
python scripts/mvp2_acceptance.py --base-url http://127.0.0.1:8000
```

成功时输出 `"status": "PASS"`、5 个人物、事件数、5 条 memory update 和 Field
generation ID。合成的 1x1 测试图没有人脸，因此 `group_photo_status` 为
`needs-review` 是正确行为；替换为清晰合照且本机安装 OpenCV 后会尝试独立裁剪。

## 尚未生产化

- 当前是单 Uvicorn 进程的现场版；多实例部署需要 PostgreSQL 事务/outbox 与 Redis
  presence/pub-sub/分片锁适配器。
- 房间尚未接登录体系；正式对外前必须由登录身份签发短期 room token，禁止客户端
  自报 `actor_id`。
- 当前 Three.js 仍主要消费 v0 快照；v1 房间/WebSocket 已可用，但多人控制 UI、
  E/F 命令和重连客户端需要在前端后续接线。
- OpenCV 是可选本地检测器，不等于稳定身份识别；唯一 person_id 的最终绑定仍要求
  现场人工确认。人脸 embedding 去重和专用分割模型仍是算法迭代项。
- Field 当前生成版本化环境参数 JSON，尚未生成最终 3D 场景资产。
