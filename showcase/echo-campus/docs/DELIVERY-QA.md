# Echo Campus 最终交付验收索引

更新日期：2026-09-16。此页汇总已执行的软件与浏览器验收，以及最终媒体交付检查。记录不包含会话 token、参会者个人资料或服务密钥。

## 当前结论

可交互原型的软件构建、48 项测试、实际浏览器画面、双隔离会话的相遇流程及测试场景导入已通过。真实 WebGL 录制素材已取得。97 秒展示主片的最终解码、画面、字幕、声音与线上播放验收仍由交付负责人完成；在下方状态更新前，不将成片视作最终通过。

## 交付入口与源码

| 内容 | 地址或位置 | 当前验收状态 |
| --- | --- | --- |
| 在线 Demo | <https://capture.meetmind.online/echo-campus/> | 已实际浏览器运行 |
| 大屏入口 | <https://capture.meetmind.online/echo-campus/?mode=stage> | 使用同一独立活动服务 |
| 真实场景录制入口 | <https://capture.meetmind.online/echo-campus/?capture> | 已录制并导出 WebM；普通入口不显示工具 |
| 健康接口 | <https://capture.meetmind.online/echo-campus/api/health> | 本次文档审计实查 HTTP 成功，返回 `ok:true`、`service:echo-campus-event`、`mode:demo` |
| 展示主片 | <https://capture.meetmind.online/echo-campus/Echo-Campus-Showcase.mp4> | 目标发布路径；最终成片 QA 与发布待负责人确认 |
| 合作展示 PDF | <https://capture.meetmind.online/echo-campus/Echo-Campus-Partner-Showcase.pdf> | 已有交付文件；最终更新版与线上一致性待负责人确认 |
| 可编辑使用指南 | <https://capture.meetmind.online/echo-campus/Echo-Campus-Guide.docx> | 目标发布路径；最终版渲染及发布待负责人确认 |
| 换场景指南 | <https://capture.meetmind.online/echo-campus/SCENE-SWAP.md> | 目标发布路径；仓库 `docs/SCENE-SWAP.md` 已更新，在线副本待负责人发布确认 |
| 旧视觉参考片 | <https://capture.meetmind.online/echo-campus/Echo-Campus-97s-preview.mp4> | 单独保留，明确为建筑视觉参考与流程示意，不作为真实录屏证据 |
| GitHub 源码 | <https://github.com/xiaojinyu868-w/Meetmind_world/tree/codex/echo-campus-showcase-20260916/showcase/echo-campus> | 分支 `codex/echo-campus-showcase-20260916` |
| 权威检出 | `/root/meetmind_wt_main/showcase/echo-campus` | 与原 EchoWorld 服务及数据分离 |

`docs/SCENE-SWAP.md` 的仓库版本：<https://github.com/xiaojinyu868-w/Meetmind_world/blob/codex/echo-campus-showcase-20260916/showcase/echo-campus/docs/SCENE-SWAP.md>。

## 软件与交互验收

| 要求 | 已有直接证据 | 结论与范围 |
| --- | --- | --- |
| 自动测试 | `npm test`：48/48 通过；含 14 项 Happy DOM + 真实 HTTP/WebSocket 集成测试 | 通过；覆盖身份、供需推荐、双方确认、隔离访客、断线与导入等，不能替代 GPU 或硬件测试 |
| 生产构建 | `npm run build` 成功，构建页面已实际运行 | 通过；Spark 分包较大，真实手机加载和内存仍需测量 |
| 桌面真实画面 | 1440×900 浏览器视口看到实际 WebGL 建筑、水庭、景观和分身 | 通过此视口的可见性与操作检查 |
| 窄屏响应式画面 | 390×844、492×898 浏览器视口检查 | 通过响应式画面检查；不是实体手机性能结论 |
| 双隔离会话 | 两个独立身份领取分身，查看供需推荐，一方发起相遇，由另一方确认 | 闭环通过；没有用服务端直接写关系替代双方操作 |
| 换程序化场景 | 白庭校园切到水上艺廊后，本人身份及已确认关系保留 | 通过；换场景仍使用同一活动状态 |
| GLB 导入 | 随项目提供的程序化 `import-test.glb` 在真实浏览器载入且可见 | 通过该测试资产；非任意 GLB 兼容性承诺 |
| SPZ 导入 | 随项目提供的程序化 `import-test.spz` 在真实浏览器载入且可见 | 通过该测试资产；不是实际 Marble 导出的验收 |
| NFC 入口 | 已提供可写入标签的 HTTPS 入场链接与网页领取流程 | 网页链路已具备；实体 NFC 标签与手机碰触尚未现场实测 |

