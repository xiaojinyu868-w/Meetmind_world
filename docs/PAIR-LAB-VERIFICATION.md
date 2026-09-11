# 双端角色访问与共同状态验收（2026-09-12）

这是两个独立浏览器访问同一持久世界的能力实验。角色仍为小满/alice、阿博/bo，
邀请持有者取得对应角色访问权，不能视作照片真人核验、真实账号或微信登录完成。

## 新入口

serve_pair.py 是独立 loopback 服务，复用现有 Lab 领域命令、投影、生成和日历接口。
它要求访问凭证，将请求的 viewer/session_id 与服务端绑定校验；伪造身份、跨世界操作或无凭证读取被拒绝。
旧的可切身份实验服务不处理双人数据库；两个入口使用不同目录。

创建页面生成 alice 访问凭证；创建者可创建 bo 一次性加入链接。链接位于 URL fragment，
浏览器先显示角色说明，用户明确点击加入后才消费邀请。成功后清除 fragment，使用请求头携带凭证。
创建链接不会发送消息，用户自行在另一个隔离浏览器会话打开或交给参与者。

访问令牌为32字节随机数、有效7天；邀请有效30分钟且不超过创建者有效期。
capabilities.sqlite3 仅存 SHA256 哈希和过期时间，不保存原始令牌。目录700，文件600。
加入使用事务，一张邀请只能成功一次；生成新邀请使旧待加入链接失效，已有加入者时先撤销才能重发。
撤销不删除共同历史。当前没有账号恢复、续期和角色更换后的重新认领机制。

## HTTP 边界

- GET /lab-api/mode -> pair_mode=true
- POST /lab-api/sessions，无凭证且空body -> 创建新独立世界及alice凭证
- POST /lab-api/sessions，Bearer凭证 -> 恢复该凭证绑定的世界
- POST /lab-api/pair/invite，创建者Bearer -> 创建一次性bo邀请
- POST /lab-api/pair/join，invite -> 消费邀请并取得bo凭证
- POST /lab-api/pair/revoke，创建者Bearer -> 撤销bo及待加入邀请
- state/commands/proposals/calendar 全部绑定服务端身份。body或query显式提供不同身份/世界会拒绝。
- 双人模式不允许reset共同历史。个人纠错、撤回和行动规则继续由领域内核判断。

界面禁用查看身份切换，每1.2秒拉取当前角色可见状态。输入期间保留表单，不强制重绘，
但仍检查访问有效性。隐藏页面暂停轮询。凭证失效后清空当前对象、详情、JSON和草稿，
停止继续同步；已被对方阅读或下载的内容无法从现实中收回。
这不是即时撤销所有在途请求的线性化保证，外部部署仍需完整认证/会话体系和持续授权设计。

## 验证

- 105项Python示例测试通过。15项访问存储测试覆盖哈希存储、过期/撤销、重开、
  跨会话隔离、SQL失败回滚和8线程/4独立进程争用同一邀请仅成功一次。
- 3项真实HTTP测试覆盖所有身份绑定入口、伪造身份拒绝、无凭证读取拒绝、
  两人选择、私有记录过滤和撤销后请求拒绝。
- 两个隔离浏览器Context（桌面1440×1060、手机390×844）验收通过：
  创建链接 -> 显式加入 -> 邀请复用拒绝 -> 伪造alice请求拒绝 ->
  alice接受/bo拒绝互相同步 -> alice自报结果同步 -> 私有签到不出现在bo视图 ->
  bo刷新恢复 -> 创建者撤销 -> bo清空视图且后续HTTP拒绝。
  手机无横向溢出，无pageerror，已检查手机截图。输入框聚焦时仍能发现访问撤销。
  浏览器延迟响应测试还覆盖：旧世界轮询403晚于新世界连接返回时，新世界内容和同步不被清空。
  轮询在处理成功或失败前均核对会话、身份和访问令牌。
- 8项Node渲染测试通过，主站及lab构建通过，lab JS约584kB，大包提示仍在。
- 后端331通过、1跳过、149条既有警告。
- 旧单人实验 browser-test.cjs 在4195完整回归通过；该服务已按原数据库路径重启载入模式接口。

证据目录 C:/Users/Li Hao/AppData/Local/Temp/meetmind-pair-evidence
包含 report.json、owner.png、guest-mobile.png。JSON测试报告没有保存访问令牌或邀请链接，截图遮挡加入链接字段。
基线报告在 meetmind-pair-baseline-evidence。

## 启动与复验

~~~bash
npm exec vite build -- --config examples/shared_experience/lab/vite.config.js
backend/.venv/bin/python -m examples.shared_experience.serve_pair \
  --port 4196 --data-dir /root/.local/state/meetmind-lab/pair-worlds
# 另一个终端，需要Playwright；不调用模型、不联系真人
node examples/shared_experience/lab/pair-browser-test.cjs
~~~

当前服务没有启用模型；模型账户Arrearage问题未宣称解决。
此入口只监听127.0.0.1，通过本机SSH转发访问，不能把127.0.0.1链接直接发给另一台手机使用。
它完成独立客户端的权限和同步实验；公网邀请、真实身份认领、真实关系数据接入、美术品质和用户价值仍待完成。
