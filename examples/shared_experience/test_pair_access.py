"""Capability tests use temporary directories and synthetic session IDs."""
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import hashlib
import os
from pathlib import Path
import secrets
import sqlite3
import stat
from tempfile import TemporaryDirectory
import threading
import unittest
from unittest.mock import patch

from .pair_access import PairAccessStore
from .session_store import SQLiteSessionStore

SID = "a" * 32
OTHER = "b" * 32
WEEK = 7 * 24 * 60 * 60


def _process_join(args):
    directory, invitation = args
    try:
        return PairAccessStore(directory).join(invitation)
    except ValueError:
        return None


class PairAccessTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name) / "pair"
        self.clock = [1000000.0]
        self.store = PairAccessStore(self.directory, now=lambda: self.clock[0])
        self.owner = self.store.register_owner(SID)

    def reopened(self):
        return PairAccessStore(self.directory, now=lambda: self.clock[0])

    def assertInvalid(self, token, operation=None):
        with self.assertRaisesRegex(ValueError, "^访问凭证无效或已过期$"):
            (operation or self.store.resolve)(token)

    def test_reopen_preserves_role_and_stores_hashes_not_tokens(self):
        invitation = self.store.create_invite(self.owner)
        with sqlite3.connect(self.store.path) as connection:
            row = connection.execute(
                "SELECT owner_hash,invite_hash FROM pairs"
            ).fetchone()
            self.assertEqual(row, tuple(hashlib.sha256(value.encode()).hexdigest()
                                      for value in (self.owner, invitation)))
        self.assertEqual(self.reopened().resolve(self.owner),
                         {"session_id": SID, "viewer": "alice"})
        guest = self.reopened().join(invitation)
        self.assertEqual(guest["viewer"], "bo")
        self.assertEqual(self.reopened().resolve(guest["token"]),
                         {"session_id": SID, "viewer": "bo"})
        for path in self.directory.iterdir():
            if path.is_file():
                data = path.read_bytes()
                for token in (self.owner, invitation, guest["token"]):
                    self.assertNotIn(token.encode(), data)
        returned = self.store.resolve(self.owner)
        returned["viewer"] = "bo"
        self.assertEqual(self.store.resolve(self.owner)["viewer"], "alice")

    def test_tokens_are_32_random_bytes_and_roles_are_not_interchangeable(self):
        with patch("examples.shared_experience.pair_access.secrets.token_urlsafe",
                   wraps=secrets.token_urlsafe) as generate:
            invitation = self.store.create_invite(self.owner)
            guest = self.store.join(invitation)["token"]
        self.assertEqual([call.args for call in generate.call_args_list], [(32,), (32,)])
        for token in (self.owner, invitation, guest):
            self.assertEqual(len(token), 43)
            self.assertRegex(token, r"^[A-Za-z0-9_-]+$")
        self.assertEqual(len({self.owner, invitation, guest}), 3)
        self.assertInvalid(invitation)
        self.assertInvalid(self.owner, self.store.join)
        self.assertInvalid(guest, self.store.create_invite)
        self.assertInvalid(guest, self.store.revoke_guest)
        self.assertInvalid(invitation, self.store.revoke_guest)

    def test_owner_registration_is_unique_and_session_id_is_strict(self):
        with self.assertRaises(ValueError):
            self.store.register_owner(SID)
        for sid in (None, [], "../other", "g" * 32, "A" * 32, "a" * 31,
                    "a" * 33, SID + "\n"):
            with self.subTest(sid=sid), self.assertRaises(ValueError):
                self.store.register_owner(sid)
        self.assertEqual(self.store.resolve(self.owner)["session_id"], SID)

    def test_expiration_boundary_and_invalid_tokens_share_generic_error(self):
        for token in (None, [], {}, 1, "", "x" * 43, self.owner + "\n",
                      "a" * 42, "a" * 44, "!" * 43, "中文"):
            with self.subTest(token=token):
                self.assertInvalid(token)
        self.clock[0] += WEEK - 0.01
        self.assertEqual(self.store.resolve(self.owner)["viewer"], "alice")
        self.clock[0] += 0.01
        self.assertInvalid(self.owner)
        self.assertInvalid(self.owner, self.store.create_invite)
        self.assertInvalid(self.owner, self.store.revoke_guest)

    def test_invite_expires_at_thirty_minutes_and_can_be_reissued(self):
        invitation = self.store.create_invite(self.owner)
        self.clock[0] += 1800
        self.assertInvalid(invitation, self.store.join)
        next_invitation = self.reopened().create_invite(self.owner)
        self.assertNotEqual(invitation, next_invitation)
        self.assertInvalid(invitation, self.store.join)
        self.assertEqual(self.store.join(next_invitation)["viewer"], "bo")

    def test_invite_cannot_outlive_owner_and_guest_expires_from_join(self):
        self.clock[0] += 100
        invitation = self.store.create_invite(self.owner)
        guest = self.store.join(invitation)["token"]
        self.clock[0] += WEEK - 100
        self.assertInvalid(self.owner)
        self.assertEqual(self.store.resolve(guest)["viewer"], "bo")
        self.clock[0] += 100
        self.assertInvalid(guest)

        self.clock[0] = 2000000
        second_owner = self.store.register_owner(OTHER)
        self.clock[0] += WEEK - 10
        invitation = self.store.create_invite(second_owner)
        self.clock[0] += 10
        self.assertInvalid(invitation, self.store.join)

    def test_new_pending_invite_invalidates_old_and_join_is_once(self):
        first = self.store.create_invite(self.owner)
        second = self.reopened().create_invite(self.owner)
        self.assertInvalid(first, self.store.join)
        guest = self.store.join(second)
        self.assertInvalid(second, self.store.join)
        with self.assertRaisesRegex(ValueError, "已有加入者"):
            self.store.create_invite(self.owner)
        self.assertEqual(self.store.resolve(guest["token"])["viewer"], "bo")

    def test_revoke_clears_guest_and_pending_invite_then_allows_rejoin(self):
        first = self.store.create_invite(self.owner)
        self.assertIsNone(self.reopened().revoke_guest(self.owner))
        self.assertInvalid(first, self.store.join)
        guest = self.store.join(self.store.create_invite(self.owner))
        self.store.revoke_guest(self.owner)
        self.assertInvalid(guest["token"])
        self.assertEqual(self.store.resolve(self.owner)["viewer"], "alice")
        new_guest = self.store.join(self.store.create_invite(self.owner))
        self.assertNotEqual(new_guest["token"], guest["token"])
        self.assertInvalid(guest["token"])
        self.assertEqual(self.store.resolve(new_guest["token"])["viewer"], "bo")

    def test_cross_session_actions_cannot_change_other_session_capabilities(self):
        other_owner = self.store.register_owner(OTHER)
        first = self.store.join(self.store.create_invite(self.owner))
        second = self.store.join(self.store.create_invite(other_owner))
        self.assertEqual(self.store.resolve(second["token"]),
                         {"session_id": OTHER, "viewer": "bo"})
        self.store.revoke_guest(other_owner)
        self.assertInvalid(second["token"])
        self.assertEqual(self.store.resolve(first["token"]),
                         {"session_id": SID, "viewer": "bo"})
        self.assertEqual(self.store.resolve(self.owner),
                         {"session_id": SID, "viewer": "alice"})
        self.assertEqual(self.store.resolve(other_owner),
                         {"session_id": OTHER, "viewer": "alice"})

    def test_concurrent_connections_consume_invite_once(self):
        invitation = self.store.create_invite(self.owner)
        barrier = threading.Barrier(8)

        def join(_):
            reopened = self.reopened()
            barrier.wait(timeout=15)
            try:
                return reopened.join(invitation)
            except ValueError:
                return None

        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(join, range(8)))
        winners = [item for item in results if item is not None]
        self.assertEqual(len(winners), 1)
        self.assertEqual(self.store.resolve(winners[0]["token"])["viewer"], "bo")

    def test_independent_processes_consume_invite_once(self):
        real_store = PairAccessStore(self.directory)
        owner = real_store.register_owner("c" * 32)
        invitation = real_store.create_invite(owner)
        with ProcessPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(_process_join,
                                    [(str(self.directory), invitation)] * 8))
        winners = [item for item in results if item is not None]
        self.assertEqual(len(winners), 1)
        self.assertEqual(real_store.resolve(winners[0]["token"]),
                         {"session_id": "c" * 32, "viewer": "bo"})

    def test_failed_join_write_keeps_invite_usable_and_exposes_no_sql(self):
        invitation = self.store.create_invite(self.owner)
        with sqlite3.connect(self.store.path) as connection:
            connection.execute("CREATE TRIGGER reject_guest BEFORE UPDATE ON pairs "
                               "BEGIN SELECT RAISE(ABORT, 'private_sql_detail'); END")
        with self.assertRaises(ValueError) as caught:
            self.store.join(invitation)
        self.assertNotIn("private_sql_detail", str(caught.exception))
        self.assertNotIn(str(self.directory), str(caught.exception))
        with sqlite3.connect(self.store.path) as connection:
            connection.execute("DROP TRIGGER reject_guest")
        self.assertEqual(self.store.join(invitation)["viewer"], "bo")

    def test_private_separate_database_and_version_refusal_preserve_data(self):
        sessions = SQLiteSessionStore(self.directory)
        sessions.create(SID, [])
        self.assertNotEqual(sessions.path, self.store.path)
        if os.name != "nt":
            self.assertEqual(stat.S_IMODE(self.directory.stat().st_mode), 0o700)
            self.assertEqual(stat.S_IMODE(self.store.path.stat().st_mode), 0o600)
        with sqlite3.connect(self.store.path) as connection:
            self.assertEqual(connection.execute("PRAGMA user_version").fetchone()[0], 1)
            self.assertNotEqual(connection.execute("PRAGMA application_id").fetchone()[0], 0)
            connection.execute("PRAGMA user_version = 99")
        before = self.store.path.read_bytes()
        with self.assertRaisesRegex(ValueError, "不兼容"):
            self.reopened()
        self.assertEqual(self.store.path.read_bytes(), before)
        self.assertEqual(sessions.load(SID)["events"], [])

    def test_random_collision_never_gives_owner_token_a_guest_meaning(self):
        with patch("examples.shared_experience.pair_access.secrets.token_urlsafe",
                   return_value=self.owner):
            with self.assertRaisesRegex(ValueError, "无法生成"):
                self.store.create_invite(self.owner)
        self.assertEqual(self.store.resolve(self.owner)["viewer"], "alice")
        self.assertInvalid(self.owner, self.store.join)
        self.assertEqual(self.store.join(self.store.create_invite(self.owner))["viewer"], "bo")

    def test_symlink_database_rejected_without_touching_target(self):
        if os.name == "nt":
            self.skipTest("symlink creation requires elevated Windows privileges")
        directory = self.directory / "symlink-case"
        directory.mkdir()
        target = self.directory / "untouched"
        target.write_bytes(b"original")
        (directory / "capabilities.sqlite3").symlink_to(target)
        with self.assertRaises(ValueError):
            PairAccessStore(directory)
        self.assertEqual(target.read_bytes(), b"original")


if __name__ == "__main__":
    unittest.main()
