# Echo Campus To B 合作线交接文档

**文档版本**：v1.2 · 2026-10-02（v1.0 / v1.1 同日）\
**用途**：把 Echo Campus 的合作方 / To B 展示线迁移到另一台服务器，继续开发场景、活动流程与 NFC/支付宝联调。\
**当前状态**：v1.2 已于 2026-10-02 部署到 `https://capture.meetmind.online/echo-campus/`，替换了原线上 Showcase 服务（见下方「部署状态」）。

## 部署状态（2026-10-02）

| 项 | 当前值 |
| --- | --- |
| 地址 | `https://capture.meetmind.online/echo-campus/`（沿用原 Showcase 地址，旧链接和二维码不变；大屏 `?mode=stage`） |
| 版本 | 本分支 `d2d36dd`；已提交的 `dist/` 就是生产构建，服务器上不执行 `npm run build` |
| 服务 | `echo-campus-b2b.service`（用户 `echocampus`，`Restart=always`，`127.0.0.1:5191`）；全站只保留这一个 echo-campus 服务 |
| 代码 | `/srv/meetmind/Meetmind_world`：浅克隆 + 稀疏检出 `showcase/echo-campus`，`npm ci --omit=dev --ignore-scripts` |
| 数据 | `/var/lib/echo-campus-b2b/event.json`，全新数据；未设 `ECHO_EVENT_CONFIG`，使用内置演示配置（`demoMode:true`） |
| 密钥 | `/etc/echo-campus-b2b/secrets.env`（root 600，经 `EnvironmentFile=` 加载）。已生成 `ECHO_TAP_SECRET`，但当前保持注释：演示模式下未签名的标签链接要继续可用；正式活动的启用步骤写在该文件里 |
| 代理 | `ECHO_TRUST_PROXY=1`；Nginx `location ^~ /echo-campus/` 只新增 `proxy_set_header X-Real-IP $remote_addr;`，原配置备份在 `/etc/nginx/conf.d/capture.meetmind.online.conf.bak-20261002-151737-echo-campus-v1.2` |
| 旧版 | `echo-campus-showcase.service` 已停止并禁用，unit 文件保留；5189 / 5190 / 5192 的 QA 预览进程已停止。旧数据归档在 `/root/backups/echo-campus-20261002/`（root 700），原文件仍在 `/var/lib/echo-campus/` |

旧检出 `/root/meetmind_wt_main` 暂未删除：EchoWorld 的 `echoworld-backend.service` 仍指向其中的 `backend/`（该 unit 早已持续启动失败）。等 EchoWorld 侧处理掉这个 unit 后再删除。

在服务器上更新：

```bash
cd /srv/meetmind/Meetmind_world
git rev-parse HEAD   # 记下当前版本，回滚时用
git pull --ff-only origin codex/echo-campus-b2b-partner-20261002
cd showcase/echo-campus
npm ci --omit=dev --ignore-scripts   # 仅当 package-lock.json 有变化
systemctl restart echo-campus-b2b
curl -s http://127.0.0.1:5191/api/health
```

回滚：

- 回到上一个版本：在 `/srv/meetmind/Meetmind_world` 执行 `git checkout --detach <上一个版本 sha>`（本地没有时先 `git fetch --depth=1 origin <sha>`），按需重新 `npm ci --omit=dev --ignore-scripts`，再 `systemctl restart echo-campus-b2b`；数据目录不动。
- 回到旧 Showcase（仅当 `/root/meetmind_wt_main` 仍在）：`systemctl disable --now echo-campus-b2b && systemctl enable --now echo-campus-showcase`，旧数据仍在 `/var/lib/echo-campus/`。

## v1.2 更新：画面与人物再提一档（先读这一节）

部署方式与环境变量不变；只是静态资源多了 `assets/personas/hd/`（12 款特写贴图，约 5 MB，按需加载）。

