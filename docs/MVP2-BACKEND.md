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
- OpenCV 是可选本地检测器，不等于稳定身份识别；唯一 person_id 的最终绑定仍要求
  现场人工确认。人脸 embedding 去重和专用分割模型仍是算法迭代项。
- Field 当前生成版本化环境参数 JSON，尚未生成最终 3D 场景资产。

## 前端接线状态（2026-08-04，ROADMAP 2.H.3 升级）

上一节的"v1 房间/WebSocket 已可用，但多人控制 UI、E/F 命令和重连客户端需要在前端
后续接线"已落地：

- `src/runtime/RoomClient.js`：v1 房间客户端。REST 负责 join/commands/snapshot；
  WS `stream?after_sequence=N` 负责有序事件流；断线指数退避重连并按 cursor 补拉；
  事件按 sequence 去重，发现空洞先走 HTTP replay 补齐再投递；所有帧校验
  `meetmind.rooms.v1` / `meetmind.event.v1` / `meetmind.room-snapshot.v1`，未知
  schema 丢弃并 warn，不抛穿。WS 握手失败/超时自动降级为 events 端点轮询
  （约 1s 节拍，功能等价），并周期性尝试升级回 WS。
- `src/ui/group/RoomPanel.js`：v1 联机面板（房间创建/加入、名册与在线、
  meeting.invite/respond/start/end、有序事件条）。功能探测
  `GET /api/v1/scenes/modules` 失败时面板隐藏，v0 GroupPlay（含"谁写的？"游戏）
  完全不受影响；两条线并存。
- 位置同步：本地 `member.move` 约 4.5Hz 上报（command_id 为 uuid，幂等）；
  远端成员位置映射为与 v0 相同的 participants 形状，复用 main.js 的
  `groupPresenceOverrides` 插值渲染通道；名册里的新面孔现场克隆实体。
- 大屏只读（TBD-H1 已决）：`?role=screen&room=<roomId>`（或 `groupScreen=1`），
  readOnly 客户端（不 join、不上报位置），镜头绕场缓慢环视，左上角状态角标。
- E/F 场景热点到 `hotspot.interact` 命令的接线留给场景交互层（RoomClient 已暴露
  `interactHotspot(hotspotId, action)`）。
- 纯逻辑自测：`node scripts/room-client.test.mjs`（13 项：帧解析、schema 校验、
  cursor 去重/空洞补拉、退避、断线重连、降级轮询、命令幂等形状、只读模式）。

## 部署注意（nginx WebSocket）

线上 `location ^~ /echoworld/api/` 缺 `Upgrade`/`Connection upgrade` 头，WS 握手
会被代理吃掉；前端会自动降级轮询，不阻塞上线。补齐方法见
`docs/deploy/nginx-echoworld-api-websocket.conf`（含验证 curl），由人工执行，
代理不 reload nginx。

## 变更记录

- 2026-08-04 | 前端 v1 房间接线（TBD-ARCH-4 现场档目标形态）：RoomClient（WS 有序事件流 + cursor 重放 + 降级轮询）、RoomPanel（v1 联机面板，功能探测失败时回落 v0 GroupPlay）、大屏只读视角（?role=screen）；nginx WS 反代补丁备档 docs/deploy/ | AI（实现）
