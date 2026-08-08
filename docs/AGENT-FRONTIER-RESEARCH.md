# Agent 行为运行时前沿调研（2026-08-08）

本文回答一个问题：业界与学界最前沿的"LLM 驱动 NPC 自主行为"是怎么做的，
EchoWorld 的行为层（现在 = RoomConductor 掷骰子）该往哪走。
调研分三路：学术前沿、工业生产架构、开源可复用实现。所有关键结论附来源。

## 一句话结论

对 6–20 个 NPC、单服务器、15s 心跳、DeepSeek/Qwen 廉价 API 的小世界，
学界与工业界已收敛到同一个答案：

> **规则/引擎做执行层与世界状态的唯一写者；LLM 只在"决策点"输出高层意图
> （从固定行为池里选），意图经校验后落地；记忆用 近因×重要性×相关性 检索 +
> 周期反思 + 衰减；活动按节律错峰、按玩家 proximity 分级。**

这正好是"把现有 RoomConductor 从掷骰子升级为 LLM 意图选择器"的渐进改造，
不是推倒重写。

## 学术前沿（关键论文）

- **Generative Agents**（Park et al., UIST 2023, https://arxiv.org/abs/2304.03442）：
  memory stream + 检索打分（recency×relevance×importance）+ reflection（重要性
  累计超阈值合成洞见写回）+ 层级规划（日→小时→动作）。弱点：25 agent 2 个模拟日
  花数千美元；记忆流变长后检索会捞出陈旧/矛盾条目。
- **Generative Agent Simulations of 1,000 People**（2024,
  https://arxiv.org/abs/2411.10109）：访谈/质性人设 grounding 远比人口学标签有效
  （GSS 重测一致性 86% vs 74%）。→ 我们的"真实相遇记录"就是最好的 formative memories。
- **Concordia**（Google DeepMind, https://arxiv.org/abs/2312.03664,
  https://github.com/google-deepmind/concordia）：NPC 只声明自然语言意图，
  **Game Master 单一写者**校验可行性、序列化动作、更新世界状态——小世界一致性的
  标准答案，恰好对应我们的 RoomService。
- **Humanoid Agents**（UW/NVIDIA, https://arxiv.org/abs/2310.05418）：加几个内在
  状态变量（精力、情绪、关系亲密度）调制行为，是最便宜的拟人化升级，无需改 LLM。
- **Project Sid / PIANO**（Altera, https://arxiv.org/abs/2411.00114）：快慢认知模块
  并行 + cognitive controller 仲裁；30 个相同 agent 即涌现角色分化——小规模 +
  差异化人设足以涌现。
- **AgentSociety**（清华, https://arxiv.org/abs/2502.08691）：可信度来自真实环境
  约束（移动、经济）的 grounding，无约束的 agent 会漂移。
- **OASIS**（CAMEL-AI, https://arxiv.org/abs/2411.11581）：8B 级模型做社交行为
  已够用；昼夜 Time Engine 按活动曲线每 tick 只激活一小部分 agent——24/7 世界
  同时获得真实感和 10–50× 成本下降。
- **成本工程**：Lyfe Agents（MIT, https://arxiv.org/abs/2310.02172）option-action
  层级（LLM 选高层 option，低层动作规则执行）→ ~$0.50/agent·小时，便宜 30–100×；
  AGA（腾讯 AI Lab, ICML 2024, https://arxiv.org/abs/2402.02053）计划缓存复用
  （embedding 命中即零成本回放）+ 社交记忆压缩 → token 降至 31–43%，涌现不变。
- **批评与失效模式**（选型必读）：LLM 压扁群体内方差、人设一致性差
  （https://arxiv.org/abs/2402.01908, https://arxiv.org/abs/2312.17115）——
  需要遗忘/自我监控机制（MemoryBank 艾宾浩斯曲线是最简可引实现）。

## 工业生产架构（关键案例）

