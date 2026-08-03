"""种子数据：1 个咖啡厅模块 + 6 个 demo agent（及其 demo Package）。

目的：为 World Service 提供初始世界（MVP1 stub），调色板与前端
      src/data/demoPeople.js 保持一致，保证前后端 demo 观感统一；
      同步把 6 人落成已确认的 demo Package，让检索/资料包接口开箱有数据。
输入：无。
输出：seed_world() -> {"agents", "modules"}；seed_demo_packages(store) -> 新建数量。
验收：tests/test_snapshot.py —— 由种子生成的快照通过 echo-snapshot.v1 校验；
      tests/test_search.py —— name 检索命中种子数据；
      tests/test_media.py —— face_ref/photos 指针经 media 路由可取到真实字节。
"""

# 与前端 demoPeople.js 对齐的 6 个 NPC（调色板/姓名/相遇信息）
SEED_AGENTS = [
    {
        "id": "lin-che",
        "name": "谢淯琪",
        "position": {"x": -4.0, "z": -2.0, "yaw": 0.8},
        "state": "seated",
        "met_at": "2025 年秋 · 科技展咖啡摊",
        "bio": "擅长把混乱的讨论收束成清晰的问题。第一次见面时，因为借同一支记号笔聊了半小时。",
        "tags": ["创作伙伴", "产品", "咖啡"],
        "palette": {
            "hair": "#252a31", "jacket": "#315d83", "MAT_Jacket_Light": "#527ea2",
            "shirt": "#f0e7cf", "pants": "#313d4a", "shoes": "#d07444", "skin": "#d79a73",
        },
    },
    {
        "id": "zhou-ning",
        "name": "曾英杰",
        "position": {"x": 4.2, "z": -2.5, "yaw": -0.6},
        "state": "walking",
        "met_at": "2019 年夏 · 校园旧礼堂",
        "bio": "对城市里的小路和旧建筑格外敏感。一起做过一份无人问津、后来却被反复引用的校园地图。",
        "tags": ["老同学", "城市", "地图"],
        "palette": {
            "hair": "#56352b", "jacket": "#b85f50", "MAT_Jacket_Light": "#d27a68",
            "shirt": "#f0dfc5", "pants": "#344957", "shoes": "#d0a95d", "skin": "#d79a73",
        },
    },
    {
        "id": "chen-mo",
        "name": "黄月胜",
        "position": {"x": -4.5, "z": 3.0, "yaw": 2.2},
        "state": "seated",
        "met_at": "2022 年冬 · 第一次项目评审",
        "bio": "说话不多，但总能做出那个让方案突然成立的原型。共同经历过三个上线夜晚。",
        "tags": ["前同事", "原型", "深夜"],
        "palette": {
            "hair": "#242829", "jacket": "#667443", "MAT_Jacket_Light": "#89965c",
            "shirt": "#e4dec8", "pants": "#3d4442", "shoes": "#a45d3c", "skin": "#d79a73",
        },
    },
    {
        "id": "xu-an",
        "name": "李浩",
        "position": {"x": 4.0, "z": 3.2, "yaw": -2.0},
        "state": "walking",
        "met_at": "2024 年春 · 海边公交站",
        "bio": "总能记住光线变化的时刻。因为错过同一班公交，在海边多停留了一个黄昏。",
        "tags": ["旅行", "摄影", "海边"],
        "palette": {
            "hair": "#67392e", "jacket": "#c18b39", "MAT_Jacket_Light": "#d4a85d",
            "shirt": "#f0e5c9", "pants": "#315d59", "shoes": "#715040", "skin": "#d79a73",
        },
    },
    {
        "id": "su-he",
        "name": "刘璐",
        "position": {"x": 0.5, "z": -4.5, "yaw": 0.1},
        "state": "talking",
        "met_at": "2023 年夏 · 楼下修车棚",
        "bio": "认识附近每一家小店，也记得谁需要被照顾。从借一把六角扳手开始熟悉起来。",
        "tags": ["邻居", "社区", "花市"],
        "palette": {
            "hair": "#29282b", "jacket": "#8b4a62", "MAT_Jacket_Light": "#af6680",
            "shirt": "#dce8e5", "pants": "#3d4552", "shoes": "#b98945", "skin": "#d79a73",
        },
    },
    {
        "id": "tang-ke",
        "name": "洪选婷",
        "position": {"x": -0.8, "z": 4.6, "yaw": 3.0},
        "state": "walking",
        "met_at": "2008 年夏 · 河堤篮球场",
        "bio": "共同记忆最长的人。很多故事不需要讲完，对方就知道下一句是什么。",
        "tags": ["童年", "音乐", "河堤"],
        "palette": {
            "hair": "#4a352d", "jacket": "#2f7d7b", "MAT_Jacket_Light": "#52a09b",
            "shirt": "#efe5ca", "pants": "#383e48", "shoes": "#cc7548", "skin": "#d79a73",
        },
    },
]

# 1 个咖啡厅模块；桌位/座位概念预留（World Service 后续做入座调度）
SEED_MODULES = [
    {"id": "cafe-main", "type": "cafe", "position": {"x": 0.0, "z": 0.0, "yaw": 0.0}},
]


