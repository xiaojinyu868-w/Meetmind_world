"""Regression tests for the shared experience contract; standard library only."""
from copy import deepcopy
import json
import tempfile
from pathlib import Path
import unittest

from .replay import DuplicateEventConflict, load_fixture, project_events


class ReplayTests(unittest.TestCase):
    def setUp(self):
        self.fixture, self.events = load_fixture()

    def project(self, events=None, viewer="alice"):
        return project_events(self.events if events is None else events,
                              viewer_id=viewer, members=self.fixture["members"])

    def by_id(self, events=None, viewer="alice"):
        return {item["id"]: item for item in self.project(events, viewer)["entities"]}

    def append(self, events, type_, actor, subject, payload, refs, audience=None):
        return [*deepcopy(events), {
            "schema": "meetmind.event.v1", "event_id": "appended",
            "sequence": len(events) + 1, "room_id": "shared-demo",
            "actor_id": actor, "subject_id": subject, "type": type_, "payload": payload,
            "audience": audience or self.fixture["members"], "source_refs": refs,
        }]

    def test_shared_choices_do_not_become_group_completion(self):
        accepted = self.by_id(self.events[:9])["action-1"]
        self.assertEqual(accepted["decisions"]["alice"]["status"], "accepted")
        self.assertNotIn("bo", accepted["decisions"])
        self.assertEqual(accepted["outcomes"], {})
        reported = self.by_id(self.events[:11])["action-1"]
        self.assertEqual(reported["decisions"]["bo"]["status"], "declined")
        self.assertEqual(reported["outcomes"]["alice"]["result"], "completed")
        self.assertEqual(reported["outcomes"]["alice"]["report_kind"], "self_report")
        self.assertNotIn("bo", reported["outcomes"])
        self.assertNotIn("status", reported)

    def test_withdrawal_removes_current_report_but_preserves_audit(self):
        item = self.by_id(self.events[:12])["action-1"]
        self.assertEqual(item["outcomes"], {})
        self.assertEqual(item["decisions"]["alice"]["status"], "accepted")
        self.assertIn("action.outcome.revoked", [e["type"] for e in item["provenance"]])

    def test_revoked_experience_does_not_leave_dangling_edges(self):
        state = self.project()
        self.assertNotIn("memory-1", self.by_id())
        self.assertEqual(state["relationships"], [])
        item = self.by_id()["action-1"]
        self.assertEqual(item["basis_status"], "withdrawn")
        self.assertEqual(item["basis_event_ids"], [])
        self.assertNotIn("evt-05", json.dumps(item))

    def test_correction_changes_title_and_preserves_identity_and_provenance(self):
        before = self.by_id(self.events[:6])["artifact-1"]
        after = self.by_id(self.events[:7])["artifact-1"]
        self.assertNotEqual(before["title"], after["title"])
        self.assertEqual(after["id"], before["id"])
        self.assertEqual(after["source_event"], before["source_event"])
        self.assertEqual(after["correction_event"], "evt-07")

    def test_candidate_is_private_and_not_confirmed(self):
        self.assertNotIn("candidate-e", self.by_id())
        self.assertNotIn("candidate-e", self.by_id(viewer="bo"))
        candidate = self.by_id(viewer="observer")["candidate-e"]
        self.assertEqual(candidate["claim"], "candidate")

    def test_candidate_cannot_be_shared_or_make_confirmed_relationship(self):
        events = deepcopy(self.events[:2])
        events[1]["audience"] = self.fixture["members"]
        with self.assertRaises(ValueError):
            self.project(events)
        events = deepcopy(self.events[:5])
        events[4]["payload"]["participant_ids"].append("candidate-e")
        with self.assertRaises(ValueError):
            self.project(events)

    def test_no_one_claims_someone_else(self):
        events = deepcopy(self.events[:3])
        events[2]["actor_id"] = "bo"
        with self.assertRaises(ValueError):
            self.project(events)

    def test_only_artifact_author_can_correct_and_only_current_version(self):
        for key, value in [("actor_id", "bo"), ("payload", {"new_title": "bad", "target_event_id": "evt-01"})]:
            events = deepcopy(self.events[:7])
            events[-1][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.project(events)

    def test_cannot_decide_for_nonparticipant_or_decide_without_proposal(self):
        for actor in ("observer", "intruder"):
            events = deepcopy(self.events[:9])
            events[-1]["actor_id"] = actor
            with self.subTest(actor=actor), self.assertRaises(ValueError):
                self.project(events)
        event = deepcopy(self.events[8])
        event["sequence"] = 5
        with self.assertRaises(ValueError):
            self.project([*self.events[:4], event])

    def test_repeated_decision_is_rejected_and_retries_idempotent(self):
        events = self.events[:9]
        duplicate = self.append(events, "action.declined", "alice", "action-1", {}, ["evt-08"])
        with self.assertRaises(ValueError):
            self.project(duplicate)
        self.assertEqual(self.project(events), self.project([*events, events[-1]]))

    def test_only_accepted_person_can_report_own_outcome(self):
        events = deepcopy(self.events[:11])
        events[-1]["actor_id"] = "bo"
        events[-1]["source_refs"] = ["evt-10"]
        with self.assertRaises(ValueError):
            self.project(events)
        events[-1]["actor_id"] = "observer"
        with self.assertRaises(ValueError):
            self.project(events)

    def test_report_requires_causal_acceptance_and_human_self_report(self):
        for change in ("missing_source", "auto_complete", "empty_note", "unknown_result"):
            events = deepcopy(self.events[:11])
            if change == "missing_source":
                events[-1]["source_refs"] = ["evt-08"]
            elif change == "auto_complete":
                events[-1]["payload"]["report_kind"] = "agent_inference"
            elif change == "empty_note":
                events[-1]["payload"]["note"] = ""
            else:
                events[-1]["payload"]["result"] = "probably"
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.project(events)

    def test_not_completed_report_is_first_class(self):
        events = deepcopy(self.events[:11])
        events[-1]["payload"]["result"] = "not_completed"
        self.assertEqual(self.by_id(events)["action-1"]["outcomes"]["alice"]["result"], "not_completed")

    def test_only_own_current_report_can_be_withdrawn(self):
        for change in ("actor", "target"):
            events = deepcopy(self.events[:12])
            if change == "actor":
                events[-1]["actor_id"] = "bo"
            else:
                events[-1]["payload"]["target_event_id"] = "evt-09"
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.project(events)

    def test_sources_cannot_be_invented_or_widen_audience(self):
        events = deepcopy(self.events[:5])
        for refs in (["future"], ["evt-02"]):
            events[-1]["source_refs"] = refs
            with self.subTest(refs=refs), self.assertRaises(ValueError):
                self.project(events)

    def test_replay_is_deterministic_nonmutating_and_duplicate_conflicts_fail(self):
        original = deepcopy(self.events)
        self.assertEqual(self.project(), self.project([self.events[0], *self.events]))
        self.assertEqual(original, self.events)
        conflict = deepcopy(self.events[0])
        conflict["payload"]["title"] = "changed"
        with self.assertRaises(DuplicateEventConflict):
            self.project([self.events[0], conflict])

    def test_bad_envelopes_unknown_types_sequences_and_cross_world_fail(self):
        for key, value in (("schema", "v0"), ("type", "anything.revoked"),
                           ("sequence", 0), ("sequence", True),
                           ("room_id", "another-world"), ("payload", [])):
            events = deepcopy(self.events[:2])
            events[-1][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                self.project(events)

    def test_unknown_viewer_rejected(self):
        with self.assertRaises(ValueError):
            self.project(viewer="intruder")

    def test_fixture_requires_events_list(self):
        fixture = deepcopy(self.fixture)
        fixture["events"] = {"not": "a list"}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.json"
            path.write_text(json.dumps(fixture), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_fixture(path)

    def test_empty_and_all_prefixes_valid(self):
        for length in range(len(self.events) + 1):
            with self.subTest(length=length):
                state = self.project(self.events[:length])
                self.assertEqual(state["basis"]["through_sequence"], length)
                self.assertEqual(state["world_id"], "shared-demo" if length else None)

    def test_private_candidate_can_be_claimed_without_disclosing_observer_event(self):
        events = deepcopy(self.events[:3])
        events[1]["subject_id"] = "alice"
        # A person's own claim references the public world, not private recognition.
        state = self.project(events)
        person = {item["id"]: item for item in state["entities"]}["alice"]
        self.assertEqual(person["claim"], "confirmed")
        self.assertEqual([e["event_id"] for e in person["provenance"]], ["evt-03"])
        self.assertNotIn("evt-02", json.dumps(person))

    def test_withdrawal_requires_author_and_rejects_new_use_of_withdrawn_source(self):
        events = deepcopy(self.events)
        events[-1]["actor_id"] = "bo"
        with self.assertRaises(ValueError):
            self.project(events)
        events = self.append(self.events, "artifact.observed", "alice", "artifact-new",
                             {"title": "cannot publish"}, ["evt-05"])
        with self.assertRaises(ValueError):
            self.project(events)


if __name__ == "__main__":
    unittest.main()
