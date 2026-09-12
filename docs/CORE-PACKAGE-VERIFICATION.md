# 事件内核打包与独立接入验收

2026-09-12，权威代码 /root/meetmind_go。本轮把现有机制提取成可安装模块，没有重写事件规则。

## 产物与真实调用关系

- 包：packages/meetmind_core，distribution 为 meetmind-world-core，import 为 meetmind_core，0.1.0a1。
- 源码：事件投影、外部DTO适配、符号配方与局部变更、个人计划/日历导出。运行时仅标准库。
- 原examples/shared_experience四个模块保留兼容导出，fixture读取及CLI继续留在示例中；旧服务使用同一内核。
- 独立消费者examples/core_consumer/weekend_walk.py自带三人合成输入，不导入旧fixture、后端或仓库代码。
- scripts/verify-core-package.py打包wheel，在临时全新venv安装，将消费者复制到仓库外，以python -I运行。
- CI新增安装包接入验证及shared_space领域/HTTP测试；本地命令已通过，远端CI状态另行核实。

## 本地运行证据

隔离运行目录：/tmp/meetmind-core-package-iz2nm5qr。
wheel SHA-256：1a80e2b18454cb0b4475d4ffe58dba123ab6f9bd8ae263db9705557467945963。
实际导入路径：/tmp/meetmind-core-package-iz2nm5qr/venv/lib64/python3.11/site-packages/meetmind_core/__init__.py。
wheel仅含5个内核Python模块与dist-info，没有fixture、服务、密钥、照片、后端数据或示例测试。
元数据无Requires-Dist。安装使用--no-index --no-deps；构建阶段允许pip获取setuptools/wheel。

消费者在仓库外完成15条事件、7个阶段、每阶段3位查看者的投影：
明确提交经历→人工语义配方→只改变纪念标记而保留小径→分别接受/拒绝/未决定→
接受者自报→新签到进入同一个世界→撤回结果和原经历后恢复日志。
私人候选对其他人不可见；日历仅为本人接受事项，未发送邀请；新签到不推断其他两人参加。
撤回原经历让相关行动依据失效，但不删除另行记录的后续签到。完整输出在该目录的output/。

提取前后42个查看者/历史前缀的JSON投影哈希完全相同。
四个模块的全部核心函数/类AST与原提交相同（fixture读取与CLI留在旧入口，不纳入比较）。
旧共同经历105项、共同空间55项测试通过；后端331通过1跳过，149条既有警告。
主站npm run build通过，无dist差异，仍有既有大包提示。本轮无前端渲染改动，未宣称新增浏览器体验。

## 证明范围

已证明同一核心可保持旧服务兼容，并通过真实wheel安装被独立脚本消费；三人输入无需改核心。
这不是外部开发者用户研究，也没有证明接入成本降低、API成熟度、付费、真实人行为改变或AI生成效果。
没有发布PyPI，没有新增许可证；生产数据、模型配置、原始照片与环境资产未改变。
空间实验的活动区域协商、来源文字纠正与测量机制尚未并入内核；完整产品与高质量人物仍未完成。
