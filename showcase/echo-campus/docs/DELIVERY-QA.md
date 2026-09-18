# Echo Campus 最终交付验收索引

更新日期：2026-09-18。此页汇总已执行的软件与浏览器验收，以及最终媒体交付检查。记录不包含会话 token、参会者个人资料或服务密钥。

## 当前活动花园发布验证（2026-09-18）

当前展示在三份真实建筑派生模型上加入活动花园、两款共享 Tripo 风格化人物及待机/行走/挥手动作。人物、绿植、座椅与天空的生成来源见 `GENERATED-ASSET-PROVENANCE.md`；19 个成功任务共 295 credits，不等同于人民币金额。原建筑源文件保持不变。

- **自动化测试**：最终整合 96/96 通过；含访客空资料入场、同意校验、空供需不匹配和各朝向人物取景回归。
- **公网浏览器检查**：2026-09-18 检查三个场地以及 390×844 窄屏，页面/控制台错误和失败网络请求记录为空。源模型与活动视图分开显示，人物名片及场景切换纳入走查。
- **检查范围**：浏览器帧率、显存或其他性能原始读数只说明记录时的机器与视口；不代表实体手机、两天运行或千人并发已经验收。NFC 硬件、支付宝正式接口、活动身份凭据和现场网络仍需联调。
- **当前展示入口**：[活动花园](https://capture.meetmind.online/echo-campus/?view=event&venue=venue-ab-canopy&camera=arrival) · [合作展示页](https://capture.meetmind.online/echo-campus/showcase.html)。
- **当前媒体**：[约半分钟活动花园短片](https://capture.meetmind.online/echo-campus/garden-guide/Echo-Campus-Garden-Showcase.mp4) · [图文指南](https://capture.meetmind.online/echo-campus/garden-guide/) · [PDF](https://capture.meetmind.online/echo-campus/garden-guide/Echo-Campus-Garden-Guide.pdf)。短片最终 34.222 秒、1280×720 / 30 fps、H.264 + AAC，6,699,079 字节，完整解码无错误，未发现持续 0.08 秒以上黑帧，音峰 -1.5 dB；新领取界面为资料选填版本。三页 A4 PDF 已逐页渲染并人工检查。


### 本次收尾验证与部署边界

- 公网三场地、源模型/活动层互切、真实 canvas 点击资料卡、390×844 手机活动面板通过；最终 `docs/qa/garden-20260918/runtime.json` 的 errors / requests / responses 均为空。
- 修复人物卡镜头：按视口右侧面板留空，尝试五个侧前方角度避开其他来宾。取消 Google Fonts 网络依赖，以系统中文字体显示。
- 展示页分别以 1440×1000 和 390×844 验证视频播放，video.error 为 null；无横向溢出、无破损图片。导航离开时媒体流 ERR_ABORTED 为浏览器终止预加载，不是播放失败。
- 全部资料可选填；昵称为空使用稳定访客代号。主动同意必需，联系方式默认不公开。真正 HTTP + DOM 回归覆盖空资料加入、更新、推荐与双方确认。
- 视频 SHA256：`159b0708ebb46e8f736f3d33582833b1a3289684f8baf174674db507935adc61`。影片为真实浏览器录屏剪辑与 DashScope Ethan 配音，字幕按语句停顿对齐，并非逐字 ASR。
- 本轮只修改 `/root/meetmind_wt_main/showcase/echo-campus` 和重启 `echo-campus-showcase.service`（127.0.0.1:5191）。未修改 Nginx、原 8000 服务、`/var/www/echoworld`、共享数据目录或另一作品。
- 真实雨棚模型保留约五百万源面，浏览器 GPU 开销仍较高。桌面及窄屏模拟验证不替代中低端真机、千人活动和长期运行验收；按手机目标继续简化源建筑是生产准备工作。

以下保留模型转换、碰撞校准和各历史媒体的原始验证记录；历史 51/65 项测试数及旧视频/PDF 指标不代表当前媒体版本。

## 当前建筑模型来源与校准（2026-09-18）

本轮展示三份来自用户原始建筑文件的 GLB 派生模型，不再把程序化 A/B/C 外景占位图当作真实场地。两种 AB 是来源方案标签，尚未核实它们与 A、B 地块的对应关系；三个预览也不等同于已确认组装关系的总场地。

| 场景 | 来源 | 网页 GLB | 直接预览 |
| --- | --- | --- | --- |
| AB 塔楼 | 20231226_T1-3塔楼调整.skp | 3,928,840 字节 | [源模型](https://capture.meetmind.online/echo-campus/?venue=venue-ab-towers&view=source&camera=hero) |
| AB 雨棚 | 0801-T6雨棚模型-2017版本.skp | 14,998,768 字节 | [源模型](https://capture.meetmind.online/echo-campus/?venue=venue-ab-canopy&view=source&camera=hero) |
| C 原场地 | 0831 Podium.3dm | 4,028,340 字节 | [源模型](https://capture.meetmind.online/echo-campus/?venue=venue-c&view=source&camera=hero) |

view=source 隐藏额外的演示人物、互动点和关系线；源文件里自带的静态比例人物仍属于原几何。view=event 使用各模型单独校准的活动布置；camera=hero|arrival|garden|aerial 选择四机位。锚点配置提供 18 个人物槽与 5 个互动点，运行时实际人数随演示身份变化。

三份源文件保持不变，不公开分发 SKP/3DM。转换保留几何与材质颜色，**源模型位图贴图尚未恢复**，所以 `view=source` 中部分绿化仍显示为矩形板。`view=event` 对已识别的源景观占位做视觉处理并加入独立花园布置；该处理不等于恢复原始贴图。雨棚活动视图仅在拓扑与包围盒校验通过后隐藏已核验的静态比例人物，切回源模型恢复原几何，未隐藏共用建筑材质。雨棚派生文件只移除 Y<-100 米的 1,653 个离散异常面；Draco/Blender 重导出改变部分面数，不声称逐面无损。最终雨棚 GLTFLoader 解码为 199 组 / 5,046,051 面；约 15 MB 文件不代表低 GPU 开销。

### 镜头与行走范围

模型构图使用独立 framingBounds，与允许行走的 bounds 分离。入口近景使用 arrival；`view=source` 的 garden 保留建筑细节摄影机位，`view=event` 的 garden 使用活动花园人视角构图。任何摄影机位都不表示允许在所有楼层或楼顶行走。

| 场景 | 活动 X / Z 范围（米） | groundY | 校准说明 |
| --- | --- | --- | --- |
| AB 塔楼 | X36…72 / Z−236…−215 | 0.006 | 原场地开放入口区，详见场景 JSON |
| AB 雨棚 | X59…101 / Z202…212.5 | 6.2991 | 位于抬高入口平台，不能置零 |
| C 原场地 | X38…76 / Z7…38 | 0 | 角落避障圆 x40,z9.5,r4.5 |

C 与雨棚分别检查 24 个锚点 × 5 探针，均通过。另从近地面高度执行每米网格地面/身体/胶囊清障：C 1,248 点中 7 个边缘障碍点由上述碰撞圆覆盖，24 个锚点均在壳外；雨棚 473/473 点通过。逐米采样不等于连续几何碰撞证明，扩大范围必须重新校准。

真实应用的雨棚移动验证：按 D 400 ms 前 [80,6.2991,211.7]，后 [80.1211548463,6.2991,210.9326859733]，Y 保持不变；五个互动点同样保留 Y6.2991。替换分身和回到本人路径也保留配置高度。

实际浏览器已载入三个 GLB，检查源模型/活动视图、资料打开、场景切换与窄屏构图；移动尺寸是浏览器仿真，**不是实体手机性能验收**。实体 NFC、支付宝接口、真实手机与千人活动容量仍待联调。

### 历史媒体与本轮证据

旧 Echo-Campus-Showcase.mp4 是 97 秒早期程序化「白庭校园 / 水上艺廊」实录与界面截图剪辑，保留作为早期产品流程历史。它**不是本轮三份真实建筑模型的录制或验证证据**。旧 Echo-Campus-97s-preview.mp4 则是更早的视觉参考片。旧 PDF/DOCX 中的程序化场景截图也按历史材料理解。

模型导入阶段的 Partner-Scene-Guide.html / .pdf 与 venue-guide/ 保留为历史说明，注明源模型缺失位图贴图、AB 组合关系未确认和现场硬件边界。当前活动花园说明改用 garden-guide/ 与 Echo-Campus-Garden-Guide.pdf，短片为 Echo-Campus-Garden-Showcase.mp4；不要从旧文件名或旧 97 秒/60 秒指标推定当前媒体已经验收。

## 历史软件与早期媒体结论

以下历史记录来自早期程序化场景版本：软件 51 项测试、双隔离会话与测试资产导入曾通过；97 秒白庭/艺廊媒体、旧 7 页 PDF、5 页 DOCX 曾完成相应验收。这些既有记录保留以追溯，不代表本轮真实建筑模型、新视频或新文档复用了相同验收结果。

## 历史交付入口与源码（旧媒体保留）

| 内容 | 地址或位置 | 当前验收状态 |
| --- | --- | --- |
| 合作展示页 | <https://capture.meetmind.online/echo-campus/showcase.html> | 桌面与 390 像素窄屏检查通过；影片实际播放 |
| 在线 Demo | <https://capture.meetmind.online/echo-campus/> | 已实际浏览器运行 |
| 大屏入口 | <https://capture.meetmind.online/echo-campus/?mode=stage> | 使用同一独立活动服务 |
| 真实场景录制入口 | <https://capture.meetmind.online/echo-campus/?capture> | 已录制并导出 WebM；普通入口不显示工具 |
| 健康接口 | <https://capture.meetmind.online/echo-campus/api/health> | 本次文档审计实查 HTTP 成功，返回 `ok:true`、`service:echo-campus-event`、`mode:demo` |
| 展示主片 | <https://capture.meetmind.online/echo-campus/Echo-Campus-Showcase.mp4> | 最终成片已发布；完整解码与线上播放通过 |
| 合作展示 PDF | <https://capture.meetmind.online/echo-campus/Echo-Campus-Partner-Showcase.pdf> | 最终 7 页 PDF 已发布；逐页视觉检查通过 |
| 可编辑使用指南 | <https://capture.meetmind.online/echo-campus/Echo-Campus-Guide.docx> | 最终 5 页 DOCX 已发布；Word 渲染与视觉检查通过 |
| 换场景指南 | <https://capture.meetmind.online/echo-campus/SCENE-SWAP.md> | 最终在线副本已发布；与仓库指南内容一致 |
| 旧视觉参考片 | <https://capture.meetmind.online/echo-campus/Echo-Campus-97s-preview.mp4> | 单独保留，明确为建筑视觉参考与流程示意，不作为真实录屏证据 |
| GitHub 源码 | <https://github.com/xiaojinyu868-w/Meetmind_world/tree/codex/echo-campus-showcase-20260916/showcase/echo-campus> | 分支 `codex/echo-campus-showcase-20260916` |
| 权威检出 | `/root/meetmind_wt_main/showcase/echo-campus` | 与原 EchoWorld 服务及数据分离 |

`docs/SCENE-SWAP.md` 的仓库版本：<https://github.com/xiaojinyu868-w/Meetmind_world/blob/codex/echo-campus-showcase-20260916/showcase/echo-campus/docs/SCENE-SWAP.md>。

## 历史软件与交互验收

| 要求 | 已有直接证据 | 结论与范围 |
| --- | --- | --- |
| 自动测试 | `npm test`：51/51 通过；含 16 项 Happy DOM + 真实 HTTP/WebSocket 集成测试 | 通过；覆盖身份、供需推荐、双方确认、隔离访客、断线与导入等，不能替代 GPU 或硬件测试 |
| 生产构建 | `npm run build` 成功，构建页面已实际运行 | 通过；Spark 分包较大，真实手机加载和内存仍需测量 |
| 桌面真实画面 | 1440×900 浏览器视口看到实际 WebGL 建筑、水庭、景观和分身 | 通过此视口的可见性与操作检查 |
| 窄屏响应式画面 | 390×844、492×898 浏览器视口检查 | 通过响应式画面检查；不是实体手机性能结论 |
| 双隔离会话 | 两个独立身份领取分身，查看供需推荐，一方发起相遇，由另一方确认 | 闭环通过；没有用服务端直接写关系替代双方操作 |
| 换程序化场景 | 白庭校园切到水上艺廊后，本人身份及已确认关系保留 | 通过；换场景仍使用同一活动状态 |
| GLB 导入 | 随项目提供的程序化 `import-test.glb` 在真实浏览器载入且可见 | 通过该测试资产；非任意 GLB 兼容性承诺 |
| SPZ 导入 | 随项目提供的程序化 `import-test.spz` 在真实浏览器载入且可见 | 通过该测试资产；不是实际 Marble 导出的验收 |
| NFC 入口 | 已提供可写入标签的 HTTPS 入场链接与网页领取流程 | 网页链路已具备；实体 NFC 标签与手机碰触尚未现场实测 |

该历史版本的供需推荐为确定性的公开词条匹配，分身为程序化人物；当前人物已替换为共享 Tripo 风格化模型。当前演示仍未接通真人照片重建或 LLM 推荐，不在交付材料中作相应能力声明。人物移动为本机效果，共享状态包括身份、公开名片与双方已确认关系。

## 早期程序化场景真实录制素材来源

`?capture` 使用 `canvas.captureStream(30)` 与 `MediaRecorder` 录制浏览器当时正在绘制的 WebGL 画布。每段最长 35 秒；停止后可回放、下载 WebM，或导出页面内 Data URL 备份。普通入口不显示录制工具，数据备份不上传服务器。

| 素材 | 已核对信息 | 在主片中的用途 |
| --- | --- | --- |
| `campus-live.webm` | 真实浏览器白庭画布录制；1440×900；VP9；1,048 帧；约 34.93 秒 | 园区、建筑与镜头运动素材 |
| `gallery-live.webm` | 真实浏览器水上艺廊画布录制；约 35 秒 | 第二场景与可替换空间素材 |
| 实际浏览器界面截图 | 来自本轮已操作的真实页面 | 分身领取、供需资料与相遇等界面步骤；按静态截图呈现 |
| DashScope 中文旁白 | 使用用户授权配置生成的配音 | 主片解说音轨 |

画布录制不含 DOM 界面、旁白与系统声音。主片中的真实视频、静态截图和文字编排需按素材性质表达，不能把截图剪辑称作连续交互录屏。前期参考片不混作运行证据。

## 早期 97 秒影片与旧文档的验收记录

历史程序化场景影片：`Echo-Campus-Showcase.mp4`，97 秒，1920×1080、30 FPS、H.264 视频与 AAC 音频；内容为真实场景录制、实际界面截图与 DashScope 旁白。

| 最终检查 | 状态 | 已执行检查 |
| --- | --- | --- |
| 成片编码、尺寸、帧率、时长与完整解码 | 通过 | 97.00 秒、1920×1080、30 FPS、2,910 帧、H.264/AAC；全片 ffmpeg 解码无错误 |
| 关键画面、构图、文字与字幕 | 通过 | 12 个最终编码抽帧人工查看；36 条字幕无重叠，末条结束 95.84 秒 |
| 配音与音量 | 通过客观音频检查 | 复用 DashScope master；编码音轨均值 −19.3 dB、峰值 −1.5 dB；字幕使用既有语音时间戳对齐。没有把指标称作全片人工听审 |
| MP4 线上播放 | 通过 | 合作展示页播放器显示 1:37 总时长，播放进度与画面连续推进 |
| PDF 最终版 | 通过 | 7 页逐页检查；最终改动页复查，其余页与已审版本像素一致；视频链接正确 |
| DOCX 最终版 | 通过 | Word COM 渲染 5 页；最终改动页复查；a11y 检查 0 问题 |
| 交付文件一致性 | 发布脚本验收 | SHA-256、字节长度、HTTP 状态与 Content-Type 记录在 artifacts/release/delivery-manifest.json |

主片 51,585,440 字节，由真实 canvas 录制和实际产品截图剪辑而成；并非全程交互录屏。素材、编排脚本、字幕、QA 报告与录屏保存在本地交付目录。可复用的制作脚本与最终 QA 摘要一并归档到 artifacts/release。

## 换场景与现场使用的剩余边界

- 当前可切换三份已校准的建筑场地；两套早期程序化场景仍保留。自建场景可按 `SceneRegistry` 登记。GLB/GLTF 与 SPZ/PLY/SPLAT 通过统一配置入口加载，具体文件仍须验证。
- 场景配置包含变换、地面高度、范围、出生点、人物锚点、镜头与圆形碰撞。它不自动从 splat 恢复真实楼梯、坡面或地形碰撞。
- 真实 Marble 文件仍需核对其实际轴系、尺度、位置、锚点与内存开销；不能由自造 SPZ 测试结果推定通过。
- 本地导入文件仅存在当前浏览器。多端共用新场景需托管模型与 JSON，使用 `sceneManifest` 链接或 `scene-startup.json`，并逐端确认。
- 实体 NFC、活动身份凭据发放、真实手机 GPU/内存/帧率、最终场景文件、大屏设备与现场网络仍需活动前联调。
- 当前为小规模合作展示服务；未完成全场人数容量与并发压测。生产部署保持独立数据文件，不覆盖原 EchoWorld 数据。

### 历史：真实模型导入阶段发布验证

该阶段 `npm test` 为 **65/65 通过**。生产域名的三个活动场景均实际加载成功，WebSocket readyState=1，online=true；C 场景生产配置包含 x40,z9.5,r4.5 碰撞壳。三个源模型的移动尺寸浏览器视口均无横向溢出，page errors 与 console errors 为 0。详见 `production-integration-report.json`；这些帧率读数来自桌面机器上的视口仿真，不能当作手机实机帧率。

该阶段图文说明：[历史在线 HTML](https://capture.meetmind.online/echo-campus/venue-guide/) · [历史 5 页 PDF](https://capture.meetmind.online/echo-campus/Echo-Campus-Real-Venues-Guide.pdf)。PDF 已逐页渲染检查，中文与图片无裁切，7 个可点击链接保留。
### 塔楼可行走区域加密检查

AB 塔楼以 0.25 米间距检查 12,325 个近地面/身体/胶囊网格点：11,707 点安全，618 点受原花池或抬高铺面阻挡。已配置六个圆形碰撞壳，覆盖全部 618 个受阻点；连接互动点从 (55,-235) 前移至 (55,-234)。24 个出生/人物/互动锚点均通过，计入 0.28 米角色半径后仍在碰撞壳外，最小净空约 0.426 米。四分之一米离散检查不等于连续碰撞证明，运行时和生产配置仍按最终发布验收核对。

## 历史：真实模型导入阶段媒体验收（2026-09-18）

以下记录对应 60 秒场地导入影片及当时的展示页，不是当前活动花园短片的验收。

- 新片 `Echo-Campus-Real-Venues.mp4`：60.165 秒，1920×1080，30fps，H.264/AAC，48kHz；全片解码无错误。5段来自已发布模型的浏览器Canvas录制，第4段叠加真实人物名片截图并明确标注。
- 配音使用用户授权DashScope配置，模型 `qwen3-tts-instruct-flash-2026-01-26`，预设音色Ethan。最终编码音轨均值−18.9dB、峰−1.4dB。独立ASR与脚本文字相似度99.219%，无漏句/重复。字幕为句级近似对齐，第13句末字约0.35秒边界偏差，不宣称逐字对齐或人工全片听审。
- `showcase.html`已换为三份真实模型入口、新片和新版五页PDF；原97秒片仅作为早期程序化场景资料链接保留。
- 生产播放器实际推进到2.9秒，片长、1920×1080均正常；三张缩略图加载成功，390px页面无水平溢出，视频/PDF/HTML链接均HTTP 200。
- 最终65项测试通过、生产构建通过；新塔楼配置6圆壳和前移的互动点已通过生产读取。前一轮完整生产检查确认三模型source/event、WebSocket在线且无页面/控制台错误。
- 本次仅更新独立showcase的代码、静态模型和媒体；无后端服务重启，无原EchoWorld代码/端口8000或业务数据改动。活动数据版本是数据变化计数，不代表软件版本。

可复现制作与校验脚本、来源证据和原始录制保留在本地 `output/venue-models/`；最终交付ZIP包含清理后的网页模型、配置、文档、视频与QA，不含SKP/3DM源档、转换SDK、凭据或活动私密数据。
