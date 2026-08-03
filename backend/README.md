# EchoWorld Backend（FastAPI 骨架）

对应 `docs/ARCHITECTURE.md` §2 的后端落地。原则：**框架完整、接口稳定、算法全部
mock/stub（预留打磨空间）、代码可运行、有最小测试**。

## 快速启动

```bash
cd backend
python3.11 -m venv .venv          # 或任何 ≥3.10 的 python3
.venv/bin/pip install -r requirements.txt   # 慢可加 -i https://mirrors.aliyun.com/pypi/simple/
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
.venv/bin/python -m pytest tests/ -q        # 最小测试
```

- 配置：复制 `.env.example` 为 `.env`（LLM 中转、BLENDER_PATH、ECHO_DATA_DIR）。
  未配置 LLM 时 `QwenProvider` 自动返回 mock 响应，不报错。
- 运行期数据写入 `data/`（`facts/` 事实层、`inferences/` 推断层、`people/` 人物目录、
  `derived/` 生成物），内容不入库。

## 目录导览（对应 ARCHITECTURE.md §2）

```
app/
  main.py                 FastAPI 装配：World Service + EventBus + Agent Runtime + 各 router
  config.py               .env/环境变量读取（LLM 中转、BLENDER_PATH、数据目录）
  api/
    ingest.py             IF-1 POST /api/v0/ingest：输入落盘（事实层，只增不改）→ {input_id, facts_refs}
    pipeline.py           IF-2 POST /api/v0/pipeline：SSE/once 产出中间特征 + encounter_draft（提取 stub）
    confirm.py            IF-3 POST /api/v0/confirm：用户确认身份写入 Package（FR-1.3，长期记忆唯一入口）
    search.py             IF-5 POST /api/v0/search：人脸(stub)/姓名/关键词检索（FR-1.9）
    packages.py           IF-5 GET /api/v0/packages[/{id}]：Package 列表/详情（viewer 权限过滤）
    world.py              IF-4 GET /api/v0/world/snapshot：echo-snapshot.v1 世界快照
  schemas/
    package_schema.py     echo-package.v0 手写硬校验（privacy 枚举、推断必带事实指针）
    snapshot_schema.py    echo-snapshot.v1 生成与硬校验
  packages/store.py       Package 存储：facts/ append-only、inferences/ 可重算、people/ 目录
  world/
    service.py            World Service：事件消费（move/state/talk/meeting-*）、tick、
                          最近 20 条事件滚动缓冲、圆桌会议入座真实锚点、
                          register_person 展位注册（幂等，大厅/confirm 调用）、
                          agent-move 统一走 resolve_move 服务端权威解算（缓冲含最终位置）
    colliders.py          碰撞注册表（frozen dataclass：Bounds/Circle/WorldColliders）+
                          resolve_move 分离解算（静态壳钳制 → agent 圆形分离 0.6m → 再钳制）；
                          cafe 静态壳同源 tables.py，大厅摊位壳由 booth modules 动态派生
    hall.py               展位大厅（露天集市街道）：两侧两排摊位锚点（x=±3.8 朝街道中心、
                          z 从 -9 起行距 2.4m 交替填充、容量 16、出生区 z>8.5 留空）、
                          HallRegistry 幂等分配、build_display_from_package（≥L2 才上墙）
    tables.py             桌位/阻挡配置：TABLE_BLOCKERS + 边界 + 18 个座位锚点
                          （与前端 TABLE_BLOCKERS/CafeLayout 同源），clamp_to_walkable
                          统一钳制 + seated 锚点吸附（防穿模）
    seed.py               种子：1 咖啡厅模块 + 6 demo agent（调色板对齐前端 demoPeople.js）
                          + 幂等 demo Package（bio 落种子事实，推断带真实指针，
                          face/现场照复制自 public/portraits，media 路由可取）
  agents/
    runtime.py            Agent Runtime：每 tick 读 skill + 快照调 chat provider 决策
                          （JSON 约束 move/visit/sit/talk），失败回退规则驱动；
                          对话生成只用授权视图（≥ L2）；圆桌会议周期调度；
                          一切输出只发事件且先过 guard 事件白名单
    hall_runtime.py       大厅串门调度器：有目的的稀疏活动（默认 1/8 概率），
                          配对由 ≥L2 共同 tags / relations.md 关联驱动，
                          状态机 going→talking→returning，对话围绕共同标签
    llm/base.py           LLMProvider 抽象（OpenAI 兼容模板 + 审计留痕）+ 按角色注册表
    llm/deepseek.py       chat 角色（deepseek-chat，决策/对话/摘要），未配置降级 mock
    llm/qwen.py           vision 角色（qwen-vl 图像理解：人脸候选/场景标签）
    memory/store.py       记忆分层：场景/短期/长期（只读）/推断 + authorized_agent_view
                          （≥ L2 授权上下文视图，对话与决策的唯一信息来源）
    skills/               cafe_daily.md / meeting.md（runtime 每 tick 读取）+ loader
    tools/example_tool.py 工具协议示例（search_person，FR-1.9 占位）
    utils/jsonish.py      LLM 输出宽容 JSON 提取（runtime 与 pipeline 共用）
  harness/
    permissions/          自进化权限矩阵 + runtime 事件白名单（permissions.yaml）+ guard.py
    prompts/              自进化 prompt 放置约定
  pipeline/
    three_view.py         照片 → 三视图接口（mock：复制输入图）
    blender_gen.py        三视图 → GLB：subprocess 调本机 Blender 无头，失败降级 mock GLB
    person_builder.py     编排：照片 → 三视图 → GLB → Package avatar 登记（全流程 mock 可跑通）
    video_frames.py       视频均匀抽 3 帧：优先系统 ffmpeg（本机 /usr/bin/ffmpeg），
                          其次 venv 内 cv2（可选 opencv-python-headless），双不可用返回 None
    templates/blender_lowpoly.py  Blender 占位人形脚本（ROOT_FacelessCharacter + MAT_* 材质）
tests/                    pytest（schema / snapshot / api / pipeline+vision / providers /
                          runtime / permissions / live 冒烟默认 skip）
data/                     运行期数据（.gitkeep 占位，内容被 .gitignore 排除）
```

