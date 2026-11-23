"""An optional MeetMind login can restore the holder's claimed seats."""
import secrets

from fastapi import HTTPException, Request

from app.api.photo_worlds import access, db, digest, router
from app.security.meetmind_jwt import caller_user_id


def owner(request):
    user = caller_user_id(request)
    if not user:
        raise HTTPException(401,"请重新登录 MeetMind 后打开个人世界")
    return user


@router.get("/library/mine")
def list_worlds(request: Request):
    user = owner(request)
    with db(request) as conn:
        rows = conn.execute(
            "SELECT w.id,w.title,a.seat,r.name FROM seat_accounts a JOIN worlds w ON w.id=a.world "
            "JOIN residents r ON r.world=a.world AND r.seat=a.seat WHERE a.account=? ORDER BY w.created DESC",
            (user,))
        return {"worlds": [dict(row) for row in rows]}


@router.put("/{wid}/library")
def bind_seat(wid: str, request: Request):
    user = owner(request)
    proof = request.headers.get("x-world-seat","")
    with db(request,True) as conn:
        me = conn.execute("SELECT seat FROM residents WHERE world=? AND key=?", (wid,digest(proof))).fetchone()
        if not me:
            raise HTTPException(403,"请在当初认领的设备上保存这个世界")
        current = conn.execute("SELECT account,seat FROM seat_accounts WHERE world=? AND (account=? OR seat=?)",
                               (wid,user,me["seat"])).fetchall()
        if any(r["account"]!=user or r["seat"]!=me["seat"] for r in current):
            raise HTTPException(409,"该角色或账号已关联这里的另一项认领")
        conn.execute("INSERT OR IGNORE INTO seat_accounts VALUES(?,?,?)",(wid,me["seat"],user))
    return {"ok":True}


@router.delete("/{wid}/library")
def unlink(wid: str, request: Request):
    user=owner(request)
    with db(request,True) as conn:
        conn.execute("DELETE FROM seat_accounts WHERE world=? AND account=?",(wid,user))
    return {"ok":True}


@router.post("/{wid}/invitations",status_code=201)
def create_invitation(wid: str, request: Request):
    with db(request,True) as conn:
        access(conn,request,wid,True)
        key=secrets.token_urlsafe(32)
        conn.execute("INSERT INTO room_invites VALUES(?,?)", (wid,digest(key)))
    return {"invite":key}
