# 登录与世界归属产品决策（2026-08-06）

## 背景

- MeetMind 主产品（Next.js，capture.meetmind.online）已有完整微信登录：
  公众号 snsapi_userinfo（微信内）+ 带参二维码扫码（PC）+ JWT HS256（access 2h /
  refresh 7d，库表 refresh token）。用户主键 = openid（**未存 unionid**）。
- EchoWorld（本后端，FastAPI）当前无账号概念：世界是所有人物混居的公共世界，
  新访客看到的是别人录入的所有人——不是成熟产品形态。

## 决策

1. **登录共享：方案 1——共享 `JWT_SECRET`，EchoWorld 验签 + 自动补注册。**
   MeetMind 签发的 access token（HS256，`sub` 即其用户 id）在 EchoWorld 侧用
   PyJWT 直接验；首次见到陌生 `sub` 时本地建用户行（顺手调一次
   `GET /api/auth/me` 拿昵称头像）。access token 无状态，MeetMind 侧注销有
   ≤2h 传导窗口，可接受。不共享数据库、不改 MeetMind 现网代码。
   （备选方案 2 introspection 每次验签一次 HTTP 往返；方案 3 unionid 打通需要
   改 MeetMind 的 claim 链路，均暂不做。）
2. **世界归属：固定卡司 + 个人层。**
   - 固定卡司 = 团队 6 人（黄月胜/谢淯琪/杨璐/洪选婷/李浩/曾英杰），由真实
     合照生成的像素形象常驻，承担世界的基础生气与交流引子。
   - 登录用户的世界 = 卡司 + **自己录入的人**（packages 增加 owner_id；
     无 owner 的历史数据归属运维账号）。
   - 未登录访客看到的是"初始化世界"：只有卡司，没有任何别人的录入。
3. **真实人脸不上线**：卡司在世界里的形象全部由 gpt-image-2 从合照人脸
   重绘为像素风（facts/seed 下的设计肖像仅作参考图留在事实层，不进 public）。
4. **新用户引导（轻）**：登录 → 绑定基本资料 → 一次性引导上传合照/相遇信息
   → 生成 TA 的 NPC（复用 group_onboarding + person_builder 管线）。

## 状态

- [x] 卡司像素形象管线与生成（build_cast_avatars.py，2026-08-06）
- [x] 测试垃圾人物清理（注销 API + 房间成员联动）
- [ ] JWT 互认中间件（FastAPI 侧）与本地用户表
- [ ] packages owner_id 与按归属过滤世界快照/房间成员
- [ ] 登录态下的轻引导流程接入
