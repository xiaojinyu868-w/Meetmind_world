import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from .serve import Lab, lab_data_directory
from .session_store import SQLiteSessionStore
from .serve_recipe_fixture import fixture_generator


class PersistentLabTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store = SQLiteSessionStore(Path(self.temp.name))
        self.lab = Lab(fixture_generator, self.store)
        self.sid = self.lab.create()["session_id"]

    def command(self, kind, **extra):
        return self.lab.command({"session_id": self.sid, "viewer": "alice",
            "subject_id": "artifact-1", "command": kind,
            "expected_sequence": self.lab.state(self.sid, "alice")["basis"]["through_sequence"], **extra})

    def test_reopen_preserves_full_event_history_and_all_viewer_projections(self):
        body = {"session_id": self.sid, "viewer": "alice", "subject_id": "artifact-1", "instruction": "测试"}
        proposal = self.lab.propose(body)
        self.command("visual.recipe.applied", proposal_id=proposal["proposal_id"])
        proposal = self.lab.propose({**body, "mode": "patch"})
        self.command("visual.recipe.patched", proposal_id=proposal["proposal_id"])
        self.command("action.accepted", subject_id="action-1")
        self.command("action.outcome.recorded", subject_id="action-1", result="completed", note="本人完成")
        self.command("checkin.import", record={"event_id": "private-visit", "provider": "fixture",
            "location": "画室", "occurred_at": "2026-09-12T12:00:00Z", "confirmed": True}, visibility="private")
        states = {viewer: self.lab.state(self.sid, viewer) for viewer in ["alice", "bo", "observer"]}
        reopened = Lab(store=SQLiteSessionStore(Path(self.temp.name)))
        self.assertTrue(reopened.resume(self.sid)["persistent"])
        for viewer, state in states.items():
            self.assertEqual(reopened.state(self.sid, viewer), state)
        self.assertFalse(reopened.proposals)
        self.assertFalse(reopened.generating)

    def test_failed_save_does_not_apply_command_or_clear_proposals(self):
        proposal = self.lab.propose({"session_id": self.sid, "viewer": "alice",
                                    "subject_id": "artifact-1", "instruction": "测试"})
        before = self.lab.state(self.sid, "alice")
        generation = self.lab.generations[self.sid]
        with patch.object(self.store, "save", side_effect=ValueError("simulated write failure")):
            with self.assertRaises(ValueError):
                self.command("reset", through=4)
        self.assertEqual(self.lab.state(self.sid, "alice"), before)
        self.assertEqual(self.lab.generations[self.sid], generation)
        self.assertEqual(self.lab.proposals[(self.sid, "alice")]["id"], proposal["proposal_id"])

    def test_second_process_reset_invalidates_old_proposal_even_if_content_matches(self):
        proposal = self.lab.propose({"session_id": self.sid, "viewer": "alice",
                                    "subject_id": "artifact-1", "instruction": "测试"})
        other = Lab(store=SQLiteSessionStore(Path(self.temp.name)))
        other.command({"session_id": self.sid, "viewer": "alice", "command": "reset",
                       "through": 8, "expected_sequence": 8})
        with self.assertRaises(ValueError):
            self.command("visual.recipe.applied", proposal_id=proposal["proposal_id"])

    def test_stale_writer_cannot_overwrite_other_process_event(self):
        other = Lab(store=SQLiteSessionStore(Path(self.temp.name)))
        self.lab.state(self.sid, "alice")
        stale_events = self.lab.sessions[self.sid]
        other.command({"session_id": self.sid, "viewer": "alice", "subject_id": "action-1",
                       "command": "action.accepted", "expected_sequence": 8})
        with self.assertRaises(ValueError):
            self.lab._save(self.sid, stale_events)
        self.assertEqual(self.lab.state(self.sid, "alice")["basis"]["through_sequence"], 9)

    def test_production_and_served_paths_cannot_be_used_as_storage(self):
        root = Path(__file__).resolve().parents[2]
        for relative in ["", "backend", "backend/data", "backend/data/child", "public", "dist",
                         "examples/shared_experience/lab/dist"]:
            with self.subTest(relative=relative), self.assertRaises(ValueError):
                lab_data_directory(root / relative)
        self.assertEqual(lab_data_directory(self.temp.name), Path(self.temp.name).resolve())

    def test_corrupt_or_missing_history_is_not_silently_replaced(self):
        missing = "a" * 32
        with self.assertRaises(ValueError):
            self.lab.resume(missing)
        revision = self.store.load(self.sid)["revision"]
        self.store.save(self.sid, [{"not": "an event"}], 0, revision)
        fresh = Lab(store=SQLiteSessionStore(Path(self.temp.name)))
        with self.assertRaises(ValueError):
            fresh.resume(self.sid)
        self.assertEqual(self.store.load(self.sid)["events"], [{"not": "an event"}])


if __name__ == "__main__":
    unittest.main()
