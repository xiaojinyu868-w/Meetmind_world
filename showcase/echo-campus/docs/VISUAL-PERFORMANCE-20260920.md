# Echo Campus 视觉与性能改造记录 · 2026-09-20

本轮解决两个问题：活动场景缺少统一的用光与色彩设计，以及大型建筑、后处理和人物点选让页面承担了过多实时计算。目标是让来宾在真实建筑前自然交流，空间成为可看、可进入的活动背景。

**记录状态：源码与资产改造已落地；最终生产浏览器复测值由发布验收补齐。文中的改造前数据、资产审计和目标测试已有记录，不能将待填的改造后结果视为通过。**

## 参考项目及画风来源

用户给出的目录是 `C:\Users\Li Hao\Documents\ChatGPT\meetmind world 2`。其中的摄影概念板和旧 EchoWorld 场景可以说明早期方向，但不是本轮核对到的摄影游戏实际运行时。实际参考项目为 `C:\Users\Li Hao\Documents\ChatGPT\lumen-photo-game`；本轮仅读其代码和文档，没有修改该项目。

摄影游戏的表现方法可在以下文件核对：

| 参考文件 | 实际做法 | 本轮采用方式 |
| --- | --- | --- |
| `src/kit/animeLook.js` | 偏蓝紫的 RGB toon ramp、暖色边缘光、低角度太阳、手绘天空、带颜色的细描边 | 借鉴暖光与冷阴影关系、低饱和材质和天空层次；不直接把所有 CAD 与人物换成 toon 材质，不增加全场描边网格 |
| `src/kit/cast.js`、`src/kit/illustratedCharacter.js` | 默认日漫画风优先读取八角度人物立绘，按观察角度选图并交叉淡入，GLB 为后备路径 | 保留本项目现有 54 骨骼人物与完整站立、回应、招呼动作；借鉴立绘对脸部、服装和人物轮廓的重视 |
| `README.md` 的人物说明、`docs/anime-look.md` | 八张相隔 45° 的立绘不等于连续三维视差或面部口型动画 | 不把摄影人物的静态图像质量等同于已完成三维社交动画，也不退回固定动作中间帧 |

摄影游戏还有拍摄后经模型生成的成片。该层可以参考构图与色彩，但不是实时 WebGL 画面的直接质量证明。本轮定位为明亮、温暖、带手绘天光的活动花园，并非复刻摄影游戏的全部渲染方式。

## 本轮视觉实现

`src/runtime/EventLook.js` 与 `ArchitecturalMaterials.js` 把建筑材质重新组织为象牙石材、蓝银玻璃、低饱和草地和更平静的水面。石材和铺地的高频纹理随距离淡出，玻璃减少高金属反射和强随机色差，水面去掉活动态高频法线/凹凸/粗糙度贴图，并使用幅度很小、随距离衰减的波纹。

新增天空资产为 `public/assets/premium/social-sunset.webp`。加载时在一张 CanvasTexture 上完成天空重映射和一次性调色：保留蓝色云层与蜜桃色光边，让云层经过视平线，再渐变到远处雾色；原画的太阳圆盘不直接映射，避免全景重复太阳。低角度暖太阳、偏冷的天空补光和环境反射共同作用，不依赖新增全屏滤镜来改变整个画面。

`PremiumCharacters.js` 保留两份现有带材质的 54 骨骼角色、服装变体、完整社交动作和实际鞋底采样校正。新增 `CharacterContactShadow.js`：全库共享 64×64 渐变贴图、几何与材质，每位人物仅一个柔和椭圆平面（2 个三角形、1 次绘制）。阴影无硬边、无白圈，不参与点选、投影或 AO 覆盖材质；入场缩放时保持高于活动铺地，最后一个使用者离开且库释放后统一清理资源。它提供局部接触感，不是新的人物反射或屏幕空间阴影系统。

`camera=garden` 的含义是**近看双人交流**；`arrival` 看入口活动组织，`hero` 看建筑与环境，`aerial` 看俯瞰。近看交流不表示用户能走遍建筑内部、所有楼层或屋顶。

## 原模型与活动模型分离

新增三份活动专用派生 GLB，由 `scripts/build-event-venues.mjs` 生成，逐份伴随 `*-event.audit.json`。审计记录源文件/输出文件的 SHA-256、解码方式、已验证移除的原模型配景面、简化前后数量、分块结果与包围盒误差。

