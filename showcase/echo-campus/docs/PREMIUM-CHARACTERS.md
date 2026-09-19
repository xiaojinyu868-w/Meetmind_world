# Echo Campus 真实角色资产与运行时交付

2026-09-18。只修改独立 showcase 的角色模块、两份 GLB 与测试；未改另一个作品，未改主线 UI/main。

## 已完成

- 两款成年角色：鼠尾草绿外套/砖红裤女性，沙色衬衫/蓝绿裤男性。保留 Tripo 图像纹理与面部颜色。
- 每款是一个真正 SkinnedMesh，54 骨关节，Idle / Walk / Wave 各 108 动画通道；Wave 对应 greet_01 并含迈步抬手动作，播放一次后回到 Idle。
- 生成、绑骨前检查、v1.0 Tripo 绑骨、3 个独立 FBX 重定向、Blender 5.2 合并 3 动作导出 GLB、2K 彩色 + 1K 法线纹理缩放、浏览器方向与落脚校准。
- 脚底为局部 Y=0，高度女 1.68m / 男 1.78m；最终源 GLB 正面 +X，运行时 forwardYaw=-π/2 校准到 +Z。
- 角色颜色只用于外置胸牌，不把面孔染色。不创建外描边副本网格。
- 角色衣料做了窄色域蒙版变体：女只重染绿色外套，男只重染深蓝绿色裤子；男的沙色衬衫保持原纹理，因为它与皮肤在纹理上无法安全分离。每种模型五个稳定色款，最多十份材质 uniform，仍共享几何和纹理。蒙版证据在 `wardrobe-qa/female-wardrobe-montage.jpg` / `male-wardrobe-montage.jpg`；脸、手、裸露皮肤保护框的最大蒙版权重均为0。
- 全部模型几何、纹理、材质共享，每个实例拥有独立 skeleton 和 mixer；单人 dispose 不删共享资源。
- 原 Characters.js 保留，由主线在角色库加载失败时决定使用兜底。

## 代码与文件

权威远端根：`/root/meetmind_wt_main/showcase/echo-campus`

- `src/scenes/PremiumCharacters.js`
- `tests/premium-characters.test.mjs`
- `public/assets/premium/host-female.glb`，1,379,068 字节，23,880 三角，SHA256 `208ab4718a3e17d128832c0131871f5e0e269f0381a19759e7d841b6b83abdec`
- `public/assets/premium/host-male.glb`，1,385,516 字节，22,614 三角，SHA256 `b1c4eac7fbe566d48643522eb0eb9e829896ccf2e1229cb6d1978bff0174d9f9`

API：`const library = await loadCharacterLibrary({baseUrl:document.baseURI})`；`library.createPremiumCharacter({color,seed,name})` 同步返回 `{root,model,mixer,height,assetInfo,update,dispose}`。默认导出的 `createPremiumCharacter` 也可在 preload 后调用。`library.errors` 记录单个资产加载失败。两个都失败时 preload 抛出异常。库释放会等所有实例离开后才真正释放共享资源。

## 生成来源

| 项目 | 女 | 男 |
|---|---|---|
| 原生成 | 0ecf9ec0-a9c3-4f35-9a29-267efcc3af0b | 6b9245c6-88a9-4bda-8347-5f93ba58a214 |
| rig-check | 281fdef6-e771-4cd6-99b0-37ac56202da3 | 092e51d9-6fcf-4d9d-b909-e1a014ac69d8 |
| v1.0 rig | b5d1fc54-77e3-48fe-b15d-bc06209ffa8e | 22c6ea59-e45a-4322-8ef1-74c58d595710 |
| idle | d5976599-97e2-47a5-9da3-4e79623b10fb | 32903652-4fc9-421b-84c3-bc684160b55c |
| walk | 62bdfb7b-9616-4352-9304-b6201a65576c | 8fbb6b0b-b436-4ff5-994d-2fb40a841ae4 |
| greet_01 | 01abd120-5cdd-401c-9e69-1e6da6ba61e0 | d5d6d881-c5f1-455b-b929-e1987b99a2ac |

