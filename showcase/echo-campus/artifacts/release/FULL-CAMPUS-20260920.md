# 完整园区修复与发布验收

2026-09-20。本轮解决合作方反馈的“场景不全”：从原始 AB/C 文件组合完整场地，让前端默认可见全园，并保留 T6 会客花园与现有人物互动。

## 交付入口

- [完整园区](https://capture.meetmind.online/echo-campus/?venue=venue-campus&view=event&camera=hero&rev=full-campus-20260920)
- [总平面](https://capture.meetmind.online/echo-campus/?venue=venue-campus&view=event&camera=aerial)
- [T6 交流近景](https://capture.meetmind.online/echo-campus/?venue=venue-campus&view=event&camera=garden)
- [合作体验指南](https://capture.meetmind.online/echo-campus/garden-guide/)
- [三页 PDF](https://capture.meetmind.online/echo-campus/garden-guide/Echo-Campus-Garden-Guide.pdf)

## 原因与修复

此前入口将雨棚、塔楼和 Rhino 商业裙房分别当作三个单独场景，遗漏原始文件中的 HUB 主体及完整 C 高塔。单体派生 GLB 还分别居中，不能简单叠加得到准确总园区。

现在以原始工程坐标组合三座塔楼、T6 主楼、HUB 中庭、C 商业裙房和高塔，以及统一连廊与一份道路总图。依据重合几何和组件证据去除重复版本与已定位的参考构件。来源说明见 [SOURCE-RELEASE-NOTES.md](full-campus/SOURCE-RELEASE-NOTES.md)，可复现脚本见 `scripts/build-full-campus.README.md`；组件取舍见 `scripts/build-full-campus.selection.json`。

最终 `venue-campus.glb`：17,231,728 bytes，4,801,389 triangles，627 primitives。SHA256：`78bbf162e6a3ce8ac17294bf1ca649976cbba536687f90e7598ce4c8c4ee4092`。发布前核对 public 与 dist 一致。

T6 原有活动锚点、平台高度、会客花园、人物姿态及点选行为保持原坐标。园区增加全景、总平面、塔楼、HUB、C 地块视角。建筑层与活动层均能浏览完整园区；本轮未扩展跨楼层行走或跨区域碰撞范围。

## 链接与操作

- 无场景参数的默认入口打开完整园区。
- 原 `venue-ab-canopy&view=event` 分享链接迁移到完整园区，保留原 camera。
- `view=source` 单体入口、显式 `scope=building` 单体活动入口保持单体。由单体源视图切到活动层也会写入 building 范围，刷新、手机分享、二维码与大屏入口均保留。
- 单体的“查看完整园区”按钮返回全园并清除单体范围；自定义 scene/sceneManifest 路由继续保留。

## 本轮验证

- `npm test`：157/157 通过。生产构建通过，`git diff --check` 通过。
- 独立 Chromium/Playwright 访问真实 HTTPS 生产展示站；使用新浏览器会话，未领取身份或写入活动数据。
- 桌面 1440×900 与手机模拟 390×844：24 个 UI/路由检查通过；页面错误 0、失败请求 0。七个相机按钮逐一点击，核对实际相机移动、选中态与 URL。
- 额外触控验收：七个按钮分别 tap 成功、触摸拖动改变观察角度；四个渲染出来的设备/大屏分享链接均保留单体范围。详细 JSON 与实际截图在本报告旁的 `full-campus/` 目录。
- 场景层切换、旧活动链接迁移、显式源单体、单体 source→event→刷新、返回全园均通过真实 UI 验证。
- PDF 更新园区实拍、导航说明与适配范围；3 页 A4 逐页转为 PNG 目视核验。全部 4 张图片成功解码，中文和布局无裁切。最终 PDF SHA256：`48683aad4e88a67c76d26cef157e436c4f16cbf049e01432d073f43453b08a24`。
- 验收方式：本轮采用针对改动的浏览器操作及截图脚本，无新增完整游戏任务，因此未重跑通用通关机器人；人物骨骼和动作未在本轮修改。

## 性能与证据边界

真实浏览器早先同模型加载记录约 17.36 秒；桌面渲染器快照约 740 calls、5,784,167 triangles、DPR 1。渲染面数包含额外场景与渲染 passes，不等于资产三角形数。此为测试机器/网络的一次测量，不是流畅度保证。完整园区仍是重资产，本轮不声称完成低端手机优化。

手机验收是桌面 Chromium 的移动视口与触控模拟，未代替 Android/iPhone 实机验证。原始位图贴图未完整恢复；工程源版本、竣工现场、最终活动范围仍需合作方核对。千人并发、实体 NFC 及支付宝接入不属于本轮验证。

资料中的现有视频继续作为 T6 会客花园演示，未改称完整园区新录制视频。新总览图及本轮证据均取自真实网页。中途错误坐标系/裁切距离的 Blender 检查图已弃用，不作为本轮视觉证据。

## 部署范围

仅 `/root/meetmind_wt_main/showcase/echo-campus`，分支 `codex/echo-campus-showcase-20260916`；现有 `echo-campus-showcase.service` 以 127.0.0.1:5191 服务该目录的 dist。静态构建直接更新该展示站，无服务重启。未改 Nginx、8000 原应用、`/var/www/echoworld` 或 `/root/meetmind_go` 数据。

代码及 dist 一并提交推送到当前展示分支，不合并 main、不触发原站部署。
