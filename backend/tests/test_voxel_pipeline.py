"""体素贴图生成管线测试（FR-1.5/P-6，ARCHITECTURE.md §5a）。

全部外部调用（vision/image provider、Blender）均以假实现注入或 MockTransport
模拟，不耗真实额度；Blender 装配用例 skipUnless 二进制在场。
"""

import base64
import hashlib
import io
import json
from pathlib import Path

import httpx
import pytest
from PIL import Image

from app.agents.llm.base import LLMResponse
from app.agents.llm.commonstack import CommonStackProvider
from app.config import get_blender_path
from app.packages.store import PackageStore
from app.pipeline import person_builder, texture_gen, voxel_gen
from app.schemas.package_schema import validate_package

# ---------- 假 provider（不碰网络） ----------

FAKE_TRAITS = {
    "hair": "short_tousled",
    "hairColor": "#3A2E28",
    "glasses": True,
    "skinTone": "#D9A27E",
    "bodyTemplate": "regular",
    "outfitPalette": ["#6B8E9E", "#EDE6D6", "#424B54"],
    "signatureItem": "深色挂绳",
}


class FakeVision:
    model = "fake-vision"

    def __init__(self, traits=None, mock=False):
        self.traits = traits or FAKE_TRAITS
        self.mock = mock

    def analyze_image(self, image_bytes, prompt, mime="image/jpeg"):
        return LLMResponse(text=json.dumps(self.traits, ensure_ascii=False),
                           model=self.model, mock=self.mock)


