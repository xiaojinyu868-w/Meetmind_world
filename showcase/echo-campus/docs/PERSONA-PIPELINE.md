# 分身阵容的生产管线

12 款预设分身在活动前一次性生成，来宾碰一下时只做分配，不做任何实时生成（Tripo 生成一个可动角色需要数分钟）。这份文档记录本轮做法，方便下一场活动增删形象。

## 1. 管线

```
文字设定（统一画风 + 每人一个强特征）
  → Tripo text-to-image（seedream_v5，t_pose 模板，2048²）          5 积分
  → 人工检查 10 张概念图（姿势、完整头手脚、特征是否鲜明）
  → Tripo image-to-model（v3.1，PBR，detailed 贴图，24k 面）         40 积分
  → rig-check（免费）→ rig（v1.0 双足骨骼，41 骨）                  25 积分
  → 4 段 retarget，FBX：standing_relax / agree / greet_02 / clap     各 10 积分
  → Blender 4.5：合并 4 段动作为一个 GLB（scripts/personas/convert_personas.py）
  → 修正法线贴图、去掉静止缩放通道、meshopt 压缩（scripts/personas/optimize-personas.mjs）
  → 特写高清贴图：rig GLB 的 4K 原图 → 2K 颜色 / 1K 法线 / 1K 粗糙度（scripts/personas/build-hd-textures.mjs）
  → 用正式运行时渲染头像与全身像（tools/portrait-studio.html + scripts/render-persona-portraits.mjs）
```

每款新形象约 110 积分。本轮 10 款新形象 + 2 款原有形象补「鼓掌」动作，共消耗 **1,120** 积分（账户 5,255 → 4,135）。

## 2. 关键坑（已处理）

1. **法线贴图错位**：新版 Tripo 的 FBX retarget 导出把法线槽指向了一张颜色贴图副本（两张图都叫 `Color_…`），直接导出会让角色满身斑驳。修正方式：从同一 rig 任务的 GLB 里取出真正的 `NormalGL_…`（网格与 UV 相同），缩到 512 后替换。
2. **旧动作骨骼数不同**：9 月的 FBX 带 13 根零权重 `*_end` 末端骨，新 FBX 没有。合并时只比较参与变形的骨骼，41 根共有骨骼静止姿态误差 < 2e-5。
3. **Tripo 并发限制**：一次只能跑有限任务，超出返回 429。管线把 429 当作「未受理、未扣费」，退避后重试；其他提交失败一律不自动重发，避免重复扣费。
4. **鼓掌太长**：`clap` 一段约 17 秒，运行时只取前 3.6 秒作为「相遇点亮」时的庆祝动作。
5. **ORM 的 AO 是纯白**：Tripo 的 ORM 贴图里环境光遮蔽通道没有信息（全 255），粗糙度通道（G）才有真实差异。特写集只取粗糙度，并压到 0.45–1.0，避免暖光下夹克反光像镜面。
6. **待机双臂外张**：Tripo 的 `standing_relax` 仍带 A 字姿势，运行时在待机时把上臂向身体收约 6°（`ARM_SETTLE`），手势动作不受影响。

## 3. 体积

| 阶段 | 每款大小 |
| --- | --- |
| Tripo rig GLB（4K 贴图，无动作） | ~8.8 MB |
| Blender 合并（1K 颜色 + 512 法线 + 4 段动作） | ~1.58 MB |
| meshopt + 量化 + 去冗余通道 | **~0.65 MB** |
| 特写高清集（2K 颜色 WebP + 1K 法线 + 1K 粗糙度，按需加载） | ~0.25–0.6 MB |

头像（bust 512²）与全身像（720×1100）为透明 WebP，每张约 20–60 KB。

## 4. 任务记录

