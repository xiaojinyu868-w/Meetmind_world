from copy import deepcopy
import unittest

from .serve import Lab


def plan():
    return {"scheduled_at": "2026-09-15T19:30:00+08:00", "duration_minutes": 45,
            "location": "楼下咖啡厅", "success_criteria": "一起选出三张旅行照片"}


class NewActionTests(unittest.TestCase):
    def setUp(self):
        self.lab = Lab()
        self.sid = self.lab.create()["session_id"]
        self.body = {"session_id": self.sid, "viewer": "alice", "subject_id": "memory-1",
                     "command": "action.proposed", "request_id": "action-test-0001",
                     "title": "一起整理旅行照片", "participant_ids": ["alice", "bo"], "plan": plan(),
                     "expected_sequence": 8}

    def command(self, command, subject_id, viewer="alice", **extra):
        return self.lab.command({"session_id": self.sid, "viewer": viewer, "command": command,
                                "subject_id": subject_id, "expected_sequence":
                                self.lab.state(self.sid, viewer)["basis"]["through_sequence"], **extra})

    def test_create_from_existing_experience_then_independent_decisions_and_results(self):
        after = self.lab.command(self.body)
        action = next(i for i in after["entities"] if i["id"] == "action-alice-action-test-0001")
        self.assertEqual(action["decisions"], {})
        self.assertEqual(action["outcomes"], {})
        self.assertEqual(action["basis_event_ids"], ["evt-05"])
        self.assertEqual(action["plan"]["scheduled_at"], "2026-09-15T11:30:00Z")
        self.assertNotIn(action["id"], {e["id"] for e in self.lab.state(self.sid, "observer")["entities"]})
        self.command("action.accepted", action["id"])
        self.command("action.declined", action["id"], viewer="bo")
        state = self.command("action.outcome.recorded", action["id"],
                             result="completed", note="我选出了三张照片")
        current = next(i for i in state["entities"] if i["id"] == action["id"])
        self.assertEqual(set(current["outcomes"]), {"alice"})
        self.assertEqual(current["decisions"]["bo"]["status"], "declined")
        with self.assertRaises(ValueError):
            self.command("action.outcome.recorded", action["id"], viewer="bo",
                         result="completed", note="未接受不能提交")
        self.command("action.outcome.revoked", action["id"])
        self.command("experience.revoked", "memory-1")
        current = next(i for i in self.lab.state(self.sid, "alice")["entities"] if i["id"] == action["id"])
        self.assertEqual(current["basis_status"], "withdrawn")
        self.assertEqual(current["basis_event_ids"], [])
        self.assertEqual(current["outcomes"], {})

    def test_retry_after_other_actions_or_basis_withdrawal_does_not_duplicate(self):
        first = self.lab.command(self.body)
        self.assertEqual(self.lab.command(self.body), first)
        self.command("action.accepted", "action-alice-action-test-0001")
        before = self.lab.state(self.sid, "alice")
        self.assertEqual(self.lab.command(self.body), before)
        with self.assertRaises(ValueError):
            self.lab.command({**self.body, "title": "不同请求"})
        self.command("experience.revoked", "memory-1")
        after = self.lab.state(self.sid, "alice")
        self.assertEqual(self.lab.command(self.body), after)
        self.assertEqual(sum(i["id"] == "action-alice-action-test-0001" for i in after["entities"]), 1)

    def test_invalid_requests_are_atomic(self):
        before = deepcopy(self.lab.state(self.sid, "alice"))
        for updates in [
            {"title": " "}, {"title": "x" * 161}, {"request_id": "../unsafe"},
            {"participant_ids": ["bo"]}, {"participant_ids": ["alice", "alice"]},
            {"participant_ids": ["alice", "observer"]}, {"participant_ids": [None]},
            {"subject_id": "action-1"}, {"subject_id": "absent"}, {"plan": {}},
            {"expected_sequence": 1},
        ]:
            with self.subTest(updates=updates), self.assertRaises(ValueError):
                self.lab.command({**self.body, **updates})
            self.assertEqual(self.lab.state(self.sid, "alice"), before)

    def test_private_import_can_only_basis_own_private_action(self):
        state = self.command("checkin.import", "memory-1",
            record={"event_id": "visit-action", "provider": "synthetic", "location": "画室",
                    "occurred_at": "2026-09-12T12:00:00+08:00", "confirmed": True}, visibility="private")
        source = next(i for i in state["entities"] if i.get("source"))
        self.assertEqual(source["action_candidate_ids"], ["alice"])
        body = {**self.body, "subject_id": source["id"],
                "expected_sequence": state["basis"]["through_sequence"]}
        with self.assertRaises(ValueError):
            self.lab.command(body)
        result = self.lab.command({**body, "participant_ids": ["alice"]})
        action = next(i for i in result["entities"] if i["id"] == "action-alice-action-test-0001")
        self.assertEqual(action["plan"]["success_criteria"], plan()["success_criteria"])
        self.assertNotIn(action["id"], {i["id"] for i in self.lab.state(self.sid, "bo")["entities"]})


if __name__ == "__main__":
    unittest.main()
