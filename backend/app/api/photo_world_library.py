"""An optional MeetMind login can restore the holder's claimed seats."""
import secrets

from fastapi import HTTPException, Request
from pydantic import BaseModel, Field

from app.packages.store import PackageNotFound
from app.signals import PersonSignalProjector

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


def private_archive_context(conn,request,wid,seat):
    user=owner(request)
    linked=conn.execute("SELECT seat FROM seat_accounts WHERE world=? AND account=?", (wid,user)).fetchone()
    device=conn.execute("SELECT seat FROM residents WHERE world=? AND key=?", (wid,digest(request.headers.get("x-world-seat","")))).fetchone()
    if not (linked or device) or not conn.execute("SELECT 1 FROM residents WHERE world=? AND seat=?", (wid,seat)).fetchone():
        raise HTTPException(404,"没有访问该人物资料的权限")
    return user


def owned_package(store,user,pid):
    try:
        package=store.load_package(pid)
    except (PackageNotFound,ValueError):
        return None
    identity=package.get("identity") or {}
    return package if package.get("owner_id")==user and identity.get("confirmed") and not identity.get("deactivated") else None


class ArchiveLink(BaseModel):
    person_id: str | None = Field(default=None,pattern=r"^[A-Za-z0-9_-]{1,120}$")


@router.get("/{wid}/people/{seat}/archive")
def get_archive(wid: str,seat: int,request: Request):
    with db(request) as conn:
        user=private_archive_context(conn,request,wid,seat)
        linked=conn.execute("SELECT person FROM archive_links WHERE world=? AND seat=? AND account=?", (wid,seat,user)).fetchone()
    store=request.app.state.store
    choices=[{"id":p["person_id"],"name":p["name"],"events":p["encounter_count"]}
             for p in store.list_packages() if p.get("owner_id")==user and p.get("confirmed")]
    pkg=owned_package(store,user,linked["person"]) if linked else None
    signal=PersonSignalProjector(store).load(pkg) if pkg else None
    # Only the aggregate and its provenance belong in this private view.
    heart=(signal or {}).get("heart",{})
    summary=None if not signal else {"at":signal.get("capturedAt"),"value":heart.get("currentBpm"),
        "baseline":heart.get("baselineBpm"),"evidence":signal.get("sourceRefs",{}).get("encounterId")}
    return {"choices":choices,"person":pkg["person_id"] if pkg else None,"signal":summary}


@router.put("/{wid}/people/{seat}/archive")
def set_archive(wid: str,seat: int,body: ArchiveLink,request: Request):
    with db(request,True) as conn:
        user=private_archive_context(conn,request,wid,seat)
        if body.person_id is None:
            conn.execute("DELETE FROM archive_links WHERE world=? AND seat=? AND account=?", (wid,seat,user))
        else:
            if not owned_package(request.app.state.store,user,body.person_id):
                raise HTTPException(404,"请选择你本人已确认的现场资料")
            conn.execute("INSERT OR REPLACE INTO archive_links VALUES(?,?,?,?)", (wid,seat,user,body.person_id))
    return {"ok":True}
