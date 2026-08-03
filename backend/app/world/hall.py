"""展位大厅（Expo Hall）：展位锚点布局 + 展位注册表 + 展示内容组装。

目的：落地 MVP1.5 的两级世界之一 —— 大厅负责陈列与找回（每个 Package 一个
      展位，人静立展位上不走动，呼应"无增量信息不演化"）。
输入：展位序号（布局按需扩容）；person_id（HallRegistry 幂等分配）。
输出：booth_anchor(index) -> {"x","z","yaw"}；HallRegistry.assign -> 展位分配；
      build_display_from_package -> 展位展示数据（名牌/人像/相框/标签）。
验收：tests/test_hall.py —— 布局间距 ≥2.2m、边界内、出生区留空、面向大厅中心；
      注册幂等；display 的 tags 只含 ≥L2 推断（绝不带 self-only）。

布局算法（双排网格，沿大厅远墙向中心排布）：
  - 大厅有效区域 x∈[-7,7]、z∈[-5,5]；出生区 z>4 留空（入口侧）；
  - 6 列 x∈{-6,-3.6,-1.2,1.2,3.6,6}（列距 2.4m），行从 z=-4.2 起、行距 2.2m，
    最近邻间距 ≥2.2m；容量 6 列×4 行=24 展位，超出后行继续向入口方向扩容；
  - 每个展位面向大厅中心：yaw = atan2(-x, -z)（与 MODEL_FORWARD (0,0,1) 一致）。
"""

import math

# 大厅有效区域（前端大厅地坪 16×12m 留边）
HALL_BOUNDS = {"min_x": -7.0, "max_x": 7.0, "min_z": -5.0, "max_z": 5.0}
SPAWN_FREE_Z = 4.0  # 出生区 z>4 留空，不放展位

BOOTH_COLUMNS = (-6.0, -3.6, -1.2, 1.2, 3.6, 6.0)  # 列距 2.4m
BOOTH_ROW_Z_START = -4.2                            # 第一排贴远墙
BOOTH_ROW_STEP = 2.2                                # 行距（保证最近邻 ≥2.2m）


def booth_anchor(index: int) -> dict:
    """第 index 个展位锚点（0 起）：双排网格按行填充，面向大厅中心。"""
    if index < 0:
        raise ValueError("展位序号必须 ≥ 0")
    row, col = divmod(index, len(BOOTH_COLUMNS))
    x = BOOTH_COLUMNS[col]
    z = BOOTH_ROW_Z_START + row * BOOTH_ROW_STEP
    return {"x": x, "z": z, "yaw": math.atan2(-x, -z)}


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


# Agent 互动/展示可携带的最低权限（≥ L2；与 memory.store 同一常量语义）
AGENT_VISIBLE_PRIVACY = ("agent-usable", "org-shared", "public-approved")


def _first_sentence(text: str) -> str:
    for piece in text.replace("\n", "。").replace("！", "。").replace("？", "。").split("。"):
        piece = piece.strip().lstrip("#").strip()
        if piece:
            return piece
    return ""


def build_display_from_package(package: dict, store=None) -> dict:
    """从 Package 组装展位展示数据（快照 modules[*].display）。

    权限红线：tags/photos/headline 只取 privacy ≥ agent-usable 的 encounter
    （self-only 内容绝不上展位背景墙）。多用户世界需再按 viewer 过滤（计划 §2.1 注）。
    """
    tags, photos, headline = [], [], ""
    md_refs = []
    for encounter in package.get("encounters", []):
        if encounter.get("privacy") not in AGENT_VISIBLE_PRIVACY:
            continue
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
    # headline = bio 首句（从 ≥L2  encounter 关联的 md 事实里读）
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
