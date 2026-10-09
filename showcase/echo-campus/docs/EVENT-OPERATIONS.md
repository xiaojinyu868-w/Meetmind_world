# 活动当天：容量、上线、值守与应急

## 1. 实测容量（2026-10-09）

**服务端**（`node scripts/load-event.mjs --guests 300 --peak-seconds 90 --rate 9`：真实服务进程、生产参数）

300 位来宾在 17 秒内入场并保持在线；随后 90 秒高峰，每秒 9 个动作（邀请、确认、碰点位、改名片），每台手机收到「个人数据有变化」时都去刷新收件箱。

| 指标 | 结果 |
| --- | --- |
| 错误 | 0 |
| 写请求延迟 | p50 8 ms，p95 21 ms，p99 30 ms |
| 服务端 CPU / 内存 | 6.5% / 177 MB |
| 推给手机的总流量 | 1.7 MB/s（旧的「每次变动推全量」在同样场景下约 450–515 MB/s） |
| 一致性 | 300 台手机最后的状态和服务器逐项一致，没有漏收 |

**同屏人数**：电脑和大屏 50 人、手机 30 人。60 人同屏时，每多一人只多约 1.3 万个三角面、5 次绘制，帧率没有可测的下降。超出的人每 10 分钟轮换一批，所有屏幕同一时刻是同一批（手机是大屏那批的前 30 人）；刚到场 3 分钟内的人排在最前。

**带宽**：手机第一次打开约 14.5 MB（会场模型 7.7 MB，每款分身约 0.63 MB）。服务器出口实测约 5–6 MB/s（从开发机下载；上限也可能在开发机一侧）。按这个算，100 台手机在 5 分钟内同时第一次打开，会占满出口约 4–5 分钟。再次打开时，带版本号的资源直接用缓存，页面和其余文件只走 304：线上实测从每次 14.5 MB 降到 0 MB（在此之前 Nginx 强制 `no-cache`、应用没有校验头，每次打开都要整份重下）。预计超过约 150 人集中入场时，给 `/echo-campus/` 上 CDN，或安排分批入场。

**大屏长时间运行**：见第 6 节。

## 2. 开一场活动（服务器上）

1. 活动配置：从 `config/events/jiangsu-investor-night.example.json` 复制到 `/etc/echo-campus-b2b/event.json`，按活动方确认的名称、时间、地点、类别和打卡点修改。服务启动时严格校验，写错会拒绝启动并指出哪一项。
2. 写一个 systemd 补充配置，不改主 unit：

   ```ini
   # /etc/systemd/system/echo-campus-b2b.service.d/event.conf
   [Service]
   Environment=ECHO_EVENT_CONFIG=/etc/echo-campus-b2b/event.json
   Environment=ECHO_EVENT_DATA=/var/lib/echo-campus-b2b/jiangsu-investor-night.json
   Environment=ECHO_BACKUP_DIR=/var/lib/echo-campus-b2b/backups/jiangsu-investor-night
   Environment=ECHO_PARTNER_FEED_URL=https://<呆猫接口地址>
   Environment=ECHO_PARTNER_FEED_LABEL=呆猫小镇
   Environment=ECHO_PARTNER_FEED_SOURCE=daimao
   ```

   呆猫的 token 写进 `/etc/echo-campus-b2b/secrets.env`：`ECHO_PARTNER_FEED_TOKEN=...`（root 600）。
3. `systemctl daemon-reload && systemctl restart echo-campus-b2b`，再 `curl -s http://127.0.0.1:5191/api/health`：`mode` 应为 `event`，`attendees` 为 0，`remote.ok` 为 `true`。
4. 演示数据仍在原来的 `/var/lib/echo-campus-b2b/event.json`。活动结束删掉 `event.conf` 再重启，就回到演示。
5. 物料编码清单：`node scripts/nfc-tags.mjs --config /etc/echo-campus-b2b/event.json --wristbands investor:40,founder:120,guest:60 --checkpoints welcome,stage,roadshow --gates south --out nfc-tags.csv`。

## 3. 现场看什么

`curl -s http://127.0.0.1:5191/api/health`，每隔几分钟看一次：

| 字段 | 正常 | 异常时 |
| --- | --- | --- |
| `attendees` | 随入场增长 | 不动：看日志里入场是否报错 |
| `live` | 约等于在线手机数加大屏 | 远低于在场人数：手机在用 10 秒轮询，功能正常但更新慢，查现场网络 |
| `remote.ok` / `remote.failures` | `true` / `0` | `false`：呆猫接口不可用，地图保留上一份名单，不影响现场 |
| `memoryMb` | 低于 500 | 持续上涨：重启服务（数据不丢） |
| `cpuMs` | 每分钟增长低于 6000 | 持续偏高：查日志 |

日志：`journalctl -u echo-campus-b2b -f`。

## 4. 应急

| 情况 | 处理 |
| --- | --- |
| 服务无响应 | `systemctl restart echo-campus-b2b`。最多丢最近 0.4 秒的变动；手机自动重连并补齐 |
| 刚上线的版本有问题 | 按交接文档的回滚命令切回上一个 commit |
| 数据文件损坏 | 停服务，用 `ls -t $ECHO_BACKUP_DIR \| head -1` 找到最新备份，复制覆盖数据文件，再启动 |
| 碰不出 | 扫同一件物料上的二维码；大屏右下角也有入场二维码 |
| 呆猫接口挂了 | 不影响现场；地图保留上一份名单，恢复后自动更新 |
| 现场网络中断 | 页面提示连接不可用，场景仍可浏览；恢复后自动重连并补齐 |
| 大屏越来越卡 | 刷新大屏页面（`?mode=stage`） |

## 5. 活动结束

1. 删掉 `event.conf`，`systemctl daemon-reload && systemctl restart echo-campus-b2b`，回到演示。
2. 按和活动方约定的期限，删除这场的数据文件和备份目录。

## 6. 大屏长时间运行（2026-10-09）

开发机、无头 Chrome、1920×1080 大屏模式，60 位来宾在场（同屏 50 人），每 5 秒有 2 人离开、2 人到场、3 次碰点位和 1 段新相遇（约为正常节奏的 6 倍），连续 4 分钟、每 20 秒采样一次（强制垃圾回收后）：

| 指标 | 开始 | 4 分钟后 |
| --- | --- | --- |
| JS 堆 | 34.9 MB | 37.1 MB |
| DOM 节点 / 事件监听 | 497 / 43 | 566 / 43 |
| 场景对象 | 3299 | 3337 |
| 几何体 / 贴图 | 338 / 113（加载中）→ 375 / 134 | 381 / 134 |

没有泄漏：内存、页面节点、场景对象和显存资源都是平的，新相遇的连线会让几何体缓慢增加（每段一条）。帧率在 17–68 之间波动，没有持续下降的趋势；开发机的无头渲染本身不稳定，**活动前必须在现场那台大屏电脑上连续跑一小时**，看帧率和内存。不带强制回收的 20 分钟长测里，堆会在 40–80 MB 之间起落，属于正常的回收节奏。