- **人物不再重叠**：庭院站位改为确定性的「三人交谈小圈」规划，所有设备位置一致，任何两人 ≥ 0.95 米；坐满时多出的人暂不显示。
- **庭院布置**：暖砂岩铺装、中心铜色字带徽记（活动名 · 品牌 · 副标题，随活动配置重绘）、串灯天幕（灯杆在来宾镜头之外）、两面活动旗帜、偏暖的傍晚光。
- **地面效果修复**：three r185 反向深度下的排序反转与园区地面的深度偏移，使来宾视角下原有石材、人物接触阴影和抵达光环一直被地面压住；现已全部可见。首屏不再成批播放抵达光柱和提示音。
- **人物特写**：框住某人时换 2K 颜色 / 1K 法线 / 1K 粗糙度贴图；待机时双臂自然下垂；头像与全身像重新渲染；特写时别人的名字牌不再压在 TA 身上。
- **现场标签清单**：「NFC / 双端体验」面板列出闸口、每类手环、每个点位的碰一下链接，可复制或切成二维码，用于写标签与彩排。

细节见 `docs/EXPERIENCE-DESIGN.md` 第 3、5.1、6 节与 `docs/PERSONA-PIPELINE.md`。

## 0. v1.1：相遇之庭来宾体验重做

本节说明 v1.0 之后同一分支上的改动；第 1 节起的迁移、部署和回滚步骤仍然有效，只是多了几个可选环境变量（见 0.3）。

### 0.1 体验

- **碰一下即进**：`?entry=nfc` 打开深色入场仪式，展示分配到的分身卡（代号、特征、即将成为第 N 位来客），一键「以『朱砂』进入」，不填任何资料；可「换一个形象」。修复了 v1.0 中 NFC 入口的资料面板会被场景加载自动关闭的问题。
- **12 款预设分身**：新增 10 款 Tripo 生成并绑骨的角色（银发眼镜、红贝雷帽、白耳机、玉簪、白棒球帽、卷发、银白短发配丝巾、光头短须、蓬松卷发、双麻花辫），加原有 2 款，每款 4 段动作（站立、点头、挥手、鼓掌）。服务端按「使用最少」分配，人群尽量不重样；默认名「代号·编号」。
- **名片与轻社交**：手机底部抽屉 / 电脑右侧浮卡；标签化的供需、「你们的交集」、带一句话的招呼、「先不了」、双方确认后互相显示微信（默认「相遇后可见」）、隐身、删除本人资料。
- **庭院**：名字牌、抵达光柱、新相遇时两人鼓掌与金色连线脉冲；默认镜头对准人群所在的庭院。
- **大屏**（`?mode=stage`）：活动名、实时人数与相遇数、「刚刚抵达 / 刚刚相遇」、入场二维码、钟摆式环拍。
- **合作方控制台**：原有场地切换、源模型、导入、导览与双端演示面板收进右上「展示控制台」（`?mode=partner` 直达）。
- **手机加载**：手机来宾默认加载庭院裁切版场景（gzip 约 8 MB，原整园约 35 MB），分身按需加载（每款约 0.65 MB）。

设计意图、流程细节与视觉规范见 `docs/EXPERIENCE-DESIGN.md`。

### 0.2 底座（下一场合作直接复用）

| 能力 | 文件 |
| --- | --- |
| 活动配置（名称、主题色、分身阵容、类别、点位、标签表） | `docs/EVENT-PROFILE.md`、`config/events/*.example.json`、`server/event-config.mjs` |
| NFC / 支付宝触碰协议（HMAC 签名、时间窗、单次 nonce、标签表） | `docs/TAP-ADAPTER.md`、`POST /api/tap` |
| 分身生产管线（Tripo → Blender → 压缩 → 头像） | `docs/PERSONA-PIPELINE.md`、`scripts/personas/`、`tools/portrait-studio.*` |
| 场景裁切（手机轻量版） | `scripts/venue/crop-court.mjs` |
| 共享分身表与供需词表（前后端同源） | `src/shared/personas.mjs`、`src/shared/topics.mjs` |

### 0.3 新增的可选环境变量

| 变量 | 说明 |
| --- | --- |
| `ECHO_EVENT_CONFIG` | 活动配置 JSON 路径（放在仓库与静态目录之外） |
| `ECHO_TAP_SECRET` | 触碰签名密钥；设置后所有 `/api/tap` 必须签名 |
| `ECHO_TRUST_PROXY=1` | 按 Nginx 传来的真实地址限流；同时在 `location` 里加 `proxy_set_header X-Real-IP $remote_addr;` |
| `ECHO_MAX_ATTENDEES` | 人数上限，默认 1200 |
| `ECHO_RATE_READ` / `ECHO_RATE_WRITE` / `ECHO_RATE_JOIN` | 每个地址每分钟限额，默认 600 / 120 / 60（v1.0 为 240 / 40 / 12，场馆 Wi-Fi 共用出口时会挡住排队入场） |

