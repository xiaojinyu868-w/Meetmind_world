# 相遇之庭 × 呆猫小程序：接口需求 v1.1

2026-10-14（10-15 补充第 8 节）· 按 10-10 会上定的方案：活动页做在呆猫小程序里，「碰一下广场」用 web-view 打开相遇之庭地图，用户以呆猫账号为准，数据沉淀在呆猫。

**一句话**：呆猫后台调我们一个接口换一张票据，小程序用返回的链接打开 web-view，用户就以自己的呆猫身份出现在手机地图和大屏上，换手机也还是同一个人。用户资料按第 8 节给到我们即可；其余接口都是可选的。我们这边已经上线，随时可以联调。

## 1. 呆猫需要做的

| # | 事项 | 是否必须 | 见 |
| --- | --- | --- | --- |
| 1 | 小程序后台「开发管理 → 开发设置 → 业务域名」添加 `capture.meetmind.online`，把下载的校验文件发给我们，我们放到域名根目录（收到当天上线，回你可访问的链接） | 必须 | — |
| 2 | 后端调用换票接口 | 必须 | 第 3 节 |
| 3 | 小程序用 web-view 打开返回的链接 | 必须 | 第 4 节 |
| 4 | 用户报名或资料有变化时，把用户资料给到我们 | 必须 | 第 8 节 |
| 5 | 用户在现场时（挂件碰一下打开、签到台签到），换票加 `checkin: true` | 建议 | 第 5 节 |
| 6 | 两人在呆猫里互碰挂件或交换名片后，推送一次连线 | 可选 | 第 6 节 |
| 7 | 拉取地图里产生的数据 | 可选 | 第 7 节 |
| 8 | 发我们一张活动页的小程序码（PNG），放在大屏左下角 | 建议 | 第 10 节 |

之前草案里「我们每分钟读呆猫成员名单」的方式不再需要。

## 2. 地址与鉴权

- 接口地址：`https://capture.meetmind.online/echo-campus/api/partner/`
- 请求头：`Authorization: Bearer <token>`。token 我们私下发，**只放在呆猫服务端**，不要写进小程序前端代码。
- 自检：`GET /api/partner/ping`，返回 `{ "ok": true, "event": {...}, "mapUrl": "..." }` 说明 token 可用。
- 现在的地址就是活动当天的地址。联调期间场上有 15 位虚构的演示人物；活动前一天切换到正式活动，清空所有测试数据。

## 3. 换票：`POST /api/partner/tickets`

什么时候调：用户打开活动页时调一次；之后每次打开地图前，如果手上的票据已超过 30 分钟，再换一张。

