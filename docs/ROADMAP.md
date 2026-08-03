# EchoWorld 路线图 · 分阶段 TODO

唯一进度看板。勾选语义：`[x]` 完成且通过验收 · `[~]` 进行中 · `[ ]` 未开始。
任务编号规则：`阶段.模块.序号`，被 PRD/ARCHITECTURE 引用时不可改号。

---

## MVP 1.0 · 人脸记忆闭环

> 目标（对应 PRD.md §7）：现场相遇 → 忠实记录 → 像素小人进世界 → 再次相见时完整恢复上下文。
> 完成定义 = PRD §7 验收标准 4 条全部打勾。

### 1.A 相遇采集与提取

- [x] 1.A.1 后端骨架：FastAPI 工程、`.env.example`、API 中转配置模块（`backend/api/`）
- [x] 1.A.2 录制上传接口：视频/音频/照片/手动备注，落盘即只读（`facts/` 目录约定）
- [~] 1.A.3 人脸提取：从媒体中截取人脸照片，生成 face 候选（模型接口走 `agents/llm/` 抽象）（图片输入已走 qwen-vl 真实分析；视频抽帧 ffmpeg/cv2 待接，faces 匹配仍 stub）
- [ ] 1.A.4 语音转写：转写文本 v1 与原始音频双份留存
- [x] 1.A.5 用户确认流程：人脸 + 姓名 + 一句话介绍的确认界面；未确认数据标记"待确认"（FR-1.3）（后端 confirm + 前端 pipeline 确认屏均已通）

### 1.B Package 与记忆

- [x] 1.B.1 `echo-package.v0` schema 校验器（对应 CONTEXT-AND-MEMORY.md §4）
- [x] 1.B.2 事实层/推断层分离存储：两个命名空间、两条写入路径、推断层无事实层写权限
- [x] 1.B.3 人物目录生成：`profile.json` / `memory.md` / `relations.md` 模板
- [x] 1.B.4 权限字段：四级 `privacy` 默认值 L1，写入路径强制校验

### 1.C 3D 世界（three.js，由现有原型演进）

- [x] 1.C.1 世界快照 schema `echo-snapshot.v1` 定义与校验（ARCHITECTURE.md §4）
- [x] 1.C.2 前端从"读本地 mock"切换为"读快照 API"（轮询即可）（LiveWorld 2s 轮询 + 插值驱动，live/mock/内置兜底三级降级）
- [ ] 1.C.3 像素小人接入：Package 注册 → 世界中出现对应调色板小人（FR-1.5）
- [ ] 1.C.4 场景模块模板：展位/桌位模板 + 现场照片贴图（FR-1.6）
- [x] 1.C.5 资料包面板：点击小人 → 真实人脸、相遇时间地点、谈话要点、现场照片（FR-1.8，**核心价值时刻**）（事实/推断分区 + 置信度标签，已接入点选流程）

### 1.D 检索与恢复

- [x] 1.D.1 姓名/关键词检索人物（先字符串匹配，够用即可）（`POST /api/v0/search`：name 子串/keyword 命中率打分，种子数据开箱可检，有测试）
- [ ] 1.D.2 人脸检索：拍一张照片 → 匹配已有 Package（FR-1.9； embedding provider 接口预留）
- [ ] 1.D.3 事实层完整性自检：重开页面后资料包与原记录逐字节一致（NFR-1.1 验收）

### 1.E MVP1 验收走查

- [ ] 1.E.1 验收标准 1：1 分钟录制 → 5 分钟内可浏览
- [ ] 1.E.2 验收标准 2：事实层零损耗
- [ ] 1.E.3 验收标准 3：模拟再次相见，上下文完整恢复
- [ ] 1.E.4 验收标准 4：新用户无教学完成闭环

---

## MVP 2.0 · Agent 互动与价值发现

> 前置：MVP1 验收通过 且 人均 Package ≥ 10（P-1 上下文量闸门）。
> 完成功能开关见 CONTEXT-AND-MEMORY.md §8。

### 2.A Agent Runtime

- [~] 2.A.1 规则调度器：每日走动、访问 N 个 Agent、定期圆桌（参数可配）（skill + LLM 决策 + 规则兜底已落地并产对话/会议，参数化与完整规则待 MVP2）
- [x] 2.A.2 事件总线：Agent 只发事件，World Service 消费事件改状态（ADR-1）
- [ ] 2.A.3 Agent 交互协议：结构化信息交换 schema（我是谁/我有什么/我需要什么/授权范围）（FR-2.3）
- [ ] 2.A.4 权限执行：Agent 只能携带 ≥ L2 信息，输出继承最严格级别
- [ ] 2.A.5 圆桌会议 UI + 编排：用户发起、邀请、主题、纪要落推断层（FR-2.2）

### 2.B 价值匹配与推送

- [ ] 2.B.1 互动记录分析：大模型判断共同点/合作可能，结论带置信度 + 事实指针（FR-2.4）
- [ ] 2.B.2 推送阈值过滤：只推"值得真人行动"的事件（FR-2.5）
- [ ] 2.B.3 推送通道：前端通知中心（微信/眼镜通知为 TBD-P2）
- [ ] 2.B.4 有用/无用反馈回路：写入推断层调优阈值（FR-2.7）

