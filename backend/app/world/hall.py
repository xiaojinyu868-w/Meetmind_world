"""展位大厅（小镇 Hub / 箱庭夜集市）：展位锚点布局 + 展位注册表 + 展示内容组装。

目的：落地 MVP1.5 的两级世界之一 —— 大厅负责陈列与找回（每个 Package 一个
      展位，人静立展位上不走动，呼应"无增量信息不演化"；串门见 hall_runtime）。
输入：展位序号（布局按需扩容）；person_id（HallRegistry 幂等分配）。
输出：booth_anchor(index) -> {"x","z","yaw"}；HallRegistry.assign -> 展位分配；
      build_display_from_package -> 展位展示数据（名牌/人像/相框/标签）。
验收：tests/test_hall.py —— 两排交替、朝向街道中心、间距 ≥2.2m、边界内、
      出生区留空；注册幂等；display 全量上墙（首版不过滤 TBD-P3）。

布局算法（村落市集 1.0，2026-08-05 起为唯一场景版本；原始锚点沿用 hub-town 街道契约）：
  - 入口木门在北端（z=-14.5），出生区 z<-12.9 留空，不放展位；
  - 左排 x=-4.0（yaw=+90°，朝 +x 即街道中心），右排 x=+4.0（yaw=-90°）；
  - z 从 -12.6 起，每行左右各一，行距 2.9m（同侧相邻 2.9m、对街 8.0m，≥2.2m）；
  - 街道 4 行 × 2 = 8 + 广场北弧 4（r=5.0）+ 广场外圈 13（r≈8/r≈11 两环，
    经运行时光线采样验证落在开阔草地，南向入口留空）= 容量 25；
  - 村落边界 x∈[-30,30]、z∈[-30,30]（前端 ColliderRegistry 壳同步）。
"""

import math

# 大厅有效区域（小镇 Hub：篝火广场 (0,2.5) r4.6、咖啡厅西侧、河南岸花园，
# 环境几何见 blender/build_hub_town.py manifest；摊位后方由摊位圆壳覆盖）
HALL_BOUNDS = {"min_x": -14.0, "max_x": 14.0, "min_z": -15.2, "max_z": 15.2}
SPAWN_FREE_Z = -12.9  # 出生区 z<-12.9（入口木门内）留空，不放展位

BOOTH_SIDE_X = 4.0          # 两侧摊位到街道中心线的距离（PAD_Booth 中心）
BOOTH_ROW_Z_START = -12.6   # 第一排（入口侧）起跑线
BOOTH_ROW_STEP = 2.9        # 行距（同侧相邻 2.9m，≥2.2m 间距要求）
BOOTH_ROW_Z_MAX = -3.9      # 摊位最远 z（篝火广场留空）
BOOTH_STREET_COUNT = 8      # 街道 4 行 × 两侧
# 广场北弧 4 摊（r=5.0，面朝广场中心；与 PAD_Booth_Arc 一致）——广场是人流终点，摊位在弧上收尾
PLAZA_CENTER = (0.0, 2.5)
PLAZA_ARC_ANGLES = (-55.0, -25.0, 25.0, 55.0)  # 0=正北，度
PLAZA_ARC_RADIUS = 5.0
BOOTH_CAPACITY = 12         # 街道 8 + 广场北弧 4


def _plaza_arc_anchor(angle_deg: float) -> dict:
    angle = math.radians(angle_deg)
    x = PLAZA_CENTER[0] + PLAZA_ARC_RADIUS * math.sin(angle)
    z = PLAZA_CENTER[1] - PLAZA_ARC_RADIUS * math.cos(angle)
    yaw = math.atan2(PLAZA_CENTER[0] - x, PLAZA_CENTER[1] - z)
    return {"x": x, "z": z, "yaw": yaw}

BOOTH_CAPACITY = 25         # 街道 8 + 广场北弧 4 + 广场外圈 13（2026-08-05 村落 1.0 扩容）

# 广场外圈 13 摊（2026-08-05 村落 1.0 扩容）：位置经运行时光线采样验证落在开阔草地
# （剔除建筑屋顶/水面/河面），离篝火 ≥3.2m、离内圈锚点 ≥2.8m、互相 ≥2.6m；
#  yaw 面向广场中心（与内圈弧同款）
PLAZA_OUTER_ANCHORS = (
    # 内环 r≈8（7 摊）
    (0.0, -5.5), (7.61, 4.97), (4.7, 8.97), (0.0, 10.5), (-4.7, 8.97), (-7.61, 4.97), (-7.61, 0.03),
    # 外环 r≈11（6 摊，南侧入口方向留空）
    (0.0, -8.5), (8.6, -4.36), (10.72, 4.95), (-8.6, 9.36), (-10.72, 0.05), (-8.6, -4.36),
)


