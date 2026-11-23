"""Wake authorized viewers when a committed edit changes their photo world."""
import asyncio
from collections import defaultdict
from contextlib import contextmanager
from threading import Lock

from fastapi import WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.api.photo_worlds import account_seat, db, digest, router

_listeners = defaultdict(set)
_lock = Lock()


@contextmanager
def subscription(world):
    loop = asyncio.get_running_loop()
    wake = asyncio.Event()
    client = (loop, wake)
    with _lock:
        _listeners[world].add(client)
    try:
        yield wake
    finally:
        with _lock:
            _listeners[world].discard(client)
            if not _listeners[world]:
                del _listeners[world]


def notify_world(world):
    with _lock:
        clients = tuple(_listeners.get(world, ()))
    for loop, wake in clients:
        if not loop.is_closed():
            try:
                loop.call_soon_threadsafe(wake.set)
            except RuntimeError:
                continue


def allowed(socket, world, raw):
    if not isinstance(raw, str) or not 20 <= len(raw) <= 8192:
        return False
    key = digest(raw)
    with db(socket) as conn:
        return bool(account_seat(conn,world,raw) or conn.execute(
            "SELECT 1 FROM worlds WHERE id=? AND (host=? OR invite=?) "
            "UNION ALL SELECT 1 FROM residents WHERE world=? AND key=? "
            "UNION ALL SELECT 1 FROM screens WHERE world=? AND key=? "
            "UNION ALL SELECT 1 FROM room_invites WHERE world=? AND key=? LIMIT 1",
            (world, key, key, world, key, world, key, world, key),
        ).fetchone())


@router.websocket("/{wid}/stream")
async def world_stream(socket: WebSocket, wid: str):
    await socket.accept()
    try:
        key = await asyncio.wait_for(socket.receive_text(), timeout=5)
        if not await run_in_threadpool(allowed, socket, wid, key):
            await socket.close(code=4403)
            return
        with subscription(wid) as wake:
            await socket.send_json({"type": "ready"})
            # A concurrent reader detects disconnected tabs even when a room is idle.
            disconnect = asyncio.create_task(socket.receive())
            try:
                while not disconnect.done():
                    change = asyncio.create_task(wake.wait())
                    try:
                        done, _ = await asyncio.wait((change, disconnect), timeout=18, return_when=asyncio.FIRST_COMPLETED)
                        if disconnect in done:
                            return
                        wake.clear()
                        await socket.send_json({"type": "changed" if change in done else "ping"})
                    finally:
                        change.cancel()
            finally:
                disconnect.cancel()
    except (WebSocketDisconnect, asyncio.TimeoutError):
        return
