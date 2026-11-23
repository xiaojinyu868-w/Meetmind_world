"""Two participants can jointly commission an interpretation of their shared record."""
import hashlib
import json
import threading

from fastapi import HTTPException, Request
from pydantic import BaseModel

from app.agents.llm import get_provider
from app.agents.llm.interactive import interactive_json_chat
from app.agents.utils.jsonish import extract_json
from app.api.photo_worlds import access, db, now, router
from app.fields.generator import generate_field
from app.fields.llm import apply_llm_scene, build_field_prompt

_slots = threading.BoundedSemaphore(2)


def pair_record(conn, wid, seat, request):
    world, me = access(conn, request, wid, True)
    other = conn.execute("SELECT name FROM residents WHERE world=? AND seat=?", (wid, seat)).fetchone()
    if not other or seat == me["seat"]:
        raise HTTPException(404, "请选择另一位已认领的朋友")
    low, high = sorted((me["seat"], seat))
    pair = (wid, low, high)
    links = [dict(row) for row in conn.execute(
        "SELECT DISTINCT m.id,m.title,m.happened FROM moments m JOIN moment_people p "
        "ON m.world=p.world AND m.id=p.mid WHERE m.world=? AND "
        "((m.seat=? AND p.seat=?) OR (m.seat=? AND p.seat=?)) ORDER BY m.happened,m.rowid",
        (wid, low, high, high, low))]
    impressions = [dict(row) for row in conn.execute(
        "SELECT author,text FROM impressions WHERE world=? AND "
        "((author=? AND subject=?) OR (author=? AND subject=?)) ORDER BY author",
        (wid, low, high, high, low))]
    notes = {row["author"]: {"impression": {"value": row["text"]}} for row in impressions}
    encounters = [{"place": "最初的合照", "time": world["created"], "facts": {"photos": ["group"]}}]
    encounters.extend({"place": m["title"], "time": m["happened"], "facts": {"media": ["moment:"+m["id"]]}} for m in links)
    package = {"person_id": f"{wid}-{low}-{high}", "identity": {"name": "同伴"}, "encounters": encounters}
    relations = "\n".join(m["title"]+" | "+m["happened"] for m in links)
    base = generate_field(package, inferences=notes, relations_md=relations)
    base["scene"]["title"] = "你与"+other["name"]+" · 回声场域"
    base["moments"] = [m["id"] for m in links]
    signature = hashlib.sha256(json.dumps([links, impressions],ensure_ascii=False,sort_keys=True).encode()).hexdigest()
    permissions = {r[0] for r in conn.execute(
        "SELECT author FROM pair_consent WHERE world=? AND lo=? AND hi=?", pair)}
    base["my_permission"] = me["seat"] in permissions
    base["permissions"] = len(permissions)
    return pair, base, package, notes, relations, signature, me["seat"]


@router.get("/{wid}/fields/{seat}")
def relationship_field(wid: str, seat: int, request: Request):
    with db(request) as conn:
        pair, base, _, _, _, signature, _ = pair_record(conn, wid, seat, request)
        row = conn.execute("SELECT overlay,model,created FROM pair_art WHERE world=? AND lo=? AND hi=? AND signature=?",
                           (*pair, signature)).fetchone()
        if row and base["permissions"] == 2:
            apply_llm_scene(base, json.loads(row["overlay"]))
            base["model"] = row["model"]
            base["created_at"] = row["created"]
        return base


class Permission(BaseModel):
    consent: bool


@router.put("/{wid}/fields/{seat}/consent")
def consent(wid: str, seat: int, body: Permission, request: Request):
    with db(request, True) as conn:
        pair, _, _, _, _, _, me = pair_record(conn,wid,seat,request)
        if body.consent:
            conn.execute("INSERT OR IGNORE INTO pair_consent VALUES(?,?,?,?)", (*pair, me))
        else:
            conn.execute("DELETE FROM pair_consent WHERE world=? AND lo=? AND hi=? AND author=?", (*pair,me))
            conn.execute("DELETE FROM pair_art WHERE world=? AND lo=? AND hi=?", pair)
    return {"enabled": body.consent}


@router.post("/{wid}/fields/{seat}/interpret")
def interpret(wid: str, seat: int, request: Request):
    with db(request) as conn:
        _, base, package, notes, relations, signature, _ = pair_record(conn,wid,seat,request)
    if base["permissions"] != 2:
        raise HTTPException(409,"需要你和对方各自允许，才能开始演绎")
    if not _slots.acquire(blocking=False):
        raise HTTPException(429,"场域正在绘制，请稍后再试")
    try:
        response = interactive_json_chat(get_provider("chat"), build_field_prompt(package,inferences=notes,relations_md=relations))
        overlay = extract_json(response.text) if not response.mock else None
        if not overlay or not apply_llm_scene(base,overlay):
            raise HTTPException(503,"文本模型没有返回可用的场景，当前空间仍可浏览")
        with db(request, True) as conn:
            pair, current, _, _, _, current_signature, _ = pair_record(conn,wid,seat,request)
            if current["permissions"] != 2 or current_signature != signature:
                raise HTTPException(409,"材料或授权已经变化，请重新开始")
            conn.execute("INSERT OR REPLACE INTO pair_art VALUES(?,?,?,?,?,?,?)",
                         (*pair,signature,json.dumps(overlay,ensure_ascii=False),response.model,now()))
        return {"ok": True}
    finally:
        _slots.release()
