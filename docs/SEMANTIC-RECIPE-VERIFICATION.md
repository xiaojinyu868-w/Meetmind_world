# 语义配方生成验收（2026-09-12）

范围为 examples/shared_experience，权威代码 /root/meetmind_go。合成输入，不读生产数据。
实现 recipe schema、纯校验器、可选 CHAT 适配器、提案缓存和应用/恢复事件，以及 Three.js 部件解释器。

## 实际模型调用

通过既有 CHAT 配置使用 deepseek-v4-flash。首次生成由原 provider 返回 mock 标记，实验拒绝；
无法从该返回区分具体异常，不将它归因为已确定的超时。一个简短 JSON 连通诊断成功。
改用保留 HTTP/超时类别的独立适配器（90 秒，无 mock 或自动重试）后，下一次生成被尺寸校验拒绝。
补充薄部件最小厚度说明后，第三次生成成功：纸桥·共筑，16 部件，75185 ms。

成功响应包含五段纸桥、两端支撑、河流底板和折纸树；部件含义明确为对共同创作的视觉诠释。
它未改变人物身份、来源、关系或后续行动。这里只报告一个成功样本，不推断整体成功率或质量。

## 浏览器证据

- 基线脚本 browser-test.cjs 在模型启用服务上完整通过：既有导入、纠错、撤回、个人结果和 2D/3D 对照无回归。
- recipe-browser-test.cjs 实时模式完成生成、提案不修改状态、应用和身份/来源/关系/行动保持。
  随后因同一说明出现在两处导致测试选择器歧义，不能称该次全流程通过。
- 选择器修正并将生成物件抬到公共底座顶部后，使用捕获的真实响应在独立 4192 内存服务重放。
  完整桌面和 390px 验收通过：语义部件渲染、无 recipeError、UUID/位置保留、2D 含义和状态一致、
  无手机横向溢出、恢复默认后原根节点保留。报告 responseMode=captured-replay，不冒充新的实时调用。
- 检查了桌面 canvas 和完整手机截图；修复公共底座遮住模型下部的问题。造型仍简单，桥段连接和
  构图精度不代表成熟美术。不得称为大厂级角色或完整世界生成。

本机证据路径（不提交私人或临时截图到公共目录）：

- C:/Users/Li Hao/AppData/Local/Temp/meetmind-recipe-live-evidence/proposal.json
- C:/Users/Li Hao/AppData/Local/Temp/meetmind-recipe-baseline-evidence/report.json
- C:/Users/Li Hao/AppData/Local/Temp/meetmind-recipe-captured-evidence/report.json
- 同目录 generated-canvas.png、desktop-generated.png、mobile-recipe.png

## 自动检查

- 示例 Python：50 通过，覆盖无效 JSON/范围、提案不改状态、仅所有者修改、对象变化失效、
  相同状态重置也失效、失败解锁、最小模型输入。
- Node：6 通过，覆盖根对象身份/位置、部件含义、资源释放、恢复与不合法字段/位置拒绝。
- 后端 pytest：331 通过、1 跳过、149 条既有警告。
- 主站生产构建和 lab 构建通过。lab 主 JS 573.35 kB / gzip 147.12 kB；大包警告仍在。
- CI 已增加 recipe Node 测试；不调用模型。浏览器验收仍需 Playwright。

## 复现与限制

默认纯回放不读取配置、不联网。显式启用模型：

~~~bash
npm exec vite build -- --config examples/shared_experience/lab/vite.config.js
backend/.venv/bin/python -m examples.shared_experience.serve --port 4191 --enable-model
# 另一个终端，调用一次真实模型，会产生 API 用量
RUN_LIVE_RECIPE=1 node examples/shared_experience/lab/recipe-browser-test.cjs
~~~

协议只解释数据，不执行模型代码。模型输出错误时拒绝，不自动修正到另一个尺寸或冒充成功。
只支持物件外观；连续生成的视觉质量、真实交互行为、成熟人物/场景、用户价值与商业入口仍未验证。
实验服务的成员切换不是生产认证；内存会话不是可上线的持久世界。模型请求无自动重试。