不设置这些变量时行为与 v1.0 一致（演示模式、未签名触碰仅演示可用）。

### 0.4 数据兼容

旧的 `event.json` 启动时自动迁移：补齐分身、到场编号、联系方式可见范围（原 `publicContact:true` → `public`，其余 → `hidden`）与隐身标记；「访客XXXXXX」式临时名改为「代号·编号」。迁移前请照常备份数据文件。

### 0.5 追加验收项

- [ ] 手机碰一下 / 扫码后 1 秒内看到入场仪式；「进入」后镜头降落到自己的分身。
- [ ] 两部手机：一方打招呼（带一句话），另一方看到并接受；双方都能在名片里看到对方填写的微信；第三台设备和大屏看不到。
- [ ] 「先不了」后发起方不收到拒绝提示；隐身后从大屏与推荐中消失；删除后无法再用原设备会话。
- [ ] 手环标签 `?entry=nfc&tag=WB-investor-xxxx` 新来宾入场后类别为投资人；点位 `?tag=CP-xxx` 盖章且重复不加分。
- [ ] 正式活动：`demoMode:false` + `ECHO_TAP_SECRET`，未签名、过期、重放的触碰全部被拒。
- [ ] 目标手机首屏流量与帧率实测（本地无头浏览器约 17 MB、约 60 FPS，不等于实体手机）。

## 1. 这条分支解决什么问题

这条分支承载面向活动主办方、品牌方和技术合作方的 Echo Campus 交付线。它把一个活动现场转成可共同浏览的 3D 园区：来宾通过二维码或 NFC 入口进入，领取一个风格化分身，填写愿意公开的资料，查看供需推荐，发起并确认相遇；已确认的关系可以在世界和大屏中同步呈现。

当前产品可以作为合作沟通、视觉展示和小规模试点的基础。它不是正式的支付宝生产适配、实体手环验收、千人容量保证或真人数字人交付。生产范围需要活动方、支付宝/手环供应商和技术方共同冻结。

## 2. Git 入口与基线

- GitHub 仓库：`https://github.com/xiaojinyu868-w/Meetmind_world`
- 本交付分支：`codex/echo-campus-b2b-partner-20261002`
- 项目目录：`showcase/echo-campus/`
- 分支基线：`02e38829e8e3407ed608807cb12dd60babbdb3ad`
- 基线来源：`codex/echo-campus-showcase-20260916`
- 线上旧 Showcase 分支和服务保持不变；不要把本分支直接强推覆盖旧分支。

推送完成后，分支页面为：

`https://github.com/xiaojinyu868-w/Meetmind_world/tree/codex/echo-campus-b2b-partner-20261002`

## 3. 当前交付能力和边界

| 能力 | 当前状态 | 说明 |
| --- | --- | --- |
| 园区展示 | 已实现 | 默认完整园区、活动层、人物和多个镜头；历史单体仍可查看 |
| 场景替换 | 已实现原型 | 支持程序化场景、单文件 GLB/GLTF、SPZ/PLY/SPLAT 配置导入；每个新资产都要重新校准 |
| 风格化分身 | 已实现 | 颜色和资料驱动的展示分身，带有限的待机、行走和交互动作 |
| 数字名片 | 已实现 | 用户主动填写并同意公开的字段才进入公共展示；字段可为空 |
| 推荐 | 已实现原型 | 基于主动公开的供需标签和固定词表；不是已经接入的 LLM 推荐服务 |
| 相遇 | 已实现 | 一方发起、另一方确认；待确认关系只对双方可见 |
| 多端同步 | 已实现原型 | HTTP API + `/api/live` WebSocket；断线后重新获取完整快照 |
| NFC 入口 | 已实现网页入口 | `?entry=nfc` 打开 HTTPS 页面；实体标签、发卡和身份核验尚未完成 |
| 支付宝生态 | 待联调 | 尚未完成正式接口、签名回调、沙箱/生产配置或设备联调 |
| 活动规模 | 未承诺 | 面向合作展示和试点；千人活动前必须独立压测、监控和现场演练 |

当前内置人物与关系是合成演示数据。系统不保存照片、声音或 embedding，也不应对外表述为已完成真人外貌重建或真人数字人。

## 4. 迁移到另一台服务器

