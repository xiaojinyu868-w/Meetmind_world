"""User-entered context becomes spatial constraints only through explicit personal intent."""
from copy import deepcopy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from .domain import initial_state, apply_command, export_summary, evaluate
from .proposals import proposal_messages
from .serve import SpaceService, Conflict
from examples.shared_experience.session_store import SQLiteSessionStore


def command(state, actor, kind, **fields):
    return apply_command(state, actor, {"type": kind, **fields})


class LivingContextTests(unittest.TestCase):
    def memory(self, state=None, **fields):
        return command(state or initial_state(), "alice", "memory.add",
                       **{"text": "CONTEXT_PRIVATE_MARKER：晚饭后一起练瑜伽", "occurred_on": "2026-09-12",
                          "source_note": "SOURCE_PRIVATE_MARKER", **fields})

    def requirement(self, state, actor="alice", **fields):
        return command(state, actor, "requirement.add", **{
            "label": "留出瑜伽区", "source_id": state["memories"][-1]["id"],
            "source_version": state["memories"][-1]["version"],
            "zone": {"x": 4.3, "z": 3.8, "width": 1.8, "depth": 2}, **fields})

    def test_new_memory_is_attributed_and_does_not_create_automatic_intent(self):
        before = initial_state()
        result = self.memory(before)
        memory = result["memories"][-1]
        self.assertEqual(memory["id"], "memory-1")
        self.assertEqual(memory["owner"], "alice")
        self.assertEqual(memory["origin"], "participant-entry")
        self.assertEqual(memory["replies"], {})
        self.assertEqual(result["revision"], before["revision"])
        for key in ("requirements", "objects", "decisions", "actions"):
            self.assertEqual(result[key], before[key])
        self.assertEqual(before, initial_state())
        self.assertEqual(self.memory(occurred_on=None)["memories"][-1]["occurred_on"], None)

    def test_personal_intent_explicitly_connects_context_to_spatial_constraint(self):
        state = self.memory()
        state = command(state, "alice", "decision.set", status="accepted", note="")
        before = deepcopy(state)
        state = self.requirement(state, actor="bo")
        requirement = state["requirements"][-1]
        self.assertEqual(requirement["owner"], "bo")
        self.assertTrue(requirement["enabled"])
        self.assertEqual(requirement["source_id"], "memory-1")
        self.assertEqual(state["memories"], before["memories"])
        self.assertEqual(state["decisions"], before["decisions"])
        self.assertEqual(state["objects"], before["objects"])
        self.assertEqual(state["revision"], before["revision"] + 1)
        self.assertTrue(any(v.get("requirement_id") == requirement["id"] for v in evaluate(state)))
        with self.assertRaises(ValueError):
            command(state, "alice", "decision.set", status="accepted", note="")

    def test_edit_and_reply_only_invalidate_linked_requirements(self):
        state = self.requirement(self.memory(), actor="bo")
        before = deepcopy(state["requirements"][:-1])
        replied = command(state, "bo", "memory.reply", memory_id="memory-1", basis_version=1,
                          status="different", note="我还没决定练瑜伽")
        self.assertTrue(replied["requirements"][-1]["review_needed"])
        self.assertEqual(replied["requirements"][:-1], before)
        self.assertEqual(replied["memories"][-1]["replies"]["bo"]["status"], "different")
        corrected = command(replied, "alice", "memory.edit", memory_id="memory-1", basis_version=1,
                            text="打算一起尝试，尚未开始", occurred_on=None, source_note="本人纠正")
        self.assertEqual(corrected["memories"][-1]["version"], 2)
        self.assertEqual(corrected["memories"][-1]["replies"], {})
        self.assertEqual(corrected["requirements"][-1]["source_version"], 1)
        with self.assertRaisesRegex(ValueError, "版本"):
            command(corrected, "bo", "requirement.set", requirement_id=state["requirements"][-1]["id"],
                    enabled=True, source_version=1)
        confirmed = command(corrected, "bo", "requirement.set", requirement_id=state["requirements"][-1]["id"],
                            enabled=True, source_version=2)
        self.assertFalse(confirmed["requirements"][-1]["review_needed"])

    def test_withdrawal_preserves_spatial_choice_but_forbids_new_link(self):
        state = self.requirement(self.memory())
        withdrawn = command(state, "alice", "memory.withdraw", memory_id="memory-1", basis_version=1)
        self.assertTrue(withdrawn["requirements"][-1]["enabled"])
        self.assertTrue(withdrawn["requirements"][-1]["review_needed"])
        with self.assertRaisesRegex(ValueError, "撤回"):
            self.requirement(withdrawn)
        summary = export_summary(withdrawn, "bo")
        self.assertNotIn("CONTEXT", summary)
        self.assertNotIn("SOURCE", summary)
        independent = command(withdrawn, "alice", "requirement.update",
                              requirement_id=withdrawn["requirements"][-1]["id"], label="我自己仍想练习",
                              source_id=None, source_version=0, zone={"x": 4, "z": 2, "width": 1, "depth": 1})
        self.assertIsNone(independent["requirements"][-1]["source_id"])
        self.assertFalse(independent["requirements"][-1]["review_needed"])

    def test_source_versions_ownership_and_bounded_spatial_input(self):
        state = self.memory()
        for fields in ({"occurred_on": "2026-02-30"}, {"occurred_on": "20260912"}, {"source_note": []},
                       {"text": ""}, {"owner": "bo"}, {"origin": "verified"}):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                self.memory(**fields)
        for fields in ({"source_version": 0}, {"source_version": True}, {"source_id": "missing"},
                       {"label": ""}, {"owner": "bo"},
                       {"zone": {"x": 3, "z": 2, "width": 1e20, "depth": 2}},
                       {"zone": {"x": float("nan"), "z": 2, "width": 1, "depth": 1}},
                       {"zone": {"x": 3, "z": 2, "width": .099, "depth": 1}},
                       {"source_id": None, "source_version": 1}):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                self.requirement(state, **fields)
        owned = self.requirement(state)
        with self.assertRaisesRegex(ValueError, "本人"):
            command(owned, "bo", "requirement.update", requirement_id=owned["requirements"][-1]["id"],
                    label="代改", source_id=None, source_version=0, zone={"x": 3, "z": 2, "width": 1, "depth": 1})
        for kind, extra in (("memory.edit", {"text": "overwrite"}), ("memory.reply", {"status": "confirmed", "note": ""}),
                            ("memory.withdraw", {})):
            with self.subTest(kind=kind), self.assertRaisesRegex(ValueError, "版本"):
                command(state, "alice", kind, memory_id="memory-1", basis_version=2, **extra)
        self.assertEqual(state, self.memory())

    def test_outdated_requirement_edit_cannot_overwrite_new_geometry_on_retry(self):
        state = self.requirement(self.memory())
        requirement = state["requirements"][-1]
        body = {"requirement_id": requirement["id"], "label": requirement["label"], "source_id": "memory-1",
                "source_version": 1, "zone": {"x": 4, "z": 2, "width": 1, "depth": 1},
                "basis_revision": state["revision"]}
        changed = command(state, "alice", "requirement.update", **body)
        self.assertEqual(changed["requirements"][-1]["zone"]["width"], 1)
        with self.assertRaisesRegex(ValueError, "方案已变化"):
            command(changed, "alice", "requirement.update", **{**body, "zone": requirement["zone"]})
        # Even without changing the memory text, a new reply must be seen before re-confirming.
        replied = command(state, "bo", "memory.reply", memory_id="memory-1", status="different", note="不一样")
        with self.assertRaisesRegex(ValueError, "方案已变化"):
            command(replied, "alice", "requirement.update", **body)

    def test_context_and_source_are_not_sent_to_layout_model(self):
        state = self.requirement(self.memory())
        context = json.dumps(proposal_messages(state, "布局"), ensure_ascii=False)
        self.assertIn("留出瑜伽区", context)
        self.assertNotIn("CONTEXT_PRIVATE_MARKER", context)
        self.assertNotIn("SOURCE_PRIVATE_MARKER", context)
        replied = command(state, "bo", "memory.reply", memory_id="memory-1", status="different", note="不同意")
        self.assertNotIn("留出瑜伽区", json.dumps(proposal_messages(replied, "布局"), ensure_ascii=False))

    def test_export_escapes_metadata_and_classifies_participant_entry(self):
        state = self.memory(source_note="<script>bad</script> [click](x)")
        summary = export_summary(state, "bo")
        self.assertIn("参与者录入，未经独立核验", summary)
        self.assertIn("2026-09-12", summary)
        self.assertNotIn("<script>", summary)
        self.assertNotIn("[click](", summary)
        self.assertIn("&lt;script&gt;", summary)

    def test_replay_with_old_withdrawn_source_confirmation_and_new_commands(self):
        with TemporaryDirectory() as temp:
            store = SQLiteSessionStore(Path(temp) / "worlds")
            sid = "abcdef0123456789abcdef0123456789"
            events = [
                {"schema": "meetmind.shared-space-log.v1", "type": "created"},
                {"actor": "bo", "request_id": "old-withdraw", "command": {"type": "memory.withdraw", "memory_id": "bridge"}},
                {"actor": "bo", "request_id": "old-confirm", "command": {"type": "requirement.set", "requirement_id": "keep", "enabled": True}}]
            store.create(sid, events)
            service = SpaceService(store)
            old = service.state(sid)
            self.assertEqual(old["sequence"], 2)
            self.assertFalse(old["requirements"][-1]["review_needed"])
            body = {"expected_sequence": 2, "request_id": "new-personal-memory", "command":
                    {"type": "memory.add", "text": "周末散步", "occurred_on": None, "source_note": ""}}
            new = service.command(sid, "alice", body)
            self.assertEqual(service.command(sid, "alice", body), new)
            with self.assertRaises(Conflict):
                service.command(sid, "alice", {**body, "request_id": "stale-memory-write"})
            reopened = SpaceService(SQLiteSessionStore(Path(temp) / "worlds"))
            self.assertEqual(reopened.state(sid), new)

if __name__ == "__main__":
    unittest.main()
