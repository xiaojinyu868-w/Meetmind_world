# Echo Campus · 从这里开始

## 最新版本：整园表面稳定性修复（2026-09-20）

先打开 [完整园区](https://capture.meetmind.online/echo-campus/?venue=venue-campus&view=event&camera=hero)，再阅读 [GLOBAL-SURFACE-STABILITY-20260920.md 最新发布报告](GLOBAL-SURFACE-STABILITY-20260920.md)。塔楼、T6 主楼、HUB 中庭、C 地块与连廊已按原始工程坐标组合，可从全景切换到各分区及活动入口。

下文保留 2026-09-18 三单体预览与当时交付记录，供来源追溯；不代表当前默认入口或最新验收状态。

---

当前合作沟通优先查看三份真实建筑模型和本轮图文说明。原始 SKP/3DM 不在公开媒体包内。

1. 打开 [合作展示页](https://capture.meetmind.online/echo-campus/showcase.html)。
2. 从 AB 塔楼、AB 雨棚、C 原场地中选择一个，先看源模型，再看活动布置。
3. 用入口近景查看人物与点位；领取分身后可查看资料和演示相遇流程。
4. 阅读本轮 Partner-Scene-Guide.pdf 与 SOURCE-COMPOSITION.md，确认来源、组合关系和待联调事项。

## 本轮真实场地模型（2026-09-18）

本轮展示三份来自用户原始建筑文件的 GLB 派生模型，不再把程序化 A/B/C 外景占位图当作真实场地。两种 AB 是来源方案标签，尚未核实它们与 A、B 地块的对应关系；三个预览也不等同于已确认组装关系的总场地。

| 场景 | 来源 | 网页 GLB | 直接预览 |
| --- | --- | --- | --- |
| AB 塔楼 | 20231226_T1-3塔楼调整.skp | 3,928,840 字节 | [源模型](https://capture.meetmind.online/echo-campus/?venue=venue-ab-towers&view=source&camera=hero) |
| AB 雨棚 | 0801-T6雨棚模型-2017版本.skp | 14,998,768 字节 | [源模型](https://capture.meetmind.online/echo-campus/?venue=venue-ab-canopy&view=source&camera=hero) |
| C 原场地 | 0831 Podium.3dm | 4,028,340 字节 | [源模型](https://capture.meetmind.online/echo-campus/?venue=venue-c&view=source&camera=hero) |

view=source 隐藏额外的演示人物、互动点和关系线；源文件里自带的静态比例人物仍属于原几何。view=event 使用各模型单独校准的活动布置；camera=hero|arrival|garden|aerial 选择四机位。锚点配置提供 18 个人物槽与 5 个互动点，运行时实际人数随演示身份变化。

三份源文件保持不变，不公开分发 SKP/3DM。转换保留几何与材质颜色，**位图贴图尚未恢复**，所以部分绿化显示为矩形板。雨棚派生文件只移除 Y<-100 米的 1,653 个离散异常面；Draco/Blender 重导出改变部分面数，不声称逐面无损。最终雨棚 GLTFLoader 解码为 199 组 / 5,046,051 面；约 15 MB 文件不代表低 GPU 开销。

### 镜头与行走范围

模型构图使用独立 framingBounds，与允许行走的 bounds 分离。入口近景使用 arrival；garden 是建筑细节摄影机位，不表示允许在所有楼层或楼顶行走。

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

本轮合作图文说明为 Partner-Scene-Guide.html / .pdf，采用真实模型截图，并注明缺失位图贴图、AB 组合关系未确认和现场硬件边界。本轮新视频以合作展示页当前明确标注的真实场地视频为准；不要从旧文件名或旧 97 秒指标推定新媒体已经验收。


## 更换场景

导入新 GLB 或 Marble SPZ 后，必须重新确认轴系、米制尺度、groundY、bounds、spawn、人物与互动锚点、镜头和碰撞壳。视觉模型和活动坐标分别配置；framingBounds 用于全楼构图，不能替代活动 bounds。模型地址相对 JSON 所在目录解析。详细操作见场景替换指南。

本地模型包包含三份 GLB/JSON/WebP、浏览器预览和 QA 记录，不含完整应用、依赖、原始工程文件或用户数据；不要把模型包描述为双击即可启动的离线网站。
### 本轮发布验证补充

本轮 `npm test` 为 **65/65 通过**。生产域名的三个活动场景均实际加载成功，WebSocket readyState=1，online=true；C 场景生产配置包含 x40,z9.5,r4.5 碰撞壳。三个源模型的移动尺寸浏览器视口均无横向溢出，page errors 与 console errors 为 0。详见 `production-integration-report.json`；这些帧率读数来自桌面机器上的视口仿真，不能当作手机实机帧率。

本轮图文说明：[在线 HTML](https://capture.meetmind.online/echo-campus/venue-guide/) · [5 页 PDF](https://capture.meetmind.online/echo-campus/Echo-Campus-Real-Venues-Guide.pdf)。PDF 已逐页渲染检查，中文与图片无裁切，7 个可点击链接保留。
### 塔楼可行走区域加密检查

AB 塔楼以 0.25 米间距检查 12,325 个近地面/身体/胶囊网格点：11,707 点安全，618 点受原花池或抬高铺面阻挡。已配置六个圆形碰撞壳，覆盖全部 618 个受阻点；连接互动点从 (55,-235) 前移至 (55,-234)。24 个出生/人物/互动锚点均通过，计入 0.28 米角色半径后仍在碰撞壳外，最小净空约 0.426 米。四分之一米离散检查不等于连续碰撞证明，运行时和生产配置仍按最终发布验收核对。
