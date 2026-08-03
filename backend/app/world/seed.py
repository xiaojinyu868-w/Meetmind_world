"""种子数据：1 个咖啡厅模块 + 6 个 demo agent（及其 demo Package）。

目的：为 World Service 提供初始世界（MVP1 stub），调色板与前端
      src/data/demoPeople.js 保持一致，保证前后端 demo 观感统一；
      同步把 6 人落成已确认的 demo Package，让检索/资料包接口开箱有数据。
输入：无。
输出：seed_world() -> {"agents", "modules"}；seed_demo_packages(store) -> 新建数量。
验收：tests/test_snapshot.py —— 由种子生成的快照通过 echo-snapshot.v1 校验；
      tests/test_search.py —— name 检索命中种子数据。
"""

# 与前端 demoPeople.js 对齐的 6 个 NPC（调色板/姓名/相遇信息）
SEED_AGENTS = [
    {
        "id": "lin-che",
        "name": "林澈",
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
        "name": "周宁",
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
        "name": "陈默",
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
        "name": "许安",
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
        "name": "苏禾",
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
        "name": "唐可",
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


def seed_demo_packages(store) -> int:
    """把 6 个 demo agent 同步为已确认的 demo Package（检索/资料包 demo 数据）。

    幂等：people/<person_id>/profile.json 已存在则跳过。bio 落为种子事实
    （facts/seed/<pid>/note.v1.md），推断标签携带真实事实指针。
    """
    from app.schemas.package_schema import SCHEMA_VERSION

    created = 0
    for agent in SEED_AGENTS:
        person_id = agent["id"]
        if (store.people_dir / person_id / "profile.json").exists():
            continue
        note_ref = store.write_fact("seed", person_id, "note.v1.md",
                                    agent["bio"].encode("utf-8"))
        package = {
            "schema": SCHEMA_VERSION,
            "person_id": person_id,
            "identity": {
                "confirmed": True,
                "name": agent["name"],
                "face_ref": None,
                "voiceprint_ref": None,
            },
            "encounters": [
                {
                    "encounter_id": "enc_seed",
                    "time": agent["met_at"],
                    "place": agent["met_at"],
                    "facts": {"media": [], "transcript": None, "photos": []},
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
                    "privacy": "agent-usable",  # demo 世界里的 Agent 可携带（≥ L2）
                }
            ],
            "avatar": {
                "type": "lowpoly-faceless-v1",
                "palette": dict(agent["palette"]),
                "real_face_ref": None,
            },
            "relations": [],
        }
        store.save_package(package)
        created += 1
    return created
