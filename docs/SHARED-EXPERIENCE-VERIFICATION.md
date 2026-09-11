# 2026-09-12 来源导入与 2D 对照验收

范围：examples/shared_experience；所有实现、测试、构建均基于 /root/meetmind_go。
浏览器经 SSH 转发访问 loopback 实验服务。所有输入为合成数据，未调用模型或第三方服务。

## 当前完成的实际链路

确认签到 JSON → 独立适配器 → 带来源事件 → 权限过滤世界状态 → 2D 与 3D → 撤回。
日历 DTO 有独立适配器及回放测试，目前没有日历 UI 或真实日历连接。

2D 显示实体、记录者陈述的参与关系、历史事件与个人选择/结果，通过共享详情访问来源。
切换视图不改变状态或命令；2D 暂停 WebGL 绘制，但页面启动仍加载 Three.js，因此不是加载性能对照。
本轮只能证明技术链路正确，不能推出用户更喜欢哪种模式、愿意付费或世界影响现实。

## 验证

- Python 示例：42 项通过（回放、来源适配器集成、会话导入与撤回）。
- Node 语义对象：3 项通过（纠正保持 UUID/位置、撤回释放对象与关系、权限切换）。
- 后端全量：331 通过，1 跳过；Pillow 弃用提示等共 149 条。
- 主站 Vite 生产构建和独立 lab 构建均通过；lab 主 JS 约 568 kB，gzip 145 kB，
  仍有大于 500 kB 的 bundle 提示，未作加载性能优化。
- 浏览器执行仓库 lab/browser-test.cjs：桌面 1440×1060，手机 390×844。
  无 pageerror/console error，无手机横向溢出；已检查截图。

浏览器断言覆盖：标题纠正保持 3D UUID；两人接受/拒绝；本人报告与撤回；
经历撤回和关联消失；权限切换；回放重置；手机结果按钮；相机旋转和物件点击；
2D 状态不变、绘制帧数暂停、关系和结果可见；签到导入只增一次；
私有签到在另一查看者视图隐藏；撤回签到后两种视图均删除对象。

## 复现

```bash
python -m unittest discover -s examples/shared_experience -t . -v
node --test examples/shared_experience/lab/scene.test.mjs
npm exec vite build -- --config examples/shared_experience/lab/vite.config.js
python -m examples.shared_experience.serve --port 4191
# 另一个终端；需要 Playwright，可用 PLAYWRIGHT_MODULE 指向已安装模块。
node examples/shared_experience/lab/browser-test.cjs
```

浏览器脚本默认将报告和 PNG 写到系统临时目录 meetmind-semantic-lab-evidence；
本轮通过 LAB_EVIDENCE_DIR 输出到 Windows 临时目录 meetmind-source-import-evidence。
截图不加入公共资产目录；CI 运行 Python 示例、Node 对象测试及两种构建，浏览器仍是本机验收。

## 下一步仍需完成

- 独立开发者接入新情境，检验复用成本；当前是项目内自测。
- 接入获授权的真实材料与生产认证/存储，区分本人的陈述和独立外部证据。
- 生成模型把语义对象变成有场景意义的视觉与行为，验证增量生成保持历史。
- 按具体任务做真人 2D/3D 比较，验证 motivation 与实际价值；正式愿景、切入口和许可证仍待明确。
