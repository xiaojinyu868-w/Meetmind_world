# MeetMind World Core（实验版）

把带来源的经历投影成可持续变化的世界状态，保存每个人独立作出的行动选择与反馈。
这是从现有实验提取的 Python 内核，版本 0.1.0a2；运行时只有标准库依赖。

## 安装与接入

需要 Python 3.10+。在仓库根目录本地安装：

```bash
python -m pip install ./packages/meetmind_core
python examples/core_consumer/weekend_walk.py --output /tmp/meetmind-walk-output
```

构建工具为 setuptools / wheel，pip 构建时可能下载；安装后的内核运行不联网。
没有发布到 PyPI。包名是 `meetmind-world-core`，导入名是 `meetmind_core`。
本次没有新增许可证或改变仓库权利状态。

```python
from meetmind_core import project_events, checkin_to_envelope

# trusted_events、authenticated_viewer、room_members 必须由宿主服务取得，不能信任浏览器自报身份。
state = project_events(
    trusted_events,
    viewer_id=authenticated_viewer,
    members=room_members,
)
```

输出 `meetmind.world-state.v1`，包含稳定实体 ID、来源、关系、符号化外观和各人的行动选择。
支持人数由宿主提供，不固定为情侣或两个预置身份。序号连续，同 ID 同内容重试幂等，冲突内容拒绝。
输入不会被修改；同一日志可按查看者投影，供 2D、Three.js 或其他消费者使用。

## 导出的能力

| 接口 | 用途与边界 |
| --- | --- |
| `project_events` | 身份认领、归属明确的经历、物件纠正、撤回、个人行动和结果；宿主负责认证与持久化 |
| `calendar_event_to_envelope` / `checkin_to_envelope` | 把明确确认的 DTO 转为事件；不连接日历服务，不把邀请当作到场 |
| `validate_recipe` / `parse_recipe` | 限定几何、材质、语义部件的 JSON；不执行生成代码，不访问模型 |
| `apply_patch_recipe` / `parse_patch` | 原子修改指定部件，保留未改部件与身份 |
| `validate_action_plan` / `action_calendar` | 校验个人计划、导出本人已接受事项的 ICS 文件；不发邀请、不写外部日历 |
| `DuplicateEventConflict` | 同一事件 ID 内容不同的明确错误类型 |

`meetmind_core.recipes` 还提供模型消息构造函数；仅生成消息数据，模型调用、费用控制与结果确认由宿主负责。
可执行的完整事件示例见 `examples/core_consumer/weekend_walk.py`，无框架内部 fixture 导入。

## 接入责任

- 每条事件带 `schema/event_id/sequence/room_id/actor_id/subject_id/type/payload/audience/source_refs`。
  支持事件名称见 `meetmind_core.replay.EVENT_TYPES`；格式不兼容或不满足因果来源时抛出 `ValueError`。
- 宿主认证 actor 和 viewer，并确定成员和受众。内核无法核验外部真人身份。
- `experience.confirmed` 的含义是记录者明确提交，其参与关系仍标 `reported_by`；不能声称所有人确认。
- `appearance_model` 是调用方填写的来源标记，内核不核验它；手写配方示例明确标为人工，无 AI 调用。
- 返回的 `basis` 是完整可信流的游标，会暴露事件数量；不要原样当作公网授权 DTO。
- 撤回从当前视图移除来源，不删除日志。另行记录的经历不会被级联抹除；历史来源与失效策略由宿主继续定义。
- `experience.corrected` 允许记录者绑定最新内容事件更正文字，保留参与关系、来源元数据和身份。
  关联物件/行动沿因果引用链显示依据变化，不抹掉已有个人选择或结果。
- `visual.basis.reviewed` 绑定当前外观与所有内容版本；`action.basis.reviewed` 只记录本人对当前依据的核对。
  核对不是接受行动。之后再次更正仍会失效；撤回来源不能靠复核重新生效。
- 目前行动选择不可改约；shared_space 的区域/测量领域规则尚未并入本内核。
- 全量回放，没有存储/网络/登录/计费/渲染服务。真实照片、视频、声音和模型效果不在本次完成范围。

## 复验

```bash
python scripts/verify-core-package.py
python -m unittest discover -s examples/shared_experience -t . -q
```

复验脚本构建 wheel，在独立临时虚拟环境安装后，将消费者复制到仓库外并以隔离模式运行。
它检查三人独立选择、来源与权限、符号部件局部变化、后续经历、本人行动反馈、撤回、落盘恢复和 ICS。
构建产物及输出留在脚本打印的临时目录。脚本不调用模型、不操作线上数据。
这证明打包后的内部示例可独立执行，不证明外部开发者已经成功接入或用户愿意付费。
