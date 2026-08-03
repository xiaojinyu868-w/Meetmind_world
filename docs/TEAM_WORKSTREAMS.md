# EchoWorld 黑客松分工与集成边界

## 分支约定

- `main`：只接受经过构建与联调验证的合并，不直接开发。
- `feature/design-3d-pipeline`：设计组工作分支，负责 Low-poly 视觉、Three.js 体验和 Blender 人物资产链。
- 其他团队建议按 `feature/agent-runtime`、`feature/k3-person-package`、`feature/platform-integration` 建立独立分支。

## 团队职责

| 工作流 | 负责人 | 输入 | 交付 | 不在本工作流内 |
|---|---|---|---|---|
| K3 / 算法 | 算法组 | 眼镜照片、音频、采集元数据和同意记录 | 按人物归组的 `PersonPackage`、质量和来源信息 | Three.js UI、Blender Python、Agent 对话 |
| Agent Runtime | Agent 组 | 授权后的 PersonPackage、人物基本资料、相遇事件 | 人物状态、会话、记忆更新和有序 `AgentEvent` | 人物外观推断、GLB 修改、前端布局 |
| Design + 3D | 设计组，本分支 | PersonPackage 中已授权的照片索引和基本资料 | `CharacterSpec`、三视图、`BlenderBuildPlan`、Low-poly GLB、咖啡厅 UI 与 Three.js 交互 | 人脸/声纹聚类、服务端长期记忆 |
| Platform / Integration | 集成组 | BuildPlan、CharacterAsset、AgentEvent 和前端构建产物 | API、队列、Blender Worker、对象存储、部署与端到端追踪 | 修改设计定稿和 Agent 人物事实 |
| Group Experience | 群体玩法组 | 上游已建档参与者 DTO、授权后的 `avatar_ref` | 现场房间状态、第一印象推断、位置同步、破冰游戏事件与结果 | 合照分割、人脸/贴图生成、音频/视频处理及上下文抽取 |

## 设计组目录所有权

```text
src/                         Three.js 世界与 UI
public/models/               已发布的演示 GLB；不放原始照片和声音
design/                      Art bible、三视图审核与视觉规格
blender/                     参数化生成器、部件注册表和验证器
contracts/                   CharacterSpec、BuildPlan、CharacterAsset schema
fixtures/                    脱敏联调样例
```

当前仓库只有前端目录。新增 `blender/`、`contracts/` 和 `fixtures/` 时，应保留以上边界，不把算法中间数据复制进浏览器可访问的 `public/`。

## 三条稳定契约

### PersonPackage：算法组 -> 设计组 / Agent 组

最低字段：

- `person_id`、`revision`、`consent` 和 `provenance`。
- 每张照片和音频的 `asset_id`、受控 URI、哈希、质量、用途和采集时间。
- 已确认的基本资料和 encounter ID。

原始 embedding、完整环境录音、未经授权的人物事实不得下发给设计前端。

### CharacterAsset：设计组 -> 前端 / 集成组

```json
{
  "schema_version": "character-asset.v1",
  "character_id": "char_demo_01",
  "revision": 1,
  "glb_url": "/assets/characters/char_demo_01/1/model.glb",
  "content_hash": "<sha256>",
  "runtime": {
    "scale_meters": 1.05,
    "ground_offset": 0,
    "forward_axis": "+Z",
    "animations": {}
  },
  "qa": { "status": "passed" }
}
```

只有 QA 通过的资产可以进入前端资产注册表。更新必须增加 `revision`，不能静默覆盖旧 URL。

### AgentEvent：Agent 组 -> 前端

事件必须包含 `event_id`、`session_id`、`sequence`、`agent_id`、`type` 和 `payload`。前端只接受白名单语义事件，例如：

- `agent.state.changed`
- `message.delta` / `message.completed`
- `speech.started` / `speech.ended`
- `animation.cue`
- `asset.updated`
- `consent.revoked`

AgentEvent 不得携带要在浏览器执行的 JavaScript、任意 Three.js 参数或 Blender Python。

### GroupRoom：已建档 DTO -> 现场群体玩法

`echo-group-room.v1` 只接收 `person_id / display_name / avatar_ref` 和玩家主动输入的文字、位置、选择。`avatar_ref` 仅透传，不得由群体玩法服务读取原图、生成贴图或推断人脸；音视频上下文同理由上游处理后以授权 DTO 或推断项交付。本工作流产出的第一印象和游戏结果写入推断层，必须保留作者、对象、现场房间来源与时间。

## 集成顺序

1. 算法组先提供 3 个脱敏 PersonPackage fixtures。
2. 设计组使用 fixture 产出 1 个真实 CharacterAsset 和统一占位人物。
3. Agent 组提供可重放的事件流，不等待真实模型全部完成。
4. 集成组接通异步 Blender Worker 和版本化资产 URL。
5. 前端以 `person_id` 关联资料、Agent 和 CharacterAsset，演示模型热替换。
6. 最后联调撤回：人物节点、GLB、对话和缓存必须同时失效。

## 合并门槛

- `npm run build` 通过。
- Blender GLB 能在干净场景重新导入，尺寸、轴向、节点和预算通过。
- 中央六人圆桌不会被普通 NPC 自主占用。
- 动态人物资产加载失败时保留占位人物，不重置整个咖啡厅。
- 桌面和移动端没有关键控件遮挡或横向滚动。
- `public/`、日志和前端 DTO 中不存在原始照片、声音、embedding、模型密钥或内部 URI。