两个 rig-check 均真实返回 riggable=true / biped。两个 rig 都验证到16组对称 L/R 解剖命名骨（含膝、手、twist），无结构缺项。所有 retarget 为单动画/FBX，未指定 model，未使用 animate_in_place。没有重复付费提交。

## 修复与验证证据

1. Blender NLA 导出会写入162条纯数值噪声 scale 通道。离线逐条比较 rest scale，女最大差4.17e-7，男3.58e-7，阈值1e-4。只移除这些冗余scale，保留全部 rotation / translation / twist。官方 skill 的 validate-animation 两款3clip通过：Idle 15.375s，Walk 2.375s，Wave 3.542s。
2. 此批 Tripo FBX 的 Root 静止，实际水平行走位移在 Hip，且其本地轴并非世界Y向上。运行时没有破坏 Hip translation，而用独立 motion parent 抵消 Hip 在角色世界水平面的偏移，保留脚步上下起伏。
3. 实测 +X朝向校准后人物面向+Z；64个真实蒙皮鞋底顶点用于小幅落脚修正。测试采样最深入地女约9mm/男约18mm；自动rig仍非电影级手指/足接触精修。
4. `node --test tests/premium-characters.test.mjs` 两项通过：独立骨架、共享资源安全释放、米制归一化、Root仅去水平位移、单次Wave回Idle。
5. Chrome + Three.js 真实播放 idle→walk→wave→talk，含中段截图；最终 `qa-grounded/report.json` errors=[]。每个阶段都未暂停播放。截图：`qa-grounded/face.png`、`walk-a.png`、`walk-b.png`、`wave.png`、`wave-late.png`。
6. 独立两人测试画面7 draw calls/93,422渲染三角（含阴影）；5几何/10纹理（含环境、阴影和骨纹理）。此数据不是最终园区/手机性能结论。
7. 创建第一帧直接以 Idle 权重1评估，避免从导出的 T/A pose 淡入造成切场瞬间双臂张开；只有后续状态切换使用 0.26s crossfade。

## 明确限制

- 当前两款形象被重复用于多人，不是每个嘉宾都完成了独立面孔或照片重建。
- 当前 Talk 使用下述新增的 Tripo Agree 完整骨骼手势。没有声音口型同步，也没有手指独立表演。
- 生成纹理可能含服装局部小瑕疵；近景手指细节与自动绑骨需要继续按产品等级精修。
- 静态美术与独立motion QA已经通过。主线交互、整场景性能和生产发布验收由主代理完成。

本地资产与处理脚本：`C:/Users/Li Hao/Documents/meetmind_world 2/output/visual-upgrade/characters-runtime/`；最终GLB：`../assets/characters-final/`；任务日志：`../jobs/host-*.json`。不在公共目录发布密钥、任务下载临时URL或原始私有日志。


## 已替代的驻足冻结方案（历史记录）

上一版主线将所有非本人角色沿正弦轨迹平移，却只有一部分播放 Walk，导致站姿滑行。生成的 Wave 也包含迈步；仅锁住 Hip 不能锁住双脚，Idle 的重心位移被抵消后同样会产生足部漂移。

- presentation: social：所有下半身 position / quaternion 轨道取真实 Idle 第一帧的常量，保留完整轨道参与 crossfade，避免恢复 A-pose。
- Idle 保留 Waist 上半身；Wave 仅保留 Clavicle 手臂子树和颈头子树，去掉迈步及大幅躯干动作。
- 鞋底在已评估的站姿进行一次完整几何落地，不再逐帧移动整个身体追逐最低脚点。
- 主线不再自动平移角色、强制转整个根节点，也不再向驻足角色发送 Walk。点击触发一次上半身招呼，持续选中不会循环挥手。
- WASD / 方向键现在浏览镜头。旧的原始动画管线和源 GLB 保留，但不作为当前展示的自然行走能力。

