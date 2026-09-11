"""Durable synthetic lab sessions, isolated from production data.

The store persists JSON event histories; event-domain validation remains the
replay engine's responsibility. Every mutation is committed before returning.
"""
from __future__ import annotations

from contextlib import contextmanager
import json
import math
import os
from pathlib import Path
import re
import sqlite3

_SCHEMA_VERSION = 1
_MAX_SESSIONS = 100
_SID = re.compile(r"[0-9a-f]{32}\Z")
_COLUMNS = [("session_id", "TEXT"), ("events_json", "TEXT"),
            ("generation", "INTEGER"), ("revision", "INTEGER")]


def _session_id(value):
    if not isinstance(value, str) or not _SID.fullmatch(value):
        raise ValueError("实验会话 ID 格式无效")
    return value


def _integer(value, minimum, label):
    if type(value) is not int or value < minimum or value > 9223372036854775807:
        raise ValueError(f"{label}无效")
    return value


def _json_value(value):
    """Reject values JSON encoders otherwise silently coerce, e.g. tuple keys."""
    if value is None or type(value) in (str, bool, int):
        return
    if type(value) is float and math.isfinite(value):
        return
    if type(value) is list:
        for child in value:
            _json_value(child)
        return
    if type(value) is dict:
        for key, child in value.items():
            if type(key) is not str:
                raise ValueError("会话事件必须使用字符串字段名")
            _json_value(child)
        return
    raise ValueError("会话事件必须是有限数值的 JSON 数据")


def _encode_events(events):
    if type(events) is not list or any(type(event) is not dict for event in events):
        raise ValueError("会话事件必须是 JSON 对象数组")
    try:
        _json_value(events)
        return json.dumps(events, allow_nan=False, ensure_ascii=True,
                          separators=(",", ":"), sort_keys=True)
    except (RecursionError, OverflowError, TypeError):
        raise ValueError("会话事件不能编码为 JSON") from None


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("存储的会话事件包含重复字段")
        result[key] = value
    return result


def _invalid_constant(value):
    raise ValueError("存储的会话事件包含非有限数值")


def _decode_events(value):
    if type(value) is not str:
        raise ValueError("存储的会话事件格式无效")
    try:
        events = json.loads(value, object_pairs_hook=_unique_object,
                            parse_constant=_invalid_constant)
        _encode_events(events)
        return events
    except (ValueError, TypeError, RecursionError, OverflowError):
        raise ValueError("存储的会话事件损坏，未重置数据") from None


class SQLiteSessionStore:
    """Revision-checked persistence with a separate connection per operation."""

    def __init__(self, directory):
        try:
            self.directory = Path(directory).expanduser().resolve()
            self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
            self.path = self.directory / "sessions.sqlite3"
            if self.path.is_symlink():
                raise ValueError("会话数据库不能是符号链接")
            flags = os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0)
            descriptor = os.open(self.path, flags, 0o600)
            os.close(descriptor)
            if os.name != "nt":
                self.directory.chmod(0o700)
                self.path.chmod(0o600)
        except (OSError, TypeError, RuntimeError):
            raise ValueError("无法建立独立的会话存储目录") from None
        with self._connection(check_schema=False) as connection:
            connection.execute("BEGIN IMMEDIATE")
            version = connection.execute("PRAGMA user_version").fetchone()[0]
            tables = connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            ).fetchall()
            if version == 0 and not tables:
                connection.execute("""
                    CREATE TABLE sessions (
                        session_id TEXT PRIMARY KEY NOT NULL,
                        events_json TEXT NOT NULL,
                        generation INTEGER NOT NULL CHECK (generation >= 0),
                        revision INTEGER NOT NULL CHECK (revision >= 1)
                    )
                """)
                connection.execute(f"PRAGMA user_version = {_SCHEMA_VERSION}")
            self._check_schema(connection)
            connection.commit()

    @staticmethod
    def _check_schema(connection):
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        if version != _SCHEMA_VERSION:
            raise ValueError("会话存储版本不兼容，未修改数据")
        columns = [(row[1], row[2]) for row in
                   connection.execute("PRAGMA table_info(sessions)").fetchall()]
        if columns != _COLUMNS:
            raise ValueError("会话存储结构无效，未修改数据")

    @contextmanager
    def _connection(self, check_schema=True):
        connection = None
        try:
            connection = sqlite3.connect(str(self.path), timeout=10,
                                         isolation_level=None)
            connection.execute("PRAGMA synchronous = FULL")
            connection.execute("PRAGMA busy_timeout = 10000")
            if check_schema:
                self._check_schema(connection)
            yield connection
        except sqlite3.Error:
            raise ValueError("会话存储读写失败，未重置数据") from None
        finally:
            if connection is not None:
                if connection.in_transaction:
                    connection.rollback()
                connection.close()

    def create(self, sid, events, generation=0):
        sid = _session_id(sid)
        generation = _integer(generation, 0, "会话代次")
        encoded = _encode_events(events)
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            if connection.execute("SELECT 1 FROM sessions WHERE session_id=?", (sid,)).fetchone():
                raise ValueError("实验会话已存在")
            if connection.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] >= _MAX_SESSIONS:
                raise ValueError("已达到 100 个持久实验会话上限；请显式管理存储目录")
            connection.execute(
                "INSERT INTO sessions(session_id, events_json, generation, revision) VALUES (?, ?, ?, 1)",
                (sid, encoded, generation))
            connection.commit()
        return 1

    def load(self, sid):
        sid = _session_id(sid)
        with self._connection() as connection:
            row = connection.execute(
                "SELECT events_json, generation, revision FROM sessions WHERE session_id=?", (sid,)
            ).fetchone()
        if row is None:
            return None
        return {"events": _decode_events(row[0]),
                "generation": _integer(row[1], 0, "存储的会话代次"),
                "revision": _integer(row[2], 1, "存储的会话版本")}

    def save(self, sid, events, generation, expected_revision):
        sid = _session_id(sid)
        generation = _integer(generation, 0, "会话代次")
        expected_revision = _integer(expected_revision, 1, "预期会话版本")
        if expected_revision == 9223372036854775807:
            raise ValueError("会话版本已达到存储上限")
        encoded = _encode_events(events)
        revision = expected_revision + 1
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                "SELECT events_json, generation, revision FROM sessions WHERE session_id=?", (sid,)
            ).fetchone()
            if row is None:
                raise ValueError("实验会话不存在")
            _decode_events(row[0])
            _integer(row[1], 0, "存储的会话代次")
            current_revision = _integer(row[2], 1, "存储的会话版本")
            if current_revision != expected_revision:
                raise ValueError("实验会话版本已变化，请重新读取")
            changed = connection.execute(
                "UPDATE sessions SET events_json=?, generation=?, revision=? "
                "WHERE session_id=? AND revision=?",
                (encoded, generation, revision, sid, expected_revision)).rowcount
            if changed != 1:
                raise ValueError("实验会话版本已变化，请重新读取")
            connection.commit()
        return revision
