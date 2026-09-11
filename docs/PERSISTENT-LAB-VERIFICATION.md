# 持续世界的保存与恢复验收（2026-09-12）

独立实验室增加可选持久化。它保存已提交事件历史，重新启动后重新校验和投影；
不是多人生产认证或完整世界平台。此前“内存会话不跨重启”仍适用于未指定 data-dir 的旧服务。

## 接口与边界

SQLiteSessionStore(directory) 创建独立 sessions.sqlite3，版本 PRAGMA user_version=1：
create(sid, events, generation=0) 返回 revision=1；
load(sid) 返回 events/generation/revision 或 None；
save(sid, events, generation, expected_revision) 以版本比较提交。

- 每次变更在 SQLite BEGIN IMMEDIATE 事务中保存，synchronous=FULL，提交后才更新 Lab 内存。
  两实例的旧版本写入被拒绝，写入失败不会部分改变历史、重置代数或清除提案。
- 重启后读取完整事件流并执行领域回放校验；JSON、schema、数据库损坏都明确拒绝，不能自动重置。
- sid 仅32位小写十六进制，数据库目录/文件在 Linux 分别为0700/0600。
- 最多100个持久会话，不自动删除旧数据。当前无会话列表、清理或存储迁移 UI。
- 保存位置必须避开 backend/data、public、dist、lab/dist 及它们的祖先/子目录。
- 默认服务继续仅内存，不建立数据库。只有显式 --data-dir 才保存。
- 提案和正在运行的模型请求不持久化；仅已经应用的生成/补丁事件恢复。
- 重置时保存 generation，跨进程恢复成相同内容仍不能重新应用旧提案。
- 浏览器 localStorage 只记录会话 ID、查看身份、选中对象、2D/3D 模式；事件数据在实验服务器。
  查看身份仍是合成切换，持有会话 ID 不能被当作生产身份认证。
- 恢复失败保留原浏览器会话标识并显示错误；新建独立实验必须由用户点击，不删除原会话。
- 回放阶段按钮仍会重置当前实验事件。持久化不改变该按钮行为，不是永久历史归档或备份系统。

## 实际验证

- 87项Python示例测试通过，其中13项存储测试与6项Lab集成覆盖：
  重开数据、跨实例CAS、SQL写入失败回滚、事件/recipe/patch/意愿/结果的恢复、
  隐私投影、旧提案失效、错误数据不自动修复及存储目录边界。
- 8项Node语义渲染测试通过。
- 主站与lab构建通过；lab JS 579.71 kB / gzip 149.60 kB，仍有大包提示。
- 后端全量331通过、1跳过，149条既有警告。
- 两阶段浏览器验收：
  1. 人工测试配方生成纸桥并加灯，纠正标题，两人分别接受/拒绝，记录本人结果，切换身份和2D，
     刷新后完整 state 相同。
  2. 明确停止独立 QA 进程 PID 29766，重新启动新进程并恢复浏览器存储。完整 state 与旧进程相同，
     15部件模型重建、手机无横向溢出；新实验隔离且旧数据仍可读。
  3. 写入不存在的会话 ID 再刷新，显示恢复失败且保留原标识，没有静默创建替代世界。
- 既有 browser-test.cjs 在持久化服务上完整通过。
  修正旧测试的 JSON 字符串比较，改为数据结构比较；SQLite规范化字段顺序不改变领域内容。
- 已查看恢复后手机完整截图。本轮不调用模型，人工测试配方不会被标为模型成功输出。

证据在 C:/Users/Li Hao/AppData/Local/Temp/meetmind-persistence-evidence
（prepare.json、report.json、expected-state.json、browser-storage.json、desktop-restored.png、mobile-restored.png）。
该目录含实验会话标识，未加入公共文件。基线报告位于 meetmind-persistence-baseline-evidence。

## 启动

~~~bash
npm exec vite build -- --config examples/shared_experience/lab/vite.config.js
backend/.venv/bin/python -m examples.shared_experience.serve \
  --port 4195 --enable-model --data-dir /root/.local/state/meetmind-lab/user-worlds
~~~

当前4195提供可保存的普通实验室，4191/4192旧服务保持不动以免丢失现有内存会话。
打开新入口会创建独立世界，不会自动迁移旧端口的未保存会话。
模型配置仍受此前Arrearage账户问题影响，本轮未尝试重新付费调用。

## 可复现重启测试

~~~bash
backend/.venv/bin/python -m examples.shared_experience.serve_recipe_fixture \
  --port 4194 --data-dir /root/.local/state/meetmind-lab/qa-persistence-20260912
# 另一个终端，需要Playwright
LAB_URL=http://127.0.0.1:4194/ PERSISTENCE_PHASE=prepare node examples/shared_experience/lab/persistence-browser-test.cjs
# 停止并用相同data-dir重新启动服务，然后：
LAB_URL=http://127.0.0.1:4194/ PERSISTENCE_PHASE=resume node examples/shared_experience/lab/persistence-browser-test.cjs
~~~

同两阶段使用相同 LAB_EVIDENCE_DIR；脚本只调用人工fixture服务。本轮没有证明跨用户加入、
长期可靠性、灾难备份恢复或用户拥有感。它完成的是这些体验所需的持久事件基础。