### 4.1 新服务器首次部署

服务器需要 Node.js 22.12+；本分支在 Node.js 22.22.0、npm 10.9.4 环境中验证过。建议使用独立目录，例如 `/srv/meetmind/echo-campus`：

```bash
sudo install -d -m 0755 /srv/meetmind
cd /srv/meetmind
git clone git@github.com:xiaojinyu868-w/Meetmind_world.git
cd Meetmind_world
git fetch origin codex/echo-campus-b2b-partner-20261002
git switch --create codex/echo-campus-b2b-partner-20261002 \
  origin/codex/echo-campus-b2b-partner-20261002
cd showcase/echo-campus
npm ci
npm test
npm run build
```

如果服务器已经有这个仓库：

```bash
cd /srv/meetmind/Meetmind_world
git fetch origin codex/echo-campus-b2b-partner-20261002
git switch codex/echo-campus-b2b-partner-20261002
git pull --ff-only origin codex/echo-campus-b2b-partner-20261002
cd showcase/echo-campus
npm ci
npm test
npm run build
```

不要在仓库根目录执行 `git add .`。提交时只纳入明确需要的源码、资产和文档；本地录屏、临时渲染物、日志、活动数据和密钥不能混入提交。

### 4.2 手动启动检查

服务默认监听 `127.0.0.1:5189`，同时提供静态页面、活动 API 和 WebSocket。迁移检查可以先使用一个临时端口：

```bash
cd /srv/meetmind/Meetmind_world/showcase/echo-campus
export HOST=127.0.0.1
export PORT=5291
export ECHO_DIST_DIR="$PWD/dist"
export ECHO_EVENT_DATA=/var/lib/echo-campus-b2b/event.json
export ECHO_ALLOWED_ORIGINS=https://b2b.example.com
npm start
```

另开一个终端检查：

```bash
curl -i http://127.0.0.1:5291/api/health
curl -I http://127.0.0.1:5291/
```

`ECHO_ALLOWED_ORIGINS` 只写完整 Origin，例如 `https://b2b.example.com`，不要写 `/echo-campus/` 路径。若直接在本机打开，还可以临时加入 `http://127.0.0.1:5291`；正式环境只保留实际需要的 Origin。

### 4.3 数据目录

生产或试点数据必须放在服务目录之外、且不能被静态服务器访问，例如：

```text
/var/lib/echo-campus-b2b/event.json
```

不要把活动数据写进：

```text
showcase/echo-campus/public/
showcase/echo-campus/dist/
/root/meetmind_go/backend/data/
/var/www/echoworld/
```

`ECHO_EVENT_DATA` 应指向独立、可写、未公开的 JSON 文件。token 只在领取设备本地持有，服务端磁盘保存 hash；不要把 token、激活码、支付宝密钥或真实联系人写进仓库、URL、二维码、截图和公共日志。

## 5. systemd 服务模板

以下模板使用新服务名和示例端口 `5291`，用来避免迁移时误碰原有 `echo-campus-showcase.service`（当前线上旧服务使用 `5191`）。如果是在全新服务器上独占部署，可以按现场端口调整，但不能和已有进程冲突。

先准备数据目录和服务用户；若现场已有统一运行用户，可以替换 `User` / `Group`：

```bash
sudo useradd --system --home /srv/meetmind --shell /usr/sbin/nologin echocampus 2>/dev/null || true
sudo install -d -o echocampus -g echocampus -m 0750 /var/lib/echo-campus-b2b
sudo chown -R echocampus:echocampus /srv/meetmind/Meetmind_world/showcase/echo-campus
```

保存为 `/etc/systemd/system/echo-campus-b2b.service`：

```ini
[Unit]
Description=Echo Campus isolated B2B partner showcase
After=network.target

[Service]
Type=simple
User=echocampus
Group=echocampus
WorkingDirectory=/srv/meetmind/Meetmind_world/showcase/echo-campus
ExecStart=/usr/bin/node server/index.mjs
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=5291
Environment=ECHO_DIST_DIR=/srv/meetmind/Meetmind_world/showcase/echo-campus/dist
Environment=ECHO_EVENT_DATA=/var/lib/echo-campus-b2b/event.json
Environment=ECHO_ALLOWED_ORIGINS=https://b2b.example.com
Environment=ECHO_TRUST_PROXY=1
# 可选（v1.1）：活动配置与触碰签名密钥，文件放在服务目录与静态目录之外
# Environment=ECHO_EVENT_CONFIG=/etc/echo-campus-b2b/event.json
# EnvironmentFile=/etc/echo-campus-b2b/secrets.env   # 内含 ECHO_TAP_SECRET=...
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/var/lib/echo-campus-b2b
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

[Install]
WantedBy=multi-user.target
```

