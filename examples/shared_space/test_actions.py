"""Action records preserve actor boundaries and replay old command logs."""
from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from .domain import initial_state, apply_command, export_summary
from .serve import SpaceService, Conflict
from examples.shared_experience.session_store import SQLiteSessionStore


class ActionTests(unittest.TestCase):
    def add(self, state=None, **fields):
        return apply_command(state or initial_state(), "alice", {
            "type": "action.add", "text": "测量门宽", **fields})

    def test_structured_report_and_retraction_preserve_decisions(self):
        state = initial_state()
        for actor in ("alice", "bo"):
            state = apply_command(state, actor, {"type": "decision.set", "status": "accepted", "note": ""})
        state = self.add(state, due_at="2026-09-19", completion_criteria="记录最窄处净宽",
                         measurement="门框净宽", result_source="本人测量")
        action = state["actions"][0]
        decisions = deepcopy(state["decisions"])
        self.assertEqual(action["owner"], "alice")
        reported = apply_command(state, "alice", {"type": "action.report", "action_id": action["id"],
            "status": "done", "note": "两次测得82cm", "result_source": "卷尺，9月19日"})
        self.assertEqual(reported["decisions"], decisions)
        self.assertEqual(reported["revision"], state["revision"])
        self.assertEqual(reported["actions"][0]["report_note"], "两次测得82cm")
        summary = export_summary(reported, "bo")
        for text in ("2026-09-19", "记录最窄处净宽", "门框净宽", "卷尺，9月19日", "两次测得82cm", "双方接受同一版本"):
            self.assertIn(text, summary)
        withdrawn = apply_command(reported, "alice", {"type": "action.report", "action_id": action["id"], "status": "pending"})
        self.assertEqual(withdrawn["actions"][0]["report_note"], "")
        self.assertEqual(withdrawn["actions"][0]["status"], "pending")
        self.assertNotIn("两次测得82cm", export_summary(withdrawn, "alice"))
        self.assertEqual(withdrawn["actions"][0]["result_source"], "卷尺，9月19日")
        self.assertEqual(state["actions"][0]["status"], "pending")

    def test_cannot_assign_or_report_for_other_person(self):
        with self.assertRaises(ValueError):
            self.add(owner="bo")
        state = self.add()
        with self.assertRaisesRegex(ValueError, "本人"):
            apply_command(state, "bo", {"type": "action.report", "action_id": "action-1", "status": "done", "note": "替他完成"})
        self.assertEqual(state["actions"][0]["status"], "pending")

    def test_invalid_fields_are_atomic_and_strict(self):
        for fields in ({"due_at": 123}, {"completion_criteria": "x" * 361},
                       {"measurement": []}, {"result_source": "x" * 241}, {"due_at": "bad" + chr(0)}):
            before = initial_state()
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                self.add(before, **fields)
            self.assertEqual(before, initial_state())
        state = self.add()
        original = deepcopy(state)
        for fields in ({"note": []}, {"note": "x" * 361}, {"result_source": {"url": "x"}}, {"verified": True}):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                apply_command(state, "alice", {"type": "action.report", "action_id": "action-1", "status": "done", **fields})
            self.assertEqual(state, original)

    def test_old_persisted_logs_replay_and_new_results_survive_reopen(self):
        with TemporaryDirectory() as directory:
            store = SQLiteSessionStore(Path(directory) / "worlds")
            # Exact shape persisted before structured action fields existed.
            store.create("0123456789abcdef0123456789abcdef", [
                {"schema": "meetmind.shared-space-log.v1", "type": "created"},
                {"actor": "alice", "command": {"type": "action.add", "text": "测量门宽"}, "request_id": "legacy-add"},
                {"actor": "alice", "command": {"type": "action.report", "action_id": "action-1", "status": "done"}, "request_id": "legacy-report"}])
            service = SpaceService(store)
            state = service.state("0123456789abcdef0123456789abcdef")
            for key in ("due_at", "completion_criteria", "measurement", "result_source", "report_note"):
                self.assertEqual(state["actions"][0][key], "")
            body = {"expected_sequence": 2, "request_id": "new-report-1", "command":
                {"type": "action.report", "action_id": "action-1", "status": "not_done", "note": "还差门框最窄处", "result_source": "本人复测"}}
            result = service.command("0123456789abcdef0123456789abcdef", "alice", body)
            self.assertEqual(service.command("0123456789abcdef0123456789abcdef", "alice", body), result)
            with self.assertRaises(Conflict):
                service.command("0123456789abcdef0123456789abcdef", "alice", {**body, "request_id": "stale-report"})
            reopened = SpaceService(SQLiteSessionStore(Path(directory) / "worlds"))
            self.assertEqual(reopened.state("0123456789abcdef0123456789abcdef"), result)
            self.assertEqual(result["actions"][0]["status"], "not_done")

    def test_all_new_text_is_escaped_in_export(self):
        payload = "<script>oops</script> [link](https://example.com)"
        state = self.add(due_at=payload, completion_criteria=payload, measurement=payload, result_source=payload)
        state = apply_command(state, "alice", {"type": "action.report", "action_id": "action-1", "status": "done", "note": payload})
        summary = export_summary(state, "alice")
        self.assertNotIn("<script>", summary)
        self.assertNotIn("[link](", summary)
        self.assertIn("&lt;script&gt;", summary)
        self.assertIn("仅为本人自报", summary)


if __name__ == "__main__":
    unittest.main()
