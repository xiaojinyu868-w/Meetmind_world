# 照片到像素角色：方案 1 生产链路

## 当前结论

产品只保留方案 1：AI 从授权照片中总结可见特征，绘制固定 UV 的 MC 像素皮肤，再装配到 Blender 方块身体并发布到 Three.js。

人物模型与表情实现是一条链路：四种表情都通过切换该人物的完整像素 atlas 实现，不存在第二套人物或表情资源。

| 项目 | 约定 |
| --- | --- |
| 运行时参数 | `?character=voxel` |
| 贴图尺寸 | 128x128 PNG |
| 表情 | `neutral / happy / surprised / thinking` |
| 骨架 | `rigid-voxel-v1`，7 骨刚性权重 |
| 身体动作 | `Idle / Walk / Talk / SitDown / Sit / SitTalk / RaiseRightHand / RaiseBothHands` |
| 采样 | `NearestFilter` |
| 表情路径 | `textures/characters/voxel/expressions/{slot}_{expression}.png` |

绘本角色和 AI 直接生成完整 3D 人物只作历史归档，不进入前端选择器。

## 完整链路

```text
摄像头照片群
-> K3 按人物归组
-> 授权、质量与来源校验
-> AI 总结可见特征 CharacterSpec
-> AI/规则绘制固定 UV 的像素 atlas
-> Blender 固定方块身体、刚性骨架与八个 Action 装配
-> 带骨骼动画的 GLB、四张表情 atlas、预览与 manifest
-> UV/尺寸/骨架/动作/隐私/哈希校验
-> 发布 CharacterAsset
-> Three.js 加载与 Agent 驱动
```

Blender 只负责稳定的模板、UV、刚性骨架、标准 Action 和导出，不让 AI 为单个人物自由生成任意 Blender Python。AI 输出必须先进入受校验的 `CharacterSpec` 和贴图任务，骨架与动作由版本化生成器确定性生成。

## 身体动作契约

- 骨架对象为 `RIG_Voxel`，包含 `Root / Torso / Head / Arm_L / Arm_R / Leg_L / Leg_R` 七根骨骼。
- 头、躯干、左右臂和左右腿各自以 100% 权重绑定一根骨骼，保持 MC 方块部件的刚性视觉。
- `Idle` 是静止不变的默认循环；`Walk` 循环摆动双臂和双腿；`Talk` 循环点头并轻微摇头。
- `SitDown` 是一次性入座过渡；`Sit` 保持静态坐姿；`SitTalk` 保持相同坐姿并点头/摇头。坐姿由 Root 骨局部下沉与双腿旋转完成，不缩放角色根节点。
- `RaiseRightHand` 与 `RaiseBothHands` 为单次动作，播放完成后恢复当前基础动作。`durationMs` 只控制显式循环动作的覆盖时长，举手动作不因 duration 循环。
- `walking / arriving / joining-meeting` 映射到 `Walk`；到座后依次映射 `SitDown -> Sit`；坐着对话映射到 `SitTalk`，站立对话映射到 `Talk`；`animation-cue` 可显式触发标准动作。
- Action 不负责世界坐标位移。Three.js 仍根据输入或世界快照移动角色根节点，并为每个人物实例维护独立 `AnimationMixer`。

## 所需数据

正式上游最少需要提供：

```json
{
  "personId": "person_01",
  "displayName": "谢淯琪",
  "sourceAssetIds": ["asset-authorized-001"],
  "consentScope": ["character_model", "pixel_texture"],
  "visibleTraits": {
    "hair": "后束中分发",
    "glasses": false,
    "bodyTemplate": "regular",
    "outfitPalette": ["#715474", "#66717f"],
    "signatureItem": "深色挂绳"
  },
  "confidence": {
    "hair": 0.91,
    "outfitPalette": 0.96,
    "signatureItem": 0.74
  }
}
```

每项数据需要保留来源、用途授权、时间和置信度。不可见或低置信度特征必须标为设计补全，不得猜测身份、健康、民族等敏感属性。

原始照片、音频、embedding、内部 URI 和模型密钥不得进入 `public/`、GLB、日志或前端 DTO。浏览器只加载脱敏后的像素贴图、模型和资料 DTO。

## 像素皮肤契约

头部使用五个可见面：

```text
front | right | back | left | top
```

