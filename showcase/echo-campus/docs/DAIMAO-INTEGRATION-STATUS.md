# 相遇之庭 × 呆猫：联调进度

更新：2026-10-15

**一句话**：我们这边能做的都做完了，接口在线上开着，呆猫会走的每一步都在同一份代码上演练通过。剩下的要等呆猫给校验文件、接后端和 web-view，以及活动方给正式活动信息。

## 已完成

| 日期 | 事项 | 在哪 |
| --- | --- | --- |
| 10-14 | 接口需求 v1：呆猫要做的 7 件事、换票字段、返回、错误码、联调步骤 | `DAIMAO-MINIPROGRAM-API.md` |
| 10-14 | 线上开启合作接口：换票进入地图、现场到场即上大屏并弹欢迎卡、碰一碰连线、数据导出 | `https://capture.meetmind.online/echo-campus/`，`/api/health` 的 `partnerApi` 为 `true` |
| 10-15 | 安全检查：服务日志和 Nginx 日志里查不到 token；给呆猫的导出不含联系方式 | — |
| 10-15 | 完整演练，29/29 通过 | `scripts/partner-rehearsal.mjs`，报告 `qa/daimao-rehearsal-20261015.json` |
| 10-15 | `/echo-campus/` 访问日志不再记入场票据 | `deploy/nginx-log-format.conf`，线上 `/etc/nginx/conf.d/00-echo-campus-log.conf` |
| 10-15 | 业务域名校验文件的上线脚本，已在线上试过上线、重复上线、撤掉 | `scripts/place-verify-file.sh` |

## 演练覆盖了什么

演练脚本在本机另起一个临时实例（独立的数据文件和 token，跑完删除），按呆猫后台和 web-view 的调用顺序逐步核对：

- 鉴权：不带 token、token 错误都被拒；缺少 `consent`、uid 用手机号这类明文都被拒。
- 新用户：换票 → web-view 打开地图页 → 页面认领票据，提示先挑形象 → 带票入场，出现在地图上。
- 老用户：再换票返回 `returning`，认领后直接登录同一个人；呆猫改了昵称，地图上跟着变。
- 现场到场：`checkin: true` 不用打开地图就上图；重复到场不重复建人。
- 碰一碰连线：新连线 201，重复推送 200，一方没上图 404。
- 数据导出：有两位用户的资料、连线（来源 `daimao`）和到场时间；没有 token、票据、手机号、邮箱；公开数据里看不到呆猫 uid。
- 异常：过期票据 410，格式不对 400，白名单以外的来源 403；服务日志里没有 token 和票据。

重跑：`cd showcase/echo-campus && node scripts/partner-rehearsal.mjs`（默认端口 5391，端口被占用会直接退出，不会碰已有服务）。

## 等呆猫

| 事项 | 收到后我们做什么 |
| --- | --- |
| 业务域名校验文件 | `sudo bash scripts/place-verify-file.sh <文件>`，脚本核对线上内容和原文件一致后，把链接回给呆猫 |
| 后端换票、web-view | 他们拿到 token 先调一次 `ping`；第一位真实用户进来时看 `journalctl -u echo-campus-b2b` 和地图上的状态 |
| 活动页小程序码（PNG） | 写进正式活动配置的 `entry.qrImage`（站内路径或 https 地址，见 `EVENT-PROFILE.md`），随活动配置一起上线；演示模式下大屏继续显示我们自己的二维码 |
| 要用哪些可选接口 | 确认是否调用到场（`checkin`）、连线、导出 |

token 由我们私下发，读取：`sudo grep ECHO_PARTNER_API_TOKEN /etc/echo-campus-b2b/secrets.env`。现在这个是联调用的，正式活动切换时更换。

## 活动前（我们这边）

- 活动方给正式信息：名称、时间、地点、参与类别、打卡点、公开字段、数据保留和删除期限、导出范围（书面确认）。
- 写活动配置并切换，清空测试数据，换 token 私下发给呆猫：`EVENT-OPERATIONS.md` 第 2 节。
- 真机：iOS 和 Android 各至少一台，在呆猫小程序里走一遍换票、入场、到场、连线。
- 现场大屏电脑连续跑 1 小时（开发机 20 分钟的结果见 `EVENT-OPERATIONS.md` 第 6 节）。
- 现场网络、备用网络、值守人和彩排。

## 发给呆猫的话（可直接转发；token 另外私下发）

> 相遇之庭这边和呆猫小程序的对接接口已经上线，文档见附件《相遇之庭 × 呆猫小程序：接口需求 v1》。需要你们做三件事：
>
> 1. 小程序后台「开发管理 → 开发设置 → 业务域名」添加 `capture.meetmind.online`，把下载的校验文件发给我，我们当天放好；
> 2. 后端调用换票接口 `POST /api/partner/tickets`（token 我单独发你，只放在你们服务端）；
> 3. 小程序用 web-view 打开接口返回的 `url`。
>
> 建议再做两件：用户在现场时换票带上 `checkin: true`，人会直接出现在大屏上；发我们一张活动页的小程序码（PNG），放在大屏左下角。
>
> 拿到 token 后可以先调 `GET /api/partner/ping` 自检，再换一张票，用手机浏览器打开返回的链接就能看到效果，不用等小程序。