| 模型 | 原 GLB 字节 / 三角形 | 活动态 GLB 字节 / 三角形 | 活动态文件 |
| --- | ---: | ---: | --- |
| AB 雨棚 | 14,998,768 / 5,046,051 | 7,159,012 / 2,410,832 | `public/scenes/venue/venue-ab-canopy-event.glb` |
| AB 塔楼 | 3,928,840 / 1,157,354 | 2,421,716 / 904,785 | `public/scenes/venue/venue-ab-towers-event.glb` |
| C 原场地 | 4,028,340 / 1,125,513 | 2,007,488 / 713,803 | `public/scenes/venue/venue-c-event.glb` |

这些是文件解码后的资产面数，区别于下表包含多次渲染的 `renderer.info.render.triangles`。活动模型做过有误差约束的简化，不声称逐面无损。空间分块保留同一局部坐标系，锚点和活动高度不随模型简化重置；当前审计的总包围盒最大差为雨棚约 2.64 mm、塔楼约 2.00 mm、C 约 0.66 mm，包围盒误差不等于所有表面的最大误差。

`src/runtime/VenueAsset.js` 按 `view` 选择资产：源模型视图继续加载原 GLB，活动态加载派生 GLB；派生文件加载失败时回到原 GLB。活动态已预先处理的配景不再重复按旧索引过滤。原始 SKP/3DM、原 GLB 和其校准配置保持原有用途，活动材质变更不覆盖源模型。独立活动数据、身份、相遇记录与服务配置不在这次美术改造中迁移或重写。

## 性能改动及证据边界

| 项目 | 本轮行为 | 用途 |
| --- | --- | --- |
| 默认画质 | 桌面 `balanced`、粗指针/窄屏 `low`；显式 `quality=cinema` 才启用电影模式，旧 `high` 参数兼容映射为 cinema | 公开链接默认控制设备负担 |
| 像素比与阴影 | balanced DPR 上限 1.25、low 1、cinema 1.75；默认与手机阴影 1024，cinema 2048 | 降低片元和阴影纹理成本 |
| 后处理 | `RenderFinish.js` 仅 cinema 创建半浮点 4×MSAA、GTAO 与输出 pass，其余直接渲染 | 减少额外全场绘制与缓冲 |
| 建筑阴影 | 活动态关闭源建筑逐网格实时投影，采用已验证的结构面阴影代理；回到源模式恢复原标记 | 避免大型 CAD 在阴影 pass 中反复绘制 |
| 人物点选 | `SocialPicking.js` 使用稳定站立 AABB 与射线求交并取最近人物，不在每次指针移动时计算所有蒙皮三角形 | 降低鼠标移动时的 CPU 尖峰；这是一种宽容点选体积，不是精确逐像素选取 |
| 远景植物 | 每簇叶片 cinema 64 / balanced 24 / low 16，放大低档叶片与内冠维持轮廓；减少树数但保留空间分布 | 把细节留给近景人物与活动区域 |
| 人物接触 | 共享小贴图与轻量平面；原骨骼、动作时间和足底采样保留 | 改善遮阴区域脚部落地感，不新增重型渲染 pass |

远景预算的可重复几何测试：两个合成地形测试夹具中，`LandscapeSite` + `ContextLandscape` 的 cinema 共 1,011,624 个三角形，balanced 共 217,136 个，减少约 **79%**；low 共 79,664 个。所有档位保持三次材质批次绘制；分布测试保留地面/高位草地与多处分散树组。**79% 是这两组远景植物的测试夹具结果，不是整场景帧时间或整页总面数下降百分比。**

## 改造前浏览器基线

测试地址为雨棚活动态 `?view=event&venue=venue-ab-canopy&camera=garden&welcome=0&debug=1`。使用本地隔离 Playwright Chromium 新上下文，仅读演示数据与切换镜头；网络仅允许 GET / HEAD / OPTIONS，未领取身份或提交活动数据。确认 `__ECHO_CAMPUS__`、实际场景与 premium 人物完成加载后，每镜头连续采样 10 秒 RAF。

设备为 **NVIDIA GeForce RTX 4060 Laptop GPU / ANGLE D3D11**。桌面 1600×1000、浏览器 DPR 1；手机视口 390×844、浏览器 DPR 2、触屏模拟，**仍使用同一桌面 GPU，不是实体手机性能测试**。RAF 是帧回调间隔，不是 GPU timer query。

