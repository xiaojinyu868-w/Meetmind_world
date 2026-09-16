# Echo Campus 真实产品展示片

主文件：`../Echo-Campus-Showcase.mp4`；97 秒，1920×1080，30fps，H.264/AAC。字幕：`../Echo-Campus-Showcase.zh-CN.srt`。无 UI 封面：`../Echo-Campus-cover.jpg`。

建筑段落来自真实浏览器 Canvas 录制，原始文件位于 `../browser-qa/campus-live.webm` 和 `gallery-live.webm`（1440×900）。视频使用每段前约 17 秒，并缩放裁切至 16:9。交互段落来自同目录中的真实浏览器截图；仅做裁切、缩放和编辑排版，没有重画或模拟功能界面。每个镜头明确标注素材来源。入口截图之后使用的是已领取身份的资料编辑界面。

配音复用已授权的 DashScope `qwen3-tts-instruct-flash-2026-01-26`，Ethan / 晨煦音色，沿用已经响度整理、ASR 核验的 97 秒母带及36条对齐字幕。未新增 TTS，未克隆真人声音。

实体 NFC 碰卡仍待现场验证。双方确认素材是同机独立浏览器会话连接真实活动服务，画面明确标注；不应称为两部实体手机的实机录屏。场景导入与碰撞适配边界见场景使用指南。

`build_showcase.py` 可重新生成成片；`verify_showcase.py` 完整解码并检查时长、1080p30、AAC、字幕重叠、音量和抽帧。`showcase-qa/qa-report.json`、`metadata.json`、`encoded-contact-sheet.jpg` 为本次证据。原概念预览保持为独立文件。
