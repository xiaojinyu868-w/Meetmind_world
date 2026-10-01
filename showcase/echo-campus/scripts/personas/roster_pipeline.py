"""Echo Campus persona roster pipeline (see docs/PERSONA-PIPELINE.md).

Stages per persona: concept (text-to-image, t_pose) -> model (image-to-model) -> rig-check -> rig (v1.0 biped)
-> retargets (FBX, one task per clip). Every accepted task id is journaled before anything else happens, and an
existing journal is never resubmitted, so a crash can only cost a poll, never a duplicate charge.

Key: TRIPO3D_API_KEY (or TRIPO_API_KEY) in the environment, or an env file named by TRIPO_KEY_FILE.
Work dir: ECHO_TRIPO_WORK (default ./tripo-work). Usage: python3 roster_pipeline.py auto <ids> [stage] [inflight]
"""
import hashlib, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

BASE = "https://openapi.tripo3d.com/v3"
ROOT = Path(os.environ.get("ECHO_TRIPO_WORK", "tripo-work")).resolve()
JOBS, ASSETS = ROOT / "jobs", ROOT / "assets"
CLIPS = ["standing_relax", "agree", "greet_02", "clap"]

STYLE = ("Original character design for an elegant contemporary architectural social event game. Premium hand-painted 3D "
         "animation art direction, gently stylized adult proportions, beautiful refined visible face, expressive almond eyes, "
         "sculpted layered hair, believable fabric folds, soft muted warm palette. Not chibi, not toy, not photorealistic, not a mannequin. ")
POSE = (" NO bag, NO props in hands, NO floor, NO pedestal, NO text. Strict symmetric T pose arms perfectly horizontal, open relaxed "
        "palms down, straight separated legs, complete hands and feet visible, facing front, clean warm off-white background, even soft "
        "studio light, entire figure centered with generous space.")
PERSONAS = {
    "songshi": "Full body single Chinese man about 58, calm wise warm smile, swept-back silver-gray hair, short neatly trimmed silver beard, round tortoiseshell glasses, charcoal double-breasted wool blazer over a cream fine-knit turtleneck, mid-gray tailored wool trousers, polished cognac brown leather loafers.",
    "zhusha": "Full body single Chinese woman about 25, bright playful confident expression, glossy black blunt chin-length bob with straight bangs, a vermilion red wool beret sitting firmly on the head, oversized mustard yellow knit cardigan over a white crew-neck tee, light blue wide-leg denim jeans, white canvas sneakers.",
    "baizao": "Full body single Chinese man about 23, relaxed curious expression, messy textured black hair with a soft fringe, large white over-ear headphones resting around the neck, navy blue zip hoodie with orange drawstrings, charcoal cargo jogger pants, chunky white and orange sneakers.",
    "qingci": "Full body single Chinese woman about 36, serene elegant expression, sleek black hair in a low bun with a small jade hairpin, modern celadon green new-Chinese style mandarin-collar blouse with knotted frog buttons, cream high-waisted wide-leg trousers, black pointed flats.",
    "qingpao": "Full body single Chinese man about 30, energetic sunny smile, short black undercut hair under a white baseball cap worn forward, lilac lightweight windbreaker jacket, black athletic jogger pants, white and lilac running shoes.",
    "zheshi": "Full body single Chinese man about 32, gentle artistic expression, shoulder-length wavy dark brown hair half tied back, light stubble, rust orange linen shirt untucked with rolled sleeves, olive green wide-leg trousers, brown suede ankle boots.",
    "shuangye": "Full body single Chinese woman about 63, kind sharp intelligent expression, short silver-white pixie haircut, thin gold-rimmed glasses, belted camel trench coat ending at the knee, burgundy silk scarf tied at the neck, dark navy straight trousers, black leather loafers.",
    "mochuan": "Full body single Chinese man about 45, focused friendly expression, clean shaved bald head, full short black beard, black rectangular glasses, black technical zip jacket with thin reflective trim, slate gray tapered trousers, black minimalist sneakers.",
    "shanhu": "Full body single Black woman about 29, warm radiant confident smile, voluminous natural curly afro hair, small gold hoop earrings, coral pink tailored blazer over a white silk top, slim beige ankle trousers, white leather sneakers.",
    "xiaoman": "Full body single Chinese young woman about 20, cheerful bright curious eyes, two long black braids over the shoulders, round thin black glasses, oversized forest green varsity jacket with cream sleeves over a white tee, khaki wide trousers, white canvas sneakers.",
}
# Existing September rigs (same account) only need the extra celebration clip.
LEGACY_RIGS = {"host-female": "b5d1fc54-77e3-48fe-b15d-bc06209ffa8e", "host-male": "22c6ea59-e45a-4322-8ef1-74c58d595710"}


