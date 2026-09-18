# Echo Campus 真实角色资产与运行时交付

2026-09-18。只修改独立 showcase 的角色模块、两份 GLB 与测试；未改另一个作品，未改主线 UI/main。

## 已完成

- 两款成年角色：鼠尾草绿外套/砖红裤女性，沙色衬衫/蓝绿裤男性。保留 Tripo 图像纹理与面部颜色。
- 每款是一个真正 SkinnedMesh，54 骨关节，Idle / Walk / Wave 各 108 动画通道；Wave 对应 greet_01 并含迈步抬手动作，播放一次后回到 Idle。
- 生成、绑骨前检查、v1.0 Tripo 绑骨、3 个独立 FBX 重定向、Blender 5.2 合并 3 动作导出 GLB、2K 彩色 + 1K 法线纹理缩放、浏览器方向与落脚校准。
- 脚底为局部 Y=0，高度女 1.68m / 男 1.78m；最终源 GLB 正面 +X，运行时 forwardYaw=-π/2 校准到 +Z。
- 角色颜色只用于外置胸牌，不把面孔染色。不创建外描边副本网格。
- 全部模型几何、纹理、材质共享，每个实例拥有独立 skeleton 和 mixer；单人 dispose 不删共享资源。
- 原 Characters.js 保留，由主线在角色库加载失败时决定使用兜底。

## 代码与文件

权威远端根：`/root/meetmind_wt_main/showcase/echo-campus`

- `src/scenes/PremiumCharacters.js`
- `tests/premium-characters.test.mjs`
- `public/assets/premium/host-female.glb`，1,379,068 字节，23,880 三角，SHA256 `208ab4718a3e17d128832c0131871f5e0e269f0381a19759e7d841b6b83abdec`
- `public/assets/premium/host-male.glb`，1,385,516 字节，22,614 三角，SHA256 `b1c4eac7fbe566d48643522eb0eb9e829896ccf2e1229cb6d1978bff0174d9f9`

API：`const library = await loadCharacterLibrary({baseUrl:document.baseURI})`；`library.createPremiumCharacter({color,seed,name})` 同步返回 `{root,model,mixer,height,assetInfo,update,dispose}`。默认导出的 `createPremiumCharacter` 也可在 preload 后调用。`library.errors` 记录单个资产加载失败。两个都失败时 preload 抛出异常。库释放会等所有实例离开后才真正释放共享资源。

## 生成来源

| 项目 | 女 | 男 |
|---|---|---|
| 原生成 | 0ecf9ec0-a9c3-4f35-9a29-267efcc3af0b | 6b9245c6-88a9-4bda-8347-5f93ba58a214 |
| rig-check | 281fdef6-e771-4cd6-99b0-37ac56202da3 | 092e51d9-6fcf-4d9d-b909-e1a014ac69d8 |
| v1.0 rig | b5d1fc54-77e3-48fe-b15d-bc06209ffa8e | 22c6ea59-e45a-4322-8ef1-74c58d595710 |
| idle | d5976599-97e2-47a5-9da3-4e79623b10fb | 32903652-4fc9-421b-84c3-bc684160b55c |
| walk | 62bdfb7b-9616-4352-9304-b6201a65576c | 8fbb6b0b-b436-4ff5-994d-2fb40a841ae4 |
| greet_01 | 01abd120-5cdd-401c-9e69-1e6da6ba61e0 | d5d6d881-c5f1-455b-b929-e1987b99a2ac |

两个 rig-check 均真实返回 riggable=true / biped。两个 rig 都验证到16组对称 L/R 解剖命名骨（含膝、手、twist），无结构缺项。所有 retarget 为单动画/FBX，未指定 model，未使用 animate_in_place。没有重复付费提交。

## 修复与验证证据

1. Blender NLA 导出会写入162条纯数值噪声 scale 通道。离线逐条比较 rest scale，女最大差4.17e-7，男3.58e-7，阈值1e-4。只移除这些冗余scale，保留全部 rotation / translation / twist。官方 skill 的 validate-animation 两款3clip通过：Idle 15.375s，Walk 2.375s，Wave 3.542s。
2. 此批 Tripo FBX 的 Root 静止，实际水平行走位移在 Hip，且其本地轴并非世界Y向上。运行时没有破坏 Hip translation，而用独立 motion parent 抵消 Hip 在角色世界水平面的偏移，保留脚步上下起伏。
3. 实测 +X朝向校准后人物面向+Z；64个真实蒙皮鞋底顶点用于小幅落脚修正。测试采样最深入地女约9mm/男约18mm；自动rig仍非电影级手指/足接触精修。
4. `node --test tests/premium-characters.test.mjs` 两项通过：独立骨架、共享资源安全释放、米制归一化、Root仅去水平位移、单次Wave回Idle。
5. Chrome + Three.js 真实播放 idle→walk→wave→talk，含中段截图；最终 `qa-grounded/report.json` errors=[]。每个阶段都未暂停播放。截图：`qa-grounded/face.png`、`walk-a.png`、`walk-b.png`、`wave.png`、`wave-late.png`。
6. 独立两人测试画面7 draw calls/93,422渲染三角（含阴影）；5几何/10纹理（含环境、阴影和骨纹理）。此数据不是最终园区/手机性能结论。

## 明确限制

- 当前两款形象被重复用于多人，不是每个嘉宾都完成了独立面孔或照片重建。
- Talk 没有额外付费动画，用真实头/胸骨小幅附加动作。没有声音口型同步。
- 生成纹理可能含服装局部小瑕疵；近景手指细节与自动绑骨需要继续按产品等级精修。
- 静态美术与独立motion QA已经通过。主线交互、整场景性能和生产发布验收由主代理完成。

本地资产与处理脚本：`C:/Users/Li Hao/Documents/meetmind_world 2/output/visual-upgrade/characters-runtime/`；最终GLB：`../assets/characters-final/`；任务日志：`../jobs/host-*.json`。不在公共目录发布密钥、任务下载临时URL或原始私有日志。
