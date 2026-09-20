# Echo Campus · 白庭

把活动现场的一次相遇，带进一座可以共同浏览的数字园区。

**合作展示页：<https://capture.meetmind.online/echo-campus/showcase.html>**  
**在线演示：<https://capture.meetmind.online/echo-campus/>**  
**大屏模式：<https://capture.meetmind.online/echo-campus/?mode=stage>**

项目独立于 EchoWorld 线上业务。默认入口现为按原始工程坐标组合的完整园区，包含塔楼、T6 主楼、HUB 中庭、C 地块及连廊；三个历史单体预览和早期程序化「白庭校园」「水上艺廊」仍可单独查看。活动服务支持演示分身领取、公开供需名片、匹配理由、双方确认相遇与跨设备同步。

## 屋面闪烁修复（2026-09-20）

已定位 C 商业屋顶饰面与基底共面造成的镜头闪烁，并按来源/材质设置有限深度优先级；T6 混凝土基底同类面同步处理。远景阴影按覆盖范围修正，近景人物接触阴影不变，原 GLB 几何保持原哈希。167 项测试及真实浏览器轨道、缩放、建筑/活动层和移动视口复查通过。详见 [修复与证据](artifacts/release/ROOF-FLICKER-FIX-20260920.md)。

## 完整园区（2026-09-20）