- **Inworld AI**：Contextual Mesh（世界观/护栏是独立层，不是 prompt 文本）；
  记忆 = Flash Memory（近期事实全量注入）+ LTM（embedding 检索）；认知 LOD——
  只有靠近玩家的 NPC 跑完整认知循环，背景角色跑廉价规则；某社交客户靠
  "大 prompt 拆成按任务路由的小模型"降本 90–95%。**核心引擎闭源，别指望复用。**
  (https://gamesbeat.com/inworld-ai-showcases-ai-case-studies-as-they-move-to-production/)
- **KRAFTON PUBG Ally**（NVIDIA ACE, GDC 2026，
  https://developer.nvidia.com/blog/how-krafton-built-pubg-ally-a-co-playable-character-powered-by-nvidia-ace/）：
  System 1（行为树 tick 级反应）/ System 2（SLM 慢思考）分离，**大部分工程量花在
  定义两层边界上**；接地纪律——模型永不信任自己对状态的记忆，工具结果是唯一事实
  来源；prompt 前缀跨轮稳定省 KV cache。
- **Convai**：LLM 输出经"能力表/人格/叙事"三重过滤才可执行；**"错误的动作选择几乎
  总能追溯到错误的上下文组装"**；动作 handler 每条路径必须回报完成否则 agent 卡死。
  记忆系统 Mimir 配方全公开：近期原文 + 摘要窗口 + 长期合并 + 混合检索
  （语义+BM25 0.5/0.5，高斯时间衰减，重要性 log₁₀ 加权，刻意不做 re-ranking 保延迟）。
  (https://convai.com/blog/long-term-memory---a-technical-overview)
- **Kotoko AI "Bounded Autonomy"**（目前最强的已上线架构论文）：权威服务器持有
  房间状态；每角色 40s 行为心跳；LLM 只输出动作名 → embedding 匹配到固定池
  378 个"行为包"；低于阈值走 fallback；连锁对话用概率衰减外部截断
  （别问模型"要不要停"）。
- **Character.AI**：会话前缀固定 + KV 缓存粘性路由，95% 命中率——对应 DeepSeek/
  Qwen 的 context caching，前缀稳定化直接省输入费。
- **腾讯光子/网易伏羲**：RL bot 管行为、LLM 只管对话/人格/记忆（"LLM + AI Bot"）；
  决策与对话生成分离、大模型蒸馏小模型；AI 功能 opt-in、不替代现有体验。
- **反面教材**：Replica Studios 2025 年倒闭（别依赖单一 NPC SaaS）；Meta 名人 AI
  全砍（没有人格外参与循环的人设活不下来）；Fortnite AI Vader 几天被越狱
  （persona prompt 不是护栏）。

## 开源实现评估（复用结论）

| 项目 | 状态 | 结论 |
| --- | --- | --- |
| joonspk-research/generative_agents | 冻结 2024，锁 openai 0.27 | **参考-only**：认知循环设计元祖 |
| a16z-infra/ai-town (MIT, 活跃) | TS/Convex 不可嵌入 | **参考-only**：引擎分层是最佳生产模式（tick 确定性改状态、LLM 异步产意图对象、对话状态机、无人观察自动暂停） |
| google-deepmind/concordia (Apache) | 活跃 | **暂不采用**：纯文本世界、每步 ~6 次 LLM 调用、集成 1–2 周；NPC 认知长到 plans/goals/reflection 时再回来 |
| AgentLife（70★，无 license） | 停更 | **结构最像 EchoWorld**：可注册行为空间 + validate 前置过滤 + LLM 选意图 + waiting_time 错峰调度，已验证可接 DashScope |
| neural-maze/philoagents-course (MIT) | 教程 | 参考：FastAPI + 长期记忆 NPC 引擎，技术栈直接对口 |
| mem0 (Apache, 活跃) | 活跃 | 记忆层**升级备选**（in-process、per-agent 隔离、DeepSeek 支持）；当前规模手写即可 |
| AutoGen | 实质 EOL | 避免 |
| CrewAI / CAMEL | 活跃 | 任务型框架，常驻 NPC 不适用 |
| Zep（云-only）/ Letta（已 pivot）/ Graphiti（重） | — | 避免 |

**核心发现：没有可直接当 runtime 用的现成框架；编排层必须自己持有。**

## 施工蓝图（对 EchoWorld 的映射）

在现有架构上渐进改造，按优先级排序：

1. **意图对象化**（AI Town 模式）：心跳仍由 RoomService 确定性改状态；LLM 决策
   是异步任务，产出 intent 对象 `{type: sit|visit|greet|join_table|..., target, duration}`
   替换 RoomConductor 的掷骰子位置。LLM 调用永不阻塞 tick。
2. **固定行为池 + 前置过滤**（AgentLife/Kotoko/Convai 模式）：每个 intent 是注册
   代码，带 `validate(npc, world)` 前置条件；决策时先过滤出合法意图列表再让
   DeepSeek/Qwen 选——幻觉动作和状态一致性问题一并解决。
3. **Per-agent 错峰调度**（Lyfe/OASIS）：LLM 返回意图时带 `waiting_time`，每个
   NPC 各自排下次决策时间，不是全员每 tick；背景 NPC 纯规则，玩家附近/交谈中的
   才调 LLM（认知 LOD）。全量 20 NPC 每 15s 决策约 1–3 元/h，错峰后远低于此。
4. **内在状态变量**（Humanoid Agents）：每 NPC 加精力/情绪/亲密度几个数值，
   作为决策 prompt 的廉价调制信号。
5. **记忆层**（手写，Convai Mimir 配方）：近期轮次原文全量 + LLM 摘要窗口 +
   长期事实库（现有 facts/ markdown 归档 + embedding）；检索打分
   recency×importance×relevance，top-k 3–5 注入；事实提取是异步 off-tick 任务；
   周期反思/摘要写回（每模拟日一次）+ 衰减遗忘。规模上去再考虑 mem0。
6. **成本三板斧按序做**：prompt 前缀稳定化（人设/世界设定固定前缀，吃 context
   caching）→ 任务路由（闲聊 flash、会议发言/反思走高配）→ LOD + 连锁对话
   概率衰减截断。
7. **可回放事件日志**（AgentSociety 2）：JSONL 记录每次决策输入/输出，高方差
   涌现行为必须可调试。

**避免**：逐 tick 给 LLM 行为控制权；把世界状态交给模型记忆（注入状态是唯一
事实来源）；persona prompt 当护栏；过早做语音。

**现实预算锚点**：文字交互端到端 <1.5s；6–20 NPC 24/7，flash 级模型 +
上述手段，月成本可压到很低的两位数美元量级（需实测标定）。
