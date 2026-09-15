# Echo Campus 活动演示服务

仅服务独立的 Echo Campus 展示项目。不得连接或迁移 EchoWorld 线上 `backend/data/`。

运行：在 showcase/echo-campus 执行 `node server/index.mjs`。默认监听 127.0.0.1:5189。
服务同时提供 ../dist 静态页面与活动 API；测试可使用端口 0 和临时数据目录。

配置：

- PORT / HOST：监听地址；默认仅本机，经隔离反向代理暴露。
- ECHO_ALLOWED_ORIGINS：允许的完整 Origin，逗号分隔。新增域名、局域网 IP 或隧道地址须显式配置；默认 localhost/127.0.0.1 的 5173 与 5189。
- ECHO_EVENT_DATA：演示数据文件，默认 server/data/event.json；此目录已排除 Git。
- ECHO_DIST_DIR：静态构建目录，默认 ../dist。

## API

所有写入使用 application/json；需要身份的请求附 Authorization: Bearer TOKEN。
错误：`{error:{code,message}}`。所有公共 DTO 仅包含用户同意展示的资料。

- GET /api/health → {ok, service, mode, version}
- GET /api/event → {event, version, attendees, connections}
- POST /api/join → {token, attendee, snapshot, resumed}
  - body: {name, role, offer, need, avatarColor, consent:true, badgeId?, activationCode?}
  - 不带卡只允许 demoMode 演示身份；真实活动上线前必须增加身份核验与凭据下发。
  - 已登录再调用会更新当前分身，不能通过重复领取抢占他人卡。
  - 页面刷新使用已保存的本设备 token 请求 /api/me，不必再次领取。
- GET /api/me → {attendee, version, encounters}
  - encounters 仅当前用户参与的 pending/confirmed；direction 与 canConfirm 供 UI 使用。
- POST /api/encounters body:{peerId} → {encounter, idempotent, version}
  - 同一对人物重复发起幂等；互相发起不会自动替代确认动作。
- POST /api/encounters/:id/confirm → {encounter, idempotent, version}
  - 只有请求接收者可确认，确认后才出现在公共 connections。
- GET /api/matches → {algorithm, explanation, version, matches}
  - matches 是最多 3 条 {attendee, score, reasons, evidence}。
  - 明确标记固定词表 authorized-tags-v1，根据双方主动公开的 offer/need 匹配，未调用 LLM。
- WebSocket /api/live
  - 首次连接立即发送完整 `{type:"snapshot",event,version,attendees,connections}`。
  - 每次成功变更广播递增 version；重连获得完整最新状态，不依赖内存增量重放。
  - 客户端应丢弃小于等于当前 version 的重复消息；收到新版本后刷新 /api/me 获取私有请求状态。
  - 只读，客户端发消息会以 1008 关闭。认证 token 不可放进 URL。

## 演示卡与现场边界

演示器可显式使用 demo-visitor-01 / ECHO-DEMO-01，依次至 10。
这些是公开的演示凭据，不能保护真实身份。公开 NFC URL 只负责打开入口，
正式领取必须使用另外的活动方凭据。NFC 芯片读写和硬件到场效果尚需实机验证。

内置 15 位虚构人物及 7 条演示关系标记 synthetic:true。内置人物没有真实会话，
不会替其自动确认相遇。两台设备分别领取演示分身后，可以真实发起和确认相遇。
不保存照片、声音或 embedding；当前仅有风格化颜色分身，不宣称照片重建数字人。

会话使用随机 256-bit bearer token，磁盘仅保存 SHA-256 hash，7 天有效；
token 只在领取者的 HTTP 响应中出现。激活码仅存 hash。静态服务不能读取 server/data。
HTTP 与 WebSocket 校验 Origin；有请求体上限、输入长度上限和按连接 IP 的限流。
默认反向代理后的请求合用代理 IP 限流，这是小规模演示部署而非生产扩容方案。
