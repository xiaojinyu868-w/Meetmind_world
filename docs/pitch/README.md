# EchoWorld 相遇世界 Hackathon Pitch

主叙事：以黑客松结束时的一张合照作为群体冷启动入口，让参与者确认身份、互写第一印象，并把这次共同相遇带入持续生长的 3D 关系世界。视觉、音频等外在数据与生理聚合信号等内在数据均按现有能力呈现，不列为未来功能。

产物：

- `EchoWorld_Hackathon_Pitch_20260804.pptx`：11 页主叙事 + 2 页备用页。
- `EchoWorld_Hackathon_Pitch_20260804.pdf`：固定版式预览稿。
- `TALK_TRACK.md`：5 分钟逐页讲稿与评委追问口径。
- `generate_pitch.mjs`：可复现生成脚本。

重新生成前，在临时目录安装依赖：

```bash
mkdir -p /tmp/echoworld-pitch-node
cd /tmp/echoworld-pitch-node
npm init -y
npm install pptxgenjs qrcode
node /root/meetmind_go/docs/pitch/generate_pitch.mjs
```

演示地址：<https://capture.meetmind.online/echoworld/>