| 改造前视图 | 首次 ready | 运行画质 / DPR | 绘制 calls | 每帧渲染三角形 | RAF 均值 | p95 | p99 |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 桌面近看交流 | 17.12 s | high / 1 | 548 | 11,783,556 | 17.82 ms | 18.40 ms | 24.30 ms |
| 桌面入口 | 同一上下文 | high / 1 | 532 | 9,704,288 | 15.12 ms | 18.30 ms | 18.30 ms |
| 桌面外景 | 同一上下文 | high / 1 | 749 | 12,480,520 | 15.98 ms | 18.30 ms | 18.40 ms |
| 手机视口近看交流 | 13.19 s | low / 1.35 | 190 | 4,682,304 | 6.08 ms | 6.20 ms | 6.30 ms |

桌面三条后处理 pass，手机视口零后处理。桌面交流镜头 10 秒内出现 1 帧超过 33.34 ms、0 帧超过 50 ms；其余三个样本均无超过上述阈值的帧。没有 page exception、失败请求或 HTTP 错误；桌面记录 3 条 ANGLE/Three.js shader 编译 warning，手机视口没有 warning。完整消息与资源耗时保留在 JSON。

本地证据目录：`C:\Users\Li Hao\Documents\meetmind_world 2\output\visual-20260920\before\`，包含 `baseline.json`、四张实际截图和 `README.md`。基线运行脚本为同上级 `baseline-browser.cjs`。

## 改造后验收（2026-09-20 final review）

<!-- FINAL_RUNTIME_EVIDENCE: same-machine isolated Chromium review; mobile remains viewport simulation. -->

| 验收项 | 实际证据 |
| --- | --- |
| 最终构建 | `npm run build -- --outDir /tmp/echo-campus-review-20260920` passed; final bundle includes distant-ground-fade-v1 |
| 雨棚桌面交流 | balanced, 229 calls / 2,365,293 triangles, RAF p95 6.20 ms, p99 6.30 ms, 0 frames >33 ms |
| 雨棚桌面入口 | balanced, 257 calls / 2,371,747 triangles, RAF p95 6.20 ms, p99 6.30 ms |
| 雨棚桌面外景 | balanced, 360 calls / 3,250,645 triangles, RAF p95 6.20 ms, p99 12.20 ms |
| 390×844 视口 | low, 194 calls / 1,777,394 triangles, RAF p95 6.20 ms; same RTX 4060, not a phone claim |
| 三场地与交互 | isolated functional Playwright QA 11/11: source/event URLs, reverse async choice, failure fallback, person click, drag, no horizontal overflow; page errors 0 and no write requests |
| Motion evidence | 25-second WebM with continuous social animation and contact shadows: `output/visual-20260920/motion/Echo-Campus-Social-20260920.webm` |
| Tests | `npm test`: 135 passed, 0 failed; sky/event-look targeted checks included |

已独立执行的针对性检查：远景植物及活动花园相关测试 15 项通过；接触阴影、人物资源和完整社交动作相关测试 9 项通过。它们验证有限几何、资源清理、分布、入场缩放、原骨骼动作接地与低帧率动作时长，不能替代最终画面审查与全量测试。

改造前后只有在同一机器、浏览器参数、视口、镜头、采样方式下才适合比较帧指标。冷加载还受网络、CDN、服务器响应、文件缓存与首次 shader 编译影响；不同网络或缓存状态的 cold-ready 秒数不能直接归因于本轮优化。即使桌面 GPU 测得较高帧率，也不推断低端手机表现。

## 剩余限制与交付边界

- 原始 CAD 的部分位图贴图缺失。本轮材质重构改善展示，不等于恢复了设计单位的完整真实材质或室内。
- 当前仍是两份人物身体模型的多个服装/身高变体；外形会重复，没有声称为每位真实来宾生成独立高质量三维身体、口型或表情。
- 完整动作是既有资源的绑定与播放，不是实时行为智能。人物站位不代表现场定位。
- 实体手机的内存、温度、触控与帧率仍待真机测试；这份报告中的手机数字仅为视口仿真。
- NFC 手环、读卡器、支付宝生态接口、真实发卡与现场网络不属于本轮美术和性能验收。当前入口保持既有 HTTPS 演示流程。
- 新模型/Marble 场景仍需按 [场景替换指南](SCENE-SWAP.md) 校准方向、比例、地面与镜头，不能从此次三份建筑适配推定任意资产自动可用。

本轮改动范围为独立 `showcase/echo-campus`。没有要求修改原站 8000 后端、`/var/www/echoworld`、共享工作区 `/root/meetmind_go` 或线上数据结构；实际发布操作应单独记录在最终验收中。
