# Echo Campus · 白庭

把活动现场的一次相遇，带进一座可以共同浏览的数字园区。

**在线演示：<https://capture.meetmind.online/echo-campus/>**  
**大屏模式：<https://capture.meetmind.online/echo-campus/?mode=stage>**

项目独立于 EchoWorld 线上业务。两套程序化场景为「白庭校园」「水上艺廊」；活动服务支持演示分身领取、公开供需名片、匹配理由、双方确认相遇与跨设备同步。

## 明早最快的体验方式

1. 在电脑打开在线演示。拖动环看、滚轮缩放；底部切换全景、入口、庭院、俯瞰。
2. 点击右上「导览」自动环绕，或「演示」播放约 90 秒的产品导览。
3. 点击「领取我的分身」，填写昵称、角色、供给和需求，勾选公开展示同意，再进入园区。
4. 点选人物看名片；在「我的分身」中点击「发现值得认识的人」，展开每条推荐查看双方的供需依据。
5. 需要演示真实连接时，按下一节用两台设备互相确认。
6. 想换场景，点击「场景」；明天从 Marble 导出的 SPZ 和自建 GLB 都从同一个入口导入。详见 [场景替换指南](docs/SCENE-SWAP.md)。

环境声默认关闭，点击右上「声音」后播放轻量入场与连接提示音。桌面领取分身后，可用 WASD 或方向键在当前设备移动；移动位置目前不是跨设备共享数据。手机支持拖动镜头、点选与表单操作，没有虚拟行走摇杆。

## 手机扫码 + 大屏的双端演示

