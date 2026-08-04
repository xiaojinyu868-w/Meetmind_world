# 上游数据输入契约（算法组 → EchoWorld 系统）

> 地位：上游算法组（人脸分割 / 声纹识别 / ASR / 图像理解）交付物的**唯一数据契约**。
> 上游输出一律视为"待确认的候选与推断"——写入人物事实层必须经过 IF-3 用户确认（P-3）；
> 原始媒体只增不改（事实层），上游的识别结果进推断层并携带置信度与来源指针。
> 本契约只规定"上游给我们什么、我们以什么格式接收"，不规定上游内部实现。

## 上游能力清单（2026-08-04 确认）

| 能力 | 交付物 | 我们系统的消费位置 |
|---|---|---|
| 人脸分割 | 合照/现场图 → 每张人脸的独立裁剪图 + bbox | 群体入场（FR-2.12）、相遇提取（IF-2 faces 步骤） |
| 声纹识别 | 说话人声纹 ID → 可绑定 person_id | ASR 说话人归属、身份候选（待确认） |
| 带时间戳 ASR | 分段转写（起止时间 + 文本 + 说话人） | IF-2 transcript 步骤（1.A.4 的落地路径） |
| 图片本体 + 时间戳 | 原始图片（事实层） | 相遇现场、场景模块贴图、资料包 |
| 图片 caption | 图像内容描述（推断层） | IF-2 scene 步骤、场景标签、场域素材 |

上游未交付前，系统内置的自检测路径（qwen-vl 人脸框检测 / OpenCV 兜底、模板转写 stub）
作为**开发与演示兜底**保留；上游 DTO 到达后以其为准，自检测结果只作交叉验证。

## 通用规则

1. **时间戳必填**：所有图片、音频、转写段都带采集时刻（ISO 8601 带时区）；同一 encounter 内各模态按时间轴对齐。
2. **归属是候选，不是结论**：`match_person_id` 由上游给出时为"候选绑定"，置信度 < 1 或未经用户确认前，不进入 Agent 上下文，不入事实层身份字段。
3. **资产以受控引用传递**：`asset_ref` 指向事实层存储（`facts/...`），HTTP 出口为 `GET /api/v0/media/{ref}`；原始字节不进前端 DTO、`public/` 或日志。
4. **质量与授权随行**：每个交付物带 `quality`/`confidence` 与 `consent_scope`（该素材允许什么用途）；低质量样本进"待确认"队列而非直接建档。
5. **schema 版本硬校验**：版本字符串不符即拒收；字段只增不改，破坏性变更升版本号。

## DTO-1 图片与图片组（含 caption）

```jsonc
{
  "schema": "echo-upstream-image.v1",
  "asset_ref": "facts/2026-08-04/in_01JXXX/group.jpg",   // 原图（事实层）
  "captured_at": "2026-08-04T14:30:00+08:00",
  "width": 1922, "height": 1279,
  "caption": "黑客松现场，五人围坐在长桌旁合影",          // 推断层，可空
  "caption_confidence": 0.86,
  "consent_scope": ["character_texture", "scene_module"],
  "encounter_hint": "enc_01JXXX"                          // 可选：建议归属的相遇事件
}
```

## DTO-2 人脸分割结果

```jsonc
{
  "schema": "echo-upstream-faces.v1",
  "source_image_ref": "facts/2026-08-04/in_01JXXX/group.jpg",
  "captured_at": "2026-08-04T14:30:00+08:00",
  "faces": [
    {
      "face_id": "face_01",
      "crop_ref": "facts/2026-08-04/in_01JXXX/face_01.jpg",  // 独立裁剪图（事实层派生存储）
      "bbox": { "x": 0.104, "y": 0.203, "width": 0.081, "height": 0.118 },  // 归一化 0-1
      "quality": 0.91,                    // 清晰度/正面度综合
      "match_person_id": null,            // 上游人脸识别候选；null = 新人
      "match_confidence": null
    }
  ]
}
```

- 消费路径：`backend/app/pipelines/group_onboarding/`（批量建档）与 IF-2 pipeline faces 步骤。
- bbox 为归一化坐标；系统端裁剪缺省时按 bbox + 边距自行裁剪。

## DTO-3 声纹注册

```jsonc
{
  "schema": "echo-upstream-voiceprint.v1",
  "voiceprint_id": "vp_01JXXX",
  "person_id": null,                        // 用户确认后由系统回写绑定；上游只给候选
  "match_person_id": "person_01JYYY",       // 候选绑定（可选）
  "match_confidence": 0.88,
  "sample_refs": ["facts/.../segment_01.m4a"],
  "created_at": "2026-08-04T14:31:00+08:00"
}
```

## DTO-4 带时间戳的 ASR 转写（含说话人归属）

```jsonc
{
  "schema": "echo-upstream-transcript.v1",
  "source_audio_ref": "facts/2026-08-04/in_01JXXX/clip.m4a",
  "captured_at": "2026-08-04T14:29:30+08:00",
  "duration_ms": 61200,
  "segments": [
    {
      "start_ms": 1200, "end_ms": 5800,
      "speaker_voiceprint_id": "vp_01JXXX",   // 与 DTO-3 对应；可空（归属不明）
      "match_person_id": null,                 // 声纹绑定后的候选归属
      "confidence": 0.83,
      "text": "我们今年在做的是一个关系世界的原型"
    }
  ]
}
```

- 转写原文双份留存：原始 JSON 入事实层（`transcript.v1.json`），渲染文本（`transcript.v1.md`）为派生；修正产生新版本，不改原始（CONTEXT-AND-MEMORY §1 防线 2）。
- 说话人归属未确认前，`match_person_id` 仅为候选；确认流程把"声纹 → 人"的绑定写入身份（FR-1.3 的扩展，声纹版）。

## 接收方式（当前阶段）

- MVP2 现场阶段：上游离线产出上述 JSON + 媒体文件，由系统侧脚本/管理接口批量导入（导入即走 facts 只读落盘 + schema 校验）。
- 在线推送接口（IF-1 的上游变体）届时在 docs/API.md 另立详节，未定义前以此文件的 DTO 为联调依据。

## 变更记录

- 2026-08-04 | 初始版本：依据上游能力口述（人脸分割/声纹/带时间戳 ASR/图片+caption+时间戳）落档 | 人（输入）+ AI（成文）
