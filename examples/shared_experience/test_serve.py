from copy import deepcopy
import unittest

from .serve import Lab


class LabTests(unittest.TestCase):
    def setUp(self):
        self.lab = Lab()
        self.sid = self.lab.create()["session_id"]

    def command(self, name, **fields):
        viewer = fields.pop("viewer", "alice")
        state = self.lab.state(self.sid, viewer)
        body = {"session_id": self.sid, "viewer": viewer,
                "expected_sequence": state["basis"]["through_sequence"],
                "subject_id": "action-1", "command": name, **fields}
        return self.lab.command(body)

    def test_sessions_are_isolated_and_state_views_filter_candidates(self):
        other = self.lab.create()["session_id"]
        self.command("action.accepted")
        self.assertEqual(self.lab.state(other, "alice")["basis"]["through_sequence"], 8)
        self.assertEqual(self.lab.state(self.sid, "alice")["basis"]["through_sequence"], 9)
        def ids(viewer):
            return {item["id"] for item in self.lab.state(self.sid, viewer)["entities"]}
        self.assertNotIn("candidate-e", ids("alice"))
        self.assertIn("candidate-e", ids("observer"))

    def test_invalid_stale_and_unauthorized_commands_leave_state_unchanged(self):
        before = deepcopy(self.lab.state(self.sid, "alice"))
        with self.assertRaises(ValueError):
            self.command("action.accepted", viewer="observer")
        with self.assertRaises(ValueError):
            self.command("action.outcome.recorded", result="completed", note="not accepted")
        with self.assertRaises(ValueError):
            self.command("inference.superseded", viewer="bo", subject_id="artifact-1", title="bad")
        with self.assertRaises(ValueError):
            self.command("action.accepted", expected_sequence=1)
        self.assertEqual(before, self.lab.state(self.sid, "alice"))

    def test_complete_individual_feedback_loop_and_reset(self):
        self.command("action.accepted")
        self.command("action.declined", viewer="bo")
        state = self.command("action.outcome.recorded", result="completed", note="本人完成")
        action = next(item for item in state["entities"] if item["id"] == "action-1")
        self.assertEqual(set(action["outcomes"]), {"alice"})
        state = self.command("action.outcome.revoked")
        action = next(item for item in state["entities"] if item["id"] == "action-1")
        self.assertEqual(action["outcomes"], {})
        self.command("experience.revoked", subject_id="memory-1")
        state = self.command("reset", through=8)
        self.assertEqual(state["basis"]["through_sequence"], 8)
        self.assertIn("memory-1", {item["id"] for item in state["entities"]})


if __name__ == "__main__":
    unittest.main()