启用前先确认配置与路径：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now echo-campus-b2b
sudo systemctl status echo-campus-b2b --no-pager
curl -i http://127.0.0.1:5291/api/health
journalctl -u echo-campus-b2b -n 50 --no-pager
```

本次交付没有执行上面的新服务部署，也没有重启线上旧服务。迁移时先让新服务在独立端口通过检查，再接入域名。

## 6. Nginx 反向代理

页面、API 和 WebSocket 走同一个站点路径。`proxy_pass` 末尾的 `/` 用来把 `/echo-campus/` 前缀去掉后转给 Node 服务；`/api/live` 必须保留 HTTP/1.1 Upgrade。

在 Nginx 的 `http {}` 级别准备一次连接升级映射：

```nginx
map $http_upgrade $meetmind_b2b_connection_upgrade {
    default upgrade;
    ''      close;
}
```

在对应 `server {}` 内加入：

```nginx
location = /echo-campus {
    return 302 /echo-campus/;
}

location ^~ /echo-campus/ {
    proxy_pass http://127.0.0.1:5291/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $meetmind_b2b_connection_upgrade;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;   # v1.1：配合 ECHO_TRUST_PROXY=1 按真实来源限流
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    add_header Cache-Control "no-cache" always;
}
```

应用前检查：

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -i https://b2b.example.com/echo-campus/api/health
```

迁移后还要在真实浏览器里检查页面和 `/api/live` 建连。WebSocket 的长连接超时应高于服务端约 25 秒的心跳周期；反向代理若合并所有访客到同一个代理 IP，当前服务的限流也会按代理 IP 合并，正式活动前需要单独设计容量和限流策略。

## 7. 替换活动场景

场景入口和具体字段见 `docs/SCENE-SWAP.md`、`public/SCENE-SWAP.md`、`public/scene-template.json` 和 `src/runtime/SceneManifest.js`。可替换的视觉资产包括：

- 自包含 GLB；
- 内嵌资源的 GLTF（本地导入建议先导出成单文件 GLB）；
- Marble 或其他工具导出的 SPZ / PLY / SPLAT；
- 项目内置的程序化场景。

共同浏览的场景可以托管在 HTTPS 地址，并通过 `sceneManifest` 配置，例如：

```text
https://b2b.example.com/echo-campus/?sceneManifest=./scenes/partner-campus.json
```

每个场景都必须重新核对：

```text
schema = echo-campus.scene.v1
type = glb | splat | procedural
url
scale / position / rotation
groundY
bounds.minX / maxX / minZ / maxZ
spawn
anchors.arrival / meeting / people
cameras.hero / arrival / garden / aerial
colliders
```

`groundY`、活动 `bounds`、出生点、人物锚点和圆形碰撞壳是交互配置，不会因为替换视觉模型自动正确。SPZ/PLY/SPLAT 只提供所见的视觉空间，不能自动生成楼梯、坡道、多层地面或完整碰撞网格；新场景需要单独检查地面、人物脚底、边界、镜头和移动路径。当前本地模型导入上限为 512 MB，移动设备的内存和帧率必须用最终文件在真实设备上验证。

替换场景后至少走查：

1. 首屏和入场镜头是否把活动主体放在画面内；
2. 分身是否站在地面上，出生点不在碰撞壳内；
3. 人物锚点、活动点和相遇区域是否落在正确位置；
4. 四个预设镜头和移动端窄屏是否可用；
5. 大屏长时间运行、断线重连和场景加载失败回退是否正常。

## 8. NFC 与支付宝联调边界

当前可以把以下 HTTPS 入口写入 NFC 标签或二维码：

```text
https://b2b.example.com/echo-campus/?entry=nfc
```

它的作用是打开活动网页并进入网页侧流程。当前代码没有完成以下正式链路：实体手环/标签实机读取、支付宝正式 NFC 组件、支付宝签名验证、回调验签、活动身份映射、卡片挂失/换卡、沙箱到生产切换、现场设备联调。

