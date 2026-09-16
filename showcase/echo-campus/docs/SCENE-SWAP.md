# 换场景指南：自建 GLB 与 Marble SPZ

目标是换一座园区，继续使用已有的分身、名片、供需推荐和相遇关系。模型只决定看到的空间；人物站位、活动边界与交互锚点在配置中独立定义。

## 展示材料

- [97 秒展示主片](https://capture.meetmind.online/echo-campus/Echo-Campus-Showcase.mp4)：1920×1080、30 帧，实际 3D 场景画布录屏与真实浏览器界面截图剪辑，配 DashScope 中文旁白和字幕。它包含场景实录与实际界面，不是全程交互录屏。
- [合作展示方案 PDF](https://capture.meetmind.online/echo-campus/Echo-Campus-Partner-Showcase.pdf)：空间方向、活动体验与合作落点。
- [旧版参考预览](https://capture.meetmind.online/echo-campus/Echo-Campus-97s-preview.mp4)：仅作为建筑参考与交互流程示意保留。对外介绍优先使用展示主片和在线 Demo。

## 先用 2 分钟验证风格

1. 打开 <https://capture.meetmind.online/echo-campus/>。
2. 右上「场景」→「白庭校园」或「水上艺廊」。
3. 切换后人物身份、资料、已确认连接仍来自同一个活动；人物按新场景锚点重新布置。
4. 切换底部四个镜头，检查构图和人物尺度。

这两套是程序化场景，可继续直接修改 src/scenes/CampusScene.js 与 SceneKit.js。主界面和活动服务无需重做。

## 同一台电脑演示两位参与者

1. 第一窗口打开普通入口，领取第一位分身。
2. 新窗口打开 <https://capture.meetmind.online/echo-campus/?demoSession=tab>，领取第二位分身。该入口使用单独会话，避免与普通窗口共享身份。
3. 在第二窗口查看推荐，向第一位分身发起相遇；切回第一窗口，在“我的相遇”中确认。
4. 双方应显示已点亮连接。再切换白庭校园与水上艺廊，检查身份与连接保留。

普通入口的新标签页会共享身份，不能当作第二位参与者。实体第二台设备可直接打开普通入口；活动现场的身份核验仍需单独设计。

## 从 Marble 换一座世界

1. 在 Marble 完成生成并按所用模型的可用选项导出 SPZ；准备好允许用于本合作展示的资产。
2. 在 Echo Campus 打开「场景」→「选择模型或 Marble 导出文件」。
3. 选择 .spz。界面自动设为 Gaussian Splat，X 旋转初值为 180°，整体缩放为 1。
4. 点击「应用到当前世界」。只有载入完成后才替换当前场景；失败会保留旧场景。
5. 先看上下方向和尺度。如果地面倒置，调 X；如果朝向不对，调 Y。旋转单位都是度。
6. 调「整体缩放」让分身身高与建筑匹配，再调「位置偏移」把可活动区域放到世界原点附近。
7. 调「地面高度」，并在高级 JSON 中同步出生点和人物锚点的 y。
8. 调活动边界、入口锚点与镜头，保存本机配置或导出 JSON。

X = 180° 只是针对常见导出轴系的初始值，不保证适用于所有 Marble 模型。输入模型实际的尺度与地面信息优先；不要把与画面不符的默认值视为已经校准。

当前本地文件上限为 512 MB。桌面 GPU 是大规模 splat 的首选；手机能否流畅运行取决于模型规模、内存与显卡，需要针对最终文件实机确认。优先从较小资产开始验证方向和尺度。

## 导入自建 GLB / GLTF

1. 建模工具导出一个自包含 GLB，包含网格和内嵌贴图。
2. 默认使用 Y 轴向上；人物活动平面在 y=0 附近，人物尺度约为普通成年人。
3. 在场景面板选择文件；GLB 默认无轴系旋转。
4. 调整体缩放和偏移，把建筑与人物落点对齐。
5. 配置活动范围、出生点与至少入口/会面两个锚点。
6. 检查全景、入口、庭院、俯瞰，以及实际行走路径。

本地 .gltf 必须内嵌纹理与缓冲区。多个贴图/二进制文件组成的外链 GLTF 不会被当作文件夹自动打包；请先导出 GLB。Draco、Meshopt 等压缩扩展若需要外部解码器，当前导入器尚未配置对应解码器，请用普通 GLB 先验证。

使用「模型链接」时，先移除已选本地文件，填写 HTTP(S) 链接或相对路径。模型服务器需允许当前站点跨域读取。远程模型由浏览器直接读取该地址，不经过本活动服务器代理。

## 一份可直接调整的配置

以下示例展示完整可选字段。可以粘贴到「高级配置」中，再点击「将 JSON 同步到调节器」。选择本地文件时 url 可留空。

~~~json
{
  "schema": "echo-campus.scene.v1",
  "name": "我的白色园区",
  "type": "glb",
  "url": "",
  "scale": 1,
  "position": [0, 0, 0],
  "rotation": [0, 0, 0],
  "groundY": 0,
  "bounds": {
    "minX": -25,
    "maxX": 25,
    "minZ": -25,
    "maxZ": 25
  },
  "spawn": { "x": 0, "y": 0, "z": 8 },
  "anchors": {
    "arrival": { "x": 0, "y": 0, "z": 8 },
    "meeting": { "x": 4, "y": 0, "z": 6 },
    "people": [
      { "x": -3, "y": 0, "z": 4, "yaw": 0 },
      { "x": 3, "y": 0, "z": 4, "yaw": 3.14 },
      { "x": 0, "y": 0, "z": 0, "yaw": 1.57 }
    ]
  },
  "cameras": {
    "hero": {
      "position": [30, 20, 36],
      "target": [0, 3, 0],
      "fov": 45
    },
    "arrival": {
      "position": [6, 4, 15],
      "target": [0, 1.4, 8],
      "fov": 45
    },
    "garden": {
      "position": [13, 5, 15],
      "target": [4, 1, 6],
      "fov": 45
    },
    "aerial": {
      "position": [25, 40, 30],
      "target": [0, 0, 0],
      "fov": 50
    }
  },
  "colliders": [
    { "x": -12, "z": -8, "r": 3 },
    { "x": 12, "z": -8, "r": 3 }
  ]
}
~~~

| 字段 | 实际作用 |
| --- | --- |
| type | glb 为网格，splat 为 Gaussian Splat，程序化场景从内置卡片选择 |
| scale / position / rotation | 仅变换模型的视觉层；rotation 为角度 |
| groundY | 自动生成的人物锚点高度；不是从模型推算的真实地面 |
| bounds | 世界坐标中的 x/z 活动边界 |
| spawn | 当前领取分身的出生点；必须在边界内且不能位于碰撞壳 |
| anchors.arrival | 入口落点与默认入口镜头参考点 |
| anchors.meeting | 会面区参考点与默认庭院镜头参考点 |
| anchors.people | 可选的人物站位数组，含可选 yaw；yaw 使用弧度 |
| cameras | 可局部覆盖；hero/arrival/garden/aerial 对应界面的全景/入口/庭院/俯瞰 |
| colliders | 世界坐标圆形阻挡 {x,z,r}；不随视觉模型变换自动改变 |

如只填写部分镜头，未填写的标准镜头会由场景范围生成。自定义人物站位太少会导致多个人物复用位置；正式展示请为预期人数提供足够的不同锚点，或省略 people 使用默认分布。

## 正确的调整顺序

1. **方向**：先旋转，保证地面朝上、建筑没有倒置。
2. **尺度**：通过人物与门高比较，确定 scale。
3. **落点**：调模型偏移，使入口与地面靠近目标位置。
4. **活动层**：设置 groundY、spawn、anchors、bounds 和 colliders。视觉模型移动后，这些坐标不会跟着变动。
5. **镜头**：选择四个镜头，分别保证远景构图、入口人物尺度、庭院关系和整体鸟瞰。
6. **双端**：在另一台设备打开同一个活动，确认仍能看到身份与关系。当前自定义本地模型不会自动传给另一台设备。

本项目不声称从 SPZ 自动恢复可行走网格、楼梯碰撞或穿墙限制。若模型需要多层地面、坡道或楼梯，需要另接地形/碰撞适配器；此次通用导入采用单平面与圆形阻挡。

## 保存、导出与复现

- 「保存本机配置」把 JSON 存入当前浏览器，不保存本地文件内容。
- 「导出 JSON」下载配置；请把模型文件和 JSON 放在同一个交付资料夹。
- 刷新后重新选择本地模型，再恢复 JSON；若使用可访问的远程模型 URL，则无需重新选择文件。
- 本地换场景只影响当前浏览器；若要让所有参会者打开同一自定义场景，将模型托管后使用 sceneManifest 链接或默认 scene-startup.json，不会自动把个人本地文件广播给其他人。
- 发生导入错误时，原场景保持可用；修改参数后可重试。

## 常见问题

**模型看不到**  
先切俯瞰检查尺度与偏移，再检查方向、模型 URL 权限和文件格式。模型的可见范围可能与活动 bounds 不一致；bounds 控制行走，不会裁切模型。

**人物飘着或埋在地面里**  
模型位置和地面坐标未对齐。调模型 y 偏移，或调 groundY 并同步 spawn.y 与 anchors 中的 y。

**人站进墙里**  
调整人物锚点与出生点。为建筑阻挡添加圆形 colliders；视觉网格不会自动成为碰撞体。

**同伴看不到我导入的新建筑**  
本地模型只在当前浏览器读取。多端共用建筑需托管资产并使用本指南的共享启动配置；人物身份与关系同步是独立链路。

**手机加载很慢或画面发白**  
减小模型、贴图与 splat 规模；先用桌面确认文件有效，再对最终手机做内存与性能验收。浏览器实际表现尚需最终资产实测。

## 验证边界

生产构建通过，50 项 Node / DOM 测试全部通过，覆盖配置验证、HTTP/WS 双会话与身份同步、请求确认、浏览器 fetch 调用、导入失败清理与资源释放。真实浏览器已验证 1440×900 桌面与 492×898 移动视口的 WebGL 画面、四个镜头、两套内置场景切换、领取分身、名片、推荐与发起请求，以及 GLB 和自造 SPZ 通过共享启动配置加载。真实浏览器的两个独立会话已完成推荐、请求与双向确认：周澈发起相遇，林予看到待确认请求并确认，双方均显示“已点亮的连接 1”。校园切换为艺廊后，身份与已确认连接保留。本轮验收时公共世界为 17 位人物、8 条连接，其中 15 位人物与 7 条连接为内置示例，另有两个实际领取的演示身份与 1 条已确认连接；这些人数会随新参与者变化。实体手机、NFC 标签与真实 Marble 导出文件未验收；请将上述六步走查作为每次替换后的实际验收。

## 多人共用新场景：已接入启动配置

现在可以用一个链接让所有设备载入同一模型。把模型与配置放进 public/scenes/ 后构建，例如：

~~~text
public/scenes/my-campus.glb
public/scenes/my-campus.json
~~~

my-campus.json 中 url 写 ./my-campus.glb；它相对 JSON 所在位置解析。分享：

~~~text
https://capture.meetmind.online/echo-campus/?sceneManifest=./scenes/my-campus.json
~~~

模型和 JSON 也可以托管在允许跨域读取的 HTTPS 地址上。sceneManifest 本身只接受 HTTP(S)，不携带身份凭据。若用于大屏，可继续追加 &mode=stage。

要作为活动默认场景，编辑 public/scene-startup.json：

~~~json
{
  "enabled": true,
  "manifest": {
    "schema": "echo-campus.scene.v1",
    "name": "活动的新园区",
    "type": "glb",
    "url": "./scenes/my-campus.glb",
    "scale": 1,
    "position": [0, 0, 0],
    "rotation": [0, 0, 0],
    "groundY": 0,
    "bounds": { "minX": -25, "maxX": 25, "minZ": -25, "maxZ": 25 },
    "spawn": { "x": 0, "y": 0, "z": 8 }
  }
}
~~~

此时 url 相对 scene-startup.json 所在的活动根目录解析。修改后 npm run build，再刷新各设备。默认配置 enabled:false 时继续使用内置场景。

优先级：显式 sceneManifest → 显式 ?scene=某个注册ID → 默认 scene-startup.json。显式 ?scene=gallery 可临时回到水上艺廊；加载失败会提示并回到白庭。人物与关系继续使用同一活动服务。

## 附带的可复现测试文件

以下全部由 scripts/generate-import-fixtures.mjs 程序生成，不含私人资产：

| 文件 | 用途 |
| --- | --- |
| public/scenes/import-test.glb | 10 米白展厅，自包含网格与材质 |
| public/scenes/import-test.ply | 5,875 个自造高斯，SH degree 0 |
| public/scenes/import-test.spz | 同一组高斯的 gzip SPZ v2 编码 |
| 各自的 .json | 对应模型、人物锚点、四个镜头与碰撞圆 |

测试文件为 Y 向上，rotation 使用 [0,0,0]。它们并非 Marble 导出，不能用其表现宣称真实 Marble 资产已验收。GLB 已由真实 GLTFLoader 在 Node 解析，SPZ 已验证头、块长度与坐标；GLB 和 SPZ 均已通过 sceneManifest 在真实浏览器中成功加载并显示。PLY 样本仍需单独验收。

可以直接打开：
- ?sceneManifest=./scenes/import-test.glb.json
- ?sceneManifest=./scenes/import-test.spz.json
- ?sceneManifest=./scenes/import-test.ply.json

若把这些 JSON 手动粘贴进场景面板，模型链接改成 ./scenes/import-test.glb（面板链接相对页面，而启动配置链接相对 JSON）。
