# Echo Campus 交付包

先打开 `showcase.html`：内含97秒真实产品展示片、合作方案与使用指南。视频、封面及文档可离线观看；交互原型需联网。

- 在线合作展示页：https://capture.meetmind.online/echo-campus/showcase.html
- 互动 Demo：https://capture.meetmind.online/echo-campus/
- 大屏模式：https://capture.meetmind.online/echo-campus/?mode=stage
- 展示主片：`Echo-Campus-Showcase.mp4`（97秒，1920×1080，30fps）
- 中文字幕：`Echo-Campus-Showcase.zh-CN.srt`
- 合作方案：`Echo-Campus-Partner-Showcase.pdf`
- 可编辑使用指南：`Echo-Campus-Guide.docx`
- 场景字段与示例：`SCENE-SWAP.md`（与 `partner/SCENE-SWAP.md` 同内容）

## 三分钟演示

1. 打开互动 Demo，先展示白庭校园全景，再切换入口、庭院和俯瞰。
2. 领取分身并明确同意公开昵称、身份、供给与需求。可使用虚构资料。
3. 一台电脑演示时，在「NFC / 双端体验」打开「同机演示：独立访客窗口」，领取第二个身份。该窗口使用独立 sessionStorage；普通标签页仍共享原身份。也可用两部手机从普通入口加入。
4. 查看供需推荐，发起相遇，在接收方「我的相遇」确认。双方确认后才形成公共连接。
5. 切换水上艺廊，验证身份和已确认关系保留。

## 明天换场景

1. 右上「场景」选择自包含 GLB 或 Marble 导出的 SPZ；本地读取不会上传活动服务。
2. 先调旋转、再调缩放和位置。SPZ 的 X=180° 是常用轴系参考，不是所有文件的通用答案。
3. 用人物身高校准尺度，然后配置 groundY、bounds、spawn、anchors、cameras、colliders；视觉模型变换与活动坐标分别设置。
4. 应用后检查四个镜头、人物站位与地面。失败时应保留旧场景。
5. 导出 JSON 并保存模型。本地导入只改变本机；若要手机与大屏共用，把模型和 JSON 放到公共可读取地址，再分享 `?sceneManifest=./scenes/my-campus.json`。

程序化第三场景可在 `src/scenes/` 实现并在 `SceneRegistry.js` 登记。详细契约见 `SCENE-SWAP.md`。应用源码在 GitHub 分支 `codex/echo-campus-showcase-20260916`：https://github.com/xiaojinyu868-w/Meetmind_world/tree/codex/echo-campus-showcase-20260916/showcase/echo-campus 。此媒体包不包含应用源码、依赖和服务端数据。

## 视频素材与验证边界

主片的建筑段落来自 `browser-qa/` 两份真实浏览器 Canvas WebM，交互段落来自真实界面截图，经裁切和编辑排版。画面分别标注「浏览器实时3D录制」与「真实交互界面截图」，不是全程交互录屏。配音为获授权 DashScope 预设音色 Ethan / 晨煦；使用同一份已整理响度、ASR核验的母带，未克隆真人声音。

主片对应双身份操作为同机独立会话连接真实服务，不应称为两部实体手机实测。实体NFC标签、最终手机兼容、现场网络与真实Marble导出文件仍需联调。分身是风格化程序化人物；推荐是公开供需词条匹配；Splat导入采用配置的平面和圆形碰撞壳，不自动恢复精确地形。

合作方案中的建筑参考图有明确离线参考说明，互动场景效果以当前Demo与主片实录为准。`video/showcase-qa/` 提供最终成片完整解码、音量、字幕、源文件哈希和抽帧总览；`browser-qa/` 保留关键浏览器验证截图与原始录制。

## 本地复现视频与文档

推荐 Windows 10/11、Python 3.11+。字体使用系统微软雅黑（msyh.ttc/msyhbd.ttc）、Segoe UI 与 Arial。脚本读取本包相对目录。安装所需 Python 包：

```powershell
python -m pip install Pillow numpy reportlab python-docx
```

从 FFmpeg 官方发行渠道安装 FFmpeg，加入 PATH；或明确设置可执行文件路径（本包不含二进制）：

```powershell
$env:FFMPEG = "C:\tools\ffmpeg\bin\ffmpeg.exe"
python .\video\build_showcase.py
python .\video\verify_showcase.py
python .\partner\build_proposal.py
python .\partner\build_handoff.py
```

视频脚本输出根目录 `Echo-Campus-Showcase.mp4` 和字幕，并重建 `video/showcase-qa/`。文档生成器输出 `partner/Echo-Campus-合作展示方案.pdf` 与 `partner/Echo-Campus-使用与换场景指南.docx`；根目录英文文件名是交付副本。文档生成器依赖 `partner/assets/campus.png` 与 `gallery.png`，已包含。

`build_showcase.py` 从 `build_preview.py` 复用字体与排版函数，因此两者都需保留。`build_preview.py` 是历史概念预览制作源，不是当前主片入口；单独重建旧预览还需旧项目的参考素材与路径，不应把它当作本包的一键重建命令。`voice/narration-timeline.json` 留存原配音时间与来源记录；主片重建只需要包内 mastered.wav 与 aligned-subtitles.json，不需要API密钥。

首次重建会覆盖同名输出，建议先复制交付包。配音调用凭据、活动私密数据、调试传输文件和部署脚本均不在本包内。

## 本次更新：A/B/C 真实场地候选

互动 Demo 的「场景」面板新增 A / B / C 外景方向预览，详情和验证边界见 A-B-C-SITE-CANDIDATES.md。线上入口：https://capture.meetmind.online/echo-campus/。