1. 电脑打开 [大屏模式](https://capture.meetmind.online/echo-campus/?mode=stage)，右下显示通用领取二维码。
2. 第一部手机扫码，填写并同意展示演示资料。大屏应出现新增分身。
3. 第二部手机扫码领取另一个分身，使用不同昵称便于辨认。
4. 在任一手机点选对方 →「发起一次相遇」。
5. 对方打开右下「我的相遇」图标 →「确认相遇」。
6. 两端名片显示已确认；大屏公共世界出现双方确认的关系。

界面的「NFC / 双端体验」面板提供第一设备、第二设备和大屏入口。第一设备默认林予，第二设备默认周澈，供需互补。公开入口可反复供新浏览器领取演示身份；已有本机会话会继续使用本人身份。底层仍保留带卡号和激活凭据的受控领取接口，供后续活动凭据联调。

**普通标签页共享身份。** 真实双端体验仍可用两部手机。只有一台电脑时，在「NFC / 双端体验」面板点击「同机演示：独立访客窗口」：新窗口使用 `?entry=nfc&persona=02&demoSession=tab`，身份保存在该窗口的 sessionStorage，与普通窗口的 localStorage 身份分开。该访客窗口可刷新并继续同一身份；关闭后需重新领取。入口以 `rel="noopener"` 打开，避免复制来源窗口的会话。二维码和普通设备入口保持原有跨设备流程。

NFC 在本项目中的入口形式是普通 HTTPS 链接。可将通用入口写入标签：
<https://capture.meetmind.online/echo-campus/?entry=nfc>

通用入口目前允许创建演示身份，不证明持卡人身份。真实活动的卡片发放、私密激活凭据、手机 NFC 行为及现场网络需要活动前联调。项目没有宣称已经用实体 NFC 卡实测。

## 本地运行

需要 Node.js 22.12+（本次实现使用 22.22）及 npm。进入本项目根目录：

~~~bash
npm ci
npm test
npm run build
npm start
~~~

打开 <http://127.0.0.1:5189/>。同一服务提供页面、HTTP API 与 WebSocket。

Windows PowerShell 局域网体验示例：

~~~powershell
$env:HOST = "0.0.0.0"
$env:PORT = "5189"
$env:ECHO_ALLOWED_ORIGINS = "http://192.168.1.100:5189"
npm start
~~~

将上例 IP 换成电脑实际局域网 IP；手机和电脑加入同一网络，访问该地址。按需要允许系统防火墙通过 5189 端口。正式演示优先使用已部署的 HTTPS 地址，避免访客 Wi-Fi 隔离与手机 HTTP 限制。

开发模式使用两个终端：

~~~bash
# 终端 1：macOS/Linux
ECHO_ALLOWED_ORIGINS=http://127.0.0.1:5190,http://localhost:5190 npm start

# 终端 2
npm run dev
~~~

Windows 的终端 1 先运行：
~~~powershell
$env:ECHO_ALLOWED_ORIGINS = "http://127.0.0.1:5190,http://localhost:5190"
npm start
~~~

开发页面是 <http://127.0.0.1:5190/>；Vite 把 /api 与 WebSocket 转发到 5189。

## 独立部署与更新

当前在线入口：

| 项目 | 当前值 |
| --- | --- |
| 页面 | https://capture.meetmind.online/echo-campus/ |
| 服务 | echo-campus-showcase.service |
| 监听 | 127.0.0.1:5191 |
| 检出 | /root/meetmind_wt_main/showcase/echo-campus |
| 独立演示数据 | /var/lib/echo-campus/event.json |
| Origin | https://capture.meetmind.online |
| 健康接口 | /echo-campus/api/health |

当前服务已与原 EchoWorld 的 8000 后端和生产数据目录隔离。不要把演示数据写入线上 backend/data/，也不要用本项目覆盖 /var/www/echoworld。

部署到新域名或路径时需满足：

- Node.js 22.12+，先 npm ci、npm test、npm run build。
- 静态页面与 API 使用同一个站点路径；子路径反代应将前缀去掉后交给服务。
- WebSocket /api/live 开启 HTTP/1.1 Upgrade 转发，连接超时长于 25 秒心跳周期。
- ECHO_ALLOWED_ORIGINS 填完整 Origin，只有协议、域名及端口，不含路径。
- ECHO_EVENT_DATA 指向单独、可写、未公开的演示数据文件。
- 反向代理请求会合用代理 IP 的限流额度；当前是小规模合作展示服务，正式大活动需容量及限流策略联调。

常用只读检查：

~~~bash
systemctl status echo-campus-showcase
journalctl -u echo-campus-showcase -n 50 --no-pager
curl https://capture.meetmind.online/echo-campus/api/health
~~~

更新源码后在此独立项目构建；如后端代码改变再重启 echo-campus-showcase。保留独立数据文件可保留已有身份与连接。数据文件里仅保存会话 token 的 hash；明文 token 仅在领取设备本地保存。不要手动编辑数据文件来替参与者确认相遇。

## 演示内容和边界

| 能力 | 当前实现 |
| --- | --- |
| 园区场景 | 原生 Three.js 程序化白色建筑、水庭、景观、人物与预设镜头 |
| 场景替换 | GLB/GLTF 或 SPZ/PLY/SPLAT；本地模型、链接、变换、边界、锚点、配置导出 |
| 分身 | 用户选择服装色的风格化分身；不是照片重建或真人克隆 |
| 公开名片 | 用户明确同意展示昵称、角色、供给与需求 |
| 推荐 | 确定性供需标签匹配，最多 3 人；展示可核对的输入证据，未调用 LLM |
| 相遇 | 发起后由另一方确认；待确认仅双方可见，确认后进入公共世界 |
| 同步 | 新增身份与确认关系支持 HTTP + WebSocket，同版本去重，断线恢复 |
| NFC | 提供可写入标签的 HTTPS 入场链接；硬件与真实身份发放待现场联调 |
| 内置人物 | 15 位虚构人物和 7 条演示连接；内置人物不能替真人自动确认 |
| 场景地面 | 使用作者配置的平面、边界及圆形碰撞壳，不从 splat 自动推导真实碰撞 |
| 本地文件 | 浏览器读取，不上传活动服务；本地文件刷新后需重新选择 |
| 浏览器会话 | 7 天有效；过期后清理本机 token；底层受控卡领取需回到原设备；公开演示入口可供新会话重复体验 |

## 验证记录

2026-09-16 文档编写时，Node 测试 **43/43 通过**，其中 12 项通过 Happy DOM 加真实 HTTP/WebSocket 服务验证表单、推荐与双向相遇，覆盖迟到响应和重复提交；其余覆盖身份授权、抢占拒绝、双向确认、幂等、公共 DTO、WebSocket 重连、持久化、断网与失效 token、导入前配置验证、GLB/SPZ 失败清理等。

部署地址的页面与健康 API 已实际返回 HTTP 200；初始演示快照为 15 位人物、7 条连接。

**浏览器桌面/手机视觉、真实 GLB/SPZ 画面、实体 NFC 实机和现场网络尚待独立验收。** Node 通过不代表这些验收已经完成。最终交付的视觉检查、录屏和视频记录以新增验收材料为准，不以本段自动推定。

## 文档与源码

- [合作演示介绍](docs/PARTNER-DEMO.md)
- [场景替换与 Marble 使用](docs/SCENE-SWAP.md)
- [活动接口与安全边界](server/README.md)
- src/scenes/：程序化建筑与人物
- src/runtime/：活动客户端、场景配置及导入
- src/ui/：界面与交互面板
- server/：独立活动服务
- tests/：Node 内置测试

交付视频与合作材料由本次项目交付目录统一提供。录制素材若采用离线建筑渲染，应明确标注，不能代替实时浏览器运行证明。

## 手搓第三个程序化场景

新增 src/scenes/MyScene.js，导出 factory。返回值须提供 root、bounds、spawn、anchors.people、四个标准 cameras，以及 update/dispose。可以从当前 CampusScene.js 的返回结构开始。

然后只在 src/runtime/SceneRegistry.js 增加导入与一条登记：

~~~js
import { createMyScene } from "../scenes/MyScene.js";

registerScene({
  id: "my-scene",
  displayName: "我的新园区",
  helper: "白色建筑 · 独立活动空间",
  factory: createMyScene,
});
~~~

场景选择卡由注册表生成，无需再改 UI。main 按同一个注册表调用 factory；可用 ?scene=my-scene 直接选择。相同 id 再次登记会报错，避免误覆盖已有场景。

## 把新模型分享给合作方

模型与 JSON 可托管在 public/scenes/，构建后通过带 sceneManifest 的链接启动：

<https://capture.meetmind.online/echo-campus/?sceneManifest=./scenes/import-test.glb.json>

这是内置的 10 米白展厅测试资产，不是最终视觉样片。也提供同名 .ply.json 与 .spz.json；这些高斯来自自造几何，不是 Marble 生成结果。文件与结构测试通过不等于浏览器画面验收。

manifest.url 相对 **JSON 文件地址** 解析。示例 JSON 在 scenes/ 中，url 应填 ./import-test.glb，而不是重复写 ./scenes/。

要让活动默认进入新模型，可编辑 public/scene-startup.json，设置 enabled:true 与 manifest。具体结构和优先级见 [场景替换指南](docs/SCENE-SWAP.md)。重新构建后，各设备打开同一个活动入口即可使用统一场景。
