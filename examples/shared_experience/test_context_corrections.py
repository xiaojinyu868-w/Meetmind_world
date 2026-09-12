"""Content correction and personal review across causal source chains."""
from copy import deepcopy
import json
import unittest
from .replay import load_fixture, project_events
from .serve import Lab
from .serve_recipe_fixture import fixture_generator, fixture_recipe


class ContextCorrectionTests(unittest.TestCase):
    def setUp(self):
        self.fixture, original = load_fixture()
        self.events = deepcopy(original[:11])
        self.members = self.fixture["members"]

    def append(self, kind, actor, subject, payload, refs, events=None):
        base = self.events if events is None else events
        event = {"schema": "meetmind.event.v1", "event_id": "new-" + str(len(base) + 1),
                 "sequence": len(base) + 1, "room_id": "shared-demo", "actor_id": actor,
                 "subject_id": subject, "type": kind, "payload": payload,
                 "audience": self.members, "source_refs": refs}
        project_events([*base, event], viewer_id="alice", members=self.members)
        base.append(event)
        return event["event_id"]

    def state(self, viewer="alice"):
        return {item["id"]: item for item in project_events(self.events, viewer_id=viewer, members=self.members)["entities"]}

    def correct(self, title="我们只完成了纸桥初稿", target=None):
        target = target or self.state()["memory-1"].get("correction_event", "evt-05")
        return self.append("experience.corrected", "alice", "memory-1", {"target_event_id": target, "new_title": title}, [target])

    def review(self, who="alice", versions=None):
        versions = self.state()["action-1"]["basis_versions"] if versions is None else versions
        return self.append("action.basis.reviewed", who, "action-1", {"basis_event_ids": versions}, ["evt-08", *versions])

    def test_correction_changes_only_account_and_invalidates_transitive_action(self):
        before = self.state()
        self.correct()
        after = self.state()
        self.assertEqual(after["memory-1"]["reported_by"], before["memory-1"]["reported_by"])
        self.assertEqual(after["memory-1"]["source_event"], before["memory-1"]["source_event"])
        self.assertEqual(after["action-1"]["basis_status"], "changed")
        self.assertEqual(after["artifact-1"]["source_basis_status"], "changed")
        for key in ["decisions", "outcomes", "title", "participant_ids"]:
            self.assertEqual(before["action-1"][key], after["action-1"][key])
        self.assertEqual(before["artifact-1"]["title"], after["artifact-1"]["title"])
        self.assertEqual(len(self.state("bo")), len(after))
        self.correct("我们后来又试了一次")
        with self.assertRaises(ValueError):
            self.correct("旧页面覆盖", target="evt-05")

    def test_correction_is_author_only_and_rejects_extra_fields(self):
        for who, extra in [("bo", {}), ("alice", {"participant_ids": ["bo"]}),
                           ("alice", {"reported_by": "bo"}), ("alice", {"source": {}})]:
            with self.subTest(who=who, extra=extra), self.assertRaises(ValueError):
                self.append("experience.corrected", who, "memory-1",
                    {"target_event_id": "evt-05", "new_title": "我的更正", **extra}, ["evt-05"])
        self.assertEqual(len(self.events), 11)

    def test_each_participant_reviews_exact_versions_without_changing_other_people(self):
        self.correct()
        before = deepcopy(self.state()["action-1"])
        versions = before["basis_versions"]
        self.review("alice")
        reviewed = self.state()["action-1"]
        self.assertEqual(reviewed["basis_reviews"]["alice"]["status"], "active")
        self.assertNotIn("bo", reviewed["basis_reviews"])
        self.review("bo")
        self.assertEqual(self.state()["action-1"]["basis_reviews"]["alice"]["status"], "active")
        for key in ("decisions", "outcomes"):
            self.assertEqual(self.state()["action-1"][key], before[key])
        self.correct("周末那次其实还没开始做")
        self.assertTrue(all(value["status"] == "changed" for value in self.state()["action-1"]["basis_reviews"].values()))
        for refs in [versions, self.state()["action-1"]["basis_versions"][:-1]]:
            with self.assertRaises(ValueError):
                self.review(versions=refs)
        with self.assertRaises(ValueError):
            self.review("observer")

    def test_multiple_and_transitive_sources_all_require_current_versions(self):
        second = self.append("experience.confirmed", "bo", "second-memory", {"title": "另一段合成经历", "participant_ids": ["bo"]}, ["evt-04"])
        self.append("action.proposed", "alice", "chain-action", {"title": "根据两段经历行动", "participant_ids": ["alice", "bo"]}, ["evt-06", second])
        self.correct()
        item = self.state()["chain-action"]
        self.assertEqual(item["basis_status"], "changed")
        self.assertEqual(len(item["basis_versions"]), 3)
        with self.assertRaises(ValueError):
            self.append("action.basis.reviewed", "alice", "chain-action", {"basis_event_ids": item["basis_versions"][:-1]}, [item["source_event"], *item["basis_versions"]])
        self.append("action.basis.reviewed", "alice", "chain-action", {"basis_event_ids": item["basis_versions"]}, [item["source_event"], *item["basis_versions"]])
        self.append("experience.revoked", "bo", "second-memory", {}, [second])
        self.assertEqual(self.state()["chain-action"]["basis_status"], "withdrawn")
        self.assertEqual(self.state()["chain-action"]["basis_reviews"]["alice"]["status"], "withdrawn")

    def test_visual_review_preserves_geometry_and_tracks_content_head(self):
        self.append("visual.recipe.applied", "alice", "artifact-1", {"recipe": fixture_recipe(), "model": "test-only"}, ["evt-07"])
        before = self.state()["artifact-1"]
        self.correct()
        item = self.state()["artifact-1"]
        self.assertEqual(item["appearance_basis_status"], "changed")
        versions = item["appearance_basis_versions"]
        appearance = item["appearance_event"]
        payload = {"basis_event_ids": versions, "appearance_event_id": appearance}
        with self.assertRaises(ValueError):
            self.append("visual.basis.reviewed", "bo", "artifact-1", payload, [*versions, appearance])
        self.append("visual.basis.reviewed", "alice", "artifact-1", payload, [*versions, appearance])
        after = self.state()["artifact-1"]
        self.assertEqual(after["appearance"], before["appearance"])
        self.assertEqual(after["appearance_event"], appearance)
        self.assertEqual(after["appearance_basis_status"], "active")
        self.correct("再次更正记录")
        with self.assertRaises(ValueError):
            self.append("visual.basis.reviewed", "alice", "artifact-1", payload, [*versions, appearance])
        self.assertEqual(self.state()["artifact-1"]["appearance_basis_status"], "changed")

    def test_withdrawal_propagates_but_person_can_still_revoke_outcome(self):
        self.correct()
        self.review()
        self.append("experience.revoked", "alice", "memory-1", {}, ["evt-05"])
        action = self.state()["action-1"]
        self.assertEqual(action["basis_status"], "withdrawn")
        self.assertEqual(action["basis_reviews"]["alice"]["status"], "withdrawn")
        self.assertNotIn("memory-1", self.state())
        self.assertNotIn("new-12", action["basis_versions"])
        with self.assertRaises(ValueError):
            self.review()
        self.append("action.outcome.revoked", "alice", "action-1", {"target_event_id": "evt-11"}, ["evt-11"])
        self.assertEqual(self.state()["action-1"]["outcomes"], {})
        self.assertEqual(self.state()["action-1"]["decisions"]["bo"]["status"], "declined")
        public = project_events(self.events, viewer_id="bo", members=self.members)
        self.assertNotIn('"memory-1"', json.dumps(public))

    def test_new_action_after_correction_is_current_and_unrelated_activity_does_not_stale(self):
        current = self.correct()
        self.append("action.proposed", "alice", "new-action", {"title": "按更正后的经历再尝试", "participant_ids": ["alice", "bo"]},
                    ["evt-05", current])
        self.assertEqual(self.state()["new-action"]["basis_status"], "active")
        self.review()
        self.assertEqual(self.state()["new-action"]["basis_status"], "active")

    def test_second_ancestor_correction_invalidates_pending_artifact_proposal(self):
        lab = Lab(fixture_generator)
        sid = lab.create()["session_id"]
        base = {"session_id": sid, "viewer": "alice", "subject_id": "memory-1"}
        first = lab.command({**base, "command": "experience.corrected", "expected_sequence": 8,
                             "target_event_id": "evt-05", "title": "第一次更正"})
        target = next(i for i in first["entities"] if i["id"] == "memory-1")["correction_event"]
        artifact = {**base, "subject_id": "artifact-1"}
        proposal = lab.propose({**artifact, "instruction": "未带外观物件的提案"})
        lab.command({**base, "command": "experience.corrected", "expected_sequence": 9,
                     "target_event_id": target, "title": "第二次更正"})
        with self.assertRaises(ValueError):
            lab.command({**artifact, "command": "visual.recipe.applied", "expected_sequence": 10,
                         "proposal_id": proposal["proposal_id"]})

    def test_host_rejects_old_drafts_and_proposals_after_correction(self):
        lab = Lab(fixture_generator)
        sid = lab.create()["session_id"]
        base = {"session_id": sid, "viewer": "alice", "subject_id": "memory-1"}
        proposal = lab.propose({**base, "instruction": "测试配方"})
        corrected = lab.command({**base, "command": "experience.corrected", "expected_sequence": 8,
                                 "target_event_id": "evt-05", "title": "修正经历"})
        with self.assertRaises(ValueError):
            lab.command({**base, "command": "visual.recipe.applied", "expected_sequence": 9,
                         "proposal_id": proposal["proposal_id"]})
        with self.assertRaises(ValueError):
            lab.command({**base, "command": "experience.corrected", "expected_sequence": 9,
                         "target_event_id": "evt-05", "title": "旧草稿重试"})
        self.assertEqual(lab.state(sid, "alice"), corrected)


if __name__ == "__main__":
    unittest.main()
