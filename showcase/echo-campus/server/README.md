# Echo Campus 活动演示服务

仅服务独立的 Echo Campus 展示项目。不得连接或迁移 EchoWorld 线上 `backend/data/`。

运行：在 showcase/echo-campus 执行 `node server/index.mjs`。默认监听 127.0.0.1:5189。
服务同时提供 ../dist 静态页面与活动 API；测试可使用端口 0 和临时数据目录。

配置：

- PORT / HOST：监听地址；默认仅本机，经隔离反向代理暴露。
- ECHO_ALLOWED_ORIGINS：允许的完整 Origin，逗号分隔。新增域名、局域网 IP 或隧道地址须显式配置；默认 localhost/127.0.0.1 的 5173 与 5189。
- ECHO_EVENT_DATA：演示数据文件，默认 server/data/event.json；此目录已排除 Git。
- ECHO_DIST_DIR：静态构建目录，默认 ../dist。
- ECHO_EVENT_CONFIG：活动配置 JSON（名称、主题、分身阵容、类别、点位、标签表），见 docs/EVENT-PROFILE.md。
- ECHO_TAP_SECRET：NFC/支付宝触碰签名密钥，设置后所有触碰必须签名，见 docs/TAP-ADAPTER.md。
- ECHO_TRUST_PROXY=1：信任反向代理的 X-Real-IP / X-Forwarded-For 做限流（Nginx 需传 X-Real-IP）。
- ECHO_MAX_ATTENDEES（默认 1200）、ECHO_RATE_READ / ECHO_RATE_WRITE / ECHO_RATE_JOIN（默认每分钟 600 / 120 / 60）。

## API

所有写入使用 application/json；需要身份的请求附 Authorization: Bearer TOKEN。
错误：`{error:{code,message}}`。所有公共 DTO 仅包含用户同意展示的资料。

- GET /api/health → {ok, service, mode, version}
- GET /api/event → {event, version, attendees, connections}
- POST /api/join → {token, attendee, snapshot, resumed}
  - body: {consent:true, persona?, name?, role?, offer?, need?, category?, avatarColor?, organization?, contact?, contactVisibility?, listed?, bio?, publicContact?, badgeId?, activationCode?}
  - 全部资料选填；缺省/null/空白文本清空。`persona` 为本活动开放的分身 ID，缺省时分配当前使用最少的一款；每位来宾获得递增的到场编号 `serial`。昵称为空时显示「分身代号·编号」（如「朱砂·017」，换分身随之变化），角色为空使用“来宾”，类别默认 guest（更新时缺省则保留原类别）。提供的非空值仍受类型、长度和安全字符校验；公开同意必须显式为 true，更新也不能省略。
  - `contactVisibility`：`hidden`（默认，旧客户端只传 publicContact:false 时也是它）/ `connections`（双方确认相遇后对彼此可见）/ `public`（等同 publicContact:true）。公共 DTO 只带 `sharesContact` 布尔值，不带联系方式本身（public 除外）。
  - `listed:false` 进入隐身：不出现在公共快照、推荐与公共连线中，别人也不能向其发起招呼。
  - 名称、身份、机构、介绍、招呼按 NFC 规范化以保留中文标点；供需与联系方式仍按 NFKC 规范化，便于匹配。
  - 不带卡只允许 demoMode 演示身份；真实活动上线前必须增加身份核验与凭据下发。
  - 已登录再调用会更新当前分身，不能通过重复领取抢占他人卡。
  - 页面刷新使用已保存的本设备 token 请求 /api/me，不必再次领取。
- GET /api/me → {attendee, profile, version, activity, encounters}
  - `profile` 是本人可读的私有部分：{contact, contactVisibility, listed, customName}。
  - encounters 仅当前用户参与的 pending/confirmed；direction 与 canConfirm 供 UI 使用；带 `note`（招呼）与对方公开名片 `peer`；已确认且对方选择 connections/public 时带 `peerContact`。
  - 被本人「先不了」的请求不再出现；发起方看到的仍是 pending（不通知拒绝）。
- POST /api/encounters body:{peerId, note?} → {encounter, idempotent, version}
  - note 为可选招呼（≤60 字，确认前只有双方可见）。同一对人物重复发起幂等；互相发起不会自动替代确认动作；但曾「先不了」的一方主动发起，视为接受。
- POST /api/encounters/:id/confirm → {encounter, idempotent, version}
  - 只有请求接收者可确认，确认后才出现在公共 connections。
- POST /api/encounters/:id/decline → {declined, version}
  - 只有接收者可操作；已确认的不能再拒绝。
- POST /api/tap body:{tag, ts?, nonce?, sig?} → {tag, verified, attendee?, checkin?}
  - 标签解析、签名与防重放见 docs/TAP-ADAPTER.md；无身份时只返回标签含义。
- POST /api/leave → {left, version}
  - 删除本人身份、会话、相遇与打卡记录（内置演示人物不可删除）。
- GET /api/matches → {algorithm, explanation, version, matches}
  - matches 是最多 3 条 {attendee, score, reasons, evidence}。
  - 明确标记固定词表 authorized-tags-v1，根据双方主动公开的 offer/need 匹配，未调用 LLM。供需均空时返回空列表；仅有一侧时只基于该侧真实文本，不虚构供需。
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
不保存照片、声音或 embedding；分身来自 12 款预设风格化形象（见 docs/PERSONA-PIPELINE.md），不宣称照片重建数字人。

会话使用随机 256-bit bearer token，磁盘仅保存 SHA-256 hash，7 天有效；
token 只在领取者的 HTTP 响应中出现。激活码仅存 hash。静态服务不能读取 server/data。
HTTP 与 WebSocket 校验 Origin；有请求体上限、输入长度上限和按连接 IP 的限流。
默认反向代理后的请求合用代理 IP 限流，这是小规模演示部署而非生产扩容方案。
