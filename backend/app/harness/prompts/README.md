# 自进化 prompts 放置约定

本目录存放 harness（自进化流程）使用的 prompt / MD 文件。

约定：

- 一个文件一个 prompt，文件名即稳定 ID（如 `extract-interests.md`），被代码引用后不改名。
- prompt 里**禁止**写死任何密钥、API 地址；模型配置一律走 `.env`（见 `.env.example`）。
- prompt 能要求模型做的事受 `../permissions/permissions.yaml` 约束：只能更新状态类数据
  （Agent 位置/状态、当前任务、相遇记忆新增、短期记忆、用户反馈），不得诱导修改
  Skill 工作流、Tool 实现、权限本身、长期记忆与 API 配置。
- 每个 prompt 文件头部注明：目的、输入变量、输出格式（建议 JSON）、关联的权限目标。
- 修改本目录文件 = 代码评审级变更。
