# 持续编辑语义物件验收（2026-09-12）

目标：已经存在的物件可局部生长。修改后不仅实体 ID 保留，未改动部件的数据、Mesh、geometry 和 material 都保留。

## 新增接口

- meetmind.scene-patch.v1：title、rationale、operations。一次 1–12 个 add/update/remove 操作。
- add 提交一个完整新部件；update 以 ID 指定 changes，不能改 ID；remove 必须明确引用现存 ID。
- 单次每个 ID 只能出现一次；无效引用、重复操作、无变化操作、超出几何范围或最终超过 40 部件全部拒绝。
- 补丁在副本上完整校验后返回新 recipe 与 added/updated/removed/preserved 清单，不改变输入。
- POST /lab-api/proposals 的 mode=patch 接收当前所选对象的完整 appearance、标题及用户要求。
  提案响应包含 patch、合成后的 recipe 和 changes。只修改本人拥有且可见的物件，仍采用对象指纹和会话代数拒绝过期结果。
- visual.recipe.patched 追加实际补丁事件，以现有外观事件为来源；回放重算 appearance 与 changes。
  关系、行动、真实结果不因造型修改而改变。
- 浏览器已有外观时默认“生成局部修改提案”，显示新增/修改/移除/保留清单，再由用户应用。
  没有现有外观时继续走首次生成。

渲染 syncRecipe 按部件 ID 复用 Mesh 和 material；仅 geometry 类型变化时释放并替换旧 geometry。
未修改的部件不重新创建。先完整验证和预分配资源，再更新场景；不合法更新保留上一版有效外观。
删除部件或恢复默认释放对应资源。

## 真实服务状态

增量模型请求返回 HTTP 400。一次有界诊断确认 error.code=Arrearage：
Access denied, please make sure your account is in good standing。
未继续尝试付费调用。界面现能明确显示账户欠费或状态异常，不暴露密钥、内部 URL 或服务原始响应。

这意味着本轮 **没有成功的真实模型补丁输出**。上一轮初次物件生成成功不能替代本轮增量生成验证。
账户恢复后仍需复验真实模型是否正确理解“保留现有部件”和局部修改语义。

## 已完成验证

- 56 项 Python 示例测试通过；包含新增/局部属性修改/删除、结果预算、无效操作原子性、
  提案不修改状态、模式匹配、过期提案拒绝、补丁事件回放及最小输入边界。
- 8 项 Node 测试通过；包含部件 Mesh/geometry/material 身份、类型变化时释放 geometry、
  删除时释放资源、无效后部件不导致前部件被部分更新。
- 浏览器使用明确标注 fixture-only-no-model-call 的人工配方：
  12 部件纸桥 + 3 部件灯；patch 前后原部件完整数据和 UUID 都相同。
  提案不改状态；用户应用后追加 visual.recipe.patched；2D、手机和恢复默认均通过。
  无 pageerror，无手机横向溢出。桌面截图显示新增灯位于桥侧。
- 主站和独立 lab 构建通过；lab 主包约 575 kB，仍有大包提示。
- 后端全量：331 通过、1 跳过、149 条既有警告。

本轮截图与报告在本机临时目录 C:/Users/Li Hao/AppData/Local/Temp/meetmind-patch-fixture-evidence。
失败实时请求证据在 meetmind-patch-live-evidence/proposal.json。它们没有放入公共资产。

## 不调用模型的可重复浏览器验收

~~~bash
npm exec vite build -- --config examples/shared_experience/lab/vite.config.js
backend/.venv/bin/python -m examples.shared_experience.serve_recipe_fixture
# 另一个终端，需安装 Playwright
LAB_URL=http://127.0.0.1:4192/ PATCH_RESPONSE_MODE=fixture-patch node examples/shared_experience/lab/patch-browser-test.cjs
~~~

serve_recipe_fixture 明确是人工响应的独立 QA 服务，不读取模型配置。正式实验服务仍位于 4191，
使用显式 --enable-model 才调用现有 CHAT 配置。两者的会话相互隔离。

## 尚未覆盖

这次编辑范围是单件纪念物的外观，尚无部件间连接/支撑约束、行为生成、全场景增量布局或成熟美术资产。
现有 2D/3D 对照没有真人价值数据，不代表商业场景已选定。真实事件、共同历史和用户确认的边界继续保留。
