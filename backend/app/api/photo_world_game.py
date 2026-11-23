"""Room-scoped rules for the anonymous impression game and the venue display."""
import secrets

from fastapi import HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.api.photo_worlds import access, announce, db, digest, now, recent_activity, router, token


class Card(BaseModel):
    subject: int = Field(ge=0,lt=50)
    text: str = Field(min_length=2,max_length=180)


class Vote(BaseModel):
    seat: int = Field(ge=0,lt=50)


@router.post("/{wid}/ice",status_code=201)
def ice_card(wid: str, data: Card, request: Request):
    text=data.text.strip()
    with db(request,True) as conn:
        _,me=access(conn,request,wid,True)
        if len(text)<2 or me["seat"]==data.subject:
            raise HTTPException(422,"请写下给另一位成员的现场印象")
        if not conn.execute("SELECT 1 FROM residents WHERE world=? AND seat=?",(wid,data.subject)).fetchone():
            raise HTTPException(404,"这位成员还没有入场")
        cid=secrets.token_urlsafe(14)
        conn.execute("INSERT INTO ice_cards VALUES(?,?,?,?,?,?)",(cid,wid,me["seat"],data.subject,text,now()))
        announce(conn,wid,"ice")
    return {"id":cid}


@router.get("/{wid}/ice")
def get_ice(wid: str, request: Request):
    with db(request) as conn:
        _,me=access(conn,request,wid,True)
        cards=[]
        for r in conn.execute("SELECT id,text,author,subject FROM ice_cards WHERE world=? ORDER BY created DESC,rowid DESC LIMIT 50",(wid,)):
            own=r["author"]==me["seat"]
            v=conn.execute("SELECT pick FROM ice_votes WHERE card=? AND voter=?",(r["id"],me["seat"])).fetchone()
            tally=conn.execute("SELECT count(*) FROM ice_votes WHERE card=?",(r["id"],)).fetchone()[0]
            cards.append({"id":r["id"],"text":r["text"],"own":own,"votes":tally,"pick":v[0] if v else None,
                          "subject":r["subject"] if own or v else None})
        return {"cards":cards}


@router.put("/{wid}/ice/{cid}/vote")
def vote(wid: str, cid: str, data: Vote, request: Request):
    with db(request,True) as conn:
        _,me=access(conn,request,wid,True)
        card=conn.execute("SELECT author FROM ice_cards WHERE id=? AND world=?",(cid,wid)).fetchone()
        if not card:
            raise HTTPException(404,"印象题不存在")
        if card[0]==me["seat"]:
            raise HTTPException(409,"这是你写的题，请等其他人来猜")
        if not conn.execute("SELECT 1 FROM residents WHERE world=? AND seat=?",(wid,data.seat)).fetchone():
            raise HTTPException(422,"请选择已经认领的成员")
        conn.execute("INSERT OR IGNORE INTO ice_votes VALUES(?,?,?)",(cid,me["seat"],data.seat))
    return {"ok":True}


@router.post("/{wid}/screen")
def screen_link(wid: str, request: Request):
    with db(request,True) as conn:
        access(conn,request,wid,True)
        key=secrets.token_urlsafe(32)
        conn.execute("INSERT INTO screens VALUES(?,?)",(wid,digest(key)))
    return {"key":key}


@router.get("/{wid}/screen")
def screen_snapshot(wid: str, request: Request):
    with db(request) as conn:
        if not conn.execute("SELECT 1 FROM screens WHERE world=? AND key=?",(wid,digest(token(request)))).fetchone():
            raise HTTPException(404,"大屏链接无效")
        world=conn.execute("SELECT title,created FROM worlds WHERE id=?",(wid,)).fetchone()
        people=[dict(r) for r in conn.execute("SELECT seat,name,color,x,z,posture FROM residents WHERE world=? ORDER BY seat",(wid,))]
        places=dict(conn.execute("SELECT seat,place FROM venues WHERE world=?",(wid,)))
        for person in people:
            person["place"]=places.get(person["seat"],"hall")
        return {**dict(world),"id":wid,"people":people,"me":None,"moments":[],"activity":recent_activity(conn,wid)}


@router.get("/{wid}/sources/{ref}")
def download_source(wid: str, ref: str, request: Request):
    with db(request) as conn:
        access(conn,request,wid,True)
        r=conn.execute("SELECT digest,raw FROM sources WHERE world=? AND ref=?",(wid,ref)).fetchone()
        if not r:
            raise HTTPException(404,"没有保存这张照片的原件")
        return Response(r["raw"],media_type="application/octet-stream",headers={
            "Cache-Control":"private, no-store","X-Content-SHA256":r["digest"],"X-Content-Type-Options":"nosniff"})