## 解耦契约（图片→人 研究模块，给队友的交接面）

- **队友输入**：`app/pipeline/three_view.py::generate_three_views(photo_paths, out_dir)`
  与 `app/pipeline/blender_gen.py::generate_lowpoly_glb(three_views, out_path, ...)` 两个
  函数签名 + `docs/ART-BRIEF.md` 的 GLB 契约（材质槽 jacket/hair/skin/pants/shoes/shirt、
  根节点 `ROOT_FacelessCharacter`、面朝 +Z、脚底原点）。
- **队友替换方式**：只改这两个函数的实现（或新增模块后在 `person_builder.py` 注册），
  其余系统零感知；现有 mock/Blender 占位保持为降级兜底。
- **质量锚点**：产物 GLB 必须通过契约校验（根节点/材质名/尺寸），校验测试随产物补进 `tests/`。

## 接口清单（docs/API.md v0.1 契约，全部挂 `/api/v0/` 前缀，`/api/health` 除外）

| 组 | 方法 | 路径 | 用途 |
|---|---|---|---|
| — | GET | `/api/health` | 健康检查 |
| IF-1 | POST | `/api/v0/ingest` | 输入：multipart（media[]/captured_at/device/note?/place_hint?）→ 201 `{input_id, facts_refs, status:"stored"}`，落盘即只读 |
| IF-2 | POST | `/api/v0/pipeline` | 处理「pipeline」：`{input_id, mode, steps?}`；`mode=stream`（默认）SSE 流式产出 preprocess/faces/transcript/scene 中间特征 + result 返回 encounter_draft；`mode=once` 一次性返回合并 JSON |
| IF-3 | POST | `/api/v0/confirm` | 确认：`{encounter_draft, identity{name, match_person_id}, privacy}` → `{person_id, encounter_id, package_ref, avatar_status}`；match_person_id 为 null 新建 Person，否则并入；长期记忆唯一写入入口 |
| IF-4 | GET | `/api/v0/world/snapshot?world=hall\|cafe&advance=1` | echo-snapshot.v1 世界快照。world=cafe（默认）：活动世界，events 为最近 20 条缓冲；world=hall：展位大厅，agents 以 at-booth 站位为主，events 为大厅事件缓冲（稀疏串门：agent-move/agent-state/agent-talk），modules 含 booth（display 名牌/人像/相框/标签）。advance=1 默认推进 tick，=0 只读 |
| IF-5 | GET | `/api/v0/packages` | Package 摘要列表 |
| IF-5 | GET | `/api/v0/packages/{person_id}?viewer=self\|agent\|org\|public` | 按权限圈层过滤的详情（agent 视角要求已确认） |
| IF-5 | POST | `/api/v0/search` | 检索（FR-1.9）：`{by:"face"\|"name"\|"keyword", query/photo}` → `{results:[{person_id,name,score,last_encounter}]}`；face 为 stub |
| — | GET | `/api/v0/media/{ref:path}` | 资料包媒体（facts 指针）安全取字节：路径防穿越（403）、扩展名白名单、正确 Content-Type、404 |
| — | GET | `/api/v0/admin/integrity?person_id=` | 事实层完整性自检（1.D.3）：manifest.v1.json 的 sha256 复核报告 {ok, checked, corrupted, unregistered}；单用户 MVP 无鉴权，多用户需保护 |

## 边界（务必读）

- 事实层只增不改：`packages/store.py` 没有更新/删除事实文件的入口，覆盖写抛
  `FactLayerImmutableError`；编辑 = 新版本文件名（NFR-1.1）。
- 自进化写入一律先过 `harness/permissions/guard.py`；长期记忆（人物事实层）禁止
  自进化写入，只能走 `/api/v0/confirm` 用户确认流程（P-3/P-8）。
- 快照是前端唯一数据契约；资料包内容不走快照，经 API 按权限单独拉取（ADR-3）。
