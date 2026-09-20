# 静态建筑 GLB 共面清理工具

离线处理建筑模型中的重复面与局部共面覆盖，保留未被覆盖的轮廓，输出几何审计和无损 Meshopt 交付文件。工具不连接服务器、不部署、不覆盖输入或已有输出目录。

## 适用范围与拒绝规则

本版本只支持**以米为单位、变换已烘焙、无贴图的静态建筑模型**。每个 primitive 必须为 indexed TRIANGLES，且只有 float32 `POSITION`、`NORMAL` 两个属性，有显式材质；节点不得含 matrix/TRS。可输入普通 GLB，或仅使用 Draco/Meshopt 压缩的自包含 GLB，工具先解码再检查。

以下资产会明确报错，不会静默丢数据：UV/TEXCOORD、顶点颜色、切线、蒙皮/骨骼、JOINTS/WEIGHTS、动画、morph targets、图片/纹理、相机、未支持扩展、外置 buffer、非有限坐标。不要把人物、贴图建筑或未来新资产直接交给本工具。先由对应资产管线导出符合范围的独立静态副本；源文件必须保留。`--units metres` 是调用方对单位的明确声明，脚本不会猜测或换算毫米/厘米。

## 安装

需要 Python 3.11+、Node.js 20+。在本目录执行：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci --ignore-scripts
```

Linux/macOS 的 Python 路径为 `.venv/bin/python`。Python 依赖为 NumPy、Shapely 2.1+（需要 constrained Delaunay）、Rtree；Node 依赖及其准确版本由 `package-lock.json` 固定。不要复制本机 `node_modules` 或虚拟环境到其他系统，应在目标环境重新安装。

## 执行

输入文件和输出目录建议都使用绝对路径，含空格时保留引号。输出目录必须为空或不存在。

```powershell
.\.venv\Scripts\python.exe run-pipeline.py `
  --input "C:\Models\venue.glb" `
  --output "C:\Models\audit-20260920" `
  --units metres --jobs 2 --iterations 5
```

只扫描，不生成清理交付：

```powershell
.\.venv\Scripts\python.exe run-pipeline.py `
  --input "C:\Models\venue.glb" `
  --output "C:\Models\scan-20260920" `
  --units metres --scan-only --jobs 2
```

如果 Node 不在 PATH，传 `--node "C:\完整路径\node.exe"`。运行工作区会复制 worker，并把 Node 依赖解析为发布目录中的绝对位置，因此执行期间不要移动或删除本发布目录。

## 判断标准

- 默认对称顶点到平面距离不超过 **3 mm**（`--distance .003`）。两面的无向法线点积至少 `.99995`。
- 独立扫描只报告主轴投影重叠面积 **大于 1 cm²**（`--min-area .0001`）的面配对；面积小于阈值的面不进入本扫描的空间索引。零报告不代表数学意义上不存在任意微小重叠。
- 首轮以平面桶提议候选，每次扣除仍须通过法线与对称平面检查。只扣除已保留面的实际覆盖，剩余多边形重新三角化，法线以重心坐标插值；不会用全局材质隐藏、抬高建筑或删整块楼体代替清理。
- 首轮之后使用**独立的三维 R-tree 全空间扫描**，不沿用平面桶。分区覆盖完整有效三角形索引范围，配对只计一次；合并检查输入 SHA、连续范围及重复配对。
- 若仍有残留，按残留连通分量再清理，随后重新全扫描。数值不稳定或投影不适合的面保留，并记录跳过原因。默认最多再迭代 5 轮；不能收敛就非零退出，不能把最后一个候选称为已通过。
- 清理审计同时记录投影覆盖恒等检查及 float32 重三角化误差；这些误差容限不是 0，也不能替代实景检查。

入口只允许将距离/面积阈值收紧，禁止超过当前审查过的 3 mm / 1 cm² 范围。阈值变小会提高计算量，也可能要求更多迭代。平行薄层在 3 mm 内可能被视为冗余覆盖；如果它们有独立工程意义，应先划分资产或修改适用规则，不能无条件接受结果。

## 输出与验收

`release-summary.json` 是入口报告，记录原始/解码/候选 SHA、每轮扫描、阈值、`acceptedWithinAuditScope` 与 `deploymentPerformed:false`。非零退出时检查各阶段 `.log`；候选与审计保留以供诊断，绝不覆盖旧运行。

只有扫描残留为 0、读回质量门禁通过且未启用 `--scan-only` 时，才生成：

- `venue-campus-clean.glb`：Meshopt 扩展交付模型；加载器需要 `EXT_meshopt_compression` 支持。
- `venue-campus-clean.glb.gz`：HTTP 静态压缩副本。
- `venue-campus-clean-decoded.glb`：解码核验副本。
- `venue-campus-clean.audit.json`：位置、法线、面方向/顺序的读回一致性；优化前后用有向 position-normal 三角形多重集检查。
- 各轮 `.audit.json`、`.sanitize.json`、`.spatial-residual.json`、`.residual-pairs.npz`、`.readback.json`：覆盖、法线、范围、残留配对和来源变化证据。

压缩是无新增量化的字节编码；重三角化本身已经改变重复面的拓扑，所以“无损”只指**清理后的候选到压缩交付**。来源范围和材质变化会列在读回报告中，部分完全覆盖的材质可能消失；不能仅凭索引合法就认定工程语义保留。发布前人工检查这些变化，并在浏览器里检查正反面、屋顶、连桥、近远镜头和移动过程。`acceptedWithinAuditScope` 不是“全模型绝无闪烁”或“视觉已验收”的声明。

真实项目也可能留下经人工复核的极窄边界残留。例如，重三角化后的 float32 边界会形成微米宽的共面细条；继续强行扣除可能伤及独占表面。本工具**不会自动豁免这些配对，也没有默认放行开关**，仍按非零残留退出。若项目负责人决定接受例外，应在工具之外另存候选 SHA、逐对位置/材质/法线/面积/宽度、数值成因、保留理由及移动镜头证据，并明确标注“有已复核例外”，不得把它写成零残留或 `acceptedWithinAuditScope: true`。本工具包不随附任何特定园区模型的人工验收结论。

每个 scan worker 都加载模型并建立索引。百万级面数会占用大量内存；`--jobs` 增大时内存也近似按 worker 增长，默认 2 不代表所有机器都合适。运行时不要加载来历不明的 `.pkl` checkpoint；pickle 只可用于自己当前运行生成的检查点。

## 回归验证

```powershell
.\.venv\Scripts\python.exe test-release.py
```

测试会创建独立 `verification/suite-*`，覆盖斜面局部重叠、独立薄层保留、完整压缩读回、扫描有残留拒绝交付、空有效扫描范围，以及 UV/蒙皮/morph/未知扩展拒绝。所有 fixture 输入在运行前后核对 SHA，输出 `verification-summary.json`。这些小样例验证工具接口与算法基本约束，不代表任何未来场地自动通过视觉验收。