def _facing_plaza_anchor(x: float, z: float) -> dict:
    return {"x": x, "z": z, "yaw": math.atan2(PLAZA_CENTER[0] - x, PLAZA_CENTER[1] - z)}


_LEFT, _RIGHT = 0, 1  # 交替填充：偶数序号左排，奇数序号右排


def booth_anchor(index: int) -> dict:
    """第 index 个展位锚点（0 起）：街道两侧交替填充，面向街道中心。"""
    if index < 0:
        raise ValueError("展位序号必须 ≥ 0")
    if index >= BOOTH_CAPACITY:
        raise ValueError(f"展位容量已满（{BOOTH_CAPACITY} 个），等待美术扩容街道")
    if index >= BOOTH_STREET_COUNT + len(PLAZA_ARC_ANGLES):
        x, z = PLAZA_OUTER_ANCHORS[index - BOOTH_STREET_COUNT - len(PLAZA_ARC_ANGLES)]
        return _facing_plaza_anchor(x, z)
    if index >= BOOTH_STREET_COUNT:
        return _plaza_arc_anchor(PLAZA_ARC_ANGLES[index - BOOTH_STREET_COUNT])
    row, side = divmod(index, 2)
    z = BOOTH_ROW_Z_START + row * BOOTH_ROW_STEP
    if z > BOOTH_ROW_Z_MAX:
        raise ValueError(f"展位容量已满（{BOOTH_CAPACITY} 个），等待美术扩容街道")
    x = -BOOTH_SIDE_X if side == _LEFT else BOOTH_SIDE_X
    yaw = math.pi / 2 if side == _LEFT else -math.pi / 2  # 左排朝 +x，右排朝 -x
    return {"x": x, "z": z, "yaw": yaw}


class HallRegistry:
    """person_id ↔ booth 的幂等分配表（纯内存；重启由种子/confirm 重建）。"""

    def __init__(self):
        self._index_by_person: dict = {}

    def assign(self, person_id: str) -> dict:
        """分配展位（幂等：已分配返回原展位）。返回 {booth_id, position}。"""
        if person_id not in self._index_by_person:
            self._index_by_person[person_id] = len(self._index_by_person)
        index = self._index_by_person[person_id]
        return {"booth_id": f"booth_{person_id}", "position": booth_anchor(index)}

    def booth_of(self, person_id: str) -> str | None:
        return f"booth_{person_id}" if person_id in self._index_by_person else None

    def __len__(self) -> int:
        return len(self._index_by_person)


# Agent 上下文视图的权限圈层常量——首版不执行过滤（2026-08-03 产品决策，TBD-P3），
# 保留常量供授权机制重议后恢复过滤（见 git 历史）。
AGENT_VISIBLE_PRIVACY = ("agent-usable", "org-shared", "public-approved")


def _first_sentence(text: str) -> str:
    for piece in text.replace("\n", "。").replace("！", "。").replace("？", "。").split("。"):
        piece = piece.strip().lstrip("#").strip()
        if piece:
            return piece
    return ""


def build_display_from_package(package: dict, store=None) -> dict:
    """从 Package 组装展位展示数据（快照 modules[*].display）。

    首版不执行权限过滤（2026-08-03 产品决策，TBD-P3）：tags/photos/headline
    全量取——所有 encounter 的推断值与照片都上墙，减少架构负担；
    授权机制重议后恢复 ≥L2 过滤（见 git 历史）。privacy 字段保留（默认 L1）。
    """
    tags, photos, headline = [], [], ""
    md_refs = []
    for encounter in package.get("encounters", []):
        # 首版不过滤：不再按 privacy 跳过 encounter
        facts = encounter.get("facts") or {}
        for ref in [facts.get("transcript"), *(facts.get("media") or [])]:
            if isinstance(ref, str) and ref.endswith(".md"):
                md_refs.append(ref)
        for inference in encounter.get("inferences", []):
            value = str(inference.get("value") or "").strip()
            if value and value not in tags:
                tags.append(value)
            for ref in inference.get("source_facts") or []:
                if isinstance(ref, str) and ref.endswith(".md"):
                    md_refs.append(ref)
        for photo in facts.get("photos") or []:
            if photo not in photos:
                photos.append(photo)
    # headline = bio 首句（从 encounter 关联的 md 事实里读）
    if store is not None:
        for ref in md_refs:
            try:
                headline = _first_sentence(store.read_fact(ref).decode("utf-8"))
            except Exception:
                continue
            if headline:
                break
    if not headline:
        fallback = package.get("encounters") or [{}]
        headline = tags[0] if tags else (fallback[0].get("place") or "")
    return {
        "name": package["identity"].get("name") or package["person_id"],
        "headline": headline[:60],
        "face_ref": package["identity"].get("face_ref"),
        "photos": photos[:2],
        "tags": tags[:5],
        "palette": dict((package.get("avatar") or {}).get("palette") or {}),
    }