# 与前端 demoPeople.js relationships 同源的熟人关系（大厅串门配对的"理由"来源）
SEED_RELATIONSHIPS = (
    ("lin-che", "chen-mo"),
    ("lin-che", "zhou-ning"),
    ("zhou-ning", "xu-an"),
    ("chen-mo", "su-he"),
    ("su-he", "tang-ke"),
    ("xu-an", "tang-ke"),
)


def seed_world() -> dict:
    """返回深拷贝语义的种子数据（调用方可安全修改）。"""
    agents = [
        {
            "id": agent["id"],
            "name": agent["name"],
            "position": dict(agent["position"]),
            "state": agent["state"],
            "palette": dict(agent["palette"]),
        }
        for agent in SEED_AGENTS
    ]
    modules = [
        {"id": module["id"], "type": module["type"], "position": dict(module["position"])}
        for module in SEED_MODULES
    ]
    return {"agents": agents, "modules": modules}


_VOXEL_PORTRAIT_BY_PERSON = {
    "person-self": "host.png",
    "lin-che": "person_01.png",
    "zhou-ning": "person_02.png",
    "chen-mo": "person_03.png",
    "xu-an": "person_04.png",
    "su-he": "person_05.png",
    "tang-ke": "person_06.png",
}


def _voxel_portrait_for(person_id: str) -> str:
    return _VOXEL_PORTRAIT_BY_PERSON.get(person_id, "host.png")


def _copy_portrait_fact(store, source_name: str, person_id: str, target_name: str) -> str | None:
    """把前端仓库的肖像 PNG 登记为种子事实文件（幂等：已存在则跳过）。

    走 write_fact（append-only + manifest 登记）；源文件缺失返回 None。
    """
    from app.config import REPO_ROOT

    source = REPO_ROOT / "public" / "portraits" / source_name
    if not source.exists():
        return None
    target = store.facts_dir / "seed" / person_id / target_name
    if target.exists():
        return f"facts/seed/{person_id}/{target_name}"
    return store.write_fact("seed", person_id, target_name, source.read_bytes())


def seed_demo_packages(store) -> int:
    """把 6 个 demo agent 同步为已确认的 demo Package（检索/资料包 demo 数据）。

    幂等：people/<person_id>/profile.json 已存在则跳过。bio 落为种子事实
    （facts/seed/<pid>/note.v1.md），推断标签携带真实事实指针；
    face_ref / real_face_ref / encounter photos 指向真实肖像文件
    （现场照暂用他人肖像占位，TODO：待真实物理输入替换）。
    """
    from app.schemas.package_schema import SCHEMA_VERSION

    created = 0
    for index, agent in enumerate(SEED_AGENTS):
        person_id = agent["id"]
        if (store.people_dir / person_id / "profile.json").exists():
            continue
        note_ref = store.write_fact("seed", person_id, "note.v1.md",
                                    agent["bio"].encode("utf-8"))
        face_ref = _copy_portrait_fact(store, f"photo-derived/voxel/{_voxel_portrait_for(person_id)}", person_id, "face.png")
        # 现场照占位：复用下一位（循环）agent 的肖像。TODO：待真实物理输入替换
        neighbor = SEED_AGENTS[(index + 1) % len(SEED_AGENTS)]
        scene_ref = _copy_portrait_fact(store, f"{neighbor['id']}.png", person_id,
                                        "scene_01.png")
        photos = [ref for ref in (scene_ref, face_ref) if ref]
        package = {
            "schema": SCHEMA_VERSION,
            "person_id": person_id,
            "identity": {
                "confirmed": True,
                "name": agent["name"],
                "face_ref": face_ref,
                "voiceprint_ref": None,
            },
            "encounters": [
                {
                    "encounter_id": "enc_seed",
                    "time": agent["met_at"],
                    "place": agent["met_at"],
                    "facts": {"media": [], "transcript": None, "photos": photos},
                    "inferences": [
                        {
                            "id": "inf_seed_tags",
                            "type": "interest-tag",
                            "value": "、".join(agent["tags"]),
                            "source_facts": [note_ref],
                            "model": "seed.v0",
                            "confidence": 0.9,
                            "created_at": "2026-08-03T00:00:00+00:00",
                        }
                    ],
                    "privacy": "agent-usable",  # privacy 字段保留（首版不执行过滤，TBD-P3）
                }
            ],
            "avatar": {
                "type": "lowpoly-faceless-v1",
                "palette": dict(agent["palette"]),
                "real_face_ref": face_ref,
            },
            "relations": [],
        }
        store.save_package(package)
        created += 1
    _seed_relations_md(store)
    return created


def _seed_relations_md(store) -> None:
    """把熟人关系写进 relations.md（格式：人名 | 关系 | 关键词 | 来源事件）。

    幂等：目标行已存在则跳过。关键词取对方的前两个标签（demo 语料）。
    """
    names = {agent["id"]: agent["name"] for agent in SEED_AGENTS}
    tags = {agent["id"]: agent["tags"] for agent in SEED_AGENTS}
    for first, second in SEED_RELATIONSHIPS:
        for person, other in ((first, second), (second, first)):
            relations_md = store.ensure_person_dir(person) / "relations.md"
            line = (f"{names[other]} | 旧识 | {', '.join(tags[other][:2])} | enc_seed\n")
            existing = relations_md.read_text(encoding="utf-8")
            if line not in existing:
                with relations_md.open("a", encoding="utf-8") as fh:
                    fh.write(line)