[打开完整园区](https://capture.meetmind.online/echo-campus/?venue=venue-campus&view=event&camera=hero) · [最新发布报告](artifacts/release/FULL-CAMPUS-20260920.md)

园区来自五份已核验的原始工程来源：T1–3 塔楼、T6 雨棚/主楼、HUB 中庭、20230518 C 商业裙房与高塔、UFO+escalator 连廊。实例在原工程坐标展开后统一换至现有 T6 坐标，重叠道路与连廊按来源审计选择一个版本；未凭猜测摆放建筑。组合资产 `venue-campus.glb` 为 **17,231,728 字节、4,801,389 个三角面**，构建与压缩审计见 `public/scenes/venue/venue-campus.*.audit.json`。

- 底部四机位为完整园区 `hero`、活动入口 `arrival`、近看交流 `garden`、总平面 `aerial`；分区按钮对应塔楼 `towers`、HUB 中庭 `hub`、C 地块 `commercial`。
- 无参数链接默认进入完整园区。旧 `venue=venue-ab-canopy&view=event` 活动链接迁移至完整园区并保留指定镜头；`view=source` 原单体直链不迁移。显式 `scope=building` 保留单体，视图切换、刷新和分享均延续该选择。
- 完整园区的「园区建筑 / 活动布置」共用同一组合建筑资产，切换独立活动层。活动人物和五个点位仍落在已校准的 T6 平台：X59…101、Z202…212.5、Y6.2991；完整园区可浏览不等于已支持全园区自由行走或跨楼层碰撞。

原始位图贴图尚未完整恢复，当前材质与活动配景经过展示处理。多个日期的工程版本已按来源证据组合，但与实际竣工现场的版本一致性、活动动线仍需场地方确认；该组合不替代现场勘测。下文 2026-09-18 的三单体和媒体记录为历史证据，当前交付状态以最新发布报告为准。

## 本轮视觉与性能改造（2026-09-20）

活动态参考摄影游戏 `lumen-photo-game` 的暖光、蓝紫阴影与手绘天空，保留本站完整骨骼社交人物；建筑源预览与活动专用派生 GLB 分开。公开页默认桌面 `balanced`、手机视口 `low`，重型后处理仅在显式 `?quality=cinema` 开启。远景植物、人物点选和接触阴影同步调整。实现、改造前实测、待补最终复测与限制见 [视觉与性能记录](docs/VISUAL-PERFORMANCE-20260920.md)；桌面手机视口模拟不等于实体手机验收。

## 历史：三单体场地预览（2026-09-18）

以下记录对应 2026-09-18 的三个单体预览，不代表当前默认园区。该阶段展示三份来自用户原始建筑文件的 GLB 派生模型；两种 AB 为来源方案标签，当时尚未组合总场地。独立预览链接继续保留，当前完整园区见上节。

| 场景 | 来源 | 网页 GLB | 直接预览 |
| --- | --- | --- | --- |
| AB 塔楼 | 20231226_T1-3塔楼调整.skp | 3,928,840 字节 | [源模型](https://capture.meetmind.online/echo-campus/?venue=venue-ab-towers&view=source&camera=hero) |
| AB 雨棚 | 0801-T6雨棚模型-2017版本.skp | 14,998,768 字节 | [源模型](https://capture.meetmind.online/echo-campus/?venue=venue-ab-canopy&view=source&camera=hero) |
| C 原场地 | 0831 Podium.3dm | 4,028,340 字节 | [源模型](https://capture.meetmind.online/echo-campus/?venue=venue-c&view=source&camera=hero) |

view=source 隐藏额外的演示人物、互动点和关系线；源文件里自带的静态比例人物仍属于原几何。view=event 使用各模型单独校准的活动布置；camera=hero|arrival|garden|aerial 选择四机位。锚点配置提供 18 个人物槽与 5 个互动点，默认只渲染 6 位内置人物，完整资料列表保留；真实加入者优先渲染，本人和选中者始终可见。人物网格上限 36，超额使用展示层取舍，不能代表千人同屏容量。

三份源文件保持不变，不公开分发 SKP/3DM。转换保留几何与材质颜色，**位图贴图尚未恢复**，所以部分绿化显示为矩形板。雨棚派生文件只移除 Y<-100 米的 1,653 个离散异常面；Draco/Blender 重导出改变部分面数，不声称逐面无损。最终雨棚 GLTFLoader 解码为 199 组 / 5,046,051 面；约 15 MB 文件不代表低 GPU 开销。

### 镜头与活动落位范围

模型构图使用独立 framingBounds，与活动布置校准的 bounds 分离。入口近景使用 arrival；garden 是双人交流近景机位，不表示允许在所有楼层或楼顶行走。

| 场景 | 活动 X / Z 范围（米） | groundY | 校准说明 |
| --- | --- | --- | --- |
| AB 塔楼 | X36…72 / Z−236…−215 | 0.006 | 原场地开放入口区，详见场景 JSON |
| AB 雨棚 | X59…101 / Z202…212.5 | 6.2991 | 位于抬高入口平台，不能置零 |
| C 原场地 | X38…76 / Z7…38 | 0 | 角落避障圆 x40,z9.5,r4.5 |

C 与雨棚分别检查 24 个锚点 × 5 探针，均通过。另从近地面高度执行每米网格地面/身体/胶囊清障：C 1,248 点中 7 个边缘障碍点由上述碰撞圆覆盖，24 个锚点均在壳外；雨棚 473/473 点通过。逐米采样不等于连续几何碰撞证明，扩大范围必须重新校准。

历史自由行走模式（当前展示已停用）的雨棚移动验证：按 D 400 ms 前 [80,6.2991,211.7]，后 [80.1211548463,6.2991,210.9326859733]，Y 保持不变；五个互动点同样保留 Y6.2991。替换分身和回到本人路径也保留配置高度。

实际浏览器已载入三个 GLB，检查源模型/活动视图、资料打开、场景切换与窄屏构图；移动尺寸是浏览器仿真，**不是实体手机性能验收**。实体 NFC、支付宝接口、真实手机与千人活动容量仍待联调。

### 历史媒体与本轮证据

旧 Echo-Campus-Showcase.mp4 是 97 秒早期程序化「白庭校园 / 水上艺廊」实录与界面截图剪辑，保留作为早期产品流程历史。它**不是本轮三份真实建筑模型的录制或验证证据**。旧 Echo-Campus-97s-preview.mp4 则是更早的视觉参考片。旧 PDF/DOCX 中的程序化场景截图也按历史材料理解。

本轮合作图文说明为 Partner-Scene-Guide.html / .pdf，采用真实模型截图，并注明缺失位图贴图、AB 组合关系未确认和现场硬件边界。本轮新视频以合作展示页当前明确标注的真实场地视频为准；不要从旧文件名或旧 97 秒指标推定新媒体已经验收。

## 最快的体验方式

1. 在电脑打开 [完整园区](https://capture.meetmind.online/echo-campus/?venue=venue-campus&view=event&camera=hero)。先看全景，再用塔楼、HUB 中庭、C 地块分区按钮靠近建筑；底部可切活动入口、近看交流和总平面，左侧可对照园区建筑与活动布置。
2. 点击右上「导览」自动环绕，或「演示」播放约 90 秒的产品导览。
3. 点击「领取我的分身」，所有资料均选填；也可以留空以临时访客身份进入。需主动勾选公开展示同意；供需留空不会生成推荐。
4. 点选人物看名片；在「我的分身」中点击「发现值得认识的人」，展开每条推荐查看双方的供需依据。
5. 需要演示真实连接时，按下一节用两台设备互相确认。
6. 想换场景，点击「场景」；从 Marble 导出的 SPZ 和自建 GLB 都从同一个入口导入。详见 [场景替换指南](docs/SCENE-SWAP.md)。

环境声默认关闭，点击右上「声音」后播放轻量入场与连接提示音。当前采用完整骨骼社交呈现：默认 6 位内置来宾组成 3 对，完整播放放松站立、交谈回应和一次性招呼；保留躯干、手腕、双腿与重心变化，不冻结动作中间帧。每对错开手势节奏，动作完成后平滑返回站立；底部「近看交流」直达双人镜头。不自动巡游、不播放原地 Walk。桌面 WASD / 方向键平移镜头浏览空间，不再驱动分身；手机仍支持拖动镜头、点选与表单操作。人物位置不是跨设备实时定位。

## 手机扫码 + 大屏的双端演示

1. 电脑打开 [大屏模式](https://capture.meetmind.online/echo-campus/?mode=stage)，右下显示通用领取二维码。
2. 第一部手机扫码，填写并同意展示演示资料。大屏应出现新增分身。
3. 第二部手机扫码领取另一个分身，使用不同昵称便于辨认。
4. 在任一手机点选对方 →「发起一次相遇」。
5. 对方打开右下「我的相遇」图标 →「确认相遇」。
6. 两端名片显示已确认；大屏公共世界出现双方确认的关系。

界面的「NFC / 双端体验」面板提供第一设备、第二设备和大屏入口。两种设备入口均不预填人物资料；昵称与角色留空时使用临时访客昵称和“来宾”。要演示供需推荐，可由双方自愿填写实际供需。公开入口可反复供新浏览器领取演示身份；已有本机会话会继续使用本人身份。底层仍保留带卡号和激活凭据的受控领取接口，供后续活动凭据联调。

**普通标签页共享身份。** 真实双端体验仍可用两部手机。只有一台电脑时，在「NFC / 双端体验」面板点击「同机演示：独立访客窗口」：新窗口使用 `?entry=nfc&persona=02&demoSession=tab`，身份保存在该窗口的 sessionStorage，与普通窗口的 localStorage 身份分开。该访客窗口可刷新并继续同一身份；关闭后需重新领取。入口以 `rel="noopener"` 打开，避免复制来源窗口的会话。二维码和普通设备入口保持原有跨设备流程。

NFC 在本项目中的入口形式是普通 HTTPS 链接。可将通用入口写入标签：
<https://capture.meetmind.online/echo-campus/?entry=nfc>

通用入口目前允许创建演示身份，不证明持卡人身份。真实活动的卡片发放、私密激活凭据、手机 NFC 行为及现场网络需要活动前联调。项目没有宣称已经用实体 NFC 卡实测。

## 本地运行

需要 Node.js 22.12+（本次实现使用 22.22）及 npm。进入本项目根目录：

~~~bash
npm ci
npm test
npm run build
npm start
~~~

打开 <http://127.0.0.1:5189/>。同一服务提供页面、HTTP API 与 WebSocket。

Windows PowerShell 局域网体验示例：

~~~powershell
$env:HOST = "0.0.0.0"
$env:PORT = "5189"
$env:ECHO_ALLOWED_ORIGINS = "http://192.168.1.100:5189"
npm start
~~~

将上例 IP 换成电脑实际局域网 IP；手机和电脑加入同一网络，访问该地址。按需要允许系统防火墙通过 5189 端口。正式演示优先使用已部署的 HTTPS 地址，避免访客 Wi-Fi 隔离与手机 HTTP 限制。

开发模式使用两个终端：

~~~bash
# 终端 1：macOS/Linux
ECHO_ALLOWED_ORIGINS=http://127.0.0.1:5190,http://localhost:5190 npm start

# 终端 2
npm run dev
~~~

Windows 的终端 1 先运行：
~~~powershell
$env:ECHO_ALLOWED_ORIGINS = "http://127.0.0.1:5190,http://localhost:5190"
npm start
~~~

开发页面是 <http://127.0.0.1:5190/>；Vite 把 /api 与 WebSocket 转发到 5189。

## 独立部署与更新

当前在线入口：

| 项目 | 当前值 |
| --- | --- |
| 页面 | https://capture.meetmind.online/echo-campus/ |
| 服务 | echo-campus-showcase.service |
| 监听 | 127.0.0.1:5191 |
| 检出 | /root/meetmind_wt_main/showcase/echo-campus |
| 独立演示数据 | /var/lib/echo-campus/event.json |
| Origin | https://capture.meetmind.online |
| 健康接口 | /echo-campus/api/health |

当前服务已与原 EchoWorld 的 8000 后端和生产数据目录隔离。不要把演示数据写入线上 backend/data/，也不要用本项目覆盖 /var/www/echoworld。

部署到新域名或路径时需满足：

- Node.js 22.12+，先 npm ci、npm test、npm run build。
- 静态页面与 API 使用同一个站点路径；子路径反代应将前缀去掉后交给服务。
- WebSocket /api/live 开启 HTTP/1.1 Upgrade 转发，连接超时长于 25 秒心跳周期。
- ECHO_ALLOWED_ORIGINS 填完整 Origin，只有协议、域名及端口，不含路径。
- ECHO_EVENT_DATA 指向单独、可写、未公开的演示数据文件。
- 反向代理请求会合用代理 IP 的限流额度；当前是小规模合作展示服务，正式大活动需容量及限流策略联调。

常用只读检查：

~~~bash
systemctl status echo-campus-showcase
journalctl -u echo-campus-showcase -n 50 --no-pager
curl https://capture.meetmind.online/echo-campus/api/health
~~~

更新源码后在此独立项目构建；如后端代码改变再重启 echo-campus-showcase。保留独立数据文件可保留已有身份与连接。数据文件里仅保存会话 token 的 hash；明文 token 仅在领取设备本地保存。不要手动编辑数据文件来替参与者确认相遇。

## 演示内容和边界

| 能力 | 当前实现 |
| --- | --- |
| 园区场景 | 默认完整园区：五份原始工程来源按共同坐标组合，独立活动布置保留；历史单体、程序化白庭与艺廊仍可查看 |
| 场景替换 | GLB/GLTF 或 SPZ/PLY/SPLAT；本地模型、链接、变换、边界、锚点、配置导出 |
| 分身 | 用户选择服装色的风格化分身；不是照片重建或真人克隆 |
| 公开名片 | 所有资料选填，用户主动同意公开展示；可仅用临时访客昵称和来宾角色进入 |
| 推荐 | 确定性供需标签匹配，最多 3 人；展示可核对的输入证据，未调用 LLM |
| 相遇 | 发起后由另一方确认；待确认仅双方可见，确认后进入公共世界 |
| 同步 | 新增身份与确认关系支持 HTTP + WebSocket，同版本去重，断线恢复 |
| NFC | 提供可写入标签的 HTTPS 入场链接；硬件与真实身份发放待现场联调 |
| 内置人物 | 15 位虚构人物和 7 条演示连接；内置人物不能替真人自动确认 |
| 场景地面 | 使用作者配置的平面、边界及圆形碰撞壳，不从 splat 自动推导真实碰撞 |
| 本地文件 | 浏览器读取，不上传活动服务；本地文件刷新后需重新选择 |
| 浏览器会话 | 7 天有效；过期后清理本机 token；底层受控卡领取需回到原设备；公开演示入口可供新会话重复体验 |

## 验证记录

以下是 2026-09-16 的早期程序化场景软件验收记录；本轮真实场地验证见上节，测试数与媒体状态以对应发布版本为准：

- `npm test`：**51/51 通过**。其中 16 项 Happy DOM 集成测试使用真实 HTTP/WebSocket 服务，覆盖领取、公开供需推荐、双向确认、同机隔离访客、迟到响应、重复提交及配置恢复；其余覆盖授权、幂等、公共 DTO、持久化、断线恢复、导入验证与资源释放。
- `npm run build`：通过；部署页面与健康 API 实际返回 HTTP 200。初始种子资料为 15 位虚构人物和 7 条演示连接，公开体验后人数可能增加。
- **真实浏览器视觉**：已检查 1440×900 桌面视口与 390×844、492×898 移动尺寸视口，实际 WebGL 建筑、水庭和人物均可见。移动尺寸浏览器检查不等于实体手机性能测试。
- **双会话闭环**：两个隔离浏览器会话分别领取分身，查看供需推荐，一方发起、另一方确认相遇；切换到水上艺廊后，本人身份与已确认关系保留。
- **场景导入**：随项目提供的 GLB 和 SPZ 测试资产已在真实浏览器中载入并显示；它们是程序生成的测试文件，并非真实 Marble 导出。新的 Marble 资产仍需按场景指南校准方向、尺度、地面与镜头。
- **真实录制**：`?capture` 工具已录得实际 WebGL 画面并导出 WebM；普通入口不显示录制工具。

实体 NFC 标签、实际手机的内存与帧率、最终 Marble 文件以及活动现场网络仍需在活动前实测。上述浏览器与自动化验收不替代这些现场检查。

## 录制真实场景画面

打开 <https://capture.meetmind.online/echo-campus/?capture>，点击「开始录制」，在场景中拖动镜头或切换预设，再点「停止录制」；每段最长 35 秒，届时自动结束。可追加 `&tour=1` 开始缓慢环绕。

录制直接来自 WebGL 画布：目标 30 FPS、8 Mbps，浏览器优先使用 VP9，兼容回退到 VP8/WebM。实际流畅度取决于运行设备。**文件只含 3D 场景，不含 DOM 界面、旁白与系统声音。** 带界面的产品步骤使用真实浏览器截图或独立录屏材料剪辑。

停止后可在页面回放并点击「下载 WebM」。如当前浏览器容器不能保存下载，点击「导出录制数据」取得只读文本框中的完整 Data URL，按其中的 Base64 数据保存为 `.webm`。备份数据只保留在当前页面，不上传活动服务；重新录制或离开页面会清理。录制工具同时显示场景、FPS、绘制调用、三角形数与画布尺寸，便于记录素材的运行条件。

## 文档与源码

- [合作演示介绍](docs/PARTNER-DEMO.md)
- [场景替换与 Marble 使用](docs/SCENE-SWAP.md)
- [活动接口与安全边界](server/README.md)
- src/scenes/：程序化建筑与人物
- src/runtime/：活动客户端、场景配置及导入
- src/ui/：界面与交互面板
- server/：独立活动服务
- tests/：Node 内置测试

交付媒体区分如下，最终文件由交付目录与在线下载入口提供：

- `Echo-Campus-Showcase.mp4`：97 秒早期程序化场景展示片，采用当时白庭/艺廊的真实 WebGL 录制、界面截图与获授权的 DashScope 中文配音；不作为本轮真实建筑模型证据。
- `Echo-Campus-97s-preview.mp4`：前期视觉参考片，保留其中“建筑视觉参考 / 交互流程示意 / 非浏览器录屏”的标注，不作为当前产品实测证明。
- `Echo-Campus-Partner-Showcase.pdf`：合作展示文档；`Echo-Campus-Guide.docx` 为可编辑使用指南。

主片中的场景镜头与界面截图按素材类型呈现，不把静态截图称作连续交互录屏。

## 手搓第三个程序化场景

新增 src/scenes/MyScene.js，导出 factory。返回值须提供 root、bounds、spawn、anchors.people、四个标准 cameras，以及 update/dispose。可以从当前 CampusScene.js 的返回结构开始。

然后只在 src/runtime/SceneRegistry.js 增加导入与一条登记：

~~~js
import { createMyScene } from "../scenes/MyScene.js";

registerScene({
  id: "my-scene",
  displayName: "我的新园区",
  helper: "白色建筑 · 独立活动空间",
  factory: createMyScene,
});
~~~

场景选择卡由注册表生成，无需再改 UI。main 按同一个注册表调用 factory；可用 ?scene=my-scene 直接选择。相同 id 再次登记会报错，避免误覆盖已有场景。

## 把新模型分享给合作方

模型与 JSON 可托管在 public/scenes/，构建后通过带 sceneManifest 的链接启动：

<https://capture.meetmind.online/echo-campus/?sceneManifest=./scenes/import-test.glb.json>

这是内置的 10 米白展厅测试资产，不是最终视觉样片。也提供同名 .ply.json 与 .spz.json；这些高斯来自自造几何，不是 Marble 生成结果。GLB 与 SPZ 测试文件已实际通过浏览器可见性检查；这不代表任意新模型或真实 Marble 导出已经验收。

manifest.url 相对 **JSON 文件地址** 解析。示例 JSON 在 scenes/ 中，url 应填 ./import-test.glb，而不是重复写 ./scenes/。

要让活动默认进入新模型，可编辑 public/scene-startup.json，设置 enabled:true 与 manifest。具体结构和优先级见 [场景替换指南](docs/SCENE-SWAP.md)。重新构建后，各设备打开同一个活动入口即可使用统一场景。
### 本轮发布验证补充

本轮 `npm test` 为 **65/65 通过**。生产域名的三个活动场景均实际加载成功，WebSocket readyState=1，online=true；C 场景生产配置包含 x40,z9.5,r4.5 碰撞壳。三个源模型的移动尺寸浏览器视口均无横向溢出，page errors 与 console errors 为 0。详见 `production-integration-report.json`；这些帧率读数来自桌面机器上的视口仿真，不能当作手机实机帧率。

本轮图文说明：[在线 HTML](https://capture.meetmind.online/echo-campus/venue-guide/) · [5 页 PDF](https://capture.meetmind.online/echo-campus/Echo-Campus-Real-Venues-Guide.pdf)。PDF 已逐页渲染检查，中文与图片无裁切，7 个可点击链接保留。
### 塔楼可行走区域加密检查

AB 塔楼以 0.25 米间距检查 12,325 个近地面/身体/胶囊网格点：11,707 点安全，618 点受原花池或抬高铺面阻挡。已配置六个圆形碰撞壳，覆盖全部 618 个受阻点；连接互动点从 (55,-235) 前移至 (55,-234)。24 个出生/人物/互动锚点均通过，计入 0.28 米角色半径后仍在碰撞壳外，最小净空约 0.426 米。四分之一米离散检查不等于连续碰撞证明，运行时和生产配置仍按最终发布验收核对。
