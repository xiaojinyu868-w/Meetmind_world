# 以人物为单位的生理信号与 Agent 数据链路

## 目标与当前范围

本链路把眼镜、麦克风和戒指在一次现实社交中采集的数据，按 `personId` 对齐并沉淀为 `PersonPackage`。后端用它更新人物 Agent、生成 MC 像素角色，并向前端发布一个可展示的 `PersonSignal` 快照。

当前设计组只实现接收与展示占位能力，不在浏览器内做人脸识别、声纹识别、心动值计算、破冰检测或情感推断。演示数据位于 `src/data/demoSignals.js`，后续只要真实接口返回相同 DTO，即可替换占位数据。

> 心率变化只代表生理唤起。AI 给出的“投入”“紧张”“放松”等描述均为有置信度的推测，不是对喜欢、厌恶或关系质量的事实判断，也不是医疗结论。

## 完整数据流

```text
眼镜摄像头：照片 / 视频帧 / 人脸轨迹
麦克风：环境音频 / 说话人片段 / 相遇起止标记
戒指：实时 HR、PPG、ACC；历史 HRV、呼吸率、皮肤温度
  -> 统一设备时钟与 encounter 时间窗
  -> K3 边缘处理：质量过滤、人物聚类、声纹对齐、去重、授权检查
  -> 按 personId 生成并版本化 PersonPackage
       |-> 照片特征 -> CharacterSpec -> 固定 UV 的 MC atlas
       |                 -> 参数化身体（身高/胖瘦）-> GLB -> Three.js
       |-> 声音片段 -> 服务端声音提炼 / VoiceProfileRef
       |-> 性格、记忆、相遇事件 -> Agent 蒸馏与上下文更新
       `-> 戒指时间序列 -> 心动值、趋势、破冰事件、AI 解释
                              -> PersonSignal API / 实时事件
                              -> 头顶心跳 + 人物资料页
