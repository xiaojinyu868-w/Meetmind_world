# 照片到角色：两套生产链路

## 目标与边界

本实验只验证“照片证据如何稳定变成可运行角色”，不做真实身份确认。三张输入均为多人合照；当前用站立六人照从左到右定义 `person_01..06` 六个匿名视觉槽位，并映射到六名演示 NPC。玩家使用独立的中性 `host` 设计。

原始照片不会进入 `public/`、GLB 或浏览器网络请求。前端只加载结构化特征、派生贴图和模型。

## 运行时布局

场景和当前启用的人物方案：

```text
?scene=v1|v3
?character=voxel
```

- 默认场景：`v3`。
- 默认人物：`voxel`。
- 切换场景会保留人物参数并刷新页面。
- 单个人物资产失败时回退到原 V3 无脸人物，不阻塞整个咖啡厅。
- `storybook` 资产作为设计归档保留，不再进入前端选择器；旧参数会规范为 `voxel`。

## 方案 2：特征驱动绘本 Low-poly

```text
多人照片
-> 人物框与匿名槽位
-> CharacterSpec
-> 头型/发型/眼镜/身形/服装模块选择
-> 绘本 atlas
-> Blender 固定规则装配
-> GLB
```

几何负责远距离辨识，贴图负责近距离气质。每个角色保持独立的发型轮廓、眼镜、身高比例和服装色块；脸部只使用共享风格的极简眉眼、鼻影和嘴线，不追求写实生物特征。

绘本贴图使用有限色板、轻微纸张颗粒和手绘边缘。可见服装图案会被概括为无文字色块，不复刻品牌、证件或活动 Logo。

## 方案 3：固定身体与 MC 像素皮肤

```text
多人照片
-> CharacterSpec
-> AI 像素皮肤描述
-> 固定 UV atlas 绘制器
-> Blender regular/tall 身体模板
-> GLB
```

几何仅保留少量模板，人物差异主要来自像素皮肤。头部立方体明确使用五个可见面：

```text
front | right | back | left | top
```

正面承担刘海、眼镜和极简表情；左右面保持鬓角与镜腿连续；背面表现后脑发型；顶面表现发旋和发色变化。底面使用共享肤色，不要求 AI 绘制。

躯干、手臂和腿同样使用固定 UV 区域。贴图禁止抗锯齿和连续渐变，Three.js 使用 `NearestFilter`，确保相机缩放时仍保持清晰像素格。

## 匿名槽位映射

| 照片槽位 | 演示角色 ID | 主要视觉线索 |
| --- | --- | --- |
| `person_01` | `lin-che` | 后束中分发、梅紫外套、蓝灰长裤 |
| `person_02` | `zhou-ning` | 短卷发、圆框眼镜、米红拼色上衣 |
| `person_03` | `chen-mo` | 层次长刘海、细框眼镜、灰色宽松套装 |
| `person_04` | `xu-an` | 高瘦、矩形眼镜、黑色短袖和短裤 |
| `person_05` | `su-he` | 中分长发、浅色外套、暖灰长裤 |
| `person_06` | `tang-ke` | 后束中分发、矩形眼镜、黑上衣和灰蓝长裤 |

映射只服务于演示数据，不声明照片人物的姓名或真实身份。

## 生产接口

正式服务中，视觉模型不应直接写任意 Blender Python。建议输出受校验的 `CharacterSpec` 和 atlas PNG；Blender Worker 只执行版本化生成器：

```text
CharacterSpec + texture.png + template_version
-> validate input
-> build asset
-> render preview
-> validate bounds/UV/texture/triangle budget
-> publish GLB + manifest
```

每项不可见或低置信度特征必须标记为设计补全。用户确认三视图或角色预览后，才可将资产发布到关系世界。

## 当前实现与重建

当前原型严格拆成两步：AI/视觉算法读取 `scenes/photoes` 中的授权照片并写出 `scenes/data/character_specs.json`；Blender 生成器只读取这个脱敏规格，不直接读取或打包原始照片。

在仓库根目录执行：

```powershell
blender --background --factory-startup --python .\blender\build_photo_character_modes.py
blender --background --factory-startup --python .\blender\validate_photo_character_modes.py
```

服务器任务应显式传入本次任务的规格文件，避免依赖机器目录结构：

```powershell
blender --background --factory-startup --python .\blender\build_photo_character_modes.py -- --spec D:\jobs\<job-id>\character_specs.json
```

生成结果：

- `public/models/characters/photo-derived/`：14 个运行时 GLB。
- `public/textures/characters/storybook/`：7 张 256×256 绘本 atlas。
- `public/textures/characters/voxel/`：7 张 128×128 像素 atlas。
- `exports/photo_character_modes_manifest.json`：资产 ID、尺寸、三角面、哈希和隐私策略。
- `exports/photo_character_modes_validation.json`：模型、UV、贴图、预览与隐私验证结果。
- `renders/photo_characters_*_lineup.png`：两套角色的 Blender 阵容预览。

## 验收标准

- 六个 NPC 在中远距离可通过轮廓、眼镜和穿搭互相区分。
- 绘本角色和像素角色使用同一个人物槽位映射。
- 像素头部五面均有有效 UV，且侧面与正面发型连续。
- 模型脚底位于 `z=0` 的导出地面，面向本地 `-Y`，高度与现有座位系统兼容。
- 所有角色可被点选、移动、压缩入座并加入圆桌会议。
- GLB 和贴图中不包含输入照片、姓名、证件或可读品牌文字。
