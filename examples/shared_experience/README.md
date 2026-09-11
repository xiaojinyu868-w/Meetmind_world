# 共同经历与现实反馈：可回放框架示例

这是 MeetMind world 开源框架探索的第一段可独立运行的契约样例。目标是让真实事件进入世界后，
人物、经历、对象和后续行动有稳定身份，变化可以解释，现实结果可以明确记录和撤回。

本示例仅使用虚构文本和人物。它不读取环境密钥、后端数据、照片或声音，不连接模型或线上 API。
它不替代现有产品，也不代表完成了框架发布、3D 实验或需求验证。

## 运行

需要 Python 3.10+，只有标准库依赖。在仓库根目录执行：

```bash
python -m examples.shared_experience.replay
python -m examples.shared_experience.replay --through 9
python -m examples.shared_experience.replay --through 11
python -m examples.shared_experience.replay --viewer observer
python -m unittest examples.shared_experience.test_replay -v
```

服务器 /root/meetmind_go 的系统 python3 较旧，使用 backend/.venv/bin/python 替代上面的 python。
输出为确定性的 meetmind.world-state.v1 JSON；前端未来可以把相同对象投影为时间线或 3D 交互物件。
当前的 loopback 实验室提供一个 Three.js 语义对象适配器和操作面板；它使用程序化实验物件，不加载人物或环境模型，也不代表游戏大厂人物质量。

## 启动可操作实验室

在仓库根目录执行：

```bash
npm exec vite build -- --config examples/shared_experience/lab/vite.config.js
python -m examples.shared_experience.serve --port 4191
```

然后打开 `http://127.0.0.1:4191/`。服务只监听 `127.0.0.1`，会话在内存中隔离，页面可切换查看身份、回放阶段、点击对象、纠正作品标题、逐人接受或拒绝行动、填写本人结果并撤回。实验室不会发送消息、报名或调用模型。

浏览器验收脚本（需要本机 Playwright）位于 `lab/browser-test.cjs`，会覆盖桌面和 390px 手机视口并输出截图与 JSON 诊断；它不是产品登录或线上验收。

## 按事件观察

| 截止序号 | 变化 | 应看到的状态 |
| --- | --- | --- |
| 2 | 系统发现候选人物 | 只有 observer 能看到候选，候选不成为已确认关系 |
| 4 | 两人分别认领 | alice 和 bo 独立确认自己的身份 |
| 5 | Alice 记录共同经历 | 参与关系标明 reported_by，只代表记录者陈述 |
| 6 → 7 | 作品标题纠错 | 标题真正变化，对象 ID 和原始来源保持 |
| 8 → 9 | 提议下一次行动，Alice 接受 | 只有 Alice 的意愿被改变；没有现实完成记录 |
| 10 | Bo 拒绝 | 两个人保留不同的选择 |
| 11 | Alice 自报完成 | 记录 self_report、说明、来源；不推断 Bo 参加或自动验证真实发生 |
| 12 | Alice 撤回自己的完成报告 | 当前 outcome 清空，意愿保留，回放可追溯撤回 |
| 13 | Alice 撤回原经历 | 经历与相关关系边退出当前视图；行动依据标为 withdrawn |

## 开发者接口

```python
from examples.shared_experience.replay import load_fixture, project_events

fixture, events = load_fixture()
state = project_events(
    events,
    viewer_id=fixture["viewer_id"],
    members=fixture["members"],
)
```

- 每条事件必须带 schema、event_id、sequence、room_id、actor_id、subject_id、type、payload、
  audience、source_refs。sequence 从 1 连续递增；重试同一 ID 的相同内容幂等，内容冲突报错。
- 同一投影只有一个世界。来源只能引用已经出现的事件，不能扩大来源允许的 audience。
- 成员列表、actor_id 与 viewer_id **由调用方认证后提供**。这里校验领域关系，没有实现登录、签名、
  网络授权或防伪造身份，不能直接把浏览器提交的 actor_id 当成认证结果。
- 候选只对观察者私有；确认必须由本人提交。事件不能把已确认身份降级为候选。
- 纠错与撤回追加事件；不修改输入历史。当前投影移除撤回经历与相连边，隐藏其来源引用。
  独立创建的作品仍保留，撤回经历不等于撤回所有衍生作品。
- 意愿与结果按参与者分别保存。只有接受者能自报自己的 completed / not_completed，
  或撤回当前自报。模型推断不被当作真人结果；报告也不等于外部已验证。
- 本样例不支持更改已作出的意愿，正式集成时需增加显式改约/取消契约，不能暗改历史。
- basis 是整个可信输入流的游标，可能暴露事件数量和最后事件 ID；它用于本地开发回放，
  **不是可以直接公开给不可信客户端的服务端授权 DTO**。实体、关系与来源按 viewer 过滤，
  未来服务端适配器需要独立、按权限生成游标。
- 原始事件流仍保留撤回记录。这里的撤回是当前投影撤回，不是原始数据物理删除。

## 本轮范围与下一步

目前是内存中纯函数全量回放，不是生产事件存储或多人同步服务。现有 RoomService 的持久化、
幂等命令及有序事件可以作为后续适配基础，但尚未接通。

接下来的完整验证需要：用同一授权事件流驱动时间线与可交互的语义 3D 对象；验证新增、纠错、
撤回时的局部更新和稳定身份；让真人使用后区分意愿、自报、外部证据与实际价值。
商业切入口与愿景措辞仍待选择，不因这个合成样例就默认活动社交或世界养成成立。

本示例未新增许可证，不改变仓库原有权利状态；正式框架发行仍需确定发布范围与许可证。
