from copy import deepcopy
import json
import unittest

from .domain import apply_command, initial_state
from .proposals import demo_proposal, parse_proposal, proposal_messages


def set_requirement(state, actor, identity):
    return apply_command(state, actor, {"type": "requirement.set", "requirement_id": identity, "enabled": True})


class ProposalTests(unittest.TestCase):
    def test_prompt_only_sends_dimensions_and_confirmed_current_requirements(self):
        state = set_requirement(initial_state(), "alice", "work")
        state = set_requirement(state, "bo", "exercise")
        state["requirements"][0]["review_needed"] = True
        state["memories"][0]["text"] = "PRIVATE_MEMORY_MARKER"
        state["objects"][0]["cost"] = 1234567
        state = apply_command(state, "alice", {"type": "decision.set", "status": "measure", "note": "PRIVATE_DECISION_MARKER"})
        state = apply_command(state, "bo", {"type": "action.add", "text": "PRIVATE_ACTION_MARKER"})
        before = deepcopy(state)
        messages = proposal_messages(state, "帮我们留出运动位置")
        payload = json.loads(messages[1]["content"])
        self.assertEqual(set(payload), {"room", "objects", "requirements", "instruction"})
        self.assertEqual([item["id"] for item in payload["requirements"]], ["exercise"])
        self.assertEqual(set(payload["requirements"][0]), {"id", "label", "owner", "zone", "source_version"})
        self.assertEqual(set(payload["objects"][0]), {"id", "label", "kind", "width", "depth", "height", "x", "z", "rotation"})
        text = json.dumps(messages)
        for secret in ("PRIVATE_MEMORY_MARKER", "PRIVATE_DECISION_MARKER", "PRIVATE_ACTION_MARKER", "1234567"):
            self.assertNotIn(secret, text)
        self.assertEqual(state, before)
        self.assertIn("不可信材料", messages[0]["content"])
        for instruction in ("", "x" * 1001, None):
            with self.assertRaises(ValueError):
                proposal_messages(state, instruction)

    def test_demo_preview_preserves_identity_sources_decisions_and_revision(self):
        state = set_requirement(initial_state(), "bo", "exercise")
        state = apply_command(state, "alice", {"type": "decision.set", "status": "changes", "note": "等布局改善"})
        before = deepcopy(state)
        parsed = parse_proposal(demo_proposal(state), state)
        self.assertEqual(state, before)
        self.assertEqual(parsed["violations"], [])
        self.assertEqual(parsed["moved"], ["sofa", "table"])
        self.assertEqual(parsed["preserved"], ["desk", "shelf"])
        self.assertEqual(parsed["preview"]["revision"], state["revision"])
        self.assertEqual(parsed["preview"]["sequence"], state["sequence"])
        for key in ("decisions", "requirements", "memories", "history", "actions", "room"):
            self.assertEqual(parsed["preview"][key], state[key])
        for original, modified in zip(state["objects"], parsed["preview"]["objects"]):
            self.assertEqual({key: value for key, value in original.items() if key not in ("x", "z", "rotation")},
                             {key: value for key, value in modified.items() if key not in ("x", "z", "rotation")})
        self.assertTrue(all(operation["requirement_ids"] == ["exercise"] for operation in parsed["proposal"]["operations"]))
        self.assertIn("人工", parsed["proposal"]["title"])
        with self.assertRaisesRegex(ValueError, "无需修改"):
            demo_proposal(parsed["preview"])

    def test_preview_reports_conflicts_without_mutating_or_rejecting_them(self):
        state = initial_state()
        value = json.loads(demo_proposal(state))
        value["operations"] = [{"object_id": "table", "x": 3, "z": .6, "rotation": 0,
                                "reason": "测试可见的门口冲突", "requirement_ids": []}]
        parsed = parse_proposal(json.dumps(value), state)
        self.assertIn("door:table", [violation["id"] for violation in parsed["violations"]])
        self.assertEqual(parsed["preview"]["revision"], state["revision"])
        self.assertEqual(state, initial_state())

    def test_disabled_or_stale_requirement_references_are_rejected(self):
        for enabled, review in ((False, False), (True, True)):
            state = initial_state()
            state["requirements"][1].update(enabled=enabled, review_needed=review)
            value = json.loads(demo_proposal(state))
            self.assertEqual(value["operations"][0]["requirement_ids"], [])
            value["operations"][0]["requirement_ids"] = ["exercise"]
            with self.assertRaises(ValueError):
                parse_proposal(json.dumps(value), state)

    def test_strict_model_output_rejects_schema_ids_types_duplicates_and_noop(self):
        state = initial_state()
        base = json.loads(demo_proposal(state))
        cases = []
        for field, value in (("extra", 1), ("schema", "wrong"), ("title", "x" * 81),
                             ("rationale", "x" * 801), ("operations", [])):
            proposal = deepcopy(base)
            proposal[field] = value
            cases.append(proposal)
        for field, value in (("object_id", "missing"), ("x", True), ("z", float("nan")),
                             ("x", float("inf")), ("x", 21), ("z", -11), ("rotation", False),
                             ("rotation", 45), ("reason", "x" * 241), ("code", "bad()"),
                             ("requirement_ids", ["unknown"])):
            proposal = deepcopy(base)
            proposal["operations"][0][field] = value
            cases.append(proposal)
        duplicate = deepcopy(base)
        duplicate["operations"] = [duplicate["operations"][0]] * 2
        cases.append(duplicate)
        noop = deepcopy(base)
        for operation in noop["operations"]:
            old = next(item for item in state["objects"] if item["id"] == operation["object_id"])
            for field in ("x", "z", "rotation"):
                operation[field] = old[field]
        cases.append(noop)
        for proposal in cases:
            with self.subTest(proposal=proposal), self.assertRaises(ValueError):
                parse_proposal(json.dumps(proposal), state)
        for text in ('{"schema":"first","schema":"second"}', "null", "[]", "{broken}",
                     '{"x":1e999}', 1, "x" * 24001):
            with self.subTest(text=text), self.assertRaises(ValueError):
                parse_proposal(text, state)

    def test_duplicate_requirement_reference_rejected_even_if_eligible(self):
        state = set_requirement(initial_state(), "alice", "work")
        state = set_requirement(state, "bo", "exercise")
        value = json.loads(demo_proposal(state))
        value["operations"][0]["requirement_ids"] = ["exercise", "exercise"]
        with self.assertRaises(ValueError):
            parse_proposal(json.dumps(value), state)


if __name__ == "__main__":
    unittest.main()