### 2.C 增量上下文捕获（P-7）

- [ ] 2.C.1 上下文缺口检测：识别"需求明确但缺 X"类缺口
- [ ] 2.C.2 微信行动建议生成：话术草稿 + 待确认要点（FR-2.6）
- [ ] 2.C.3 回填闭环：一键回填 → 新事实入库 → 推断层重算

### 2.D MVP2 验收走查

- [ ] 2.D.1 24 小时（可加速）≥ 1 条"有用"连接建议
- [ ] 2.D.2 无用推送率 < 50%
- [ ] 2.D.3 微信建议 → 执行 → 回填完整走通一次

---

## MVP 3.0 · 网络与组织

> 前置：MVP2 验收通过，本人确认流程设计评审通过。

- [ ] 3.A.1 被记录者注册与本人确认：查看、修正、主张自己 Package 的权限级别（FR-3.1）
- [ ] 3.A.2 人脸/声纹 L4 授权签署流程（此前一律禁止 L4）
- [ ] 3.B.1 网络接触：双方世界授权部分互联（FR-3.2）
- [ ] 3.B.2 跨网络匹配：跨用户的价值发现与引荐流程
- [ ] 3.C.1 组织空间：企业/活动方世界、成员授权共享（FR-3.3）
- [ ] 3.C.2 活动模式：黑客松/展会批量入场、实时生成展位模块（FR-3.4）
- [ ] 3.C.3 平台 API：Package / 快照 / 匹配事件对外开放（FR-3.5）
- [ ] 3.D.1 验收：跨网络有效匹配 ≥ 1；组织空间权限隔离安全走查零泄漏

---

## 跨阶段 · 基础设施（随做随勾）

- [x] X.1 文档集建立（docs/README、PRD、ARCHITECTURE、CONTEXT-AND-MEMORY、ROADMAP）
- [x] X.2 前端原型部署：EchoWorld 咖啡厅 Demo 公网可访问（https://capture.meetmind.online/echoworld/）
- [x] X.3 模型接口抽象层（qwen3.7PLUS 默认，可替换）
- [x] X.4 模型调用审计日志（输入摘要/输出/耗时/费用）
- [ ] X.5 数据迁移评估：文件 → 数据库（触发条件见 ARCHITECTURE.md TBD-ARCH-2）

## 变更记录

- 2026-08-03 | 初始版本 | AI
- 2026-08-03 | 后端骨架落地（backend/ FastAPI）：echo-package.v0/echo-snapshot.v1 校验器、Package 存储（事实层 append-only）、World Service + 种子、Agent Runtime stub、qwen provider stub、自进化权限 guard、像素小人管线（mock 可跑通，本机 Blender 真实出 GLB）；1.A.1-2、1.B、1.C.1、X.3-4 完成，1.A.5、1.D.1 部分完成 | AI
- 2026-08-03 | 后端对齐 API v0.2 契约 + 计划阶段 1-3 落地：LLM 按角色接入（chat=deepseek 真实联通，vision=qwen-vl）+ provider 注册表 + mock 降级链；pipeline 提取真实化（图片 vision 分析人脸/场景、deepseek 摘要、视频降级 TODO、转写 stub）；runtime skill 化（cafe_daily/meeting）+ LLM 决策（JSON 约束 + 白名单 + 规则兜底）+ 对话生成（授权视图 ≥L2）+ 圆桌会议调度 + 快照 events 滚动缓冲；1.A.3、2.A.1 部分完成，2.A.2 完成 | AI
- 2026-08-03 | 后端对齐 docs/API.md v0.1：全路由 `/api/v0/` 前缀，新增 IF-2「pipeline」SSE 流式处理接口（ingest 只落盘、提取移至 pipeline、指针真实内容占位）、IF-3 confirm（新建/并入 Person）、IF-5 search（name/keyword 真实匹配，face 为 stub）；29 tests 全绿；1.D.1 完成 | AI
- 2026-08-03 | MVP1 全栈联通上线：LLM 真实接入（deepseek chat + dashscope vision，mock 降级链保留）、pipeline 提取真实化（图片 vision 分析/deepseek 摘要，视频抽帧 TODO）、runtime skill 化（deepseek 决策 + 规则兜底，agent-talk 对话仅含 ≥L2 授权内容，圆桌会议周期调度，事件缓冲入快照）；前端四模块落地（mock 数据层 `?api=live` 开关、pipeline 三屏、资料包面板+检索条、活的世界引擎）；统一集成（integrations.js、记录相遇 FAB、点选开面板、检索定位）；nginx `/echoworld/api/` 反代、uvicorn 常驻 8000、公网闭环实测通过（health/snapshot/search/packages 全通，世界持续演化）；50 backend tests 绿；1.A.5、1.C.2、1.C.5 完成 | AI
- 2026-08-03 | 合并队友设计分支 design/voxel-character-pipeline：场景变体（原始/绘本咖啡厅）+ 人物变体（无脸/voxel/storybook 照片衍生 GLB）+ VisualProfiles 视觉体系（灯光/材质模式，?scene=/?character= URL 切换）与我们的活世界引擎/后端快照驱动共存；冲突仅 main.js 两处（import 并集、boot 文案并集），已解决并部署 | AI