- 正面表现刘海、眼镜与极简表情。
- 左右面保持鬓角、镜腿和发型连续。
- 背面与顶面表现后脑轮廓、发旋和发色。
- 躯干、手臂和腿使用固定 UV 区域。
- 服装只保留色块和无文字图案，不复刻品牌、证件或活动 Logo。
- 禁止抗锯齿和连续渐变，避免破坏像素风格。

每次表情切换都替换完整 atlas，而不是只改头部某一面。这样能保证脸、头发、眼镜和穿搭始终属于同一个人物，也能让贴图缓存和失败回退保持简单。

## 表情触发

UI、NPC 和会议系统统一发送语义事件：

```json
{
  "type": "character.expression.set",
  "personId": "lin-che",
  "state": "thinking",
  "source": "roundtable-listening",
  "durationMs": 1000
}
```

- 资料侧栏手动选择：保持状态，直到用户再次切换。
- NPC 自主对话：普通语句为开心，问句为思考，感叹句为惊讶，随后恢复平静。
- 圆桌会议：倾听时思考，发言时按文本选择表情，随后恢复平静。
- 贴图缺失：先回退同一人物的 `neutral`，再回退 GLB 内嵌初始 atlas。
- 异步加载：较旧请求不得覆盖较新的表情状态。

## 槽位映射

当前合照按从左到右映射：

| 槽位 | 姓名 | 演示角色 ID |
| --- | --- | --- |
| `person_01` | 谢淯琪 | `lin-che` |
| `person_02` | 曾英杰 | `zhou-ning` |
| `person_03` | 黄月胜 | `chen-mo` |
| `person_04` | 李浩 | `xu-an` |
| `person_05` | 杨璐 | `su-he` |
| `person_06` | 洪选婷 | `tang-ke` |

关系 Map、资料侧栏、场景模型、肖像和表情 atlas 必须共用这张映射。玩家使用独立的 `host` 槽位。

## 服务端执行

建议把生成任务放在隔离的 Blender Worker 中：

```text
CharacterSpec + atlas + templateVersion
-> schema validation
-> versioned Blender generator
-> render preview
-> bounds/UV/texture/triangle/privacy validation
-> publish GLB + atlas + manifest
```

Worker 需要限制 CPU、内存、执行时间和输出路径。生成失败时保留任务日志，但不得在错误信息中暴露原始照片或内部地址。

## 当前重建命令

在仓库根目录执行：

```powershell
blender --background --factory-startup --python .\blender\build_photo_character_modes.py
blender --background --factory-startup --python .\blender\validate_photo_character_modes.py
python .\blender\build_character_expression_textures.py
```

关键输出：

- `public/models/characters/photo-derived/voxel/`：7 个带刚性骨架和八个 Action 的运行时 GLB。
- `public/textures/characters/voxel/`：7 张基础像素 atlas。
- `public/textures/characters/voxel/expressions/`：7 人 x 4 表情，共 28 张完整 atlas。
- `public/portraits/photo-derived/voxel/`：关系 Map 与资料侧栏肖像。
- `exports/character_expression_assets_manifest.json`：表情资源路径、尺寸和哈希。
- `exports/photo_character_modes_manifest.json`：模型、骨架、Action、预览与哈希清单。
- `exports/photo_character_modes_validation.json`：Blender 重导入后的结构与动作校验报告。

## 验收标准

- 前端不显示多方案人物选择器，运行时人物固定为像素角色。
- 七个角色的模型、肖像、姓名和表情 atlas 槽位一致。
- 七个 voxel GLB 均只有一个 7 骨刚性骨架，并包含且只包含八个标准 Action。
- 四种表情可以手动切换，也能被 NPC 对话和圆桌会议自动驱动。
- 玩家和行走中的 Agent 仅在实际移动时播放 `Walk`；默认保持 `Idle`；入座播放一次 `SitDown` 后保持 `Sit`，坐姿对话使用 `SitTalk`；右手/双手动作可由运行时 API 或 `animation-cue` 触发并恢复基础动作。
- 切换表情时使用完整 atlas 和 nearest 采样，像素边缘清晰。
- 缺图与异步竞态有可预测回退。
- 模型脚底位于导出地面、面向本地 `-Y`，兼容移动、入座和圆桌会议。
- `public/` 不包含原始照片或未授权数据。
