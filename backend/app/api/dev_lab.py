"""Texture Lab：人物像素贴图的可视化调试台（/api/dev/texture-lab）。

目的：风格调试不再靠改代码重跑——页面上改提示词、看参考图与原始/后处理
      瓦片、合成 atlas、一键重建 GLB 并写回 Package。
接口（全部 Bearer 鉴权，复用 PHYSICAL_AI_AGENT_TOKEN；页面本身公开）：
  GET  /api/dev/texture-lab              调试台页面（HTML）
  GET  /api/dev/texture-lab/people       可调试人物（dev-lab 素材 + 包名）
  GET  /api/dev/texture-lab/defaults/{person_id}  默认提示词 + spec 特征
  POST /api/dev/texture-lab/tile         单瓦片试生成（raw + 后处理对照）
  POST /api/dev/texture-lab/atlas        按当前提示词组 atlas 预览（不落盘）
  POST /api/dev/texture-lab/apply        全量重建（瓦片+atlas+GLB+胸像+包登记）
"""

from __future__ import annotations

import base64
import hmac
import io
import time
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.agents.llm import base as llm_base
from app.config import get_physical_ai_token
from app.pipeline import texture_gen, voxel_gen
from app.pipeline.cast_style import (
    CAST_ORDER,
    GLASSES_CAST,
    GLASSES_ROW_OVERRIDE,
    PALETTE_OVERRIDES,
    apply_glasses_overlay,
    generate_cast_tiles,
    i2i_prompt_for,
)
from app.pipeline.texture_gen import TextureSet

router = APIRouter(prefix="/api/dev/texture-lab", tags=["dev-texture-lab"])

AVATAR_TYPE = "voxel-textured.v1"
_I2I_VIEWS = tuple(texture_gen._I2I_VIEWS)


def _authorize(authorization: str | None) -> None:
    expected = get_physical_ai_token()
    if not expected:
        raise HTTPException(status_code=503, detail="PHYSICAL_AI_AGENT_TOKEN 未配置")
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="Bearer token 无效")


def _lab_dir(request: Request, person_id: str) -> Path:
    root = Path(request.app.state.store.root)
    directory = root / "derived" / "dev-lab" / person_id
    if not directory.is_dir():
        raise HTTPException(status_code=404,
                            detail=f"无调试素材：{person_id}（derived/dev-lab/ 下缺目录）")
    return directory


def _reference_bytes(directory: Path, use_reference: bool) -> bytes | None:
    if not use_reference:
        return None
    face = directory / "face.jpg"
    return face.read_bytes() if face.is_file() else None


