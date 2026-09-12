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
3. “来处”可以带进一段新经历，填写日期和来源说明；本人可以纠正或撤回，另一位可以回应不同记忆。预置合成内容和参与者录入分别标注。新增经历不会自动改变要求或布局。
4. “我们的要求”可添加/调整本人活动区域，主动选择经历依据或独立提出。确认后显示区域和冲突；经历改变时，只提示相关要求的本人重新核对。来源撤回后可独立保留要求，但不能再把撤回的经历关联到新要求。
5. “一起决定”可接受、调整、先测量或暂不决定。改布局/要求/经历产生新版，旧同意不算当前同意。
6. 记录本人下一步的负责人、截止时间（仅记录，不自动提醒）、完成标准、待测量事项和结果来源；本人可以提交完成/未完成报告、补充说明，或撤回报告。导出Markdown摘要。导出不代表购买或现实完成。

7. 完成报告后点“把测量带回空间”，填所选家具的宽深高、日期、来源。记录本身不改布局；点击“预览测量影响”仅在本端缩放，应用后两端才更新尺寸并使旧版同意过期。尺寸冲突会保留显示，需修改方案。
8. 可撤回本人的测量；已应用尺寸暂保留并标成来源失效。修改/撤回相关行动报告也会使其失效，需要记录新测量并应用。可查看测量变化记录和导出来源。其他参与者可明确应用共享测量，但不能冒充来源本人或替其撤回。

## 模块与复验

domain.py为纯状态转换/几何/导出；serve.py复用SQLiteSessionStore和PairAccessStore，
按命令日志重放、请求幂等和sequence拒绝过期写入。revision表示影响共同决定的方案版本。
SpaceView.js投影3D/2D、拖动与冲突，保持家具mesh身份；main.js处理双端UI。
HTTP额外添加violations，不将派生冲突保存为权威事件。

~~~bash
backend/.venv/bin/python -m unittest examples.shared_space.test_domain examples.shared_space.test_service -q
node examples/shared_space/web/browser-test.cjs
node examples/shared_space/web/action-browser-test.cjs
node examples/shared_space/web/measurement-browser-test.cjs
node examples/shared_space/web/context-browser-test.cjs
~~~

浏览器脚本需要Playwright，支持PLAYWRIGHT_MODULE、CHROMIUM_EXECUTABLE、LAB_URL、LAB_EVIDENCE_DIR。
见[验收报告](../../docs/SHARED-SPACE-VERIFICATION.md)。

房间/费用/经历均为人工合成。只检查水平矩形、入口及活动区，不提供装修或安全规范验收。
当前模型布局提案适配已接入，但未实测真实模型；行动记录已经结构化保存并可在双方之间同步，但截止时间不触发提醒，结果来源仍是本人自报，尚无独立核验。家具测量可明确应用到尺寸；房间/门区仍为合成固定尺寸，未实现预算/妥协编辑、真实媒体输入、完整行动日历与任务对照分组。
没有真人价值或商业验证，未达到原始人物和完整世界品质。


## 检查并应用布局提案

在“先看变化，再作决定”中查看人工修改示例，可先预览再应用。人工B布局不理解输入，
页面明确非AI；真正调用模型需服务启动时增加--enable-model。当前4197未启用模型。
模型只接收房间、家具、已确认要求和输入文字，不发送经历/决定/行动原文。
只能移动现有家具，运行时独立校验；不能替另一位改变要求或同意。
预览只在本人视图，应用一次提交到共同状态；依据变更后旧提案不可应用。
未应用提案重启会丢失，已应用patch持久保存。见[提案验收](../../docs/SPACE-PROPOSAL-VERIFICATION.md)。

~~~bash
backend/.venv/bin/python -m unittest discover -s examples/shared_space -t . -q
node examples/shared_space/web/proposal-browser-test.cjs
~~~

## 测量记录的来源边界

测量关联一个本人已自报完成的行动与该报告的版本，只接收 0.05–10 米的家具尺寸及 YYYY-MM-DD 日期。
没有照片识尺、外部核验或自动将文字报告推断成尺寸。来源文字不是上传附件，也不会被抓取或发送给布局模型；
模型继续只接收房间、家具几何、已确认要求和用户布局指令。

测量记录只推进命令序号；应用尺寸或使当前尺寸依据失效才推进方案版本。旧命令日志原样重放，
补出空测量列表和报告版本，无需改写生产或实验历史。测量修正为新增记录；withdraw 标记撤回后不能复用。
前端预览遇到共同记录更新自动退出；服务端重新检查报告版本、撤回状态和方案版本。

## 持续进入的新经历

memory.add 记录参与者文字、可选日期和来源说明。发起者由会话凭证决定，不能替另一人录入；
它是一方陈述，另一方的回应独立保存，不能据此宣称共同事实。新要求通过requirement.add/update由本人明确确认，
限定为矩形活动区域，不是AI自动提取；模型仅收到确认后的要求与几何，不收到经历全文或来源说明。

来源版本和当前方案版本用于防止旧弹窗覆盖新内容。冲突会保留草稿；取消后刷新来源、重新打开核对。
旧内联表单遇到冲突，提供“查看更新并重新核对”按钮，明确提示会清除未保存输入。
withdraw是撤回作为依据的资格，不是物理删除：旧命令日志保留；当前页面和导出隐藏撤回经历的正文及来源说明。
详见[经历与要求验收](../../docs/LIVING-CONTEXT-VERIFICATION.md)。