def key():
    for name in ("TRIPO3D_API_KEY", "TRIPO_API_KEY"):
        if os.environ.get(name, "").startswith("tsk_"):
            return os.environ[name]
    env_file = os.environ.get("TRIPO_KEY_FILE")
    if env_file:
        for line in open(env_file, encoding="utf8"):
            match = re.match(r"^\s*TRIPO3?D?_API_KEY\s*=\s*\"?([^\"\s]+)\"?\s*$", line)
            if match:
                return match.group(1)
    raise SystemExit("Tripo key missing: set TRIPO3D_API_KEY or TRIPO_KEY_FILE")


def request(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Authorization": "Bearer " + key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"HTTP {error.code}: " + error.read().decode(errors="replace")[:800]) from None
    if result.get("code", 0) != 0:
        raise RuntimeError(json.dumps(result, ensure_ascii=False)[:800])
    return result


def journal(name):
    return JOBS / f"{name}.json"


def load(name):
    path = journal(name)
    return json.loads(path.read_text(encoding="utf8")) if path.exists() else None


def save(name, record):
    JOBS.mkdir(parents=True, exist_ok=True)
    tmp = journal(name).with_suffix(".tmp")
    tmp.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf8")
    tmp.replace(journal(name))


def task_id(record):
    data = (record or {}).get("response", {}).get("data", {})
    return data.get("task_id") or data.get("id")


def submit(name, endpoint, payload):
    existing = load(name)
    # A 429 is a definitive refusal (nothing was accepted or charged), so it may be retried.
    if existing and not (existing.get("status") == "rejected" and "HTTP 429" in existing.get("error", "")):
        print(json.dumps({"job": name, "existing": task_id(existing), "status": existing.get("status")}), flush=True)
        return existing
    record = {"name": name, "endpoint": endpoint, "payload": payload, "status": "submitting", "at": time.time()}
    save(name, record)
    try:
        result = request("POST", endpoint, payload)
    except RuntimeError as error:
        text = str(error)
        record["status"] = "rejected" if text.startswith(("HTTP 400:", "HTTP 401:", "HTTP 403:", "HTTP 429:")) else "uncertain"
        record["error"] = text
        save(name, record)
        print(json.dumps({"job": name, "status": record["status"], "error": text[:300]}, ensure_ascii=False), flush=True)
        return record
    record["response"], record["status"] = result, "submitted"
    save(name, record)
    print(json.dumps({"job": name, "submitted": task_id(record)}), flush=True)
    return record


def poll(name):
    record = load(name)
    tid = task_id(record)
    if not tid:
        return record
    if record.get("status") == "success" and record.get("files") is not None:
        return record
    data = request("GET", "/tasks/" + tid).get("data", {})
    status = data.get("status")
    record["latest"] = {k: v for k, v in data.items() if k not in ("output", "result", "input")}
    record["status"] = status
    output = data.get("output") if isinstance(data.get("output"), dict) else {}
    record["output_values"] = {k: v for k, v in output.items() if isinstance(v, (bool, int, float)) or (isinstance(v, str) and not v.startswith("http"))}
    if status == "success":
        out = ASSETS / name
        out.mkdir(parents=True, exist_ok=True)
        files = []
        for label, value in output.items():
            if not isinstance(value, str) or not value.startswith("https://"):
                continue
            ext = Path(urllib.parse.urlparse(value).path).suffix.lower()
            if ext not in (".glb", ".fbx", ".png", ".jpg", ".jpeg", ".webp"):
                continue
            dest = out / (re.sub(r"[^A-Za-z0-9_-]", "_", label) + ext)
            if not dest.exists():
                with urllib.request.urlopen(value, timeout=240) as response:
                    dest.write_bytes(response.read())
            files.append({"path": str(dest), "bytes": dest.stat().st_size, "sha256": hashlib.sha256(dest.read_bytes()).hexdigest()})
        record["files"] = files
    save(name, record)
    return record


def wait(names, timeout=900):
    pending = set(names)
    deadline = time.time() + timeout
    while pending and time.time() < deadline:
        for name in sorted(pending):
            try:
                record = poll(name)
            except RuntimeError as error:
                print(json.dumps({"job": name, "pollError": str(error)[:200]}), flush=True)
                continue
            status = (record or {}).get("status")
            if status in ("success", "failed", "banned", "expired", "cancelled", "unknown", "rejected", "uncertain", None):
                pending.discard(name)
                latest = (record or {}).get("latest", {})
                print(json.dumps({"job": name, "status": status, "credits": latest.get("credits_consumed"), "values": (record or {}).get("output_values")}, ensure_ascii=False), flush=True)
        if pending:
            time.sleep(8)
    for name in pending:
        print(json.dumps({"job": name, "status": "still-running"}), flush=True)


def stage_concepts(names):
    jobs = []
    for name in names:
        payload = {"model": "seedream_v5", "template": "t_pose", "size": "2048x2048", "output_format": "png", "watermark": False,
                   "prompt": STYLE + PERSONAS[name] + POSE}
        submit(f"{name}-concept", "/generation/text-to-image", payload)
        jobs.append(f"{name}-concept")
    wait(jobs)


def stage_models(names):
    jobs = []
    for name in names:
        concept = load(f"{name}-concept")
        if not concept or concept.get("status") != "success":
            print(json.dumps({"job": name, "skip": "concept not ready"}), flush=True)
            continue
        payload = {"input": task_id(concept), "model": "v3.1-20260211", "texture": True, "pbr": True, "texture_quality": "detailed",
                   "texture_version": "v3.5-20260815", "delight": True, "face_limit": 24000, "geometry_quality": "standard"}
        submit(f"{name}-model", "/generation/image-to-model", payload)
        jobs.append(f"{name}-model")
    wait(jobs, timeout=1500)


def stage_rig(names):
    checks = []
    for name in names:
        model = load(f"{name}-model")
        if not model or model.get("status") != "success":
            print(json.dumps({"job": name, "skip": "model not ready"}), flush=True)
            continue
        submit(f"{name}-rigcheck", "/animations/rig-check", {"input": task_id(model)})
        checks.append(name)
    wait([f"{n}-rigcheck" for n in checks], timeout=600)
    rigs = []
    for name in checks:
        values = (load(f"{name}-rigcheck") or {}).get("output_values", {})
        if values.get("riggable") is not True or values.get("rig_type") != "biped":
            print(json.dumps({"job": name, "skip": "not riggable biped", "values": values}), flush=True)
            continue
        submit(f"{name}-rig", "/animations/rig", {"input": task_id(load(f"{name}-model")), "model": "v1.0-20240301", "rig_type": "biped", "spec": "tripo", "out_format": "glb"})
        rigs.append(f"{name}-rig")
    wait(rigs, timeout=900)


def stage_animate(names, clips=CLIPS):
    jobs = []
    for name in names:
        rig_id = LEGACY_RIGS.get(name) or (task_id(load(f"{name}-rig")) if (load(f"{name}-rig") or {}).get("status") == "success" else None)
        if not rig_id:
            print(json.dumps({"job": name, "skip": "rig not ready"}), flush=True)
            continue
        for clip in clips:
            submit(f"{name}-anim-{clip}", "/animations/retarget", {"input": rig_id, "animation": "preset:biped:" + clip, "out_format": "fbx", "export_with_geometry": True})
            jobs.append(f"{name}-anim-{clip}")
    wait(jobs, timeout=1200)


FINAL = ("success", "failed", "banned", "expired", "cancelled", "unknown", "uncertain")


def plan(name, last_stage):
    """Ordered (job, endpoint, payload-builder) steps for one persona, up to and including last_stage."""
    if name in LEGACY_RIGS:
        return [(f"{name}-anim-{clip}", "/animations/retarget", lambda clip=clip: {"input": LEGACY_RIGS[name], "animation": "preset:biped:" + clip, "out_format": "fbx", "export_with_geometry": True}) for clip in ["clap"]]
    steps = [
        (f"{name}-concept", "/generation/text-to-image", lambda: {"model": "seedream_v5", "template": "t_pose", "size": "2048x2048", "output_format": "png", "watermark": False, "prompt": STYLE + PERSONAS[name] + POSE}),
        (f"{name}-model", "/generation/image-to-model", lambda: {"input": task_id(load(f"{name}-concept")), "model": "v3.1-20260211", "texture": True, "pbr": True, "texture_quality": "detailed", "texture_version": "v3.5-20260815", "delight": True, "face_limit": 24000, "geometry_quality": "standard"}),
        (f"{name}-rigcheck", "/animations/rig-check", lambda: {"input": task_id(load(f"{name}-model"))}),
        (f"{name}-rig", "/animations/rig", lambda: {"input": task_id(load(f"{name}-model")), "model": "v1.0-20240301", "rig_type": "biped", "spec": "tripo", "out_format": "glb"}),
    ] + [(f"{name}-anim-{clip}", "/animations/retarget", lambda clip=clip: {"input": task_id(load(f"{name}-rig")), "animation": "preset:biped:" + clip, "out_format": "fbx", "export_with_geometry": True}) for clip in CLIPS]
    order = ["concept", "model", "rigcheck", "rig", "anim"]
    keep = order[: order.index(last_stage) + 1]
    return [step for step in steps if any(step[0].endswith("-" + s) or f"-{s}-" in step[0] for s in keep)]


def auto(names, last_stage="anim", max_inflight=2):
    """Drive every persona through its steps; refused (429) submissions back off and retry."""
    backoff_until = 0.0
    while True:
        inflight, done, blocked = 0, True, []
        for name in names:
            for job, endpoint, build in plan(name, last_stage):
                record = load(job)
                status = (record or {}).get("status")
                refused = status == "rejected" and "HTTP 429" in (record or {}).get("error", "")
                if status == "success" and record.get("files") is not None:
                    if job.endswith("-rigcheck"):
                        values = record.get("output_values", {})
                        if values.get("riggable") is not True or values.get("rig_type") != "biped":
                            blocked.append({"job": job, "values": values})
                            break
                    continue
                if status in FINAL or (status == "rejected" and not refused):
                    blocked.append({"job": job, "status": status, "error": (record or {}).get("error", "")[:160]})
                    break
                done = False
                if record and task_id(record):
                    try:
                        record = poll(job)
                    except RuntimeError as error:
                        print(json.dumps({"job": job, "pollError": str(error)[:160]}), flush=True)
                    if record.get("status") == "success":
                        latest = record.get("latest", {})
                        print(json.dumps({"job": job, "status": "success", "credits": latest.get("credits_consumed"), "values": record.get("output_values")}, ensure_ascii=False), flush=True)
                        continue
                    inflight += 1
                    break
                if inflight < max_inflight and time.time() >= backoff_until:
                    result = submit(job, endpoint, build())
                    if result.get("status") == "rejected" and "HTTP 429" in result.get("error", ""):
                        backoff_until = time.time() + 25
                    else:
                        inflight += 1
                break
        if done:
            print(json.dumps({"auto": "finished", "blocked": blocked}, ensure_ascii=False), flush=True)
            return
        time.sleep(6)


def status():
    rows = []
    for path in sorted(JOBS.glob("*.json")):
        record = json.loads(path.read_text(encoding="utf8"))
        latest = record.get("latest", {})
        rows.append({"job": path.stem, "status": record.get("status"), "credits": latest.get("credits_consumed"), "files": [Path(f["path"]).name + ":" + str(f["bytes"]) for f in record.get("files", [])]})
    print(json.dumps(rows, ensure_ascii=False, indent=1))
    print(json.dumps({"creditsConsumed": sum(r["credits"] or 0 for r in rows)}))


if __name__ == "__main__":
    command, rest = sys.argv[1], sys.argv[2:]
    names = rest[0].split(",") if rest else list(PERSONAS)
    if command == "balance":
        print(json.dumps(request("GET", "/account/balance"), ensure_ascii=False))
    elif command == "concepts":
        stage_concepts(names)
    elif command == "models":
        stage_models(names)
    elif command == "rig":
        stage_rig(names)
    elif command == "animate":
        stage_animate(names, rest[1].split(",") if len(rest) > 1 else CLIPS)
    elif command == "poll":
        wait(rest[0].split(","))
    elif command == "auto":
        auto(names, rest[1] if len(rest) > 1 else "anim", int(rest[2]) if len(rest) > 2 else 2)
    elif command == "status":
        status()
    else:
        raise SystemExit("unknown command")
