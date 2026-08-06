# Marble 可行走世界说明

## 结论

Marble 生成结果可以做成可行走的 3D 世界，但需要把“可见世界”和“行走世界”分开理解：

- `world_100k.spz / world_500k.spz` 是高斯泼溅的可见层，不是碰撞网格。
- `collider.glb` 是 Marble 额外导出的三角网格，可用于碰撞、地面射线和离线检查；它不是带有“树、房子、道路”语义的导航网格，也不能保证和 SPZ 在每次导出中完全同坐标。
- `semantics_metadata.metric_scale_factor`、`ground_plane_offset` 和 Marble 的 raw/OpenCV 坐标约定是必须随资产保存的运行时元数据。

杨璐（`su-he`）的资产已经包含这四类数据，前端地址为 `?world=field&person=su-he`。当前实现加载 SPZ，并从 SPZ 的地面密集层烘出不可见高程网格；`collider.glb` 同时加载为隐藏诊断来源。这样角色脚底跟随用户看到的田野，不会因为 collider 与 splat 的坐标偏差站到坡顶、树冠或空中。

## 运行时诀窍

1. **永远不要把整个 GLB 当地面。** 如果没有 `GROUND_*` 节点，只补一张明确的 y=0 兜底平面。把整棵场景树作为 raycast 目标，会把屋顶、树冠、装饰物的顶部当成脚下地面，这是“人物漂浮”的首要来源。
2. **先做坐标换算，再做对齐。** SPZ 的位置按 `metric = raw * metric_scale_factor`，再减 `ground_plane_offset`，最后绕 X 轴翻转到 Three.js Y-up。对齐使用可行走层的 5%/95% 范围和中心，不使用包含天空、远景裙边的整体包围盒。
3. **所见即所踩。** 从 SPZ 位置点的 y 直方图选择最密的地形层，在 XZ 网格内取中位高度，烘成隐藏的 `GROUND_FieldHeightmap`。所有角色出生、移动、座位/热点吸附都走同一个 `surfaceHeightAt(x, z)`。
4. **人物原点必须在脚底。** GLB 的根节点应是 `ROOT_Character`，脚底中心为原点；运行时只给根节点加地面高度，不要在每个场景再手工加一个未知 Y 偏移。
5. **同伴与用户走同一条通道。** 用户移动和 Agent 跟随都使用相同的 XZ 边界、静态圆阻挡、个人空间和地面高度查询。Agent 不能只改 x/z 而保留旧 y，否则上坡、下坡时会再次浮空。
6. **分层处理碰撞。** 地形负责高度；道路边界/建筑/摊位用少量 XZ 圆或盒；人物用动态圆；不要把高面数视觉网格每帧拿来做精确物理。
7. **SPZ 需要兼容 gzip 和 raw 两种本地导出。** 生产请求使用 `DecompressionStream("gzip")`，测试夹具可直接喂未压缩 SPZ。
8. **移动端按质量档加载。** 触屏或低核设备使用 `100k`，桌面使用 `500k`；Spark 运行时动态导入，咖啡厅和集市不承担 splat 首屏包体。

## 当前边界

当前 `collider.glb` 已被保留并标记为诊断来源，但由于 Marble 输出没有稳定的物体语义名称，前端不会把整份 collider 盲目当作障碍物。若要阻挡某棵树或房屋，应在生成后增加一份带语义的 `COLLIDER_*` manifest/navmesh（圆、盒或 walkable polygon），再挂入 `ColliderRegistry`。这比直接对 5 万到数十万三角形的视觉网格做实时碰撞更稳定。

## 验收清单

- `npm run build` 成功，Spark 被拆为单独 chunk。
- `backend/.venv/bin/python -m pytest -q tests/test_field_worldgen.py tests/test_experience.py tests/test_media.py` 全部通过。
- 浏览器打开 `?world=field&person=su-he` 后检查：`canvas.dataset.fieldWorld` 为 `marble:100k` 或 `marble:500k`，`groundSource` 为 `marble-spz-heightmap`，`fieldCollider` 为 `loaded-diagnostic`。
- 让用户沿坡走动，杨璐 Agent 在桌面侧前方、手机前方同行并随坡贴地；切断后端时，场域仍可用已缓存的 `echo-field.v1` 回退到程序化地面。

官方资产字段与生成/轮询接口参考：[World Labs Marble API Quickstart](https://docs.worldlabs.ai/api)。
