"""Photo-born, invitation-only shared worlds. Media stays within the room."""
import hashlib
import hmac
import io
import json
import math
import secrets
import sqlite3
import time
from contextlib import contextmanager
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from PIL import Image, ImageStat
from pydantic import BaseModel, Field

from app.api.v1.workflows import MAX_GROUP_PHOTO_BYTES, _normalize_group_photo
from app.pipelines.group_onboarding.detect import GroupFaceDetector, _detect_faces_opencv

router = APIRouter(prefix="/api/v1/photo-worlds", tags=["photo-worlds"])
DDL = """
CREATE TABLE IF NOT EXISTS worlds(id TEXT PRIMARY KEY, title TEXT NOT NULL, host TEXT NOT NULL,
    invite TEXT NOT NULL, boxes TEXT NOT NULL, photo BLOB NOT NULL, created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS residents(world TEXT NOT NULL, seat INTEGER NOT NULL, key TEXT NOT NULL,
    name TEXT NOT NULL, about TEXT NOT NULL, box TEXT NOT NULL, color TEXT NOT NULL,
    x REAL NOT NULL, z REAL NOT NULL, posture TEXT NOT NULL,
    PRIMARY KEY(world,seat), UNIQUE(world,key));
CREATE TABLE IF NOT EXISTS moments(world TEXT NOT NULL, id TEXT NOT NULL, seat INTEGER NOT NULL,
    kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, happened TEXT NOT NULL,
    photo BLOB, created TEXT NOT NULL, PRIMARY KEY(world,id));
CREATE TABLE IF NOT EXISTS venues(world TEXT,seat INTEGER,place TEXT,PRIMARY KEY(world,seat));
CREATE TABLE IF NOT EXISTS moment_people(world TEXT,mid TEXT,seat INTEGER,PRIMARY KEY(world,mid,seat));
CREATE TABLE IF NOT EXISTS sources(world TEXT,ref TEXT,digest TEXT,raw BLOB,PRIMARY KEY(world,ref));
CREATE TABLE IF NOT EXISTS pair_consent(world TEXT,lo INTEGER,hi INTEGER,author INTEGER,PRIMARY KEY(world,lo,hi,author));
CREATE TABLE IF NOT EXISTS pair_art(world TEXT,lo INTEGER,hi INTEGER,signature TEXT,overlay TEXT,model TEXT,created TEXT,PRIMARY KEY(world,lo,hi));
CREATE TABLE IF NOT EXISTS screens(world TEXT,key TEXT,PRIMARY KEY(world,key));
CREATE TABLE IF NOT EXISTS ice_cards(id TEXT PRIMARY KEY,world TEXT,author INTEGER,subject INTEGER,text TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS ice_votes(card TEXT,voter INTEGER,pick INTEGER,PRIMARY KEY(card,voter));
CREATE TABLE IF NOT EXISTS base_looks(world TEXT,seat INTEGER,atlas BLOB,PRIMARY KEY(world,seat));
CREATE TABLE IF NOT EXISTS portraits(world TEXT,seat INTEGER,status TEXT,started REAL,image BLOB,PRIMARY KEY(world,seat));
CREATE TABLE IF NOT EXISTS agent_consent(world TEXT,seat INTEGER,enabled INTEGER,PRIMARY KEY(world,seat));
CREATE TABLE IF NOT EXISTS discussions(id INTEGER PRIMARY KEY,world TEXT,topic TEXT,method TEXT,turns TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS bulletin(id INTEGER PRIMARY KEY,world TEXT NOT NULL,kind TEXT NOT NULL,seat INTEGER,created TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS bulletin_room ON bulletin(world,id);
CREATE TABLE IF NOT EXISTS introductions(world TEXT NOT NULL,seat INTEGER NOT NULL,about TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS impressions(world TEXT NOT NULL, author INTEGER NOT NULL, subject INTEGER NOT NULL,
    text TEXT NOT NULL, PRIMARY KEY(world,author,subject));
"""


