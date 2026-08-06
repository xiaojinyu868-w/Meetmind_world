"""卡司固定风格常量与程序化叠加（build_cast_avatars.py 与 dev_lab 共用）。

人工 ground truth（对照团队合照逐人核对，2026-08-06）：配色表避免 vision
把挂绳/肤色误报进服装色；眼镜叠加保证 16x16 瓦片必现（生图必丢）。
"""

from __future__ import annotations

CAST_ORDER = ["lin-che", "zhou-ning", "chen-mo", "xu-an", "su-he", "tang-ke"]

PALETTE_OVERRIDES = {
    "lin-che":   {"jacket": "#655A73", "shirt": "#2B2B30", "pants": "#2E3A54", "shoes": "#E8E8E8"},
    "zhou-ning": {"jacket": "#F2F2F0", "shirt": "#F2F2F0", "pants": "#24262B", "shoes": "#B3453F"},
    "chen-mo":   {"jacket": "#9BA1A6", "shirt": "#9BA1A6", "pants": "#8F959B", "shoes": "#6B5CA8"},
    "xu-an":     {"jacket": "#1D1D20", "shirt": "#1D1D20", "pants": "#1D1D20", "shoes": "#2A2A2E"},
    "su-he":     {"jacket": "#F5F2EA", "shirt": "#FFFFFF", "pants": "#B8A88C", "shoes": "#F0F0EC"},
    "tang-ke":   {"jacket": "#1F1F22", "shirt": "#1F1F22", "pants": "#A8B8C8", "shoes": "#F0F0EC"},
}

GLASSES_CAST = {"zhou-ning", "chen-mo", "xu-an", "tang-ke"}
GLASSES_COLOR = (38, 38, 44, 255)  # 深灰细框（不用纯黑，避免与眼睛糊成一团）
# 个别人的 i2i 瓦片刘海遮住自动暗行定位（眼镜叠到头发上隐身），人工指定行
GLASSES_ROW_OVERRIDE = {"chen-mo": 9}


def _eye_row(tile, columns) -> int:
    """在 6..10 行里找指定列范围最暗的一行（眼睛所在行）。"""
    darkest_row, darkest_value = 8, None
    for y in range(6, 11):
        value = sum(sum(tile.getpixel((x, y))[:3]) for x in columns)
        if darkest_value is None or value < darkest_value:
            darkest_row, darkest_value = y, value
    return darkest_row


def apply_glasses_overlay(front_tile, row_override: int | None = None):
    """在 head_front 瓦片上画细框像素眼镜：双眼定位 → 镜片框 + 鼻梁 + 镜腿。"""
    tile = front_tile.convert("RGBA")
    if row_override is not None:
        row = row_override
    else:
        left_row = _eye_row(tile, range(2, 8))
        right_row = _eye_row(tile, range(8, 14))
        row = round((left_row + right_row) / 2)
    c = GLASSES_COLOR
    for lens_x in (3, 10):  # 左/右镜片（4x3 框）
        for x in range(lens_x, lens_x + 4):
            tile.putpixel((x, row - 1), c)
            tile.putpixel((x, row + 1), c)
        tile.putpixel((lens_x, row), c)
        tile.putpixel((lens_x + 3, row), c)
    for x in (7, 8):  # 鼻梁
        tile.putpixel((x, row - 1), c)
    tile.putpixel((2, row - 1), c)   # 左镜腿
    tile.putpixel((13, row - 1), c)  # 右镜腿
    return tile
