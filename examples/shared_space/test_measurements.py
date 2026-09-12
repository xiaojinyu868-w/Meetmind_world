"""Measurements affect shared dimensions only by explicit versioned application."""
from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import unittest

from .domain import initial_state, apply_command, measurement_preview, evaluate, export_summary
from .serve import SpaceService, Conflict
from .proposals import proposal_messages
from examples.shared_experience.session_store import SQLiteSessionStore


def run(state, kind, actor="alice", **fields):
    return apply_command(state, actor, {"type": kind, **fields})


class MeasurementTests(unittest.TestCase):
    def ready(self):
        state = run(initial_state(), "action.add", text="复测沙发")
        return run(state, "action.report", action_id="action-1", status="done", note="量了最宽处")

    def record(self, state=None, **fields):
        return run(state or self.ready(), "measurement.record", action_id="action-1", 
                   **{"object_id": "sofa", "width": 2.4, "depth": .9, "height": .85, "source": "SOURCE_PRIVATE_MARKER",
                      "measured_on": "2026-09-12", **fields})

    def apply(self, state):
        return run(state, "measurement.apply", measurement_id=state["measurements"][-1]["id"],
                   basis_revision=state["revision"])

    def test_record_preview_apply_dimensions_and_preserve_other_state(self):
        before = self.ready()
        for actor in ("alice", "bo"):
            before = run(before, "decision.set", actor=actor, status="accepted", note="")
        state = self.record(before)
        m = state["measurements"][0]
        self.assertEqual(state["revision"], before["revision"])
        self.assertEqual(state["objects"], before["objects"])
        unchanged = deepcopy(state)
        preview = measurement_preview(state, m["id"])
        self.assertEqual(state, unchanged)
        self.assertEqual(preview["revision"], state["revision"])
        self.assertEqual(preview["sequence"], state["sequence"])
        self.assertEqual(preview["objects"][1]["width"], 2.4)
        result = self.apply(state)
        self.assertEqual(result["revision"], state["revision"] + 1)
        self.assertEqual(result["decisions"], state["decisions"])
        self.assertTrue(all(d["revision"] < result["revision"] for d in result["decisions"].values()))
        self.assertEqual(result["objects"][1]["measurement_id"], m["id"])
        for index in (0, 2, 3):
            self.assertEqual(result["objects"][index], state["objects"][index])
        for key in ("requirements", "memories", "actions"):
            self.assertEqual(result[key], state[key])

    def test_readiness_and_actor_boundaries(self):
        state = run(initial_state(), "action.add", text="测量")
        with self.assertRaisesRegex(ValueError, "完成"):
            self.record(state)
        state = self.ready()
        command = {"type": "measurement.record", "action_id": "action-1", "object_id": "sofa",
                   "width": 2, "depth": 1, "height": 1, "source": "本人", "measured_on": "2026-09-12"}
        with self.assertRaisesRegex(ValueError, "本人"):
            apply_command(state, "bo", command)
        recorded = self.record(state)
        with self.assertRaisesRegex(ValueError, "本人"):
            run(recorded, "measurement.withdraw", actor="bo", measurement_id="measurement-3")
        # Either member can propose/apply shared dimensions, never impersonating the source.
        result = run(recorded, "measurement.apply", actor="bo", measurement_id="measurement-3", basis_revision=1)
        self.assertEqual(result["measurements"][0]["owner"], "alice")
        self.assertEqual(result["history"][-1]["actor"], "bo")

    def test_strict_dimensions_date_source_atomicity(self):
        state = self.ready()
        for fields in ({"width": 0}, {"width": True}, {"depth": float("nan")}, {"height": float("inf")},
                       {"width": 10.01}, {"depth": .049}, {"source": ""}, {"source": "x" * 241},
                       {"measured_on": "2026-02-30"}, {"measured_on": "20260912"},
                       {"measured_on": []}, {"verified": True}, {"object_id": "missing"}):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                self.record(state, **fields)
        self.assertEqual(state, self.ready())
        for number in (.05, 10):
            self.assertEqual(self.record(width=number)["measurements"][0]["width"], number)

    def test_conflicting_measurement_is_visible_and_blocks_acceptance(self):
        state = self.record(width=4)
        result = self.apply(state)
        self.assertTrue(evaluate(result))
        self.assertEqual(result["objects"][1]["width"], 4)
        with self.assertRaises(ValueError):
            run(result, "decision.set", status="accepted", note="")
        with self.assertRaisesRegex(ValueError, "过期"):
            run(state, "measurement.apply", measurement_id="measurement-3", basis_revision=2)

    def test_withdraw_applied_source_preserves_dimensions_and_invalidates(self):
        applied = self.apply(self.record())
        result = run(applied, "measurement.withdraw", measurement_id="measurement-3")
        self.assertEqual(result["objects"], applied["objects"])
        self.assertEqual(result["revision"], applied["revision"] + 1)
        self.assertIn("measurement-stale:sofa", [v["id"] for v in evaluate(result)])
        with self.assertRaises(ValueError):
            measurement_preview(result, "measurement-3")
        with self.assertRaises(ValueError):
            run(result, "decision.set", status="accepted", note="")
        draft = self.record()
        withdrawn_draft = run(draft, "measurement.withdraw", measurement_id="measurement-3")
        self.assertEqual(withdrawn_draft["revision"], draft["revision"])

    def test_report_change_stales_only_linked_applied_measurement(self):
        state = self.apply(self.record())
        rereported = run(state, "action.report", action_id="action-1", status="done", note="原测量可能有误")
        self.assertEqual(rereported["revision"], state["revision"] + 1)
        self.assertTrue(any(v["id"] == "measurement-stale:sofa" for v in evaluate(rereported)))
        with self.assertRaises(ValueError):
            measurement_preview(rereported, "measurement-3")
        recovered = self.apply(self.record(rereported, width=2))
        self.assertFalse(evaluate(recovered))
        other = run(recovered, "action.add", actor="bo", text="别的行动")
        other_id = other["actions"][-1]["id"]
        reported_other = run(other, "action.report", actor="bo", action_id=other_id, status="done")
        self.assertEqual(reported_other["revision"], other["revision"])
        retracted = run(recovered, "action.report", action_id="action-1", status="pending")
        self.assertTrue(any(v["id"] == "measurement-stale:sofa" for v in evaluate(retracted)))

    def test_model_gets_dimensions_without_measurement_source(self):
        state = self.apply(self.record())
        messages = json.dumps(proposal_messages(state, "重新安排"), ensure_ascii=False)
        self.assertNotIn("SOURCE_PRIVATE_MARKER", messages)
        self.assertNotIn("report_version", messages)
        self.assertNotIn("measurement_id", messages)
        self.assertIn("2.4", messages)
        summary = export_summary(state, "bo")
        self.assertIn(r"SOURCE\_PRIVATE\_MARKER", summary)
        self.assertIn("未经独立核验", summary)
        self.assertIn("用于当前尺寸", summary)

    def test_service_preview_readonly_stale_proposal_and_persistent_replay(self):
        with TemporaryDirectory() as temp:
            directory = Path(temp) / "worlds"
            service = SpaceService(SQLiteSessionStore(directory))
            sid = service.create()
            sequence = 0
            def send(actor, command):
                nonlocal sequence
                result = service.command(sid, actor, {"command": command,
                    "expected_sequence": sequence, "request_id": "measurement-test-" + str(sequence)})
                sequence = result["sequence"]
                return result
            # Old command shapes without the new fields remain replayable.
            send("alice", {"type": "action.add", "text": "测量"})
            send("alice", {"type": "action.report", "action_id": "action-1", "status": "done"})
            proposed = service.propose(sid, "alice", {"mode": "demo", "instruction": "安排",
                                                      "expected_sequence": sequence})
            send("alice", {"type": "measurement.record", "action_id": "action-1", "object_id": "sofa",
                           "width": 2.2, "depth": .9, "height": .9, "source": "卷尺",
                           "measured_on": "2026-09-12"})
            before = service.state(sid)
            preview = service.preview_measurement(sid, "bo", {"measurement_id": "measurement-3", "expected_sequence": sequence})
            self.assertEqual(service.state(sid), before)
            self.assertEqual(preview["preview"]["objects"][1]["width"], 2.2)
            with self.assertRaises(Conflict):
                service.preview_measurement(sid, "bo", {"measurement_id": "measurement-3", "expected_sequence": 0})
            result = send("bo", {"type": "measurement.apply", "measurement_id": "measurement-3", "basis_revision": 1})
            with self.assertRaisesRegex(ValueError, "过期"):
                service.apply_proposal(sid, "alice", {"proposal_id": proposed["id"],
                    "expected_sequence": sequence, "request_id": "stale-layout-proposal"})
            self.assertEqual(SpaceService(SQLiteSessionStore(directory)).state(sid), result)
            with self.assertRaises(ValueError):
                service.preview_measurement(sid, "mallory", {"measurement_id": "measurement-3", "expected_sequence": sequence})

if __name__ == "__main__":
    unittest.main()
