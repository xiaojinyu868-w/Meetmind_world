# 一起安放：共同空间样例

两个人将生活要求带进6×5米的合成房间，查看冲突、修改方案、分别作出版本选择，并把下一步带回生活。
独立框架实验，不代表转型家装；不改线上咖啡厅及4196纸桥实验。

## 启动

需要仓库现有Node依赖及Python3.10+。样例后端只用标准库，不读.env、不调用模型。

~~~bash
npm exec vite build -- --config examples/shared_space/web/vite.config.js
backend/.venv/bin/python -m examples.shared_space.serve \
  --port 4197 --data-dir /root/.local/state/meetmind-lab/shared-space-worlds
~~~

本机打开 http://127.0.0.1:4197/ 。远程运行需SSH转发4197。
data-dir必须独立于生产数据和公开资源，不要复用旧实验数据库。

创建者为小满/alice，点击“邀请另一位”，在独立浏览器会话打开链接，以阿博/bo加入。
PairAccessStore凭证7天、邀请30分钟一次有效；没有真实账号、真人核验、恢复或续期。
127.0.0.1链接不能直接发给外部手机。页面不会替用户发送邀请。

## 操作

1. 各自确认自己的要求，别人不能代选。A方案启用运动区后冲突，B留出空间。
2. 点击家具后拖动，或输入X/Z和方向。2D平面与3D使用同一实际布局；空白处拖动调整视角。
3. “来处”纠正本人经历或回应另一人的说法，相关要求提示本人重核；已确认要求不会自动撤掉。
4. “一起决定”可接受、调整、先测量或暂不决定。改布局/要求/经历产生新版，旧同意不算当前同意。
5. 记录本人下一步与自报结果，导出Markdown摘要。导出不代表购买或现实完成。

## 模块与复验

domain.py为纯状态转换/几何/导出；serve.py复用SQLiteSessionStore和PairAccessStore，
按命令日志重放、请求幂等和sequence拒绝过期写入。revision表示影响共同决定的方案版本。
SpaceView.js投影3D/2D、拖动与冲突，保持家具mesh身份；main.js处理双端UI。
HTTP额外添加violations，不将派生冲突保存为权威事件。

~~~bash
backend/.venv/bin/python -m unittest examples.shared_space.test_domain examples.shared_space.test_service -q
node examples/shared_space/web/browser-test.cjs
~~~

浏览器脚本需要Playwright，支持PLAYWRIGHT_MODULE、CHROMIUM_EXECUTABLE、LAB_URL、LAB_EVIDENCE_DIR。
见[验收报告](../../docs/SHARED-SPACE-VERIFICATION.md)。

房间/费用/经历均为人工合成。只检查水平矩形、入口及活动区，不提供装修或安全规范验收。
当前没有模型提议、真实材料、尺寸/预算/妥协编辑、完整行动日历与任务对照分组。
没有真人价值或商业验证，未达到原始人物和完整世界品质。
