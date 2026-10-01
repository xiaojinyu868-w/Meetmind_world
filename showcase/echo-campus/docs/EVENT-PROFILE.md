# 活动配置：一份 JSON 开一场新活动

相遇之庭的代码不写死任何一场活动。名称、主题色、分身阵容、身份类别（手环颜色）、打卡点和 NFC 标签表，都来自一份活动配置文件。示例：`config/events/jiangsu-investor-night.example.json`。

## 启用

```bash
export ECHO_EVENT_CONFIG=/etc/echo-campus-b2b/event.json   # 放在仓库与静态目录之外
node server/index.mjs
```

服务启动时严格校验配置，格式不对会直接拒绝启动并说明哪一项有问题，不会带着错误配置上线。

合并顺序：内置默认（相遇之庭演示） ← 已持久化的活动数据 ← 配置文件。活动 `id` 默认保持 `echo-campus-preview`，已有身份、相遇和大屏连接不受换配置影响；正式活动建议换一个新的数据文件（`ECHO_EVENT_DATA`）。

## 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` / `brand` / `subtitle` / `location` | 文本 | 入场仪式、页面标题、大屏标题 |
| `startsAt` / `endsAt` | ISO 时间 | 展示用 |
| `demoMode` | 布尔 | `true` 允许无凭据入场与未签名触碰（演示）；正式活动设 `false`，并配合 `ECHO_TAP_SECRET` |
| `entry.label` / `entry.hint` | 文本 | 入场仪式与大屏二维码卡上的引导语 |
| `theme` | `{ink,paper,accent,glow,sage}` | `#RRGGBB`；未写的键用默认值，前端运行时注入 CSS 变量 |
| `personas` | 分身 ID 数组 | 本场开放的形象，必须是 `src/shared/personas.mjs` 已登记的 ID；入场分配和来宾自选都只在这里面 |
| `categories` | 数组 | `{id,label,wristbandColor}`，最多 12 项，必须包含 `guest`；手环标签 `WB-<id>-*` 据此识别 |
| `checkpoints` | 数组 | `{id,label,partner,description,points}`，最多 24 项；标签 `CP-<id>` 据此识别 |
| `tags` | 对象 | 自定义标签表，`{ "<标签ID>": {kind:"wristband"|"checkpoint"|"entry", category?, checkpoint?} }`，最多 5000 个；**不会**出现在公共快照里 |

## 相关环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `ECHO_EVENT_CONFIG` | 空 | 活动配置路径 |
| `ECHO_EVENT_DATA` | `server/data/event.json` | 活动数据（身份、相遇、打卡）；放在不公开的可写目录 |
| `ECHO_TAP_SECRET` | 空 | NFC/支付宝触碰签名密钥；设置后所有触碰必须签名，见 `TAP-ADAPTER.md` |
| `ECHO_TRUST_PROXY` | 空 | 设为 `1` 时按 Nginx 传来的 `X-Real-IP` 限流（需在 Nginx 加 `proxy_set_header X-Real-IP $remote_addr;`） |
| `ECHO_MAX_ATTENDEES` | `1200` | 人数上限 |
| `ECHO_RATE_READ` / `ECHO_RATE_WRITE` / `ECHO_RATE_JOIN` | `600` / `120` / `60` | 每个来源地址每分钟的读 / 写 / 入场次数 |
| `ECHO_ALLOWED_ORIGINS` | 本机 | 允许的完整 Origin，逗号分隔 |

## 换一场活动的清单

1. 复制示例配置，改名称、副标题、地点、时间与主题色。
2. 和活动方确认身份类别与手环颜色，写入 `categories`；手环芯片里写 `…?entry=nfc&tag=WB-investor-0001` 这样的入口（见 `TAP-ADAPTER.md`）。
3. 写打卡点 `checkpoints`，每个点位立牌写 `…?tag=CP-<id>`，或在 `tags` 里给厂商下发的标签 ID 做映射。
4. 选这场开放的分身 `personas`（例如只开 8 款）。
5. 换场景：见 `SCENE-SWAP.md`；手机端裁切版见 `EXPERIENCE-DESIGN.md` 第 7 节。
6. 新数据文件 + 正式活动 `demoMode:false` + `ECHO_TAP_SECRET`，按交接文档的 P0/P1 清单验收。