def _b64_png(image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _spec_for(request: Request, person_id: str) -> dict:
    directory = _lab_dir(request, person_id)
    body = directory / "body.jpg"
    photos = [str(body)] if body.is_file() else []
    cache_dir = Path(request.app.state.store.root) / "derived" / "voxel-pipeline" / person_id / "cache"
    return texture_gen.summarize_visible_traits(
        photos, person_id, vision=llm_base.get_provider("vision"), cache_dir=cache_dir)


@router.get("/people")
def list_people(request: Request, authorization: str | None = Header(default=None)):
    _authorize(authorization)
    store = request.app.state.store
    root = Path(store.root)
    people = []
    for person_id in CAST_ORDER:
        directory = root / "derived" / "dev-lab" / person_id
        name = person_id
        try:
            package = store.load_package(person_id)
            name = package.get("identity", {}).get("name") or person_id
        except Exception:
            pass
        people.append({
            "person_id": person_id,
            "name": name,
            "has_face": (directory / "face.jpg").is_file(),
            "has_body": (directory / "body.jpg").is_file(),
            "face_url": f"../v0/media/derived/dev-lab/{person_id}/face.jpg",
            "body_url": f"../v0/media/derived/dev-lab/{person_id}/body.jpg",
            "glasses": person_id in GLASSES_CAST,
            "palette_override": PALETTE_OVERRIDES.get(person_id),
        })
    return {"people": people, "views": list(_I2I_VIEWS)}


@router.get("/defaults/{person_id}")
def defaults(person_id: str, request: Request,
             authorization: str | None = Header(default=None)):
    _authorize(authorization)
    spec = _spec_for(request, person_id)
    return {
        "prompts": {view: i2i_prompt_for(person_id, view) for view in _I2I_VIEWS},
        "t2i_prompts": texture_gen.build_tile_prompts(spec),
        "visible_traits": spec["visibleTraits"],
        "palette": texture_gen.palette_from_spec(spec),
        "palette_override": PALETTE_OVERRIDES.get(person_id),
    }


class TileRequest(BaseModel):
    person_id: str
    view: str
    prompt: str
    use_reference: bool = True
    anchor_eyes: bool = False


@router.post("/tile")
def try_tile(body: TileRequest, request: Request,
             authorization: str | None = Header(default=None)):
    _authorize(authorization)
    if body.view not in _I2I_VIEWS:
        raise HTTPException(status_code=422, detail=f"未知视角：{body.view}")
    directory = _lab_dir(request, body.person_id)
    reference = _reference_bytes(directory, body.use_reference)
    provider = llm_base.get_provider("image")
    started = time.monotonic()
    raw = provider.generate_image(body.prompt, images=[reference] if reference else None)
    latency_ms = (time.monotonic() - started) * 1000
    record = provider.call_log[-1] if provider.call_log else None
    if record is not None and record.mock:
        raise HTTPException(status_code=502, detail="生图服务不可用（降级 mock），请检查 image 配置")
    result = {
        "raw_png": base64.b64encode(raw).decode("ascii"),
        "model": provider.model,
        "latency_ms": round(latency_ms),
    }
    try:
        tile = texture_gen.postprocess_i2i_tile(raw, anchor_eyes=body.anchor_eyes)
        result["tile_png"] = _b64_png(tile.resize((128, 128), resample=0))
    except Exception as exc:
        result["tile_error"] = f"{type(exc).__name__}: {exc}"
    return result


class AtlasRequest(BaseModel):
    person_id: str
    prompts: dict[str, str] = {}
    use_reference: bool = True


def _generate_tile_set(request: Request, person_id: str, prompts: dict[str, str],
                       use_reference: bool) -> tuple[dict, str, list[str]]:
    """按自定义提示词逐面生成（缓存键=模型+prompt+参考图，复跑只花新提示词的钱）。"""
    directory = _lab_dir(request, person_id)
    reference = _reference_bytes(directory, use_reference)
    cache_dir = Path(request.app.state.store.root) / "derived" / "voxel-pipeline" / person_id / "cache"
    return generate_cast_tiles(
        person_id, reference, llm_base.get_provider("image"), cache_dir, prompts or None)


@router.post("/atlas")
def try_atlas(body: AtlasRequest, request: Request,
              authorization: str | None = Header(default=None)):
    _authorize(authorization)
    spec = _spec_for(request, body.person_id)
    tiles, model, notes = _generate_tile_set(
        request, body.person_id, body.prompts, body.use_reference)
    if body.person_id in GLASSES_CAST and "head_front" in tiles:
        tiles["head_front"] = apply_glasses_overlay(
            tiles["head_front"], GLASSES_ROW_OVERRIDE.get(body.person_id))
    overrides = PALETTE_OVERRIDES.get(body.person_id)
    if overrides:
        spec["visibleTraits"]["outfitPalette"] = [
            overrides["jacket"], overrides["shirt"], overrides["pants"]]
    neutral = texture_gen.compose_atlas(spec, tiles)
    return {
        "atlas_png": _b64_png(neutral.resize((512, 512), resample=0)),
        "tiles": sorted(tiles),
        "model": model,
        "notes": notes,
    }


class ApplyRequest(BaseModel):
    person_id: str
    prompts: dict[str, str] = {}
    use_reference: bool = True


@router.post("/apply")
def apply_build(body: ApplyRequest, request: Request,
                authorization: str | None = Header(default=None)):
    """全量重建并写回 Package（覆盖 derived/voxel-pipeline/<id>/ 产物）。"""
    _authorize(authorization)
    store = request.app.state.store
    spec = _spec_for(request, body.person_id)
    tiles, image_model, notes = _generate_tile_set(
        request, body.person_id, body.prompts, body.use_reference)
    if body.person_id in GLASSES_CAST and "head_front" in tiles:
        tiles["head_front"] = apply_glasses_overlay(
            tiles["head_front"], GLASSES_ROW_OVERRIDE.get(body.person_id))
        spec["visibleTraits"]["glasses"] = True
    if "head_front" in tiles:
        front = tiles["head_front"]
        spec["visibleTraits"]["skinTone"] = texture_gen._dominant_color(front, (4, 12, 12, 16))
        spec["visibleTraits"]["hairColor"] = texture_gen._dominant_color(front, (0, 0, 16, 2))
    overrides = PALETTE_OVERRIDES.get(body.person_id)
    if overrides:
        spec["visibleTraits"]["outfitPalette"] = [
            overrides["jacket"], overrides["shirt"], overrides["pants"]]
    texture_gen.validate_character_spec(spec)
    neutral = texture_gen.compose_atlas(spec, tiles)
    expressions = {name: texture_gen.derive_expression(neutral, name)
                   for name in texture_gen.EXPRESSIONS}
    textures = TextureSet(
        person_id=body.person_id, spec=spec, neutral=neutral,
        expressions=expressions,
        palette=texture_gen.palette_from_spec(spec) | (overrides or {}),
        model=image_model,
        vision_model=spec["provenance"].get("vision", "mock"),
        source_photos=spec.get("sourcePhotos", []),
        tiles=tiles,
    )
    out_dir = Path(store.root) / "derived" / "voxel-pipeline" / body.person_id
    out_dir.mkdir(parents=True, exist_ok=True)
    neutral.save(out_dir / f"{body.person_id}_atlas.png", format="PNG", optimize=True)
    for name, image in expressions.items():
        image.save(out_dir / f"{body.person_id}_{name}.png", format="PNG", optimize=True)
    glb = voxel_gen.generate(
        textures, out_path=out_dir / f"{body.person_id}.glb",
        portrait_path=out_dir / "portrait.png")

    def relative(p):
        p = Path(p)
        return p.relative_to(store.root).as_posix() if p.is_relative_to(store.root) else str(p)

    package = store.load_or_create_draft(body.person_id, textures.palette)
    package["avatar"].update({
        "type": AVATAR_TYPE,
        "palette": textures.palette,
        "model_mode": glb["mode"],
        "model_ref": relative(glb["glb_path"]),
        "atlas_ref": relative(out_dir / f"{body.person_id}_atlas.png"),
        "expression_refs": {
            name: relative(out_dir / f"{body.person_id}_{name}.png")
            for name in texture_gen.EXPRESSIONS
        },
        "portrait_ref": relative(glb.get("portrait_path"))
        if glb.get("portrait_path") else None,
        "texture_model": image_model,
        "vision_model": textures.vision_model,
    })
    store.save_package(package)
    portrait = out_dir / "portrait.png"
    return {
        "applied": True,
        "notes": notes,
        "glb_ref": package["avatar"]["model_ref"],
        "portrait_png": base64.b64encode(portrait.read_bytes()).decode("ascii")
        if portrait.is_file() else None,
    }


_LAB_HTML = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>EchoWorld Texture Lab</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.6 "PingFang SC", "Microsoft YaHei", sans-serif;
         background: #14171c; color: #e8e6e0; }
  header { padding: 14px 20px; border-bottom: 1px solid #2a2f37; display: flex;
           gap: 12px; align-items: center; }
  header h1 { font-size: 16px; margin: 0; }
  header input { flex: 0 0 320px; }
  main { display: grid; grid-template-columns: 260px 1fr; gap: 16px; padding: 16px 20px; }
  section { background: #1b1f26; border: 1px solid #2a2f37; border-radius: 10px; padding: 14px; }
  h2 { font-size: 13px; margin: 0 0 10px; color: #9aa3b0; text-transform: uppercase; letter-spacing: .08em; }
  select, input, textarea, button { background: #11141a; color: #e8e6e0;
    border: 1px solid #343a45; border-radius: 6px; padding: 8px 10px; font: inherit; }
  textarea { width: 100%; min-height: 150px; font-family: ui-monospace, monospace; font-size: 12px; }
  button { cursor: pointer; background: #2f665c; border-color: #2f665c; font-weight: 600; }
  button.secondary { background: #232833; }
  button:disabled { opacity: .5; cursor: wait; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 8px 0; }
  .person { display: flex; gap: 10px; align-items: center; padding: 6px; border-radius: 8px; cursor: pointer; }
  .person.active { background: #232b35; outline: 1px solid #3d4a5a; }
  .person img { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; image-rendering: pixelated; }
  .preview { background: #0e1116; border-radius: 8px; padding: 10px; text-align: center; }
  .preview img { image-rendering: pixelated; max-width: 100%; }
  .preview small { color: #78818e; display: block; margin-top: 6px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  pre { background: #0e1116; border-radius: 8px; padding: 10px; font-size: 11px; overflow: auto; max-height: 220px; }
  #status { color: #9fd6b8; min-height: 20px; }
  .err { color: #f0a0a0; }
</style>
</head>
<body>
<header>
  <h1>🎨 Texture Lab</h1>
  <input id="token" type="password" placeholder="Bearer token（PHYSICAL_AI_AGENT_TOKEN）" />
  <span id="status"></span>
</header>
<main>
  <section>
    <h2>人物</h2>
    <div id="people">载入中…</div>
  </section>
  <section>
    <div class="row">
      <select id="view"></select>
      <label><input id="useRef" type="checkbox" checked /> 使用参考人脸（i2i）</label>
      <label><input id="anchorEyes" type="checkbox" checked /> 深色眼睛锚定</label>
    </div>
    <textarea id="prompt" spellcheck="false"></textarea>
    <div class="row">
      <button id="gen">生成瓦片</button>
      <button id="atlas" class="secondary">按全部视角合成 atlas 预览</button>
      <button id="apply" class="secondary" style="background:#7a3d3d;border-color:#7a3d3d">应用重建（写回世界）</button>
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="preview"><h2>参考人脸</h2><img id="refImg" alt="" /></div>
      <div class="preview"><h2>生成原图</h2><img id="rawImg" alt="" /><small id="meta"></small></div>
      <div class="preview"><h2>后处理瓦片</h2><img id="tileImg" alt="" /></div>
      <div class="preview"><h2>Atlas / 胸像</h2><img id="atlasImg" alt="" /></div>
    </div>
    <h2 style="margin-top:14px">特征 / 日志</h2>
    <pre id="log"></pre>
  </section>
</main>
<script>
const $ = (id) => document.getElementById(id);
const tokenInput = $("token");
tokenInput.value = localStorage.getItem("textureLabToken") || "";
tokenInput.addEventListener("change", () => localStorage.setItem("textureLabToken", tokenInput.value));
let current = null;
let prompts = {};

async function api(path, options = {}) {
  const response = await fetch(`texture-lab/${path}`, {
    ...options,
    headers: { "content-type": "application/json",
               authorization: `Bearer ${tokenInput.value}`,
               ...(options.headers || {}) },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail ? JSON.stringify(detail.detail) : `HTTP ${response.status}`);
  }
  return response.json();
}

function say(text, isError = false) {
  $("status").textContent = text;
  $("status").className = isError ? "err" : "";
}
function log(value) { $("log").textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2); }

async function loadPeople() {
  const data = await api("people");
  const box = $("people");
  box.innerHTML = "";
  for (const person of data.people) {
    const div = document.createElement("div");
    div.className = "person";
    div.innerHTML = `<img src="${person.face_url}" onerror="this.style.visibility='hidden'" />
      <div><strong>${person.name}</strong><br><small>${person.person_id}${person.glasses ? " · 眼镜" : ""}</small></div>`;
    div.addEventListener("click", () => {
      document.querySelectorAll(".person").forEach((el) => el.classList.remove("active"));
      div.classList.add("active");
      selectPerson(person);
    });
    box.append(div);
  }
  if (!data.people.length) box.textContent = "无可调试人物";
  const view = $("view");
  view.innerHTML = data.views.map((v) => `<option value="${v}">${v}</option>`).join("");
  if (data.people.length) box.firstChild.click();
}

async function selectPerson(person) {
  current = person;
  $("refImg").src = person.face_url;
  $("rawImg").removeAttribute("src"); $("tileImg").removeAttribute("src");
  $("atlasImg").removeAttribute("src"); $("meta").textContent = "";
  const data = await api(`defaults/${person.person_id}`);
  prompts = data.prompts;
  $("prompt").value = prompts[$("view").value] || "";
  log({ visible_traits: data.visible_traits, palette: data.palette, palette_override: data.palette_override });
}

$("view").addEventListener("change", () => { if (current) $("prompt").value = prompts[$("view").value] || ""; });
$("prompt").addEventListener("input", () => { if (current) prompts[$("view").value] = $("prompt").value; });

$("gen").addEventListener("click", async () => {
  if (!current) return;
  $("gen").disabled = true; say("生成中（约 10-30s）…");
  try {
    const data = await api("tile", { method: "POST", body: JSON.stringify({
      person_id: current.person_id, view: $("view").value, prompt: $("prompt").value,
      use_reference: $("useRef").checked, anchor_eyes: $("anchorEyes").checked }) });
    $("rawImg").src = `data:image/png;base64,${data.raw_png}`;
    if (data.tile_png) $("tileImg").src = `data:image/png;base64,${data.tile_png}`;
    $("meta").textContent = `${data.model} · ${data.latency_ms}ms${data.tile_error ? " · " + data.tile_error : ""}`;
    say("完成");
  } catch (error) { say(error.message, true); }
  $("gen").disabled = false;
});

$("atlas").addEventListener("click", async () => {
  if (!current) return;
  $("atlas").disabled = true; say("合成中（未改提示词的视角走缓存）…");
  try {
    const data = await api("atlas", { method: "POST", body: JSON.stringify({
      person_id: current.person_id, prompts, use_reference: $("useRef").checked }) });
    $("atlasImg").src = `data:image/png;base64,${data.atlas_png}`;
    log({ tiles: data.tiles, model: data.model, notes: data.notes });
    say("完成");
  } catch (error) { say(error.message, true); }
  $("atlas").disabled = false;
});

$("apply").addEventListener("click", async () => {
  if (!current) return;
  if (!confirm(`确定用当前提示词重建 ${current.name} 并写回世界？（约 1 分钟）`)) return;
  $("apply").disabled = true; say("全量重建中（瓦片 + atlas + GLB + 胸像 + 写包）…");
  try {
    const data = await api("apply", { method: "POST", body: JSON.stringify({
      person_id: current.person_id, prompts, use_reference: $("useRef").checked }) });
    if (data.portrait_png) $("atlasImg").src = `data:image/png;base64,${data.portrait_png}`;
    log(data);
    say("已写回世界（下一拍/刷新生效）");
  } catch (error) { say(error.message, true); }
  $("apply").disabled = false;
});

loadPeople().catch((error) => say(error.message, true));
</script>
</body>
</html>
"""


@router.get("", response_class=HTMLResponse)
def lab_page():
    return HTMLResponse(_LAB_HTML)
