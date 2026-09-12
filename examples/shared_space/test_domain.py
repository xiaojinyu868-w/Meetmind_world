from copy import deepcopy
import json
import unittest

from .domain import apply_command, evaluate, export_summary, initial_state


def command(state, actor, kind, **fields):
    return apply_command(state, actor, {"type": kind, **fields})


def item(state, section, identity):
    return next(value for value in state[section] if value["id"] == identity)


class DomainTests(unittest.TestCase):
    def test_initial_sources_are_synthetic_and_require_explicit_owner_confirmation(self):
        state = initial_state()
        self.assertEqual(state["revision"], 1)
        self.assertEqual(state["sequence"], 0)
        self.assertTrue(all(not value["enabled"] for value in state["requirements"]))
        self.assertEqual(item(state, "objects", "shelf")["source_id"], "bridge")
        self.assertEqual(item(state, "requirements", "work")["source_id"], "office")
        self.assertIsNone(item(state, "requirements", "exercise")["source_id"])
        state["objects"][0]["x"] = 99
        self.assertEqual(initial_state()["objects"][0]["x"], 1.1)

    def test_owner_confirmed_A_conflicts_and_B_resolves_actual_geometry(self):
        state = initial_state()
        self.assertEqual(evaluate(state), [])
        state = command(state, "alice", "requirement.set", requirement_id="work", enabled=True)
        state = command(state, "bo", "requirement.set", requirement_id="exercise", enabled=True)
        state = command(state, "bo", "requirement.set", requirement_id="keep", enabled=True)
        violations = evaluate(state)
        self.assertEqual({value["id"] for value in violations}, {"zone:exercise:sofa", "zone:exercise:table"})
        state_b = command(state, "alice", "layout.preset", preset="B")
        self.assertEqual(evaluate(state_b), [])
        self.assertEqual(item(state_b, "objects", "shelf"), item(state, "objects", "shelf"))
        self.assertEqual(item(state_b, "objects", "sofa")["x"], 4.65)
        self.assertEqual(evaluate(command(state_b, "bo", "layout.preset", preset="A")), violations)

    def test_both_decisions_bind_revision_not_sequence_and_expire_after_edit(self):
        state = command(initial_state(), "alice", "layout.preset", preset="B")
        version = state["revision"]
        state = command(state, "alice", "decision.set", status="accepted", note="接受")
        state = command(state, "bo", "decision.set", status="accepted", note="同意这个版本")
        self.assertEqual(state["revision"], version)
        self.assertEqual(state["decisions"]["alice"]["revision"], version)
        self.assertEqual(state["decisions"]["bo"]["revision"], version)
        self.assertIn("当前结论：双方接受同一版本", export_summary(state, "alice"))
        old_decisions = deepcopy(state["decisions"])
        state = command(state, "bo", "object.move", object_id="table", x=2.7, z=2.5, rotation=0)
        self.assertEqual(state["revision"], version + 1)
        self.assertEqual(state["decisions"], old_decisions)
        summary = export_summary(state, "bo")
        self.assertIn("尚无当前共同认可", summary)
        self.assertEqual(summary.count("已过期"), 2)

    def test_owner_and_actor_boundaries_do_not_mutate_input(self):
        state = command(initial_state(), "alice", "action.add", text="测量门宽")
        for actor, kind, fields in (
            ("bo", "requirement.set", {"requirement_id": "work", "enabled": True}),
            ("alice", "requirement.set", {"requirement_id": "exercise", "enabled": False}),
            ("bo", "memory.edit", {"memory_id": "office", "text": "替她改"}),
            ("bo", "memory.withdraw", {"memory_id": "office"}),
            ("bo", "action.report", {"action_id": "action-1", "status": "done"}),
            ("observer", "decision.set", {"status": "accepted", "note": ""}),
        ):
            before = deepcopy(state)
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                command(state, actor, kind, **fields)
            self.assertEqual(state, before)

    def test_memory_correction_marks_dependents_preserves_independent_choices(self):
        state = command(initial_state(), "alice", "requirement.set", requirement_id="work", enabled=True)
        state = command(state, "bo", "requirement.set", requirement_id="keep", enabled=True)
        state = command(state, "alice", "decision.set", status="accepted", note="")
        before = deepcopy(state)
        state = command(state, "alice", "memory.edit", memory_id="office", text="今后每周只有一天在家办公")
        work = item(state, "requirements", "work")
        self.assertTrue(work["enabled"])
        self.assertTrue(work["review_needed"])
        self.assertEqual(work["source_version"], 1)
        self.assertEqual(item(state, "memories", "office")["version"], 2)
        self.assertEqual(item(state, "requirements", "keep"), item(before, "requirements", "keep"))
        self.assertEqual(state["objects"], before["objects"])
        self.assertEqual(state["decisions"], before["decisions"])
        with self.assertRaisesRegex(ValueError, "重新核对"):
            command(state, "bo", "decision.set", status="accepted", note="")
        state = command(state, "alice", "requirement.set", requirement_id="work", enabled=True)
        self.assertFalse(item(state, "requirements", "work")["review_needed"])
        self.assertEqual(item(state, "requirements", "work")["source_version"], 2)

    def test_withdrawal_removes_basis_without_undoing_independent_requirement(self):
        state = command(initial_state(), "bo", "requirement.set", requirement_id="keep", enabled=True)
        shelf = deepcopy(item(state, "objects", "shelf"))
        state = command(state, "bo", "memory.withdraw", memory_id="bridge")
        self.assertTrue(item(state, "requirements", "keep")["enabled"])
        self.assertTrue(item(state, "requirements", "keep")["review_needed"])
        self.assertEqual(item(state, "objects", "shelf"), shelf)
        self.assertTrue(item(state, "memories", "bridge")["withdrawn"])
        for kind, extra in (("memory.edit", {"text": "重新伪装为有效"}), ("memory.reply", {"status": "confirmed", "note": ""})):
            with self.assertRaises(ValueError):
                command(state, "bo", kind, memory_id="bridge", **extra)
        state = command(state, "bo", "requirement.set", requirement_id="keep", enabled=True)
        self.assertTrue(item(state, "requirements", "keep")["enabled"])
        self.assertFalse(item(state, "requirements", "keep")["review_needed"])
        summary = export_summary(state, "bo")
        self.assertIn("已撤回", summary)
        self.assertNotIn("我们一起做的纸桥想要保留", summary)

    def test_personal_memory_replies_remain_separate_and_old_text_assent_does_not_carry(self):
        state = command(initial_state(), "bo", "memory.reply", memory_id="office", status="different", note="我记得是音乐太响")
        state = command(state, "alice", "memory.reply", memory_id="office", status="confirmed", note="我的理解仍一样")
        memory = item(state, "memories", "office")
        self.assertEqual(memory["replies"]["bo"]["status"], "different")
        self.assertEqual(memory["replies"]["alice"]["status"], "confirmed")
        self.assertTrue(item(state, "requirements", "work")["review_needed"])
        state = command(state, "alice", "memory.edit", memory_id="office", text="当时同时开着音乐")
        self.assertEqual(item(state, "memories", "office")["replies"], {})

    def test_geometry_uses_rotation_and_reports_real_violations_without_clamping(self):
        state = command(initial_state(), "alice", "object.move", object_id="desk", x=.5, z=4.1, rotation=0)
        self.assertIn("bounds:desk", [value["id"] for value in evaluate(state)])
        self.assertEqual(item(state, "objects", "desk")["x"], .5)
        rotated = command(state, "alice", "object.move", object_id="desk", x=.5, z=4.1, rotation=90)
        self.assertNotIn("bounds:desk", [value["id"] for value in evaluate(rotated)])
        blocked = command(initial_state(), "bo", "object.move", object_id="table", x=3, z=.6, rotation=0)
        self.assertIn("door:table", [value["id"] for value in evaluate(blocked)])
        overlap = command(initial_state(), "bo", "object.move", object_id="table", x=4.3, z=3.8, rotation=0)
        self.assertIn("overlap:sofa:table", [value["id"] for value in evaluate(overlap)])
        touching = command(initial_state(), "alice", "object.move", object_id="table", x=5.45, z=2, rotation=0)
        self.assertNotIn("bounds:table", [value["id"] for value in evaluate(touching)])

    def test_infeasible_fixture_does_not_invent_solution_or_force_acceptance(self):
        state = initial_state()
        state["room"]["width"] = .5
        state["room"]["depth"] = .5
        for preset in ("A", "B"):
            candidate = command(state, "alice", "layout.preset", preset=preset)
            self.assertTrue(evaluate(candidate))
            with self.assertRaisesRegex(ValueError, "冲突"):
                command(candidate, "alice", "decision.set", status="accepted", note="")
            for status in ("changes", "measure", "defer"):
                ended = command(candidate, "alice", "decision.set", status=status, note="现有尺寸下没有方案")
                self.assertIn("尚无当前共同认可", export_summary(ended, "alice"))
                self.assertIn("现有尺寸下没有方案", export_summary(ended, "alice"))

    def test_actions_are_deterministic_personal_reports_and_do_not_expire_decisions(self):
        state = command(initial_state(), "alice", "decision.set", status="accepted", note="")
        state = command(state, "bo", "decision.set", status="accepted", note="")
        version = state["revision"]
        state = command(state, "alice", "action.add", text="周六测量门宽")
        self.assertEqual(state["actions"][0]["id"], "action-3")
        state = command(state, "alice", "action.report", action_id="action-3", status="done")
        self.assertEqual(state["revision"], version)
        self.assertEqual(state["actions"][0]["status"], "done")
        summary = export_summary(state, "alice")
        self.assertIn("双方接受同一版本", summary)
        self.assertIn("本人报告完成", summary)
        self.assertIn("仅为本人自报", summary)
        self.assertIn("合成房间", summary)

    def test_same_command_stream_replays_exactly_and_commands_do_not_mutate_input(self):
        stream = [
            ("alice", {"type": "requirement.set", "requirement_id": "work", "enabled": True}),
            ("bo", {"type": "requirement.set", "requirement_id": "exercise", "enabled": True}),
            ("alice", {"type": "layout.preset", "preset": "B"}),
            ("bo", {"type": "action.add", "text": "先测量"}),
            ("alice", {"type": "decision.set", "status": "measure", "note": "确认实际门宽"}),
        ]
        outputs = []
        for unused in range(2):
            state = initial_state()
            for actor, instruction in stream:
                before, original_command = deepcopy(state), deepcopy(instruction)
                result = apply_command(state, actor, instruction)
                self.assertEqual(state, before)
                self.assertEqual(instruction, original_command)
                state = result
            outputs.append(json.dumps(state, ensure_ascii=False, sort_keys=True))
        self.assertEqual(*outputs)

    def test_strict_commands_dimensions_and_text(self):
        state = initial_state()
        invalid = [
            {"type": "object.move", "object_id": "desk", "x": float("nan"), "z": 1, "rotation": 0},
            {"type": "object.move", "object_id": "desk", "x": True, "z": 1, "rotation": 0},
            {"type": "object.move", "object_id": "desk", "x": 1, "z": 1, "rotation": False},
            {"type": "object.move", "object_id": "desk", "x": 1, "z": 1, "rotation": 45},
            {"type": "object.move", "object_id": "desk", "x": 1, "z": 1, "rotation": 0, "width": 10},
            {"type": "requirement.set", "requirement_id": "work", "enabled": 1},
            {"type": "decision.set", "status": "accepted", "note": "", "actor": "bo"},
            {"type": "memory.edit", "memory_id": "office", "text": "x" * 601},
            {"type": "action.add", "text": "x" * 241},
            {"type": "action.add", "text": "\u0000"},
            {"type": "action.add"},
            {"type": "unknown"}, None,
        ]
        for instruction in invalid:
            with self.subTest(command=instruction), self.assertRaises(ValueError):
                apply_command(state, "alice", instruction)
        for value in (0, -1, True, float("inf"), 10**1000):
            corrupted = deepcopy(state)
            corrupted["objects"][0]["width"] = value
            with self.subTest(width=value), self.assertRaises(ValueError):
                evaluate(corrupted)
        self.assertEqual(state, initial_state())

    def test_summary_escapes_active_markdown_and_does_not_claim_shared_fact(self):
        state = command(initial_state(), "alice", "memory.edit", memory_id="office", text="<script>bad</script> [fake](https://fake)")
        summary = export_summary(state, "alice")
        self.assertNotIn("<script>", summary)
        self.assertIn("&lt;script&gt;", summary)
        self.assertIn("\\[fake\\]", summary)
        self.assertIn("尚未选择", summary)

    def patch_command(self, state, moves, **overrides):
        return {"type": "layout.patch", "basis_revision": state["revision"], "moves": moves,
                "provenance": {"kind": "manual-demo", "label": "人工 B 布局", "model": None}, **overrides}

    def test_layout_patch_is_atomic_even_when_intermediate_position_conflicts(self):
        state = initial_state()
        # Moving the small table onto the sofa first would collide. A batch moves
        # the sofa away too, and only its final geometry is evaluated.
        moves = [{"object_id": "table", "x": 4.3, "z": 3.8, "rotation": 0},
                 {"object_id": "sofa", "x": 4.65, "z": 1.3, "rotation": 0}]
        intermediate = command(state, "alice", "object.move", **moves[0])
        self.assertTrue(evaluate(intermediate))
        before = deepcopy(state)
        result = apply_command(state, "alice", self.patch_command(state, moves))
        self.assertEqual(evaluate(result), [])
        self.assertEqual(result["revision"], state["revision"] + 1)
        self.assertEqual(result["sequence"], state["sequence"] + 1)
        self.assertEqual(len(result["history"]), 1)
        self.assertEqual(state, before)
        self.assertEqual(item(result, "objects", "desk"), item(state, "objects", "desk"))
        self.assertEqual(item(result, "objects", "shelf"), item(state, "objects", "shelf"))
        for key in ("room", "requirements", "decisions", "memories", "actions"):
            self.assertEqual(result[key], state[key])

    def test_layout_patch_preserves_old_acceptance_and_records_true_provenance(self):
        state = command(initial_state(), "alice", "decision.set", status="accepted", note="")
        state = command(state, "bo", "decision.set", status="accepted", note="")
        moves = [{"object_id": "sofa", "x": 4.65, "z": 1.3, "rotation": 0}]
        provenance = {"kind": "model", "label": "布局候选", "model": "test-model"}
        result = apply_command(state, "alice", self.patch_command(state, moves, provenance=provenance))
        self.assertEqual(result["decisions"], state["decisions"])
        self.assertTrue(all(choice["revision"] < result["revision"] for choice in result["decisions"].values()))
        self.assertIn("模型提案：布局候选", result["history"][-1]["summary"])
        self.assertIn("test-model", result["history"][-1]["summary"])
        self.assertIn("仍需分别选择", result["history"][-1]["summary"])
        self.assertIn("尚无当前共同认可", export_summary(result, "alice"))

    def test_layout_patch_rejects_stale_conflicting_review_and_invalid_batches_without_partial_write(self):
        state = initial_state()
        valid = [{"object_id": "sofa", "x": 4.65, "z": 1.3, "rotation": 0}]
        commands = [
            self.patch_command(state, valid, basis_revision=state["revision"] + 1),
            self.patch_command(state, valid, basis_revision=True),
            self.patch_command(state, []),
            self.patch_command(state, valid * 2),
            self.patch_command(state, valid * 5),
            self.patch_command(state, [{"object_id": "sofa", "x": 4.3, "z": 3.8, "rotation": 0}]),
            self.patch_command(state, [{"object_id": "table", "x": 3, "z": .6, "rotation": 0}]),
            self.patch_command(state, [{"object_id": "unknown", "x": 1, "z": 1, "rotation": 0}]),
            self.patch_command(state, [{"object_id": "sofa", "x": True, "z": 1.3, "rotation": 0}]),
            self.patch_command(state, [{"object_id": "sofa", "x": 21, "z": 1.3, "rotation": 0}]),
            self.patch_command(state, [{"object_id": "sofa", "x": 4.65, "z": 1.3, "rotation": 0, "width": 1}]),
            self.patch_command(state, valid, provenance={"kind": "manual-demo", "label": "假的来源", "model": "pretend"}),
            self.patch_command(state, valid, provenance={"kind": "model", "label": "假的来源", "model": None}),
            self.patch_command(state, valid, provenance={"kind": "model", "label": "假的来源", "model": "m", "token": "bad"}),
        ]
        for instruction in commands:
            before = deepcopy(state)
            with self.subTest(instruction=instruction), self.assertRaises(ValueError):
                apply_command(state, "alice", instruction)
            self.assertEqual(state, before)
        stale_context = command(state, "alice", "memory.edit", memory_id="office", text="新的上下文")
        with self.assertRaisesRegex(ValueError, "重新核对"):
            apply_command(stale_context, "alice", self.patch_command(stale_context, valid))


if __name__ == "__main__":
    unittest.main()