正式接入应由服务端增加独立的 `NFC/Alipay Adapter`，至少明确：

- 活动 ID、点位 ID 与来宾身份的映射责任；
- 支付宝或手环侧签名、时间戳、nonce 和重放保护；
- UID/卡号的最小化保存、哈希化或短期映射；
- 绑定、重绑、挂失、补发和幂等规则；
- 签到、点位互动、积分和回调的重试与审计；
- 沙箱域名、生产域名、回调白名单和密钥存储；
- 手机未安装 App、NFC 失败、网络中断时的二维码/短链降级。

浏览器不应持有支付宝密钥，也不能把手环上的明文编号当成已认证身份。活动方应提供正式开发者文档、技术联系人、沙箱账号和设备清单后再做联调。

## 9. 迁移后的验收清单

### P0：演示闭环

- [ ] `npm test` 通过；
- [ ] `npm run build` 通过，`dist/` 已生成；
- [ ] `/api/health` 返回 200；
- [ ] 桌面和移动尺寸均可打开，首屏场景、人物和 UI 正常；
- [ ] 两个独立会话可以分别领取分身；
- [ ] 一方发起相遇，另一方确认，公共连接和大屏状态同步；
- [ ] `/api/live` 可建立 WebSocket，断线后可恢复；
- [ ] 切换场景后身份、资料和已确认关系仍保留；
- [ ] 新 GLB/SPZ 通过地面、边界、出生点、镜头和碰撞走查；
- [ ] QR/HTTPS 入口在 NFC 失败时可作为现场降级路径。

### P1：正式活动前

- [ ] 用目标数量的模拟身份做读写、WebSocket、数据增长和峰值压测；
- [ ] 至少两种 iOS/Android 真机、目标支付宝版本和低速网络实测；
- [ ] 大屏连续运行、浏览器内存、GPU、自动刷新和断线重连通过；
- [ ] 日志和导出文件不含 token、激活码、支付宝密钥或未授权联系方式；
- [ ] 现场网络、备用网络、电源、值守人、P0/P1 降级路径和彩排完成；
- [ ] 活动方书面确认参与类别、手环颜色、公开字段、数据留存/删除期限和导出范围。

这些验收项没有通过前，不要对合作方承诺“已完成实体 NFC”“已完成支付宝生态接入”“已支持千人”“已完成真人数字人”。

## 10. 更新与回滚

更新前保留当前可用 commit 和数据备份：

```bash
cd /srv/meetmind/Meetmind_world
git fetch origin codex/echo-campus-b2b-partner-20261002
git switch codex/echo-campus-b2b-partner-20261002
git pull --ff-only origin codex/echo-campus-b2b-partner-20261002
cd showcase/echo-campus
npm ci
npm test
npm run build
sudo systemctl restart echo-campus-b2b
curl -i http://127.0.0.1:5291/api/health
```

若新版本异常，先停止新服务并回到上一个已验证 commit；不要删除数据目录：

```bash
sudo systemctl stop echo-campus-b2b
cd /srv/meetmind/Meetmind_world
git switch --detach <last-known-good-commit>
cd showcase/echo-campus
npm ci
npm run build
sudo systemctl start echo-campus-b2b
```

如果旧 Showcase 仍在提供活动展示，不要停止 `echo-campus-showcase.service`，不要改 `/root/meetmind_wt_main` 的旧检出，不要改 `/root/meetmind_go`、8000 服务、`/var/www/echoworld` 或全局 Nginx 规则。

## 11. 开始下一轮开发前，合作方需要确认

1. 正式活动名称、日期、地点、入口域名和大屏文案；
2. 场地最终采用的建筑文件、版本、单位、层高、入口和贴图授权；
3. 参与类别、手环颜色、数量和补发规则；
4. 公开字段、联系方式开关、隐私同意和数据留存/删除期限；
5. 打卡点、合作方名称、积分/奖励及反作弊规则；
6. 支付宝/NFC 负责人、正式文档、沙箱/生产域名、签名和回调方式；
7. 目标手机、支付宝版本、大屏分辨率、现场网络和备用网络；
8. 预算、付款节点、最终范围和是否需要现场支持。

拿到上述材料后，下一步可以在本分支继续做场景精修、点位配置、身份适配和正式 NFC/支付宝联调；当前分支本身已经可以作为合作展示和迁移开发的稳定起点。