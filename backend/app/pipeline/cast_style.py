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

# 按人定制的 i2i 提示词覆盖（默认提示词对个别人失效时的人工修正，
# build_cast_avatars 与 dev_lab 的 _generate_tile_set 都走这里）
CUSTOM_I2I_PROMPTS = {
    # tang-ke：i2i 把她的细框眼镜画成白片墨镜；显式要求细框透明镜片 + 不叠加程序化眼镜
    ("tang-ke", "head_front"): (
        "Take the person in the reference photo and draw the FRONT face of the "
        "head, facing the viewer, as a single 16x16 retro pixel-art game skin "
        "texture tile for a Minecraft-style voxel character head. She has long "
        "dark brown-black hair tied back and wears THIN DARK-FRAMED glasses "
        "with CLEAR TRANSPARENT lenses: the eyes must stay visible as dark "
        "pixels behind the frames, never white or opaque lenses. Aesthetic "
        "rules: two big bold near-black square eyes (each 2x3 pixels); skin in "
        "exactly two flat tones; hair as one bold clean silhouette mass; high "
        "contrast, rich but flat colors. Drawn on an exact 16x16 pixel grid: "
        "chunky visible pixels, at most 10 flat colors, strictly no "
        "anti-aliasing, no gradients, no shading glow, no text, no logo, no "
        "watermark. The head is centered and fills most of the frame, isolated "
        "on a solid flat magenta background (#FF00FF) with no shadow and no border."
    ),
    # su-he：用户亲调的 16-bit JRPG 肖像提示词（2026-08-06，效果验收通过）——
    # 精致 JRPG 肖像风 + MC 方块头格式；刘海不过眉、两侧框发、设计感五官
    ("su-he", "head_front"): (
        "Take the person in the reference photo and reinterpret her face as a "
        "beautifully designed premium 16-bit retro JRPG character portrait, "
        "while preserving the exact output format of a Minecraft-style voxel "
        "character head skin texture. Draw only the FRONT face of the head, "
        "facing directly toward the viewer, as one single square 16x16 "
        "pixel-art texture tile. Preserve the person's most recognizable "
        "facial identity from the reference image, especially her face shape, "
        "hairstyle, hair color, eyebrow shape, eye spacing, expression, and "
        "distinctive facial features. Simplify these features intelligently "
        "for a 16x16 pixel grid without making the face generic. She has "
        "long, straight black hair. The fringe must remain strictly ABOVE the "
        "eyebrows and occupy only the top 4 to 5 pixel rows. The long hair "
        "should frame the bare face only along the far left and far right "
        "edges of the tile. Never allow any hair strand to overlap, obscure, "
        "or touch the eyes. The entire central face area must remain clearly "
        "visible. Give her two large, bold, near-black square eyes, "
        "approximately 2x3 pixels each, with carefully placed one-pixel "
        "highlights only when they improve expression and readability. Use "
        "expressive but restrained retro JRPG facial design, balanced "
        "symmetry, clean eyebrow placement, a minimal one-pixel nose "
        "indication, and a small elegant mouth. Use exactly two flat skin "
        "tones: one main skin tone and one darker accent tone, the darker "
        "tone used sparingly to define the nose, lower face, ears, or facial "
        "contour. Art direction: elegant handcrafted 16-bit JRPG portrait "
        "pixel art, refined arcade-era sprite design, attractive character "
        "proportions, strong silhouette, carefully controlled pixel "
        "clusters, intentional color placement, expressive eyes, polished "
        "retro game character design, rich but flat colors, high contrast, "
        "clean visual hierarchy. Drawn on an exact 16x16 pixel grid, every "
        "pixel aligned perfectly, chunky clearly visible square pixels, at "
        "most 10 total flat colors including the background. The head is "
        "centered and fills most of the tile, isolated on a solid flat "
        "magenta background, exact color #FF00FF. No shadow, no border, no "
        "surrounding body, no neck, no shoulders, no accessories, no "
        "environment. True 16x16 pixel art, hard pixel edges, nearest-"
        "neighbor appearance."
    ),
}


def i2i_prompt_for(person_id: str, view: str) -> str:
    """按人取提示词：有定制用定制，否则用管线默认。"""
    from app.pipeline.texture_gen import build_i2i_prompt

    return CUSTOM_I2I_PROMPTS.get((person_id, view)) or build_i2i_prompt(view)


def generate_cast_tiles(person_id: str, face_bytes: bytes | None, image_provider,
                        cache_dir, prompts: dict | None = None) -> tuple[dict, str, list[str]]:
    """卡司五面瓦片生成：逐面走 定制/默认 提示词（缓存键=模型+prompt+参考图，
    复跑只花新提示词的钱）；head_front 额外深色眼睛锚定。
    返回 (tiles, model, notes)。"""
    from pathlib import Path

    from app.pipeline import texture_gen

    cache_dir = Path(cache_dir)
    tiles, notes = {}, []
    for view in texture_gen._I2I_VIEWS:
        prompt = (prompts or {}).get(view) or i2i_prompt_for(person_id, view)
        cache_path = texture_gen._tile_cache_path(
            cache_dir, image_provider.model, prompt, face_bytes)
        raw = cache_path.read_bytes() if cache_path.exists() else None
        if raw is None:
            raw = image_provider.generate_image(
                prompt, images=[face_bytes] if face_bytes else None)
            record = image_provider.call_log[-1] if image_provider.call_log else None
            if record is not None and record.mock:
                notes.append(f"{view}: 生图降级 mock，跳过")
                continue
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_bytes(raw)
        try:
            tiles[view] = texture_gen.postprocess_i2i_tile(
                raw,
                anchor_eyes=(view == "head_front"),
                hair_mass=(view in ("head_top", "head_back")),
            )
        except Exception as exc:
            notes.append(f"{view}: 后处理失败（{type(exc).__name__}）")
    return tiles, image_provider.model, notes


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
