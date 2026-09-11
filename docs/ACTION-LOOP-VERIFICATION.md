# 从经历提出行动：现实反馈入口验收（2026-09-12）

范围：examples/shared_experience 独立实验室。新增用户自己提出的行动，不再只能操作 fixture 中预设的 action-1。
这验证机制可用，不意味着已证明用户愿意使用、行动真实发生、3D 更有效或商业入口成立。

## 实际链路

本人确认的签到导入 → 选择经历 → 填写行动内容、带时区时间、时长、地点、完成标准和参与者 →
提出计划 → 每个人分别接受/拒绝 → 接受者下载个人日历 → 本人自报结果/撤回 →
原经历撤回时，行动保留且依据明确显示已撤回。

创建计划不自动替任何人接受，包括发起人本人。选择他人只是计划参与名单，实验不发送邀请。
已有合成身份切换不是生产登录或多人权限系统。

## 框架接口

- action_plans.validate_action_plan：严格四字段 scheduled_at、duration_minutes、location、success_criteria。
  时间必须带时区，标准化为 UTC；时长为 5–1440 分钟整数；地点最多160字，完成标准最多500字。
- POST /lab-api/commands，command=action.proposed：
  subject_id 引用现存可见经历/作品，request_id 为8–80位字母/数字/连字符，
  title 为1–160字，participant_ids 必须包含自己，plan 使用上述四字段。
- 同一 request_id 的等价重试不重复创建，即使后来已接受、反馈或撤回原经历。
  同 ID 改内容会拒绝；新请求需当前 expected_sequence。
- 私人经历只能衍生本人可见的行动；共享经历只允许其受众中已认领的人物被选入。
  计划只对所选参与者可见。领域投影继续校验身份和来源受众。
- 世界 DTO 为经历/作品增加 action_candidate_ids，供界面显示可以选择的已认领身份。
- action.proposed 的可选 plan 兼容旧 fixture；旧行动没有计划，不提供日历下载。

~~~json
{
  "command": "action.proposed",
  "request_id": "an-explicit-unique-request",
  "session_id": "created-lab-session",
  "viewer": "alice",
  "expected_sequence": 8,
  "subject_id": "memory-1",
  "title": "一起整理三张旅行照片",
  "participant_ids": ["alice", "bo"],
  "plan": {
    "scheduled_at": "2026-09-15T19:30:00+08:00",
    "duration_minutes": 45,
    "location": "楼下咖啡厅",
    "success_criteria": "各自选出三张照片，说明最想保留的一个细节"
  }
}
~~~

## 日历导出

GET /lab-api/calendar?session_id=...&viewer=...&action_id=...
仅本人已接受且有完整计划时返回 .ics。浏览器真实下载成功。
VEVENT 含稳定且不暴露原始身份的 UID、UTC 起止时间、标题、地点、完成标准及本人自述状态。
文本按 RFC5545 转义，CRLF 分行，UTF-8 每行最多75字节。不含 ATTENDEE、ORGANIZER、METHOD 或闹钟。

导出不修改事件流，不向日历服务联网，不给任何人发邀请。本轮没有在 Apple/Google/Outlook 日历中实际导入。
原始经历撤回不取消已经独立接受的计划；当前实现也不会更新用户已经下载到外部日历的副本。
改约、取消、意愿变更和外部结果核验尚未实现，不能暗改历史。

## 验收

- Python 示例合计68项通过。新行动测试覆盖创建、独立决策/结果、私有经历不能扩散、候选身份拒绝、
  幂等、冲突、过期请求、依据撤回；日历模块8项覆盖时区/边界、本人接受、信息隔离、注入与UTF-8折行。
- Node 语义渲染8项通过。
- 主站与独立lab构建通过。lab JS 578.05 kB / gzip 148.96 kB，大包提示仍保留。
- action-browser-test.cjs 桌面1440×1060和手机390×844完整通过：
  导入一条共享签到、创建自定义计划、重复POST不新增、不自动接受、未接受与拒绝者不能下载、
  接受者实际下载日历、UTC起止时间正确、不包含邀请、下载不改状态、两人独立选择、本人报告、
  2D显示相同计划、无横向溢出、结果撤回与依据撤回。无pageerror，已查看手机完整截图。
- 既有 browser-test.cjs 全流程回归通过，包括导入、纠错、撤回及2D/3D操作。
- 后端全量：331通过、1跳过，149条既有警告。

本机证据：C:/Users/Li Hao/AppData/Local/Temp/meetmind-action-evidence
（report.json、meetmind-action.ics、desktop-action.png、mobile-action.png）。
基线回归证据：meetmind-action-baseline-evidence。合成数据，不进入公共资产目录。

~~~bash
backend/.venv/bin/python -m unittest discover -s examples/shared_experience -t . -q
npm exec vite build -- --config examples/shared_experience/lab/vite.config.js
backend/.venv/bin/python -m examples.shared_experience.serve --port 4191
# 另一个终端，需Playwright；本验收不调用模型
node examples/shared_experience/lab/action-browser-test.cjs
~~~

## 产品判断与下一步

本轮让“从共同经历到下一次行动”成为可操作且可替换情境的实验。用户输入具体目标后，
可以比较2D/3D是否更容易理解共同历史、做出决定和完成原本就想做的事。
在没有目标用户观察或付费行为证据前，这仍是研究框架能力，不把计划数、下载数或自报数当作真实收益。
