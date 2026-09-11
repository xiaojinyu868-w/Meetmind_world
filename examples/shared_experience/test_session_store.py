"""Persistence contract tests; all databases live in temporary directories."""
import os
from pathlib import Path
import sqlite3
import stat
from tempfile import TemporaryDirectory
import unittest

from .session_store import SQLiteSessionStore

SID = "a" * 32
OTHER = "b" * 32


def events(title="纸桥"):
    return [{"schema": "meetmind.event.v1", "sequence": 1,
             "payload": {"title": title, "nested": [{"value": True}]}}]


class SessionStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name) / "isolated-lab"
        self.store = SQLiteSessionStore(self.directory)

    def sql(self, statement, parameters=()):
        with sqlite3.connect(self.store.path) as connection:
            connection.execute(statement, parameters)

    def test_reopen_preserves_history_generation_revision_and_copies(self):
        original = events()
        self.assertEqual(self.store.create(SID, original), 1)
        original[0]["payload"]["title"] = "caller changed"
        reopened = SQLiteSessionStore(self.directory)
        self.assertEqual(reopened.load(SID), {"events": events(), "generation": 0, "revision": 1})
        self.assertEqual(reopened.save(SID, events("灯"), 2, 1), 2)
        loaded = self.store.load(SID)
        self.assertEqual(loaded, {"events": events("灯"), "generation": 2, "revision": 2})
        loaded["events"][0]["payload"]["nested"].append(None)
        self.assertEqual(self.store.load(SID)["events"], events("灯"))

    def test_two_instances_compare_and_swap_without_lost_update(self):
        second = SQLiteSessionStore(self.directory)
        self.store.create(SID, events())
        first_basis, second_basis = self.store.load(SID), second.load(SID)
        self.assertEqual(self.store.save(SID, events("first"), 0, first_basis["revision"]), 2)
        with self.assertRaisesRegex(ValueError, "版本已变化"):
            second.save(SID, events("stale"), 99, second_basis["revision"])
        self.assertEqual(second.load(SID),
                         {"events": events("first"), "generation": 0, "revision": 2})

    def test_failed_sql_write_rolls_back_every_field(self):
        self.store.create(SID, events())
        before = self.store.load(SID)
        self.sql("CREATE TRIGGER reject_save BEFORE UPDATE ON sessions "
                 "BEGIN SELECT RAISE(ABORT, 'do not expose internal details'); END")
        with self.assertRaises(ValueError) as caught:
            self.store.save(SID, events("rejected"), 7, 1)
        self.assertNotIn("internal", str(caught.exception))
        self.assertNotIn(str(self.directory), str(caught.exception))
        self.assertEqual(self.store.load(SID), before)
        self.sql("DROP TRIGGER reject_save")
        self.assertEqual(self.store.save(SID, events("allowed"), 1, 1), 2)

    def test_duplicate_missing_and_invalid_ids(self):
        self.assertIsNone(self.store.load(SID))
        with self.assertRaisesRegex(ValueError, "不存在"):
            self.store.save(SID, events(), 0, 1)
        self.store.create(SID, events())
        with self.assertRaisesRegex(ValueError, "已存在"):
            self.store.create(SID, events("overwrite"), 2)
        self.assertEqual(self.store.load(SID)["events"], events())
        for sid in ("../other", "a" * 31, "a" * 33, "A" * 32,
                    "a" * 32 + "\n", None, [], "g" * 32):
            for operation in (lambda: self.store.create(sid, events()),
                              lambda: self.store.load(sid),
                              lambda: self.store.save(sid, events(), 0, 1)):
                with self.subTest(sid=sid), self.assertRaises(ValueError):
                    operation()
        self.assertEqual(set(self.directory.iterdir()), {self.store.path})

    def test_capacity_does_not_delete_or_overwrite_existing_sessions(self):
        for index in range(100):
            self.store.create(f"{index:032x}", events(str(index)))
        with self.assertRaisesRegex(ValueError, "100"):
            self.store.create(SID, events())
        self.assertEqual(self.store.load("0" * 32)["events"], events("0"))
        self.assertEqual(self.store.save("0" * 32, events("updated"), 1, 1), 2)

    def test_invalid_json_values_or_counters_never_partially_write(self):
        self.store.create(SID, events())
        baseline = self.store.load(SID)
        cyclic = [{}]
        cyclic[0]["cycle"] = cyclic
        invalid = [{}, [1], [{"x": float("nan")}], [{"x": float("inf")}],
                   [{"x": {1: "coerced"}}], [{"x": (1, 2)}], cyclic]
        for value in invalid:
            with self.subTest(value_type=type(value)), self.assertRaises(ValueError):
                self.store.save(SID, value, 2, 1)
            self.assertEqual(self.store.load(SID), baseline)
        for value in (True, -1, 1.5, "1", None, 2**63):
            with self.subTest(counter=value), self.assertRaises(ValueError):
                self.store.create(OTHER, events(), value)
            self.assertIsNone(self.store.load(OTHER))
        for value in (True, 0, -1, 1.5, "1", None, 2**63):
            with self.subTest(revision=value), self.assertRaises(ValueError):
                self.store.save(SID, events("bad"), 0, value)
        self.assertEqual(self.store.load(SID), baseline)

    def test_malformed_stored_events_fail_on_load_and_save_without_reset(self):
        self.store.create(SID, events())
        for raw in ('{"bad":"not list"}', '[1]', '[{"a":NaN}]',
                    '[{"a":1,"a":2}]', 'incomplete', '[{"a":1e999}]'):
            self.sql("UPDATE sessions SET events_json=? WHERE session_id=?", (raw, SID))
            with self.subTest(raw=raw), self.assertRaisesRegex(ValueError, "损坏"):
                self.store.load(SID)
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                self.store.save(SID, events("would erase corrupt history"), 0, 1)
            with sqlite3.connect(self.store.path) as connection:
                self.assertEqual(connection.execute("SELECT events_json FROM sessions").fetchone()[0], raw)

    def test_invalid_stored_counters_fail(self):
        self.store.create(SID, events())
        for column, value in (("generation", "bad"), ("revision", "bad")):
            self.sql(f"UPDATE sessions SET {column}=? WHERE session_id=?", (value, SID))
            with self.assertRaises(ValueError):
                self.store.load(SID)
            self.sql(f"UPDATE sessions SET {column}=? WHERE session_id=?",
                     (0 if column == "generation" else 1, SID))

    def test_incompatible_or_invalid_schema_is_never_reset(self):
        self.store.create(SID, events())
        self.sql("PRAGMA user_version=2")
        with self.assertRaisesRegex(ValueError, "版本不兼容"):
            SQLiteSessionStore(self.directory)
        with self.assertRaisesRegex(ValueError, "版本不兼容"):
            self.store.load(SID)
        self.sql("PRAGMA user_version=1")
        self.assertEqual(self.store.load(SID)["events"], events())
        self.sql("ALTER TABLE sessions RENAME TO preserved_sessions")
        with self.assertRaisesRegex(ValueError, "结构无效"):
            SQLiteSessionStore(self.directory)

    def test_nonempty_unversioned_database_is_not_adopted(self):
        other = Path(self.temp.name) / "unknown"
        other.mkdir()
        with sqlite3.connect(other / "sessions.sqlite3") as connection:
            connection.execute("CREATE TABLE valuable_data (value TEXT)")
            connection.execute("INSERT INTO valuable_data VALUES ('keep')")
        with self.assertRaisesRegex(ValueError, "版本不兼容"):
            SQLiteSessionStore(other)
        with sqlite3.connect(other / "sessions.sqlite3") as connection:
            self.assertEqual(connection.execute("SELECT value FROM valuable_data").fetchone()[0], "keep")

    def test_corrupt_sqlite_file_fails_without_replacing_it(self):
        other = Path(self.temp.name) / "corrupted"
        other.mkdir()
        path = other / "sessions.sqlite3"
        bad = b"This is not a SQLite database."
        path.write_bytes(bad)
        with self.assertRaisesRegex(ValueError, "未重置"):
            SQLiteSessionStore(other)
        self.assertEqual(path.read_bytes(), bad)

    @unittest.skipIf(os.name == "nt", "POSIX permissions")
    def test_directory_and_database_permissions_are_private(self):
        self.assertEqual(stat.S_IMODE(self.directory.stat().st_mode), 0o700)
        self.assertEqual(stat.S_IMODE(self.store.path.stat().st_mode), 0o600)

    @unittest.skipIf(os.name == "nt", "POSIX symlink")
    def test_database_symlink_is_not_followed(self):
        other = Path(self.temp.name) / "linked"
        other.mkdir()
        (other / "sessions.sqlite3").symlink_to(self.store.path)
        self.store.create(SID, events())
        with self.assertRaisesRegex(ValueError, "符号链接"):
            SQLiteSessionStore(other)
        self.assertEqual(self.store.load(SID)["events"], events())


if __name__ == "__main__":
    unittest.main()
