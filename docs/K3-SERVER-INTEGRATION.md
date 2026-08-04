# K3 → EchoWorld 全链路联调

本项目实现 `/root/AVjoint/SERVER_AGENT_INTEGRATION.md` 中的服务器接收协议，并在
接收成功后把已确认人物导入 EchoWorld Package 与展位大厅。

完整的下游事实/推断、权限、Agent Runtime、两张资料卡和 Three.js 数据流见
[`REAL-DATA-WORLD-ARCHITECTURE.md`](./REAL-DATA-WORLD-ARCHITECTURE.md)。

## 数据路径

```text
K3 Context Hub
  → PUT /v1/physical-ai/assets/{sha256}
  → POST /v1/physical-ai/packages
  → backend/data/physical-ai（内容寻址对象、原始 package、幂等回执）
  → facts/sessions（整段录音、场景图、佩戴者生理、原始 package，只存一次）
  → facts/<person> + people（分段音频、人脸/声纹证据、每人物 Package）
  → inferences + memory.md + relations.md（摘要、长期记忆、人物关系）
  → derived/characters + derived/signals（体素 atlas/GLB、PersonSignal）
  → 大厅 + v1 咖啡厅 PersonAgent + 资料包
```

K3 的一个 `agent-package` 对应一次会话，不等于一个人。服务器以 `session_id` 保存
共享事实，再遍历 `persons[]`，按全局 `person_id` 更新多个 EchoWorld PersonPackage；
`person-self` 只作为佩戴者与生理数据所有者，不生成对外人物展位。

只有具备全局 `person_id`、姓名，且 `identity_state=confirmed|resolved`（或
`confirmed=true`）的人物会自动进入大厅。`person-self`、佩戴者和未确认人物不会
上墙；其原始 package 仍会保留，避免错误归人。

## 服务配置

部署环境必须设置：

```bash
export PHYSICAL_AI_AGENT_TOKEN='短期 Bearer token'
```

正式 schema 已位于联调工作区；本机设置：

```bash
export PHYSICAL_AI_PACKAGE_SCHEMA='/root/AVjoint/agent-ingest-bridge/contracts/agent-package.schema.json'
```

服务会把同目录的 `agent-context.schema.json`、`scene-analysis.schema.json` 等引用
一起注册后执行完整 JSON Schema 校验；未配置时才退到 1.0/1.1 兼容校验。token
不得写入 Git、package 或日志。

启动服务：

```bash
cd backend
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

K3 端配置的 `PHYSICAL_AI_AGENT_ENDPOINT` 必须直接指向能够转发
`/v1/physical-ai/*` 的服务根地址。反向代理不能只转发 `/api/*`。
本地 Vite 已代理该路径；公网 nginx 需要添加等价 location 后再交付 K3 endpoint。

## 验收

K3 执行：

```bash
contextctl agent-package-send session-xxx
contextctl package-deliveries session-xxx
```

预期结果：

1. 媒体首次 PUT 返回 `stored`，重传返回 `already_present`。
2. package 首次 POST 返回 HTTP 202、`duplicate=false`。
3. 相同 package 重传返回 HTTP 200、`duplicate=true`。
4. 浏览器直接打开大厅（默认真实 API，不需要 `?api=live`），新人物与展位出现。
5. 点击人物可查看脸/声纹事实摘要，播放说话人分段音频与整段会话录音。
6. Package 含专属 `model_ref / texture_ref / expression_refs`，世界实际加载该体素角色。
7. `GET /api/v0/people/{person_id}/signal` 返回最小化 `person-signal.v1`，不含原始样本。
8. 在资料包打开“Agent 记忆”后，该次摘要与长期记忆进入 v1 PersonAgent 上下文。

注意：K3 Encounter 默认 `self-only`。资料包里的开关通过
`PATCH /api/v0/packages/{person_id}/encounters/{encounter_id}/privacy` 在 L1/L2 间
切换。Ring 投影表达的是佩戴者在共同会话时间窗内的反应；多人会话会明确标注不可
归因到单一参与者，也不会生成情感或医疗结论。

离线静态演示必须显式使用 `?api=mock`，避免把 mock 成功误认为真实联调成功。

自动化回归：

```bash
cd backend
.venv/bin/python -m pytest -q tests/test_physical_ai_integration.py
```
