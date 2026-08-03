# Skills：规定发展方向与权限限制的指引文件

Skill 是给 Agent 的**指引文件**（不是代码）：它规定 Agent 在某类任务中的发展方向、
可调用的工具范围、以及必须遵守的权限限制。Agent 通过阅读 Skill 决定"怎么做"，
但 Skill 本身属于权限矩阵中的**禁止自进化项**（`skill.workflow`）——
自进化流程只能更新状态类数据，永远不能改写 Skill。

## 怎么写一个 Skill

一个 Skill 是一个 `.md` 文件，文件名即稳定 ID，必须包含四段：

1. **目的**：这个 Skill 让 Agent 学会做什么（对应哪个 FR / 场景）。
2. **输入**：Agent 开始前必须拿到的上下文（首版为全量视图，TBD-P3 不过滤；
   授权机制重议后恢复圈层约束，届时在此注明所需级别）。
3. **流程**：步骤化指引；只能引用 `../tools/` 中已存在的原子工具，不得虚构。
4. **权限边界**：明确写出本 Skill 允许写入的目标（必须在
   `../../harness/permissions/permissions.yaml` 的 allow 清单内），以及绝对禁止触碰的内容
   （长期记忆、Tool 实现、权限配置、API 密钥）。

规则：

- Skill 只编排工具与判断，不实现工具逻辑；逻辑永远住在 `../tools/`。
- 新增/修改 Skill = 代码评审级变更。
- 示例见 [example_skill.md](./example_skill.md)。