tests/social-presentation.test.mjs 使用两份真实 GLB 的几何/权重/骨架/动画，只去除 Node 不支持加载的图片。覆盖完整 Idle 16 秒、Wave 4.5 秒、Talk、误传 Walk、重复 Wave，包含根平移、旋转与 0.3 缩放。鞋底采样合成波动均低于 0.1mm，首帧实际鞋底落地误差低于 0.1mm。该测试与浏览器连续录制一起验收，不以单张截图证明动作质量。


## 2026-09-19 连续全身社交表演（当前）

用户明确拒绝冻住下半身的半动作站姿。本轮删除该方案及试验性的正弦手臂附加动画，复用已验证的54骨架，另行重定向 Standing_Relax / Agree / Greet_02（每人3份FBX）。身体、手腕、腿部、Hip重心全程参与动画。

- 完整动作：Standing_Relax 17.583秒；Agree 4秒；Greet_02 5.583秒。去除FBX开头1/24秒空段，保留有效轨道和全部身体运动。仅将不同take的起始双足中心作一次常量平移对齐，不逐帧锁髋。
- 动作间0.65秒混合。短请求不会截断交谈，保持请求不会反复重启。收尾期间源动作继续播至结尾；回到完整Standing_Relax。点击招呼可以优先接管手势。
- 64个蒙皮鞋底采样用于小幅垂直地面校正。测试对全脚1744/1710个加权顶点复核：女最低-5.67mm，男-5.29mm。动作仍存在自动重定向的小幅足部移动，不宣称电影级足锁定。
- 默认6位内置人物、3组对谈。仅source=curated-demo使用演示手势；真实加入者保持待机，不伪造交谈行为。完整名单保留，选中隐藏人物按需显示，UI提供近看交流镜头。
- 7份新任务共使用原有授权Tripo账户；其中女Complain_01动作过大，被筛除，未进入上线资产。2份交付GLB各约1.65MB，包含旧3clip及新3clip；纹理仍为2K颜色/1K法线。
- `npm test` 123/123通过：包含真实男女GLB状态/动作完整性测试及9项演示群组选择/布局/节奏测试。视觉QA包含连续播放、交谈/招呼、单人近景及手机尺寸，截图不能单独作为动画自然度证明。

任务记录（无密钥/无签名下载链接）：

| 动作 | 女性任务 | 男性任务 |
|---|---|---|
| standing_relax | 7b9d898f-0f1a-4d0b-b008-04c2a9e1592a | a9853cb5-44cd-49e9-93f1-283d51ca288b |
| agree | c5c2c0d5-04f6-406e-b527-5c6c129a288f | f62a3e03-f43c-4f59-8889-b7b3a17fb906 |
| greet_02 | 7216a086-4b6c-4291-b6bf-1997fe3ae1f8 | d103a74b-c7e3-45a2-8528-8c6fe0b8de88 |

转换：Blender 5.2，逐份FBX导入，要求相同骨骼rest matrices，NLA合并；删除仅有浮点噪声的scale通道（最大4.77e-7）。未使用animate_in_place，无新的模型生成/绑骨任务。当前没有语音口型或真实多人自主交谈；这是现场活动的社交动作演示。


公开版本复核：2026-09-19，在实际HTTPS页面连续观察22次样本，无pageerror；主对谈双方交替SocialTalk/Idle，点击此前未渲染的seed-05可按需显示、招呼结束回Idle。另已验证390×844不横向溢出，三场地人物演示均生效。录屏 `Echo-Campus-Conversation.mp4` 是实际网站24秒连续近景，保留原始速度，无插帧、无合成替换。无配音。6 FPS回归：约4秒Talk于实际4.000秒完成，低帧率不再被固定dt截断拖成慢放。

测试桌面Chrome/WebGL稳定样本116–148 FPS（该测试机器1280×800、DPR1，不能外推实体手机）。运行时约530 draw calls、近千万渲染三角包含阴影与AO pass，千人同时动画渲染尚未验证。