供需推荐为确定性的公开词条匹配；分身为风格化程序化人物。当前演示未接通真人照片重建或 LLM 推荐，不在交付材料中作相应能力声明。人物移动为本机效果，共享状态包括身份、公开名片与双方已确认关系。

## 真实录制素材来源

`?capture` 使用 `canvas.captureStream(30)` 与 `MediaRecorder` 录制浏览器当时正在绘制的 WebGL 画布。每段最长 35 秒；停止后可回放、下载 WebM，或导出页面内 Data URL 备份。普通入口不显示录制工具，数据备份不上传服务器。

| 素材 | 已核对信息 | 在主片中的用途 |
| --- | --- | --- |
| `campus-live.webm` | 真实浏览器白庭画布录制；1440×900；VP9；1,048 帧；约 34.93 秒 | 园区、建筑与镜头运动素材 |
| `gallery-live.webm` | 真实浏览器水上艺廊画布录制；约 35 秒 | 第二场景与可替换空间素材 |
| 实际浏览器界面截图 | 来自本轮已操作的真实页面 | 分身领取、供需资料与相遇等界面步骤；按静态截图呈现 |
| DashScope 中文旁白 | 使用用户授权配置生成的配音 | 主片解说音轨 |

画布录制不含 DOM 界面、旁白与系统声音。主片中的真实视频、静态截图和文字编排需按素材性质表达，不能把截图剪辑称作连续交互录屏。前期参考片不混作运行证据。

## 主片与文档的最终检查

目标主片：`Echo-Campus-Showcase.mp4`，97 秒，1920×1080、30 FPS、H.264 视频与 AAC 音频；内容为真实场景录制、实际界面截图与 DashScope 旁白。

| 最终检查 | 状态 | 负责人完成后补充 |
| --- | --- | --- |
| 成片编码、尺寸、帧率、时长与完整解码 | 待最终验收 | 媒体探测与解码结果 |
| 关键画面、构图、文字与字幕无遮挡 | 待最终验收 | 抽帧/播放检查结论 |
| 配音、音量与画面节奏 | 待最终验收 | 听审或音频检查范围 |
| MP4 线上可取、可播放且与最终本地文件一致 | 待发布确认 | 地址及文件一致性证据 |
| PDF 最终版渲染、分页与文字检查 | 待最终版确认 | 渲染检查结论 |
| DOCX 最终版渲染、分页与文字检查 | 待最终版确认 | 渲染检查结论 |
| 场景指南在线副本与仓库版本一致 | 待发布确认 | 下载与内容检查结论 |

此处未勾选的项目保持未完成状态，不能用软件测试通过代替媒体或文档视觉验收。

## 换场景与现场使用的剩余边界

- 可切换两套程序化场景；自建场景可按 `SceneRegistry` 登记。GLB/GLTF 与 SPZ/PLY/SPLAT 通过统一配置入口加载，具体文件仍须验证。
- 场景配置包含变换、地面高度、范围、出生点、人物锚点、镜头与圆形碰撞。它不自动从 splat 恢复真实楼梯、坡面或地形碰撞。
- 真实 Marble 文件仍需核对其实际轴系、尺度、位置、锚点与内存开销；不能由自造 SPZ 测试结果推定通过。
- 本地导入文件仅存在当前浏览器。多端共用新场景需托管模型与 JSON，使用 `sceneManifest` 链接或 `scene-startup.json`，并逐端确认。
- 实体 NFC、活动身份凭据发放、真实手机 GPU/内存/帧率、最终场景文件、大屏设备与现场网络仍需活动前联调。
- 当前为小规模合作展示服务；未完成全场人数容量与并发压测。生产部署保持独立数据文件，不覆盖原 EchoWorld 数据。