| 分身 | 概念图 | 模型 | 骨骼 |
| --- | --- | --- | --- |
| 松石 songshi | 9d635e90-58d3-4148-9c7f-e15ce9553f4c | 0f82afe5-d454-40a1-a1a4-3b3220dd84a1 | 84299647-b6a5-4f22-aef4-a58759d1e12d |
| 朱砂 zhusha | bebb0e74-b234-4bdb-994e-963ab780dcd1 | 449f39dc-541b-4011-ae22-a50603d2d932 | ba79176f-1486-48d3-af5a-a50215b05d54 |
| 白噪 baizao | c49dec5d-fbd5-4f44-9b4b-9826b4efa328 | 7b6d4d10-da23-4562-8615-8fd0fe59acec | 4d4618cc-c0a5-488c-b4c6-41b03d38cd69 |
| 青瓷 qingci | d32f51e4-e9e1-4f9b-8e62-b547c1686e47 | 3771fb30-a6de-4f98-9b05-3879f2719409 | 11345758-446e-4bb5-85e7-3846eb4758ad |
| 晴跑 qingpao | e7843829-68e1-4ab6-84b8-87404996b1c3 | 17028120-aa68-474d-b4e0-9684a2dfa04e | 1bda29a5-6862-4b7a-a09f-0b1e0aee77ec |
| 赭石 zheshi | cb3ea6a4-7b92-4968-bf2b-9a02f9d84771 | 511893c6-a730-49b5-938b-7d1937986336 | 447ec7ad-e3bb-4d9f-afae-8cf025bc1ca3 |
| 霜叶 shuangye | 6f7edbd0-66a2-4f13-b937-c83d120e4ed9 | 7847cfad-f389-4d12-a675-4154302eb4ea | 840be6ba-45df-49fa-ac6c-c153da85896b |
| 墨川 mochuan | 739d935a-8de5-4301-a2cb-0db8fce93315 | 2c0e83ad-2a89-4f0d-808f-b8532b90aab6 | d8d38ed4-b454-4a32-b17d-485b30ee78c0 |
| 珊瑚 shanhu | 2f4fe0b3-cb0c-4548-92b6-c607eb7074c9 | 4a0c84d2-6861-44dd-9e33-4b64385b8e61 | 397acef0-e7d1-4e41-8839-49145c855474 |
| 小满 xiaoman | 2fafe256-8c6d-40a6-a30d-2731ef3f8235 | ee1e30e5-99aa-4ba1-8391-d6821ca24255 | 824f69ea-e9ff-410c-9811-cef9b7affff6 |
| 青柳 qingliu | 9 月 host-female | 0ecf9ec0-a9c3-4f35-9a29-267efcc3af0b | b5d1fc54-77e3-48fe-b15d-bc06209ffa8e |
| 沙洲 shazhou | 9 月 host-male | 6b9245c6-88a9-4bda-8347-5f93ba58a214 | 22c6ea59-e45a-4322-8ef1-74c58d595710 |

完整的每一步任务 ID、积分与下载文件哈希保存在生产机工作目录的 `jobs/*.json`，不含密钥和临时下载链接。

## 5. 新增一款形象

1. 在 `scripts/personas/roster_pipeline.py` 的 `PERSONAS` 里加一段设定（保持统一画风句；给一个一眼能认出的特征，如帽子、发型、配色）。
2. `ECHO_TRIPO_WORK=<工作目录> TRIPO_KEY_FILE=<密钥文件> python3 scripts/personas/roster_pipeline.py auto <id> concept 1`，检查概念图。
3. 满意后 `… auto <id> anim 2` 跑完模型、骨骼与 4 段动作。
4. `blender -b --factory-startup -P scripts/personas/convert_personas.py -- <id>`。
5. 从 rig GLB 提取 `NormalGL` 缩到 512（见第 2 节），运行 `node scripts/personas/optimize-personas.mjs <blender 输出目录> public/assets/personas <法线目录>`。
5b. 把 rig GLB 里的 4K `Color_` / `NormalGL_` / `ORM_` 原样取出为 `<id>-color.jpg`、`<id>-normal.png`、`<id>-orm.jpg`，运行 `node scripts/personas/build-hd-textures.mjs <原图目录>`，生成 `public/assets/personas/hd/` 与带哈希的 `manifest.json`（青柳、沙洲两款旧形象自动从 `public/assets/premium/` 取 2K 原图）。
6. 在 `src/shared/personas.mjs` 登记代号、气质、特征、主色、身高。
7. `npm run dev` 后运行 `node scripts/render-persona-portraits.mjs` 生成头像。
8. `npm test`（会检查每款形象的模型、4 段动作、两张头像，以及特写贴图与清单哈希一致）。
