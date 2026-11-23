# 来自一张合照的共同世界

## 原稿与入口

2026 年 8 月 4 日的 [路演 BP](pitch/EchoWorld_Hackathon_Pitch_20260804.pdf) 与[讲稿](pitch/TALK_TRACK.md)把起点写成一张合照、一群 Agent、一个共同世界。产品介绍进一步写到朋友或情侣各自认领，首次约会、一起旅行、生日和养猫的经历逐渐留在同一个世界。11 月的产业对接赛题是同一产品的活动应用。原始讨论里，创始人又明确重申“一张合照进入一个 3D 世界”。

| 原稿中的动作 | 正式站的动作与数据 |
| --- | --- |
| 人从真实合照入场 | 首页创建世界，成员在各自设备上选中自己的脸、填名字和可选自述。自动漏检可以在照片上点选。认领冲突由数据库裁决。 |
| 合照、人物和资料可回看 | 市集里的展架贴上当时的合照。点展架或「照片里的人」可以回到来源。人物卡展示认领位置、自述、本人及对方可见的印象、有关的经历。可下载原始合照。 |
| 多设备同场 | 两台设备分别持有不同角色凭证。位置、入座、场所、成员和经历由服务端保存。WebSocket 在事务提交后通知同世界浏览器，断线时通过 HTTP 重新同步。大屏使用单独凭证，展示称呼、位置以及入场、作品展出、破冰、开桌等事件类型。 |
| 集市、咖啡厅和圆桌 | 点地面移动；从同一世界进入咖啡厅，继续用自己的角色和同一份经历；圆桌只将自愿开放的自述送给文本模型。模型提问逐条核对本人的引文。 |
| 展位与世界播报 | 成员提交作品标题、原话与附图，街上摊位挂出作品。点摊位或走近按 E/F 可查看。播报只公开事件类型与适用的称呼，匿名题卡和私人附图继续按访问范围展示。 |
| 入场互评与现场破冰 | 人物卡可以写自评或给同伴留印象。篝火的「印象速配」单独出题，参与者投票后揭晓。私人印象不会自动成为公开题目。 |
| 经历变成空间中的物件 | 生日蛋糕、旅行山峰、宠物、桌边初见和日常小屋根据记录按序出现。点击物件可读日期、作者、原文和附图。新记录可提及共同在场的人。 |
| 我与 TA 的关系场域 | 从对方的人物卡进入，复用原有关系场域生成器和 Three.js 场域系统。在原有场域中布置两人互写的印象和记录人明确提及对方的经历。场域里的相框挂着第一张合照。两位成员各自授权后可请真实文本模型重新设计光色、天气、空间隐喻和叙述。界面保留原始来源，任一方收回即可切回规则布置。 |
| 回访并带走世界 | 保存过角色凭证的浏览器从「我的世界」返回。可将当下镜头、合照、名字、经历数量导出为 PNG。 |
| 活动对接赛题 | [相遇之庭](https://capture.meetmind.online/echoworld/encounter.html) 保留独立引荐、分别确认、大屏连线和同编号记录。公开演示使用固定虚构名册。 |
| 完整相遇采集与个人世界 | 原有集市、熟人咖啡厅、微信登录、Package、音视频记录与个人浮岛仍有正式入口。私密合照世界的成员资料不会自动公开同步到全站人物目录。 |

## 数据与外部服务

世界存储在应用数据目录下独立的 `photo-worlds.sqlite3`。SQLite 事务保证一个位置只能被成功认领一次。服务端仅保存成员及管理员凭证的摘要。邀请链接的片段在首次打开后从地址栏移除。持有邀请者可以看原始合照的浏览图以及已占用的位置，须认领后才可以看到内部经历。以设备凭证恢复身份，清除浏览器数据会失去该设备的角色凭证。

合照和后续附图保留原始字节与 SHA-256；浏览图纠正方向并规范化。默认在服务器本地定位人脸，用户可明确选择百炼视觉辅助。在已认领位置与衣着采色，生成项目原有标准的 128×128 像素 atlas。模型使用原仓库 MC 体素 GLB 骨架、原 UV、动作关节。在本人单独同意后，可将脸部裁图交给 CommonStack 绘制五面，后端与原贴图管线共用处理和 512×512 合成逻辑。上游返回限流时保留可用的本地角色，并显示重试入口。双向授权的场域只向文本模型传送两人互写的印象、合照日期和明确共同记录的标题、日期，人物用“同伴”代称。输入变更后，旧诠释不再作为当前结果。

## 取舍与验收

针对首发任务，优先走原始路演的活动合照。两人长期积累经历使用完全相同的持久世界。集市采用原项目的木屋、篝火、摊位，咖啡厅复用原有绘本 GLB。新增可转动的黄昏光照、灯笼光晕、地表手绘纹理、个人合照展架、可点选经历物件与日光视角。移动端保留上传、认领和点选；没有 WebGL 时仍可浏览、投票、保存经历和回访。

- 自动化覆盖认领争用、五个独立身份、原件校验、重启恢复、双场所、双方来源过滤、只读大屏、私下印象、两位成员分别授权、模型引文校验、失败状态、体素五面 UV、双向授权演绎、WebSocket 与大屏内容隔离。
- 使用合成自述调用真实圆桌文本模型，两个角色的引用均与输入相符。CommonStack 图像生成实调在本轮返回 HTTP 429。五面瓦片的成功合成使用合成测试样本验证。以单独的虚构文本实调场域模型拿到了有效的调色与场景输出。未将真人合照送入外部图像服务验收。
- 仍需五位真人在十分钟内完成现场无指导入场、两周回访以及真实活动主办方付费数据。11 月比赛报名材料以已经提交的赛题为准。跨组织长期推荐属于 [PRD](PRD.md) 暂缓项。

[苹果共享相簿](https://support.apple.com/en-us/108314) 说明受邀者可以协作添加照片。[Gather 的空间交互](https://support.gather.town/articles/4772337318-start-conversations-wave-ring-and-walk-over) 展示走近某人即可发起交流。两者检验了相邻交互任务；本产品的留存、付费和 3D 增益仍需要自己的用户证据。[OpenAI Docs 的视觉迭代说明](https://learn.chatgpt.com/guides/prompting-gpt-6-2-astra) 建议在目标尺寸渲染并操作，作为视觉验收依据。

## 与原有系统的衔接

`?world=hall`、`?world=cafe` 与原有个人岛、资料包、录制、回放入口继续提供以前的采集链路。新世界中的自述和互评使用房间级权限。当前版本尚未将私密房间成员和历史 Package 自动合并，已有个人岛、设备账号、Ring 生理聚合数据也不会从姓名或合照自动认领。原始照片、活动事件和个人材料的跨系统归属仍需要独立核验。

## 绘画资产来源

内置 ImageGen 纯文字生成远景和四格材质图，成品在 `public/photo-world/dusk.webp` 与 `public/photo-world/surfaces.webp`。输入仅包含场景描述。三维几何、人物交互与状态由本项目渲染或处理。复现用提示词如下。

> Production environment backdrop for a storybook 3D relationship market at twilight, purely fictional, landscape 3:2. A sweeping airy expanse of peach afterglow at left fading through dusty lavender into deep teal blue at right, elegant wind-streaked gouache clouds and a distant chain of dusky indigo mountains, a few pinprick stars, veils of golden mist floating through the low valleys. Beautiful subtle handmade oil-pastel paper texture suggestive of an old illustrated travel album. Depth and quiet, painterly sophistication, restrained palette with luminous honey highlights. Low horizon below halfway, panoramic expanse. Use only faraway scenery. No people, no structures, no foreground trees, no island, no lettering, no frame, no moon. This will sit far behind a real-time miniature timber market in an interactive web scene.

> Square seamless material atlas for a masterfully hand-painted miniature village in a cozy storybook 3D game. Four equal square quadrants, perfectly meeting at exact center, no borders, labels, margins, perspective or lighting gradients. Orthographic material patches only. Upper left: muted moss-green meadow grass paint, fine loose visible brushwork and tiny sparse leaf tufts, not a garden illustration. Upper right: warm umber timber plank surface, flowing carved wood grain, a few subtle knots. Lower left: blue-gray slate roof shingles with slightly overlapping scalloped rows, delicate hand-painted chipped edges. Lower right: warm sandy limestone cobbles with muted lichen in hairline seams. Textured gouache paper, crafted, tiny details that reward close viewing, all four cells equal, perfectly sharp top-down game PBR base-color atlas.
