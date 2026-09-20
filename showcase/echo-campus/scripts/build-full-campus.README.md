# 完整园区资产构建

输入为用户 AB/C 原始 ZIP 已核验 SHA-256 的 SketchUp SDK 导出，不是 AI 生成建筑。所有实例在原工程世界坐标展开后统一减去雨棚现有原点 `[102.68817138671875, 0, -21.1610107421875]`，活动锚点不用重定位。

## 复现

Python 3 + NumPy；Node 22 + `@gltf-transform/core`、`@gltf-transform/extensions`、`@gltf-transform/functions` 4.5.0、`draco3dgltf`、`meshoptimizer`。

```powershell
& 'C:/Users/Li Hao/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' output/full-campus/build-full-campus.py --source-dir output/venue-models/ab --output-dir output/full-campus --selection output/full-campus/selection.json
node --max-old-space-size=8192 output/full-campus/build-full-campus-compress.mjs
```

服务器脚本可通过显式参数使用其他源目录，不会自动构建/发布：

```bash
python3 scripts/build-full-campus.py --source-dir /path/to/original-sdk-exports --output-dir /tmp/full-campus --selection scripts/build-full-campus.selection.json
ECHO_GLTF_TOOLS=/root/.npm/_npx/a6797f7ff67bb1f2/node_modules node scripts/build-full-campus-compress.mjs /tmp/full-campus/venue-campus-uncompressed.glb /tmp/full-campus/venue-campus.glb
```

`--output-dir` 需要放置经过审计的 `canopy-entourage.json` 与 `towers-entourage.json`。服务器现有源在 `public/assets/premium/`。源目录还需要 `source-model-catalog.json` 和 5 份原始 SDK GLB；源材质/节点目录不可被预先中心化或简化。

## 选择与验收

- T1–3 塔楼与唯一总图：`venue-ab-towers`，保留道路 `node17625`，旧连廊组件由 UFO 新版连廊替换。
- T6 主楼与雨棚：`venue-ab-canopy`，重复道路 `node1` 和旧连廊 `node2440` 排除；只排除审计过的旧人物/植物以及游离地下参考。
- HUB 中庭与主楼：`venue-ab-hub`，地下工作参考 `node12776` 排除。
- C 完整高塔及商业裙房：`venue-c-commercial-20230518`。混合根组 `node1` 内按明确分离的原始塔楼框保留塔楼与基础，其他 C 根节点全保留。
- 连廊：`venue-ab-ufo-escalator` 的 `node15544`。HUB内部使用HUB版本，相交接头保留。

对源实例几何作1毫米量化双64位三角形指纹去重，不修改保留顶点。每个来源、每种材质保留 `sourceVenue`，材质名称保留原名。颜色按既有源预览由sRGB转线性，玻璃使用蓝灰不透明材质。

压缩只做有误差界的 meshoptimizer 简化与 Draco 编码，不按重要性删除建筑。审计包含每来源构建面数、组件排除与原因、逐来源压缩前后边界、材质集合、高于20米的真实三角面投影10米网格覆盖以及解码回读面数。

文件：`venue-campus.assembly.audit.json`、`venue-campus.compression.audit.json`。独立源对照检查见本地 `output/full-campus-source-audit/assembly-review.json`。这些几何检查不能代替浏览器的全园与拼接处视觉检查。


## 发布前的表面清理

以上流程描述原始组合及历史 Draco 派生版本。当前网页采用在该版本上执行整园表面清理、全空间覆盖复查和无损 Meshopt 压缩后的派生资产。重新组合模型后不能跳过清理直接覆盖线上资产：使用 [surface-stability/README.md](surface-stability/README.md) 中的独立 CLI，要求其扫描与解码读回门禁通过，再做连续运镜验收。若留下数值边界残余，CLI 会失败；必须另存逐对人工复核与明确的例外决定，不能静默绕过或称零残留。该 CLI 仅接受米制、已展开坐标、POSITION/NORMAL 静态模型；UV、蒙皮等资产会明确拒绝，不能直接处理 Marble SPZ。
