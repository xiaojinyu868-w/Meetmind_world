# EchoWorld Three.js 咖啡厅原型

## 本地运行

```powershell
npm install
npm run dev
```

打开 `http://127.0.0.1:5173/`。桌面使用 `W/A/S/D` 移动；触屏设备显示虚拟摇杆。

生产构建：

```powershell
npm run build
```

## 当前体验闭环

```text
标题页
-> 3D Echo Cafe
-> Agent 随机选择普通桌并同桌自主交谈
-> 点选人物查看资料
-> 靠近中央六人圆桌，邀请人物入座并对话
-> 关系 Map
-> 从节点返回咖啡厅定位人物
```

场景包含 1 个玩家和 6 个占位人物。人物头像来自同一 Blender 无脸角色的统一渲染；Three.js 克隆模块化人物 GLB，并按每人的调色板创建独立材质。中央六人桌只接受用户会议邀请，普通 Agent 调度不会占用它。

## 代码边界

- `src/data/demoPeople.js`：人物、关系、资料与占位对话。
- `src/ui/CafeShell.js`：`intro -> cafe -> map` 体验、人物侧栏和圆桌会议 UI。
- `src/ui/RelationshipGraph.js`：7 个关系节点与 12 条关系边。
- `src/runtime/CafeLayout.js`：咖啡厅边界、5 张桌和 18 个 Blender 座位锚点。
- `src/runtime/NpcAgentSystem.js`：普通桌随机分配、入座、同桌对话与会议调度。
- `src/runtime/CharacterSystem.js`：人物 GLB 缓存、克隆、换色与实例生命周期。
- `src/main.js`：Three.js 场景、第三人称相机、移动、碰撞、射线选择和会议编排。
- `public/data/asset-catalog.json`：环境、人物和资料资产白名单。

原始照片、声音、embedding、内部记忆和安全存储地址不得复制到 `public/`。前端只消费授权过滤后的 DTO、`CharacterAsset` 和实时 `AgentEvent`。

完整人物生成与 K3/Agent 数据契约见 [`../docs/README.md`](../docs/README.md)。

## 当前限制

- Agent 对话和桌位调度为本地 mock，尚未连接 SSE/WebSocket 服务。
- 人物共用一套无脸基础几何和发型，仅材质配色独立。
- 人物暂时没有骨骼动画；移动和入座采用刚性模型的轻量表现。
- 咖啡厅使用运行时圆形桌面碰撞，尚未从 Blender 导出完整碰撞壳。