class FakeImage:
    """确定性假生图：按 prompt+参考图 哈希铺色块，带 call_log 兼容 mock 判定。"""

    model = "fake-image"

    def __init__(self, mock=False):
        self.mock = mock
        self.prompts = []
        self.images = []
        self.call_log = []

    def generate_image(self, prompt, images=None):
        self.prompts.append(prompt)
        self.images.append(images)
        material = prompt.encode() + b"".join(
            hashlib.sha256(img).digest() for img in (images or []))
        digest = hashlib.sha256(material).digest()
        image = Image.new("RGB", (64, 64))
        pixels = image.load()
        for y in range(64):
            for x in range(64):
                seed = digest[(x // 8 + y // 8 * 8) % len(digest)]
                pixels[x, y] = (seed, digest[(x + y) % len(digest)],
                                digest[(x * 3 + y) % len(digest)])
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        self.call_log.append(type("Record", (), {"mock": self.mock})())
        return buffer.getvalue()


def fake_head_on_bg_png(bg=(255, 0, 255)) -> bytes:
    """合成"i2i 风格"瓦片原图：纯色背景 + 中央像素头（测键控用）。"""
    from PIL import ImageDraw

    image = Image.new("RGB", (200, 200), bg)
    draw = ImageDraw.Draw(image)
    draw.rectangle((40, 20, 160, 170), fill=(210, 160, 120))  # 头
    draw.rectangle((40, 20, 160, 70), fill=(30, 30, 30))      # 发
    draw.rectangle((70, 95, 85, 110), fill=(20, 20, 20))      # 双眼
    draw.rectangle((115, 95, 130, 110), fill=(20, 20, 20))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class FakeI2IImage(FakeImage):
    """i2i 假生图：带参考图时返回"品红背景像素头"，否则走色块（t2i）。"""

    model = "fake-i2i"

    def generate_image(self, prompt, images=None):
        self.prompts.append(prompt)
        self.images.append(images)
        self.call_log.append(type("Record", (), {"mock": self.mock})())
        if images:
            return fake_head_on_bg_png()
        material = prompt.encode()
        digest = hashlib.sha256(material).digest()
        image = Image.new("RGB", (64, 64))
        pixels = image.load()
        for y in range(64):
            for x in range(64):
                seed = digest[(x // 8 + y // 8 * 8) % len(digest)]
                pixels[x, y] = (seed, digest[(x + y) % len(digest)],
                                digest[(x * 3 + y) % len(digest)])
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()


@pytest.fixture()
def photo(tmp_path):
    path = tmp_path / "photo.png"
    Image.new("RGB", (48, 48), (200, 160, 130)).save(path)
    return str(path)


# ---------- image provider：响应解析与降级 ----------


def _provider(handler, configured=True):
    return CommonStackProvider(
        config={"role": "image", "api_base": "https://mock.local",
                "api_key": "test-key-not-real", "model": "openai/gpt-image-2",
                "configured": configured},
        transport=httpx.MockTransport(handler) if handler else None)


def _png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), (1, 2, 3)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_generate_image_parses_data_url():
    payload = base64.b64encode(_png_bytes()).decode()

    def handler(request):
        return httpx.Response(200, json={"choices": [{"message": {
            "role": "assistant", "content": "",
            "images": [{"url": f"data:image/png;base64,{payload}"}]}}]})

    provider = _provider(handler)
    assert provider.generate_image("像素脸") == _png_bytes()
    record = provider.call_log[-1]
    assert record.mock is False
    assert "test-key-not-real" not in record.input_summary


def test_generate_image_parses_b64_and_content_image_url():
    payload = base64.b64encode(_png_bytes()).decode()

    def handler_b64(request):
        return httpx.Response(200, json={"choices": [{"message": {
            "images": [{"b64_json": payload}]}}]})

    def handler_content(request):
        return httpx.Response(200, json={"choices": [{"message": {
            "content": [{"type": "image_url",
                         "image_url": {"url": f"data:image/png;base64,{payload}"}}]}}]})

    assert _provider(handler_b64).generate_image("x") == _png_bytes()
    assert _provider(handler_content).generate_image("x") == _png_bytes()


def test_generate_image_retries_5xx_once():
    calls = {"n": 0}
    payload = base64.b64encode(_png_bytes()).decode()

    def handler(request):
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(502, json={"error": "boom"})
        return httpx.Response(200, json={"choices": [{"message": {
            "images": [{"url": f"data:image/png;base64,{payload}"}]}}]})

    assert _provider(handler).generate_image("x") == _png_bytes()
    assert calls["n"] == 2


def test_generate_image_falls_back_to_mock_on_error():
    def handler_4xx(request):
        return httpx.Response(400, json={"error": "bad request"})

    def handler_no_image(request):
        return httpx.Response(200, json={"choices": [{"message": {
            "role": "assistant", "content": "没有图"}}]})

    for handler in (handler_4xx, handler_no_image):
        provider = _provider(handler)
        result = provider.generate_image("x")
        assert provider.call_log[-1].mock is True
        Image.open(io.BytesIO(result))  # 仍是合法 PNG


def test_generate_image_mock_deterministic_when_unconfigured():
    provider = _provider(None, configured=False)
    first, second = provider.generate_image("同一 prompt"), provider.generate_image("同一 prompt")
    assert first == second
    assert provider.call_log[-1].mock is True
    assert Image.open(io.BytesIO(first)).size == (128, 128)


def test_image_role_registered():
    from app.agents.llm import base as llm_base

    assert isinstance(llm_base.get_provider("image"), CommonStackProvider)


# ---------- CharacterSpec 校验 ----------


def test_normalize_spec_from_vision_json(photo):
    raw = {"visibleTraits": dict(FAKE_TRAITS), "confidence": {"hair": 0.9}}
    spec = texture_gen.normalize_character_spec(raw, "person_x", [photo])
    texture_gen.validate_character_spec(spec)
    assert spec["designCompletion"] == []
    assert spec["confidence"]["hair"] == 0.9
    assert spec["visibleTraits"]["outfitPalette"][0] == "#6B8E9E"


def test_normalize_spec_marks_unknown_fields_design_completion():
    spec = texture_gen.normalize_character_spec(
        {"visibleTraits": {**FAKE_TRAITS, "hairColor": "not-a-color", "glasses": None}},
        "person_x")
    assert set(spec["designCompletion"]) == {"hairColor", "glasses"}
    assert spec["confidence"]["hairColor"] == 0.0


def test_normalize_spec_low_confidence_falls_back():
    raw = {"visibleTraits": dict(FAKE_TRAITS), "confidence": {"hair": 0.1}}
    spec = texture_gen.normalize_character_spec(raw, "person_x")
    assert "hair" in spec["designCompletion"]


@pytest.mark.parametrize("mutate", [
    lambda s: s.update(schema="wrong"),
    lambda s: s["visibleTraits"].update(ethnicity="x"),  # 敏感属性红线
    lambda s: s["visibleTraits"].update(skinTone="红色"),  # 非 #RRGGBB
    lambda s: s["visibleTraits"].update(bodyTemplate="fat"),  # 非法枚举
    lambda s: s["visibleTraits"].pop("hair"),  # 缺字段
    lambda s: s.update(confidence={"hair": 1.5}),  # 置信度越界
])
def test_validate_character_spec_rejects_bad_specs(mutate):
    spec = texture_gen.normalize_character_spec(
        {"visibleTraits": dict(FAKE_TRAITS)}, "person_x")
    mutate(spec)
    with pytest.raises(texture_gen.CharacterSpecError):
        texture_gen.validate_character_spec(spec)


# ---------- atlas 布局不变量与表情 delta ----------


def test_atlas_layout_invariants(photo):
    textures = texture_gen.generate([photo], "person_x",
                                    vision=FakeVision(), image=FakeImage())
    atlas = textures.neutral
    assert atlas.size == (128, 128) and atlas.mode == "RGBA"
    # 区域互不重叠（PIL 坐标）
    rects = {name: texture_gen._to_pil_rect(name) for name in texture_gen.VOXEL_REGIONS}
    names = sorted(rects)
    for i, a in enumerate(names):
        ax, ay, aw, ah = rects[a]
        for b in names[i + 1:]:
            bx, by, bw, bh = rects[b]
            assert ax + aw <= bx or bx + bw <= ax or ay + ah <= by or by + bh <= ay, \
                f"区域重叠：{a} vs {b}"
    # 无透明渗色
    assert all(p[3] == 255 for p in atlas.getdata())


def test_expression_deltas_only_touch_face_region(photo):
    textures = texture_gen.generate([photo], "person_x",
                                    vision=FakeVision(), image=FakeImage())
    neutral_px = textures.neutral.load()
    x0, y0, x1, y1 = texture_gen.FACE_BOX_PIL
    for name in ("happy", "surprised", "thinking"):
        expr_px = textures.expressions[name].load()
        changed = [(x, y) for y in range(128) for x in range(128)
                   if neutral_px[x, y] != expr_px[x, y]]
        assert changed, f"{name} 表情应与 neutral 有差异"
        assert all(x0 <= x < x1 and y0 <= y < y1 for x, y in changed), \
            f"{name} 的 delta 越出脸部区域"


def test_expression_atlas_matches_reference_style():
    """程序化瓦片 + 参考固定锚点下，happy 表情应画出微笑像素。"""
    spec = texture_gen.normalize_character_spec(None, "person_x")
    atlas = texture_gen.compose_atlas(spec)  # 无生成瓦片 → 程序化脸
    happy = texture_gen.derive_expression(atlas, "happy")
    face = happy.crop(texture_gen.FACE_BOX_PIL)
    accent = (126, 70, 76, 255)
    assert accent in list(face.getdata())


def test_mock_mode_deterministic(photo):
    kwargs = {"vision": FakeVision(), "image": FakeImage()}
    first = texture_gen.generate([photo], "person_x", **kwargs)
    second = texture_gen.generate([photo], "person_x", **kwargs)
    assert list(first.neutral.getdata()) == list(second.neutral.getdata())
    assert first.spec["visibleTraits"] == second.spec["visibleTraits"]


def test_vision_mock_falls_back_to_design_completion(photo):
    textures = texture_gen.generate([photo], "person_x",
                                    vision=FakeVision(mock=True),
                                    image=FakeImage(mock=True))
    assert textures.model == "mock"  # mock 生图不进 atlas
    assert set(textures.spec["designCompletion"]) == set(texture_gen._REQUIRED_TRAITS)


def test_tile_cache_reuses_prompt_hash(photo, tmp_path):
    image = FakeImage()
    cache = tmp_path / "cache"
    texture_gen.generate([photo], "person_x", vision=FakeVision(),
                         image=image, cache_dir=cache)
    calls = len(image.prompts)
    texture_gen.generate([photo], "person_x", vision=FakeVision(),
                         image=image, cache_dir=cache)
    assert len(image.prompts) == calls  # 第二次全部命中缓存
    assert list(cache.glob("tile_*.png"))


def test_spec_cache_pins_vision_output(photo, tmp_path):
    """spec 按照片内容哈希缓存：vision 抖动不得击穿下游生图缓存。"""
    cache = tmp_path / "cache"
    texture_gen.generate([photo], "person_x", vision=FakeVision(),
                         image=FakeImage(), cache_dir=cache)
    assert list(cache.glob("spec_*.json"))
    jittered = FakeVision(traits={**FAKE_TRAITS, "hair": "long_straight"})
    image = FakeImage()
    textures = texture_gen.generate([photo], "person_x", vision=jittered,
                                    image=image, cache_dir=cache)
    assert textures.spec["visibleTraits"]["hair"] == "short_tousled"  # 旧的
    assert image.prompts == []  # spec 稳定 → 瓦片缓存命中 → 零新生图调用


# ---------- GLB 校验 ----------


def test_validate_glb_rejects_non_glb(tmp_path):
    bad = tmp_path / "bad.glb"
    bad.write_bytes(b"not a glb")
    assert voxel_gen.validate_glb(bad)["ok"] is False
    assert voxel_gen.validate_glb(tmp_path / "missing.glb")["ok"] is False


@pytest.mark.skipif(not Path(get_blender_path()).exists(),
                    reason="Blender 二进制不在场")
def test_voxel_gen_real_blender_assembly(tmp_path):
    spec = texture_gen.normalize_character_spec(None, "blender_test")
    atlas = texture_gen.compose_atlas(spec)
    result = voxel_gen.generate(atlas, style={"person_id": "blender_test"},
                                out_path=tmp_path / "person.glb")
    validation = result["validation"]
    assert validation["ok"], validation["issues"]
    assert "ROOT_PhotoCharacter" in validation["nodes"]
    assert validation["height_m"] == pytest.approx(1.65, abs=0.01)
    assert validation["textures"] == 1


# ---------- person_builder 编排（全假注入） ----------


def _fake_voxel_fn(textures, style=None, out_path=None, blender_path=None,
                   portrait_path=None):
    from pathlib import Path

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(b"GLB_FAKE")
    Path(portrait_path).write_bytes(b"PNG_FAKE") if portrait_path else None
    return {"glb_path": str(out), "portrait_path": portrait_path, "mode": "fake",
            "validation": {"ok": True, "issues": [], "height_m": 1.65,
                           "nodes": ["ROOT_PhotoCharacter"]}}


def test_person_builder_orchestration(photo, tmp_path):
    store = PackageStore(root=tmp_path / "data")
    result = person_builder.build(
        "person_x", [photo], store=store, out_dir=tmp_path / "derived" / "person_x",
        vision=FakeVision(), image=FakeImage(), voxel_fn=_fake_voxel_fn,
        cache_dir=tmp_path / "cache")
    package = result["package"]
    validate_package(package)
    avatar = package["avatar"]
    assert avatar["type"] == "voxel-textured.v1"
    # 发色以生成瓦片实测为准（tile-measured），palette 与 spec 保持一致
    assert avatar["palette"]["hair"] == \
        result["textures"].spec["visibleTraits"]["hairColor"]
    assert result["textures"].spec["provenance"]["colors"] == "tile-measured"
    assert avatar["real_face_ref"].startswith("facts/person_x/photo-import/")
    # 表情 atlas 全部落盘且为合法 128x128 PNG
    for name in texture_gen.EXPRESSIONS:
        path = result["texture_paths"]["expressions"][name]
        assert Image.open(path).size == (128, 128)
    # manifest 哈希与文件一致
    for entry in (result["manifest"]["files"]["expressions"].values()):
        digest = hashlib.sha256(
            (tmp_path / "data" / entry["path"]).read_bytes()).hexdigest()
        assert entry["sha256"] == digest
    assert result["asset_entry"]["asset_id"] == "character.photo.person_x.voxel.v1"
    assert result["asset_entry"]["root_node"] == "ROOT_PhotoCharacter"
    # 重跑幂等：事实层指针复用，不抛 FactLayerImmutableError
    again = person_builder.build(
        "person_x", [photo], store=store, out_dir=tmp_path / "derived" / "person_x",
        vision=FakeVision(), image=FakeImage(), voxel_fn=_fake_voxel_fn,
        cache_dir=tmp_path / "cache")
    assert again["package"]["avatar"]["real_face_ref"] == avatar["real_face_ref"]


def test_person_builder_skip_blender(photo, tmp_path):
    store = PackageStore(root=tmp_path / "data")
    result = person_builder.build(
        "person_y", [photo], store=store, out_dir=tmp_path / "derived",
        vision=FakeVision(), image=FakeImage(), skip_blender=True)
    assert result["glb"] is None
    assert result["package"]["avatar"]["model_mode"] == "skipped"


# ---------- i2i 图生图主路径（2026-08-04 决策） ----------


def test_generate_image_builds_i2i_content_array():
    captured = {}
    payload = base64.b64encode(_png_bytes()).decode()

    def handler(request):
        captured["json"] = json.loads(request.content)
        return httpx.Response(200, json={"choices": [{"message": {
            "images": [{"url": f"data:image/png;base64,{payload}"}]}}]})

    provider = _provider(handler)
    provider.generate_image("像素头", images=[b"\xff\xd8fake-jpeg"],
                            image_mime="image/jpeg")
    content = captured["json"]["messages"][0]["content"]
    assert isinstance(content, list)
    assert content[0]["type"] == "text"
    assert content[0]["text"].startswith("Generate an image:")
    assert content[1]["type"] == "image_url"
    assert content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_generate_image_without_images_keeps_string_content():
    captured = {}
    payload = base64.b64encode(_png_bytes()).decode()

    def handler(request):
        captured["json"] = json.loads(request.content)
        return httpx.Response(200, json={"choices": [{"message": {
            "images": [{"url": f"data:image/png;base64,{payload}"}]}}]})

    _provider(handler).generate_image("纯文本生图")
    content = captured["json"]["messages"][0]["content"]
    assert isinstance(content, str)


def test_i2i_tile_chroma_key_removes_background():
    tile = texture_gen.postprocess_i2i_tile(fake_head_on_bg_png())
    assert tile.size == (16, 16)
    # 完全不透明（无渗色）且品红背景被键掉
    assert all(p[3] == 255 for p in tile.getdata())
    assert not any(p[0] > 230 and p[2] > 230 and p[1] < 40
                   for p in tile.getdata())
    # 内容色保留（肤/发/眼）
    colors = {p[:3] for p in tile.getdata()}
    assert len(colors) >= 3


def test_i2i_tile_all_background_is_rejected():
    buffer = io.BytesIO()
    Image.new("RGB", (128, 128), (255, 0, 255)).save(buffer, format="PNG")
    with pytest.raises(ValueError):
        texture_gen.postprocess_i2i_tile(buffer.getvalue())


def test_i2i_tile_without_background_passes_through():
    """模型没听背景指令（边框颜色杂乱）时跳过键控，整幅量化兜底。"""
    image = Image.new("RGB", (64, 64))
    pixels = image.load()
    for y in range(64):
        for x in range(64):
            pixels[x, y] = ((x * 4) % 256, (y * 4) % 256, ((x + y) * 2) % 256)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    tile = texture_gen.postprocess_i2i_tile(buffer.getvalue())
    assert tile.size == (16, 16)
    assert all(p[3] == 255 for p in tile.getdata())


def test_tile_cache_key_includes_reference_hash(photo, tmp_path):
    cache = tmp_path / "cache"
    image = FakeI2IImage()
    texture_gen.generate([photo], "person_x", image=image, cache_dir=cache)
    first_count = len(list(cache.glob("tile_*.png")))
    assert first_count == 5  # 五面 i2i 各一张
    other = tmp_path / "other.png"
    Image.new("RGB", (32, 32), (9, 9, 9)).save(other)
    texture_gen.generate([str(other)], "person_x", image=image, cache_dir=cache)
    assert len(list(cache.glob("tile_*.png"))) == first_count * 2  # 换图即换键


def test_i2i_falls_back_to_text_then_procedural(photo):
    """降级链：i2i mock → 文本 t2i；t2i 也 mock → 程序化瓦片。"""

    class I2IMockOnly(FakeImage):
        def generate_image(self, prompt, images=None):
            self.prompts.append(prompt)
            self.images.append(images)
            if images:
                self.call_log.append(type("R", (), {"mock": True})())
                from app.agents.llm.commonstack import _mock_png
                return _mock_png(prompt, images)
            self.call_log.append(type("R", (), {"mock": False})())
            return super().generate_image(prompt, images=None)

    # i2i 失败 → t2i 兜底：头正面/背面有瓦片，侧面/顶面程序化
    textures = texture_gen.generate([photo], "person_x", image=I2IMockOnly())
    assert set(textures.tiles) == {"head_front", "head_back"}
    assert textures.model == "fake-image"
    assert all(p[3] == 255 for p in textures.neutral.getdata())
    # t2i 也失败 → 全程序化
    textures2 = texture_gen.generate([photo], "person_x",
                                     image=FakeImage(mock=True))
    assert textures2.tiles == {} and textures2.model == "mock"


def test_i2i_tiles_feed_all_five_head_faces(photo):
    textures = texture_gen.generate([photo], "person_x", image=FakeI2IImage())
    assert set(textures.tiles) == {"head_front", "head_back", "head_left",
                                   "head_right", "head_top"}
    assert textures.model == "fake-i2i"
    assert all(p[3] == 255 for p in textures.neutral.getdata())


def test_spec_from_photo_sampling(tmp_path):
    """CharacterSpec 照片像素采样：分区主色 + 不可采样字段设计补全。"""
    from PIL import ImageDraw

    image = Image.new("RGB", (300, 400), (205, 160, 120))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 300, 60), fill=(35, 30, 28))       # 顶部发
    draw.rectangle((0, 240, 300, 400), fill=(90, 110, 130))  # 下部衣服
    photo = tmp_path / "person.png"
    image.save(photo)
    spec = texture_gen.spec_from_photo(str(photo), "person_x")
    texture_gen.validate_character_spec(spec)
    traits = spec["visibleTraits"]
    assert traits["skinTone"] == "#C09078"   # 肤色过滤采样
    assert traits["hairColor"] == "#181818"  # 顶部最暗主色
    assert traits["outfitPalette"] == ["#5A6E82"]  # 胸部条带主色
    assert set(spec["designCompletion"]) == {"hair", "glasses", "bodyTemplate"}
    assert spec["provenance"]["vision"] == "photo-sampling"
