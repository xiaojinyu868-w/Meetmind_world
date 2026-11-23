"""Room avatars use the project's original five-face voxel atlas contract."""
import base64
import hashlib
import io

from PIL import Image, ImageStat

from app.agents.llm import get_provider
from app.pipeline import texture_gen
from app.pipelines.group_onboarding.detect import crop_face_jpeg

VIEWS = ("head_front", "head_left", "head_right", "head_back", "head_top")


def world_atlas(photo, box, *, use_model=False, provider=None):
    with Image.open(io.BytesIO(photo)) as original:
        image = original.convert("RGB")
    head = crop_face_jpeg(image, box)
    if head:
        with Image.open(io.BytesIO(head)) as portrait:
            face = portrait.resize((24, 24))
    else:
        if use_model:
            raise ValueError("认领区域像素太少，无法绘制模型贴图")
        x = min(image.width-1,max(0,int((box["x"]+box["width"]/2)*image.width)))
        y = min(image.height-1,max(0,int((box["y"]+box["height"]/2)*image.height)))
        face = image.crop((x,y,x+1,y+1)).resize((24,24))
    def tone(source, rect):
        median = ImageStat.Stat(source.crop(rect)).median
        return "#" + "".join(f"{int(value):02x}" for value in median[:3])
    w, h = image.size
    x = min(w-1, max(0, int((box["x"] + .5*box["width"]) * w)))
    y = min(h-1, max(0, int((box["y"] + 1.42*box["height"]) * h)))
    r = max(1, int(min(w, h)*.018))
    outfit = tone(image, (max(0,x-r), max(0,y-r), min(w,x+r+1), min(h,y+r+1)))
    pid = hashlib.sha256(head or face.tobytes()).hexdigest()[:16]
    spec = texture_gen.normalize_character_spec({
        "hairColor": tone(face, (7,2,17,6)), "skinTone": tone(face, (9,12,16,18)),
        "outfitPalette": [outfit], "glasses": False, "signatureItem": None,
    }, pid, ["claimed-face"], {"vision": "local-color-sampling"})
    tiles = {}
    if use_model:
        engine = provider or get_provider("image")
        for view in VIEWS:
            answer = engine.generate_image_result(texture_gen.build_i2i_prompt(view), images=[head])
            if answer.mock:
                raise RuntimeError("形象生成服务暂不可用")
            tiles[view] = texture_gen.postprocess_i2i_hires(base64.b64decode(answer.text))
        atlas = texture_gen.compose_atlas_hires(spec, tiles)
    else:
        atlas = texture_gen.compose_atlas(spec)
    output = io.BytesIO()
    atlas.save(output, "WEBP", lossless=True, method=4)
    return output.getvalue()