```json
{
  "uid": "dm_7f3a9c",
  "nickname": "小李",
  "avatarUrl": "https://cdn.example.com/avatar/dm_7f3a9c.png",
  "consent": true,
  "checkin": false,
  "role": "独立开发者",
  "organization": "一人公司 · 记账工具",
  "bio": "做了三年独立开发",
  "offer": "前端、小程序开发",
  "need": "找增长合伙人"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `uid` | 是 | 呆猫用户的稳定 ID：字母、数字、`_`、`-`，最长 64 位。同一个人永远同一个 uid。不要用手机号或 openid 明文，可以用哈希 |
| `consent` | 是 | `true`：用户已同意在本场活动的地图和大屏上公开昵称和头像 |
| `nickname` | 建议 | 昵称，最长 24 字，地图和大屏上显示 |
| `avatarUrl` | 建议 | 头像图片的 https 地址，建议 132px 以上的方图；用在大屏欢迎卡和名单里 |
| `checkin` | 否 | `true`：用户此刻在现场，见第 5 节 |
| `role` / `organization` / `bio` | 否 | 身份（≤60 字）、机构（≤80 字）、一句话介绍（≤160 字） |
| `offer` / `need` | 否 | 我能提供 / 我在寻找（各 ≤160 字），用于地图里「认识新朋友」的推荐 |
| `category` | 否 | 参会类别 id，由活动配置决定（如 `investor`、`founder`）；不认识的值按普通来宾 |

返回：

```json
{
  "ticket": "JljWnZ18kw_hp7SLLV_g...",
  "url": "https://capture.meetmind.online/echo-campus/?from=daimao&ticket=JljWnZ18kw_hp7SLLV_g...",
  "expiresIn": 1800,
  "status": "new",
  "attendee": null
}
```

- `status`：`new` 第一次来；`returning` 来过；`checked-in` 这次请求让 TA 到场（第 5 节）。
- `attendee`：已经在地图上的人返回 `{ serial, name, persona, personaPending, onsite }`，`serial` 是 TA 在本场的来客编号。
- 昵称和头像以呆猫为准，每次换票都会更新；其余资料只在第一次带入，之后以用户在地图里自己填写的为准。
- 超长的字段会截断，尖括号和控制字符会去掉，不会因此报错。http 头像地址不显示。

## 4. 打开地图（小程序）

```html
<web-view src="{{mapUrl}}"></web-view>
```

- `mapUrl` 就是换票返回的 `url`，原样使用，不要自己拼接。票据只放在 web-view 地址里，不要展示，也不要分享出去。
- 第一次进入：用户看到「小李，欢迎你 · 今天，你是 白噪」，可以换一个形象，点进入后出现在地图上。
- 来过的用户：直接进入地图，镜头对准自己，名字标成「你 · 小李」。
- 返回用小程序原生的返回按钮，地图不需要接 JSSDK。
- 地图是 3D 页面，第一次打开要下载约 14 MB，之后走缓存。提前在线打开过的用户，活动当天会快很多。

## 5. 现场到场：`checkin: true`（建议）

用户从挂件碰一下打开活动页，或在签到台签到时，换票加 `checkin: true`：

- 不用等用户点开地图，TA 就已经出现在大屏上；大屏底部弹出约 5 秒的欢迎卡：昵称、头像、编号和今天的形象。
- 系统先给 TA 分一个形象，TA 打开地图时可以保留，也可以换一个。
- 提前在线注册过的人，到场这一刻会重新排到大屏最前面。
- 重复 `checkin` 不会重复欢迎，也不会产生新的人。

## 6. 碰一碰连线：`POST /api/partner/connections`（可选）

两位用户在呆猫里互碰挂件或交换名片、双方都确认之后，推送一次：

```json
{ "uidA": "dm_7f3a9c", "uidB": "dm_1b22e0" }
```

- 返回 `201` 新连线、`200` 已存在。地图上两人之间点亮连线，大屏「刚刚相遇」显示两人的头像。
- 返回 `404 MEMBER_NOT_ON_MAP`：有一方还没上图（既没有用 `checkin` 换过票，也没有进过地图），可以稍后重试或忽略。

## 7. 数据回传：`GET /api/partner/export`（可选）

返回呆猫用户在地图上的形象、编号、到场时间、在地图里补充的资料、连线和打卡；联系方式不导出。活动中可以每分钟拉一次，活动结束后拉一次存档。

```json
{
  "event": { "id": "...", "name": "相遇之庭" },
  "generatedAt": "2026-10-24T10:00:00.000Z",
  "members": [
    {
      "uid": "dm_7f3a9c", "serial": 18, "name": "小李", "persona": "qingci", "personaName": "青瓷",
      "joinedAt": "2026-10-20T12:00:00.000Z", "onsiteAt": "2026-10-24T01:58:00.000Z", "personaPending": false, "listed": true,
      "profile": { "role": "独立开发者", "organization": "", "bio": "", "offer": "", "need": "找增长合伙人" },
      "connections": [ { "uid": "dm_1b22e0", "serial": 19, "name": "小王", "confirmedAt": "2026-10-24T02:10:00.000Z", "via": "daimao" } ],
      "checkins": []
    }
  ],
  "otherAttendees": 0
}
```

`via`：`daimao` 是第 6 节推送的连线，`map` 是用户在地图里打招呼、对方确认的。`otherAttendees` 是没有通过呆猫进入的来宾人数，不含他们的资料。

## 8. 用户资料：`POST /api/partner/members`

什么时候调：用户在活动页报名、资料有变化时推一次；活动前也可以把已报名的用户分批推过来。每次最多 200 位。

```json
{
  "members": [
    {
      "uid": "dm_7f3a9c",
      "consent": true,
      "nickname": "小李",
      "avatarUrl": "https://cdn.example.com/avatar/dm_7f3a9c.png",
      "realName": "李明",
      "phone": "13800138000",
      "wechat": "liming_dev",
      "role": "独立开发者",
      "organization": "一人公司 · 记账工具",
      "bio": "做了三年独立开发",
      "offer": "前端、小程序开发",
      "need": "找增长合伙人",
      "category": "founder",
      "tags": ["AI", "出海"],
      "registeredAt": "2026-10-20T12:00:00+08:00",
      "checkedInAt": null,
      "extra": { "city": "南京" }
    }
  ]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `uid` | 是 | 同第 3 节 |
| `consent` | 是 | `true`：用户已同意向本场活动提供这些资料 |
| `nickname` / `avatarUrl` | 否 | 同第 3 节 |
| `realName` / `phone` / `wechat` | 否 | 姓名（≤40 字）、手机号、微信号（≤40 字） |
| `role` / `organization` / `bio` / `offer` / `need` / `category` | 否 | 同第 3 节 |
| `tags` | 否 | 标签，字符串数组（最多 20 个，每个 ≤20 字） |
| `registeredAt` / `checkedInAt` | 否 | 报名时间、签到时间：ISO 8601 或时间戳 |
| `extra` | 否 | 其他字段原样放这里（JSON 对象，4KB 以内） |

返回：`{ "received": 1, "created": 1, "updated": 0, "unchanged": 0, "deleted": 0 }`

- 按 `uid` 更新：带了的字段以这次为准（空字符串表示清空），没带的保留上次的值。
- 用户在呆猫注销后推一次 `{ "uid": "dm_7f3a9c", "deleted": true }`。
- 同一批里有一位格式不对，整批不收，错误信息会指出是第几位（如 `members[3]`）。

## 9. 错误

错误统一返回 `{ "error": { "code": "...", "message": "..." } }`。

| HTTP | code | 含义 |
| --- | --- | --- |
| 400 | `CONSENT_REQUIRED` | 缺少 `consent: true` |
| 400 | `INVALID_UID` | uid 格式不对 |
| 400 | `TOO_MANY_MEMBERS` | 第 8 节一次超过 200 位 |
| 401 | `PARTNER_AUTH_REQUIRED` | token 不对 |
| 404 | `MEMBER_NOT_ON_MAP` | 连线的一方还没上图 |
| 409 | `EVENT_CAPACITY` | 本场人数已满（默认 1200 人，可调） |
| 410 | `TICKET_EXPIRED` | 票据过期；地图页会提示用户从小程序重新进入 |
| 429 | `RATE_LIMITED` | 每分钟超过 6000 次 |

## 10. 大屏

- 大屏用电脑浏览器打开 `https://capture.meetmind.online/echo-campus/?mode=stage`，不经过小程序。
- 同屏最多 50 人；人多时每 10 分钟换一批，所有屏幕看到的是同一批；刚到场 3 分钟内的人优先上屏。
- 左下角现在是我们自己的二维码。收到活动页的小程序码后我们替换，扫码就进呆猫活动页。

## 11. 隐私

- 第 8 节的资料只存在我们服务端，不在地图和大屏上显示；我们不下载头像，不接收 openid。
- 呆猫 uid 不出现在任何公开数据里，只在导出接口里返回给呆猫。
- 地图链接里的票据 30 分钟内有效；我们的访问日志不记录链接参数。
- 活动结束后按活动方约定的期限删除。

## 12. 联调步骤

1. 我们私下发 token。
2. 自检：

   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" https://capture.meetmind.online/echo-campus/api/partner/ping
   ```

3. 换一张票，把返回的 `url` 用手机浏览器打开，就能看到效果，不用等小程序：

   ```bash
   curl -s -X POST https://capture.meetmind.online/echo-campus/api/partner/tickets \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"uid":"dm_test_001","nickname":"测试小李","avatarUrl":"https://example.com/a.png","consent":true,"checkin":true}'
   ```

4. 业务域名校验文件放好后，小程序 web-view 接入。
5. 推一位测试用户的资料（第 8 节），返回 `created: 1` 即可。
6. 到场、连线、导出（第 5–7 节）按需各调一次。我们这边已在 2026-10-15 用同一份代码把第 3–9 节的调用和报错全部走过一遍。

## 附：待回应的招呼 `GET /api/partner/pending`

返回还有招呼没回应的呆猫用户，按待回应数从多到少：`{ "members": [{ "uid": "dm_7f3a9c", "pending": 3, "latestAt": "2026-10-24T06:12:00.000Z" }] }`。只说明谁有招呼在等，不含发起人和留言。请用订阅消息或服务通知提醒这些用户回到活动页看看。
