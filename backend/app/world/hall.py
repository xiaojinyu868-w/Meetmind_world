"""展位大厅（Expo Hall / 露天集市街道）：展位锚点布局 + 展位注册表 + 展示内容组装。

目的：落地 MVP1.5 的两级世界之一 —— 大厅负责陈列与找回（每个 Package 一个
      展位，人静立展位上不走动，呼应"无增量信息不演化"；串门见 hall_runtime）。
输入：展位序号（布局按需扩容）；person_id（HallRegistry 幂等分配）。
输出：booth_anchor(index) -> {"x","z","yaw"}；HallRegistry.assign -> 展位分配；
      build_display_from_package -> 展位展示数据（名牌/人像/相框/标签）。
验收：tests/test_hall.py —— 两排交替、朝向街道中心、间距 ≥2.2m、边界内、
      出生区留空；注册幂等；display 的 tags 只含 ≥L2 推断（绝不带 self-only）。

布局算法（露天集市街道：主通道 x∈[-3,3]，摊位街道两侧两排）：
  - 左排 x=-3.8（yaw=+90°，朝 +x 即街道中心），右排 x=+3.8（yaw=-90°）；
  - z 从 -9 起，每侧行距 2.4m 交替填充（第 0 个左排 z=-9，第 1 个右排 z=-9，
    第 2 个左排 z=-6.6……）；同侧相邻 2.4m、对街 7.6m，间距 ≥2.2m；
  - 容量两侧各 8 排 = 16（z ≤ 8 为止），出生区 z>8.5 留空；
  - 大厅边界 x∈[-6,6]、z∈[-10.5,10.5]（WorldService 实例化处同步传入）。
"""

import math

# 大厅有效区域（露天集市街道：主通道 x∈[-3,3]、z∈[-10,10] 留边；
# 街道边界 x∈[-5.5,5.5]，摊位后方由摊位圆壳覆盖，见 world/colliders.py）
HALL_BOUNDS = {"min_x": -5.5, "max_x": 5.5, "min_z": -10.5, "max_z": 10.5}
SPAWN_FREE_Z = 8.5  # 出生区 z>8.5 留空，不放展位

BOOTH_SIDE_X = 3.8          # 两侧摊位到街道中心线的距离（主通道半宽 3 + 摊位退线 0.8）
BOOTH_ROW_Z_START = -9.0    # 第一排（街道尽头）起跑线
BOOTH_ROW_STEP = 2.4        # 同侧行距（≥2.2m 间距要求）
BOOTH_ROW_Z_MAX = 8.0       # 摊位最远 z（出生区留空）
BOOTH_CAPACITY = 16         # 两侧各 8 排

_LEFT, _RIGHT = 0, 1  # 交替填充：偶数序号左排，奇数序号右排


def booth_anchor(index: int) -> dict:
    """第 index 个展位锚点（0 起）：街道两侧交替填充，面向街道中心。"""
    if index < 0:
        raise ValueError("展位序号必须 ≥ 0")
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