@contextmanager
def db(request, write=False):
    conn = sqlite3.connect(request.app.state.store.root / "photo-worlds.sqlite3", timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(DDL)
        if write:
            conn.execute("BEGIN IMMEDIATE")
        yield conn
        conn.commit()
        if write and conn.total_changes and (wid := request.path_params.get("wid")):
            from app.api.photo_world_stream import notify_world
            notify_world(wid)
    finally:
        conn.close()


def announce(conn, wid, kind, seat=None):
    conn.execute("INSERT INTO bulletin(world,kind,seat,created) VALUES(?,?,?,?)", (wid, kind, seat, now()))


def recent_activity(conn, wid):
    return [dict(row) for row in conn.execute(
        "SELECT id,kind,seat,created FROM bulletin WHERE world=? ORDER BY id DESC LIMIT 12", (wid,))]


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def invitation(host):
    return hmac.new(host.encode(), b"meetmind-world-invite", "sha256").hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def token(request):
    kind, _, value = request.headers.get("authorization", "").partition(" ")
    return value if kind.lower() == "bearer" and value else ""


def access(conn, request, wid, member=False):
    key = digest(token(request))
    world = conn.execute("SELECT id,title,host,invite,boxes,created FROM worlds WHERE id=?", (wid,)).fetchone()
    person = conn.execute("SELECT * FROM residents WHERE world=? AND key=?", (wid, key)).fetchone()
    if not world or not (person or key in (world["host"], world["invite"])):
        raise HTTPException(404, "世界入口无效，请重新打开邀请链接")
    if member and not person:
        raise HTTPException(403, "请先认领你自己")
    return world, person


def photo_bytes(file):
    data = file.file.read(MAX_GROUP_PHOTO_BYTES + 1)
    return data, _normalize_group_photo(data)[0]


def outfit_color(data, box):
    with Image.open(io.BytesIO(data)) as image:
        w, h = image.size
        x = (box["x"] + box["width"] / 2) * w
        y = min(.94, box["y"] + box["height"] * 1.45) * h
        radius = max(2, min(w, h) * .024)
        region = image.crop((max(0,int(x-radius)),max(0,int(y-radius)),
                             min(w,int(x+radius)+1),min(h,int(y+radius)+1)))
        return "#" + "".join(f"{int(v):02x}" for v in ImageStat.Stat(region).median[:3])


@router.post("", status_code=201)
def create(request: Request, title: str = Form(max_length=64), photo: UploadFile = File(...),
           consent: bool = Form(...), model_detection: bool = Form(False)):
    title = title.strip()
    if not consent or not title:
        raise HTTPException(422, "请填写名称并确认可以与受邀者分享这张合照")
    original, data = photo_bytes(photo)
    if model_detection:
        faces, method = GroupFaceDetector().detect(data, "image/jpeg")
        boxes = [face["bbox"] for face in faces]
    else:
        boxes = _detect_faces_opencv(data, .025, .002) or []
        method = "opencv" if boxes else "manual"
    wid, host = secrets.token_urlsafe(14), secrets.token_urlsafe(32)
    invite = invitation(host)
    with db(request, True) as conn:
        conn.execute("INSERT INTO worlds VALUES(?,?,?,?,?,?,?)",
                     (wid, title, digest(host), digest(invite), json.dumps(boxes), data, now()))
        conn.execute("INSERT INTO sources VALUES(?,?,?,?)",(wid,"group",hashlib.sha256(original).hexdigest(),original))
    return {"id": wid, "host": host, "invite": invite, "detector": method}


@router.get("/{wid}")
def read_world(wid: str, request: Request):
    with db(request) as conn:
        world, me = access(conn, request, wid)
        people = [dict(row) for row in conn.execute(
            "SELECT seat,name,about,box,color,x,z,posture FROM residents WHERE world=? ORDER BY seat", (wid,))]
        places=dict(conn.execute("SELECT seat,place FROM venues WHERE world=?",(wid,)))
        for p in people:
            p["place"] = places.get(p["seat"],"hall")
            p["box"] = json.loads(p["box"])
        moments, impressions, discussions = [], [], []
        if me:
            portraits=dict(conn.execute("SELECT seat,CASE WHEN status='building' AND started<? THEN 'unavailable' ELSE status END FROM portraits WHERE world=?", (time.time()-600,wid)))
            enabled=dict(conn.execute("SELECT seat,enabled FROM agent_consent WHERE world=?", (wid,)))
            for p in people:
                p["portrait"] = portraits.get(p["seat"])
                p["agent_enabled"] = bool(enabled.get(p["seat"]))
            for row in conn.execute("SELECT topic,method,turns,created FROM discussions WHERE world=? ORDER BY id DESC LIMIT 10",(wid,)):
                discussions.append({**dict(row),"turns":json.loads(row["turns"])})
        if me:
            moments = [dict(row) for row in conn.execute(
                "SELECT id,seat,kind,title,body,happened,photo IS NOT NULL AS has_photo,created FROM moments "
                "WHERE world=? ORDER BY created,rowid", (wid,))]
            links={}
            for mid,seat in conn.execute("SELECT mid,seat FROM moment_people WHERE world=?",(wid,)):
                links.setdefault(mid,[]).append(seat)
            for m in moments:
                m["with_people"]=links.get(m["id"],[])
            impressions = [dict(row) for row in conn.execute(
                "SELECT author,subject,text FROM impressions WHERE world=? AND (author=? OR subject=?)",
                (wid, me["seat"], me["seat"]))]
        return {"id": wid, "title": world["title"], "created": world["created"], "boxes": json.loads(world["boxes"]),
                "me": me["seat"] if me else None, "people": people if me else [{"seat":p["seat"], "box":p["box"]} for p in people],
                "moments": moments, "impressions": impressions, "discussions": discussions,
                "activity": recent_activity(conn,wid) if me else []}


@router.get("/{wid}/photo")
def read_photo(wid: str, request: Request):
    with db(request) as conn:
        access(conn, request, wid)
        data = conn.execute("SELECT photo FROM worlds WHERE id=?", (wid,)).fetchone()[0]
    return Response(data, media_type="image/jpeg", headers={"Cache-Control": "private, no-store"})


class Claim(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    about: str = Field(default="", max_length=200)
    member_key: str = Field(pattern=r"^[A-Za-z0-9_-]{32,100}$")
    seat: int | None = Field(default=None, ge=0, lt=50)
    x: float | None = Field(default=None, ge=0, le=1)
    y: float | None = Field(default=None, ge=0, le=1)


@router.post("/{wid}/claim")
def claim(wid: str, data: Claim, request: Request):
    with db(request, True) as conn:
        world, _ = access(conn, request, wid)
        if digest(token(request)) not in (world["host"], world["invite"]):
            raise HTTPException(403, "请使用认领邀请")
        key = digest(data.member_key)
        prior = conn.execute("SELECT seat FROM residents WHERE world=? AND key=?", (wid,key)).fetchone()
        if prior:
            return {"seat":prior[0]}
        boxes = json.loads(world["boxes"])
        seat = data.seat
        if seat is None and data.x is not None and data.y is not None:
            for i, b in enumerate(boxes):
                if b["x"] <= data.x <= b["x"]+b["width"] and b["y"] <= data.y <= b["y"]+b["height"]:
                    seat = i
                    break
            if seat is None:
                if len(boxes) >= 50:
                    raise HTTPException(422,"一个世界最多支持 50 位")
                width, height = .10, .16
                box = {"x":max(0,min(1-width,data.x-width/2)), "y":max(0,min(1-height,data.y-height/2)),
                       "width":width,"height":height}
                seat = len(boxes)
                boxes.append(box)
                conn.execute("UPDATE worlds SET boxes=? WHERE id=?", (json.dumps(boxes),wid))
        if seat is None or seat >= len(boxes) or not data.name.strip():
            raise HTTPException(422,"请点选照片里的自己并填写称呼")
        if conn.execute("SELECT 1 FROM residents WHERE world=? AND seat=?", (wid,seat)).fetchone():
            raise HTTPException(409,"这位已经认领，请重新选择")
        b = boxes[seat]
        raw = conn.execute("SELECT photo FROM worlds WHERE id=?", (wid,)).fetchone()[0]
        x = round(math.cos(seat*2.4)*2.65,2)
        z = round(2.5+math.sin(seat*2.4)*2.65,2)
        conn.execute("INSERT INTO residents VALUES(?,?,?,?,?,?,?,?,?,?)",
                     (wid,seat,key,data.name.strip(),data.about.strip(),json.dumps(b),outfit_color(raw,b),x,z,"stand"))
        from app.pipeline.world_portrait import world_atlas
        conn.execute("INSERT INTO base_looks VALUES(?,?,?)", (wid,seat,world_atlas(raw,b)))
        conn.execute("INSERT INTO introductions VALUES(?,?,?,?)", (wid,seat,data.about.strip(),now()))
        announce(conn,wid,"joined",seat)
        return {"seat":seat}


class Introduction(BaseModel):
    about: str = Field(max_length=200)


@router.put("/{wid}/me/introduction")
def update_introduction(wid: str, data: Introduction, request: Request):
    with db(request, True) as conn:
        _, me = access(conn, request, wid, True)
        about = data.about.strip()
        if me["about"] != about:
            if not conn.execute("SELECT 1 FROM introductions WHERE world=? AND seat=?", (wid,me["seat"])).fetchone():
                conn.execute("INSERT INTO introductions VALUES(?,?,?,?)", (wid,me["seat"],me["about"],now()))
            conn.execute("INSERT INTO introductions VALUES(?,?,?,?)", (wid,me["seat"],about,now()))
            conn.execute("UPDATE residents SET about=? WHERE world=? AND seat=?", (about, wid, me["seat"]))
            conn.execute("DELETE FROM agent_consent WHERE world=? AND seat=?", (wid, me["seat"]))
    return {"ok": True}


class Presence(BaseModel):
    x: float = Field(ge=-8,le=8,allow_inf_nan=False)
    z: float = Field(ge=-13,le=9,allow_inf_nan=False)
    posture: Literal["stand","sit"] = "stand"
    place: Literal["hall","cafe"] = "hall"


@router.put("/{wid}/presence")
def move(wid: str, data: Presence, request: Request):
    with db(request, True) as conn:
        _, me = access(conn, request, wid, True)
        if data.posture == "sit" and me["posture"] != "sit":
            announce(conn,wid,"sat",me["seat"])
        conn.execute("INSERT OR REPLACE INTO venues VALUES(?,?,?)",(wid,me["seat"],data.place))
        conn.execute("UPDATE residents SET x=?,z=?,posture=? WHERE world=? AND seat=?",
                     (data.x,data.z,data.posture,wid,me["seat"]))
    return {"ok":True}


@router.post("/{wid}/moments", status_code=201)
def add_moment(wid: str, request: Request, id: str = Form(pattern=r"^[A-Za-z0-9_-]{8,80}$"),
               kind: Literal["meeting","trip","birthday","daily","pet","project"] = Form(...),
               title: str = Form(max_length=64), body: str = Form("",max_length=1600),
               happened: date = Form(...), with_people: list[int] = Form(default=[]), photo: UploadFile | None = File(None)):
    with db(request) as conn:
        access(conn, request, wid, True)
    if not title.strip():
        raise HTTPException(422,"写下这件事的名字")
    raw, attachment = photo_bytes(photo) if photo else (None,None)
    with db(request, True) as conn:
        _, me = access(conn, request, wid, True)
        existing = conn.execute("SELECT seat FROM moments WHERE world=? AND id=?", (wid,id)).fetchone()
        if existing and existing[0] != me["seat"]:
            raise HTTPException(409,"这条经历已经存在")
        conn.execute("INSERT OR IGNORE INTO moments VALUES(?,?,?,?,?,?,?,?,?)",
                     (wid,id,me["seat"],kind,title.strip(),body.strip(),happened.isoformat(),attachment,now()))
        if not existing:
            if kind == "project":
                announce(conn,wid,"exhibited",me["seat"])
            seats={r[0] for r in conn.execute("SELECT seat FROM residents WHERE world=?",(wid,))}
            if not set(with_people).issubset(seats):
                raise HTTPException(422,"只能提及本世界已认领的成员")
            conn.executemany("INSERT INTO moment_people VALUES(?,?,?)",[(wid,id,s) for s in set(with_people)])
        if raw is not None and not existing:
            conn.execute("INSERT INTO sources VALUES(?,?,?,?)",(wid,"moment-"+id,hashlib.sha256(raw).hexdigest(),raw))
    return {"id":id}


@router.get("/{wid}/moments/{mid}/photo")
def moment_photo(wid: str, mid: str, request: Request):
    with db(request) as conn:
        access(conn,request,wid,True)
        row = conn.execute("SELECT photo FROM moments WHERE world=? AND id=?", (wid,mid)).fetchone()
        if not row or not row[0]:
            raise HTTPException(404,"这段经历没有附图")
        return Response(row[0], media_type="image/jpeg", headers={"Cache-Control":"private, no-store"})


class Impression(BaseModel):
    text: str = Field(min_length=1,max_length=300)


@router.put("/{wid}/people/{seat}/impression")
def impression(wid: str, seat: int, data: Impression, request: Request):
    with db(request, True) as conn:
        _, me = access(conn,request,wid,True)
        if not data.text.strip() or not conn.execute("SELECT 1 FROM residents WHERE world=? AND seat=?", (wid,seat)).fetchone():
            raise HTTPException(422,"请确认对象并写下印象")
        conn.execute("INSERT OR REPLACE INTO impressions VALUES(?,?,?,?)",(wid,me["seat"],seat,data.text.strip()))
    return {"ok":True}
