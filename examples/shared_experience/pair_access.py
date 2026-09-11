"""Hash-only capabilities for the isolated lab, not verified identity."""
from __future__ import annotations

from contextlib import contextmanager
import hashlib
import math
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time

_VERSION = 1
_APPLICATION_ID = 0x4D4D5041
_ACCESS_SECONDS = 7 * 24 * 60 * 60
_INVITE_SECONDS = 30 * 60
_SID = re.compile(r"[0-9a-f]{32}\Z")
_TOKEN = re.compile(r"[A-Za-z0-9_-]{43}\Z")
_INVALID = "访问凭证无效或已过期"
_COLUMNS = [
    ("session_id", "TEXT"), ("owner_hash", "TEXT"),
    ("owner_expires", "REAL"), ("guest_hash", "TEXT"),
    ("guest_expires", "REAL"), ("invite_hash", "TEXT"),
    ("invite_expires", "REAL"),
]


def _digest(token):
    if not isinstance(token, str) or not _TOKEN.fullmatch(token):
        raise ValueError(_INVALID)
    return hashlib.sha256(token.encode("ascii")).hexdigest()


class PairAccessStore:
    """Per-operation connections and immediate writes also serialize processes."""

    def __init__(self, directory, now=None):
        self.now = time.time if now is None else now
        if not callable(self.now):
            raise ValueError("时钟必须可调用")
        try:
            self.directory = Path(directory).expanduser().resolve()
            self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
            self.path = self.directory / "capabilities.sqlite3"
            if self.path.is_symlink():
                raise ValueError("访问存储不能是符号链接")
            descriptor = os.open(
                self.path, os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0), 0o600
            )
            os.close(descriptor)
            if os.name != "nt":
                self.directory.chmod(0o700)
                self.path.chmod(0o600)
        except (OSError, TypeError, RuntimeError):
            raise ValueError("无法建立独立的访问存储目录") from None
        with self._connection(check_schema=False) as connection:
            connection.execute("BEGIN IMMEDIATE")
            version = connection.execute("PRAGMA user_version").fetchone()[0]
            app_id = connection.execute("PRAGMA application_id").fetchone()[0]
            tables = connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            ).fetchall()
            if version == 0 and app_id == 0 and not tables:
                connection.execute("""
                    CREATE TABLE pairs (
                        session_id TEXT PRIMARY KEY NOT NULL,
                        owner_hash TEXT UNIQUE NOT NULL,
                        owner_expires REAL NOT NULL,
                        guest_hash TEXT UNIQUE,
                        guest_expires REAL,
                        invite_hash TEXT UNIQUE,
                        invite_expires REAL,
                        CHECK ((guest_hash IS NULL) = (guest_expires IS NULL)),
                        CHECK ((invite_hash IS NULL) = (invite_expires IS NULL))
                    )
                """)
                connection.execute(f"PRAGMA user_version = {_VERSION}")
                connection.execute(f"PRAGMA application_id = {_APPLICATION_ID}")
            self._check_schema(connection)
            connection.commit()

    @staticmethod
    def _check_schema(connection):
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        app_id = connection.execute("PRAGMA application_id").fetchone()[0]
        columns = [(row[1], row[2]) for row in
                   connection.execute("PRAGMA table_info(pairs)").fetchall()]
        if version != _VERSION or app_id != _APPLICATION_ID or columns != _COLUMNS:
            raise ValueError("双人访问存储版本或结构不兼容，未修改数据")

    @contextmanager
    def _connection(self, check_schema=True):
        connection = None
        try:
            connection = sqlite3.connect(str(self.path), timeout=10, isolation_level=None)
            connection.row_factory = sqlite3.Row
            connection.execute("PRAGMA synchronous = FULL")
            connection.execute("PRAGMA busy_timeout = 10000")
            if check_schema:
                self._check_schema(connection)
            yield connection
        except sqlite3.Error:
            raise ValueError("双人访问存储读写失败，未重置数据") from None
        finally:
            if connection is not None:
                if connection.in_transaction:
                    connection.rollback()
                connection.close()

    def _time(self):
        value = self.now()
        if type(value) not in (int, float) or not math.isfinite(value) or value < 0:
            raise ValueError("时钟值无效")
        return float(value)

    @staticmethod
    def _live(expiry, now):
        return (type(expiry) in (int, float) and math.isfinite(expiry)
                and expiry > now)

    @staticmethod
    def _new_token(connection):
        # Collision checking spans token roles so no capability can acquire a
        # second meaning even if the random source repeats unexpectedly.
        for _ in range(8):
            token = secrets.token_urlsafe(32)
            digest = _digest(token)
            used = connection.execute(
                "SELECT 1 FROM pairs WHERE owner_hash=? OR guest_hash=? OR invite_hash=?",
                (digest, digest, digest),
            ).fetchone()
            if used is None:
                return token, digest
        raise ValueError("无法生成新的访问凭证")

    def _owner(self, connection, token, now):
        row = connection.execute(
            "SELECT * FROM pairs WHERE owner_hash=?", (_digest(token),)
        ).fetchone()
        if row is None or not self._live(row["owner_expires"], now):
            raise ValueError(_INVALID)
        return row

    def register_owner(self, sid):
        if not isinstance(sid, str) or not _SID.fullmatch(sid):
            raise ValueError("会话 ID 格式无效")
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            if connection.execute(
                "SELECT 1 FROM pairs WHERE session_id=?", (sid,)
            ).fetchone() is not None:
                raise ValueError("此会话已绑定创建者")
            token, digest = self._new_token(connection)
            connection.execute(
                "INSERT INTO pairs (session_id, owner_hash, owner_expires) VALUES (?, ?, ?)",
                (sid, digest, self._time() + _ACCESS_SECONDS),
            )
            connection.commit()
        return token

    def resolve(self, token):
        digest = _digest(token)
        with self._connection() as connection:
            connection.execute("BEGIN")
            now = self._time()
            row = connection.execute(
                "SELECT * FROM pairs WHERE owner_hash=? OR guest_hash=?", (digest, digest)
            ).fetchone()
            if row is None:
                raise ValueError(_INVALID)
            viewer = "alice" if row["owner_hash"] == digest else "bo"
            expiry = row["owner_expires"] if viewer == "alice" else row["guest_expires"]
            if not self._live(expiry, now):
                raise ValueError(_INVALID)
            result = {"session_id": row["session_id"], "viewer": viewer}
            connection.commit()
        return result

    def create_invite(self, owner_token):
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            now = self._time()
            owner = self._owner(connection, owner_token, now)
            if self._live(owner["guest_expires"], now):
                raise ValueError("已有加入者，请先撤销加入者访问")
            token, digest = self._new_token(connection)
            connection.execute(
                "UPDATE pairs SET invite_hash=?, invite_expires=?, "
                "guest_hash=NULL, guest_expires=NULL WHERE session_id=?",
                (digest, min(now + _INVITE_SECONDS, owner["owner_expires"]),
                 owner["session_id"]),
            )
            connection.commit()
        return token

    def join(self, invite_token):
        digest = _digest(invite_token)
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            now = self._time()
            row = connection.execute(
                "SELECT * FROM pairs WHERE invite_hash=?", (digest,)
            ).fetchone()
            if (row is None or not self._live(row["invite_expires"], now)
                    or not self._live(row["owner_expires"], now)
                    or self._live(row["guest_expires"], now)):
                raise ValueError(_INVALID)
            token, guest_hash = self._new_token(connection)
            connection.execute(
                "UPDATE pairs SET guest_hash=?, guest_expires=?, "
                "invite_hash=NULL, invite_expires=NULL WHERE session_id=?",
                (guest_hash, now + _ACCESS_SECONDS, row["session_id"]),
            )
            connection.commit()
            result = {"session_id": row["session_id"], "viewer": "bo", "token": token}
        return result

    def revoke_guest(self, owner_token):
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            owner = self._owner(connection, owner_token, self._time())
            connection.execute(
                "UPDATE pairs SET guest_hash=NULL, guest_expires=NULL, "
                "invite_hash=NULL, invite_expires=NULL WHERE session_id=?",
                (owner["session_id"],),
            )
            connection.commit()