```

### 1. 采集与人物归属

1. 摄像头检测到人脸后创建一条 `visionTrackId`，麦克风提供说话人片段与相遇时间窗。
2. 戒指只记录用户自己的生理响应，不记录对方的生理状态。戒指样本带设备时间戳。
3. K3 将摄像头、音频与戒指时钟校准到统一时间轴，并把相同 encounter 窗口内的信号关联到已确认的 `personId`。
4. 低置信度的人脸或声纹匹配不得直接写入长期人物包，应进入待确认队列；多人同时出现时保留 encounter 级归属，不强行归因给单个人。

“看到某张脸时心率上升”只建立时间关联，不自动建立情感因果关系。走路、咖啡因、温度、设备松动等都可能造成相似变化，实时 ACC 可以协助排除运动干扰。

### 2. K3 与 PersonPackage

K3 输出是服务端内部的版本化包，不是直接下发浏览器的 JSON。推荐最小结构：

```json
{
  "schemaVersion": "person-package.v1",
  "personId": "lin-che",
  "revision": 12,
  "updatedAt": "2026-08-03T14:32:18+08:00",
  "consent": {
    "scopes": ["agentMemory", "characterTexture", "signalInsight"],
    "expiresAt": null
  },
  "encounters": [
    {
      "encounterId": "encounter-20260803-001",
      "startedAt": "2026-08-03T14:27:34+08:00",
      "endedAt": null,
      "photoAssetIds": ["private-photo-001"],
      "audioSegmentIds": ["private-audio-001"],
      "signalWindowIds": ["private-signal-001"]
    }
  ],
  "characterSpecRef": "character-spec-lin-che-r4",
  "voiceProfileRef": "voice-profile-lin-che-r7",
  "agentContextRef": "agent-context-lin-che-r12",
  "personSignalRef": "person-signal-lin-che-latest"
}
```

所有媒体只以受控 `assetId` 引用。原始照片、连续环境录音、声纹、embedding、完整生理时间序列和内部 URI 不得进入前端 DTO 或 `public/`。

### 3. 人物角色与 Agent

- 照片只用于总结可见身份特征和绘制固定 UV 的 MC 像素 atlas。
- 身高和胖瘦由后端审核后的参数控制，并限制在模板允许范围内，不能让 AI 直接生成任意 Blender 脚本。
- Blender Worker 负责固定身体装配、贴图、GLB 导出与 QA；Three.js 只加载通过 QA 的版本化角色资源。
- 音频在服务端提炼为受控声音配置；浏览器只获得播放或合成所需的授权引用。
- 性格、过往和 encounter 事件用于 Agent 蒸馏、记忆更新与对话。Agent 生成的推测必须与确认事实分开存储。
- `personId` 是资料、信号、Agent、肖像、MC 贴图和 GLB 的唯一关联键。

## PersonSignal 前端契约

前端统一使用 camelCase。缺失值使用 `null`，不能用 `0` 冒充；时间使用带时区的 ISO 8601 字符串。

```json
{
  "schemaVersion": "person-signal.v1",
  "personId": "lin-che",
  "capturedAt": "2026-08-03T14:32:18+08:00",
  "status": "live",
  "heart": {
    "currentBpm": 88,
    "baselineBpm": 72,
    "peakBpm": 101,
    "heartScore": 82,
    "trend": "rising",
    "explanation": "当前心率高于近 30 分钟基线；这表示唤起程度上升，不等同于喜欢。"
  },
  "metrics": {
    "breathingRate": 17.2,
    "stressIndex": 61,
    "skinTemperature": 33.4,
    "hrv": 39
  },
  "inference": {
    "label": "积极投入",
    "summary": "心率与呼吸较基线升高，可能正在集中注意当前交流。",
    "confidence": 0.78,
    "caveat": "也可能受运动、咖啡因或环境温度影响；该标签是推测，不是事实。"
  },
  "iceBreak": {
    "detected": true,
    "at": "2026-08-03T14:30:42+08:00",
    "breakSeconds": 104,
    "reliability": "high"
  },
  "sourceRefs": {
    "encounterId": "encounter-20260803-001",
    "heartStreamId": "ring-hr-window-001",
    "historicalBatchId": "ring-history-001",
    "visionTrackId": "vision-track-001",
    "audioSegmentId": "audio-segment-001"
  }
}
```

### 字段语义

| 字段 | 类型 / 范围 | 更新频率与含义 |
| --- | --- | --- |
| `status` | `live / recent / stale / unavailable` | 表示快照新鲜度；非 `live` 时 UI 不得伪装成实时数据 |
| `heart.currentBpm` | bpm | 戒指 HR 实时流的最新有效值；用于资料页展示与未来相遇回放中的真实心率节奏 |
| `heart.baselineBpm` | bpm | 后端近 30 分钟滑动窗口基线 |
| `heart.peakBpm` | bpm | 当前 encounter 已确认的峰值 |
| `heart.heartScore` | 0-100 | 后端对 HR 相对基线、趋势、质量与场景信息归一化的产品指标；驱动当前头顶心形动画，但不是“好感百分比” |
| `heart.trend` | `rising / steady / falling / unknown` | 已平滑的短时走势 |
| `metrics.breathingRate` | 次/分钟 | 通常每约 2.5 分钟产生的历史值，不是实时值 |
| `metrics.stressIndex` | 0-100 | 后端派生展示指标，不是医学压力诊断 |
| `metrics.skinTemperature` | 摄氏度 | 通常每约 15 分钟产生的历史值 |
| `metrics.hrv` | ms（RMSSD） | 通常每约 2.5 分钟产生的历史值，用于回放佐证 |
| `inference.confidence` | 0-1 | 当前 AI 解释的置信度，不得隐藏 `caveat` |
| `iceBreak.reliability` | `low / medium / high` | 只有历史 HRV/呼吸等佐证齐全时才可升为 `high` |
| `sourceRefs` | ID 集合 | 仅供服务端追踪与问题定位，不得包含媒体 URL、密钥或原始数据 |

`capturedAt` 主要对应 HR 快照时间。`metrics` 是最近可用的历史聚合值，正式接口可在后续版本给每项增加 `observedAt`；当前 UI 必须明确标注“最近记录”，不能与实时 HR 并列成同一时刻读数。

## 心动值、心跳动画与破冰事件

### 心动值

`heartScore` 由后端统计服务生成，前端不重复计算。建议后端综合：

- `currentBpm` 相对个人 `baselineBpm` 的变化幅度；
- 当前趋势、信号质量、ACC 运动过滤和 encounter 持续时间；
- 个人历史范围，而不是跨用户直接比较；
- 异常值剔除和分数平滑，避免心脏动画抖动。

当前原型的头顶标记显示心形符号与 `heartScore`，并将 0-100 分平滑映射到 48-150 次/分钟的视觉节奏，因此分数越高跳得越快。这是产品化反馈，不是对真实心搏波形的复刻。未来若增加硬件文档中的“相遇回放/胸口心跳”，该表现再由有效 `currentBpm` 按 `60 / currentBpm` 驱动。`status` 为 `stale` 或 `unavailable` 时停止跳动并显示更新时间。

### 破冰检测

根据硬件方案，破冰的底层含义是“HR 峰值后的稳定回落拐点”：

1. 以近 30 分钟 HR 均值作为滑动基线。
2. encounter 内出现 `HR > baseline + 15%` 时记录 spike。
3. spike 后 HR 连续 N 秒回到 `baseline ±5%`，记录第一次稳定回落。
4. 输出 `at`、`breakSeconds` 和初始可靠度。
5. 回放阶段再用历史 HRV、呼吸率和 ACC 佐证，必要时提升可靠度。

心率加快可能来自走动或咖啡，心率回落也可能来自疲劳；因此产品文案应写“检测到可能的破冰时刻”，不能写“确认你喜欢这个人”。

## API 与实时事件

建议服务端提供：

```text
GET /api/people/{personId}/package-summary
GET /api/people/{personId}/signal
GET /api/people/{personId}/character
GET /api/people/{personId}/agent-summary
```

实时通道使用有序事件，快照仍保持上述 `PersonSignal` 结构：

```json
{
  "eventId": "evt-01J...",
  "sequence": 1842,
  "type": "person.signal.updated",
  "personId": "lin-che",
  "occurredAt": "2026-08-03T14:32:18+08:00",
  "payload": { "personSignal": {} }
}
```

白名单事件：

- `person.signal.updated`：替换该人物最新快照。
- `person.inference.updated`：AI 分析完成后更新解释、置信度和边界提示。
- `person.iceBreak.detected`：触发一次破冰视觉反馈并写入人物时间线。
- `person.package.updated`：人物资料、Agent 或角色资产存在新 revision。
- `person.consent.revoked`：立即清理前端缓存、角色节点和可识别资料。

客户端按 `personId` 保存快照，按 `sequence` 去重和拒绝乱序事件；重连后先重新拉取快照，再续订增量事件。后端需要保留 `eventId -> encounterId -> sourceRefs` 的审计链。

## 前端展示规则

### 角色头顶

- 心形图标旁显示 `heartScore`，不要将数值命名为“喜欢度”。
- 头顶心形的周期随 `heartScore` 加快或减慢，并使用平滑过渡；真实 HR 节奏只用于未来的胸口心跳或相遇回放。
- `rising / steady / falling` 只影响轻量趋势提示，不用红色直接代表负面情绪。
- 角色距离过远、被遮挡或同屏人数过多时降低信息密度，优先显示选中人物。

### 人物信息页

- 重点展示心动值、实时 HR、个人基线、峰值和趋势。
- 呼吸率、压力指数、皮肤温度和 HRV 作为“最近记录”展示，并标注单位。
- AI 解释必须与 `confidence`、`caveat` 同时出现。
- 破冰未检测时显示“尚未检测到”，不能把 `null` 显示为 0 秒。
- 数据状态、最后更新时间和来源状态必须可见；过期值降级显示。

## 数据生命周期与安全边界

- 摄像头、声音和生理信号均是高敏感数据，采集前需要明确授权、用途和保留时间。
- K3 优先在边缘端完成人物分组、质量过滤和脱敏；传输与存储均需加密。
- `personId` 使用内部伪名标识，前端展示名是可撤回资料，不能作为数据库主键。
- AI 推测与确认事实分栏存储，所有推测保留模型版本、时间、置信度和证据引用。
- 人物合并或拆分必须迁移 encounter、Agent、角色资产和信号索引，不能只改 UI 名称。
- 授权撤回后，原始媒体、派生声音、像素贴图、Agent 记忆、信号快照和缓存都要按策略级联失效。
- 浏览器不接收原始生理序列，只接收最小化聚合 DTO；详细时间线仅在有权限的回放接口中按需获取。

## 联调替换点

当前占位层导出：

```js
import { getPersonSignal, personSignalsById } from "./data/demoSignals.js";
```

运行中的原型还提供两个联调入口，调用后会同时更新人物资料页和 3D 头顶标记：

```js
window.__echoWorld.setPersonSignal(personSignalSnapshot);
window.__echoWorld.ingestPersonSignal(orderedBackendEvent);
```

正式环境应由 REST 首次拉取快照，再由 SSE/WebSocket 适配器把白名单事件交给 `PersonSignalStore.ingestEvent()`；不要让业务组件分别维护自己的缓存。

正式接入时，UI 只需把 `getPersonSignal(personId)` 替换为查询缓存，并由 `person.signal.updated` 更新该缓存。以下条件成立即可无痛切换：

1. 六个现有 NPC 与后端使用相同 `personId`。
2. 所有字段保持 camelCase 和 `person-signal.v1` 语义。
3. 数值缺失返回 `null`，状态与时间戳准确。
4. 心动值、AI 解释和破冰结果都由后端给出，前端仅负责展示和动画。
5. mock、REST 快照和实时事件共用同一份 schema 校验。
