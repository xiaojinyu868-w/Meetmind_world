# Echo Campus 视觉升级 · 2026-09-18

## 用户意图和边界
- 修正人物粗糙、场景空洞，使活动世界值得交互；参考另一个作品的资产+材质+光照方法，风格不必相同。
- 参考项目 lumen-photo-game 只读，严禁改动。现有真实建筑几何保留，source维持来源预览，event使用布置与视觉增强层。
- 权威实现仍在 /root/meetmind_wt_main/showcase/echo-campus；独立5191部署，原EchoWorld及数据不碰。新版本未构建前不影响线上。
- 用户提供Tripo key仅工具内存使用；从本任务消息取凭据，不写入代码/报告/前端。

## 美术与体验方向
- 温暖都市会客园区：精致动画电影风成年人物，奶油石材、浅木、鼠尾草绿、陶土色；晴朗带暖光的天空、冷暖阴影、真实环境反射。
- 先做好T6会客露台近景：两位新生成带脸人物+可动画骨架；树/木座凳/花境；明确迎宾与互动点。随后适配三模型。
- 核心体验保持：浏览场地→主动领取分身→点人看公开名片→发起/确认相遇→到点位查看内容/打卡。每一步有视觉和声音响应，不新增虚构业务成功状态。
- UI保留可切真实源版本，默认应进入活动体验；近景镜头让人物足够大，人物名片不挡人。

## 并行责任
- 主代理：Tripo生成、任务恢复、渲染/天空/材质、main集成、UI交互、最终部署QA。
- reference_art_audit：参考只读审查完成；独立EventGarden.js+布局测试。
- premium_characters：PremiumCharacters.js预载/骨架克隆/mixer/服装色标；不改main。
- tripo_api_research：当前中国v3官方文档/参数/计费/任务历史。

## 任务与凭据状态
- 官方中国API https://openapi.tripo3d.com/v3，余额查询成功，起始8615积分。
- 图像类并发只有1；首轮female明确429，tree/seat状态需核对，未盲目重试。
- male概念 4fdb4262-812f-4766-a956-0a6172dd446c 已成功且人工看过：完整T姿脸/衣服/脚可用。
- female概念 67bc2b2a-3ece-47fb-ad5d-fa4d218dabe7 已接受。
- 详细job IDs/参数/文件哈希在本地 output/visual-upgrade/jobs/（无密钥/下载签名链接）。

## 待完成
- 完成2角色model→rigcheck→rig验证→Idle/Walk/Wave→离线合并压缩；props选型。
- EventGarden+天空/建筑材料增强+近景互动+移动视口整合。
- 开发QA用临时服务且隔离API写入；最终生产65测试基线、浏览器source/event/切换/身份关系保持、未暂停运动证据、性能报告及独立美术审查。
- 新视觉截图/短视频和展示页替换旧镜头，提交推送独立showcase分支。
